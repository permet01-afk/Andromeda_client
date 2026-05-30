// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Communication.Outgoing.MapPortalsComposer
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using System.Collections.Generic;

namespace OrbitReborn_Emulator.Communication.Outgoing
{
  public static class MapPortalsComposer
  {
    public static ServerMessage Compose(CList<PortalInfo> Portals, Session Session)
    {
      ServerMessage serverMessage = new ServerMessage();
      foreach (PortalInfo key in (IEnumerable<PortalInfo>) Portals.Keys)
      {
        serverMessage.AppendShort("0|p");
        serverMessage.Append(key.Id);
        serverMessage.Append(key.Type);
        serverMessage.Append(key.LinkedId);
        serverMessage.Append(key.PosX);
        serverMessage.LastAppend(string.Concat((object) key.PosY));
        serverMessage.AppendBreak();
      }
      return serverMessage;
    }
  }
}
