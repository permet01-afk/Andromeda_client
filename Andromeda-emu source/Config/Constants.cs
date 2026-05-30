// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Config.Constants
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using System;
using System.Text;

namespace OrbitReborn_Emulator.Config
{
  public static class Constants
  {
    public static readonly string ConsoleTitle = "Andromeda \\o/ waiting for connections...";
    public static readonly int ConsoleWindowWidth = 90;
    public static readonly int ConsoleWindowHeight = 30;
    public static readonly string DataFileDirectory = Environment.CurrentDirectory + "\\data";
    public static readonly string LogFileDirectory = Environment.CurrentDirectory + "\\logs";
    public static readonly string LangFileDirectory = Environment.CurrentDirectory + "\\lang";
    public static readonly Encoding DefaultEncoding = Encoding.Default;
    public static readonly char LineBreakChar = Convert.ToChar(13);
  }
}
