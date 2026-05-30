

namespace OrbitReborn_Emulator.Game.Misc
{
  public static class PvpManager
  {
    private static bool mPvpEnabled = true;

    public static bool PvpEnabled
    {
      get
      {
        return PvpManager.mPvpEnabled;
      }
      set
      {
        PvpManager.mPvpEnabled = value;
      }
    }
  }
}
