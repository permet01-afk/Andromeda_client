

using OrbitReborn_Emulator.Storage;

namespace OrbitReborn_Emulator.Game.Portal
{
    public class PortalInfo
    {
        private int mId;
        private int mPosX;
        private int mPosY;
        private int mMapId;
        private int mLinkedId;
        private int mType = 1;

        public int Id
        {
            get
            {
                return this.mId;
            }
        }

        public int PosX
        {
            get
            {
                return this.mPosX;
            }
        }

        public int PosY
        {
            get
            {
                return this.mPosY;
            }
        }

        public int MapId
        {
            get
            {
                return this.mMapId;
            }
        }

        public int LinkedId
        {
            get
            {
                return this.mLinkedId;
            }
        }

        public int Type
        {
            get
            {
                return this.mType;
            }
            set
            {
                this.mType = value;
            }
        }

        public PortalInfo(SqlDatabaseClient MySqlClient, int Id, int PosX, int PosY, int MapId, int LinkedId, int Type)
        {
            this.mId = Id;
            this.mPosX = PosX;
            this.mPosY = PosY;
            this.mMapId = MapId;
            this.mLinkedId = LinkedId;
            this.mType = Type;
        }
    }
}
