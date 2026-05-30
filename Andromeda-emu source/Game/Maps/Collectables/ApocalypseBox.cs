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
    class ApocalypseBox : Collectable
    {

        public ApocalypseBox(int Id, int X, int Y, int MapId)
            : base(Id, 26, X, Y, MapId)
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
                        if (num > 0 && num <= 5)
                        {
                            user.CharacterInfo.AddTokens(client, 1);
                            user.SendData(PacketComposer.Compose("A", "STD|You received a token."));
                        }
                        else if (num > 5 && num <= 10)
                        {
                            user.CharacterInfo.AddTickets(client, 1);
                            user.SendData(PacketComposer.Compose("A", "STD|You received a lottery's ticket."));
                        }
                        else if (num > 10 && num <= 25)
                        {
                            int npcPoints = random.Next(800, 1000);
                            user.CharacterInfo.AddReward(client, 0, 0, npcPoints, true);
                            user.SendData(PacketComposer.Compose("A", "STD|You received " + (object)npcPoints + " NPC point(s)."));
                        }
                        else if (num > 25 && num <= 40)
                        {
                            int rp = random.Next(800,1000);
                            user.CharacterInfo.AddRankpoints(client, rp);
                            user.SendData(PacketComposer.Compose("A", "STD|You received "+ rp +" rankpoints."));
                        }
                        else if (num > 40 && num <= 55)
                        {
                            int uri = random.Next(8000, 10000);
                            user.CharacterInfo.AddReward(client, 0, uri, 0, true);
                            user.SendData(PacketComposer.Compose("y", "URI|" + (object)uri + "|" + (object)user.CharacterInfo.Uridium));
                        }
                        else if (num > 55 && num <=70)
                        {
                            user.CharacterInfo.AddCargo(11L, 200);
                            user.CharacterInfo.AddCargo(12L, 200);
                            user.SendData(PacketComposer.Compose("A", "STD|You received 200 Prometids/Duraniums."));
                            user.SendData(user.CharacterInfo.GetCargoMessage());
                        }
                        else if (num > 70 && num <= 85)
                        {
                            int credit = random.Next(150000000, 200000000);
                            user.CharacterInfo.AddReward(client, credit, 0, 0, true);
                            user.SendData(PacketComposer.Compose("y", "CRE|" + (object)credit + "|" + (object)user.CharacterInfo.Credits));
                        }
                        else if (num > 85 && num <= 100)
                        {
                            user.CharacterInfo.AddCargo(5L, 40);
                            user.SendData(PacketComposer.Compose("A", "STD|You received 40 palladiums."));
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
