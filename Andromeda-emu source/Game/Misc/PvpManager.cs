// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Misc.PvpManager
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

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
