// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Maps.Collectables.LifeBox
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Generic;

namespace OrbitReborn_Emulator.Game.Maps.Collectables
{
    internal class LifeBox : Collectable
    {
        public LifeBox(int Id, int X, int Y, int MapId)
          : base(Id, 19, X, Y, MapId)
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
                if (instanceByMapId == null || !instanceByMapId.Info.Collectables.ContainsKey(this.Id))
                    return;
                if (!DistanceUtil.IsWithinRangeSquared(this.X, this.Y, user.CharacterInfo.LocX, user.CharacterInfo.LocY, 300))
                    return;
                else
                {
                    this.Collecting = true;
                    Random random = RandomProvider.Current;
                    int num2 = 15000 + random.Next(0, 10000);
                    if (user.CharacterInfo.ShipHp + num2 > user.CharacterInfo.ShipMaxHp)
                    {
                        num2 = user.CharacterInfo.ShipMaxHp - user.CharacterInfo.ShipHp;
                        user.CharacterInfo.ShipHp = user.CharacterInfo.ShipMaxHp;
                    }
                    else
                        user.CharacterInfo.ShipHp = user.CharacterInfo.ShipHp + num2;
                    user.SendData(PacketComposer.Compose("A", "HL|1|" + (object)user.CharacterInfo.Id + "|HPT|" + (object)user.CharacterInfo.ShipHp + "|" + (object)num2));
                    foreach (MapActor key in (IEnumerable<MapActor>)instanceByMapId.Actors.Keys)
                    {
                        if (key.Type == MapActorType.UserCharacter)
                        {
                            Session sessionById = SessionManager.GetSessionById(key.ReferenceSessionId);
                            if (sessionById != null && sessionById.CharacterInfo != null && sessionById.CharacterInfo.SelectedPlayer == user.CharacterId)
                                sessionById.SendData(PacketComposer.Compose("A", "HL|1|" + (object)user.CharacterInfo.Id + "|HPT|" + (object)user.CharacterInfo.ShipHp + "|" + (object)num2));
                        }
                    }
                    instanceByMapId.BroadcastMessage(PacketComposer.Compose("2", string.Concat((object)this.Id)), false);
                    this.MoveToRandomPosition(random);
                    this.Collecting = false;
                    instanceByMapId.BroadcastMessage(PacketComposer.Compose("c", this.Id.ToString() + "|" + (object)this.Type + "|" + (object)this.X + "|" + (object)this.Y), 0 != 0);
                }
            }
        }
    }
}
