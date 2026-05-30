// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Communication.Incoming.ProcessRequestCallback
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Game.Sessions;

namespace OrbitReborn_Emulator.Communication.Incoming
{
  public delegate void ProcessRequestCallback(Session Client, ClientMessage Message);
}
