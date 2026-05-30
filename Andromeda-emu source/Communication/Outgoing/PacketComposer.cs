

namespace OrbitReborn_Emulator.Communication.Outgoing
{
  public static class PacketComposer
  {
    public static ServerMessage Compose(string header, string packet)
    {
      ServerMessage serverMessage = new ServerMessage();
      serverMessage.AppendShort("0|" + header);
      serverMessage.Append(packet);
      return serverMessage;
    }

    public static ServerMessage ComposeChat(string packet)
    {
      ServerMessage serverMessage = new ServerMessage();
      serverMessage.Append(packet);
      return serverMessage;
    }
  }
}
