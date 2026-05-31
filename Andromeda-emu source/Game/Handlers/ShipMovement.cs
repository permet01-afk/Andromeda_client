

using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Specialized;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Windows;
using OrbitReborn_Emulator.Game.GalaxyGates;

namespace OrbitReborn_Emulator.Game.Handlers
{
    public static class ShipMovement
    {
        public static Timer CheckAliensInRangeTimer;

        private static readonly object EnemyWarningLock = new object();
        private static readonly Dictionary<int, int> LastEnemyWarningLevel = new Dictionary<int, int>();
        private static readonly Dictionary<int, int> LastEnemyWarningRefreshTick = new Dictionary<int, int>();
        private const int EnemyWarningMinimumRefreshMs = 1000;

        private static readonly object PeacePortalInfoLock = new object();
        private static readonly Dictionary<int, string> LastPeacePortalInfoPayload = new Dictionary<int, string>();

        private static readonly object MovementUpdateLock = new object();
        private static readonly Dictionary<int, bool> MovementUpdateRunning = new Dictionary<int, bool>();


        private static readonly object RadiationLock = new object();
        private static readonly Dictionary<int, int> RadiationTicks = new Dictionary<int, int>();

        private static void ResetRadiationTicks(int characterId)
        {
            lock (RadiationLock)
            {
                RadiationTicks[characterId] = 0;
            }
        }

        private static void ClearRadiationTicks(int characterId)
        {
            lock (RadiationLock)
            {
                if (RadiationTicks.ContainsKey(characterId))
                    RadiationTicks.Remove(characterId);
            }
        }

        private static int NextRadiationTick(int characterId)
        {
            lock (RadiationLock)
            {
                int t;
                RadiationTicks.TryGetValue(characterId, out t);
                t++;
                RadiationTicks[characterId] = t;
                return t;
            }
        }

        private static void LogTimerFailure(string callbackName, Exception ex)
        {
            Output.WriteLine((object)("[ShipMovementTimer] " + callbackName + " failed: " + ex.ToString()), OutputLevel.CriticalError);
        }

        private static bool TryEnterMovementUpdate(Session session)
        {
            if (session == null)
                return false;

            int characterId = session.CharacterId;
            if (characterId <= 0)
                return true;

            lock (MovementUpdateLock)
            {
                bool running;
                if (MovementUpdateRunning.TryGetValue(characterId, out running) && running)
                    return false;

                MovementUpdateRunning[characterId] = true;
                return true;
            }
        }

        private static void ExitMovementUpdate(Session session)
        {
            if (session == null || session.CharacterId <= 0)
                return;

            lock (MovementUpdateLock)
            {
                if (MovementUpdateRunning.ContainsKey(session.CharacterId))
                    MovementUpdateRunning.Remove(session.CharacterId);
            }
        }

        private static void ClearMovementRuntimeState(int characterId)
        {
            if (characterId <= 0)
                return;

            lock (MovementUpdateLock)
            {
                if (MovementUpdateRunning.ContainsKey(characterId))
                    MovementUpdateRunning.Remove(characterId);
            }

            lock (EnemyWarningLock)
            {
                if (LastEnemyWarningLevel.ContainsKey(characterId))
                    LastEnemyWarningLevel.Remove(characterId);
                if (LastEnemyWarningRefreshTick.ContainsKey(characterId))
                    LastEnemyWarningRefreshTick.Remove(characterId);
            }

            lock (PeacePortalInfoLock)
            {
                if (LastPeacePortalInfoPayload.ContainsKey(characterId))
                    LastPeacePortalInfoPayload.Remove(characterId);
            }
        }

        private static bool ShouldRefreshEnemyWarning(int characterId, bool force)
        {
            if (characterId <= 0)
                return true;

            int nowTick = Environment.TickCount;

            lock (EnemyWarningLock)
            {
                int lastTick;
                bool hasKnownLevel = LastEnemyWarningLevel.ContainsKey(characterId);

                if (force || !hasKnownLevel || !LastEnemyWarningRefreshTick.TryGetValue(characterId, out lastTick) || unchecked(nowTick - lastTick) >= EnemyWarningMinimumRefreshMs)
                {
                    LastEnemyWarningRefreshTick[characterId] = nowTick;
                    return true;
                }
            }

            return false;
        }

        public static void StopMovementTracking(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            try
            {
                if (session.CharacterInfo.UpdateMovementTimer != null)
                {
                    session.CharacterInfo.UpdateMovementTimer.Dispose();
                    session.CharacterInfo.UpdateMovementTimer = (Timer)null;
                }
            }
            catch { }

            try
            {
                if (session.CharacterInfo.PathFinding != null)
                {
                    session.CharacterInfo.PathFinding.Dispose();
                    session.CharacterInfo.PathFinding = (Timer)null;
                }
            }
            catch { }

            try { session.CharacterInfo.IsMoving = false; } catch { }
            try { session.CharacterInfo.LastMove.Stop(); } catch { }

            try
            {
                lock (session.CharacterInfo.NpcInRange)
                    session.CharacterInfo.NpcInRange.Clear();
            }
            catch { }

            ClearMovementRuntimeState(session.CharacterId);
        }

        public static void Initialize()
        {
            DataRouter.RegisterHandler("1", new ProcessRequestCallback(ShipMovement.Movement), false);
        }

