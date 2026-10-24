using OrbitReborn_Emulator.Storage;
using MySqlConnector;
using System;
using System.Data;

namespace OrbitReborn_Emulator.Game.Laboratory
{
    public static class RefiningUpgradeRules
    {
        public static bool IsAllowed(string target, int ore)
        {
            switch ((target ?? string.Empty).ToUpperInvariant())
            {
                case "LASER": case "ROCKET": return ore == 11 || ore == 13 || ore == 14;
                case "SHIELD": return ore == 12 || ore == 13 || ore == 14;
                case "DRIVING": return ore == 12 || ore == 13;
                default: return false;
            }
        }

        public static string OreColumn(int ore)
        {
            switch (ore) { case 11: return "prometid"; case 12: return "duranium"; case 13: return "promerium"; case 14: return "seprom"; default: return null; }
        }

        public static string TargetColumn(string target)
        {
            switch ((target ?? string.Empty).ToUpperInvariant()) { case "LASER": return "laser"; case "ROCKET": return "rocket"; case "DRIVING": return "speed"; case "SHIELD": return "shield"; default: return null; }
        }

        public static bool TryCalculate(string target, int ore, int amount, int previousOre, int previousValue,
            long now, out int value, out string error)
        {
            value = 0; error = null;
            target = (target ?? string.Empty).ToUpperInvariant();
            if (amount <= 0) { error = "Invalid upgrade amount. Choose a positive whole number."; return false; }
            if (!IsAllowed(target, ore)) { error = "This ore cannot be used on this target."; return false; }
            bool timed = target == "SHIELD" || target == "DRIVING";
            long calculated;
            if (timed)
            {
                if (now < 0 || now > int.MaxValue) { error = "The server time exceeds the supported upgrade range."; return false; }
                long start = previousOre == ore && previousValue > now ? previousValue : now;
                // Preserve the existing 600 seconds per ore and five-second adjustment.
                calculated = start + 600L * amount - 5L;
            }
            else
            {
                long existing = previousOre == ore ? Math.Max(0, previousValue) : 0L;
                calculated = existing + 10L * amount;
            }
            if (calculated < 0 || calculated > int.MaxValue)
            { error = "Upgrade amount exceeds the supported limit. Choose a smaller quantity."; return false; }
            value = (int)calculated;
            return true;
        }
    }

    public interface IRefiningUpgradeTransaction : IDisposable
    {
        DataTable Query(string sql, params object[] parameters);
        int Execute(string sql, params object[] parameters);
        void Commit();
    }

