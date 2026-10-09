using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Web.Script.Serialization;

namespace OrbitReborn_Emulator.Game.Event.Tdm
{
    // Durable local outbox bridges completed in-memory rounds to the SQL ledger.
    // Not a replacement for the transactional journal or a restoration of matches.
    public sealed class TdmRewardOutbox
    {
        private readonly object Sync = new object();
        private readonly Action<string> Persist;
        private readonly Dictionary<string, TdmRewardClaim> Pending;
        private static JavaScriptSerializer Json() { return new JavaScriptSerializer { MaxJsonLength = 16 * 1024 * 1024 }; }
        public TdmRewardOutbox(string saved, Action<string> persist)
        {
            Persist = persist;
            var rows = string.IsNullOrEmpty(saved) ? new TdmRewardClaim[0] : Json().Deserialize<TdmRewardClaim[]>(saved);
            if (rows == null) throw new InvalidDataException("Invalid TDM reward outbox.");
            foreach (var row in rows) row.Validate();
            Pending = rows.ToDictionary(c => c.Key); // corrupt/duplicate state fails closed
        }
        public void Add(IEnumerable<TdmRewardClaim> claims)
        {
            lock (Sync)
            {
                var next = new Dictionary<string, TdmRewardClaim>(Pending);
                foreach (var c in claims)
                {
                    c.Validate();
                    TdmRewardClaim previous;
                    if (next.TryGetValue(c.Key, out previous))
                    { if (Json().Serialize(previous) != Json().Serialize(c)) throw new InvalidDataException("Conflicting TDM outbox claim."); }
                    else next.Add(c.Key, c);
                }
                if (next.Count == Pending.Count) return;
                Persist(Json().Serialize(next.Values.ToArray()));
                Pending.Clear(); foreach (var row in next) Pending.Add(row.Key, row.Value);
            }
        }
        public TdmRewardClaim[] Snapshot() { lock (Sync) return Pending.Values.ToArray(); }
        public void Complete(string key)
        {
            lock (Sync)
            {
                if (!Pending.ContainsKey(key)) return;
                Persist(Json().Serialize(Pending.Where(p => p.Key != key).Select(p => p.Value).ToArray()));
                Pending.Remove(key);
            }
        }
    }
    public static class TdmRewardRuntime
    {
        private static TdmRewardOutbox Outbox;
        private static readonly object CaptureLock = new object();
        private static Timer Worker;
        private static int Working;
        private static long RetryAt;
        public static void Initialize()
        {
            lock (CaptureLock)
            {
                if (Worker != null) return;
                try
                {
                    string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "data", "tdm_reward_outbox.json");
                    TeamDeathMatch.State.SetRewardAvailability(false);
                    Outbox = new TdmRewardOutbox(File.Exists(path) ? File.ReadAllText(path) : null, value => TdmAtomicFile.Write(path, value));
                    Worker = new Timer(_ => Process(), null, 1000, 1000);
                }
                catch (Exception ex) { Unavailable(ex); }
            }
        }
        public static void Capture(TdmEventService state)
        {
            // Called outside event/lifecycle locks. Ack only AFTER atomic disk write.
            lock (CaptureLock)
            {
                if (Outbox == null) return;
                var claims = state.PendingRewards(); if (claims.Length == 0) return;
                try { Outbox.Add(claims); state.AcknowledgeRewards(claims.Select(c => c.Key)); }
                catch (Exception ex) { Unavailable(ex); }
            }
        }
        private static void Process()
        {
            if (DateTime.UtcNow.Ticks < Interlocked.Read(ref RetryAt) || Interlocked.CompareExchange(ref Working, 1, 0) != 0) return;
            try
            {
                var store = new TdmRewardStore(() => new TdmRewardTransaction());
                foreach (var claim in Outbox.Snapshot())
                {
                    try
                    {
                        var receipt = store.Pay(claim);
                        TeamDeathMatch.State.SetRewardAvailability(true);
                        // Persist completion first; an I/O failure safely retries the SQL receipt.
                        Outbox.Complete(claim.Key);
                        TeamDeathMatch.RewardCompleted(claim, receipt);
                    }
                    catch (Exception ex)
                    {
                        TeamDeathMatch.State.SetRewardReceipt(claim.PlayerId, claim.MatchId, new TdmRewardReceipt { status = "UNAVAILABLE" });
                        Unavailable(ex); break;
                    }
                }
            }
            finally { Interlocked.Exchange(ref Working, 0); }
        }
        private static void Unavailable(Exception ex)
        {
            TeamDeathMatch.State.SetRewardAvailability(false);
            long now = DateTime.UtcNow.Ticks;
            if (now >= Interlocked.Read(ref RetryAt))
                Output.WriteLine("[TDM] reward persistence unavailable: " + ex.Message + ". Rewards are disabled until persistence recovers; durable pending claims are retained.", OutputLevel.Warning);
            Interlocked.Exchange(ref RetryAt, now + TimeSpan.FromSeconds(30).Ticks);
        }
        public static void Shutdown()
        { lock (CaptureLock) { if (Worker != null) Worker.Dispose(); Worker = null; } }
    }
}
