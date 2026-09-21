using MySql.Data.MySqlClient;
using System;
using System.Data;

namespace OrbitReborn_Emulator.Storage
{
    /// <summary>A small, throwing transaction scope for TECH operations.
    /// Owns a native MySql pooled connection; never leaves a transaction in the
    /// legacy SqlDatabaseClient pool. A failed rollback invalidates its native pool.
    /// </summary>
    public sealed class SqlDatabaseTransaction : IDisposable
    {
        private MySqlConnection connection;
        private MySqlTransaction transaction;
        private bool committed;

        public SqlDatabaseTransaction(string connectionString)
        {
            // A distinct native pool avoids waiting for a connection permanently
            // held by the legacy custom pool while holding a player lifecycle lock.
            var options = new MySqlConnectionStringBuilder(connectionString) {
                MinimumPoolSize = 0, ConnectionTimeout = 5,
                DefaultCommandTimeout = 10, ConnectionReset = true
            };
            connection = new MySqlConnection(options.ToString());
            try
            {
                connection.Open();
                transaction = connection.BeginTransaction(IsolationLevel.ReadCommitted);
            }
            catch { connection.Dispose(); connection = null; throw; }
        }

        private MySqlCommand Command(string sql, object[] parameters)
        {
            if (connection == null || transaction == null || committed) throw new InvalidOperationException("Transaction is not active.");
            if (parameters.Length % 2 != 0) throw new ArgumentException("Expected parameter name/value pairs.");
            MySqlCommand cmd = connection.CreateCommand();
            cmd.Transaction = transaction;
            cmd.CommandText = sql;
            cmd.CommandTimeout = 10;
            for (int i = 0; i < parameters.Length; i += 2)
                cmd.Parameters.AddWithValue((string)parameters[i], parameters[i + 1] ?? DBNull.Value);
            return cmd;
        }

        public int Execute(string sql, params object[] parameters)
        {
            using (MySqlCommand cmd = Command(sql, parameters)) return cmd.ExecuteNonQuery();
        }

        public object Scalar(string sql, params object[] parameters)
        {
            using (MySqlCommand cmd = Command(sql, parameters)) return cmd.ExecuteScalar();
        }

        public DataTable Query(string sql, params object[] parameters)
        {
            using (MySqlCommand cmd = Command(sql, parameters))
            using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
            {
                DataTable table = new DataTable();
                adapter.Fill(table);
                return table;
            }
        }

        public void Commit()
        {
            if (transaction == null || committed) throw new InvalidOperationException("Transaction is not active.");
            // A thrown Commit has an uncertain outcome. Callers must NOT retry a debit.
            transaction.Commit();
            committed = true;
        }

        public void Dispose()
        {
            try
            {
                if (transaction != null && !committed)
                {
                    try { transaction.Rollback(); }
                    catch { if (connection != null) MySqlConnection.ClearPool(connection); }
                }
            }
            finally
            {
                try { if (transaction != null) transaction.Dispose(); }
                finally
                {
                    try { if (connection != null) connection.Dispose(); }
                    finally { transaction = null; connection = null; }
                }
            }
        }
    }
}
