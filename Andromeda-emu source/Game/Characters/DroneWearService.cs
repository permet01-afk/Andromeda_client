using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using MySql.Data.MySqlClient;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;

namespace OrbitReborn_Emulator.Game.Characters
{
    public sealed class DroneDeathResult
    {
        public long NextEpoch;
        public int RespawnMap, RespawnX, RespawnY, GateLives = -1;
        public DroneEquipmentState Equipment;
    }

    public static class DroneWearService
    {
        private static MySqlConnection runtimeGuard;
        private static Timer runtimeGuardMonitor;
        private static readonly object RuntimeGuardSync = new object();
        private const string RuntimeLock = "andromeda.drone-wear.runtime";
        private const string SchemaMessage = "SQL MANUAL ACTION REQUIRED: PHASE4_DRONE_WEAR_SQL.txt";
        private static int Int(DataRow r, string key) { return Convert.ToInt32(r[key]); }

        // One emulator may own this lifecycle. A crashed process releases the named
        // lock automatically. Stale online tokens are cleared only on the next startup,
        // before accepting players; never via a lease that can expire during gameplay.
        public static void Initialize()
        {
            var options = new MySqlConnectionStringBuilder(SqlDatabaseManager.GenerateConnectionString()) { Pooling = false };
            var guard = new MySqlConnection(options.ToString());
            try
            {
                guard.Open();
                using (var cmd = guard.CreateCommand())
                {
                    cmd.CommandText = "SELECT GET_LOCK('" + RuntimeLock + "',0)";
                    if (Convert.ToInt32(cmd.ExecuteScalar()) != 1) throw new InvalidOperationException("Another emulator owns the drone lifecycle.");
                }
                using (var db = Open())
                {
                    AssertSchema(db);
                    db.Query("SELECT id FROM users ORDER BY id FOR UPDATE");
                    db.Execute("UPDATE player_drone_state SET gameplay_token=NULL WHERE gameplay_token IS NOT NULL");
                    db.Commit();
                }
                runtimeGuard = guard;
                // Do not let a process keep stale gameplay tokens after losing its
                // exclusive DB connection. The next startup recovers those tokens.
                runtimeGuardMonitor = new Timer(_ =>
                {
                    lock (RuntimeGuardSync)
                    {
                        try { if (runtimeGuard.Ping()) return; } catch { }
                        Environment.FailFast("Drone lifecycle database guard lost. Restart the emulator after database recovery.");
                    }
                }, null, 5000, 5000);
            }
            catch { guard.Dispose(); throw; }
        }

        private static SqlDatabaseTransaction Open() { return new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString()); }
        private static void AssertSchema(SqlDatabaseTransaction db)
        {
            try
            {
                db.Query("SELECT damage_units FROM drone LIMIT 0");
                db.Query("SELECT player_id,life_epoch,equipment_version,gameplay_token FROM player_drone_state LIMIT 0");
                db.Query("SELECT operation_key,operation_type,life_epoch,drone_id,result_data FROM drone_operation_log LIMIT 0");
                var engines = db.Query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('users','drone','player_inventory','drone_slot','drone_slot_config','drone_design_equipped','ship_config','ship_slot','ship_config_stats','player_galaxy_gates','player_drone_state','drone_operation_log')");
                if (engines.Rows.Count != 12 || engines.Rows.Cast<DataRow>().Any(r => !string.Equals(Convert.ToString(r["ENGINE"]),"InnoDB",StringComparison.OrdinalIgnoreCase)))
                    throw new InvalidOperationException(SchemaMessage + " (transactional InnoDB tables required).");
            }
            catch (MySqlException ex) { throw new InvalidOperationException(SchemaMessage, ex); }
        }
        private static DataRow LockPlayer(SqlDatabaseTransaction db, int playerId)
        {
            var rows = db.Query("SELECT id,shipid,active_config FROM users WHERE id=@p FOR UPDATE", "@p", playerId);
            if (rows.Rows.Count != 1) throw new InvalidOperationException("Player not found.");
            return rows.Rows[0];
        }
        private static DataRow State(SqlDatabaseTransaction db, int playerId)
        {
            db.Execute("INSERT IGNORE INTO player_drone_state(player_id) VALUES(@p)", "@p", playerId);
            return db.Query("SELECT life_epoch,equipment_version,gameplay_token FROM player_drone_state WHERE player_id=@p FOR UPDATE", "@p", playerId).Rows[0];
        }

