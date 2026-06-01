using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;

namespace OrbitReborn_Emulator.Game.Quests
{
    internal static class QuestObjectiveProgress
    {
        private static readonly object SchemaSync = new object();
        private static bool SchemaEnsured = false;

        public static bool AddNpcKillProgress(int playerId, string npcName)
        {
            return AddNpcKillProgress(playerId, npcName, 0);
        }

        public static bool AddNpcKillProgress(int playerId, string npcName, int mapId)
        {
            bool changed = false;
            string target = GetNpcTarget(npcName, mapId);
            if (target != null)
            {
                int amount = GetNpcProgressAmount(npcName);
                changed = AddProgress(playerId, "npc_kill", target, amount, false);
            }

            return AddWeeklyNpcKillProgress(playerId, npcName, mapId) || changed;
        }

        public static bool AddGalaxyGateCompleteProgress(int playerId, string gateName)
        {
            string target = GetGalaxyGateTarget(gateName);
            if (target == null)
                return false;

            return AddProgress(playerId, "galaxy_gate_complete", target, 1, false);
        }

        public static bool AddPlayerKillProgress(int playerId)
        {
            return AddProgress(playerId, "player_kill", "user_kill", 1, false);
        }

        public static bool AddWeeklyEligiblePlayerKillProgress(int attackerPlayerId, int attackerFactionId, int attackerClanId, int victimFactionId, int victimClanId, int victimLevel, bool sameGroup, bool sameRemoteAddress, bool rewardAsEnemy)
        {
            if (!rewardAsEnemy)
                return false;
            if (attackerPlayerId <= 0 || attackerFactionId <= 0 || victimFactionId <= 0)
                return false;
            if (attackerFactionId == victimFactionId)
                return false;
            if (victimLevel < 8)
                return false;
            if (attackerClanId > 0 && attackerClanId == victimClanId)
                return false;
            if (sameGroup || sameRemoteAddress)
                return false;

            return AddWeeklyProgress(attackerPlayerId, "weekly_player_kill", new List<string> { "eligible_enemy_pilot" }, 1);
        }

        public static bool AddOreCollectProgress(int playerId, long resourceId, int amount)
        {
            string target = GetOreTarget(resourceId);
            if (target == null)
                return false;

            return AddProgress(playerId, "ore_have", target, amount, true);
        }

        private static bool AddProgress(int playerId, string objectiveType, string targetKey, int amount, bool distributeSurplus)
        {
            if (playerId <= 0 || amount <= 0 || string.IsNullOrEmpty(objectiveType) || string.IsNullOrEmpty(targetKey))
                return false;

            try
            {
                EnsureSchema();

                bool changed = false;
                int remaining = amount;

                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    DataTable objectives = GetCompatibleObjectives(client, playerId, objectiveType, targetKey);
                    if (objectives == null || objectives.Rows.Count == 0)
                        return false;

                    foreach (DataRow row in objectives.Rows)
                    {
                        int questId = Convert.ToInt32(row["quest_id"]);
                        int requiredAmount = Convert.ToInt32(row["required_amount"]);
                        int currentAmount = Convert.ToInt32(row["current_amount"]);
                        int missing = requiredAmount - currentAmount;

                        if (missing <= 0)
                            continue;

                        int addAmount = distributeSurplus ? Math.Min(remaining, missing) : Math.Min(amount, missing);
                        if (addAmount <= 0)
                            continue;

                        if (!UpsertObjectiveProgress(client, playerId, questId, objectiveType, targetKey, addAmount, requiredAmount))
                            continue;

                        changed = true;

                        if (!distributeSurplus)
                            break;

                        remaining -= addAmount;
                        if (remaining <= 0)
                            break;
                    }
                }

                return changed;
            }
            catch (Exception exception)
            {
                Output.WriteLine((object)("[QuestObjectiveProgress] Failed to update " + objectiveType + "/" + targetKey + " for player " + playerId + ": " + exception.Message), OutputLevel.Warning);
                return false;
            }
        }

        private static bool AddWeeklyNpcKillProgress(int playerId, string npcName, int mapId)
        {
            string target = GetWeeklyNpcTarget(npcName);
            if (target == null)
                return false;

            List<string> targetKeys = new List<string>();
            if (mapId > 0)
                targetKeys.Add(mapId.ToString(CultureInfo.InvariantCulture) + ":" + target);
            targetKeys.Add("0:" + target);

            return AddWeeklyProgress(playerId, "weekly_npc_kill", targetKeys, 1);
        }

