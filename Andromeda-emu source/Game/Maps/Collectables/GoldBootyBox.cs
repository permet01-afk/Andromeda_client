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
    internal class GoldBootyBox : Collectable
    {

        public GoldBootyBox(int Id, int X, int Y, int MapId)
        : base(Id, 24, X, Y, MapId)
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
                        // Remove only the old ten-point-weight RP outcome.
                        // Other prize weights remain 5:5:25:20:20:15 out of 90.
                        int num = random.Next(1, 91);

                        if(num > 0 && num <=5)
                        {
                            user.CharacterInfo.AddTokens(client, 1);
                            user.SendData(PacketComposer.Compose("A", "STD|You received a token."));
                        }
                        else if(num > 5 && num <= 10)
                        {
                            user.CharacterInfo.AddTickets(client, 1);
                            user.SendData(PacketComposer.Compose("A", "STD|You received a lottery's ticket."));
                        }
                        else if (num > 10 && num <= 35)
                        {
                            int uridium = random.Next(5000, 7000);
                            user.CharacterInfo.AddReward(client, 0, uridium, 0, true);
                            user.SendData(PacketComposer.Compose("y", "URI|" + (object)uridium + "|" + (object)user.CharacterInfo.Uridium));
                        }
                        else if(num > 35 && num <= 55)
                        {
                            user.CharacterInfo.AddCargo(11L, 150);
                            user.CharacterInfo.AddCargo(12L, 150);
                            user.SendData(PacketComposer.Compose("A", "STD|You received 150 Prometids/Duraniums."));
                            user.SendData(user.CharacterInfo.GetCargoMessage());
                        }
                        else if(num > 55 && num <= 75)
                        {
                            user.CharacterInfo.AddBoosterReward("dmg", 1);
                            user.CharacterInfo.AddBoosterReward("shd", 1);
                            user.CharacterInfo.AddBoosterReward("hp", 1);
                            user.CharacterInfo.AddBoosterReward("spd", 1);
                            user.CharacterInfo.AddBoosterReward("npcPoints", 1);
                            user.SendData(PacketComposer.Compose("A", "STD|You received 1 hour of each boosters."));
                        }
                        else if (num > 75 && num <= 90)
                        {
                            if (!user.CharacterInfo.ApisBuilt || !user.CharacterInfo.ZeusBuilt)
                            {
                                user.CharacterInfo.AddDronePart(3);
                                user.SendData(PacketComposer.Compose("A", "STD|You received 3 specials drone parts."));
                            }
                            else
                            {
                                int amount = random.Next(30, 50);
                                user.CharacterInfo.AddLogfiles(amount);
                                user.SendData(PacketComposer.Compose("A", "STD|You received " + (object)amount + " logfiles."));
                            }
                        }
                    }
                    instanceByMapId.BroadcastMessage(PacketComposer.Compose("2", string.Concat((object)this.Id)), false);
                    instanceByMapId.Info.Collectables.Remove(this.Id);
                }
            }
        }

    }
}