        private static void MovePlayer(Session Session, double time)
        {
            Vector vector1 = new Vector((double)Session.CharacterInfo.LocX, (double)Session.CharacterInfo.LocY);
            Vector vector2 = new Vector((double)Session.CharacterInfo.NewLocX, (double)Session.CharacterInfo.NewLocY);
            Vector vector3 = Vector.Subtract(vector2, vector1);
            double dx3 = vector3.X;
            double dy3 = vector3.Y;
            double distanceSquared = dx3 * dx3 + dy3 * dy3;
            Vector position = ShipMovement.calculatePosition(vector1, vector2, time, (double)Session.CharacterInfo.ShipSpeed / 1000.0);
            Vector vector4 = Vector.Subtract(vector1, position);
            double dx4 = vector4.X;
            double dy4 = vector4.Y;
            double traveledSquared = dx4 * dx4 + dy4 * dy4;
            if (traveledSquared >= distanceSquared)
            {
                Session.CharacterInfo.LocX = Session.CharacterInfo.NewLocX;
                Session.CharacterInfo.LocY = Session.CharacterInfo.NewLocY;
                Session.CharacterInfo.LastMove.Stop();
                Session.CharacterInfo.IsMoving = false;
                if (Session.CharacterInfo.PathFinding != null)
                {
                    Session.CharacterInfo.PathFinding.Dispose();
                    Session.CharacterInfo.PathFinding = null;
                }
            }
            else
            {
                try
                {
                    Session.CharacterInfo.LocX = Convert.ToInt32(position.X);
                    Session.CharacterInfo.LocY = Convert.ToInt32(position.Y);
                    Session.CharacterInfo.LastMove.Restart();
                }
                catch (OverflowException)
                {
                    Output.WriteLine((object)("BUG3 : " + (object)position.X + ", " + (object)Session.CharacterInfo.LocX + ", " + (object)position.Y + ", " + (object)Session.CharacterInfo.LocY));
                    Session.CharacterInfo.NewLocX = Session.CharacterInfo.LocX;
                    Session.CharacterInfo.NewLocY = Session.CharacterInfo.LocY;
                }
            }

            ShipMovement.CheckWarningZone(Session);
            ShipMovement.CheckPeaceZone(Session);
            ShipMovement.CheckPortalZone(Session);
            if (Session.CharacterInfo.UpdateMovementTimer == null)
                ShipMovement.UpdateMovement((object)Session);
        }

        public static void AdvanceMovingPlayerToCurrentPosition(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null || !Session.CharacterInfo.IsMoving)
                return;
            if (Session.CharacterInfo.LastMove == null)
                return;

            int locX = Session.CharacterInfo.LocX;
            int locY = Session.CharacterInfo.LocY;
            int newLocX = Session.CharacterInfo.NewLocX;
            int newLocY = Session.CharacterInfo.NewLocY;

            if (locX == newLocX && locY == newLocY)
            {
                Session.CharacterInfo.IsMoving = false;
                try { Session.CharacterInfo.LastMove.Stop(); } catch { }
                try
                {
                    if (Session.CharacterInfo.PathFinding != null)
                    {
                        Session.CharacterInfo.PathFinding.Dispose();
                        Session.CharacterInfo.PathFinding = null;
                    }
                }
                catch { }
                return;
            }

            double elapsed = (double)Session.CharacterInfo.LastMove.ElapsedMilliseconds;
            if (elapsed <= 0.0 || Session.CharacterInfo.ShipSpeed <= 0)
                return;

            double dx = (double)(newLocX - locX);
            double dy = (double)(newLocY - locY);
            double distance = Math.Sqrt(dx * dx + dy * dy);
            if (distance <= 0.0)
                return;

            double travelled = elapsed * (double)Session.CharacterInfo.ShipSpeed / 1000.0;
            if (travelled >= distance)
            {
                Session.CharacterInfo.LocX = newLocX;
                Session.CharacterInfo.LocY = newLocY;
                Session.CharacterInfo.IsMoving = false;
                try { Session.CharacterInfo.LastMove.Stop(); } catch { }
                try
                {
                    if (Session.CharacterInfo.PathFinding != null)
                    {
                        Session.CharacterInfo.PathFinding.Dispose();
                        Session.CharacterInfo.PathFinding = null;
                    }
                }
                catch { }
                return;
            }

            double ratio = travelled / distance;
            int currentX = Convert.ToInt32((double)locX + dx * ratio);
            int currentY = Convert.ToInt32((double)locY + dy * ratio);

            if (currentX == locX && currentY == locY)
                return;

            Session.CharacterInfo.LocX = currentX;
            Session.CharacterInfo.LocY = currentY;
            Session.CharacterInfo.LastMove.Restart();
        }

        private static void TryMovePlayer(Session Session)
        {
            if (Session.CharacterInfo.NewLocX != Session.CharacterInfo.LocX || Session.CharacterInfo.NewLocY != Session.CharacterInfo.LocY)
            {
                Session.CharacterInfo.LastMove.Stop();
                ShipMovement.MovePlayer(Session, (double)Session.CharacterInfo.LastMove.ElapsedMilliseconds);
            }
            else
            {
                if (Session.CharacterInfo.PathFinding != null)
                {
                    Session.CharacterInfo.PathFinding.Dispose();
                    Session.CharacterInfo.PathFinding = null;
                }
                Session.CharacterInfo.IsMoving = false;
                Session.CharacterInfo.LastMove.Stop();
            }
        }

        private static void PathFinding(object state)
        {
            try
            {
                Session Session = (Session)state;
                if (Session == null || Session.CharacterInfo == null)
                    return;

                if (Session.CharacterInfo.Destroy || Session.CharacterInfo.Disconnected || Session.StoppedPlayer || Session.Stopped || !Session.MapJoined || !Session.MapAuthed || Session.CurrentMapId <= 0 || MapManager.GetInstanceByMapId(Session.CurrentMapId) == null)
                {
                    ShipMovement.StopMovementTracking(Session);
                    return;
                }

                ShipMovement.TryMovePlayer(Session);
            }
            catch (Exception ex)
            {
                LogTimerFailure("PathFinding", ex);
            }
        }

