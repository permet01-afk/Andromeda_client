using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Techs;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Communication.Outgoing;

namespace OrbitReborn_Emulator.Game.Characters
{
    public sealed class DroneEquipmentState
    {
        public readonly DroneState[] Drones;
        public readonly DataTable Configs;
        public readonly int ShipId;
        public readonly bool LeveledUp;
        public DroneEquipmentState(DroneState[] drones, DataTable configs, int shipId, bool leveledUp)
        { Drones = drones; Configs = configs; ShipId = shipId; LeveledUp = leveledUp; }
        public DataTable ForShip(int shipId)
        {
            DataTable copy = Configs.Clone();
            foreach (DataRow row in Configs.Rows) if (Convert.ToInt32(row["ship_design_id"]) == shipId) copy.ImportRow(row);
            return copy;
        }
    }

    public static class DroneProgressionService
    {
        private static int Int(DataRow r, string key) { return r[key] == DBNull.Value ? 0 : Convert.ToInt32(r[key]); }
        // Exactly one admission per death is made by Npc.Destroy / the existing PvP reward guard.
        // No blind retry on an uncertain COMMIT: that could grant the same kill twice.
        public static void Award(Session owner, int points)
        {
            if (points <= 0 || owner == null || owner.CharacterInfo == null) return;
            lock (TechInventoryService.SyncRoot(owner.CharacterId))
            {
                if (!TechInventoryService.IsCurrent(owner) || owner.CharacterInfo.Disconnected) return;
                try
                {
                    DroneEquipmentState state = Change(owner.CharacterId, points, false);
                    owner.CharacterInfo.ApplyDroneProgression(state);
                    if (state.LeveledUp)
                    {
                        PublishDrones(owner);
                        owner.SendData(PacketComposer.Compose("A", "SHD|" + owner.CharacterInfo.ShipShield + "|" + owner.CharacterInfo.ShipMaxShield));
                        MapInstance map = MapManager.GetInstanceByMapId(owner.CurrentMapId);
                        if (map != null) map.BroadcastToSelectedTarget(owner.CharacterId, FightSelectPlayerComposer.Compose(owner.CharacterInfo));
                        // Discrete text adaptation; no invented Flash animation/sound.
                        owner.SendData(PacketComposer.Compose("A", "STD|Drone level increased."));
                    }
                }
                catch (Exception ex)
                {
                    Output.WriteLine("[Drone progression] player=" + owner.CharacterId + " award=" + points + ": " + ex.Message, OutputLevel.Warning);
                }
            }
        }
        public static void PublishDrones(Session owner)
        {
            var packet = PacketComposer.Compose("n", "d|" + owner.CharacterId + "|" + owner.CharacterInfo.GetDronePacketString());
            owner.SendData(packet);
            if (owner.CharacterInfo.IsInvisibleForAll && owner.CharacterInfo.IsAdmin) return;
            MapInstance map = MapManager.GetInstanceByMapId(owner.CurrentMapId);
            if (map != null && owner.MapJoined) map.BroadcastMessageForOtherOnly(packet, owner);
        }
        public static DroneEquipmentState Load(int playerId)
        {
            try { return Change(playerId, 0, true); }
            catch (MySql.Data.MySqlClient.MySqlException ex)
            {
                if (ex.Number == 1054 || ex.Number == 1146)
                    throw new InvalidOperationException("SQL MANUAL ACTION REQUIRED: PHASE3_DRONE_LEVELS_SQL.txt (equipment schema missing).", ex);
                throw;
            }
        }

        private static DroneEquipmentState Change(int playerId, int award, bool rebuild)
        {
            using (var db = new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString()))
            {
                var users = db.Query("SELECT id,shipid,active_config FROM users WHERE id=@p FOR UPDATE", "@p", playerId);
                if (users.Rows.Count != 1) throw new InvalidOperationException("Drone player does not exist.");
                int shipId = Int(users.Rows[0], "shipid");
                // Schema absence fails closed. Never execute DDL from gameplay.
                var rows = db.Query("SELECT d.id,d.item_id,d.level,d.progress_points, CASE WHEN d.item_id=3 AND i.id IS NOT NULL AND (i.id=9001 OR LOWER(i.name) LIKE '%havok%' OR LOWER(i.name) LIKE '%havoc%') THEN 1 ELSE 0 END AS havok FROM drone d LEFT JOIN drone_design_equipped de ON de.drone_id=d.id LEFT JOIN items i ON i.id=de.design_item_id WHERE d.player_id=@p ORDER BY d.id", "@p", playerId);
                var fleet = new List<DroneState>(); bool leveled = false;
                foreach (DataRow r in rows.Rows)
                {
                    int item = Int(r,"item_id"); if (item != 3 && item != 5) continue;
                    var before = new DroneState(Int(r,"id"), item, Int(r,"level"), Int(r,"progress_points"), Int(r,"havok") == 1);
                    var after = before.Gain(award); leveled |= after.Level != before.Level;
                    if (after.Level != before.Level || after.Points != before.Points)
                        db.Execute("UPDATE drone SET level=@l,progress_points=@n WHERE id=@d AND player_id=@p", "@l",after.Level,"@n",after.Points,"@d",after.Id,"@p",playerId);
                    fleet.Add(after);
                }
                DataTable configs = new DataTable();
                if (rebuild || leveled)
                {
                    configs = Recalculate(db, playerId, fleet);
                    string active = Int(users.Rows[0],"active_config") == 2 ? "B" : "A";
                    foreach (DataRow r in configs.Rows)
                        if (Int(r,"ship_design_id") == shipId && Convert.ToString(r["config"]) == active)
                            db.Execute("UPDATE users SET damages=@d,max_shield=@s,speed=@v WHERE id=@p", "@d",Int(r,"damage_total"),"@s",Int(r,"shield_total"),"@v",Int(r,"speed_total"),"@p",playerId);
                    // Reconnection always rebuilds from persisted levels after a process crash.
                }
                db.Commit();
                return new DroneEquipmentState(fleet.ToArray(), configs, shipId, leveled);
            }
        }

