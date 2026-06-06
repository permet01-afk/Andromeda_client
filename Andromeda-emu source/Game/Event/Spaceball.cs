using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Maps.Collectables;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Titles;
using OrbitReborn_Emulator.Util;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Event
{
    public static class Spaceball
    {
        private const int SpaceballMapId = 16;
        private const int SpaceballShipId = 442;

        private const int CenterX = 21000;
        private const int CenterY = 14333;

        private const int MmoGoalX = 4000;
        private const int MmoGoalY = 13000;
        private const int EicGoalX = 38000;
        private const int EicGoalY = 4000;
        private const int VruGoalX = 38000;
        private const int VruGoalY = 22000;

        private const int MmoGoalPortalId = 46;
        private const int EicGoalPortalId = 48;
        private const int VruGoalPortalId = 50;

        private const int GoalReachedRadius = 400;
        private const int WinScore = 10;
        private const int SpeedMultiplierOnHit = 2;
        private const int MaxLootBoxesPerGoal = 20;
        private const int EventDurationMinutes = 60;
        private const int FinalRewardUridium = 30000;
        private const int FinalRewardBoosterHours = 3;
        private const int FinalRewardUcb100 = 7000;
        private const int FinalRewardRsb75 = 4000;
        private const string ScheduleTimeZoneIana = "Europe/Zurich";
        private const string ScheduleTimeZoneWindows = "W. Europe Standard Time";

        private static Npc mNpc;
        private static bool mActive;
        private static bool mFinalRewardGranted;
        private static int mMMOScore;
        private static int mEICScore;
        private static int mVRUScore;
        private static int mMoveToFirm;
        private static int mBallSpeed;
        private static int mLastMoveToFirm;
        private static int mLastBallSpeed;
        private static int mDamageMMO;
        private static int mDamageEIC;
        private static int mDamageVRU;
        private static long mTotalDamageMMO;
        private static long mTotalDamageEIC;
        private static long mTotalDamageVRU;
        private static Timer mPerformUpdate;
        private static Timer mScheduleTimer;
        private static Timer mStopTimer;
        private static TimeZoneInfo mScheduleTimeZone;
        private static readonly object mRewardSyncRoot = new object();
        private static readonly object mStateSyncRoot = new object();

        public static void Initialize()
        {
            Spaceball.mNpc = NpcManager.CreateNewInstance("Spaceball", SpaceballMapId, CenterX, CenterY, SpaceballShipId, 1000, 1000, 1000, 1000, 40, 0, 0, 0, 0, 0, "", 1, 0, 0, 0, 0, 0);
            Spaceball.mActive = false;
            Spaceball.mMMOScore = 0;
            Spaceball.mEICScore = 0;
            Spaceball.mVRUScore = 0;
            Spaceball.mFinalRewardGranted = false;
            Spaceball.mMoveToFirm = 0;
            Spaceball.mBallSpeed = 0;
            Spaceball.mLastMoveToFirm = 0;
            Spaceball.mLastBallSpeed = 0;
            Spaceball.mDamageMMO = 0;
            Spaceball.mDamageEIC = 0;
            Spaceball.mDamageVRU = 0;
            Spaceball.mTotalDamageMMO = 0L;
            Spaceball.mTotalDamageEIC = 0L;
            Spaceball.mTotalDamageVRU = 0L;
            Spaceball.mPerformUpdate = (Timer)null;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ExecuteNonQuery("UPDATE event_information SET isActif=0 WHERE id = 3");
            }
            Spaceball.mScheduleTimeZone = Spaceball.ResolveScheduleTimeZone();
            Spaceball.ScheduleNextAutomaticStart();
        }

        public static bool IsSpaceballRuntimeMap(int mapId)
        {
            lock (Spaceball.mStateSyncRoot)
                return Spaceball.mActive && mapId == SpaceballMapId;
        }

        public static void ShowHud(Session Session)
        {
            if (!Spaceball.mActive)
                return;
            if (!Spaceball.EnsureActiveSpaceballState())
                return;
            Session.SendData(PacketComposer.Compose("n", "ssi|" + (object)Spaceball.mMMOScore + "|" + (object)Spaceball.mEICScore + "|" + (object)Spaceball.mVRUScore + "|" + (object)Spaceball.mBallSpeed + "|" + (object)Spaceball.mMoveToFirm));
        }

        public static void SendHud()
        {
            if (!Spaceball.EnsureActiveSpaceballState())
                return;
            SessionManager.BroadcastToUser(PacketComposer.Compose("n", "ssi|" + (object)Spaceball.mMMOScore + "|" + (object)Spaceball.mEICScore + "|" + (object)Spaceball.mVRUScore + "|" + (object)Spaceball.mBallSpeed + "|" + (object)Spaceball.mMoveToFirm));
        }

        public static void UpdateHudScore(int FactionId)
        {
            if (!Spaceball.EnsureActiveSpaceballState())
                return;
            int portalId = 0;
            int score = 0;
            if (FactionId == 1)
            {
                score = Spaceball.mMMOScore;
                portalId = MmoGoalPortalId;
            }
            else if (FactionId == 2)
            {
                score = Spaceball.mEICScore;
                portalId = EicGoalPortalId;
            }
            else if (FactionId == 3)
            {
                score = Spaceball.mVRUScore;
                portalId = VruGoalPortalId;
            }
            else
                return;
            SessionManager.BroadcastToUser(PacketComposer.Compose("n", "ssc|" + (object)FactionId + "|" + (object)score + "|" + (object)portalId));
        }

        public static void UpdateHudSpeed(int FactionId)
        {
            if (!Spaceball.EnsureActiveSpaceballState())
                return;
            if (FactionId == 1)
                SessionManager.BroadcastToUser(PacketComposer.Compose("n", "sss|" + (object)FactionId + "|" + (object)Spaceball.mBallSpeed));
            if (FactionId == 2)
                SessionManager.BroadcastToUser(PacketComposer.Compose("n", "sss|" + (object)FactionId + "|" + (object)Spaceball.mBallSpeed));
            if (FactionId == 3)
                SessionManager.BroadcastToUser(PacketComposer.Compose("n", "sss|" + (object)FactionId + "|" + (object)Spaceball.mBallSpeed));
            if (FactionId != 0)
                return;
            SessionManager.BroadcastToUser(PacketComposer.Compose("n", "sss|0|" + (object)Spaceball.mBallSpeed));
        }

        private static TimeZoneInfo ResolveScheduleTimeZone()
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(ScheduleTimeZoneIana);
            }
            catch
            {
            }
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(ScheduleTimeZoneWindows);
            }
            catch
            {
            }
            return TimeZoneInfo.Local;
        }

        private static DateTime GetScheduleNow()
        {
            TimeZoneInfo timeZone = Spaceball.mScheduleTimeZone ?? TimeZoneInfo.Local;
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
        }

        private static DateTime GetNextScheduledStart(DateTime now)
        {
            DateTime nextWednesday = Spaceball.GetNextWeeklySlot(now, DayOfWeek.Wednesday, 19, 0);
            DateTime nextSunday = Spaceball.GetNextWeeklySlot(now, DayOfWeek.Sunday, 17, 0);
            return nextWednesday <= nextSunday ? nextWednesday : nextSunday;
        }

        private static DateTime GetNextWeeklySlot(DateTime now, DayOfWeek day, int hour, int minute)
        {
            int daysUntil = ((int)day - (int)now.DayOfWeek + 7) % 7;
            DateTime slot = now.Date.AddDays(daysUntil).AddHours(hour).AddMinutes(minute);
            if (slot <= now)
                slot = slot.AddDays(7);
            return slot;
        }

        private static void ScheduleNextAutomaticStart()
        {
            DateTime now = Spaceball.GetScheduleNow();
            DateTime nextStart = Spaceball.GetNextScheduledStart(now);
            TimeSpan delay = nextStart - now;
            if (delay < TimeSpan.FromSeconds(1.0))
                delay = TimeSpan.FromSeconds(1.0);
            if (Spaceball.mScheduleTimer != null)
                Spaceball.mScheduleTimer.Dispose();
            Spaceball.mScheduleTimer = new Timer(new TimerCallback(Spaceball.CbAutomaticStartSpaceball), (object)null, Convert.ToInt64(delay.TotalMilliseconds), Timeout.Infinite);
        }

        private static void CbAutomaticStartSpaceball(object state)
        {
            if (!Spaceball.mActive)
                Spaceball.StartSpaceball();
            else
                Spaceball.ScheduleNextAutomaticStart();
        }

        private static void ScheduleEventStop()
        {
            if (Spaceball.mStopTimer != null)
                Spaceball.mStopTimer.Dispose();
            Spaceball.mStopTimer = new Timer(new TimerCallback(Spaceball.CbStopSpaceball), (object)null, Convert.ToInt64(TimeSpan.FromMinutes(EventDurationMinutes).TotalMilliseconds), Timeout.Infinite);
        }

        private static void BroadcastSpaceballLog(string message)
        {
            if (string.IsNullOrEmpty(message))
                return;
            SessionManager.BroadcastToUser(PacketComposer.Compose("A", "STD|" + message));
        }

        private static MapInstance GetSpaceballMapInstance()
        {
            MapInfo mapInfo = (MapInfo)null;
            try
            {
                mapInfo = MapInfoLoader.GetMapInfo(SpaceballMapId);
            }
            catch (Exception ex)
            {
                Output.WriteLine((object)("[Spaceball] Unable to load Spaceball map info: " + ex.ToString()), OutputLevel.Warning);
                return (MapInstance)null;
            }
            if (mapInfo == null)
            {
                Output.WriteLine((object)"[Spaceball] Unable to load Spaceball map info.", OutputLevel.Warning);
                return (MapInstance)null;
            }

            try
            {
                if (!MapManager.InstanceIsLoadedForMap(mapInfo.Id))
                    MapManager.TryLoadMapInstance(mapInfo.Id);
            }
            catch (Exception ex)
            {
                Output.WriteLine((object)("[Spaceball] Unable to load map 4-4 instance: " + ex.ToString()), OutputLevel.Warning);
                return (MapInstance)null;
            }

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(SpaceballMapId);
            if (instanceByMapId == null)
                Output.WriteLine((object)"[Spaceball] Unable to load map 4-4 instance.", OutputLevel.Warning);
            return instanceByMapId;
        }

        private static bool EnsureSpaceballActor(MapInstance instanceByMapId, bool forceFresh)
        {
            if (instanceByMapId == null || Spaceball.mNpc == null)
                return false;

            MapActor actorByReferenceId = instanceByMapId.GetActorByReferenceId(Spaceball.mNpc.Id, MapActorType.AiBot);
            if (actorByReferenceId != null)
            {
                if (!forceFresh)
                    return true;
                instanceByMapId.KickNpc(actorByReferenceId.Id);
            }

            if (!instanceByMapId.AddNpcToMap(Spaceball.mNpc))
            {
                Output.WriteLine((object)"[Spaceball] Failed to add Spaceball object to map 4-4.", OutputLevel.Warning);
                return false;
            }

            if (instanceByMapId.GetActorByReferenceId(Spaceball.mNpc.Id, MapActorType.AiBot) != null)
                return true;

            Output.WriteLine((object)"[Spaceball] Spaceball object was added but could not be verified on map 4-4.", OutputLevel.Warning);
            return false;
        }

        private static void SetEventInformationActive(bool active)
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ExecuteNonQuery("UPDATE event_information SET isActif=" + (active ? "1" : "0") + " WHERE id = 3");
            }
        }

        private static void DisposeRuntimeTimers()
        {
            if (Spaceball.mPerformUpdate != null)
                Spaceball.mPerformUpdate.Dispose();
            Spaceball.mPerformUpdate = (Timer)null;
            if (Spaceball.mStopTimer != null)
                Spaceball.mStopTimer.Dispose();
            Spaceball.mStopTimer = (Timer)null;
        }

        private static void AbortBrokenActiveState(string reason)
        {
            Output.WriteLine((object)("[Spaceball] " + reason), OutputLevel.Warning);
            Spaceball.DisposeRuntimeTimers();
            bool wasActive = Spaceball.mActive;
            Spaceball.mActive = false;
            Spaceball.SetEventInformationActive(false);
            if (wasActive)
                SessionManager.BroadcastToUser(PacketComposer.Compose("n", "sse"));
            Spaceball.ScheduleNextAutomaticStart();
        }

        private static bool EnsureActiveSpaceballState()
        {
            lock (Spaceball.mStateSyncRoot)
            {
                if (!Spaceball.mActive)
                    return false;

                MapInstance instanceByMapId = Spaceball.GetSpaceballMapInstance();
                if (!Spaceball.EnsureSpaceballActor(instanceByMapId, false))
                {
                    Spaceball.AbortBrokenActiveState("Active event had no Spaceball object and could not be repaired.");
                    return false;
                }

                if (Spaceball.mPerformUpdate == null)
                    Spaceball.mPerformUpdate = new Timer(new TimerCallback(Spaceball.CbPerformUpdate), (object)Spaceball.mNpc, 0, 2000);
                if (Spaceball.mStopTimer == null)
                    Spaceball.ScheduleEventStop();
                return true;
            }
        }

        private static string GetCompanyName(int factionId)
        {
            if (factionId == 1)
                return "MMO";
            if (factionId == 2)
                return "EIC";
            if (factionId == 3)
                return "VRU";
            return "Unknown";
        }

        private static string GetFinalRewardMessage()
        {
            return "Spaceball victory reward: +30000 Uridium, +3h DMG/HP/SHD boosters, +7000 UCB-100, +4000 RSB-75.";
        }

        private static string GetExcludedOnlineUserClause(List<int> onlineCharacterIds)
        {
            if (onlineCharacterIds == null || onlineCharacterIds.Count == 0)
                return string.Empty;
            List<string> ids = new List<string>();
            foreach (int id in onlineCharacterIds)
            {
                if (id > 0)
                    ids.Add(id.ToString());
            }
            if (ids.Count == 0)
                return string.Empty;
            return " AND id NOT IN (" + string.Join(",", ids.ToArray()) + ")";
        }

        private static List<Session> GetConnectedFactionSessions(int factionId, List<int> onlineCharacterIds)
        {
            List<Session> result = new List<Session>();
            HashSet<int> seen = new HashSet<int>();
            CList<Session> sessionsUser = SessionManager.SessionsUser;
            foreach (Session session in (IEnumerable<Session>)sessionsUser)
            {
                if (session == null || session.CharacterInfo == null)
                    continue;
                int characterId = session.CharacterInfo.Id;
                if (characterId <= 0 || seen.Contains(characterId))
                    continue;
                if (session.CharacterInfo.FactionId != factionId)
                    continue;
                seen.Add(characterId);
                result.Add(session);
                if (onlineCharacterIds != null)
                    onlineCharacterIds.Add(characterId);
            }
            return result;
        }

        private static void GrantOfflineWinningFactionReward(SqlDatabaseClient client, int factionId, List<int> onlineCharacterIds, string message)
        {
            int now = Convert.ToInt32(Math.Floor(UnixTimestamp.GetCurrent()));
            int boosterSeconds = FinalRewardBoosterHours * 3600;
            string excludeOnline = Spaceball.GetExcludedOnlineUserClause(onlineCharacterIds);
            client.ClearParameters();
            client.SetParameter("factionId", (object)factionId);
            client.SetParameter("now", (object)now);
            client.SetParameter("boosterSeconds", (object)boosterSeconds);
            client.ExecuteNonQuery(
                "UPDATE users SET " +
                "uridium = uridium + " + (object)FinalRewardUridium + ", " +
                "booster_dmg_time = IF(booster_dmg_time > @now, booster_dmg_time + @boosterSeconds, @now + @boosterSeconds), " +
                "booster_hp_time = IF(booster_hp_time > @now, booster_hp_time + @boosterSeconds, @now + @boosterSeconds), " +
                "booster_shd_time = IF(booster_shd_time > @now, booster_shd_time + @boosterSeconds, @now + @boosterSeconds), " +
                "ammo_ucb100 = ammo_ucb100 + " + (object)FinalRewardUcb100 + ", " +
                "ammo_rsb75 = ammo_rsb75 + " + (object)FinalRewardRsb75 + " " +
                "WHERE factionid = @factionId" + excludeOnline
            );
            client.ClearParameters();
            client.SetParameter("factionId", (object)factionId);
            client.SetParameter("message", (object)message);
            client.ExecuteNonQuery("INSERT INTO users_log (playerid, message) SELECT id, @message FROM users WHERE factionid = @factionId" + excludeOnline);
        }

        private static void GrantConnectedWinningFactionReward(Session session, string message)
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                session.CharacterInfo.AddReward(client, 0, FinalRewardUridium, 0, true);
                session.CharacterInfo.AddLog(client, message);
                client.ClearParameters();
                client.SetParameter("id", (object)session.CharacterInfo.Id);
                client.ExecuteNonQuery("UPDATE users SET ammo_ucb100 = ammo_ucb100 + " + (object)FinalRewardUcb100 + ", ammo_rsb75 = ammo_rsb75 + " + (object)FinalRewardRsb75 + " WHERE id=@id LIMIT 1");
                session.CharacterInfo.AmmoUcb100 += (long)FinalRewardUcb100;
                session.CharacterInfo.AmmoRsb75 += (long)FinalRewardRsb75;
            }
            session.CharacterInfo.AddBoosterReward("dmg", FinalRewardBoosterHours);
            session.CharacterInfo.AddBoosterReward("hp", FinalRewardBoosterHours);
            session.CharacterInfo.AddBoosterReward("shd", FinalRewardBoosterHours);
            session.SendData(PacketComposer.Compose("y", "URI|" + (object)FinalRewardUridium + "|" + (object)session.CharacterInfo.Uridium));
            session.SendData(PacketComposer.Compose("A", "STD|" + message));
        }

        private static void GrantWinningFactionReward(int factionId)
        {
            if (factionId < 1 || factionId > 3)
                return;
            lock (Spaceball.mRewardSyncRoot)
            {
                if (Spaceball.mFinalRewardGranted)
                    return;
                Spaceball.mFinalRewardGranted = true;
            }
            string message = Spaceball.GetFinalRewardMessage();
            List<int> onlineCharacterIds = new List<int>();
            List<Session> connectedWinners = Spaceball.GetConnectedFactionSessions(factionId, onlineCharacterIds);
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                Spaceball.GrantOfflineWinningFactionReward(client, factionId, onlineCharacterIds, message);
            }
            foreach (Session session in connectedWinners)
            {
                Spaceball.GrantConnectedWinningFactionReward(session, message);
            }
            TitleService.GrantSpaceballChampionToOnlineWinners(factionId, SpaceballMapId);
        }

        public static void ResetBall()
        {
            Spaceball.mNpc.LocX = -100;
            Spaceball.mNpc.LocY = -100;
            Spaceball.mNpc.NewLocX = -100;
            Spaceball.mNpc.NewLocY = -100;
            if (Spaceball.mNpc.PathFinder != null)
                Spaceball.mNpc.PathFinder.Dispose();
            Spaceball.mNpc.PathFinder = (Timer)null;
            Spaceball.mNpc.IsMoving = false;
            MapInfo mapInfo = MapInfoLoader.GetMapInfo(SpaceballMapId);
            if (!MapManager.InstanceIsLoadedForMap(mapInfo.Id))
                MapManager.TryLoadMapInstance(mapInfo.Id);
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(SpaceballMapId);
            if (instanceByMapId != null)
            {
                instanceByMapId.BroadcastMessageInRange(PacketComposer.Compose("K", Spaceball.mNpc.Id.ToString()), Spaceball.mNpc.Id, false);
                foreach (MapActor mapActor in (IEnumerable<MapActor>)instanceByMapId.Actors.Values)
                {
                    if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                    {
                        Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                        if (sessionById != null && sessionById.CharacterInfo != null && sessionById.CharacterInfo.NpcInRange.Contains(Spaceball.mNpc.Id))
                        {
                            if (sessionById.CharacterInfo.SelectedPlayer == Spaceball.mNpc.Id)
                            {
                                if (sessionById.CharacterInfo.LaserAttackTimer != null)
                                    sessionById.CharacterInfo.LaserAttackTimer.Dispose();
                                if (sessionById.CharacterInfo.LaserAttackCanTimer != null)
                                    sessionById.CharacterInfo.LaserAttackCanTimer.Dispose();
                                sessionById.CharacterInfo.Attacking = false;
                                sessionById.CharacterInfo.CanLaserAttack = true;
                                sessionById.CharacterInfo.SelectedPlayer = 0;
                                sessionById.SendData(PacketComposer.Compose("N", "-1"));
                                sessionById.CharacterInfo.CanLaserAttack = true;
                            }
                            sessionById.CharacterInfo.NpcInRange.Remove(Spaceball.mNpc.Id);
                            sessionById.SendData(PacketComposer.Compose("R", Spaceball.mNpc.Id.ToString()));
                        }
                    }
                }
            }
            Spaceball.mMoveToFirm = 0;
            Spaceball.mBallSpeed = 0;
            Spaceball.mLastMoveToFirm = 0;
            Spaceball.mLastBallSpeed = 0;
            Spaceball.mDamageMMO = 0;
            Spaceball.mDamageEIC = 0;
            Spaceball.mDamageVRU = 0;
            Spaceball.mTotalDamageMMO = 0L;
            Spaceball.mTotalDamageEIC = 0L;
            Spaceball.mTotalDamageVRU = 0L;
            Spaceball.mNpc.LocX = CenterX;
            Spaceball.mNpc.LocY = CenterY;
            Spaceball.mNpc.NewLocX = CenterX;
            Spaceball.mNpc.NewLocY = CenterY;
            Spaceball.mNpc.ShipSpeed = 10;
            if (Spaceball.mActive)
                Spaceball.UpdateHudSpeed(0);
        }

        public static void GiveReward(int FactionId, int amount)
        {
            CList<Session> sessionsUser = SessionManager.SessionsUser;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                foreach (Session key in (IEnumerable<Session>)sessionsUser.Keys)
                {
                    if (key.CharacterInfo.FactionId == FactionId)
                    {
                        string _Message = "Spaceball reward : + " + (object)amount + " C.";
                        key.CharacterInfo.AddLog(client, _Message);
                        key.CharacterInfo.AddReward(client, amount, 0, 0, true);
                        key.SendData(PacketComposer.Compose("y", "CRE|" + (object)amount + "|" + (object)key.CharacterInfo.Credits));
                    }
                }
            }
        }

        public static void StartSpaceball()
        {
            lock (Spaceball.mStateSyncRoot)
            {
                if (Spaceball.mActive)
                {
                    Spaceball.EnsureActiveSpaceballState();
                    return;
                }

                MapInstance instanceByMapId = Spaceball.GetSpaceballMapInstance();
                if (instanceByMapId == null)
                {
                    Spaceball.SetEventInformationActive(false);
                    Spaceball.ScheduleNextAutomaticStart();
                    return;
                }

                TitleService.RevokeSpaceballChampionTitles();

                Spaceball.mMMOScore = 0;
                Spaceball.mEICScore = 0;
                Spaceball.mVRUScore = 0;
                Spaceball.mFinalRewardGranted = false;
                Spaceball.ResetBall();

                instanceByMapId = Spaceball.GetSpaceballMapInstance();
                if (!Spaceball.EnsureSpaceballActor(instanceByMapId, true))
                {
                    Spaceball.SetEventInformationActive(false);
                    Spaceball.ScheduleNextAutomaticStart();
                    return;
                }

                Spaceball.DisposeRuntimeTimers();
                Spaceball.mActive = true;
                Spaceball.SetEventInformationActive(true);
                SessionManager.BroadcastToUser(PacketComposer.Compose("n", "ssi|" + (object)Spaceball.mMMOScore + "|" + (object)Spaceball.mEICScore + "|" + (object)Spaceball.mVRUScore + "|" + (object)Spaceball.mBallSpeed + "|" + (object)Spaceball.mMoveToFirm));
                Spaceball.BroadcastSpaceballLog("Spaceball event has started on 4-4.");
                Spaceball.mPerformUpdate = new Timer(new TimerCallback(Spaceball.CbPerformUpdate), (object)Spaceball.mNpc, 0, 2000);
                Spaceball.ScheduleEventStop();
            }
        }

        public static void StopSpaceball()
        {
            lock (Spaceball.mStateSyncRoot)
            {
                Spaceball.DisposeRuntimeTimers();
                bool wasActive = Spaceball.mActive;
                if (Spaceball.mActive)
                {
                    Spaceball.mBallSpeed = 0;
                    SessionManager.BroadcastToUser(PacketComposer.Compose("n", "sss|0|" + (object)Spaceball.mBallSpeed));
                }
                Spaceball.mActive = false;
                Spaceball.ResetBall();
                if (wasActive)
                    SessionManager.BroadcastToUser(PacketComposer.Compose("n", "sse"));
                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(SpaceballMapId);
                if (instanceByMapId != null)
                {
                    instanceByMapId.Info.MaxUsers = 0;
                    MapActor actorByReferenceId = instanceByMapId.GetActorByReferenceId(Spaceball.mNpc.Id, MapActorType.AiBot);
                    if (actorByReferenceId != null)
                    {
                        instanceByMapId.BroadcastMessage(PacketComposer.Compose("K", actorByReferenceId.Id.ToString()), false);
                        instanceByMapId.KickNpc(actorByReferenceId.Id);
                    }
                }
                Spaceball.SetEventInformationActive(false);
                if (wasActive)
                    Spaceball.BroadcastSpaceballLog("Spaceball event has ended.");
                Spaceball.ScheduleNextAutomaticStart();
            }
        }

        private static void CbStopSpaceball(object state)
        {
            Spaceball.StopSpaceball();
        }

        public static void DoDamage(int Damage, int FactionId)
        {
            if (!Spaceball.mActive)
                return;
            if (FactionId == 1)
            {
                Spaceball.mDamageMMO += Damage;
                Spaceball.mTotalDamageMMO += (long)Damage;
            }
            if (FactionId == 2)
            {
                Spaceball.mDamageEIC += Damage;
                Spaceball.mTotalDamageEIC += (long)Damage;
            }
            if (FactionId != 3)
                return;
            Spaceball.mDamageVRU += Damage;
            Spaceball.mTotalDamageVRU += (long)Damage;
        }

        private static void CbPerformUpdate(object state)
        {
            if (Spaceball.mNpc == null)
                return;
            if (!Spaceball.EnsureActiveSpaceballState())
                return;
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(SpaceballMapId);
            if (instanceByMapId == null)
                return;
            if (Spaceball.mDamageMMO == 0 && Spaceball.mDamageEIC == 0 && Spaceball.mDamageVRU == 0)
            {
                if (Spaceball.mNpc.PathFinder != null)
                    Spaceball.mNpc.PathFinder.Dispose();
                Spaceball.mNpc.PathFinder = (Timer)null;
                NpcAI.TryMoveNpc(Spaceball.mNpc);
                Spaceball.mNpc.NewLocX = Spaceball.mNpc.LocX;
                Spaceball.mNpc.NewLocY = Spaceball.mNpc.LocY;
                Spaceball.mNpc.ShipSpeed = 10;
                Spaceball.mNpc.IsMoving = false;
                instanceByMapId.BroadcastMessageInRange(MapShipMovementComposer.Compose(Spaceball.mNpc.Id, Spaceball.mNpc.NewLocX, Spaceball.mNpc.NewLocY, 0.0), Spaceball.mNpc.Id, false);
                Spaceball.mMoveToFirm = 0;
                Spaceball.mLastMoveToFirm = 0;
                Spaceball.mBallSpeed = 0;
                if (Spaceball.mBallSpeed == Spaceball.mLastBallSpeed)
                    return;
                Spaceball.mNpc.ShipSpeed = 10 + (40 * SpeedMultiplierOnHit) * Spaceball.mBallSpeed;
                Spaceball.UpdateHudSpeed(Spaceball.mMoveToFirm);
                Spaceball.mLastBallSpeed = Spaceball.mBallSpeed;
            }
            else
            {
                int num1 = Spaceball.mDamageMMO;
                int num2 = 1;
                if (Spaceball.mDamageEIC > num1)
                {
                    num1 = Spaceball.mDamageEIC;
                    num2 = 2;
                }
                if (Spaceball.mDamageVRU > num1)
                {
                    num1 = Spaceball.mDamageVRU;
                    num2 = 3;
                }
                Spaceball.mDamageMMO = 0;
                Spaceball.mDamageEIC = 0;
                Spaceball.mDamageVRU = 0;
                Spaceball.mMoveToFirm = num2;
                if (Spaceball.mMoveToFirm == 1 && DistanceUtil.IsWithinRangeSquared(Spaceball.mNpc.LocX, Spaceball.mNpc.LocY, MmoGoalX, MmoGoalY, GoalReachedRadius))
                {
                    Spaceball.SpaceBallReward();
                    return;
                }
                if (Spaceball.mMoveToFirm == 2 && DistanceUtil.IsWithinRangeSquared(Spaceball.mNpc.LocX, Spaceball.mNpc.LocY, EicGoalX, EicGoalY, GoalReachedRadius))
                {
                    Spaceball.SpaceBallReward();
                    return;
                }
                if (Spaceball.mMoveToFirm == 3 && DistanceUtil.IsWithinRangeSquared(Spaceball.mNpc.LocX, Spaceball.mNpc.LocY, VruGoalX, VruGoalY, GoalReachedRadius))
                {
                    Spaceball.SpaceBallReward();
                    return;
                }
                Spaceball.mBallSpeed = 0;
                if (num1 > 40000)
                    Spaceball.mBallSpeed = 1;
                if (num1 > 250000)
                    Spaceball.mBallSpeed = 2;
                if (num1 > 500000)
                    Spaceball.mBallSpeed = 3;
                bool flag = false;
                if (Spaceball.mBallSpeed != Spaceball.mLastBallSpeed)
                {
                    Spaceball.mNpc.ShipSpeed = 10 + (40 * SpeedMultiplierOnHit) * Spaceball.mBallSpeed;
                    Spaceball.UpdateHudSpeed(Spaceball.mMoveToFirm);
                    Spaceball.mLastBallSpeed = Spaceball.mBallSpeed;
                    flag = true;
                }
                if (Spaceball.mMoveToFirm != Spaceball.mLastMoveToFirm)
                {
                    if (Spaceball.mMoveToFirm == 1)
                    {
                        Spaceball.mNpc.NewLocX = MmoGoalX;
                        Spaceball.mNpc.NewLocY = MmoGoalY;
                    }
                    if (Spaceball.mMoveToFirm == 2)
                    {
                        Spaceball.mNpc.NewLocX = EicGoalX;
                        Spaceball.mNpc.NewLocY = EicGoalY;
                    }
                    if (Spaceball.mMoveToFirm == 3)
                    {
                        Spaceball.mNpc.NewLocX = VruGoalX;
                        Spaceball.mNpc.NewLocY = VruGoalY;
                    }
                    Spaceball.mLastMoveToFirm = Spaceball.mMoveToFirm;
                    Spaceball.UpdateHudSpeed(Spaceball.mMoveToFirm);
                    flag = true;
                }
                if (!flag)
                    return;
                if (Spaceball.mNpc.PathFinder != null)
                    Spaceball.mNpc.PathFinder.Dispose();
                if (!Spaceball.mNpc.IsMoving)
                    Spaceball.mNpc.LastMove = DateTime.Now;
                NpcAI.TryMoveNpc(Spaceball.mNpc);
                double TimeTaken = Math.Sqrt(Math.Pow((double)(Spaceball.mNpc.LocX - Spaceball.mNpc.NewLocX), 2.0) + Math.Pow((double)(Spaceball.mNpc.LocY - Spaceball.mNpc.NewLocY), 2.0)) / (double)Spaceball.mNpc.ShipSpeed * 1000.0;
                Spaceball.mNpc.IsMoving = true;
                instanceByMapId.BroadcastMessageInRange(MapShipMovementComposer.Compose(Spaceball.mNpc.Id, Spaceball.mNpc.NewLocX, Spaceball.mNpc.NewLocY, TimeTaken), Spaceball.mNpc.Id, false);
                Spaceball.mNpc.PathFinder = new Timer(new TimerCallback(NpcAI.PathFinding), (object)Spaceball.mNpc, 300, 300);
            }
        }

        private static void SpaceBallReward()
        {
            Spaceball.Loot();
            if (Spaceball.mMoveToFirm == 1)
            {
                ++Spaceball.mMMOScore;
                Spaceball.UpdateHudScore(1);
            }
            else if (Spaceball.mMoveToFirm == 2)
            {
                ++Spaceball.mEICScore;
                Spaceball.UpdateHudScore(2);
            }
            else if (Spaceball.mMoveToFirm == 3)
            {
                ++Spaceball.mVRUScore;
                Spaceball.UpdateHudScore(3);
            }
            Spaceball.mDamageMMO = 0;
            Spaceball.mDamageEIC = 0;
            Spaceball.mDamageVRU = 0;
            Spaceball.mTotalDamageMMO = 0L;
            Spaceball.mTotalDamageEIC = 0L;
            Spaceball.mTotalDamageVRU = 0L;
            Spaceball.BroadcastSpaceballLog("Spaceball goal for " + Spaceball.GetCompanyName(Spaceball.mMoveToFirm) + ". Score: MMO " + (object)Spaceball.mMMOScore + " - EIC " + (object)Spaceball.mEICScore + " - VRU " + (object)Spaceball.mVRUScore + ".");
            if (Spaceball.mMMOScore >= WinScore || Spaceball.mEICScore >= WinScore || Spaceball.mVRUScore >= WinScore)
            {
                int winningFactionId = Spaceball.mMoveToFirm;
                Spaceball.BroadcastSpaceballLog(Spaceball.GetCompanyName(winningFactionId) + " has won the Spaceball event.");
                Spaceball.GrantWinningFactionReward(winningFactionId);
                Spaceball.StopSpaceball();
                return;
            }
            Spaceball.ResetBall();
        }

        private static void Loot()
        {
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(SpaceballMapId);
            if (instanceByMapId == null)
                return;
            int num1 = 0;
            if (Spaceball.mMoveToFirm == 1)
                num1 = (int)(Spaceball.mTotalDamageMMO / 1000000L);
            else if (Spaceball.mMoveToFirm == 2)
                num1 = (int)(Spaceball.mTotalDamageEIC / 1000000L);
            else if (Spaceball.mMoveToFirm == 3)
                num1 = (int)(Spaceball.mTotalDamageVRU / 1000000L);
            if (num1 < 1)
                num1 = 1;
            if (num1 > MaxLootBoxesPerGoal)
                num1 = MaxLootBoxesPerGoal;
            int num2 = 0;
            Random random = RandomProvider.Current;
            for (; num2 < num1; ++num2)
            {
                int num3 = num2 - 1000000;
                while (instanceByMapId.Info.Collectables.ContainsKey(num3))
                    --num3;
                SpaceballBox spaceballBox = new SpaceballBox(num3, Spaceball.mNpc.LocX + random.Next(-800, 800), Spaceball.mNpc.LocY + random.Next(-500, 500), Spaceball.mNpc.MapId);
                instanceByMapId.Info.Collectables.Add(num3, (Collectable)spaceballBox);
                instanceByMapId.BroadcastMessage(PacketComposer.Compose("c", num3.ToString() + "|" + (object)1 + "|" + (object)spaceballBox.X + "|" + (object)spaceballBox.Y), false);
            }
        }

    }
}
