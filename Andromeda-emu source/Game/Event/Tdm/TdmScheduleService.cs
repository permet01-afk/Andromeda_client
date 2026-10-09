using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Web.Script.Serialization;

namespace OrbitReborn_Emulator.Game.Event.Tdm
{
    public sealed class TdmWeeklySlot
    {
        public string id { get; set; }
        public string day { get; set; }
        public string start { get; set; }
        public string end { get; set; }
    }
    public sealed class TdmScheduleConfig
    {
        public bool enabled { get; set; }
        public string timezone { get; set; }
        public TdmWeeklySlot[] weeklySlots { get; set; }
    }
    public sealed class TdmOccurrence
    {
        public string Id { get; set; }
        public DateTime StartUtc { get; set; }
        public DateTime EndUtc { get; set; }
    }
    public sealed class TdmScheduleState
    {
        public int Version { get; set; } = 1;
        public string Active { get; set; } = "";
        public string Manual { get; set; } = "";
        public Dictionary<string, bool> Cancelled { get; set; } = new Dictionary<string, bool>();
        public Dictionary<string, bool> Sent { get; set; } = new Dictionary<string, bool>();
    }
    // Same atomic file primitive is also used by the reward outbox. Corrupt state
    // is an error, never silently reset (that would replay announcements/claims).
    public static class TdmAtomicFile
    {
        public static void Write(string path, string value)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path)));
            string temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                byte[] bytes = new UTF8Encoding(false).GetBytes(value);
                using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                { stream.Write(bytes, 0, bytes.Length); stream.Flush(true); }
                if (File.Exists(path)) File.Replace(temp, path, null);
                else File.Move(temp, path);
            }
            finally { if (File.Exists(temp)) File.Delete(temp); }
        }
    }
    // Single-server scheduler. Callbacks run under its lock, never under TDM's
    // state-machine lock. UTC occurrences do not change the match monotonic clock.
    public sealed class TdmScheduleService
    {
        private readonly object Sync = new object();
        private readonly Func<DateTime> Clock;
        private readonly Action<string> Start, Broadcast, Log;
        private readonly Action Stop;
        private readonly Func<bool> IsActive;
        private readonly Action<string> Persist;
        private TdmScheduleState State;
        private TdmScheduleConfig Config;
        private readonly TimeZoneInfo Zone;
        private readonly HashSet<string> Warnings = new HashSet<string>();
        private static readonly int[] Thresholds = { 3600, 1800, 900, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 };
        public TdmScheduleService(Func<DateTime> clock, Action<string> persist, string saved,
            Action<string> start, Action stop, Func<bool> isActive, Action<string> broadcast, Action<string> log)
        {
            Clock = clock; Persist = persist; Start = start; Stop = stop; IsActive = isActive; Broadcast = broadcast; Log = log;
            try { Zone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Zurich"); }
            catch (TimeZoneNotFoundException) { Zone = TimeZoneInfo.FindSystemTimeZoneById("W. Europe Standard Time"); }
            // Windows alias represents the same Zurich civil rules; no OS-zone fallback.
            State = string.IsNullOrWhiteSpace(saved) ? new TdmScheduleState() : Json().Deserialize<TdmScheduleState>(saved);
            if (State == null || State.Version != 1 || State.Cancelled == null || State.Sent == null) throw new InvalidDataException("Invalid TDM schedule state");
            Config = new TdmScheduleConfig { enabled = true, timezone = "Europe/Zurich", weeklySlots = new TdmWeeklySlot[0] };
        }
        private static JavaScriptSerializer Json() { return new JavaScriptSerializer(); }
        private DateTime Now { get { return DateTime.SpecifyKind(Clock(), DateTimeKind.Utc); } }
        private void Change(Action change)
        {
            string old = Json().Serialize(State);
            try { change(); Persist(Json().Serialize(State)); }
            catch { State = Json().Deserialize<TdmScheduleState>(old); throw; }
        }
        private static TimeSpan ParseTime(string value)
        {
            TimeSpan time;
            if (!TimeSpan.TryParseExact(value, @"hh\:mm", CultureInfo.InvariantCulture, out time) || time.TotalHours >= 24)
                throw new InvalidDataException("TDM slot time must be HH:mm");
            return time;
        }
        private static int Day(string name)
        {
            DayOfWeek day;
            if (!Enum.TryParse(name, true, out day) || !Enum.IsDefined(typeof(DayOfWeek), day) || name.Any(char.IsDigit))
                throw new InvalidDataException("TDM day must be an English weekday");
            return (int)day;
        }
        public void Reload(string json)
        {
            var fields = Json().Deserialize<Dictionary<string, object>>(json);
            if (fields == null || !fields.ContainsKey("enabled") || !(fields["enabled"] is bool))
                throw new InvalidDataException("TDM enabled must be an explicit boolean");
            var config = Json().Deserialize<TdmScheduleConfig>(json);
            if (config == null || config.timezone != "Europe/Zurich" || config.weeklySlots == null)
                throw new InvalidDataException("TDM config requires enabled, timezone Europe/Zurich and weeklySlots");
            var intervals = new List<Tuple<double, double>>(); var ids = new HashSet<string>();
            foreach (var s in config.weeklySlots)
            {
                if (s == null || string.IsNullOrWhiteSpace(s.id) || s.id.Length > 64 || !s.id.All(c => c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '-' || c == '_') || !ids.Add(s.id))
                    throw new InvalidDataException("TDM slot IDs must be unique ASCII identifiers");
                double a = Day(s.day) * 1440 + ParseTime(s.start).TotalMinutes;
                double b = Day(s.day) * 1440 + ParseTime(s.end).TotalMinutes;
                if (a == b) throw new InvalidDataException("TDM slot duration must be nonzero and less than24h");
                if (b < a) b += 1440;
                foreach (var other in intervals)
                    foreach (int shift in new[] { -10080, 0, 10080 })
                        if (a < other.Item2 + shift && b > other.Item1 + shift) throw new InvalidDataException("Overlapping TDM weekly slots");
                intervals.Add(Tuple.Create(a, b));
            }
            lock (Sync) Config = config; // Invalid reload leaves the previous valid configuration intact.
        }
        private DateTime? ToUtc(DateTime civil, string id)
        {
            civil = DateTime.SpecifyKind(civil, DateTimeKind.Unspecified);
            if (Zone.IsInvalidTime(civil))
            {
                string key = id + civil.ToString("s");
                if (Warnings.Add(key)) Log("TDM DST: skipped nonexistent civil time " + key);
                return null;
            }
            if (Zone.IsAmbiguousTime(civil))
                return new DateTimeOffset(civil, Zone.GetAmbiguousTimeOffsets(civil).Max()).UtcDateTime; // first occurrence only
            return TimeZoneInfo.ConvertTimeToUtc(civil, Zone);
        }
        public TdmOccurrence[] Occurrences(DateTime aroundUtc)
        {
            lock (Sync)
            {
                if (!Config.enabled) return new TdmOccurrence[0];
                DateTime day = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(aroundUtc, DateTimeKind.Utc), Zone).Date;
                var result = new List<TdmOccurrence>();
                for (int d = -8; d <= 8; d++) foreach (var s in Config.weeklySlots)
                {
                    DateTime date = day.AddDays(d); if ((int)date.DayOfWeek != Day(s.day)) continue;
                    DateTime a = date + ParseTime(s.start), b = date + ParseTime(s.end); if (b <= a) b = b.AddDays(1);
                    var start = ToUtc(a, s.id); var end = ToUtc(b, s.id);
                    if (!start.HasValue || !end.HasValue || end <= start) continue;
                    result.Add(new TdmOccurrence { Id = s.id + "@" + start.Value.ToString("yyyyMMdd'T'HHmmss'Z'"), StartUtc = start.Value, EndUtc = end.Value });
                }
                var ordered = result.OrderBy(x => x.StartUtc).ToArray();
                for (int i = 1; i < ordered.Length; i++) if (ordered[i].StartUtc < ordered[i - 1].EndUtc)
                    throw new InvalidDataException("TDM UTC slot overlap at DST boundary");
                return ordered;
            }
        }
        private bool Cancelled(string id) { return State.Cancelled.ContainsKey(id); }
        private void Announce(string id, string threshold, string message)
        {
            string key = id + "/" + threshold;
            if (State.Sent.ContainsKey(key)) return;
            // Persist before broadcast: at-most-once after reboot. A crash here
            // may omit one message, but can never replay the entire countdown.
            Change(() => State.Sent[key] = true); Broadcast(message);
        }
        private void Activate(string id)
        {
            if (State.Active != id) Change(() => State.Active = id);
            if (!IsActive()) Start(id);
            Announce(id, "START", "Team Deathmatch has started!");
        }
        private void End()
        {
            string old = State.Active;
            if (IsActive()) Stop();
            if (!string.IsNullOrEmpty(old))
            {
                Announce(old, "END", "Team Deathmatch has ended.");
                Change(() => State.Active = "");
            }
        }
        public void Tick()
        {
            lock (Sync)
            {
                if (!string.IsNullOrEmpty(State.Manual)) { Activate(State.Manual); return; }
                DateTime now = Now; var slots = Occurrences(now);
                var current = slots.FirstOrDefault(x => x.StartUtc <= now && now < x.EndUtc && !Cancelled(x.Id));
                if (State.Active != "" && (current == null || current.Id != State.Active)) End();
                if (current != null) { Activate(current.Id); return; }
                foreach (var slot in slots.Where(x => x.StartUtc > now && !Cancelled(x.Id)))
                {
                    int seconds = (int)Math.Ceiling((slot.StartUtc - now).TotalSeconds);
                    if (!Thresholds.Contains(seconds)) continue; // skip missed thresholds, including after restart
                    string tail = seconds == 3600 ? "1 hour." : seconds == 1800 ? "30 minutes." : seconds == 900 ? "15 minutes." : seconds + "...";
                    Announce(slot.Id, seconds.ToString(CultureInfo.InvariantCulture), "Team Deathmatch begins in " + tail);
                }
            }
        }
        public void ManualStart()
        {
            lock (Sync)
            {
                if (IsActive()) return; // never reset a live match or its reward cap
                string id = "manual@" + Now.ToString("yyyyMMdd'T'HHmmss'Z'") + "-" + Guid.NewGuid().ToString("N");
                Change(() => State.Manual = id); Activate(id);
            }
        }
        public void ManualStop()
        {
            lock (Sync)
            {
                DateTime now = Now;
                var affected = Occurrences(now).Where(x => x.EndUtc > now && x.StartUtc <= now.AddHours(1)).ToArray();
                Change(() => { foreach (var x in affected) State.Cancelled[x.Id] = true; State.Manual = ""; });
                End();
            }
        }
    }
}
