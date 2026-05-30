namespace OrbitReborn_Emulator.Game.Characters
{
    public static class ExperienceSystem
    {
        public const int MaxLevel = 30;

        // XP total requis pour atteindre un niveau donné
        public static long XpForLevel(int level)
        {
            if (level <= 1) return 0;
            // lvl2=10k, lvl3=20k, lvl4=40k...
            long xp = 10_000L << (level - 2);
            return xp;
        }

        public static int GetLevelFromExperience(long xp)
        {
            if (xp < 10_000) return 1;

            int level = 2;
            while (level < MaxLevel && xp >= XpForLevel(level + 1))
                level++;

            return level;
        }
    }
}
