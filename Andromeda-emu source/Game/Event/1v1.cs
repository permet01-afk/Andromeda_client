using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace OrbitReborn_Emulator.Game.Event
{
    public static class _1v1
    {
        private static int[] mapArray = { 85, 86, 87 };
        private static CDictionnary<int, bool> mapUsed;
        private static CDictionnary<int, int[]> mapsOpponent;
        private static CDictionnary<int, Timer> timerCooldownTp;
        private static CDictionnary<int, Timer> timerCooldownSafeBattle;
        private static CDictionnary<int, Timer> timerMatch;
        private static CDictionnary<int, double> timestampMatch;
        private static CDictionnary<int, bool> safeBattle;

        public static void initialize()
        {
            _1v1.mapUsed = new CDictionnary<int, bool>();
            _1v1.mapsOpponent = new CDictionnary<int, int[]>();
            _1v1.timerCooldownTp = new CDictionnary<int, Timer>();
            _1v1.timerCooldownSafeBattle = new CDictionnary<int, Timer>();
            _1v1.timerMatch = new CDictionnary<int, Timer>();
            _1v1.timestampMatch = new CDictionnary<int, double>();
            _1v1.safeBattle = new CDictionnary<int, bool>();
            foreach (int i in _1v1.mapArray)
            {
                _1v1.mapUsed.Add(i, false);
                _1v1.mapsOpponent.Add(i, null);
                _1v1.timerCooldownTp.Add(i, null);
                _1v1.timerCooldownSafeBattle.Add(i, null);
                _1v1.timerMatch.Add(i, null);
                _1v1.timestampMatch.Add(i, 0);
                _1v1.safeBattle.Add(i, false);
            }
        }

        private static void EnsureInitialized()
        {
            if (_1v1.mapUsed == null || _1v1.mapsOpponent == null || _1v1.safeBattle == null)
                _1v1.initialize();
        }

        private static void LogTimerFailure(string callbackName, Exception ex)
        {
            Output.WriteLine((object)("[1v1Timer] " + callbackName + " failed: " + ex.ToString()), OutputLevel.CriticalError);
        }

        private static void displayMessage1v1(string msg)
        {
            foreach (MapInstance mapInstance in (IEnumerable<MapInstance>)MapManager.MapInstances.Values)
            {
                if (mapInstance != null && !mapInstance.Unloaded)
                    mapInstance.BroadcastMessage(PacketComposer.Compose("A", "STD|" + msg), false);
            }
        }

        public static bool isSafeBattle(int mapId)
        {
            _1v1.EnsureInitialized();
            if (!_1v1.safeBattle.ContainsKey(mapId))
                return false;
            return _1v1.safeBattle[mapId];
        }

        public static bool IsOnMap(int mapid)
        {
            return _1v1.mapArray.Contains(mapid);
        }

        public static bool IsDuelMapAvailable(int mapid)
        {
            return _1v1.IsOnMap(mapid) && MapInfoLoader.GetMapInfo(mapid) != null;
        }

        public static bool HasDuelMapAvailable()
        {
            foreach (int map in _1v1.mapArray)
            {
                if (_1v1.IsDuelMapAvailable(map))
                    return true;
            }
            return false;
        }

        public static bool IsCharacterInMatch(int characterId)
        {
            _1v1.EnsureInitialized();
            foreach (int[] opponents in (IEnumerable<int[]>)_1v1.mapsOpponent.Values)
            {
                if (opponents != null && opponents.Length >= 2 && (opponents[0] == characterId || opponents[1] == characterId))
                    return true;
            }
            return false;
        }

        public static bool AreOpponents(int characterId1, int characterId2, int map)
        {
            int op1;
            int op2;
            if (!_1v1.TryGetOpponents(map, out op1, out op2))
                return false;

            return (op1 == characterId1 && op2 == characterId2)
                || (op1 == characterId2 && op2 == characterId1);
        }

        public static bool canMatch()
        {
            _1v1.EnsureInitialized();
            foreach (KeyValuePair<int, bool> entry in _1v1.mapUsed)
            {
                if (!entry.Value && _1v1.IsDuelMapAvailable(entry.Key))
                    return true;
            }
            return false;
        }

        public static int getMap()
        {
            _1v1.EnsureInitialized();
            foreach (KeyValuePair<int, bool> entry in _1v1.mapUsed)
            {
                if (!entry.Value && _1v1.IsDuelMapAvailable(entry.Key))
                    return entry.Key;
            }
            return 0;
        }

        public static void initMatch(int op1, int op2)
        {
            _1v1.EnsureInitialized();

            Session session1 = SessionManager.GetSessionByCharacterId(op1);
            Session session2 = SessionManager.GetSessionByCharacterId(op2);

            if (session1 == null || session1.CharacterInfo == null)
                return;
            if (session2 == null || session2.CharacterInfo == null)
                return;
            if (op1 == op2)
                return;

            int map = _1v1.getMap();
            if (map == 0)
            {
                session1.SendData(PacketComposer.Compose("A", "STD|There is no duel arena available."));
                session2.SendData(PacketComposer.Compose("A", "STD|There is no duel arena available."));
                return;
            }

            int[] opArray = { op1, op2 };
            _1v1.mapUsed.Add(map, true);
            _1v1.mapsOpponent.Add(map, opArray);
            _1v1.safeBattle.Add(map, false);
            _1v1.timestampMatch.Add(map, 0);

            _1v1.prepareMatch(map);
        }

        public static void prepareMatch(int map)
        {
            int op1;
            int op2;
            if (!_1v1.TryGetOpponents(map, out op1, out op2))
                return;

            ObjectCooldown obj = new ObjectCooldown(map, 10);
            Timer timer = new Timer(new TimerCallback(_1v1.cooldownTp), (object)obj, 5000, Timeout.Infinite);
            _1v1.ReplaceTimer(_1v1.timerCooldownTp, map, timer);
        }

        private static void cooldownTp(object state)
        {
            try
            {
                ObjectCooldown obj = (ObjectCooldown)state;

                int op1;
                int op2;
                if (obj == null || !_1v1.TryGetOpponents(obj.map, out op1, out op2))
                {
                    if (obj != null)
                        _1v1.clearMap(obj.map);
                    return;
                }

                Session session1 = SessionManager.GetSessionByCharacterId(op1);
                Session session2 = SessionManager.GetSessionByCharacterId(op2);

                if (session1 == null || session2 == null || session1.CharacterInfo == null || session2.CharacterInfo == null)
                {
                    _1v1.clearMap(obj.map);
                    return;
                }

                if (obj.time <= 0)
                {
                    _1v1.DisposeTimer(_1v1.timerCooldownTp, obj.map);
                    _1v1.tpOpponent(obj.map);
                    return;
                }

                string canTp = _1v1.checkCanTp(session1, session2);
                if (canTp != null)
                {
                    session1.SendData(PacketComposer.Compose("A", "STD|" + canTp));
                    session2.SendData(PacketComposer.Compose("A", "STD|" + canTp));
                    _1v1.clearMap(obj.map);
                    return;
                }

                string msg = "You will be teleported in " + obj.time + " seconds!";
                session1.SendData(PacketComposer.Compose("A", "STD|" + msg));
                session2.SendData(PacketComposer.Compose("A", "STD|" + msg));

                obj.time--;

                Timer timer = new Timer(new TimerCallback(_1v1.cooldownTp), (object)obj, 1000, Timeout.Infinite);
                _1v1.ReplaceTimer(_1v1.timerCooldownTp, obj.map, timer);
            }
            catch (Exception ex)
            {
                _1v1.LogTimerFailure("cooldownTp", ex);
                ObjectCooldown obj = state as ObjectCooldown;
                if (obj != null)
                    _1v1.clearMap(obj.map);
            }
        }

        private static string checkCanTp(Session session1, Session session2)
        {
            if (session1.CharacterInfo.Attacking || session1.CharacterInfo.Attacked.Count > 0 || (UnixTimestamp.GetCurrent() - session1.CharacterInfo.LastAttackByAttackerReceived) < 60.0)
                return session1.CharacterInfo.Username + " is under attack!";

            if (session2.CharacterInfo.Attacking || session2.CharacterInfo.Attacked.Count > 0 || (UnixTimestamp.GetCurrent() - session2.CharacterInfo.LastAttackByAttackerReceived) < 60.0)
                return session2.CharacterInfo.Username + " is under attack!";

            return null;
        }

        private static void cooldownSafeBattle(object state)
        {
            try
            {
                ObjectCooldown obj = (ObjectCooldown)state;

                int op1;
                int op2;
                if (obj == null || !_1v1.TryGetOpponents(obj.map, out op1, out op2))
                {
                    if (obj != null)
                        _1v1.clearMap(obj.map);
                    return;
                }

                Session session1 = SessionManager.GetSessionByCharacterId(op1);
                Session session2 = SessionManager.GetSessionByCharacterId(op2);

                if (session1 == null || session2 == null || session1.CharacterInfo == null || session2.CharacterInfo == null)
                {
                    _1v1.clearMap(obj.map);
                    return;
                }

                if (obj.time <= 0)
                {
                    session1.SendData(PacketComposer.Compose("A", "STD|FIGHT!"));
                    session2.SendData(PacketComposer.Compose("A", "STD|FIGHT!"));

                    _1v1.safeBattle.Add(obj.map, false);
                    _1v1.DisposeTimer(_1v1.timerCooldownSafeBattle, obj.map);
                    _1v1.timestampMatch.Add(obj.map, UnixTimestamp.GetCurrent());
                    Timer timerMatch = new Timer(new TimerCallback(_1v1.Match), (object)obj.map, 0, 5000);
                    _1v1.ReplaceTimer(_1v1.timerMatch, obj.map, timerMatch);
                    return;
                }

                string msg = "Fight will begin in " + obj.time + " seconds!";
                session1.SendData(PacketComposer.Compose("A", "STD|" + msg));
                session2.SendData(PacketComposer.Compose("A", "STD|" + msg));

                obj.time--;

                Timer timer = new Timer(new TimerCallback(_1v1.cooldownSafeBattle), (object)obj, 1000, Timeout.Infinite);
                _1v1.ReplaceTimer(_1v1.timerCooldownSafeBattle, obj.map, timer);
            }
            catch (Exception ex)
            {
                _1v1.LogTimerFailure("cooldownSafeBattle", ex);
                ObjectCooldown obj = state as ObjectCooldown;
                if (obj != null)
                    _1v1.clearMap(obj.map);
            }
        }

        public static void tpOpponent(int map)
        {
            try
            {
                int op1;
                int op2;
                if (!_1v1.IsDuelMapAvailable(map) || !_1v1.TryGetOpponents(map, out op1, out op2))
                {
                    _1v1.clearMap(map);
                    return;
                }

                Session session1 = SessionManager.GetSessionByCharacterId(op1);
                Session session2 = SessionManager.GetSessionByCharacterId(op2);

                if (session1 == null || session2 == null || session1.CharacterInfo == null || session2.CharacterInfo == null)
                {
                    _1v1.clearMap(map);
                    return;
                }

                session1.CharacterInfo.LocX = 8600;
                session1.CharacterInfo.LocY = 6600;
                session1.CharacterInfo.NewLocX = session1.CharacterInfo.LocX;
                session1.CharacterInfo.NewLocY = session1.CharacterInfo.LocY;
                session1.CharacterInfo.PlayerInRange.Clear();
                session1.CharacterInfo.FactionId = 1;

                session2.CharacterInfo.LocX = 12000;
                session2.CharacterInfo.LocY = 6600;
                session2.CharacterInfo.NewLocX = session2.CharacterInfo.LocX;
                session2.CharacterInfo.NewLocY = session2.CharacterInfo.LocY;
                session2.CharacterInfo.PlayerInRange.Clear();
                session2.CharacterInfo.FactionId = 2;

                MapHandler.OpenPublicConnection(session1, map, (PortalInfo)null);
                MapHandler.OpenPublicConnection(session2, map, (PortalInfo)null);

                ObjectCooldown obj = new ObjectCooldown(map, 15);

                _1v1.safeBattle.Add(map, true);
                Timer timer = new Timer(new TimerCallback(_1v1.cooldownSafeBattle), (object)obj, 0, Timeout.Infinite);
                _1v1.ReplaceTimer(_1v1.timerCooldownSafeBattle, obj.map, timer);
            }
            catch (Exception ex)
            {
                _1v1.LogTimerFailure("tpOpponent", ex);
                _1v1.clearMap(map);
            }
        }

        private static void Match(object state)
        {
            try
            {
                int map = (int)state;
                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(map);
                int num = 0;
                int id = 0;

                if (instanceByMapId == null)
                {
                    _1v1.clearMap(map);
                    return;
                }

                foreach (MapActor actor in instanceByMapId.GetUserActorSnapshot())
                {
                    if (actor == null || actor.Type != MapActorType.UserCharacter)
                        continue;

                    Session sessionById = SessionManager.GetSessionById(actor.ReferenceSessionId);
                    if (sessionById == null || sessionById.CharacterInfo == null)
                        continue;

                    num++;
                    id = sessionById.CharacterId;
                }

                if (_1v1.checkWinner(id, num, map))
                {
                    _1v1.DisposeTimer(_1v1.timerMatch, map);
                    _1v1.finishMatch(map);
                }
            }
            catch (Exception ex)
            {
                _1v1.LogTimerFailure("Match", ex);
                if (state is int)
                    _1v1.clearMap((int)state);
            }
        }

        private static bool checkWinner(int id, int num, int map)
        {
            if (num <= 0)
            {
                _1v1.sendEquality(map);
                return true;
            }
            if (num == 1)
            {
                _1v1.sendVictory(id, map);
                return true;
            }
            if (_1v1.timestampMatch.ContainsKey(map) && UnixTimestamp.GetCurrent() - _1v1.timestampMatch[map] >= 300)
            {
                _1v1.sendEquality(map);
                return true;
            }

            return false;
        }

        private static bool TryGetOpponents(int map, out int op1, out int op2)
        {
            _1v1.EnsureInitialized();
            op1 = 0;
            op2 = 0;

            if (!_1v1.mapsOpponent.ContainsKey(map))
                return false;

            int[] opponents = _1v1.mapsOpponent[map];
            if (opponents == null || opponents.Length < 2)
                return false;

            op1 = opponents[0];
            op2 = opponents[1];
            return op1 > 0 && op2 > 0;
        }

        private static void sendVictory(int id, int map)
        {
            Session session = SessionManager.GetSessionByCharacterId(id);
            if (session == null || session.CharacterInfo == null)
                return;

            session.SendData(PacketComposer.Compose("A", "STD|You won the duel!"));
            Session sessionLost = null;

            int op1;
            int op2;
            if (_1v1.TryGetOpponents(map, out op1, out op2))
            {
                int lostId = op1 == id ? op2 : op1;
                sessionLost = _1v1.sendDefeat(lostId);
            }

            if (sessionLost != null && sessionLost.CharacterInfo != null)
                _1v1.displayMessage1v1(session.CharacterInfo.Username + " won the duel against " + sessionLost.CharacterInfo.Username + "!");

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                if (session.CharacterInfo != null)
                    session.CharacterInfo.AddDuelReward(client, 1, 1);
                if (sessionLost != null && sessionLost.CharacterInfo != null)
                    sessionLost.CharacterInfo.AddDuelReward(client, 1, 0);
            }
        }

        public static Session sendDefeat(int id)
        {
            Session session = SessionManager.GetSessionByCharacterId(id);
            if (session == null)
                return null;
            session.SendData(PacketComposer.Compose("A", "STD|You lost the duel."));
            return session;
        }

        public static void sendEquality(int map)
        {
            int op1;
            int op2;
            if (!_1v1.TryGetOpponents(map, out op1, out op2))
                return;

            Session session1 = SessionManager.GetSessionByCharacterId(op1);
            Session session2 = SessionManager.GetSessionByCharacterId(op2);

            if (session1 != null)
                session1.SendData(PacketComposer.Compose("A", "STD|Equality!"));
            if (session2 != null)
                session2.SendData(PacketComposer.Compose("A", "STD|Equality!"));

            if (session1 != null && session1.CharacterInfo != null && session2 != null && session2.CharacterInfo != null)
                _1v1.displayMessage1v1("Equality between " + session1.CharacterInfo.Username + " and " + session2.CharacterInfo.Username + "!");

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                if (session1 != null && session1.CharacterInfo != null)
                    session1.CharacterInfo.AddDuelReward(client, 1, 0);
                if (session2 != null && session2.CharacterInfo != null)
                    session2.CharacterInfo.AddDuelReward(client, 1, 0);
            }
        }

        private static void finishMatch(int map)
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(map);

            int op1;
            int op2;
            if (_1v1.TryGetOpponents(map, out op1, out op2))
            {
                _1v1.AddLastDuel(op1);
                _1v1.AddLastDuel(op2);
            }

            if (instanceByMapId != null)
            {
                foreach (MapActor actor in instanceByMapId.GetUserActorSnapshot())
                {
                    if (actor == null)
                        continue;

                    Session sessionById = SessionManager.GetSessionById(actor.ReferenceSessionId);
                    if (sessionById != null && sessionById.CharacterInfo != null)
                        _1v1.backToBase(sessionById);
                }
            }

            _1v1.clearMap(map);
        }

        private static void AddLastDuel(int id)
        {
            Session session = SessionManager.GetSessionByCharacterId(id);
            if (session == null || session.CharacterInfo == null)
                return;

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                session.CharacterInfo.AddLastDuel(client);
            }
        }

        private static void backToBase(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            Session.CharacterInfo.FactionId = Session.CharacterInfo.RealFaction;
            if (Session.CharacterInfo.FactionId == 1)
            {
                Session.CharacterInfo.LocX = 2000;
                Session.CharacterInfo.LocY = 1100;
                Session.CharacterInfo.NewLocX = Session.CharacterInfo.LocX;
                Session.CharacterInfo.NewLocY = Session.CharacterInfo.LocY;
                Session.CharacterInfo.MapId = 1;
            }
            else if (Session.CharacterInfo.FactionId == 2)
            {
                Session.CharacterInfo.LocX = 18500;
                Session.CharacterInfo.LocY = 1100;
                Session.CharacterInfo.NewLocX = Session.CharacterInfo.LocX;
                Session.CharacterInfo.NewLocY = Session.CharacterInfo.LocY;
                Session.CharacterInfo.MapId = 5;
            }
            else if (Session.CharacterInfo.FactionId == 3)
            {
                Session.CharacterInfo.LocX = 19000;
                Session.CharacterInfo.LocY = 11300;
                Session.CharacterInfo.NewLocX = Session.CharacterInfo.LocX;
                Session.CharacterInfo.NewLocY = Session.CharacterInfo.LocY;
                Session.CharacterInfo.MapId = 9;
            }

            MapHandler.OpenPublicConnection(Session, Session.CharacterInfo.MapId, (PortalInfo)null);
        }

        private static void RestoreOrReturnOpponent(int id, int map)
        {
            Session session = SessionManager.GetSessionByCharacterId(id);
            if (session == null || session.CharacterInfo == null)
                return;

            session.CharacterInfo.FactionId = session.CharacterInfo.RealFaction;

            if (session.CharacterInfo.MapId == map || session.AbsoluteMapId == map)
                _1v1.backToBase(session);
        }

        private static void RestoreOrReturnOpponents(int map)
        {
            int op1;
            int op2;
            if (!_1v1.TryGetOpponents(map, out op1, out op2))
                return;

            _1v1.RestoreOrReturnOpponent(op1, map);
            _1v1.RestoreOrReturnOpponent(op2, map);
        }

        private static void ReplaceTimer(CDictionnary<int, Timer> timers, int map, Timer timer)
        {
            if (timers == null)
                return;

            Timer oldTimer = null;
            if (timers.ContainsKey(map))
                oldTimer = timers[map];

            timers.Add(map, timer);

            if (oldTimer != null)
                oldTimer.Dispose();
        }

        private static void DisposeTimer(CDictionnary<int, Timer> timers, int map)
        {
            if (timers == null || !timers.ContainsKey(map))
                return;

            Timer timer = timers[map];
            timers.Add(map, null);

            if (timer != null)
                timer.Dispose();
        }

        private static void clearMap(int map)
        {
            _1v1.EnsureInitialized();

            _1v1.DisposeTimer(_1v1.timerCooldownTp, map);
            _1v1.DisposeTimer(_1v1.timerCooldownSafeBattle, map);
            _1v1.DisposeTimer(_1v1.timerMatch, map);

            _1v1.RestoreOrReturnOpponents(map);

            _1v1.mapUsed.Add(map, false);
            _1v1.mapsOpponent.Add(map, null);
            _1v1.safeBattle.Add(map, false);
            _1v1.timestampMatch.Add(map, 0);
        }
    }

    public class ObjectCooldown
    {
        public int map;
        public int time;

        public ObjectCooldown(int map, int time)
        {
            this.time = time;
            this.map = map;
        }
    }
}