        // Reserve BEFORE CharacterInfoLoader reads wallets/equipment. Repair takes
        // this same users lock, so login cannot race an offline repair.
        public static long BeginGameplay(int playerId, string token)
        {
            using (var db = Open())
            {
                AssertSchema(db); LockPlayer(db, playerId);
                DataRow row = State(db, playerId);
                string current = Convert.ToString(row["gameplay_token"]);
                if (current.Length > 0 && current != token) throw new InvalidOperationException("Gameplay session is still active.");
                long epoch = Convert.ToInt64(row["life_epoch"]);
                if (current != token)
                {
                    epoch = checked(epoch + 1);
                    db.Execute("UPDATE player_drone_state SET life_epoch=@e,gameplay_token=@t WHERE player_id=@p", "@e", epoch, "@t", token, "@p", playerId);
                }
                db.Commit(); return epoch;
            }
        }
        public static void EndGameplay(int playerId, string token)
        {
            if (playerId <= 0 || string.IsNullOrEmpty(token)) return;
            using (var db = Open())
            {
                LockPlayer(db, playerId);
                db.Execute("UPDATE player_drone_state SET gameplay_token=NULL WHERE player_id=@p AND gameplay_token=@t", "@p", playerId, "@t", token);
                db.Commit();
            }
        }
        public static GameplayDeathContext Capture(Session player, GameplayDeathCause cause)
        {
            if (player == null || player.CharacterInfo == null) return null;
            return new GameplayDeathContext(Interlocked.Read(ref player.DroneLifeEpoch), player.DroneGameplayToken,
                player.CharacterInfo.MapId, cause, Invasion.IsDroneWearExemptParticipant(player));
        }
        public static bool IsCurrentLife(Session player, GameplayDeathContext context)
        {
            return player != null && player.CharacterInfo != null && context != null
                && !player.StoppedPlayer && !player.CharacterInfo.Disconnected && !player.CharacterInfo.Destroy
                && context.LifeEpoch == Interlocked.Read(ref player.DroneLifeEpoch)
                && context.SessionToken == player.DroneGameplayToken
                && context.MapId == player.CharacterInfo.MapId;
        }

        // Called inside the impact lock, immediately at HP=0. Freeze this life
        // before packet sends, heals, logout or a competing callback can run.
        public static void MarkLethalImpact(Session player, GameplayDeathContext context)
        {
            if (player.CharacterInfo.ShipHp <= 0 && IsCurrentLife(player, context))
            {
                player.CharacterInfo.PendingDroneDeath = context;
                player.CharacterInfo.Destroy = true;
            }
        }
        public static bool IsPendingDeath(Session player, GameplayDeathContext context)
        {
            return context != null && ReferenceEquals(player.CharacterInfo.PendingDroneDeath, context)
                && context.LifeEpoch == Interlocked.Read(ref player.DroneLifeEpoch)
                && context.SessionToken == player.DroneGameplayToken;
        }

        private static List<DroneState> Fleet(SqlDatabaseTransaction db, int playerId)
        {
            var rows = db.Query("SELECT d.id,d.item_id,d.level,d.progress_points,CASE WHEN d.item_id=3 AND i.id IS NOT NULL AND (i.id=9001 OR LOWER(i.name) LIKE '%havok%' OR LOWER(i.name) LIKE '%havoc%') THEN 1 ELSE 0 END AS havok FROM drone d LEFT JOIN drone_design_equipped de ON de.drone_id=d.id LEFT JOIN items i ON i.id=de.design_item_id WHERE d.player_id=@p AND d.item_id IN (3,5) ORDER BY d.id", "@p", playerId);
            return rows.Rows.Cast<DataRow>().Select(r => new DroneState(Int(r,"id"), Int(r,"item_id"), Int(r,"level"), Int(r,"progress_points"), Int(r,"havok") == 1)).ToList();
        }
        private static DroneEquipmentState Rebuild(SqlDatabaseTransaction db, int playerId, DataRow user)
        {
            var fleet = Fleet(db, playerId);
            var configs = DroneProgressionService.Recalculate(db, playerId, fleet);
            string active = Int(user,"active_config") == 2 ? "B" : "A";
            foreach (DataRow row in configs.Rows)
                if (Int(row,"ship_design_id") == Int(user,"shipid") && Convert.ToString(row["config"]) == active)
                    db.Execute("UPDATE users SET damages=@d,max_shield=@s,speed=@v WHERE id=@p", "@d",Int(row,"damage_total"),"@s",Int(row,"shield_total"),"@v",Int(row,"speed_total"),"@p",playerId);
            return new DroneEquipmentState(fleet.ToArray(), configs, Int(user,"shipid"), false, true);
        }
        private static void DestroyDrone(SqlDatabaseTransaction db, int playerId, int droneId, int itemId)
        {
            // Ownership of mounted items already includes equipped quantities.
            // Detach only. No LF3/BO2/Havok credit/debit and no sale refund.
            db.Execute("DELETE FROM drone_slot_config WHERE drone_id=@d", "@d", droneId);
            db.Execute("DELETE FROM drone_slot WHERE drone_id=@d", "@d", droneId);
            db.Execute("DELETE FROM drone_design_equipped WHERE drone_id=@d", "@d", droneId);
            db.Execute("DELETE FROM drone WHERE id=@d AND player_id=@p", "@d", droneId, "@p", playerId);
            var inventory = db.Query("SELECT qty FROM player_inventory WHERE player_id=@p AND item_id=@i FOR UPDATE", "@p", playerId, "@i", itemId);
            if (inventory.Rows.Count > 0)
            {
                if (inventory.Rows.Count != 1 || Int(inventory.Rows[0],"qty") < 1) throw new InvalidOperationException("Drone ownership is inconsistent.");
                db.Execute("UPDATE player_inventory SET qty=qty-1 WHERE player_id=@p AND item_id=@i AND qty>0", "@p", playerId, "@i", itemId);
                db.Execute("DELETE FROM player_inventory WHERE player_id=@p AND item_id=@i AND qty=0", "@p", playerId, "@i", itemId);
            }
        }

