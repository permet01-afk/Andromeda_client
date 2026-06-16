

using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Specialized;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Util;

namespace OrbitReborn_Emulator.Game.Maps
{
    public class MapInstance : IDisposable
    {
        private object mActorSyncRoot;
        private CDictionnary<int, MapActor> mActors;
        private CDictionnary<int, MapActor> mUserActorsByReferenceId;
        private CDictionnary<int, MapActor> mNpcActorsByReferenceId;
        private int mActorIdGenerator;
        private object mActorIdGeneratorSyncLock;
        private int mInstanceId;
        private MapInfo mInfo;
        private bool mUnloaded;
        private double mUnloadedTimestamp;
        private int mMarkedEmptyMap;
        private Timer mUpdater;
        private MapActor[] mActorSnapshotCache;
        private MapActor[] mUserActorSnapshotCache;
        private MapActor[] mNpcActorSnapshotCache;

        public int ActorCount
        {
            get
            {
                return this.mActors.Count;
            }
        }

        public int HumanActorCount
        {
            get
            {
                lock (this.mActors)
                {
                    return this.mUserActorsByReferenceId.Count;
                }
            }
        }

        public bool HasHumanActors
        {
            get
            {
                lock (this.mActors)
                {
                    return this.mUserActorsByReferenceId.Count > 0;
                }
            }
        }

        public CList<MapActor> Actors
        {
            get
            {
                lock (this.mActors)
                {
                    CList<MapActor> local_0 = new CList<MapActor>();
                    foreach (MapActor item_0 in (IEnumerable<MapActor>)this.mActors.Values)
                        local_0.Add(item_0);
                    return local_0;
                }
            }
        }

        public MapActor[] GetActorSnapshot()
        {
            lock (this.mActors)
            {
                if (this.mActorSnapshotCache == null)
                    this.mActorSnapshotCache = this.mActors.Values.ToArray();
                return this.mActorSnapshotCache;
            }
        }

        public MapActor[] GetUserActorSnapshot()
        {
            lock (this.mActors)
            {
                if (this.mUserActorSnapshotCache == null)
                    this.mUserActorSnapshotCache = this.mUserActorsByReferenceId.Values.ToArray();
                return this.mUserActorSnapshotCache;
            }
        }

        public MapActor[] GetNpcActorSnapshot()
        {
            lock (this.mActors)
            {
                if (this.mNpcActorSnapshotCache == null)
                    this.mNpcActorSnapshotCache = this.mNpcActorsByReferenceId.Values.ToArray();
                return this.mNpcActorSnapshotCache;
            }
        }

        public int InstanceId
        {
            get
            {
                return this.mInstanceId;
            }
        }

        public MapInfo Info
        {
            get
            {
                return this.mInfo;
            }
        }

        public int MapId
        {
            get
            {
                return this.mInfo.Id;
            }
        }

        public bool Unloaded
        {
            get
            {
                return this.mUnloaded;
            }
        }

        public double TimeUnloaded
        {
            get
            {
                return this.Unloaded ? UnixTimestamp.GetCurrent() - this.mUnloadedTimestamp : 0.0;
            }
        }

        public int MarkedAsEmpty
        {
            get
            {
                return this.mMarkedEmptyMap;
            }
            set
            {
                this.mMarkedEmptyMap = value;
            }
        }

        private static void LogTimerFailure(string callbackName, Exception ex)
        {
            Output.WriteLine((object)("[MapInstanceTimer] " + callbackName + " failed: " + ex.ToString()), OutputLevel.CriticalError);
        }

        public MapInstance(int InstanceId, MapInfo Info)
        {
            this.mActorSyncRoot = new object();
            this.mInstanceId = InstanceId;
            this.mInfo = Info;
            this.mActors = new CDictionnary<int, MapActor>();
            this.mUserActorsByReferenceId = new CDictionnary<int, MapActor>();
            this.mNpcActorsByReferenceId = new CDictionnary<int, MapActor>();
            this.mActorIdGenerator = 1;
            this.mActorIdGeneratorSyncLock = new object();
            this.mUpdater = new Timer(new TimerCallback(this.PerformUpdate), (object)null, TimeSpan.FromMilliseconds(500.0), TimeSpan.FromMilliseconds(500.0));
        }

