using System;
using System.Collections.Generic;
using System.Linq;

namespace OrbitReborn_Emulator.Game.Event.Tdm
{
    // Pure authoritative state machine. No Session, socket, timer, SQL or wall clock
    // dependency. No external code runs under Sync: the runtime drains effects later.
    public sealed class TdmEventService
    {
        private readonly object Sync = new object();
        private readonly Func<long> Clock;
        private readonly Dictionary<int, TdmPresence> Presence = new Dictionary<int, TdmPresence>();
        private readonly Dictionary<int, long> Lobby = new Dictionary<int, long>();
        private readonly Dictionary<int, Ticket> Queue = new Dictionary<int, Ticket>();
        private readonly Dictionary<int, long> Versions = new Dictionary<int, long>();
        private readonly Dictionary<int, long> Requests = new Dictionary<int, long>();
        private readonly List<TdmEffect> Effects = new List<TdmEffect>();
        private readonly Dictionary<int, EndState> Results = new Dictionary<int, EndState>();
        private readonly Dictionary<string, TdmRewardClaim> RewardClaims = new Dictionary<string, TdmRewardClaim>();
        private long Sequence, Generation, Revision, EventSequence, Round;
        private readonly string Boot = Guid.NewGuid().ToString("N");
        private bool On;
        private string EventId = "";
        private string OccurrenceId = "";
        private Offer Pending;
        private Match Current;
        private readonly int[] Wins = new int[4];
        private int PreferCompany, AvoidCompany;
        public readonly TdmRewardPolicy Rewards;
        private string RewardStatus;

        private sealed class Ticket { public int Id, Company, Bracket; public long Order; }
        private sealed class Offer
        {
            public string Id; public long End; public int A, B, Bracket, Size;
            public bool Refill; public List<Ticket> Tickets = new List<Ticket>();
            public HashSet<int> Accepted = new HashSet<int>();
            public HashSet<int> Declined = new HashSet<int>();
        }
        private sealed class Member
        {
            public int Id, Company, Side, Seat, Lives = TdmRules.Lives;
            public long Life, Naz, RepairEnd, MissingSince;
            public bool Dead, Gone, Spent, Arrived, Connected = true;
            public string Death = "";
            public TdmParticipation Participation;
        }
        private sealed class Match
        {
            public string Id; public int A, B, Bracket, Size; public long Round, SafeEnd, End;
            public int[] Score = new int[2]; public long[] EmptySince = new long[2];
            public Dictionary<int, Member> Members = new Dictionary<int, Member>();
            public HashSet<int> Entered = new HashSet<int>();
        }
        private sealed class EndState
        {
            public string MatchId, Outcome, Reason; public long Round, End, WaitEnd;
            public int A, B, ScoreA, ScoreB, Winner; public bool Stay;
            public TdmRewardReceipt Reward;
        }