        private static void Movement(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null || MapManager.GetInstanceByMapId(Session.CurrentMapId) == null || !Session.CharacterInfo.CanMove)
                return;
            int nextInt1 = Message.GetNextInt(1);
            int nextInt2 = Message.GetNextInt(2);
            int nextInt3 = Message.GetNextInt(3);
            int nextInt4 = Message.GetNextInt(4);
            if (nextInt1 == 0 || nextInt2 == 0 || nextInt3 == 0 || nextInt4 == 0)
                return;

            ShipMovement.AdvanceMovingPlayerToCurrentPosition(Session);

            double TimeTaken = ShipMovement.getTimeTaken(Session, nextInt1, nextInt2);
            if (TimeTaken == -1)
                return;

            Session.CharacterInfo.NewLocX = nextInt1;
            Session.CharacterInfo.NewLocY = nextInt2;

            ShipMovement.MoveShip(Session, TimeTaken);
            ShipMovement.MovementToSeeEveryone(Session, TimeTaken);

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId != null)
                Fight.BroadcastLockIntentForMovedTarget(instanceByMapId, Session.CharacterId);
        }

#pragma warning disable IDE1006
        public static double getTimeTaken(Session Session, int nextInt1, int nextInt2)
        {
            double dx = (double)(Session.CharacterInfo.LocX - nextInt1);
            double dy = (double)(Session.CharacterInfo.LocY - nextInt2);
            double num = Math.Sqrt(dx * dx + dy * dy);

            int limitX = 22000;
            int limitY = 14000;

            if (Session.CharacterInfo.MapId == 16)
            {
                limitX = 43000;
                limitY = 28000;
            }

            if (num < 50.0 || (nextInt1 > limitX || nextInt1 < -1000 || nextInt2 > limitY || nextInt2 < -1000))
                return -1;

            double TimeTaken = num * 1000.0 / (double)Session.CharacterInfo.ShipSpeed;
            return TimeTaken;
        }
