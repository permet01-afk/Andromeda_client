

namespace OrbitReborn_Emulator.Game.Misc
{
  public static class HappyHour
  {
    private static bool mEnabled = false;

    public static bool Enabled
    {
      get
      {
        return HappyHour.mEnabled;
      }
      set
      {
        HappyHour.mEnabled = value;
      }
    }
  }
}
