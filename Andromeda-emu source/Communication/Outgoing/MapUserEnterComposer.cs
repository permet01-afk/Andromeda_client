

using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator;

namespace OrbitReborn_Emulator.Communication.Outgoing
{
    public static class MapUserEnterComposer
    {
        public static ServerMessage Compose(CharacterInfo Info, Session Session)
        {
            ServerMessage serverMessage = new ServerMessage();
            if (Info.IsInvisibleForAll && Info.IsAdmin)
            {
                serverMessage.AppendShort("0|R");
                serverMessage.Append(Info.Id.ToString());
                serverMessage.AppendBreak();
                return serverMessage;
            }
            serverMessage.AppendShort("f|C");
            serverMessage.Append(Info.Id);
            if (Info.MapId == 80)
                serverMessage.Append("10");
            else
                serverMessage.Append(Info.ShipId);
            serverMessage.Append(3);
            if (Info.MapId == 80)
                serverMessage.Append("***");
            else
                serverMessage.Append(Info.ClanTag);
            if (Info.MapId == 80)
                serverMessage.Append("********");
            else
                serverMessage.Append(Info.Username);
            serverMessage.Append(Info.LocX);
            serverMessage.Append(Info.LocY);
            serverMessage.Append(Info.FactionId);
            serverMessage.Append(Info.ClanId);
            if (Info.MapId == 80)
                serverMessage.Append("1");
            else
                serverMessage.Append(Info.Grade);
            serverMessage.Append(0);
            serverMessage.Append(Session.CharacterInfo.GetClanDiplomacyStateTo(Info.ClanId));
            if (Info.MapId == 80)
                serverMessage.Append("0");
            else
                serverMessage.Append(Info.GGRings);

            serverMessage.AppendBreak();
            if (Session.CharacterInfo.Settings.ShowDrones == 1)
            {
                serverMessage.AppendShort("0|n");
                serverMessage.Append("d|" + (object)Info.Id + "|" + Info.GetDronePacketString());
                serverMessage.AppendBreak();
            }
            else
            {
                serverMessage.AppendShort("0|n");

                int flax, iris;
                Info.GetDroneDisplayCounts(out flax, out iris);

                serverMessage.Append("e|" + (object)Info.Id + "|" + (object)flax + "/" + (object)iris);
                serverMessage.AppendBreak();
            }
            serverMessage.AppendShort("0|n");
            serverMessage.Append("pt|" + (object)Info.Id + "|" + Info.GameTitle);
            serverMessage.AppendBreak();
            serverMessage.AppendShort("0|n");
            serverMessage.Append("INV|" + (object)Info.Id + "|" + (object)Info.Invisible);
            serverMessage.AppendBreak();
            if (Info.KillStrek >= 10)
            {
                serverMessage.AppendShort("0|n");
                serverMessage.Append("fx|start|RAGE|" + (object)Info.Id);
                serverMessage.AppendBreak();
            }
            if (Info.ActiveShipSkillType > 0 && Info.ActiveShipSkillUntil > UnixTimestamp.GetCurrent())
            {
                serverMessage.AppendShort("0|SD");
                string payload = "A|0|" + (object)Info.ActiveShipSkillType + "|" + (object)Info.Id;
                if (Info.ActiveShipSkillTargetId != 0)
                    payload = payload + "|" + (object)Info.ActiveShipSkillTargetId;
                serverMessage.Append(payload);
                serverMessage.AppendBreak();
            }
            if (Info.EnergyLeechActive)
            {
                serverMessage.AppendShort("0|TX");
                serverMessage.Append("A|0|ELA|" + (object)Info.Id + "|" + (object)Info.EnergyLeechSecondsLeft);
                serverMessage.AppendBreak();
            }
            int num = System.Math.Max(0, (int)System.Math.Ceiling(5.0 - (UnixTimestamp.GetCurrent() - Info.LastTechSh)));
            if (num > 0)
            {
                serverMessage.AppendShort("0|TX");
                serverMessage.Append("A|0|SBU|" + (object)Info.Id + "|" + (object)num);
                serverMessage.AppendBreak();
            }
            if (Info.BattleRepairTimer != null && Info.BattleRepairCount > 0)
            {
                serverMessage.AppendShort("0|TX");
                serverMessage.Append("A|0|BRB|" + (object)Info.Id + "|" + (object)Info.BattleRepairCount);
                serverMessage.AppendBreak();
            }
            return serverMessage;
        }
    }
}