#pragma warning restore IDE1006

        public static void MoveShip(Session Session, double TimeTaken)
        {
            if (!Session.CharacterInfo.IsMoving)
            {
                if (Session.CharacterInfo.PathFinding != null)
                {
                    try { Session.CharacterInfo.PathFinding.Dispose(); } catch { }
                    Session.CharacterInfo.PathFinding = null;
                }

                Session.CharacterInfo.LastMove.Restart();
                Session.CharacterInfo.PathFinding = new Timer(new TimerCallback(ShipMovement.PathFinding), (object)Session, 300, 300);
                Session.CharacterInfo.IsMoving = true;
            }

            ServerMessage movementMessage = MapShipMovementComposer.Compose(Session.CharacterId, Session.CharacterInfo.NewLocX, Session.CharacterInfo.NewLocY, TimeTaken);
            byte[] movementData = movementMessage.ToDeltas();
            foreach (int key in (IEnumerable<int>)Session.CharacterInfo.PlayerInRange.Keys)
            {
                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(key);
                if (sessionByCharacterId != null && sessionByCharacterId.CharacterInfo != null)
                    sessionByCharacterId.SendData(movementData);
            }
        }

        public static void MovementToSeeEveryone(Session Session, double TimeTaken)
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            ServerMessage movementMessage = MapShipMovementComposer.Compose(Session.CharacterId, Session.CharacterInfo.NewLocX, Session.CharacterInfo.NewLocY, TimeTaken);
            byte[] movementData = movementMessage.ToDeltas();
            foreach (MapActor key in instanceByMapId.GetUserActorSnapshot())
            {
                if (key.Type == MapActorType.UserCharacter && key.ReferenceId != Session.CharacterId)
                {
                    Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(key.ReferenceId);
                    if (sessionByCharacterId != null && sessionByCharacterId.CharacterInfo != null)
                    {
                        bool isSameMapGroupMember = ShipMovement.IsSameMapGroupMember(sessionByCharacterId, Session);
                        if (isSameMapGroupMember)
                        {
                            bool viewerAlreadyTracksMover = sessionByCharacterId.CharacterInfo.PlayerInRange.Contains(Session.CharacterId);
                            bool moverAlreadySentToViewer = Session.CharacterInfo.PlayerInRange.Contains(sessionByCharacterId.CharacterId);

                            if (!viewerAlreadyTracksMover)
                            {
                                sessionByCharacterId.CharacterInfo.PlayerInRange.Add(Session.CharacterId);
                                sessionByCharacterId.SendData(MapUserEnterComposer.Compose(Session.CharacterInfo, sessionByCharacterId));
                                Fight.SendLockIntentToObserver(sessionByCharacterId, Session, instanceByMapId);
                                sessionByCharacterId.SendData(movementData);
                            }
                            else if (!moverAlreadySentToViewer)
                            {
                                sessionByCharacterId.SendData(movementData);
                            }
                        }
                        else if (ShipMovement.CanSeeEveryone(sessionByCharacterId)
                            && !Session.CharacterInfo.PlayerInRange.Contains(sessionByCharacterId.CharacterId))
                        {
                            sessionByCharacterId.SendData(movementData);
                        }
                    }
                }
            }
        }

        private static bool CanSeeEveryone(Session session)
        {
            return (session.CharacterInfo.IsAdmin || session.CharacterInfo.MapId == 83 || _1v1.IsOnMap(session.CharacterInfo.MapId));
        }

        private static bool IsSameMapGroupMember(Session viewer, Session other)
        {
            if (viewer == null || other == null || viewer.CharacterInfo == null || other.CharacterInfo == null)
                return false;
            if (viewer.CharacterId == other.CharacterId)
                return false;
            if (viewer.CurrentMapId != other.CurrentMapId)
                return false;
            if (viewer.CharacterInfo.MapId != other.CharacterInfo.MapId)
                return false;

            if (GalaxyGateWaveService.IsGateMap(viewer.CharacterInfo.MapId))
                return false;

            try
            {
                if (viewer.CharacterInfo.Members != null && viewer.CharacterInfo.Members.Contains(other.CharacterId))
                    return true;
                if (other.CharacterInfo.Members != null && other.CharacterInfo.Members.Contains(viewer.CharacterId))
                    return true;
            }
            catch { }

            return false;
        }

        private static bool IsBetween(int point_x, int point_y, int box_x, int box_y, int box_w, int box_h)
        {
            return point_x >= box_x && point_x < box_x + box_w && point_y >= box_y && point_y < box_y + box_h;
        }

        public static void GetRadiationSafeBounds(int mapId, out int minX, out int maxX, out int minY, out int maxY)
        {
            minX = 0;
            minY = 0;
            maxX = 21000;
            maxY = 13000;

            if (mapId == 16 || mapId == 29)
            {
                maxX = 42000;
                maxY = 26200;
            }
        }

        public static bool IsInsideRadiationSafeArea(int mapId, int x, int y)
        {
            int minX;
            int maxX;
            int minY;
            int maxY;
            GetRadiationSafeBounds(mapId, out minX, out maxX, out minY, out maxY);
            return ShipMovement.IsBetween(x, y, minX, minY, maxX, maxY);
        }

        public static void UpdateMovement(object state)
        {
            Session session = state as Session;
            if (session == null || session.CharacterInfo == null)
                return;

            if (!TryEnterMovementUpdate(session))
                return;

            try
            {
                if (session.CharacterInfo.Destroy || session.CharacterInfo.Disconnected || session.StoppedPlayer || session.Stopped || !session.MapJoined || !session.MapAuthed || session.CurrentMapId <= 0 || MapManager.GetInstanceByMapId(session.CurrentMapId) == null)
                {
                    ShipMovement.StopMovementTracking(session);
                    return;
                }

                ShipMovement.CheckPlayerInRange(session);
                ShipMovement.CheckAliensInRange(session);
                ShipMovement.UpdateEnemyWarning(session);
            }
            catch (Exception ex)
            {
                LogTimerFailure("UpdateMovement", ex);
            }
            finally
            {
                ExitMovementUpdate(session);
            }
        }

        private static void UpdateEnemyWarning(object state)
        {
            ShipMovement.UpdateEnemyWarning(state, false);
        }

        private static void UpdateEnemyWarning(object state, bool force)
        {
            Session session = state as Session;
            if (session == null || session.CharacterInfo == null)
                return;

            if (!ShouldRefreshEnemyWarning(session.CharacterId, force))
                return;

            int mapId = session.CharacterInfo.MapId;
            int myFaction = session.CharacterInfo.FactionId;

            bool enabled =
                (myFaction == 1 && (mapId == 1 || mapId == 2 || mapId == 3)) ||
                (myFaction == 2 && (mapId == 5 || mapId == 6 || mapId == 7)) ||
                (myFaction == 3 && (mapId == 9 || mapId == 10 || mapId == 11));

            int level = 0;

            if (enabled)
            {
                MapInstance instance = MapManager.GetInstanceByMapId(session.CurrentMapId);
                if (instance != null)
                {
                    int enemies = 0;

                    foreach (MapActor actor in instance.GetUserActorSnapshot())
                    {
                        if (actor == null || actor.Type != MapActorType.UserCharacter || actor.ReferenceId == session.CharacterId)
                            continue;

                        Session other = SessionManager.GetSessionByCharacterId(actor.ReferenceId);
                        if (other == null || other.CharacterInfo == null)
                            continue;
                        if (other.CharacterInfo.Destroy || other.CharacterInfo.Disconnected)
                            continue;
                        if (other.CurrentMapId != session.CurrentMapId || other.CharacterInfo.MapId != session.CharacterInfo.MapId)
                            continue;
                        if (other.CharacterInfo.Invisible == 1)
                            continue;
                        if (other.CharacterInfo.IsInvisibleForAll && other.CharacterInfo.IsAdmin)
                            continue;

                        int otherFaction = other.CharacterInfo.FactionId;

                        if (myFaction != 0 && otherFaction != 0 && otherFaction != myFaction)
                        {
                            enemies++;
                            if (enemies >= 5)
                                break;
                        }
                    }

                    if (enemies < 0) enemies = 0;
                    if (enemies > 5) enemies = 5;
                    level = enemies;
                }
            }

            bool shouldSend = false;

            lock (EnemyWarningLock)
            {
                int last;
                if (!LastEnemyWarningLevel.TryGetValue(session.CharacterId, out last) || last != level)
                {
                    LastEnemyWarningLevel[session.CharacterId] = level;
                    shouldSend = true;
                }
            }

            if (shouldSend)
            {
                session.SendData(PacketComposer.Compose("w", level.ToString()));
            }
        }

        public static void RefreshEnemyWarning(Session session)
        {
            if (session == null)
                return;
            ShipMovement.UpdateEnemyWarning((object)session, true);
        }

        public static void RefreshEnemyWarningForMap(MapInstance instance)
        {
            if (instance == null)
                return;
            foreach (MapActor actor in instance.GetUserActorSnapshot())
            {
                if (actor == null || actor.Type != MapActorType.UserCharacter)
                    continue;
                Session session = SessionManager.GetSessionByCharacterId(actor.ReferenceId);
                if (session == null || session.CharacterInfo == null)
                    continue;
                ShipMovement.UpdateEnemyWarning((object)session, true);
            }
        }

        public static void CheckPlayerInRange(object state)
        {
            Session Session = (Session)state;
            if (Session == null || Session.CharacterInfo == null)
                return;
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CurrentMapId);
            if (instanceByMapId == null)
                return;

            ShipMovement.AdvanceMovingPlayerToCurrentPosition(Session);

            if (GalaxyGateWaveService.IsGateMap(Session.CharacterInfo.MapId))
            {
                CList<int> toRemove = new CList<int>();
                foreach (int pid in (System.Collections.Generic.IEnumerable<int>)Session.CharacterInfo.PlayerInRange.Keys)
                    toRemove.Add(pid);

                foreach (int pid in (System.Collections.Generic.IEnumerable<int>)toRemove.Keys)
                {
                    Session.CharacterInfo.PlayerInRange.Remove(pid);
                    Session.SendData(MapUserLeaveComposer.Compose(pid));
                }
                return;
            }
            CList<int> clist = new CList<int>();
            foreach (MapActor key in instanceByMapId.GetUserActorSnapshot())
            {
                if (key.Type == MapActorType.UserCharacter && key.ReferenceId != Session.CharacterId)
                {
                    Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(key.ReferenceId);
                    if (sessionByCharacterId != null && sessionByCharacterId.CharacterInfo != null)
                    {
                        ShipMovement.AdvanceMovingPlayerToCurrentPosition(sessionByCharacterId);

                        long dx = (long)sessionByCharacterId.CharacterInfo.LocX - Session.CharacterInfo.LocX;
                        long dy = (long)sessionByCharacterId.CharacterInfo.LocY - Session.CharacterInfo.LocY;
                        bool isSameMapGroupMember = ShipMovement.IsSameMapGroupMember(Session, sessionByCharacterId);
                        if (ShipMovement.CanSeeEveryone(Session) || isSameMapGroupMember || (dx * dx + dy * dy) < 4000000L)
                        {
                            if (!Session.CharacterInfo.PlayerInRange.Contains(sessionByCharacterId.CharacterId))
                            {
                                Session.CharacterInfo.PlayerInRange.Add(sessionByCharacterId.CharacterId);
                                Session.SendData(MapUserEnterComposer.Compose(sessionByCharacterId.CharacterInfo, Session));
                                double moveDx = (double)(sessionByCharacterId.CharacterInfo.LocX - sessionByCharacterId.CharacterInfo.NewLocX);
                                double moveDy = (double)(sessionByCharacterId.CharacterInfo.LocY - sessionByCharacterId.CharacterInfo.NewLocY);
                                double TimeTaken = Math.Sqrt(moveDx * moveDx + moveDy * moveDy) * 1000.0 / (double)sessionByCharacterId.CharacterInfo.ShipSpeed;
                                Session.SendData(MapShipMovementComposer.Compose(sessionByCharacterId.CharacterId, sessionByCharacterId.CharacterInfo.NewLocX, sessionByCharacterId.CharacterInfo.NewLocY, TimeTaken));
                                Fight.SendLockIntentToObserver(Session, sessionByCharacterId, instanceByMapId);
                            }
                        }
                        else if (Session.CharacterInfo.PlayerInRange.Contains(sessionByCharacterId.CharacterId))
                        {
                            if (Session.CharacterInfo.SelectedPlayer != sessionByCharacterId.CharacterId)
                            {
                                clist.Add(sessionByCharacterId.CharacterId);
                            }
                        }
                    }
                }
            }
            foreach (int key in (IEnumerable<int>)Session.CharacterInfo.PlayerInRange.Keys)
            {
                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(key);
                if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo == null)
                    clist.Add(key);
                else if (Session.CurrentMapId != sessionByCharacterId.CurrentMapId)
                    clist.Add(key);
            }
            foreach (int key in (IEnumerable<int>)clist.Keys)
            {
                Session.CharacterInfo.PlayerInRange.Remove(key);
                Session.SendData(MapUserLeaveComposer.Compose(key));
            }
        }

        public static void CheckAliensInRange(object state)
        {
            Session session = (Session)state;
            if (session == null || session.CharacterInfo == null)
                return;
            if (session.CharacterInfo.IsAdmin && session.CharacterInfo.DisableNpc)
                return;
            if (!session.MapJoined || !session.MapAuthed || session.CurrentMapId <= 0)
                return;

            int activeMapId = session.CurrentMapId;
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(activeMapId);
            if (instanceByMapId == null)
                return;

            bool isGateMap = GalaxyGateWaveService.IsGateMap(activeMapId);
            double maxRange = isGateMap ? 30000.0 : 2000.0;
            double rangeSquared = maxRange * maxRange;
            CList<int> clist = new CList<int>();
            Dictionary<int, Npc> npcById = new Dictionary<int, Npc>();

            IEnumerable<MapActor> npcActors;
            if (isGateMap)
            {
                List<int> gateNpcIds = GalaxyGateWaveService.GetAliveNpcIdsForOwner(session.CharacterId, activeMapId);
                List<MapActor> gateNpcActors = new List<MapActor>(gateNpcIds.Count);

                foreach (int npcId in gateNpcIds)
                {
                    MapActor actor = instanceByMapId.GetActorByReferenceId(npcId, MapActorType.AiBot);
                    if (actor != null)
                        gateNpcActors.Add(actor);
                }

                npcActors = gateNpcActors;
            }
            else
            {
                npcActors = instanceByMapId.GetNpcActorSnapshot();
            }

            foreach (MapActor key in npcActors)
            {
                if (key == null)
                    continue;

                Npc referenceObject = key.ReferenceObject as Npc;
                if (referenceObject == null)
                    continue;

                referenceObject.AdvanceMovementToCurrentPosition();

                npcById[referenceObject.Id] = referenceObject;

                if (isGateMap && !GalaxyGateWaveService.IsNpcOwnedBy(referenceObject.Id, session.CharacterId))
                {
                    if (session.CharacterInfo.NpcInRange.Contains(referenceObject.Id))
                        clist.Add(referenceObject.Id);
                    continue;
                }

                long dx = (long)referenceObject.LocX - session.CharacterInfo.LocX;
                long dy = (long)referenceObject.LocY - session.CharacterInfo.LocY;
                if (((double)(dx * dx + dy * dy) < rangeSquared || referenceObject.IsBoss == 1 || referenceObject.Name == "Spaceball") && activeMapId == referenceObject.MapId)
                {
                    if (!session.CharacterInfo.NpcInRange.Contains(referenceObject.Id) && !referenceObject.IsDestroying)
                    {
                        session.CharacterInfo.NpcInRange.Add(referenceObject.Id);
                        session.SendData(PacketComposer.Compose("C", referenceObject.Id.ToString() + "|" + (object)referenceObject.ShipId + "|0|" + referenceObject.ClanTag + "|" + referenceObject.Name + "|" + (object)referenceObject.LocX + "|" + (object)referenceObject.LocY + "|" + (object)referenceObject.FactionId + "|" + (object)referenceObject.IsClanMember + "|" + (object)referenceObject.Rank + "|" + (object)referenceObject.IsBoss + "|" + (object)referenceObject.IsClanMember + "|" + (object)referenceObject.GalaxyGatesRings));
                        ServerMessage Message = MapUserMovementListComposer.ComposeIA(new CList<MapActor>() { key });
                        session.SendData(Message);
                        if (referenceObject.Drones == 1)
                        {
                            session.SendData(PacketComposer.Compose(
                                "n",
                                "d|" + referenceObject.Id + "|3/2-15-15-15-15/4-15-15-15-15-15-15-15-15/2-15-15-15-15"
                            ));
                        }
                        else if (referenceObject.Drones == 2)
                        {
                            session.SendData(PacketComposer.Compose(
                                "n",
                                "d|" + referenceObject.Id + "|3/2-25-25-25-25/4-25-25-25-25-25-25-25-25/2-25-25-25-25"
                            ));
                        }
                    }
                }
                else if (session.CharacterInfo.NpcInRange.Contains(referenceObject.Id))
                {
                    if (session.CharacterInfo.SelectedPlayer != referenceObject.Id)
                    {
                        clist.Add(referenceObject.Id);
                    }
                }
            }

            foreach (int key in (IEnumerable<int>)session.CharacterInfo.NpcInRange.Keys)
            {
                Npc referenceObject;
                if (!npcById.TryGetValue(key, out referenceObject) || referenceObject == null)
                    clist.Add(key);
                else if (isGateMap && !GalaxyGateWaveService.IsNpcOwnedBy(key, session.CharacterId))
                    clist.Add(key);
                else if (activeMapId != referenceObject.MapId)
                    clist.Add(key);
            }
            foreach (int key in (IEnumerable<int>)clist.Keys)
            {
                session.CharacterInfo.NpcInRange.Remove(key);
                session.SendData(PacketComposer.Compose("R", key.ToString()));
            }
        }


        public static void CheckWarningZone(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            bool insideSafe = ShipMovement.IsInsideRadiationSafeArea(Session.CharacterInfo.MapId, Session.CharacterInfo.LocX, Session.CharacterInfo.LocY);

            if (!insideSafe && Session.CharacterInfo.WarningZoneTimer == null)
            {
                Session.CharacterInfo.WarningZone = true;
                ResetRadiationTicks(Session.CharacterId);

                if (Session.Authenticated)
                    ShipMovement.SendPeacePortalInfos(Session);

                if (Session.CharacterInfo.WarningZoneTimer != null)
                {
                    Session.CharacterInfo.WarningZoneTimer.Dispose();
                    --TimerManager.TimerRunning;
                    Session.CharacterInfo.WarningZoneTimer = (Timer)null;
                }

                Session.CharacterInfo.WarningZoneTimer = new Timer(new TimerCallback(ShipMovement.WarningZone), (object)Session, 1000, 1000);
                ++TimerManager.TimerRunning;
            }
            else if (insideSafe && Session.CharacterInfo.WarningZoneTimer != null)
            {
                Session.CharacterInfo.WarningZone = false;
                ClearRadiationTicks(Session.CharacterId);

                if (Session.Authenticated)
                    ShipMovement.SendPeacePortalInfos(Session);

                if (Session.CharacterInfo.WarningZoneTimer != null)
                {
                    Session.CharacterInfo.WarningZoneTimer.Dispose();
                    --TimerManager.TimerRunning;
                    Session.CharacterInfo.WarningZoneTimer = (Timer)null;
                }
            }
        }


        private static bool ShouldSendPeacePortalInfos(int characterId, string payload, bool force)
        {
            if (characterId <= 0 || string.IsNullOrEmpty(payload))
                return true;

            lock (PeacePortalInfoLock)
            {
                string lastPayload;
                if (!force && LastPeacePortalInfoPayload.TryGetValue(characterId, out lastPayload) && lastPayload == payload)
                    return false;

                LastPeacePortalInfoPayload[characterId] = payload;
                return true;
            }
        }

        public static void SendPeacePortalInfos(Session Session, bool force = false)
        {
            int peace = Session.CharacterInfo.PeaceZone ? 1 : 0;
            int trade = Session.CharacterInfo.TradeZone ? 1 : 0;
            int portal = Session.CharacterInfo.PortalZone ? 1 : 0;
            int radiation = Session.CharacterInfo.WarningZone ? 1 : 0;
            string payload = Session.CharacterInfo.LocX + "|" + Session.CharacterInfo.LocY + "|" +
                peace + "|" + trade + "|1|" + radiation + "|" + portal + "|0";

            if (!ShouldSendPeacePortalInfos(Session.CharacterId, payload, force))
                return;

            Session.SendData(PacketComposer.Compose("D", payload));
        }

        public static void RefreshZones(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            ShipMovement.CheckWarningZone(Session);
            ShipMovement.CheckPortalZone(Session, true);
        }

        private static bool IsPortalPeaceMap(int factionId, int mapId)
        {
            if (factionId == 1)
                return mapId == 1 || mapId == 2 || mapId == 3 || mapId == 4 ||
                       mapId == 17 || mapId == 18 || mapId == 19 || mapId == 20;

            if (factionId == 2)
                return mapId == 5 || mapId == 6 || mapId == 7 || mapId == 8 ||
                       mapId == 21 || mapId == 22 || mapId == 23 || mapId == 24;

            if (factionId == 3)
                return mapId == 9 || mapId == 10 || mapId == 11 || mapId == 12 ||
                       mapId == 25 || mapId == 26 || mapId == 27 || mapId == 28;

            return false;
        }

        private static void ComputePeaceZone(Session Session)
        {
            int factionId = Session.CharacterInfo.FactionId;
            int mapId = Session.CharacterInfo.MapId;

            Session.CharacterInfo.TradeZone = false;

            if (Session.CharacterInfo.Attacking)
            {
                Session.CharacterInfo.PeaceZone = false;
                Session.CharacterInfo.TradeZone = false;
                return;
            }

            if (mapId == 1)
            {
                if (factionId == 1 && ShipMovement.IsBetween(Session.CharacterInfo.LocX, Session.CharacterInfo.LocY, 1000, 600, 1600, 1600))
                {
                    Session.CharacterInfo.PeaceZone = true;
                    Session.CharacterInfo.TradeZone = true;
                    return;
                }
            }
            else if (mapId == 5)
            {
                if (factionId == 2 && ShipMovement.IsBetween(Session.CharacterInfo.LocX, Session.CharacterInfo.LocY, 18000, 600, 1600, 1600))
                {
                    Session.CharacterInfo.PeaceZone = true;
                    Session.CharacterInfo.TradeZone = true;
                    return;
                }
            }
            else if (mapId == 9)
            {
                if (factionId == 3 && ShipMovement.IsBetween(Session.CharacterInfo.LocX, Session.CharacterInfo.LocY, 18300, 10700, 1600, 1600))
                {
                    Session.CharacterInfo.PeaceZone = true;
                    Session.CharacterInfo.TradeZone = true;
                    return;
                }
            }

            else if (mapId == 20)
            {
                if (factionId == 1 && ShipMovement.IsBetween(Session.CharacterInfo.LocX, Session.CharacterInfo.LocY, 1000, 600, 1600, 1600))
                {
                    Session.CharacterInfo.PeaceZone = true;
                    Session.CharacterInfo.TradeZone = true;
                    return;
                }
            }
            else if (mapId == 24)
            {
                if (factionId == 2 && ShipMovement.IsBetween(Session.CharacterInfo.LocX, Session.CharacterInfo.LocY, 18000, 600, 1600, 1600))
                {
                    Session.CharacterInfo.PeaceZone = true;
                    Session.CharacterInfo.TradeZone = true;
                    return;
                }
            }
            else if (mapId == 28)
            {
                if (factionId == 3 && ShipMovement.IsBetween(Session.CharacterInfo.LocX, Session.CharacterInfo.LocY, 18300, 10700, 1600, 1600))
                {
                    Session.CharacterInfo.PeaceZone = true;
                    Session.CharacterInfo.TradeZone = true;
                    return;
                }
            }

            bool combatLocked = (Session.CharacterInfo.NoFightTimer < 10);

            if (!combatLocked && IsPortalPeaceMap(factionId, mapId))
            {
                CList<PortalInfo> portalForMap = PortalManager.GetPortalForMap(mapId);
                if (portalForMap != null)
                {
                    foreach (PortalInfo key in (IEnumerable<PortalInfo>)portalForMap.Keys)
                    {
                        if (key.MapId != mapId)
                            continue;

                        if (ShipMovement.IsBetween(Session.CharacterInfo.LocX, Session.CharacterInfo.LocY, key.PosX - 500, key.PosY - 500, 1000, 1000))
                        {
                            Session.CharacterInfo.PeaceZone = true;
                            Session.CharacterInfo.TradeZone = false;
                            return;
                        }
                    }
                }
            }

            Session.CharacterInfo.PeaceZone = false;
            Session.CharacterInfo.TradeZone = false;
        }


        public static void CheckPeaceZone(Session Session, bool force = false)
        {
            ComputePeaceZone(Session);
            ShipMovement.SendPeacePortalInfos(Session, force);
        }

        public static void CheckPortalZone(Session Session, bool force = false)
        {
            if (Session.CharacterInfo.IsJumping)
                return;

            CList<PortalInfo> portalForMap = PortalManager.GetPortalForMap(Session.CharacterInfo.MapId);
            Session.CharacterInfo.CurrentPortal = 0;
            Session.CharacterInfo.PortalZone = false;

            if (portalForMap != null)
            {
                foreach (PortalInfo key in (IEnumerable<PortalInfo>)portalForMap.Keys)
                {
                    if (key.MapId == Session.CharacterInfo.MapId &&
                        ShipMovement.IsBetween(Session.CharacterInfo.LocX, Session.CharacterInfo.LocY, key.PosX - 500, key.PosY - 500, 1000, 1000))
                    {
                        Session.CharacterInfo.CurrentPortal = key.Id;
                        Session.CharacterInfo.PortalZone = true;
                    }
                }
            }
            if (Session.CharacterInfo.GalaxyGatePortals != null)
            {
                foreach (PortalInfo key in (System.Collections.Generic.IEnumerable<PortalInfo>)Session.CharacterInfo.GalaxyGatePortals.Keys)
                {
                    if (key.MapId == Session.CharacterInfo.MapId &&
                        ShipMovement.IsBetween(Session.CharacterInfo.LocX, Session.CharacterInfo.LocY, key.PosX - 500, key.PosY - 500, 1000, 1000))
                    {
                        Session.CharacterInfo.CurrentPortal = key.Id;
                        Session.CharacterInfo.PortalZone = true;
                    }
                }
            }
            if (Session.CharacterInfo.GalaxyGateInternalPortals != null)
            {
                foreach (PortalInfo key in (System.Collections.Generic.IEnumerable<PortalInfo>)Session.CharacterInfo.GalaxyGateInternalPortals.Keys)
                {
                    if (key.MapId == Session.CharacterInfo.MapId &&
                        ShipMovement.IsBetween(Session.CharacterInfo.LocX, Session.CharacterInfo.LocY, key.PosX - 500, key.PosY - 500, 1000, 1000))
                    {
                        Session.CharacterInfo.CurrentPortal = key.Id;
                        Session.CharacterInfo.PortalZone = true;
                    }
                }
            }

            ComputePeaceZone(Session);

            ShipMovement.SendPeacePortalInfos(Session, force);
        }

        private static void WarningZone(object state)
        {
            try
            {
                Session session = (Session)state;

                if (session == null || session.CharacterInfo == null)
                    return;

                if (!session.CharacterInfo.WarningZone)
                {
                    ClearRadiationTicks(session.CharacterId);

                    Timer t = session.CharacterInfo.WarningZoneTimer;
                    if (t != null)
                    {
                        session.CharacterInfo.WarningZoneTimer = null;
                        t.Dispose();
                        --TimerManager.TimerRunning;
                    }
                    return;
                }

                if (session.StoppedPlayer || session.CharacterInfo.Destroy || session.CharacterInfo.Disconnected || session.CharacterInfo.ShipHp <= 0)
                {
                    ClearRadiationTicks(session.CharacterId);

                    Timer t = session.CharacterInfo.WarningZoneTimer;
                    if (t != null)
                    {
                        session.CharacterInfo.WarningZoneTimer = null;
                        t.Dispose();
                        --TimerManager.TimerRunning;
                    }
                    return;
                }



                if (session.CharacterInfo.ActiveISH)
                {
                    NextRadiationTick(session.CharacterId);
                    return;
                }
                int tick = NextRadiationTick(session.CharacterId);
                double percent = Math.Min(0.05, 0.01 * tick);

                int maxHp = session.CharacterInfo.ShipMaxHp > 0 ? session.CharacterInfo.ShipMaxHp : session.CharacterInfo.ShipHp;
                if (maxHp <= 0)
                    maxHp = 1;

                int totalDamage = (int)Math.Round(maxHp * percent);
                if (totalDamage < 1)
                    totalDamage = 1;

                session.CharacterInfo.ShipHp -= totalDamage;
                if (session.CharacterInfo.ShipHp < 0)
                    session.CharacterInfo.ShipHp = 0;

                var dmgMsg = PacketComposer.Compose(
                    "Y",
                    "0|" + session.CharacterId + "|RAD|" + session.CharacterInfo.ShipHp + "|" + session.CharacterInfo.ShipShield + "|" + totalDamage
                );

                session.SendData(dmgMsg);

                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(session.CurrentMapId);
                if (instanceByMapId != null)
                {
                    foreach (MapActor key in instanceByMapId.GetUserActorSnapshot())
                    {
                        if (key.Type == MapActorType.UserCharacter)
                        {
                            Session s = SessionManager.GetSessionById(key.ReferenceSessionId);
                            if (s != null
                                && s.CharacterInfo != null
                                && s.CharacterInfo.SelectedPlayer == session.CharacterId)
                            {
                                s.SendData(dmgMsg);
                            }
                        }
                    }
                }

                if (session.CharacterInfo.ShipHp <= 0 && !session.CharacterInfo.Destroy)
                {
                    if (session.CharacterInfo.LaserAttackTimer != null)
                        session.CharacterInfo.LaserAttackTimer.Dispose();

                    session.CharacterInfo.SendReward(session);
                    Fight.KillPlayer(session);

                    ClearRadiationTicks(session.CharacterId);

                    Timer t = session.CharacterInfo.WarningZoneTimer;
                    if (t != null)
                    {
                        session.CharacterInfo.WarningZoneTimer = null;
                        t.Dispose();
                        --TimerManager.TimerRunning;
                    }
                }

            }
            catch (Exception ex)
            {
                LogTimerFailure("WarningZone", ex);
            }
        }


        private static void ShowStatus(object state)
        {
            Session session = (Session)state;
            session.CharacterInfo.IsMoving = false;
            if ((session.StoppedPlayer || session.CharacterInfo.Destroy || session.CharacterInfo.Disconnected) && session.CharacterInfo.PathTime != null)
            {
                session.CharacterInfo.PathTime.Dispose();
                --TimerManager.TimerRunning;
                session.CharacterInfo.PathTime = (Timer)null;
            }
            if (session.CharacterInfo.PathTime == null)
                return;
            session.CharacterInfo.PathTime.Dispose();
            --TimerManager.TimerRunning;
            session.CharacterInfo.PathTime = (Timer)null;
        }

#pragma warning disable IDE1006
        public static Vector calculatePosition(Vector start_pos, Vector end_pos, double time, double speed)
        {
            Vector vector = Vector.Subtract(end_pos, start_pos);
            if (vector.Length < 10.0)
                return end_pos;
            vector.Normalize();
            Vector vector2 = vector * time * speed;
            return Vector.Add(start_pos, vector2);
        }
#pragma warning restore IDE1006
    }
}
