

using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Maps
{
    public static class MapManager
    {
        private static Timer mMapInstanceThread;
        private static CDictionnary<int, MapInstance> mMapInstances;
        private static int mInstanceIdGenerator;
        private static object mIdGeneratorSyncLock;
        private static Dictionary<int, MapInstance> mMapInstancesByMapId;

        private static void LogTimerFailure(string callbackName, Exception ex)
        {
            Output.WriteLine((object)("[MapMgrTimer] " + callbackName + " failed: " + ex.ToString()), OutputLevel.CriticalError);
        }

        private static void ReattachNpcActors(MapInstance instance)
        {
            if (instance == null || NpcAI.NpcList == null)
                return;

            foreach (Npc npc in NpcAI.NpcList.Keys)
            {
                if (npc == null || npc.IsDestroying || npc.MapId != instance.MapId)
                    continue;

                if (GalaxyGateWaveService.IsGateMap(instance.MapId) && !GalaxyGateWaveService.IsNpcOwnedByCurrentRunOwner(npc))
                    continue;

                if (instance.GetActorByReferenceId(npc.Id, MapActorType.AiBot) == null)
                    instance.AddNpcToMap(npc);
            }
        }

        public static CDictionnary<int, MapInstance> MapInstances
        {
            get
            {
                return MapManager.mMapInstances;
            }
        }

        public static void Initialize(SqlDatabaseClient MySqlClient)
        {
            MapManager.mMapInstances = new CDictionnary<int, MapInstance>();
            MapManager.mMapInstanceThread = new Timer(new TimerCallback(MapManager.ProcessMaps), (object)null, TimeSpan.FromSeconds(10.0), TimeSpan.FromSeconds(10.0));
            MapManager.mInstanceIdGenerator = 1;
            MapManager.mIdGeneratorSyncLock = new object();
            MapManager.mMapInstancesByMapId = new Dictionary<int, MapInstance>();
        }

        public static int GenerateInstanceId()
        {
            lock (MapManager.mIdGeneratorSyncLock)
                return MapManager.mInstanceIdGenerator++;
        }

        private static void ProcessMaps(object state)
        {
            long perfStart = PerformanceProfiler.Start();
            try
            {
                CDictionnary<int, MapInstance> cdictionnary = new CDictionnary<int, MapInstance>();
                bool lockTaken1 = false;
                try
                {
                    Monitor.Enter((object)MapManager.mMapInstances, ref lockTaken1);
                    foreach (KeyValuePair<int, MapInstance> mMapInstance in (ConcurrentDictionary<int, MapInstance>)MapManager.mMapInstances)
                        cdictionnary.Add(mMapInstance.Key, mMapInstance.Value);
                }
                finally
                {
                    if (lockTaken1)
                        Monitor.Exit((object)mMapInstances);
                }
                CList<int> clist1 = new CList<int>();
                CList<int> clist2 = new CList<int>();
                foreach (MapInstance mapInstance in (IEnumerable<MapInstance>)cdictionnary.Values)
                {
                    if (mapInstance == null)
                        continue;

                    int mapId = mapInstance.Info != null ? mapInstance.Info.Id : 0;
                    if (!mapInstance.Unloaded && (Invasion.IsInvasionRuntimeMap(mapId) || Spaceball.IsSpaceballRuntimeMap(mapId)))
                    {
                        if (mapInstance.MarkedAsEmpty > 0)
                            mapInstance.MarkedAsEmpty = 0;
                        continue;
                    }

                    if (mapInstance.Unloaded)
                    {
                        if (mapInstance.TimeUnloaded > 15.0)
                            clist1.Add(mapInstance.InstanceId);
                    }
                    else if (mapInstance.HumanActorCount == 0)
                    {
                        if (mapInstance.MarkedAsEmpty >= 1)
                            clist2.Add(mapInstance.InstanceId);
                        else
                            ++mapInstance.MarkedAsEmpty;
                    }
                    else if (mapInstance.MarkedAsEmpty > 0)
                        mapInstance.MarkedAsEmpty = 0;
                }
                bool lockTaken2 = false;
                try
                {
                    Monitor.Enter((object)MapManager.mMapInstances, ref lockTaken2);
                    foreach (int key in (IEnumerable<int>)clist2.Keys)
                    {
                        if (MapManager.mMapInstances.ContainsKey(key))
                        {
                            MapManager.mMapInstances[key].Unload();
                            MapManager.mMapInstancesByMapId.Remove(MapManager.mMapInstances[key].Info.Id);
                            Output.WriteLine((object)("[MapMgr] Unloaded map instance " + (object)key + "."), OutputLevel.Warning);
                        }
                    }
                    foreach (int key in (IEnumerable<int>)clist1.Keys)
                    {
                        if (MapManager.mMapInstances.ContainsKey(key))
                        {
                            MapInstance mapInstance = MapManager.mMapInstances[key];
                            int mapId = mapInstance.Info.Id;
                            mapInstance.Dispose();
                            MapManager.mMapInstancesByMapId.Remove(mapId);
                            MapManager.mMapInstances[key] = (MapInstance)null;
                            MapManager.mMapInstances.Remove(key);
                            Output.WriteLine((object)("[MapMgr] Disposed of map instance " + (object)key + " and associated resources."), OutputLevel.Warning);
                        }
                    }
                }
                finally
                {
                    if (lockTaken2)
                        Monitor.Exit((object)mMapInstances);
                }
            }
            catch (Exception ex)
            {
                MapManager.LogTimerFailure("ProcessMaps", ex);
            }
            finally
            {
                PerformanceProfiler.LogCleanup("MapManager.ProcessMaps", perfStart);
            }
        }

        public static bool InstanceIsLoadedForMap(int MapId)
        {
            return MapManager.GetInstanceByMapId(MapId) != null;
        }

        public static bool TryLoadMapInstance(int MapId)
        {
            long perfStart = PerformanceProfiler.Start();
            int instanceId = 0;
            lock (MapManager.mMapInstances)
            {
                if (MapManager.GetInstanceByMapId(MapId) != null)
                    return false;
                int local_1 = MapManager.GenerateInstanceId();
                instanceId = local_1;
                MapInstance local_2 = MapInstance.TryCreateMapInstance(local_1, MapId);
                if (local_2 == null)
                    return false;
                MapManager.mMapInstances.Add(local_1, local_2);
                MapManager.mMapInstancesByMapId[MapId] = local_2;
                ReattachNpcActors(local_2);
                Output.WriteLine((object)("[MapMgr] Map instance " + (object)local_1 + " has been loaded for Map " + (object)MapId + "."), OutputLevel.Warning);
            }
            PerformanceProfiler.LogMapOperation("Load", MapId, instanceId, perfStart);
            return true;
        }

        public static MapInstance GetInstanceByMapId(int MapId)
        {
            lock (MapManager.mMapInstances)
            {
                MapInstance mapInstance;
                if (MapManager.mMapInstancesByMapId.TryGetValue(MapId, out mapInstance))
                {
                    if (mapInstance != null && !mapInstance.Unloaded)
                        return mapInstance;
                    MapManager.mMapInstancesByMapId.Remove(MapId);
                }

                foreach (MapInstance item_0 in (IEnumerable<MapInstance>)MapManager.mMapInstances.Values)
                {
                    if (item_0 != null && !item_0.Unloaded && item_0.Info.Id == MapId)
                    {
                        MapManager.mMapInstancesByMapId[MapId] = item_0;
                        return item_0;
                    }
                }
            }
            return (MapInstance)null;
        }

        public static bool RemoveUserFromMap(Session Session)
        {
            long perfStart = PerformanceProfiler.Start();
            int absoluteMapId = Session.AbsoluteMapId;
            bool flag = false;
            try
            {
                if (absoluteMapId > 0)
                {
                    if (GalaxyGateWaveService.IsGateMap(absoluteMapId))
                        GalaxyGateWaveService.CleanupRunForSession(Session);

                    ShipMovement.StopMovementTracking(Session);

                    MapInstance instanceByMapId = (MapInstance)null;
                    if (Session.MapJoined)
                    {
                        instanceByMapId = MapManager.GetInstanceByMapId(absoluteMapId);
                        if (instanceByMapId != null)
                            instanceByMapId.RemoveCharacterFromMap(Session.CharacterId);
                    }
                    Session.AbsoluteMapId = 0;
                    Session.MapAuthed = false;
                    Session.MapJoined = false;
                    if (instanceByMapId != null)
                        ShipMovement.RefreshEnemyWarningForMap(instanceByMapId);
                    flag = true;
                }
                return flag;
            }
            finally
            {
                PerformanceProfiler.LogCleanup("MapManager.RemoveUserFromMap", absoluteMapId, 0, perfStart);
            }
        }
    }
}