        public TdmEventService(Func<long> clock, TdmRewardPolicy rewards = null)
        { Clock = clock ?? throw new ArgumentNullException("clock"); Rewards = rewards ?? new TdmRewardPolicy(); }
        public bool Active { get { lock (Sync) return On; } }
        public string Id { get { lock (Sync) return EventId; } }
        private long Now { get { return Clock(); } }
        private void Changed() { ++Revision; }
        public void Enable(string occurrenceId = null)
        {
            lock (Sync)
            {
                if (On) return;
                On = true; EventId = Boot + "-" + (++EventSequence); OccurrenceId = occurrenceId ?? EventId; Array.Clear(Wins, 0, Wins.Length);
                Requests.Clear(); Lobby.Clear(); Results.Clear(); PreferCompany = AvoidCompany = 0; Changed();
            }
        }
        public void Disable()
        {
            lock (Sync)
            {
                if (!On) return;
                On = false;
                if (Current != null) Finish(-1, TdmRules.Unavailable);
                Pending = null; Queue.Clear(); Lobby.Clear(); Requests.Clear();
                foreach (var id in Results.Keys.ToArray()) Home(id);
                Results.Clear(); Changed();
            }
        }
        public void Observe(TdmPresence value)
        {
            lock (Sync)
            {
                Presence[value.Id] = value;
                Ticket ticket;
                if (Queue.TryGetValue(value.Id, out ticket) && !Valid(ticket)) LeaveQueue(value.Id);
                Member p = MemberFor(value.Id);
                if (p == null || p.Gone) return;
                if (p.Arrived && p.Connected && value.Connected && value.Map != TdmRules.Map)
                { LeaveMember(p, false); return; }
                if (value.Company != p.Company || TdmRules.Bracket(value.Level) != Current.Bracket)
                { LeaveMember(p, false); return; }
                if (!value.Connected && p.Connected) { p.Participation.Pause(Now, Current.End, false); p.Connected = false; p.MissingSince = Now; Changed(); }
            }
        }
        public bool Open(int id)
        {
            lock (Sync)
            {
                TdmPresence p;
                if (!On || !Presence.TryGetValue(id, out p) || !p.Connected || !p.Ready || !p.Compatible
                    || !TdmRules.NearBeacon(p.Map, p.Company, p.X, p.Y)) return false;
                Lobby[id] = EventSequence; Changed(); return true;
            }
        }
        private bool Valid(Ticket t)
        {
            TdmPresence p;
            return Presence.TryGetValue(t.Id, out p) && p.Eligible && p.Company == t.Company && TdmRules.Bracket(p.Level) == t.Bracket;
        }
        public string Command(int id, string eventId, long request, string action, string reference)
        {
            lock (Sync)
            {
                if (!On || eventId != EventId) return TdmRules.Unavailable;
                long last;
                if (request <= 0) return "Invalid request.";
                if (Requests.TryGetValue(id, out last) && request <= last) return ""; // replay: snapshot, never repeat mutation
                Requests[id] = request;
                TdmPresence p;
                switch (action)
                {
                    case "JOIN":
                        if (!Lobby.ContainsKey(id) || Lobby[id] != EventSequence) return "Approach the TDM beacon and press J first.";
                        if (!Presence.TryGetValue(id, out p) || !p.Eligible) return "Level 8 and a connected READY ship are required.";
                        if (Queue.ContainsKey(id) || MemberFor(id) != null || (Current != null && Current.Entered.Contains(id))) return "Already queued or already played this round.";
                        Queue.Add(id, new Ticket { Id = id, Company = p.Company, Bracket = TdmRules.Bracket(p.Level), Order = ++Sequence });
                        Results.Remove(id); Changed(); return "";
                    case "LEAVE":
                        LeaveQueue(id);
                        var member = MemberFor(id);
                        if (member != null && !member.Gone) LeaveMember(member, false);
                        if (Results.Remove(id)) Home(id);
                        Changed(); return "";
                    case "ACCEPT":
                        if (Pending == null || Pending.Id != reference || Now >= Pending.End) return "This match offer has expired.";
                        var t = Pending.Tickets.FirstOrDefault(x => x.Id == id);
                        if (t == null || !Queue.ContainsKey(id) || Pending.Declined.Contains(id) || !Valid(t)) return "You are no longer eligible for this offer.";
                        Pending.Accepted.Add(id); Changed(); return "";
                    case "DECLINE":
                        if (Pending != null && Pending.Id == reference) LeaveQueue(id);
                        return "";
                    case "REPAIR":
                        var dead = MemberFor(id);
                        if (dead == null || dead.Gone || !dead.Dead || dead.Lives <= 0 || dead.Death != reference || Now >= dead.RepairEnd || !dead.Connected)
                            return "This repair is no longer available.";
                        dead.Dead = false; dead.Death = ""; dead.RepairEnd = 0; dead.Naz = Now + TdmRules.NazMs;
                        Effect("RESPAWN", dead); Changed(); return "";
                    case "STAY":
                        EndState result;
                        if (!Results.TryGetValue(id, out result) || result.MatchId != reference || result.Outcome != "WIN" || Now >= result.End)
                            return "This result has expired.";
                        if (!Presence.TryGetValue(id, out p) || !p.Eligible) return "A connected READY ship is required.";
                        if (!result.Stay)
                        {
                            result.Stay = true; result.WaitEnd = result.End + TdmRules.EmptyMs;
                            Queue[id] = new Ticket { Id = id, Company = p.Company, Bracket = TdmRules.Bracket(p.Level), Order = ++Sequence };
                            PreferCompany = p.Company; AvoidCompany = result.A == p.Company ? result.B : result.A;
                            Changed();
                        }
                        return "";
                    default: return "Unknown TDM action.";
                }
            }
        }
        private void LeaveQueue(int id)
        {
            if (Queue.Remove(id)) Changed();
            if (Pending != null && Pending.Tickets.Any(t => t.Id == id)) { Pending.Declined.Add(id); Pending.Accepted.Remove(id); Changed(); }
        }
        private Member MemberFor(int id)
        { Member p; return Current != null && Current.Members.TryGetValue(id, out p) ? p : null; }
        public bool Contains(int id) { lock (Sync) { var p = MemberFor(id); return p != null && !p.Gone; } }
        public bool IsDead(int id) { lock (Sync) { var p = MemberFor(id); return p != null && !p.Gone && p.Dead; } }
        public bool Safe { get { lock (Sync) return Current == null || Now < Current.SafeEnd; } }
        private void Effect(string kind, Member p)
        {
            p.Life = ++Generation; Versions[p.Id] = p.Life;
            Effects.Add(new TdmEffect { Kind = kind, Player = p.Id, MatchId = Current.Id, Side = p.Side, Seat = p.Seat, Generation = p.Life });
        }
        private void Home(int id)
        {
            long version = ++Generation; Versions[id] = version;
            Effects.Add(new TdmEffect { Kind = "HOME", Player = id, Generation = version });
        }
        private void LeaveMember(Member p, bool spent)
        {
            if (p.Gone) return;
            p.Participation.Pause(Now, Current.End, true, spent);
            p.Gone = true; p.Spent = spent; p.Naz = 0; Home(p.Id); Changed();
        }
        public TdmEffect[] DrainEffects() { lock (Sync) { var result = Effects.ToArray(); Effects.Clear(); return result; } }
        public bool IsCurrent(TdmEffect e) { lock (Sync) { long g; return Versions.TryGetValue(e.Player, out g) && g == e.Generation; } }
        public bool MarkEntered(TdmEffect e)
        {
            lock (Sync)
            {
                var p = MemberFor(e.Player);
                if (p == null || p.Gone || p.Life != e.Generation || Current.Id != e.MatchId) return false;
                if (!p.Arrived) p.Participation.Arrive(Now, Current.SafeEnd);
                p.Arrived = true; return true;
            }
        }
        public long Life(int id) { lock (Sync) { var p = MemberFor(id); return p == null || p.Gone ? 0 : p.Life; } }
        public bool CanDamage(int attacker, int victim, long launchedLife = 0)
        {
            lock (Sync) return CanDamageCore(attacker, victim, launchedLife);
        }
        private bool CanDamageCore(int attacker, int victim, long launchedLife)
        {
            if (!On || Current == null || Now < Current.SafeEnd || Now >= Current.End
                || Current.Score.Any(s => s >= TdmRules.Target)) return false;
            var a = MemberFor(attacker); var v = MemberFor(victim);
            return a != null && v != null && !a.Gone && !v.Gone && !a.Dead && !v.Dead && a.Connected && v.Connected
                && a.Company != v.Company && v.Naz <= Now && (launchedLife == 0 || a.Life == launchedLife);
        }
        public void RecordDamage(int attacker, int victim, long amount)
        { lock (Sync) { if (amount > 0 && CanDamageCore(attacker, victim, 0)) MemberFor(attacker).Participation.Hit(amount); } }
        public bool Attack(int attacker, int victim)
        {
            lock (Sync)
            {
                if (!CanDamageCore(attacker, victim, 0)) return false;
                var a = MemberFor(attacker); if (a.Naz != 0) { a.Naz = 0; Changed(); } return true;
            }
        }
        public bool Move(int id, int x, int y)
        {
            lock (Sync)
            {
                var p = MemberFor(id);
                if (p == null || p.Gone || p.Dead || !p.Connected) return false;
                return Now >= Current.SafeEnd || TdmRules.Squared(x - TdmRules.SpawnX(p.Side), y - 6550) <= 600 * 600;
            }
        }
        // Admission already froze the match before any ENTER effect can be observed.
        private void Admit(IEnumerable<Ticket> tickets, bool refill)
        {
            foreach (var t in tickets)
            {
                int side = t.Company == Current.A ? 0 : 1;
                var occupied = new HashSet<int>(Current.Members.Values.Where(m => m.Side == side && (!m.Gone || m.Spent)).Select(m => m.Seat));
                int seat = Enumerable.Range(0, Current.Size).First(i => !occupied.Contains(i));
                var p = new Member { Id = t.Id, Company = t.Company, Side = side, Seat = seat, Naz = refill ? Now + TdmRules.NazMs : 0, Participation = new TdmParticipation(!refill) };
                Current.Members[t.Id] = p; Current.Entered.Add(t.Id); Queue.Remove(t.Id); Results.Remove(t.Id); Effect("ENTER", p);
            }
            Changed();
        }
        private void ResolveOffer()
        {
            var offer = Pending; Pending = null;
            var accepted = offer.Tickets.Where(t => offer.Accepted.Contains(t.Id) && !offer.Declined.Contains(t.Id) && Queue.ContainsKey(t.Id) && Valid(t)).ToArray();
            foreach (var t in offer.Tickets.Where(t => !accepted.Contains(t))) Queue.Remove(t.Id);
            if (offer.Refill)
            {
                if (Current != null) Admit(accepted.Where(t => !Current.Entered.Contains(t.Id)), true);
                Changed(); return;
            }
            int n = Math.Min(accepted.Count(t => t.Company == offer.A), accepted.Count(t => t.Company == offer.B));
            if (n < TdmRules.Min) { Changed(); return; }
            Current = new Match { Id = offer.Id, Round = ++Round, A = offer.A, B = offer.B, Bracket = offer.Bracket, Size = n,
                SafeEnd = Now + TdmRules.SafeMs, End = Now + TdmRules.SafeMs + TdmRules.MatchMs };
            Admit(accepted.Where(t => t.Company == offer.A).Take(n).Concat(accepted.Where(t => t.Company == offer.B).Take(n)), false);
            PreferCompany = AvoidCompany = 0;
        }
        private void FindOffer()
        {
            if (!On || Pending != null) return;
            var eligible = Queue.Values.Where(Valid).OrderBy(t => t.Order).ToArray();
            if (Current != null)
            {
                if (Now < Current.SafeEnd || Now >= Current.End) return;
                foreach (int company in new[] { Current.A, Current.B })
                {
                    int free = Current.Size - Current.Members.Values.Count(p => p.Company == company && (!p.Gone || p.Spent));
                    var fill = eligible.Where(t => t.Company == company && t.Bracket == Current.Bracket && !Current.Entered.Contains(t.Id)).Take(free).ToList();
                    if (fill.Count == 0) continue;
                    Pending = new Offer { Id = EventId + "-offer-" + (++Sequence), End = Now + TdmRules.OfferMs, A = Current.A, B = Current.B,
                        Bracket = Current.Bracket, Size = fill.Count, Refill = true, Tickets = fill }; Changed(); return;
                }
                return;
            }
            var candidates = new List<Offer>();
            foreach (int bracket in new[] { 1, 2 })
                for (int a = 1; a <= 3; ++a) for (int b = a + 1; b <= 3; ++b)
                {
                    var aa = eligible.Where(t => t.Bracket == bracket && t.Company == a).ToArray();
                    var bb = eligible.Where(t => t.Bracket == bracket && t.Company == b).ToArray();
                    int n = Math.Min(TdmRules.Max, Math.Min(aa.Length, bb.Length));
                    if (n >= TdmRules.Min) candidates.Add(new Offer { A = a, B = b, Bracket = bracket, Size = n, Tickets = aa.Take(n).Concat(bb.Take(n)).ToList() });
                }
            var selected = candidates.OrderBy(o => PreferCompany != 0 && (o.A == PreferCompany || o.B == PreferCompany) ? 0 : 1)
                .ThenBy(o => PreferCompany != 0 && o.A != AvoidCompany && o.B != AvoidCompany ? 0 : 1)
                .ThenBy(o => Math.Max(o.Tickets.Where(t => t.Company == o.A).ElementAt(2).Order, o.Tickets.Where(t => t.Company == o.B).ElementAt(2).Order))
                .ThenBy(o => o.Tickets.Min(t => t.Order)).ThenBy(o => o.A).ThenBy(o => o.B).FirstOrDefault();
            if (selected == null) return;
            selected.Id = EventId + "-offer-" + (++Sequence); selected.End = Now + TdmRules.OfferMs; Pending = selected; Changed();
        }
        public void Tick()
        {
            lock (Sync)
            {
                if (!On) return;
                foreach (var t in Queue.Values.Where(t => !Valid(t)).ToArray()) LeaveQueue(t.Id);
                foreach (var entry in Results.ToArray())
                    if ((!entry.Value.Stay && Now >= entry.Value.End) || (entry.Value.Stay && Now >= entry.Value.WaitEnd))
                    { LeaveQueue(entry.Key); Home(entry.Key); Results.Remove(entry.Key); Changed(); }
                if (Current != null)
                {
                    foreach (var p in Current.Members.Values.Where(p => !p.Gone).ToArray())
                    {
                        if ((!p.Connected && Now >= p.MissingSince + TdmRules.ReconnectMs) || (p.Dead && Now >= p.RepairEnd)) LeaveMember(p, false);
                    }
                    if (Now >= Current.SafeEnd)
                    {
                        for (int side = 0; side < 2; side++)
                        {
                            bool active = Current.Members.Values.Any(p => p.Side == side && !p.Gone && p.Connected && (!p.Dead || Now < p.RepairEnd));
                            if (active) Current.EmptySince[side] = 0;
                            else if (Current.EmptySince[side] == 0) Current.EmptySince[side] = Now;
                        }
                        bool empty = Current.EmptySince.Any(t => t != 0);
                        if (Current.EmptySince.Any(t => t != 0 && Now >= t + TdmRules.EmptyMs) || (empty && Now >= Current.End)) Finish(-1, TdmRules.EmptyResult);
                        else if (Current.Score.Any(s => s >= TdmRules.Target) || Now >= Current.End)
                            Finish(Current.Score[0] == Current.Score[1] ? 0 : Current.Score[0] > Current.Score[1] ? Current.A : Current.B, "");
                    }
                }
                if (Pending != null && (Now >= Pending.End || Pending.Tickets.All(t => Pending.Accepted.Contains(t.Id) || Pending.Declined.Contains(t.Id)))) ResolveOffer();
                FindOffer();
            }
        }
        // Batch at the next server pulse: reciprocal lethal impacts in that pulse
        // are scored together; only then is a 30th-kill result published.
        public bool Die(int victim, int killer, long life)
        {
            lock (Sync)
            {
                var v = MemberFor(victim);
                if (v == null || v.Gone || v.Dead || v.Life != life || !v.Connected || Now < Current.SafeEnd || Now >= Current.End) return false;
                var a = MemberFor(killer);
                if (a != null && !a.Gone && a.Company != v.Company && a.Connected)
                { ++Current.Score[a.Side]; a.Participation.Kill(victim); }
                v.Dead = true; --v.Lives; v.Naz = 0; v.Death = Current.Id + "-death-" + (++Sequence); v.RepairEnd = Now + TdmRules.RepairMs;
                if (v.Lives == 0) LeaveMember(v, true); else Effect("DEATH", v);
                Changed(); return true;
            }
        }
        public bool Reconnect(int id, bool newTransport = false)
        {
            lock (Sync)
            {
                var p = MemberFor(id);
                if (p == null || p.Gone || (!p.Connected && Now >= p.MissingSince + TdmRules.ReconnectMs)) return false;
                if (p.Dead && Now >= p.RepairEnd) { LeaveMember(p, false); return false; }
                TdmPresence presence;
                if (!Presence.TryGetValue(id, out presence) || !presence.Connected || presence.Company != p.Company || TdmRules.Bracket(presence.Level) != Current.Bracket) return false;
                if (p.Connected && !newTransport) return true; // HELLO replay must not heal or teleport.
                p.Participation.Pause(Now, Current.End, false);
                p.Connected = true; p.Arrived = false; p.MissingSince = 0; Effect(p.Dead ? "DEATH" : "RECONNECT", p); Changed(); return true;
            }
        }
        public void Disconnect(int id, bool explicitLeave)
        {
            lock (Sync)
            {
                LeaveQueue(id); var p = MemberFor(id);
                if (p == null || p.Gone) return;
                if (explicitLeave) LeaveMember(p, false);
                else if (p.Connected) { p.Participation.Pause(Now, Current.End, false); p.Connected = false; p.MissingSince = Now; Changed(); }
            }
        }
        public void TransferFailed(string match)
        { lock (Sync) { if (Current != null && Current.Id == match) Finish(-1, "Team Deathmatch map is unavailable. You have been returned home."); } }
        public void AbortParticipant(int id)
        {
            lock (Sync)
            {
                // A lethal impact crossing the deadline must not turn a normal
                // time-limit result into an unrelated cancellation.
                if (Current != null && Now >= Current.End) Tick();
                else if (MemberFor(id) != null) Finish(-1, "Team Deathmatch was safely cancelled.");
                else Home(id);
            }
        }
        private void Finish(int winner, string reason)
        {
            if (Current == null) return;
            var match = Current; Pending = null;
            if (winner > 0) ++Wins[winner];
            foreach (var p in match.Members.Values)
            {
                string outcome = winner < 0 ? "CANCELLED" : winner == 0 ? "DRAW" : p.Company == winner ? "WIN" : "LOSS";
                var claim = p.Participation.Finish(p.Id, match.Id, OccurrenceId, outcome, reason, Now, match.SafeEnd, match.End,
                    winner >= 0 && match.Score.Any(s => s >= TdmRules.Target));
                RewardClaims[claim.Key] = claim;
                if (p.Gone && !p.Spent) continue;
                Results[p.Id] = new EndState { MatchId = match.Id, Round = match.Round, A = match.A, B = match.B,
                    ScoreA = match.Score[0], ScoreB = match.Score[1], Winner = winner, Reason = reason,
                    Outcome = outcome, End = Now + TdmRules.ResultMs, Reward = new TdmRewardReceipt { status = claim.Eligible ? "PENDING" : "INELIGIBLE" } };
                if (!p.Gone) Home(p.Id);
            }
            Current = null; Changed();
        }
        public void SetRewardAvailability(bool ready)
        {
            lock (Sync)
            {
                string status = ready ? "ENABLED / TDM_REWARD_V1" : "DISABLED / PERSISTENCE UNAVAILABLE";
                if (RewardStatus != status) { RewardStatus = status; Changed(); }
            }
        }
        public TdmRewardClaim[] PendingRewards() { lock (Sync) return RewardClaims.Values.ToArray(); }
        public void AcknowledgeRewards(IEnumerable<string> keys) { lock (Sync) foreach (var key in keys) RewardClaims.Remove(key); }
        public void SetRewardReceipt(int id, string match, TdmRewardReceipt receipt)
        {
            lock (Sync)
            {
                EndState result;
                if (Results.TryGetValue(id, out result) && result.MatchId == match) { result.Reward = receipt; Changed(); }
            }
        }
        public object Snapshot(int id, string error = "", bool open = false)
        {
            lock (Sync)
            {
                TdmPresence presence; Presence.TryGetValue(id, out presence);
                var p = MemberFor(id); if (p != null && p.Gone) p = null;
                EndState result; Results.TryGetValue(id, out result);
                Ticket ticket; Queue.TryGetValue(id, out ticket);
                var offer = Pending != null && Pending.Tickets.Any(t => t.Id == id) && !Pending.Declined.Contains(id) ? Pending : null;
                int bracket = presence == null ? 0 : TdmRules.Bracket(presence.Level);
                return new {
                    version = 1, eventId = EventId, revision = Revision, serverNow = Now, enabled = On, open = open, error = error,
                    company = presence == null ? 0 : presence.Company, bracket = bracket, playerId = id,
                    beacon = On && presence != null && presence.Map == TdmRules.Home(presence.Company),
                    beaconX = TdmRules.BeaconX, beaconY = TdmRules.BeaconY,
                    queued = ticket != null, queuePosition = ticket == null ? 0 : Queue.Values.Count(t => t.Company == ticket.Company && t.Bracket == ticket.Bracket && t.Order <= ticket.Order),
                    waiting = Enumerable.Range(1, 3).Select(c => Queue.Values.Count(t => t.Company == c && t.Bracket == bracket)).ToArray(),
                    running = Current == null ? 0 : 1, rewards = RewardStatus ?? Rewards.Status,
                    offer = offer == null ? null : new { id = offer.Id, companyA = offer.A, companyB = offer.B, size = offer.Size, deadline = offer.End, accepted = offer.Accepted.Contains(id), refill = offer.Refill },
                    match = p == null ? null : new { id = Current.Id, roundId = Current.Round, safeEnd = Current.SafeEnd, endsAt = Current.End,
                        companyA = Current.A, companyB = Current.B, scoreA = Current.Score[0], scoreB = Current.Score[1], target = TdmRules.Target,
                        side = p.Side, lives = p.Lives, dead = p.Dead, deathId = p.Death, repairEnd = p.RepairEnd, nazEnd = p.Naz,
                        wins = new[] { Wins[Current.A], Wins[Current.B] },
                        protectedPlayers = Current.Members.Values.Where(m => !m.Gone && !m.Dead && m.Naz > Now).Select(m => new { id = m.Id, until = m.Naz }).ToArray() },
                    result = result == null ? null : new { id = result.MatchId, roundId = result.Round, companyA = result.A, companyB = result.B,
                        scoreA = result.ScoreA, scoreB = result.ScoreB, outcome = result.Outcome, reason = result.Reason, deadline = result.End, stayed = result.Stay, reward = result.Reward }
                };
            }
        }
    }
}
