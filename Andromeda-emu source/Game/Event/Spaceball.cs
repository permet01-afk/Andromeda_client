using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Maps.Collectables;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;
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

        private static Npc mNpc;
        private static bool mActive;
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
        private static Timer mAuto;

        public static void Initialize()
        {
            Spaceball.mNpc = NpcManager.CreateNewInstance("Spaceball", SpaceballMapId, CenterX, CenterY, SpaceballShipId, 1000, 1000, 1000, 1000, 40, 0, 0, 0, 0, 0, "", 1, 0, 0, 0, 0, 0);
            Spaceball.mActive = false;
            Spaceball.mMMOScore = 0;
            Spaceball.mEICScore = 0;
            Spaceball.mVRUScore = 0;
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
        }

        public static void ShowHud(Session Session)
        {
            if (!Spaceball.mActive)
                return;
            Session.SendData(PacketComposer.Compose("n", "ssi|" + (object)Spaceball.mMMOScore + "|" + (object)Spaceball.mEICScore + "|" + (object)Spaceball.mVRUScore + "|" + (object)Spaceball.mBallSpeed + "|" + (object)Spaceball.mMoveToFirm));
        }

        public static void SendHud()
        {
            SessionManager.BroadcastToUser(PacketComposer.Compose("n", "ssi|" + (object)Spaceball.mMMOScore + "|" + (object)Spaceball.mEICScore + "|" + (object)Spaceball.mVRUScore + "|" + (object)Spaceball.mBallSpeed + "|" + (object)Spaceball.mMoveToFirm));
        }

        public static void UpdateHudScore(int FactionId)
        {
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
            if (Spaceball.mActive)
                return;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ExecuteNonQuery("UPDATE event_information SET isActif=1 WHERE id = 3");
            }

            Spaceball.mMMOScore = 0;
            Spaceball.mEICScore = 0;
            Spaceball.mVRUScore = 0;
            Spaceball.ResetBall();
            Spaceball.mActive = true;
            SessionManager.BroadcastToUser(PacketComposer.Compose("n", "ssi|" + (object)Spaceball.mMMOScore + "|" + (object)Spaceball.mEICScore + "|" + (object)Spaceball.mVRUScore + "|" + (object)Spaceball.mBallSpeed + "|" + (object)Spaceball.mMoveToFirm));
            MapInfo mapInfo = MapInfoLoader.GetMapInfo(SpaceballMapId);
            if (!MapManager.InstanceIsLoadedForMap(mapInfo.Id))
                MapManager.TryLoadMapInstance(mapInfo.Id);
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(SpaceballMapId);
            if (instanceByMapId == null)
                return;
            instanceByMapId.AddNpcToMap(Spaceball.mNpc);
            if (Spaceball.mPerformUpdate != null)
                Spaceball.mPerformUpdate.Dispose();
            Spaceball.mPerformUpdate = new Timer(new TimerCallback(Spaceball.CbPerformUpdate), (object)Spaceball.mNpc, 0, 2000);
        }

        private static void CbStartSpaceball(object state)
        {
            if (Spaceball.mActive)
                return;
            Spaceball.StartSpaceball();
            if (Spaceball.mAuto != null)
                Spaceball.mAuto.Dispose();
            Spaceball.mAuto = new Timer(new TimerCallback(Spaceball.CbStopSpaceball), (object)null, Convert.ToInt64(TimeSpan.FromHours(1.0).TotalMilliseconds), 0L);
        }

        public static void StopSpaceball()
        {
            if (Spaceball.mPerformUpdate != null)
                Spaceball.mPerformUpdate.Dispose();
            Spaceball.mPerformUpdate = (Timer)null;
            if (Spaceball.mActive)
            {
                Spaceball.mBallSpeed = 0;
                Spaceball.UpdateHudSpeed(0);
            }
            Spaceball.mActive = false;
            Spaceball.ResetBall();
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
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ExecuteNonQuery("UPDATE event_information SET isActif=0 WHERE id = 3");
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
            if (Spaceball.mMMOScore >= WinScore || Spaceball.mEICScore >= WinScore || Spaceball.mVRUScore >= WinScore)
            {
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

        private static void ScheduleNextStartAt20()
        {
            if (Spaceball.mAuto != null)
                Spaceball.mAuto.Dispose();
            DateTime now = DateTime.Now;
            DateTime dateTime = DateTime.Today.AddHours(20.0);
            if (dateTime <= now)
                dateTime = dateTime.AddDays(1.0);
            double totalMilliseconds = (dateTime - now).TotalMilliseconds;
            Spaceball.mAuto = new Timer(new TimerCallback(Spaceball.CbStartSpaceball), (object)null, Convert.ToInt64(totalMilliseconds), 0L);
        }
    }
}
