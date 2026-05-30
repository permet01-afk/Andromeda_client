// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Libs.CList`1
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using System;

namespace OrbitReborn_Emulator.Libs
{
  public class CList<T> : CDictionnary<T, T>
  {
    public void Add(T key)
    {
      this.AddOrUpdate(key, key, (Func<T, T, T>) ((key1, oldValue) => key));
    }

    public bool Contains(T key)
    {
      return this.ContainsKey(key);
    }
  }
}