        private static DataTable Recalculate(SqlDatabaseTransaction db, int playerId, List<DroneState> fleet)
        {
            bool full = DroneRules.FullHavok(fleet); var byId = fleet.ToDictionary(d => d.Id);
            var droneSlots = db.Query("SELECT s.drone_id,s.config,s.item_id,i.category FROM drone_slot_config s JOIN drone d ON d.id=s.drone_id LEFT JOIN items i ON i.id=s.item_id WHERE d.player_id=@p AND s.slot_index>=0 AND s.slot_index<CASE WHEN d.item_id=3 THEN 2 ELSE 1 END ORDER BY d.id,s.config,s.slot_index", "@p",playerId);
            var configs = db.Query("SELECT sc.id,sc.ship_design_id,sc.name AS config,sc.lasers_slots AS laser_capacity,sc.gen_slots,sc.extras_slots,sd.base_speed_2010 FROM ship_config sc JOIN ship_design sd ON sd.ship_design_id=sc.ship_design_id WHERE sc.player_id=@p ORDER BY sc.id", "@p",playerId);
            string[] fields = { "damage_total","shield_total","speed_total","ship_count","ship_lf1","ship_mp1","ship_lf2","ship_lf3","drone_count","drone_lf1","drone_mp1","drone_lf2","drone_lf3" };
            foreach (string field in fields) configs.Columns.Add(field, typeof(int));
            // One batched ship-slot read for the entire account, not one per config or laser.
            var shipSlots = db.Query("SELECT s.ship_config_id,s.item_id,s.row_name,i.category FROM ship_slot s JOIN ship_config c ON c.id=s.ship_config_id LEFT JOIN items i ON i.id=s.item_id WHERE c.player_id=@p ORDER BY c.id,s.id", "@p",playerId);
            foreach (DataRow cfg in configs.Rows)
            {
                foreach (string field in fields) cfg[field] = 0;
                long damage = 0, shield = 0; int speed = Math.Max(1, Int(cfg,"base_speed_2010"));
                foreach (DataRow s in shipSlots.Rows)
                {
                    if (Int(s,"ship_config_id") != Int(cfg,"id")) continue;
                    int item = Int(s,"item_id");
                    damage += (long)DroneRules.Laser(item)*10000; shield += (long)DroneRules.Shield(item)*10000; speed += DroneRules.Speed(item);
                    if (Convert.ToString(s["row_name"]) == "lasers" && Convert.ToString(s["category"]) == "laser") CountLaser(cfg,"ship",item);
                }
                foreach (DataRow s in droneSlots.Rows)
                {
                    if (Convert.ToString(s["config"]) != Convert.ToString(cfg["config"])) continue;
                    DroneState drone; if (!byId.TryGetValue(Int(s,"drone_id"),out drone)) continue;
                    int item = Int(s,"item_id");
                    damage += DroneRules.DroneLaserUnits(DroneRules.Laser(item),drone,full);
                    shield += DroneRules.DroneShieldUnits(DroneRules.Shield(item),drone);
                    if (Convert.ToString(s["category"]) == "laser") CountLaser(cfg,"drone",item);
                }
                cfg["damage_total"] = DroneRules.RoundUnits(damage); cfg["shield_total"] = DroneRules.RoundUnits(shield); cfg["speed_total"] = speed;
                db.Execute("INSERT INTO ship_config_stats(ship_config_id,config,lasers_slots,gen_slots,extras_slots,damage_total,shield_total,speed_total) VALUES(@id,@c,@ls,@gs,@es,@d,@s,@v) ON DUPLICATE KEY UPDATE damage_total=VALUES(damage_total),shield_total=VALUES(shield_total),speed_total=VALUES(speed_total)",
                    "@id",Int(cfg,"id"),"@c",cfg["config"],"@ls",Int(cfg,"laser_capacity"),"@gs",Int(cfg,"gen_slots"),"@es",Int(cfg,"extras_slots"),"@d",Int(cfg,"damage_total"),"@s",Int(cfg,"shield_total"),"@v",speed);
            }
            return configs;
        }
        private static void CountLaser(DataRow row, string prefix, int item)
        {
            string count = prefix + "_count"; row[count] = Int(row,count) + 1;
            string suffix = item == 10 ? "lf1" : item == 11 ? "mp1" : item == 12 ? "lf2" : item == 1 ? "lf3" : null;
            if (suffix != null) { string key = prefix + "_" + suffix; row[key] = Int(row,key) + 1; }
        }
    }
}
