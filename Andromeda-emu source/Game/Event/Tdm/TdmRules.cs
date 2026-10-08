using System;

namespace OrbitReborn_Emulator.Game.Event.Tdm
{
    // ANDROMEDA V1 — based on observed 2014 HUD. Timing/repair rules are custom.
    public static class TdmRules
    {
        public const int Map = 83, Background = 82, Min = 3, Max = 8, Target = 30, Lives = 3;
        public const long OfferMs = 15000, SafeMs = 20000, MatchMs = 900000,
            RepairMs = 15000, NazMs = 20000, ReconnectMs = 15000, ResultMs = 30000, EmptyMs = 30000;
        public const int BeaconX = 10670, BeaconY = 6509, BeaconRange = 400;
        public const string Unavailable = "Team Deathmatch is currently unavailable.";
        public const string EmptyResult = "Match ended: no active opponents for 30 seconds. No victory reward was granted.";
        public static int Bracket(int level) { return level < 8 ? 0 : level < 14 ? 1 : 2; }
        public static int Home(int company) { return company == 1 ? 1 : company == 2 ? 5 : 9; }
        public static int SpawnX(int side) { return side == 0 ? 3500 : 17500; }
        public static bool NearBeacon(int map, int company, int x, int y)
        { return company >= 1 && company <= 3 && map == Home(company) && Squared(x - BeaconX, y - BeaconY) <= BeaconRange * BeaconRange; }
        public static double Squared(double x, double y) { return x * x + y * y; }
    }

    // No legacy payouts. A configured provider MUST have a durable exactly-once
    // ledger before it can be enabled in a separately authorized economy phase.
    public sealed class TdmRewardPolicy
    {
        public TdmRewardPolicy(long? credits = null, long? uridium = null, long? experience = null, long? honor = null)
        {
            if (credits < 0 || uridium < 0 || experience < 0 || honor < 0)
                throw new ArgumentOutOfRangeException("rewards", "Reward amounts must be non-negative or unset.");
            Credits = credits; Uridium = uridium; Experience = experience; Honor = honor;
        }
        // Configuration is injectable, but V1 has no economic writer. Supplying
        // amounts alone must never enable payment without an approved ledger.
        public bool Enabled { get { return false; } }
        public long? Credits { get; private set; }
        public long? Uridium { get; private set; }
        public long? Experience { get; private set; }
        public long? Honor { get; private set; }
        public string Status { get { return Credits.HasValue || Uridium.HasValue || Experience.HasValue || Honor.HasValue ? "DISABLED / CONFIGURED" : "DISABLED / UNSET"; } }
    }

    public sealed class TdmPresence
    {
        public int Id, Company, Level, Map, X, Y;
        public bool Connected, Ready, Compatible;
        public bool Eligible { get { return Connected && Ready && Compatible && Company >= 1 && Company <= 3 && TdmRules.Bracket(Level) > 0; } }
    }

    public sealed class TdmEffect
    {
        public string Kind, MatchId;
        public int Player, Side, Seat;
        public long Generation;
    }
}
