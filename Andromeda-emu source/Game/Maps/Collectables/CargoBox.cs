// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Maps.Collectables.CargoBox
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Quests;
using OrbitReborn_Emulator.Util;
using System;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Maps.Collectables
{
    internal class CargoBox : Collectable
    {
        private int m_iPrometium;
        private int m_iEndurium;
        private int m_iTerbium;
        private int m_iXenomit;
        private int m_iPalladium;
        private int m_iPrometid;
        private int m_iDuranium;
        private int m_iPromerium;
        private int m_iSeprom;

        private static long mSpawnSeqGen = 0;

        public long SpawnSequence { get; private set; }

        // CharacterId du joueur propriétaire du drop (sert à limiter le nombre de cargos affichés)
        public int OwnerCharacterId { get; set; }

        public int Prometium
        {
            get { return this.m_iPrometium; }
            set { this.m_iPrometium = value; }
        }

        public int Endurium
        {
            get { return this.m_iEndurium; }
            set { this.m_iEndurium = value; }
        }

        public int Terbium
        {
            get { return this.m_iTerbium; }
            set { this.m_iTerbium = value; }
        }

        public int Xenomit
        {
            get { return this.m_iXenomit; }
            set { this.m_iXenomit = value; }
        }

        public int Palladium
        {
            get { return this.m_iPalladium; }
            set { this.m_iPalladium = value; }
        }

        public int Prometid
        {
            get { return this.m_iPrometid; }
            set { this.m_iPrometid = value; }
        }

        public int Duranium
        {
            get { return this.m_iDuranium; }
            set { this.m_iDuranium = value; }
        }

        public int Promerium
        {
            get { return this.m_iPromerium; }
            set { this.m_iPromerium = value; }
        }

        public int Seprom
        {
            get { return this.m_iSeprom; }
            set { this.m_iSeprom = value; }
        }

        public CargoBox(int Id, int X, int Y, int MapId)
          : base(Id, 1, X, Y, MapId)
        {
            this.SpawnSequence = Interlocked.Increment(ref mSpawnSeqGen);
        }

        /// <summary>
        /// Retire jusqu'à maxToTake de la ressource contenue dans la box.
        /// </summary>
        private static int TakeFromBox(ref int boxAmount, int maxToTake)
        {
            if (boxAmount <= 0 || maxToTake <= 0)
                return 0;

            int taken = boxAmount <= maxToTake ? boxAmount : maxToTake;
            boxAmount -= taken;
            return taken;
        }

        /// <summary>
        /// Total (en unités cargo) des ressources qui comptent pour la soute.
        /// IMPORTANT: on garde la même logique que CharacterInfo.GetCurrentCargoTotal()
        /// (Xenomit n'est pas compté dans le total cargo actuel dans ce codebase).
        /// </summary>
        private long GetCargoUnitsInBox()
        {
            return (long)this.Prometium
                 + (long)this.Endurium
                 + (long)this.Terbium
                 + (long)this.Palladium
                 + (long)this.Prometid
                 + (long)this.Duranium
                 + (long)this.Promerium
                 + (long)this.Seprom;
        }

        private bool IsEmpty()
        {
            return this.Prometium <= 0
                && this.Endurium <= 0
                && this.Terbium <= 0
                && this.Palladium <= 0
                && this.Prometid <= 0
                && this.Duranium <= 0
                && this.Promerium <= 0
                && this.Seprom <= 0
                && this.Xenomit <= 0;
        }

        private static bool IsAutoRefinementEnabled(Session user)
        {
            return user != null
                && user.CharacterInfo != null
                && user.CharacterInfo.Settings != null
                && user.CharacterInfo.Settings.AutoRefinement == 1;
        }

        private static int GetCurrentFreeCargo(Session user, int maxCargo)
        {
            if (user == null || user.CharacterInfo == null)
                return 0;
            if (maxCargo <= 0)
                return int.MaxValue;

            int currentCargo = user.CharacterInfo.GetCurrentCargoTotal();
            int freeSpace = maxCargo - currentCargo;
            return freeSpace > 0 ? freeSpace : 0;
        }

        private static void ApplyCargoDelta(Session user, long resourceId, int before, int after)
        {
            if (user == null || user.CharacterInfo == null || before == after)
                return;

            int delta = after - before;
            if (delta > 0)
                user.CharacterInfo.AddCargo(resourceId, delta);
            else
                user.CharacterInfo.RemoveCargo(resourceId, -delta);
        }

        private static bool TryAutoRefineCargo(Session user)
        {
            if (user == null || user.CharacterInfo == null || user.CharacterInfo.LabInfos == null)
                return false;

            var lab = user.CharacterInfo.LabInfos;

            int startPrometium = lab.Prometium;
            int startEndurium = lab.Endurium;
            int startTerbium = lab.Terbium;
            int startXenomit = lab.Xenomit;
            int startPrometid = lab.Prometid;
            int startDuranium = lab.Duranium;
            int startPromerium = lab.Promerium;

            int prometium = startPrometium;
            int endurium = startEndurium;
            int terbium = startTerbium;
            int xenomit = startXenomit;
            int prometid = startPrometid;
            int duranium = startDuranium;
            int promerium = startPromerium;

            bool changed = false;

            while (true)
            {
                bool progressed = false;

                int makePromerium = Math.Min(Math.Min(prometid / 10, duranium / 10), xenomit);
                if (makePromerium > 0)
                {
                    prometid -= makePromerium * 10;
                    duranium -= makePromerium * 10;
                    xenomit -= makePromerium;
                    promerium += makePromerium;
                    changed = true;
                    progressed = true;
                }

                bool canMakePrometid = prometium >= 20 && endurium >= 10;
                bool canMakeDuranium = terbium >= 20 && endurium >= 10;

                if (!canMakePrometid && !canMakeDuranium)
                {
                    if (!progressed)
                        break;
                    continue;
                }

                if (canMakePrometid && canMakeDuranium)
                {
                    if (prometid <= duranium)
                    {
                        prometium -= 20;
                        endurium -= 10;
                        ++prometid;
                    }
                    else
                    {
                        terbium -= 20;
                        endurium -= 10;
                        ++duranium;
                    }

                    changed = true;
                    continue;
                }

                if (canMakePrometid)
                {
                    prometium -= 20;
                    endurium -= 10;
                    ++prometid;
                    changed = true;
                    continue;
                }

                if (canMakeDuranium)
                {
                    terbium -= 20;
                    endurium -= 10;
                    ++duranium;
                    changed = true;
                    continue;
                }
            }

            if (!changed)
                return false;

            ApplyCargoDelta(user, 1L, startPrometium, prometium);
            ApplyCargoDelta(user, 2L, startEndurium, endurium);
            ApplyCargoDelta(user, 3L, startTerbium, terbium);
            ApplyCargoDelta(user, 4L, startXenomit, xenomit);
            ApplyCargoDelta(user, 11L, startPrometid, prometid);
            ApplyCargoDelta(user, 12L, startDuranium, duranium);
            ApplyCargoDelta(user, 13L, startPromerium, promerium);

            return true;
        }

        private bool CollectLimitedCargoResources(Session user, ref int freeSpace)
        {
            if (user == null || user.CharacterInfo == null || freeSpace <= 0)
                return false;

            bool collectedAny = false;
            bool questProgressChanged = false;
            int got;

            got = TakeFromBox(ref this.m_iPrometium, freeSpace);
            if (got > 0)
            {
                user.CharacterInfo.AddCargo(1L, got);
                if (QuestOreProgress.AddOreProgress(user.CharacterInfo.Id, 1L, got))
                    questProgressChanged = true;
                user.SendData(PacketComposer.Compose("A", "STD|You received " + got + " Prometium."));
                freeSpace -= got;
                collectedAny = true;
            }

            got = TakeFromBox(ref this.m_iEndurium, freeSpace);
            if (got > 0)
            {
                user.CharacterInfo.AddCargo(2L, got);
                if (QuestOreProgress.AddOreProgress(user.CharacterInfo.Id, 2L, got))
                    questProgressChanged = true;
                user.SendData(PacketComposer.Compose("A", "STD|You received " + got + " Endurium."));
                freeSpace -= got;
                collectedAny = true;
            }

            got = TakeFromBox(ref this.m_iTerbium, freeSpace);
            if (got > 0)
            {
                user.CharacterInfo.AddCargo(3L, got);
                if (QuestOreProgress.AddOreProgress(user.CharacterInfo.Id, 3L, got))
                    questProgressChanged = true;
                user.SendData(PacketComposer.Compose("A", "STD|You received " + got + " Terbium."));
                freeSpace -= got;
                collectedAny = true;
            }

            got = TakeFromBox(ref this.m_iPalladium, freeSpace);
            if (got > 0)
            {
                user.CharacterInfo.AddCargo(5L, got);
                user.SendData(PacketComposer.Compose("A", "STD|You received " + got + " Palladium."));
                freeSpace -= got;
                collectedAny = true;
            }

            got = TakeFromBox(ref this.m_iPrometid, freeSpace);
            if (got > 0)
            {
                user.CharacterInfo.AddCargo(11L, got);
                user.SendData(PacketComposer.Compose("A", "STD|You received " + got + " Prometid."));
                freeSpace -= got;
                collectedAny = true;
            }

            got = TakeFromBox(ref this.m_iDuranium, freeSpace);
            if (got > 0)
            {
                user.CharacterInfo.AddCargo(12L, got);
                user.SendData(PacketComposer.Compose("A", "STD|You received " + got + " Duranium."));
                freeSpace -= got;
                collectedAny = true;
            }

            got = TakeFromBox(ref this.m_iPromerium, freeSpace);
            if (got > 0)
            {
                user.CharacterInfo.AddCargo(13L, got);
                user.SendData(PacketComposer.Compose("A", "STD|You received " + got + " Promerium."));
                freeSpace -= got;
                collectedAny = true;
            }

            got = TakeFromBox(ref this.m_iSeprom, freeSpace);
            if (got > 0)
            {
                user.CharacterInfo.AddCargo(14L, got);
                user.SendData(PacketComposer.Compose("A", "STD|You received " + got + " Seprom."));
                freeSpace -= got;
                collectedAny = true;
            }

            if (questProgressChanged)
                user.SendData(PacketComposer.Compose("QST", "UPD"));

            return collectedAny;
        }

        private bool CollectXenomit(Session user)
        {
            if (user == null || user.CharacterInfo == null)
                return false;

            int got = TakeFromBox(ref this.m_iXenomit, int.MaxValue);
            if (got <= 0)
                return false;

            user.CharacterInfo.AddCargo(4L, got);
            user.SendData(PacketComposer.Compose("A", "STD|You received " + got + " Xenomit."));
            return true;
        }


        public override void Collect(Session user)
        {
            if (this.Collecting)
            {
                user.SendData(PacketComposer.Compose("A", "STD|Box is already being collected!"));
                return;
            }

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(this.MapId);
            if (instanceByMapId == null || !instanceByMapId.Info.Collectables.ContainsKey(this.Id))
                return;

            if (GalaxyGateWaveService.IsGateMap(user.CharacterInfo.MapId) && this.OwnerCharacterId > 0 && user.CharacterId != this.OwnerCharacterId)
            {
                user.SendData(PacketComposer.Compose("A", "STD|You can't collect someone else's cargo box in Galaxy Gates."));
                return;
            }

            if (!DistanceUtil.IsWithinRangeSquared(this.X, this.Y, user.CharacterInfo.LocX, user.CharacterInfo.LocY, 300))
                return;

            int maxCargo = user.CharacterInfo.ShipMaxCargo;
            long cargoUnitsInBox = this.GetCargoUnitsInBox();
            bool autoRefinementEnabled = IsAutoRefinementEnabled(user);

            if (maxCargo > 0 && GetCurrentFreeCargo(user, maxCargo) <= 0 && cargoUnitsInBox > 0 && !autoRefinementEnabled)
            {
                user.SendData(PacketComposer.Compose("y", "BTB"));
                return;
            }

            this.Collecting = true;
            bool removed = false;
            bool changedCargo = false;

            try
            {
                if (autoRefinementEnabled && this.CollectXenomit(user))
                    changedCargo = true;

                if (autoRefinementEnabled && TryAutoRefineCargo(user))
                    changedCargo = true;

                while (true)
                {
                    int freeSpace = GetCurrentFreeCargo(user, maxCargo);
                    if (freeSpace <= 0)
                    {
                        if (autoRefinementEnabled && TryAutoRefineCargo(user))
                        {
                            changedCargo = true;
                            continue;
                        }
                        break;
                    }

                    bool collected = this.CollectLimitedCargoResources(user, ref freeSpace);
                    if (!collected)
                        break;

                    changedCargo = true;

                    if (autoRefinementEnabled && TryAutoRefineCargo(user))
                        changedCargo = true;
                }

                if (!autoRefinementEnabled && this.CollectXenomit(user))
                    changedCargo = true;

                if (!changedCargo && maxCargo > 0 && GetCurrentFreeCargo(user, maxCargo) <= 0 && this.GetCargoUnitsInBox() > 0)
                {
                    user.SendData(PacketComposer.Compose("y", "BTB"));
                    return;
                }

                if (changedCargo)
                    user.SendData(user.CharacterInfo.GetCargoMessage());

                if (this.IsEmpty())
                {
                    if (GalaxyGateWaveService.IsGateMap(user.CharacterInfo.MapId))
                        user.SendData(PacketComposer.Compose("2", string.Concat(this.Id)));
                    else
                        instanceByMapId.BroadcastMessage(PacketComposer.Compose("2", string.Concat(this.Id)), false);

                    instanceByMapId.Info.Collectables.Remove(this.Id);
                    removed = true;
                }
                else
                {
                    this.Collecting = false;
                }
            }
            finally
            {
                if (!removed)
                    this.Collecting = false;
            }
        }
    }
}


