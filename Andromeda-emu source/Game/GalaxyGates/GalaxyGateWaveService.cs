using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Quests;
using OrbitReborn_Emulator.Game.Techs;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Threading;

namespace OrbitReborn_Emulator.Game.GalaxyGates
{
    public static class GalaxyGateWaveService
    {
        private const int INTERNAL_PORTAL_ID_BASE = 92000000;

        private const int INTERNAL_PORTAL_USER_MULT = 50;
        private const int INTERNAL_PORTAL_GATE_MULT = 10;

        private const int INTERNAL_PORTAL_KIND_CONTINUE = 1;
        private const int INTERNAL_PORTAL_KIND_EXIT = 2;

        private const int CENTER_X = 10500;
        private const int CENTER_Y = 6500;

        private const int PORTAL_OFFSET_X = 900;

        private const int SPAWN_MIN_DISTANCE = 4500;
        private const int SPAWN_MAX_DISTANCE = 6500;

        private const int SPAWN_BATCH_INTERVAL_MS = 2500;
        private const int SPAWN_BATCH_MIN = 5;
        private const int SPAWN_BATCH_MAX = 20;
        private const int WAVE_COUNTDOWN_SECONDS = 10;

        private static readonly object SyncRoot = new object();

        private static CDictionnary<int, int> NpcOwners = new CDictionnary<int, int>();

        private static CDictionnary<int, GateRun> Runs = new CDictionnary<int, GateRun>();
        private static readonly Dictionary<string, GateRun> PendingCompletions = new Dictionary<string, GateRun>();
        private static readonly GalaxyGateTimingStore TimingStore = new GalaxyGateTimingStore();

        private static CDictionnary<int, DateTime> LastDeathTime = new CDictionnary<int, DateTime>();

        private class GateRun
        {
            public int CharacterId;
            public int UserId;
            public int GateId;
            public int MapId;

            public int CurrentWave;
            public int Lives;

            public HashSet<int> AliveNpcIds = new HashSet<int>();

            public Queue<WaveSpawn> PendingNpcSpawns = new Queue<WaveSpawn>();
            public int SpawnBatchSize;
            public Timer SpawnBatchTimer;

            public readonly Guid RunId = Guid.NewGuid();
            public long WaveGeneration;
            public bool CountdownActive;
            public long CountdownDeadline;
            public int LastCountdownSecond = -1;
            public Timer CountdownTimer;
            public Session OwnerSession;

            public bool Completed;
            public bool Retired;
            public bool WaveFinished;
            public GalaxyGateTimingRun Timing;
            public GalaxyGateCompletion Completion;
            public bool CompletionPersisting, CompletionPersisted;
            public int CompletionFailures;
            public Timer CompletionRetry;
            public Dictionary<int, GalaxyGateProtection> Escorts = new Dictionary<int, GalaxyGateProtection>();
        }

        private sealed class WaveTimerState
        {
            public readonly GateRun Run;
            public readonly long Generation;
            public WaveTimerState(GateRun run) { Run = run; Generation = run.WaveGeneration; }
        }

        private class WaveNpc
        {
            public string Name;
            public int Count, HpMultiplier, ShieldMultiplier, DamageMultiplier, Group;
            public readonly int RewardMultiplier = 1;
            public bool Protected;
            public WaveNpc(string name, int count, int force = 1, int group = 0, bool protect = false)
            {
                Name = name; Count = count; HpMultiplier = ShieldMultiplier = DamageMultiplier = force;
                Group = group; Protected = protect;
            }
        }

        private class WaveSpawn
        {
            public WaveNpc Entry;
            public GalaxyGateProtection Group;
        }

        private static List<WaveSpawn> BuildSpawnList(List<WaveNpc> wave)
        {
            var counts = new Dictionary<int, int>();
            foreach (var entry in wave)
                if (entry.Group > 0 && !entry.Protected)
                    counts[entry.Group] = (counts.ContainsKey(entry.Group) ? counts[entry.Group] : 0) + entry.Count;
            var groups = new Dictionary<int, GalaxyGateProtection>();
            foreach (var count in counts) groups[count.Key] = new GalaxyGateProtection(count.Value);
            var result = new List<WaveSpawn>();
            foreach (var entry in wave)
                for (int i = 0; i < entry.Count; i++) result.Add(new WaveSpawn { Entry = entry, Group = entry.Group > 0 ? groups[entry.Group] : null });
            return result;
        }

        public static bool IsGateMap(int mapId)
        {
            return mapId == 51 || mapId == 52 || mapId == 53 || mapId == 55;
        }

        public static bool IsNpcOwnedBy(int npcId, int characterId)
        {
            if (npcId == 0 || characterId <= 0) return false;

            lock (SyncRoot)
            {
                if (NpcOwners == null) return false;
                if (!NpcOwners.ContainsKey(npcId)) return false;
                return NpcOwners[npcId] == characterId;
            }
        }

        public static List<int> GetAliveNpcIdsForOwner(int characterId, int mapId)
        {
            List<int> result = new List<int>();
            if (characterId <= 0 || !IsGateMap(mapId))
                return result;

            lock (SyncRoot)
            {
                if (Runs == null || !Runs.ContainsKey(characterId))
                    return result;

                GateRun run = Runs[characterId];
                if (run == null || run.MapId != mapId || run.AliveNpcIds == null)
                    return result;

                result.AddRange(run.AliveNpcIds);
            }

            return result;
        }

        public static bool TryGetNpcOwner(int npcId, out int ownerCharacterId)
        {
            ownerCharacterId = 0;
            if (npcId == 0) return false;

            lock (SyncRoot)
            {
                if (NpcOwners == null) return false;
                if (!NpcOwners.ContainsKey(npcId)) return false;

                ownerCharacterId = NpcOwners[npcId];
                return true;
            }
        }


        public static bool CanSessionInteractWithNpc(Session session, Npc npc)
        {
            if (session == null || session.CharacterInfo == null || npc == null) return false;
            if (!IsGateMap(npc.MapId)) return true;
            if (session.CharacterInfo.MapId != npc.MapId) return false;

            int ownerCharacterId;
            if (!TryGetNpcOwner(npc.Id, out ownerCharacterId)) return false;
            return ownerCharacterId == session.CharacterId;
        }

        public static bool CanNpcAttackSession(Npc npc, Session session)
        {
            return CanSessionInteractWithNpc(session, npc);
        }

