// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Laboratory.LabInfos
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

namespace OrbitReborn_Emulator.Game.Laboratory
{
    public class LabInfos
    {
        private int m_iPrometium;
        private int m_iEndurium;
        private int m_iTerbium;
        private int m_iXenomit;
        private int m_iPalladium;
        private int m_iPrometid;
        private int m_iDuranium;
        private int m_iPromerium;

        // ✅ AJOUT: Seprom (resId 14)
        private int m_iSeprom;

        private int[] m_Laser;
        private int[] m_Rocket;
        private int[] m_Speed;
        private int[] m_Shield;
        private int m_iUpdate;

        public int Prometium
        {
            get
            {
                return this.m_iPrometium;
            }
            set
            {
                this.m_iPrometium = value;
            }
        }

        public int Endurium
        {
            get
            {
                return this.m_iEndurium;
            }
            set
            {
                this.m_iEndurium = value;
            }
        }

        public int Terbium
        {
            get
            {
                return this.m_iTerbium;
            }
            set
            {
                this.m_iTerbium = value;
            }
        }

        public int Xenomit
        {
            get
            {
                return this.m_iXenomit;
            }
            set
            {
                this.m_iXenomit = value;
            }
        }

        public int Palladium
        {
            get
            {
                return this.m_iPalladium;
            }
            set
            {
                this.m_iPalladium = value;
            }
        }

        public int Prometid
        {
            get
            {
                return this.m_iPrometid;
            }
            set
            {
                this.m_iPrometid = value;
            }
        }

        public int Duranium
        {
            get
            {
                return this.m_iDuranium;
            }
            set
            {
                this.m_iDuranium = value;
            }
        }

        public int Promerium
        {
            get
            {
                return this.m_iPromerium;
            }
            set
            {
                this.m_iPromerium = value;
            }
        }

        // ✅ AJOUT: propriété Seprom
        public int Seprom
        {
            get
            {
                return this.m_iSeprom;
            }
            set
            {
                this.m_iSeprom = value;
            }
        }

        public int[] Laser
        {
            get
            {
                return this.m_Laser;
            }
            set
            {
                this.m_Laser = value;
            }
        }

        public int[] Rocket
        {
            get
            {
                return this.m_Rocket;
            }
            set
            {
                this.m_Rocket = value;
            }
        }

        public int[] Speed
        {
            get
            {
                return this.m_Speed;
            }
            set
            {
                this.m_Speed = value;
            }
        }

        public int[] Shield
        {
            get
            {
                return this.m_Shield;
            }
            set
            {
                this.m_Shield = value;
            }
        }

        public int Update
        {
            get
            {
                return this.m_iUpdate;
            }
            set
            {
                this.m_iUpdate = value;
            }
        }

        public LabInfos()
        {
            this.m_iPrometium = 0;
            this.m_iEndurium = 0;
            this.m_iTerbium = 0;
            this.m_iXenomit = 0;
            this.m_iPalladium = 0;
            this.m_iPrometid = 0;
            this.m_iDuranium = 0;
            this.m_iPromerium = 0;

            // ✅ AJOUT
            this.m_iSeprom = 0;

            this.m_Laser = new int[2];
            this.m_Laser[0] = 0;
            this.m_Laser[1] = 0;
            this.m_Rocket = new int[2];
            this.m_Rocket[0] = 0;
            this.m_Rocket[1] = 0;
            this.m_Speed = new int[2];
            this.m_Speed[0] = 0;
            this.m_Speed[1] = 0;
            this.m_Shield = new int[2];
            this.m_Shield[0] = 0;
            this.m_Shield[1] = 0;
            this.m_iUpdate = 0;
        }

        public int GetCargo(long iResId)
        {
            if (iResId == 1L)
                return this.m_iPrometium;
            if (iResId == 2L)
                return this.m_iEndurium;
            if (iResId == 3L)
                return this.m_iTerbium;
            if (iResId == 4L)
                return this.m_iXenomit;
            if (iResId == 5L)
                return this.m_iPalladium;
            if (iResId == 11L)
                return this.m_iPrometid;
            if (iResId == 12L)
                return this.m_iDuranium;
            if (iResId == 13L)
                return this.m_iPromerium;

            // ✅ AJOUT: Seprom (14)
            if (iResId == 14L)
                return this.m_iSeprom;

            return 0;
        }

        public void AddCargo(long iResId, int iAmount)
        {
            if (iResId == 1L)
                this.m_iPrometium += iAmount;
            else if (iResId == 2L)
                this.m_iEndurium += iAmount;
            else if (iResId == 3L)
                this.m_iTerbium += iAmount;
            else if (iResId == 4L)
                this.m_iXenomit += iAmount;
            else if (iResId == 5L)
                this.m_iPalladium += iAmount;
            else if (iResId == 11L)
                this.m_iPrometid += iAmount;
            else if (iResId == 12L)
            {
                this.m_iDuranium += iAmount;
            }
            else if (iResId == 13L)
            {
                this.m_iPromerium += iAmount;
            }
            // ✅ AJOUT: Seprom (14)
            else if (iResId == 14L)
            {
                this.m_iSeprom += iAmount;
            }
        }

        public void RemoveCargo(long iResId, int iAmount)
        {
            if (iResId == 1L)
                this.m_iPrometium -= iAmount;
            else if (iResId == 2L)
                this.m_iEndurium -= iAmount;
            else if (iResId == 3L)
                this.m_iTerbium -= iAmount;
            else if (iResId == 4L)
                this.m_iXenomit -= iAmount;
            else if (iResId == 5L)
                this.m_iPalladium -= iAmount;
            else if (iResId == 11L)
                this.m_iPrometid -= iAmount;
            else if (iResId == 12L)
            {
                this.m_iDuranium -= iAmount;
            }
            else if (iResId == 13L)
            {
                this.m_iPromerium -= iAmount;
            }
            // ✅ AJOUT: Seprom (14)
            else if (iResId == 14L)
            {
                this.m_iSeprom -= iAmount;
            }
        }
    }
}
