using OrbitReborn_Emulator.Libs;

namespace OrbitReborn_Emulator.Game.Npcs
{
    public static class NpcManager
    {
        private static CDictionnary<int, Npc> mNpcInstances;
        private static int mNpcInstanceIdGenerator;
        private static object mSyncRoot;

        public static void Initialize()
        {
            mNpcInstances = new CDictionnary<int, Npc>();
            mNpcInstanceIdGenerator = -2; // IDs NPC = négatifs (comme avant)
            mSyncRoot = new object();
        }

        // ✅ IMPORTANT : on ne change PAS la signature (22 paramètres)
        public static Npc CreateNewInstance(
            string Name, int MapId, int LocX, int LocY,
            int ShipId, int ShipHp, int ShipMaxHp, int ShipShield, int ShipMaxShield,
            int ShipSpeed, int Credits, int Uridium,
            int FactionId, int FatLasers, int ShieldMechanics, string ClanTag,
            int IsClanMember, int Rank, int GalaxyGatesRings, int Drones,
            int NpcPoints, int Damages
        )
        {
            // sécurité : si jamais Initialize() n'a pas été appelé
            if (mNpcInstances == null)
                Initialize();

            lock (mSyncRoot)
            {
                // ✅ ID unique garanti (pas de collision si plusieurs spawn en même temps)
                int npcId = mNpcInstanceIdGenerator--;

                Npc npc = new Npc(
                    npcId, Name, MapId, LocX, LocY, ShipId,
                    ShipHp, ShipMaxHp, ShipShield, ShipMaxShield, ShipSpeed,
                    Credits, Uridium,
                    FactionId, FatLasers, ShieldMechanics, ClanTag,
                    IsClanMember, Rank, GalaxyGatesRings, Drones,
                    NpcPoints, Damages
                );

                mNpcInstances.Add(npcId, npc);
                return npc;
            }
        }
    }
}
