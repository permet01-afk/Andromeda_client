

using OrbitReborn_Emulator.Game.Sessions;

namespace OrbitReborn_Emulator.Communication.Incoming
{
  public delegate void ProcessRequestCallback(Session Client, ClientMessage Message);
}
