using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Data;
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

        private static readonly object SyncRoot = new object();

        private static CDictionnary<int, int> NpcOwners = new CDictionnary<int, int>();

        private static CDictionnary<int, GateRun> Runs = new CDictionnary<int, GateRun>();

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

            public Queue<string> PendingNpcSpawns = new Queue<string>();
            public int SpawnBatchSize;
            public Timer SpawnBatchTimer;

            public bool Completed;
        }

        private class WaveNpc
        {
            public string Name;
            public int Count;
            public WaveNpc(string name, int count) { Name = name; Count = count; }
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

                session.SendData(PacketComposer.Compose("C", npc.Id.ToString() + "|" + (object)npc.ShipId + "|0|" + npc.ClanTag + "|" + npc.Name + "|" + (object)npc.LocX + "|" + (object)npc.LocY + "|" + (object)npc.FactionId + "|" + (object)npc.IsClanMember + "|" + (object)npc.Rank + "|" + (object)npc.IsBoss + "|" + (object)npc.IsClanMember + "|" + (object)npc.GalaxyGatesRings));
                session.SendData(MapUserMovementListComposer.ComposeIA(new CList<MapActor>() { actor }));

                if (npc.Drones == 1)
                    session.SendData(PacketComposer.Compose("n", "d|" + npc.Id + "|3/2-15-15-15-15/4-15-15-15-15-15-15-15-15/2-15-15-15-15"));
                else if (npc.Drones == 2)
                    session.SendData(PacketComposer.Compose("n", "d|" + npc.Id + "|3/2-25-25-25-25/4-25-25-25-25-25-25-25-25/2-25-25-25-25"));
            }
        }

        public static void OnPlayerEnteredMap(Session session)
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
                    client.ExecuteNonQuery("UPDATE player_galaxy_gates SET on_map=0, completed=0, current_wave=0, lives=0 WHERE user_id=@uid AND gate_id=@gid");
                }

                session.SendData(PacketComposer.Compose("A", "STD|Galaxy Gate failed: no lives left. Returning to X-1."));
                int hm, hx, hy;
                GetHomeBase(session, out hm, out hx, out hy);
                MapHandler.OpenPublicConnection(session, hm, null);
                return;
            }

            GateRun run;

            lock (SyncRoot)
            {
                if (!Runs.ContainsKey(session.CharacterId))
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
                    Runs.Add(session.CharacterId, run);
                }
                else
                {
                    run = Runs[session.CharacterId];
                    run.GateId = gateId;
                    run.MapId = mapId;
                    run.Lives = lives;
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

            List<string> spawnList = new List<string>();
            foreach (WaveNpc w in wave)
            {
                for (int i = 0; i < w.Count; i++)
                    spawnList.Add(w.Name);
            }

            for (int i = spawnList.Count - 1; i > 0; i--)
            {
                int j = NpcAI.RandomPos.Next(0, i + 1);
                string tmp = spawnList[i];
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
                run.CurrentWave = waveNumber;
                run.Completed = false;

                run.AliveNpcIds.Clear();

                run.PendingNpcSpawns.Clear();
                foreach (string name in spawnList)
                    run.PendingNpcSpawns.Enqueue(name);

                run.SpawnBatchSize = batchSize;

                if (run.SpawnBatchTimer != null)
                {
                    run.SpawnBatchTimer.Dispose();
                    run.SpawnBatchTimer = null;
                }
            }

            SpawnNpcBatch(session, run, batchSize);

            StartSpawnBatchTimerIfNeeded(run);

            session.SendData(PacketComposer.Compose("A", "STD|Galaxy Gate: Wave " + waveNumber + "/" + totalWaves + " started."));
        }

        private static void StartSpawnBatchTimerIfNeeded(GateRun run)
        {
            lock (SyncRoot)
            {
                if (run == null) return;
                if (run.SpawnBatchTimer != null) return;
                if (run.PendingNpcSpawns == null || run.PendingNpcSpawns.Count <= 0) return;

                run.SpawnBatchTimer = new Timer(OnSpawnBatchTimer, run, SPAWN_BATCH_INTERVAL_MS, SPAWN_BATCH_INTERVAL_MS);
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
            GateRun run = (GateRun)state;
            if (run == null) return;

            Session s = SessionManager.GetSessionByCharacterId(run.CharacterId);
            if (s == null || s.CharacterInfo == null)
            {
                StopSpawnBatchTimer(run);
                return;
            }

            if (s.CharacterInfo.MapId != run.MapId)
            {
                StopSpawnBatchTimer(run);
                return;
            }

            int batch;
            lock (SyncRoot) { batch = run.SpawnBatchSize; }
            if (batch <= 0) batch = SPAWN_BATCH_MIN;

            SpawnNpcBatch(s, run, batch);

            bool hasMore;
            lock (SyncRoot) { hasMore = run.PendingNpcSpawns.Count > 0; }
            if (!hasMore)
                StopSpawnBatchTimer(run);
        }

        private static void SpawnNpcBatch(Session session, GateRun run, int maxToSpawn)
        {
            if (session == null || session.CharacterInfo == null || run == null) return;
            if (!IsGateMap(session.CharacterInfo.MapId)) return;

            MapInstance instance = MapManager.GetInstanceByMapId(session.CharacterInfo.MapId);
            if (instance == null) return;

            List<string> toSpawn = new List<string>();

            lock (SyncRoot)
            {
                if (run.PendingNpcSpawns == null) return;

                while (toSpawn.Count < maxToSpawn && run.PendingNpcSpawns.Count > 0)
                {
                    toSpawn.Add(run.PendingNpcSpawns.Dequeue());
                }
            }

            if (toSpawn.Count == 0)
                return;

            foreach (string npcName in toSpawn)
            {
                List<string> tpl = NpcAI.GetNpcTemplate(npcName);
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

                npc.Respawn = false;
                npc.SharedRewards = 1;

                instance.AddNpcToMap(npc);
                NpcAI.NpcToAdd.Add(npc);

                npc.SetTargetWithoutAttackTimer(run.CharacterId);

                lock (SyncRoot)
                {
                    run.AliveNpcIds.Add(npc.Id);
                    if (!NpcOwners.ContainsKey(npc.Id))
                        NpcOwners.Add(npc.Id, run.CharacterId);
                }
            }
        }

        public static void OnNpcDestroyed(int mapId, int npcId)
        {
            if (!IsGateMap(mapId)) return;
            if (!NpcOwners.ContainsKey(npcId)) return;

            int ownerCharacterId = NpcOwners[npcId];
            NpcOwners.Remove(npcId);

            if (!Runs.ContainsKey(ownerCharacterId)) return;
            GateRun run = Runs[ownerCharacterId];

            bool waveFinishedNow = false;
            bool completedNow = false;
            int nextWave = 0;

            int totalWaves = TotalWaves(run.GateId);

            lock (SyncRoot)
            {
                run.AliveNpcIds.Remove(npcId);
                if (run.Completed) return;

                bool noAlive = run.AliveNpcIds.Count == 0;
                bool noPending = run.PendingNpcSpawns == null || run.PendingNpcSpawns.Count == 0;

                if (noAlive && noPending)
                {
                    if (run.CurrentWave >= totalWaves)
                    {
                        run.Completed = true;
                        completedNow = true;
                    }
                    else
                    {
                        waveFinishedNow = true;
                        nextWave = run.CurrentWave + 1;
                    }
                }
            }

            Session ownerSession = SessionManager.GetSessionByCharacterId(ownerCharacterId);
            if (ownerSession == null || ownerSession.CharacterInfo == null) return;

            if (completedNow)
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ClearParameters();
                    client.SetParameter("uid", (object)ownerSession.CharacterInfo.Id);
                    client.SetParameter("gid", (object)run.GateId);
                    client.SetParameter("w", (object)totalWaves);
                    client.ExecuteNonQuery("UPDATE player_galaxy_gates SET completed=1, current_wave=@w WHERE user_id=@uid AND gate_id=@gid");
                }

                EnsureExitPortal(ownerSession, run.GateId);
                ownerSession.SendData(PacketComposer.Compose("A", "STD|Galaxy Gate finished! Exit portal spawned."));
                return;
            }

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
                    client.ExecuteNonQuery("UPDATE player_galaxy_gates SET on_map=0, completed=0, current_wave=0, lives=0 WHERE user_id=@uid AND gate_id=@gid");
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
                if (wave == 7) return new List<WaveNpc>() { new WaveNpc("-=[ Sibelon ]=-", 16) };
                if (wave == 8) return new List<WaveNpc>() { new WaveNpc("-=[ Sibelonit ]=-", 80) };
                if (wave == 9) return new List<WaveNpc>() { new WaveNpc("-=[ Kristallon ]=-", 16) };
                if (wave == 10) return new List<WaveNpc>() { new WaveNpc("-=[ Protegit ]=-", 30) };
                return null;
            }

            if (gateId == 4)
            {
                if (wave == 1) return new List<WaveNpc>() { new WaveNpc("-=[ Lordakia ]=-", 5), new WaveNpc("-=[ Mordon ]=-", 10), new WaveNpc("-=[ Saimon ]=-", 15) };
                if (wave == 2) return new List<WaveNpc>() { new WaveNpc("-=[ Streuner ]=-", 11), new WaveNpc("-=[ Boss Streuner ]=-", 1) };
                if (wave == 3) return new List<WaveNpc>() { new WaveNpc("-=[ Mordon ]=-", 5), new WaveNpc("-=[ Saimon ]=-", 10), new WaveNpc("-=[ Kristallin ]=-", 15) };
                if (wave == 4) return new List<WaveNpc>() { new WaveNpc("-=[ Lordakia ]=-", 12), new WaveNpc("-=[ Lordakium ]=-", 1) };
                if (wave == 5) return new List<WaveNpc>() { new WaveNpc("-=[ Boss Lordakia ]=-", 10), new WaveNpc("-=[ Boss Mordon ]=-", 8), new WaveNpc("-=[ Boss Saimon ]=-", 6) };
                if (wave == 6) return new List<WaveNpc>() { new WaveNpc("-=[ Sibelonit ]=-", 15), new WaveNpc("-=[ Sibelon ]=-", 1) };
                if (wave == 7) return new List<WaveNpc>() { new WaveNpc("-=[ Sibelonit ]=-", 5), new WaveNpc("-=[ Kristallin ]=-", 10), new WaveNpc("-=[ Boss Streuner ]=-", 5) };
                if (wave == 8) return new List<WaveNpc>() { new WaveNpc("-=[ Kristallin ]=-", 10), new WaveNpc("-=[ Kristallon ]=-", 1) };
                if (wave == 9) return new List<WaveNpc>() { new WaveNpc("-=[ Protegit ]=-", 15), new WaveNpc("-=[ Boss Lordakium ]=-", 3) };
                if (wave == 10) return new List<WaveNpc>() { new WaveNpc("-=[ Boss Lordakium ]=-", 3) };
                return null;
            }

            return null;
        }
    }
}
