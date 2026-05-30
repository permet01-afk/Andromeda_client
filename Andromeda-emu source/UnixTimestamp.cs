using System;

namespace OrbitReborn_Emulator
{
    public static class UnixTimestamp
    {
        // Always use UTC for Unix timestamps
        public static double GetCurrent()
        {
            return (DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds;
        }

        // Converts a Unix timestamp (seconds since epoch) to a UTC DateTime
        public static DateTime GetDateTimeFromUnixTimestamp(double timestamp)
        {
            return new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddSeconds(timestamp);
        }
    }
}