        // The operation result also persists respawn coordinates and Gate lives in
        // the wear transaction. Reconnection after commit needs no second death.
        public static DroneDeathResult AdmitDeath(int playerId, GameplayDeathContext context, int respawnMap, int x, int y)
        {
            if (context == null || context.LifeEpoch <= 0 || string.IsNullOrEmpty(context.SessionToken))
                throw new InvalidOperationException("Gameplay lifecycle was not initialized.");
            string key = "death:" + context.LifeEpoch;
            try { return ChangeDeath(playerId, context, key, respawnMap, x, y, false); }
            catch
            {
                // A COMMIT response may be lost. Read the unique result, never retry
                // a mutation whose outcome is unknown. Absence/failure stays closed.
                var recovered = ChangeDeath(playerId, context, key, respawnMap, x, y, true);
                if (recovered != null) return recovered;
                throw;
            }
        }
        private static DroneDeathResult ChangeDeath(int playerId, GameplayDeathContext context, string key, int map, int x, int y, bool recoverOnly)
        {
            using (var db = Open())
            {
                DataRow user = LockPlayer(db, playerId);
                DataRow state = State(db, playerId);
                var previous = db.Query("SELECT result_data FROM drone_operation_log WHERE player_id=@p AND operation_key=@k", "@p",playerId,"@k",key);
                if (previous.Rows.Count > 0)
                {
                    var saved = Convert.ToString(previous.Rows[0]["result_data"]).Split('|');
                    var result = new DroneDeathResult { NextEpoch=long.Parse(saved[0]), RespawnMap=int.Parse(saved[1]), RespawnX=int.Parse(saved[2]), RespawnY=int.Parse(saved[3]), GateLives=int.Parse(saved[4]), Equipment=Rebuild(db,playerId,user) };
                    db.Commit(); return result;
                }
                if (recoverOnly) return null;
                if (Convert.ToInt64(state["life_epoch"]) != context.LifeEpoch || Convert.ToString(state["gameplay_token"]) != context.SessionToken) return null;
                var rows = db.Query("SELECT id,item_id,damage_units FROM drone WHERE player_id=@p AND item_id IN (3,5) ORDER BY id FOR UPDATE", "@p", playerId);
                foreach (DataRow row in rows.Rows)
                {
                    int units=DroneWearRules.AfterDeath(Int(row,"item_id"), Int(row,"damage_units"), context.InvasionExempt);
                    if (units >= DroneWearRules.MaxDamageUnits) DestroyDrone(db,playerId,Int(row,"id"),Int(row,"item_id"));
                    else if (!context.InvasionExempt) db.Execute("UPDATE drone SET damage_units=@u WHERE id=@d", "@u",units,"@d",Int(row,"id"));
                }
                var equipment = Rebuild(db,playerId,user);
                db.Execute("UPDATE users SET drones=@d,config_refresh_pending=1,mapid=@m,locx=@x,locy=@y,current_hp=1000,current_shield=LEAST(1000,max_shield),current_shield1=LEAST(1000,COALESCE((SELECT s.shield_total FROM ship_config c JOIN ship_config_stats s ON s.ship_config_id=c.id WHERE c.player_id=@p AND c.ship_design_id=users.shipid AND c.name='A' LIMIT 1),0)),current_shield2=LEAST(1000,COALESCE((SELECT s.shield_total FROM ship_config c JOIN ship_config_stats s ON s.ship_config_id=c.id WHERE c.player_id=@p AND c.ship_design_id=users.shipid AND c.name='B' LIMIT 1),0)) WHERE id=@p",
                    "@d",DroneWearRules.LegacyProjection(equipment.Drones),"@m",map,"@x",x,"@y",y,"@p",playerId);
                int gateLives = GalaxyGateWaveService.PersistDroneWearDeath(db,playerId,context.MapId);
                long next = checked(context.LifeEpoch + 1);
                db.Execute("UPDATE player_drone_state SET life_epoch=@e,equipment_version=equipment_version+1 WHERE player_id=@p", "@e",next,"@p",playerId);
                string resultText = string.Join("|",new object[]{next,map,x,y,gateLives,context.Cause,context.InvasionExempt ? "INVASION" : "REAL_GAMEPLAY_DEATH"});
                db.Execute("INSERT INTO drone_operation_log(player_id,operation_key,operation_type,life_epoch,result_data) VALUES(@p,@k,'death',@e,@r)", "@p",playerId,"@k",key,"@e",context.LifeEpoch,"@r",resultText);
                db.Commit();
                return new DroneDeathResult { NextEpoch=next,RespawnMap=map,RespawnX=x,RespawnY=y,GateLives=gateLives,Equipment=equipment };
            }
        }
    }
}