        public static Session GetNpcOwnerSession(Npc npc)
        {
            if (npc == null || !IsGateMap(npc.MapId)) return null;

            int ownerCharacterId;
            if (!TryGetNpcOwner(npc.Id, out ownerCharacterId)) return null;

            Session ownerSession = SessionManager.GetSessionByCharacterId(ownerCharacterId);
            if (ownerSession == null || ownerSession.CharacterInfo == null) return null;
            if (ownerSession.CharacterInfo.MapId != npc.MapId) return null;
            return ownerSession;
        }

        public static bool IsNpcOwnedByCurrentRunOwner(Npc npc)
        {
            if (npc == null || !IsGateMap(npc.MapId)) return true;

            int ownerCharacterId;
            if (!TryGetNpcOwner(npc.Id, out ownerCharacterId)) return false;

            Session ownerSession = SessionManager.GetSessionByCharacterId(ownerCharacterId);
            if (ownerSession == null || ownerSession.CharacterInfo == null) return false;
            if (ownerSession.CharacterInfo.MapId != npc.MapId) return false;

            lock (SyncRoot)
            {
                if (!Runs.ContainsKey(ownerCharacterId)) return false;
                GateRun run = Runs[ownerCharacterId];
                if (run == null || run.MapId != npc.MapId) return false;
                return run.AliveNpcIds.Contains(npc.Id);
            }
        }


        public static int GateIdFromMap(int mapId)
        {
            if (mapId == 51) return 1;
            if (mapId == 52) return 2;
            if (mapId == 53) return 3;
            if (mapId == 55) return 4;
            return 0;
        }

        public static int TotalWaves(int gateId)
        {
            return 10;
        }

        private static void GetHomeBase(Session session, out int homeMapId, out int x, out int y)
        {
            int faction = session.CharacterInfo.RealFaction > 0 ? session.CharacterInfo.RealFaction : session.CharacterInfo.FactionId;

            if (faction == 2)
            {
                homeMapId = 5;
                x = 18500;
                y = 1100;
                return;
            }

            if (faction == 3)
            {
                homeMapId = 9;
                x = 19000;
                y = 11300;
                return;
            }

            homeMapId = 1;
            x = 2000;
            y = 1100;
        }

        private static int GetInternalPortalBaseId(int userId, int gateId)
        {
            return INTERNAL_PORTAL_ID_BASE + (userId * INTERNAL_PORTAL_USER_MULT) + (gateId * INTERNAL_PORTAL_GATE_MULT);
        }

        private static void ClearInternalPortals(Session session)
        {
            if (session?.CharacterInfo == null) return;

            session.CharacterInfo.GalaxyGateInternalPortals = new CList<PortalInfo>();
            session.CharacterInfo.GalaxyGateInternalPortalDestinations = new CDictionnary<int, PortalInfo>();

            MapInstance instance = MapManager.GetInstanceByMapId(session.CharacterInfo.MapId);
            if (instance != null) instance.SendPortals(session);
        }

        private static void SendAliveGateNpcsToOwner(Session session, GateRun run)
        {
            if (session == null || session.CharacterInfo == null || run == null)
                return;

            MapInstance instance = MapManager.GetInstanceByMapId(run.MapId);
            if (instance == null)
                return;

            List<int> npcIds;
            lock (SyncRoot)
            {
                npcIds = new List<int>(run.AliveNpcIds);
            }

            foreach (int npcId in npcIds)
            {
                MapActor actor = instance.GetActorByReferenceId(npcId, MapActorType.AiBot);
                if (actor == null)
                    continue;

                Npc npc = actor.ReferenceObject as Npc;
                if (npc == null || npc.IsDestroying)
                    continue;

                if (!session.CharacterInfo.NpcInRange.Contains(npc.Id))
                    session.CharacterInfo.NpcInRange.Add(npc.Id);

                session.SendData(PacketComposer.Compose("C", npc.Id.ToString() + "|" + (object)npc.ShipId + "|0|" + npc.ClanTag + "|" + npc.Name + "|" + (object)npc.LocX + "|" + (object)npc.LocY + "|" + (object)npc.FactionId + "|" + (object)npc.IsClanMember + "|" + (object)npc.Rank + "|" + (object)npc.IsBoss + "|" + (object)npc.IsClanMember + "|" + (object)npc.GalaxyGatesRings + "|0|0|0|MV|" + npc.ShipSpeed + "|" + npc.VisualLifeToken));
                npc.SendGalaxyGateProtection(session);
                session.SendData(MapUserMovementListComposer.ComposeIA(new CList<MapActor>() { actor }));

                if (npc.Drones == 1)
                    session.SendData(PacketComposer.Compose("n", "d|" + npc.Id + "|3/2-15-15-15-15/4-15-15-15-15-15-15-15-15/2-15-15-15-15"));
                else if (npc.Drones == 2)
                    session.SendData(PacketComposer.Compose("n", "d|" + npc.Id + "|3/2-25-25-25-25/4-25-25-25-25-25-25-25-25/2-25-25-25-25"));
            }
        }

        public static void OnPlayerEnteredMap(Session session)
        {
            if (session == null || session.CharacterInfo == null) return;
            lock (TechInventoryService.SyncRoot(session.CharacterId))
            lock (session.CharacterInfo.DroneImpactSyncRoot)
                OnPlayerEnteredMapCore(session);
        }

        private static void OnPlayerEnteredMapCore(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            int mapId = session.CharacterInfo.MapId;

            if (!IsGateMap(mapId))
                return;

            int gateId = GateIdFromMap(mapId);
            if (gateId == 0)
                return;

            int onMap = 0;
            int lives = 0;
            int currentWave = 0;
            int completed = 0;

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("uid", (object)session.CharacterInfo.Id);
                client.SetParameter("gid", (object)gateId);

                DataTable dt = client.ExecuteQueryTable(
                    "SELECT on_map, lives, current_wave, completed FROM player_galaxy_gates WHERE user_id=@uid AND gate_id=@gid LIMIT 1"
                );

                if (dt == null || dt.Rows.Count == 0)
                {
                    session.SendData(PacketComposer.Compose("A", "STD|Galaxy Gate not found in database. Returning to X-1."));
                    int hm, hx, hy;
                    GetHomeBase(session, out hm, out hx, out hy);
                    MapHandler.OpenPublicConnection(session, hm, null);
                    return;
                }

                DataRow row = dt.Rows[0];
                onMap = Convert.ToInt32(row["on_map"]);
                lives = Convert.ToInt32(row["lives"]);
                currentWave = Convert.ToInt32(row["current_wave"]);
                completed = Convert.ToInt32(row["completed"]);
            }

            if (onMap != 1)
            {
                session.SendData(PacketComposer.Compose("A", "STD|This Galaxy Gate is not active (on_map=0). Returning to X-1."));
                int hm, hx, hy;
                GetHomeBase(session, out hm, out hx, out hy);
                MapHandler.OpenPublicConnection(session, hm, null);
                return;
            }

