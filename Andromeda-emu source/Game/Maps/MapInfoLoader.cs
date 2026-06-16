

using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Maps
{
    public static class MapInfoLoader
    {
        private const double CACHE_LIFE_TIME = 300.0;
        private static CDictionnary<int, MapInfo> mMapInfoCache;
        private static Timer mCacheMonitor;

        public static void Initialize()
        {
            MapInfoLoader.mMapInfoCache = new CDictionnary<int, MapInfo>();
            MapInfoLoader.mCacheMonitor = new Timer(new TimerCallback(MapInfoLoader.MonitorCache), (object)null, TimeSpan.FromSeconds(30.0), TimeSpan.FromSeconds(30.0));
        }

        private static void MonitorCache(object state)
        {
            long perfStart = PerformanceProfiler.Start();
            try
            {
                lock (MapInfoLoader.mMapInfoCache)
                {
                    CList<int> local_0 = new CList<int>();
                    foreach (MapInfo item_0 in (IEnumerable<MapInfo>)MapInfoLoader.mMapInfoCache.Values)
                    {
                        if (MapManager.GetInstanceByMapId(item_0.Id) != null || item_0.CacheAge >= 300.0)
                            local_0.Add(item_0.Id);
                    }
                    foreach (int item_1 in (IEnumerable<int>)local_0.Keys)
                        MapInfoLoader.mMapInfoCache.Remove(item_1);
                }
            }
            finally
            {
                PerformanceProfiler.LogCleanup("MapInfoLoader.MonitorCache", perfStart);
            }
        }

        public static void RemoveFromCache(int MapId)
        {
            lock (MapInfoLoader.mMapInfoCache)
            {
                if (!MapInfoLoader.mMapInfoCache.ContainsKey(MapId))
                    return;
                MapInfoLoader.mMapInfoCache.Remove(MapId);
            }
        }

        private static MapInfo TryGetInfoFromCache(int MapId)
        {
            lock (MapInfoLoader.mMapInfoCache)
            {
                if (MapInfoLoader.mMapInfoCache.ContainsKey(MapId))
                    return MapInfoLoader.mMapInfoCache[MapId];
            }
            return (MapInfo)null;
        }

        public static MapInfo GetMapInfo(int MapId)
        {
            return MapInfoLoader.GetMapInfo(MapId, false);
        }

        public static MapInfo GetMapInfo(int MapId, bool IgnoreCache)
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(MapId);
            if (instanceByMapId != null)
                return instanceByMapId.Info;
            if (!IgnoreCache)
            {
                MapInfo infoFromCache = MapInfoLoader.TryGetInfoFromCache(MapId);
                if (infoFromCache != null)
                    return infoFromCache;
            }
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient("MapInfoLoader.GetMapInfo"))
            {
                client.ClearParameters();
                client.SetParameter("id", (object)MapId);
                DataRow Row = client.ExecuteQueryRow("SELECT * FROM maps WHERE id = @id LIMIT 1");
                if (Row != null)
                    return MapInfoLoader.GenerateMapInfoFromRow(Row);
            }
            return MapInfoLoader.GenerateSpecialMapInfo(MapId);
        }

        private static MapInfo GenerateSpecialMapInfo(int MapId)
        {
            switch (MapId)
            {
                case 85:
                    return new MapInfo(85, "Duel Arena 1");
                case 86:
                    return new MapInfo(86, "Duel Arena 2");
                case 87:
                    return new MapInfo(87, "Duel Arena 3");
            }
            return (MapInfo)null;
        }

        public static MapInfo GenerateMapInfoFromRow(DataRow Row)
        {
            return new MapInfo((int)Row["id"], (string)Row["name"]);
        }
    }
}
