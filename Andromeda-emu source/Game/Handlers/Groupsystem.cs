using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Sessions;
using System;
using System.Collections.Generic;
namespace OrbitReborn_Emulator.Game.Handlers
{
    class Groupsystem
    {
        public static void Initialize()
        {
            GroupManager group = new GroupManager();
            DataRouter.RegisterHandler("ps", new ProcessRequestCallback(group.Monitor), false);
        }
    }
}
