using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using OrbitReborn_Emulator.Game.Event.Tdm;

namespace OrbitReborn_Emulator.Game.Event.Rankings
{
    public static class EventRankingClock
    {
        private static readonly DateTime Anchor = EventRankingSnapshot.Milliseconds(DateTime.UtcNow);
        private static readonly Stopwatch Elapsed = Stopwatch.StartNew();
        public static DateTime UtcNow { get { return Anchor.AddMilliseconds(Elapsed.ElapsedMilliseconds); } }
    }
    public sealed class EventRankingOutboxState
    {
        public int Version { get; set; } = 1;
        public EventRankingStart[] Active { get; set; } = new EventRankingStart[0];
        public EventRankingSnapshot[] Pending { get; set; } = new EventRankingSnapshot[0];
    }
    // The one local atomic file contains identities and FINAL snapshots only.
    // It is not an event/kill log and does not restore gameplay or rewards.
    public sealed class EventRankingOutbox
    {
        private readonly object Sync = new object();
        private readonly Action<string> Persist;
        private Dictionary<string, EventRankingStart> Active;
        private Dictionary<string, EventRankingSnapshot> Pending;
        public EventRankingOutbox(string saved, Action<string> persist)
        {
            Persist = persist ?? throw new ArgumentNullException("persist");
            var state = string.IsNullOrEmpty(saved) ? new EventRankingOutboxState() : EventRankingSnapshot.Json().Deserialize<EventRankingOutboxState>(saved);
            if (state == null || state.Version != 1 || state.Active == null || state.Pending == null || state.Active.Length + state.Pending.Length > 10000)
                throw new InvalidDataException("Invalid event ranking outbox.");
            foreach (var start in state.Active) start.Validate();
            foreach (var snapshot in state.Pending) snapshot.Validate();
            Active = state.Active.ToDictionary(s => s.RunKey, CopyStart, StringComparer.Ordinal);
            Pending = state.Pending.ToDictionary(s => s.Start.RunKey, s => s.Copy(), StringComparer.Ordinal);
            if (Active.Keys.Any(Pending.ContainsKey)) throw new InvalidDataException("Duplicate active/final event ranking identity.");
        }
        private static EventRankingStart CopyStart(EventRankingStart start)
        { return new EventRankingStart { RunKey = start.RunKey, EventType = start.EventType, OccurrenceKey = start.OccurrenceKey, StartedAtUtc = start.StartedAtUtc, RulesVersion = start.RulesVersion }; }
        private static string StartIdentity(EventRankingStart start)
        { return EventRankingSnapshot.Json().Serialize(CopyStart(start)); }
        private static string Serialize(Dictionary<string, EventRankingStart> active, Dictionary<string, EventRankingSnapshot> pending)
        {
            return EventRankingSnapshot.Json().Serialize(new EventRankingOutboxState {
                Active = active.Values.OrderBy(s => s.RunKey, StringComparer.Ordinal).ToArray(),
                Pending = pending.Values.OrderBy(s => s.Start.RunKey, StringComparer.Ordinal).ToArray()
            });
        }
        public void Apply(IEnumerable<EventRankingStart> starts, IEnumerable<EventRankingSnapshot> snapshots)
        {
            lock (Sync)
            {
                var active = new Dictionary<string, EventRankingStart>(Active, StringComparer.Ordinal);
                var pending = new Dictionary<string, EventRankingSnapshot>(Pending, StringComparer.Ordinal);
                foreach (var input in starts)
                {
                    input.Validate(); var start = CopyStart(input); EventRankingStart prior; EventRankingSnapshot final;
                    if (pending.TryGetValue(start.RunKey, out final))
                    { if (StartIdentity(final.Start) != StartIdentity(start)) throw new InvalidDataException("Conflicting event start."); continue; }
                    if (active.TryGetValue(start.RunKey, out prior))
                    { if (StartIdentity(prior) != StartIdentity(start)) throw new InvalidDataException("Conflicting event start."); }
                    else active.Add(start.RunKey, start);
                }
                foreach (var input in snapshots)
                {
                    var snapshot = input.Copy(); snapshot.Validate(); EventRankingSnapshot prior; EventRankingStart start;
                    if (pending.TryGetValue(snapshot.Start.RunKey, out prior))
                    { if (prior.SnapshotHash != snapshot.SnapshotHash) throw new InvalidDataException("Conflicting final event snapshot."); continue; }
                    if (active.TryGetValue(snapshot.Start.RunKey, out start) && StartIdentity(start) != StartIdentity(snapshot.Start))
                        throw new InvalidDataException("Final event snapshot has a conflicting active identity.");
                    active.Remove(snapshot.Start.RunKey); pending.Add(snapshot.Start.RunKey, snapshot);
                }
                if (active.Count + pending.Count > 10000) throw new InvalidDataException("Event ranking outbox capacity exceeded; facts retained.");
                string next = Serialize(active, pending);
                if (next == Serialize(Active, Pending)) return;
                Persist(next); // assignment follows successful atomic replacement only
                Active = active; Pending = pending;
            }
        }
        public void RecoverInterrupted()
        {
            lock (Sync) Apply(new EventRankingStart[0], Active.Values.Select(EventRankingSnapshot.Interrupted).ToArray());
        }
        public EventRankingSnapshot[] Snapshot()
        { lock (Sync) return Pending.Values.OrderBy(s => s.Start.RunKey, StringComparer.Ordinal).Select(s => s.Copy()).ToArray(); }
        public int ActiveCount { get { lock (Sync) return Active.Count; } }
        public void Complete(string key)
        {
            lock (Sync)
            {
                if (!Pending.ContainsKey(key)) return;
                var next = new Dictionary<string, EventRankingSnapshot>(Pending, StringComparer.Ordinal); next.Remove(key);
                Persist(Serialize(Active, next)); Pending = next;
            }
        }
    }
    // A permanent immutable-fact conflict is isolated to that exact run/hash.
    // Its original disk payload is retained for operator review, while unrelated
    // snapshots continue. Transient SQL/I/O/schema errors are never quarantined.
    public sealed class EventRankingDispatcher
    {
        private readonly EventRankingOutbox Outbox;
        private readonly Action<EventRankingSnapshot> Save;
        private readonly Action<Exception> Warn;
        private readonly Func<bool> Stopping;
        private readonly Dictionary<string, string> Quarantined = new Dictionary<string, string>();
        public EventRankingDispatcher(EventRankingOutbox outbox, Action<EventRankingSnapshot> save, Action<Exception> warn, Func<bool> stopping = null)
        { Outbox = outbox ?? throw new ArgumentNullException("outbox"); Save = save ?? throw new ArgumentNullException("save"); Warn = warn ?? (_ => { }); Stopping = stopping ?? (() => false); }
        public int ProcessBatch(int maximum)
        {
            if (maximum < 1 || maximum > 64) throw new ArgumentOutOfRangeException("maximum");
            int attempted = 0;
            foreach (var snapshot in Outbox.Snapshot().Where(s => { string hash; return !Quarantined.TryGetValue(s.Start.RunKey, out hash) || hash != s.SnapshotHash; }).Take(maximum))
            {
                if (Stopping()) break;
                ++attempted;
                try { Save(snapshot); Outbox.Complete(snapshot.Start.RunKey); }
                catch (EventRankingConflictException ex)
                {
                    Quarantined[snapshot.Start.RunKey] = snapshot.SnapshotHash;
                    Warn(ex);
                }
            }
            return attempted;
        }
    }
    public static class EventRankingRuntime
    {
        private static readonly object CaptureSync = new object(), ProcessSync = new object();
        private static readonly Dictionary<string, EventRankingStart> MemoryStarts = new Dictionary<string, EventRankingStart>();
        private static readonly Dictionary<string, EventRankingSnapshot> MemoryFinals = new Dictionary<string, EventRankingSnapshot>();
        private static EventRankingOutbox Outbox;
        private static EventRankingDispatcher Dispatcher;
        private static Timer Worker;
        private static volatile bool Stopping;
        private static long RetryAt;
        public static void Initialize()
        {
            lock (CaptureSync)
            {
                if (Worker != null) return;
                Stopping = false;
                try
                {
                    string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "data", "event_ranking_outbox.json");
                    Outbox = new EventRankingOutbox(File.Exists(path) ? File.ReadAllText(path) : null, value => TdmAtomicFile.Write(path, value));
                    FlushMemory();
                    Outbox.RecoverInterrupted(); // no final snapshot survived: no invented score/end time
                    var store = new EventRankingStore(() => new EventRankingTransaction());
                    Dispatcher = new EventRankingDispatcher(Outbox, snapshot => store.Save(snapshot), Conflict, () => Stopping);
                    Worker = new Timer(_ => Process(), null, 1000, 1000);
                }
                catch (Exception ex) { Unavailable(ex); }
            }
        }
        public static EventRankingStart NewStart(string eventType, string occurrenceKey = null)
        {
            string key = Guid.NewGuid().ToString("N");
            return new EventRankingStart { RunKey = key, EventType = eventType, OccurrenceKey = occurrenceKey ?? key, StartedAtUtc = EventRankingClock.UtcNow };
        }
        public static void Begin(EventRankingStart start)
        { Capture(new[] { start }, new EventRankingSnapshot[0]); }
        public static void Finish(EventRankingSnapshot snapshot)
        { Capture(new EventRankingStart[0], new[] { snapshot }); }
        public static bool Capture(IEnumerable<EventRankingStart> starts, IEnumerable<EventRankingSnapshot> snapshots)
        {
            // No exception escapes into victory/reward/cleanup code.
            lock (CaptureSync)
            {
                try
                {
                    foreach (var start in starts)
                    {
                        start.Validate(); EventRankingStart prior;
                        if (MemoryStarts.TryGetValue(start.RunKey, out prior) && EventRankingSnapshot.Json().Serialize(prior) != EventRankingSnapshot.Json().Serialize(start))
                            throw new InvalidDataException("Conflicting pending event start.");
                        MemoryStarts[start.RunKey] = start;
                    }
                    foreach (var snapshot in snapshots)
                    {
                        var copy = snapshot.Copy(); EventRankingSnapshot prior;
                        if (MemoryFinals.TryGetValue(copy.Start.RunKey, out prior) && prior.SnapshotHash != copy.SnapshotHash)
                            throw new InvalidDataException("Conflicting pending event final.");
                        MemoryFinals[copy.Start.RunKey] = copy;
                    }
                    FlushMemory(); return true;
                }
                catch (Exception ex) { Unavailable(ex); return false; }
            }
        }
        private static void FlushMemory()
        {
            if (MemoryStarts.Count == 0 && MemoryFinals.Count == 0) return;
            if (Outbox == null) throw new InvalidOperationException("Event ranking durable outbox unavailable.");
            Outbox.Apply(MemoryStarts.Values, MemoryFinals.Values);
            MemoryStarts.Clear(); MemoryFinals.Clear();
        }
        public static void CaptureTdm(TdmEventService state)
        {
            try
            {
                var starts = state.PendingRankingStarts(); var finals = state.PendingRankings();
                if (starts.Length == 0 && finals.Length == 0) return;
                if (Capture(starts, finals)) state.AcknowledgeRankings(starts.Select(s => s.RunKey), finals.Select(s => s.Start.RunKey));
            }
            catch (Exception ex) { Unavailable(ex); }
        }
        private static void Process()
        {
            if (Stopping || EventRankingClock.UtcNow.Ticks < Interlocked.Read(ref RetryAt) || !Monitor.TryEnter(ProcessSync)) return;
            try
            {
                lock (CaptureSync) FlushMemory();
                if (Outbox == null) return;
                if (!Stopping) Dispatcher.ProcessBatch(8);
            }
            catch (Exception ex) { Unavailable(ex); }
            finally { Monitor.Exit(ProcessSync); }
        }
        private static void Unavailable(Exception ex)
        {
            long now = EventRankingClock.UtcNow.Ticks;
            if (now >= Interlocked.Read(ref RetryAt))
            {
                try { Output.WriteLine("[Event rankings] Persistence unavailable: " + ex.Message + ". Pending facts retained; gameplay and rewards are unchanged.", OutputLevel.Warning); }
                catch { } // diagnostics must never become a gameplay failure
            }
            Interlocked.Exchange(ref RetryAt, now + TimeSpan.FromSeconds(30).Ticks);
        }
        private static void Conflict(Exception ex)
        {
            try { Output.WriteLine("[Event rankings] " + ex.Message + " Rejected snapshot retained in the outbox; this hash is paused until restart/operator review. Other results continue.", OutputLevel.Warning); }
            catch { }
        }
        public static void Shutdown()
        {
            lock (CaptureSync)
            {
                Stopping = true; if (Worker != null) Worker.Dispose(); Worker = null;
                try { FlushMemory(); } catch (Exception ex) { Unavailable(ex); }
            }
            // A single in-flight bounded SQL transaction finishes before SQL shutdown.
            lock (ProcessSync) { }
        }
    }
}
