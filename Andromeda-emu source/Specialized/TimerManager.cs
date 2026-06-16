

using System;
using System.Threading;

namespace OrbitReborn_Emulator.Specialized
{
  public static class TimerManager
  {
    private static int mTimerRunning;

    public static int TimerRunning
    {
      get
      {
        int value = Volatile.Read(ref TimerManager.mTimerRunning);
        return Math.Max(0, value);
      }
      set
      {
        Volatile.Write(ref TimerManager.mTimerRunning, Math.Max(0, value));
      }
    }
  }
}
