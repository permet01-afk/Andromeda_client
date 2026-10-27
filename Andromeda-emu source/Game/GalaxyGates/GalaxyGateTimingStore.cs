using OrbitReborn_Emulator.Storage;
using System;
using System.Data;
using System.Linq;
using OrbitReborn_Emulator.Game.Quests;
using OrbitReborn_Emulator.Game.Sessions;

namespace OrbitReborn_Emulator.Game.GalaxyGates
{
    public interface IGalaxyGateTimingTransaction : IDisposable
    {
        DataTable Query(string sql, params object[] parameters);
        int Execute(string sql, params object[] parameters);
        void Commit();
    }
    internal sealed class GalaxyGateTimingTransaction : IGalaxyGateTimingTransaction
    {
        private readonly SqlDatabaseTransaction db = new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString());
        public DataTable Query(string sql, params object[] parameters) { return db.Query(sql, parameters); }
        public int Execute(string sql, params object[] parameters) { return db.Execute(sql, parameters); }
        public void Commit() { db.Commit(); }
        public void Dispose() { db.Dispose(); }
    }

    /// <summary>No DDL, no per-kill statistics, no economic writes. Users -> Gate
    /// is the existing prepare/reward lock order. The final receipt and completed
    /// flag are committed together. An uncertain commit is resolved by RunId.</summary>
    public sealed class GalaxyGateTimingStore
    {
        internal const string ResetAssignments = ",timing_run_id=NULL,timing_started_at=NULL,timing_boot_id=NULL,timing_company_id=NULL,timing_rule_version=NULL,timing_eligible=0";
        private readonly Func<IGalaxyGateTimingTransaction> begin;
        private readonly IGalaxyGateTimingClock clock;
        private readonly Func<string> newId;
        public GalaxyGateTimingStore() : this(() => new GalaxyGateTimingTransaction(), GalaxyGateTimingClock.Instance) { }
        public GalaxyGateTimingStore(Func<IGalaxyGateTimingTransaction> begin, IGalaxyGateTimingClock clock, Func<string> newId = null)
        {
            this.begin = begin ?? throw new ArgumentNullException("begin");
            this.clock = clock ?? throw new ArgumentNullException("clock");
            this.newId = newId ?? (() => Guid.NewGuid().ToString("N"));
        }
        private static void RequireOne(int count) { if (count != 1) throw new InvalidOperationException("Galaxy Gate timing update failed."); }
        private static object SqlDate(long? value) { return value.HasValue ? (object)GalaxyGateCompletion.ToUtc(value.Value) : DBNull.Value; }
        public static bool HasTimingColumns(Func<string, DataTable> query)
        {
            var columns = query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='player_galaxy_gates' AND COLUMN_NAME IN ('timing_run_id','timing_started_at','timing_boot_id','timing_company_id','timing_rule_version','timing_eligible')");
            return columns != null && columns.Rows.Count == 6;
        }
        internal static string ResetIfAvailable(Func<string, DataTable> query)
        { return HasTimingColumns(query) ? ResetAssignments : ""; }
        private static bool SchemaReady(IGalaxyGateTimingTransaction tx)
        {
            if (!HasTimingColumns(s => tx.Query(s))) return false;
            var engines = tx.Query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('users','player_galaxy_gates','gg_completed_runs')");
            if (engines.Rows.Count != 3 || engines.Rows.Cast<DataRow>().Any(r => !string.Equals(Convert.ToString(r["ENGINE"]), "InnoDB", StringComparison.OrdinalIgnoreCase)))
                return false;
            var indexes = tx.Query("SELECT INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gg_completed_runs' ORDER BY INDEX_NAME,SEQ_IN_INDEX");
            if (!indexes.Rows.Cast<DataRow>().Where(r => Convert.ToInt32(r["NON_UNIQUE"]) == 0).GroupBy(r => Convert.ToString(r["INDEX_NAME"]))
                .Any(g => string.Join(",", g.OrderBy(r => Convert.ToInt32(r["SEQ_IN_INDEX"])).Select(r => Convert.ToString(r["COLUMN_NAME"]))) == "run_id"))
                return false;
            return true;
        }
        private static DataTable Gate(IGalaxyGateTimingTransaction tx, int player, int gate)
        {
            var users = tx.Query("SELECT id FROM users WHERE id=@uid FOR UPDATE", "@uid", player);
            if (users.Rows.Count != 1) throw new InvalidOperationException("Galaxy Gate pilot missing.");
            var rows = tx.Query("SELECT on_map,lives,completed,timing_run_id,timing_started_at,timing_boot_id,timing_company_id,timing_rule_version,timing_eligible FROM player_galaxy_gates WHERE user_id=@uid AND gate_id=@gid FOR UPDATE", "@uid", player, "@gid", gate);
            if (rows.Rows.Count != 1) throw new InvalidOperationException("Galaxy Gate timing requires exactly one Gate row.");
            return rows;
        }

        public GalaxyGateTimingRun Enter(int player, int gate, int company)
        {
            if (player <= 0 || gate < 1 || gate > 4 || company < 1 || company > 3) throw new ArgumentOutOfRangeException("gate");
            // Freeze the entry instant before the database round trip.
            long entered = clock.NowMilliseconds;
            string candidateId = newId();
            if (!GalaxyGateCompletion.ValidId(candidateId)) throw new InvalidOperationException("Invalid generated timing id.");
            using (var tx = begin())
            {
                if (!SchemaReady(tx))
                {
                    var users = tx.Query("SELECT id FROM users WHERE id=@uid FOR UPDATE", "@uid", player);
                    var old = tx.Query("SELECT on_map,lives,completed FROM player_galaxy_gates WHERE user_id=@uid AND gate_id=@gid FOR UPDATE", "@uid", player, "@gid", gate);
                    if (users.Rows.Count != 1 || old.Rows.Count != 1 || Convert.ToInt32(old.Rows[0]["on_map"]) != 1 || Convert.ToInt32(old.Rows[0]["lives"]) <= 0)
                        throw new InvalidOperationException("Galaxy Gate no longer active.");
                    var legacy = new GalaxyGateTimingRun { PlayerId = player, GateId = gate, CompanyAtStart = company,
                        RunId = candidateId, BootId = clock.BootId, RuleVersion = 0, Eligible = false,
                        TrackingAvailable = false, GateCompleted = Convert.ToInt32(old.Rows[0]["completed"]) == 1 };
                    tx.Commit(); return legacy;
                }
                var row = Gate(tx, player, gate).Rows[0];
                bool completed = Convert.ToInt32(row["completed"]) == 1;
                if (Convert.ToInt32(row["on_map"]) != 1 || Convert.ToInt32(row["lives"]) <= 0)
                    throw new InvalidOperationException("Galaxy Gate no longer active.");
                string id = Convert.ToString(row["timing_run_id"]);
                int version = row.IsNull("timing_rule_version") ? 0 : Convert.ToInt32(row["timing_rule_version"]);
                bool fresh = string.IsNullOrEmpty(id);
                // An old completed gate is never backfilled with a fabricated start.
                if (fresh && completed) { tx.Commit(); return new GalaxyGateTimingRun { GateCompleted = true }; }
                bool rankedStart = fresh && version == GalaxyGateCompletion.CurrentRuleVersion;
                if (fresh)
                {
                    id = candidateId;
                    RequireOne(tx.Execute("UPDATE player_galaxy_gates SET timing_run_id=@run,timing_started_at=@start,timing_boot_id=@boot,timing_company_id=@company,timing_rule_version=@version,timing_eligible=@eligible WHERE user_id=@uid AND gate_id=@gid AND timing_run_id IS NULL",
                        "@run", id, "@start", rankedStart ? (object)GalaxyGateCompletion.ToUtc(entered) : DBNull.Value,
                        "@boot", clock.BootId, "@company", company, "@version", rankedStart ? GalaxyGateCompletion.CurrentRuleVersion : 0,
                        "@eligible", rankedStart ? 1 : 0, "@uid", player, "@gid", gate));
                }
                var result = new GalaxyGateTimingRun {
                    PlayerId = player, GateId = gate, RunId = id, GateCompleted = completed,
                    CompanyAtStart = fresh ? company : row.IsNull("timing_company_id") ? 0 : Convert.ToInt32(row["timing_company_id"]),
                    StartedAtMilliseconds = fresh ? rankedStart ? (long?)entered : null : row.IsNull("timing_started_at") ? null : (long?)GalaxyGateCompletion.FromUtc(row["timing_started_at"]),
                    BootId = fresh ? clock.BootId : Convert.ToString(row["timing_boot_id"]),
                    RuleVersion = fresh ? rankedStart ? GalaxyGateCompletion.CurrentRuleVersion : 0 : version,
                    Eligible = fresh ? rankedStart : Convert.ToInt32(row["timing_eligible"]) == 1
                };
                if (!GalaxyGateCompletion.ValidId(result.RunId)) throw new InvalidOperationException("Invalid durable timing id.");
                tx.Commit(); return result;
            }
        }

        /// <returns>True if committed/already committed, false if the passage was
        /// abandoned/replaced before this completion. SQL errors always throw.</returns>
        public bool Complete(GalaxyGateCompletion done, int totalWaves)
        {
            if (done == null || totalWaves <= 0) throw new ArgumentException("Invalid completion.");
            using (var tx = begin())
            {
                if (!done.TrackingAvailable)
                {
                    // Proven absent timing schema only: preserve the old Gate
                    // progression, never pretend to have archived a timed run.
                    var users = tx.Query("SELECT id FROM users WHERE id=@uid FOR UPDATE", "@uid", done.PlayerId);
                    var old = tx.Query("SELECT on_map,lives,completed,current_wave FROM player_galaxy_gates WHERE user_id=@uid AND gate_id=@gid FOR UPDATE", "@uid", done.PlayerId, "@gid", done.GateId);
                    if (users.Rows.Count != 1 || old.Rows.Count != 1) throw new InvalidOperationException("Galaxy Gate pilot or Gate missing.");
                    var row = old.Rows[0];
                    if (Convert.ToInt32(row["on_map"]) != 1 || Convert.ToInt32(row["lives"]) <= 0 || Convert.ToInt32(row["current_wave"]) != totalWaves)
                    { tx.Commit(); return false; }
                    if (Convert.ToInt32(row["completed"]) != 1)
                    {
                        RequireOne(tx.Execute("UPDATE player_galaxy_gates SET completed=1,current_wave=@wave WHERE user_id=@uid AND gate_id=@gid AND on_map=1 AND lives>0 AND current_wave=@wave",
                            "@wave", totalWaves, "@uid", done.PlayerId, "@gid", done.GateId));
                        var owner = SessionManager.GetSessionByCharacterId(done.PlayerId);
                        QuestObjectiveProgress.ApplyGalaxyGateCompletionInTransaction(tx, done.PlayerId, done.GateId, owner == null ? null : owner.CharacterInfo);
                    }
                    tx.Commit(); return true;
                }
                if (!SchemaReady(tx)) throw new InvalidOperationException("Galaxy Gate timing schema became unavailable; completion retained for retry.");
                var gate = Gate(tx, done.PlayerId, done.GateId).Rows[0];
                var prior = tx.Query("SELECT player_id,gate_id,company_at_start,started_at,completed_at,elapsed_ms,rule_version,rank_eligible,exclusion_reason FROM gg_completed_runs WHERE run_id=@run FOR UPDATE", "@run", done.RunId);
                if (prior.Rows.Count > 1) throw new InvalidOperationException("Duplicate Galaxy Gate completion.");
                if (prior.Rows.Count == 1)
                {
                    if (!Same(prior.Rows[0], done)) throw new InvalidOperationException("Conflicting Galaxy Gate completion replay.");
                    tx.Commit(); return true;
                }
                if (Convert.ToString(gate["timing_run_id"]) != done.RunId || Convert.ToInt32(gate["on_map"]) != 1 || Convert.ToInt32(gate["lives"]) <= 0)
                { tx.Commit(); return false; }
                RequireOne(tx.Execute("INSERT INTO gg_completed_runs(run_id,player_id,gate_id,company_at_start,started_at,completed_at,elapsed_ms,rule_version,rank_eligible,exclusion_reason) VALUES(@run,@uid,@gid,@company,@start,@end,@elapsed,@version,@eligible,@reason)",
                    "@run", done.RunId, "@uid", done.PlayerId, "@gid", done.GateId, "@company", done.CompanyAtStart,
                    "@start", SqlDate(done.StartedAtMilliseconds), "@end", GalaxyGateCompletion.ToUtc(done.CompletedAtMilliseconds),
                    "@elapsed", done.ElapsedMilliseconds.HasValue ? (object)done.ElapsedMilliseconds.Value : DBNull.Value,
                    "@version", done.RuleVersion, "@eligible", done.RankEligible ? 1 : 0, "@reason", (object)done.ExclusionReason ?? DBNull.Value));
                RequireOne(tx.Execute("UPDATE player_galaxy_gates SET completed=1,current_wave=@wave WHERE user_id=@uid AND gate_id=@gid AND timing_run_id=@run AND on_map=1 AND lives>0",
                    "@wave", totalWaves, "@uid", done.PlayerId, "@gid", done.GateId, "@run", done.RunId));
                var liveOwner = SessionManager.GetSessionByCharacterId(done.PlayerId);
                QuestObjectiveProgress.ApplyGalaxyGateCompletionInTransaction(tx, done.PlayerId, done.GateId, liveOwner == null ? null : liveOwner.CharacterInfo);
                tx.Commit(); return true;
            }
        }
        private static bool Same(DataRow r, GalaxyGateCompletion d)
        {
            return Convert.ToInt32(r["player_id"]) == d.PlayerId && Convert.ToInt32(r["gate_id"]) == d.GateId
                && Convert.ToInt32(r["company_at_start"]) == d.CompanyAtStart
                && (r.IsNull("started_at") ? (long?)null : GalaxyGateCompletion.FromUtc(r["started_at"])) == d.StartedAtMilliseconds
                && GalaxyGateCompletion.FromUtc(r["completed_at"]) == d.CompletedAtMilliseconds
                && (r.IsNull("elapsed_ms") ? (long?)null : Convert.ToInt64(r["elapsed_ms"])) == d.ElapsedMilliseconds
                && Convert.ToInt32(r["rule_version"]) == d.RuleVersion && (Convert.ToInt32(r["rank_eligible"]) == 1) == d.RankEligible
                && Convert.ToString(r["exclusion_reason"]) == (d.ExclusionReason ?? "");
        }
    }
}
