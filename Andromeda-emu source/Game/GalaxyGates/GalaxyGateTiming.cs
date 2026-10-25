using System;
using System.Diagnostics;

namespace OrbitReborn_Emulator.Game.GalaxyGates
{
    public interface IGalaxyGateTimingClock
    {
        string BootId { get; }
        long NowMilliseconds { get; }
    }

    /// <summary>UTC is sampled once. Elapsed time then includes all pauses and
    /// disconnects, without being shortened by subsequent system-clock changes.</summary>
    public sealed class GalaxyGateTimingClock : IGalaxyGateTimingClock
    {
        public static readonly GalaxyGateTimingClock Instance = new GalaxyGateTimingClock();
        private readonly string boot = Guid.NewGuid().ToString("N");
        private readonly long anchor = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        private readonly Stopwatch elapsed = Stopwatch.StartNew();
        public string BootId { get { return boot; } }
        public long NowMilliseconds { get { return checked(anchor + elapsed.ElapsedMilliseconds); } }
    }

    public sealed class GalaxyGateTimingRun
    {
        public string RunId;
        public int PlayerId, GateId, CompanyAtStart, RuleVersion;
        public long? StartedAtMilliseconds;
        public string BootId;
        public bool Eligible, GateCompleted;
        public bool TrackingAvailable = true;
    }

    /// <summary>Immutable facts frozen at the final admitted NPC, before I/O.
    /// Retries reuse this value, never a later reward/exit/reconnect timestamp.</summary>
    public sealed class GalaxyGateCompletion
    {
        public const int CurrentRuleVersion = 1;
        public string RunId { get; private set; }
        public int PlayerId { get; private set; }
        public int GateId { get; private set; }
        public int CompanyAtStart { get; private set; }
        public int RuleVersion { get; private set; }
        public long? StartedAtMilliseconds { get; private set; }
        public long CompletedAtMilliseconds { get; private set; }
        public long? ElapsedMilliseconds { get; private set; }
        public bool RankEligible { get; private set; }
        public bool TrackingAvailable { get; private set; }
        public string ExclusionReason { get; private set; }

        public static GalaxyGateCompletion Finish(GalaxyGateTimingRun run, IGalaxyGateTimingClock clock)
        {
            if (run == null || clock == null || !ValidId(run.RunId) || run.PlayerId <= 0 || run.GateId < 1 || run.GateId > 4)
                throw new ArgumentException("Invalid Galaxy Gate timing run.");
            long end = clock.NowMilliseconds;
            string excluded = !run.TrackingAvailable ? "migration_unavailable"
                : !run.StartedAtMilliseconds.HasValue || run.RuleVersion == 0 ? "legacy_started"
                : run.RuleVersion != CurrentRuleVersion ? "unsupported_rule"
                : !string.Equals(run.BootId, clock.BootId, StringComparison.Ordinal) ? "server_restart"
                : !run.Eligible ? "timing_invalid"
                : end < run.StartedAtMilliseconds.Value ? "clock_invalid" : null;
            bool eligible = excluded == null;
            return new GalaxyGateCompletion {
                RunId = run.RunId, PlayerId = run.PlayerId, GateId = run.GateId,
                CompanyAtStart = run.CompanyAtStart, RuleVersion = run.RuleVersion,
                StartedAtMilliseconds = run.StartedAtMilliseconds, CompletedAtMilliseconds = end,
                ElapsedMilliseconds = eligible ? (long?)(end - run.StartedAtMilliseconds.Value) : null,
                RankEligible = eligible, ExclusionReason = excluded, TrackingAvailable = run.TrackingAvailable
            };
        }

        public static bool ValidId(string value)
        {
            Guid parsed;
            return value != null && value.Length == 32 && Guid.TryParseExact(value, "N", out parsed);
        }
        public static DateTime ToUtc(long milliseconds) { return DateTimeOffset.FromUnixTimeMilliseconds(milliseconds).UtcDateTime; }
        public static long FromUtc(object value)
        {
            return new DateTimeOffset(DateTime.SpecifyKind(Convert.ToDateTime(value), DateTimeKind.Utc)).ToUnixTimeMilliseconds();
        }
    }
}