        public int HumanActorFactionCount(int _FactioID)
        {
            int num = 0;
            foreach (MapActor item_0 in this.GetUserActorSnapshot())
            {
                if (item_0 != null && !item_0.IsBot && ((CharacterInfo)item_0.ReferenceObject).FactionId == _FactioID)
                    ++num;
            }
            return num;
        }

        private int GenerateActorId()
        {
            lock (this.mActorIdGeneratorSyncLock)
            {
                if (this.mActorIdGenerator >= int.MaxValue)
                    return 0;
                return this.mActorIdGenerator++;
            }
        }

        public bool AddUserToMap(Session Session)
        {
            if (Session.AbsoluteMapId != this.MapId || !Session.Authenticated)
                return false;
            int actorId = this.GenerateActorId();
            if (actorId == 0)
                return false;
            Vector2 Position = new Vector2(Session.CharacterInfo.LocX, Session.CharacterInfo.LocY);
            MapActor actor = MapActor.TryCreateActor(actorId, MapActorType.UserCharacter, Session.Id, Session.CharacterId, (object)Session.CharacterInfo, Position, this);
            if (actor == null)
                return false;
            this.AddActorToMap(actor);
            return true;
        }

        public bool AddNpcToMap(Npc Npc)
        {
            int actorId = this.GenerateActorId();
            Vector2 Position = new Vector2(Npc.LocX, Npc.LocY);
            MapActor actor = MapActor.TryCreateActor(actorId, MapActorType.AiBot, 0, Npc.Id, (object)Npc, Position, this);
            if (actor == null)
                return false;
            this.AddActorToMap(actor);
            return true;
        }

        private void AddActorToReferenceIndex(MapActor Actor)
        {
            if (Actor == null)
                return;

            if (Actor.Type == MapActorType.UserCharacter)
            {
                this.mUserActorsByReferenceId.Add(Actor.ReferenceId, Actor);
                return;
            }

            if (Actor.Type == MapActorType.AiBot)
                this.mNpcActorsByReferenceId.Add(Actor.ReferenceId, Actor);
        }

        private void InvalidateActorSnapshots()
        {
            this.mActorSnapshotCache = null;
            this.mUserActorSnapshotCache = null;
            this.mNpcActorSnapshotCache = null;
        }

        private void RemoveActorFromReferenceIndex(MapActor Actor)
        {
            if (Actor == null)
                return;

            MapActor indexedActor;
            if (Actor.Type == MapActorType.UserCharacter)
            {
                if (this.mUserActorsByReferenceId.TryGetValue(Actor.ReferenceId, out indexedActor) && object.ReferenceEquals(indexedActor, Actor))
                    this.mUserActorsByReferenceId.Remove(Actor.ReferenceId);
                return;
            }

            if (Actor.Type == MapActorType.AiBot && this.mNpcActorsByReferenceId.TryGetValue(Actor.ReferenceId, out indexedActor) && object.ReferenceEquals(indexedActor, Actor))
                this.mNpcActorsByReferenceId.Remove(Actor.ReferenceId);
        }

        private bool IsActorStillMapped(MapActor Actor)
        {
            if (Actor == null)
                return false;

            MapActor mappedActor;
            return this.mActors.TryGetValue(Actor.Id, out mappedActor) && object.ReferenceEquals(mappedActor, Actor);
        }

