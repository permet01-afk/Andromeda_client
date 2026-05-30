// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Communication.Outgoing.UserDataComposer
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Game.Sessions;

namespace OrbitReborn_Emulator.Communication.Outgoing
{
    public static class UserDataComposer
    {
        public static ServerMessage Compose(Session Session)
        {
            ServerMessage serverMessage = new ServerMessage();
            serverMessage.AppendShort("RDY|I");
            serverMessage.Append(Session.CharacterId);
            serverMessage.Append(Session.CharacterInfo.Username);
            serverMessage.Append(Session.CharacterInfo.ShipId);
            serverMessage.Append(Session.CharacterInfo.ShipSpeed);
            serverMessage.Append(Session.CharacterInfo.ShipShield);
            serverMessage.Append(Session.CharacterInfo.ShipMaxShield);
            serverMessage.Append(Session.CharacterInfo.ShipHp);
            serverMessage.Append(Session.CharacterInfo.ShipMaxHp);
            serverMessage.Append(Session.CharacterInfo.ShipCargo);
            serverMessage.Append(Session.CharacterInfo.ShipMaxCargo);
            serverMessage.Append(Session.CharacterInfo.LocX);
            serverMessage.Append(Session.CharacterInfo.LocY);
            serverMessage.Append(Session.CharacterInfo.MapId);
            serverMessage.Append(Session.CharacterInfo.FactionId);
            serverMessage.Append(Session.CharacterInfo.ClanId);
            serverMessage.Append("10000");
            serverMessage.Append("100");
            serverMessage.Append("4");
            serverMessage.Append("1");
            serverMessage.Append(Session.CharacterInfo.Experience.ToString());
            serverMessage.Append(Session.CharacterInfo.Honor.ToString());
            serverMessage.Append(Session.CharacterInfo.Level.ToString());
            serverMessage.Append(Session.CharacterInfo.Credits.ToString());
            serverMessage.Append(Session.CharacterInfo.Uridium.ToString());
            serverMessage.Append("0");
            serverMessage.Append(Session.CharacterInfo.Grade);
            serverMessage.Append(Session.CharacterInfo.ClanTag);
            serverMessage.Append(Session.CharacterInfo.GGRings);
            serverMessage.Append("0");
            serverMessage.Append(Session.CharacterInfo.Invisible);
            return serverMessage;
        }
    }
}
