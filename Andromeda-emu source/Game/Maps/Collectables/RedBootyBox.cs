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
    internal class RedBootyBox : Collectable
    {

        public RedBootyBox(int Id, int X, int Y, int MapId)
         : base(Id, 23, X, Y, MapId)
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
                        int num = random.Next(1, 100);
                        if (num >= 1 && num < 25)
                        {
                            int uridium = random.Next(3000, 5000);
                            user.CharacterInfo.AddReward(client, 0, uridium, 0, true);
                            user.SendData(PacketComposer.Compose("y", "URI|" + (object)uridium + "|" + (object)user.CharacterInfo.Uridium));
                        }
                        else if (num >= 25 && num < 35)
                        {
                            int npcPoints = random.Next(200, 300);
                            user.CharacterInfo.AddReward(client, 0, 0, npcPoints, true);
                            user.SendData(PacketComposer.Compose("A", "STD|You received " + (object)npcPoints + " NPC point(s)."));
                        }
                        else if (num >= 35 && num < 70)
                        {
                            if (random.Next(1, 4) <=2)
                            {
                                user.CharacterInfo.AddBoosterReward("spd", 1);
                                user.SendData(PacketComposer.Compose("A", "STD|You received SPD-Booster (1 hour)"));
                            }
                            else
                            {
                                user.CharacterInfo.AddBoosterReward("hp", 1);
                                user.SendData(PacketComposer.Compose("A", "STD|You received HP-Booster (1 hour)"));
                            }
                        }
                        else if (num >= 70 && num < 85)
                        {
                            user.CharacterInfo.AddBoosterReward("npcPoints", 2);
                            user.SendData(PacketComposer.Compose("A", "STD|You received NPC_POINTS-Booster (2 hours)"));
                        }
                        else if (num >= 85 && num < 100)
                        {
                            if (!user.CharacterInfo.ApisBuilt || !user.CharacterInfo.ZeusBuilt)
                            {
                                user.CharacterInfo.AddDronePart(2);
                                user.SendData(PacketComposer.Compose("A", "STD|You received 2 specials drone parts."));
                            }
                            else
                            {
                                int amount = random.Next(10, 15);
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
