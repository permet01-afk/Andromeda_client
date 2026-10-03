using System;
using System.Collections.Generic;
using System.Linq;

namespace OrbitReborn_Emulator.Game.Characters
{
    public sealed class DroneState
    {
        public readonly int Id, ItemId, Level, Points;
        public readonly bool Havok;
        public DroneState(int id, int itemId, int level, int points, bool havok)
        {
            if (level < 1 || level > 6 || points < 0 || (level == 6 && points != 0)
                || (level < 6 && points >= DroneRules.Threshold(level)))
                throw new InvalidOperationException("Invalid drone progression; check PHASE3_DRONE_LEVELS_SQL.txt.");
            Id = id; ItemId = itemId; Level = level; Points = points;
            Havok = itemId == 3 && havok;
        }
        public string PacketCode { get { return (ItemId == 3 ? "2" : "1") + (Level - 1) + (Havok ? ",H" : ""); } }
        public DroneState Gain(int award)
        {
            int level = Level;
            long points = (long)Points + Math.Max(0, award);
            while (level < 6 && points >= DroneRules.Threshold(level)) { points -= DroneRules.Threshold(level); level++; }
            return new DroneState(Id, ItemId, level, level == 6 ? 0 : (int)points, Havok);
        }
    }

    public static class DroneRules
    {
        // ANDROMEDA ADAPTATION — historically probable transition semantics.
        // Historical thresholds; carry remainder, terminal L6 freezes at zero.
        private static readonly int[] Thresholds = { 100, 200, 400, 800, 1600, 0 };
        public static int Threshold(int level) { return Thresholds[Math.Max(1, Math.Min(6, level)) - 1]; }
        public static bool FullHavok(IEnumerable<DroneState> drones)
        {
            var iris = drones.Where(d => d.ItemId == 3).GroupBy(d => d.Id).Select(g => g.First()).ToArray();
            return iris.Length > 0 && iris.All(d => d.Havok);
        }
        public static int Laser(int item) { switch (item) { case 10: return 40; case 11: return 60; case 12: return 100; case 1: return 150; default: return 0; } }
        public static int Shield(int item) { switch (item) { case 35: return 1000; case 36: return 2000; case 37: return 4000; case 2: return 10000; default: return 0; } }
        public static int Speed(int item) { switch (item) { case 30: return 2; case 31: return 3; case 32: return 4; case 33: return 5; case 34: return 7; case 4: return 10; default: return 0; } }
        // Exact fixed point, denominator 10000; round half UP only once for the whole config.
        public static long DroneLaserUnits(int damage, DroneState drone, bool fullHavok)
        { return (long)damage * (100 + 2 * (drone.Level - 1)) * (drone.ItemId == 3 && fullHavok ? 110 : 100); }
        public static long DroneShieldUnits(int shield, DroneState drone)
        { return (long)shield * (100 + 4 * (drone.Level - 1)) * 100; }
        public static int RoundUnits(long units) { return checked((int)((units + 5000) / 10000)); }
        public static int NormalizeShip(int id)
        {
            switch (id) {
                case 17: case 18: return 8;
                case 56: case 59: case 63: case 64: case 65: case 66: case 67: return 10;
                default: return id >= 1 && id <= 10 ? id : 0;
            }
        }
        // EN official FAQ is primary; DE only extends Yamato / Defcom / Nostromo.
        // Victim names are exact catalog keys: Streuner and StreuneR are distinct NPCs.
        private static readonly Dictionary<string, int[]> NpcMatrix = new Dictionary<string, int[]>(StringComparer.Ordinal) {
            { "Streuner", new[] { 4, 3, 3, 1, 0, 0, 0, 0, 0, 0 } },
            { "Lordakia", new[] { 6, 5, 4, 3, 2, 1, 0, 0, 0, 0 } },
            { "Devolarium", new[] { 40, 35, 30, 25, 20, 15, 10, 9, 8, 7 } },
            { "Mordon", new[] { 16, 14, 12, 10, 8, 6, 4, 2, 1, 1 } },
            { "Sibelon", new[] { 50, 45, 40, 35, 30, 25, 22, 19, 17, 12 } },
            { "Saimon", new[] { 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 } },
            { "Sibelonit", new[] { 20, 18, 16, 14, 12, 10, 8, 6, 4, 3 } },
            { "Lordakium", new[] { 60, 55, 50, 45, 40, 35, 30, 25, 20, 15 } },
            { "Kristallin", new[] { 30, 25, 20, 18, 16, 14, 12, 10, 7, 4 } },
            { "Kristallon", new[] { 72, 70, 64, 60, 53, 40, 40, 30, 24, 18 } },
            { "StreuneR", new[] { 14, 13, 11, 9, 7, 5, 4, 3, 2, 1 } },
        };
        private static readonly int[,] PvpMatrix = new int[,] {
            { 10, 10, 10, 10, 10, 10, 10, 20, 20, 25 },
            { 8, 10, 10, 10, 10, 10, 10, 20, 20, 25 },
            { 6, 8, 10, 10, 10, 10, 10, 20, 20, 25 },
            { 4, 6, 8, 10, 10, 10, 10, 20, 20, 25 },
            { 2, 4, 6, 8, 10, 10, 10, 20, 20, 25 },
            { 1, 2, 4, 6, 8, 10, 10, 20, 20, 25 },
            { 0, 1, 2, 4, 6, 8, 10, 20, 20, 25 },
            { 0, 0, 1, 2, 4, 6, 8, 20, 20, 25 },
            { 0, 0, 0, 1, 2, 4, 6, 8, 20, 25 },
            { 0, 0, 0, 0, 1, 2, 4, 6, 8, 25 },
        };
        // Explicit catalog allow-list. Never infer 'Boss', 'Uber' or a map's event from a substring.
        private static readonly HashSet<string> SpecialNames = new HashSet<string>(StringComparer.Ordinal) {
            "Boss Streuner", "Boss Lordakia", "Boss Mordon", "Boss Saimon", "Boss Devolarium",
            "Boss Sibelon", "Boss Sibelonit", "Boss Lordakium", "Boss Kristallin", "Boss Kristallon", "Boss StreuneR",
            "Uber Streuner", "Uber Lordakia", "Uber Mordon", "Uber Saimon", "Uber Devolarium",
            "Uber Sibelon", "Uber Sibelonit", "Uber Lordakium", "Uber Kristallin", "Uber Kristallon", "Uber StreuneR"
        };
        public static int NpcAward(int attackerShip, string victim, bool invasion = false)
        {
            // Strip only the exact decoration used by Npc.Balance2010; preserve StreuneR case.
            if (victim != null && victim.StartsWith("-=[ ", StringComparison.Ordinal) && victim.EndsWith(" ]=-", StringComparison.Ordinal))
                victim = victim.Substring(4, victim.Length - 8);
            // ANDROMEDA ADAPTATION: Invasion 10, Cubikon 18, Protegit 3.
            // Custom rules are independent of historical attacker classes.
            if (invasion) return 10;
            if (victim == "Cubikon" || victim == "Boss Cubikon") return 18;
            if (victim == "Protegit" || victim == "Boss Protegit") return 3;
            if (SpecialNames.Contains(victim ?? "")) return 10;
            int ship = NormalizeShip(attackerShip); int[] values;
            return ship > 0 && NpcMatrix.TryGetValue(victim ?? "", out values) ? values[ship - 1] : 0;
        }
        public static int PvpAward(int attackerShip, int victimShip)
        {
            int a = NormalizeShip(attackerShip), v = NormalizeShip(victimShip);
            return a > 0 && v > 0 ? PvpMatrix[a - 1, v - 1] : 0;
        }
    }
}
