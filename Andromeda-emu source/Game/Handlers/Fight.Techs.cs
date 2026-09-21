using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Techs;
using System;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Handlers
{
    public static partial class Fight
    {
        private static bool[] ActiveTechFlags(Session session)
        {
            return new[] { false, session.CharacterInfo.EnergyLeechActive, false,
                session.CharacterInfo.RocketProbabilityMaximizerActive, false,
                session.CharacterInfo.BattleRepairTimer != null && session.CharacterInfo.BattleRepairCount > 0 };
        }

        public static void SendTechStatusIfChanged(Session session, bool force)
        {
            if (session == null || session.CharacterInfo == null) return;
            lock (TechInventoryService.SyncRoot(session.CharacterId))
            {
                string payload = TechRules.Payload(session.TechState.Records, session.TechState.Available,
                    ActiveTechFlags(session), UnixTimestamp.GetCurrent());
                if (!force && payload == session.TechState.LastStatus) return;
                session.TechState.LastStatus = payload;
                session.SendData(PacketComposer.Compose("TX",payload));
                double now = UnixTimestamp.GetCurrent();
                for (int id = 1; id <= 5; ++id)
                {
                    TechRecord record = session.TechState.Records[id];
                    if (record == null || (id == 3 && session.CharacterInfo.RocketProbabilityMaximizerActive)) continue;
                    int remaining = TechRules.Seconds(record.CooldownUntil,now);
                    if (remaining > 0) session.SendData(PacketComposer.Compose("A","CLD|"+TechRules.Codes[id]+"|"+remaining));
                }
            }
        }

        public static void RestorePersistentTechEffects(Session session)
        {
            // Called under the player lock, after a committed, authoritative read.
            var info = session.CharacterInfo;
            var records = session.TechState.Records;
            if (records[1] == null) return;
            double now = UnixTimestamp.GetCurrent();
            info.LastTechEla = records[1].CooldownUntil > 0 ? records[1].CooldownUntil-1800 : 0;
            info.LastTechEci = records[2].CooldownUntil > 0 ? records[2].CooldownUntil-60 : 0;
            info.LastTechSh = records[4].CooldownUntil > 0 ? records[4].CooldownUntil-45 : 0;
            info.LastTechHp = records[5].CooldownUntil > 0 ? records[5].CooldownUntil-45 : 0;
            for (int id = 1; id <= 5; ++id)
            {
                if (session.TechState.TimerUseIds[id] != records[id].ActiveUseId)
                {
                    // A newer authoritative use invalidates callbacks for the previous use.
                    if (id == 1 && info.EnergyLeechTimer != null) { info.EnergyLeechTimer.Dispose(); info.EnergyLeechTimer = null; }
                    if (id == 3 && info.RocketProbabilityMaximizerTimer != null) { info.RocketProbabilityMaximizerTimer.Dispose(); info.RocketProbabilityMaximizerTimer = null; }
                    if (id == 5 && info.BattleRepairTimer != null) { info.BattleRepairTimer.Dispose(); info.BattleRepairTimer = null; info.BattleRepairCount = 0; }
                }
                session.TechState.TimerUseIds[id] = records[id].ActiveUseId;
            }

            info.EnergyLeechUntil = records[1].ActiveUntil;
            if (records[1].ActiveUntil > now && info.EnergyLeechTimer == null)
            {
                info.EnergyLeechTimer = TechInventoryService.GuardedTimer(session,1,StopEnergyLeech,RemainingMilliseconds(records[1].ActiveUntil),Timeout.Infinite);
                session.SendData(PacketComposer.Compose("TX","A|0|ELA|"+session.CharacterId+"|"+TechRules.Seconds(records[1].ActiveUntil,now)));
            }
            else if (records[1].ActiveUntil <= now && info.EnergyLeechTimer != null) StopEnergyLeech(session);

            info.RocketProbabilityMaximizerUntil = records[3].ActiveUntil;
            info.RocketProbabilityMaximizerCooldownUntil = records[3].CooldownUntil;
            if (records[3].ActiveUntil > now && info.RocketProbabilityMaximizerTimer == null)
            {
                info.RocketProbabilityMaximizerTimer = TechInventoryService.GuardedTimer(session,3,StopRocketProbabilityMaximizer,RemainingMilliseconds(records[3].ActiveUntil),Timeout.Infinite);
                session.SendData(PacketComposer.Compose("TX","A|0|RPM|"+session.CharacterId+"|"+TechRules.Seconds(records[3].ActiveUntil,now)));
            }
            else if (records[3].ActiveUntil <= now && info.RocketProbabilityMaximizerTimer != null) StopRocketProbabilityMaximizer(session);
            // BRB is deliberately not replayed after disconnect/crash. Its cooldown persists.
        }

        private static int RemainingMilliseconds(double until)
        {
            return (int)Math.Min(int.MaxValue,Math.Max(1,Math.Ceiling((until-UnixTimestamp.GetCurrent())*1000)));
        }

        private static void Techs(Session session, ClientMessage message)
        {
            if (session == null || session.CharacterInfo == null) return;
            int id = message.GetNextInt(1);
            if (!TechRules.IsKnown(id)) return;
            lock (TechInventoryService.SyncRoot(session.CharacterId))
            {
                if (!TechInventoryService.IsCurrent(session) || session.TechState.TransitionDepth != 0 || !session.MapJoined || !session.MapAuthed
                    || session.CharacterInfo.Destroy || session.CharacterInfo.ShipHp <= 0) return;
                MapInstance map = MapManager.GetInstanceByMapId(session.CurrentMapId);
                if (map == null || session.CurrentMapId != session.CharacterInfo.MapId) return;
                var info = session.CharacterInfo;
                List<ChainImpulseTarget> chain = null;
                if (id == 1 && (info.EnergyLeechActive || info.CoolDownTechEla > 0)) return;
                if (id == 2)
                {
                    if (info.CoolDownTechEci > 0) return;
                    Session player = ResolveChainImpulsePrimaryPlayerTarget(session);
                    Npc npc = player == null ? ResolveChainImpulsePrimaryNpcTarget(session) : null;
                    if (player == null && npc == null) return;
                    chain = BuildChainImpulseTargets(session,map,player,npc);
                    if (chain.Count == 0) return;
                }
                if (id == 3 && (info.RocketProbabilityMaximizerActive || info.CoolDownTechRpm > 0)) return;
                if (id == 4 && (info.CoolDownTechSh > 0 || info.ShipShield >= info.ShipMaxShield)) return;
                if (id == 5 && (info.CoolDownTechHp > 0 || info.BattleRepairTimer != null || info.ShipHp >= info.ShipMaxHp)) return;
                int originalMap = session.CurrentMapId;
                string detail = "Validated map="+originalMap+"; runtime effect; no durable damage replay.";
                if (chain != null) detail += " Targets="+string.Join(",",chain.ConvertAll(target=>target.Id.ToString()).ToArray());
                string useId;
                if (!TechInventoryService.TryConsume(session,id,detail,out useId))
                {
                    SendTechStatus(session);
                    session.SendData(PacketComposer.Compose("A","STD|Tech unavailable: check stock and cooldown."));
                    return;
                }
                try
                {
                    // Defensive check for transitions outside the normal lifecycle entry points.
                    // A reservation that became unusable is reviewed, never blindly refunded.
                    if (!TechInventoryService.IsCurrent(session) || info.Destroy || info.ShipHp <= 0
                        || originalMap != session.CurrentMapId)
                    {
                        TechInventoryService.ResolveEvent(session,useId,false,"Lifecycle changed after commit; no effect granted.");
                        return;
                    }
                    switch (id)
                    {
                        case 1: ActivateEnergyLeech(session,map); break;
                        case 2: ActivateChainImpulse(session,map,chain); break;
                        case 3: ActivateRocketProbabilityMaximizer(session,map); break;
                        case 4: ApplyPurchasedShieldBackup(session,map); break;
                        case 5: ApplyPurchasedBattleRepair(session,map); break;
                    }
                    RestorePersistentTechEffects(session);
                    TechInventoryService.ResolveEvent(session,useId,true,id==5 ? "BRB timer started; individual pulses are not durable." : "Effect activation returned.");
                }
                catch (Exception error)
                {
                    TechInventoryService.ResolveEvent(session,useId,false,"Effect may be partially applied: "+error.GetType().Name);
                    LogTimerFailure("TechActivation",error);
                }
                finally { SendTechStatus(session); }
            }
        }

        private static void ApplyPurchasedShieldBackup(Session session, MapInstance map)
        {
            session.CharacterInfo.LastTechSh = session.TechState.Records[4].CooldownUntil-45;
            session.SendData(PacketComposer.Compose("A","CLD|SBU|45"));
            SendSessionScopedMessage(map,session,PacketComposer.Compose("TX","A|0|SBU|"+session.CharacterId+"|"+TECH_SHIELD_BACKUP_VISUAL_SECONDS));
            int healed = Math.Min(75000,Math.Max(0,session.CharacterInfo.ShipMaxShield-session.CharacterInfo.ShipShield));
            session.CharacterInfo.ShipShield += healed;
            var packet = PacketComposer.Compose("A","HL|1|"+session.CharacterId+"|SHD|"+session.CharacterInfo.ShipShield+"|"+healed);
            session.SendData(packet);
            foreach (MapActor actor in map.GetActorSnapshot())
            {
                if (actor.Type != MapActorType.UserCharacter) continue;
                Session observer = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (observer != null && observer.CharacterInfo != null && observer.CharacterInfo.SelectedPlayer == session.CharacterId) observer.SendData(packet);
            }
            InterruptDiminisherOnTarget(session,map);
        }

        private static void ApplyPurchasedBattleRepair(Session session, MapInstance map)
        {
            session.CharacterInfo.LastTechHp = session.TechState.Records[5].CooldownUntil-45;
            session.SendData(PacketComposer.Compose("A","CLD|BRB|45"));
            SendSessionScopedMessage(map,session,PacketComposer.Compose("TX","A|0|BRB|"+session.CharacterId+"|8"));
            session.CharacterInfo.BattleRepairCount = 8;
            session.CharacterInfo.BattleRepairTimer = TechInventoryService.GuardedTimer(session,5,BattleRepairTimer,0,1000);
        }
    }
}
