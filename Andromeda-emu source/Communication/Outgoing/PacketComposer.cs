// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Communication.Outgoing.PacketComposer
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

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
