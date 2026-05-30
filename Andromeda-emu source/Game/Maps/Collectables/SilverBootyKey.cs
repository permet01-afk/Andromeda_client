using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OrbitReborn_Emulator.Game.Maps.Collectables
{
    class SilverBootyBox : Collectable
    {

        public SilverBootyBox(int Id, int X, int Y, int MapId)
            : base(Id, 25, X, Y, MapId)
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
                if (user.CharacterInfo.BootyKeys <= 0)
                {
                    user.SendData(PacketComposer.Compose("A", "STD|You don't have any booty key."));
                }
                else
                {
                    user.CharacterInfo.RemoveBootyKey(1);
                    user.SendData(PacketComposer.Compose("A", "BK|" + (object)user.CharacterInfo.BootyKeys));
                    this.Collecting = true;
                    Random random = RandomProvider.Current;
                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                        int num = random.Next(1, 101);
                        if(num > 0 && num <=5)
                        {
                            user.CharacterInfo.AddTokens(client, 1);
                            user.SendData(PacketComposer.Compose("A", "STD|You received a token."));
                        }
                        else if(num > 5 && num <=25)
                        {
                            int pvpPoints = random.Next(400, 500);
                            user.CharacterInfo.AddPvpPoints(client, pvpPoints);
                            user.SendData(PacketComposer.Compose("A", "STD|You received "+pvpPoints+" Pvp points."));
                        }
                        else if (num > 25 && num <= 40)
                        {
                            user.CharacterInfo.AddCargo(13L, 20);
                            user.SendData(PacketComposer.Compose("A", "STD|You received 20 promeriums."));
                            user.SendData(user.CharacterInfo.GetCargoMessage());
                        }
                        else if (num > 40 && num <= 60)
                        {
                            int rp = random.Next(300, 500);
                            user.CharacterInfo.AddRankpoints(client, rp);
                            user.SendData(PacketComposer.Compose("A", "STD|You received "+rp+" rankpoints."));
                        }
                        else if(num > 60 && num <= 85 )
                        {
                            user.CharacterInfo.AddCargo(5L, 20);
                            user.SendData(PacketComposer.Compose("A", "STD|You received 20 palladiums."));
                            user.SendData(user.CharacterInfo.GetCargoMessage());
                        }
                        else if (num > 85 && num <= 100)
                        {
                            user.CharacterInfo.AddCargo(11L, 200);
                            user.SendData(PacketComposer.Compose("A", "STD|You received 200 prometids."));
                            user.SendData(user.CharacterInfo.GetCargoMessage());
                        }
                    }
                    instanceByMapId.BroadcastMessage(PacketComposer.Compose("2", string.Concat((object)this.Id)), false);
                    instanceByMapId.Info.Collectables.Remove(this.Id);
                }
            }
        }

    }
}
