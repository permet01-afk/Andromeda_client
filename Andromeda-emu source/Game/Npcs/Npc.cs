using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Maps.Collectables;
using OrbitReborn_Emulator.Game.Misc;
using OrbitReborn_Emulator.Game.Quests;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Titles;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Specialized;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Npcs
{
    public class Npc
    {
        public ConcurrentDictionary<int, byte> SpawnedMinions = new ConcurrentDictionary<int, byte>();

        public double CubikonLastSpawnTick = 0.0;

        public int ParentNpcId = 0;

        public double DespawnAt = 0.0;

        public double MinionLastRetargetTick = 0.0;

        private static int _nextNpcCargoBoxId = -2000000;

        private static int NextNpcCargoBoxId()
        {
            return Interlocked.Decrement(ref _nextNpcCargoBoxId);
        }

        private int mIsBoss = 0;
        private int mDamages = 0;
        private int mSharedRewards = 0;
        private bool mHasConfiguredCargoDrop = false;
        private bool mIsAttacking = false;
        private bool mIsDestroying = false;

        private CDictionnary<int, int> mAttackers = new CDictionnary<int, int>();
        private const double CLAIM_TIMEOUT_SECONDS = 10.0;

        private int mRewardOwnerId = 0;

        private double mRewardOwnerLastHit = 0.0;

        private readonly List<int> mRewardOwnerQueue = new List<int>();
        private readonly object mRewardOwnerQueueSync = new object();

        private int mId;
        private int mMapId;

        private int mOldLocX;
        private int mOldLocY;

        private int mLocX;
        private int mLocY;

        private int mNewLocX;
        private int mNewLocY;

        private bool mIsMoving;
        private DateTime mLastMove;
        private double mTimeTaken;

        private string mName;
        private string mGameTitle = string.Empty;

        private int mShipId;
        private int mShipHp;
        private int mShipMaxHp;
        private int mShipShield;
        private int mShipMaxShield;
        private int mShipSpeed;

        public int Credits;
        public int Uridium;

        public int ExperienceReward;
        public int HonorReward;

        public int DamageMin;
        public int DamageMax;

        public int CargoPrometium;
        public int CargoEndurium;
        public int CargoTerbium;

        public int CargoPalladium;

        public int CargoPrometid;
        public int CargoDuranium;
        public int CargoPromerium;
        public int CargoXenomit;

        public int FactionId;
        public int FatLasers;
        public int ShieldMechanics;
        public string ClanTag;
        public int IsClanMember;
        public int Rank;
        public int GalaxyGatesRings;
        public int Drones;

        private Timer mPathFinder;
        private int mNpcPoints;
        private bool mRespawn;
        private const int NPC_RESPAWN_VISUAL_DELAY_MS = 1000;
        private const int NPC_VISUAL_STOP_MIN_SMOOTH_MS = 120;
        private const int NPC_VISUAL_STOP_MAX_SMOOTH_MS = 900;
        private Timer mRespawnDelayTimer;
        private readonly object mRespawnDelaySync = new object();

        private int mSpawnSeq;

        private const int NPC_KILL_ECONOMY_MULTIPLIER = 3;

        private Timer mAttackTimer;
        private int mTargetId;

        private double mLastAttackByAttackerReceived;
        private double mLastAttackReceived;

        private const double NPC_COMBAT_IDLE_TIMEOUT_SECONDS = 10.0;
        private double mLastAggroTick = 0;
        private double mLastNpcDamageReceivedTick = 0.0;
        private double mLastNpcDamageDealtTick = 0.0;
        private double mLastNpcCombatActivityTick = 0.0;
        private int mLastNpcCombatTargetId = 0;

        public const double NPC_EMP_LOCK_BREAK_SECONDS = 2.0;
        private int mEmpInterruptedTargetId = 0;
        private double mEmpLockBlockedUntil = 0.0;

        private int mAttackInProgress = 0;

        private int mLastDamageTick = 0;

        public int Id
        {
            get { return this.mId; }
        }

        public int MapId
        {
            get { return this.mMapId; }
            set { this.mMapId = value; }
        }

        public bool IsMoving
        {
            get { return this.mIsMoving; }
            set { this.mIsMoving = value; }
        }

        public bool Respawn
        {
            get { return this.mRespawn; }
            set { this.mRespawn = value; }
        }

        public int SpawnSeq
        {
            get { return this.mSpawnSeq; }
        }

        public int OldLocX
        {
            get { return this.mOldLocX; }
            set { this.mOldLocX = value; }
        }

        public int OldLocY
        {
            get { return this.mOldLocY; }
            set { this.mOldLocY = value; }
        }

        public int LocX
        {
            get { return this.mLocX; }
            set { this.mLocX = value; }
        }

        public int LocY
        {
            get { return this.mLocY; }
            set { this.mLocY = value; }
        }

        public int NewLocX
        {
            get { return this.mNewLocX; }
            set { this.mNewLocX = value; }
        }

        public int NewLocY
        {
            get { return this.mNewLocY; }
            set { this.mNewLocY = value; }
        }

        public double TimeTaken
        {
            get { return this.mTimeTaken; }
            set { this.mTimeTaken = value; }
        }

        public DateTime LastMove
        {
            get { return this.mLastMove; }
            set { this.mLastMove = value; }
        }

        public string Name
        {
            get { return this.mName; }
            set { this.mName = value; }
        }

        public int ShipId
        {
            get { return this.mShipId; }
            set { this.mShipId = value; }
        }

        public int ShipHp
        {
            get { return this.mShipHp; }
            set { this.mShipHp = value; }
        }

        public int ShipMaxHp
        {
            get { return this.mShipMaxHp; }
            set { this.mShipMaxHp = value; }
        }

        public int ShipShield
        {
            get { return this.mShipShield; }
            set { this.mShipShield = value; }
        }

        public int ShipMaxShield
        {
            get { return this.mShipMaxShield; }
            set { this.mShipMaxShield = value; }
        }

        public int ShipSpeed
        {
            get { return this.mShipSpeed; }
            set { this.mShipSpeed = value; }
        }

        public Timer PathFinder
        {
            get { return this.mPathFinder; }
            set { this.mPathFinder = value; }
        }

        public int NpcPoints
        {
            get { return this.mNpcPoints; }
            set { this.mNpcPoints = value; }
        }

        public int IsBoss
        {
            get { return this.mIsBoss; }
            set { this.mIsBoss = value; }
        }

        public int Damages
        {
            get { return this.mDamages; }
            set { this.mDamages = value; }
        }

        public CDictionnary<int, int> Attackers
        {
            get { return this.mAttackers; }
        }
        public int RewardOwnerId
        {
            get { return this.mRewardOwnerId; }
        }

        public string GameTitle
        {
            get { return this.mGameTitle; }
            set { this.mGameTitle = value ?? string.Empty; }
        }

        public double RewardOwnerLastHit
        {
            get { return this.mRewardOwnerLastHit; }
        }

        public double LastAttackByAttackerReceived
        {
            get { return this.mLastAttackByAttackerReceived; }
            set { this.mLastAttackByAttackerReceived = value; }
        }

        public int SharedRewards
        {
            get { return this.mSharedRewards; }
            set { this.mSharedRewards = value; }
        }

        public bool IsAttacking
        {
            get { return this.mIsAttacking; }
            set { this.mIsAttacking = value; }
        }

        public Timer AttackTimer
        {
            get { return this.mAttackTimer; }
            set { this.mAttackTimer = value; }
        }

        public int TargetId
        {
            get { return this.mTargetId; }
            set
            {
                if (this.mTargetId == value)
                    return;

                this.mTargetId = value;

                if (value > 0)
                    StartNpcCombatTracking(value);
                else
                {
                    this.mLastNpcCombatTargetId = 0;
                    this.mLastNpcCombatActivityTick = 0.0;
                }
            }
        }

        public bool IsDestroying
        {
            get { return this.mIsDestroying; }
            set { this.mIsDestroying = value; }
        }

        public double LastAttackReceived
        {
            get { return this.mLastAttackReceived; }
            set { this.mLastAttackReceived = value; }
        }

        public double LastNpcDamageReceivedTick
        {
            get { return this.mLastNpcDamageReceivedTick; }
        }

        public double LastNpcDamageDealtTick
        {
            get { return this.mLastNpcDamageDealtTick; }
        }

        public double LastNpcCombatActivityTick
        {
            get { return this.mLastNpcCombatActivityTick; }
        }

        public int EmpInterruptedTargetId
        {
            get { return this.mEmpInterruptedTargetId; }
        }

        public double EmpLockBlockedUntil
        {
            get { return this.mEmpLockBlockedUntil; }
        }

        private static bool IsGalaxyGateMap(int mapId)
        {
            return mapId == 51 || mapId == 52 || mapId == 53 || mapId == 55;
        }

        public static bool IsSessionUnderNpcEmpLockBreak(Session session, double now)
        {
            if (session == null || session.CharacterInfo == null)
                return false;

            double lastEmp = session.CharacterInfo.LastEMP;
            if (lastEmp <= 0.0)
                return false;

            double elapsed = now - lastEmp;
            return elapsed >= 0.0 && elapsed < NPC_EMP_LOCK_BREAK_SECONDS;
        }

        private static double GetNpcEmpLockBlockedUntil(Session session, double now)
        {
            if (session != null && session.CharacterInfo != null && session.CharacterInfo.LastEMP > 0.0)
                return session.CharacterInfo.LastEMP + NPC_EMP_LOCK_BREAK_SECONDS;

            return now + NPC_EMP_LOCK_BREAK_SECONDS;
        }

        public void AdvanceMovementToCurrentPosition()
        {
            if (!this.IsMoving)
                return;
            if (this.ShipSpeed <= 0)
                return;

            int locX = this.LocX;
            int locY = this.LocY;
            int newLocX = this.NewLocX;
            int newLocY = this.NewLocY;

            if (locX == newLocX && locY == newLocY)
            {
                this.IsMoving = false;
                if (this.PathFinder != null)
                {
                    this.PathFinder.Dispose();
                    this.PathFinder = null;
                }
                return;
            }

            DateTime now = DateTime.Now;
            double elapsed = (now - this.LastMove).TotalMilliseconds;
            if (elapsed <= 0.0)
                return;

            double dx = (double)(newLocX - locX);
            double dy = (double)(newLocY - locY);
            double distance = Math.Sqrt(dx * dx + dy * dy);
            if (distance <= 0.0)
                return;

            double travelled = elapsed * (double)this.ShipSpeed / 1000.0;
            if (travelled >= distance)
            {
                this.LocX = newLocX;
                this.LocY = newLocY;
                this.IsMoving = false;
                if (this.PathFinder != null)
                {
                    this.PathFinder.Dispose();
                    this.PathFinder = null;
                }
                this.LastMove = now;
                return;
            }

            double ratio = travelled / distance;
            int currentX = (int)((double)locX + dx * ratio);
            int currentY = (int)((double)locY + dy * ratio);

            if (currentX == locX && currentY == locY)
                return;

            this.LocX = currentX;
            this.LocY = currentY;
            this.LastMove = now;
        }

        public void StopMovementAtCurrentPosition()
        {
            this.AdvanceMovementToCurrentPosition();

            if (this.PathFinder != null)
            {
                this.PathFinder.Dispose();
                this.PathFinder = null;
            }

            this.IsMoving = false;
            this.NewLocX = this.LocX;
            this.NewLocY = this.LocY;
        }

        internal int GetVisualStopSmoothingTime(int fromX, int fromY, int toX, int toY)
        {
            if (this.ShipSpeed <= 0)
                return NPC_VISUAL_STOP_MIN_SMOOTH_MS;

            double dx = (double)(toX - fromX);
            double dy = (double)(toY - fromY);
            double distance = Math.Sqrt(dx * dx + dy * dy);
            if (distance <= 0.0)
                return NPC_VISUAL_STOP_MIN_SMOOTH_MS;

            int time = (int)Math.Round(distance / (double)this.ShipSpeed * 1000.0);
            if (time < NPC_VISUAL_STOP_MIN_SMOOTH_MS)
                return NPC_VISUAL_STOP_MIN_SMOOTH_MS;
            if (time > NPC_VISUAL_STOP_MAX_SMOOTH_MS)
                return NPC_VISUAL_STOP_MAX_SMOOTH_MS;
            return time;
        }

        public bool IsEmpLockBlockedFor(int targetId, double now)
        {
            return targetId > 0
                && this.mEmpInterruptedTargetId == targetId
                && now < this.mEmpLockBlockedUntil;
        }

        public void ClearEmpInterruptedTarget()
        {
            this.mEmpInterruptedTargetId = 0;
            this.mEmpLockBlockedUntil = 0.0;
        }

        private bool StopMovementAtCurrentPositionAndBroadcast()
        {
            bool hadMovement = this.IsMoving || this.NewLocX != this.LocX || this.NewLocY != this.LocY;
            int previousX = this.LocX;
            int previousY = this.LocY;

            this.StopMovementAtCurrentPosition();

            if (!hadMovement)
                return false;

            int smoothTime = GetVisualStopSmoothingTime(previousX, previousY, this.LocX, this.LocY);

            MapInstance inst = MapManager.GetInstanceByMapId(this.MapId);
            if (inst != null)
            {
                inst.BroadcastMessageInRange(
                    MapShipMovementComposer.Compose(this.Id, this.LocX, this.LocY, smoothTime),
                    this.Id,
                    false
                );
            }

            return true;
        }

        internal void StopMovementBeforeAttack()
        {
            StopMovementAtCurrentPositionAndBroadcast();
        }

        private void StopNpcMovementForEmp()
        {
            StopMovementAtCurrentPositionAndBroadcast();
        }

        private bool CanLockTargetAfterEmp(int targetId, double now)
        {
            if (targetId <= 0)
                return false;

            if (this.mEmpInterruptedTargetId == targetId && now >= this.mEmpLockBlockedUntil)
                ClearEmpInterruptedTarget();

            if (IsEmpLockBlockedFor(targetId, now))
                return false;

            Session targetSession = SessionManager.GetSessionByCharacterId(targetId);
            if (IsSessionUnderNpcEmpLockBreak(targetSession, now))
            {
                BreakNpcLockByEmp(targetId);
                return false;
            }

            return true;
        }

        public void BreakNpcLockByEmp(int targetId)
        {
            if (targetId <= 0 || this.IsDestroying)
                return;

            double now = UnixTimestamp.GetCurrent();
            Session targetSession = SessionManager.GetSessionByCharacterId(targetId);
            double blockedUntil = GetNpcEmpLockBlockedUntil(targetSession, now);

            this.mEmpInterruptedTargetId = targetId;
            if (blockedUntil > this.mEmpLockBlockedUntil)
                this.mEmpLockBlockedUntil = blockedUntil;

            if (this.TargetId != targetId)
                return;

            Invasion.BroadcastInvaderLockClear(this);
            this.mTargetId = 0;
            this.IsAttacking = false;
            this.mLastDamageTick = 0;

            if (this.AttackTimer != null)
            {
                this.AttackTimer.Dispose();
                this.AttackTimer = null;
                --TimerManager.TimerRunning;
            }

            StopNpcMovementForEmp();
        }

        private void MarkNpcCombatActivity(double now)
        {
            this.mLastNpcCombatActivityTick = now;
            if (this.TargetId > 0)
                this.mLastNpcCombatTargetId = this.TargetId;
        }

        private void StartNpcCombatTracking(int targetId)
        {
            if (targetId <= 0)
                return;

            double now = UnixTimestamp.GetCurrent();

            if (this.mLastNpcCombatActivityTick <= 0.0 || this.mLastNpcCombatTargetId != targetId)
                this.mLastNpcCombatActivityTick = now;

            this.mLastNpcCombatTargetId = targetId;

            if (this.mLastAggroTick <= 0.0)
                this.mLastAggroTick = now;
        }

        public void RegisterNpcDamageReceived(int damages)
        {
            if (damages <= 0)
                return;

            double now = UnixTimestamp.GetCurrent();
            this.mLastNpcDamageReceivedTick = now;
            this.mLastAggroTick = now;
            MarkNpcCombatActivity(now);
        }

        private void RegisterNpcDamageDealt(int damages)
        {
            if (damages <= 0)
                return;

            double now = UnixTimestamp.GetCurrent();
            this.mLastNpcDamageDealtTick = now;
            this.mLastAggroTick = now;
            MarkNpcCombatActivity(now);
        }

        public bool ShouldDropNpcTargetForCombatIdle(double now)
        {
            if (this.TargetId <= 0 || this.IsDestroying)
                return false;

            if (IsGalaxyGateMap(this.MapId))
                return false;

            if (this.mLastNpcCombatActivityTick <= 0.0)
            {
                StartNpcCombatTracking(this.TargetId);
                return false;
            }

            return now - this.mLastNpcCombatActivityTick >= NPC_COMBAT_IDLE_TIMEOUT_SECONDS;
        }

        private struct NpcBalance2010
        {
            public int Hp;
            public int Shield;
            public int Speed;
            public int DmgMin;
            public int DmgMax;
            public int Xp;
            public int Honor;
            public int Credits;
            public int Uridium;

            public int CargoP;
            public int CargoE;
            public int CargoT;

            public int CargoPd;
            public int CargoDu;
            public int CargoPr;
            public int CargoXe;
        }

        private static readonly Dictionary<string, NpcBalance2010> Balance2010 = new Dictionary<string, NpcBalance2010>()
        {
            ["-=[ Streuner ]=-"] = new NpcBalance2010
            {
                Hp = 800,
                Shield = 400,
                Speed = 280,
                DmgMin = 15,
                DmgMax = 20,
                Xp = 400,
                Honor = 2,
                Credits = 400,
                Uridium = 1,
                CargoP = 10,
                CargoE = 10,
                CargoT = 0,
                CargoPd = 0,
                CargoDu = 0,
                CargoPr = 0,
                CargoXe = 0
            },

            ["-=[ Lordakia ]=-"] = new NpcBalance2010
            {
                Hp = 2000,
                Shield = 2000,
                Speed = 320,
                DmgMin = 60,
                DmgMax = 80,
                Xp = 800,
                Honor = 4,
                Credits = 800,
                Uridium = 2,
                CargoP = 20,
                CargoE = 20,
                CargoT = 20,
                CargoPd = 0,
                CargoDu = 0,
                CargoPr = 0,
                CargoXe = 0
            },

            ["-=[ Saimon ]=-"] = new NpcBalance2010
            {
                Hp = 6000,
                Shield = 3000,
                Speed = 320,
                DmgMin = 150,
                DmgMax = 200,
                Xp = 1600,
                Honor = 8,
                Credits = 1600,
                Uridium = 4,
                CargoP = 40,
                CargoE = 40,
                CargoT = 40,
                CargoPd = 2,
                CargoDu = 2,
                CargoPr = 0,
                CargoXe = 0
            },

            ["-=[ Mordon ]=-"] = new NpcBalance2010
            {
                Hp = 20000,
                Shield = 10000,
                Speed = 125,
                DmgMin = 300,
                DmgMax = 400,
                Xp = 3200,
                Honor = 16,
                Credits = 6400,
                Uridium = 8,
                CargoP = 80,
                CargoE = 80,
                CargoT = 80,
                CargoPd = 8,
                CargoDu = 8,
                CargoPr = 1,
                CargoXe = 0
            },

            ["-=[ Devolarium ]=-"] = new NpcBalance2010
            {
                Hp = 100000,
                Shield = 100000,
                Speed = 150,
                DmgMin = 900,
                DmgMax = 1200,
                Xp = 6400,
                Honor = 32,
                Credits = 51200,
                Uridium = 16,
                CargoP = 100,
                CargoE = 100,
                CargoT = 100,
                CargoPd = 16,
                CargoDu = 16,
                CargoPr = 2,
                CargoXe = 0
            },

            ["-=[ Sibelonit ]=-"] = new NpcBalance2010
            {
                Hp = 40000,
                Shield = 40000,
                Speed = 320,
                DmgMin = 750,
                DmgMax = 1000,
                Xp = 3200,
                Honor = 16,
                Credits = 12800,
                Uridium = 12,
                CargoP = 100,
                CargoE = 100,
                CargoT = 100,
                CargoPd = 8,
                CargoDu = 8,
                CargoPr = 1,
                CargoXe = 0
            },

            ["-=[ Sibelon ]=-"] = new NpcBalance2010
            {
                Hp = 200000,
                Shield = 200000,
                Speed = 100,
                DmgMin = 2250,
                DmgMax = 3000,
                Xp = 12800,
                Honor = 64,
                Credits = 102400,
                Uridium = 32,
                CargoP = 200,
                CargoE = 200,
                CargoT = 200,
                CargoPd = 32,
                CargoDu = 32,
                CargoPr = 4,
                CargoXe = 0
            },

            ["-=[ Lordakium ]=-"] = new NpcBalance2010
            {
                Hp = 300000,
                Shield = 200000,
                Speed = 230,
                DmgMin = 3000,
                DmgMax = 4000,
                Xp = 25600,
                Honor = 128,
                Credits = 204800,
                Uridium = 64,
                CargoP = 300,
                CargoE = 300,
                CargoT = 300,
                CargoPd = 64,
                CargoDu = 64,
                CargoPr = 8,
                CargoXe = 1
            },

            ["-=[ Kristallin ]=-"] = new NpcBalance2010
            {
                Hp = 50000,
                Shield = 40000,
                Speed = 320,
                DmgMin = 900,
                DmgMax = 1200,
                Xp = 6400,
                Honor = 32,
                Credits = 12800,
                Uridium = 16,
                CargoP = 100,
                CargoE = 100,
                CargoT = 100,
                CargoPd = 16,
                CargoDu = 16,
                CargoPr = 1,
                CargoXe = 0
            },

            ["-=[ Kristallon ]=-"] = new NpcBalance2010
            {
                Hp = 400000,
                Shield = 300000,
                Speed = 250,
                DmgMin = 3750,
                DmgMax = 5000,
                Xp = 51200,
                Honor = 256,
                Credits = 409600,
                Uridium = 128,
                CargoP = 300,
                CargoE = 300,
                CargoT = 300,
                CargoPd = 128,
                CargoDu = 128,
                CargoPr = 16,
                CargoXe = 0
            },

            ["-=[ Protegit ]=-"] = new NpcBalance2010
            {
                Hp = 60000,
                Shield = 50000,
                Speed = 500,
                DmgMin = 1050,
                DmgMax = 1400,
                Xp = 6400,
                Honor = 32,
                Credits = 12800,
                Uridium = 16,
                CargoP = 100,
                CargoE = 100,
                CargoT = 100,
                CargoPd = 16,
                CargoDu = 16,
                CargoPr = 2,
                CargoXe = 0
            },

            ["-=[ Cubikon ]=-"] = new NpcBalance2010
            {
                Hp = 1600000,
                Shield = 1200000,
                Speed = 30,
                DmgMin = 0,
                DmgMax = 0,
                Xp = 512000,
                Honor = 4096,
                Credits = 1638400,
                Uridium = 1024,
                CargoP = 1200,
                CargoE = 1200,
                CargoT = 1200,
                CargoPd = 512,
                CargoDu = 512,
                CargoPr = 128,
                CargoXe = 120
            },

            ["-=[ StreuneR ]=-"] = new NpcBalance2010
            {
                Hp = 20000,
                Shield = 10000,
                Speed = 280,
                DmgMin = 350,
                DmgMax = 500,
                Xp = 3200,
                Honor = 16,
                Credits = 6400,
                Uridium = 8,
                CargoP = 80,
                CargoE = 80,
                CargoT = 80,
                CargoPd = 8,
                CargoDu = 8,
                CargoPr = 0,
                CargoXe = 0
            },

            ["-=[ Boss Streuner ]=-"] = new NpcBalance2010
            {
                Hp = 1600,
                Shield = 800,
                Speed = 250,
                DmgMin = 30,
                DmgMax = 40,
                Xp = 800,
                Honor = 4,
                Credits = 800,
                Uridium = 2,
                CargoP = 20,
                CargoE = 20,
                CargoT = 0,
                CargoPd = 0,
                CargoDu = 0,
                CargoPr = 0,
                CargoXe = 0
            },

            ["-=[ Boss Lordakia ]=-"] = new NpcBalance2010
            {
                Hp = 4000,
                Shield = 4000,
                Speed = 320,
                DmgMin = 120,
                DmgMax = 160,
                Xp = 1600,
                Honor = 8,
                Credits = 1600,
                Uridium = 4,
                CargoP = 40,
                CargoE = 40,
                CargoT = 40,
                CargoPd = 0,
                CargoDu = 0,
                CargoPr = 0,
                CargoXe = 0
            },

            ["-=[ Boss Saimon ]=-"] = new NpcBalance2010
            {
                Hp = 12000,
                Shield = 6000,
                Speed = 300,
                DmgMin = 300,
                DmgMax = 400,
                Xp = 3200,
                Honor = 16,
                Credits = 3200,
                Uridium = 8,
                CargoP = 80,
                CargoE = 80,
                CargoT = 80,
                CargoPd = 4,
                CargoDu = 4,
                CargoPr = 0,
                CargoXe = 0
            },

            ["-=[ Boss Mordon ]=-"] = new NpcBalance2010
            {
                Hp = 40000,
                Shield = 20000,
                Speed = 150,
                DmgMin = 600,
                DmgMax = 800,
                Xp = 6400,
                Honor = 32,
                Credits = 12800,
                Uridium = 16,
                CargoP = 160,
                CargoE = 160,
                CargoT = 160,
                CargoPd = 16,
                CargoDu = 16,
                CargoPr = 2,
                CargoXe = 0
            },

            ["-=[ Boss Devolarium ]=-"] = new NpcBalance2010
            {
                Hp = 200000,
                Shield = 200000,
                Speed = 150,
                DmgMin = 1800,
                DmgMax = 2400,
                Xp = 12800,
                Honor = 64,
                Credits = 102400,
                Uridium = 32,
                CargoP = 200,
                CargoE = 200,
                CargoT = 200,
                CargoPd = 32,
                CargoDu = 32,
                CargoPr = 4,
                CargoXe = 0
            },

            ["-=[ Boss Sibelonit ]=-"] = new NpcBalance2010
            {
                Hp = 80000,
                Shield = 80000,
                Speed = 300,
                DmgMin = 1500,
                DmgMax = 2000,
                Xp = 6400,
                Honor = 32,
                Credits = 25600,
                Uridium = 24,
                CargoP = 200,
                CargoE = 200,
                CargoT = 200,
                CargoPd = 16,
                CargoDu = 16,
                CargoPr = 2,
                CargoXe = 0
            },

            ["-=[ Boss Sibelon ]=-"] = new NpcBalance2010
            {
                Hp = 400000,
                Shield = 400000,
                Speed = 175,
                DmgMin = 4500,
                DmgMax = 6000,
                Xp = 25600,
                Honor = 128,
                Credits = 204800,
                Uridium = 64,
                CargoP = 400,
                CargoE = 400,
                CargoT = 400,
                CargoPd = 64,
                CargoDu = 64,
                CargoPr = 8,
                CargoXe = 0
            },

            ["-=[ Boss Lordakium ]=-"] = new NpcBalance2010
            {
                Hp = 600000,
                Shield = 400000,
                Speed = 200,
                DmgMin = 6000,
                DmgMax = 8000,
                Xp = 51200,
                Honor = 256,
                Credits = 409600,
                Uridium = 128,
                CargoP = 600,
                CargoE = 600,
                CargoT = 600,
                CargoPd = 128,
                CargoDu = 128,
                CargoPr = 16,
                CargoXe = 2
            },

            ["-=[ Boss Kristallin ]=-"] = new NpcBalance2010
            {
                Hp = 100000,
                Shield = 80000,
                Speed = 340,
                DmgMin = 1800,
                DmgMax = 2400,
                Xp = 12800,
                Honor = 64,
                Credits = 25600,
                Uridium = 32,
                CargoP = 200,
                CargoE = 200,
                CargoT = 200,
                CargoPd = 32,
                CargoDu = 32,
                CargoPr = 2,
                CargoXe = 0
            },

            ["-=[ Boss Kristallon ]=-"] = new NpcBalance2010
            {
                Hp = 800000,
                Shield = 600000,
                Speed = 250,
                DmgMin = 7500,
                DmgMax = 10000,
                Xp = 102400,
                Honor = 512,
                Credits = 819200,
                Uridium = 256,
                CargoP = 600,
                CargoE = 600,
                CargoT = 600,
                CargoPd = 256,
                CargoDu = 256,
                CargoPr = 32,
                CargoXe = 0
            },

            ["-=[ Boss StreuneR ]=-"] = new NpcBalance2010
            {
                Hp = 40000,
                Shield = 20000,
                Speed = 200,
                DmgMin = 700,
                DmgMax = 1000,
                Xp = 6400,
                Honor = 32,
                Credits = 12800,
                Uridium = 16,
                CargoP = 160,
                CargoE = 160,
                CargoT = 160,
                CargoPd = 16,
                CargoDu = 16,
                CargoPr = 0,
                CargoXe = 0
            },
        };

        private static readonly object DmgRandLock = new object();
        private static readonly Random DmgRand = new Random();

        private const int LEGACY_ATTACK_PERIOD_MS = 1250;
        private const int ATTACK_GUARD_SLACK_MS = 50;

        private static readonly Dictionary<string, int> FlashAttackPeriodByNpcName = new Dictionary<string, int>(StringComparer.Ordinal)
        {
            ["-=[ Streuner ]=-"] = 400,
            ["-=[ Boss Streuner ]=-"] = 400,
            ["-=[ StreuneR ]=-"] = 400,
            ["-=[ Boss StreuneR ]=-"] = 400,

            ["-=[ Devolarium ]=-"] = LEGACY_ATTACK_PERIOD_MS,
            ["-=[ Boss Devolarium ]=-"] = LEGACY_ATTACK_PERIOD_MS,
            ["-=[ Sibelon ]=-"] = LEGACY_ATTACK_PERIOD_MS,
            ["-=[ Boss Sibelon ]=-"] = LEGACY_ATTACK_PERIOD_MS,

            ["-=[ Lordakia ]=-"] = 1000,
            ["-=[ Boss Lordakia ]=-"] = 1000,
            ["-=[ Saimon ]=-"] = 1000,
            ["-=[ Boss Saimon ]=-"] = 1000,
            ["-=[ Sibelonit ]=-"] = 1000,
            ["-=[ Boss Sibelonit ]=-"] = 1000,
            ["-=[ Lordakium ]=-"] = 1000,
            ["-=[ Boss Lordakium ]=-"] = 1000,
            ["-=[ Protegit ]=-"] = 1000,

            ["-=[ Kristallin ]=-"] = 2000,
            ["-=[ Boss Kristallin ]=-"] = 2000,
            ["-=[ Kristallon ]=-"] = 2000,
            ["-=[ Boss Kristallon ]=-"] = 2000,
        };

        public static int ResolveAttackPeriodMs(string npcName)
        {
            int periodMs;
            if (!string.IsNullOrEmpty(npcName) && FlashAttackPeriodByNpcName.TryGetValue(npcName, out periodMs) && periodMs > 0)
                return periodMs;

            string sourceName;
            int multiplier;
            if (TryGetDerivedBalanceSource(npcName, out sourceName, out multiplier)
                && FlashAttackPeriodByNpcName.TryGetValue(sourceName, out periodMs)
                && periodMs > 0)
                return periodMs;

            return LEGACY_ATTACK_PERIOD_MS;
        }

        public static int ResolveAttackGuardCooldownMs(string npcName)
        {
            int periodMs = ResolveAttackPeriodMs(npcName);
            return Math.Max(50, periodMs - ATTACK_GUARD_SLACK_MS);
        }

        public int GetAttackPeriodMs()
        {
            return Invasion.GetNpcAttackPeriodMs(this, ResolveAttackPeriodMs(this.mName));
        }

        public int GetAttackGuardCooldownMs()
        {
            return Invasion.GetNpcAttackGuardCooldownMs(this, ResolveAttackGuardCooldownMs(this.mName));
        }

        private void ApplyBalance2010IfExists()
        {
            NpcBalance2010 bal;
            int multiplier = 1;

            if (!Balance2010.TryGetValue(this.mName, out bal))
            {
                string sourceName;
                if (!TryGetDerivedBalanceSource(this.mName, out sourceName, out multiplier) || !Balance2010.TryGetValue(sourceName, out bal))
                    return;
            }

            this.mShipMaxHp = bal.Hp * multiplier;
            this.mShipHp = this.mShipMaxHp;

            this.mShipMaxShield = bal.Shield * multiplier;
            this.mShipShield = this.mShipMaxShield;

            if (bal.Speed > 0)
                this.mShipSpeed = bal.Speed;

            this.Credits = bal.Credits * multiplier;
            this.Uridium = bal.Uridium * multiplier;
            this.ExperienceReward = bal.Xp * multiplier;
            this.HonorReward = bal.Honor * multiplier;

            this.DamageMin = bal.DmgMin * multiplier;
            this.DamageMax = bal.DmgMax * multiplier;

            this.Damages = (bal.DmgMin + bal.DmgMax) / 2;
            this.Damages *= multiplier;

            this.CargoPrometium = bal.CargoP * multiplier;
            this.CargoEndurium = bal.CargoE * multiplier;
            this.CargoTerbium = bal.CargoT * multiplier;

            this.CargoPrometid = bal.CargoPd * multiplier;
            this.CargoDuranium = bal.CargoDu * multiplier;
            this.CargoPromerium = bal.CargoPr * multiplier;
            this.CargoXenomit = bal.CargoXe * multiplier;

            this.CargoPalladium = 0;
            this.mHasConfiguredCargoDrop = true;
        }

        private static bool TryGetDerivedBalanceSource(string npcName, out string sourceName, out int multiplier)
        {
            sourceName = null;
            multiplier = 1;

            switch (npcName)
            {
                case "-=[ Uber Streuner ]=-":
                    sourceName = "-=[ Streuner ]=-";
                    multiplier = 3;
                    break;
                case "-=[ Uber Lordakia ]=-":
                    sourceName = "-=[ Lordakia ]=-";
                    multiplier = 3;
                    break;
                case "-=[ Uber Saimon ]=-":
                    sourceName = "-=[ Saimon ]=-";
                    multiplier = 3;
                    break;
                case "-=[ Uber Mordon ]=-":
                    sourceName = "-=[ Mordon ]=-";
                    multiplier = 3;
                    break;
                case "-=[ Uber Devolarium ]=-":
                    sourceName = "-=[ Devolarium ]=-";
                    multiplier = 3;
                    break;
                case "-=[ Uber Sibelon ]=-":
                    sourceName = "-=[ Sibelon ]=-";
                    multiplier = 3;
                    break;
                case "-=[ Uber Sibelonit ]=-":
                    sourceName = "-=[ Sibelonit ]=-";
                    multiplier = 3;
                    break;
                case "-=[ Uber Lordakium ]=-":
                    sourceName = "-=[ Lordakium ]=-";
                    multiplier = 3;
                    break;
                case "-=[ Uber Kristallin ]=-":
                    sourceName = "-=[ Kristallin ]=-";
                    multiplier = 3;
                    break;
                case "-=[ Uber Kristallon ]=-":
                    sourceName = "-=[ Kristallon ]=-";
                    multiplier = 3;
                    break;
                case "-=[ Uber StreuneR ]=-":
                    sourceName = "-=[ StreuneR ]=-";
                    multiplier = 3;
                    break;
                case "-=[ Boss Protegit ]=-":
                    sourceName = "-=[ Protegit ]=-";
                    multiplier = 3;
                    break;
            }

            return sourceName != null;
        }

        private void ApplyGalaxyGateMultiplierIfNeeded()
        {
            if (!GalaxyGateWaveService.IsGateMap(this.mMapId))
                return;

            int gateId = GalaxyGateWaveService.GateIdFromMap(this.mMapId);

            int mult = 1;
            if (gateId == 2) mult = 2;
            else if (gateId == 3) mult = 3;

            if (mult <= 1)
                return;

            this.mShipMaxHp *= mult;
            this.mShipHp = this.mShipMaxHp;

            this.mShipMaxShield *= mult;
            this.mShipShield = this.mShipMaxShield;

            this.DamageMin *= mult;
            this.DamageMax *= mult;

            if (this.DamageMin > 0 || this.DamageMax > 0)
                this.Damages = (this.DamageMin + this.DamageMax) / 2;
            else
                this.Damages *= mult;

            this.Credits *= mult;
            this.Uridium *= mult;
            this.ExperienceReward *= mult;
            this.HonorReward *= mult;

            this.CargoPrometium *= mult;
            this.CargoEndurium *= mult;
            this.CargoTerbium *= mult;
            this.CargoPrometid *= mult;
            this.CargoDuranium *= mult;
            this.CargoPromerium *= mult;
            this.CargoXenomit *= mult;
            this.CargoPalladium *= mult;
        }

        private void ApplyMap29BossCubikonRewardBalanceIfNeeded()
        {
            if (!IsMap29BossCubikon())
                return;

            this.ExperienceReward = 2048000;
            this.HonorReward = 16384;
        }

        private void ApplyMap29BossCubikonCargoBalanceIfNeeded()
        {
            if (!IsMap29BossCubikon())
                return;

            this.CargoPrometium = 1200;
            this.CargoEndurium = 1200;
            this.CargoTerbium = 1200;
            this.CargoPrometid = 2048;
            this.CargoDuranium = 2048;
            this.CargoPromerium = 872;
            this.CargoXenomit = 480;
            this.CargoPalladium = 0;
            this.mHasConfiguredCargoDrop = true;
        }

        public Npc(
            int Id,
            string Name,
            int MapId,
            int LocX,
            int LocY,
            int ShipId,
            int ShipHp,
            int ShipMaxHp,
            int ShipShield,
            int ShipMaxShield,
            int ShipSpeed,
            int nCredits,
            int nUridium,
            int nFactionId = 0,
            int nFatLasers = 0,
            int nShieldMechanics = 0,
            string nClanTag = "",
            int nIsClanMember = 0,
            int nRank = 0,
            int nGalaxyGatesRings = 0,
            int nDrones = 0,
            int nNpcPoints = 0,
            int nDamages = 0)
        {
            this.mId = Id;
            this.mName = Name;
            this.mMapId = MapId;

            this.mLocX = LocX;
            this.mLocY = LocY;

            this.mNewLocX = this.mLocX;
            this.mNewLocY = this.mLocY;

            this.mShipId = ShipId;
            this.mShipHp = ShipHp;
            this.mShipMaxHp = ShipMaxHp;
            this.mShipShield = ShipShield;
            this.mShipMaxShield = ShipMaxShield;
            this.mShipSpeed = ShipSpeed;

            this.Credits = nCredits;
            this.Uridium = nUridium;

            this.FactionId = nFactionId;
            this.FatLasers = nFatLasers;
            this.ShieldMechanics = nShieldMechanics;

            this.ClanTag = nClanTag;
            this.IsClanMember = nIsClanMember;
            this.Rank = nRank;
            this.GalaxyGatesRings = nGalaxyGatesRings;
            this.Drones = nDrones;

            this.NpcPoints = nNpcPoints;
            this.Damages = nDamages;

            this.ExperienceReward = 0;
            this.HonorReward = 0;

            this.DamageMin = 0;
            this.DamageMax = 0;

            this.CargoPrometium = 0;
            this.CargoEndurium = 0;
            this.CargoTerbium = 0;

            this.CargoPalladium = 0;

            this.CargoPrometid = 0;
            this.CargoDuranium = 0;
            this.CargoPromerium = 0;
            this.CargoXenomit = 0;

            ApplyBalance2010IfExists();
            ApplyGalaxyGateMultiplierIfNeeded();
            ApplyMap29BossCubikonRewardBalanceIfNeeded();
            ApplyMap29BossCubikonCargoBalanceIfNeeded();
        }

        private bool IsSessionValidOnMap(Session s)
        {
            return s != null
                && s.CharacterInfo != null
                && !s.CharacterInfo.Destroy
                && s.CharacterInfo.MapId == this.MapId;
        }

        private bool IsOwnerOrGroupMate(Session ownerSession, int characterId)
        {
            if (characterId <= 0) return false;
            if (ownerSession == null || ownerSession.CharacterInfo == null) return false;

            if (ownerSession.CharacterId == characterId)
                return true;

            try
            {
                if (ownerSession.CharacterInfo.Members == null)
                    return false;

                foreach (int memberId in ownerSession.CharacterInfo.Members.Keys)
                {
                    if (memberId == characterId)
                        return true;
                }
            }
            catch { }

            return false;
        }

        private void RemoveOwnerQueueEntry(int characterId)
        {
            if (characterId <= 0)
                return;

            lock (this.mRewardOwnerQueueSync)
            {
                this.mRewardOwnerQueue.RemoveAll(id => id == characterId);
            }
        }

        private void EnqueueOwnerCandidate(int characterId)
        {
            if (characterId <= 0)
                return;

            lock (this.mRewardOwnerQueueSync)
            {
                if (characterId == this.mRewardOwnerId)
                    return;

                for (int i = 0; i < this.mRewardOwnerQueue.Count; i++)
                {
                    if (this.mRewardOwnerQueue[i] == characterId)
                        return;
                }

                this.mRewardOwnerQueue.Add(characterId);
            }
        }

        private int DequeueNextOwnerCandidate()
        {
            lock (this.mRewardOwnerQueueSync)
            {
                while (this.mRewardOwnerQueue.Count > 0)
                {
                    int nextOwnerId = this.mRewardOwnerQueue[0];
                    this.mRewardOwnerQueue.RemoveAt(0);

                    if (nextOwnerId <= 0)
                        continue;

                    if (nextOwnerId == this.mRewardOwnerId)
                        continue;

                    Session nextOwnerSession = SessionManager.GetSessionByCharacterId(nextOwnerId);
                    if (!IsSessionValidOnMap(nextOwnerSession))
                        continue;

                    return nextOwnerId;
                }
            }

            return 0;
        }

        private void BroadcastUnownedVisuals()
        {
            MapInstance instance = MapManager.GetInstanceByMapId(this.MapId);
            if (instance == null) return;

            foreach (MapActor actor in instance.GetUserActorSnapshot())
            {
                if (actor.Type != MapActorType.UserCharacter) continue;

                Session session = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (session == null || session.CharacterInfo == null) continue;

                if (session.CharacterInfo.SelectedPlayer != this.Id) continue;

                session.SendData(PacketComposer.Compose("n", "USH|" + this.Id));
            }
        }

        private void BroadcastOwnerVisuals(int newOwnerId)
        {
            if (newOwnerId <= 0)
            {
                BroadcastUnownedVisuals();
                return;
            }

            MapInstance instance = MapManager.GetInstanceByMapId(this.MapId);
            if (instance == null) return;

            foreach (MapActor actor in instance.GetUserActorSnapshot())
            {
                if (actor.Type != MapActorType.UserCharacter) continue;

                Session session = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (session == null || session.CharacterInfo == null) continue;

                if (session.CharacterInfo.SelectedPlayer != this.Id) continue;

                if (session.CharacterId == newOwnerId)
                    session.SendData(PacketComposer.Compose("n", "USH|" + this.Id));
                else
                    session.SendData(PacketComposer.Compose("n", "LSH|" + this.Id + "|" + newOwnerId));
            }
        }

        private void EnsureDamageEntry(int characterId)
        {
            if (characterId <= 0)
                return;

            if (!this.Attackers.ContainsKey(characterId))
                this.Attackers.Add(characterId, 0);
        }

        private int GetTrackedDamage(int characterId)
        {
            if (characterId <= 0 || !this.Attackers.ContainsKey(characterId))
                return 0;

            try
            {
                ConcurrentDictionary<int, int> attackers = (ConcurrentDictionary<int, int>)this.Attackers;
                int tracked;
                if (attackers.TryGetValue(characterId, out tracked))
                    return tracked;
            }
            catch { }

            return 0;
        }

        private void AddDamageForAttacker(int characterId, int damages)
        {
            if (characterId <= 0)
                return;

            EnsureDamageEntry(characterId);

            ConcurrentDictionary<int, int> attackers = (ConcurrentDictionary<int, int>)this.Attackers;
            attackers[characterId] = attackers[characterId] + Math.Max(0, damages);
        }

        private void EnsureOwnerGroupEntries(Session ownerSession)
        {
            if (ownerSession == null || ownerSession.CharacterInfo == null)
                return;

            try
            {
                if (ownerSession.CharacterInfo.Members != null)
                {
                    foreach (int memberId in ownerSession.CharacterInfo.Members.Keys)
                    {
                        EnsureDamageEntry(memberId);
                    }
                }
            }
            catch { }
        }

        private void ResetOwnerClaim(bool preserveAttackers)
        {
            this.mRewardOwnerId = 0;
            this.mRewardOwnerLastHit = 0.0;
            this.LastAttackByAttackerReceived = 0.0;

            if (!preserveAttackers)
                this.Attackers.Clear();

            BroadcastUnownedVisuals();
        }

        private void SetNewOwner(int newOwnerId, int initialDamage)
        {
            if (newOwnerId <= 0)
                return;

            double now = UnixTimestamp.GetCurrent();

            this.mRewardOwnerId = newOwnerId;
            this.mRewardOwnerLastHit = now;
            this.LastAttackByAttackerReceived = now;

            RemoveOwnerQueueEntry(newOwnerId);

            EnsureDamageEntry(newOwnerId);

            ConcurrentDictionary<int, int> attackers = (ConcurrentDictionary<int, int>)this.Attackers;
            int existingDamage = 0;
            attackers.TryGetValue(newOwnerId, out existingDamage);
            attackers[newOwnerId] = Math.Max(existingDamage, Math.Max(0, initialDamage));

            Session ownerSession = SessionManager.GetSessionByCharacterId(newOwnerId);
            EnsureOwnerGroupEntries(ownerSession);

            BroadcastOwnerVisuals(newOwnerId);
        }

        public void RefreshOwnerClaimState()
        {
            if (this.IsDestroying)
                return;

            if (this.mRewardOwnerId <= 0)
                return;

            double now = UnixTimestamp.GetCurrent();
            Session ownerSession = SessionManager.GetSessionByCharacterId(this.mRewardOwnerId);
            bool ownerValid = IsSessionValidOnMap(ownerSession);
            bool stale = !ownerValid || (now - this.mRewardOwnerLastHit >= CLAIM_TIMEOUT_SECONDS);

            if (!stale)
                return;

            int nextOwnerId = DequeueNextOwnerCandidate();
            if (nextOwnerId > 0)
                SetNewOwner(nextOwnerId, GetTrackedDamage(nextOwnerId));
            else
                ResetOwnerClaim(UsesCubikonRewardModel());
        }

        private bool IsMap29BossCubikon()
        {
            return this.mMapId == 29 && this.mName == "-=[ Boss Cubikon ]=-";
        }

        private bool UsesCubikonRewardModel()
        {
            return this.ShipId == 80 || IsMap29BossCubikon();
        }

        public void UpdateAttackers(int attacker, int damages)
        {
            if (this.IsDestroying || attacker <= 0)
                return;

            double now = UnixTimestamp.GetCurrent();
            bool isCubikon = UsesCubikonRewardModel();
            bool isAggressiveNpc = (this.ParentNpcId == 0 && !isCubikon && NpcAI.IsAggressiveNpcName(this.Name));

            this.LastAttackReceived = now;
            this.mLastAggroTick = now;
            RegisterNpcDamageReceived(damages);

            RefreshOwnerClaimState();

            AddDamageForAttacker(attacker, damages);

            if (this.mRewardOwnerId <= 0)
            {
                int queuedOwnerId = DequeueNextOwnerCandidate();
                if (queuedOwnerId > 0 && queuedOwnerId != attacker)
                    SetNewOwner(queuedOwnerId, GetTrackedDamage(queuedOwnerId));
                else
                    SetNewOwner(attacker, GetTrackedDamage(attacker));
            }

            int ownerId = this.mRewardOwnerId;
            Session ownerSession = (ownerId > 0) ? SessionManager.GetSessionByCharacterId(ownerId) : null;
            bool ownerValid = IsSessionValidOnMap(ownerSession);

            if (!ownerValid)
            {
                int fallbackOwnerId = DequeueNextOwnerCandidate();
                if (fallbackOwnerId > 0)
                {
                    SetNewOwner(fallbackOwnerId, GetTrackedDamage(fallbackOwnerId));
                    ownerId = this.mRewardOwnerId;
                    ownerSession = (ownerId > 0) ? SessionManager.GetSessionByCharacterId(ownerId) : null;
                    ownerValid = IsSessionValidOnMap(ownerSession);
                }
            }

            if (ownerId > 0 && attacker != ownerId)
                EnqueueOwnerCandidate(attacker);

            if (attacker == ownerId)
            {
                this.mRewardOwnerLastHit = now;
                this.LastAttackByAttackerReceived = now;
            }

            if (!isCubikon && ownerValid)
                EnsureOwnerGroupEntries(ownerSession);

            if (isCubikon)
            {
                MapInstance instance = MapManager.GetInstanceByMapId(this.MapId);
                if (instance != null)
                {
                    foreach (int minionRefId in this.SpawnedMinions.Keys)
                    {
                        if (instance.GetActorByReferenceId(minionRefId, MapActorType.AiBot) == null)
                        {
                            byte ignored;
                            this.SpawnedMinions.TryRemove(minionRefId, out ignored);
                        }
                    }

                    const int MAX_MINIONS = 20;
                    const int WAVE_SIZE = 4;
                    const double WAVE_INTERVAL_SECONDS = 1.0;

                    int minionCount = this.SpawnedMinions.Count;
                    if (minionCount < MAX_MINIONS && (now - this.CubikonLastSpawnTick) >= WAVE_INTERVAL_SECONDS)
                    {
                        this.CubikonLastSpawnTick = now;

                        int toSpawn = MAX_MINIONS - minionCount;
                        if (toSpawn > WAVE_SIZE) toSpawn = WAVE_SIZE;

                        int spawnTargetId = (this.mRewardOwnerId > 0) ? this.mRewardOwnerId : attacker;

                        for (int k = 0; k < toSpawn; k++)
                        {
                            int offsetX = NpcAI.RandomPos.Next(-600, 600);
                            int offsetY = NpcAI.RandomPos.Next(-600, 600);
                            bool spawnBossProtegit = IsMap29BossCubikon();

                            Npc protegit = NpcManager.CreateNewInstance(
                                spawnBossProtegit ? "-=[ Boss Protegit ]=-" : "-=[ Protegit ]=-",
                                this.MapId,
                                this.LocX + offsetX,
                                this.LocY + offsetY,
                                81,
                                0, 0, 0, 0, 0,
                                0, 0,
                                0, 0, 0,
                                "",
                                0, 0, 0, 0,
                                spawnBossProtegit ? 45 : 15,
                                3000
                            );

                            protegit.ParentNpcId = this.Id;
                            protegit.DespawnAt = 0.0;
                            protegit.MinionLastRetargetTick = 0.0;

                            instance.AddNpcToMap(protegit);
                            NpcAI.NpcToAdd.Add(protegit);

                            if (spawnTargetId > 0)
                                protegit.LockTarget(spawnTargetId);

                            this.SpawnedMinions.TryAdd(protegit.Id, 0);
                        }
                    }
                }

                return;
            }

            if (isAggressiveNpc && ownerValid && ownerId > 0 && this.TargetId != ownerId)
            {
                if (NpcAI.IsValidAggroTarget(ownerSession, this.MapId))
                    this.LockTarget(ownerId);
            }
        }

        private void DisposeRespawnDelayTimer()
        {
            Timer timer = this.mRespawnDelayTimer;
            if (timer != null)
            {
                this.mRespawnDelayTimer = null;
                timer.Dispose();
                --TimerManager.TimerRunning;
            }
        }

        private void ScheduleDelayedRespawn()
        {
            lock (this.mRespawnDelaySync)
            {
                DisposeRespawnDelayTimer();
                this.mRespawnDelayTimer = new Timer(new TimerCallback(this.CompleteDelayedRespawn), null, NPC_RESPAWN_VISUAL_DELAY_MS, Timeout.Infinite);
                ++TimerManager.TimerRunning;
            }
        }

        private void CompleteDelayedRespawn(object state)
        {
            try
            {
                lock (this.mRespawnDelaySync)
                {
                    DisposeRespawnDelayTimer();
                    if (!this.Respawn || !this.IsDestroying)
                        return;

                    CompleteRespawnCycle();
                }
            }
            catch
            {
            }
        }

        private void CompleteRespawnCycle()
        {
            this.mSpawnSeq++;

            this.SpawnedMinions.Clear();
            this.Attackers.Clear();
            lock (this.mRewardOwnerQueueSync)
            {
                this.mRewardOwnerQueue.Clear();
            }
            this.mRewardOwnerId = 0;
            this.mRewardOwnerLastHit = 0.0;
            this.LastAttackByAttackerReceived = 0.0;

            this.TargetId = 0;
            this.IsAttacking = false;

            this.IsMoving = false;

            int spawnX;
            int spawnY;
            if (NpcAI.IsMap45BossCubikon(this.Name, this.MapId))
                NpcAI.GetMap45BossCubikonPosition(out spawnX, out spawnY);
            else
                NpcAI.GetRandomNpcPosition(this.MapId, out spawnX, out spawnY);

            this.LocX = spawnX;
            this.LocY = spawnY;

            this.NewLocX = this.LocX;
            this.NewLocY = this.LocY;

            this.ShipHp = this.ShipMaxHp;
            this.ShipShield = this.ShipMaxShield;

            this.IsDestroying = false;

            MapInstance map = MapManager.GetInstanceByMapId(this.MapId);
            if (map != null)
            {
                MapActor actor = map.GetActorByReferenceId(this.Id, MapActorType.AiBot);
                if (actor != null)
                    ShipMovement.SendNpcLifecycleCreateToVisibleSessions(map, actor, true);
            }

            NpcAI.SendMap45BossCubikonMarker(this);
        }

        private static void RemoveNpcFromVisibleSessions(MapInstance map, Npc npc)
        {
            if (map == null || npc == null)
                return;

            foreach (MapActor mapActor in map.GetUserActorSnapshot())
            {
                if (mapActor == null || mapActor.Type != MapActorType.UserCharacter || mapActor.ReferenceSessionId <= 0)
                    continue;

                Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                if (sessionById == null || sessionById.CharacterInfo == null)
                    continue;

                if (!sessionById.CharacterInfo.NpcInRange.Contains(npc.Id))
                    continue;

                if (sessionById.CharacterInfo.SelectedPlayer == npc.Id)
                    Fight.StopLaser(sessionById, null);

                sessionById.CharacterInfo.NpcInRange.Remove(npc.Id);
                sessionById.SendData(PacketComposer.Compose("R", npc.Id.ToString()));
            }
        }

        private void CleanupMap45BossProtegits(MapInstance currentMap)
        {
            if (currentMap == null)
            {
                this.SpawnedMinions.Clear();
                return;
            }

            foreach (int minionId in this.SpawnedMinions.Keys)
            {
                MapActor minionActor = currentMap.GetActorByReferenceId(minionId, MapActorType.AiBot);
                if (minionActor == null || !(minionActor.ReferenceObject is Npc))
                    continue;

                Npc minionNpc = (Npc)minionActor.ReferenceObject;
                minionNpc.StopNpcAttack();
                minionNpc.StopMovementAtCurrentPosition();
                minionNpc.TargetId = 0;
                minionNpc.IsAttacking = false;
                minionNpc.DespawnAt = 0.0;
                minionNpc.IsDestroying = true;
                RemoveNpcFromVisibleSessions(currentMap, minionNpc);
                currentMap.KickNpc(minionActor.Id);
                NpcAI.NpcToRemove.Add(minionNpc);
            }

            this.SpawnedMinions.Clear();
        }

        public void Destroy(MapInstance map)
        {
            if (this.Attackers == null || this.IsDestroying)
                return;

            this.IsDestroying = true;

            if (map != null)
                Fight.BroadcastLockIntentClearForTarget(map, this.Id);

            GalaxyGateWaveService.OnNpcDestroyed(this.MapId, this.Id);

            if (UsesCubikonRewardModel())
            {
                MapInstance currentMap = MapManager.GetInstanceByMapId(this.MapId);
                if (IsMap29BossCubikon())
                {
                    CleanupMap45BossProtegits(currentMap);
                }
                else if (currentMap != null)
                {
                    double despawnAt = UnixTimestamp.GetCurrent() + 3.0;

                    foreach (int minionId in this.SpawnedMinions.Keys)
                    {
                        MapActor minionActor = currentMap.GetActorByReferenceId(minionId, MapActorType.AiBot);
                        if (minionActor != null && minionActor.ReferenceObject is Npc)
                        {
                            Npc minionNpc = (Npc)minionActor.ReferenceObject;

                            if (minionNpc.DespawnAt <= 0.0)
                                minionNpc.DespawnAt = despawnAt;

                            minionNpc.TargetId = 0;
                            minionNpc.IsAttacking = false;
                        }
                    }
                }

                this.SpawnedMinions.Clear();
            }

            NpcAI.HideMap45BossCubikonMarker(this);


            try
            {
                StopNpcAttack();

                ServerMessage Message1 = PacketComposer.Compose("K", this.Id.ToString());
                map.BroadcastMessageInRange(Message1, this.Id, false);

                foreach (MapActor mapActor in map.GetUserActorSnapshot())
                {
                    if (mapActor.Type == MapActorType.UserCharacter && mapActor.ReferenceSessionId > 0)
                    {
                        Session sessionById = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                        if (sessionById != null
                            && sessionById.CharacterInfo != null
                            && sessionById.CharacterInfo.NpcInRange.Contains(this.Id))
                        {
                            if (sessionById.CharacterInfo.SelectedPlayer == this.Id)
                            {
                                Fight.StopLaser(sessionById, null);
                            }

                            sessionById.CharacterInfo.NpcInRange.Remove(this.Id);
                            sessionById.SendData(PacketComposer.Compose("R", this.Id.ToString()));
                        }
                    }
                }
            }
            catch
            {
            }

            TitleService.OnNpcDestroyed(this);

            if (Invasion.HandleNpcDestroyed(this, map))
            {
                StopNpcAttack();

                this.LocX = -100;
                this.LocY = -100;
                this.NewLocX = -100;
                this.NewLocY = -100;

                this.TargetId = 0;
                this.IsAttacking = false;

                if (this.PathFinder != null)
                {
                    this.PathFinder.Dispose();
                    this.PathFinder = null;
                    --TimerManager.TimerRunning;
                }

                this.IsMoving = false;

                if (this.Respawn)
                {
                    ScheduleDelayedRespawn();
                }
                else
                {
                    if (map != null)
                    {
                        MapActor actorByReferenceId = map.GetActorByReferenceId(this.Id, MapActorType.AiBot);
                        if (actorByReferenceId != null)
                            map.KickNpc(actorByReferenceId.Id);
                    }

                    NpcAI.NpcToRemove.Add(this);
                }

                return;
            }

            int ownerId = this.mRewardOwnerId;

            if (ownerId <= 0 && this.Attackers != null && this.Attackers.Count > 0)
            {
                foreach (var kvp in (ConcurrentDictionary<int, int>)this.Attackers)
                {
                    ownerId = kvp.Key;
                    break;
                }
            }

            Session ownerSession = (ownerId > 0) ? SessionManager.GetSessionByCharacterId(ownerId) : null;

            if (!IsSessionValidOnMap(ownerSession))
            {
                int bestId = 0;
                int bestDmg = -1;

                foreach (var kvp in (ConcurrentDictionary<int, int>)this.Attackers)
                {
                    Session s = SessionManager.GetSessionByCharacterId(kvp.Key);
                    if (!IsSessionValidOnMap(s)) continue;

                    if (kvp.Value > bestDmg)
                    {
                        bestDmg = kvp.Value;
                        bestId = kvp.Key;
                    }
                }

                ownerId = bestId;
                ownerSession = (ownerId > 0) ? SessionManager.GetSessionByCharacterId(ownerId) : null;
            }

            bool useSharedDamageRewards = UsesCubikonRewardModel();
            HashSet<int> eligible = new HashSet<int>();

            if (useSharedDamageRewards)
            {
                foreach (var kvp in (ConcurrentDictionary<int, int>)this.Attackers)
                {
                    if (kvp.Value <= 0)
                        continue;

                    Session s = SessionManager.GetSessionByCharacterId(kvp.Key);
                    if (IsSessionValidOnMap(s))
                        eligible.Add(kvp.Key);
                }
            }
            else if (ownerId > 0 && IsSessionValidOnMap(ownerSession))
            {
                eligible.Add(ownerId);

                try
                {
                    if (ownerSession.CharacterInfo.Members != null)
                    {
                        foreach (int memberId in ownerSession.CharacterInfo.Members.Keys)
                        {
                            Session ms = SessionManager.GetSessionByCharacterId(memberId);
                            if (IsSessionValidOnMap(ms))
                                eligible.Add(memberId);
                        }
                    }
                }
                catch { }
            }

            long totalEligibleDamage = 0;
            List<int> rewardCharacterIds = new List<int>();

            if (useSharedDamageRewards)
            {
                foreach (var kvp in (ConcurrentDictionary<int, int>)this.Attackers)
                {
                    if (!eligible.Contains(kvp.Key)) continue;
                    if (kvp.Value <= 0) continue;
                    totalEligibleDamage += kvp.Value;
                    rewardCharacterIds.Add(kvp.Key);
                }
            }
            else
            {
                foreach (int eligibleId in eligible)
                    rewardCharacterIds.Add(eligibleId);
            }

            foreach (int charId in rewardCharacterIds)
            {
                int dmg = GetTrackedDamage(charId);

                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(charId);
                if (!IsSessionValidOnMap(sessionByCharacterId))
                    continue;

                double share;

                if (useSharedDamageRewards)
                {
                    if (totalEligibleDamage <= 0 || dmg <= 0)
                        continue;

                    share = (double)Math.Max(0, dmg) / (double)totalEligibleDamage;
                }
                else
                {
                    if (eligible.Count <= 0)
                        continue;

                    share = 1.0 / (double)eligible.Count;
                }

                if (share <= 0.0)
                    continue;

                int num1 = dmg;
                double num2 = share;
                if (num2 > 1.0) num2 = 1.0;

                int int32_1 = Convert.ToInt32((double)this.Credits * num2);
                int int32_2 = Convert.ToInt32((double)this.Uridium * num2);
                int int32_3 = Convert.ToInt32((double)this.NpcPoints * num2);

                if (HappyHour.Enabled)
                {
                    int32_1 *= 2;
                    int32_2 *= 2;
                    int32_3 *= 2;
                }

                int32_1 *= NPC_KILL_ECONOMY_MULTIPLIER;
                int32_2 *= NPC_KILL_ECONOMY_MULTIPLIER;

                int rankpoints = int32_3;
                if (sessionByCharacterId.CharacterInfo.KillStrek >= 10)
                    int32_3 *= 2;

                int npcPoints = int32_3;

                int xpBase = (this.ExperienceReward > 0) ? this.ExperienceReward : npcPoints;
                int honorBase = (this.HonorReward > 0) ? this.HonorReward : Math.Max(0, npcPoints / 10);

                int xpGain = Convert.ToInt32(xpBase * num2);
                int honorGain = Convert.ToInt32(honorBase * num2);
                int32_1 = sessionByCharacterId.CharacterInfo.ApplyPilotBioAlienCreditBonus(int32_1);
                xpGain = sessionByCharacterId.CharacterInfo.ApplyPilotBioAlienXpBonus(xpGain);
                honorGain = sessionByCharacterId.CharacterInfo.ApplyPilotBioAlienHonorBonus(honorGain);

                bool leveledUp = false;
                bool questProgressChanged = false;
                long perfRewardStart = PerformanceProfiler.Start();
                long perfRewardDbMs = 0L;
                long perfLogDbMs = 0L;
                long perfNpcCountDbMs = 0L;
                long perfQuestMs = 0L;
                long perfTitleMs = 0L;

                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient("NpcReward"))
                {
                    long perfStepStart = PerformanceProfiler.Start();
                    leveledUp = sessionByCharacterId.CharacterInfo.ApplyNpcKillRewardBatch(client, int32_1, int32_2, npcPoints, rankpoints, xpGain, honorGain, 1);
                    perfRewardDbMs += PerformanceProfiler.ElapsedMilliseconds(perfStepStart);

                    string _Message =
                        "You have detroyed " + this.Name + ".<br/>" +
                        "You received " + int32_1 + " credits.<br/>" +
                        "You received " + int32_2 + " uridium.<br/>" +
                        "You received " + npcPoints + " npc point(s).<br/>" +
                        "You received " + rankpoints + " rankpoint(s).<br/>" +
                        "You received " + xpGain + " experience.<br/>" +
                        "You received " + honorGain + " honor.";

                    perfStepStart = PerformanceProfiler.Start();
                    sessionByCharacterId.CharacterInfo.AddLog(client, _Message);
                    perfLogDbMs += PerformanceProfiler.ElapsedMilliseconds(perfStepStart);

                    perfStepStart = PerformanceProfiler.Start();
                    sessionByCharacterId.CharacterInfo.AddNpcCount(client, this.Name);
                    perfNpcCountDbMs += PerformanceProfiler.ElapsedMilliseconds(perfStepStart);
                }

                long perfQuestStart = PerformanceProfiler.Start();
                questProgressChanged = QuestObjectiveProgress.AddNpcKillProgress(sessionByCharacterId.CharacterInfo.Id, this.Name, this.MapId);
                perfQuestMs += PerformanceProfiler.ElapsedMilliseconds(perfQuestStart);

                long perfTitleStart = PerformanceProfiler.Start();
                bool titleProgressChanged = TitleService.TrackNpcKill(sessionByCharacterId, this.Name, this.MapId);
                perfTitleMs += PerformanceProfiler.ElapsedMilliseconds(perfTitleStart);
                PerformanceProfiler.LogNpcReward(this.Name, sessionByCharacterId.CharacterInfo.Id, perfRewardStart, perfRewardDbMs, perfLogDbMs, perfNpcCountDbMs, perfQuestMs, perfTitleMs);

                sessionByCharacterId.SendData(PacketComposer.Compose("A", "STD|Target destroyed."));

                if (questProgressChanged || titleProgressChanged)
                    sessionByCharacterId.SendData(PacketComposer.Compose("QST", "UPD"));

                if (sessionByCharacterId.CharacterInfo.SelectedPlayer == this.Id)
                    Fight.StopLaser(sessionByCharacterId, null);

                if (int32_1 != 0)
                    sessionByCharacterId.SendData(PacketComposer.Compose("y", "CRE|" + (object)int32_1 + "|" + (object)sessionByCharacterId.CharacterInfo.Credits));

                if (int32_2 != 0)
                    sessionByCharacterId.SendData(PacketComposer.Compose("y", "URI|" + (object)int32_2 + "|" + (object)sessionByCharacterId.CharacterInfo.Uridium));

                sessionByCharacterId.SendData(PacketComposer.Compose("A", "STD|You received " + (object)npcPoints + " npc point(s)."));
                sessionByCharacterId.SendData(PacketComposer.Compose("A", "STD|You received " + (object)rankpoints + " rankpoint(s)."));

                long xpTotal = sessionByCharacterId.CharacterInfo.Experience;
                int levelNow = sessionByCharacterId.CharacterInfo.Level;
                sessionByCharacterId.SendData(PacketComposer.Compose("y", $"EP|{xpGain}|{xpTotal}|{levelNow}"));

                long honorTotal = sessionByCharacterId.CharacterInfo.Honor;
                if (honorGain != 0)
                    sessionByCharacterId.SendData(PacketComposer.Compose("y", $"HON|{honorGain}|{honorTotal}"));

                if (leveledUp)
                    sessionByCharacterId.SendData(PacketComposer.Compose("A", $"LUP|{levelNow}|1"));
            }

            StopNpcAttack();
            this.Loot();

            this.LocX = -100;
            this.LocY = -100;
            this.NewLocX = -100;
            this.NewLocY = -100;

            this.TargetId = 0;
            this.IsAttacking = false;

            if (this.PathFinder != null)
            {
                this.PathFinder.Dispose();
                this.PathFinder = null;
                --TimerManager.TimerRunning;
            }

            this.IsMoving = false;

            if (this.Respawn)
            {
                ScheduleDelayedRespawn();
            }
            else
            {
                MapActor actorByReferenceId = map.GetActorByReferenceId(this.Id, MapActorType.AiBot);
                if (actorByReferenceId != null)
                    map.KickNpc(actorByReferenceId.Id);

                NpcAI.NpcToRemove.Add(this);
            }
        }

        public void StopNpcAttack()
        {
            bool hadAttackLock = this.TargetId != 0 || this.IsAttacking || this.AttackTimer != null;
            if (hadAttackLock)
                Invasion.BroadcastInvaderLockClear(this);

            this.TargetId = 0;
            this.IsAttacking = false;
            ClearEmpInterruptedTarget();

            this.mLastDamageTick = 0;
            this.mLastNpcCombatTargetId = 0;
            this.mLastNpcCombatActivityTick = 0.0;
            System.Threading.Volatile.Write(ref this.mAttackInProgress, 0);

            if (this.AttackTimer != null)
            {
                this.AttackTimer.Dispose();
                this.AttackTimer = null;
                --TimerManager.TimerRunning;
            }
        }

        public void SetTargetWithoutAttackTimer(int targetId)
        {
            double now = UnixTimestamp.GetCurrent();
            if (!CanLockTargetAfterEmp(targetId, now))
                return;

            bool hadAttackLock = this.TargetId != 0 || this.IsAttacking || this.AttackTimer != null;
            if (hadAttackLock)
                Invasion.BroadcastInvaderLockClear(this);

            if (this.AttackTimer != null)
            {
                this.AttackTimer.Dispose();
                this.AttackTimer = null;
                --TimerManager.TimerRunning;
            }

            this.StopMovementBeforeAttack();

            this.TargetId = targetId;
            this.IsAttacking = false;
            this.mLastAggroTick = now;
            this.mLastDamageTick = 0;
            System.Threading.Volatile.Write(ref this.mAttackInProgress, 0);
        }

        public void LockTarget(int targetId)
        {
            double now = UnixTimestamp.GetCurrent();
            if (!CanLockTargetAfterEmp(targetId, now))
                return;

            int previousTargetId = this.TargetId;
            bool preserveRecentAttackGuard = previousTargetId == targetId && this.mLastDamageTick != 0;

            if (this.AttackTimer != null)
            {
                this.AttackTimer.Dispose();
                this.AttackTimer = null;
                --TimerManager.TimerRunning;
            }

            this.StopMovementBeforeAttack();

            this.TargetId = targetId;
            this.IsAttacking = true;
            Invasion.BroadcastInvaderLock(this, targetId);

            this.mLastAggroTick = now;

            if (!preserveRecentAttackGuard)
                this.mLastDamageTick = 0;
            System.Threading.Volatile.Write(ref this.mAttackInProgress, 0);

            int attackPeriodMs = this.GetAttackPeriodMs();
            this.AttackTimer = new Timer(new TimerCallback(this.Attack), (object)this, 0, attackPeriodMs);
            ++TimerManager.TimerRunning;
        }

        public void Attack(object Npc)
        {
            if (System.Threading.Interlocked.Exchange(ref this.mAttackInProgress, 1) == 1)
                return;

            try
            {
                if (this.ShipId == 80)
                    return;

                if (this.IsDestroying || this.DespawnAt > 0.0)
                {
                    StopNpcAttack();
                    return;
                }

                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(this.MapId);
                if (instanceByMapId == null)
                {
                    StopNpcAttack();
                    return;
                }

                MapActor ownActor = instanceByMapId.GetActorByReferenceId(this.Id, MapActorType.AiBot);
                if (ownActor == null || !object.ReferenceEquals(ownActor.ReferenceObject, this))
                {
                    StopNpcAttack();
                    return;
                }

                if (this.ParentNpcId > 0 && this.Name == "-=[ Boss Protegit ]=-")
                {
                    MapActor parentActor = instanceByMapId.GetActorByReferenceId(this.ParentNpcId, MapActorType.AiBot);
                    Npc parentNpc = parentActor == null ? null : parentActor.ReferenceObject as Npc;
                    if (parentNpc == null || parentNpc.IsDestroying || parentNpc.ShipHp <= 0)
                    {
                        StopNpcAttack();
                        return;
                    }
                }

                Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(this.TargetId);
                if (sessionByCharacterId == null || sessionByCharacterId.CharacterInfo == null)
                {
                    StopNpcAttack();
                    return;
                }

                if (sessionByCharacterId.CharacterInfo.Destroy || sessionByCharacterId.CharacterInfo.ShipHp <= 0)
                {
                    StopNpcAttack();
                    return;
                }

                if (this.MapId != sessionByCharacterId.CharacterInfo.MapId)
                {
                    StopNpcAttack();
                    return;
                }

                if (!GalaxyGateWaveService.CanNpcAttackSession(this, sessionByCharacterId))
                {
                    StopNpcAttack();
                    return;
                }

                if (IsSessionUnderNpcEmpLockBreak(sessionByCharacterId, UnixTimestamp.GetCurrent()))
                {
                    BreakNpcLockByEmp(sessionByCharacterId.CharacterId);
                    return;
                }

                if (sessionByCharacterId.CharacterInfo.PeaceZone || sessionByCharacterId.CharacterInfo.WarningZone)
                {
                    StopNpcAttack();
                    return;
                }

                int shootRange = Invasion.GetNpcAttackRange(this, this.IsBoss == 1 ? 500 : 460);
                if (!DistanceUtil.IsWithinRangeSquared(sessionByCharacterId.CharacterInfo.LocX, sessionByCharacterId.CharacterInfo.LocY, this.LocX, this.LocY, shootRange))
                    return;

                Invasion.BroadcastInvaderLock(this, sessionByCharacterId.CharacterId);

                int nowTick = Environment.TickCount;
                int attackGuardCooldownMs = this.GetAttackGuardCooldownMs();
                if (this.mLastDamageTick != 0 && unchecked(nowTick - this.mLastDamageTick) < attackGuardCooldownMs)
                    return;
                this.mLastDamageTick = nowTick;

                int ammoType = Invasion.GetNpcLaserPattern(this);

                ServerMessage npcAttackMessage = PacketComposer.Compose("a", this.Id.ToString() + "|" + sessionByCharacterId.CharacterId + "|" + ammoType + "|" + sessionByCharacterId.CharacterInfo.ShieldMechanics + "|" + this.FatLasers);
                if (GalaxyGateWaveService.IsGateMap(this.MapId))
                    sessionByCharacterId.SendData(npcAttackMessage);
                else
                    Fight.SendNpcScopedMessage(instanceByMapId, this, npcAttackMessage, sessionByCharacterId);

                int dmg = 0;

                if (this.DamageMin > 0 && this.DamageMax >= this.DamageMin)
                {
                    lock (DmgRandLock)
                    {
                        dmg = DmgRand.Next(this.DamageMin, this.DamageMax + 1);
                    }
                }
                else
                {
                    lock (DmgRandLock)
                    {
                        dmg = this.Damages + DmgRand.Next(-20, 21);
                    }
                }

                int shieldDmg = Convert.ToInt32((double)dmg * sessionByCharacterId.CharacterInfo.ShieldAbsorption);
                int hpDmg = dmg - shieldDmg;

                if (sessionByCharacterId.CharacterInfo.ShipShield <= 0)
                {
                    sessionByCharacterId.CharacterInfo.ShipShield = 0;
                    hpDmg = dmg;
                    shieldDmg = 0;
                }

                if (sessionByCharacterId.CharacterInfo.ActiveISH)
                {
                    shieldDmg = 0;
                    hpDmg = 0;
                    dmg = 0;
                }

                RegisterNpcDamageDealt(dmg);

                if (sessionByCharacterId.CharacterInfo.IsRepairing)
                {
                    SelectAction.StopRepair(sessionByCharacterId, "Stopped: taking damage");
                }

                if (sessionByCharacterId.CharacterInfo.ShipShield - shieldDmg > 0)
                    sessionByCharacterId.CharacterInfo.ShipShield -= shieldDmg;
                else if (sessionByCharacterId.CharacterInfo.ShipShield - shieldDmg < 0)
                    sessionByCharacterId.CharacterInfo.ShipShield = 0;

                sessionByCharacterId.CharacterInfo.ShipHp -= hpDmg;

                sessionByCharacterId.CharacterInfo.RegisterIncomingAttackActivity();

                ServerMessage npcDamageMessage = PacketComposer.Compose(
                    "Y",
                    "0|" + sessionByCharacterId.CharacterId + "|L|" + sessionByCharacterId.CharacterInfo.ShipHp + "|" + sessionByCharacterId.CharacterInfo.ShipShield + "|" + dmg
                );

                if (GalaxyGateWaveService.IsGateMap(this.MapId))
                {
                    sessionByCharacterId.SendData(npcDamageMessage);
                }
                else
                {
                    foreach (MapActor actor in instanceByMapId.GetUserActorSnapshot())
                    {
                        if (actor.Type != MapActorType.UserCharacter)
                            continue;

                        Session sessionById = SessionManager.GetSessionById(actor.ReferenceSessionId);

                        if (sessionById != null
                            && (sessionById.CharacterInfo.SelectedPlayer == this.TargetId || sessionById.CharacterId == this.TargetId))
                        {
                            sessionById.SendData(npcDamageMessage);
                        }
                    }
                }

                sessionByCharacterId.CharacterInfo.NoFightTimer = 0;

                sessionByCharacterId.CharacterInfo.TouchFightUntilDatabase();

                if (sessionByCharacterId.CharacterInfo.ShipHp > 0 || sessionByCharacterId.CharacterInfo.Destroy)
                    return;

                Fight.KillPlayer(sessionByCharacterId);
                StopNpcAttack();
            }
            finally
            {
                System.Threading.Volatile.Write(ref this.mAttackInProgress, 0);
            }
        }

        private int PalladiumLoot()
        {
            switch (this.mShipId)
            {
                case 113:
                    return 8;
                case 114:
                    return 16;
                case 115:
                    return 100;
                default:
                    return 0;
            }
        }

        private static void TrimNpcCargoBoxesForOwner(MapInstance instanceByMapId, int ownerCharacterId, int keepNewest)
        {
            if (instanceByMapId == null || ownerCharacterId <= 0)
                return;

            List<CargoBox> owned = new List<CargoBox>();

            foreach (KeyValuePair<int, Collectable> kv in instanceByMapId.Info.Collectables)
            {
                CargoBox cb = kv.Value as CargoBox;
                if (cb != null && cb.OwnerCharacterId == ownerCharacterId)
                    owned.Add(cb);
            }

            if (owned.Count <= keepNewest)
                return;

            owned.Sort((a, b) => b.SpawnSequence.CompareTo(a.SpawnSequence));

            for (int i = keepNewest; i < owned.Count; i++)
            {
                int removeId = owned[i].Id;

                if (instanceByMapId.Info.Collectables.ContainsKey(removeId))
                {
                    instanceByMapId.Info.Collectables.Remove(removeId);
                    if (GalaxyGateWaveService.IsGateMap(instanceByMapId.MapId) && ownerCharacterId > 0)
                    {
                        Session ownerSession = SessionManager.GetSessionByCharacterId(ownerCharacterId);
                        if (ownerSession != null)
                            ownerSession.SendData(PacketComposer.Compose("2", string.Concat((object)removeId)));
                    }
                    else
                    {
                        instanceByMapId.BroadcastMessage(PacketComposer.Compose("2", string.Concat((object)removeId)), false);
                    }
                }
            }
        }

        private void Loot()
        {
            Random random = new Random();
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(this.MapId);
            if (instanceByMapId == null)
                return;

            int npcId = this.Id;
            int locX = this.LocX;
            int locY = this.LocY;

            int ownerCharacterId = this.mRewardOwnerId;

            TrimNpcCargoBoxesForOwner(instanceByMapId, ownerCharacterId, 4);

            int boxId = NextNpcCargoBoxId();
            while (instanceByMapId.Info.Collectables.ContainsKey(boxId))
                boxId = NextNpcCargoBoxId();

            CargoBox cargoBox = new CargoBox(boxId, locX, locY, this.MapId);
            cargoBox.OwnerCharacterId = ownerCharacterId;

            if (this.mHasConfiguredCargoDrop)
            {
                cargoBox.Prometium = this.CargoPrometium;
                cargoBox.Endurium = this.CargoEndurium;
                cargoBox.Terbium = this.CargoTerbium;

                cargoBox.Palladium = this.CargoPalladium;

                cargoBox.Prometid = this.CargoPrometid;

                cargoBox.Duranium = this.CargoDuranium;
                cargoBox.Promerium = this.CargoPromerium;
                cargoBox.Xenomit = this.CargoXenomit;
            }
            else
            {
                int num1 = this.ShipMaxHp + this.ShipMaxShield;

                cargoBox.Prometium = num1 / 1500;
                cargoBox.Endurium = num1 / 1500;
                cargoBox.Terbium = num1 / 1500;

                if (this.IsBoss == 1 || this.SharedRewards == 1)
                    cargoBox.Xenomit = num1 / 300000 + 1;

                if (instanceByMapId.MapId == 4 || instanceByMapId.MapId == 8 || instanceByMapId.MapId == 12)
                    cargoBox.Palladium = this.PalladiumLoot();
            }


            instanceByMapId.Info.Collectables.Add(boxId, (Collectable)cargoBox);
            if (GalaxyGateWaveService.IsGateMap(this.MapId) && ownerCharacterId > 0)
            {
                Session ownerSession = SessionManager.GetSessionByCharacterId(ownerCharacterId);
                if (ownerSession != null)
                    ownerSession.SendData(PacketComposer.Compose("c", boxId.ToString() + "|" + (object)1 + "|" + (object)locX + "|" + (object)locY));
            }
            else
            {
                instanceByMapId.BroadcastMessage(PacketComposer.Compose("c", boxId.ToString() + "|" + (object)1 + "|" + (object)locX + "|" + (object)locY), false);
            }

            if (!GalaxyGateWaveService.IsGateMap(this.MapId))
                this.BoxSpawn(random, npcId, instanceByMapId);
        }

        private bool IsClassicBoss()
        {
            if (this.IsBoss != 1)
                return false;

            if (this.Name == "-=[ Boss Cubikon ]=-"
                || this.Name == "-=[ Invader ]=-"
                || this.Name == "-=[ Fast Invader ]=-"
                || this.Name == "-=[ Super Invader ]=-")
            {
                return false;
            }

            return true;
        }

        private void BoxSpawn(Random random, int id, MapInstance instanceByMapId)
        {

            if (instanceByMapId == null)
                return;

            int mapId = instanceByMapId.MapId;

            if (mapId < 17 || mapId > 28)
                return;

            int spawnChancePercent = 0;

            switch (this.Name)
            {
                case "-=[ StreuneR ]=-":
                case "-=[ Boss StreuneR ]=-":
                    spawnChancePercent = 1;
                    break;

                case "-=[ Sibelonit ]=-":
                case "-=[ Boss Sibelonit ]=-":
                    spawnChancePercent = 2;
                    break;

                case "-=[ Kristallin ]=-":
                case "-=[ Boss Kristallin ]=-":
                    spawnChancePercent = 3;
                    break;

                case "-=[ Lordakium ]=-":
                case "-=[ Boss Lordakium ]=-":
                    spawnChancePercent = 4;
                    break;

                case "-=[ Cubikon ]=-":
                case "-=[ Boss Cubikon ]=-":
                    spawnChancePercent = 6;
                    break;

                default:
                    return;
            }

            int roll = random.Next(1, 101);
            if (roll > spawnChancePercent)
                return;

            int X = this.LocX + random.Next(-200, 200);
            int Y = this.LocY + random.Next(-200, 200);

            int boxId = id - 1000;

            Collectable bootyBox = new BootyBox(boxId, X, Y, this.MapId);
            int type = 21;

            if (instanceByMapId.Info.Collectables.ContainsKey(boxId))
            {
                instanceByMapId.Info.Collectables.Remove(boxId);
                instanceByMapId.BroadcastMessage(PacketComposer.Compose("2", string.Concat((object)boxId)), false);
            }

            instanceByMapId.Info.Collectables.Add(boxId, (Collectable)bootyBox);
            instanceByMapId.BroadcastMessage(PacketComposer.Compose("c", boxId.ToString() + "|" + (object)type + "|" + (object)X + "|" + (object)Y), false);
        }
    }
}