        private static bool AddWeeklyProgress(int playerId, string objectiveType, List<string> targetKeys, int amount)
        {
            if (playerId <= 0 || amount <= 0 || string.IsNullOrEmpty(objectiveType) || targetKeys == null || targetKeys.Count == 0)
                return false;

            try
            {
                string weekKey;
                string rotationGroup = GetWeeklyRotationGroup(out weekKey);
                bool changed = false;

                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    EnsureCurrentWeeklyMissionsActivated(client, playerId, weekKey, rotationGroup);

                    foreach (string targetKey in targetKeys)
                    {
                        if (string.IsNullOrEmpty(targetKey))
                            continue;

                        DataTable objectives = GetCompatibleWeeklyObjectives(client, playerId, weekKey, rotationGroup, objectiveType, targetKey);
                        if (objectives == null || objectives.Rows.Count == 0)
                            continue;

                        foreach (DataRow row in objectives.Rows)
                        {
                            int missionId = Convert.ToInt32(row["mission_id"]);
                            int requiredAmount = Convert.ToInt32(row["required_amount"]);
                            int currentAmount = Convert.ToInt32(row["current_amount"]);
                            int missing = requiredAmount - currentAmount;
                            if (missing <= 0)
                                continue;

                            int addAmount = Math.Min(amount, missing);
                            if (addAmount <= 0)
                                continue;

                            if (UpsertWeeklyObjectiveProgress(client, playerId, missionId, weekKey, objectiveType, targetKey, addAmount, requiredAmount))
                                changed = true;
                        }
                    }
                }

                return changed;
            }
            catch (Exception exception)
            {
                Output.WriteLine((object)("[QuestObjectiveProgress] Failed to update weekly " + objectiveType + " for player " + playerId + ": " + exception.Message), OutputLevel.Warning);
                return false;
            }
        }

        private static void EnsureCurrentWeeklyMissionsActivated(SqlDatabaseClient client, int playerId, string weekKey, string rotationGroup)
        {
            client.ClearParameters();
            client.SetParameter("player_id", playerId);
            client.SetParameter("week_key", weekKey);
            client.SetParameter("rotation_group", rotationGroup);
            client.ExecuteNonQuery(
                "INSERT IGNORE INTO site_player_weekly_missions " +
                "    (player_id, mission_id, week_key, status, accepted_at) " +
                "SELECT @player_id, m.id, @week_key, 'in_progress', NOW() " +
                "FROM site_weekly_missions m " +
                "WHERE m.enabled = 1 " +
                "  AND m.rotation_group = @rotation_group"
            );
        }

        private static DataTable GetCompatibleWeeklyObjectives(SqlDatabaseClient client, int playerId, string weekKey, string rotationGroup, string objectiveType, string targetKey)
        {
            client.ClearParameters();
            client.SetParameter("player_id", playerId);
            client.SetParameter("week_key", weekKey);
            client.SetParameter("rotation_group", rotationGroup);
            client.SetParameter("objective_type", objectiveType);
            client.SetParameter("target_key", targetKey);
            return client.ExecuteQueryTable(
                "SELECT pwm.mission_id, o.required_amount, COALESCE(p.current_amount, 0) AS current_amount " +
                "FROM site_player_weekly_missions pwm " +
                "INNER JOIN site_weekly_missions m ON m.id = pwm.mission_id " +
                "INNER JOIN site_weekly_mission_objectives o ON o.mission_id = m.id " +
                "LEFT JOIN site_player_weekly_mission_progress p " +
                "  ON p.player_id = pwm.player_id " +
                " AND p.mission_id = pwm.mission_id " +
                " AND p.week_key = pwm.week_key " +
                " AND p.objective_type = o.objective_type " +
                " AND p.target_key = o.target_key " +
                "WHERE pwm.player_id = @player_id " +
                "  AND pwm.week_key = @week_key " +
                "  AND pwm.status = 'in_progress' " +
                "  AND m.enabled = 1 " +
                "  AND m.rotation_group = @rotation_group " +
                "  AND o.objective_type = @objective_type " +
                "  AND o.target_key = @target_key " +
                "  AND COALESCE(p.current_amount, 0) < o.required_amount " +
                "ORDER BY m.slot ASC, pwm.mission_id ASC, o.sort_order ASC, o.id ASC"
            );
        }

        private static bool UpsertWeeklyObjectiveProgress(SqlDatabaseClient client, int playerId, int missionId, string weekKey, string objectiveType, string targetKey, int amount, int requiredAmount)
        {
            client.ClearParameters();
            client.SetParameter("player_id", playerId);
            client.SetParameter("mission_id", missionId);
            client.SetParameter("week_key", weekKey);
            client.SetParameter("objective_type", objectiveType);
            client.SetParameter("target_key", targetKey);
            client.SetParameter("amount", amount);
            client.SetParameter("required_amount", requiredAmount);
            return client.ExecuteNonQuery(
                "INSERT INTO site_player_weekly_mission_progress " +
                "    (player_id, mission_id, week_key, objective_type, target_key, current_amount, updated_at) " +
                "VALUES " +
                "    (@player_id, @mission_id, @week_key, @objective_type, @target_key, LEAST(@amount, @required_amount), NOW()) " +
                "ON DUPLICATE KEY UPDATE " +
                "    current_amount = LEAST(current_amount + @amount, @required_amount), " +
                "    updated_at = NOW()"
            ) >= 0;
        }

        private static string GetWeeklyRotationGroup(out string weekKey)
        {
            DateTime now = GetEuropeZurichNow();
            int isoYear;
            int isoWeek;
            GetIsoYearAndWeek(now, out isoYear, out isoWeek);
            weekKey = isoYear.ToString("0000", CultureInfo.InvariantCulture) + "-W" + isoWeek.ToString("00", CultureInfo.InvariantCulture);
            int rotationIndex = ((isoYear * 53) + isoWeek - 1) % 3;
            if (rotationIndex == 1)
                return "B";
            if (rotationIndex == 2)
                return "C";
            return "A";
        }

        private static DateTime GetEuropeZurichNow()
        {
            try
            {
                TimeZoneInfo zone = TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone);
            }
            catch
            {
                return DateTime.Now;
            }
        }

        private static void GetIsoYearAndWeek(DateTime date, out int isoYear, out int isoWeek)
        {
            int day = ((int)date.DayOfWeek + 6) % 7;
            DateTime thursday = date.AddDays(3 - day);
            Calendar calendar = CultureInfo.InvariantCulture.Calendar;
            isoYear = thursday.Year;
            isoWeek = calendar.GetWeekOfYear(thursday, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
        }

        private static DataTable GetCompatibleObjectives(SqlDatabaseClient client, int playerId, string objectiveType, string targetKey)
        {
            client.ClearParameters();
            client.SetParameter("player_id", playerId);
            client.SetParameter("objective_type", objectiveType);
            client.SetParameter("target_key", targetKey);
            return client.ExecuteQueryTable(
                "SELECT pq.quest_id, qo.required_amount, COALESCE(p.current_amount, 0) AS current_amount " +
                "FROM site_player_quests pq " +
                "INNER JOIN site_quests q ON q.id = pq.quest_id " +
                "INNER JOIN site_quest_objectives qo ON qo.quest_id = q.id " +
                "LEFT JOIN site_player_quest_objective_progress p " +
                "  ON p.player_id = pq.player_id " +
                " AND p.quest_id = pq.quest_id " +
                " AND p.objective_type = qo.objective_type " +
                " AND p.target_key = qo.target_key " +
                "WHERE pq.player_id = @player_id " +
                "  AND pq.status = 'in_progress' " +
                "  AND q.enabled = 1 " +
                "  AND qo.objective_type = @objective_type " +
                "  AND qo.target_key = @target_key " +
                "  AND COALESCE(p.current_amount, 0) < qo.required_amount " +
                "ORDER BY pq.accepted_at ASC, q.sort_order ASC, pq.quest_id ASC, qo.sort_order ASC, qo.id ASC"
            );
        }

        private static bool UpsertObjectiveProgress(SqlDatabaseClient client, int playerId, int questId, string objectiveType, string targetKey, int amount, int requiredAmount)
        {
            client.ClearParameters();
            client.SetParameter("player_id", playerId);
            client.SetParameter("quest_id", questId);
            client.SetParameter("objective_type", objectiveType);
            client.SetParameter("target_key", targetKey);
            client.SetParameter("amount", amount);
            client.SetParameter("required_amount", requiredAmount);
            return client.ExecuteNonQuery(
                "INSERT INTO site_player_quest_objective_progress " +
                "    (player_id, quest_id, objective_type, target_key, current_amount, updated_at) " +
                "VALUES " +
                "    (@player_id, @quest_id, @objective_type, @target_key, LEAST(@amount, @required_amount), NOW()) " +
                "ON DUPLICATE KEY UPDATE " +
                "    current_amount = LEAST(current_amount + @amount, @required_amount), " +
                "    updated_at = NOW()"
            ) >= 0;
        }

        private static string GetOreTarget(long resourceId)
        {
            switch (resourceId)
            {
                case 1L:
                    return "Prometium";
                case 2L:
                    return "Endurium";
                case 3L:
                    return "Terbium";
                default:
                    return null;
            }
        }

        private static string GetNpcTarget(string npcName, int mapId)
        {
            if (string.IsNullOrEmpty(npcName))
                return null;

            if (ContainsNpcNameExact(npcName, "StreuneR") || ContainsNpcName(npcName, "Streuner R"))
                return "StreuneR_X8";
            if (ContainsNpcNameExact(npcName, "Streuner"))
                return "Streuner";
            if (ContainsNpcName(npcName, "Lordakia")) return "Lordakia";
            if (ContainsNpcName(npcName, "Saimon")) return "Saimon";
            if (ContainsNpcName(npcName, "Mordon")) return "Mordon";
            if (ContainsNpcName(npcName, "Devolarium")) return "Devolarium";
            if (ContainsNpcName(npcName, "Sibelonit")) return "Sibelonit";
            if (ContainsNpcName(npcName, "Sibelon")) return "Sibelon";
            if (ContainsNpcName(npcName, "Lordakium")) return "Lordakium";
            if (ContainsNpcName(npcName, "Kristallin")) return "Kristallin";
            if (ContainsNpcName(npcName, "Kristallon")) return "Kristallon";
            if (ContainsNpcName(npcName, "Cubikon")) return "Cubikon";

            return null;
        }

        private static string GetWeeklyNpcTarget(string npcName)
        {
            string cleanName = CleanNpcName(npcName);
            switch (cleanName)
            {
                case "Streuner":
                case "Lordakia":
                case "Saimon":
                case "Mordon":
                case "Devolarium":
                case "Sibelon":
                case "Sibelonit":
                case "Lordakium":
                case "Kristallin":
                case "Kristallon":
                case "Cubikon":
                case "StreuneR":
                case "Uber Streuner":
                case "Uber Lordakia":
                case "Uber Saimon":
                case "Uber Mordon":
                case "Uber Devolarium":
                case "Uber Sibelon":
                case "Uber Sibelonit":
                case "Uber Lordakium":
                case "Uber Kristallin":
                case "Uber Kristallon":
                case "Uber StreuneR":
                case "Boss Cubikon":
                case "Boss Protegit":
                    return cleanName;
                default:
                    return null;
            }
        }

        private static string CleanNpcName(string npcName)
        {
            if (string.IsNullOrEmpty(npcName))
                return string.Empty;

            string value = npcName.Trim();
            if (value.StartsWith("-=[", StringComparison.Ordinal))
                value = value.Substring(3);
            if (value.EndsWith("]=-", StringComparison.Ordinal))
                value = value.Substring(0, value.Length - 3);
            return value.Trim();
        }

        private static string GetGalaxyGateTarget(string gateName)
        {
            if (string.IsNullOrEmpty(gateName))
                return null;

            if (gateName.IndexOf("Alpha", StringComparison.OrdinalIgnoreCase) >= 0 || gateName == "1") return "Alpha";
            if (gateName.IndexOf("Beta", StringComparison.OrdinalIgnoreCase) >= 0 || gateName == "2") return "Beta";
            if (gateName.IndexOf("Gamma", StringComparison.OrdinalIgnoreCase) >= 0 || gateName == "3") return "Gamma";
            if (gateName.IndexOf("Delta", StringComparison.OrdinalIgnoreCase) >= 0 || gateName == "4") return "Delta";

            return null;
        }

        private static bool ContainsNpcNameExact(string npcName, string target)
        {
            return npcName.IndexOf(target, StringComparison.Ordinal) >= 0;
        }

        private static bool ContainsNpcName(string npcName, string target)
        {
            return npcName.IndexOf(target, StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static int GetNpcProgressAmount(string npcName)
        {
            if (!string.IsNullOrEmpty(npcName) && npcName.IndexOf("Boss", StringComparison.OrdinalIgnoreCase) >= 0)
                return 2;

            return 1;
        }

        private static void EnsureSchema()
        {
            if (SchemaEnsured)
                return;

            lock (SchemaSync)
            {
                if (SchemaEnsured)
                    return;

                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ExecuteNonQuery(
                        "CREATE TABLE IF NOT EXISTS site_player_quest_objective_progress (" +
                        "player_id INT NOT NULL," +
                        "quest_id INT NOT NULL," +
                        "objective_type VARCHAR(32) NOT NULL," +
                        "target_key VARCHAR(64) NOT NULL," +
                        "current_amount INT NOT NULL DEFAULT 0," +
                        "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," +
                        "PRIMARY KEY (player_id, quest_id, objective_type, target_key)," +
                        "KEY idx_player_quest (player_id, quest_id)," +
                        "KEY idx_player_objective (player_id, objective_type, target_key)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
                    );
                }

                SchemaEnsured = true;
            }
        }
    }
}
