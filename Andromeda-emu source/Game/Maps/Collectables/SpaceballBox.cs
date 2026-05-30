using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;

namespace OrbitReborn_Emulator.Game.Maps.Collectables
{
    internal class SpaceballBox : Collectable
    {
        public SpaceballBox(int Id, int X, int Y, int MapId)
          : base(Id, 1, X, Y, MapId)
        {
        }

        public override void Collect(Session user)
        {
            if (this.Collecting)
            {
                user.SendData(PacketComposer.Compose("A", "STD|Box is already beeing collected !"));
            }
            else
            {
                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(this.MapId);
                if (instanceByMapId == null || !instanceByMapId.Info.Collectables.ContainsKey(this.Id) || !DistanceUtil.IsWithinRangeSquared(this.X, this.Y, user.CharacterInfo.LocX, user.CharacterInfo.LocY, 300))
                    return;
                this.Collecting = true;
                Random random = RandomProvider.Current;
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    int num1 = random.Next(0, 4);
                    if (num1 == 0)
                    {
                        user.CharacterInfo.AddCargo(13L, 150);
                        user.SendData(PacketComposer.Compose("A", "STD|You received 150 Promerium."));
                    }
                    else if (num1 == 1)
                    {
                        user.CharacterInfo.AddBoosterReward("dmg", 1);
                        user.SendData(PacketComposer.Compose("A", "STD|You received DMG-Booster (1 hour)."));
                    }
                    else if (num1 == 2)
                    {
                        user.CharacterInfo.AddBoosterReward("shd", 1);
                        user.SendData(PacketComposer.Compose("A", "STD|You received SHD-Booster (1 hour)."));
                    }
                    else
                    {
                        user.CharacterInfo.AddBoosterReward("hp", 1);
                        user.SendData(PacketComposer.Compose("A", "STD|You received HP-Booster (1 hour)."));
                    }
                }
                instanceByMapId.BroadcastMessage(PacketComposer.Compose("2", string.Concat((object)this.Id)), false);
                instanceByMapId.Info.Collectables.Remove(this.Id);
            }
        }
    }
}
