

namespace OrbitReborn_Emulator.Specialized
{
  public static class TimerManager
  {
    private static int mTimerRunning;

    public static int TimerRunning
    {
      get
      {
        return TimerManager.mTimerRunning;
      }
      set
      {
        TimerManager.mTimerRunning = value;
      }
    }
  }
}
