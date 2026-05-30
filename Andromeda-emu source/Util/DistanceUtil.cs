namespace OrbitReborn_Emulator.Util
{
  public static class DistanceUtil
  {
    public static long Squared(int x1, int y1, int x2, int y2)
    {
      long dx = (long) x1 - (long) x2;
      long dy = (long) y1 - (long) y2;
      return dx * dx + dy * dy;
    }

    public static bool IsWithinRangeSquared(int x1, int y1, int x2, int y2, int range)
    {
      long rangeSquared = (long) range * (long) range;
      return Squared(x1, y1, x2, y2) <= rangeSquared;
    }
  }
}
