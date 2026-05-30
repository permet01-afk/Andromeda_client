using OrbitReborn_Emulator.Storage;
using System;

namespace OrbitReborn_Emulator.Game.Quests
{
    internal static class QuestOreProgress
    {
        private static readonly object SchemaSync = new object();
        private static bool SchemaEnsured = false;

        public static bool AddOreProgress(int playerId, long resourceId, int amount)
        {
            if (playerId <= 0 || amount <= 0)
                return false;

            string column = GetOreColumn(resourceId);
            if (column == null)
                return false;

            bool objectiveProgressChanged = false;

            try
            {
                EnsureSchema();

                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.SetParameter("player_id", playerId);
                    client.SetParameter("amount", amount);
                    client.ExecuteNonQuery(
                        "INSERT INTO site_quest_ore_counts (player_id, `" + column + "`, updated_at) " +
                        "VALUES (@player_id, @amount, NOW()) " +
                        "ON DUPLICATE KEY UPDATE `" + column + "` = `" + column + "` + @amount, updated_at = NOW()"
                    );
                }

                objectiveProgressChanged = QuestObjectiveProgress.AddOreCollectProgress(playerId, resourceId, amount);
            }
            catch (Exception exception)
            {
                Output.WriteLine((object)("[QuestOreProgress] Failed to update ore progress for player " + playerId + ": " + exception.Message), OutputLevel.Warning);
            }

            return objectiveProgressChanged;
        }

        private static string GetOreColumn(long resourceId)
        {
            switch (resourceId)
            {
                case 1L:
                    return "prometium";
                case 2L:
                    return "endurium";
                case 3L:
                    return "terbium";
                default:
                    return null;
            }
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
                        "CREATE TABLE IF NOT EXISTS site_quest_ore_counts (" +
                        "player_id INT NOT NULL PRIMARY KEY," +
                        "prometium BIGINT NOT NULL DEFAULT 0," +
                        "endurium BIGINT NOT NULL DEFAULT 0," +
                        "terbium BIGINT NOT NULL DEFAULT 0," +
                        "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
                    );
                }

                SchemaEnsured = true;
            }
        }
    }
}
