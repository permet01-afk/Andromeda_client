namespace OrbitReborn_Emulator.Game.Characters
{
    /// <summary>Approved Andromeda rule. canBeginner is a compatibility cache, not eligibility.</summary>
    public static class BeginnerRules
    {
        public static bool IsBeginnerLevel(int level) { return level >= 1 && level <= 11; }
        public static int CacheForLevel(int level) { return IsBeginnerLevel(level) ? 1 : 0; }
        public static int CacheForExperience(long experience)
        {
            return CacheForLevel(ExperienceSystem.GetLevelFromExperience(experience));
        }
    }
}
