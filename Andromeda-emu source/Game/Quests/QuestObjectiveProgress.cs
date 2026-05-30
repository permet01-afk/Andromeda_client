using OrbitReborn_Emulator.Storage;
using System;
using System.Data;

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
            string target = GetNpcTarget(npcName, mapId);
            if (target == null)
                return false;

            int amount = GetNpcProgressAmount(npcName);
            return AddProgress(playerId, "npc_kill", target, amount, false);
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
