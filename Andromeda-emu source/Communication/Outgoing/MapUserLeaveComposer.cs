

namespace OrbitReborn_Emulator.Communication.Outgoing
{
  public static class MapUserLeaveComposer
  {
    public static ServerMessage Compose(int ActorId)
    {
      ServerMessage serverMessage = new ServerMessage();
      serverMessage.AppendShort("0|R");
      serverMessage.Append(ActorId);
      return serverMessage;
    }
  }
}