        private bool AddActorToMap(MapActor Actor)
        {
            lock (this.mActors)
            {
                if (!this.mActors.TryAdd(Actor.Id, Actor))
                    return false;

                this.AddActorToReferenceIndex(Actor);
                this.InvalidateActorSnapshots();
            }
            if (Actor.Type == MapActorType.AiBot)
            {
                ShipMovement.SendNpcLifecycleCreateToVisibleSessions(this, Actor, false);
            }
            return true;
        }

        public MapActor GetActor(int ActorId)
        {
            lock (this.mActors)
            {
                if (this.mActors.ContainsKey(ActorId))
                    return this.mActors[ActorId];
            }
            return (MapActor)null;
        }

        public MapActor GetActorByReferenceId(int ReferenceId, MapActorType ReferenceType = MapActorType.UserCharacter)
        {
            MapActor actor;
            if (ReferenceType == MapActorType.UserCharacter)
            {
                if (this.mUserActorsByReferenceId.TryGetValue(ReferenceId, out actor))
                {
                    if (this.IsActorStillMapped(actor))
                        return actor;

                    this.RemoveActorFromReferenceIndex(actor);
                }
            }
            else if (ReferenceType == MapActorType.AiBot)
            {
                if (this.mNpcActorsByReferenceId.TryGetValue(ReferenceId, out actor))
                {
                    if (this.IsActorStillMapped(actor))
                        return actor;

                    this.RemoveActorFromReferenceIndex(actor);
                }
            }

            lock (this.mActors)
            {
                foreach (MapActor item_0 in (IEnumerable<MapActor>)this.mActors.Values)
                {
                    if (item_0.Type == ReferenceType && item_0.ReferenceId == ReferenceId)
                    {
                        this.AddActorToReferenceIndex(item_0);
                        return item_0;
                    }
                }
            }
            return (MapActor)null;
        }

        public void KickNpc(int ActorId)
        {
            MapActor actor = this.GetActor(ActorId);
            if (actor == null || actor.Type != MapActorType.AiBot || (Npc)actor.ReferenceObject == null)
                return;

            Npc npc = (Npc)actor.ReferenceObject;
            Fight.BroadcastLockIntentClearForTarget(this, npc.Id);
            this.RemoveActorFromMap(ActorId);
        }

        public bool RemoveCharacterFromMap(int CharacterId)
        {
            MapActor actor = this.GetActorByReferenceId(CharacterId, MapActorType.UserCharacter);
            if (actor != null)
            {
                Fight.BroadcastLockIntentClearForTarget(this, CharacterId);
                return this.RemoveActorFromMap(actor.Id);
            }
            return false;
        }

        public bool RemoveActorFromMap(int ActorId)
        {
            lock (this.mActorSyncRoot)
            {
                lock (this.mActors)
                {
                    MapActor actor;
                    if (!this.mActors.TryGetValue(ActorId, out actor) || actor == null)
                    {
                        Output.WriteLine((object)"Player null.");
                        return false;
                    }

                    this.mActors.Remove(ActorId);
                    this.RemoveActorFromReferenceIndex(actor);
                    this.InvalidateActorSnapshots();
                    return true;
                }
            }
        }

        public void BroadcastMovement(ServerMessage Message, int _Id, bool UsersWithRightsOnly = false)
        {
            if (Message == null)
                return;

            byte[] data = Message.ToDeltas();
            List<int> recipients = new List<int>();
            foreach (MapActor item_0 in this.GetUserActorSnapshot())
            {
                if (item_0 != null && item_0.ReferenceId != _Id && item_0.ReferenceSessionId > 0)
                    recipients.Add(item_0.ReferenceSessionId);
            }

            foreach (int sessionId in recipients)
            {
                Session local_1 = SessionManager.GetSessionById(sessionId);
                if (local_1 != null)
                    local_1.SendData(data);
            }
        }

