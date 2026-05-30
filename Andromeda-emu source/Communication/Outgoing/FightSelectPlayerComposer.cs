// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Communication.Outgoing.FightSelectPlayerComposer
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Game.Characters;

namespace OrbitReborn_Emulator.Communication.Outgoing
{
    public static class FightSelectPlayerComposer
    {
        public static ServerMessage Compose(CharacterInfo Info)
        {
            ServerMessage serverMessage = new ServerMessage();
            serverMessage.AppendShort("0|N");
            serverMessage.Append(Info.Id);
            serverMessage.Append(Info.Username);
            serverMessage.Append(Info.ShipShield);
            serverMessage.Append(Info.ShipMaxShield);
            serverMessage.Append(Info.ShipHp);
            serverMessage.Append(Info.ShipMaxHp);
            serverMessage.Append(0); // champ bool attendu par le client Flash (index [8])
            return serverMessage;
        }
    }
}