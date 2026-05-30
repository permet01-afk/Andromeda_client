

using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using System.Collections.Generic;

namespace OrbitReborn_Emulator.Communication.Outgoing
{
    public static class MapUserObjectListComposer
    {
        public static ServerMessage Compose(CList<MapActor> Actors, Session Session)
        {
            ServerMessage serverMessage = new ServerMessage();
            foreach (MapActor key in (IEnumerable<MapActor>)Actors.Keys)
            {
                if (((CharacterInfo)key.ReferenceObject).IsInvisibleForAll && ((CharacterInfo)key.ReferenceObject).IsAdmin)
                {
                    serverMessage.AppendShort("0|R");
                    serverMessage.Append(((CharacterInfo)key.ReferenceObject).Id.ToString());
                    serverMessage.AppendBreak();
                    continue;
                }
                serverMessage.AppendShort("f|C");
                serverMessage.Append(key.ReferenceId);
                serverMessage.Append(((CharacterInfo)key.ReferenceObject).ShipId);
                serverMessage.Append(3);
                serverMessage.Append(((CharacterInfo)key.ReferenceObject).ClanTag);
                serverMessage.Append(key.Name);
                serverMessage.Append(((CharacterInfo)key.ReferenceObject).LocX);
                serverMessage.Append(((CharacterInfo)key.ReferenceObject).LocY);
                serverMessage.Append(((CharacterInfo)key.ReferenceObject).FactionId);
                serverMessage.Append(((CharacterInfo)key.ReferenceObject).ClanId);
                serverMessage.Append(((CharacterInfo)key.ReferenceObject).Grade);
                serverMessage.Append(0);
                serverMessage.Append(Session.CharacterInfo.GetClanDiplomacyStateTo(((CharacterInfo)key.ReferenceObject).ClanId));
                serverMessage.Append(0);
                serverMessage.AppendBreak();
                if (Session.CharacterInfo.Settings.ShowDrones == 1)
                {
                    serverMessage.AppendShort("0|n");
                    serverMessage.Append("d|" + (object)key.ReferenceId + "|" + ((CharacterInfo)key.ReferenceObject).GetDronePacketString());
                    serverMessage.AppendBreak();
                }
                else
                {
                    serverMessage.AppendShort("0|n");

                    int flax, iris;
                    ((CharacterInfo)key.ReferenceObject).GetDroneDisplayCounts(out flax, out iris);

                    serverMessage.Append("e|" + (object)key.ReferenceId + "|" + (object)flax + "/" + (object)iris);
                    serverMessage.AppendBreak();

                }
                if (((CharacterInfo)key.ReferenceObject).GameTitle != "")
                {
                    serverMessage.AppendShort("0|n");
                    serverMessage.Append("pt|" + (object)key.ReferenceId + "|" + ((CharacterInfo)key.ReferenceObject).GameTitle);
                    serverMessage.AppendBreak();
                }
                serverMessage.AppendShort("0|n");
                serverMessage.Append("INV|" + (object)((CharacterInfo)key.ReferenceObject).Id + "|" + (object)((CharacterInfo)key.ReferenceObject).Invisible);
                serverMessage.AppendBreak();
                if (((CharacterInfo)key.ReferenceObject).KillStrek >= 10)
                {
                    serverMessage.AppendShort("0|n");
                    serverMessage.Append("fx|start|RAGE|" + (object)((CharacterInfo)key.ReferenceObject).Id);
                    serverMessage.AppendBreak();
                }
            }
            return serverMessage;
        }
    }
}

