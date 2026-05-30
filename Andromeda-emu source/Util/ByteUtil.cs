// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Util.ByteUtil
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

namespace OrbitReborn_Emulator.Util
{
  public static class ByteUtil
  {
    public static byte[] Subbyte(byte[] Bytes, int Offset, int ByteCount)
    {
      int num1 = Offset + ByteCount;
      if (num1 > Bytes.Length)
        num1 = Bytes.Length;
      int num2 = num1 - ByteCount;
      if (ByteCount > Bytes.Length)
        ByteCount = Bytes.Length;
      if (ByteCount < 0)
        ByteCount = 0;
      byte[] numArray = new byte[ByteCount];
      for (int index = 0; index < ByteCount; ++index)
        numArray[index] = Bytes[Offset++];
      return numArray;
    }
  }
}
