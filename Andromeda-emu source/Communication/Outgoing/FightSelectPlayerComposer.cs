

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
            serverMessage.Append(0);
            return serverMessage;
        }
    }
}