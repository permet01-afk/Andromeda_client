// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Event.Invasion
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Event
{
    internal static class Invasion
    {
        private static bool mActive;
        private static bool mSafeBattle;
        private static int mPlayerCount;
        private static int mNpcCount;
        private static int mLevel;
        private static CList<int> IdPlayers;
        private static int mPlayerCountMax;
        private static Timer mPerformUpdate;

        public static bool Active
        {
            get
            {
                return Invasion.mActive;
            }
            set
            {
                Invasion.mActive = value;
            }
        }

        public static bool SafeBattle
        {
            get
            {
                return Invasion.mSafeBattle;
            }
            set
            {
                Invasion.mSafeBattle = value;
            }
        }

        public static int PlayerCount
        {
            get
            {
                return Invasion.mPlayerCount;
            }
            set
            {
                Invasion.mPlayerCount = value;
            }
        }

        public static int NpcCount
        {
            get
            {
                return Invasion.mNpcCount;
            }
            set
            {
                Invasion.mNpcCount = value;
            }
        }

        public static int Level
        {
            get
            {
                return Invasion.mLevel;
            }
            set
            {
                Invasion.mLevel = value;
            }
        }

        public static int PlayerCountMax
        {
            get
            {
                return Invasion.mPlayerCountMax;
            }
            set
            {
                Invasion.mPlayerCountMax = value;
            }
        }

        public static Timer PerformUpdate
        {
            get
            {
                return Invasion.mPerformUpdate;
            }
            set
            {
                Invasion.mPerformUpdate = value;
            }
        }

        public static void Initialize()
        {
            Invasion.Active = false;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ExecuteNonQuery("UPDATE event_information SET isActif=0 WHERE id = 1");
            }
            Invasion.SafeBattle = false;
            Invasion.PerformUpdate = (Timer)null;
            Invasion.PlayerCount = 0;
            Invasion.IdPlayers = new CList<int>();
        }

        public static void StartInvasion()
        {
            foreach (MapInstance mapInstance in (IEnumerable<MapInstance>)MapManager.MapInstances.Values)
            {
                if (!mapInstance.Unloaded)
                {
                    string str = "Invasion Event will start in 20 seconds. Prepare to fight !";
                    mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                }
            }
            Invasion.PerformUpdate = new Timer(new TimerCallback(Invasion.StartCoolDown), (object)10, 10000, 0);
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ExecuteNonQuery("UPDATE event_information SET isActif=1 WHERE id = 1");
            }
        }

        public static bool Join(Session Session)
        {
            // if (Invasion.IdPlayers.Contains(Session.CharacterId) && !Session.CharacterInfo.IsAdmin)
            // return false;
            if (Session.CharacterInfo.MapId == 81)
            {
                Session.SendData(PacketComposer.Compose("A", "STD| You are already on Invasion !"));
                return false;
            }
            ++Invasion.PlayerCountMax;
            Invasion.IdPlayers.Add(Session.CharacterId);
            MapHandler.OpenPublicConnection(Session, 81, (PortalInfo)null);
            return true;
        }

        public static void Allow(int iId)
        {
            if (!Invasion.IdPlayers.Contains(iId))
                return;
            Invasion.IdPlayers.Remove(iId);
        }

        private static void StartCoolDown(object state)
        {
            int num = (int)state;
            if (num == 0)
            {
                Invasion.BeginInvasion();
            }
            else
            {
                foreach (MapInstance mapInstance in (IEnumerable<MapInstance>)MapManager.MapInstances.Values)
                {
                    if (mapInstance != null && !mapInstance.Unloaded)
                    {
                        string str = "Invasion Event will start in " + (object)num + " seconds...";
                        mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                    }
                }
                Invasion.PerformUpdate = new Timer(new TimerCallback(Invasion.StartCoolDown), (object)(num - 1), 1000, 0);
            }
        }

        private static void BeginInvasion()
        {
            Invasion.Active = true;
            Invasion.SafeBattle = true;
            Invasion.PlayerCountMax = 0;
            Invasion.NpcCount = 0;
            Invasion.Level = 0;
            foreach (MapInstance mapInstance in (IEnumerable<MapInstance>)MapManager.MapInstances.Values)
            {
                if (mapInstance != null && !mapInstance.Unloaded)
                {
                    foreach (MapActor mapActor in (IEnumerable<MapActor>)mapInstance.Actors.Values)
                    {
                        if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                        {
                            Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                            if (sessionById != null && sessionById.CharacterInfo != null)
                            {
                                ++Invasion.PlayerCountMax;
                                Invasion.IdPlayers.Add(sessionById.CharacterId);
                                MapHandler.OpenPublicConnection(sessionById, 81, (PortalInfo)null);
                            }
                        }
                    }
                }
            }
            Invasion.PerformUpdate = new Timer(new TimerCallback(Invasion.SafePeriod), (object)30, 1000, 0);
        }

        private static void SafePeriod(object state)
        {
            int num = (int)state;
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(81);
            if (instanceByMapId == null && Invasion.PerformUpdate != null)
            {
                Invasion.PerformUpdate.Dispose();
                Invasion.SafeBattle = false;
                Invasion.Active = false;
                Invasion.PlayerCount = 0;
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ExecuteNonQuery("UPDATE event_information SET isActif=0 WHERE id = 1");
                }
            }
            if (num == 0)
            {
                string str = "Invasion Event begin... Kill them all !";
                instanceByMapId.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                Invasion.PerformUpdate = new Timer(new TimerCallback(Invasion.Monitor), (object)null, 0, 15000);
            }
            else
            {
                if (num < 5 || num % 5 == 0)
                {
                    string str = "Invasion Event will begin in " + (object)num + " seconds...";
                    instanceByMapId.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                }
                Invasion.PerformUpdate = new Timer(new TimerCallback(Invasion.SafePeriod), (object)(num - 1), 1000, 0);
            }
        }

        private static void Monitor(object state)
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(81);
            if (instanceByMapId == null && Invasion.PerformUpdate != null)
            {
                Invasion.PerformUpdate.Dispose();
                Invasion.Active = false;
                Invasion.PlayerCount = 0;
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ExecuteNonQuery("UPDATE event_information SET isActif=0 WHERE id = 1");
                }
            }
            Invasion.PlayerCount = 0;
            foreach (MapActor mapActor in (IEnumerable<MapActor>)instanceByMapId.Actors.Values)
            {
                if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                {
                    Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                    if (sessionById != null && sessionById.CharacterInfo != null)
                        ++Invasion.PlayerCount;
                }
            }
            if (Invasion.PlayerCount > 0)
            {
                Invasion.NpcCount = 0;
                foreach (MapActor mapActor in (IEnumerable<MapActor>)instanceByMapId.Actors.Values)
                {
                    if (mapActor.Type == MapActorType.AiBot)
                    {
                        Npc referenceObject = (Npc)instanceByMapId.GetActorByReferenceId(mapActor.ReferenceId, MapActorType.AiBot).ReferenceObject;
                        if (referenceObject != null && !referenceObject.Respawn)
                            ++Invasion.NpcCount;
                    }
                }
                if (Invasion.NpcCount > 0)
                {
                    foreach (MapActor mapActor in (IEnumerable<MapActor>)instanceByMapId.Actors.Values)
                    {
                        if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                        {
                            Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                            if (sessionById != null && sessionById.CharacterInfo != null)
                            {
                                string str = Invasion.PlayerCount.ToString() + " players and " + (object)Invasion.NpcCount + " Invaders left...";
                                sessionById.SendData(PacketComposer.Compose("A", "STD|" + str));
                            }
                        }
                    }
                }
                else if (Invasion.Level == 2)
                {
                    List<string> npc1 = new List<string>()
          {
            "-=[ Super Invader ]=-",
            "2",
            "0",
            "0",
            "155",
            "60000000",
            "60000000",
            "45000000",
            "45000000",
            "320",
            "500000000",
            "800000",
            "0",
            "1",
            "0",
            "",
            "0",
            "0",
            "0",
            "0",
            "7000",
            "65000"
          };
                    List<string> npc2 = new List<string>()
          {
            "-=[ Invader ]=-",
            "2",
            "0",
            "0",
            "148",
            "20000000",
            "20000000",
            "15000000",
            "15000000",
            "300",
            "180000000",
            "200000",
            "0",
            "1",
            "0",
            "",
            "0",
            "0",
            "0",
            "0",
            "2600",
            "55000"
          };
                    List<string> npc3 = new List<string>()
          {
            "-=[ Invader ]=-",
            "2",
            "0",
            "0",
            "149",
            "20000000",
            "20000000",
            "15000000",
            "15000000",
            "300",
            "180000000",
            "200000",
            "0",
            "1",
            "0",
            "",
            "0",
            "0",
            "0",
            "0",
            "2600",
            "55000"
          };
                    NpcAI.CreateNpc(npc1, 81, 3, false);
                    NpcAI.CreateNpc(npc2, 81, 5, false);
                    NpcAI.CreateNpc(npc3, 81, 5, false);
                    foreach (MapActor mapActor in (IEnumerable<MapActor>)instanceByMapId.Actors.Values)
                    {
                        if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                        {
                            Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                            if (sessionById != null && sessionById.CharacterInfo != null)
                            {
                                string str = "Third and final wave of invaders detected !";
                                sessionById.SendData(PacketComposer.Compose("A", "STD|" + str));
                            }
                        }
                    }
                    ++Invasion.Level;
                }
                else if (Invasion.Level == 1)
                {
                    List<string> npc1 = new List<string>()
          {
            "-=[ Fast Invader ]=-",
            "2",
            "0",
            "0",
            "146",
            "10000000",
            "10000000",
            "7000000",
            "7000000",
            "350",
            "90000000",
            "100000",
            "0",
            "1",
            "0",
            "",
            "0",
            "0",
            "0",
            "0",
            "1300",
            "35000"
          };
                    List<string> npc2 = new List<string>()
          {
            "-=[ Invader ]=-",
            "2",
            "0",
            "0",
            "148",
            "20000000",
            "20000000",
            "15000000",
            "15000000",
            "300",
            "180000000",
            "200000",
            "0",
            "1",
            "0",
            "",
            "0",
            "0",
            "0",
            "0",
            "2600",
            "55000"
          };
                    List<string> npc3 = new List<string>()
          {
            "-=[ Invader ]=-",
            "2",
            "0",
            "0",
            "149",
            "20000000",
            "20000000",
            "15000000",
            "15000000",
            "300",
            "180000000",
            "200000",
            "0",
            "1",
            "0",
            "",
            "0",
            "0",
            "0",
            "0",
            "2600",
            "55000"
          };
                    NpcAI.CreateNpc(npc1, 81, 15, false);
                    NpcAI.CreateNpc(npc2, 81, 3, false);
                    NpcAI.CreateNpc(npc3, 81, 3, false);
                    foreach (MapActor mapActor in (IEnumerable<MapActor>)instanceByMapId.Actors.Values)
                    {
                        if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                        {
                            Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                            if (sessionById != null && sessionById.CharacterInfo != null)
                            {
                                string str = "Second wave of invaders detected !";
                                sessionById.SendData(PacketComposer.Compose("A", "STD|" + str));
                            }
                        }
                    }
                    ++Invasion.Level;
                }
                else if (Invasion.Level == 0)
                {
                    List<string> npc = new List<string>()
                      {
                        "-=[ Invader ]=-",
                        "2",
                        "0",
                        "0",
                        "15",
                        "20000000",
                        "20000000",
                        "15000000",
                        "15000000",
                        "300",
                        "180000000",
                        "200000",
                        "0",
                        "1",
                        "0",
                        "",
                        "0",
                        "0",
                        "0",
                        "0",
                        "2600",
                        "55000"
                      };
                                NpcAI.CreateNpc(new List<string>()
                      {
                        "-=[ Fast Invader ]=-",
                        "2",
                        "0",
                        "0",
                        "81",
                        "8000000",
                        "8000000",
                        "5000000",
                        "5000000",
                        "350",
                        "80000000",
                        "80000",
                        "0",
                        "1",
                        "0",
                        "",
                        "0",
                        "0",
                        "0",
                        "0",
                        "1300",
                        "30000"
                      }, 81, 10, false);
                    NpcAI.CreateNpc(npc, 81, 3, false);
                    foreach (MapActor mapActor in (IEnumerable<MapActor>)instanceByMapId.Actors.Values)
                    {
                        if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                        {
                            Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                            if (sessionById != null && sessionById.CharacterInfo != null)
                            {
                                string str = "First wave of invaders detected !";
                                sessionById.SendData(PacketComposer.Compose("A", "STD|" + str));
                            }
                        }
                    }
                    ++Invasion.Level;
                }
                else
                {
                    foreach (MapActor mapActor in (IEnumerable<MapActor>)instanceByMapId.Actors.Values)
                    {
                        if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                        {
                            Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                            if (sessionById != null && sessionById.CharacterInfo != null)
                            {
                                string str = "You won the invasion event !";
                                sessionById.SendData(PacketComposer.Compose("A", "STD|" + str));
                                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                                {
                                    string _Message = "Congratulations ! You won the invasion event !";
                                    sessionById.SendData(PacketComposer.Compose("A", "STD|" + _Message));
                                    sessionById.CharacterInfo.AddLog(client, _Message);
                                    sessionById.CharacterInfo.AddReward(client, 0, 200000, 0, true);
                                    sessionById.SendData(PacketComposer.Compose("y", "URI|" + (object)200000 + "|" + (object)sessionById.CharacterInfo.Uridium));
                                }
                                if (Invasion.PerformUpdate != null)
                                    Invasion.PerformUpdate.Dispose();
                                MapHandler.OpenPublicConnection(sessionById, 17, (PortalInfo)null);
                            }
                        }
                    }
                    Invasion.Active = false;
                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                    {
                        client.ExecuteNonQuery("UPDATE event_information SET isActif=0 WHERE id = 1");
                    }
                }
            }
            else
            {
                if (Invasion.PerformUpdate != null)
                    Invasion.PerformUpdate.Dispose();
                foreach (MapActor mapActor in (IEnumerable<MapActor>)instanceByMapId.Actors.Values)
                {
                    if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                    {
                        Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                        if (sessionById != null && sessionById.CharacterInfo != null)
                        {
                            foreach (MapInstance mapInstance in (IEnumerable<MapInstance>)MapManager.MapInstances.Values)
                            {
                                if (mapInstance != null && !mapInstance.Unloaded)
                                {
                                    string str = "Invasion Event was lost !";
                                    mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                                }
                            }
                            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                            {
                                client.ExecuteNonQuery("UPDATE event_information SET isActif=0 WHERE id = 1");
                            }
                            Invasion.Active = false;
                            Invasion.PlayerCount = 0;
                            break;
                        }
                    }
                }
            }
        }
    }
}
