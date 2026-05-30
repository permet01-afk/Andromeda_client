

using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Util;
using System;

namespace OrbitReborn_Emulator.Game.Maps.Collectables
{
    public class Collectable
    {
        private int m_iId;
        private int m_iType;
        private int m_iX;
        private int m_iY;
        private int m_iMapId;
        private bool m_bCollecting;
        private const int COLLECTABLE_MIN_EDGE_MARGIN = 500;
        private const int COLLECTABLE_MAX_EDGE_MARGIN = 1000;


        public int Id
        {
            get
            {
                return this.m_iId;
            }
            set
            {
                this.m_iId = value;
            }
        }

        public int Type
        {
            get
            {
                return this.m_iType;
            }
            set
            {
                this.m_iType = value;
            }
        }

        public int X
        {
            get
            {
                return this.m_iX;
            }
            set
            {
                this.m_iX = value;
            }
        }

        public int Y
        {
            get
            {
                return this.m_iY;
            }
            set
            {
                this.m_iY = value;
            }
        }

        public int MapId
        {
            get
            {
                return this.m_iMapId;
            }
            set
            {
                this.m_iMapId = value;
            }
        }

        public bool Collecting
        {
            get
            {
                return this.m_bCollecting;
            }
            set
            {
                this.m_bCollecting = value;
            }
        }

        public Collectable(int Id, int Type, int X, int Y, int MapId)
        {
            this.Id = Id;
            this.Type = Type;
            this.X = X;
            this.Y = Y;
            this.MapId = MapId;
            this.Collecting = false;
        }

        public static void GetRandomPositionForMap(int mapId, Random random, out int x, out int y)
        {
            if (random == null)
                random = RandomProvider.Current;
            int minX;
            int maxX;
            int minY;
            int maxY;
            Collectable.GetSpawnBoundsForMap(mapId, out minX, out maxX, out minY, out maxY);
            x = random.Next(minX, maxX);
            y = random.Next(minY, maxY);
        }

        protected void MoveToRandomPosition(Random random)
        {
            int x;
            int y;
            Collectable.GetRandomPositionForMap(this.MapId, random, out x, out y);
            this.X = x;
            this.Y = y;
        }

        private static void GetSpawnBoundsForMap(int mapId, out int minX, out int maxX, out int minY, out int maxY)
        {
            int safeMinX;
            int safeMaxX;
            int safeMinY;
            int safeMaxY;
            ShipMovement.GetRadiationSafeBounds(mapId, out safeMinX, out safeMaxX, out safeMinY, out safeMaxY);
            minX = safeMinX + COLLECTABLE_MIN_EDGE_MARGIN;
            minY = safeMinY + COLLECTABLE_MIN_EDGE_MARGIN;
            maxX = Math.Max(minX + 1, safeMaxX - COLLECTABLE_MAX_EDGE_MARGIN);
            maxY = Math.Max(minY + 1, safeMaxY - COLLECTABLE_MAX_EDGE_MARGIN);
        }

        public virtual void Collect(Session user)
        {
        }
    }
}
