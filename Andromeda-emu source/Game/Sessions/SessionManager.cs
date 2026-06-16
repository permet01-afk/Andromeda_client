using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Moderation;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Sessions
{
    public static class SessionManager
    {
        private static ConcurrentDictionary<int, Session> mSessions;
        private static int mCounter;
        private static CList<int> mSessionsToStop;
        private static ConcurrentDictionary<int, int> mCharacterSessionIndex;
        private static Timer mMonitorThread;
        private static Timer mNoFightThread;
        private static object mSyncRoot;

        private const double STOPPED_GAMEPLAY_INACTIVITY_LOGOUT_SECONDS = 30.0;

        public static CDictionnary<int, Session> Sessions
        {
            get
            {
                CDictionnary<int, Session> cdictionnary = new CDictionnary<int, Session>();
                foreach (KeyValuePair<int, Session> mSession in SessionManager.mSessions)
                {
                    if (!mSession.Value.Stopped)
                        cdictionnary.Add(mSession.Key, mSession.Value);
                }
                return cdictionnary;
            }
        }

        public static CList<Session> SessionsUser
        {
            get
            {
                CList<Session> clist = new CList<Session>();
                foreach (Session key in (IEnumerable<Session>)SessionManager.mSessions.Values)
                {
                    if (key != null && !key.Stopped && key.Authenticated && !key.IsChat)
                        clist.Add(key);
                }
                return clist;
            }
        }

        public static CDictionnary<int, string> ConnectedUserData
        {
            get
            {
                CDictionnary<int, string> cdictionnary = new CDictionnary<int, string>();
                foreach (Session session in (IEnumerable<Session>)SessionManager.mSessions.Values)
                {
                    if (session.Authenticated && !cdictionnary.ContainsKey(session.CharacterId))
                        cdictionnary.Add(session.CharacterId, session.CharacterInfo.Username);
                }
                return cdictionnary;
            }
        }

        public static int ActiveConnections
        {
            get
            {
                if (SessionManager.mSessions != null)
                    return SessionManager.mSessions.Count;
                return 0;
            }
        }

        public static void Initialize()
        {
            SessionManager.mSessions = new ConcurrentDictionary<int, Session>();
            SessionManager.mSessionsToStop = new CList<int>();
            SessionManager.mCharacterSessionIndex = new ConcurrentDictionary<int, int>();
            SessionManager.mCounter = 1;
            SessionManager.mMonitorThread = new Timer(new TimerCallback(SessionManager.ExecuteMonitor), (object)null, TimeSpan.FromMilliseconds(300.0), TimeSpan.FromMilliseconds(300.0));
            SessionManager.mNoFightThread = new Timer(new TimerCallback(SessionManager.ExecuteNoFightMonitor), (object)null, TimeSpan.FromMilliseconds(1000.0), TimeSpan.FromMilliseconds(1000.0));
            SessionManager.mSyncRoot = new object();
        }

        private static void LogTimerFailure(string callbackName, Exception ex)
        {
            Output.WriteLine((object)("[SessionMgrTimer] " + callbackName + " failed: " + ex.ToString()), OutputLevel.CriticalError);
        }

        public static void RegisterAuthenticatedSession(Session session)
        {
            if (session == null || session.CharacterInfo == null || session.IsChat)
                return;

            int characterId = session.CharacterId;
            if (characterId <= 0)
                return;

            SessionManager.mCharacterSessionIndex[characterId] = session.Id;
        }

        public static void UnregisterAuthenticatedSession(Session session)
        {
            if (session == null)
                return;

            int characterId = session.CharacterId;
            if (characterId <= 0)
                return;

            int mappedSessionId;
            if (SessionManager.mCharacterSessionIndex.TryGetValue(characterId, out mappedSessionId) && mappedSessionId == session.Id)
                SessionManager.mCharacterSessionIndex.TryRemove(characterId, out mappedSessionId);
        }

        private static Session TryGetIndexedCharacterSession(int characterId, bool allowDisconnected)
        {
            if (characterId <= 0)
                return (Session)null;

            int sessionId;
            Session session;
            if (SessionManager.mCharacterSessionIndex.TryGetValue(characterId, out sessionId)
                && SessionManager.mSessions.TryGetValue(sessionId, out session)
                && session != null
                && !session.StoppedPlayer
                && !session.IsChat
                && session.CharacterId == characterId
                && session.CharacterInfo != null
                && (allowDisconnected || !session.CharacterInfo.Disconnected))
            {
                return session;
            }

            foreach (Session item in (IEnumerable<Session>)SessionManager.mSessions.Values)
            {
                if (item != null
                    && !item.StoppedPlayer
                    && !item.IsChat
                    && item.CharacterId == characterId
                    && item.CharacterInfo != null
                    && (allowDisconnected || !item.CharacterInfo.Disconnected))
                {
                    SessionManager.mCharacterSessionIndex[characterId] = item.Id;
                    return item;
                }
            }

            if (sessionId != 0)
                SessionManager.mCharacterSessionIndex.TryRemove(characterId, out sessionId);

            return (Session)null;
        }


        private static void ExecuteNoFightMonitor(object state)
        {
            const int PEACE_PORTAL_DELAY = 10;
            long perfStart = PerformanceProfiler.Start();

            try
            {
                foreach (Session Session in (IEnumerable<Session>)SessionManager.mSessions.Values)
                {
                    try
                    {
                        if (Session == null || Session.CharacterInfo == null || Session.IsChat)
                            continue;

                        if (Session.StoppedPlayer || Session.CharacterInfo.Destroy)
                            continue;

                        if (!Session.CharacterInfo.Destroy && !Session.StoppedPlayer && Session.CharacterInfo.Attacked != null)
                        {
                            if (Session.StoppedPlayer || Session.CharacterInfo.Destroy)
                                continue;

                            lock (Session.CharacterInfo.Attacked)
                            {
                                foreach (Session item_0 in (IEnumerable<Session>)Session.CharacterInfo.Attacked.Keys)
                                {
                                    if ((item_0.CharacterInfo.Destroy || item_0.StoppedPlayer || item_0.CharacterInfo.Disconnected ||
                                         item_0.CharacterInfo.SelectedPlayer != Session.CharacterId) &&
                                        Session.CharacterInfo.Attacked.Contains(item_0))
                                    {
                                        Session.CharacterInfo.Attacked.Remove(item_0);
                                    }
                                }
                            }
                        }

                        bool recentlyHit =
                            (UnixTimestamp.GetCurrent() - Session.CharacterInfo.LastAttackByAttackerReceived < PEACE_PORTAL_DELAY);

                        const int SHS_MIN = 3;
                        const int SHS_MAX = 6;

                        bool inCombat =
                            (Session.CharacterInfo.Attacked != null && Session.CharacterInfo.Attacked.Count > 0)
                            || recentlyHit
                            || Session.CharacterInfo.WarningZone
                            || (Session.CharacterInfo.Attacking && !Session.CharacterInfo.OutOfRange);

                        if (inCombat)
                        {
                            Session.CharacterInfo.NoFightTimer = 0;
                        }
                        else
                        {
                            if (Session.CharacterInfo.NoFightTimer < 1000)
                                Session.CharacterInfo.NoFightTimer++;
                        }

                        bool shieldRegenBlocked =
                            Session.CharacterInfo.WarningZone
                            || !Session.CharacterInfo.CanRegenShield;

                        if (!shieldRegenBlocked
                            && Session.CharacterInfo.ShipShield != Session.CharacterInfo.ShipMaxShield)
                        {
                            Fight.RegeneratingShield(Session);
                        }

                        bool shouldTwinkle =
                            !shieldRegenBlocked
                            && Session.CharacterInfo.ShipShield > 0
                            && Session.CharacterInfo.ShipShield < Session.CharacterInfo.ShipMaxShield;

                        if (shouldTwinkle && !Session.CharacterInfo.ShieldTwinkleEnabled)
                        {
                            Session.SendData(PacketComposer.Compose("A", "SHS|1|" + SHS_MIN + "|" + SHS_MAX));
                            Session.CharacterInfo.ShieldTwinkleEnabled = true;
                        }
                        else if (!shouldTwinkle && Session.CharacterInfo.ShieldTwinkleEnabled)
                        {
                            Session.SendData(PacketComposer.Compose("A", "SHS|0|0|0"));
                            Session.CharacterInfo.ShieldTwinkleEnabled = false;
                        }

                        int mapId = Session.CharacterInfo.MapId;
                        if (mapId == 1 || mapId == 2 || mapId == 3 || mapId == 4 ||
                            mapId == 5 || mapId == 6 || mapId == 7 || mapId == 8 ||
                            mapId == 9 || mapId == 10 || mapId == 11 || mapId == 12 ||
                            mapId == 17 || mapId == 18 || mapId == 19 || mapId == 20 ||
                            mapId == 21 || mapId == 22 || mapId == 23 || mapId == 24 ||
                            mapId == 25 || mapId == 26 || mapId == 27 || mapId == 28)
                        {
                            ShipMovement.CheckPeaceZone(Session);
                        }
                    }
                    catch (Exception ex)
                    {
                        Output.WriteLine((object)("[SessionMgr] ExecuteNoFightMonitor session loop failed: " + ex.ToString()), OutputLevel.Warning);
                    }
                }
            }
            catch (Exception ex)
            {
                SessionManager.LogTimerFailure("ExecuteNoFightMonitor", ex);
            }
            finally
            {
                PerformanceProfiler.LogTimer("SessionManager.ExecuteNoFightMonitor", 0, perfStart);
            }
        }

        private static double GetLastIncomingAttackActivity(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return 0.0;

            double last = 0.0;

            if (session.CharacterInfo.LastShieldDamageReceived > last)
                last = session.CharacterInfo.LastShieldDamageReceived;

            if (session.CharacterInfo.LastAttackByAttackerReceived > last)
                last = session.CharacterInfo.LastAttackByAttackerReceived;

            return last;
        }

        private static bool HasRecentIncomingAttackActivity(Session session, double now)
        {
            double lastActivity = GetLastIncomingAttackActivity(session);
            return lastActivity > 0.0 && now - lastActivity < STOPPED_GAMEPLAY_INACTIVITY_LOGOUT_SECONDS;
        }

        private static bool ShouldKeepStoppedGameplaySessionAlive(Session session)
        {
            if (session == null || !session.Stopped || !session.Authenticated || session.StoppedPlayer)
                return false;

            if (session.CharacterInfo == null || session.CharacterInfo.Disconnected || session.CharacterInfo.Destroy)
                return false;

            if (session.CharacterInfo.ShipHp <= 0)
                return false;

            if (session.CurrentMapId <= 0)
                return false;

            if (GalaxyGateWaveService.IsGateMap(session.CharacterInfo.MapId)
                || GalaxyGateWaveService.IsGateMap(session.CurrentMapId))
                return true;

            double now = UnixTimestamp.GetCurrent();

            if (session.TimeStopped < STOPPED_GAMEPLAY_INACTIVITY_LOGOUT_SECONDS)
                return true;

            return HasRecentIncomingAttackActivity(session, now);
        }

        private static void SynchronizeStoppedGameplayBeforeAutoLogout(Session session, SqlDatabaseClient client)
        {
            if (session == null || session.CharacterInfo == null || !session.Authenticated)
                return;

            try
            {
                session.CharacterInfo.FlushPendingPrimaryAmmoToDb();
            }
            catch { }

            try
            {
                session.CharacterInfo.FlushPendingSecondaryAmmoToDb();
            }
            catch { }

            try
            {
                session.CharacterInfo.SynchronizeShipSkillCooldowns(client);
                session.CharacterInfo.SynchronizeStatistics(client, 0);
            }
            catch (Exception ex)
            {
                Output.WriteLine((object)("[SessionMgr] Auto-logout sync failed for charId=" + session.CharacterId + ": " + ex.ToString()), OutputLevel.Warning);
            }

            session.CharacterInfo.Disconnected = true;
        }

        private static void ExecuteMonitor(object state)
        {
            long perfStart = PerformanceProfiler.Start();
            try
            {
                CList<Session> clist1 = new CList<Session>();
                CList<Session> clist2 = new CList<Session>();
                lock (SessionManager.mSessionsToStop)
                {
                    foreach (int item_0 in (IEnumerable<int>)SessionManager.mSessionsToStop.Keys)
                    {
                        Session session;
                        if (SessionManager.mSessions.TryGetValue(item_0, out session))
                            clist2.Add(session);
                    }
                    SessionManager.mSessionsToStop.Clear();
                }
                foreach (Session key in (IEnumerable<Session>)SessionManager.mSessions.Values)
                {
                    if (!clist2.Contains(key) && key.Stopped && key.TimeStopped > STOPPED_GAMEPLAY_INACTIVITY_LOGOUT_SECONDS)
                    {
                        if (ShouldKeepStoppedGameplaySessionAlive(key))
                            continue;

                        clist1.Add(key);
                    }
                }
                if (clist2.Count > 0)
                {
                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient("SessionManager.ExecuteMonitor.Stop"))
                    {
                        foreach (Session key in (IEnumerable<Session>)clist2.Keys)
                        {
                            try
                            {
                                key.Stop(client);
                            }
                            catch (Exception ex)
                            {
                                Output.WriteLine((object)("[SessionMgr] Stop failed for sessionId=" + key.Id + ": " + ex.ToString()), OutputLevel.Warning);
                            }
                        }
                    }
                }
                if (clist1.Count > 0)
                {
                    using (SqlDatabaseClient client = SqlDatabaseManager.GetClient("SessionManager.ExecuteMonitor.AutoLogout"))
                    {
                        foreach (Session key in (IEnumerable<Session>)clist1.Keys)
                        {
                            try
                            {
                                SynchronizeStoppedGameplayBeforeAutoLogout(key, client);
                            }
                            catch (Exception ex)
                            {
                                Output.WriteLine((object)("[SessionMgr] Auto-logout prepare failed for sessionId=" + key.Id + ": " + ex.ToString()), OutputLevel.Warning);
                            }
                        }
                    }
                }

                foreach (Session key in (IEnumerable<Session>)clist1.Keys)
                {
                    try
                    {
                        key.Dispose();
                    }
                    catch (Exception ex)
                    {
                        Output.WriteLine((object)("[SessionMgr] Dispose failed for sessionId=" + key.Id + ": " + ex.ToString()), OutputLevel.Warning);
                    }

                    Session session;
                    SessionManager.mSessions.TryRemove(key.Id, out session);
                }
            }
            catch (Exception ex)
            {
                SessionManager.LogTimerFailure("ExecuteMonitor", ex);
            }
            finally
            {
                PerformanceProfiler.LogCleanup("SessionManager.ExecuteMonitor", perfStart);
            }
        }

        public static void StopSession(int SessionId)
        {
            lock (SessionManager.mSessionsToStop)
                SessionManager.mSessionsToStop.Add(SessionId);
        }

        public static void CancelStopSession(int SessionId)
        {
            lock (SessionManager.mSessionsToStop)
            {
                if (SessionManager.mSessionsToStop.Contains(SessionId))
                    SessionManager.mSessionsToStop.Remove(SessionId);
            }
        }

        public static bool ContainsCharacterId(int Uid)
        {
            return SessionManager.TryGetIndexedCharacterSession(Uid, true) != null;
        }

        public static Session GetSessionByCharacterId(int Id)
        {
            return SessionManager.TryGetIndexedCharacterSession(Id, true);
        }

        public static Session GetSessionById(int Id)
        {
            Session session;
            if (SessionManager.mSessions.TryGetValue(Id, out session))
                return session;
            return (Session)null;
        }

        public static Session GetSessionByUsername(string uname)
        {
            foreach (Session session in (IEnumerable<Session>)SessionManager.mSessions.Values)
            {
                if (!session.StoppedPlayer && session.IsChat && session.CharacterInfo.Username.ToLower() == uname)
                    return session;
            }
            return (Session)null;
        }

        public static Session GetSessionByUsernameChat(string Username)
        {
            foreach (Session session in (IEnumerable<Session>)SessionManager.mSessions.Values)
            {
                if (!session.StoppedPlayer && session.IsChat && session.CharacterInfo.Username.ToLower() == Username)
                    return session;
            }
            return (Session)null;
        }

        public static bool ContainsCharacterIdCache(int Uid)
        {
            return SessionManager.TryGetIndexedCharacterSession(Uid, false) != null;
        }

        public static Session GetSessionByCharacterIdCache(int Id)
        {
            return SessionManager.TryGetIndexedCharacterSession(Id, false);
        }

        public static void BroadcastPacket(ServerMessage Message)
        {
            SessionManager.BroadcastPacket(Message.ToDeltas(), string.Empty);
        }

        public static void BroadcastPacket(byte[] Data)
        {
            SessionManager.BroadcastPacket(Data, string.Empty);
        }

        public static void BroadcastPacket(ServerMessage Message, string RequiredRight)
        {
            SessionManager.BroadcastPacket(Message.ToDeltas(), RequiredRight);
        }

        public static void BroadcastToMapMovement(int CharacterId, int MapId, ServerMessage Message)
        {
            foreach (Session session in (IEnumerable<Session>)SessionManager.mSessions.Values)
            {
                if (session != null && !session.Stopped && session.Authenticated && !session.IsChat)
                    session.SendData(Message);
            }
        }

        public static void BroadcastToUser(ServerMessage Message)
        {
            foreach (Session session in (IEnumerable<Session>)SessionManager.mSessions.Values)
            {
                if (session != null && !session.Stopped && session.Authenticated && !session.IsChat)
                    session.SendData(Message);
            }
        }

        public static void BroadcastPacket(byte[] Data, string RequiredRight)
        {
            foreach (Session session in (IEnumerable<Session>)SessionManager.mSessions.Values)
            {
                if (session != null && !session.Stopped && session.Authenticated)
                    session.SendData(Data);
            }
        }

        public static void HandleIncomingConnection(Socket IncomingSocket)
        {
            bool flag = ModerationBanManager.IsRemoteAddressBlacklisted(IncomingSocket.RemoteEndPoint.ToString().Split(':')[0]);
            Output.WriteLine((object)((flag ? "Rejected" : "Accepted") + " incoming connection from " + IncomingSocket.RemoteEndPoint.ToString().Split(':')[0] + "."), OutputLevel.Informational);
            if (flag)
            {
                try
                {
                    IncomingSocket.Close();
                }
                catch (Exception)
                {
                }
            }
            else
            {
                int num = SessionManager.mCounter++;
                Output.WriteLine((object)("[SESSION] Creating new session id=" + num + " from " + IncomingSocket.RemoteEndPoint.ToString().Split(':')[0]), OutputLevel.DebugInformation);
                SessionManager.mSessions.TryAdd(num, new Session(num, IncomingSocket));
            }
        }
    }
}
