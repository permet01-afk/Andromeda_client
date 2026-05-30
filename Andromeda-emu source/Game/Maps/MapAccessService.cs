using System;

namespace OrbitReborn_Emulator.Game.Maps
{
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

            if (playerFactionId <= 0) return 0;

            if (targetMapId >= 13 && targetMapId <= 15) return 8;
            if (targetMapId == 16) return 9;

            if (targetMapId >= 1 && targetMapId <= 12)
            {
                int mapCompany = ((targetMapId - 1) / 4) + 1;
                int xIndex = ((targetMapId - 1) % 4) + 1;
                return GetRequiredLevelForCompanyMap(playerFactionId, mapCompany, xIndex);
            }

            if (targetMapId >= 17 && targetMapId <= 28)
            {
                int mapCompany = ((targetMapId - 17) / 4) + 1;
                int xIndex = ((targetMapId - 17) % 4) + 5;
                return GetRequiredLevelForCompanyMap(playerFactionId, mapCompany, xIndex);
            }

            return 0;
        }

        public static int GetHomeMapX1(int factionId)
        {
            if (factionId < 1 || factionId > 3) return 1;
            return (factionId - 1) * 4 + 1;
        }

        public static int GetHomeMapX8(int factionId)
        {
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
                switch (xIndex)
                {
                    case 1:
                    case 2: return 1;
                    case 3: return 2;
                    case 4: return 3;
                    case 5: return 10;
                    case 6:
                    case 7: return 11;
                    case 8: return 12;
                    default: return 1;
                }
            }
            else
            {
                switch (xIndex)
                {
                    case 3:
                    case 4: return 5;
                    case 2: return 13;
                    case 1: return 16;
                    case 5: return 14;
                    case 6:
                    case 7: return 15;
                    case 8: return 17;
                    default: return 5;
                }
            }
        }
    }
}
