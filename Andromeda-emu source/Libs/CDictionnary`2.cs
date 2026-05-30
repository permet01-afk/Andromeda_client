// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Libs.CDictionnary`2
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using System;
using System.Collections.Concurrent;
using System.Threading;

namespace OrbitReborn_Emulator.Libs
{
  public class CDictionnary<TKey, TValue> : ConcurrentDictionary<TKey, TValue>
  {
    public void Remove(TKey key)
    {
      TValue obj;
      SpinWait spinWait = new SpinWait();
      int attempts = 0;
      while (!this.TryRemove(key, out obj))
      {
        if (!this.ContainsKey(key))
          break;
        ++attempts;
        if (attempts % 128 == 0)
          Output.WriteLine((object) "TryRemove retrying", OutputLevel.DebugInformation);
        spinWait.SpinOnce();
      }
    }

    public void Add(TKey key, TValue value)
    {
      this.AddOrUpdate(key, value, (Func<TKey, TValue, TValue>) ((key1, oldValue) => value));
    }
  }
}
