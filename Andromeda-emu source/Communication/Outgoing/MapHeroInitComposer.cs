using OrbitReborn_Emulator.Game.Characters;

namespace OrbitReborn_Emulator.Communication.Outgoing
{
    public static class MapHeroInitComposer
    {
        public static ServerMessage Compose(CharacterInfo info)
        {
            var serverMessage = new ServerMessage();

            serverMessage.AppendShort("0|H");
            serverMessage.Append(info.LocX);
            serverMessage.Append(info.LocY);
            serverMessage.AppendBreak();

            return serverMessage;
        }
    }
}