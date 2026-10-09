using System;
using System.Collections.Generic;
using System.Linq;

namespace OrbitReborn_Emulator.Game.Event.Tdm
{
    // ANDROMEDA OWNER MODEL, not a claimed historical Bigpoint formula.
    public sealed class TdmRewardClaim
    {
        public const string Version = "TDM_REWARD_V1";
        public int PlayerId { get; set; }
        public string MatchId { get; set; }
        public string OccurrenceId { get; set; }
        public string Outcome { get; set; }
        public string Reason { get; set; }
        public long ActiveMs { get; set; }
        public long Damage { get; set; }
        public int[] Victims { get; set; }
        public bool FastFullRound { get; set; }
        public bool Abandoned { get; set; }
        public int Q { get { return Math.Min(5, (Victims ?? new int[0]).Where(v => v > 0 && v != PlayerId).Distinct().Count()); } }
        public bool Eligible { get { return !Abandoned && Damage > 0 && (ActiveMs >= 120000 || FastFullRound)
            && (Outcome == "WIN" || Outcome == "LOSS" || Outcome == "DRAW"); } }
        public string Key { get { return PlayerId + ":" + MatchId + ":" + Version; } }
        public TdmRewardReceipt Formula()
        { return new TdmRewardReceipt { status = "PAID", q = Q, experience = 5000 + 3000 * Q, uridium = 150 + 90 * Q, honor = 150 + 90 * Q }; }
        public void Validate()
        {
            if (PlayerId <= 0 || string.IsNullOrEmpty(MatchId) || MatchId.Length > 128 || string.IsNullOrEmpty(OccurrenceId)
                || OccurrenceId.Length > 160 || Victims == null || ActiveMs < 0 || Damage < 0 || string.IsNullOrEmpty(Outcome))
                throw new InvalidOperationException("Invalid TDM reward claim.");
        }
    }
    public sealed class TdmRewardReceipt
    {
        // Wire names deliberately match the result summary; no client claim endpoint.
        public string status { get; set; }
        public int q { get; set; }
        public long experience { get; set; }
        public long uridium { get; set; }
        public long honor { get; set; }
    }
    // Updated only under the existing event lock. SAFE/disconnected/transfer time
    // does not count. The brief FREE REPAIR decision remains connected round time.
    internal sealed class TdmParticipation
    {
        private long Since, ActiveMs, Damage;
        private bool Counting, Continuous, Abandoned;
        private readonly bool Initial;
        private readonly HashSet<int> Victims = new HashSet<int>();
        public TdmParticipation(bool initial) { Continuous = Initial = initial; }
        public void Arrive(long now, long safeEnd)
        { if (now <= safeEnd) Continuous = Initial; else if (!Counting) Continuous = false; Since = Math.Max(now, safeEnd); Counting = true; }
        public void Pause(long now, long roundEnd, bool departed, bool spent = false)
        { Accrue(now, roundEnd); Counting = false; Continuous = false; if (departed && !spent) Abandoned = true; }
        private void Accrue(long now, long end)
        { long until = Math.Min(now, end); if (Counting && until > Since) ActiveMs += until - Since; Since = Math.Max(Since, until); }
        public void Hit(long amount) { if (amount > 0) Damage = Math.Min(long.MaxValue - amount, Damage) + amount; }
        public void Kill(int victim) { Victims.Add(victim); }
        public TdmRewardClaim Finish(int id, string match, string occurrence, string outcome, string reason, long now, long safeEnd, long end, bool scoreEnd)
        {
            Accrue(now, end);
            return new TdmRewardClaim { PlayerId = id, MatchId = match, OccurrenceId = occurrence, Outcome = outcome, Reason = reason,
                ActiveMs = ActiveMs, Damage = Damage, Victims = Victims.OrderBy(x => x).ToArray(), Abandoned = Abandoned,
                FastFullRound = scoreEnd && now < safeEnd + 120000 && now >= safeEnd && Continuous && Counting };
        }
    }
}
