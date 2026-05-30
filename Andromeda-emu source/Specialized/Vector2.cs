// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Specialized.Vector2
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

namespace OrbitReborn_Emulator.Specialized
{
  public class Vector2
  {
    private int mX;
    private int mY;

    public int X
    {
      get
      {
        return this.mX;
      }
      set
      {
        this.mX = value;
      }
    }

    public int Y
    {
      get
      {
        return this.mY;
      }
      set
      {
        this.mY = value;
      }
    }

    public Vector2()
    {
      this.mX = 0;
      this.mY = 0;
    }

    public Vector2(int X, int Y)
    {
      this.mX = X;
      this.mY = Y;
    }

    public override string ToString()
    {
      return this.X.ToString() + "|" + (object) this.Y;
    }

    public static Vector2 FromString(string Input)
    {
      string[] strArray = Input.Split('|');
      int result1 = 0;
      int result2 = 0;
      int.TryParse(strArray[0], out result1);
      if (strArray.Length > 1)
        int.TryParse(strArray[1], out result2);
      return new Vector2(result1, result2);
    }
  }
}
