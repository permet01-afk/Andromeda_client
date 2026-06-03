using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Maps.Collectables;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Specialized;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Event
{
    internal static class Invasion
    {
        private const int StartDelaySeconds = 15 * 60;
        private const int MaxDurationMs = 40 * 60 * 1000;
        private const int MonitorPeriodMs = 5000;
        private const int MarkerPeriodMs = 1500;
        private const int MarkerLifetimeTicks = 6;

        private const string InvaderName = "Invader";
        private const int InvaderShipId = 56;
        private const int InvaderHp = 300000;
        private const int InvaderShield = 250000;
        private const int InvaderSpeed = 320;
        private const int InvaderDamage = 35000;
        private const int InvaderDamageMin = 33000;
        private const int InvaderDamageMax = 37000;
        private const int InvaderLaserPattern = 3;
        private const int InvaderAttackRange = 700;

        private const int InvaderRewardCredits = 3000000;
        private const int InvaderRewardUridium = 25000;
        private const int InvaderRewardUcb100 = 10000;
        private const int InvaderRewardRsb75 = 5000;
        private const int InvaderRewardSeprom = 200;
        private const int InvaderRewardPromerium = 500;
        private const int InvaderRewardExperience = 250000;
        private const int InvaderRewardHonor = 1250;

        private const int FinalRewardUridium = 25000;
        private const int FinalRewardUcb100 = 5000;
        private const int FinalRewardRsb75 = 1500;
        private const int FinalRewardSeprom = 500;

        private static readonly object SyncRoot = new object();
        private static readonly Dictionary<int, InvasionRun> RunsByMapId = new Dictionary<int, InvasionRun>();
        private static readonly Dictionary<int, InvasionRun> RunsByNpcId = new Dictionary<int, InvasionRun>();
        private static readonly int[] WaveCounts = { 10, 20, 25 };

        private static bool mActive;
        private static bool mStarting;
        private static bool mSafeBattle;
        private static int mPlayerCount;
        private static int mNpcCount;
        private static int mLevel;
        private static int mPlayerCountMax;
        private static Timer mAnnouncementTimer;
        private static Timer mMonitorTimer;
        private static Timer mMarkerTimer;
        private static Timer mTimeoutTimer;
        private static DateTime mStartAtUtc;
        private static bool mSent15;
        private static bool mSent5;
        private static bool mSent1;
        private static int mLastCountdownSecond;
        private static int mNextInvaderCargoBoxId = -3000000;

        private sealed class InvasionRun
        {
            public int MapId;
            public int FactionId;
            public string MapName;
            public int WaveIndex;
            public bool Running;
            public bool Completed;
            public DateTime NextStatusAtUtc;
            public readonly Dictionary<int, Npc> Npcs = new Dictionary<int, Npc>();
            public readonly Dictionary<int, long> DamageByCharacter = new Dictionary<int, long>();
            public readonly HashSet<int> FinalRewarded = new HashSet<int>();
            public long TotalDamage;
        }

        public static bool Active
        {
            get { return mActive; }
            set { mActive = value; }
        }

        public static bool SafeBattle
        {
            get { return mSafeBattle; }
            set { mSafeBattle = value; }
        }

        public static int PlayerCount
        {
            get { return mPlayerCount; }
            set { mPlayerCount = value; }
        }

        public static int NpcCount
        {
            get { return mNpcCount; }
            set { mNpcCount = value; }
        }

        public static int Level
        {
            get { return mLevel; }
            set { mLevel = value; }
        }

        public static int PlayerCountMax
        {
            get { return mPlayerCountMax; }
            set { mPlayerCountMax = value; }
        }

        public static Timer PerformUpdate
        {
            get { return mMonitorTimer; }
            set { mMonitorTimer = value; }
        }

        public static void Initialize()
        {
            lock (SyncRoot)
            {
                StopTimers();
                RunsByMapId.Clear();
                RunsByNpcId.Clear();
                mActive = false;
                mStarting = false;
                mSafeBattle = false;
                mPlayerCount = 0;
                mNpcCount = 0;
                mLevel = 0;
                mPlayerCountMax = 0;
                mSent15 = false;
                mSent5 = false;
                mSent1 = false;
                mLastCountdownSecond = 0;
            }

            SetDatabaseActive(false);
        }

        public static void StartInvasion()
        {
            lock (SyncRoot)
            {
                if (mActive || mStarting)
                {
                    BroadcastGlobal("Invasion is already active.");
                    return;
                }

                mActive = true;
                mStarting = true;
                mSafeBattle = false;
                mSent15 = false;
                mSent5 = false;
                mSent1 = false;
                mLastCountdownSecond = 0;
                mStartAtUtc = DateTime.UtcNow.AddSeconds(StartDelaySeconds);
                SetDatabaseActive(true);

                mAnnouncementTimer = new Timer(new TimerCallback(AnnouncementTick), null, 0, 1000);
            }
        }

        public static void StopInvasion()
        {
            lock (SyncRoot)
            {
                if (!mActive && !mStarting)
                    return;

                FinishEvent(false, true);
            }
        }

        public static bool Join(Session session)
        {
            if (session != null)
                session.SendData(PacketComposer.Compose("A", "STD|Invasion portals are disabled in this version."));
            return false;
        }

        public static void Allow(int characterId)
        {
        }

        public static bool IsInvasionNpc(Npc npc)
        {
            if (npc == null)
                return false;

            lock (SyncRoot)
            {
                return RunsByNpcId.ContainsKey(npc.Id);
            }
        }

        public static int GetNpcLaserPattern(Npc npc)
        {
            return IsInvasionNpc(npc) ? InvaderLaserPattern : 0;
        }

        public static int GetNpcAttackRange(Npc npc, int defaultRange)
        {
            return IsInvasionNpc(npc) ? InvaderAttackRange : defaultRange;
        }

        public static void BroadcastInvaderLock(Npc npc, int targetId)
        {
            if (!IsInvasionNpc(npc) || targetId <= 0)
                return;

            Session target = SessionManager.GetSessionByCharacterId(targetId);
            if (target == null || target.CharacterInfo == null)
                return;

            if (target.CharacterInfo.Destroy || target.CharacterInfo.Disconnected || target.CharacterInfo.MapId != npc.MapId)
                return;

            BroadcastMapPacket(npc.MapId, PacketComposer.Compose("LK", npc.Id.ToString() + "|" + targetId + "|" + target.CharacterInfo.LocX + "|" + target.CharacterInfo.LocY));
        }

        public static void BroadcastInvaderLockClear(Npc npc)
        {
            if (!IsInvasionNpc(npc))
                return;

            BroadcastMapPacket(npc.MapId, PacketComposer.Compose("LK", npc.Id.ToString() + "|-1"));
        }

        public static bool HandleNpcDestroyed(Npc npc, MapInstance map)
        {
            if (npc == null)
                return false;

            InvasionRun run;
            lock (SyncRoot)
            {
                if (!RunsByNpcId.TryGetValue(npc.Id, out run))
                    return false;

                BroadcastInvaderLockClear(npc);
                GrantInvaderReward(run, npc);
                RunsByNpcId.Remove(npc.Id);
                run.Npcs.Remove(npc.Id);
                SendMarkerHide(run, npc.Id);
            }

            return true;
        }

        private static void AnnouncementTick(object state)
        {
            lock (SyncRoot)
            {
                if (!mStarting)
                    return;

                int remaining = (int)Math.Ceiling((mStartAtUtc - DateTime.UtcNow).TotalSeconds);

                if (!mSent15 && remaining <= 15 * 60)
                {
                    mSent15 = true;
                    BroadcastGlobal("Invasion will begin in 15 minutes.");
                }

                if (!mSent5 && remaining <= 5 * 60)
                {
                    mSent5 = true;
                    BroadcastGlobal("Invasion will begin in 5 minutes.");
                }

                if (!mSent1 && remaining <= 60)
                {
                    mSent1 = true;
                    BroadcastGlobal("Invasion will begin in 1 minute.");
                }

                if (remaining <= 10 && remaining > 0 && remaining != mLastCountdownSecond)
                {
                    mLastCountdownSecond = remaining;
                    BroadcastGlobal("Invasion begins in " + remaining + "...");
                }

                if (remaining <= 0)
                    BeginInvasion();
            }
        }

        private static void BeginInvasion()
        {
            StopAnnouncementTimer();
            mStarting = false;
            mActive = true;
            mSafeBattle = false;
            RunsByMapId.Clear();
            RunsByNpcId.Clear();

            AddRun(17, 1, "1-5");
            AddRun(21, 2, "2-5");
            AddRun(25, 3, "3-5");

            BroadcastGlobal("Invasion has started!");

            foreach (InvasionRun run in RunsByMapId.Values)
                SpawnNextWave(run);

            mMonitorTimer = new Timer(new TimerCallback(MonitorTick), null, MonitorPeriodMs, MonitorPeriodMs);
            mMarkerTimer = new Timer(new TimerCallback(MarkerTick), null, 0, MarkerPeriodMs);
            mTimeoutTimer = new Timer(new TimerCallback(TimeoutTick), null, MaxDurationMs, Timeout.Infinite);
        }

        private static void AddRun(int mapId, int factionId, string mapName)
        {
            InvasionRun run = new InvasionRun();
            run.MapId = mapId;
            run.FactionId = factionId;
            run.MapName = mapName;
            run.WaveIndex = 0;
            run.Running = true;
            run.NextStatusAtUtc = DateTime.UtcNow.AddSeconds(30);
            RunsByMapId[mapId] = run;
        }

        private static void SpawnNextWave(InvasionRun run)
        {
            if (run == null || !run.Running || run.WaveIndex >= WaveCounts.Length)
                return;

            int count = WaveCounts[run.WaveIndex];
            run.WaveIndex++;

            EnsureMapLoaded(run.MapId);
            MapInstance instance = MapManager.GetInstanceByMapId(run.MapId);
            if (instance == null)
                return;

            for (int i = 0; i < count; i++)
            {
                int x;
                int y;
                GetInvasionSpawnPosition(run.MapId, out x, out y);

                Npc npc = NpcManager.CreateNewInstance(
                    InvaderName,
                    run.MapId,
                    x,
                    y,
                    InvaderShipId,
                    InvaderHp,
                    InvaderHp,
                    InvaderShield,
                    InvaderShield,
                    InvaderSpeed,
                    0,
                    0,
                    0,
                    0,
                    0,
                    "",
                    0,
                    0,
                    0,
                    0,
                    0,
                    InvaderDamage
                );

                npc.DamageMin = InvaderDamageMin;
                npc.DamageMax = InvaderDamageMax;
                npc.Respawn = false;

                instance.AddNpcToMap(npc);
                NpcAI.NpcToAdd.Add(npc);
                run.Npcs[npc.Id] = npc;
                RunsByNpcId[npc.Id] = run;
            }

            BroadcastMap(run.MapId, "Wave " + run.WaveIndex + " has started.");
            BroadcastMap(run.MapId, "Invaders remaining: " + run.Npcs.Count);
            SendMarkers(run);
        }

        private static void MonitorTick(object state)
        {
            lock (SyncRoot)
            {
                if (!mActive || mStarting)
                    return;

                List<InvasionRun> snapshot = new List<InvasionRun>(RunsByMapId.Values);
                foreach (InvasionRun run in snapshot)
                {
                    if (run == null || !run.Running)
                        continue;

                    RemoveMissingNpcs(run);

                    if (run.Npcs.Count <= 0)
                    {
                        if (run.WaveIndex < WaveCounts.Length)
                            SpawnNextWave(run);
                        else
                        {
                            FinishEventWithWinner(run);
                            return;
                        }
                    }
                    else if (DateTime.UtcNow >= run.NextStatusAtUtc)
                    {
                        BroadcastMap(run.MapId, "Invaders remaining: " + run.Npcs.Count);
                        run.NextStatusAtUtc = DateTime.UtcNow.AddSeconds(30);
                    }
                }

                FinishIfNoRunningRuns();
            }
        }

        private static void MarkerTick(object state)
        {
            lock (SyncRoot)
            {
                if (!mActive || mStarting)
                    return;

                foreach (InvasionRun run in RunsByMapId.Values)
                {
                    if (run != null && run.Running)
                        SendMarkers(run);
                }
            }
        }

        private static void TimeoutTick(object state)
        {
            lock (SyncRoot)
            {
                if (!mActive)
                    return;

                FinishEvent(false, false);
            }
        }

        private static void FinishRun(InvasionRun run, bool completed, bool manualStop)
        {
            if (run == null || !run.Running)
                return;

            run.Completed = completed;

            if (completed)
                GrantFinalReward(run);

            CleanupRunNpcs(run);
            run.Running = false;
            BroadcastMap(run.MapId, manualStop ? "Event Invasion Finished" : "Event Invasion Finished");
        }

        private static void FinishEventWithWinner(InvasionRun winningRun)
        {
            if (winningRun == null || !winningRun.Running)
                return;

            FinishRun(winningRun, true, false);

            foreach (InvasionRun run in new List<InvasionRun>(RunsByMapId.Values))
            {
                if (run != null && run.Running)
                    FinishRun(run, false, false);
            }

            RunsByMapId.Clear();
            RunsByNpcId.Clear();
            mStarting = false;
            mActive = false;
            mSafeBattle = false;
            StopTimers();
            SetDatabaseActive(false);
        }

        private static void FinishEvent(bool completed, bool manualStop)
        {
            bool hadRuns = RunsByMapId.Count > 0;

            foreach (InvasionRun run in new List<InvasionRun>(RunsByMapId.Values))
            {
                if (run != null && run.Running)
                    FinishRun(run, completed && run.Npcs.Count <= 0 && run.WaveIndex >= WaveCounts.Length, manualStop);
            }

            RunsByMapId.Clear();
            RunsByNpcId.Clear();
            mStarting = false;
            mActive = false;
            mSafeBattle = false;
            StopTimers();
            SetDatabaseActive(false);

            if (manualStop && !hadRuns)
                BroadcastGlobal("Event Invasion Finished");
        }

        private static void FinishIfNoRunningRuns()
        {
            foreach (InvasionRun run in RunsByMapId.Values)
            {
                if (run != null && run.Running)
                    return;
            }

            RunsByMapId.Clear();
            RunsByNpcId.Clear();
            mActive = false;
            mSafeBattle = false;
            StopTimers();
            SetDatabaseActive(false);
        }

        private static void GrantInvaderReward(InvasionRun run, Npc npc)
        {
            if (run == null || npc == null || npc.Attackers == null)
                return;

            ConcurrentDictionary<int, int> attackers = (ConcurrentDictionary<int, int>)npc.Attackers;
            long totalDamage = 0;
            foreach (KeyValuePair<int, int> kvp in attackers)
            {
                if (kvp.Value > 0)
                    totalDamage += (long)kvp.Value;
            }

            if (totalDamage <= 0)
                return;

            foreach (KeyValuePair<int, int> kvp in attackers)
            {
                if (kvp.Value <= 0)
                    continue;

                AddRunDamage(run, kvp.Key, kvp.Value);

                Session session = SessionManager.GetSessionByCharacterId(kvp.Key);
                if (!IsEligibleRewardSession(session, run))
                    continue;

                double share = (double)kvp.Value / (double)totalDamage;
                GrantRewardShare(session, share, false);
            }

            SpawnInvaderCargoBox(run, npc);
        }

        private static void AddRunDamage(InvasionRun run, int characterId, int damage)
        {
            if (run == null || characterId <= 0 || damage <= 0)
                return;

            long current;
            if (!run.DamageByCharacter.TryGetValue(characterId, out current))
                current = 0;

            run.DamageByCharacter[characterId] = current + damage;
            run.TotalDamage += damage;
        }

        private static void GrantFinalReward(InvasionRun run)
        {
            if (run == null)
                return;

            long requiredDamage = Math.Max(50000L, run.TotalDamage / 100L);
            foreach (MapActor actor in GetMapUserActors(run.MapId))
            {
                if (actor == null || actor.ReferenceSessionId <= 0)
                    continue;

                Session session = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (!IsEligibleRewardSession(session, run))
                    continue;

                long damage;
                if (!run.DamageByCharacter.TryGetValue(session.CharacterId, out damage) || damage < requiredDamage)
                    continue;

                if (run.FinalRewarded.Contains(session.CharacterId))
                    continue;

                run.FinalRewarded.Add(session.CharacterId);
                GrantFixedReward(session, 0, FinalRewardUridium, FinalRewardUcb100, FinalRewardRsb75, FinalRewardSeprom, 0, 0, 0, "Invasion final reward received.");
            }
        }

        private static void GrantRewardShare(Session session, double share, bool finalReward)
        {
            int credits = ScaleReward(InvaderRewardCredits, share);
            int uridium = ScaleReward(InvaderRewardUridium, share);
            int ucb = ScaleReward(InvaderRewardUcb100, share);
            int rsb = ScaleReward(InvaderRewardRsb75, share);
            int xp = ScaleReward(InvaderRewardExperience, share);
            int honor = ScaleReward(InvaderRewardHonor, share);

            GrantFixedReward(session, credits, uridium, ucb, rsb, 0, 0, xp, honor, "Invader destroyed. Rewards received.");
        }

        private static int NextInvaderCargoBoxId()
        {
            return Interlocked.Decrement(ref mNextInvaderCargoBoxId);
        }

        private static void SpawnInvaderCargoBox(InvasionRun run, Npc npc)
        {
            if (run == null || npc == null || (InvaderRewardSeprom <= 0 && InvaderRewardPromerium <= 0))
                return;

            MapInstance instance = MapManager.GetInstanceByMapId(run.MapId);
            if (instance == null)
                return;

            int boxId = NextInvaderCargoBoxId();
            while (instance.Info.Collectables.ContainsKey(boxId))
                boxId = NextInvaderCargoBoxId();

            CargoBox cargoBox = new CargoBox(boxId, npc.LocX, npc.LocY, run.MapId);
            cargoBox.Promerium = InvaderRewardPromerium;
            cargoBox.Seprom = InvaderRewardSeprom;

            instance.Info.Collectables.Add(boxId, (Collectable)cargoBox);
            BroadcastMapPacket(run.MapId, PacketComposer.Compose("c", boxId.ToString() + "|1|" + npc.LocX + "|" + npc.LocY));
        }

        private static int ScaleReward(int value, double share)
        {
            if (value <= 0 || share <= 0.0)
                return 0;

            return Math.Max(1, Convert.ToInt32(Math.Floor((double)value * share)));
        }

        private static void GrantFixedReward(Session session, int credits, int uridium, int ucb, int rsb, int seprom, int promerium, int xp, int honor, string logMessage)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            bool leveledUp = false;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                leveledUp = session.CharacterInfo.ApplyNpcKillRewardBatch(client, credits, uridium, 0, 0, xp, honor, 1);

                if (ucb > 0 || rsb > 0)
                {
                    client.ClearParameters();
                    client.SetParameter("id", (object)session.CharacterInfo.Id);
                    client.ExecuteNonQuery("UPDATE users SET ammo_ucb100 = ammo_ucb100 + " + (object)ucb + ", ammo_rsb75 = ammo_rsb75 + " + (object)rsb + " WHERE id=@id LIMIT 1");
                    session.CharacterInfo.AmmoUcb100 += (long)ucb;
                    session.CharacterInfo.AmmoRsb75 += (long)rsb;
                }

                session.CharacterInfo.AddLog(client, logMessage);
            }

            if (seprom > 0)
                session.CharacterInfo.AddCargo(14L, seprom);

            if (promerium > 0)
                session.CharacterInfo.AddCargo(13L, promerium);

            if (credits > 0)
                session.SendData(PacketComposer.Compose("y", "CRE|" + credits + "|" + session.CharacterInfo.Credits));

            if (uridium > 0)
                session.SendData(PacketComposer.Compose("y", "URI|" + uridium + "|" + session.CharacterInfo.Uridium));

            if (xp > 0)
                session.SendData(PacketComposer.Compose("y", "EP|" + xp + "|" + session.CharacterInfo.Experience + "|" + session.CharacterInfo.Level));

            if (honor > 0)
                session.SendData(PacketComposer.Compose("y", "HON|" + honor + "|" + session.CharacterInfo.Honor));

            if (ucb > 0 || rsb > 0)
                session.SendData(PacketComposer.Compose("B", session.CharacterInfo.GetPrimaryWeaponInfoPayload()));

            if (seprom > 0 || promerium > 0)
                session.SendData(session.CharacterInfo.GetCargoMessage());

            session.SendData(UserDataComposer.Compose(session));
            session.SendData(PacketComposer.Compose("A", "STD|" + logMessage));

            if (leveledUp)
                session.SendData(PacketComposer.Compose("A", "LUP|" + session.CharacterInfo.Level + "|1"));
        }

        private static bool IsEligibleRewardSession(Session session, InvasionRun run)
        {
            return session != null
                && session.CharacterInfo != null
                && !session.CharacterInfo.Destroy
                && session.CharacterInfo.MapId == run.MapId
                && session.CharacterInfo.FactionId == run.FactionId;
        }

        private static void CleanupRunNpcs(InvasionRun run)
        {
            if (run == null)
                return;

            foreach (Npc npc in new List<Npc>(run.Npcs.Values))
                RemoveNpcFromMap(run, npc);

            run.Npcs.Clear();
        }

        private static void RemoveNpcFromMap(InvasionRun run, Npc npc)
        {
            if (run == null || npc == null)
                return;

            npc.StopNpcAttack();
            npc.IsDestroying = true;
            SendMarkerHide(run, npc.Id);

            MapInstance instance = MapManager.GetInstanceByMapId(npc.MapId);
            if (instance != null)
            {
                foreach (MapActor actor in instance.GetUserActorSnapshot())
                {
                    if (actor == null || actor.ReferenceSessionId <= 0)
                        continue;

                    Session session = SessionManager.GetSessionById(actor.ReferenceSessionId);
                    if (session != null && session.CharacterInfo != null && session.CharacterInfo.NpcInRange.Contains(npc.Id))
                    {
                        session.CharacterInfo.NpcInRange.Remove(npc.Id);
                        session.SendData(PacketComposer.Compose("R", npc.Id.ToString()));
                    }
                }

                MapActor npcActor = instance.GetActorByReferenceId(npc.Id, MapActorType.AiBot);
                if (npcActor != null)
                    instance.KickNpc(npcActor.Id);
            }

            if (npc.PathFinder != null)
            {
                npc.PathFinder.Dispose();
                npc.PathFinder = null;
                --TimerManager.TimerRunning;
            }

            npc.IsMoving = false;
            NpcAI.NpcToRemove.Add(npc);
            RunsByNpcId.Remove(npc.Id);
        }

        private static void RemoveMissingNpcs(InvasionRun run)
        {
            List<int> remove = new List<int>();
            MapInstance instance = MapManager.GetInstanceByMapId(run.MapId);

            foreach (KeyValuePair<int, Npc> kvp in run.Npcs)
            {
                Npc npc = kvp.Value;
                if (npc == null || npc.IsDestroying)
                {
                    remove.Add(kvp.Key);
                    continue;
                }

                if (instance == null || instance.GetActorByReferenceId(npc.Id, MapActorType.AiBot) == null)
                    remove.Add(kvp.Key);
            }

            foreach (int npcId in remove)
            {
                Npc npc;
                if (run.Npcs.TryGetValue(npcId, out npc) && npc != null)
                    BroadcastInvaderLockClear(npc);

                run.Npcs.Remove(npcId);
                RunsByNpcId.Remove(npcId);
                SendMarkerHide(run, npcId);
            }
        }

        private static void SendMarkers(InvasionRun run)
        {
            if (run == null || !run.Running)
                return;

            foreach (Npc npc in run.Npcs.Values)
            {
                if (npc == null || npc.IsDestroying)
                    continue;

                BroadcastMapPacket(run.MapId, PacketComposer.Compose("MM", "SM|" + npc.Id + "|" + npc.LocX + "|" + npc.LocY + "|" + MarkerLifetimeTicks));
            }
        }

        private static void SendMarkerHide(InvasionRun run, int npcId)
        {
            if (run == null)
                return;

            BroadcastMapPacket(run.MapId, PacketComposer.Compose("MM", "HM|" + npcId));
        }

        private static void GetInvasionSpawnPosition(int mapId, out int x, out int y)
        {
            for (int i = 0; i < 30; i++)
            {
                NpcAI.GetRandomNpcPosition(mapId, out x, out y);
                if (IsSpawnAwayFromPortals(mapId, x, y))
                    return;
            }

            NpcAI.GetRandomNpcPosition(mapId, out x, out y);
        }

        private static bool IsSpawnAwayFromPortals(int mapId, int x, int y)
        {
            CList<PortalInfo> portals = PortalManager.GetPortalForMap(mapId);
            if (portals == null)
                return true;

            const long minDistSquared = 2500L * 2500L;
            foreach (PortalInfo portal in portals.Keys)
            {
                if (portal == null)
                    continue;

                long dx = (long)x - portal.PosX;
                long dy = (long)y - portal.PosY;
                if (dx * dx + dy * dy < minDistSquared)
                    return false;
            }

            return true;
        }

        private static void EnsureMapLoaded(int mapId)
        {
            if (MapManager.GetInstanceByMapId(mapId) == null)
                MapManager.TryLoadMapInstance(mapId);
        }

        private static MapActor[] GetMapUserActors(int mapId)
        {
            MapInstance instance = MapManager.GetInstanceByMapId(mapId);
            if (instance == null)
                return new MapActor[0];

            return instance.GetUserActorSnapshot();
        }

        private static void BroadcastGlobal(string text)
        {
            foreach (MapInstance mapInstance in MapManager.MapInstances.Values)
            {
                if (mapInstance != null && !mapInstance.Unloaded)
                    mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + text), false);
            }
        }

        private static void BroadcastMap(int mapId, string text)
        {
            MapInstance instance = MapManager.GetInstanceByMapId(mapId);
            if (instance != null)
                instance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + text), false);
        }

        private static void BroadcastMapPacket(int mapId, ServerMessage message)
        {
            MapInstance instance = MapManager.GetInstanceByMapId(mapId);
            if (instance != null)
                instance.BroadcastMessage(message, false);
        }

        private static void StopAnnouncementTimer()
        {
            if (mAnnouncementTimer != null)
            {
                mAnnouncementTimer.Dispose();
                mAnnouncementTimer = null;
            }
        }

        private static void StopTimers()
        {
            StopAnnouncementTimer();

            if (mMonitorTimer != null)
            {
                mMonitorTimer.Dispose();
                mMonitorTimer = null;
            }

            if (mMarkerTimer != null)
            {
                mMarkerTimer.Dispose();
                mMarkerTimer = null;
            }

            if (mTimeoutTimer != null)
            {
                mTimeoutTimer.Dispose();
                mTimeoutTimer = null;
            }
        }

        private static void SetDatabaseActive(bool active)
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ExecuteNonQuery("UPDATE event_information SET isActif=" + (active ? "1" : "0") + " WHERE id = 1");
            }
        }
    }
}