        public void BroadcastMessageInRange(ServerMessage Message, int id, bool UsersWithRightsOnly = false)
        {
            if (Message == null)
                return;

            byte[] data = Message.ToDeltas();
            List<int> recipients = new List<int>();
            foreach (MapActor item_0 in this.GetUserActorSnapshot())
            {
                if (item_0 != null && item_0.ReferenceSessionId > 0)
                    recipients.Add(item_0.ReferenceSessionId);
            }

            foreach (int sessionId in recipients)
            {
                Session local_1 = SessionManager.GetSessionById(sessionId);
                if (local_1 != null && local_1.CharacterInfo != null && local_1.CharacterInfo.NpcInRange.Contains(id))
                    local_1.SendData(data);
            }
        }

        public void BroadcastMessageForOtherOnly(ServerMessage Message, Session session)
        {
            if (GalaxyGateWaveService.IsGateMap(this.MapId))
                return;

            if (Message == null || session == null)
                return;

            byte[] data = Message.ToDeltas();
            List<int> recipients = new List<int>();
            foreach (MapActor item_0 in this.GetUserActorSnapshot())
            {
                if (item_0 != null && item_0.ReferenceSessionId > 0)
                    recipients.Add(item_0.ReferenceSessionId);
            }

            foreach (int sessionId in recipients)
            {
                Session local_1 = SessionManager.GetSessionById(sessionId);
                if (local_1 != null && local_1.CharacterId != session.CharacterId)
                    local_1.SendData(data);
            }
        }

        public void BroadcastMessage(ServerMessage Message, bool UsersWithRightsOnly = false)
        {
            if (Message == null)
                return;

            byte[] data = Message.ToDeltas();
            List<int> recipients = new List<int>();
            foreach (MapActor item_0 in this.GetUserActorSnapshot())
            {
                if (item_0 != null && item_0.ReferenceSessionId > 0)
                    recipients.Add(item_0.ReferenceSessionId);
            }

            foreach (int sessionId in recipients)
            {
                Session local_1 = SessionManager.GetSessionById(sessionId);
                if (local_1 != null)
                    local_1.SendData(data);
            }
        }
        public void BroadcastToSelectedTarget(int targetId, ServerMessage message)
        {
            if (message == null)
                return;

            if (GalaxyGateWaveService.IsGateMap(this.MapId))
            {
                MapActor npcActor = this.GetActorByReferenceId(targetId, MapActorType.AiBot);
                Npc npc = npcActor != null ? npcActor.ReferenceObject as Npc : null;
                if (npc != null)
                {
                    Session ownerSession = GalaxyGateWaveService.GetNpcOwnerSession(npc);
                    if (ownerSession != null && ownerSession.CharacterInfo != null && ownerSession.CharacterInfo.SelectedPlayer == targetId)
                        ownerSession.SendData(message);
                }
                return;
            }

            byte[] data = message.ToDeltas();
            List<int> recipients = new List<int>();
            foreach (MapActor actor in this.GetUserActorSnapshot())
            {
                if (actor != null && actor.ReferenceSessionId > 0)
                    recipients.Add(actor.ReferenceSessionId);
            }

            foreach (int sessionId in recipients)
            {
                Session s = SessionManager.GetSessionById(sessionId);
                if (s != null && s.CharacterInfo != null && s.CharacterInfo.SelectedPlayer == targetId)
                    s.SendData(data);
            }
        }


        public void BroadcastMessageUserEnter(CharacterInfo User)
        {
            if (GalaxyGateWaveService.IsGateMap(this.MapId))
                return;

            if (User == null)
                return;

            List<int> recipients = new List<int>();
            foreach (MapActor item_0 in this.GetUserActorSnapshot())
            {
                if (item_0 != null && item_0.ReferenceSessionId > 0)
                    recipients.Add(item_0.ReferenceSessionId);
            }

            foreach (int sessionId in recipients)
            {
                Session local_1 = SessionManager.GetSessionById(sessionId);
                if (local_1 != null)
                    local_1.SendData(MapUserEnterComposer.Compose(User, local_1));
            }
        }

