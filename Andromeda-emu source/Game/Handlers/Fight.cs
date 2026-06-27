using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Maps.Collectables;
using OrbitReborn_Emulator.Game.Misc;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Titles;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace OrbitReborn_Emulator.Game.Handlers
{
    public static class Fight
    {
        private const double RANGE_LASER = 700.0;
        private const double RANGE_ROCKET = 750.0;
        private const int DIMINISHER_SELF_SHIELD_LOSS_PERCENT = 30;
        private const int TECH_ENERGY_LEECH_LIFESTEAL_PERCENT = 10;
        private const int TECH_ENERGY_LEECH_DURATION_SECONDS = 900;
        private const int TECH_ENERGY_LEECH_COOLDOWN_SECONDS = 1800;
        private const int TECH_CHAIN_IMPULSE_DAMAGE = 10000;
        private const int TECH_CHAIN_IMPULSE_COOLDOWN_SECONDS = 60;
        private const int TECH_CHAIN_IMPULSE_MAX_TARGETS = 7;
        private const int TECH_CHAIN_IMPULSE_RADIUS = 700;
        private const int TECH_ROCKET_PROBABILITY_MAXIMIZER_DURATION_SECONDS = 600;
        private const int TECH_ROCKET_PROBABILITY_MAXIMIZER_COOLDOWN_SECONDS = 360;
        private const int TECH_SHIELD_BACKUP_VISUAL_SECONDS = 5;
        private const int VENOM_TOTAL_PULSES = 36;
        private const int VENOM_INITIAL_DAMAGE = 1500;
        private const int VENOM_DAMAGE_STEP = 200;
        private const int VENOM_MAX_DAMAGE = 8500;
        private const int ROCKET_LAUNCHER_RELOAD_STEP_MS = 1000;
        private const int ROCKET_LAUNCHER_EFFECT_DELAY_MIN_MS = 750;
        private const int ROCKET_LAUNCHER_EFFECT_DELAY_MAX_MS = 2000;
        private const int RSB_COOLDOWN_MS = 3000;
        private const int LASER_BASE_ACCURACY_PERCENT = 85;
        private const int ROCKET_BASE_ACCURACY_PERCENT = 75;
        private const int HIT_CHANCE_MIN_PERCENT = 50;
        private const int HIT_CHANCE_MAX_PERCENT = 100;
        private const int FACTICE_LASER_MIN_REMAINING_WAIT_MS = 250;
        private const int FACTICE_LASER_VISUAL_THROTTLE_MS = 250;
        private static readonly Dictionary<int, RocketLauncherRuntimeState> RocketLauncherStates = new Dictionary<int, RocketLauncherRuntimeState>();
        private static readonly object RocketLauncherStatesSync = new object();
        private static readonly CDictionnary<int, byte> KillInProgress = new CDictionnary<int, byte>();
        private static readonly Dictionary<int, double> FacticeLaserVisualTimes = new Dictionary<int, double>();
        private static readonly object FacticeLaserVisualTimesSync = new object();

        private static void LogTimerFailure(string callbackName, Exception ex)
        {
            Output.WriteLine((object)("[FightTimer] " + callbackName + " failed: " + ex.ToString()), OutputLevel.CriticalError);
        }

        private static bool IsSessionInGalaxyGate(Session session)
        {
            return session != null && session.CharacterInfo != null && GalaxyGateWaveService.IsGateMap(session.CharacterInfo.MapId);
        }

        public static bool CanSessionAttackNpc(Session session, Npc npc)
        {
            if (session == null || session.CharacterInfo == null || npc == null) return false;
            return GalaxyGateWaveService.CanSessionInteractWithNpc(session, npc);
        }

        public static void SendNpcScopedMessage(MapInstance instance, Npc npc, ServerMessage message, Session fallbackOwner = null)
        {
            if (message == null) return;
            if (npc != null && GalaxyGateWaveService.IsGateMap(npc.MapId))
            {
                Session ownerSession = GalaxyGateWaveService.GetNpcOwnerSession(npc);
                if (ownerSession == null && fallbackOwner != null && GalaxyGateWaveService.CanSessionInteractWithNpc(fallbackOwner, npc))
                    ownerSession = fallbackOwner;

                if (ownerSession != null)
                    ownerSession.SendData(message);
                return;
            }

            SendMapScopedMessage(instance, message, delegate (Session observer)
            {
                return ShouldReceiveNpcScopedMessage(observer, npc, fallbackOwner);
            });
        }

        private static void SendMapScopedMessage(MapInstance instance, ServerMessage message, Predicate<Session> shouldReceive)
        {
            if (instance == null || message == null || shouldReceive == null)
                return;

            byte[] data = message.ToDeltas();
            HashSet<int> sentSessionIds = new HashSet<int>();

            foreach (MapActor actor in instance.GetUserActorSnapshot())
            {
                if (actor == null || actor.Type != MapActorType.UserCharacter || actor.ReferenceSessionId <= 0)
                    continue;

                if (!sentSessionIds.Add(actor.ReferenceSessionId))
                    continue;

                Session observer = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (observer == null || observer.CharacterInfo == null)
                    continue;

                if (shouldReceive(observer))
                    observer.SendData(data);
            }
        }

        private static bool IsCombatObserverOverride(Session observer)
        {
            return observer != null
                && observer.CharacterInfo != null
                && (observer.CharacterInfo.IsAdmin || observer.CharacterInfo.MapId == 83 || _1v1.IsOnMap(observer.CharacterInfo.MapId));
        }

        private static bool PlayersCanSeeEachOther(Session observer, Session source)
        {
            if (observer == null || observer.CharacterInfo == null || source == null || source.CharacterInfo == null)
                return false;

            if (observer.CurrentMapId != source.CurrentMapId)
                return false;

            if (observer.CharacterId == source.CharacterId)
                return true;

            if (observer.CharacterInfo.PlayerInRange.Contains(source.CharacterId))
                return true;

            if (source.CharacterInfo.PlayerInRange.Contains(observer.CharacterId))
                return true;

            return false;
        }

        private static bool ShouldReceiveSessionScopedMessage(Session observer, Session source)
        {
            if (observer == null || observer.CharacterInfo == null || source == null || source.CharacterInfo == null)
                return false;

            if (IsCombatObserverOverride(observer))
                return true;

            return PlayersCanSeeEachOther(observer, source);
        }

        private static bool ShouldReceiveNpcScopedMessage(Session observer, Npc npc, Session fallbackOwner)
        {
            if (observer == null || observer.CharacterInfo == null)
                return false;

            if (fallbackOwner != null && observer.CharacterId == fallbackOwner.CharacterId)
                return true;

            if (IsCombatObserverOverride(observer))
                return true;

            if (npc != null && observer.CurrentMapId == npc.MapId && observer.CharacterInfo.NpcInRange.Contains(npc.Id))
                return true;

            if (fallbackOwner != null && PlayersCanSeeEachOther(observer, fallbackOwner))
                return true;

            return false;
        }

        private static bool ShouldReceivePlayerScopedCombatMessage(Session observer, Session attacker, Session target)
        {
            if (observer == null || observer.CharacterInfo == null)
                return false;

            if ((attacker != null && observer.CharacterId == attacker.CharacterId)
                || (target != null && observer.CharacterId == target.CharacterId))
                return true;

            if (IsCombatObserverOverride(observer))
                return true;

            if (attacker != null && PlayersCanSeeEachOther(observer, attacker))
                return true;

            if (target != null && PlayersCanSeeEachOther(observer, target))
                return true;

            return false;
        }

        private static bool ShouldReceiveShipSkillScopedMessage(Session observer, Session source, IList<int> targetIds)
        {
            if (ShouldReceiveSessionScopedMessage(observer, source))
                return true;

            if (observer == null || observer.CharacterInfo == null || targetIds == null)
                return false;

            for (int index = 0; index < targetIds.Count; ++index)
            {
                int targetId = targetIds[index];
                if (targetId <= 0)
                    continue;

                if (observer.CharacterId == targetId)
                    return true;

                if (observer.CharacterInfo.PlayerInRange.Contains(targetId))
                    return true;

                if (observer.CharacterInfo.NpcInRange.Contains(targetId))
                    return true;
            }

            return false;
        }

        public static void SendNpcDamageUpdate(MapInstance instance, Session attacker, Npc npc, int appliedDamage)
        {
            if (npc == null) return;
            ServerMessage damageMessage = PacketComposer.Compose("Y", "0|" + npc.Id + "|L|" + npc.ShipHp + "|" + npc.ShipShield + "|" + appliedDamage);

            if (GalaxyGateWaveService.IsGateMap(npc.MapId))
            {
                Session ownerSession = GalaxyGateWaveService.GetNpcOwnerSession(npc);
                if (ownerSession == null && attacker != null && GalaxyGateWaveService.CanSessionInteractWithNpc(attacker, npc))
                    ownerSession = attacker;
                if (ownerSession != null)
                    ownerSession.SendData(damageMessage);
                return;
            }

            if (instance == null) return;
            foreach (MapActor key in instance.GetUserActorSnapshot())
            {
                if (key == null || key.Type != MapActorType.UserCharacter)
                    continue;
                Session actorSession = SessionManager.GetSessionById(key.ReferenceSessionId);
                if (actorSession != null && actorSession.CharacterInfo != null && actorSession.CharacterInfo.SelectedPlayer == npc.Id)
                    actorSession.SendData(damageMessage);
            }
        }

        private static void SendPlayerScopedCombatMessage(MapInstance instance, Session attacker, Session target, ServerMessage message)
        {
            if (message == null) return;
            if (IsSessionInGalaxyGate(attacker) || IsSessionInGalaxyGate(target))
                return;

            SendMapScopedMessage(instance, message, delegate (Session observer)
            {
                return ShouldReceivePlayerScopedCombatMessage(observer, attacker, target);
            });
        }


        private static void SendSessionScopedMessage(MapInstance instance, Session session, ServerMessage message)
        {
            if (message == null || session == null) return;
            if (IsSessionInGalaxyGate(session))
            {
                session.SendData(message);
                return;
            }

            SendMapScopedMessage(instance, message, delegate (Session observer)
            {
                return ShouldReceiveSessionScopedMessage(observer, session);
            });
        }

        private static void SendSessionScopedMessageForOtherOnly(MapInstance instance, Session session, ServerMessage message)
        {
            if (message == null || session == null) return;
            if (IsSessionInGalaxyGate(session))
                return;

            SendMapScopedMessage(instance, message, delegate (Session observer)
            {
                return observer != null
                    && observer.CharacterId != session.CharacterId
                    && ShouldReceiveSessionScopedMessage(observer, session);
            });
        }

        private static int ClampHitChancePercent(int value)
        {
            if (value < HIT_CHANCE_MIN_PERCENT)
                return HIT_CHANCE_MIN_PERCENT;
            if (value > HIT_CHANCE_MAX_PERCENT)
                return HIT_CHANCE_MAX_PERCENT;
            return value;
        }

        public static int CalculateLaserHitChancePercent(int attackerAccuracyBonus, int targetEvasionBonus)
        {
            return ClampHitChancePercent(LASER_BASE_ACCURACY_PERCENT + attackerAccuracyBonus - targetEvasionBonus);
        }

        public static int CalculateRocketHitChancePercent(int attackerAccuracyBonus, int targetEvasionBonus, int rocketId)
        {
            if (!IsNormalDirectDamageRocket(rocketId))
                return HIT_CHANCE_MAX_PERCENT;
            return ClampHitChancePercent(ROCKET_BASE_ACCURACY_PERCENT + attackerAccuracyBonus - targetEvasionBonus);
        }

        public static bool RollHitChance(int hitChancePercent, Random rng)
        {
            int chance = ClampHitChancePercent(hitChancePercent);
            if (chance >= HIT_CHANCE_MAX_PERCENT)
                return true;
            Random random = rng ?? new Random();
            return random.Next(0, 100) < chance;
        }

        private static bool IsNormalDirectDamageRocket(int rocketId)
        {
            return rocketId >= 1 && rocketId <= 4;
        }

        private static bool IsPrecisionTargeterRocket(int rocketId)
        {
            return rocketId == 1 || rocketId == 2 || rocketId == 3;
        }

        private static bool IsPrecisionTargeterRocketGuided(Session session, int rocketId)
        {
            return IsPrecisionTargeterRocket(rocketId)
                && session != null
                && session.CharacterInfo != null
                && session.CharacterInfo.RocketProbabilityMaximizerActive;
        }

        private static int ResolveRocketSmokePattern(Session session, int rocketId)
        {
            if (session != null && session.CharacterInfo != null && session.CharacterInfo.RocketFusionMax && IsNormalDirectDamageRocket(rocketId))
                return 1;
            return session != null && session.CharacterInfo != null ? session.CharacterInfo.RocketPattern : 0;
        }

        private static int GetPilotBioEvasionBonus(Session target)
        {
            return target != null && target.CharacterInfo != null ? target.CharacterInfo.PilotBioEvasionBonus : 0;
        }

        private static bool RollPlayerLaserHit(Session attacker, Session target)
        {
            int attackerBonus = attacker != null && attacker.CharacterInfo != null ? attacker.CharacterInfo.PilotBioLaserAccuracyBonus : 0;
            int hitChance = CalculateLaserHitChancePercent(attackerBonus, GetPilotBioEvasionBonus(target));
            Random rng = attacker != null && attacker.CharacterInfo != null ? attacker.CharacterInfo.RandomDamage : null;
            return RollHitChance(hitChance, rng);
        }

        private static bool RollPlayerRocketHit(Session attacker, Session target, int rocketId)
        {
            int attackerBonus = attacker != null && attacker.CharacterInfo != null ? attacker.CharacterInfo.PilotBioRocketAccuracyBonus : 0;
            int hitChance = CalculateRocketHitChancePercent(attackerBonus, GetPilotBioEvasionBonus(target), rocketId);
            Random rng = attacker != null && attacker.CharacterInfo != null ? attacker.CharacterInfo.RandomDamage : null;
            return RollHitChance(hitChance, rng);
        }

        private static ServerMessage ComposeMissAgainstTarget(int targetId)
        {
            return PacketComposer.Compose("M", "L|" + (object)targetId + "|0");
        }

        private static ServerMessage ComposeMissOnHero()
        {
            return PacketComposer.Compose("Z", "L|0");
        }

        private static void SendMissToNpcTarget(MapInstance instance, Session attacker, Npc target)
        {
            if (target == null)
                return;
            SendNpcScopedMessage(instance, target, ComposeMissAgainstTarget(target.Id), attacker);
        }

        private static void SendMissToPlayerTarget(MapInstance instance, Session attacker, Session target)
        {
            if (target == null || target.CharacterInfo == null)
                return;

            target.SendData(ComposeMissOnHero());

            if (instance == null || IsSessionInGalaxyGate(attacker) || IsSessionInGalaxyGate(target))
                return;

            ServerMessage observerMessage = ComposeMissAgainstTarget(target.CharacterId);
            byte[] data = observerMessage.ToDeltas();
            HashSet<int> sentSessionIds = new HashSet<int>();

            foreach (MapActor actor in instance.GetUserActorSnapshot())
            {
                if (actor == null || actor.Type != MapActorType.UserCharacter || actor.ReferenceSessionId <= 0)
                    continue;

                if (!sentSessionIds.Add(actor.ReferenceSessionId))
                    continue;

                Session observer = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (observer == null || observer.CharacterInfo == null || observer.CharacterId == target.CharacterId)
                    continue;

                if (ShouldReceivePlayerScopedCombatMessage(observer, attacker, target))
                    observer.SendData(data);
            }
        }

        public static void SendNpcLaserMiss(MapInstance instance, Npc attackerNpc, Session target)
        {
            if (target == null || target.CharacterInfo == null)
                return;

            target.SendData(ComposeMissOnHero());

            if (instance == null || GalaxyGateWaveService.IsGateMap(target.CurrentMapId))
                return;

            ServerMessage observerMessage = ComposeMissAgainstTarget(target.CharacterId);
            byte[] data = observerMessage.ToDeltas();
            HashSet<int> sentSessionIds = new HashSet<int>();

            foreach (MapActor actor in instance.GetUserActorSnapshot())
            {
                if (actor == null || actor.Type != MapActorType.UserCharacter || actor.ReferenceSessionId <= 0)
                    continue;

                if (!sentSessionIds.Add(actor.ReferenceSessionId))
                    continue;

                Session observer = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (observer == null || observer.CharacterInfo == null || observer.CharacterId == target.CharacterId)
                    continue;

                if (ShouldReceiveNpcScopedMessage(observer, attackerNpc, target))
                    observer.SendData(data);
            }
        }

        private static void SendNpcTargetOwnershipVisual(Session session, Npc npc)
        {
            if (session == null || session.CharacterInfo == null || npc == null)
                return;

            npc.RefreshOwnerClaimState();
            int ownerId = npc.RewardOwnerId;

            if (ownerId > 0 && ownerId != session.CharacterId)
                session.SendData(PacketComposer.Compose("n", "LSH|" + npc.Id + "|" + ownerId));
            else
                session.SendData(PacketComposer.Compose("n", "USH|" + npc.Id));
        }

        private static void SendPlayerTargetOwnershipVisual(Session session, Session targetSession)
        {
            if (session == null || session.CharacterInfo == null || targetSession == null || targetSession.CharacterInfo == null)
                return;

            var targetInfo = targetSession.CharacterInfo;

            if (targetInfo.Attacker != null &&
                (targetInfo.Attacker.CharacterInfo == null ||
                 UnixTimestamp.GetCurrent() - targetInfo.LastAttackByAttackerReceived >= 10.0))
            {
                targetInfo.Attacker = null;
                targetInfo.Attacked.Clear();
            }

            if (targetInfo.Attacker != null && targetInfo.Attacker.CharacterId != session.CharacterId)
                session.SendData(PacketComposer.Compose("n", "LSH|" + targetSession.CharacterId + "|" + targetInfo.Attacker.CharacterId));
            else
                session.SendData(PacketComposer.Compose("n", "USH|" + targetSession.CharacterId));
        }


        public static void Initialize()
        {
            DataRouter.RegisterHandler("SES", new ProcessRequestCallback(Fight.SelectPlayer), false);
            DataRouter.RegisterHandler("SEL", new ProcessRequestCallback(Fight.SelectPlayerDecoy), false);
            DataRouter.RegisterHandler("u", new ProcessRequestCallback(Fight.SelectAmmo), false);
            DataRouter.RegisterHandler("G", new ProcessRequestCallback(Fight.StopLaserAttack), false);
            DataRouter.RegisterHandler("a", new ProcessRequestCallback(Fight.LaserAttack), true);
            DataRouter.RegisterHandler("v", new ProcessRequestCallback(Fight.RocketAttack), false);
            DataRouter.RegisterHandler("d", new ProcessRequestCallback(Fight.SelectRocket), false);
            DataRouter.RegisterHandler("RL", new ProcessRequestCallback(Fight.RocketLauncher), false);
            DataRouter.RegisterHandler("TX", new ProcessRequestCallback(Fight.Techs), false);
            DataRouter.RegisterHandler("SD", new ProcessRequestCallback(Fight.SkillDesigns), false);
        }

        private sealed class ShipSkillTimerContext
        {
            public int SourceId;
            public int SkillType;
            public int[] TargetIds;
        }

        private sealed class ChainImpulseTarget
        {
            public int Id;
            public bool IsNpc;
            public double Distance;
        }

        private sealed class RocketLauncherRuntimeState
        {
            public int CharacterId;
            public int ActiveConfig;
            public int LauncherType;
            public int SelectedRocketId = 7;
            public int LoadedCount;
            public bool AutoCpuEnabled;
            public bool InitializedFromCharacter;
            public System.Threading.Timer ReloadTimer;
            public readonly object SyncRoot = new object();
        }

        private sealed class RocketLauncherAttackContext
        {
            public Session Attacker;
            public int MapId;
            public int TargetId;
            public bool TargetIsNpc;
            public int TargetSpawnSeq;
            public int RocketId;
            public int Damage;
            public System.Threading.Timer Timer;
        }

        private sealed class RocketAttackContext
        {
            public Session Attacker;
            public int MapId;
            public int TargetId;
            public bool TargetIsNpc;
            public int TargetSpawnSeq;
            public int RocketId;
            public System.Threading.Timer Timer;
        }

        private static bool IsLauncherRocketId(int rocketId)
        {
            return rocketId == 7 || rocketId == 8 || rocketId == 9;
        }

        private static int NormalizeLauncherRocketId(int rocketId)
        {
            return IsLauncherRocketId(rocketId) ? rocketId : 7;
        }

        private static int GetRocketLauncherCapacity(int launcherType)
        {
            if (launcherType == 2)
                return 5;
            if (launcherType == 1)
                return 3;
            return 0;
        }

        private static RocketLauncherRuntimeState GetRocketLauncherState(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return null;

            RocketLauncherRuntimeState state;
            lock (RocketLauncherStatesSync)
            {
                if (!RocketLauncherStates.TryGetValue(session.CharacterId, out state))
                {
                    state = new RocketLauncherRuntimeState();
                    state.CharacterId = session.CharacterId;
                    RocketLauncherStates[session.CharacterId] = state;
                }
            }

            lock (state.SyncRoot)
            {
                Fight.RefreshRocketLauncherState(session, state);
            }

            return state;
        }

        private static void RefreshRocketLauncherState(Session session, RocketLauncherRuntimeState state)
        {
            if (session == null || session.CharacterInfo == null || state == null)
                return;

            if (!state.InitializedFromCharacter)
            {
                state.SelectedRocketId = NormalizeLauncherRocketId(session.CharacterInfo.SelectedLauncherRocket);
                state.AutoCpuEnabled = session.CharacterInfo.AutoRocketLauncherSkill == 1;
                state.InitializedFromCharacter = true;
            }

            state.SelectedRocketId = NormalizeLauncherRocketId(state.SelectedRocketId);

            int activeConfig = session.CharacterInfo.ActiveConfig;
            if (activeConfig != 1 && activeConfig != 2)
                activeConfig = 1;

            int equippedLauncherType = session.CharacterInfo.EquippedRocketLauncherType;
            if (equippedLauncherType != 1 && equippedLauncherType != 2)
                equippedLauncherType = 0;

            bool configChanged = state.ActiveConfig != 0 && state.ActiveConfig != activeConfig;
            bool launcherChanged = state.LauncherType != equippedLauncherType;
            if (launcherChanged)
            {
                state.LoadedCount = 0;
                StopRocketLauncherReloadTimer(state);
            }

            state.ActiveConfig = activeConfig;
            state.LauncherType = equippedLauncherType;

            if (!session.CharacterInfo.HasRocketLauncherCpu)
                state.AutoCpuEnabled = false;

            int capacity = GetRocketLauncherCapacity(state.LauncherType);
            if (capacity <= 0)
            {
                state.LoadedCount = 0;
                state.AutoCpuEnabled = false;
                StopRocketLauncherReloadTimer(state);
                return;
            }

            if (session.CharacterInfo.AutoRocketLauncherSkill == 1)
                state.AutoCpuEnabled = true;

            if (state.LoadedCount < 0)
                state.LoadedCount = 0;
            if (state.LoadedCount > capacity)
                state.LoadedCount = capacity;
        }

        private static void StopRocketLauncherReloadTimer(RocketLauncherRuntimeState state)
        {
            if (state == null)
                return;

            try
            {
                if (state.ReloadTimer != null)
                {
                    state.ReloadTimer.Dispose();
                    state.ReloadTimer = null;
                }
            }
            catch
            {
            }
        }

        public static void SendRocketLauncherProtocolState(Session session, bool includeCpuState = true)
        {
            SendRocketLauncherStatus(session);
            SendRocketLauncherAmmo(session);
            if (includeCpuState)
                SendRocketLauncherAutoCpuState(session);

            MaybeStartRocketLauncherAutoReload(session);
        }

        private static void MaybeStartRocketLauncherAutoReload(Session session)
        {
            if (session == null || session.CharacterInfo == null || !session.Authenticated)
                return;

            RocketLauncherRuntimeState state = GetRocketLauncherState(session);
            if (state == null)
                return;

            bool shouldStart = false;
            lock (state.SyncRoot)
            {
                RefreshRocketLauncherState(session, state);
                int capacity = GetRocketLauncherCapacity(state.LauncherType);
                shouldStart = state.AutoCpuEnabled
                    && session.CharacterInfo.HasRocketLauncherCpu
                    && capacity > 0
                    && state.LoadedCount < capacity
                    && state.ReloadTimer == null;
            }

            if (shouldStart)
                BeginRocketLauncherReload(session);
        }

        public static bool ShouldAdvertiseRocketLauncherCpu(Session session)
        {
            return session != null
                && session.CharacterInfo != null
                && session.CharacterInfo.HasRocketLauncherCpu;
        }

        public static void SendRocketLauncherStatus(Session session)
        {
            RocketLauncherRuntimeState state = GetRocketLauncherState(session);
            if (state == null || session == null)
                return;

            int launcherType;
            int selectedRocket;
            int loadedCount;

            lock (state.SyncRoot)
            {
                RefreshRocketLauncherState(session, state);
                launcherType = state.LauncherType;
                selectedRocket = state.SelectedRocketId;
                loadedCount = state.LoadedCount;
            }

            session.SendData(PacketComposer.Compose("RL", "S|" + launcherType + "|" + selectedRocket + "|" + loadedCount));
        }

        public static void SendRocketLauncherAmmo(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            session.SendData(PacketComposer.Compose("RL", "R|" + session.CharacterInfo.GetRocketLauncherAmmoPayload()));
        }

        public static void SendRocketLauncherAutoCpuState(Session session)
        {
            RocketLauncherRuntimeState state = GetRocketLauncherState(session);
            if (state == null || session == null || session.CharacterInfo == null)
                return;

            int launcherType;
            bool autoEnabled;
            bool hasCpu;

            lock (state.SyncRoot)
            {
                RefreshRocketLauncherState(session, state);
                launcherType = state.LauncherType;
                autoEnabled = state.AutoCpuEnabled;
                hasCpu = session.CharacterInfo.HasRocketLauncherCpu;
            }

            if (hasCpu)
                session.SendData(PacketComposer.Compose("A", "CPU|Y|" + ((launcherType > 0 && autoEnabled) ? 1 : 0)));
        }

        private static void SaveRocketLauncherAutoCpuState(Session session, int state)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            session.CharacterInfo.AutoRocketLauncherSkill = state == 1 ? 1 : 0;

            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ClearParameters();
                    client.SetParameter("id", (object)session.CharacterId);
                    client.SetParameter("state", (object)session.CharacterInfo.AutoRocketLauncherSkill);
                    client.ExecuteNonQuery("UPDATE users SET auto_rocketlauncher_skill = @state WHERE id = @id LIMIT 1");
                }
            }
            catch (Exception ex)
            {
                Output.WriteLine("auto_rocketlauncher_skill DB update failed: " + ex.Message);
            }
        }

        private static void SaveSelectedLauncherRocket(Session session, int rocketId)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            session.CharacterInfo.SelectedLauncherRocket = NormalizeLauncherRocketId(rocketId);

            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ClearParameters();
                    client.SetParameter("id", (object)session.CharacterId);
                    client.SetParameter("rocket", (object)session.CharacterInfo.SelectedLauncherRocket);
                    client.ExecuteNonQuery("UPDATE users SET selected_launcher_rocket = @rocket WHERE id = @id LIMIT 1");
                }
            }
            catch (Exception ex)
            {
                Output.WriteLine("selected_launcher_rocket DB update failed: " + ex.Message);
            }
        }

        public static void SetRocketLauncherAutoCpuState(Session session, bool enabled)
        {
            RocketLauncherRuntimeState state = GetRocketLauncherState(session);
            if (state == null || session == null || session.CharacterInfo == null)
                return;

            bool startReload = false;
            int savedState = 0;
            lock (state.SyncRoot)
            {
                RefreshRocketLauncherState(session, state);
                if (!session.CharacterInfo.HasRocketLauncherCpu || state.LauncherType <= 0)
                    state.AutoCpuEnabled = false;
                else
                {
                    state.AutoCpuEnabled = enabled;
                    int capacity = GetRocketLauncherCapacity(state.LauncherType);
                    startReload = enabled && state.ReloadTimer == null && state.LoadedCount < capacity;
                }
                savedState = state.AutoCpuEnabled ? 1 : 0;
            }

            SaveRocketLauncherAutoCpuState(session, savedState);

            if (session.CharacterInfo.HasRocketLauncherCpu)
                SendRocketLauncherAutoCpuState(session);

            if (startReload)
                BeginRocketLauncherReload(session);

            if (enabled)
                TryStartAutoRocketLauncher(session);
        }

        private static void RocketLauncher(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null || !Session.Authenticated || Message == null)
                return;

            string sub = Message.GetNextString(1).ToUpper();
            switch (sub)
            {
                case "L":
                    BeginRocketLauncherReload(Session);
                    break;
                case "A":
                    FireRocketLauncher(Session);
                    break;
                case "SEL":
                    SelectRocketLauncherRocket(Session, Message);
                    break;
                default:
                    SendRocketLauncherProtocolState(Session, true);
                    break;
            }
        }

        private static void SelectRocketLauncherRocket(Session session, ClientMessage message)
        {
            if (session == null || session.CharacterInfo == null || message == null)
                return;

            int rocketId;
            if (!int.TryParse(message.GetNextString(2), out rocketId) || !IsLauncherRocketId(rocketId))
            {
                SendRocketLauncherProtocolState(session, false);
                return;
            }

            RocketLauncherRuntimeState state = GetRocketLauncherState(session);
            if (state == null)
                return;

            lock (state.SyncRoot)
            {
                RefreshRocketLauncherState(session, state);
                state.SelectedRocketId = NormalizeLauncherRocketId(rocketId);
            }

            SaveSelectedLauncherRocket(session, rocketId);
            SendRocketLauncherProtocolState(session, false);
        }

        private static void BeginRocketLauncherReload(Session session)
        {
            if (session == null || session.CharacterInfo == null || !session.Authenticated)
                return;

            RocketLauncherRuntimeState state = GetRocketLauncherState(session);
            if (state == null)
                return;

            bool started = false;
            lock (state.SyncRoot)
            {
                RefreshRocketLauncherState(session, state);
                int capacity = GetRocketLauncherCapacity(state.LauncherType);
                if (capacity > 0 && state.LoadedCount < capacity && state.ReloadTimer == null)
                {
                    state.ReloadTimer = new System.Threading.Timer(new TimerCallback(Fight.RocketLauncherReloadTick), (object)session, ROCKET_LAUNCHER_RELOAD_STEP_MS, ROCKET_LAUNCHER_RELOAD_STEP_MS);
                    started = true;
                }
            }

            if (!started)
                SendRocketLauncherProtocolState(session, false);
        }

        private static void RocketLauncherReloadTick(object stateObject)
        {
            try
            {
                Session session = (Session)stateObject;
                if (session == null || session.CharacterInfo == null || !session.Authenticated || session.Stopped)
                    return;

                RocketLauncherRuntimeState state = GetRocketLauncherState(session);
                if (state == null)
                    return;

                bool sendRefresh = false;
                bool autoFire = false;
                lock (state.SyncRoot)
                {
                    RefreshRocketLauncherState(session, state);
                    int capacity = GetRocketLauncherCapacity(state.LauncherType);

                    if (capacity <= 0 || state.LoadedCount >= capacity)
                    {
                        StopRocketLauncherReloadTimer(state);
                        sendRefresh = true;
                    }
                    else if (!session.CharacterInfo.TryConsumeLauncherRocketAmmo(state.SelectedRocketId, 1))
                    {
                        StopRocketLauncherReloadTimer(state);
                        sendRefresh = true;
                        autoFire = state.AutoCpuEnabled
                            && session.CharacterInfo.Attacking
                            && state.LoadedCount > 0;
                    }
                    else
                    {
                        state.LoadedCount++;
                        bool hasMoreAmmo = session.CharacterInfo.HasLauncherRocketAmmo(state.SelectedRocketId, 1);
                        if (state.LoadedCount >= capacity)
                            StopRocketLauncherReloadTimer(state);
                        sendRefresh = true;
                        autoFire = state.AutoCpuEnabled
                            && session.CharacterInfo.Attacking
                            && state.LoadedCount > 0
                            && (state.LoadedCount >= capacity || !hasMoreAmmo);
                    }
                }

                if (sendRefresh)
                {
                    SendRocketLauncherAmmo(session);
                    SendRocketLauncherStatus(session);
                }

                if (autoFire)
                    FireRocketLauncher(session);

            }
            catch (Exception ex)
            {
                LogTimerFailure("RocketLauncherReloadTick", ex);
            }
        }

        private static int[] BuildRocketLauncherMissileDamages(Session session, int rocketId, int count, bool targetIsNpc, int targetNpcShipId = 0)
        {
            if (session == null || session.CharacterInfo == null)
                return new int[0];

            int missiles = count <= 0 ? 1 : count;
            int baseDamage = GetBaseRocketDamage(session.CharacterInfo.RckDamages, rocketId);
            Random rng = session.CharacterInfo.RandomDamage ?? new Random();
            double multiplier = 1.0;
            bool applyNpcBonus = rocketId == 8 && targetIsNpc && targetNpcShipId != 442;

            if (session.CharacterInfo.LabInfos != null && session.CharacterInfo.LabInfos.Rocket[1] > 0)
            {
                if (session.CharacterInfo.LabInfos.Rocket[0] == 11)
                    multiplier = 1.05;
                else if (session.CharacterInfo.LabInfos.Rocket[0] == 13)
                    multiplier = 1.3;
                else if (session.CharacterInfo.LabInfos.Rocket[0] == 14)
                    multiplier = 1.6;

                int consumedProm = Math.Min(session.CharacterInfo.LabInfos.Rocket[1], missiles);
                session.CharacterInfo.LabInfos.Rocket[1] -= consumedProm;
                session.CharacterInfo.LabInfos.Update += consumedProm;
                if (session.CharacterInfo.LabInfos.Update > 8)
                    session.CharacterInfo.UpdateLaserRocketReff();
            }

            int[] damages = new int[missiles];
            for (int i = 0; i < missiles; i++)
            {
                int missileDamage = Math.Max(0, baseDamage + rng.Next(-200, 200));
                if (multiplier != 1.0)
                    missileDamage = (int)Math.Round(missileDamage * multiplier);
                if (applyNpcBonus)
                    missileDamage = (int)Math.Round(missileDamage * 1.8);
                damages[i] = missileDamage;
            }

            return damages;
        }

        private static int GetRocketLauncherEffectDelayMs(Session session)
        {
            Random rng = session != null && session.CharacterInfo != null && session.CharacterInfo.RandomDamage != null
                ? session.CharacterInfo.RandomDamage
                : new Random();
            return rng.Next(ROCKET_LAUNCHER_EFFECT_DELAY_MIN_MS, ROCKET_LAUNCHER_EFFECT_DELAY_MAX_MS + 1);
        }

        private static void FireRocketLauncher(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null || !Session.Authenticated)
                return;

            RocketLauncherRuntimeState state = GetRocketLauncherState(Session);
            if (state == null)
                return;

            int launcherType;
            int loadedCount;
            int rocketId;
            lock (state.SyncRoot)
            {
                RefreshRocketLauncherState(Session, state);
                launcherType = state.LauncherType;
                loadedCount = state.LoadedCount;
                rocketId = state.SelectedRocketId;
            }

            if (launcherType <= 0 || loadedCount <= 0 || !IsLauncherRocketId(rocketId))
            {
                SendRocketLauncherStatus(Session);
                return;
            }

            if (Session.CharacterInfo.SelectedPlayer == 0)
                return;

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            bool targetIsNpc = false;
            Npc launcherTargetNpc = null;
            int targetId = 0;
            int targetSpawnSeq = 0;
            int targetNpcShipId = 0;

            MapActor actorNpc = instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.AiBot);
            if (actorNpc != null)
            {
                Npc npc = (Npc)actorNpc.ReferenceObject;
                if (npc == null || npc.IsDestroying || !CanSessionAttackNpc(Session, npc) || Fight.GetDistanceNpc(Session, npc) >= RANGE_ROCKET)
                    return;

                targetIsNpc = true;
                launcherTargetNpc = npc;
                targetId = npc.Id;
                targetSpawnSeq = npc.SpawnSeq;
                targetNpcShipId = npc.ShipId;

                Session.CharacterInfo.NoFightTimer = 0;
                Session.CharacterInfo.PeaceZone = false;
                Session.CharacterInfo.TradeZone = false;
                ShipMovement.SendPeacePortalInfos(Session);

                if (Session.CharacterInfo.Invisible == 1)
                {
                    Session.CharacterInfo.Invisible = 0;
                    SendSessionScopedMessage(instanceByMapId, Session, PacketComposer.Compose("n", "INV|" + (object)Session.CharacterInfo.Id + "|" + (object)0));
                }

                npc.UpdateAttackers(Session.CharacterId, 0);
            }
            else
            {
                MapActor actorPlayer = instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.UserCharacter);
                if (actorPlayer == null)
                    return;

                Session targetSession = SessionManager.GetSessionByCharacterId(actorPlayer.ReferenceId);
                if (targetSession == null || targetSession.CharacterInfo == null)
                    return;

                if (!Fight.PlayerCanAttack(Session, targetSession)
                    || targetSession.CharacterInfo.PeaceZone
                    || targetSession.CharacterInfo.ActiveISH
                    || Fight.GetDistance(Session, targetSession) >= RANGE_ROCKET)
                {
                    return;
                }

                targetId = targetSession.CharacterId;

                Session.CharacterInfo.NoFightTimer = 0;
                Session.CharacterInfo.PeaceZone = false;
                Session.CharacterInfo.TradeZone = false;
                ShipMovement.SendPeacePortalInfos(Session);

                if (Session.CharacterInfo.Invisible == 1)
                {
                    Session.CharacterInfo.Invisible = 0;
                    SendSessionScopedMessage(instanceByMapId, Session, PacketComposer.Compose("n", "INV|" + (object)Session.CharacterInfo.Id + "|" + (object)0));
                }
            }

            lock (state.SyncRoot)
            {
                StopRocketLauncherReloadTimer(state);
                state.LoadedCount = 0;
            }

            ServerMessage launcherMessage = PacketComposer.Compose("RL", "A|" + Session.CharacterId + "|" + targetId + "|" + loadedCount + "|" + rocketId);
            if (targetIsNpc && launcherTargetNpc != null)
                SendNpcScopedMessage(instanceByMapId, launcherTargetNpc, launcherMessage, Session);
            else
                SendPlayerScopedCombatMessage(instanceByMapId, Session, SessionManager.GetSessionByCharacterId(targetId), launcherMessage);
            SendRocketLauncherStatus(Session);

            int[] missileDamages = BuildRocketLauncherMissileDamages(Session, rocketId, loadedCount, targetIsNpc, targetNpcShipId);
            for (int missileIndex = 0; missileIndex < missileDamages.Length; missileIndex++)
            {
                int missileDamage = missileDamages[missileIndex];
                if (missileDamage <= 0)
                    continue;

                RocketLauncherAttackContext context = new RocketLauncherAttackContext();
                context.Attacker = Session;
                context.MapId = Session.CurrentMapId;
                context.TargetId = targetId;
                context.TargetIsNpc = targetIsNpc;
                context.TargetSpawnSeq = targetSpawnSeq;
                context.RocketId = rocketId;
                context.Damage = missileDamage;
                context.Timer = new System.Threading.Timer(new TimerCallback(Fight.EffectRocketLauncher), (object)context, GetRocketLauncherEffectDelayMs(Session), Timeout.Infinite);
            }

            bool autoReload;
            lock (state.SyncRoot)
            {
                autoReload = state.AutoCpuEnabled;
            }
            if (autoReload)
                BeginRocketLauncherReload(Session);
        }

        private static void EffectRocketLauncher(object stateObject)
        {
            try
            {
                RocketLauncherAttackContext context = (RocketLauncherAttackContext)stateObject;
                if (context == null)
                    return;

                try
                {
                    if (context.Timer != null)
                    {
                        context.Timer.Dispose();
                        context.Timer = null;
                    }
                }
                catch
                {
                }

                Session session = context.Attacker;
                if (session == null || session.CharacterInfo == null || !session.Authenticated || session.CurrentMapId != context.MapId)
                    return;

                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(context.MapId);
                if (instanceByMapId == null)
                    return;

                int damage = context.Damage;
                if (damage <= 0)
                    return;

                if (context.TargetIsNpc)
                {
                    MapActor actorNpc = instanceByMapId.GetActorByReferenceId(context.TargetId, MapActorType.AiBot);
                    if (actorNpc == null)
                        return;

                    Npc npc = (Npc)actorNpc.ReferenceObject;
                    if (npc == null || npc.IsDestroying || npc.SpawnSeq != context.TargetSpawnSeq || !CanSessionAttackNpc(session, npc))
                        return;

                    if (npc.ShipId == 442)
                    {
                        if (session.CharacterInfo.SelectedAmmo == 5)
                            return;

                        Spaceball.DoDamage(damage, session.CharacterInfo.FactionId);
                    }
                    else
                    {
                        ApplyDamageToNpc(session, npc, damage, instanceByMapId);
                    }
                    return;
                }

                MapActor actorPlayer = instanceByMapId.GetActorByReferenceId(context.TargetId, MapActorType.UserCharacter);
                if (actorPlayer == null)
                    return;

                Session targetSession = SessionManager.GetSessionByCharacterId(actorPlayer.ReferenceId);
                if (targetSession == null || targetSession.CharacterInfo == null || targetSession.CurrentMapId != context.MapId || !PlayerCanAttack(session, targetSession))
                    return;

                if (targetSession.CharacterInfo.ActiveISH || targetSession.CharacterInfo.PeaceZone)
                    return;

                ApplyDamageToPlayer(session, targetSession, damage, instanceByMapId);

            }
            catch (Exception ex)
            {
                LogTimerFailure("EffectRocketLauncher", ex);
            }
        }

        public static void SendShipSkillStatus(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            int skillType = Session.CharacterInfo.SkillDesignType;
            if (Session.CharacterInfo.ActiveShipSkillType > 0 && Session.CharacterInfo.ActiveShipSkillType != skillType)
            {
                bool hadSpeedSkill = Fight.DoesShipSkillAffectSpeed(Session.CharacterInfo.ActiveShipSkillType);
                Session.CharacterInfo.ClearActiveShipSkill();
                if (hadSpeedSkill)
                    Fight.RefreshShipSpeed(Session);
            }
            if (skillType <= 0)
            {
                bool hadSpeedSkill = Fight.DoesShipSkillAffectSpeed(Session.CharacterInfo.ActiveShipSkillType);
                Session.CharacterInfo.ClearActiveShipSkill();
                if (hadSpeedSkill)
                    Fight.RefreshShipSpeed(Session);
                Session.SendData(PacketComposer.Compose("SD", "S|0|0|0"));
                return;
            }

            Session.SendData(PacketComposer.Compose(
                "SD",
                "S|" + (object)skillType + "|" + (object)Session.CharacterInfo.ShipSkillStatus + "|" + (object)Session.CharacterInfo.ShipSkillSecondsLeft
            ));

            int cooldown = Session.CharacterInfo.GetShipSkillCooldown(skillType);
            string cooldownCode = Session.CharacterInfo.SkillDesignCooldownCode;
            if (!string.IsNullOrEmpty(cooldownCode) && cooldown > 0)
                Session.SendData(PacketComposer.Compose("A", "CLD|" + cooldownCode + "|" + (object)cooldown));
        }

        private static void PersistShipSkillCooldowns(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    session.CharacterInfo.SynchronizeShipSkillCooldowns(client);
            }
            catch (Exception ex)
            {
                Output.WriteLine((object)("[Fight] PersistShipSkillCooldowns failed for charId=" + session.CharacterId + ": " + ex.ToString()), OutputLevel.Warning);
            }
        }

        public static void SendTechStatus(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            string payload = "S";
            for (int techId = 1; techId <= 5; ++techId)
            {
                int status;
                int amount;
                int secondsLeft;
                Fight.ResolveTechRuntimeState(Session, techId, out status, out amount, out secondsLeft);
                payload = payload + "|" + (object)status + "|" + (object)amount + "|" + (object)secondsLeft;
            }

            Session.SendData(PacketComposer.Compose("TX", payload));

            if (Session.CharacterInfo.CoolDownTechEla > 0)
                Session.SendData(PacketComposer.Compose("A", "CLD|ELA|" + (object)Session.CharacterInfo.CoolDownTechEla));
            if (Session.CharacterInfo.CoolDownTechEci > 0)
                Session.SendData(PacketComposer.Compose("A", "CLD|ECI|" + (object)Session.CharacterInfo.CoolDownTechEci));
            if (Session.CharacterInfo.CoolDownTechRpm > 0)
                Session.SendData(PacketComposer.Compose("A", "CLD|RPM|" + (object)Session.CharacterInfo.CoolDownTechRpm));
            if (Session.CharacterInfo.CoolDownTechSh > 0)
                Session.SendData(PacketComposer.Compose("A", "CLD|SBU|" + (object)Session.CharacterInfo.CoolDownTechSh));
            if (Session.CharacterInfo.CoolDownTechHp > 0)
                Session.SendData(PacketComposer.Compose("A", "CLD|BRB|" + (object)Session.CharacterInfo.CoolDownTechHp));
        }

        public static void SendOwnerTechVisualReplay(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            if (Session.CharacterInfo.EnergyLeechActive)
                Session.SendData(PacketComposer.Compose("TX", "A|0|ELA|" + (object)Session.CharacterId + "|" + (object)Session.CharacterInfo.EnergyLeechSecondsLeft));

            if (Session.CharacterInfo.RocketProbabilityMaximizerActive)
                Session.SendData(PacketComposer.Compose("TX", "A|0|RPM|" + (object)Session.CharacterId + "|" + (object)Session.CharacterInfo.RocketProbabilityMaximizerSecondsLeft));

            int shieldBackupSecondsLeft = Math.Max(0, (int)Math.Ceiling((double)TECH_SHIELD_BACKUP_VISUAL_SECONDS - (UnixTimestamp.GetCurrent() - Session.CharacterInfo.LastTechSh)));
            if (shieldBackupSecondsLeft > 0)
                Session.SendData(PacketComposer.Compose("TX", "A|0|SBU|" + (object)Session.CharacterId + "|" + (object)shieldBackupSecondsLeft));

            if (Session.CharacterInfo.BattleRepairTimer != null && Session.CharacterInfo.BattleRepairCount > 0)
                Session.SendData(PacketComposer.Compose("TX", "A|0|BRB|" + (object)Session.CharacterId + "|" + (object)Session.CharacterInfo.BattleRepairCount));
        }

        private static void ResolveTechRuntimeState(Session session, int techId, out int status, out int amount, out int secondsLeft)
        {
            status = 0;
            amount = 0;
            secondsLeft = 0;

            if (session == null || session.CharacterInfo == null)
                return;

            switch (techId)
            {
                case 1:
                    amount = 1;
                    if (session.CharacterInfo.EnergyLeechActive)
                    {
                        status = 2;
                        secondsLeft = session.CharacterInfo.EnergyLeechSecondsLeft;
                    }
                    else if (session.CharacterInfo.CoolDownTechEla > 0)
                    {
                        status = 3;
                        secondsLeft = session.CharacterInfo.CoolDownTechEla;
                    }
                    else
                    {
                        status = 1;
                    }
                    break;
                case 2:
                    amount = 1;
                    if (session.CharacterInfo.CoolDownTechEci > 0)
                    {
                        status = 3;
                        secondsLeft = session.CharacterInfo.CoolDownTechEci;
                    }
                    else
                    {
                        status = 1;
                    }
                    break;
                case 3:
                    amount = 1;
                    if (session.CharacterInfo.RocketProbabilityMaximizerActive)
                    {
                        status = 2;
                        secondsLeft = session.CharacterInfo.RocketProbabilityMaximizerSecondsLeft;
                    }
                    else if (session.CharacterInfo.CoolDownTechRpm > 0)
                    {
                        status = 3;
                        secondsLeft = session.CharacterInfo.CoolDownTechRpm;
                    }
                    else
                    {
                        status = 1;
                    }
                    break;
                case 4:
                    amount = 1;
                    if (session.CharacterInfo.CoolDownTechSh > 0)
                    {
                        status = 3;
                        secondsLeft = session.CharacterInfo.CoolDownTechSh;
                    }
                    else
                    {
                        status = 1;
                    }
                    break;
                case 5:
                    amount = 1;
                    if (session.CharacterInfo.BattleRepairTimer != null)
                    {
                        status = 2;
                        secondsLeft = Math.Max(0, session.CharacterInfo.BattleRepairCount);
                    }
                    else if (session.CharacterInfo.CoolDownTechHp > 0)
                    {
                        status = 3;
                        secondsLeft = session.CharacterInfo.CoolDownTechHp;
                    }
                    else
                    {
                        status = 1;
                    }
                    break;
            }
        }

        private static bool IsShipSkillActive(Session session, int skillType)
        {
            return session != null
                && session.CharacterInfo != null
                && session.CharacterInfo.ActiveShipSkillType == skillType
                && session.CharacterInfo.ActiveShipSkillUntil > UnixTimestamp.GetCurrent();
        }

        private static bool DoesShipSkillAffectSpeed(int skillType)
        {
            return skillType == 4 || skillType == 6;
        }

        private static bool HasDiminisherShieldBonus(Session attacker, Session target)
        {
            return Fight.HasDiminisherShieldBonus(attacker, target != null ? target.CharacterId : 0);
        }

        private static bool HasDiminisherShieldBonus(Session attacker, int targetId)
        {
            return attacker != null
                && attacker.CharacterInfo != null
                && Fight.IsShipSkillActive(attacker, 2)
                && attacker.CharacterInfo.ActiveShipSkillTargetId != 0
                && targetId != 0
                && attacker.CharacterInfo.ActiveShipSkillTargetId == targetId;
        }

        private static int ApplyDiminisherShieldBonus(Session attacker, Session target, int shieldDamage)
        {
            return Fight.ApplyDiminisherShieldBonus(attacker, target != null ? target.CharacterId : 0, shieldDamage);
        }

        private static int ApplyDiminisherShieldBonus(Session attacker, int targetId, int shieldDamage)
        {
            if (shieldDamage <= 0)
                return 0;
            if (!Fight.HasDiminisherShieldBonus(attacker, targetId))
                return shieldDamage;
            return Convert.ToInt32(Math.Round((double)shieldDamage * 1.5));
        }

        private static int ApplySentinelShieldReduction(Session target, int shieldDamage)
        {
            if (shieldDamage <= 0)
                return 0;
            if (!Fight.IsShipSkillActive(target, 4))
                return shieldDamage;
            return Convert.ToInt32(Math.Round((double)shieldDamage * 0.7));
        }

        private static int ApplySpectrumOutgoingPenalty(Session attacker, int damage)
        {
            if (damage <= 0)
                return 0;
            if (!Fight.IsShipSkillActive(attacker, 3))
                return damage;
            return Convert.ToInt32(Math.Round((double)damage * 0.5));
        }

        private static int ApplySpectrumIncomingLaserReduction(Session target, int damage)
        {
            if (damage <= 0)
                return 0;
            if (!Fight.IsShipSkillActive(target, 3))
                return damage;
            return Convert.ToInt32(Math.Round((double)damage * 0.2));
        }

        private static void RefreshShipSpeed(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;
            session.SendData(PacketComposer.Compose("A", "v|" + (object)session.CharacterInfo.ShipSpeed));
        }

        private static void RefreshShipBars(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;
            session.SendData(PacketComposer.Compose("A", "HPT|" + (object)session.CharacterInfo.ShipHp + "|" + (object)session.CharacterInfo.ShipMaxHp));
            session.SendData(PacketComposer.Compose("A", "SHD|" + (object)session.CharacterInfo.ShipShield + "|" + (object)session.CharacterInfo.ShipMaxShield));
        }

        private static void SendTargetWindowUpdate(Session target, MapInstance instance, int appliedValue)
        {
            if (target == null || target.CharacterInfo == null || instance == null)
                return;
            ServerMessage packet = PacketComposer.Compose(
                "Y",
                "0|" + (object)target.CharacterId + "|L|" + (object)target.CharacterInfo.ShipHp + "|" + (object)target.CharacterInfo.ShipShield + "|" + (object)appliedValue
            );
            target.SendData(packet);
            instance.BroadcastToSelectedTarget(target.CharacterId, packet);
        }

        private static void BroadcastShipSkillPacket(MapInstance instance, string action, int skillType, int sourceId, IList<int> targetIds = null)
        {
            if (instance == null || string.IsNullOrEmpty(action) || skillType <= 0 || sourceId <= 0)
                return;
            string payload;
            switch (action)
            {
                case "A":
                case "D":
                    payload = action + "|0|" + (object)skillType + "|" + (object)sourceId;
                    break;
                case "R":
                    payload = action + "|" + (object)skillType + "|" + (object)sourceId;
                    break;
                default:
                    return;
            }
            if (targetIds != null)
            {
                for (int index = 0; index < targetIds.Count; ++index)
                {
                    if (targetIds[index] != 0)
                        payload = payload + "|" + (object)targetIds[index];
                }
            }
            ServerMessage skillMessage = PacketComposer.Compose("SD", payload);
            Session sourceSession = SessionManager.GetSessionByCharacterId(sourceId);
            if (IsSessionInGalaxyGate(sourceSession))
            {
                sourceSession.SendData(skillMessage);
                return;
            }

            if (sourceSession != null)
            {
                SendMapScopedMessage(instance, skillMessage, delegate (Session observer)
                {
                    return ShouldReceiveShipSkillScopedMessage(observer, sourceSession, targetIds);
                });
                return;
            }

            instance.BroadcastMessage(skillMessage, false);
        }

        private static Session ResolveSelectedPlayerTarget(Session session)
        {
            if (session == null || session.CharacterInfo == null || session.CharacterInfo.SelectedPlayer <= 0)
                return null;
            Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(session.CharacterInfo.SelectedPlayer);
            if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo == null)
                return null;
            if (sessionByCharacterId.CurrentMapId != session.CurrentMapId)
                return null;
            if (sessionByCharacterId.CharacterId == session.CharacterId)
                return null;
            return sessionByCharacterId;
        }

        private static Npc ResolveNpcTargetById(MapInstance instance, int targetId)
        {
            if (instance == null || targetId == 0)
                return null;
            MapActor actorByReferenceId = instance.GetActorByReferenceId(targetId, MapActorType.AiBot);
            if (actorByReferenceId == null)
                return null;
            return actorByReferenceId.ReferenceObject as Npc;
        }

        private static Npc ResolveSelectedNpcTarget(Session session)
        {
            if (session == null || session.CharacterInfo == null || session.CharacterInfo.SelectedPlayer == 0)
                return null;
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(session.CurrentMapId);
            if (instanceByMapId == null)
                return null;
            return Fight.ResolveNpcTargetById(instanceByMapId, session.CharacterInfo.SelectedPlayer);
        }

        private static void StopEnergyLeech(object state)
        {
            try
            {
                Session session = state as Session;
                if (session == null || session.CharacterInfo == null)
                    return;

                if (session.CharacterInfo.EnergyLeechTimer != null)
                {
                    session.CharacterInfo.EnergyLeechTimer.Dispose();
                    session.CharacterInfo.EnergyLeechTimer = (System.Threading.Timer)null;
                }

                session.CharacterInfo.EnergyLeechUntil = 0.0;

                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(session.CurrentMapId);
                if (instanceByMapId != null)
                    SendSessionScopedMessage(instanceByMapId, session, PacketComposer.Compose("TX", "D|0|ELA|" + (object)session.CharacterId));

                Fight.SendTechStatus(session);

            }
            catch (Exception ex)
            {
                LogTimerFailure("StopEnergyLeech", ex);
            }
        }

        private static bool IsEnergyLeechAmmoEligible(int ammo)
        {
            return ammo > 0 && ammo != 5 && ammo != 6;
        }

        private static void ApplyEnergyLeech(Session attacker, int appliedDamage, int ammo, MapInstance instance)
        {
            if (attacker == null || attacker.CharacterInfo == null || instance == null)
                return;
            if (!attacker.CharacterInfo.EnergyLeechActive)
                return;
            if (!Fight.IsEnergyLeechAmmoEligible(ammo))
                return;
            int overhealCap = attacker.CharacterInfo.ShipOverhealMaxHp;
            if (appliedDamage <= 0 || overhealCap <= 0 || attacker.CharacterInfo.ShipHp >= overhealCap)
                return;

            int healAmount = Convert.ToInt32(Math.Floor((double)appliedDamage * (double)TECH_ENERGY_LEECH_LIFESTEAL_PERCENT / 100.0));
            if (healAmount <= 0)
                return;

            long healedHp = (long)attacker.CharacterInfo.ShipHp + (long)healAmount;
            if (healedHp > overhealCap)
                healAmount = overhealCap - attacker.CharacterInfo.ShipHp;
            if (healAmount <= 0)
                return;

            attacker.CharacterInfo.ShipHp += healAmount;
            attacker.SendData(PacketComposer.Compose("A", "HL|1|" + (object)attacker.CharacterInfo.Id + "|HPT|" + (object)attacker.CharacterInfo.ShipHp + "|" + (object)healAmount));

            foreach (MapActor key in instance.GetActorSnapshot())
            {
                if (key.Type != MapActorType.UserCharacter)
                    continue;
                Session sessionById = SessionManager.GetSessionById(key.ReferenceSessionId);
                if (sessionById == null || sessionById.CharacterInfo == null)
                    continue;
                if (sessionById.CharacterId == attacker.CharacterId || sessionById.CharacterInfo.SelectedPlayer == attacker.CharacterId)
                {
                    sessionById.SendData(PacketComposer.Compose("A", "HL|1|" + (object)attacker.CharacterInfo.Id + "|HPT|" + (object)attacker.CharacterInfo.ShipHp + "|" + (object)healAmount));
                }
            }
        }

        private static Session ResolveChainImpulsePrimaryPlayerTarget(Session session)
        {
            Session selectedPlayerTarget = Fight.ResolveSelectedPlayerTarget(session);
            if (selectedPlayerTarget == null)
                return null;
            if (!Fight.PlayerCanAttack(session, selectedPlayerTarget))
                return null;
            if (Fight.GetDistance(session, selectedPlayerTarget) > (double)TECH_CHAIN_IMPULSE_RADIUS)
                return null;
            return selectedPlayerTarget;
        }

        private static Npc ResolveChainImpulsePrimaryNpcTarget(Session session)
        {
            Npc selectedNpcTarget = Fight.ResolveSelectedNpcTarget(session);
            if (selectedNpcTarget == null || selectedNpcTarget.IsDestroying || !CanSessionAttackNpc(session, selectedNpcTarget))
                return null;
            if (Fight.GetDistanceNpc(session, selectedNpcTarget) > (double)TECH_CHAIN_IMPULSE_RADIUS)
                return null;
            return selectedNpcTarget;
        }

        private static List<ChainImpulseTarget> BuildChainImpulseTargets(Session session, MapInstance instance, Session primaryPlayer, Npc primaryNpc)
        {
            List<ChainImpulseTarget> chainImpulseTargetList = new List<ChainImpulseTarget>();
            if (session == null || session.CharacterInfo == null || instance == null)
                return chainImpulseTargetList;

            int centerX;
            int centerY;
            if (primaryPlayer != null && primaryPlayer.CharacterInfo != null)
            {
                centerX = primaryPlayer.CharacterInfo.LocX;
                centerY = primaryPlayer.CharacterInfo.LocY;
                chainImpulseTargetList.Add(new ChainImpulseTarget()
                {
                    Id = primaryPlayer.CharacterId,
                    IsNpc = false,
                    Distance = -1.0
                });
            }
            else if (primaryNpc != null)
            {
                centerX = primaryNpc.LocX;
                centerY = primaryNpc.LocY;
                chainImpulseTargetList.Add(new ChainImpulseTarget()
                {
                    Id = primaryNpc.Id,
                    IsNpc = true,
                    Distance = -1.0
                });
            }
            else
            {
                return chainImpulseTargetList;
            }

            foreach (MapActor key in instance.GetActorSnapshot())
            {
                if (key.Type == MapActorType.UserCharacter)
                {
                    Session sessionById = SessionManager.GetSessionById(key.ReferenceSessionId);
                    if (sessionById == null || sessionById.CharacterInfo == null)
                        continue;
                    if (sessionById.CharacterId == session.CharacterId)
                        continue;
                    if (!Fight.PlayerCanAttack(session, sessionById))
                        continue;
                    if (chainImpulseTargetList.Exists(entry => !entry.IsNpc && entry.Id == sessionById.CharacterId))
                        continue;

                    double dx = (double)(sessionById.CharacterInfo.LocX - centerX);
                    double dy = (double)(sessionById.CharacterInfo.LocY - centerY);
                    double num = Math.Sqrt(dx * dx + dy * dy);
                    if (num > (double)TECH_CHAIN_IMPULSE_RADIUS)
                        continue;

                    chainImpulseTargetList.Add(new ChainImpulseTarget()
                    {
                        Id = sessionById.CharacterId,
                        IsNpc = false,
                        Distance = num
                    });
                }
                else if (key.Type == MapActorType.AiBot)
                {
                    Npc npc = key.ReferenceObject as Npc;
                    if (npc == null || npc.IsDestroying || !CanSessionAttackNpc(session, npc))
                        continue;
                    if (chainImpulseTargetList.Exists(entry => entry.IsNpc && entry.Id == npc.Id))
                        continue;

                    double dx = (double)(npc.LocX - centerX);
                    double dy = (double)(npc.LocY - centerY);
                    double num = Math.Sqrt(dx * dx + dy * dy);
                    if (num > (double)TECH_CHAIN_IMPULSE_RADIUS)
                        continue;

                    chainImpulseTargetList.Add(new ChainImpulseTarget()
                    {
                        Id = npc.Id,
                        IsNpc = true,
                        Distance = num
                    });
                }
            }

            chainImpulseTargetList.Sort((left, right) => left.Distance.CompareTo(right.Distance));
            if (chainImpulseTargetList.Count > TECH_CHAIN_IMPULSE_MAX_TARGETS)
                chainImpulseTargetList.RemoveRange(TECH_CHAIN_IMPULSE_MAX_TARGETS, chainImpulseTargetList.Count - TECH_CHAIN_IMPULSE_MAX_TARGETS);

            return chainImpulseTargetList;
        }

        private static void ActivateEnergyLeech(Session session, MapInstance instance)
        {
            if (session == null || session.CharacterInfo == null || instance == null)
                return;
            if (session.CharacterInfo.CoolDownTechEla > 0 || session.CharacterInfo.EnergyLeechActive)
                return;

            session.CharacterInfo.LastTechEla = UnixTimestamp.GetCurrent();
            session.CharacterInfo.EnergyLeechUntil = UnixTimestamp.GetCurrent() + (double)TECH_ENERGY_LEECH_DURATION_SECONDS;

            if (session.CharacterInfo.EnergyLeechTimer != null)
            {
                session.CharacterInfo.EnergyLeechTimer.Dispose();
                session.CharacterInfo.EnergyLeechTimer = (System.Threading.Timer)null;
            }

            session.CharacterInfo.EnergyLeechTimer = new System.Threading.Timer(new TimerCallback(Fight.StopEnergyLeech), (object)session, TECH_ENERGY_LEECH_DURATION_SECONDS * 1000, 0);

            session.SendData(PacketComposer.Compose("A", "CLD|ELA|" + (object)TECH_ENERGY_LEECH_COOLDOWN_SECONDS));
            SendSessionScopedMessage(instance, session, PacketComposer.Compose("TX", "A|0|ELA|" + (object)session.CharacterId + "|" + (object)TECH_ENERGY_LEECH_DURATION_SECONDS));

            Fight.SendTechStatus(session);
        }

        private static void ActivateChainImpulse(Session session, MapInstance instance)
        {
            if (session == null || session.CharacterInfo == null || instance == null)
                return;
            if (session.CharacterInfo.CoolDownTechEci > 0)
                return;

            Session primaryPlayerTarget = Fight.ResolveChainImpulsePrimaryPlayerTarget(session);
            Npc primaryNpcTarget = primaryPlayerTarget == null ? Fight.ResolveChainImpulsePrimaryNpcTarget(session) : (Npc)null;
            if (primaryPlayerTarget == null && primaryNpcTarget == null)
                return;

            List<ChainImpulseTarget> chainImpulseTargets = Fight.BuildChainImpulseTargets(session, instance, primaryPlayerTarget, primaryNpcTarget);
            if (chainImpulseTargets.Count == 0)
                return;

            session.CharacterInfo.LastTechEci = UnixTimestamp.GetCurrent();
            session.SendData(PacketComposer.Compose("A", "CLD|ECI|" + (object)TECH_CHAIN_IMPULSE_COOLDOWN_SECONDS));

            string text = "ECI|" + (object)session.CharacterId;
            foreach (ChainImpulseTarget chainImpulseTarget in chainImpulseTargets)
                text = text + "|" + (object)chainImpulseTarget.Id;
            SendSessionScopedMessage(instance, session, PacketComposer.Compose("TX", text));

            foreach (ChainImpulseTarget chainImpulseTarget in chainImpulseTargets)
            {
                if (chainImpulseTarget.IsNpc)
                {
                    Npc npcTargetById = Fight.ResolveNpcTargetById(instance, chainImpulseTarget.Id);
                    if (npcTargetById != null && !npcTargetById.IsDestroying)
                        Fight.ApplyShieldOnlyDamageToNpc(session, npcTargetById, TECH_CHAIN_IMPULSE_DAMAGE, instance);
                }
                else
                {
                    Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(chainImpulseTarget.Id);
                    if (sessionByCharacterId != null && sessionByCharacterId.CharacterInfo != null && Fight.PlayerCanAttack(session, sessionByCharacterId))
                        Fight.ApplyShieldOnlyDamageToPlayer(session, sessionByCharacterId, TECH_CHAIN_IMPULSE_DAMAGE, instance);
                }
            }

            Fight.SendTechStatus(session);
        }

        private static void ActivateRocketProbabilityMaximizer(Session session, MapInstance instance)
        {
            if (session == null || session.CharacterInfo == null || instance == null)
                return;
            if (session.CharacterInfo.RocketProbabilityMaximizerActive || session.CharacterInfo.CoolDownTechRpm > 0)
                return;

            double now = UnixTimestamp.GetCurrent();
            session.CharacterInfo.RocketProbabilityMaximizerUntil = now + (double)TECH_ROCKET_PROBABILITY_MAXIMIZER_DURATION_SECONDS;
            session.CharacterInfo.RocketProbabilityMaximizerCooldownUntil = 0.0;

            if (session.CharacterInfo.RocketProbabilityMaximizerTimer != null)
            {
                session.CharacterInfo.RocketProbabilityMaximizerTimer.Dispose();
                session.CharacterInfo.RocketProbabilityMaximizerTimer = null;
            }

            session.CharacterInfo.RocketProbabilityMaximizerTimer = new System.Threading.Timer(
                new TimerCallback(Fight.StopRocketProbabilityMaximizer),
                (object)session,
                TECH_ROCKET_PROBABILITY_MAXIMIZER_DURATION_SECONDS * 1000,
                Timeout.Infinite
            );

            session.SendData(PacketComposer.Compose("TX", "A|0|RPM|" + (object)session.CharacterId + "|" + (object)TECH_ROCKET_PROBABILITY_MAXIMIZER_DURATION_SECONDS));
            Fight.SendTechStatus(session);
        }

        private static void StopRocketProbabilityMaximizer(object state)
        {
            try
            {
                Session session = state as Session;
                if (session == null || session.CharacterInfo == null)
                    return;

                if (session.CharacterInfo.RocketProbabilityMaximizerTimer != null)
                {
                    session.CharacterInfo.RocketProbabilityMaximizerTimer.Dispose();
                    session.CharacterInfo.RocketProbabilityMaximizerTimer = null;
                }

                session.CharacterInfo.RocketProbabilityMaximizerUntil = 0.0;
                session.CharacterInfo.RocketProbabilityMaximizerCooldownUntil = UnixTimestamp.GetCurrent() + (double)TECH_ROCKET_PROBABILITY_MAXIMIZER_COOLDOWN_SECONDS;

                session.SendData(PacketComposer.Compose("TX", "D|0|RPM|" + (object)session.CharacterId));
                Fight.SendTechStatus(session);
            }
            catch (Exception ex)
            {
                LogTimerFailure("StopRocketProbabilityMaximizer", ex);
            }
        }

        private static void InterruptDiminisherOnTarget(Session targetSession, MapInstance instance)
        {
            if (targetSession == null || targetSession.CharacterInfo == null || instance == null)
                return;
            foreach (MapActor key in instance.GetActorSnapshot())
            {
                if (key.Type != MapActorType.UserCharacter)
                    continue;
                Session attacker = SessionManager.GetSessionById(key.ReferenceSessionId);
                if (attacker == null || attacker.CharacterInfo == null)
                    continue;
                if (attacker.CharacterId == targetSession.CharacterId)
                    continue;
                if (attacker.CharacterInfo.ActiveShipSkillType != 2)
                    continue;
                if (attacker.CharacterInfo.ActiveShipSkillTargetId != targetSession.CharacterId)
                    continue;
                Fight.StopCurrentShipSkill(attacker, true);
                Fight.SendShipSkillStatus(attacker);
            }
        }

        public static void InterruptVenomOnTarget(Session targetSession, MapInstance instance)
        {
            if (targetSession == null || targetSession.CharacterInfo == null || instance == null)
                return;
            foreach (MapActor key in instance.GetActorSnapshot())
            {
                if (key.Type != MapActorType.UserCharacter)
                    continue;
                Session attacker = SessionManager.GetSessionById(key.ReferenceSessionId);
                if (attacker == null || attacker.CharacterInfo == null)
                    continue;
                if (attacker.CharacterId == targetSession.CharacterId)
                    continue;
                if (attacker.CharacterInfo.ActiveShipSkillType != 5)
                    continue;
                if (attacker.CharacterInfo.ActiveShipSkillTargetId != targetSession.CharacterId)
                    continue;
                Fight.StopCurrentShipSkill(attacker, true);
                Fight.SendShipSkillStatus(attacker);
            }
        }

        private static int GetVenomDamageForPulseIndex(int pulseIndex)
        {
            int safePulseIndex = Math.Max(0, pulseIndex);
            int damage = VENOM_INITIAL_DAMAGE + safePulseIndex * VENOM_DAMAGE_STEP;
            return Math.Min(VENOM_MAX_DAMAGE, damage);
        }

        private static void ApplyDiminisherEndPenalty(Session session, MapInstance instance)
        {
            if (session == null || session.CharacterInfo == null)
                return;
            int currentShield = session.CharacterInfo.ShipShield;
            if (currentShield <= 0)
                return;

            int shieldLoss = Convert.ToInt32(Math.Round((double)currentShield * ((double)DIMINISHER_SELF_SHIELD_LOSS_PERCENT / 100.0)));
            if (shieldLoss <= 0)
                return;

            session.CharacterInfo.ShipShield = Math.Max(0, currentShield - shieldLoss);
            session.SendData(PacketComposer.Compose("A", "SHD|" + (object)session.CharacterInfo.ShipShield + "|" + (object)session.CharacterInfo.ShipMaxShield));
            session.SendData(PacketComposer.Compose(
                "A",
                "HL|1|" + (object)session.CharacterInfo.Id + "|SHD|" + (object)session.CharacterInfo.ShipShield + "|" + (object)shieldLoss
            ));

            if (instance != null)
            {
                foreach (MapActor key in instance.GetActorSnapshot())
                {
                    if (key.Type != MapActorType.UserCharacter)
                        continue;
                    Session observer = SessionManager.GetSessionById(key.ReferenceSessionId);
                    if (observer != null && observer.CharacterInfo != null && observer.CharacterInfo.SelectedPlayer == session.CharacterId)
                    {
                        observer.SendData(PacketComposer.Compose(
                            "A",
                            "HL|1|" + (object)session.CharacterInfo.Id + "|SHD|" + (object)session.CharacterInfo.ShipShield + "|" + (object)shieldLoss
                        ));
                    }
                }
                Fight.SendTargetWindowUpdate(session, instance, 0);
            }
        }

        private static void StopCurrentShipSkill(Session session, bool broadcastRemovalPackets)
        {
            if (session == null || session.CharacterInfo == null)
                return;
            int activeSkillType = session.CharacterInfo.ActiveShipSkillType;
            int activeTargetId = session.CharacterInfo.ActiveShipSkillTargetId;
            bool hadSpeedSkill = Fight.DoesShipSkillAffectSpeed(activeSkillType);
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(session.CurrentMapId);
            if (broadcastRemovalPackets && activeSkillType > 0 && instanceByMapId != null)
            {
                List<int> targetIds = new List<int>();
                if (activeTargetId != 0)
                    targetIds.Add(activeTargetId);
                Fight.BroadcastShipSkillPacket(instanceByMapId, "D", activeSkillType, session.CharacterId, targetIds);
                Fight.BroadcastShipSkillPacket(instanceByMapId, "R", activeSkillType, session.CharacterId, null);
            }
            if (activeSkillType == 2)
                Fight.ApplyDiminisherEndPenalty(session, instanceByMapId);
            session.CharacterInfo.ClearActiveShipSkill();
            if (hadSpeedSkill)
                Fight.RefreshShipSpeed(session);
        }

        private static void ActivateSolace(Session session, MapInstance instance)
        {
            if (session == null || session.CharacterInfo == null || instance == null)
                return;

            HashSet<int> affectedSet = new HashSet<int>();
            List<int> affectedIds = new List<int>();

            Action<Session, double> healAction = delegate (Session target, double ratio)
            {
                if (target == null || target.CharacterInfo == null)
                    return;
                if (affectedSet.Contains(target.CharacterId))
                    return;
                affectedSet.Add(target.CharacterId);
                if (target.CharacterId != session.CharacterId)
                    affectedIds.Add(target.CharacterId);

                int healValue = Convert.ToInt32(Math.Round((double)target.CharacterInfo.ShipMaxHp * ratio));
                if (healValue < 0)
                    healValue = 0;

                if (target.CharacterInfo.ShipHp + healValue > target.CharacterInfo.ShipMaxHp)
                    healValue = target.CharacterInfo.ShipMaxHp - target.CharacterInfo.ShipHp;

                if (healValue < 0)
                    healValue = 0;

                if (healValue > 0)
                {
                    target.CharacterInfo.ShipHp += healValue;
                    target.SendData(PacketComposer.Compose("A", "HPT|" + (object)target.CharacterInfo.ShipHp + "|" + (object)target.CharacterInfo.ShipMaxHp));
                    target.SendData(PacketComposer.Compose(
                        "A",
                        "HL|1|" + (object)target.CharacterId + "|HPT|" + (object)target.CharacterInfo.ShipHp + "|" + (object)healValue
                    ));
                    Fight.SendTargetWindowUpdate(target, instance, 0);
                }
            };

            healAction(session, 0.5);

            if (session.CharacterInfo.Members != null)
            {
                foreach (int id in session.CharacterInfo.Members.Keys)
                {
                    Session groupMate = SessionManager.GetSessionByCharacterId(id);
                    if (groupMate == null || groupMate.CharacterInfo == null || groupMate.CurrentMapId != session.CurrentMapId)
                        continue;
                    if (Fight.GetDistance(session, groupMate) > 700.0)
                        continue;
                    healAction(groupMate, 0.25);
                }
            }

            Fight.BroadcastShipSkillPacket(instance, "A", 1, session.CharacterId, affectedIds);
            Fight.BroadcastShipSkillPacket(instance, "R", 1, session.CharacterId, null);
            Fight.SendShipSkillStatus(session);
        }

        private static void ActivateTimedShipSkill(Session session, MapInstance instance, int skillType, int targetId)
        {
            if (session == null || session.CharacterInfo == null || instance == null || skillType <= 0)
                return;

            int durationSeconds = session.CharacterInfo.GetShipSkillDurationSeconds(skillType);
            session.CharacterInfo.ActiveShipSkillType = skillType;
            session.CharacterInfo.ActiveShipSkillTargetId = targetId;
            session.CharacterInfo.ActiveShipSkillUntil = UnixTimestamp.GetCurrent() + (double)durationSeconds;
            session.CharacterInfo.ActiveShipSkillTicksRemaining = skillType == 5 ? VENOM_TOTAL_PULSES : durationSeconds;

            if (session.CharacterInfo.ActiveShipSkillTimer != null)
            {
                session.CharacterInfo.ActiveShipSkillTimer.Dispose();
                session.CharacterInfo.ActiveShipSkillTimer = (System.Threading.Timer)null;
            }

            if (session.CharacterInfo.ActiveShipSkillTickTimer != null)
            {
                session.CharacterInfo.ActiveShipSkillTickTimer.Dispose();
                session.CharacterInfo.ActiveShipSkillTickTimer = (System.Threading.Timer)null;
            }

            List<int> targetIds = new List<int>();
            if (targetId != 0)
                targetIds.Add(targetId);

            session.SendData(PacketComposer.Compose("SD", "S|" + (object)skillType + "|2|" + (object)durationSeconds));
            Fight.BroadcastShipSkillPacket(instance, "A", skillType, session.CharacterId, targetIds);

            ShipSkillTimerContext timerContext = new ShipSkillTimerContext()
            {
                SourceId = session.CharacterId,
                SkillType = skillType,
                TargetIds = targetIds.ToArray()
            };

            if (skillType == 5)
            {
                session.CharacterInfo.ActiveShipSkillTickTimer = new System.Threading.Timer(
                    new TimerCallback(Fight.VenomTick),
                    (object)timerContext,
                    1000,
                    1000
                );

                Fight.VenomTick((object)timerContext);
            }
            else
            {
                session.CharacterInfo.ActiveShipSkillTimer = new System.Threading.Timer(
                    new TimerCallback(Fight.EndTimedShipSkill),
                    (object)timerContext,
                    durationSeconds * 1000,
                    Timeout.Infinite
                );

                if (Fight.DoesShipSkillAffectSpeed(skillType))
                    Fight.RefreshShipSpeed(session);
            }
        }

        private static void EndTimedShipSkill(object state)
        {
            try
            {
                ShipSkillTimerContext timerContext = state as ShipSkillTimerContext;
                if (timerContext == null)
                    return;

                Session session = SessionManager.GetSessionByCharacterId(timerContext.SourceId);
                if (session == null || session.CharacterInfo == null)
                    return;

                if (session.CharacterInfo.ActiveShipSkillType != timerContext.SkillType)
                    return;

                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(session.CurrentMapId);
                if (instanceByMapId != null)
                {
                    List<int> targetIds = new List<int>();
                    if (timerContext.TargetIds != null)
                    {
                        foreach (int targetId in timerContext.TargetIds)
                        {
                            if (targetId != 0)
                                targetIds.Add(targetId);
                        }
                    }
                    Fight.BroadcastShipSkillPacket(instanceByMapId, "D", timerContext.SkillType, session.CharacterId, targetIds);
                    Fight.BroadcastShipSkillPacket(instanceByMapId, "R", timerContext.SkillType, session.CharacterId, null);
                }

                if (timerContext.SkillType == 2)
                    Fight.ApplyDiminisherEndPenalty(session, instanceByMapId);

                bool hadSpeedSkill = Fight.DoesShipSkillAffectSpeed(timerContext.SkillType);
                session.CharacterInfo.ClearActiveShipSkill();
                if (hadSpeedSkill)
                    Fight.RefreshShipSpeed(session);

                Fight.SendShipSkillStatus(session);

            }
            catch (Exception ex)
            {
                LogTimerFailure("EndTimedShipSkill", ex);
            }
        }

        private static void VenomTick(object state)
        {
            try
            {
                ShipSkillTimerContext timerContext = state as ShipSkillTimerContext;
                if (timerContext == null || timerContext.TargetIds == null || timerContext.TargetIds.Length == 0)
                    return;

                Session attacker = SessionManager.GetSessionByCharacterId(timerContext.SourceId);
                if (attacker == null || attacker.CharacterInfo == null || attacker.CharacterInfo.ActiveShipSkillType != 5)
                    return;

                int targetId = timerContext.TargetIds[0];
                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(attacker.CurrentMapId);
                if (instanceByMapId == null)
                    return;

                int pulsesRemaining = attacker.CharacterInfo.ActiveShipSkillTicksRemaining;
                if (pulsesRemaining <= 0)
                {
                    Fight.StopCurrentShipSkill(attacker, true);
                    Fight.SendShipSkillStatus(attacker);
                    return;
                }

                int pulseIndex = Math.Max(0, VENOM_TOTAL_PULSES - pulsesRemaining);
                int damagePerTick = Fight.GetVenomDamageForPulseIndex(pulseIndex);

                Session target = SessionManager.GetSessionByCharacterId(targetId);
                if (target != null && target.CharacterInfo != null)
                {
                    if (target.CurrentMapId != attacker.CurrentMapId)
                    {
                        Fight.StopCurrentShipSkill(attacker, true);
                        Fight.SendShipSkillStatus(attacker);
                        return;
                    }

                    target.CharacterInfo.UpdateAttacker(attacker);

                    if (target.CharacterInfo.ShipHp - damagePerTick > 0)
                        target.CharacterInfo.ShipHp -= damagePerTick;
                    else
                    {
                        damagePerTick = target.CharacterInfo.ShipHp;
                        target.CharacterInfo.ShipHp = 0;
                    }

                    if (damagePerTick > 0)
                        target.CharacterInfo.RegisterShieldDamageReceived();

                    target.SendData(PacketComposer.Compose("A", "HPT|" + (object)target.CharacterInfo.ShipHp + "|" + (object)target.CharacterInfo.ShipMaxHp));
                    Fight.SendTargetWindowUpdate(target, instanceByMapId, damagePerTick);

                    if (attacker.CharacterInfo.ActiveShipSkillTicksRemaining > 0)
                        --attacker.CharacterInfo.ActiveShipSkillTicksRemaining;

                    if (target.CharacterInfo.ShipHp <= 0)
                    {
                        Fight.StopCurrentShipSkill(attacker, true);
                        Fight.SendShipSkillStatus(attacker);
                        Fight.KillPlayer(target);
                        return;
                    }

                    if (attacker.CharacterInfo.ActiveShipSkillTicksRemaining <= 0)
                    {
                        Fight.StopCurrentShipSkill(attacker, true);
                        Fight.SendShipSkillStatus(attacker);
                    }
                    return;
                }

                Npc npcTarget = Fight.ResolveNpcTargetById(instanceByMapId, targetId);
                if (npcTarget == null)
                {
                    Fight.StopCurrentShipSkill(attacker, true);
                    Fight.SendShipSkillStatus(attacker);
                    return;
                }

                if (Spaceball.IsSpaceballNpc(npcTarget))
                {
                    Fight.StopCurrentShipSkill(attacker, true);
                    Fight.SendShipSkillStatus(attacker);
                    return;
                }

                npcTarget.UpdateAttackers(attacker.CharacterId, damagePerTick);

                if (npcTarget.ShipHp - damagePerTick > 0)
                    npcTarget.ShipHp -= damagePerTick;
                else
                {
                    damagePerTick = npcTarget.ShipHp;
                    npcTarget.ShipHp = 0;
                }

                foreach (MapActor key in instanceByMapId.GetActorSnapshot())
                {
                    if (key.Type == MapActorType.UserCharacter)
                    {
                        Session sessionById = SessionManager.GetSessionById(key.ReferenceSessionId);
                        if (sessionById != null && sessionById.CharacterInfo != null && sessionById.CharacterInfo.SelectedPlayer == npcTarget.Id)
                        {
                            sessionById.SendData(PacketComposer.Compose(
                                "Y",
                                "0|" + (object)npcTarget.Id + "|L|" + (object)npcTarget.ShipHp + "|" + (object)npcTarget.ShipShield + "|" + (object)damagePerTick
                            ));
                        }
                    }
                }

                if (attacker.CharacterInfo.ActiveShipSkillTicksRemaining > 0)
                    --attacker.CharacterInfo.ActiveShipSkillTicksRemaining;

                if (npcTarget.ShipHp <= 0)
                {
                    Fight.StopCurrentShipSkill(attacker, true);
                    Fight.SendShipSkillStatus(attacker);
                    Fight.KillNPC(instanceByMapId, npcTarget, attacker);
                    return;
                }

                if (attacker.CharacterInfo.ActiveShipSkillTicksRemaining <= 0)
                {
                    Fight.StopCurrentShipSkill(attacker, true);
                    Fight.SendShipSkillStatus(attacker);
                }

            }
            catch (Exception ex)
            {
                LogTimerFailure("VenomTick", ex);
            }
        }

        private static void SkillDesigns(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            int skillType = Session.CharacterInfo.SkillDesignType;
            if (skillType <= 0)
            {
                Fight.SendShipSkillStatus(Session);
                return;
            }

            if (Session.CharacterInfo.ActiveShipSkillType == skillType && Session.CharacterInfo.ActiveShipSkillUntil > UnixTimestamp.GetCurrent())
            {
                Fight.SendShipSkillStatus(Session);
                return;
            }

            if (Session.CharacterInfo.GetShipSkillCooldown(skillType) > 0)
            {
                Fight.SendShipSkillStatus(Session);
                return;
            }

            int targetId = 0;
            if (skillType == 2 || skillType == 5)
            {
                Session targetPlayer = Fight.ResolveSelectedPlayerTarget(Session);
                if (targetPlayer != null)
                {
                    targetId = targetPlayer.CharacterId;
                }
                else
                {
                    Npc targetNpc = Fight.ResolveSelectedNpcTarget(Session);
                    if (targetNpc != null)
                    {
                        if (skillType == 5 && Spaceball.IsSpaceballNpc(targetNpc))
                            return;
                        targetId = targetNpc.Id;
                    }
                }

                if (targetId == 0)
                {
                    return;
                }
            }

            Fight.StopCurrentShipSkill(Session, false);

            Session.CharacterInfo.SetShipSkillLastActivation(skillType, UnixTimestamp.GetCurrent());

            int cooldownSeconds = Session.CharacterInfo.GetShipSkillCooldownSeconds(skillType);
            string cooldownCode = Session.CharacterInfo.SkillDesignCooldownCode;
            if (!string.IsNullOrEmpty(cooldownCode) && cooldownSeconds > 0)
                Session.SendData(PacketComposer.Compose("A", "CLD|" + cooldownCode + "|" + (object)cooldownSeconds));

            bool skillActivated = false;
            switch (skillType)
            {
                case 1:
                    Fight.ActivateSolace(Session, instanceByMapId);
                    skillActivated = true;
                    break;
                case 2:
                    Fight.ActivateTimedShipSkill(Session, instanceByMapId, skillType, targetId);
                    skillActivated = true;
                    break;
                case 3:
                case 4:
                case 6:
                    Fight.ActivateTimedShipSkill(Session, instanceByMapId, skillType, 0);
                    skillActivated = true;
                    break;
                case 5:
                    Fight.ActivateTimedShipSkill(Session, instanceByMapId, skillType, targetId);
                    skillActivated = true;
                    break;
                default:
                    Fight.SendShipSkillStatus(Session);
                    break;
            }

            if (skillActivated)
                Fight.PersistShipSkillCooldowns(Session);
        }

        private static void Techs(Session Session, ClientMessage Message)
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null || Session == null || Session.CharacterInfo == null)
                return;

            int nextInt = Message.GetNextInt(1);
            switch (nextInt)
            {
                case 1:
                    Fight.ActivateEnergyLeech(Session, instanceByMapId);
                    return;
                case 2:
                    Fight.ActivateChainImpulse(Session, instanceByMapId);
                    return;
                case 3:
                    Fight.ActivateRocketProbabilityMaximizer(Session, instanceByMapId);
                    return;
                case 4:
                    if (Session.CharacterInfo.CoolDownTechSh > 0)
                        return;

                    Session.SendData(PacketComposer.Compose("A", "CLD|SBU|" + (object)45));
                    Session.CharacterInfo.LastTechSh = UnixTimestamp.GetCurrent();

                    SendSessionScopedMessage(instanceByMapId, Session, PacketComposer.Compose("TX", "A|" + (object)0 + "|SBU|" + (object)Session.CharacterId + "|" + (object)TECH_SHIELD_BACKUP_VISUAL_SECONDS));

                    int num = 75000;
                    if (Session.CharacterInfo.ShipShield < Session.CharacterInfo.ShipMaxShield)
                    {
                        if (Session.CharacterInfo.ShipShield + num > Session.CharacterInfo.ShipMaxShield)
                        {
                            num = Session.CharacterInfo.ShipMaxShield - Session.CharacterInfo.ShipShield;
                            Session.CharacterInfo.ShipShield = Session.CharacterInfo.ShipMaxShield;
                        }
                        else
                        {
                            Session.CharacterInfo.ShipShield = Session.CharacterInfo.ShipShield + num;
                        }

                        Session.SendData(PacketComposer.Compose(
                            "A",
                            "HL|1|" + (object)Session.CharacterInfo.Id + "|SHD|" + (object)Session.CharacterInfo.ShipShield + "|" + (object)num
                        ));

                        foreach (MapActor key in instanceByMapId.GetActorSnapshot())
                        {
                            if (key.Type == MapActorType.UserCharacter)
                            {
                                Session sessionById = SessionManager.GetSessionById(key.ReferenceSessionId);
                                if (sessionById != null && sessionById.CharacterInfo != null && sessionById.CharacterInfo.SelectedPlayer == Session.CharacterId)
                                {
                                    sessionById.SendData(PacketComposer.Compose(
                                        "A",
                                        "HL|1|" + (object)Session.CharacterInfo.Id + "|SHD|" + (object)Session.CharacterInfo.ShipShield + "|" + (object)num
                                    ));
                                }
                            }
                        }
                    }

                    Fight.InterruptDiminisherOnTarget(Session, instanceByMapId);
                    Fight.SendTechStatus(Session);
                    return;
                case 5:
                    if (Session.CharacterInfo.CoolDownTechHp > 0)
                        return;

                    Session.SendData(PacketComposer.Compose("A", "CLD|BRB|" + (object)45));
                    Session.CharacterInfo.LastTechHp = UnixTimestamp.GetCurrent();

                    SendSessionScopedMessage(instanceByMapId, Session, PacketComposer.Compose("TX", "A|" + (object)0 + "|BRB|" + (object)Session.CharacterId + "|" + (object)8));

                    Session.CharacterInfo.BattleRepairCount = 8;
                    Session.CharacterInfo.BattleRepairTimer = new System.Threading.Timer(
                        new TimerCallback(Fight.BattleRepairTimer),
                        (object)Session,
                        0,
                        1000
                    );

                    Fight.SendTechStatus(Session);
                    return;
                default:
                    return;
            }
        }

        private static void BattleRepairTimer(object state)
        {
            try
            {
                Session session = (Session)state;
                if (session == null || session.CharacterInfo == null)
                    return;

                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(session.CurrentMapId);
                if (instanceByMapId == null)
                {
                    if (session.CharacterInfo.BattleRepairTimer == null)
                        return;

                    session.CharacterInfo.BattleRepairTimer.Dispose();
                    session.CharacterInfo.BattleRepairTimer = null;
                    Fight.SendTechStatus(session);
                    return;
                }

                int num = 10000;
                if (session.CharacterInfo.ShipHp < session.CharacterInfo.ShipMaxHp)
                {
                    if (session.CharacterInfo.ShipHp + num > session.CharacterInfo.ShipMaxHp)
                    {
                        num = session.CharacterInfo.ShipMaxHp - session.CharacterInfo.ShipHp;
                        session.CharacterInfo.ShipHp = session.CharacterInfo.ShipMaxHp;

                        SendSessionScopedMessage(instanceByMapId, session, PacketComposer.Compose("TX", "D|" + (object)0 + "|BRB|" + (object)session.CharacterId));

                        if (session.CharacterInfo.BattleRepairTimer != null)
                        {
                            session.CharacterInfo.BattleRepairTimer.Dispose();
                            session.CharacterInfo.BattleRepairTimer = null;
                        }
                        Fight.SendTechStatus(session);
                    }
                    else
                    {
                        session.CharacterInfo.ShipHp = session.CharacterInfo.ShipHp + num;
                    }

                    session.SendData(PacketComposer.Compose(
                        "A",
                        "HL|1|" + (object)session.CharacterInfo.Id + "|HPT|" + (object)session.CharacterInfo.ShipHp + "|" + (object)num
                    ));

                    foreach (MapActor key in instanceByMapId.GetActorSnapshot())
                    {
                        if (key.Type == MapActorType.UserCharacter)
                        {
                            Session sessionById = SessionManager.GetSessionById(key.ReferenceSessionId);
                            if (sessionById != null && sessionById.CharacterInfo != null && sessionById.CharacterInfo.SelectedPlayer == session.CharacterId)
                            {
                                sessionById.SendData(PacketComposer.Compose(
                                    "A",
                                    "HL|1|" + (object)session.CharacterInfo.Id + "|HPT|" + (object)session.CharacterInfo.ShipHp + "|" + (object)num
                                ));
                            }
                        }
                    }

                    --session.CharacterInfo.BattleRepairCount;
                    if (session.CharacterInfo.BattleRepairCount != 0)
                        return;

                    SendSessionScopedMessage(instanceByMapId, session, PacketComposer.Compose("TX", "D|" + (object)0 + "|BRB|" + (object)session.CharacterId));

                    if (session.CharacterInfo.BattleRepairTimer != null)
                    {
                        session.CharacterInfo.BattleRepairTimer.Dispose();
                        session.CharacterInfo.BattleRepairTimer = null;
                    }
                    Fight.SendTechStatus(session);
                }
                else
                {
                    SendSessionScopedMessage(instanceByMapId, session, PacketComposer.Compose("TX", "D|" + (object)0 + "|BRB|" + (object)session.CharacterId));

                    if (session.CharacterInfo.BattleRepairTimer != null)
                    {
                        session.CharacterInfo.BattleRepairTimer.Dispose();
                        session.CharacterInfo.BattleRepairTimer = null;
                    }
                    Fight.SendTechStatus(session);
                }

            }
            catch (Exception ex)
            {
                LogTimerFailure("BattleRepairTimer", ex);
            }
        }

        private static void SelectPlayerDecoy(Session Session, ClientMessage Message)
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("player_id", (object)Session.CharacterId);
                client.SetParameter("comment", (object)(WebUtility.HtmlEncode(Session.CharacterInfo.Username) + " : OLD CLIENT"));
                client.ExecuteNonQuery("INSERT INTO swf_hacker(player_id, comment) VALUES (@player_id, @comment)");
            }

            Fight.SelectPlayer(Session, Message);
        }

        private static void SelectPlayer(Session Session, ClientMessage Message)
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            int nextInt = Message.GetNextInt(1);

            if (instanceByMapId.GetActorByReferenceId(nextInt, MapActorType.AiBot) != null)
            {
                if (Session.CharacterInfo.SelectedPlayer != nextInt)
                {
                    if (Session.CharacterInfo.LaserAttackTimer != null)
                        Session.CharacterInfo.LaserAttackTimer.Dispose();

                    Session.CharacterInfo.SelectedPlayer = nextInt;

                    if (Session.CharacterInfo.Attacking)
                        Fight.StopLaserAttack(Session, Message);
                }

                Npc referenceObject = (Npc)instanceByMapId.GetActorByReferenceId(nextInt, MapActorType.AiBot).ReferenceObject;
                if (referenceObject == null)
                    return;

                if (!CanSessionAttackNpc(Session, referenceObject))
                {
                    Session.CharacterInfo.SelectedPlayer = 0;
                    Session.SendData(PacketComposer.Compose("N", "-1"));
                    return;
                }

                Session.SendData(PacketComposer.Compose(
                    "N",
                    referenceObject.Id.ToString() + "|" +
                    referenceObject.Name + "|" +
                    (object)referenceObject.ShipShield + "|" +
                    (object)referenceObject.ShipMaxShield + "|" +
                    (object)referenceObject.ShipHp + "|" +
                    (object)referenceObject.ShipMaxHp
                ));

                Fight.SendNpcTargetOwnershipVisual(Session, referenceObject);

            }
            else
            {
                MapActor actorByReferenceId = instanceByMapId.GetActorByReferenceId(nextInt, MapActorType.UserCharacter);
                if (actorByReferenceId == null)
                    return;

                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(actorByReferenceId.ReferenceId);
                if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo == null)
                    return;

                if (IsSessionInGalaxyGate(Session) || IsSessionInGalaxyGate(sessionByCharacterId))
                {
                    Session.CharacterInfo.SelectedPlayer = 0;
                    Session.SendData(PacketComposer.Compose("N", "-1"));
                    return;
                }

                if (UnixTimestamp.GetCurrent() - sessionByCharacterId.CharacterInfo.LastEMP <= 2.0)
                    return;

                if (Session.CharacterInfo.SelectedPlayer != nextInt)
                {
                    if (Session.CharacterInfo.LaserAttackTimer != null)
                        Session.CharacterInfo.LaserAttackTimer.Dispose();

                    Session.CharacterInfo.SelectedPlayer = nextInt;

                    if (Session.CharacterInfo.Attacking)
                        Fight.StopLaserAttack(Session, Message);
                }

                Session.SendData(FightSelectPlayerComposer.Compose(sessionByCharacterId.CharacterInfo));

                Fight.SendPlayerTargetOwnershipVisual(Session, sessionByCharacterId);
            }
        }

        private static bool IsRsbReady(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return false;

            double last = session.CharacterInfo.LastRSB75;
            if (last <= 0.0)
                return true;

            double elapsed = DateTime.Now.TimeOfDay.TotalMilliseconds - last;
            return elapsed < 0.0 || elapsed >= RSB_COOLDOWN_MS;
        }

        private static void StartRsbCooldown(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            session.CharacterInfo.LastRSB75 = DateTime.Now.TimeOfDay.TotalMilliseconds;
            session.SendData(PacketComposer.Compose("A", "CLD|RSB|3"));
        }

        private static bool PlayerCanAttack(Session Player, Session Ennemy)
        {
            if (Player == null || Ennemy == null || Player.CharacterInfo == null || Ennemy.CharacterInfo == null)
                return false;

            if (Player.CharacterInfo.Id == Ennemy.CharacterInfo.Id)
                return false;

            if (_1v1.IsOnMap(Player.CharacterInfo.MapId) || _1v1.IsOnMap(Ennemy.CharacterInfo.MapId))
            {
                if (Player.CharacterInfo.MapId != Ennemy.CharacterInfo.MapId)
                    return false;

                if (!_1v1.AreOpponents(Player.CharacterId, Ennemy.CharacterId, Player.CharacterInfo.MapId))
                    return false;

                return _1v1.isSafeBattle(Player.CharacterInfo.MapId) != true;
            }

            if ((Player.CharacterInfo.Members != null && Player.CharacterInfo.Members.Contains(Ennemy.CharacterInfo.Id))
                || (Ennemy.CharacterInfo.Members != null && Ennemy.CharacterInfo.Members.Contains(Player.CharacterInfo.Id)))
                return false;

            if (IsSessionInGalaxyGate(Player) || IsSessionInGalaxyGate(Ennemy))
                return false;

            if (Player.CharacterInfo.MapId == 83)
                return TeamDeathMatch.SafeBattle() != true;

            if (Ennemy.CharacterInfo.PeaceZone
                || Player.CharacterInfo.MapId == 80 && Survivor.Active && Survivor.SafeBattle
                || Player.CharacterInfo.MapId == 81 && Invasion.Active && Invasion.SafeBattle)
            {
                return false;
            }

            if (Player.CharacterInfo.FactionId != Ennemy.CharacterInfo.FactionId
                || (Player.CharacterInfo.ClanWar.Contains(Ennemy.CharacterInfo.ClanId)
                    || Ennemy.CharacterInfo.ClanWar.Contains(Player.CharacterInfo.ClanId)))
            {
                return true;
            }

            if (Player.CharacterInfo.MapId == 1 || Player.CharacterInfo.MapId == 2)
                return Player.CharacterInfo.FactionId != 1;

            if (Player.CharacterInfo.MapId == 5 || Player.CharacterInfo.MapId == 6)
                return Player.CharacterInfo.FactionId != 2;

            return Player.CharacterInfo.MapId != 9 && Player.CharacterInfo.MapId != 10
                || Player.CharacterInfo.FactionId != 3;
        }

        private static void SelectAmmo(Session Session, ClientMessage Message)
        {
            int result;
            if (!int.TryParse(Message.GetNextString(1), out result))
                return;

            if (new CList<int>() { 1, 2, 3, 4, 5, 6 }.Contains(result))
            {
                if (result == 6)
                {
                    if (!Fight.IsRsbReady(Session))
                        return;

                    MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
                    if (instanceByMapId == null)
                        return;

                    if (instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.AiBot) != null)
                    {
                        Npc referenceObject = (Npc)instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.AiBot).ReferenceObject;
                        if (referenceObject == null)
                            return;

                        if (Fight.GetDistanceNpc(Session, referenceObject) >= RANGE_LASER)
                            return;

                        Fight.AttackNpc(instanceByMapId, Session, referenceObject, result);

                        if (Session.CharacterInfo.Invisible == 1)
                        {
                            Session.CharacterInfo.Invisible = 0;
                            SendSessionScopedMessage(instanceByMapId, Session, PacketComposer.Compose("n", "INV|" + (object)Session.CharacterInfo.Id + "|" + (object)0));
                        }
                    }
                    else
                    {
                        if (instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.UserCharacter) == null)
                            return;

                        MapActor actorByReferenceId = instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.UserCharacter);
                        if (actorByReferenceId == null)
                            return;

                        Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(actorByReferenceId.ReferenceId);
                        if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo == null)
                            return;

                        if (!Fight.PlayerCanAttack(Session, sessionByCharacterId) || Fight.GetDistance(Session, sessionByCharacterId) >= RANGE_LASER)
                            return;

                        Fight.AttackPlayer(instanceByMapId, Session, sessionByCharacterId, result);

                        if (Session.CharacterInfo.Invisible == 1)
                        {
                            Session.CharacterInfo.Invisible = 0;
                            SendSessionScopedMessage(instanceByMapId, Session, PacketComposer.Compose("n", "INV|" + (object)Session.CharacterInfo.Id + "|" + (object)0));
                        }
                    }
                }
                else
                {
                    Session.CharacterInfo.SelectedAmmo = result;
                }
            }
        }

        private static void SelectRocket(Session Session, ClientMessage Message)
        {
            int result;
            if (!int.TryParse(Message.GetNextString(1), out result))
                return;

            if (new CList<int>() { 1, 2, 3, 10 }.Contains(result))
            {
                Session.CharacterInfo.SelectedRocket = result;

                if (result != 10)
                {
                    Session.CharacterInfo.SelectedRocketAuto = result;
                }
                else if (Session.CharacterInfo.SelectedRocketAuto <= 0)
                {
                    Session.CharacterInfo.SelectedRocketAuto = 1;
                }

                Session.SendData(PacketComposer.Compose("7", "SELECTED_ROCKET|" + result.ToString()));
            }
        }


        public static void TryStartAutoRocket(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null || !Session.Authenticated)
                return;

            if (!Session.CharacterInfo.Attacking)
                return;

            if (Session.CharacterInfo.AutoRocketSkill != 1 || !Session.CharacterInfo.HasAutoRocketCpu)
                return;

            if (Session.CharacterInfo.ActiveAutoRocket)
                return;

            Session.CharacterInfo.ActiveAutoRocket = true;
            AutoRocket(Session, null);
        }

        public static void TryStartAutoRocketLauncher(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null || !Session.Authenticated)
                return;

            RocketLauncherRuntimeState state = GetRocketLauncherState(Session);
            if (state == null)
                return;

            bool shouldReload = false;
            bool shouldFire = false;
            lock (state.SyncRoot)
            {
                RefreshRocketLauncherState(Session, state);
                int capacity = GetRocketLauncherCapacity(state.LauncherType);
                if (!Session.CharacterInfo.HasRocketLauncherCpu
                    || !state.AutoCpuEnabled
                    || !Session.CharacterInfo.Attacking
                    || capacity <= 0)
                {
                    return;
                }

                if (state.LoadedCount > 0)
                {
                    bool hasMoreAmmo = Session.CharacterInfo.HasLauncherRocketAmmo(state.SelectedRocketId, 1);
                    shouldFire = state.LoadedCount >= capacity || !hasMoreAmmo;
                }
                else if (state.ReloadTimer == null)
                {
                    shouldReload = true;
                }
            }

            if (shouldFire)
                FireRocketLauncher(Session);
            else if (shouldReload)
                BeginRocketLauncherReload(Session);
        }

        private static async void AutoRocket(Session Session, ClientMessage Message)
        {
            if (Session == null
                || Session.CharacterInfo == null
                || !Session.Authenticated)
            {
                return;
            }

            if (Session.CharacterInfo.AutoRocketSkill != 1 || !Session.CharacterInfo.HasAutoRocketCpu)
            {
                Session.CharacterInfo.ActiveAutoRocket = false;
                return;
            }

            if (Session.CharacterInfo.SelectedRocket <= 0)
            {
                Session.CharacterInfo.ActiveAutoRocket = false;
                return;
            }

            if (!Session.CharacterInfo.ActiveAutoRocket)
                return;

            if (Session.CharacterInfo.Attacking == true)
            {
                RocketAttack(Session, Message);
                await Task.Delay(2100);
                AutoRocket(Session, Message);
                return;
            }

            await Task.Delay(1500);
            AutoRocket(Session, Message);
        }

        private static void RocketAttack(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null || !Session.Authenticated)
                return;

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
            {
                return;
            }

            bool isAutoRocketCall = (Message == null && Session.CharacterInfo.ActiveAutoRocket && Session.CharacterInfo.AutoRocketSkill == 1);

            int rocketId = isAutoRocketCall ? Session.CharacterInfo.SelectedRocketAuto : Session.CharacterInfo.SelectedRocket;
            if (isAutoRocketCall && rocketId == 10) rocketId = 1;
            if (rocketId <= 0)
            {
                return;
            }
            int rocketSmokePattern = ResolveRocketSmokePattern(Session, rocketId);
            int rocketPrecisionFlag = IsPrecisionTargeterRocketGuided(Session, rocketId) ? 1 : 0;

            bool isManualDcr250 = !isAutoRocketCall && rocketId == 10;
            if (!isManualDcr250 && UnixTimestamp.GetCurrent() - Session.CharacterInfo.LastRocket < 2.0)
                return;

            if (Session.CharacterInfo.SelectedPlayer == 0)
                return;

            if (rocketId == 10)
            {
                double now = UnixTimestamp.GetCurrent();
                double elapsed = now - Session.CharacterInfo.LastDcr250;
                if (elapsed < 240.0)
                {
                    int remaining = (int)Math.Ceiling(240.0 - elapsed);
                    if (remaining < 0) remaining = 0;
                    Session.SendData(PacketComposer.Compose("A", "CLD|DCR|" + remaining.ToString()));
                    return;
                }
            }

            Session.CharacterInfo.NoFightTimer = 0;
            Session.CharacterInfo.PeaceZone = false;
            Session.CharacterInfo.TradeZone = false;

            ShipMovement.SendPeacePortalInfos(Session);

            MapActor actorByReferenceId1 = instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.AiBot);
            if (actorByReferenceId1 != null)
            {
                Npc referenceObject = (Npc)actorByReferenceId1.ReferenceObject;

                if (referenceObject == null || referenceObject.IsDestroying || !CanSessionAttackNpc(Session, referenceObject) || Fight.GetDistanceNpc(Session, referenceObject) >= RANGE_ROCKET)
                    return;

                if (Session.CharacterInfo.Invisible == 1)
                {
                    Session.CharacterInfo.Invisible = 0;
                    SendSessionScopedMessage(instanceByMapId, Session, PacketComposer.Compose("n", "INV|" + (object)Session.CharacterInfo.Id + "|" + (object)0));
                }

                if (!Session.CharacterInfo.TryConsumeRocketAmmo(rocketId))
                {
                    Session.CharacterInfo.ActiveAutoRocket = false;

                    Session.SendData(PacketComposer.Compose("W", "R|0|0"));

                    Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));
                    return;
                }
                Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));

                referenceObject.UpdateAttackers(Session.CharacterId, 0);

                Session.CharacterInfo.SelectedPlayerRocket = Session.CharacterInfo.SelectedPlayer;
                Session.CharacterInfo.SelectedPlayerRocketSpawnSeq = referenceObject.SpawnSeq;

                SendNpcScopedMessage(instanceByMapId, referenceObject, PacketComposer.Compose(
                    "v",
                    Session.CharacterId.ToString() + "|" + (object)referenceObject.Id + "|H|" + (object)rocketId + "|" + (object)rocketSmokePattern + "|" + (object)rocketPrecisionFlag
                ), Session);

                Session.CharacterInfo.LastRocketShotType = rocketId;

                if (isManualDcr250)
                {
                    Session.CharacterInfo.LastDcr250 = UnixTimestamp.GetCurrent();
                    Session.SendData(PacketComposer.Compose("A", "CLD|DCR|240"));
                }
                else
                {
                    Session.SendData(PacketComposer.Compose("A", "CLD|ROK|2"));
                    Session.CharacterInfo.LastRocket = UnixTimestamp.GetCurrent();
                }

                RocketAttackContext context = new RocketAttackContext();
                context.Attacker = Session;
                context.MapId = Session.CurrentMapId;
                context.TargetId = referenceObject.Id;
                context.TargetIsNpc = true;
                context.TargetSpawnSeq = referenceObject.SpawnSeq;
                context.RocketId = rocketId;
                context.Timer = new System.Threading.Timer(
                    new TimerCallback(Fight.EffectRocket),
                    (object)context,
                    1000,
                    System.Threading.Timeout.Infinite
                );
                Session.CharacterInfo.RocketAttackTimer = context.Timer;
            }
            else
            {
                MapActor actorByReferenceId2 = instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.UserCharacter);
                if (actorByReferenceId2 == null)
                    return;

                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(actorByReferenceId2.ReferenceId);
                if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo == null)
                    return;

                if (!Fight.PlayerCanAttack(Session, sessionByCharacterId)
                    || sessionByCharacterId.CharacterInfo.PeaceZone
                    || Fight.GetDistance(Session, sessionByCharacterId) >= RANGE_ROCKET)
                {
                    return;
                }

                if (Session.CharacterInfo.Invisible == 1)
                {
                    Session.CharacterInfo.Invisible = 0;
                    SendSessionScopedMessage(instanceByMapId, Session, PacketComposer.Compose("n", "INV|" + (object)Session.CharacterInfo.Id + "|" + (object)0));
                }

                if (!Session.CharacterInfo.TryConsumeRocketAmmo(rocketId))
                {
                    Session.CharacterInfo.ActiveAutoRocket = false;

                    Session.SendData(PacketComposer.Compose("W", "R|0|0"));

                    Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));
                    return;
                }
                Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));


                Session.CharacterInfo.SelectedPlayerRocket = Session.CharacterInfo.SelectedPlayer;
                Session.CharacterInfo.SelectedPlayerRocketSpawnSeq = 0;

                SendPlayerScopedCombatMessage(instanceByMapId, Session, sessionByCharacterId, PacketComposer.Compose(
                    "v",
                    Session.CharacterId.ToString() + "|" + (object)sessionByCharacterId.CharacterId + "|H|" + (object)rocketId + "|" + (object)rocketSmokePattern + "|" + (object)rocketPrecisionFlag
                ));

                Session.CharacterInfo.LastRocketShotType = rocketId;

                if (isManualDcr250)
                {
                    Session.CharacterInfo.LastDcr250 = UnixTimestamp.GetCurrent();
                    Session.SendData(PacketComposer.Compose("A", "CLD|DCR|240"));
                }
                else
                {
                    Session.SendData(PacketComposer.Compose("A", "CLD|ROK|2"));
                    Session.CharacterInfo.LastRocket = UnixTimestamp.GetCurrent();
                }

                RocketAttackContext context = new RocketAttackContext();
                context.Attacker = Session;
                context.MapId = Session.CurrentMapId;
                context.TargetId = sessionByCharacterId.CharacterId;
                context.TargetIsNpc = false;
                context.TargetSpawnSeq = 0;
                context.RocketId = rocketId;
                context.Timer = new System.Threading.Timer(
                    new TimerCallback(Fight.EffectRocket),
                    (object)context,
                    1000,
                    System.Threading.Timeout.Infinite
                );
                Session.CharacterInfo.RocketAttackTimer = context.Timer;
            }
        }

        private static void EffectRocket(object state)
        {
            try
            {
                RocketAttackContext context = state as RocketAttackContext;
                Session session = context != null ? context.Attacker : (Session)state;
                if (session == null || session.CharacterInfo == null || !session.Authenticated)
                    return;

                try
                {
                    if (context != null && context.Timer != null)
                    {
                        System.Threading.Timer timer = context.Timer;
                        timer.Dispose();
                        context.Timer = null;
                        if (session.CharacterInfo.RocketAttackTimer == timer)
                            session.CharacterInfo.RocketAttackTimer = null;
                    }
                    else if (session.CharacterInfo.RocketAttackTimer != null)
                    {
                        session.CharacterInfo.RocketAttackTimer.Dispose();
                        session.CharacterInfo.RocketAttackTimer = null;
                    }
                }
                catch
                {
                }

                int mapId = context != null ? context.MapId : session.CurrentMapId;
                if (session.CurrentMapId != mapId)
                    return;

                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(mapId);
                if (instanceByMapId == null)
                    return;

                int rocketId = context != null ? context.RocketId : session.CharacterInfo.LastRocketShotType;
                if (rocketId <= 0)
                    rocketId = session.CharacterInfo.SelectedRocket;

                Random rng = session.CharacterInfo.RandomDamage ?? new Random();
                int baseDamage = GetBaseRocketDamage(session.CharacterInfo.RckDamages, rocketId);

                int damage;
                if (rocketId == 10)
                    damage = 0;
                else
                {
                    damage = Math.Max(0, baseDamage + rng.Next(-200, 200));
                    damage = session.CharacterInfo.ApplyPilotBioNormalRocketDamageBonus(rocketId, damage);
                }

                int targetId = context != null ? context.TargetId : session.CharacterInfo.SelectedPlayerRocket;
                int targetSpawnSeq = context != null ? context.TargetSpawnSeq : session.CharacterInfo.SelectedPlayerRocketSpawnSeq;

                MapActor actorNpc = context == null || context.TargetIsNpc
                    ? instanceByMapId.GetActorByReferenceId(targetId, MapActorType.AiBot)
                    : null;
                if (actorNpc != null)
                {
                    Npc npc = (Npc)actorNpc.ReferenceObject;
                    if (npc == null || npc.IsDestroying || !CanSessionAttackNpc(session, npc))
                        return;

                    if (npc.SpawnSeq != targetSpawnSeq)
                        return;

                    if (session.CharacterInfo.LabInfos != null && session.CharacterInfo.LabInfos.Rocket[1] > 0)
                    {
                        if (session.CharacterInfo.LabInfos.Rocket[0] == 11)
                            damage = (int)(damage * 1.05);
                        else if (session.CharacterInfo.LabInfos.Rocket[0] == 13)
                            damage = (int)(damage * 1.3);
                        else if (session.CharacterInfo.LabInfos.Rocket[0] == 14)
                            damage = (int)(damage * 1.6);

                        --session.CharacterInfo.LabInfos.Rocket[1];
                        ++session.CharacterInfo.LabInfos.Update;

                        if (session.CharacterInfo.LabInfos.Update > 8)
                            session.CharacterInfo.UpdateLaserRocketReff();
                    }

                    if (IsNormalDirectDamageRocket(rocketId) && !IsPrecisionTargeterRocketGuided(session, rocketId) && !Fight.RollPlayerRocketHit(session, null, rocketId))
                    {
                        SendMissToNpcTarget(instanceByMapId, session, npc);
                        return;
                    }

                    if (npc.ShipId == 442)
                    {
                        if (session.CharacterInfo.SelectedAmmo == 5)
                            return;

                        Spaceball.DoDamage(damage, session.CharacterInfo.FactionId);
                    }
                    else
                    {
                        ApplyDamageToNpc(session, npc, damage, instanceByMapId);
                    }

                    return;
                }

                MapActor actorPlayer = context == null || !context.TargetIsNpc
                    ? instanceByMapId.GetActorByReferenceId(targetId, MapActorType.UserCharacter)
                    : null;
                if (actorPlayer == null)
                    return;

                Session targetSession = SessionManager.GetSessionByCharacterId(actorPlayer.ReferenceId);
                if (targetSession == null || targetSession.CharacterInfo == null || !PlayerCanAttack(session, targetSession))
                    return;

                if (targetSession.CharacterInfo.ActiveISH || targetSession.CharacterInfo.PeaceZone)
                    return;

                if (rocketId == 10)
                {
                    ApplyDCR250Effect(targetSession);
                }

                if (session.CharacterInfo.LabInfos != null && session.CharacterInfo.LabInfos.Rocket[1] > 0)
                {
                    if (session.CharacterInfo.LabInfos.Rocket[0] == 11)
                        damage = (int)(damage * 1.05);
                    else if (session.CharacterInfo.LabInfos.Rocket[0] == 13)
                        damage = (int)(damage * 1.3);
                    else if (session.CharacterInfo.LabInfos.Rocket[0] == 14)
                        damage = (int)(damage * 1.6);

                    --session.CharacterInfo.LabInfos.Rocket[1];
                    ++session.CharacterInfo.LabInfos.Update;

                    if (session.CharacterInfo.LabInfos.Update > 8)
                        session.CharacterInfo.UpdateLaserRocketReff();
                }

                if (IsNormalDirectDamageRocket(rocketId) && !IsPrecisionTargeterRocketGuided(session, rocketId) && !Fight.RollPlayerRocketHit(session, targetSession, rocketId))
                {
                    SendMissToPlayerTarget(instanceByMapId, session, targetSession);
                    return;
                }

                ApplyDamageToPlayer(session, targetSession, damage, instanceByMapId);
            }
            catch (Exception ex)
            {
                LogTimerFailure("EffectRocket", ex);
            }
        }

        private static void StopLaserAttack(Session Session, ClientMessage Message)
        {
            int result = 0;

            if (!int.TryParse(Message.GetNextString(1), out result))
                Fight.StopLaser(Session, null);
            else
            {
                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(result);
                Fight.StopLaser(Session, sessionByCharacterId, false);
            }
        }

        public static void CanAttack(object state)
        {
            try
            {
                Session session = (Session)state;
                if (session == null || session.CharacterInfo == null)
                    return;

                session.CharacterInfo.CanLaserAttack = true;

            }
            catch (Exception ex)
            {
                LogTimerFailure("CanAttack", ex);
            }
        }

        private static void LaserAttack(Session Session, ClientMessage Message)
        {
            if (Session.CharacterInfo == null)
                return;

            if (Session.CharacterInfo.Invincible)
            {
                Session.CharacterInfo.Invincible = false;
                Session.SendData(PacketComposer.Compose("n", "fx|end|INVINCIBILITY|" + Session.CharacterId));

                if (Session.CharacterInfo.InvincibilityTimer != null)
                {
                    Session.CharacterInfo.InvincibilityTimer.Dispose();
                    Session.CharacterInfo.InvincibilityTimer = null;
                }
            }

            if (Session.IsChat)
            {
                Chat.SendMessage(Session, Message);
                return;
            }

            if (Session.CharacterInfo.LaserAttackTimer != null)
                Session.CharacterInfo.LaserAttackTimer.Dispose();

            Session.CharacterInfo.Attacking = false;

            if (!Session.CharacterInfo.CanLaserAttack)
                return;

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            if (Session.CharacterInfo.SelectedPlayer == 0)
                return;

            Session.CharacterInfo.NoFightTimer = 0;
            Session.CharacterInfo.PeaceZone = false;
            Session.CharacterInfo.TradeZone = false;

            ShipMovement.SendPeacePortalInfos(Session);

            MapActor actorByReferenceId1 = instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.AiBot);
            bool npc = true;
            object referenceObject = null;

            if (actorByReferenceId1 != null)
            {
                referenceObject = (Npc)actorByReferenceId1.ReferenceObject;
                if (referenceObject == null)
                    return;

            }
            else
            {
                if (!PvpManager.PvpEnabled)
                    return;

                MapActor actorByReferenceId2 = instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.UserCharacter);
                if (actorByReferenceId2 == null)
                    return;

                referenceObject = SessionManager.GetSessionByCharacterId(actorByReferenceId2.ReferenceId);
                if (referenceObject == null
                    || ((Session)referenceObject).CharacterInfo == null
                    || !Fight.PlayerCanAttack(Session, (Session)referenceObject))
                {
                    return;
                }

                npc = false;
            }

            Session.CharacterInfo.Attacking = true;

            Fight.BroadcastLockIntent(instanceByMapId, Session);

            if (npc)
            {
                Npc n = (Npc)referenceObject;
                Session.SendData(PacketComposer.Compose("N", n.Id.ToString() + "|" + n.Name + "|" + n.ShipShield + "|" + n.ShipMaxShield + "|" + n.ShipHp + "|" + n.ShipMaxHp));
                Fight.SendNpcTargetOwnershipVisual(Session, n);
            }
            else
            {
                Session p = (Session)referenceObject;
                Session.SendData(FightSelectPlayerComposer.Compose(p.CharacterInfo));
                Fight.SendPlayerTargetOwnershipVisual(Session, p);
            }


            if (!npc)
            {
                lock (((Session)referenceObject).CharacterInfo.Attacked)
                {
                    if (!((Session)referenceObject).CharacterInfo.Attacked.Contains(Session))
                        ((Session)referenceObject).CharacterInfo.Attacked.Add(Session);
                }
            }

            if (Session.CharacterInfo.Invisible == 1)
                Fight.RemoveCloack(Session, instanceByMapId);

            double wait = DateTime.Now.TimeOfDay.TotalMilliseconds - Session.CharacterInfo.PreviousDamageTime;

            if (Session.CharacterInfo.PreviousDamageTime <= 0 || wait >= Session.CharacterInfo.AttackSpeed || wait < 0)
                wait = 0;
            else
            {
                double remainingWait = Session.CharacterInfo.AttackSpeed - wait;
                if (Fight.CanSendFacticeLaserAttack(Session, remainingWait))
                    Fight.FacticeLaserAttack(Session);
                wait = remainingWait;
            }

            Session.CharacterInfo.LaserAttackTimer = new System.Threading.Timer(
                new TimerCallback(Fight.LaserAttackTimer),
                (object)Session,
                (int)wait,
                Session.CharacterInfo.AttackSpeed
            );

            if (Session.CharacterInfo.AutoRocketSkill == 1 && Session.CharacterInfo.HasAutoRocketCpu)
            {
                Fight.TryStartAutoRocket(Session);
            }

            Fight.TryStartAutoRocketLauncher(Session);

            Session.CharacterInfo.LaserAttackCanTimer = new System.Threading.Timer(new TimerCallback(Fight.CanAttack), (object)Session, 0, 0);
        }

        private static bool CanSendFacticeLaserAttack(Session session, double remainingWait)
        {
            if (session == null || session.CharacterInfo == null)
                return false;

            if (remainingWait <= FACTICE_LASER_MIN_REMAINING_WAIT_MS)
                return false;

            double now = DateTime.Now.TimeOfDay.TotalMilliseconds;

            lock (FacticeLaserVisualTimesSync)
            {
                double last;
                if (FacticeLaserVisualTimes.TryGetValue(session.CharacterId, out last))
                {
                    double elapsed = now - last;
                    if (elapsed >= 0.0 && elapsed < FACTICE_LASER_VISUAL_THROTTLE_MS)
                        return false;
                }

                FacticeLaserVisualTimes[session.CharacterId] = now;
            }

            return true;
        }

        private static void RemoveCloack(Session session, MapInstance instanceByMapId)
        {
            session.CharacterInfo.Invisible = 0;
            SendSessionScopedMessage(instanceByMapId, session, PacketComposer.Compose("n", "INV|" + (object)session.CharacterInfo.Id + "|" + (object)0));
        }

        private static void FacticeLaserAttack(object attacker)
        {
            Session Session = (Session)attacker;
            if (Session == null || Session.CharacterInfo == null)
                return;

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            if (Session.CharacterInfo.SelectedPlayer == 0)
                return;

            MapActor actorByReferenceId = instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.AiBot);
            if (actorByReferenceId != null)
            {
                Npc referenceObject = (Npc)actorByReferenceId.ReferenceObject;
                if (referenceObject == null || referenceObject.IsDestroying)
                    return;

                Fight.AttackNpc(instanceByMapId, Session, referenceObject, Session.CharacterInfo.SelectedAmmo, false);
            }
            else if (Session.CharacterInfo.MapId == 80 && Survivor.Active && Survivor.SafeBattle)
            {
                return;
            }
            else if (Session.CharacterInfo.MapId == 81 && Invasion.Active && Invasion.SafeBattle)
            {
                return;
            }
            else
            {
                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(Session.CharacterInfo.SelectedPlayer);
                if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo == null || Session.CurrentMapId != sessionByCharacterId.CurrentMapId)
                    return;
                else if (sessionByCharacterId.CharacterInfo.PeaceZone)
                    return;
                else
                    Fight.AttackPlayer(instanceByMapId, Session, sessionByCharacterId, Session.CharacterInfo.SelectedAmmo, false);
            }
        }

        private static void LaserAttackTimer(object attacker)
        {
            try
            {
                Session Session = (Session)attacker;
                if (Session == null || Session.CharacterInfo == null)
                    return;

                if (!Session.CharacterInfo.TryEnterLaserAttackTick())
                    return;

                try
                {
                    MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
                    if (instanceByMapId == null)
                        return;

                    if (Session.CharacterInfo.SelectedPlayer == 0)
                    {
                        Fight.StopLaser(Session, null);
                        return;
                    }

                    Fight.TryStartAutoRocketLauncher(Session);

                    MapActor actorByReferenceId = instanceByMapId.GetActorByReferenceId(Session.CharacterInfo.SelectedPlayer, MapActorType.AiBot);
                    if (actorByReferenceId != null)
                    {
                        Npc referenceObject = (Npc)actorByReferenceId.ReferenceObject;
                        if (referenceObject == null)
                        {
                            Fight.StopLaser(Session, null);
                            return;
                        }

                        if (referenceObject.IsDestroying)
                        {
                            Fight.StopLaser(Session, null);
                            return;
                        }

                        Fight.AttackNpc(instanceByMapId, Session, referenceObject, Session.CharacterInfo.SelectedAmmo);
                    }
                    else if (Session.CharacterInfo.MapId == 80 && Survivor.Active && Survivor.SafeBattle)
                    {
                        Fight.StopLaser(Session, null, false);
                    }
                    else if (Session.CharacterInfo.MapId == 81 && Invasion.Active && Invasion.SafeBattle)
                    {
                        Fight.StopLaser(Session, null, false);
                    }
                    else
                    {
                        Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(Session.CharacterInfo.SelectedPlayer);
                        if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo == null || Session.CurrentMapId != sessionByCharacterId.CurrentMapId)
                        {
                            Fight.StopLaser(Session, sessionByCharacterId);
                        }
                        else if (sessionByCharacterId.CharacterInfo.PeaceZone)
                        {
                            Fight.StopLaser(Session, sessionByCharacterId);
                        }
                        else
                        {
                            Fight.AttackPlayer(instanceByMapId, Session, sessionByCharacterId, Session.CharacterInfo.SelectedAmmo);
                        }
                    }
                }
                finally
                {
                    if (Session != null && Session.CharacterInfo != null)
                        Session.CharacterInfo.ExitLaserAttackTick();
                }

            }
            catch (Exception ex)
            {
                LogTimerFailure("LaserAttackTimer", ex);
            }
        }

        private static void Unlock(Session session)
        {
            session.CharacterInfo.SelectedPlayer = 0;
            session.SendData(PacketComposer.Compose("N", "-1"));
        }

        private static void ResyncMap45BossCubikonOnOutOfRange(MapInstance instance, Session session, Npc npc)
        {
            if (instance == null || session == null || npc == null)
                return;
            if (!NpcAI.IsMap45BossCubikon(npc.Name, npc.MapId))
                return;

            ShipMovement.ResyncNpcLifecycleCreate(session, instance, npc);
        }

        private static void AttackNpc(MapInstance Instance, Session Session, Npc Npc, int Ammo, bool damage = true)
        {
            if (Session == null || Session.CharacterInfo == null || Npc == null || !CanSessionAttackNpc(Session, Npc))
            {
                if (Session != null)
                    Fight.StopLaser(Session, null, false);
                return;
            }

            double distanceNpc = Fight.GetDistanceNpc(Session, Npc);

            if (distanceNpc <= RANGE_LASER && Session.CharacterInfo.OutOfRange)
            {
                Session.CharacterInfo.OutOfRange = false;
                Session.SendData(PacketComposer.Compose("X", ""));
            }

            if (distanceNpc <= RANGE_LASER && !Session.CharacterInfo.OutOfRange)
            {
                if (damage)
                {
                    if (Npc != null && Npc.ShipId == 442 && Ammo == 5)
                        return;

                    if (Ammo == 6 && !Fight.IsRsbReady(Session))
                        return;

                    if (!Session.CharacterInfo.TryConsumeLaserAmmo(Ammo))
                    {
                        Fight.StopLaser(Session, null, false);

                        Session.SendData(PacketComposer.Compose("W", "L|0|0"));

                        Session.SendData(PacketComposer.Compose("B", Session.CharacterInfo.GetPrimaryWeaponInfoPayload()));
                        return;
                    }

                    Session.SendData(PacketComposer.Compose("B", Session.CharacterInfo.GetPrimaryWeaponInfoPayload()));
                }

                double now = DateTime.Now.TimeOfDay.TotalMilliseconds;
                double num = now - Session.CharacterInfo.LastRSB75;

                Session.CharacterInfo.AttackingRepBug = true;
                bool missed = damage && !Fight.RollPlayerLaserHit(Session, null);

                if (num < 0.0 || num >= 300.0)
                {
                    SendNpcScopedMessage(Instance, Npc, PacketComposer.Compose(
                        "a",
                        Session.CharacterId.ToString() + "|" + (object)Npc.Id + "|" + (object)Fight.GetAmmoType(Ammo) + "|" + (object)Npc.ShieldMechanics + "|" + (object)Session.CharacterInfo.FatLasers
                    ), Session);
                }

                if (missed)
                    SendMissToNpcTarget(Instance, Session, Npc);

                if (damage && !missed)
                {
                    Fight.DoDamageNpc(Instance, Session, Npc, Ammo);
                    if (Ammo == 6)
                        Fight.StartRsbCooldown(Session);
                }
                else if (missed && Ammo == 6)
                {
                    Fight.StartRsbCooldown(Session);
                }

                Session.CharacterInfo.PreviousAttacked = Npc.Id;

                if (damage && Ammo != 6)
                    Session.CharacterInfo.PreviousDamageTime = now;

                if (Session.CharacterInfo.Invisible == 1)
                {
                    Session.CharacterInfo.Invisible = 0;
                    SendSessionScopedMessage(Instance, Session, PacketComposer.Compose("n", "INV|" + (object)Session.CharacterInfo.Id + "|" + (object)0));
                }

                if (Npc.IsAttacking || Session.CharacterInfo.SelectedPlayer != Npc.Id || !(Npc.Name != "Spaceball"))
                    return;

                Npc.LockTarget(Session.CharacterInfo.Id);
            }
            else
            {
                if (distanceNpc <= RANGE_LASER || Session.CharacterInfo.OutOfRange)
                    return;

                Session.SendData(PacketComposer.Compose("O", ""));
                Session.CharacterInfo.OutOfRange = true;
                ResyncMap45BossCubikonOnOutOfRange(Instance, Session, Npc);
            }
        }

        private static void DoDamageNpc(MapInstance Instance, Session Session, Npc Npc, int Ammo)
        {
            if (Npc == null)
                return;
            if (!CanSessionAttackNpc(Session, Npc))
                return;

            double multiplier = Fight.GetMultiplier(Ammo, Session.CharacterInfo.ApisBuilt);

            int baseDamage = Convert.ToInt32((double)Session.CharacterInfo.MaxDamage * multiplier * Session.CharacterInfo.MultiplierAgainstNpcs);
            int spread = Math.Max(1, (int)Math.Round(baseDamage * 0.10));
            int num1 = Session.CharacterInfo.RandomDamage.Next(-spread, spread + 1);
            int num2 = baseDamage + num1;
            num2 = Fight.ApplySpectrumOutgoingPenalty(Session, num2);

            const int LASER_REFINERY_UNITS_PER_VOLLEY = 18;

            if (Session.CharacterInfo.LabInfos.Laser[1] >= LASER_REFINERY_UNITS_PER_VOLLEY)
            {
                if (Session.CharacterInfo.LabInfos.Laser[0] == 11)
                    num2 = (int)((double)num2 * 1.05);
                else if (Session.CharacterInfo.LabInfos.Laser[0] == 13)
                    num2 = (int)((double)num2 * 1.3);
                else if (Session.CharacterInfo.LabInfos.Laser[0] == 14)
                    num2 = (int)((double)num2 * 1.6);

                Session.CharacterInfo.LabInfos.Laser[1] -= LASER_REFINERY_UNITS_PER_VOLLEY;
                ++Session.CharacterInfo.LabInfos.Update;

                if (Session.CharacterInfo.LabInfos.Update > 8)
                    Session.CharacterInfo.UpdateLaserRocketReff();
            }


            if (Npc.ShipId == 442)
            {
                if (Session.CharacterInfo.SelectedAmmo == 5)
                    return;

                Spaceball.DoDamage(num2, Session.CharacterInfo.FactionId);
            }
            else
            {
                if (Ammo == 5)
                {
                    num2 = Fight.ApplyDiminisherShieldBonus(Session, Npc.Id, num2);

                    if (Npc.ShipShield - num2 > 0)
                        Npc.ShipShield -= num2;
                    else
                    {
                        num2 = Npc.ShipShield;
                        Npc.ShipShield = 0;
                    }

                    int num3 = num2;
                    if (Session.CharacterInfo.ShipShield + num3 > Session.CharacterInfo.ShipMaxShield)
                    {
                        num3 = Session.CharacterInfo.ShipMaxShield - Session.CharacterInfo.ShipShield;
                        Session.CharacterInfo.ShipShield = Session.CharacterInfo.ShipMaxShield;
                    }
                    else
                    {
                        Session.CharacterInfo.ShipShield += num3;
                    }

                    Session.SendData(PacketComposer.Compose("A", "HL|1|" + (object)Session.CharacterInfo.Id + "|SHD|" + (object)Session.CharacterInfo.ShipShield + "|" + (object)num3));
                }
                else
                {
                    int baseShieldDamage = Convert.ToInt32((double)num2 * 0.8);
                    int num3 = Fight.ApplyDiminisherShieldBonus(Session, Npc.Id, baseShieldDamage);
                    int num4 = num2 - baseShieldDamage;

                    if (Npc.ShipShield - num3 > 0)
                        Npc.ShipShield -= num3;
                    else
                    {
                        num4 += num3 - Npc.ShipShield;
                        num3 = Npc.ShipShield;
                        Npc.ShipShield = 0;
                    }

                    if (Npc.ShipHp - num4 > 0)
                        Npc.ShipHp -= num4;
                    else
                    {
                        num4 = Npc.ShipHp;
                        Npc.ShipHp = 0;
                    }

                    num2 = num3 + num4;
                }

                Fight.ApplyEnergyLeech(Session, num2, Ammo, Instance);

                MapInstance damageObserverInstance = MapManager.GetInstanceByMapId(Session.CharacterInfo.MapId);
                if (damageObserverInstance != null)
                    SendNpcDamageUpdate(damageObserverInstance, Session, Npc, num2);

                Npc.UpdateAttackers(Session.CharacterId, num2);

                if (Npc.ShipHp > 0)
                    return;

                Fight.StopLaser(Session, null);

                Fight.KillNPC(Instance, Npc, Session);
            }
        }

        private static double GetMultiplier(int SelectedAmmo, bool bApis)
        {
            double num;

            switch (SelectedAmmo)
            {
                case 1:
                    num = 1.0;
                    break;
                case 2:
                    num = 2.0;
                    break;
                case 3:
                    num = 3.0;
                    break;
                case 4:
                    num = !bApis ? 4.0 : 4.6;
                    break;
                case 5:
                    num = 2.4;
                    break;
                case 6:
                    num = 6.0;
                    break;
                default:
                    num = 1.0;
                    break;
            }

            return num;
        }

        private static void AttackPlayer(MapInstance Instance, Session Session, Session Ennemy, int Ammo, bool damage = true)
        {
            if (!PlayerCanAttack(Session, Ennemy))
                return;

            double distance = Fight.GetDistance(Session, Ennemy);

            if (distance <= RANGE_LASER && Session.CharacterInfo.OutOfRange)
            {
                Session.CharacterInfo.OutOfRange = false;
                Session.SendData(PacketComposer.Compose("X", ""));
            }

            if (distance <= RANGE_LASER && !Session.CharacterInfo.OutOfRange)
            {
                if (damage)
                {
                    if (Ammo == 6 && !Fight.IsRsbReady(Session))
                        return;

                    if (!Session.CharacterInfo.TryConsumeLaserAmmo(Ammo))
                    {
                        Fight.StopLaser(Session, Ennemy, false);

                        Session.SendData(PacketComposer.Compose("W", "L|0|0"));

                        Session.SendData(PacketComposer.Compose("B", Session.CharacterInfo.GetPrimaryWeaponInfoPayload()));
                        return;
                    }

                    Session.SendData(PacketComposer.Compose("B", Session.CharacterInfo.GetPrimaryWeaponInfoPayload()));
                }

                double now = DateTime.Now.TimeOfDay.TotalMilliseconds;
                double num = now - Session.CharacterInfo.LastRSB75;
                bool missed = damage && !Fight.RollPlayerLaserHit(Session, Ennemy);

                if (num < 0.0 || num >= 300.0)
                {
                    SendPlayerScopedCombatMessage(Instance, Session, Ennemy, PacketComposer.Compose(
                        "a",
                        Session.CharacterId.ToString() + "|" + (object)Ennemy.CharacterId + "|" + (object)Fight.GetAmmoType(Ammo) + "|" + (object)Ennemy.CharacterInfo.ShieldMechanics + "|" + (object)Session.CharacterInfo.FatLasers
                    ));
                }

                if (missed)
                    SendMissToPlayerTarget(Instance, Session, Ennemy);

                Session.CharacterInfo.Attacking = true;

                if (damage && !missed)
                {
                    Fight.DoDamage(Instance, Session, Ennemy, Ammo);
                    if (Ammo == 6)
                        Fight.StartRsbCooldown(Session);
                }
                else if (missed && Ammo == 6)
                {
                    Fight.StartRsbCooldown(Session);
                }

                Session.CharacterInfo.PreviousAttacked = 0;

                if (damage && Ammo != 6)
                    Session.CharacterInfo.PreviousDamageTime = now;

                if (Session.CharacterInfo.Invisible == 1)
                {
                    Session.CharacterInfo.Invisible = 0;
                    SendSessionScopedMessage(Instance, Session, PacketComposer.Compose("n", "INV|" + (object)Session.CharacterInfo.Id + "|" + (object)0));
                }

                lock (Ennemy.CharacterInfo.Attacked)
                {
                    if (Ennemy.CharacterInfo.Attacked.Contains(Session))
                        return;

                    Ennemy.CharacterInfo.Attacked.Add(Session);
                }
            }
            else
            {
                if (distance <= RANGE_LASER || Session.CharacterInfo.OutOfRange)
                    return;

                Session.SendData(PacketComposer.Compose("O", ""));
                Session.CharacterInfo.OutOfRange = true;

                lock (Ennemy.CharacterInfo.Attacked)
                {
                    if (Ennemy.CharacterInfo.Attacked.Contains(Session))
                        Ennemy.CharacterInfo.Attacked.Remove(Session);
                }
            }
        }

        private static void DoDamage(MapInstance Instance, Session Session, Session Ennemy, int Ammo)
        {
            if (Instance == null
                || (Session == null || Session.CharacterInfo == null)
                || (Ennemy == null || Ennemy.CharacterInfo == null || Ennemy.CharacterInfo.ActiveISH))
            {
                return;
            }

            double multiplier = Fight.GetMultiplier(Ammo, Session.CharacterInfo.ApisBuilt);

            int baseDamage = Convert.ToInt32((double)Session.CharacterInfo.MaxDamage * multiplier * Session.CharacterInfo.MultiplierAgainstPlayers);
            int spread = Math.Max(1, (int)Math.Round(baseDamage * 0.10));
            int num1 = Session.CharacterInfo.RandomDamage.Next(-spread, spread + 1);
            int num2 = baseDamage + num1;
            num2 = Fight.ApplySpectrumOutgoingPenalty(Session, num2);
            num2 = Fight.ApplySpectrumIncomingLaserReduction(Ennemy, num2);

            const int LASER_REFINERY_UNITS_PER_VOLLEY = 18;

            if (Session.CharacterInfo.LabInfos.Laser[1] >= LASER_REFINERY_UNITS_PER_VOLLEY)
            {
                if (Session.CharacterInfo.LabInfos.Laser[0] == 11)
                    num2 = (int)((double)num2 * 1.05);
                else if (Session.CharacterInfo.LabInfos.Laser[0] == 13)
                    num2 = (int)((double)num2 * 1.3);
                else if (Session.CharacterInfo.LabInfos.Laser[0] == 14)
                    num2 = (int)((double)num2 * 1.6);

                Session.CharacterInfo.LabInfos.Laser[1] -= LASER_REFINERY_UNITS_PER_VOLLEY;
                ++Session.CharacterInfo.LabInfos.Update;

                if (Session.CharacterInfo.LabInfos.Update > 8)
                    Session.CharacterInfo.UpdateLaserRocketReff();
            }


            if (num2 > 45000)
            {
                Output.WriteLine((object)"Hacker have damage !");
            }
            else
            {
                if (Ammo == 5)
                {
                    num2 = Fight.ApplyDiminisherShieldBonus(Session, Ennemy, num2);
                    num2 = Fight.ApplySentinelShieldReduction(Ennemy, num2);
                    if (Ennemy.CharacterInfo.ShipShield - num2 > 0)
                        Ennemy.CharacterInfo.ShipShield -= num2;
                    else
                    {
                        num2 = Ennemy.CharacterInfo.ShipShield;
                        Ennemy.CharacterInfo.ShipShield = 0;
                    }

                    int num3 = num2;

                    if (Session.CharacterInfo.ShipShield + num3 > Session.CharacterInfo.ShipMaxShield)
                    {
                        num3 = Session.CharacterInfo.ShipMaxShield - Session.CharacterInfo.ShipShield;
                        Session.CharacterInfo.ShipShield = Session.CharacterInfo.ShipMaxShield;
                    }
                    else
                    {
                        Session.CharacterInfo.ShipShield += num3;
                    }

                    Session.SendData(PacketComposer.Compose("A", "HL|1|" + (object)Session.CharacterInfo.Id + "|SHD|" + (object)Session.CharacterInfo.ShipShield + "|" + (object)num3));
                    Ennemy.SendData(PacketComposer.Compose("A", "HL|1|" + (object)Session.CharacterInfo.Id + "|SHD|" + (object)Session.CharacterInfo.ShipShield + "|" + (object)num3));
                }
                else
                {
                    int baseShieldDamage = Convert.ToInt32((double)num2 * Ennemy.CharacterInfo.ShieldAbsorption);
                    int num3 = Fight.ApplyDiminisherShieldBonus(Session, Ennemy, baseShieldDamage);
                    num3 = Fight.ApplySentinelShieldReduction(Ennemy, num3);
                    int num4 = num2 - baseShieldDamage;

                    if (Ennemy.CharacterInfo.ShipShield - num3 > 0)
                        Ennemy.CharacterInfo.ShipShield -= num3;
                    else
                    {
                        num4 += num3 - Ennemy.CharacterInfo.ShipShield;
                        num3 = Ennemy.CharacterInfo.ShipShield;
                        Ennemy.CharacterInfo.ShipShield = 0;
                    }

                    if (Ennemy.CharacterInfo.ShipHp - num4 > 0)
                        Ennemy.CharacterInfo.ShipHp -= num4;
                    else
                    {
                        num4 = Ennemy.CharacterInfo.ShipHp;
                        Ennemy.CharacterInfo.ShipHp = 0;
                    }

                    num2 = num3 + num4;
                }

                Fight.ApplyEnergyLeech(Session, num2, Ammo, Instance);

                MapInstance damageObserverInstance = MapManager.GetInstanceByMapId(Session.CharacterInfo.MapId);
                if (damageObserverInstance != null)
                {
                    foreach (MapActor key in damageObserverInstance.GetUserActorSnapshot())
                    {
                        if (key.Type == MapActorType.UserCharacter)
                        {
                            Session sessionById = SessionManager.GetSessionById(key.ReferenceSessionId);

                            if (sessionById != null
                                && sessionById.CharacterInfo != null
                                && (sessionById.CharacterInfo.SelectedPlayer == Ennemy.CharacterId || sessionById.CharacterId == Ennemy.CharacterId))
                            {
                                sessionById.SendData(PacketComposer.Compose(
                                    "Y",
                                    "0|" + (object)Ennemy.CharacterId + "|L|" + (object)Ennemy.CharacterInfo.ShipHp + "|" + (object)Ennemy.CharacterInfo.ShipShield + "|" + (object)num2
                                ));
                            }
                        }
                    }
                }

                Ennemy.CharacterInfo.UpdateAttacker(Session);
                if (num2 > 0)
                    Ennemy.CharacterInfo.RegisterShieldDamageReceived();

                if (Ennemy.CharacterInfo.Destroy)
                {
                    Fight.StopLaser(Session, Ennemy);
                    return;
                }

                if (Ennemy.CharacterInfo.ShipHp > 0)
                    return;

                Fight.StopLaser(Session, Ennemy);

                Ennemy.CharacterInfo.SendReward(Ennemy);

                Fight.KillPlayer(Ennemy);
            }
        }

        private static double GetDistanceNpc(Session Attacker, Npc Npc)
        {
            double dx = (double)(Attacker.CharacterInfo.LocX - Npc.LocX);
            double dy = (double)(Attacker.CharacterInfo.LocY - Npc.LocY);
            return Math.Sqrt(dx * dx + dy * dy);
        }

        private static double GetDistance(Session Attacker, Session Ennemy)
        {
            double dx = (double)(Attacker.CharacterInfo.LocX - Ennemy.CharacterInfo.LocX);
            double dy = (double)(Attacker.CharacterInfo.LocY - Ennemy.CharacterInfo.LocY);
            return Math.Sqrt(dx * dx + dy * dy);
        }

        private static bool IsValidLockIntentTargetId(int targetId)
        {
            return targetId != 0 && targetId != -1;
        }

        private static bool TryComposeLockIntentPayload(Session attacker, MapInstance instance, out string payload)
        {
            payload = null;

            if (attacker == null || attacker.CharacterInfo == null || instance == null)
                return false;

            if (!attacker.CharacterInfo.Attacking || !Fight.IsValidLockIntentTargetId(attacker.CharacterInfo.SelectedPlayer))
                return false;

            int targetId = attacker.CharacterInfo.SelectedPlayer;
            int targetX = 0;
            int targetY = 0;

            MapActor npcActor = instance.GetActorByReferenceId(targetId, MapActorType.AiBot);
            if (npcActor != null)
            {
                Npc npc = npcActor.ReferenceObject as Npc;
                if (npc == null || npc.IsDestroying || npc.MapId != attacker.CurrentMapId || !Fight.CanSessionAttackNpc(attacker, npc))
                    return false;

                targetX = npc.LocX;
                targetY = npc.LocY;
            }
            else
            {
                MapActor playerActor = instance.GetActorByReferenceId(targetId, MapActorType.UserCharacter);
                if (playerActor == null)
                    return false;

                Session target = SessionManager.GetSessionByCharacterId(targetId);
                if (target == null || target.CharacterInfo == null)
                    return false;

                if (target.CurrentMapId != attacker.CurrentMapId || target.CharacterInfo.MapId != attacker.CharacterInfo.MapId)
                    return false;

                if (target.CharacterInfo.Destroy || target.CharacterInfo.Disconnected)
                    return false;

                if (target.CharacterInfo.PeaceZone)
                    return false;

                targetX = target.CharacterInfo.LocX;
                targetY = target.CharacterInfo.LocY;
            }

            payload = attacker.CharacterId.ToString() + "|" + (object)targetId + "|" + (object)targetX + "|" + (object)targetY;
            return true;
        }

        public static ServerMessage ComposeLockIntentMessage(Session attacker, MapInstance instance)
        {
            string payload;
            if (!Fight.TryComposeLockIntentPayload(attacker, instance, out payload))
                return null;

            return PacketComposer.Compose("LK", payload);
        }

        public static ServerMessage ComposeLockIntentClearMessage(Session attacker)
        {
            if (attacker == null || attacker.CharacterInfo == null)
                return null;

            return PacketComposer.Compose("LK", attacker.CharacterId.ToString() + "|" + (object)-1);
        }

        private static bool ShouldReceiveLockIntent(Session observer, Session attacker)
        {
            if (observer == null || observer.CharacterInfo == null || attacker == null || attacker.CharacterInfo == null)
                return false;

            if (observer.CharacterId == attacker.CharacterId)
                return false;

            if (observer.CurrentMapId != attacker.CurrentMapId)
                return false;

            if (GalaxyGateWaveService.IsGateMap(observer.CharacterInfo.MapId) || GalaxyGateWaveService.IsGateMap(attacker.CharacterInfo.MapId))
                return false;

            if (observer.CharacterInfo.PlayerInRange.Contains(attacker.CharacterId))
                return true;

            if (attacker.CharacterInfo.PlayerInRange.Contains(observer.CharacterId))
                return true;

            if (observer.CharacterInfo.IsAdmin || observer.CharacterInfo.MapId == 83 || _1v1.IsOnMap(observer.CharacterInfo.MapId))
                return true;

            return false;
        }

        public static void SendLockIntentToObserver(Session observer, Session attacker, MapInstance instance = null)
        {
            if (observer == null || observer.CharacterInfo == null || attacker == null || attacker.CharacterInfo == null)
                return;

            if (observer.CharacterId == attacker.CharacterId)
                return;

            MapInstance map = instance ?? MapManager.GetInstanceByMapId(attacker.CurrentMapId);
            if (map == null)
                return;

            if (observer.CurrentMapId != attacker.CurrentMapId)
                return;

            ServerMessage message = Fight.ComposeLockIntentMessage(attacker, map);
            if (message != null)
                observer.SendData(message);
        }

        public static void BroadcastLockIntent(MapInstance instance, Session attacker)
        {
            if (instance == null || attacker == null || attacker.CharacterInfo == null)
                return;

            ServerMessage message = Fight.ComposeLockIntentMessage(attacker, instance);
            if (message == null)
                return;

            byte[] data = message.ToDeltas();
            foreach (MapActor actor in instance.GetUserActorSnapshot())
            {
                if (actor == null || actor.Type != MapActorType.UserCharacter)
                    continue;

                Session observer = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (!Fight.ShouldReceiveLockIntent(observer, attacker))
                    continue;

                observer.SendData(data);
            }
        }

        public static void BroadcastLockIntentClear(MapInstance instance, Session attacker)
        {
            if (instance == null || attacker == null || attacker.CharacterInfo == null)
                return;

            ServerMessage message = Fight.ComposeLockIntentClearMessage(attacker);
            if (message == null)
                return;

            byte[] data = message.ToDeltas();
            foreach (MapActor actor in instance.GetUserActorSnapshot())
            {
                if (actor == null || actor.Type != MapActorType.UserCharacter)
                    continue;

                Session observer = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (!Fight.ShouldReceiveLockIntent(observer, attacker))
                    continue;

                observer.SendData(data);
            }
        }

        public static void BroadcastLockIntentClearForTarget(MapInstance instance, int targetId)
        {
            if (instance == null || !Fight.IsValidLockIntentTargetId(targetId))
                return;

            foreach (MapActor actor in instance.GetUserActorSnapshot())
            {
                if (actor == null || actor.Type != MapActorType.UserCharacter)
                    continue;

                Session attacker = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (attacker == null || attacker.CharacterInfo == null)
                    continue;

                if (!attacker.CharacterInfo.Attacking || attacker.CharacterInfo.SelectedPlayer != targetId)
                    continue;

                Fight.BroadcastLockIntentClear(instance, attacker);
            }
        }

        public static void BroadcastLockIntentForMovedTarget(MapInstance instance, int targetId)
        {
            if (instance == null || !Fight.IsValidLockIntentTargetId(targetId))
                return;

            foreach (MapActor actor in instance.GetUserActorSnapshot())
            {
                if (actor == null || actor.Type != MapActorType.UserCharacter)
                    continue;

                Session attacker = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (attacker == null || attacker.CharacterInfo == null)
                    continue;

                if (!attacker.CharacterInfo.Attacking || attacker.CharacterInfo.SelectedPlayer != targetId)
                    continue;

                Fight.BroadcastLockIntent(instance, attacker);
            }
        }

        public static void StopLaser(Session Session, Session Ennemy, bool unlock = true)
        {
            if (Session.CharacterInfo.LaserAttackTimer != null)
                Session.CharacterInfo.LaserAttackTimer.Dispose();

            if (Session.CharacterInfo.LaserAttackCanTimer != null)
                Session.CharacterInfo.LaserAttackCanTimer.Dispose();

            Session.CharacterInfo.Attacking = false;
            Session.CharacterInfo.ActiveAutoRocket = false;
            Session.CharacterInfo.OutOfRange = false;

            try
            {
                Session.CharacterInfo.FlushPendingPrimaryAmmoToDb();
            }
            catch { }

            if (unlock)
                Fight.Unlock(Session);

            Session.CharacterInfo.LaserAttackCanTimer =
    new System.Threading.Timer(new TimerCallback(Fight.CanAttack), (object)Session, 1000, 0);

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            if (unlock)
                Fight.BroadcastLockIntentClear(instanceByMapId, Session);

            SendSessionScopedMessageForOtherOnly(instanceByMapId, Session, PacketComposer.Compose(
                "a",
                Session.CharacterId.ToString() + "|" + (object)-1 + "|" + (object)0 + "|" + (object)Session.CharacterInfo.ShieldMechanics + "|" + (object)Session.CharacterInfo.FatLasers
            ));

            if (Ennemy == null || Ennemy.CharacterInfo == null)
                return;

            lock (Ennemy.CharacterInfo.Attacked)
            {
                if (Ennemy.CharacterInfo.Attacked.Contains(Session))
                    Ennemy.CharacterInfo.Attacked.Remove(Session);
            }
        }

        private static int GetAmmoType(int _SelectedAmmo)
        {
            int num;

            switch (_SelectedAmmo)
            {
                case 1:
                    num = 1;
                    break;
                case 2:
                    num = 1;
                    break;
                case 3:
                    num = 2;
                    break;
                case 4:
                    num = 3;
                    break;
                case 5:
                    num = 4;
                    break;
                case 6:
                    num = 6;
                    break;
                default:
                    num = 1;
                    break;
            }

            return num;
        }


        private static int CalculatePlayerCargoLossAmount(int cargoAmount)
        {
            if (cargoAmount <= 0)
                return 0;

            return Convert.ToInt32(Math.Round(cargoAmount * 0.2, MidpointRounding.AwayFromZero));
        }

        public static void LootCargoBox(Session Session, MapInstance instance)
        {
            int num = Session.Id + 100;

            int locX = Session.CharacterInfo.LocX;
            int locY = Session.CharacterInfo.LocY;

            int lostPrometium = CalculatePlayerCargoLossAmount(Session.CharacterInfo.LabInfos.Prometium);
            int lostEndurium = CalculatePlayerCargoLossAmount(Session.CharacterInfo.LabInfos.Endurium);
            int lostTerbium = CalculatePlayerCargoLossAmount(Session.CharacterInfo.LabInfos.Terbium);
            int lostPalladium = CalculatePlayerCargoLossAmount(Session.CharacterInfo.LabInfos.Palladium);
            int lostPrometid = CalculatePlayerCargoLossAmount(Session.CharacterInfo.LabInfos.Prometid);
            int lostDuranium = CalculatePlayerCargoLossAmount(Session.CharacterInfo.LabInfos.Duranium);
            int lostPromerium = CalculatePlayerCargoLossAmount(Session.CharacterInfo.LabInfos.Promerium);
            int lostSeprom = CalculatePlayerCargoLossAmount(Session.CharacterInfo.LabInfos.Seprom);

            if (lostPrometium <= 0
                && lostEndurium <= 0
                && lostTerbium <= 0
                && lostPalladium <= 0
                && lostPrometid <= 0
                && lostDuranium <= 0
                && lostPromerium <= 0
                && lostSeprom <= 0)
            {
                Session.SendData(Session.CharacterInfo.GetCargoMessage());
                return;
            }

            Session.CharacterInfo.RemoveCargo(1L, lostPrometium);
            Session.CharacterInfo.RemoveCargo(2L, lostEndurium);
            Session.CharacterInfo.RemoveCargo(3L, lostTerbium);
            Session.CharacterInfo.RemoveCargo(5L, lostPalladium);
            Session.CharacterInfo.RemoveCargo(11L, lostPrometid);
            Session.CharacterInfo.RemoveCargo(12L, lostDuranium);
            Session.CharacterInfo.RemoveCargo(13L, lostPromerium);
            Session.CharacterInfo.RemoveCargo(14L, lostSeprom);
            Session.SendData(Session.CharacterInfo.GetCargoMessage());

            CargoBox cargoBox = new CargoBox(num, locX, locY, instance.MapId);

            cargoBox.Prometium = lostPrometium;
            cargoBox.Endurium = lostEndurium;
            cargoBox.Terbium = lostTerbium;
            cargoBox.Palladium = lostPalladium;
            cargoBox.Prometid = lostPrometid;
            cargoBox.Duranium = lostDuranium;
            cargoBox.Promerium = lostPromerium;
            cargoBox.Seprom = lostSeprom;

            if (instance.Info.Collectables.ContainsKey(num))
            {
                instance.Info.Collectables.Remove(num);
                instance.BroadcastMessage(PacketComposer.Compose("2", string.Concat((object)num)), false);
            }

            instance.Info.Collectables.Add(num, (Collectable)cargoBox);
            instance.BroadcastMessage(PacketComposer.Compose("c", num.ToString() + "|" + (object)1 + "|" + (object)locX + "|" + (object)locY), false);
        }

        public static void KillPlayer(Session Session, bool keepCargo = false)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            if (!KillInProgress.TryAdd(Session.CharacterId, 1))
                return;

            try
            {
                if (Session.CharacterInfo.Destroy)
                    return;

                Session.CharacterInfo.Destroy = true;

                Fight.StopLaser(Session, null);
                Fight.StopCurrentShipSkill(Session, true);

                RocketLauncherRuntimeState rocketLauncherState = GetRocketLauncherState(Session);
                if (rocketLauncherState != null)
                {
                    lock (rocketLauncherState.SyncRoot)
                    {
                        StopRocketLauncherReloadTimer(rocketLauncherState);
                    }
                }

                GalaxyGateWaveService.OnPlayerKilled(Session);
                TitleService.OnPlayerDestroyed(Session);

                Session.CharacterInfo.FactionId = Session.CharacterInfo.RealFaction;
                Session.CharacterInfo.ClanId = Session.CharacterInfo.RealClan;

                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
                if (instanceByMapId != null)
                {
                    SendSessionScopedMessage(instanceByMapId, Session, PacketComposer.Compose("K", Session.CharacterId.ToString()));

                    bool gateDeath = GalaxyGateWaveService.IsGateMap(Session.CharacterInfo.MapId);
                    if (!gateDeath)
                    {
                        if (!keepCargo && Session.CharacterInfo.MapId != 83)
                            Fight.LootCargoBox(Session, instanceByMapId);

                        if (Session.CharacterInfo.Attacker != null && Session.CharacterInfo.Attacker.CharacterInfo.FactionId != Session.CharacterInfo.FactionId)
                            Fight.LootSilverBox(Session, instanceByMapId);
                    }

                    foreach (MapActor key in instanceByMapId.GetActorSnapshot())
                    {
                        if (key.Type == MapActorType.UserCharacter && key.ReferenceId != Session.CharacterId)
                        {
                            Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(key.ReferenceId);
                            if (sessionByCharacterId != null && sessionByCharacterId.CharacterInfo != null)
                            {
                                if (sessionByCharacterId.CharacterInfo.IsAdmin)
                                    sessionByCharacterId.CharacterInfo.PlayerInRange.Remove(Session.CharacterInfo.Id);
                            }
                        }
                    }
                }

                Session.CharacterInfo.Attacker = null;

                Session.CharacterInfo.ShipHp = 1000;
                Session.CharacterInfo.Config1.Shield = 1000;
                Session.CharacterInfo.Config2.Shield = 1000;

                Session.CharacterInfo.Destroy = false;
                Session.CharacterInfo.OutOfRange = false;

                Session.CharacterInfo.CanMove = true;
                Session.CharacterInfo.NoFightTimer = 0;

                Session.CharacterInfo.KillStrek = 0;
                Session.CharacterInfo.IsRepairing = false;

                Session.CharacterInfo.PeaceZone = true;

                int deathMapId = Session.CharacterInfo.MapId;
                int factionId = Session.CharacterInfo.FactionId;

                foreach (int id in (IEnumerable<int>)Session.CharacterInfo.PlayerInRange.Keys)
                {
                    Session sessionByCharacterId2 = SessionManager.GetSessionByCharacterId(id);
                    if (sessionByCharacterId2 != null && sessionByCharacterId2.CharacterInfo != null)
                        sessionByCharacterId2.CharacterInfo.PlayerInRange.Remove(Session.CharacterInfo.Id);
                }

                bool respawnToX8 = (deathMapId == 16) || deathMapId == 29 || (deathMapId >= 17 && deathMapId <= 28);

                int targetMapId = 0;

                if (respawnToX8)
                {
                    int x8MapId = MapAccessService.GetHomeMapX8(factionId);
                    if (MapAccessService.CanAccessMap(factionId, Session.CharacterInfo.Level, x8MapId, out int requiredLevel))
                        targetMapId = x8MapId;
                    else
                        targetMapId = MapAccessService.GetHomeMapX1(factionId);
                }
                else
                {
                    targetMapId = MapAccessService.GetHomeMapX1(factionId);
                }

                if (factionId == 1)
                {
                    Session.CharacterInfo.LocX = 2000;
                    Session.CharacterInfo.LocY = 1100;
                }
                else if (factionId == 2)
                {
                    Session.CharacterInfo.LocX = 18500;
                    Session.CharacterInfo.LocY = 1100;
                }
                else if (factionId == 3)
                {
                    Session.CharacterInfo.LocX = 19000;
                    Session.CharacterInfo.LocY = 11300;
                }

                Session.CharacterInfo.NewLocX = Session.CharacterInfo.LocX;
                Session.CharacterInfo.NewLocY = Session.CharacterInfo.LocY;
                Session.CharacterInfo.MapId = targetMapId;

                if (Session.Stopped || Session.CharacterInfo.Disconnected)
                {
                    MapManager.RemoveUserFromMap(Session);

                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                        Session.CharacterInfo.SynchronizeStatistics(client, 0);
                    }

                    Session.CharacterInfo.Disconnected = true;
                    Session.StoppedPlayer = true;
                    SessionManager.StopSession(Session.Id);
                    return;
                }

                MapHandler.OpenPublicConnection(Session, Session.CharacterInfo.MapId, (PortalInfo)null);
            }
            finally
            {
                if (Session != null && Session.CharacterInfo != null)
                    Session.CharacterInfo.ResetPvpRewardGuard();

                KillInProgress.Remove(Session.CharacterId);
            }
        }

        public static void LootSilverBox(Session session, MapInstance instanceByMapId)
        {
            Random random = new Random();
            int numRand = random.Next(1, 101);

            if (session.CharacterInfo.IsBeginner)
                return;

            if (numRand <= 15)
            {
                int id = session.CharacterInfo.Id + 1000;
                int locX = session.CharacterInfo.LocX + random.Next(-200, 200);
                int locY = session.CharacterInfo.LocY + random.Next(-200, 200);

                SilverBootyBox bootyBox = new SilverBootyBox(id, locX, locY, instanceByMapId.MapId);

                if (instanceByMapId.Info.Collectables.ContainsKey(id))
                {
                    instanceByMapId.Info.Collectables.Remove(id);
                    instanceByMapId.BroadcastMessage(PacketComposer.Compose("2", string.Concat((object)id)), false);
                }

                instanceByMapId.Info.Collectables.Add(id, (Collectable)bootyBox);
                instanceByMapId.BroadcastMessage(PacketComposer.Compose("c", id.ToString() + "|" + (object)25 + "|" + (object)locX + "|" + (object)locY), 0 != 0);
            }
        }

        public static void RegeneratingShield(Session Session)
        {
            if (!Session.CharacterInfo.CanRegenShield || Session.CharacterInfo.ShipShield >= Session.CharacterInfo.ShipMaxShield)
                return;

            int num = (int)Math.Ceiling(Session.CharacterInfo.ShipMaxShield * 0.04);
            if (num <= 0)
                return;

            if (Session.CharacterInfo.ShipShield + num <= Session.CharacterInfo.ShipMaxShield)
            {
                Session.CharacterInfo.ShipShield += num;
            }
            else
            {
                num = Session.CharacterInfo.ShipMaxShield - Session.CharacterInfo.ShipShield;
                Session.CharacterInfo.ShipShield = Session.CharacterInfo.ShipMaxShield;
            }

            var msg = PacketComposer.Compose(
                "A",
                "HL|1|" + Session.CharacterInfo.Id + "|SHD|" + Session.CharacterInfo.ShipShield + "|" + num
            );

            Session.SendData(msg);

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            instanceByMapId?.BroadcastToSelectedTarget(Session.CharacterId, msg);
        }


        private static void KillNPC(MapInstance map, Npc npc, Session session)
        {
            if (Spaceball.IsSpaceballNpc(npc))
            {
                npc.ShipHp = npc.ShipMaxHp > 0 ? npc.ShipMaxHp : 1;
                npc.ShipShield = npc.ShipMaxShield > 0 ? npc.ShipMaxShield : Math.Max(0, npc.ShipShield);
                npc.IsDestroying = false;
                return;
            }

            npc.Destroy(map);
        }

        private static int GetBaseRocketDamage(int baseRckDamages, int rocketType)
        {
            switch (rocketType)
            {
                case 1:
                    return baseRckDamages;
                case 2:
                    return (int)Math.Round(baseRckDamages * 2.0);
                case 3:
                    return (int)Math.Round(baseRckDamages * 4.0);
                case 7:
                    return (int)Math.Round(baseRckDamages * 4.0);
                case 8:
                    return (int)Math.Round(baseRckDamages * 4.0);
                case 9:
                    return (int)Math.Round(baseRckDamages * 2.0);
                case 10:
                    return 0;
                default:
                    return baseRckDamages;
            }
        }

        private static void ApplyDCR250Effect(Session target)
        {
            if (target == null || target.CharacterInfo == null)
                return;

            if (target.CharacterInfo.SpeedDebuffTimer != null)
            {
                try
                {
                    target.CharacterInfo.SpeedDebuffTimer.Change(5000, System.Threading.Timeout.Infinite);
                }
                catch
                {
                }
                return;
            }

            int originalSpeed = target.CharacterInfo.ShipSpeed;
            int slowedSpeed = (int)Math.Round(originalSpeed * 0.7);

            target.CharacterInfo.ShipSpeed = slowedSpeed;
            target.SendData(PacketComposer.Compose("A", "v|" + target.CharacterInfo.ShipSpeed));

            target.CharacterInfo.SpeedDebuffTimer = new System.Threading.Timer(
                RestoreSpeed,
                new object[] { target, originalSpeed },
                5000,
                System.Threading.Timeout.Infinite
            );
        }

        private static void RestoreSpeed(object state)
        {
            try
            {
                object[] array = (object[])state;

                Session target = (Session)array[0];
                int originalSpeed = (int)array[1];

                if (target == null || target.CharacterInfo == null)
                    return;

                try
                {
                    if (target.CharacterInfo.SpeedDebuffTimer != null)
                    {
                        target.CharacterInfo.SpeedDebuffTimer.Dispose();
                        target.CharacterInfo.SpeedDebuffTimer = null;
                    }
                }
                catch
                {
                }

                if (!target.StoppedPlayer)
                {
                    target.CharacterInfo.ShipSpeed = originalSpeed;
                    target.SendData(PacketComposer.Compose("A", "v|" + target.CharacterInfo.ShipSpeed));
                }

            }
            catch (Exception ex)
            {
                LogTimerFailure("RestoreSpeed", ex);
            }
        }

        private static void ApplyDamageToNpc(Session session, Npc npc, int damage, MapInstance instance)
        {
            if (session == null || session.CharacterInfo == null || npc == null || instance == null)
                return;
            if (Spaceball.IsSpaceballNpc(npc))
                return;
            if (!CanSessionAttackNpc(session, npc))
                return;

            int shieldPart = Convert.ToInt32(damage * 0.8);
            int hpPart = damage - shieldPart;

            if (npc.ShipShield - shieldPart > 0)
                npc.ShipShield -= shieldPart;
            else
            {
                hpPart += shieldPart - npc.ShipShield;
                shieldPart = npc.ShipShield;
                npc.ShipShield = 0;
            }

            if (npc.ShipHp - hpPart > 0)
                npc.ShipHp -= hpPart;
            else
            {
                hpPart = npc.ShipHp;
                npc.ShipHp = 0;
            }

            int applied = shieldPart + hpPart;

            SendNpcDamageUpdate(instance, session, npc, applied);

            npc.UpdateAttackers(session.CharacterId, applied);

            if (!npc.IsDestroying && npc.TargetId == 0)
                npc.LockTarget(session.CharacterId);

            if (npc.ShipHp <= 0)
                Fight.KillNPC(instance, npc, session);
        }

        private static void ApplyShieldOnlyDamageToNpc(Session session, Npc npc, int damage, MapInstance instance)
        {
            if (session == null || session.CharacterInfo == null || npc == null || instance == null)
                return;
            if (Spaceball.IsSpaceballNpc(npc))
                return;
            if (!CanSessionAttackNpc(session, npc))
                return;

            int shieldDamage = Math.Max(0, damage);
            int applied = Math.Min(Math.Max(0, npc.ShipShield), shieldDamage);
            if (applied > 0)
                npc.ShipShield -= applied;

            SendNpcDamageUpdate(instance, session, npc, applied);

            npc.UpdateAttackers(session.CharacterId, applied);

            if (!npc.IsDestroying && npc.TargetId == 0)
                npc.LockTarget(session.CharacterId);
        }

        private static void ApplyDamageToPlayer(Session attacker, Session target, int damage, MapInstance instance)
        {
            if (attacker == null || attacker.CharacterInfo == null || target == null || target.CharacterInfo == null || instance == null)
                return;
            if (!PlayerCanAttack(attacker, target))
                return;

            target.CharacterInfo.UpdateAttacker(attacker);

            int baseShieldPart = Convert.ToInt32(damage * target.CharacterInfo.ShieldAbsorption);
            int shieldPart = baseShieldPart;
            shieldPart = Fight.ApplySentinelShieldReduction(target, shieldPart);
            int hpPart = damage - baseShieldPart;

            if (target.CharacterInfo.ShipShield - shieldPart > 0)
                target.CharacterInfo.ShipShield -= shieldPart;
            else
            {
                hpPart = damage - target.CharacterInfo.ShipShield;
                target.CharacterInfo.ShipShield = 0;
            }

            if (target.CharacterInfo.ShipHp - hpPart > 0)
                target.CharacterInfo.ShipHp -= hpPart;
            else
                target.CharacterInfo.ShipHp = 0;

            if (shieldPart + hpPart > 0)
                target.CharacterInfo.RegisterShieldDamageReceived();

            foreach (MapActor key in instance.GetActorSnapshot())
            {
                if (key.Type == MapActorType.UserCharacter)
                {
                    Session s = SessionManager.GetSessionById(key.ReferenceSessionId);

                    if (s != null
                        && s.CharacterInfo != null
                        && (s.CharacterInfo.SelectedPlayer == target.CharacterId || s.CharacterId == target.CharacterId))
                    {
                        s.SendData(PacketComposer.Compose(
                            "Y",
                            "0|" + target.CharacterId + "|L|" + target.CharacterInfo.ShipHp + "|" + target.CharacterInfo.ShipShield + "|" + damage
                        ));
                    }
                }
            }

            if (target.CharacterInfo.ShipHp <= 0 && !target.CharacterInfo.Destroy)
            {
                target.CharacterInfo.SendReward(target);

                Fight.StopLaser(attacker, target);

                Fight.KillPlayer(target);
            }
        }

        private static void ApplyShieldOnlyDamageToPlayer(Session attacker, Session target, int damage, MapInstance instance)
        {
            if (attacker == null || attacker.CharacterInfo == null || target == null || target.CharacterInfo == null || instance == null)
                return;
            if (!PlayerCanAttack(attacker, target))
                return;

            target.CharacterInfo.UpdateAttacker(attacker);

            int shieldDamage = Math.Max(0, damage);
            shieldDamage = Fight.ApplySentinelShieldReduction(target, shieldDamage);
            int applied = Math.Min(Math.Max(0, target.CharacterInfo.ShipShield), shieldDamage);
            if (applied > 0)
            {
                target.CharacterInfo.ShipShield -= applied;
                target.CharacterInfo.RegisterShieldDamageReceived();
            }

            foreach (MapActor key in instance.GetActorSnapshot())
            {
                if (key.Type == MapActorType.UserCharacter)
                {
                    Session s = SessionManager.GetSessionById(key.ReferenceSessionId);

                    if (s != null
                        && s.CharacterInfo != null
                        && (s.CharacterInfo.SelectedPlayer == target.CharacterId || s.CharacterId == target.CharacterId))
                    {
                        s.SendData(PacketComposer.Compose(
                            "Y",
                            "0|" + target.CharacterId + "|L|" + target.CharacterInfo.ShipHp + "|" + target.CharacterInfo.ShipShield + "|" + applied
                        ));
                    }
                }
            }
        }
    }
}


