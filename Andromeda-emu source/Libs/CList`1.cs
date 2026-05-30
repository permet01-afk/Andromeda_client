

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
