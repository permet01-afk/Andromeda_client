using System;
using System.Data;
using System.Linq;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Storage;

namespace OrbitReborn_Emulator.Game.Characters
{
    // Immutable identity of one playable life. Repair never issues this lease.
    public sealed class ShipGameplayLease
    {
        public readonly string Token;
        public readonly long Epoch, Generation, Version;
        public ShipGameplayLease(string token, long epoch, long generation, long version)
        { Token = token; Epoch = epoch; Generation = generation; Version = version; }
    }

    public static class ShipLifecycleService
    {
        public const string SchemaMessage = "SQL MANUAL ACTION REQUIRED: PHASE5_SHIP_DEATH_SQL.txt";
        internal static SqlDatabaseTransaction Open() { return new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString()); }
        // Lock order for all lifecycle mutations: users -> player_ship_state ->
        // player_drone_state -> drones (id order)/equipment -> Gate -> journals.
        // The users row serializes all operations belonging to the same player.
        internal static DataRow LockUser(SqlDatabaseTransaction db, int id)
        {
            var rows = db.Query("SELECT id,shipid,active_config,factionid FROM users WHERE id=@p FOR UPDATE", "@p", id);
            if (rows.Rows.Count != 1) throw new InvalidOperationException("Player not found.");
            return rows.Rows[0];
        }
        public static void AssertSchema(SqlDatabaseTransaction db)
        {
            try
            {
                db.Query("SELECT player_id,status,ship_id,ship_generation,destruction_id,death_life_epoch,destroyed_at,cause,destination_map,destination_x,destination_y,repair_cost,invasion_exempt,version FROM player_ship_state LIMIT 0");
                db.Query("SELECT player_id,operation_key,operation_type,destruction_id,life_epoch,ship_generation,result_data FROM ship_lifecycle_log LIMIT 0");
                var engines = db.Query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('player_ship_state','ship_lifecycle_log')");
                if (engines.Rows.Count != 2 || engines.Rows.Cast<DataRow>().Any(r => !string.Equals(Convert.ToString(r[0]),"InnoDB",StringComparison.OrdinalIgnoreCase)))
                    throw new InvalidOperationException(SchemaMessage);
            }
            catch (MySql.Data.MySqlClient.MySqlException ex) { throw new InvalidOperationException(SchemaMessage, ex); }
        }
        internal static DataRow LockState(SqlDatabaseTransaction db, int id, int shipId)
        {
            // Accounts created after the owner migration also start READY.
            db.Execute("INSERT IGNORE INTO player_ship_state(player_id,ship_id) VALUES(@p,@s)","@p",id,"@s",shipId);
            var row = db.Query("SELECT * FROM player_ship_state WHERE player_id=@p FOR UPDATE","@p",id).Rows[0];
            if (Convert.ToInt32(row["ship_id"]) != shipId) throw new InvalidOperationException("Active ship identity changed. Please refresh the hangar.");
            return row;
        }
        public static ShipGameplayLease BeginGameplay(int id, string token)
        {
            if (string.IsNullOrEmpty(token)) throw new ArgumentException("Gameplay token required.");
            using (var db = Open())
            {
                AssertSchema(db);
                var user = LockUser(db,id);
                var ship = LockState(db,id,Convert.ToInt32(user["shipid"]));
                if (Convert.ToString(ship["status"]) != "READY") throw new InvalidOperationException("Your ship has been destroyed. Repair your ship before you can launch.");
                var drone = DroneWearService.LockState(db,id);
                string owner = Convert.ToString(drone["gameplay_token"]);
                if (owner.Length > 0 && owner != token) throw new InvalidOperationException("Gameplay session is still active.");
                long epoch = Convert.ToInt64(drone["life_epoch"]);
                if (owner != token)
                {
                    epoch = checked(epoch + 1);
                    db.Execute("UPDATE player_drone_state SET life_epoch=@e,gameplay_token=@t WHERE player_id=@p","@e",epoch,"@t",token,"@p",id);
                }
                // Owner migration declared legacy accounts READY without inferring deaths.
                // Normalize only a never-destroyed legacy READY hull with nonpositive HP.
                if (ship["death_life_epoch"] == DBNull.Value)
                    db.Execute("UPDATE users SET current_hp=LEAST(1000,GREATEST(1,max_hp)) WHERE id=@p AND current_hp<=0","@p",id);
                var lease = new ShipGameplayLease(token,epoch,Convert.ToInt64(ship["ship_generation"]),Convert.ToInt64(ship["version"]));
                db.Commit(); return lease;
            }
        }
        public static DroneDeathResult AdmitDeath(int id, GameplayDeathContext context)
        {
            if (context == null || context.LifeEpoch <= 0 || string.IsNullOrEmpty(context.SessionToken))
                throw new InvalidOperationException("Gameplay lifecycle was not initialized.");
            try { return ChangeDeath(id,context,false); }
            catch
            {
                // Unknown COMMIT outcome: recover the result, never blindly replay effects.
                var recovered = ChangeDeath(id,context,true);
                if (recovered != null) return recovered;
                throw;
            }
        }
        private static DroneDeathResult ChangeDeath(int id, GameplayDeathContext context, bool recoverOnly)
        {
            using (var db = Open())
            {
                var user = LockUser(db,id);
                var ship = LockState(db,id,Convert.ToInt32(user["shipid"]));
                var drone = DroneWearService.LockState(db,id);
                string key = "death:" + context.LifeEpoch;
                var prior = db.Query("SELECT result_data FROM ship_lifecycle_log WHERE player_id=@p AND operation_key=@k","@p",id,"@k",key);
                if (prior.Rows.Count != 0)
                {
                    var saved = Convert.ToString(prior.Rows[0][0]).Split('|');
                    return new DroneDeathResult { NextEpoch=long.Parse(saved[0]),RespawnMap=int.Parse(saved[1]),RespawnX=int.Parse(saved[2]),RespawnY=int.Parse(saved[3]),GateLives=int.Parse(saved[4]) };
                }
                if (recoverOnly || Convert.ToString(ship["status"]) != "READY" || Convert.ToInt64(drone["life_epoch"]) != context.LifeEpoch || Convert.ToString(drone["gameplay_token"]) != context.SessionToken) return null;
                int faction = Convert.ToInt32(user["factionid"]);
                int map = MapAccessService.GetHomeMapX1(faction), x = MapAccessService.GetHomeX(faction), y = MapAccessService.GetHomeY(faction);
                var equipment = DroneWearService.ApplyDeath(db,id,user,context);
                int gateLives = GalaxyGateWaveService.PersistDroneWearDeath(db,id,context.MapId);
                long next = checked(context.LifeEpoch + 1);
                string destruction = Guid.NewGuid().ToString("N");
                int price = Convert.ToInt32(user["shipid"]) == 1 || context.InvasionExempt ? 0 : 500;
                db.Execute("UPDATE users SET current_hp=0,current_shield=0,current_shield1=0,current_shield2=0,online=0,mapid=@m,locx=@x,locy=@y,config_refresh_pending=1 WHERE id=@p","@m",map,"@x",x,"@y",y,"@p",id);
                db.Execute("UPDATE player_ship_state SET status='DESTROYED',destruction_id=@d,death_life_epoch=@e,destroyed_at=UTC_TIMESTAMP(),cause=@c,destination_map=@m,destination_x=@x,destination_y=@y,repair_cost=@cost,invasion_exempt=@inv,version=version+1 WHERE player_id=@p",
                    "@d",destruction,"@e",context.LifeEpoch,"@c",context.Cause.ToString(),"@m",map,"@x",x,"@y",y,"@cost",price,"@inv",context.InvasionExempt ? 1 : 0,"@p",id);
                db.Execute("UPDATE player_drone_state SET life_epoch=@e,equipment_version=equipment_version+1 WHERE player_id=@p","@e",next,"@p",id);
                string result = string.Join("|",new object[]{next,map,x,y,gateLives,context.Cause,context.InvasionExempt ? "INVASION" : "REAL_GAMEPLAY_DEATH"});
                db.Execute("INSERT INTO drone_operation_log(player_id,operation_key,operation_type,life_epoch,result_data) VALUES(@p,@k,'death',@e,@r)","@p",id,"@k",key,"@e",context.LifeEpoch,"@r",result);
                db.Execute("INSERT INTO ship_lifecycle_log(player_id,operation_key,operation_type,destruction_id,life_epoch,ship_generation,result_data) VALUES(@p,@k,'death',@d,@e,@g,@r)","@p",id,"@k",key,"@d",destruction,"@e",context.LifeEpoch,"@g",ship["ship_generation"],"@r",result);
                db.Commit();
                return new DroneDeathResult { NextEpoch=next,RespawnMap=map,RespawnX=x,RespawnY=y,GateLives=gateLives,Equipment=equipment };
            }
        }
        public static string OwnerFence(SqlDatabaseClient db, ShipGameplayLease lease)
        {
            db.SetParameter("cooldown_owner", lease == null ? "" : lease.Token);
            return " AND EXISTS (SELECT 1 FROM player_drone_state ds WHERE ds.player_id=users.id AND ds.gameplay_token=@cooldown_owner)";
        }
        public static string SaveFence(SqlDatabaseClient db, ShipGameplayLease lease)
        {
            db.SetParameter("life_token", lease == null ? "" : lease.Token);
            db.SetParameter("life_epoch", lease == null ? -1L : lease.Epoch);
            db.SetParameter("ship_generation", lease == null ? -1L : lease.Generation);
            db.SetParameter("ship_version", lease == null ? -1L : lease.Version);
            return " AND EXISTS (SELECT 1 FROM player_ship_state ss JOIN player_drone_state ds ON ds.player_id=ss.player_id WHERE ss.player_id=users.id AND ss.status='READY' AND ss.ship_id=users.shipid AND ss.ship_generation=@ship_generation AND ss.version=@ship_version AND ds.gameplay_token=@life_token AND ds.life_epoch=@life_epoch)";
        }
    }
}