        public void SendObjects(Session Session)
        {
            bool gateMap = GalaxyGateWaveService.IsGateMap(this.MapId);
            CList<MapActor> Actors1 = new CList<MapActor>();
            CList<MapActor> Actors2 = new CList<MapActor>();
            foreach (MapActor item_0 in this.GetUserActorSnapshot())
            {
                if (item_0 == null || item_0.ReferenceId == Session.CharacterId)
                    continue;

                if (gateMap)
                    continue;

                Session observedSession = SessionManager.GetSessionByCharacterId(item_0.ReferenceId);
                if (observedSession != null)
                    ShipMovement.AdvanceMovingPlayerToCurrentPosition(observedSession);

                CharacterInfo characterInfo = item_0.ReferenceObject as CharacterInfo;
                if (characterInfo == null)
                    continue;

                if (!characterInfo.IsInvisibleForAll)
                {
                    Actors1.Add(item_0);

                    if (!Session.CharacterInfo.PlayerInRange.Contains(item_0.ReferenceId))
                        Session.CharacterInfo.PlayerInRange.Add(item_0.ReferenceId);
                }

                if (characterInfo.IsMoving && !characterInfo.IsInvisibleForAll)
                    Actors2.Add(item_0);
            }
            if (Actors1.Count > 0)
                Session.SendData(MapUserObjectListComposer.Compose(Actors1, Session));
            if (Actors2.Count > 0)
                Session.SendData(MapUserMovementListComposer.Compose(Actors2));

            foreach (MapActor actor in (IEnumerable<MapActor>)Actors1.Keys)
            {
                if (actor == null || actor.Type != MapActorType.UserCharacter)
                    continue;

                Session observedSession = SessionManager.GetSessionByCharacterId(actor.ReferenceId);
                if (observedSession != null)
                    Fight.SendLockIntentToObserver(Session, observedSession, this);
            }

            Session.SendData(MapHeroInitComposer.Compose(Session.CharacterInfo));
            int mapId = Session.CharacterInfo.MapId;

            if (mapId == 1 || mapId == 20)
                Session.SendData(PacketComposer.Compose("s", "0|1|redStation|1|0|2000|1200"));
            if (mapId == 5 || mapId == 24)
                Session.SendData(PacketComposer.Compose("s", "0|1|blueStation|2|0|19000|1200"));
            if (mapId == 9 || mapId == 28)
                Session.SendData(PacketComposer.Compose("s", "0|1|greenStation|3|0|19200|11500"));

        }

        public void SendPortals(Session Session)
        {
            CList<PortalInfo> portalForMap = PortalManager.GetPortalForMap(this.MapId);
            if (portalForMap == null)
                portalForMap = new CList<PortalInfo>();

            GalaxyGatePortalService.RefreshForSession(Session);

            if (Session.CharacterInfo.GalaxyGatePortals != null && Session.CharacterInfo.GalaxyGatePortals.Count > 0)
                foreach (PortalInfo gg in Session.CharacterInfo.GalaxyGatePortals.Keys)
                    if (gg.MapId == this.MapId)
                        portalForMap.Add(gg);

            if (Session.CharacterInfo.GalaxyGateInternalPortals != null && Session.CharacterInfo.GalaxyGateInternalPortals.Count > 0)
                foreach (PortalInfo p in Session.CharacterInfo.GalaxyGateInternalPortals.Keys)
                    if (p.MapId == this.MapId)
                        portalForMap.Add(p);

            HashSet<int> newIds = new HashSet<int>();
            foreach (PortalInfo p in portalForMap.Keys)
                newIds.Add(p.Id);

            HashSet<int> oldIds = Session.CharacterInfo.ClientPortalIds;

            if (oldIds == null)
            {
                Session.SendData(MapPortalsComposer.Compose(portalForMap, Session));
                Session.CharacterInfo.ClientPortalIds = newIds;
                return;
            }

            foreach (int oldId in oldIds)
                if (!newIds.Contains(oldId))
                    Session.SendData(PacketComposer.Compose("n", "p|REM|" + oldId));

            CList<PortalInfo> added = new CList<PortalInfo>();
            foreach (PortalInfo p in portalForMap.Keys)
                if (!oldIds.Contains(p.Id))
                    added.Add(p);

            if (added.Count > 0)
                Session.SendData(MapPortalsComposer.Compose(added, Session));

            Session.CharacterInfo.ClientPortalIds = newIds;
        }



