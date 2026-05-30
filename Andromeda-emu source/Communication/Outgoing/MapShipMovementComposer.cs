

namespace OrbitReborn_Emulator.Communication.Outgoing
{
  public static class MapShipMovementComposer
  {
    public static ServerMessage Compose(int ReferenceId, int LocX, int LocY, double TimeTaken)
    {
      ServerMessage serverMessage = new ServerMessage();
      serverMessage.AppendShort("0|1");
      serverMessage.Append(ReferenceId);
      serverMessage.Append(LocX);
      serverMessage.Append(LocY);
      serverMessage.Append((int) TimeTaken);
      return serverMessage;
    }
  }
}
