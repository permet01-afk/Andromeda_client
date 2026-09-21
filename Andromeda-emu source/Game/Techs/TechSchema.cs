using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Data;

namespace OrbitReborn_Emulator.Game.Techs
{
    internal static class TechSchema
    {
        private static readonly object Sync = new object();
        private static DateTime nextCheck;
        private static bool valid;
        private const string Tables = "'player_tech_inventory','player_tech_slots','player_tech_builds','player_tech_use_events'";

        internal static void Require(SqlDatabaseTransaction db)
        {
            lock (Sync)
            {
                if (DateTime.UtcNow >= nextCheck)
                {
                    valid = Validate(db);
                    nextCheck = DateTime.UtcNow.AddSeconds(valid ? 60 : 30);
                }
                if (!valid) throw new InvalidOperationException("Tech Factory is not installed or its schema is incompatible. Run the manual SQL file yourself.");
            }
        }

        private static bool Validate(SqlDatabaseTransaction db)
        {
            DataTable engines = db.Query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (" + Tables + ",'users')");
            if (engines.Rows.Count != 5) return false;
            foreach (DataRow row in engines.Rows)
                if (!string.Equals(Convert.ToString(row["ENGINE"]), "InnoDB", StringComparison.OrdinalIgnoreCase)) return false;
            Dictionary<string, string> expected = new Dictionary<string, string>();
            Add(expected,"player_tech_inventory","player_id:int;tech_id:tinyint unsigned;amount:int unsigned;cooldown_until:?datetime;active_until:?datetime;active_use_id:?char(36);version:bigint unsigned");
            Add(expected,"player_tech_slots","player_id:int;slot_no:tinyint unsigned;unlocked_at:?datetime;unlock_request_key:?char(36);unlock_paid_uridium:bigint unsigned");
            Add(expected,"player_tech_builds","id:bigint unsigned;player_id:int;slot_no:tinyint unsigned;tech_id:tinyint unsigned;request_key:char(36);active_slot_no:?tinyint unsigned;started_at:datetime;ends_at:datetime;credited_at:?datetime;recipe_version:varchar(64);paid_credits:bigint unsigned;paid_uridium:bigint unsigned;paid_seprom:bigint unsigned;paid_logfiles:bigint unsigned");
            Add(expected,"player_tech_use_events","use_id:char(36);player_id:int;tech_id:tinyint unsigned;reserved_at:datetime;resolved_at:?datetime;session_generation:char(36);state:varchar(16);details:varchar(1024)");
            foreach (DataRow row in db.Query("SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE,COLUMN_TYPE,IS_NULLABLE,CHARACTER_MAXIMUM_LENGTH,DATETIME_PRECISION,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (" + Tables + ")").Rows)
            {
                string type = Convert.ToString(row["DATA_TYPE"]).ToLowerInvariant();
                if (type == "datetime" && Convert.ToInt32(row["DATETIME_PRECISION"]) != 6) return false;
                if (type == "char" || type == "varchar") type += "(" + row["CHARACTER_MAXIMUM_LENGTH"] + ")";
                if (Convert.ToString(row["COLUMN_TYPE"]).Contains("unsigned")) type += " unsigned";
                if (Convert.ToString(row["IS_NULLABLE"]) == "YES") type = "?" + type;
                string key = row["TABLE_NAME"] + ":" + row["COLUMN_NAME"];
                if (key == "player_tech_builds:id" && !Convert.ToString(row["EXTRA"]).Contains("auto_increment")) return false;
                string wanted;
                if (expected.TryGetValue(key, out wanted))
                {
                    if (wanted != type) return false;
                    expected.Remove(key);
                }
            }
            if (expected.Count != 0) return false;
            expected = new Dictionary<string, string> {
                {"player_tech_inventory:PRIMARY","0:player_id,tech_id"},
                {"player_tech_slots:PRIMARY","0:player_id,slot_no"},
                {"player_tech_slots:tf_unlock_request","0:player_id,unlock_request_key"},
                {"player_tech_builds:PRIMARY","0:id"},
                {"player_tech_builds:tf_build_request","0:player_id,request_key"},
                {"player_tech_builds:tf_active_slot","0:player_id,active_slot_no"},
                {"player_tech_builds:tf_due","1:player_id,credited_at,ends_at"},
                {"player_tech_use_events:PRIMARY","0:use_id"},
                {"player_tech_use_events:tf_use_player","1:player_id,reserved_at"},
                {"player_tech_use_events:tf_use_review","1:state,reserved_at"}
            };
            foreach (DataRow row in db.Query("SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (" + Tables + ") GROUP BY TABLE_NAME,INDEX_NAME,NON_UNIQUE").Rows)
            {
                string key = row["TABLE_NAME"] + ":" + row["INDEX_NAME"], wanted;
                if (expected.TryGetValue(key, out wanted) && wanted == row["NON_UNIQUE"] + ":" + row["cols"]) expected.Remove(key);
            }
            return expected.Count == 0;
        }

        private static void Add(Dictionary<string,string> target, string table, string columns)
        {
            foreach (string column in columns.Split(';'))
            {
                int separator = column.IndexOf(':');
                target.Add(table + ":" + column.Substring(0,separator),column.Substring(separator+1));
            }
        }
    }
}
