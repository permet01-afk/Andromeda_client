using System;

namespace OrbitReborn_Emulator.Game.Maps
{
    /// <summary>
    /// DarkOrbit-like: map access depends on player level AND whether the map is own-company or enemy territory.
    /// Map ID conventions assumed:
    /// 1..12  = X-1..X-4 for MMO/EIC/VRU (4 maps each)
    /// 13..16 = 4-1..4-4 (battle maps)
    /// 17..28 = X-5..X-8 for MMO/EIC/VRU (4 maps each)
    /// Everything else = unrestricted by this system (events, GG, etc).
    /// </summary>
    public static class MapAccessService
    {
        public static bool CanAccessMap(int playerFactionId, int playerLevel, int targetMapId, out int requiredLevel)
        {
            requiredLevel = GetRequiredLevel(playerFactionId, targetMapId);
            if (requiredLevel <= 0) return true;
            return playerLevel >= requiredLevel;
        }

        public static int GetRequiredLevel(int playerFactionId, int targetMapId)
        {
            if (targetMapId <= 0) return 0;

            // If player has no faction yet, don't block here (company selection flow usually handles that).
            if (playerFactionId <= 0) return 0;

            // Battle maps
            if (targetMapId >= 13 && targetMapId <= 15) return 8; // 4-1, 4-2, 4-3
            if (targetMapId == 16) return 9;                      // 4-4

            // X-1..X-4 (1..12)
            if (targetMapId >= 1 && targetMapId <= 12)
            {
                int mapCompany = ((targetMapId - 1) / 4) + 1; // 1..3
                int xIndex = ((targetMapId - 1) % 4) + 1;     // 1..4
                return GetRequiredLevelForCompanyMap(playerFactionId, mapCompany, xIndex);
            }

            // X-5..X-8 (17..28)
            if (targetMapId >= 17 && targetMapId <= 28)
            {
                int mapCompany = ((targetMapId - 17) / 4) + 1; // 1..3
                int xIndex = ((targetMapId - 17) % 4) + 5;     // 5..8
                return GetRequiredLevelForCompanyMap(playerFactionId, mapCompany, xIndex);
            }

            // Events, GG, special maps -> not restricted by this classic system
            return 0;
        }

        public static int GetHomeMapX1(int factionId)
        {
            if (factionId < 1 || factionId > 3) return 1;
            return (factionId - 1) * 4 + 1; // MMO:1, EIC:5, VRU:9
        }

        public static int GetHomeMapX8(int factionId)
        {
            // MMO 1-8 = 20, EIC 2-8 = 24, VRU 3-8 = 28
            if (factionId == 1) return 20;
            if (factionId == 2) return 24;
            if (factionId == 3) return 28;
            return 20;
        }

        private static int GetRequiredLevelForCompanyMap(int playerCompany, int mapCompany, int xIndex)
        {
            bool own = (playerCompany == mapCompany);

            if (own)
            {
                // Own territory unlocks
                switch (xIndex)
                {
                    case 1:
                    case 2: return 1;   // X-1, X-2
                    case 3: return 2;   // X-3
                    case 4: return 3;   // X-4
                    case 5: return 10;  // X-5
                    case 6:
                    case 7: return 11;  // X-6, X-7
                    case 8: return 12;  // X-8
                    default: return 1;
                }
            }
            else
            {
                // Enemy territory unlocks (classic DO rules)
                switch (xIndex)
                {
                    case 3:
                    case 4: return 5;   // enemy X-3, X-4
                    case 2: return 13;  // enemy X-2
                    case 1: return 16;  // enemy X-1 (invade base)
                    case 5: return 14;  // enemy X-5
                    case 6:
                    case 7: return 15;  // enemy X-6, X-7
                    case 8: return 17;  // enemy X-8
                    default: return 5;
                }
            }
        }
    }
}
