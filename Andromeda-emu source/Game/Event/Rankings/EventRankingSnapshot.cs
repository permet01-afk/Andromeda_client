using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

namespace OrbitReborn_Emulator.Game.Event.Rankings
{
    public sealed class EventRankingStart
    {
        public string RunKey { get; set; }
        public string EventType { get; set; }
        public string OccurrenceKey { get; set; }
        private DateTime Started;
        public DateTime StartedAtUtc { get { return Started; } set { Started = EventRankingSnapshot.Milliseconds(value); } }
        public int RulesVersion { get; set; } = 1;
        public void Validate()
        {
            if (!Regex.IsMatch(RunKey ?? "", "^[a-f0-9]{32}$") ||
                !new[] { "spaceball", "tdm", "invasion" }.Contains(EventType) ||
                string.IsNullOrEmpty(OccurrenceKey) || OccurrenceKey.Length > 160 ||
                OccurrenceKey.Any(c => c < 32 || c > 126) || RulesVersion != 1 ||
                StartedAtUtc.Kind != DateTimeKind.Utc || StartedAtUtc < new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc))
                throw new ArgumentException("Invalid event ranking identity.");
        }
        public static string Key(string eventType, string sourceId)
        { return EventRankingSnapshot.Hash(eventType + ":" + sourceId).Substring(0, 32); }
    }
    public sealed class EventRankingRow
    {
        public string EntityType { get; set; }
        public int EntityId { get; set; }
        public int CompanyAtEvent { get; set; }
        public string Metric { get; set; }
        public long Score { get; set; }
        public string Outcome { get; set; }
        public string DetailsJson { get; set; }
        public string Identity { get { return EntityType + ":" + EntityId.ToString(CultureInfo.InvariantCulture) + ":" + Metric; } }
    }
    public sealed class EventRankingSnapshot
    {
        public EventRankingStart Start { get; set; }
        private DateTime? Ended;
        public DateTime? EndedAtUtc { get { return Ended; } set { Ended = value.HasValue ? EventRankingSnapshot.Milliseconds(value.Value) : (DateTime?)null; } }
        public string Status { get; set; }
        public string EndReason { get; set; }
        public EventRankingRow[] Rows { get; set; } = new EventRankingRow[0];
        public static JavaScriptSerializer Json() { return new JavaScriptSerializer { MaxJsonLength = 32 * 1024 * 1024 }; }
        public static string Hash(string value)
        {
            using (var hash = SHA256.Create())
                return BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(value))).Replace("-", "").ToLowerInvariant();
        }
        public static DateTime Milliseconds(DateTime value)
        { return new DateTime(value.Ticks - value.Ticks % TimeSpan.TicksPerMillisecond, value.Kind); }
        internal static string Utc(DateTime value) { return value.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture); }
        public void Validate()
        {
            if (Start == null) throw new ArgumentException("Event ranking start missing.");
            Start.Validate();
            if (!new[] { "finished", "cancelled", "interrupted" }.Contains(Status) ||
                !Regex.IsMatch(EndReason ?? "", "^[a-z0-9_]{1,64}$") || Rows == null || Rows.Length > 10000 ||
                (Status == "interrupted" ? EndedAtUtc.HasValue || Rows.Length != 0 : !EndedAtUtc.HasValue) ||
                (EndedAtUtc.HasValue && (EndedAtUtc.Value.Kind != DateTimeKind.Utc || EndedAtUtc < Start.StartedAtUtc)))
                throw new ArgumentException("Invalid event ranking final state.");
            var identities = new HashSet<string>(StringComparer.Ordinal);
            foreach (var row in Rows)
            {
                if (row == null || !new[] { "company", "player" }.Contains(row.EntityType) || row.EntityId <= 0 ||
                    row.CompanyAtEvent < 1 || row.CompanyAtEvent > 3 || row.Score < 0 ||
                    (row.EntityType == "company" && row.EntityId != row.CompanyAtEvent) ||
                    !new[] { "WIN", "LOSS", "DRAW", "NONE", "CANCELLED", "COMPLETE", "INCOMPLETE" }.Contains(row.Outcome) ||
                    !MetricAllowed(Start.EventType, row.EntityType, row.Metric) || !identities.Add(row.Identity) ||
                    (row.DetailsJson != null && Encoding.UTF8.GetByteCount(row.DetailsJson) > 60000))
                    throw new ArgumentException("Invalid event ranking result.");
                if (!string.IsNullOrEmpty(row.DetailsJson)) Json().DeserializeObject(row.DetailsJson);
            }
        }
        private static bool MetricAllowed(string type, string entity, string metric)
        {
            if (type == "spaceball") return entity == "company" && metric == "goals";
            if (type == "invasion") return entity == "company" && (metric == "progress" || metric == "damage");
            return type == "tdm" && (entity == "company" ? metric == "match_wins" : new[] { "kills", "deaths", "damage" }.Contains(metric));
        }
        public string Canonical()
        {
            Validate();
            return Json().Serialize(new {
                run_key = Start.RunKey, event_type = Start.EventType, occurrence_key = Start.OccurrenceKey,
                started_at = Utc(Start.StartedAtUtc), ended_at = EndedAtUtc.HasValue ? Utc(EndedAtUtc.Value) : null,
                status = Status, end_reason = EndReason, rules_version = Start.RulesVersion,
                rows = Rows.OrderBy(r => r.EntityType, StringComparer.Ordinal).ThenBy(r => r.EntityId).ThenBy(r => r.Metric, StringComparer.Ordinal)
                    .Select(r => new { entity_type = r.EntityType, entity_id = r.EntityId, company_at_event = r.CompanyAtEvent,
                        metric = r.Metric, score = r.Score, outcome = r.Outcome, details_json = r.DetailsJson }).ToArray()
            });
        }
        public string SnapshotHash { get { return Hash(Canonical()); } }
        public EventRankingSnapshot Copy() { return Json().Deserialize<EventRankingSnapshot>(Json().Serialize(this)); }
        public static EventRankingSnapshot Interrupted(EventRankingStart start)
        { return new EventRankingSnapshot { Start = start, Status = "interrupted", EndReason = "server_restart" }; }
    }
}
