// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Maps.Collectables.BootyBox
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;

namespace OrbitReborn_Emulator.Game.Maps.Collectables
{
    internal class BootyBox : Collectable
    {
        public BootyBox(int Id, int X, int Y, int MapId)
          : base(Id, 21, X, Y, MapId)
        {
        }

        private static void AddInventoryItem(SqlDatabaseClient client, int playerId, int itemId)
        {
            client.ClearParameters();
            client.SetParameter("pid", (object)playerId);
            client.SetParameter("iid", (object)itemId);
            client.ExecuteNonQuery("INSERT INTO player_inventory (player_id, item_id, qty) VALUES (@pid, @iid, 1) ON DUPLICATE KEY UPDATE qty = qty + 1");
        }

        public override void Collect(Session user)
        {
            if (this.Collecting)
            {
                user.SendData(PacketComposer.Compose("A", "STD|Box is already being collected!"));
            }
            else
            {
                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(this.MapId);
                if (instanceByMapId == null || !instanceByMapId.Info.Collectables.ContainsKey(this.Id) || !DistanceUtil.IsWithinRangeSquared(this.X, this.Y, user.CharacterInfo.LocX, user.CharacterInfo.LocY, 300))
                    return;
                if (user.CharacterInfo.BootyKeys <= 0)
                {
                    user.SendData(PacketComposer.Compose("A", "STD|You don't have any Booty Keys."));
                }
                else
                {
                    // Keep the key requirement logic
                    user.CharacterInfo.RemoveBootyKey(1);
                    user.SendData(PacketComposer.Compose("A", "BK|" + (object)user.CharacterInfo.BootyKeys));
                    this.Collecting = true;

                    Random random = RandomProvider.Current;

                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                        int roll = random.Next(1, 101); // 1..100 inclusive

                        // 31% : 2000 munitions UCB-100
                        if (roll <= 31)
                        {
                            client.ClearParameters();
                            client.SetParameter("id", (object)user.CharacterInfo.Id);
                            client.ExecuteNonQuery("UPDATE users SET ammo_ucb100 = ammo_ucb100 + 2000 WHERE id = @id LIMIT 1");

                            user.CharacterInfo.AmmoUcb100 += 2000;
                            user.SendData(PacketComposer.Compose("B", user.CharacterInfo.GetPrimaryWeaponInfoPayload()));
                            user.SendData(PacketComposer.Compose("A", "STD|You received 2000 UCB-100."));
                        }
                        // 15% : 20 Logfiles
                        else if (roll <= 46)
                        {
                            client.ClearParameters();
                            client.SetParameter("id", (object)user.CharacterInfo.Id);
                            client.ExecuteNonQuery("UPDATE users SET logfiles = logfiles + 20 WHERE id = @id LIMIT 1");

                            user.SendData(PacketComposer.Compose("A", "STD|You received 20 logfiles."));
                        }
                        // 9% : 1 Booster de 2h (Damage / HP / Shield)
                        else if (roll <= 55)
                        {
                            int b = random.Next(0, 3);
                            if (b == 0)
                            {
                                user.CharacterInfo.AddBoosterReward("dmg", 2);
                                user.SendData(PacketComposer.Compose("A", "STD|You received a 2-hour Damage Booster."));
                            }
                            else if (b == 1)
                            {
                                user.CharacterInfo.AddBoosterReward("hp", 2);
                                user.SendData(PacketComposer.Compose("A", "STD|You received a 2-hour HP Booster."));
                            }
                            else
                            {
                                user.CharacterInfo.AddBoosterReward("shd", 2);
                                user.SendData(PacketComposer.Compose("A", "STD|You received a 2-hour Shield Booster."));
                            }
                        }
                        // 8% : 15 munitions SMB-01
                        else if (roll <= 63)
                        {
                            client.ClearParameters();
                            client.SetParameter("id", (object)user.CharacterInfo.Id);
                            client.ExecuteNonQuery("UPDATE users SET ammo_smb01 = ammo_smb01 + 15 WHERE id = @id LIMIT 1");

                            user.CharacterInfo.AmmoSmb01 += 15;
                            user.SendData(PacketComposer.Compose("3", user.CharacterInfo.GetSecondaryWeaponInfoPayload()));
                            user.SendData(PacketComposer.Compose("A", "STD|You received 15 SMB-01."));
                        }
                        // 8% : 15 munitions ISH-01
                        else if (roll <= 71)
                        {
                            client.ClearParameters();
                            client.SetParameter("id", (object)user.CharacterInfo.Id);
                            client.ExecuteNonQuery("UPDATE users SET ammo_ish01 = ammo_ish01 + 15 WHERE id = @id LIMIT 1");

                            user.CharacterInfo.AmmoIsh01 += 15;
                            user.SendData(PacketComposer.Compose("3", user.CharacterInfo.GetSecondaryWeaponInfoPayload()));
                            user.SendData(PacketComposer.Compose("A", "STD|You received 15 ISH-01."));
                        }
                        // 8% : 15 munitions EMP-01
                        else if (roll <= 79)
                        {
                            client.ClearParameters();
                            client.SetParameter("id", (object)user.CharacterInfo.Id);
                            client.ExecuteNonQuery("UPDATE users SET ammo_emp01 = ammo_emp01 + 15 WHERE id = @id LIMIT 1");

                            user.CharacterInfo.AmmoEmp01 += 15;
                            user.SendData(PacketComposer.Compose("3", user.CharacterInfo.GetSecondaryWeaponInfoPayload()));
                            user.SendData(PacketComposer.Compose("A", "STD|You received 15 EMP-01."));
                        }
                        // 7% : 1 Arme LF-3 (item_id = 1) -> player_inventory
                        else if (roll <= 86)
                        {
                            int itemId = 1;

                            AddInventoryItem(client, user.CharacterInfo.Id, itemId);

                            user.SendData(PacketComposer.Compose("A", "STD|You received 1x LF-3 Laser (added to your inventory)."));
                        }
                        // 7% : 1 Bouclier SG3N-B02 (item_id = 2) -> player_inventory
                        else if (roll <= 93)
                        {
                            int itemId = 2;

                            AddInventoryItem(client, user.CharacterInfo.Id, itemId);

                            user.SendData(PacketComposer.Compose("A", "STD|You received 1x SG3N-B02 Shield (added to your inventory)."));
                        }
                        // 7% : 1 Générateur G3N-7900 (item_id = 4) -> player_inventory
                        else
                        {
                            int itemId = 4;

                            AddInventoryItem(client, user.CharacterInfo.Id, itemId);

                            user.SendData(PacketComposer.Compose("A", "STD|You received 1x G3N-7900 Speed Generator (added to your inventory)."));
                        }
                    }

                    instanceByMapId.BroadcastMessage(PacketComposer.Compose("2", string.Concat((object)this.Id)), false);
                    instanceByMapId.Info.Collectables.Remove(this.Id);
                }
            }
        }
    }
}


