using System;
using System.Collections.Generic;
using System.Linq;

namespace OrbitReborn_Emulator.Game.Characters
{
    // Phase 4. Separate from the validated Phase 3 progression/bonus rules.
    public static class DroneWearRules
    {
        public const int MaxDamageUnits = 60000;
        public const int IrisDeathWear = 1000;
        public const int FlaxDeathWear = 1500;
        public static int Increment(int itemId) { return itemId == 3 ? IrisDeathWear : itemId == 5 ? FlaxDeathWear : 0; }
        public static int DisplayPercent(int units)
        {
            if (units < 0 || units > MaxDamageUnits) throw new ArgumentOutOfRangeException("units");
            return (units + 300) / 600;
        }
        public static int AfterDeath(int itemId, int units, bool invasion)
        {
            if (units < 0 || units >= MaxDamageUnits) throw new InvalidOperationException("Invalid living drone damage.");
            return invasion ? units : Math.Min(MaxDamageUnits, units + Increment(itemId));
        }
        public static string LegacyProjection(IEnumerable<DroneState> drones)
        { return string.Join("-", drones.OrderBy(d => d.Id).Select(d => d.ItemId == 3 ? "3/0" : "2/0")); }
    }

    public enum GameplayDeathCause { Pvp, Npc, Radiation, Mine }

    // Captured before applying an impact. Never obtain a fresh epoch in the death callback.
    public sealed class GameplayDeathContext
    {
        public readonly long LifeEpoch;
        public readonly string SessionToken;
        public readonly int MapId;
        public readonly GameplayDeathCause Cause;
        public readonly bool InvasionExempt;
        public readonly long TdmLife; // Runtime-only projectile fence; durable Phase4 epoch unchanged.
        public GameplayDeathContext(long epoch, string token, int map, GameplayDeathCause cause, bool invasion, long tdmLife = 0)
        { LifeEpoch = epoch; SessionToken = token; MapId = map; Cause = cause; InvasionExempt = invasion; TdmLife = tdmLife; }
    }
}
