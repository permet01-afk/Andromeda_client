// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Communication.Outgoing.MapShipMovementComposer
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

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