        public static MapInstance TryCreateMapInstance(int InstanceId, int MapId)
        {
            MapInfo mapInfo = MapInfoLoader.GetMapInfo(MapId);
            if (mapInfo == null)
                return (MapInstance)null;
            return new MapInstance(InstanceId, mapInfo);
        }

        public void Unload()
        {
            long perfStart = PerformanceProfiler.Start();
            int mapId = this.mInfo != null ? this.mInfo.Id : 0;
            if (this.mUnloaded)
                return;
            try
            {
                this.mUnloaded = true;
                long clearActorsStart = PerformanceProfiler.Start();
                try
                {
                    lock (this.mActorSyncRoot)
                    {
                        lock (this.mActors)
                        {
                            this.mActors.Clear();
                            this.mUserActorsByReferenceId.Clear();
                            this.mNpcActorsByReferenceId.Clear();
                            this.InvalidateActorSnapshots();
                        }
                    }
                }
                finally
                {
                    PerformanceProfiler.LogCleanup("MapInstance.ClearActors", mapId, this.InstanceId, clearActorsStart);
                }
                this.mUnloadedTimestamp = UnixTimestamp.GetCurrent();
            }
            finally
            {
                PerformanceProfiler.LogMapOperation("Unload", mapId, this.InstanceId, perfStart);
                PerformanceProfiler.LogCleanup("MapInstanceUnload", mapId, this.InstanceId, perfStart);
            }
        }

        public void Dispose()
        {
            long perfStart = PerformanceProfiler.Start();
            int mapId = this.mInfo != null ? this.mInfo.Id : 0;
            try
            {
                if (!this.mUnloaded)
                    this.Unload();
                long updaterDisposeStart = PerformanceProfiler.Start();
                try
                {
                    if (this.mUpdater != null)
                        this.mUpdater.Dispose();
                    this.mUpdater = (Timer)null;
                }
                finally
                {
                    PerformanceProfiler.LogCleanup("MapInstance.DisposeUpdater", mapId, this.InstanceId, updaterDisposeStart);
                }
                this.mInfo = (MapInfo)null;
            }
            finally
            {
                PerformanceProfiler.LogMapOperation("Dispose", mapId, this.InstanceId, perfStart);
                PerformanceProfiler.LogCleanup("MapInstanceDispose", mapId, this.InstanceId, perfStart);
            }
        }

        public void PerformUpdate(object state)
        {
            const int MAP_INSTANCE_UPDATE_PERIOD_MS = 500;
            int mapId = this.mInfo != null ? this.mInfo.Id : 0;
            string callbackName = "MapInstance.PerformUpdate.map" + mapId + ".instance" + this.InstanceId;
            long perfStart = PerformanceProfiler.BeginTimerCallback(callbackName, MAP_INSTANCE_UPDATE_PERIOD_MS);
            try
            {
                MapActor[] userSnapshot = this.GetUserActorSnapshot();

                foreach (MapActor mapActor in userSnapshot)
                {
                    if (mapActor != null)
                        mapActor.IncreaseIdleTime();
                }

            }
            catch (Exception ex)
            {
                LogTimerFailure("PerformUpdate", ex);
            }
            finally
            {
                PerformanceProfiler.LogMapOperation("Update", mapId, this.InstanceId, perfStart);
                PerformanceProfiler.EndTimerCallback(callbackName, MAP_INSTANCE_UPDATE_PERIOD_MS, perfStart);
            }
        }
    }
}
