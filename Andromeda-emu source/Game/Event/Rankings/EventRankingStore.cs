using System;
using System.Data;
using System.Linq;
using OrbitReborn_Emulator.Storage;

namespace OrbitReborn_Emulator.Game.Event.Rankings
{
    public sealed class EventRankingConflictException : InvalidOperationException
    {
        public EventRankingConflictException(string runKey)
            : base("Conflicting immutable event ranking facts for run " + runKey + "; existing SQL result preserved.") { }
    }
    public interface IEventRankingTransaction : IDisposable
    {
        DataTable Query(string sql, params object[] parameters);
        int Execute(string sql, params object[] parameters);
        void Commit();
    }
    internal sealed class EventRankingTransaction : IEventRankingTransaction
    {
        private readonly SqlDatabaseTransaction Db = new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString());
        public DataTable Query(string sql, params object[] parameters) { return Db.Query(sql, parameters); }
        public int Execute(string sql, params object[] parameters) { return Db.Execute(sql, parameters); }
        public void Commit() { Db.Commit(); }
        public void Dispose() { Db.Dispose(); }
    }
    public sealed class EventRankingStore
    {
        private readonly Func<IEventRankingTransaction> Open;
        public EventRankingStore(Func<IEventRankingTransaction> open)
        { Open = open ?? throw new ArgumentNullException("open"); }
        // One short transaction per final snapshot. No users/reward table is read
        // or written here. A failed/ambiguous commit retries the same immutable hash.
        public bool Save(EventRankingSnapshot snapshot)
        {
            snapshot.Validate();
            string hash = snapshot.SnapshotHash;
            using (var db = Open())
            {
                var prior = db.Query("SELECT snapshot_hash FROM event_ranking_runs WHERE run_key=@r FOR UPDATE", "@r", snapshot.Start.RunKey);
                var rows = db.Query("SELECT entity_type,entity_id,company_at_event,metric,score,outcome,details_json FROM event_ranking_results WHERE run_key=@r ORDER BY entity_type,entity_id,metric FOR UPDATE", "@r", snapshot.Start.RunKey);
                // Opening both tables pins metadata before checking their engines.
                var engines = db.Query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('event_ranking_runs','event_ranking_results')");
                if (engines.Rows.Count != 2 || engines.Rows.Cast<DataRow>().Any(r => !string.Equals(Convert.ToString(r["ENGINE"]), "InnoDB", StringComparison.OrdinalIgnoreCase)))
                    throw new InvalidOperationException("Event rankings require both manual InnoDB tables.");
                var indexes = db.Query("SELECT TABLE_NAME,COLUMN_NAME,SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND INDEX_NAME='PRIMARY' AND TABLE_NAME IN ('event_ranking_runs','event_ranking_results') ORDER BY TABLE_NAME,SEQ_IN_INDEX");
                foreach (var expected in new[] { new[] { "event_ranking_runs", "run_key" }, new[] { "event_ranking_results", "run_key,entity_type,entity_id,metric" } })
                {
                    string key = string.Join(",", indexes.Rows.Cast<DataRow>().Where(r => Convert.ToString(r["TABLE_NAME"]) == expected[0])
                        .OrderBy(r => Convert.ToInt32(r["SEQ_IN_INDEX"])).Select(r => Convert.ToString(r["COLUMN_NAME"])));
                    if (key != expected[1]) throw new InvalidOperationException("Event ranking primary key missing.");
                }
                if (prior.Rows.Count != 0)
                {
                    if (prior.Rows.Count != 1 || Convert.ToString(prior.Rows[0]["snapshot_hash"]) != hash || !SameRows(snapshot, rows))
                        throw new EventRankingConflictException(snapshot.Start.RunKey);
                    db.Commit(); return false;
                }
                if (rows.Rows.Count != 0) throw new InvalidOperationException("Orphan event ranking result.");
                int inserted = db.Execute("INSERT INTO event_ranking_runs(run_key,event_type,occurrence_key,started_at,ended_at,status,end_reason,rules_version,snapshot_hash,recorded_at) VALUES(@r,@e,@o,@s,@end,@status,@reason,@v,@h,UTC_TIMESTAMP(3))",
                    "@r", snapshot.Start.RunKey, "@e", snapshot.Start.EventType, "@o", snapshot.Start.OccurrenceKey,
                    "@s", snapshot.Start.StartedAtUtc, "@end", snapshot.EndedAtUtc, "@status", snapshot.Status,
                    "@reason", snapshot.EndReason, "@v", snapshot.Start.RulesVersion, "@h", hash);
                if (inserted != 1) throw new InvalidOperationException("Event ranking header was not inserted.");
                foreach (var row in snapshot.Rows.OrderBy(r => r.EntityType, StringComparer.Ordinal).ThenBy(r => r.EntityId).ThenBy(r => r.Metric, StringComparer.Ordinal))
                {
                    inserted = db.Execute("INSERT INTO event_ranking_results(run_key,entity_type,entity_id,company_at_event,metric,score,outcome,details_json) VALUES(@r,@t,@id,@c,@m,@s,@o,@j)",
                        "@r", snapshot.Start.RunKey, "@t", row.EntityType, "@id", row.EntityId, "@c", row.CompanyAtEvent,
                        "@m", row.Metric, "@s", row.Score, "@o", row.Outcome, "@j", row.DetailsJson);
                    if (inserted != 1) throw new InvalidOperationException("Event ranking result was not inserted.");
                }
                db.Commit(); return true;
            }
        }
        private static bool SameRows(EventRankingSnapshot snapshot, DataTable stored)
        {
            var expected = snapshot.Rows.OrderBy(r => r.EntityType, StringComparer.Ordinal).ThenBy(r => r.EntityId).ThenBy(r => r.Metric, StringComparer.Ordinal).ToArray();
            if (stored.Rows.Count != expected.Length) return false;
            for (int i = 0; i < expected.Length; ++i)
            {
                var a = expected[i]; var b = stored.Rows[i];
                if (a.EntityType != Convert.ToString(b["entity_type"]) || a.EntityId != Convert.ToInt32(b["entity_id"]) ||
                    a.CompanyAtEvent != Convert.ToInt32(b["company_at_event"]) || a.Metric != Convert.ToString(b["metric"]) ||
                    a.Score != Convert.ToInt64(b["score"]) || a.Outcome != Convert.ToString(b["outcome"]) ||
                    (a.DetailsJson ?? "") != Convert.ToString(b["details_json"])) return false;
            }
            return true;
        }
    }
}
