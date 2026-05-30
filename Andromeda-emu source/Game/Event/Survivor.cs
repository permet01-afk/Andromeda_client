

using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Event
{
    internal static class Survivor
    {
        private static bool mActive;
        private static bool mSafeBattle;
        private static int mPlayerCount;
        private static int mPlayerCountMax;
        private static Timer mPerformUpdate;

        public static bool Active
        {
            get
            {
                return Survivor.mActive;
            }
            set
            {
                Survivor.mActive = value;
            }
        }

        public static bool SafeBattle
        {
            get
            {
                return Survivor.mSafeBattle;
            }
            set
            {
                Survivor.mSafeBattle = value;
            }
        }

        public static int PlayerCount
        {
            get
            {
                return Survivor.mPlayerCount;
            }
            set
            {
                Survivor.mPlayerCount = value;
            }
        }

        public static int PlayerCountMax
        {
            get
            {
                return Survivor.mPlayerCountMax;
            }
            set
            {
                Survivor.mPlayerCountMax = value;
            }
        }

        public static Timer PerformUpdate
        {
            get
            {
                return Survivor.mPerformUpdate;
            }
            set
            {
                Survivor.mPerformUpdate = value;
            }
        }

        public static void Initialize()
        {
            Survivor.Active = false;
            Survivor.SafeBattle = false;
            Survivor.PerformUpdate = (Timer)null;
            Survivor.PlayerCount = 0;
        }

        public static void StartSurvivor()
        {
            foreach (MapInstance mapInstance in (IEnumerable<MapInstance>)MapManager.MapInstances.Values)
            {
                if (!mapInstance.Unloaded)
                {
                    string str = "Survivor Event will start in 20 seconds. Prepare to fight !";
                    mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                }
            }
            Survivor.PerformUpdate = new Timer(new TimerCallback(Survivor.StartCoolDown), (object)10, 10000, 0);
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ExecuteNonQuery("UPDATE event_information SET isActif=1 WHERE id = 2");
            }
        }

        private static void StartCoolDown(object state)
        {
            int num = (int)state;
            if (num == 0)
            {
                Survivor.BeginSurvivor();
            }
            else
            {
                foreach (MapInstance mapInstance in (IEnumerable<MapInstance>)MapManager.MapInstances.Values)
                {
                    if (mapInstance != null && !mapInstance.Unloaded)
                    {
                        string str = "Survivor Event will start in " + (object)num + " seconds...";
                        mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                    }
                }
                Survivor.PerformUpdate = new Timer(new TimerCallback(Survivor.StartCoolDown), (object)(num - 1), 1000, 0);
            }
        }

        private static void BeginSurvivor()
        {
            Survivor.Active = true;
            Survivor.SafeBattle = true;
            Survivor.PlayerCountMax = 0;
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
                                ++Survivor.PlayerCountMax;
                                MapHandler.OpenPublicConnection(sessionById, 80, (PortalInfo)null);
                            }
                        }
                    }
                }
            }
            Survivor.PerformUpdate = new Timer(new TimerCallback(Survivor.SafePeriod), (object)30, 1000, 0);
        }

        private static void SafePeriod(object state)
        {
            int num = (int)state;
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(80);
            if (instanceByMapId == null && Survivor.PerformUpdate != null)
            {
                Survivor.PerformUpdate.Dispose();
                Survivor.SafeBattle = false;
                Survivor.Active = false;
                Survivor.PlayerCount = 0;
            }
            if (num == 0)
            {
                Survivor.SafeBattle = false;
                string str = "Survivor battle begin... May the best survive !";
                instanceByMapId.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                Survivor.PerformUpdate = new Timer(new TimerCallback(Survivor.Monitor), (object)null, 0, 5000);
            }
            else
            {
                if (num < 5 || num % 5 == 0)
                {
                    string str = "Survivor battle will begin in " + (object)num + " seconds...";
                    instanceByMapId.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                }
                Survivor.PerformUpdate = new Timer(new TimerCallback(Survivor.SafePeriod), (object)(num - 1), 1000, 0);
            }
        }

        private static void Monitor(object state)
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(80);
            if (instanceByMapId == null && Survivor.PerformUpdate != null)
            {
                Survivor.PerformUpdate.Dispose();
                Survivor.Active = false;
                Survivor.PlayerCount = 0;
            }
            Survivor.PlayerCount = 0;
            foreach (MapActor mapActor in (IEnumerable<MapActor>)instanceByMapId.Actors.Values)
            {
                if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                {
                    Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                    if (sessionById != null && sessionById.CharacterInfo != null)
                        ++Survivor.PlayerCount;
                }
            }
            if (Survivor.PlayerCount > 1)
            {
                foreach (MapActor mapActor in (IEnumerable<MapActor>)instanceByMapId.Actors.Values)
                {
                    if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                    {
                        Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                        if (sessionById != null && sessionById.CharacterInfo != null)
                        {
                            string str = Survivor.PlayerCount.ToString() + " players left...";
                            sessionById.SendData(PacketComposer.Compose("A", "STD|" + str));
                        }
                    }
                }
            }
            else
            {
                if (Survivor.PerformUpdate != null)
                    Survivor.PerformUpdate.Dispose();
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
                                    string str = "The winner of the survival event is : " + sessionById.CharacterInfo.Username;
                                    mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                                }
                            }
                            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                            {
                                string _Message1 = "Congratulations ! You are the survivor !";
                                sessionById.SendData(PacketComposer.Compose("A", "STD|" + _Message1));
                                sessionById.CharacterInfo.AddLog(client, _Message1);
                                sessionById.CharacterInfo.AddReward(client, 0, 500000, 0, true);
                                sessionById.SendData(PacketComposer.Compose("y", "URI|" + (object)500000 + "|" + (object)sessionById.CharacterInfo.Uridium));
                                string _Message2 = "You received 10.000 Pvp points !";
                                sessionById.SendData(PacketComposer.Compose("A", "STD|" + _Message2));
                                sessionById.CharacterInfo.AddLog(client, _Message2);
                                sessionById.CharacterInfo.AddPvpPoints(client, 10000);
                                int rankpoints = Survivor.PlayerCountMax * 250;
                                sessionById.SendData(PacketComposer.Compose("A", "STD|You received " + (object)rankpoints + " rankpoint(s)."));
                                sessionById.CharacterInfo.AddRankpoints(client, rankpoints);
                                client.ClearParameters();
                                client.ExecuteNonQuery("UPDATE event_information SET isActif=0 WHERE id = 2");
                                client.ExecuteNonQuery("UPDATE event_information SET playerId=" + sessionById.CharacterInfo.Id + " WHERE id = 5");
                                client.ExecuteNonQuery("UPDATE users SET game_title = '' WHERE game_title = 'title_20'");
                                sessionById.CharacterInfo.AddSurvivorWin(client, 1);
                            }
                            sessionById.CharacterInfo.GameTitle = "title_20";
                            sessionById.CharacterInfo.SetTitle("title_20");
                            MapHandler.OpenPublicConnection(sessionById, 17, (PortalInfo)null);
                            Survivor.Active = false;
                            Survivor.PlayerCount = 0;
                            break;
                        }
                    }
                }
            }
        }
    }
}