            if (lives <= 0)
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ClearParameters();
                    client.SetParameter("uid", (object)session.CharacterInfo.Id);
                    client.SetParameter("gid", (object)gateId);
                    client.ExecuteNonQuery("UPDATE player_galaxy_gates SET on_map=0, completed=0, current_wave=0, lives=0" + GalaxyGateTimingStore.ResetIfAvailable(s => client.ExecuteQueryTable(s)) + " WHERE user_id=@uid AND gate_id=@gid");
                }

                session.SendData(PacketComposer.Compose("A", "STD|Galaxy Gate failed: no lives left. Returning to X-1."));
                int hm, hx, hy;
                GetHomeBase(session, out hm, out hx, out hy);
                MapHandler.OpenPublicConnection(session, hm, null);
                return;
            }

            GateRun run;

            // A final kill waiting for durable closure survives an explicit
            // session cleanup. Never spawn that final wave again while retrying.
            GateRun pendingCompletion;
            lock (SyncRoot) PendingCompletions.TryGetValue(TimingKey(session.CharacterInfo.Id, gateId), out pendingCompletion);
            if (pendingCompletion != null)
            {
                TryPersistCompletion(pendingCompletion);
                lock (SyncRoot) { if (!pendingCompletion.CompletionPersisted) return; }
                completed = 1;
            }

            lock (SyncRoot)
            {
                if (!Runs.ContainsKey(session.CharacterId) || Runs[session.CharacterId].Retired)
                {
                    run = new GateRun
                    {
                        CharacterId = session.CharacterId,
                        UserId = session.CharacterInfo.Id,
                        GateId = gateId,
                        MapId = mapId,
                        CurrentWave = 0,
                        Lives = lives,
                        Completed = false
                    };
                    if (Runs.ContainsKey(session.CharacterId)) Runs.Remove(session.CharacterId);
                    Runs.Add(session.CharacterId, run);
                }
                else
                {
                    run = Runs[session.CharacterId];
                    run.Retired = false;
                    run.GateId = gateId;
                    run.MapId = mapId;
                    run.Lives = lives;
                }
                run.OwnerSession = session;
            }

            if (completed != 1 && run.Timing == null)
            {
                try
                {
                    int company = session.CharacterInfo.RealFaction > 0 ? session.CharacterInfo.RealFaction : session.CharacterInfo.FactionId;
                    GalaxyGateTimingRun timing = TimingStore.Enter(session.CharacterInfo.Id, gateId, company);
                    lock (SyncRoot) run.Timing = timing;
                    if (!timing.TrackingAvailable) Output.WriteLine("[GG timing] Manual timing migration unavailable; existing Gate progression preserved without a ranking time.", OutputLevel.Warning);
                    if (timing.GateCompleted) completed = 1;
                }
                catch (Exception ex)
                {
                    Output.WriteLine("[GG timing] Entry deferred: " + ex.Message, OutputLevel.Warning);
                    session.SendData(PacketComposer.Compose("A", "STD|Galaxy Gate is temporarily unavailable. Please reconnect to retry."));
                    return;
                }
            }

            if (completed == 1)
            {
                lock (SyncRoot)
                {
                    run.Completed = true;
                    run.CurrentWave = TotalWaves(gateId);
                }

                EnsureExitPortal(session, gateId);
                session.SendData(PacketComposer.Compose("A", "STD|Galaxy Gate completed! Exit portal is at the center."));
                return;
            }

            bool waveAlreadyRunning;
            bool shouldResumeSpawns;
            int resumeBatchSize;

            lock (SyncRoot)
            {
                if (run.WaveFinished)
                {
                    // A resync between waves does not stand in for the CONTINUE action.
                    SpawnWaveTransitionPortals(session, run.GateId);
                    return;
                }
                // Transport reconnect/resync keeps the same run and monotonic deadline.
                // Explicit logout/map leave/death retires the run through CleanupRun.
                if (run.CountdownActive)
                {
                    ClearInternalPortals(session);
                    ContinueWaveCountdown(session, run, true);
                    return;
                }
                waveAlreadyRunning = run.AliveNpcIds.Count > 0 || run.PendingNpcSpawns.Count > 0;
                shouldResumeSpawns = (run.PendingNpcSpawns.Count > 0 && run.SpawnBatchTimer == null);
                resumeBatchSize = run.SpawnBatchSize;
            }

            if (waveAlreadyRunning)
            {
                ClearInternalPortals(session);
                SendAliveGateNpcsToOwner(session, run);

                if (shouldResumeSpawns)
                {
                    if (resumeBatchSize <= 0) resumeBatchSize = SPAWN_BATCH_MIN;

                    SpawnNpcBatch(session, run, resumeBatchSize);

                    StartSpawnBatchTimerIfNeeded(run);
                }
                return;
            }

            int waveToSpawn = currentWave <= 0 ? 1 : currentWave;
            SpawnWave(session, run, waveToSpawn);
        }

        private static void SpawnWave(Session session, GateRun run, int waveNumber)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            int mapId = session.CharacterInfo.MapId;
            if (mapId != run.MapId || !IsGateMap(mapId))
                return;

            int totalWaves = TotalWaves(run.GateId);
            if (waveNumber < 1) waveNumber = 1;
            if (waveNumber > totalWaves) waveNumber = totalWaves;

            List<WaveNpc> wave = GetWave(run.GateId, waveNumber);
            if (wave == null || wave.Count == 0)
            {
                session.SendData(PacketComposer.Compose("A", "STD|Wave not defined."));
                return;
            }

            MapInstance instance = MapManager.GetInstanceByMapId(mapId);
            if (instance == null)
                return;

            ClearInternalPortals(session);

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("uid", (object)session.CharacterInfo.Id);
                client.SetParameter("gid", (object)run.GateId);
                client.SetParameter("w", (object)waveNumber);
                client.ExecuteNonQuery("UPDATE player_galaxy_gates SET current_wave=@w, completed=0 WHERE user_id=@uid AND gate_id=@gid");
            }

            List<WaveSpawn> spawnList = BuildSpawnList(wave);

            for (int i = spawnList.Count - 1; i > 0; i--)
            {
                int j = NpcAI.RandomPos.Next(0, i + 1);
                WaveSpawn tmp = spawnList[i];
                spawnList[i] = spawnList[j];
                spawnList[j] = tmp;
            }

            int total = spawnList.Count;

            int batchSize = total / 3;
            if (batchSize < SPAWN_BATCH_MIN) batchSize = SPAWN_BATCH_MIN;
            if (batchSize > SPAWN_BATCH_MAX) batchSize = SPAWN_BATCH_MAX;
            if (batchSize > total) batchSize = total;

            lock (SyncRoot)
            {
                if (!IsCurrentRun(run) || run.CountdownActive || run.AliveNpcIds.Count > 0
                    || run.PendingNpcSpawns.Count > 0) return;
                ++run.WaveGeneration;
                run.CurrentWave = waveNumber;
                run.Completed = false;
                run.WaveFinished = false;
                run.Escorts.Clear();

                run.AliveNpcIds.Clear();

                run.PendingNpcSpawns.Clear();
                foreach (WaveSpawn spawn in spawnList)
                    run.PendingNpcSpawns.Enqueue(spawn);

                run.SpawnBatchSize = batchSize;

                if (run.SpawnBatchTimer != null)
                {
                    run.SpawnBatchTimer.Dispose();
                    run.SpawnBatchTimer = null;
                }
                run.CountdownActive = true;
                run.CountdownDeadline = Stopwatch.GetTimestamp() + WAVE_COUNTDOWN_SECONDS * Stopwatch.Frequency;
                run.LastCountdownSecond = -1;
                ContinueWaveCountdown(session, run, true);
            }
        }

        // Call with SyncRoot held. Never revive a timer belonging to an old run/wave.
        private static bool IsCurrentRun(GateRun run)
        {
            return run != null && !run.Retired && Runs.ContainsKey(run.CharacterId)
                && object.ReferenceEquals(Runs[run.CharacterId], run);
        }

        private static bool IsLiveOwner(Session session, GateRun run)
        {
            return session != null && object.ReferenceEquals(session, run.OwnerSession)
                && session.CharacterInfo != null && !session.Stopped && !session.StoppedPlayer
                && !session.CharacterInfo.Disconnected && !session.CharacterInfo.Destroy
                && !session.CharacterInfo.DeadCommitted && session.CharacterInfo.ShipHp > 0
                && session.MapJoined && session.CharacterId == run.CharacterId
                && session.CharacterInfo.MapId == run.MapId;
        }

        private static void StopWaveCountdownTimer(GateRun run)
        {
            if (run.CountdownTimer == null) return;
            run.CountdownTimer.Dispose();
            run.CountdownTimer = null;
        }

        private static void OnWaveCountdownTimer(object state)
        {
            WaveTimerState timer = (WaveTimerState)state;
            GateRun run = timer.Run;
            Session session = run.OwnerSession;
            if (session == null || session.CharacterInfo == null) return;
            lock (TechInventoryService.SyncRoot(run.CharacterId))
            lock (session.CharacterInfo.DroneImpactSyncRoot)
            lock (SyncRoot)
            {
                if (!IsCurrentRun(run) || timer.Generation != run.WaveGeneration || !run.CountdownActive) return;
                ContinueWaveCountdown(session, run, false);
            }
        }

        // One one-shot timer per run, aligned to the original 10s deadline, never per NPC/batch.
        // A disconnected transport parks it. Reconnect resumes that deadline; no offline spawn.
        private static void ContinueWaveCountdown(Session session, GateRun run, bool replay)
        {
            if (!IsCurrentRun(run) || !run.CountdownActive) return;
            if (!IsLiveOwner(session, run))
            {
                StopWaveCountdownTimer(run);
                ++run.WaveGeneration; // Queued callbacks cannot resume this parked timer.
                return;
            }

            long remaining = Math.Max(0, run.CountdownDeadline - Stopwatch.GetTimestamp());
            int seconds = (int)Math.Ceiling(remaining / (double)Stopwatch.Frequency);
            if (replay || seconds != run.LastCountdownSecond)
            {
                run.LastCountdownSecond = seconds;
                session.SendData(PacketComposer.Compose("A", "STD|Wave " + run.CurrentWave
                    + (seconds > 0 ? " begins in " + seconds : " begins now")));
            }
            if (remaining == 0)
            {
                // Claim completion before the first spawn. Duplicate callbacks/resyncs cannot claim it twice.
                run.CountdownActive = false;
                StopWaveCountdownTimer(run);
                SpawnNpcBatch(session, run, run.SpawnBatchSize);
                StartSpawnBatchTimerIfNeeded(run);
                return;
            }

            if (run.CountdownTimer == null)
                run.CountdownTimer = new Timer(OnWaveCountdownTimer, new WaveTimerState(run), Timeout.Infinite, Timeout.Infinite);
            long untilNextSecond = remaining - (seconds - 1L) * Stopwatch.Frequency;
            int due = Math.Max(1, (int)Math.Ceiling(untilNextSecond * 1000.0 / Stopwatch.Frequency));
            run.CountdownTimer.Change(due, Timeout.Infinite);
        }

        private static void StartSpawnBatchTimerIfNeeded(GateRun run)
        {
            lock (SyncRoot)
            {
                if (!IsCurrentRun(run) || run.CountdownActive || run.Completed || run.WaveFinished) return;
                if (run.SpawnBatchTimer != null) return;
                if (run.PendingNpcSpawns == null || run.PendingNpcSpawns.Count <= 0) return;

                run.SpawnBatchTimer = new Timer(OnSpawnBatchTimer, new WaveTimerState(run), SPAWN_BATCH_INTERVAL_MS, SPAWN_BATCH_INTERVAL_MS);
            }
        }

        private static void StopSpawnBatchTimer(GateRun run)
        {
            lock (SyncRoot)
            {
                if (run?.SpawnBatchTimer != null)
                {
                    run.SpawnBatchTimer.Dispose();
                    run.SpawnBatchTimer = null;
                }
            }
        }

        private static void OnSpawnBatchTimer(object state)
        {
            WaveTimerState timer = (WaveTimerState)state;
            GateRun run = timer.Run;
            if (run == null) return;

            Session s = run.OwnerSession;
            if (s == null || s.CharacterInfo == null)
            {
                StopSpawnBatchTimer(run);
                return;
            }

            lock (TechInventoryService.SyncRoot(run.CharacterId))
            lock (s.CharacterInfo.DroneImpactSyncRoot)
            lock (SyncRoot)
            {
                if (!IsCurrentRun(run) || timer.Generation != run.WaveGeneration) return;
                if (!IsLiveOwner(s, run))
                {
                    StopSpawnBatchTimer(run);
                    ++run.WaveGeneration;
                    return;
                }

                int batch = run.SpawnBatchSize;
                if (batch <= 0) batch = SPAWN_BATCH_MIN;

                SpawnNpcBatch(s, run, batch);

                if (run.PendingNpcSpawns.Count == 0)
                    StopSpawnBatchTimer(run);
            }
        }

        private static void SpawnNpcBatch(Session session, GateRun run, int maxToSpawn)
        {
            if (session == null || session.CharacterInfo == null || run == null) return;
            if (!IsGateMap(session.CharacterInfo.MapId)) return;

            MapInstance instance = MapManager.GetInstanceByMapId(session.CharacterInfo.MapId);
            if (instance == null) return;

            List<WaveSpawn> toSpawn = new List<WaveSpawn>();

            lock (SyncRoot)
            {
                if (!IsCurrentRun(run) || run.CountdownActive || run.Completed || run.WaveFinished
                    || !IsLiveOwner(session, run) || session.CharacterId != run.CharacterId
                    || session.CharacterInfo.MapId != run.MapId) return;

                if (run.PendingNpcSpawns == null) return;
                while (toSpawn.Count < maxToSpawn && run.PendingNpcSpawns.Count > 0)
                    toSpawn.Add(run.PendingNpcSpawns.Dequeue());

                if (toSpawn.Count == 0)
                    return;

                foreach (WaveSpawn spawn in toSpawn)
                {
                    WaveNpc entry = spawn.Entry;
                    List<string> tpl = entry.Name == "-=[ DemaNeR ]=-"
                        ? new List<string> { entry.Name,"1","0","0","11","400000","400000","300000","300000","300","409600","256","0","0","0","","0","0","0","0","0","4215" }
                        : NpcAI.GetNpcTemplate(entry.Name);
                    if (tpl == null || tpl.Count < 22)
                        continue;

                    double angle = NpcAI.RandomPos.NextDouble() * Math.PI * 2;
                    int distance = NpcAI.RandomPos.Next(SPAWN_MIN_DISTANCE, SPAWN_MAX_DISTANCE);

                    int x = CENTER_X + (int)(Math.Cos(angle) * distance);
                    int y = CENTER_Y + (int)(Math.Sin(angle) * distance);

                    if (x < 300) x = 300;
                    if (x > 20700) x = 20700;
                    if (y < 300) y = 300;
                    if (y > 12600) y = 12600;

                    Npc npc = NpcManager.CreateNewInstance(
                        tpl[0],
                        session.CharacterInfo.MapId, x, y,
                        Convert.ToInt32(tpl[4]),
                        Convert.ToInt32(tpl[5]),
                        Convert.ToInt32(tpl[6]),
                        Convert.ToInt32(tpl[7]),
                        Convert.ToInt32(tpl[8]),
                        Convert.ToInt32(tpl[9]),
                        Convert.ToInt32(tpl[10]),
                        Convert.ToInt32(tpl[11]),
                        Convert.ToInt32(tpl[12]),
                        Convert.ToInt32(tpl[13]),
                        Convert.ToInt32(tpl[14]),
                        tpl[15],
                        Convert.ToInt32(tpl[16]),
                        Convert.ToInt32(tpl[17]),
                        Convert.ToInt32(tpl[18]),
                        Convert.ToInt32(tpl[19]),
                        Convert.ToInt32(tpl[20]),
                        Convert.ToInt32(tpl[21])
                    );

                    if (entry.Name == "-=[ DemaNeR ]=-")
                    {
                        // FAQ-based stats; standard Andromeda range/cadence/AI, no added ability.
                        npc.DamageMin = 3580; npc.DamageMax = 4850;
                        npc.ExperienceReward = 51200; npc.HonorReward = 512;
                    }
                    // Owner-approved force affects combat only. Rewards/cargo/speed stay unchanged.
                    npc.ShipMaxHp *= entry.HpMultiplier; npc.ShipHp = npc.ShipMaxHp;
                    npc.ShipMaxShield *= entry.ShieldMultiplier; npc.ShipShield = npc.ShipMaxShield;
                    npc.DamageMin *= entry.DamageMultiplier; npc.DamageMax *= entry.DamageMultiplier;
                    npc.Damages *= entry.DamageMultiplier;
                    if (spawn.Group != null)
                    {
                        if (entry.Protected) { npc.GalaxyGateProtection = spawn.Group; spawn.Group.Principal = npc; }
                        else run.Escorts.Add(npc.Id, spawn.Group);
                    }
                    npc.Respawn = false;
                    npc.SharedRewards = 1;

                    run.AliveNpcIds.Add(npc.Id);
                    if (!NpcOwners.ContainsKey(npc.Id))
                        NpcOwners.Add(npc.Id, run.CharacterId);
                    instance.AddNpcToMap(npc);
                    NpcAI.NpcToAdd.Add(npc);
                    npc.SetTargetWithoutAttackTimer(run.CharacterId);
            }
            }
        }

        public static void OnNpcDestroyed(int mapId, int npcId)
        {
            if (!IsGateMap(mapId)) return;
            int ownerCharacterId;
            GateRun run;
            lock (SyncRoot)
            {
                if (!NpcOwners.ContainsKey(npcId)) return;
                ownerCharacterId = NpcOwners[npcId];
                NpcOwners.Remove(npcId);
                if (!Runs.ContainsKey(ownerCharacterId)) return;
                run = Runs[ownerCharacterId];
                if (run.Retired || !run.AliveNpcIds.Remove(npcId)) return;
                GalaxyGateProtection group;
                if (run.Escorts.TryGetValue(npcId, out group))
                {
                    run.Escorts.Remove(npcId);
                    if (group.EscortDestroyed() && group.Principal != null)
                        group.Principal.SendGalaxyGateProtection(SessionManager.GetSessionByCharacterId(ownerCharacterId));
                }
            }

            bool waveFinishedNow = false;
            bool completedNow = false;
            int nextWave = 0;

            int totalWaves = TotalWaves(run.GateId);

            lock (SyncRoot)
            {
                if (run.Completed || run.WaveFinished || run.Retired) return;

                bool noAlive = run.AliveNpcIds.Count == 0;
                bool noPending = run.PendingNpcSpawns == null || run.PendingNpcSpawns.Count == 0;

                if (noAlive && noPending)
                {
                    run.WaveFinished = true;
                    if (run.CurrentWave >= totalWaves)
                    {
                        run.Completed = true;
                        run.Completion = GalaxyGateCompletion.Finish(run.Timing, GalaxyGateTimingClock.Instance);
                        PendingCompletions[TimingKey(run.UserId, run.GateId)] = run;
                        completedNow = true;
                    }
                    else
                    {
                        waveFinishedNow = true;
                        nextWave = run.CurrentWave + 1;
                    }
                }
            }

            if (completedNow)
            {
                TryPersistCompletion(run);
                return;
            }

            Session ownerSession = SessionManager.GetSessionByCharacterId(ownerCharacterId);
            if (ownerSession == null || ownerSession.CharacterInfo == null) return;

            if (!waveFinishedNow)
                return;

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("uid", (object)ownerSession.CharacterInfo.Id);
                client.SetParameter("gid", (object)run.GateId);
                client.SetParameter("w", (object)nextWave);
                client.ExecuteNonQuery("UPDATE player_galaxy_gates SET current_wave=@w, completed=0 WHERE user_id=@uid AND gate_id=@gid");
            }

            SpawnWaveTransitionPortals(ownerSession, run.GateId);

            ownerSession.SendData(PacketComposer.Compose(
                "A",
                "STD|Wave completed! Jump the Galaxy Gate to start the next wave, or use the exit portal to return to X-1."
            ));
        }

        private static string TimingKey(int player, int gate) { return player + ":" + gate; }

        private static void TryPersistCompletion(GateRun run)
        {
            lock (SyncRoot)
            {
                if (run.Completion == null || run.CompletionPersisting || run.CompletionPersisted) return;
                if (!run.Completion.TrackingAvailable && (!IsCurrentRun(run) || run.Retired))
                {
                    if (run.CompletionRetry != null) { run.CompletionRetry.Dispose(); run.CompletionRetry = null; }
                    GateRun pending;
                    string key = TimingKey(run.UserId, run.GateId);
                    if (PendingCompletions.TryGetValue(key, out pending) && ReferenceEquals(pending, run)) PendingCompletions.Remove(key);
                    return;
                }
                run.CompletionPersisting = true;
            }
            try
            {
                Session questOwner = SessionManager.GetSessionByCharacterId(run.CharacterId);
                QuestObjectiveProgress.CheckpointHistoricalProgress(questOwner);
                bool committed = TimingStore.Complete(run.Completion, TotalWaves(run.GateId));
                lock (SyncRoot)
                {
                    run.CompletionPersisted = committed;
                    if (run.CompletionRetry != null) { run.CompletionRetry.Dispose(); run.CompletionRetry = null; }
                    GateRun pending;
                    string key = TimingKey(run.UserId, run.GateId);
                    if (PendingCompletions.TryGetValue(key, out pending) && ReferenceEquals(pending, run)) PendingCompletions.Remove(key);
                }
                if (!committed) return; // Last life lost / portal replaced: never resurrect it.
                Session owner = SessionManager.GetSessionByCharacterId(run.CharacterId);
                if (owner != null && owner.CharacterInfo != null)
                {
                    QuestObjectiveProgress.RefreshHistoricalProgress(owner);
                    owner.SendData(PacketComposer.Compose("QST", "UPD"));
                }
                bool samePassage;
                lock (SyncRoot)
                {
                    GateRun active = Runs.ContainsKey(run.CharacterId) ? Runs[run.CharacterId] : null;
                    samePassage = CanPublishTimingCompletion(run.Completion, active == null ? null : active.Timing);
                }
                if (owner != null && owner.CharacterInfo != null && !owner.Stopped && !owner.StoppedPlayer
                    && owner.CharacterInfo.MapId == run.MapId && !owner.CharacterInfo.Disconnected && samePassage)
                {
                    try
                    {
                        EnsureExitPortal(owner, run.GateId);
                        owner.SendData(PacketComposer.Compose("A", "STD|Galaxy Gate finished! Exit portal spawned."));
                    }
                    catch (Exception ex) { Output.WriteLine("[GG timing] Exit portal refresh deferred: " + ex.Message, OutputLevel.Warning); }
                }
            }
            catch (Exception ex)
            {
                Output.WriteLine("[GG timing] Completion deferred: " + ex.Message, OutputLevel.Warning);
                lock (SyncRoot)
                {
                    int delay = Math.Min(30000, 1000 << Math.Min(run.CompletionFailures++, 5));
                    if (run.CompletionRetry == null)
                        run.CompletionRetry = new Timer(_ => TryPersistCompletion(run), null, Timeout.Infinite, Timeout.Infinite);
                    run.CompletionRetry.Change(delay, Timeout.Infinite);
                }
            }
            finally { lock (SyncRoot) run.CompletionPersisting = false; }
        }

        internal static bool CanPublishTimingCompletion(GalaxyGateCompletion completion, GalaxyGateTimingRun active)
        {
            return completion != null && active != null && completion.RunId == active.RunId
                && completion.PlayerId == active.PlayerId && completion.GateId == active.GateId;
        }

        private static void SpawnWaveTransitionPortals(Session session, int gateId)
        {
            if (session == null || session.CharacterInfo == null) return;
            int mapId = session.CharacterInfo.MapId;
            if (!IsGateMap(mapId)) return;

            int homeMapId, homeX, homeY;
            GetHomeBase(session, out homeMapId, out homeX, out homeY);

            int baseId = GetInternalPortalBaseId(session.CharacterInfo.Id, gateId);

            int continuePortalId = baseId + INTERNAL_PORTAL_KIND_CONTINUE;
            int exitPortalId = baseId + INTERNAL_PORTAL_KIND_EXIT;

            int continueType = gateId + 1;
            if (continueType < 2 || continueType > 5)
                continueType = 2;

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                session.CharacterInfo.GalaxyGateInternalPortals = new CList<PortalInfo>();
                session.CharacterInfo.GalaxyGateInternalPortalDestinations = new CDictionnary<int, PortalInfo>();

                PortalInfo continuePortal = new PortalInfo(client, continuePortalId, CENTER_X - PORTAL_OFFSET_X, CENTER_Y, mapId, 0, continueType);
                PortalInfo continueDest = new PortalInfo(client, continuePortalId, CENTER_X, CENTER_Y, mapId, 0, continueType);

                PortalInfo exitPortal = new PortalInfo(client, exitPortalId, CENTER_X + PORTAL_OFFSET_X, CENTER_Y, mapId, 0, 1);
                PortalInfo exitDest = new PortalInfo(client, exitPortalId, homeX, homeY, homeMapId, 0, 1);

                session.CharacterInfo.GalaxyGateInternalPortals.Add(continuePortal);
                session.CharacterInfo.GalaxyGateInternalPortalDestinations.Add(continuePortal.Id, continueDest);

                session.CharacterInfo.GalaxyGateInternalPortals.Add(exitPortal);
                session.CharacterInfo.GalaxyGateInternalPortalDestinations.Add(exitPortal.Id, exitDest);
            }

            MapInstance instance = MapManager.GetInstanceByMapId(mapId);
            if (instance != null) instance.SendPortals(session);
        }

        private static void EnsureExitPortal(Session session, int gateId)
        {
            if (session == null || session.CharacterInfo == null) return;
            int mapId = session.CharacterInfo.MapId;
            if (!IsGateMap(mapId)) return;

            int homeMapId, homeX, homeY;
            GetHomeBase(session, out homeMapId, out homeX, out homeY);

            int baseId = GetInternalPortalBaseId(session.CharacterInfo.Id, gateId);
            int exitPortalId = baseId + INTERNAL_PORTAL_KIND_EXIT;

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                session.CharacterInfo.GalaxyGateInternalPortals = new CList<PortalInfo>();
                session.CharacterInfo.GalaxyGateInternalPortalDestinations = new CDictionnary<int, PortalInfo>();

                PortalInfo exitPortal = new PortalInfo(client, exitPortalId, CENTER_X, CENTER_Y, mapId, 0, 1);
                PortalInfo destination = new PortalInfo(client, exitPortalId, homeX, homeY, homeMapId, 0, 1);

                session.CharacterInfo.GalaxyGateInternalPortals.Add(exitPortal);
                session.CharacterInfo.GalaxyGateInternalPortalDestinations.Add(exitPortal.Id, destination);
            }

            MapInstance instance = MapManager.GetInstanceByMapId(mapId);
            if (instance != null) instance.SendPortals(session);
        }

        public static bool TryGetInternalDestination(Session session, int portalId, out PortalInfo destination)
        {
            destination = null;
            if (session?.CharacterInfo?.GalaxyGateInternalPortalDestinations == null) return false;
            if (!session.CharacterInfo.GalaxyGateInternalPortalDestinations.ContainsKey(portalId)) return false;
            destination = session.CharacterInfo.GalaxyGateInternalPortalDestinations[portalId];
            return destination != null;
        }

        internal static int PersistDroneWearDeath(SqlDatabaseTransaction db, int playerId, int mapId)
        {
            int gateId = GateIdFromMap(mapId);
            if (!IsGateMap(mapId) || gateId == 0) return -1;
            var rows = db.Query("SELECT on_map,lives FROM player_galaxy_gates WHERE user_id=@p AND gate_id=@g FOR UPDATE", "@p",playerId,"@g",gateId);
            if (rows.Rows.Count == 0 || Convert.ToInt32(rows.Rows[0]["on_map"]) != 1) return -1;
            int lives = Math.Max(0, Convert.ToInt32(rows.Rows[0]["lives"]) - 1);
            string timingReset = lives == 0 ? GalaxyGateTimingStore.ResetIfAvailable(s => db.Query(s)) : "";
            db.Execute("UPDATE player_galaxy_gates SET lives=@l,on_map=IF(@l=0,0,on_map),completed=IF(@l=0,0,completed),current_wave=IF(@l=0,0,current_wave)" + timingReset + " WHERE user_id=@p AND gate_id=@g", "@l",lives,"@p",playerId,"@g",gateId);
            return lives;
        }

        internal static void PublishDroneWearDeath(Session session, int lives)
        {
            if (lives < 0) return;
            GateRun run = null;
            lock (SyncRoot) { if (Runs.ContainsKey(session.CharacterId)) run = Runs[session.CharacterId]; }
            if (run != null) CleanupRun(session, run);
            session.SendData(PacketComposer.Compose("A", "STD|" + (lives > 0
                ? "Galaxy Gate: -1 life. Lives left: " + lives : "Galaxy Gate failed: no lives left.")));
        }

        public static void OnPlayerKilled(Session session)
        {
            if (session == null || session.CharacterInfo == null) return;
            int mapId = session.CharacterInfo.MapId;
            if (!IsGateMap(mapId)) return;

            int gateId = GateIdFromMap(mapId);
            if (gateId == 0) return;

            DateTime now = DateTime.UtcNow;
            lock (SyncRoot)
            {
                DateTime lastDeath;
                if (LastDeathTime.TryGetValue(session.CharacterId, out lastDeath))
                {
                    if ((now - lastDeath).TotalSeconds < 5)
                        return;

                    LastDeathTime[session.CharacterId] = now;
                }
                else
                {
                    LastDeathTime.Add(session.CharacterId, now);
                }
            }

            int onMap = 0;
            int lives = 0;

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("uid", (object)session.CharacterInfo.Id);
                client.SetParameter("gid", (object)gateId);
                DataTable dt = client.ExecuteQueryTable("SELECT on_map, lives FROM player_galaxy_gates WHERE user_id=@uid AND gate_id=@gid LIMIT 1");
                if (dt == null || dt.Rows.Count == 0) return;
                onMap = Convert.ToInt32(dt.Rows[0]["on_map"]);
                lives = Convert.ToInt32(dt.Rows[0]["lives"]);
            }

            if (onMap != 1) return;

            lives = lives - 1;

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("uid", (object)session.CharacterInfo.Id);
                client.SetParameter("gid", (object)gateId);
                client.SetParameter("l", (object)Math.Max(lives, 0));
                client.ExecuteNonQuery("UPDATE player_galaxy_gates SET lives=@l WHERE user_id=@uid AND gate_id=@gid");
            }

            if (Runs.ContainsKey(session.CharacterId))
            {
                GateRun run = Runs[session.CharacterId];
                CleanupRun(session, run);
            }

            if (lives > 0)
            {
                session.SendData(PacketComposer.Compose("A", "STD|Galaxy Gate: -1 life. Lives left: " + lives));
            }
            else
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ClearParameters();
                    client.SetParameter("uid", (object)session.CharacterInfo.Id);
                    client.SetParameter("gid", (object)gateId);
                    client.ExecuteNonQuery("UPDATE player_galaxy_gates SET on_map=0, completed=0, current_wave=0, lives=0" + GalaxyGateTimingStore.ResetIfAvailable(s => client.ExecuteQueryTable(s)) + " WHERE user_id=@uid AND gate_id=@gid");
                }
                session.SendData(PacketComposer.Compose("A", "STD|Galaxy Gate failed: no lives left."));
            }
        }

        public static void CleanupRunForSession(Session session)
        {
            if (session == null || session.CharacterInfo == null) return;
            if (!IsGateMap(session.CharacterInfo.MapId)) return;

            GateRun run = null;
            lock (SyncRoot)
            {
                if (Runs.ContainsKey(session.CharacterId))
                    run = Runs[session.CharacterId];
            }

            if (run != null)
                CleanupRun(session, run);

            lock (SyncRoot)
            {
                if (Runs.ContainsKey(session.CharacterId)) Runs.Remove(session.CharacterId);
                if (LastDeathTime.ContainsKey(session.CharacterId)) LastDeathTime.Remove(session.CharacterId);
            }
        }


        private static void CleanupRun(Session session, GateRun run)
        {
            if (run == null) return;

            lock (SyncRoot)
            {
                run.Retired = true;
                ++run.WaveGeneration;
                run.CountdownActive = false;
                StopWaveCountdownTimer(run);
                run.Escorts.Clear();
            }
            StopSpawnBatchTimer(run);

            lock (SyncRoot)
            {
                if (run.PendingNpcSpawns != null)
                    run.PendingNpcSpawns.Clear();
            }

            HashSet<int> ids = new HashSet<int>();
            lock (SyncRoot)
            {
                foreach (int npcId in run.AliveNpcIds)
                    ids.Add(npcId);

                if (NpcOwners != null)
                {
                    foreach (int npcId in new List<int>(NpcOwners.Keys))
                    {
                        if (NpcOwners.ContainsKey(npcId) && NpcOwners[npcId] == run.CharacterId)
                            ids.Add(npcId);
                    }
                }
            }

            MapInstance instance = MapManager.GetInstanceByMapId(run.MapId);
            foreach (int npcId in ids)
            {
                try
                {
                    if (instance != null)
                    {
                        MapActor actor = instance.GetActorByReferenceId(npcId, MapActorType.AiBot);
                        if (actor != null)
                        {
                            Npc actorNpc = actor.ReferenceObject as Npc;
                            if (actorNpc != null)
                            {
                                actorNpc.StopNpcAttack();
                                NpcAI.NpcToRemove.Add(actorNpc);
                            }
                            instance.KickNpc(actor.Id);
                        }
                    }

                    if (NpcAI.NpcList != null)
                    {
                        foreach (Npc listNpc in new List<Npc>(NpcAI.NpcList.Keys))
                        {
                            if (listNpc != null && listNpc.Id == npcId)
                            {
                                listNpc.StopNpcAttack();
                                NpcAI.NpcToRemove.Add(listNpc);
                            }
                        }
                    }
                }
                catch { }

                lock (SyncRoot)
                {
                    if (NpcOwners.ContainsKey(npcId)) NpcOwners.Remove(npcId);
                }
            }

            lock (SyncRoot)
            {
                run.AliveNpcIds.Clear();
                if (run.PendingNpcSpawns != null) run.PendingNpcSpawns.Clear();
            }

            if (session != null && session.CharacterInfo != null)
            {
                session.CharacterInfo.GalaxyGateInternalPortals = new CList<PortalInfo>();
                session.CharacterInfo.GalaxyGateInternalPortalDestinations = new CDictionnary<int, PortalInfo>();
            }
        }

        private static List<WaveNpc> GetWave(int gateId, int wave)
        {
            if (gateId == 1 || gateId == 2 || gateId == 3)
            {
                if (wave == 1) return new List<WaveNpc>() { new WaveNpc("-=[ Streuner ]=-", 40) };
                if (wave == 2) return new List<WaveNpc>() { new WaveNpc("-=[ Lordakia ]=-", 40) };
                if (wave == 3) return new List<WaveNpc>() { new WaveNpc("-=[ Mordon ]=-", 40) };
                if (wave == 4) return new List<WaveNpc>() { new WaveNpc("-=[ Saimon ]=-", 80) };
                if (wave == 5) return new List<WaveNpc>() { new WaveNpc("-=[ Devolarium ]=-", 20) };
                if (wave == 6) return new List<WaveNpc>() { new WaveNpc("-=[ Kristallin ]=-", 80) };
                if (wave == 7) return new List<WaveNpc>() { new WaveNpc("-=[ Sibelon ]=-", 20) };
                if (wave == 8) return new List<WaveNpc>() { new WaveNpc("-=[ Sibelonit ]=-", 80) };
                if (wave == 9) return new List<WaveNpc>() { new WaveNpc("-=[ Kristallon ]=-", 16) };
                if (wave == 10) return new List<WaveNpc>() { new WaveNpc("-=[ Protegit ]=-", 30) };
                return null;
            }

            if (gateId == 4)
            {
                // FAQ composition; explicit Andromeda combat-only force and escort bindings.
                if (wave == 1) return new List<WaveNpc> { new WaveNpc("-=[ Lordakia ]=-",5,2),new WaveNpc("-=[ Mordon ]=-",10,2),new WaveNpc("-=[ Saimon ]=-",15,2) };
                if (wave == 2) return new List<WaveNpc> { new WaveNpc("-=[ Streuner ]=-",11,2,1),new WaveNpc("-=[ StreuneR ]=-",1,4,1,true) };
                if (wave == 3) return new List<WaveNpc> { new WaveNpc("-=[ Mordon ]=-",5,2),new WaveNpc("-=[ Saimon ]=-",10,2),new WaveNpc("-=[ Kristallin ]=-",15,2) };
                if (wave == 4) return new List<WaveNpc> { new WaveNpc("-=[ Lordakia ]=-",12,4,1),new WaveNpc("-=[ Lordakium ]=-",1,2,1,true) };
                if (wave == 5) return new List<WaveNpc> { new WaveNpc("-=[ Boss Lordakia ]=-",10),new WaveNpc("-=[ Boss Mordon ]=-",8),new WaveNpc("-=[ Boss Saimon ]=-",6) };
                if (wave == 6) return new List<WaveNpc> { new WaveNpc("-=[ Sibelonit ]=-",15,2,1),new WaveNpc("-=[ Sibelon ]=-",1,3,1,true) };
                if (wave == 7) return new List<WaveNpc> { new WaveNpc("-=[ Sibelonit ]=-",5,2),new WaveNpc("-=[ Kristallin ]=-",10,3),new WaveNpc("-=[ Boss StreuneR ]=-",5) };
                if (wave == 8) return new List<WaveNpc> { new WaveNpc("-=[ Kristallin ]=-",10,3,1),new WaveNpc("-=[ Kristallon ]=-",1,2,1,true) };
                if (wave == 9) return new List<WaveNpc> {
                    new WaveNpc("-=[ Protegit ]=-",5,2,1),new WaveNpc("-=[ Boss Lordakium ]=-",1,1,1,true),
                    new WaveNpc("-=[ Protegit ]=-",5,2,2),new WaveNpc("-=[ Boss Lordakium ]=-",1,1,2,true),
                    new WaveNpc("-=[ Protegit ]=-",5,2,3),new WaveNpc("-=[ Boss Lordakium ]=-",1,1,3,true) };
                if (wave == 10) return new List<WaveNpc> { new WaveNpc("-=[ DemaNeR ]=-",3) };
                return null;
            }

            return null;
        }
    }
}
