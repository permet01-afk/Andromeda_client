

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
