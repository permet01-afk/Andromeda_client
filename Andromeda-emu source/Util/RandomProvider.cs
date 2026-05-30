using System;
using System.Threading;

namespace OrbitReborn_Emulator.Util
{
  public static class RandomProvider
  {
    private static int mSeed = Environment.TickCount;
    private static readonly ThreadLocal<Random> mRandom = new ThreadLocal<Random>(() => new Random(Interlocked.Increment(ref mSeed)));

    public static Random Current
    {
      get
      {
        return mRandom.Value;
      }
    }
  }
}