    internal sealed class RefiningUpgradeTransaction : IRefiningUpgradeTransaction
    {
        private readonly SqlDatabaseTransaction db = new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString());
        public DataTable Query(string sql, params object[] parameters) { return db.Query(sql, parameters); }
        public int Execute(string sql, params object[] parameters) { return db.Execute(sql, parameters); }
        public void Commit() { db.Commit(); }
        public void Dispose() { db.Dispose(); }
    }

    public sealed class RefiningUpgradeReceipt
    {
        public int RemainingCargo;
        public int Ore;
        public int Value;
        public string Target;
    }

    /// <summary>One cargo debit and one enhancement commit together. No automatic retries.</summary>
    public sealed class RefiningUpgradeStore
    {
        private readonly Func<IRefiningUpgradeTransaction> begin;
        public RefiningUpgradeStore() : this(() => new RefiningUpgradeTransaction()) { }
        public RefiningUpgradeStore(Func<IRefiningUpgradeTransaction> begin) { this.begin = begin; }

        // These legacy single-row writes share the player-local refinement lock.
        // Use a bounded native pooled connection, never the custom legacy pool:
        // callers may already hold one of its leases for an unrelated reward.
        private static void ExecuteSingle(string sql, params object[] parameters)
        {
            var options = new MySqlConnectionStringBuilder(SqlDatabaseManager.GenerateConnectionString()) {
                MinimumPoolSize = 0, ConnectionTimeout = 5,
                DefaultCommandTimeout = 10, ConnectionReset = true, UseAffectedRows = false
            };
            using (var connection = new MySqlConnection(options.ToString()))
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = sql; command.CommandTimeout = 10;
                    for (int i = 0; i < parameters.Length; i += 2)
                        command.Parameters.AddWithValue((string)parameters[i], parameters[i + 1] ?? DBNull.Value);
                    RequireOne(command.ExecuteNonQuery());
                }
            }
        }

        public static void FlushAmmunition(int playerId, int laserOre, int laserUnits, int rocketOre, int rocketUnits)
        {
            ExecuteSingle("UPDATE player_reff SET laser0=@laserOre,laser1=@laserUnits,rocket0=@rocketOre,rocket1=@rocketUnits WHERE id=@id",
                "@laserOre", laserOre, "@laserUnits", laserUnits, "@rocketOre", rocketOre, "@rocketUnits", rocketUnits, "@id", playerId);
        }

        public static void WriteExistingBonus(int playerId, string target, int ore, int value)
        {
            string prefix = RefiningUpgradeRules.TargetColumn(target);
            if (prefix == null) throw new ArgumentOutOfRangeException("target");
            ExecuteSingle("UPDATE player_reff SET " + prefix + "0=@ore," + prefix + "1=@value WHERE id=@id",
                "@ore", ore, "@value", value, "@id", playerId);
        }

        public static void ChangeCargo(int playerId, long oreId, int amount, bool remove)
        {
            string column;
            switch (oreId) {
                case 1: column = "prometium"; break; case 2: column = "endurium"; break;
                case 3: column = "terbium"; break; case 4: column = "xenomit"; break;
                case 5: column = "palladium"; break; case 11: column = "prometid"; break;
                case 12: column = "duranium"; break; case 13: column = "promerium"; break;
                case 14: column = "seprom"; break; default: throw new ArgumentOutOfRangeException("oreId");
            }
            if (amount <= 0) throw new ArgumentOutOfRangeException("amount");
            string guard = remove ? column + ">=@amount" : column + "<=2147483647-@amount";
            ExecuteSingle("UPDATE player_cargo SET " + column + "=" + column + (remove ? "-" : "+") + "@amount WHERE id=@id AND " + guard,
                "@amount", amount, "@id", playerId);
        }

        public bool TryApply(int playerId, string target, int ore, int amount, long now,
            out RefiningUpgradeReceipt receipt, out string error)
        {
            receipt = null; error = null;
            target = (target ?? string.Empty).ToUpperInvariant();
            if (playerId <= 0 || amount <= 0) { error = "Invalid upgrade amount. Choose a positive whole number."; return false; }
            if (!RefiningUpgradeRules.IsAllowed(target, ore)) { error = "This ore cannot be used on this target."; return false; }
            string column = RefiningUpgradeRules.OreColumn(ore), prefix = RefiningUpgradeRules.TargetColumn(target);
            bool commitAttempted = false;
            try
            {
                using (var tx = begin())
                {
                    // Fail closed; never create or alter schema during gameplay.
                    var engines = tx.Query("SHOW TABLE STATUS WHERE Name IN ('player_cargo','player_reff')");
                    if (engines.Rows.Count != 2) throw new InvalidOperationException("Refinement tables unavailable.");
                    foreach (DataRow engine in engines.Rows)
                        if (!string.Equals(Convert.ToString(engine["Engine"]), "InnoDB", StringComparison.OrdinalIgnoreCase))
                            throw new InvalidOperationException("Refinement requires transactional tables.");

                    // All refinement operations take the same cargo -> enhancement lock order.
                    var cargo = tx.Query("SELECT " + column + " FROM player_cargo WHERE id=@id FOR UPDATE", "@id", playerId);
                    if (cargo.Rows.Count != 1) { error = "Your cargo could not be loaded. Reconnect before upgrading."; return false; }
                    int available = Convert.ToInt32(cargo.Rows[0][column]);
                    if (amount > available) { error = "Not enough ore in cargo. Refresh the available quantity."; return false; }

                    var states = tx.Query("SELECT " + prefix + "0," + prefix + "1 FROM player_reff WHERE id=@id FOR UPDATE", "@id", playerId);
                    if (states.Rows.Count > 1) throw new InvalidOperationException("Duplicate refinement state.");
                    int oldOre = states.Rows.Count == 0 ? 0 : Convert.ToInt32(states.Rows[0][prefix + "0"]);
                    int oldValue = states.Rows.Count == 0 ? 0 : Convert.ToInt32(states.Rows[0][prefix + "1"]);
                    int newValue;
                    if (!RefiningUpgradeRules.TryCalculate(target, ore, amount, oldOre, oldValue, now, out newValue, out error)) return false;

                    if (states.Rows.Count == 0)
                        RequireOne(tx.Execute("INSERT INTO player_reff (id,laser0,laser1,rocket0,rocket1,speed0,speed1,shield0,shield1) VALUES (@id,0,0,0,0,0,0,0,0)", "@id", playerId));
                    RequireOne(tx.Execute("UPDATE player_reff SET " + prefix + "0=@ore," + prefix + "1=@value WHERE id=@id", "@ore", ore, "@value", newValue, "@id", playerId));
                    RequireOne(tx.Execute("UPDATE player_cargo SET " + column + "=" + column + "-@amount WHERE id=@id AND " + column + ">=@amount", "@amount", amount, "@id", playerId));
                    commitAttempted = true;
                    tx.Commit();
                    receipt = new RefiningUpgradeReceipt { RemainingCargo = available - amount, Ore = ore, Value = newValue, Target = target };
                    return true;
                }
            }
            catch (Exception exception)
            {
                // A lost commit acknowledgement is never retried. The caller reloads state.
                error = commitAttempted
                    ? "Upgrade could not be confirmed. Check the refreshed inventory before trying again."
                    : "Unable to apply the upgrade. Your cargo and enhancement were not changed.";
                Console.WriteLine("Refining upgrade storage failed: " + exception.GetType().Name);
                return false;
            }
        }

        private static void RequireOne(int count)
        {
            if (count != 1) throw new InvalidOperationException("Refinement write did not affect exactly one player row.");
        }
    }
}
