

using OrbitReborn_Emulator.Game.Maps.Collectables;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Util;
using System;

namespace OrbitReborn_Emulator.Game.Maps
{
    public class MapInfo
    {
        private int mId;
        private string mName;
        private double mCacheAge;
        private int mMaxUsers;
        public CDictionnary<int, Collectable> Collectables;

        public int Id
        {
            get
            {
                return this.mId;
            }
        }

        public string Name
        {
            get
            {
                return this.mName;
            }
            set
            {
                this.mName = value;
            }
        }

        public double CacheAge
        {
            get
            {
                return UnixTimestamp.GetCurrent() - this.mCacheAge;
            }
        }

        public int CurrentUsers
        {
            get
            {
                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(this.mId);
                if (instanceByMapId != null)
                    return instanceByMapId.HumanActorCount;
                return 0;
            }
        }

        public int MaxUsers
        {
            get
            {
                if (this.mMaxUsers == 0)
                    return 500;
                return this.mMaxUsers;
            }
            set
            {
                this.mMaxUsers = value;
            }
        }

        public MapInfo(int Id, string Name)
        {
            this.mId = Id;
            this.mName = Name;
            this.mCacheAge = UnixTimestamp.GetCurrent();
            this.Collectables = new CDictionnary<int, Collectable>();
            bool isGateMap = this.mId == 51 || this.mId == 52 || this.mId == 53 || this.mId == 55;
            bool isDuelMap = this.mId == 85 || this.mId == 86 || this.mId == 87;
            if (!isGateMap && !isDuelMap)
            {
                Random random = RandomProvider.Current;
                int num = 0;
                while (num < 100)
                {
                    ++num;
                    int spawnX;
                    int spawnY;
                    Collectable.GetRandomPositionForMap(this.mId, random, out spawnX, out spawnY);
                    this.Collectables.Add(num, (Collectable)new BonusBox(num, spawnX, spawnY, this.mId));
                }
            }
        }

        public int CurrentCompanyUsers(int _FactionID)
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(this.mId);
            if (instanceByMapId != null)
                return instanceByMapId.HumanActorFactionCount(_FactionID);
            return 0;
        }
    }
}
