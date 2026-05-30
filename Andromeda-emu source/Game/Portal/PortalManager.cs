// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Portal.PortalManager
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System.Collections.Generic;
using System.Data;

namespace OrbitReborn_Emulator.Game.Portal
{
    public static class PortalManager
    {
        private static CList<PortalInfo> mPortals;
        public static int[] UnSafePortals = { 201, 202, 203, 204, 205, 206 };

        public static CList<PortalInfo> Portals
        {
            get
            {
                return PortalManager.mPortals;
            }
        }

        public static bool isPortalUnsafe(int port)
        {
            foreach (int key in PortalManager.UnSafePortals)
            {
                if (key == port)
                    return true;
            }
            return false;
        }

        public static void Initialize()
        {
            PortalManager.mPortals = new CList<PortalInfo>();
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                DataTable dataTable = client.ExecuteQueryTable("SELECT * FROM portals");
                if (dataTable == null)
                    return;
                foreach (DataRow row in (InternalDataCollectionBase)dataTable.Rows)
                {
                    lock (PortalManager.mPortals)
                        PortalManager.mPortals.Add(PortalManager.GetPortal(client, row));
                }
            }
        }

        public static PortalInfo GetPortal(SqlDatabaseClient MySqlClient, DataRow Row)
        {
            return new PortalInfo(MySqlClient, (int)Row["id"], (int)Row["pos_x"] * 100, (int)Row["pos_y"] * 100, (int)Row["map_id"], (int)Row["arrive_id"], (int)Row["type"]);
        }

        public static CList<PortalInfo> GetPortalForMap(int _MapId)
        {
            CList<PortalInfo> clist = new CList<PortalInfo>();
            foreach (PortalInfo key in (IEnumerable<PortalInfo>)PortalManager.Portals.Keys)
            {
                if (key.MapId == _MapId)
                    clist.Add(key);
            }
            if (clist.Count > 0)
                return clist;
            return (CList<PortalInfo>)null;
        }

        public static PortalInfo GetPortalById(int _Id)
        {
            foreach (PortalInfo key in (IEnumerable<PortalInfo>)PortalManager.Portals.Keys)
            {
                if (key.Id == _Id)
                    return key;
            }
            return (PortalInfo)null;
        }
    }
}
