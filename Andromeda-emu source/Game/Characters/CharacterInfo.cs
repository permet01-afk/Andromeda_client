using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Laboratory;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Maps.Collectables;
using OrbitReborn_Emulator.Game.Misc;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Quests;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Threading;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Titles;

namespace OrbitReborn_Emulator.Game.Characters
{
    public class CharacterInfo
    {
        public bool Invincible = false;
        public System.Threading.Timer InvincibilityTimer;
        public CList<PortalInfo> GalaxyGatePortals = new CList<PortalInfo>();

        public CDictionnary<int, PortalInfo> GalaxyGatePortalDestinations = new CDictionnary<int, PortalInfo>();

        public PortalInfo PendingGalaxyGateDestination = null;
        public int PendingGalaxyGateRewardGateId = 0;
        public CList<PortalInfo> GalaxyGateInternalPortals = new CList<PortalInfo>();
        public CDictionnary<int, PortalInfo> GalaxyGateInternalPortalDestinations = new CDictionnary<int, PortalInfo>();

        private bool mCanMove = true;
        private double mLastRSB75 = 0.0;
        private double mLastEMP = 0.0;
        private double mLastDcr250 = 0.0;
        private int mLastRocketShotType = 0;
        private int mInvisibleCooldown = 0;
        private CDictionnary<string, int> mSkillTree = new CDictionnary<string, int>();
        public double MultiplierAgainstNpcs = 1.0;
        public double MultiplierAgainstPlayers = 1.0;
        public double ShieldAbsorption = 0.7;
        public int SmbDamages = 20000;
        public int RepairBotHp = 10000;
        private int mLaserSlots2010 = 0;
        private int mGeneratorSlots2010 = 0;
        private int mExtraSlots2010 = 0;
        public int RckDamages = 1000;
        public int RocketPattern = 0;
        public int ShRegen = 7000;
        private string[] npc_name = new string[11]
{
  "Streuner",
  "Lordakia",
  "Saimon",
  "Mordon",
  "Devolarium",
  "Sibelon",
  "Sibelonit",
  "Lordakium",
  "Kristallin",
  "Kristallon",
  "Cubikon"
};
        private int mId;
        private int mSessionId;
        private string mAuthTicket;
        private string mUsername;
        private string mGameTitle;
        private int mKillStrek;
        private int mPvpRewardGuard;
        private bool mIsMod;
        private bool mIsAdmin;
        private bool mIsInvisibleForAll;
        private Stopwatch mLastMove;
        private int mCheckSpeedHackCounter;
        private int mSpeedHackDetect;
        private int mSpeedHackTotalDetect;
        private int mShipId;
        private int mGGRings;
        private Random mRandomDamage;
        private int mShipCargo;
        private int mShipMaxCargo;
        private const int EXTRA_ID_AUTO_ROCKET_CPU = 20;
        private const int EXTRA_ID_CARGO_COMPRESSOR = 21;
        private const int EXTRA_ID_HELLSTORM_HST1 = 38;
        private const int EXTRA_ID_HELLSTORM_HST2 = 39;

        private bool mHasAutoRocketCpuCfgA = false;
        private bool mHasAutoRocketCpuCfgB = false;
        private bool mHasCargoCompressorCfgA = false;
        private bool mHasCargoCompressorCfgB = false;
        private bool mHasRocketLauncherCpuCfgA = false;
        private bool mHasRocketLauncherCpuCfgB = false;
        private int mRocketLauncherTypeCfgA = 0;
        private int mRocketLauncherTypeCfgB = 0;
        private int mBaseCargo2010 = 0;
        private int mSepromSafeLevel = 0;
        private int mSepromSafeStored = 0;
        private static bool mSepromSafeTableEnsured = false;
        private static readonly object mSepromSafeSyncRoot = new object();
        private static bool mShipSkillCooldownColumnsEnsured = false;
        private static readonly object mShipSkillCooldownSyncRoot = new object();
        private static bool mRuntimeStateColumnsEnsured = false;
        private static readonly object mRuntimeStateSyncRoot = new object();


        private int mOldLocX;
        private int mOldLocY;
        private int mNewLocX;
        private int mNewLocY;
        private int mLocX;
        private int mLocY;
        private int mCurrentPortal;
        private bool mPortalZone;
        private bool mIsMoving;
        private int mMapId;
        private long mCredits;
        private long mUridium;
        public long AmmoLcb10;
        public long AmmoMcb25;
        public long AmmoMcb50;
        public long AmmoUcb100;
        public long AmmoSab50;
        public long AmmoRsb75;

        public long AmmoR310;
        public long AmmoPlt2026;
        public long AmmoPlt2021;
        public long AmmoDcr250;
        public long AmmoHstrm01;
        public long AmmoUbr100;
        public long AmmoEco10;

        public long AmmoSmb01;
        public long AmmoIsh01;
        public long AmmoEmp01;

        public System.Threading.Timer AmmoSyncTimer;
        public System.Threading.Timer ConfigRefreshTimer;
        public HashSet<int> ClientPortalIds = null;
        private int mGrade;
        private int mFactionId;
        private int mClanId;
        private string mClanTag;
        private bool mOnline;
        private int mSelectedPlayer;
        private int mSelectedAmmo;
        private int mSelectedRocket;
        private int mSelectedRocketAuto;
        private int mSelectedLauncherRocket = 7;
        private int mSelectedPlayerRocket;
        private int mSelectedPlayerRocketSpawnSeq;
        private long mRankPoints;
        private int mUserKill;
        private int mNpcKill;
        private long mExperience;
        private long mHonor;
        private bool mDestroy;
        private bool mPeaceZone;
        private bool mTradeZone;
        private bool mAttacking;
        public CList<int> Members;
        public CList<int> InvitationSend;
        public CList<int> InvitationReceive;

        private bool mGroupLeader = false;

        private CList<Session> mAttacked;
        private CList<int> mClanWar;
        private CList<int> mClanAlliance;
        private CList<int> mClanNap;
        private int mNoFightTimer;
        private bool mShieldTwinkleEnabled = false;
        private const int FightUntilDbSeconds = 10;
        private const int FightUntilDbRefreshThresholdSeconds = 5;
        private int mFightUntilDb = 0;
        private readonly object mFightUntilDbSyncLock = new object();
        private readonly object mPrimaryAmmoSyncLock = new object();
        private bool mPrimaryAmmoDirty;
        private long mDbAmmoLcb10;
        private long mDbAmmoMcb25;
        private long mDbAmmoMcb50;
        private long mDbAmmoUcb100;
        private long mDbAmmoSab50;
        private long mDbAmmoRsb75;
        private readonly object mSecondaryAmmoSyncLock = new object();
        private bool mSecondaryAmmoDirty;
        private long mDbAmmoR310;
        private long mDbAmmoPlt2026;
        private long mDbAmmoPlt2021;
        private long mDbAmmoDcr250;
        private long mDbAmmoHstrm01;
        private long mDbAmmoUbr100;
        private long mDbAmmoEco10;
        private long mDbAmmoSmb01;
        private long mDbAmmoIsh01;
        private long mDbAmmoEmp01;
        private int mAmmoSyncClientUpdatePending;
        private int mLaserAttackTickGuard;
        private bool mOutOfRange;
        private int mActiveConfig;
        private int mTmpActiveConfig;
        private bool mWarningZone;
        private double mLastConfigChange;
        private double mLastRocket;
        private double mLastTechSh;
        private double mLastTechHp;
        private double mLastTechEla;
        private double mLastTechEci;
        private double mEnergyLeechUntil;
        private double mLastISH;
        private double mLastSMB;
        private int mSMBLocX;
        private int mSMBLocY;
        private System.Threading.Timer mPathTime;
        private System.Threading.Timer mPathFinding;
        private System.Threading.Timer mWarningZoneTimer;
        private System.Threading.Timer mUpdateMovementTimer;
        private System.Threading.Timer mLaserAttackTimer;
        private System.Threading.Timer mLaserAttackCanTimer;
        private bool mCanLaserAttack;
        private System.Threading.Timer mDisconnectTimer;
        private System.Threading.Timer mRepairTimer;
        private System.Threading.Timer mBattleRepairTimer;
        private const int BoosterExternalPollSeconds = 10;
        private const int BoosterRefreshMinimumDelayMs = 1000;
        private System.Threading.Timer mBoosterRefreshTimer;
        private int mBoosterMaskLast = -1;
        private readonly object mBoosterRefreshLock = new object();
        private int mBattleRepairCount;
        private System.Threading.Timer mEnergyLeechTimer;
        private System.Threading.Timer mPortalJumpTimer;
        private System.Threading.Timer mRocketAttackTimer;
        public System.Threading.Timer SpeedDebuffTimer;
        private bool mIsJumping;
        private double mLastTimeElapsed;
        private bool mIsRepairing;
        private int mDisconnectCounter;
        private int mPathTimeTaken;
        private Settings mSettings;
        private int mShipHp;
        private int mShipMaxHp;
        private CharacterConfig mConfig1;
        private CharacterConfig mConfig2;
        private LabInfos mLabInfos;
        private double mCacheAge;
        CList<int> clist;
        private double mTimestampLastOnline;
        public int FatLasers;
        public int ShieldMechanics;
        public string Drones;
        private int mLevel;
        private int mAttackSpeed;
        private Session mAttacker;
        private double mLastAttackByAttackerReceived;
        private double mLastShieldDamageReceived;
        private int mBootyKeys;
        private int mBoosterHpTime;
        private int mBoosterShdTime;
        private int mBoosterDmgTime;
        private int mBoosterNpcTime;
        private bool mApisBuilt;
        private bool mZeusBuilt;
        public int AutoRocketSkill = 0;
        public int AutoRocketLauncherSkill = 0;
        private int mBlk = 0;
        private int mGroupBoss = 0;
        private int mPvpPoints;
        private bool mActiveAutoRocket = false;
        private double mLastSkillSolace = 0.0;
        private double mLastSkillDiminisher = 0.0;
        private double mLastSkillSpectrum = 0.0;
        private double mLastSkillSentinel = 0.0;
        private double mLastSkillVenom = 0.0;
        private double mLastSkillLightning = 0.0;
        private int mActiveShipSkillType = 0;
        private int mActiveShipSkillTargetId = 0;
        private double mActiveShipSkillUntil = 0.0;
        public System.Threading.Timer ActiveShipSkillTimer;
        public System.Threading.Timer ActiveShipSkillTickTimer;
        public int ActiveShipSkillTicksRemaining = 0;
        private bool mAttackingRepBug;
        private CDictionnary<Session, double> assistAttacker = new CDictionnary<Session, double>();
        private bool mDisableNpc = false;
        private int mPreviousAttacked = 0;
        private double mPreviousDamageTime = 0;
        private string mExtraBooster = "";
        private int mRealFaction;
        private int mRealClan;
        public Timer UpdateGroupTimer;
        public bool IsBeginner = false;
        private int duelPending = 0;
        public CDictionnary<int, double> duelSend = new CDictionnary<int, double>();
        public double LastDuel = 0;

        public int DuelPending
        {
            get
            {
                return this.duelPending;
            }
            set
            {
                this.duelPending = value;
            }
        }

        public int RealClan
        {
            get
            {
                return this.mRealClan;
            }
        }
        public string ExtraBooster
        {
            get
            {
                return this.mExtraBooster;
            }
            set
            {
                this.mExtraBooster = value;
            }
        }
        public int LaserSlots2010 { get { return mLaserSlots2010; } }
        public int GeneratorSlots2010 { get { return mGeneratorSlots2010; } }
        public int ExtraSlots2010 { get { return mExtraSlots2010; } }

        public double PreviousDamageTime
        {
            get
            {
                return this.mPreviousDamageTime;
            }
            set
            {
                this.mPreviousDamageTime = value;
            }
        }

        public int PreviousAttacked
        {
            get
            {
                return this.mPreviousAttacked;
            }
            set
            {
                this.mPreviousAttacked = value;
            }
        }

        public bool DisableNpc
        {
            get
            {
                return this.mDisableNpc;
            }
            set
            {
                this.mDisableNpc = value;
            }
        }
        public bool AttackingRepBug
        {
            get { return this.mAttackingRepBug; }
            set { this.mAttackingRepBug = value; }
        }
        public bool ActiveAutoRocket
        {
            get
            {
                return this.mActiveAutoRocket;
            }
            set
            {
                this.mActiveAutoRocket = value;
            }
        }
        public int PvpPoints
        {
            get
            {
                return this.mPvpPoints;
            }
            set
            {
                this.mPvpPoints = value;
            }
        }
        public bool GroupLeader
        {
            get
            {
                return this.mGroupLeader;
            }
            set
            {
                this.mGroupLeader = value;
            }
        }
        public int GroupBoss
        {
            get
            {
                return this.mGroupBoss;
            }
            set
            {
                this.mGroupBoss = value;
            }
        }
        public int Blk
        {
            get
            {
                return this.mBlk;
            }
            set
            {
                this.mBlk = value;
            }
        }
        public int Id
        {
            get
            {
                return this.mId;
            }
        }

        public int SessionId
        {
            get
            {
                return this.mSessionId;
            }
        }

        public string AuthTicket
        {
            get
            {
                return this.mAuthTicket;
            }
            set
            {
                this.mAuthTicket = value;
            }
        }

        public string Username
        {
            get
            {
                return this.mUsername;
            }
        }

        public string GameTitle
        {
            get
            {
                return this.mGameTitle;
            }
            set
            {
                this.mGameTitle = value;
            }
        }

        public int KillStrek
        {
            get
            {
                return this.mKillStrek;
            }
            set
            {
                this.mKillStrek = value;
            }
        }

        public double LastTimeElapsed
        {
            get
            {
                return this.mLastTimeElapsed;
            }
            set
            {
                this.mLastTimeElapsed = value;
            }
        }

        public Stopwatch LastMove
        {
            get
            {
                return this.mLastMove;
            }
            set
            {
                this.mLastMove = value;
            }
        }

        public int CheckSpeedHackCounter
        {
            get
            {
                return this.mCheckSpeedHackCounter;
            }
            set
            {
                this.mCheckSpeedHackCounter = value;
            }
        }

        public int SpeedHackDetect
        {
            get
            {
                return this.mSpeedHackDetect;
            }
            set
            {
                this.mSpeedHackDetect = value;
            }
        }

        public int SpeedHackTotalDetect
        {
            get
            {
                return this.mSpeedHackTotalDetect;
            }
            set
            {
                this.mSpeedHackTotalDetect = value;
            }
        }

        public bool IsMod
        {
            get
            {
                return this.mIsMod;
            }
            set
            {
                this.mIsMod = value;
            }
        }

        public bool IsAdmin
        {
            get
            {
                return this.mIsAdmin;
            }
            set
            {
                this.mIsAdmin = value;
            }
        }

        public bool IsInvisibleForAll
        {
            get
            {
                return this.mIsInvisibleForAll;
            }
            set
            {
                this.mIsInvisibleForAll = value;
            }
        }

        public bool CanMove
        {
            get
            {
                return this.mCanMove;
            }
            set
            {
                this.mCanMove = value;
            }
        }

        public int ShipId
        {
            get
            {
                return this.mShipId;
            }
        }

        private const double SENTINEL_FORTRESS_SPEED_MULTIPLIER = 0.7;
        private const double LIGHTNING_AFTERBURNER_SPEED_MULTIPLIER = 1.3;

        private double GetActiveShipSkillSpeedMultiplier()
        {
            if (this.mActiveShipSkillUntil <= UnixTimestamp.GetCurrent())
                return 1.0;

            switch (this.mActiveShipSkillType)
            {
                case 4:
                    return SENTINEL_FORTRESS_SPEED_MULTIPLIER;
                case 6:
                    return LIGHTNING_AFTERBURNER_SPEED_MULTIPLIER;
                default:
                    return 1.0;
            }
        }

        private int NormalizeShipSpeedForCurrentSkill(int visibleSpeed)
        {
            double multiplier = this.GetActiveShipSkillSpeedMultiplier();
            if (multiplier <= 0.0 || Math.Abs(multiplier - 1.0) < 0.0001)
                return visibleSpeed;
            return Convert.ToInt32(Math.Round((double)visibleSpeed / multiplier));
        }

        public int ShipSpeed
        {
            get
            {
                double totalSeconds = (DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0)).TotalSeconds;
                int num = this.ActiveConfig != 1 ? this.Config2.ShipSpeed : this.Config1.ShipSpeed;
                if ((double)this.LabInfos.Speed[1] > totalSeconds)
                {
                    if (this.LabInfos.Speed[0] == 12)
                        num += 15;
                    else if (this.LabInfos.Speed[0] == 13)
                        num += 30;
                }

                double multiplier = this.GetActiveShipSkillSpeedMultiplier();
                if (Math.Abs(multiplier - 1.0) >= 0.0001)
                    num = Convert.ToInt32(Math.Round((double)num * multiplier));
                return num;
            }
            set
            {
                int normalizedValue = this.NormalizeShipSpeedForCurrentSkill(value);
                if (this.ActiveConfig == 1)
                    this.Config1.ShipSpeed = normalizedValue;
                else
                    this.Config2.ShipSpeed = normalizedValue;
            }
        }

        public int ShipShield
        {
            get
            {
                if (this.ActiveConfig == 1)
                {
                    if (this.Config1.Shield > this.ShipMaxShield)
                        this.Config1.Shield = this.Config1.MaxShield;
                    return this.Config1.Shield;
                }
                if (this.Config2.Shield > this.ShipMaxShield)
                    this.Config2.Shield = this.Config2.MaxShield;
                return this.Config2.Shield;
            }
            set
            {
                if (this.ActiveConfig == 1)
                    this.Config1.Shield = value;
                else
                    this.Config2.Shield = value;
            }
        }

        public int ShipMaxShield
        {
            get
            {
                double totalSeconds = (DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0)).TotalSeconds;
                int num = this.ActiveConfig != 1 ? this.Config2.MaxShield : this.Config1.MaxShield;
                if ((double)this.LabInfos.Shield[1] <= totalSeconds)
                    return num;
                if (this.LabInfos.Shield[0] == 12)
                    return (int)((double)num * 1.15);
                if (this.LabInfos.Shield[0] == 13)
                    return (int)((double)num * 1.3);
                if (this.LabInfos.Shield[0] == 14)
                    return (int)((double)num * 1.6);
                return num;
            }
            set
            {
                if (this.ActiveConfig == 1)
                    this.Config1.MaxShield = value;
                else
                    this.Config2.MaxShield = value;
            }
        }

        public int ShipHp
        {
            get
            {
                return this.mShipHp;
            }
            set
            {
                this.mShipHp = value;
            }
        }

        public int ShipMaxHp
        {
            get
            {
                return this.mShipMaxHp;
            }
        }

        public int ShipOverhealMaxHp
        {
            get
            {
                if (this.mShipMaxHp <= 0)
                    return 0;

                long max = (long)this.mShipMaxHp * 2L;
                return max > int.MaxValue ? int.MaxValue : (int)max;
            }
        }

        public int GGRings
        {
            get
            {
                return this.mGGRings;
            }
            set
            {
                this.mGGRings = value;
            }
        }

        public LabInfos LabInfos
        {
            get
            {
                return this.mLabInfos;
            }
            set
            {
                this.mLabInfos = value;
            }
        }

        public int MaxDamage
        {
            get
            {
                if (this.ActiveConfig == 1)
                    return this.Config1.MaxDamage;
                return this.Config2.MaxDamage;
            }
            set
            {
                if (this.ActiveConfig == 1)
                    this.Config1.MaxDamage = value;
                else
                    this.Config2.MaxDamage = value;
            }
        }

        public int MinDamage
        {
            get
            {
                if (this.ActiveConfig == 1)
                    return this.Config1.MinDamage;
                return this.Config2.MinDamage;
            }
            set
            {
                if (this.ActiveConfig == 1)
                    this.Config1.MinDamage = value;
                else
                    this.Config2.MinDamage = value;
            }
        }

        public Random RandomDamage
        {
            get
            {
                return this.mRandomDamage;
            }
            set
            {
                this.mRandomDamage = value;
            }
        }

        public int ShipCargo
        {
            get
            {
                return this.mShipCargo;
            }
        }

        public int ShipMaxCargo
        {
            get
            {
                return this.mShipMaxCargo;
            }
        }

        public int SepromSafeLevel
        {
            get
            {
                return this.mSepromSafeLevel;
            }
        }

        public int SepromSafeStored
        {
            get
            {
                return this.mSepromSafeStored;
            }
        }

        public int OldLocX
        {
            get
            {
                return this.mOldLocX;
            }
            set
            {
                this.mOldLocX = value;
            }
        }

        public int OldLocY
        {
            get
            {
                return this.mOldLocY;
            }
            set
            {
                this.mOldLocY = value;
            }
        }

        public int NewLocX
        {
            get
            {
                return this.mNewLocX;
            }
            set
            {
                this.mNewLocX = value;
            }
        }

        public int NewLocY
        {
            get
            {
                return this.mNewLocY;
            }
            set
            {
                this.mNewLocY = value;
            }
        }

        public int LocX
        {
            get
            {
                return this.mLocX;
            }
            set
            {
                this.mLocX = value;
            }
        }

        public int LocY
        {
            get
            {
                return this.mLocY;
            }
            set
            {
                this.mLocY = value;
            }
        }

        public int CurrentPortal
        {
            get
            {
                return this.mCurrentPortal;
            }
            set
            {
                this.mCurrentPortal = value;
            }
        }

        public bool PortalZone
        {
            get
            {
                return this.mPortalZone;
            }
            set
            {
                this.mPortalZone = value;
            }
        }

        public bool IsMoving
        {
            get
            {
                return this.mIsMoving;
            }
            set
            {
                this.mIsMoving = value;
            }
        }

        public int MapId
        {
            get
            {
                return this.mMapId;
            }
            set
            {
                this.mMapId = value;
            }
        }

        public long Credits
        {
            get
            {
                return this.mCredits;
            }
            set
            {
                this.mCredits = value;
            }
        }

        public long Uridium
        {
            get
            {
                return this.mUridium;
            }
            set
            {
                this.mUridium = value;
            }
        }
        public long Experience
        {
            get { return this.mExperience; }
        }

        public long Honor
        {
            get { return this.mHonor; }
        }


        public int Grade
        {
            get
            {
                return this.mGrade;
            }
        }

        public int FactionId
        {
            get
            {
                return this.mFactionId;
            }
            set
            {
                this.mFactionId = value;
            }
        }

        public int RealFaction
        {
            get
            {
                return this.mRealFaction;
            }
        }

        public int ClanId
        {
            get
            {
                return this.mClanId;
            }
            set
            {
                this.mClanId = value;
            }
        }

        public string ClanTag
        {
            get
            {
                return this.mClanTag;
            }
        }

        public bool Disconnected
        {
            get
            {
                return this.mOnline;
            }
            set
            {
                this.mOnline = value;
            }
        }

        public int SelectedPlayer
        {
            get
            {
                return this.mSelectedPlayer;
            }
            set
            {
                this.mSelectedPlayer = value;
            }
        }

        public int SelectedAmmo
        {
            get
            {
                return this.mSelectedAmmo;
            }
            set
            {
                this.mSelectedAmmo = value;
            }
        }

        public int SelectedRocket
        {
            get
            {
                return this.mSelectedRocket;
            }
            set
            {
                this.mSelectedRocket = value;
            }
        }

        public int SelectedRocketAuto
        {
            get
            {
                return this.mSelectedRocketAuto;
            }
            set
            {
                this.mSelectedRocketAuto = value;
            }
        }

        public int SelectedLauncherRocket
        {
            get
            {
                return this.mSelectedLauncherRocket;
            }
            set
            {
                this.mSelectedLauncherRocket = (value == 8 || value == 9) ? value : 7;
            }
        }

        public double LastDcr250
        {
            get
            {
                return this.mLastDcr250;
            }
            set
            {
                this.mLastDcr250 = value;
            }
        }

        public int LastRocketShotType
        {
            get
            {
                return this.mLastRocketShotType;
            }
            set
            {
                this.mLastRocketShotType = value;
            }
        }

        public int SelectedPlayerRocket
        {
            get
            {
                return this.mSelectedPlayerRocket;
            }
            set
            {
                this.mSelectedPlayerRocket = value;
            }
        }

        public int SelectedPlayerRocketSpawnSeq
        {
            get
            {
                return this.mSelectedPlayerRocketSpawnSeq;
            }
            set
            {
                this.mSelectedPlayerRocketSpawnSeq = value;
            }
        }

        public long RankPoints
        {
            get
            {
                return this.mRankPoints;
            }
        }

        public int NpcKill
        {
            get
            {
                return this.mNpcKill;
            }
        }

        public int UserKill
        {
            get
            {
                return this.mUserKill;
            }
        }

        public bool Destroy
        {
            get
            {
                return this.mDestroy;
            }
            set
            {
                this.mDestroy = value;
            }
        }

        public bool PeaceZone
        {
            get
            {
                return this.mPeaceZone;
            }
            set
            {
                this.mPeaceZone = value;
            }
        }
        public bool TradeZone
        {
            get { return this.mTradeZone; }
            set { this.mTradeZone = value; }
        }

        public bool Attacking
        {
            get
            {
                return this.mAttacking;
            }
            set
            {
                this.mAttacking = value;
                this.mAttackingRepBug = value;

                if (value)
                    this.mNoFightTimer = 0;
                if (value && this.IsRepairing)
                {
                    Session sRep = SessionManager.GetSessionByCharacterId(this.mId);
                    if (sRep != null)
                        OrbitReborn_Emulator.Game.Handlers.SelectAction.StopRepair(sRep, "Stopped: attacking");
                }

                if (value && this.mShieldTwinkleEnabled)
                {
                    Session s = SessionManager.GetSessionByCharacterId(this.mId);
                    if (s != null) s.SendData(PacketComposer.Compose("A", "SHS|0|0|0"));
                    this.mShieldTwinkleEnabled = false;
                }

            }
        }

        public CList<Session> Attacked
        {
            get
            {
                return this.mAttacked;
            }
            set
            {
                this.mAttacked = value;
            }
        }

        public CList<int> ClanWar
        {
            get
            {
                return this.mClanWar;
            }
            set
            {
                this.mClanWar = value;
            }
        }

        public CList<int> ClanAlliance
        {
            get
            {
                return this.mClanAlliance;
            }
            set
            {
                this.mClanAlliance = value;
            }
        }

        public CList<int> ClanNap
        {
            get
            {
                return this.mClanNap;
            }
            set
            {
                this.mClanNap = value;
            }
        }

        public bool OutOfRange
        {
            get
            {
                return this.mOutOfRange;
            }
            set
            {
                this.mOutOfRange = value;
            }
        }

        public int ActiveConfig
        {
            get
            {
                return this.mActiveConfig;
            }
            set
            {
                this.mActiveConfig = value;
                this.UpdateCargoMaxForCurrentConfig();
            }
        }

        public int TmpActiveConfig
        {
            get
            {
                return this.mTmpActiveConfig;
            }
            set
            {
                this.mTmpActiveConfig = value;
            }
        }

        public double LastConfigChange
        {
            get
            {
                return this.mLastConfigChange;
            }
            set
            {
                this.mLastConfigChange = value;
            }
        }

        public double LastRocket
        {
            get
            {
                return this.mLastRocket;
            }
            set
            {
                this.mLastRocket = value;
            }
        }

        public bool CanChangeConfig
        {
            get
            {
                return UnixTimestamp.GetCurrent() - this.mLastConfigChange >= 4.0;
            }
        }

        public double LastTechSh
        {
            get
            {
                return this.mLastTechSh;
            }
            set
            {
                this.mLastTechSh = value;
            }
        }

        public double LastTechHp
        {
            get
            {
                return this.mLastTechHp;
            }
            set
            {
                this.mLastTechHp = value;
            }
        }

        public double LastTechEla
        {
            get
            {
                return this.mLastTechEla;
            }
            set
            {
                this.mLastTechEla = value;
            }
        }

        public double LastTechEci
        {
            get
            {
                return this.mLastTechEci;
            }
            set
            {
                this.mLastTechEci = value;
            }
        }

        public double EnergyLeechUntil
        {
            get
            {
                return this.mEnergyLeechUntil;
            }
            set
            {
                this.mEnergyLeechUntil = value;
            }
        }

        public bool EnergyLeechActive
        {
            get
            {
                return this.mEnergyLeechUntil > UnixTimestamp.GetCurrent();
            }
        }

        public int EnergyLeechSecondsLeft
        {
            get
            {
                if (!this.EnergyLeechActive)
                    return 0;
                return Math.Max(0, Convert.ToInt32(Math.Ceiling(this.mEnergyLeechUntil - UnixTimestamp.GetCurrent())));
            }
        }

        public double LastISH
        {
            get
            {
                return this.mLastISH;
            }
            set
            {
                this.mLastISH = value;
            }
        }

        public double LastSMB
        {
            get
            {
                return this.mLastSMB;
            }
            set
            {
                this.mLastSMB = value;
            }
        }

        public int CoolDownTechSh
        {
            get
            {
                int int32 = Convert.ToInt32(Math.Round(45.0 - (UnixTimestamp.GetCurrent() - this.mLastTechSh)));
                if (int32 <= 0)
                    return 0;
                return int32;
            }
        }

        public int CoolDownTechHp
        {
            get
            {
                int int32 = Convert.ToInt32(Math.Round(45.0 - (UnixTimestamp.GetCurrent() - this.mLastTechHp)));
                if (int32 <= 0)
                    return 0;
                return int32;
            }
        }

        public int CoolDownTechEla
        {
            get
            {
                int int32 = Convert.ToInt32(Math.Round(1800.0 - (UnixTimestamp.GetCurrent() - this.mLastTechEla)));
                if (int32 <= 0)
                    return 0;
                return int32;
            }
        }

        public int CoolDownTechEci
        {
            get
            {
                int int32 = Convert.ToInt32(Math.Round(60.0 - (UnixTimestamp.GetCurrent() - this.mLastTechEci)));
                if (int32 <= 0)
                    return 0;
                return int32;
            }
        }

        public int CoolDownISH
        {
            get
            {
                int int32 = Convert.ToInt32(Math.Round(30.0 - (UnixTimestamp.GetCurrent() - this.mLastISH)));
                if (int32 <= 0)
                    return 0;
                return int32;
            }
        }

        public int CoolDownSMB
        {
            get
            {
                int int32 = Convert.ToInt32(Math.Round(30.0 - (UnixTimestamp.GetCurrent() - this.mLastSMB)));
                if (int32 <= 0)
                    return 0;
                return int32;
            }
        }

        public int ActiveShipSkillType
        {
            get
            {
                return this.mActiveShipSkillType;
            }
            set
            {
                this.mActiveShipSkillType = value;
            }
        }

        public int ActiveShipSkillTargetId
        {
            get
            {
                return this.mActiveShipSkillTargetId;
            }
            set
            {
                this.mActiveShipSkillTargetId = value;
            }
        }

        public double ActiveShipSkillUntil
        {
            get
            {
                return this.mActiveShipSkillUntil;
            }
            set
            {
                this.mActiveShipSkillUntil = value;
            }
        }

        public int SkillDesignType
        {
            get
            {
                switch (this.mShipId)
                {
                    case 63:
                        return 1;
                    case 64:
                        return 2;
                    case 65:
                        return 3;
                    case 66:
                        return 4;
                    case 67:
                        return 5;
                    case 18:
                    case 73:
                        return 6;
                    default:
                        return 0;
                }
            }
        }

        public string SkillDesignCooldownCode
        {
            get
            {
                switch (this.SkillDesignType)
                {
                    case 1:
                        return "IH";
                    case 2:
                        return "WS";
                    case 3:
                        return "PS";
                    case 4:
                        return "FOR";
                    case 5:
                        return "SIN";
                    case 6:
                        return "SB";
                    default:
                        return string.Empty;
                }
            }
        }

        public int ShipSkillStatus
        {
            get
            {
                if (this.SkillDesignType <= 0)
                    return 0;
                if (this.mActiveShipSkillType == this.SkillDesignType && this.mActiveShipSkillUntil > UnixTimestamp.GetCurrent())
                    return 2;
                if (this.GetShipSkillCooldown(this.SkillDesignType) > 0)
                    return 3;
                return 1;
            }
        }

        public int ShipSkillSecondsLeft
        {
            get
            {
                if (this.mActiveShipSkillType == this.SkillDesignType && this.mActiveShipSkillUntil > UnixTimestamp.GetCurrent())
                    return Math.Max(0, Convert.ToInt32(Math.Ceiling(this.mActiveShipSkillUntil - UnixTimestamp.GetCurrent())));
                return this.GetShipSkillCooldown(this.SkillDesignType);
            }
        }

        public int GetShipSkillCooldownSeconds(int skillType)
        {
            switch (skillType)
            {
                case 1:
                    return 750;
                case 2:
                    return 900;
                case 3:
                    return 750;
                case 4:
                    return 900;
                case 5:
                    return 900;
                case 6:
                    return 350;
                default:
                    return 0;
            }
        }

        public int GetShipSkillDurationSeconds(int skillType)
        {
            switch (skillType)
            {
                case 1:
                    return 0;
                case 2:
                    return 60;
                case 3:
                    return 30;
                case 4:
                    return 120;
                case 5:
                    return 35;
                case 6:
                    return 5;
                default:
                    return 0;
            }
        }

        public double GetShipSkillLastActivation(int skillType)
        {
            switch (skillType)
            {
                case 1:
                    return this.mLastSkillSolace;
                case 2:
                    return this.mLastSkillDiminisher;
                case 3:
                    return this.mLastSkillSpectrum;
                case 4:
                    return this.mLastSkillSentinel;
                case 5:
                    return this.mLastSkillVenom;
                case 6:
                    return this.mLastSkillLightning;
                default:
                    return 0.0;
            }
        }

        public void SetShipSkillLastActivation(int skillType, double timestamp)
        {
            switch (skillType)
            {
                case 1:
                    this.mLastSkillSolace = timestamp;
                    break;
                case 2:
                    this.mLastSkillDiminisher = timestamp;
                    break;
                case 3:
                    this.mLastSkillSpectrum = timestamp;
                    break;
                case 4:
                    this.mLastSkillSentinel = timestamp;
                    break;
                case 5:
                    this.mLastSkillVenom = timestamp;
                    break;
                case 6:
                    this.mLastSkillLightning = timestamp;
                    break;
            }
        }

        public int GetShipSkillCooldown(int skillType)
        {
            int totalCooldown = this.GetShipSkillCooldownSeconds(skillType);
            if (totalCooldown <= 0)
                return 0;
            double lastActivation = this.GetShipSkillLastActivation(skillType);
            if (lastActivation <= 0.0)
                return 0;
            int remaining = Convert.ToInt32(Math.Ceiling((double)totalCooldown - (UnixTimestamp.GetCurrent() - lastActivation)));
            if (remaining <= 0)
                return 0;
            return remaining;
        }

        public void ClearActiveShipSkill()
        {
            this.mActiveShipSkillType = 0;
            this.mActiveShipSkillTargetId = 0;
            this.mActiveShipSkillUntil = 0.0;
            this.ActiveShipSkillTicksRemaining = 0;
            if (this.ActiveShipSkillTimer != null)
            {
                this.ActiveShipSkillTimer.Dispose();
                this.ActiveShipSkillTimer = (System.Threading.Timer)null;
            }
            if (this.ActiveShipSkillTickTimer != null)
            {
                this.ActiveShipSkillTickTimer.Dispose();
                this.ActiveShipSkillTickTimer = (System.Threading.Timer)null;
            }
        }

        public int SMBLocX
        {
            get
            {
                return this.mSMBLocX;
            }
            set
            {
                this.mSMBLocX = value;
            }
        }

        public int SMBLocY
        {
            get
            {
                return this.mSMBLocY;
            }
            set
            {
                this.mSMBLocY = value;
            }
        }

        public bool ActiveISH
        {
            get
            {
                return 30 - this.CoolDownISH <= 3;
            }
        }

        public CharacterConfig Config1
        {
            get
            {
                return this.mConfig1;
            }
        }

        public CharacterConfig Config2
        {
            get
            {
                return this.mConfig2;
            }
        }

        public int NoFightTimer
        {
            get
            {
                return this.mNoFightTimer;
            }
            set
            {
                this.mNoFightTimer = value;
            }
        }

        public double LastShieldDamageReceived
        {
            get
            {
                return this.mLastShieldDamageReceived;
            }
            set
            {
                this.mLastShieldDamageReceived = value;
            }
        }

        public bool CanRegenShield
        {
            get
            {
                return this.mLastShieldDamageReceived <= 0.0 || UnixTimestamp.GetCurrent() - this.mLastShieldDamageReceived >= 10.0;
            }
        }
        public bool ShieldTwinkleEnabled
        {
            get { return this.mShieldTwinkleEnabled; }
            set { this.mShieldTwinkleEnabled = value; }
        }


        public System.Threading.Timer PathTime
        {
            get
            {
                return this.mPathTime;
            }
            set
            {
                this.mPathTime = value;
            }
        }

        public System.Threading.Timer PathFinding
        {
            get
            {
                return this.mPathFinding;
            }
            set
            {
                this.mPathFinding = value;
            }
        }

        public bool WarningZone
        {
            get
            {
                return this.mWarningZone;
            }
            set
            {
                this.mWarningZone = value;
            }
        }

        public System.Threading.Timer WarningZoneTimer
        {
            get
            {
                return this.mWarningZoneTimer;
            }
            set
            {
                this.mWarningZoneTimer = value;
            }
        }

        public System.Threading.Timer UpdateMovementTimer
        {
            get
            {
                return this.mUpdateMovementTimer;
            }
            set
            {
                this.mUpdateMovementTimer = value;
            }
        }

        public System.Threading.Timer LaserAttackTimer
        {
            get
            {
                return this.mLaserAttackTimer;
            }
            set
            {
                this.mLaserAttackTimer = value;
            }
        }

        public System.Threading.Timer LaserAttackCanTimer
        {
            get
            {
                return this.mLaserAttackCanTimer;
            }
            set
            {
                this.mLaserAttackCanTimer = value;
            }
        }

        public bool CanLaserAttack
        {
            get
            {
                return this.mCanLaserAttack;
            }
            set
            {
                this.mCanLaserAttack = value;
            }
        }

        public System.Threading.Timer DisconnectTimer
        {
            get
            {
                return this.mDisconnectTimer;
            }
            set
            {
                this.mDisconnectTimer = value;
            }
        }

        public int DisconnectCounter
        {
            get
            {
                return this.mDisconnectCounter;
            }
            set
            {
                this.mDisconnectCounter = value;
            }
        }

        public System.Threading.Timer RepairTimer
        {
            get
            {
                return this.mRepairTimer;
            }
            set
            {
                this.mRepairTimer = value;
            }
        }

        public System.Threading.Timer BattleRepairTimer
        {
            get
            {
                return this.mBattleRepairTimer;
            }
            set
            {
                this.mBattleRepairTimer = value;
            }
        }

        public System.Threading.Timer EnergyLeechTimer
        {
            get
            {
                return this.mEnergyLeechTimer;
            }
            set
            {
                this.mEnergyLeechTimer = value;
            }
        }

        public int BattleRepairCount
        {
            get
            {
                return this.mBattleRepairCount;
            }
            set
            {
                this.mBattleRepairCount = value;
            }
        }

        public System.Threading.Timer PortalJumpTimer
        {
            get
            {
                return this.mPortalJumpTimer;
            }
            set
            {
                this.mPortalJumpTimer = value;
            }
        }

        public System.Threading.Timer RocketAttackTimer
        {
            get
            {
                return this.mRocketAttackTimer;
            }
            set
            {
                this.mRocketAttackTimer = value;
            }
        }

        public bool IsJumping
        {
            get
            {
                return this.mIsJumping;
            }
            set
            {
                this.mIsJumping = value;
            }
        }

        public bool IsRepairing
        {
            get
            {
                return this.mIsRepairing;
            }
            set
            {
                this.mIsRepairing = value;
            }
        }

        public int TimeTaken
        {
            get
            {
                return this.mPathTimeTaken;
            }
            set
            {
                this.mPathTimeTaken = value;
            }
        }

        public bool HasLinkedSession
        {
            get
            {
                return this.SessionId > 0;
            }
        }

        public double CacheAge
        {
            get
            {
                return UnixTimestamp.GetCurrent() - this.mCacheAge;
            }
        }

        public double TimestampLastOnline
        {
            get
            {
                return this.mTimestampLastOnline;
            }
            set
            {
                this.mTimestampLastOnline = value;
            }
        }

        public Settings Settings
        {
            get
            {
                return this.mSettings;
            }
        }

        public int Level
        {
            get
            {
                return this.mLevel;
            }
        }

        public int AttackSpeed
        {
            get
            {
                return this.mAttackSpeed;
            }
        }

        public double LastRSB75
        {
            get
            {
                return this.mLastRSB75;
            }
            set
            {
                this.mLastRSB75 = value;
            }
        }

        public double LastEMP
        {
            get
            {
                return this.mLastEMP;
            }
            set
            {
                this.mLastEMP = value;
            }
        }

        public Session Attacker
        {
            get
            {
                return this.mAttacker;
            }
            set
            {
                this.mAttacker = value;
            }
        }

        public double LastAttackByAttackerReceived
        {
            get
            {
                return this.mLastAttackByAttackerReceived;
            }
            set
            {
                this.mLastAttackByAttackerReceived = value;
            }
        }

        public int BootyKeys
        {
            get
            {
                return this.mBootyKeys;
            }
            set
            {
                this.mBootyKeys = value;
            }
        }

        public int BoosterHpTime
        {
            get
            {
                return this.mBoosterHpTime;
            }
            set
            {
                this.mBoosterHpTime = value;
            }
        }

        public int BoosterShdTime
        {
            get
            {
                return this.mBoosterShdTime;
            }
            set
            {
                this.mBoosterShdTime = value;
            }
        }

        public int BoosterDmgTime
        {
            get
            {
                return this.mBoosterDmgTime;
            }
            set
            {
                this.mBoosterDmgTime = value;
            }
        }

        public int BoosterNpcTime
        {
            get
            {
                return this.mBoosterNpcTime;
            }
            set
            {
                this.mBoosterNpcTime = value;
            }
        }

        public bool ApisBuilt
        {
            get
            {
                return this.mApisBuilt;
            }
            set
            {
                this.mApisBuilt = value;
            }
        }

        public bool ZeusBuilt
        {
            get
            {
                return this.mZeusBuilt;
            }
            set
            {
                this.mZeusBuilt = value;
            }
        }

        public CList<int> NpcInRange { get; set; }

        public CList<int> PlayerInRange { get; set; }

        public int Invisible { get; set; }

        public int InvisibleCooldown
        {
            get
            {
                return this.mInvisibleCooldown;
            }
            set
            {
                this.mInvisibleCooldown = value;
            }
        }

        public CDictionnary<string, int> SkillTree
        {
            get
            {
                return this.mSkillTree;
            }
            set
            {
                this.mSkillTree = value;
            }
        }

        private static int GetDataRowInt32(DataRow row, string columnName)
        {
            if (row == null || row.Table == null || !row.Table.Columns.Contains(columnName) || row[columnName] == DBNull.Value)
                return 0;

            try
            {
                return Convert.ToInt32(row[columnName]);
            }
            catch
            {
                return 0;
            }
        }

        private static void EnsureUsersIntColumn(SqlDatabaseClient client, string columnName)
        {
            EnsureUsersColumn(client, columnName, "INT(11) NOT NULL DEFAULT 0");
        }

        private static void EnsureUsersColumn(SqlDatabaseClient client, string columnName, string definition)
        {
            if (client == null || string.IsNullOrWhiteSpace(columnName) || string.IsNullOrWhiteSpace(definition))
                return;

            client.ClearParameters();
            client.SetParameter("table_name", (object)"users");
            client.SetParameter("column_name", (object)columnName);

            int columnExists = 0;
            try
            {
                object scalar = client.ExecuteScalar("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = @column_name");
                columnExists = scalar == null || scalar == DBNull.Value ? 0 : Convert.ToInt32(scalar);
            }
            catch
            {
                columnExists = 0;
            }

            if (columnExists > 0)
                return;

            client.ExecuteNonQuery("ALTER TABLE users ADD COLUMN " + columnName + " " + definition);
        }

        private static void EnsureRuntimeStateColumns(SqlDatabaseClient client)
        {
            if (client == null)
                return;

            lock (CharacterInfo.mRuntimeStateSyncRoot)
            {
                if (CharacterInfo.mRuntimeStateColumnsEnsured)
                    return;

                CharacterInfo.EnsureUsersColumn(client, "current_shield1", "INT(11) NULL DEFAULT NULL");
                CharacterInfo.EnsureUsersColumn(client, "current_shield2", "INT(11) NULL DEFAULT NULL");
                CharacterInfo.EnsureUsersColumn(client, "active_config", "TINYINT(1) NOT NULL DEFAULT 1");
                CharacterInfo.mRuntimeStateColumnsEnsured = true;
            }
        }

        private static int ClampRuntimeValue(int value, int min, int max)
        {
            if (value < min) return min;
            if (max >= min && value > max) return max;
            return value;
        }

        private static void EnsureShipSkillCooldownColumns(SqlDatabaseClient client)
        {
            if (client == null)
                return;

            lock (CharacterInfo.mShipSkillCooldownSyncRoot)
            {
                if (CharacterInfo.mShipSkillCooldownColumnsEnsured)
                    return;

                CharacterInfo.EnsureUsersIntColumn(client, "cooldown_IH");
                CharacterInfo.EnsureUsersIntColumn(client, "cooldown_WS");
                CharacterInfo.EnsureUsersIntColumn(client, "cooldown_PS");
                CharacterInfo.EnsureUsersIntColumn(client, "cooldown_FOR");
                CharacterInfo.EnsureUsersIntColumn(client, "cooldown_SIN");
                CharacterInfo.EnsureUsersIntColumn(client, "cooldown_SB");
                CharacterInfo.mShipSkillCooldownColumnsEnsured = true;
            }
        }

        private double BuildLastActivationFromStoredCooldown(int skillType, int storedCooldownSeconds)
        {
            int totalCooldownSeconds = this.GetShipSkillCooldownSeconds(skillType);
            if (totalCooldownSeconds <= 0 || storedCooldownSeconds <= 0)
                return 0.0;

            if (storedCooldownSeconds > totalCooldownSeconds)
                storedCooldownSeconds = totalCooldownSeconds;

            return UnixTimestamp.GetCurrent() - (double)(totalCooldownSeconds - storedCooldownSeconds);
        }

        public void SynchronizeShipSkillCooldowns(SqlDatabaseClient MySqlClient)
        {
            if (MySqlClient == null)
                return;

            CharacterInfo.EnsureShipSkillCooldownColumns(MySqlClient);
            CharacterInfo.EnsureRuntimeStateColumns(MySqlClient);
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.SetParameter("cdIH", (object)this.GetShipSkillCooldown(1));
            MySqlClient.SetParameter("cdWS", (object)this.GetShipSkillCooldown(2));
            MySqlClient.SetParameter("cdPS", (object)this.GetShipSkillCooldown(3));
            MySqlClient.SetParameter("cdFOR", (object)this.GetShipSkillCooldown(4));
            MySqlClient.SetParameter("cdSIN", (object)this.GetShipSkillCooldown(5));
            MySqlClient.SetParameter("cdSB", (object)this.GetShipSkillCooldown(6));
            MySqlClient.ExecuteNonQuery("UPDATE users SET cooldown_IH = @cdIH, cooldown_WS = @cdWS, cooldown_PS = @cdPS, cooldown_FOR = @cdFOR, cooldown_SIN = @cdSIN, cooldown_SB = @cdSB WHERE id = @id LIMIT 1");
        }

        public CharacterInfo(SqlDatabaseClient MySqlClient, int SessionId, int Id, string AuthTicket)
        {
            this.NpcInRange = new CList<int>();
            this.PlayerInRange = new CList<int>();
            this.Invisible = 0;
            CharacterInfo.EnsureShipSkillCooldownColumns(MySqlClient);
            CharacterInfo.EnsureRuntimeStateColumns(MySqlClient);
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)Id);
            DataRow dataRow = MySqlClient.ExecuteQueryRow("SELECT * FROM users WHERE id = @id LIMIT 1");
            this.mSessionId = SessionId;
            this.mId = Id;
            this.mAuthTicket = AuthTicket;
            this.mLastMove = new Stopwatch();
            this.mCacheAge = UnixTimestamp.GetCurrent();
            this.mUsername = WebUtility.HtmlDecode((string)dataRow["username"]);
            this.mIsAdmin = (bool)dataRow["is_admin"];
            this.mIsMod = (bool)dataRow["is_mod"];
            this.mShipId = (int)dataRow["shipid"];
            this.mOldLocX = (int)dataRow["locx"];
            this.mOldLocY = (int)dataRow["locy"];
            this.mLocX = (int)dataRow["locx"];
            this.mLocY = (int)dataRow["locy"];
            this.mMapId = (int)dataRow["mapid"];
            this.mLastISH = UnixTimestamp.GetCurrent() - (30 - CharacterInfo.GetDataRowInt32(dataRow, "cooldown_ISH"));
            this.mLastSMB = UnixTimestamp.GetCurrent() - (30 - CharacterInfo.GetDataRowInt32(dataRow, "cooldown_SMB"));
            this.mLastSkillSolace = this.BuildLastActivationFromStoredCooldown(1, CharacterInfo.GetDataRowInt32(dataRow, "cooldown_IH"));
            this.mLastSkillDiminisher = this.BuildLastActivationFromStoredCooldown(2, CharacterInfo.GetDataRowInt32(dataRow, "cooldown_WS"));
            this.mLastSkillSpectrum = this.BuildLastActivationFromStoredCooldown(3, CharacterInfo.GetDataRowInt32(dataRow, "cooldown_PS"));
            this.mLastSkillSentinel = this.BuildLastActivationFromStoredCooldown(4, CharacterInfo.GetDataRowInt32(dataRow, "cooldown_FOR"));
            this.mLastSkillVenom = this.BuildLastActivationFromStoredCooldown(5, CharacterInfo.GetDataRowInt32(dataRow, "cooldown_SIN"));
            this.mLastSkillLightning = this.BuildLastActivationFromStoredCooldown(6, CharacterInfo.GetDataRowInt32(dataRow, "cooldown_SB"));
            this.mGameTitle = "";
            this.mShipCargo = 0;
            this.mShipMaxCargo = 0;
            this.mCredits = 0L;
            this.mUridium = 0L;
            this.mKillStrek = 0;
            this.mGrade = 1;
            this.mFactionId = 0;
            this.mClanId = 0;
            this.mClanTag = WebUtility.HtmlDecode("");
            this.mOnline = true;
            this.mSelectedPlayer = 0;
            this.mSelectedAmmo = 4;
            this.mSelectedRocket = 3;
            this.mSelectedRocketAuto = this.mSelectedRocket;
            this.mSelectedLauncherRocket = 7;
            this.mLastRocketShotType = this.mSelectedRocket;
            this.mRankPoints = 0L;
            this.mUserKill = 0;
            this.mNpcKill = 0;
            this.mGGRings = 0;
            this.mShipMaxHp = 10000;
            this.mShipHp = 10000;
            this.mConfig1 = new CharacterConfig(10000, 10000, 28, 1000);
            this.mConfig2 = new CharacterConfig(10000, 10000, 28, 1000);
            this.mActiveConfig = 1;
            this.mLabInfos = new LabInfos();
            this.mAttacked = new CList<Session>();
            this.mClanWar = new CList<int>();
            this.mClanAlliance = new CList<int>();
            this.mClanNap = new CList<int>();
            this.FatLasers = 0;
            this.ShieldMechanics = 0;
            this.Drones = "";
            this.mLevel = 1;
            this.mAttackSpeed = 800;
            this.mDestroy = false;
            this.Members = new CList<int>();
            this.InvitationReceive = new CList<int>();
            this.InvitationSend = new CList<int>();
        }

        public void RefreshSettings(SqlDatabaseClient MySqlClient)
        {
            if (MySqlClient == null)
                return;
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("userid", (object)this.mId);
            DataRow dataRow = MySqlClient.ExecuteQueryRow("SELECT * FROM users_settings WHERE playerid = @userid");
            this.mSettings = new Settings((int)dataRow["playerid"], (string)dataRow["flash_set"], (string)dataRow["minimap_scale"], (string)dataRow["resizable_windows"], Convert.ToInt32(dataRow["display_player_names"]), Convert.ToInt32(dataRow["display_chat"]), Convert.ToInt32(dataRow["play_music"]), Convert.ToInt32(dataRow["play_sfx"]), (string)dataRow["bar_status"], (string)dataRow["window_settings"], (string)dataRow["client_resolution"], Convert.ToInt32(dataRow["auto_refinement"]), Convert.ToInt32(dataRow["quickslot_stop_attack"]), Convert.ToInt32(dataRow["doubleclick_attack"]), Convert.ToInt32(dataRow["auto_start"]), Convert.ToInt32(dataRow["display_notifications"]), Convert.ToInt32(dataRow["show_drones"]), Convert.ToInt32(dataRow["display_window_background"]), Convert.ToInt32(dataRow["always_draggable_windows"]), Convert.ToInt32(dataRow["preload_user_ships"]), (int)dataRow["quality_presetting"], (int)dataRow["quality_customized"], (int)dataRow["quality_background"], (int)dataRow["quality_poizone"], (int)dataRow["quality_ship"], (int)dataRow["quality_engine"], (int)dataRow["quality_collectable"], (int)dataRow["quality_attack"], (int)dataRow["quality_effect"], (int)dataRow["quality_explosion"], (string)dataRow["quickbar_slot"], (string)dataRow["mainmenu_position"], (string)dataRow["slotmenu_position"], (string)dataRow["slotmenu_order"]);
        }

        public void UpdateSettings(SqlDatabaseClient MySqlClient, string RowName, string Value)
        {
            RowName = RowName.ToLower();
            if (RowName == "flash_set" || RowName == "minimap_scale" || (RowName == "resizable_windows" || RowName == "display_player_names") || (RowName == "display_chat" || RowName == "play_music" || (RowName == "play_sfx" || RowName == "bar_status")) || (RowName == "window_settings" || RowName == "client_resolution" || (RowName == "auto_refinement" || RowName == "quickslot_stop_attack") || (RowName == "doubleclick_attack" || RowName == "auto_start" || (RowName == "show_drones" || RowName == "display_window_background"))) || (RowName == "always_draggable_windows" || RowName == "mainmenu_position" || (RowName == "quality_collectable" || RowName == "quality_attack") || (RowName == "quality_effect" || RowName == "quality_explosion" || (RowName == "quickbar_slot" || RowName == "preload_user_ships")) || (RowName == "slotmenu_position" || RowName == "slotmenu_order" || (RowName == "display_notifications" || RowName == "quality_presetting") || (RowName == "quality_customized" || RowName == "quality_background" || (RowName == "quality_poizone" || RowName == "quality_ship")))) || RowName == "quality_engine")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("userid", (object)this.mId);
                MySqlClient.SetParameter("value", (object)Value);
                MySqlClient.ExecuteNonQuery("UPDATE users_settings SET " + RowName + "=@value WHERE playerid=@userid LIMIT 1");

                if (this.mSettings != null)
                {
                    if (RowName == "auto_refinement")
                    {
                        int autoRefinement;
                        if (!int.TryParse(Value, out autoRefinement))
                            autoRefinement = 0;
                        this.mSettings.AutoRefinement = autoRefinement != 0 ? 1 : 0;
                    }
                    else if (RowName == "show_drones")
                    {
                        int showDrones;
                        if (!int.TryParse(Value, out showDrones))
                            showDrones = 0;
                        this.mSettings.ShowDrones = showDrones != 0 ? 1 : 0;
                    }
                }
            }
            else
                Output.WriteLine((object)("Error updatesettings : " + RowName + " - " + Value));
        }

        public void RefreshClan(SqlDatabaseClient MySqlClient)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            DataRow dataRow1 = MySqlClient.ExecuteQueryRow("SELECT clanid FROM users WHERE id = @id LIMIT 1");
            this.mClanId = dataRow1 == null ? 0 : (int)dataRow1["clanid"];
            this.mRealClan = this.mClanId;
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("clanid", (object)this.mClanId);
            DataRow dataRow2 = MySqlClient.ExecuteQueryRow("SELECT clan_tag FROM clan WHERE id = @clanid LIMIT 1");
            this.mClanTag = dataRow2 == null ? "" : WebUtility.HtmlDecode((string)dataRow2["clan_tag"]);

            this.mClanWar.Clear();
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("clanid", (object)this.mClanId);
            DataTable dataTable1 = MySqlClient.ExecuteQueryTable("SELECT second_clan_id FROM clan_diplomacy WHERE clan_id=@clanid AND type='war'");
            if (dataTable1 != null)
            {
                bool lockTaken = false;
                try
                {
                    Monitor.Enter((object)(clist = this.mClanWar), ref lockTaken);
                    foreach (DataRow row in (InternalDataCollectionBase)dataTable1.Rows)
                    {
                        if (!this.mClanWar.Contains((int)row["second_clan_id"]))
                            this.mClanWar.Add((int)row["second_clan_id"]);
                    }
                }
                finally
                {
                    if (lockTaken)
                        Monitor.Exit((object)clist);
                }
            }

            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("clanid", (object)this.mClanId);
            DataTable dataTable2 = MySqlClient.ExecuteQueryTable("SELECT clan_id FROM clan_diplomacy WHERE second_clan_id=@clanid AND type='war'");
            if (dataTable2 != null)
            {
                bool lockTaken = false;
                try
                {
                    Monitor.Enter((object)(clist = this.mClanWar), ref lockTaken);
                    foreach (DataRow row in (InternalDataCollectionBase)dataTable2.Rows)
                    {
                        if (!this.mClanWar.Contains((int)row["clan_id"]))
                            this.mClanWar.Add((int)row["clan_id"]);
                    }
                }
                finally
                {
                    if (lockTaken)
                        Monitor.Exit((object)clist);
                }
            }

            this.mClanAlliance.Clear();
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("clanid", (object)this.mClanId);
            DataTable dataTable3 = MySqlClient.ExecuteQueryTable("SELECT second_clan_id FROM clan_diplomacy WHERE clan_id=@clanid AND type='alliance'");
            if (dataTable3 != null)
            {
                bool lockTaken = false;
                try
                {
                    Monitor.Enter((object)(clist = this.mClanAlliance), ref lockTaken);
                    foreach (DataRow row in (InternalDataCollectionBase)dataTable3.Rows)
                    {
                        if (!this.mClanAlliance.Contains((int)row["second_clan_id"]))
                            this.mClanAlliance.Add((int)row["second_clan_id"]);
                    }
                }
                finally
                {
                    if (lockTaken)
                        Monitor.Exit((object)clist);
                }
            }

            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("clanid", (object)this.mClanId);
            DataTable dataTable4 = MySqlClient.ExecuteQueryTable("SELECT clan_id FROM clan_diplomacy WHERE second_clan_id=@clanid AND type='alliance'");
            if (dataTable4 != null)
            {
                bool lockTaken = false;
                try
                {
                    Monitor.Enter((object)(clist = this.mClanAlliance), ref lockTaken);
                    foreach (DataRow row in (InternalDataCollectionBase)dataTable4.Rows)
                    {
                        if (!this.mClanAlliance.Contains((int)row["clan_id"]))
                            this.mClanAlliance.Add((int)row["clan_id"]);
                    }
                }
                finally
                {
                    if (lockTaken)
                        Monitor.Exit((object)clist);
                }
            }

            this.mClanNap.Clear();
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("clanid", (object)this.mClanId);
            DataTable dataTable5 = MySqlClient.ExecuteQueryTable("SELECT second_clan_id FROM clan_diplomacy WHERE clan_id=@clanid AND type='nap'");
            if (dataTable5 != null)
            {
                bool lockTaken = false;
                try
                {
                    Monitor.Enter((object)(clist = this.mClanNap), ref lockTaken);
                    foreach (DataRow row in (InternalDataCollectionBase)dataTable5.Rows)
                    {
                        if (!this.mClanNap.Contains((int)row["second_clan_id"]))
                            this.mClanNap.Add((int)row["second_clan_id"]);
                    }
                }
                finally
                {
                    if (lockTaken)
                        Monitor.Exit((object)clist);
                }
            }

            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("clanid", (object)this.mClanId);
            DataTable dataTable6 = MySqlClient.ExecuteQueryTable("SELECT clan_id FROM clan_diplomacy WHERE second_clan_id=@clanid AND type='nap'");
            if (dataTable6 != null)
            {
                bool lockTaken = false;
                try
                {
                    Monitor.Enter((object)(clist = this.mClanNap), ref lockTaken);
                    foreach (DataRow row in (InternalDataCollectionBase)dataTable6.Rows)
                    {
                        if (!this.mClanNap.Contains((int)row["clan_id"]))
                            this.mClanNap.Add((int)row["clan_id"]);
                    }
                }
                finally
                {
                    if (lockTaken)
                        Monitor.Exit((object)clist);
                }
            }
        }

        public int GetClanDiplomacyStateTo(int otherClanId)
        {
            if (this.mClanId <= 0 || otherClanId <= 0 || this.mClanId == otherClanId)
                return 0;

            if (this.mClanWar != null && this.mClanWar.Contains(otherClanId))
                return 3;

            if (this.mClanNap != null && this.mClanNap.Contains(otherClanId))
                return 2;

            if (this.mClanAlliance != null && this.mClanAlliance.Contains(otherClanId))
                return 1;

            return 0;
        }

        public bool IsClanWarWith(CharacterInfo other)
        {
            if (other == null || this.mClanId <= 0 || other.ClanId <= 0 || this.mClanId == other.ClanId)
                return false;

            return this.GetClanDiplomacyStateTo(other.ClanId) == 3 || other.GetClanDiplomacyStateTo(this.mClanId) == 3;
        }

        public bool IsClanAllianceWith(CharacterInfo other)
        {
            if (other == null || this.mClanId <= 0 || other.ClanId <= 0 || this.mClanId == other.ClanId)
                return false;

            return this.GetClanDiplomacyStateTo(other.ClanId) == 1 || other.GetClanDiplomacyStateTo(this.mClanId) == 1;
        }

        public bool IsClanNapWith(CharacterInfo other)
        {
            if (other == null || this.mClanId <= 0 || other.ClanId <= 0 || this.mClanId == other.ClanId)
                return false;

            return this.GetClanDiplomacyStateTo(other.ClanId) == 2 || other.GetClanDiplomacyStateTo(this.mClanId) == 2;
        }

        public bool ShouldTreatPvpKillAsEnemy(CharacterInfo other, int mapId)
        {
            if (other == null)
                return false;

            if (mapId == 80)
                return true;

            if (this.IsClanWarWith(other))
                return true;

            if (this.IsClanAllianceWith(other) || this.IsClanNapWith(other))
                return false;

            return this.mFactionId != other.FactionId;
        }

        public bool ShouldPenalizeFriendlyPvpKill(CharacterInfo other, int mapId)
        {
            if (other == null)
                return false;

            if (mapId == 80 || this.IsClanWarWith(other))
                return false;

            if (this.IsClanAllianceWith(other) || this.IsClanNapWith(other))
                return true;

            return this.mFactionId != 0 && this.mFactionId == other.FactionId;
        }

        public void SynchronizeStatistics(SqlDatabaseClient MySqlClient, int online)
        {
            this.SynchronizeShipSkillCooldowns(MySqlClient);
            CharacterInfo.EnsureRuntimeStateColumns(MySqlClient);
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.SetParameter("lastlogin", (object)UnixTimestamp.GetCurrent());
            MySqlClient.SetParameter("cdISH", (object)this.CoolDownISH);
            MySqlClient.SetParameter("cdSMB", (object)this.CoolDownSMB);
            if (this.MapId != 80)
            {
                MySqlClient.SetParameter("locx", (object)this.LocX);
                MySqlClient.SetParameter("locy", (object)this.LocY);
                MySqlClient.SetParameter("mapid", (object)this.MapId);
            }
            else if (this.FactionId == 1)
            {
                MySqlClient.SetParameter("locx", (object)2000);
                MySqlClient.SetParameter("locy", (object)1100);
                MySqlClient.SetParameter("mapid", (object)1);
            }
            else if (this.FactionId == 2)
            {
                MySqlClient.SetParameter("locx", (object)18500);
                MySqlClient.SetParameter("locy", (object)1100);
                MySqlClient.SetParameter("mapid", (object)5);
            }
            else if (this.FactionId == 3)
            {
                MySqlClient.SetParameter("locx", (object)19000);
                MySqlClient.SetParameter("locy", (object)11000);
                MySqlClient.SetParameter("mapid", (object)9);
            }
            MySqlClient.SetParameter("online", (object)online);
            MySqlClient.SetParameter("current_hp", (object)this.ShipHp);
            MySqlClient.SetParameter("current_shield1", (object)ClampRuntimeValue(this.Config1.Shield, 0, this.Config1.MaxShield));
            MySqlClient.SetParameter("current_shield2", (object)ClampRuntimeValue(this.Config2.Shield, 0, this.Config2.MaxShield));
            MySqlClient.SetParameter("active_config", (object)(this.ActiveConfig == 2 ? 2 : 1));
            MySqlClient.ExecuteNonQuery("UPDATE users SET lastlogin = @lastlogin, locx = @locx, locy = @locy, cooldown_ISH = @cdISH, cooldown_SMB = @cdSMB, mapid = @mapid, online = @online, current_hp = @current_hp, current_shield1 = @current_shield1, current_shield2 = @current_shield2, active_config = @active_config WHERE id = @id LIMIT 1");
        }

        public void addTdmVictory(SqlDatabaseClient MySqlClient, int amount = 1)
        {

            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.SetParameter("amount", (object)amount);
            MySqlClient.ExecuteNonQuery("UPDATE users SET nb_tdm = nb_tdm + @amount WHERE id = @id LIMIT 1");
        }

        public void AddLog(SqlDatabaseClient MySqlClient, string _Message)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.SetParameter("message", (object)_Message);
            MySqlClient.ExecuteNonQuery("INSERT INTO `users_log`(`playerid`, `message`) VALUES (@id, @message)");
        }

        public void AddNpcCount(SqlDatabaseClient MySqlClient, string NpcName)
        {
            if (NpcName == "-=[ Streuner ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Streuner = Streuner + 1 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Boss Streuner ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Streuner = Streuner + 2 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Lordakia ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Lordakia = Lordakia + 1 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Boss Lordakia ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Lordakia = Lordakia + 2 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Saimon ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Saimon = Saimon + 1 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Boss Saimon ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Saimon = Saimon + 2 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Sibelon ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Sibelon = Sibelon + 1 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Boss Sibelon ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Sibelon = Sibelon + 2 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Kristallin ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Kristallin = Kristallin + 1 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Boss Kristallin ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Kristallin = Kristallin + 2 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Kristallon ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Kristallon = Kristallon + 1 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Boss Kristallon ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Kristallon = Kristallon + 2 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Cubikon ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Cubikon = Cubikon + 1 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Boss Cubikon ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Cubikon = Cubikon + 2 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Mordon ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Mordon = Mordon + 1 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Boss Mordon ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Mordon = Mordon + 2 WHERE id = @id LIMIT 1");
            }

            else if (NpcName == "-=[ Devolarium ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Devolarium = Devolarium + 1 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Boss Devolarium ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Devolarium = Devolarium + 2 WHERE id = @id LIMIT 1");
            }

            else if (NpcName == "-=[ Sibelonit ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Sibelonit = Sibelonit + 1 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Boss Sibelonit ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Sibelonit = Sibelonit + 2 WHERE id = @id LIMIT 1");
            }

            else if (NpcName == "-=[ Lordakium ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Lordakium = Lordakium + 1 WHERE id = @id LIMIT 1");
            }
            else if (NpcName == "-=[ Boss Lordakium ]=-")
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users_npc_counts SET Lordakium = Lordakium + 2 WHERE id = @id LIMIT 1");
            }



        }

        public void AddSpeedhack(SqlDatabaseClient MySqlClient)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.SetParameter("username", (object)this.mUsername);
            MySqlClient.ExecuteNonQuery("INSERT INTO `speedhack_detect`(`user_id`, `username`) VALUES (@id, @username)");
        }

        public void AddKill(SqlDatabaseClient MySqlClient)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users SET user_kill = user_kill + 1 WHERE id = @id LIMIT 1");
            if (this.mClanId == 0)
                return;
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mClanId);
            MySqlClient.ExecuteNonQuery("UPDATE clan SET kill_count = kill_count + 1 WHERE id = @id LIMIT 1");
        }

        public void AddLastDuel(SqlDatabaseClient MySqlClient)
        {
            MySqlClient.ClearParameters();
            double time = UnixTimestamp.GetCurrent();
            MySqlClient.SetParameter("time", (object)time);
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users SET last_duel = @time WHERE id = @id LIMIT 1");
            this.LastDuel = time;
        }

        public void AddRankpoints(SqlDatabaseClient MySqlClient, int rankpoints)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users SET rankpoints = rankpoints + " + (object)rankpoints + " WHERE id = @id LIMIT 1");
        }
        public void AddDuelReward(SqlDatabaseClient MySqlClient, int nbMatch, int nbWin)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users SET nb_duel = nb_duel + " + (object)nbMatch + ", duel_win = duel_win + " + (object)nbWin + "  WHERE id = @id LIMIT 1");
        }

        public void AddKillReward(SqlDatabaseClient MySqlClient, int kill)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users SET user_kill = user_kill + " + (object)kill + " WHERE id = @id LIMIT 1");
        }

        public void AddReward(SqlDatabaseClient MySqlClient, int credits, int uridium, int npcPoints = 0, bool isNpc = false)
        {
            try
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users SET uridium = uridium + " + (object)uridium + ", credits = credits + " + (object)credits + " WHERE id = @id LIMIT 1");
                int num = npcPoints;
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.ExecuteNonQuery("UPDATE users SET npc_kill = npc_kill + " + (object)num + "  WHERE id = @id LIMIT 1");
                this.Uridium += (long)uridium;
                this.Credits += (long)credits;
            }
            catch (Exception e)
            {
                Console.WriteLine("ERROR ADDING REWARD :", e.Message);
            }
        }
        public bool ApplyNpcKillRewardBatch(SqlDatabaseClient MySqlClient, int credits, int uridium, int npcPoints, int rankpoints, int experience, int honor, int online)
        {
            if (MySqlClient == null)
                return false;

            int oldLevel = this.mLevel;
            long newExperience = this.mExperience;
            int newLevel = this.mLevel;

            if (experience > 0)
            {
                newExperience += (long)experience;
                newLevel = ExperienceSystem.GetLevelFromExperience(newExperience);
            }

            int saveLocX;
            int saveLocY;
            int saveMapId;

            if (this.MapId != 80)
            {
                saveLocX = this.LocX;
                saveLocY = this.LocY;
                saveMapId = this.MapId;
            }
            else if (this.FactionId == 1)
            {
                saveLocX = 2000;
                saveLocY = 1100;
                saveMapId = 1;
            }
            else if (this.FactionId == 2)
            {
                saveLocX = 18500;
                saveLocY = 1100;
                saveMapId = 5;
            }
            else if (this.FactionId == 3)
            {
                saveLocX = 19000;
                saveLocY = 11000;
                saveMapId = 9;
            }
            else
            {
                saveLocX = this.LocX;
                saveLocY = this.LocY;
                saveMapId = this.MapId;
            }

            CharacterInfo.EnsureShipSkillCooldownColumns(MySqlClient);
            CharacterInfo.EnsureRuntimeStateColumns(MySqlClient);
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.SetParameter("credits", (object)credits);
            MySqlClient.SetParameter("uridium", (object)uridium);
            MySqlClient.SetParameter("npcPoints", (object)npcPoints);
            MySqlClient.SetParameter("rankpoints", (object)rankpoints);
            MySqlClient.SetParameter("experience", (object)experience);
            MySqlClient.SetParameter("level", (object)newLevel);
            MySqlClient.SetParameter("honor", (object)honor);
            MySqlClient.SetParameter("lastlogin", (object)UnixTimestamp.GetCurrent());
            MySqlClient.SetParameter("locx", (object)saveLocX);
            MySqlClient.SetParameter("locy", (object)saveLocY);
            MySqlClient.SetParameter("mapid", (object)saveMapId);
            MySqlClient.SetParameter("online", (object)online);
            MySqlClient.SetParameter("current_hp", (object)this.ShipHp);
            MySqlClient.SetParameter("current_shield1", (object)ClampRuntimeValue(this.Config1.Shield, 0, this.Config1.MaxShield));
            MySqlClient.SetParameter("current_shield2", (object)ClampRuntimeValue(this.Config2.Shield, 0, this.Config2.MaxShield));
            MySqlClient.SetParameter("active_config", (object)(this.ActiveConfig == 2 ? 2 : 1));
            MySqlClient.SetParameter("cdISH", (object)this.CoolDownISH);
            MySqlClient.SetParameter("cdSMB", (object)this.CoolDownSMB);
            MySqlClient.SetParameter("cdIH", (object)this.GetShipSkillCooldown(1));
            MySqlClient.SetParameter("cdWS", (object)this.GetShipSkillCooldown(2));
            MySqlClient.SetParameter("cdPS", (object)this.GetShipSkillCooldown(3));
            MySqlClient.SetParameter("cdFOR", (object)this.GetShipSkillCooldown(4));
            MySqlClient.SetParameter("cdSIN", (object)this.GetShipSkillCooldown(5));
            MySqlClient.SetParameter("cdSB", (object)this.GetShipSkillCooldown(6));
            MySqlClient.ExecuteNonQuery("UPDATE users SET uridium = uridium + @uridium, credits = credits + @credits, npc_kill = npc_kill + @npcPoints, rankpoints = rankpoints + @rankpoints, experience = experience + @experience, level = @level, honor = honor + @honor, lastlogin = @lastlogin, locx = @locx, locy = @locy, cooldown_ISH = @cdISH, cooldown_SMB = @cdSMB, mapid = @mapid, online = @online, current_hp = @current_hp, current_shield1 = @current_shield1, current_shield2 = @current_shield2, active_config = @active_config, cooldown_IH = @cdIH, cooldown_WS = @cdWS, cooldown_PS = @cdPS, cooldown_FOR = @cdFOR, cooldown_SIN = @cdSIN, cooldown_SB = @cdSB WHERE id = @id LIMIT 1");

            this.Uridium += (long)uridium;
            this.Credits += (long)credits;

            if (experience > 0)
            {
                this.mExperience = newExperience;
                this.mLevel = newLevel;
            }

            if (honor != 0)
                this.mHonor += (long)honor;

            return this.mLevel > oldLevel;
        }

        public bool AddExperience(SqlDatabaseClient client, int amount)
        {
            if (amount <= 0) return false;

            int oldLevel = this.mLevel;

            this.mExperience += amount;
            this.mLevel = ExperienceSystem.GetLevelFromExperience(this.mExperience);

            client.ClearParameters();
            client.SetParameter("id", (object)this.mId);
            client.ExecuteNonQuery(
                "UPDATE users SET experience = experience + " + amount + ", level = " + this.mLevel + " WHERE id = @id LIMIT 1"
            );

            return this.mLevel > oldLevel;
        }
        public void AddHonor(SqlDatabaseClient client, int amount)
        {
            if (amount == 0)
                return;

            this.mHonor += amount;

            client.ClearParameters();
            client.SetParameter("id", (object)this.mId);
            client.ExecuteNonQuery(
                "UPDATE users SET honor = honor + " + amount + " WHERE id = @id LIMIT 1"
            );
        }


        public void AddSurvivorWin(SqlDatabaseClient MySqlClient, int nbSurvivor)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users SET win_survivor = win_survivor +" + (object)nbSurvivor + " WHERE id = @id");
        }

        public void AddTdmMatch(SqlDatabaseClient MySqlClient, int nbVictory, int nbMatch)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users SET tdm_win = tdm_win +" + (object)nbVictory + ", nb_tdm = nb_tdm +" + (object)nbMatch + " WHERE id = @id");
        }

        public void RemoveRankPoints(SqlDatabaseClient MySqlClient, int amount)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users SET rankpoints = rankpoints - " + (object)amount + " WHERE id = @id LIMIT 1");
        }

        public void RemoveReward(long credits, long uridium)
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE users SET uridium = uridium - " + (object)uridium + ", credits = credits - " + (object)credits + " WHERE id = @id LIMIT 1");
                this.Uridium -= uridium;
                this.Credits -= credits;
            }
        }

        public void RefreshUserDataPreservingRuntime(SqlDatabaseClient MySqlClient)
        {
            int oldHp = this.ShipHp;
            int oldShield1 = this.Config1.Shield;
            int oldShield2 = this.Config2.Shield;
            int oldActiveConfig = this.ActiveConfig == 2 ? 2 : 1;
            int oldMapId = this.MapId;
            int oldLocX = this.LocX;
            int oldLocY = this.LocY;
            int oldNewLocX = this.NewLocX;
            int oldNewLocY = this.NewLocY;
            int oldOldLocX = this.OldLocX;
            int oldOldLocY = this.OldLocY;

            this.RefreshUserData(MySqlClient);

            this.ActiveConfig = oldActiveConfig;
            this.MapId = oldMapId;
            this.LocX = oldLocX;
            this.LocY = oldLocY;
            this.NewLocX = oldNewLocX;
            this.NewLocY = oldNewLocY;
            this.OldLocX = oldOldLocX;
            this.OldLocY = oldOldLocY;
            this.ShipHp = ClampRuntimeValue(oldHp, 0, this.ShipOverhealMaxHp);
            this.Config1.Shield = ClampRuntimeValue(oldShield1, 0, this.Config1.MaxShield);
            this.Config2.Shield = ClampRuntimeValue(oldShield2, 0, this.Config2.MaxShield);

            this.SynchronizeStatistics(MySqlClient, 1);
        }

        public void RefreshUserData(SqlDatabaseClient MySqlClient)
        {
            CharacterInfo.EnsureRuntimeStateColumns(MySqlClient);
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            DataRow dataRow1 = MySqlClient.ExecuteQueryRow("SELECT * FROM users WHERE id = @id LIMIT 1");
            if (dataRow1 == null)
                return;

            Func<string, object> getValue = (columnName) =>
            {
                if (!dataRow1.Table.Columns.Contains(columnName))
                    return null;
                object value = dataRow1[columnName];
                if (value == null || value == DBNull.Value)
                    return null;
                return value;
            };

            Func<string, int, int> getInt32 = (columnName, defaultValue) =>
            {
                try
                {
                    object value = getValue(columnName);
                    if (value == null)
                        return defaultValue;
                    return Convert.ToInt32(value);
                }
                catch
                {
                    return defaultValue;
                }
            };

            Func<string, long, long> getInt64 = (columnName, defaultValue) =>
            {
                try
                {
                    object value = getValue(columnName);
                    if (value == null)
                        return defaultValue;
                    return Convert.ToInt64(value);
                }
                catch
                {
                    return defaultValue;
                }
            };

            Func<string, bool, bool> getBool = (columnName, defaultValue) =>
            {
                try
                {
                    object value = getValue(columnName);
                    if (value == null)
                        return defaultValue;
                    return Convert.ToBoolean(value);
                }
                catch
                {
                    return defaultValue;
                }
            };

            Func<string, string, string> getString = (columnName, defaultValue) =>
            {
                object value = getValue(columnName);
                if (value == null)
                    return defaultValue;
                return Convert.ToString(value);
            };

            this.mFactionId = getInt32("factionid", this.mFactionId);
            this.mRealFaction = getInt32("factionid", this.mRealFaction);
            this.mGameTitle = getString("game_title", this.mGameTitle ?? string.Empty);
            this.mGrade = getInt32("grade", this.mGrade);
            this.mCredits = getInt64("credits", this.mCredits);
            this.mUridium = getInt64("uridium", this.mUridium);
            lock (this.mPrimaryAmmoSyncLock)
            {
                if (!this.mPrimaryAmmoDirty)
                {
                    this.AmmoLcb10 = getInt64("ammo_lcb10", this.AmmoLcb10);
                    this.AmmoMcb25 = getInt64("ammo_mcb25", this.AmmoMcb25);
                    this.AmmoMcb50 = getInt64("ammo_mcb50", this.AmmoMcb50);
                    this.AmmoUcb100 = getInt64("ammo_ucb100", this.AmmoUcb100);
                    this.AmmoSab50 = getInt64("ammo_sab50", this.AmmoSab50);
                    this.AmmoRsb75 = getInt64("ammo_rsb75", this.AmmoRsb75);
                    this.mDbAmmoLcb10 = this.AmmoLcb10;
                    this.mDbAmmoMcb25 = this.AmmoMcb25;
                    this.mDbAmmoMcb50 = this.AmmoMcb50;
                    this.mDbAmmoUcb100 = this.AmmoUcb100;
                    this.mDbAmmoSab50 = this.AmmoSab50;
                    this.mDbAmmoRsb75 = this.AmmoRsb75;
                }
            }

            lock (this.mSecondaryAmmoSyncLock)
            {
                if (!this.mSecondaryAmmoDirty)
                {
                    this.AmmoR310 = getInt64("ammo_r310", this.AmmoR310);
                    this.AmmoPlt2026 = getInt64("ammo_plt2026", this.AmmoPlt2026);
                    this.AmmoPlt2021 = getInt64("ammo_plt2021", this.AmmoPlt2021);
                    this.AmmoDcr250 = getInt64("ammo_dcr250", this.AmmoDcr250);
                    this.AmmoHstrm01 = getInt64("ammo_hstrm01", this.AmmoHstrm01);
                    this.AmmoUbr100 = getInt64("ammo_ubr100", this.AmmoUbr100);
                    this.AmmoEco10 = getInt64("ammo_eco10", this.AmmoEco10);
                    this.AmmoSmb01 = getInt64("ammo_smb01", this.AmmoSmb01);
                    this.AmmoIsh01 = getInt64("ammo_ish01", this.AmmoIsh01);
                    this.AmmoEmp01 = getInt64("ammo_emp01", this.AmmoEmp01);
                    this.mDbAmmoR310 = this.AmmoR310;
                    this.mDbAmmoPlt2026 = this.AmmoPlt2026;
                    this.mDbAmmoPlt2021 = this.AmmoPlt2021;
                    this.mDbAmmoDcr250 = this.AmmoDcr250;
                    this.mDbAmmoHstrm01 = this.AmmoHstrm01;
                    this.mDbAmmoUbr100 = this.AmmoUbr100;
                    this.mDbAmmoEco10 = this.AmmoEco10;
                    this.mDbAmmoSmb01 = this.AmmoSmb01;
                    this.mDbAmmoIsh01 = this.AmmoIsh01;
                    this.mDbAmmoEmp01 = this.AmmoEmp01;
                }
            }
            this.mExperience = getInt64("experience", this.mExperience);
            this.mHonor = getInt64("honor", this.mHonor);
            this.mLevel = ExperienceSystem.GetLevelFromExperience(this.mExperience);
            this.mPvpPoints = getInt32("pvp_points", this.mPvpPoints);
            this.mBootyKeys = getInt32("booty_keys", this.mBootyKeys);
            this.mUserKill = getInt32("user_kill", this.mUserKill);
            this.mNpcKill = getInt32("npc_kill", this.mNpcKill);
            AutoRocketSkill = getInt32("auto_rkt_skill", 0);
            AutoRocketLauncherSkill = getInt32("auto_rocketlauncher_skill", AutoRocketLauncherSkill) == 1 ? 1 : 0;
            SelectedLauncherRocket = getInt32("selected_launcher_rocket", SelectedLauncherRocket);
            this.mRankPoints = getInt64("rankpoints", this.mRankPoints);
            int canBeginner = getInt32("canBeginner", 0);
            this.mDisableNpc = false;
            this.LastDuel = getInt64("last_duel", (long)this.LastDuel);

            int dbActiveConfig = getInt32("active_config", this.mActiveConfig);
            this.mActiveConfig = (dbActiveConfig == 2) ? 2 : 1;

            if (this.mRankPoints < 25000L && canBeginner == 1)
            {
                this.IsBeginner = true;
            }
            if (canBeginner == 1 && this.mRankPoints >= 25000L)
            {
                this.IsBeginner = false;
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", this.Id);
                MySqlClient.SetParameter("beginner", 0);
                MySqlClient.ExecuteNonQuery("UPDATE users SET canBeginner = @beginner WHERE id = @id");
            }

            TitleService.RefreshDisplayedTitle(this);

            int ringsDb = 0;
            ringsDb = getInt32("gg_rings", 0);

            this.mGGRings = Math.Max(0, Math.Min(4, ringsDb));

            this.Drones = getString("drones", this.Drones ?? "-/-");
            this.mApisBuilt = getBool("apis_built", this.mApisBuilt);
            this.mZeusBuilt = getBool("zeus_built", this.mZeusBuilt);
            int num3 = this.Drones.Split('-').Length - 1 - 2;
            if (num3 < 0)
                num3 = 0;

            int num4 = getInt32("hp_lvl", 0);
            if (num4 < 0)
                num4 = 0;
            else if (num4 > 10)
                num4 = 10;
            int num5 = getInt32("dmg_lvl", 0);
            if (num5 > 25 || num5 < 0)
                num5 = 0;
            int num6 = getInt32("shd_lvl", 0);
            if (num6 > 20 || num6 < 0)
                num6 = 0;
            int num7 = getInt32("speed_lvl", 0);
            if (num7 > 5 || num7 < 0)
                num7 = 0;
            int baseHp2010 = 100000;
            int baseSpeed2010 = 250;
            int baseCargo2010 = 0;

            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("sid", (object)this.mShipId);

            int bonusDamagePct = 0;
            int bonusShieldPct = 0;

            DataRow shipStatsRow = MySqlClient.ExecuteQueryRow(
                "SELECT base_hp_2010, base_speed_2010, base_cargo_2010, " +
                "bonus_damage_pct, bonus_shield_pct, " +
                "laser_slots_2010, generator_slots_2010, extra_slots_2010 " +
                "FROM ship_design WHERE ship_design_id=@sid LIMIT 1"
            );

            if (shipStatsRow != null)
            {
                if (shipStatsRow.Table.Columns.Contains("base_hp_2010") && shipStatsRow["base_hp_2010"] != DBNull.Value)
                    baseHp2010 = Convert.ToInt32(shipStatsRow["base_hp_2010"]);
                if (shipStatsRow.Table.Columns.Contains("base_speed_2010") && shipStatsRow["base_speed_2010"] != DBNull.Value)
                    baseSpeed2010 = Convert.ToInt32(shipStatsRow["base_speed_2010"]);
                if (shipStatsRow.Table.Columns.Contains("base_cargo_2010") && shipStatsRow["base_cargo_2010"] != DBNull.Value)
                    baseCargo2010 = Convert.ToInt32(shipStatsRow["base_cargo_2010"]);

                if (shipStatsRow.Table.Columns.Contains("bonus_damage_pct") && shipStatsRow["bonus_damage_pct"] != DBNull.Value)
                    bonusDamagePct = Convert.ToInt32(shipStatsRow["bonus_damage_pct"]);
                if (shipStatsRow.Table.Columns.Contains("bonus_shield_pct") && shipStatsRow["bonus_shield_pct"] != DBNull.Value)
                    bonusShieldPct = Convert.ToInt32(shipStatsRow["bonus_shield_pct"]);

                this.mLaserSlots2010 = shipStatsRow.Table.Columns.Contains("laser_slots_2010") && shipStatsRow["laser_slots_2010"] != DBNull.Value
                    ? Convert.ToInt32(shipStatsRow["laser_slots_2010"])
                    : this.mLaserSlots2010;
                this.mGeneratorSlots2010 = shipStatsRow.Table.Columns.Contains("generator_slots_2010") && shipStatsRow["generator_slots_2010"] != DBNull.Value
                    ? Convert.ToInt32(shipStatsRow["generator_slots_2010"])
                    : this.mGeneratorSlots2010;
                this.mExtraSlots2010 = shipStatsRow.Table.Columns.Contains("extra_slots_2010") && shipStatsRow["extra_slots_2010"] != DBNull.Value
                    ? Convert.ToInt32(shipStatsRow["extra_slots_2010"])
                    : this.mExtraSlots2010;

                if (baseHp2010 <= 0) baseHp2010 = 100000;
                if (baseSpeed2010 <= 0) baseSpeed2010 = 250;
            }


            if (baseCargo2010 <= 0)
                baseCargo2010 = 1000;

            this.mBaseCargo2010 = baseCargo2010;
            this.mShipMaxCargo = baseCargo2010;

            this.RefreshEquippedExtras(MySqlClient);

            this.mShipMaxHp = baseHp2010;
            this.mShipMaxHp += 5000 * num4;

            int currentHp = getInt32("current_hp", this.mShipMaxHp);
            int storedMaxHp = getInt32("max_hp", this.mShipMaxHp);

            if (storedMaxHp != this.mShipMaxHp)
            {
                currentHp = this.mShipMaxHp;

                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("id", (object)this.mId);
                MySqlClient.SetParameter("max_hp", (object)this.mShipMaxHp);
                MySqlClient.SetParameter("current_hp", (object)currentHp);
                MySqlClient.ExecuteNonQuery("UPDATE users SET max_hp=@max_hp, current_hp=@current_hp WHERE id=@id LIMIT 1");
            }

            if (currentHp <= 0)
                currentHp = this.mShipMaxHp;

            this.mShipHp = currentHp;



            int baseMaxDmg = 0;


            int baseMaxShield = 0;
            int baseSpeed = baseSpeed2010 + 10 * num7;

            this.mConfig1.MaxDamage = baseMaxDmg;
            this.mConfig2.MaxDamage = baseMaxDmg;
            this.mConfig1.MaxShield = baseMaxShield;
            this.mConfig2.MaxShield = baseMaxShield;
            this.mConfig1.Shield = baseMaxShield;
            this.mConfig2.Shield = baseMaxShield;
            this.mConfig1.ShipSpeed = baseSpeed;
            this.mConfig2.ShipSpeed = baseSpeed;

            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("pid", (object)this.mId);
            MySqlClient.SetParameter("sid", (object)this.mShipId);

            DataTable cfgTable = MySqlClient.ExecuteQueryTable(
                "SELECT scs.config, scs.damage_total, scs.shield_total, scs.speed_total " +
                "FROM ship_config_stats scs " +
                "INNER JOIN ship_config sc ON scs.ship_config_id = sc.id " +
                "WHERE sc.player_id = @pid AND sc.ship_design_id = @sid"
            );


            if (cfgTable != null)
            {
                foreach (DataRow r in cfgTable.Rows)
                {
                    string cfgName = ((r.Table.Columns.Contains("config") && r["config"] != DBNull.Value)
                        ? Convert.ToString(r["config"])
                        : string.Empty).ToUpper();
                    int dmgCfg = (r.Table.Columns.Contains("damage_total") && r["damage_total"] != DBNull.Value) ? Convert.ToInt32(r["damage_total"]) : 0;
                    int shdCfg = (r.Table.Columns.Contains("shield_total") && r["shield_total"] != DBNull.Value) ? Convert.ToInt32(r["shield_total"]) : 0;
                    int spdCfg = (r.Table.Columns.Contains("speed_total") && r["speed_total"] != DBNull.Value) ? Convert.ToInt32(r["speed_total"]) : baseSpeed;

                    if (cfgName == "A")
                    {
                        this.mConfig1.MaxDamage = dmgCfg;
                        this.mConfig1.MaxShield = shdCfg;
                        this.mConfig1.Shield = shdCfg;
                        this.mConfig1.ShipSpeed = spdCfg;
                    }
                    else if (cfgName == "B")
                    {
                        this.mConfig2.MaxDamage = dmgCfg;
                        this.mConfig2.MaxShield = shdCfg;
                        this.mConfig2.Shield = shdCfg;
                        this.mConfig2.ShipSpeed = spdCfg;
                    }
                }
            }
            if (bonusDamagePct > 0)
            {
                this.mConfig1.MaxDamage += (int)(this.mConfig1.MaxDamage * (bonusDamagePct / 100.0));
                this.mConfig2.MaxDamage += (int)(this.mConfig2.MaxDamage * (bonusDamagePct / 100.0));
            }

            if (bonusShieldPct > 0)
            {
                this.mConfig1.MaxShield += (int)(this.mConfig1.MaxShield * (bonusShieldPct / 100.0));
                this.mConfig2.MaxShield += (int)(this.mConfig2.MaxShield * (bonusShieldPct / 100.0));

                this.mConfig1.Shield = this.mConfig1.MaxShield;
                this.mConfig2.Shield = this.mConfig2.MaxShield;
            }



            if (this.IsAdmin)
            {
                this.mConfig2.ShipSpeed = 1000;
                this.mConfig2.MaxDamage *= 10;
            }
            if (this.IsAdmin || this.IsMod)
                this.mGrade = 21;

            this.mBoosterHpTime = getInt32("booster_hp_time", this.mBoosterHpTime);
            this.mBoosterShdTime = getInt32("booster_shd_time", this.mBoosterShdTime);
            this.mBoosterDmgTime = getInt32("booster_dmg_time", this.mBoosterDmgTime);

            this.mBoosterNpcTime = 0;
            this.mExtraBooster = "";

            int totalSeconds = (int)DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalSeconds;

            if (this.mBoosterHpTime > totalSeconds)
                this.mShipMaxHp += (int)(this.mShipMaxHp * 0.10);

            if (this.mBoosterDmgTime > totalSeconds)
            {
                this.mConfig1.MaxDamage += (int)(this.mConfig1.MaxDamage * 0.10);
                this.mConfig2.MaxDamage += (int)(this.mConfig2.MaxDamage * 0.10);
            }

            if (this.mBoosterShdTime > totalSeconds)
            {
                this.mConfig1.MaxShield += (int)(this.mConfig1.MaxShield * 0.25);
                this.mConfig2.MaxShield += (int)(this.mConfig2.MaxShield * 0.25);

                this.mConfig1.Shield = Math.Min(this.mConfig1.Shield, this.mConfig1.MaxShield);
                this.mConfig2.Shield = Math.Min(this.mConfig2.Shield, this.mConfig2.MaxShield);
            }

            int savedShield1 = getInt32("current_shield1", -1);
            int savedShield2 = getInt32("current_shield2", -1);

            if (savedShield1 >= 0)
                this.mConfig1.Shield = ClampRuntimeValue(savedShield1, 0, this.mConfig1.MaxShield);
            else
                this.mConfig1.Shield = this.mConfig1.MaxShield;

            if (savedShield2 >= 0)
                this.mConfig2.Shield = ClampRuntimeValue(savedShield2, 0, this.mConfig2.MaxShield);
            else
                this.mConfig2.Shield = this.mConfig2.MaxShield;

            this.mShipHp = ClampRuntimeValue(this.mShipHp, 0, this.ShipOverhealMaxHp);
            if (this.mShipHp <= 0)
                this.mShipHp = this.mShipMaxHp;


            this.mSkillTree.Clear();
            string str1 = getString("skilltree", string.Empty);
            char[] chArray1 = { '/' };
            foreach (string str2 in str1.Split(chArray1))
            {
                if (string.IsNullOrWhiteSpace(str2))
                    continue;

                char[] chArray2 = { ':' };
                string[] strArray = str2.Split(chArray2);
                if (strArray.Length < 2)
                    continue;

                string key = strArray[0];

                if (key == "rck" || key == "hp")
                    continue;

                if (!this.mSkillTree.ContainsKey(key))
                    this.mSkillTree.Add(key, Convert.ToInt32(strArray[1]));
            }

            this.MultiplierAgainstPlayers = 1.0;
            this.MultiplierAgainstNpcs = 1.0;
            this.FatLasers = 0;

            if (this.mSkillTree.ContainsKey("dmg"))
            {
                int lvl = this.mSkillTree["dmg"];
                if (lvl < 0) lvl = 0;
                if (lvl > 5) lvl = 5;

                if (lvl > 0)
                {
                    double mult = 1.0 + (0.02 * lvl);
                    this.MultiplierAgainstPlayers = mult;
                    this.MultiplierAgainstNpcs = mult;
                }

                if (lvl >= 5)
                    this.FatLasers = 1;
            }



            if (this.mSkillTree.ContainsKey("shd_abs") && this.mSkillTree["shd_abs"] > 0)
            {
                switch (this.mSkillTree["shd_abs"])
                {
                    case 1:
                        this.ShieldAbsorption = 0.73;
                        break;
                    case 2:
                        this.ShieldAbsorption = 0.76;
                        break;
                    case 3:
                        this.ShieldAbsorption = 0.8;
                        this.ShieldMechanics = 1;
                        break;
                }
            }

            if (this.mSkillTree.ContainsKey("smb") && this.mSkillTree["smb"] > 0)
            {
                switch (this.mSkillTree["smb"])
                {
                    case 1:
                        this.SmbDamages = 25000;
                        break;
                    case 2:
                        this.SmbDamages = 35000;
                        break;
                }
            }

            if (this.mSkillTree.ContainsKey("rep") && this.mSkillTree["rep"] > 0)
            {
                switch (this.mSkillTree["rep"])
                {
                    case 1:
                        this.RepairBotHp = 15000;
                        break;
                    case 2:
                        this.RepairBotHp = 20000;
                        break;
                    case 3:
                        this.RepairBotHp = 30000;
                        break;
                }
            }



            if (this.mSkillTree.ContainsKey("shreg") && this.mSkillTree["shreg"] > 0)
            {
                switch (this.mSkillTree["shreg"])
                {
                    case 1:
                        this.ShRegen = 8000;
                        break;
                    case 2:
                        this.ShRegen = 9000;
                        break;
                    case 3:
                        this.ShRegen = 10000;
                        break;
                    case 4:
                        this.ShRegen = 11000;
                        break;
                    case 5:
                        this.ShRegen = 12000;
                        break;
                }
            }

            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            DataRow dataRow4 = MySqlClient.ExecuteQueryRow("SELECT * FROM player_cargo WHERE id = @id LIMIT 1");
            if (dataRow4 != null)
            {
                this.mLabInfos.Prometium = (int)dataRow4["prometium"];
                this.mLabInfos.Endurium = (int)dataRow4["endurium"];
                this.mLabInfos.Terbium = (int)dataRow4["terbium"];
                this.mLabInfos.Xenomit = (int)dataRow4["xenomit"];
                this.mLabInfos.Palladium = (int)dataRow4["palladium"];
                this.mLabInfos.Prometid = (int)dataRow4["prometid"];
                this.mLabInfos.Duranium = (int)dataRow4["duranium"];
                this.mLabInfos.Promerium = (int)dataRow4["promerium"];
                this.mLabInfos.Seprom = (int)dataRow4["seprom"];

                this.mShipCargo = this.GetCurrentCargoTotal();
            }

            this.LoadSepromSafe(MySqlClient);

            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            DataRow dataRow5 = MySqlClient.ExecuteQueryRow("SELECT * FROM player_reff WHERE id = @id LIMIT 1");
            if (dataRow5 != null)
            {
                this.mLabInfos.Laser[0] = (int)dataRow5["laser0"];
                this.mLabInfos.Laser[1] = (int)dataRow5["laser1"];
                this.mLabInfos.Rocket[0] = (int)dataRow5["rocket0"];
                this.mLabInfos.Rocket[1] = (int)dataRow5["rocket1"];
                this.mLabInfos.Speed[0] = (int)dataRow5["speed0"];
                this.mLabInfos.Speed[1] = (int)dataRow5["speed1"];
                this.mLabInfos.Shield[0] = (int)dataRow5["shield0"];
                this.mLabInfos.Shield[1] = (int)dataRow5["shield1"];
            }

            this.Members.Clear();
            this.InvitationSend.Clear();
            this.InvitationReceive.Clear();
        }


        public void Boosters()
        {
        }

        public long GetUpdatedUridium()
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                DataRow dataRow = client.ExecuteQueryRow("SELECT uridium FROM users WHERE id = @id LIMIT 1");
                if (dataRow == null)
                    return 0;
                if (this.Uridium != (long)dataRow["uridium"])
                    this.Uridium = (long)dataRow["uridium"];
                return this.Uridium;
            }
        }

        public long GetUpdatedCredits()
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                DataRow dataRow = client.ExecuteQueryRow("SELECT credits FROM users WHERE id = @id LIMIT 1");
                if (dataRow == null)
                    return 0;
                if (this.Credits != (long)dataRow["credits"])
                    this.Credits = (long)dataRow["credits"];
                return this.Credits;
            }
        }

        public void SendCollectibles(Session user)
        {
            MapInstance instance = MapManager.GetInstanceByMapId(this.MapId);
            if (instance == null)
                return;

            bool isGateMap = GalaxyGateWaveService.IsGateMap(this.MapId);

            foreach (KeyValuePair<int, Collectable> kv in (ConcurrentDictionary<int, Collectable>)instance.Info.Collectables)
            {
                Collectable c = kv.Value;
                if (c == null)
                    continue;

                if (isGateMap)
                {
                    CargoBox cb = c as CargoBox;
                    if (cb == null)
                        continue;

                    if (cb.OwnerCharacterId > 0 && cb.OwnerCharacterId != user.CharacterId)
                        continue;
                }

                user.SendData(PacketComposer.Compose("c", c.Id.ToString() + "|" + (object)c.Type + "|" + (object)c.X + "|" + (object)c.Y));
            }
        }

        public void RegisterIncomingAttackActivity()
        {
            this.mLastShieldDamageReceived = UnixTimestamp.GetCurrent();
            if (!this.mShieldTwinkleEnabled)
                return;

            Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(this.mId);
            if (sessionByCharacterId != null)
                sessionByCharacterId.SendData(PacketComposer.Compose("A", "SHS|0|0|0"));
            this.mShieldTwinkleEnabled = false;
        }

        public void RegisterShieldDamageReceived()
        {
            this.RegisterIncomingAttackActivity();
        }

        public void TouchFightUntilDatabase()
        {
            this.TouchFightUntilDatabase(UnixTimestamp.GetCurrent());
        }

        private void TouchFightUntilDatabase(double time)
        {
            int now = (int)time;
            int until = now + FightUntilDbSeconds;

            lock (this.mFightUntilDbSyncLock)
            {
                if (this.mFightUntilDb > 0 && this.mFightUntilDb - now > FightUntilDbRefreshThresholdSeconds)
                    return;

                this.mFightUntilDb = until;
            }

            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ClearParameters();
                    client.SetParameter("id", (object)this.mId);
                    client.SetParameter("until", (object)until);
                    client.ExecuteNonQuery("UPDATE users SET in_fight_until=@until WHERE id=@id LIMIT 1");
                }
            }
            catch
            {
            }
        }

        public void UpdateAttacker(Session attacker)
        {
            double time = UnixTimestamp.GetCurrent();
            if (this.IsRepairing)
            {
                Session sRep = SessionManager.GetSessionByCharacterId(this.mId);
                if (sRep != null)
                    OrbitReborn_Emulator.Game.Handlers.SelectAction.StopRepair(sRep, "Stopped: taking damage");
            }

            this.mNoFightTimer = 0;

            this.TouchFightUntilDatabase(time);

            if (this.Attacker == null || this.Attacker.CharacterInfo == null)
            {
                this.Attacker = attacker;
                this.LastAttackByAttackerReceived = time;
                return;
            }

            if (this.Attacker == attacker)
            {
                this.LastAttackByAttackerReceived = time;
                return;
            }
            if (time - this.LastAttackByAttackerReceived < 10.0)
            {
                if (!this.assistAttacker.ContainsKey(attacker))
                    this.assistAttacker.Add(attacker, time);
                else
                {
                    this.assistAttacker[attacker] = time;
                }
                return;
            }
            this.Attacker = attacker;
            this.assistAttacker.Remove(attacker);
            this.Attacker.SendData(PacketComposer.Compose("n", "USH|" + (object)this.Id));
        }


        private static int NormalizePvpDestroyRewardShipId(int shipId)
        {
            switch (shipId)
            {
                case 1:
                case 2:
                    return 1;

                case 3:
                case 30:
                case 106:
                    return 3;

                case 4:
                    return 4;

                case 5:
                    return 5;

                case 6:
                    return 6;

                case 7:
                    return 7;

                case 8:
                case 16:
                case 17:
                case 18:
                case 73:
                case 58:
                case 60:
                case 116:
                case 117:
                case 129:
                    return 8;

                case 9:
                case 50:
                case 187:
                case 188:
                case 189:
                case 190:
                    return 9;

                case 10:
                case 19:
                case 51:
                case 52:
                case 53:
                case 54:
                case 55:
                case 56:
                case 57:
                case 59:
                case 61:
                case 62:
                case 63:
                case 64:
                case 65:
                case 66:
                case 67:
                case 68:
                case 69:
                case 86:
                case 118:
                case 119:
                case 120:
                case 121:
                case 122:
                case 123:
                case 124:
                case 125:
                case 127:
                case 130:
                case 131:
                case 132:
                case 134:
                case 136:
                case 137:
                case 138:
                case 139:
                case 140:
                case 184:
                case 185:
                case 186:
                    return 10;
            }

            return shipId;
        }

        private static void GetPvpDestroyRewardByShipId(int shipId, out int experienceReward, out int honorReward)
        {
            experienceReward = 0;
            honorReward = 0;

            switch (NormalizePvpDestroyRewardShipId(shipId))
            {
                case 1:
                    experienceReward = 100;
                    honorReward = 0;
                    return;

                case 3:
                    experienceReward = 400;
                    honorReward = 4;
                    return;

                case 4:
                case 5:
                    experienceReward = 1600;
                    honorReward = 16;
                    return;

                case 6:
                case 7:
                    experienceReward = 6400;
                    honorReward = 64;
                    return;

                case 8:
                    experienceReward = 12800;
                    honorReward = 128;
                    return;

                case 9:
                    experienceReward = 25600;
                    honorReward = 256;
                    return;

                case 10:
                    experienceReward = 51200;
                    honorReward = 512;
                    return;
            }
        }

        private static int GetPvpHonorPenaltyByShipId(int shipId)
        {
            int experienceReward;
            int honorReward;
            GetPvpDestroyRewardByShipId(shipId, out experienceReward, out honorReward);
            return honorReward * 2;
        }

        public bool TryAcquirePvpRewardGuard()
        {
            return Interlocked.CompareExchange(ref this.mPvpRewardGuard, 1, 0) == 0;
        }

        public void ResetPvpRewardGuard()
        {
            Interlocked.Exchange(ref this.mPvpRewardGuard, 0);
        }

        public void SendReward(Session ennemy)
        {
            if (ennemy == null)
            {
                return;
            }
            try
            {
                CharacterInfo victimInfo = ennemy.CharacterInfo;
                if (victimInfo == null || victimInfo.Destroy || this.Attacker == null)
                    return;
                if (this.Attacker.CharacterInfo == null)
                    return;
                if (!victimInfo.TryAcquirePvpRewardGuard())
                    return;

                CharacterInfo attackerInfo = this.Attacker.CharacterInfo;
                long perfStart = PerformanceProfiler.Start();
                long perfDbBlockStart = PerformanceProfiler.Start();
                long perfDbBlockMs = 0L;
                long perfQuestMs = 0L;
                long perfWeeklyMs = 0L;
                long perfTitleMs = 0L;
                long perfAssistMs = 0L;
                int perfKillerId = attackerInfo.Id;
                int perfVictimId = victimInfo.Id;

                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient("PvpReward"))
                {
                    string _Message1 = "You have destroyed " + this.Username + ".";
                    string _Message2 = "You have been destroyed by " + WebUtility.HtmlEncode(attackerInfo.Username) + ".";
                    this.Attacker.SendData(PacketComposer.Compose("A", "STD|" + _Message1));

                    bool rewardAsEnemy = attackerInfo.ShouldTreatPvpKillAsEnemy(victimInfo, attackerInfo.MapId);
                    bool penalizeFriendly = !rewardAsEnemy && attackerInfo.ShouldPenalizeFriendlyPvpKill(victimInfo, attackerInfo.MapId);

                    if (rewardAsEnemy)
                    {
                        attackerInfo.AddKill(client);
                        attackerInfo.AddLog(client, _Message1);
                        victimInfo.AddLog(client, _Message2);

                        long perfStepStart = PerformanceProfiler.Start();
                        bool questProgressChanged = QuestObjectiveProgress.AddPlayerKillProgress(attackerInfo.Id);
                        perfQuestMs += PerformanceProfiler.ElapsedMilliseconds(perfStepStart);
                        bool sameWeeklyGroup = (attackerInfo.Members != null && attackerInfo.Members.Contains(victimInfo.Id))
                            || (victimInfo.Members != null && victimInfo.Members.Contains(attackerInfo.Id));
                        string attackerRemoteAddress = this.Attacker.RemoteAddress;
                        string victimRemoteAddress = ennemy.RemoteAddress;
                        bool sameWeeklyRemoteAddress = !string.IsNullOrEmpty(attackerRemoteAddress)
                            && attackerRemoteAddress == victimRemoteAddress;

                        perfStepStart = PerformanceProfiler.Start();
                        bool weeklyProgressChanged = QuestObjectiveProgress.AddWeeklyEligiblePlayerKillProgress(
                            attackerInfo.Id,
                            attackerInfo.FactionId,
                            attackerInfo.ClanId,
                            victimInfo.FactionId,
                            victimInfo.ClanId,
                            victimInfo.Level,
                            sameWeeklyGroup,
                            sameWeeklyRemoteAddress,
                            rewardAsEnemy
                        );
                        perfWeeklyMs += PerformanceProfiler.ElapsedMilliseconds(perfStepStart);
                        questProgressChanged = weeklyProgressChanged || questProgressChanged;

                        perfStepStart = PerformanceProfiler.Start();
                        bool titleProgressChanged = TitleService.TrackEligiblePvpKill(this.Attacker, ennemy, rewardAsEnemy);
                        perfTitleMs += PerformanceProfiler.ElapsedMilliseconds(perfStepStart);

                        if (questProgressChanged || titleProgressChanged)
                            this.Attacker.SendData(PacketComposer.Compose("QST", "UPD"));

                        if (!_1v1.IsOnMap(attackerInfo.MapId))
                            ++attackerInfo.KillStrek;

                        int experienceReward;
                        int honorReward;
                        GetPvpDestroyRewardByShipId(this.ShipId, out experienceReward, out honorReward);

                        bool leveledUp = false;
                        if (experienceReward > 0)
                            leveledUp = attackerInfo.AddExperience(client, experienceReward);

                        if (honorReward != 0)
                            attackerInfo.AddHonor(client, honorReward);

                        if (experienceReward > 0)
                            this.Attacker.SendData(PacketComposer.Compose("y", "EP|" + experienceReward + "|" + attackerInfo.Experience + "|" + attackerInfo.Level));

                        if (honorReward != 0)
                            this.Attacker.SendData(PacketComposer.Compose("y", "HON|" + honorReward + "|" + attackerInfo.Honor));

                        if (leveledUp)
                            this.Attacker.SendData(PacketComposer.Compose("A", "LUP|" + attackerInfo.Level + "|1"));
                    }
                    else if (penalizeFriendly)
                    {
                        attackerInfo.AddLog(client, _Message1);
                        victimInfo.AddLog(client, _Message2);

                        int honorPenalty = GetPvpHonorPenaltyByShipId(this.ShipId);
                        if (honorPenalty > 0)
                        {
                            attackerInfo.AddHonor(client, -honorPenalty);
                            this.Attacker.SendData(PacketComposer.Compose("y", "HON|-" + honorPenalty + "|" + attackerInfo.Honor));
                            this.Attacker.SendData(PacketComposer.Compose("A", "STD|You lost " + honorPenalty + " honor."));
                        }
                    }

                    MapInstance instanceByMapId = MapManager.GetInstanceByMapId(this.mAttacker.CurrentMapId);
                    if (instanceByMapId != null)
                    {
                        string str = this.Username + " has been destroyed by " + attackerInfo.Username + ".";
                        instanceByMapId.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                    }
                    long perfAssistStart = PerformanceProfiler.Start();
                    this.SendRewardAssistAttacker(client, ennemy);
                    perfAssistMs += PerformanceProfiler.ElapsedMilliseconds(perfAssistStart);
                }
                perfDbBlockMs = PerformanceProfiler.ElapsedMilliseconds(perfDbBlockStart);
                PerformanceProfiler.LogPvpReward(perfKillerId, perfVictimId, perfStart, perfDbBlockMs, perfQuestMs, perfWeeklyMs, perfTitleMs, perfAssistMs);
                this.assistAttacker.Clear();
            }
            catch (Exception exception)
            {
                Console.WriteLine("ERROR :", exception);

                return;

            }
        }

        public void SendRewardAssistAttacker(SqlDatabaseClient client, Session ennemy)
        {
            int BaseRp = 75;
            int BasePvppoints = 50;
            if (ennemy.CharacterInfo.RankPoints <= 35000L)
            {
                BaseRp = 30;
                BasePvppoints = 25;
            }
            if (HappyHour.Enabled)
            {
                BaseRp *= 2;
                BasePvppoints *= 2;
            }
            foreach (KeyValuePair<Session, double> entry in this.assistAttacker)
            {
                if (entry.Key != null && UnixTimestamp.GetCurrent() - entry.Value <= 15.0
                    && entry.Key.CharacterInfo != null
                    && this.Attacker != null
                    && this.Attacker.CharacterInfo != null
                    && entry.Key.CharacterInfo.FactionId == this.Attacker.CharacterInfo.FactionId)
                {
                    bool rewardAsEnemy = entry.Key.CharacterInfo.ShouldTreatPvpKillAsEnemy(ennemy.CharacterInfo, entry.Key.CharacterInfo.MapId);
                    if (!rewardAsEnemy)
                        continue;
                    int rpReceive = BaseRp;
                    int pvpReceive = BasePvppoints;
                    if (entry.Key.CharacterInfo.mExtraBooster == "pts")
                    {
                        rpReceive += (int)(rpReceive * 0.5);
                        pvpReceive += (int)(pvpReceive * 0.5);
                    }
                    string message = "You helped " + this.Attacker.CharacterInfo.Username + " !\n" +
                        "You received " + rpReceive + " Rankpoints !\n" +
                        "You received " + pvpReceive + " Pvp points !";
                    entry.Key.SendData(PacketComposer.Compose("A", "STD|" + message));
                    entry.Key.CharacterInfo.AddLog(client, message);
                    entry.Key.CharacterInfo.AddRankpoints(client, rpReceive);
                    entry.Key.CharacterInfo.AddPvpPoints(client, pvpReceive);
                    entry.Key.CharacterInfo.AddAssists(client, 1);
                }
            }
        }

        public int CalculatePvpPoints(Session ennemy)
        {
            int amountPvpPoints = this.Attacker.CharacterInfo.KillStrek * 100;
            if (this.Attacker.CharacterInfo.KillStrek == 10)
            {
                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(this.Attacker.CurrentMapId);
                if (instanceByMapId != null)
                {
                    OrbitReborn_Emulator.Game.Handlers.SelectAction.SendPlayerVisualEffectPacketScoped(
                        instanceByMapId,
                        this.Attacker,
                        PacketComposer.Compose("n", "fx|start|RAGE|" + (object)this.Attacker.CharacterInfo.Id)
                    );
                }
            }
            if (ennemy.CharacterInfo.KillStrek >= 10)
            {
                amountPvpPoints = 3000;
            }
            else if (this.Attacker.CharacterInfo.KillStrek >= 5 && this.Attacker.CharacterInfo.KillStrek < 10)
            {
                amountPvpPoints = 500;
            }
            else if (this.Attacker.CharacterInfo.KillStrek >= 10)
            {
                amountPvpPoints = 1500;
            }
            if (HappyHour.Enabled)
            {
                amountPvpPoints *= 2;
            }
            if (this.mExtraBooster == "pts")
            {
                amountPvpPoints += (int)(amountPvpPoints * 0.5);
            }
            return amountPvpPoints;
        }

        public void AddAssists(SqlDatabaseClient MySqlClient, int amount)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users SET kill_assists = kill_assists + " + (object)amount + " WHERE id = @id LIMIT 1");
        }

        public void AddPvpPoints(SqlDatabaseClient MySqlClient, int amount)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users SET pvp_points = pvp_points + " + (object)amount + " WHERE id = @id LIMIT 1");
        }

        public void AddTokens(SqlDatabaseClient MySqlClient, int amount)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users_infos SET tokens = tokens + " + (object)amount + " WHERE id = @id LIMIT 1");
        }

        public void AddTickets(SqlDatabaseClient MySqlClient, int amount)
        {
            MySqlClient.ClearParameters();
            MySqlClient.SetParameter("id", (object)this.mId);
            MySqlClient.ExecuteNonQuery("UPDATE users_infos SET tickets = tickets + " + (object)amount + " WHERE id = @id LIMIT 1");
        }

        public void RemoveRankPoints(Session ennemy, int amount)
        {
            if (ennemy.CharacterInfo.Destroy || this.Attacker == null || this.Attacker.CharacterInfo == null)
                return;
            ennemy.CharacterInfo.Destroy = true;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                string _Message1 = "You have destroyed " + this.Username + ".";
                this.Attacker.SendData(PacketComposer.Compose("A", "STD|" + _Message1));
                this.Attacker.CharacterInfo.AddLog(client, _Message1);
                this.Attacker.CharacterInfo.RemoveRankPoints(client, amount);
                this.Attacker.SendData(PacketComposer.Compose("A", "STD|You lost " + (object)amount + " rankpoint(s)."));
                string _Message2 = "You have been destroyed by " + WebUtility.HtmlEncode(this.Attacker.CharacterInfo.Username) + ".";
                ennemy.CharacterInfo.AddLog(client, _Message2);
                MapInstance instanceByMapId = MapManager.GetInstanceByMapId(this.mAttacker.CurrentMapId);
                if (instanceByMapId != null)
                {
                    string str = this.Username + " has been destroyed by " + this.Attacker.CharacterInfo.Username + ".";
                    instanceByMapId.BroadcastMessage(PacketComposer.Compose("A", "STD|" + str), false);
                }
            }
        }

        public void RemoveBootyKey(int amount)
        {
            this.mBootyKeys -= amount;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE users SET booty_keys = booty_keys - " + (object)amount + " WHERE id = @id LIMIT 1");
            }
        }

        public void SetTitle(string title)
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.SetParameter("title", (object)title);
                client.ExecuteNonQuery("UPDATE users SET game_title = @title WHERE id = @id LIMIT 1");
            }
        }

        public void StartBoosterAutoRefresh()
        {
            if (this.mBoosterRefreshTimer != null)
                return;

            this.mBoosterMaskLast = GetBoosterMaskFromTimes();
            this.mBoosterRefreshTimer = new System.Threading.Timer(this.BoosterAutoRefreshTick, null, GetNextBoosterAutoRefreshDelayMs(), Timeout.Infinite);
        }

        public void StopBoosterAutoRefresh()
        {
            System.Threading.Timer timer = this.mBoosterRefreshTimer;
            if (timer == null)
                return;

            this.mBoosterRefreshTimer = null;
            timer.Dispose();
        }

        private int GetUnixTimestampSeconds()
        {
            return (int)DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalSeconds;
        }

        private int GetBoosterMaskFromTimes()
        {
            int now = GetUnixTimestampSeconds();
            return GetBoosterMaskFromTimes(now);
        }

        private int GetBoosterMaskFromTimes(int now)
        {
            int mask = 0;

            if (this.mBoosterDmgTime > now) mask |= 1;
            if (this.mBoosterHpTime > now) mask |= 2;
            if (this.mBoosterShdTime > now) mask |= 4;

            return mask;
        }

        private int GetNextBoosterAutoRefreshDelayMs()
        {
            int now = GetUnixTimestampSeconds();
            int nextDelaySeconds = BoosterExternalPollSeconds;

            if (this.mBoosterDmgTime > now)
                nextDelaySeconds = Math.Min(nextDelaySeconds, Math.Max(1, this.mBoosterDmgTime - now + 1));
            if (this.mBoosterHpTime > now)
                nextDelaySeconds = Math.Min(nextDelaySeconds, Math.Max(1, this.mBoosterHpTime - now + 1));
            if (this.mBoosterShdTime > now)
                nextDelaySeconds = Math.Min(nextDelaySeconds, Math.Max(1, this.mBoosterShdTime - now + 1));

            return Math.Max(BoosterRefreshMinimumDelayMs, nextDelaySeconds * 1000);
        }

        private void ScheduleNextBoosterAutoRefresh()
        {
            System.Threading.Timer timer = this.mBoosterRefreshTimer;
            if (timer == null)
                return;

            try
            {
                timer.Change(GetNextBoosterAutoRefreshDelayMs(), Timeout.Infinite);
            }
            catch (ObjectDisposedException)
            {
            }
        }

        private void ApplyBoosterMaskIfChanged(Session session, int mask)
        {
            if (session == null)
                return;

            if (mask == this.mBoosterMaskLast)
                return;

            lock (this.mBoosterRefreshLock)
            {
                if (mask == this.mBoosterMaskLast)
                    return;

                int oldHp = this.ShipHp;
                int oldShdCfg1 = this.Config1.Shield;
                int oldShdCfg2 = this.Config2.Shield;

                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    this.RefreshUserData(client);
                }

                this.ShipHp = Math.Min(oldHp, this.ShipOverhealMaxHp);
                this.Config1.Shield = Math.Min(oldShdCfg1, this.Config1.MaxShield);
                this.Config2.Shield = Math.Min(oldShdCfg2, this.Config2.MaxShield);

                this.mBoosterMaskLast = mask;

                int dmgPct = (mask & 1) != 0 ? 10 : 0;
                int hpPct = (mask & 2) != 0 ? 10 : 0;
                int shdPct = (mask & 4) != 0 ? 25 : 0;

                session.SendData(PacketComposer.Compose("A", "BS|0/0/" + dmgPct + "/" + shdPct + "/0/0/0/" + hpPct));
                session.SendData(UserDataComposer.Compose(session));

                session.SendData(PacketComposer.Compose("A", "HL|1|" + this.mId + "|HPT|" + this.ShipHp + "|0"));
                session.SendData(PacketComposer.Compose("A", "HL|1|" + this.mId + "|SHD|" + this.ShipShield + "|0"));
            }
        }

        private void BoosterAutoRefreshTick(object state)
        {
            try
            {
                Session session = SessionManager.GetSessionByCharacterId(this.mId);
                if (session == null)
                {
                    StopBoosterAutoRefresh();
                    return;
                }

                int now = GetUnixTimestampSeconds();

                int dbDmg, dbHp, dbShd;

                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ClearParameters();
                    client.SetParameter("id", (object)this.mId);

                    DataRow row = client.ExecuteQueryRow(
                        "SELECT booster_dmg_time, booster_hp_time, booster_shd_time FROM users WHERE id = @id LIMIT 1"
                    );

                    if (row == null)
                        return;

                    dbDmg = (int)row["booster_dmg_time"];
                    dbHp = (int)row["booster_hp_time"];
                    dbShd = (int)row["booster_shd_time"];
                }

                this.mBoosterDmgTime = dbDmg;
                this.mBoosterHpTime = dbHp;
                this.mBoosterShdTime = dbShd;

                int mask = GetBoosterMaskFromTimes(now);
                ApplyBoosterMaskIfChanged(session, mask);
            }
            catch
            {
            }
            finally
            {
                ScheduleNextBoosterAutoRefresh();
            }
        }



        public void AddBoosterReward(string type, int hours)
        {
            int num = hours * 3600;
            bool changed = false;

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);

                int now = GetUnixTimestampSeconds();

                if (type == "dmg")
                {
                    this.mBoosterDmgTime = (this.mBoosterDmgTime > now) ? (this.mBoosterDmgTime + num) : (now + num);
                    client.ExecuteNonQuery("UPDATE users SET booster_dmg_time = " + (object)this.mBoosterDmgTime + " WHERE id = @id LIMIT 1");
                    changed = true;
                }
                else if (type == "hp")
                {
                    this.mBoosterHpTime = (this.mBoosterHpTime > now) ? (this.mBoosterHpTime + num) : (now + num);
                    client.ExecuteNonQuery("UPDATE users SET booster_hp_time = " + (object)this.mBoosterHpTime + " WHERE id = @id LIMIT 1");
                    changed = true;
                }
                else if (type == "shd")
                {
                    this.mBoosterShdTime = (this.mBoosterShdTime > now) ? (this.mBoosterShdTime + num) : (now + num);
                    client.ExecuteNonQuery("UPDATE users SET booster_shd_time = " + (object)this.mBoosterShdTime + " WHERE id = @id LIMIT 1");
                    changed = true;
                }
            }

            if (!changed)
                return;

            Session session = SessionManager.GetSessionByCharacterId(this.mId);
            if (session != null)
                ApplyBoosterMaskIfChanged(session, GetBoosterMaskFromTimes());

            ScheduleNextBoosterAutoRefresh();
        }



        public void AddDronePart(int amount = 1)
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE users SET drone_parts = drone_parts + " + (object)amount + " WHERE id = @id LIMIT 1");
            }
        }

        public void AddLogfiles(int amount = 1)
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE users SET logfiles = logfiles + " + (object)amount + " WHERE id = @id LIMIT 1");
            }
        }

        public static string GetResName(long iResId)
        {
            if (iResId == 1L)
                return "prometium";
            if (iResId == 2L)
                return "endurium";
            if (iResId == 3L)
                return "terbium";
            if (iResId == 4L)
                return "xenomit";
            if (iResId == 5L)
                return "palladium";
            if (iResId == 11L)
                return "prometid";
            if (iResId == 12L)
                return "duranium";
            if (iResId == 13L)
                return "promerium";

            if (iResId == 14L)
                return "seprom";

            return "error";
        }


        public void AddCargo(long iResId, int iAmount)
        {
            if (iAmount < 0)
            {
                Console.WriteLine(iResId + " = montant negatif: " + iAmount);
                return;
            }

            string col = CharacterInfo.GetResName(iResId);
            if (col == "error")
            {
                Console.WriteLine("AddCargo: resId inconnu " + iResId);
                return;
            }

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE player_cargo SET " + col + " = " + col + " + " + (object)iAmount + " WHERE id = @id LIMIT 1");
            }
            this.mLabInfos.AddCargo(iResId, iAmount);
            this.mShipCargo = this.GetCurrentCargoTotal();
        }

        public void RemoveCargo(long iResId, int iAmount)
        {
            string col = CharacterInfo.GetResName(iResId);
            if (col == "error")
            {
                Console.WriteLine("RemoveCargo: resId inconnu " + iResId);
                return;
            }

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE player_cargo SET " + col + " = " + col + " - " + (object)iAmount + " WHERE id = @id LIMIT 1");
            }
            this.mLabInfos.RemoveCargo(iResId, iAmount);
            this.mShipCargo = this.GetCurrentCargoTotal();
        }


        public ServerMessage GetCargoMessage()
        {
            return PacketComposer.Compose("E",
                this.mLabInfos.Prometium.ToString() + "|" +
                (object)this.mLabInfos.Endurium + "|" +
                (object)this.mLabInfos.Terbium + "|" +
                (object)this.mLabInfos.Xenomit + "|" +
                (object)this.mLabInfos.Prometid + "|" +
                (object)this.mLabInfos.Duranium + "|" +
                (object)this.mLabInfos.Promerium + "|" +
                (object)this.mLabInfos.Seprom + "|" +
                (object)this.mLabInfos.Palladium
            );
        }

        public ServerMessage GetReffMessage()
        {
            int totalSeconds = (int)DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalSeconds;
            int num1 = this.mLabInfos.Speed[1] - totalSeconds;
            int num2 = num1 <= 60 ? (num1 <= 0 ? 0 : 1) : num1 / 60 + 1;
            int num3 = this.mLabInfos.Shield[1] - totalSeconds;
            int num4 = num3 <= 60 ? (num3 <= 0 ? 0 : 1) : num3 / 60 + 1;
            return PacketComposer.Compose("LAB", "UPD|INFO|LASER|" + (object)this.mLabInfos.Laser[0] + "|" + (object)this.mLabInfos.Laser[1] + "|ROCKET|" + (object)this.mLabInfos.Rocket[0] + "|" + (object)this.mLabInfos.Rocket[1] + "|DRIVING|" + (object)this.mLabInfos.Speed[0] + "|" + (object)num2 + "|SHIELD|" + (object)this.mLabInfos.Shield[0] + "|" + (object)num4);
        }


        public ServerMessage GetSepromSafeMessage()
        {
            return PacketComposer.Compose("LAB", "SAFE|INFO|" + (object)this.mSepromSafeLevel + "|" + (object)this.mSepromSafeStored + "|" + (object)this.GetSepromSafeCapacity());
        }

        public int GetSepromSafeCapacity()
        {
            return CharacterInfo.GetSepromSafeCapacityForLevel(this.mSepromSafeLevel);
        }

        public static int GetSepromSafeCapacityForLevel(int level)
        {
            switch (level)
            {
                case 1:
                    return 6000;
                case 2:
                    return 12000;
                case 3:
                    return 20000;
                default:
                    return 0;
            }
        }

        public static int GetSepromSafeUnlockCost(int level)
        {
            switch (level)
            {
                case 1:
                    return 30000;
                case 2:
                    return 60000;
                case 3:
                    return 90000;
                default:
                    return 0;
            }
        }

        private void EnsureSepromSafeStorage(SqlDatabaseClient client)
        {
            if (client == null)
                return;

            lock (CharacterInfo.mSepromSafeSyncRoot)
            {
                if (!CharacterInfo.mSepromSafeTableEnsured)
                {
                    client.ExecuteNonQuery(
                        "CREATE TABLE IF NOT EXISTS player_seprom_safe (" +
                        "player_id INT(11) NOT NULL, " +
                        "safe_level TINYINT(3) UNSIGNED NOT NULL DEFAULT 0, " +
                        "stored_seprom INT(11) NOT NULL DEFAULT 0, " +
                        "PRIMARY KEY (player_id)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
                    );
                    CharacterInfo.mSepromSafeTableEnsured = true;
                }
            }

            client.ClearParameters();
            client.SetParameter("id", (object)this.mId);
            client.ExecuteNonQuery("INSERT IGNORE INTO player_seprom_safe (player_id, safe_level, stored_seprom) VALUES (@id, 0, 0)");
        }

        public void LoadSepromSafe(SqlDatabaseClient client)
        {
            this.mSepromSafeLevel = 0;
            this.mSepromSafeStored = 0;

            if (client == null)
                return;

            this.EnsureSepromSafeStorage(client);

            client.ClearParameters();
            client.SetParameter("id", (object)this.mId);
            DataRow row = client.ExecuteQueryRow("SELECT CAST(safe_level AS UNSIGNED) AS safe_level, CAST(stored_seprom AS SIGNED) AS stored_seprom FROM player_seprom_safe WHERE player_id = @id LIMIT 1");
            if (row == null)
                return;

            object levelObj = row["safe_level"];
            object storedObj = row["stored_seprom"];
            int safeLevel = 0;
            int safeStored = 0;

            try
            {
                safeLevel = levelObj is bool ? ((bool)levelObj ? 1 : 0) : Convert.ToInt32(levelObj);
            }
            catch
            {
                int.TryParse(Convert.ToString(levelObj), out safeLevel);
            }

            try
            {
                safeStored = storedObj is bool ? ((bool)storedObj ? 1 : 0) : Convert.ToInt32(storedObj);
            }
            catch
            {
                int.TryParse(Convert.ToString(storedObj), out safeStored);
            }

            this.mSepromSafeLevel = Math.Max(0, Math.Min(3, safeLevel));
            this.mSepromSafeStored = Math.Max(0, safeStored);

            int cap = this.GetSepromSafeCapacity();
            if (cap > 0 && this.mSepromSafeStored > cap)
            {
                this.mSepromSafeStored = cap;
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE player_seprom_safe SET stored_seprom = " + (object)this.mSepromSafeStored + " WHERE player_id = @id LIMIT 1");
            }
        }

        public bool TryUnlockSepromSafe(SqlDatabaseClient client, int targetLevel, out int unlockCost, out string error)
        {
            unlockCost = 0;
            error = string.Empty;

            if (client == null)
            {
                error = "db_unavailable";
                return false;
            }

            this.EnsureSepromSafeStorage(client);

            if (targetLevel < 1 || targetLevel > 3)
            {
                error = "invalid_level";
                return false;
            }

            if (targetLevel <= this.mSepromSafeLevel)
            {
                error = "already_unlocked";
                return false;
            }

            if (targetLevel != this.mSepromSafeLevel + 1)
            {
                error = "unlock_order";
                return false;
            }

            unlockCost = CharacterInfo.GetSepromSafeUnlockCost(targetLevel);
            if (unlockCost <= 0)
            {
                error = "invalid_level";
                return false;
            }

            if (this.mUridium < (long)unlockCost)
            {
                error = "not_enough_uridium";
                return false;
            }

            client.ClearParameters();
            client.SetParameter("id", (object)this.mId);
            client.ExecuteNonQuery("UPDATE users SET uridium = uridium - " + (object)unlockCost + " WHERE id = @id LIMIT 1");
            this.mUridium -= (long)unlockCost;

            this.mSepromSafeLevel = targetLevel;

            client.ClearParameters();
            client.SetParameter("id", (object)this.mId);
            client.ExecuteNonQuery("UPDATE player_seprom_safe SET safe_level = " + (object)this.mSepromSafeLevel + " WHERE player_id = @id LIMIT 1");
            return true;
        }

        public bool TryDepositSepromToSafe(SqlDatabaseClient client, int requestedAmount, out int movedAmount, out string error)
        {
            movedAmount = 0;
            error = string.Empty;

            if (client == null)
            {
                error = "db_unavailable";
                return false;
            }

            this.EnsureSepromSafeStorage(client);

            if (this.mSepromSafeLevel <= 0)
            {
                error = "safe_locked";
                return false;
            }

            if (requestedAmount <= 0)
            {
                error = "invalid_amount";
                return false;
            }

            int cargoSeprom = this.mLabInfos == null ? 0 : this.mLabInfos.Seprom;
            if (cargoSeprom <= 0)
            {
                error = "not_enough_seprom";
                return false;
            }

            int capacity = this.GetSepromSafeCapacity();
            int freeSpace = Math.Max(0, capacity - this.mSepromSafeStored);
            if (freeSpace <= 0)
            {
                error = "safe_full";
                return false;
            }

            movedAmount = Math.Min(requestedAmount, Math.Min(cargoSeprom, freeSpace));
            if (movedAmount <= 0)
            {
                error = "invalid_amount";
                return false;
            }

            client.ClearParameters();
            client.SetParameter("id", (object)this.mId);
            client.ExecuteNonQuery("UPDATE player_cargo SET seprom = seprom - " + (object)movedAmount + " WHERE id = @id LIMIT 1");

            if (this.mLabInfos != null)
            {
                this.mLabInfos.Seprom -= movedAmount;
                if (this.mLabInfos.Seprom < 0)
                    this.mLabInfos.Seprom = 0;
            }
            this.mShipCargo = this.GetCurrentCargoTotal();

            this.mSepromSafeStored += movedAmount;
            client.ClearParameters();
            client.SetParameter("id", (object)this.mId);
            client.ExecuteNonQuery("UPDATE player_seprom_safe SET stored_seprom = " + (object)this.mSepromSafeStored + " WHERE player_id = @id LIMIT 1");
            return true;
        }

        public bool TryWithdrawSepromFromSafe(SqlDatabaseClient client, int requestedAmount, out int movedAmount, out string error)
        {
            movedAmount = 0;
            error = string.Empty;

            if (client == null)
            {
                error = "db_unavailable";
                return false;
            }

            this.EnsureSepromSafeStorage(client);

            if (this.mSepromSafeLevel <= 0)
            {
                error = "safe_locked";
                return false;
            }

            if (requestedAmount <= 0)
            {
                error = "invalid_amount";
                return false;
            }

            if (this.mSepromSafeStored <= 0)
            {
                error = "safe_empty";
                return false;
            }

            int freeCargo = this.mShipMaxCargo > 0 ? Math.Max(0, this.mShipMaxCargo - this.mShipCargo) : requestedAmount;
            if (freeCargo <= 0)
            {
                error = "cargo_full";
                return false;
            }

            movedAmount = Math.Min(requestedAmount, Math.Min(this.mSepromSafeStored, freeCargo));
            if (movedAmount <= 0)
            {
                error = "invalid_amount";
                return false;
            }

            this.mSepromSafeStored -= movedAmount;
            if (this.mSepromSafeStored < 0)
                this.mSepromSafeStored = 0;

            client.ClearParameters();
            client.SetParameter("id", (object)this.mId);
            client.ExecuteNonQuery("UPDATE player_seprom_safe SET stored_seprom = " + (object)this.mSepromSafeStored + " WHERE player_id = @id LIMIT 1");

            client.ClearParameters();
            client.SetParameter("id", (object)this.mId);
            client.ExecuteNonQuery("UPDATE player_cargo SET seprom = seprom + " + (object)movedAmount + " WHERE id = @id LIMIT 1");

            if (this.mLabInfos != null)
                this.mLabInfos.Seprom += movedAmount;

            this.mShipCargo = this.GetCurrentCargoTotal();
            return true;
        }

        public void AddSpeedReff(int iResId, int iAmount)
        {
            int totalSeconds = (int)DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalSeconds;
            if (this.mLabInfos.Speed[0] != iResId)
            {
                this.mLabInfos.Speed[0] = iResId;
                this.mLabInfos.Speed[1] = totalSeconds + 600 * iAmount;
            }
            else if (this.mLabInfos.Speed[1] > totalSeconds)
                this.mLabInfos.Speed[1] += 600 * iAmount;
            else
                this.mLabInfos.Speed[1] = totalSeconds + 600 * iAmount;
            this.mLabInfos.Speed[1] -= 5;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE player_reff SET speed0 = " + (object)this.mLabInfos.Speed[0] + ", speed1  = " + (object)this.mLabInfos.Speed[1] + " WHERE id = @id LIMIT 1");
            }
        }

        public void AddShieldReff(int iResId, int iAmount)
        {
            int totalSeconds = (int)DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalSeconds;
            if (this.mLabInfos.Shield[0] != iResId)
            {
                this.mLabInfos.Shield[0] = iResId;
                this.mLabInfos.Shield[1] = totalSeconds + 600 * iAmount;
            }
            else if (this.mLabInfos.Shield[1] > totalSeconds)
                this.mLabInfos.Shield[1] += 600 * iAmount;
            else
                this.mLabInfos.Shield[1] = totalSeconds + 600 * iAmount;
            this.mLabInfos.Shield[1] -= 5;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE player_reff SET shield0 = " + (object)this.mLabInfos.Shield[0] + ", shield1  = " + (object)this.mLabInfos.Shield[1] + " WHERE id = @id LIMIT 1");
            }
        }

        public void AddLaserReff(int iResId, int iAmount)
        {
            if (iAmount <= 0)
                return;

            int addUnits = iAmount * 10;

            if (this.mLabInfos.Laser[0] != iResId)
            {
                this.mLabInfos.Laser[0] = iResId;
                this.mLabInfos.Laser[1] = addUnits;
            }
            else
            {
                this.mLabInfos.Laser[1] += addUnits;
            }

            this.UpdateLaserReff();
        }


        public void UpdateLaserReff()
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE player_reff SET laser0 = " + (object)this.mLabInfos.Laser[0] + ", laser1  = " + (object)this.mLabInfos.Laser[1] + " WHERE id = @id LIMIT 1");
            }
        }

        public void AddRocketReff(int iResId, int iAmount)
        {
            if (iAmount <= 0)
                return;

            int addUnits = iAmount * 10;

            if (this.mLabInfos.Rocket[0] != iResId)
            {
                this.mLabInfos.Rocket[0] = iResId;
                this.mLabInfos.Rocket[1] = addUnits;
            }
            else
            {
                this.mLabInfos.Rocket[1] += addUnits;
            }

            this.UpdateRocketReff();
        }


        public void UpdateRocketReff()
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE player_reff SET rocket0 = " + (object)this.mLabInfos.Rocket[0] + ", rocket1  = " + (object)this.mLabInfos.Rocket[1] + " WHERE id = @id LIMIT 1");
            }
        }

        public void UpdateLaserRocketReff()
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE player_reff SET laser0 = " + (object)this.mLabInfos.Laser[0] + ", laser1  = " + (object)this.mLabInfos.Laser[1] + ", rocket0  = " + (object)this.mLabInfos.Rocket[0] + ", rocket1  = " + (object)this.mLabInfos.Rocket[1] + " WHERE id = @id LIMIT 1");
            }
        }
        public void GetDroneDisplayCounts(out int flax, out int iris)
        {
            flax = 0;
            iris = 0;

            if (string.IsNullOrEmpty(this.Drones))
                return;

            int total = 0;

            string[] entries = this.Drones.Split(new[] { '-' }, StringSplitOptions.RemoveEmptyEntries);

            foreach (string entry in entries)
            {
                if (total >= 8) break;

                string[] p = entry.Split('/');
                if (p.Length == 0) continue;

                int t;
                if (!int.TryParse(p[0], out t))
                    continue;

                if (t == 2 || t == 5)
                {
                    flax++;
                    total++;
                }
                else if (t == 3)
                {
                    iris++;
                    total++;
                }
            }
        }

        private static int SafeDataRowInt(DataRow row, string columnName)
        {
            if (row == null || row.Table == null || !row.Table.Columns.Contains(columnName) || row[columnName] == DBNull.Value)
                return 0;
            try
            {
                return Convert.ToInt32(row[columnName]);
            }
            catch
            {
                return 0;
            }
        }

        private static string SafeDataRowString(DataRow row, string columnName)
        {
            if (row == null || row.Table == null || !row.Table.Columns.Contains(columnName) || row[columnName] == DBNull.Value)
                return string.Empty;
            return Convert.ToString(row[columnName]) ?? string.Empty;
        }

        private static bool IsHavokDroneDesignRow(DataRow row)
        {
            int designItemId = SafeDataRowInt(row, "design_item_id");
            string designName = SafeDataRowString(row, "design_name").ToLowerInvariant();
            string designCategory = SafeDataRowString(row, "design_category").ToLowerInvariant();

            if (designItemId <= 0)
                return false;

            if (designItemId == 9001 || designName.Contains("havok") || designName.Contains("havoc"))
                return true;

            if (!string.IsNullOrEmpty(designCategory) && designCategory != "drone_design")
                return false;

            return false;
        }

        private List<string> GetDronePacketCodesFromDroneTable()
        {
            List<string> codes = new List<string>();

            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    client.ClearParameters();
                    client.SetParameter("player_id", (object)this.mId);

                    DataTable table = client.ExecuteQueryTable("SELECT d.id, d.item_id, dde.design_item_id, i.name AS design_name, i.category AS design_category FROM drone d LEFT JOIN drone_design_equipped dde ON dde.drone_id = d.id LEFT JOIN items i ON i.id = dde.design_item_id WHERE d.player_id = @player_id ORDER BY d.id ASC LIMIT 8");
                    if (table == null)
                        return codes;

                    foreach (DataRow row in table.Rows)
                    {
                        if (codes.Count >= 8) break;

                        int itemId = SafeDataRowInt(row, "item_id");
                        if (itemId == 3)
                        {
                            codes.Add(IsHavokDroneDesignRow(row) ? "25,H" : "25");
                        }
                        else if (itemId == 2 || itemId == 5)
                        {
                            codes.Add("15");
                        }
                    }
                }
            }
            catch
            {
                codes.Clear();
            }

            return codes;
        }

        public string GetDronePacketString()
        {
            List<string> codes = GetDronePacketCodesFromDroneTable();

            if (codes.Count == 0 && !string.IsNullOrEmpty(this.Drones))
            {
                string[] entries = this.Drones.Split(new[] { '-' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (string entry in entries)
                {
                    if (codes.Count >= 8) break;

                    string[] p = entry.Split('/');
                    if (p.Length == 0) continue;

                    int t;
                    if (!int.TryParse(p[0], out t))
                        continue;

                    if (t == 3) codes.Add("25");
                    else if (t == 2 || t == 5) codes.Add("15");
                }
            }

            var right = codes.Take(2).ToList();
            var down = codes.Skip(2).Take(4).ToList();
            var left = codes.Skip(6).Take(2).ToList();

            return "3/" + BuildGroup(right) + "/" + BuildGroup(down) + "/" + BuildGroup(left);
        }

        private static string BuildGroup(List<string> g)
        {
            if (g == null || g.Count == 0) return "0";
            return g.Count + "-" + string.Join("-", g);
        }
        private static long ReadAmmoInt64(DataRow row, string columnName, long defaultValue)
        {
            try
            {
                if (row == null || !row.Table.Columns.Contains(columnName) || row[columnName] == DBNull.Value)
                    return defaultValue;

                long value = Convert.ToInt64(row[columnName]);
                return value < 0L ? 0L : value;
            }
            catch
            {
                return defaultValue;
            }
        }

        private static long GetAmmoConsumeDelta(long dbBaselineValue, long localValue)
        {
            if (dbBaselineValue <= localValue)
                return 0L;

            return dbBaselineValue - localValue;
        }

        private static bool ApplyPositiveAmmoDelta(ref long localValue, long delta)
        {
            if (delta <= 0L)
                return false;

            localValue += delta;
            return true;
        }

        private void MarkAmmoClientUpdateIfNeeded(bool changed)
        {
            if (changed)
                Interlocked.Exchange(ref this.mAmmoSyncClientUpdatePending, 1);
        }

        public bool ConsumeAmmoSyncClientUpdatePending()
        {
            return Interlocked.Exchange(ref this.mAmmoSyncClientUpdatePending, 0) == 1;
        }

        private bool TryConsumePrimaryLaserColumn(ref long localValue, int amount)
        {
            lock (this.mPrimaryAmmoSyncLock)
            {
                if (localValue < amount)
                    return false;

                localValue -= amount;
                this.mPrimaryAmmoDirty = true;
                return true;
            }
        }

        public bool FlushPendingPrimaryAmmoToDb()
        {
            long ammoLcb10;
            long ammoMcb25;
            long ammoMcb50;
            long ammoUcb100;
            long ammoSab50;
            long ammoRsb75;
            long dbAmmoLcb10;
            long dbAmmoMcb25;
            long dbAmmoMcb50;
            long dbAmmoUcb100;
            long dbAmmoSab50;
            long dbAmmoRsb75;

            lock (this.mPrimaryAmmoSyncLock)
            {
                if (!this.mPrimaryAmmoDirty)
                    return false;

                ammoLcb10 = this.AmmoLcb10;
                ammoMcb25 = this.AmmoMcb25;
                ammoMcb50 = this.AmmoMcb50;
                ammoUcb100 = this.AmmoUcb100;
                ammoSab50 = this.AmmoSab50;
                ammoRsb75 = this.AmmoRsb75;

                dbAmmoLcb10 = this.mDbAmmoLcb10;
                dbAmmoMcb25 = this.mDbAmmoMcb25;
                dbAmmoMcb50 = this.mDbAmmoMcb50;
                dbAmmoUcb100 = this.mDbAmmoUcb100;
                dbAmmoSab50 = this.mDbAmmoSab50;
                dbAmmoRsb75 = this.mDbAmmoRsb75;
            }

            long consumeLcb10 = GetAmmoConsumeDelta(dbAmmoLcb10, ammoLcb10);
            long consumeMcb25 = GetAmmoConsumeDelta(dbAmmoMcb25, ammoMcb25);
            long consumeMcb50 = GetAmmoConsumeDelta(dbAmmoMcb50, ammoMcb50);
            long consumeUcb100 = GetAmmoConsumeDelta(dbAmmoUcb100, ammoUcb100);
            long consumeSab50 = GetAmmoConsumeDelta(dbAmmoSab50, ammoSab50);
            long consumeRsb75 = GetAmmoConsumeDelta(dbAmmoRsb75, ammoRsb75);

            if (consumeLcb10 <= 0L && consumeMcb25 <= 0L && consumeMcb50 <= 0L && consumeUcb100 <= 0L && consumeSab50 <= 0L && consumeRsb75 <= 0L)
            {
                lock (this.mPrimaryAmmoSyncLock)
                    this.mPrimaryAmmoDirty = false;
                return false;
            }

            DataRow row;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient("AmmoSyncTick.PrimaryAmmoFlush"))
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.SetParameter("consume_lcb10", (object)consumeLcb10);
                client.SetParameter("consume_mcb25", (object)consumeMcb25);
                client.SetParameter("consume_mcb50", (object)consumeMcb50);
                client.SetParameter("consume_ucb100", (object)consumeUcb100);
                client.SetParameter("consume_sab50", (object)consumeSab50);
                client.SetParameter("consume_rsb75", (object)consumeRsb75);
                client.ExecuteNonQuery(
                    "UPDATE users SET ammo_lcb10=IF(ammo_lcb10 > @consume_lcb10, ammo_lcb10 - @consume_lcb10, 0), ammo_mcb25=IF(ammo_mcb25 > @consume_mcb25, ammo_mcb25 - @consume_mcb25, 0), ammo_mcb50=IF(ammo_mcb50 > @consume_mcb50, ammo_mcb50 - @consume_mcb50, 0), ammo_ucb100=IF(ammo_ucb100 > @consume_ucb100, ammo_ucb100 - @consume_ucb100, 0), ammo_sab50=IF(ammo_sab50 > @consume_sab50, ammo_sab50 - @consume_sab50, 0), ammo_rsb75=IF(ammo_rsb75 > @consume_rsb75, ammo_rsb75 - @consume_rsb75, 0) WHERE id=@id LIMIT 1"
                );

                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                row = client.ExecuteQueryRow("SELECT ammo_lcb10, ammo_mcb25, ammo_mcb50, ammo_ucb100, ammo_sab50, ammo_rsb75 FROM users WHERE id=@id LIMIT 1");
            }

            if (row == null)
                return false;

            long finalLcb10 = ReadAmmoInt64(row, "ammo_lcb10", ammoLcb10);
            long finalMcb25 = ReadAmmoInt64(row, "ammo_mcb25", ammoMcb25);
            long finalMcb50 = ReadAmmoInt64(row, "ammo_mcb50", ammoMcb50);
            long finalUcb100 = ReadAmmoInt64(row, "ammo_ucb100", ammoUcb100);
            long finalSab50 = ReadAmmoInt64(row, "ammo_sab50", ammoSab50);
            long finalRsb75 = ReadAmmoInt64(row, "ammo_rsb75", ammoRsb75);
            bool changedForClient = false;

            lock (this.mPrimaryAmmoSyncLock)
            {
                bool unchangedSinceSnapshot = this.AmmoLcb10 == ammoLcb10
                    && this.AmmoMcb25 == ammoMcb25
                    && this.AmmoMcb50 == ammoMcb50
                    && this.AmmoUcb100 == ammoUcb100
                    && this.AmmoSab50 == ammoSab50
                    && this.AmmoRsb75 == ammoRsb75;

                if (unchangedSinceSnapshot)
                {
                    changedForClient = this.AmmoLcb10 != finalLcb10
                        || this.AmmoMcb25 != finalMcb25
                        || this.AmmoMcb50 != finalMcb50
                        || this.AmmoUcb100 != finalUcb100
                        || this.AmmoSab50 != finalSab50
                        || this.AmmoRsb75 != finalRsb75;

                    this.AmmoLcb10 = finalLcb10;
                    this.AmmoMcb25 = finalMcb25;
                    this.AmmoMcb50 = finalMcb50;
                    this.AmmoUcb100 = finalUcb100;
                    this.AmmoSab50 = finalSab50;
                    this.AmmoRsb75 = finalRsb75;
                    this.mPrimaryAmmoDirty = false;
                }
                else
                {
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoLcb10, finalLcb10 - ammoLcb10);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoMcb25, finalMcb25 - ammoMcb25);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoMcb50, finalMcb50 - ammoMcb50);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoUcb100, finalUcb100 - ammoUcb100);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoSab50, finalSab50 - ammoSab50);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoRsb75, finalRsb75 - ammoRsb75);
                    this.mPrimaryAmmoDirty = true;
                }

                this.mDbAmmoLcb10 = finalLcb10;
                this.mDbAmmoMcb25 = finalMcb25;
                this.mDbAmmoMcb50 = finalMcb50;
                this.mDbAmmoUcb100 = finalUcb100;
                this.mDbAmmoSab50 = finalSab50;
                this.mDbAmmoRsb75 = finalRsb75;
            }

            this.MarkAmmoClientUpdateIfNeeded(changedForClient);
            return changedForClient;
        }

        public bool FlushPendingSecondaryAmmoToDb()
        {
            long ammoR310;
            long ammoPlt2026;
            long ammoPlt2021;
            long ammoDcr250;
            long ammoHstrm01;
            long ammoUbr100;
            long ammoEco10;
            long ammoSmb01;
            long ammoIsh01;
            long ammoEmp01;
            long dbAmmoR310;
            long dbAmmoPlt2026;
            long dbAmmoPlt2021;
            long dbAmmoDcr250;
            long dbAmmoHstrm01;
            long dbAmmoUbr100;
            long dbAmmoEco10;
            long dbAmmoSmb01;
            long dbAmmoIsh01;
            long dbAmmoEmp01;

            lock (this.mSecondaryAmmoSyncLock)
            {
                if (!this.mSecondaryAmmoDirty)
                    return false;

                ammoR310 = this.AmmoR310;
                ammoPlt2026 = this.AmmoPlt2026;
                ammoPlt2021 = this.AmmoPlt2021;
                ammoDcr250 = this.AmmoDcr250;
                ammoHstrm01 = this.AmmoHstrm01;
                ammoUbr100 = this.AmmoUbr100;
                ammoEco10 = this.AmmoEco10;
                ammoSmb01 = this.AmmoSmb01;
                ammoIsh01 = this.AmmoIsh01;
                ammoEmp01 = this.AmmoEmp01;

                dbAmmoR310 = this.mDbAmmoR310;
                dbAmmoPlt2026 = this.mDbAmmoPlt2026;
                dbAmmoPlt2021 = this.mDbAmmoPlt2021;
                dbAmmoDcr250 = this.mDbAmmoDcr250;
                dbAmmoHstrm01 = this.mDbAmmoHstrm01;
                dbAmmoUbr100 = this.mDbAmmoUbr100;
                dbAmmoEco10 = this.mDbAmmoEco10;
                dbAmmoSmb01 = this.mDbAmmoSmb01;
                dbAmmoIsh01 = this.mDbAmmoIsh01;
                dbAmmoEmp01 = this.mDbAmmoEmp01;
            }

            long consumeR310 = GetAmmoConsumeDelta(dbAmmoR310, ammoR310);
            long consumePlt2026 = GetAmmoConsumeDelta(dbAmmoPlt2026, ammoPlt2026);
            long consumePlt2021 = GetAmmoConsumeDelta(dbAmmoPlt2021, ammoPlt2021);
            long consumeDcr250 = GetAmmoConsumeDelta(dbAmmoDcr250, ammoDcr250);
            long consumeHstrm01 = GetAmmoConsumeDelta(dbAmmoHstrm01, ammoHstrm01);
            long consumeUbr100 = GetAmmoConsumeDelta(dbAmmoUbr100, ammoUbr100);
            long consumeEco10 = GetAmmoConsumeDelta(dbAmmoEco10, ammoEco10);
            long consumeSmb01 = GetAmmoConsumeDelta(dbAmmoSmb01, ammoSmb01);
            long consumeIsh01 = GetAmmoConsumeDelta(dbAmmoIsh01, ammoIsh01);
            long consumeEmp01 = GetAmmoConsumeDelta(dbAmmoEmp01, ammoEmp01);

            if (consumeR310 <= 0L && consumePlt2026 <= 0L && consumePlt2021 <= 0L && consumeDcr250 <= 0L && consumeHstrm01 <= 0L && consumeUbr100 <= 0L && consumeEco10 <= 0L && consumeSmb01 <= 0L && consumeIsh01 <= 0L && consumeEmp01 <= 0L)
            {
                lock (this.mSecondaryAmmoSyncLock)
                    this.mSecondaryAmmoDirty = false;
                return false;
            }

            DataRow row;
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient("AmmoSyncTick.SecondaryAmmoFlush"))
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.SetParameter("consume_r310", (object)consumeR310);
                client.SetParameter("consume_plt2026", (object)consumePlt2026);
                client.SetParameter("consume_plt2021", (object)consumePlt2021);
                client.SetParameter("consume_dcr250", (object)consumeDcr250);
                client.SetParameter("consume_hstrm01", (object)consumeHstrm01);
                client.SetParameter("consume_ubr100", (object)consumeUbr100);
                client.SetParameter("consume_eco10", (object)consumeEco10);
                client.SetParameter("consume_smb01", (object)consumeSmb01);
                client.SetParameter("consume_ish01", (object)consumeIsh01);
                client.SetParameter("consume_emp01", (object)consumeEmp01);
                client.ExecuteNonQuery(
                    "UPDATE users SET ammo_r310=IF(ammo_r310 > @consume_r310, ammo_r310 - @consume_r310, 0), ammo_plt2026=IF(ammo_plt2026 > @consume_plt2026, ammo_plt2026 - @consume_plt2026, 0), ammo_plt2021=IF(ammo_plt2021 > @consume_plt2021, ammo_plt2021 - @consume_plt2021, 0), ammo_dcr250=IF(ammo_dcr250 > @consume_dcr250, ammo_dcr250 - @consume_dcr250, 0), ammo_hstrm01=IF(ammo_hstrm01 > @consume_hstrm01, ammo_hstrm01 - @consume_hstrm01, 0), ammo_ubr100=IF(ammo_ubr100 > @consume_ubr100, ammo_ubr100 - @consume_ubr100, 0), ammo_eco10=IF(ammo_eco10 > @consume_eco10, ammo_eco10 - @consume_eco10, 0), ammo_smb01=IF(ammo_smb01 > @consume_smb01, ammo_smb01 - @consume_smb01, 0), ammo_ish01=IF(ammo_ish01 > @consume_ish01, ammo_ish01 - @consume_ish01, 0), ammo_emp01=IF(ammo_emp01 > @consume_emp01, ammo_emp01 - @consume_emp01, 0) WHERE id=@id LIMIT 1"
                );

                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                row = client.ExecuteQueryRow("SELECT ammo_r310, ammo_plt2026, ammo_plt2021, ammo_dcr250, ammo_hstrm01, ammo_ubr100, ammo_eco10, ammo_smb01, ammo_ish01, ammo_emp01 FROM users WHERE id=@id LIMIT 1");
            }

            if (row == null)
                return false;

            long finalR310 = ReadAmmoInt64(row, "ammo_r310", ammoR310);
            long finalPlt2026 = ReadAmmoInt64(row, "ammo_plt2026", ammoPlt2026);
            long finalPlt2021 = ReadAmmoInt64(row, "ammo_plt2021", ammoPlt2021);
            long finalDcr250 = ReadAmmoInt64(row, "ammo_dcr250", ammoDcr250);
            long finalHstrm01 = ReadAmmoInt64(row, "ammo_hstrm01", ammoHstrm01);
            long finalUbr100 = ReadAmmoInt64(row, "ammo_ubr100", ammoUbr100);
            long finalEco10 = ReadAmmoInt64(row, "ammo_eco10", ammoEco10);
            long finalSmb01 = ReadAmmoInt64(row, "ammo_smb01", ammoSmb01);
            long finalIsh01 = ReadAmmoInt64(row, "ammo_ish01", ammoIsh01);
            long finalEmp01 = ReadAmmoInt64(row, "ammo_emp01", ammoEmp01);
            bool changedForClient = false;

            lock (this.mSecondaryAmmoSyncLock)
            {
                bool unchangedSinceSnapshot = this.AmmoR310 == ammoR310
                    && this.AmmoPlt2026 == ammoPlt2026
                    && this.AmmoPlt2021 == ammoPlt2021
                    && this.AmmoDcr250 == ammoDcr250
                    && this.AmmoHstrm01 == ammoHstrm01
                    && this.AmmoUbr100 == ammoUbr100
                    && this.AmmoEco10 == ammoEco10
                    && this.AmmoSmb01 == ammoSmb01
                    && this.AmmoIsh01 == ammoIsh01
                    && this.AmmoEmp01 == ammoEmp01;

                if (unchangedSinceSnapshot)
                {
                    changedForClient = this.AmmoR310 != finalR310
                        || this.AmmoPlt2026 != finalPlt2026
                        || this.AmmoPlt2021 != finalPlt2021
                        || this.AmmoDcr250 != finalDcr250
                        || this.AmmoHstrm01 != finalHstrm01
                        || this.AmmoUbr100 != finalUbr100
                        || this.AmmoEco10 != finalEco10
                        || this.AmmoSmb01 != finalSmb01
                        || this.AmmoIsh01 != finalIsh01
                        || this.AmmoEmp01 != finalEmp01;

                    this.AmmoR310 = finalR310;
                    this.AmmoPlt2026 = finalPlt2026;
                    this.AmmoPlt2021 = finalPlt2021;
                    this.AmmoDcr250 = finalDcr250;
                    this.AmmoHstrm01 = finalHstrm01;
                    this.AmmoUbr100 = finalUbr100;
                    this.AmmoEco10 = finalEco10;
                    this.AmmoSmb01 = finalSmb01;
                    this.AmmoIsh01 = finalIsh01;
                    this.AmmoEmp01 = finalEmp01;
                    this.mSecondaryAmmoDirty = false;
                }
                else
                {
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoR310, finalR310 - ammoR310);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoPlt2026, finalPlt2026 - ammoPlt2026);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoPlt2021, finalPlt2021 - ammoPlt2021);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoDcr250, finalDcr250 - ammoDcr250);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoHstrm01, finalHstrm01 - ammoHstrm01);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoUbr100, finalUbr100 - ammoUbr100);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoEco10, finalEco10 - ammoEco10);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoSmb01, finalSmb01 - ammoSmb01);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoIsh01, finalIsh01 - ammoIsh01);
                    changedForClient |= ApplyPositiveAmmoDelta(ref this.AmmoEmp01, finalEmp01 - ammoEmp01);
                    this.mSecondaryAmmoDirty = true;
                }

                this.mDbAmmoR310 = finalR310;
                this.mDbAmmoPlt2026 = finalPlt2026;
                this.mDbAmmoPlt2021 = finalPlt2021;
                this.mDbAmmoDcr250 = finalDcr250;
                this.mDbAmmoHstrm01 = finalHstrm01;
                this.mDbAmmoUbr100 = finalUbr100;
                this.mDbAmmoEco10 = finalEco10;
                this.mDbAmmoSmb01 = finalSmb01;
                this.mDbAmmoIsh01 = finalIsh01;
                this.mDbAmmoEmp01 = finalEmp01;
            }

            this.MarkAmmoClientUpdateIfNeeded(changedForClient);
            return changedForClient;
        }

        public bool TryEnterLaserAttackTick()
        {
            return Interlocked.Exchange(ref this.mLaserAttackTickGuard, 1) == 0;
        }

        public void ExitLaserAttackTick()
        {
            Interlocked.Exchange(ref this.mLaserAttackTickGuard, 0);
        }

        public bool IsLaserAttackTickRunning
        {
            get
            {
                return Volatile.Read(ref this.mLaserAttackTickGuard) != 0;
            }
        }

        public void WaitForLaserAttackTickToFinish(int timeoutMs)
        {
            SpinWait.SpinUntil(() => !this.IsLaserAttackTickRunning, timeoutMs);
        }

        public string GetPrimaryWeaponInfoPayload()
        {
            return $"{AmmoLcb10}|{AmmoMcb25}|{AmmoMcb50}|{AmmoUcb100}|{AmmoSab50}|{AmmoRsb75}";
        }

        public string GetSecondaryWeaponInfoPayload()
        {
            return $"{AmmoR310}|{AmmoPlt2026}|{AmmoPlt2021}|0|0|{AmmoDcr250}|0|0|{AmmoSmb01}|{AmmoIsh01}|{AmmoEmp01}|0|0|0";
        }

        public string GetRocketLauncherAmmoPayload()
        {
            return $"{AmmoHstrm01}|{AmmoUbr100}|{AmmoEco10}";
        }

        public bool HasLauncherRocketAmmo(int rocketId, int amount = 1)
        {
            int required = amount <= 0 ? 1 : amount;

            switch (rocketId)
            {
                case 7: return this.AmmoHstrm01 >= required;
                case 8: return this.AmmoUbr100 >= required;
                case 9: return this.AmmoEco10 >= required;
                default:
                    return false;
            }
        }

        private bool TryConsumeColumn(string column, ref long localValue, int amount = 1)
        {
            int required = amount <= 0 ? 1 : amount;

            lock (this.mSecondaryAmmoSyncLock)
            {
                if (localValue < required)
                    return false;

                localValue -= required;
                this.mSecondaryAmmoDirty = true;
                return true;
            }
        }

        public bool TryConsumeLaserAmmo(int ammoId)
        {
            int lasersCount = 18;

            switch (ammoId)
            {
                case 1: return this.TryConsumePrimaryLaserColumn(ref this.AmmoLcb10, lasersCount);
                case 2: return this.TryConsumePrimaryLaserColumn(ref this.AmmoMcb25, lasersCount);
                case 3: return this.TryConsumePrimaryLaserColumn(ref this.AmmoMcb50, lasersCount);
                case 4: return this.TryConsumePrimaryLaserColumn(ref this.AmmoUcb100, lasersCount);
                case 5: return this.TryConsumePrimaryLaserColumn(ref this.AmmoSab50, lasersCount);
                case 6: return this.TryConsumePrimaryLaserColumn(ref this.AmmoRsb75, lasersCount);
                default:
                    return false;
            }
        }

        public bool TryConsumeRocketAmmo(int rocketId)
        {
            int rocketConsumption = 1;

            switch (rocketId)
            {
                case 1: return TryConsumeColumn("ammo_r310", ref AmmoR310, rocketConsumption);
                case 2: return TryConsumeColumn("ammo_plt2026", ref AmmoPlt2026, rocketConsumption);
                case 3: return TryConsumeColumn("ammo_plt2021", ref AmmoPlt2021, rocketConsumption);
                case 10: return TryConsumeColumn("ammo_dcr250", ref AmmoDcr250, rocketConsumption);
                default:
                    return false;
            }
        }

        public bool TryConsumeLauncherRocketAmmo(int rocketId, int amount = 1)
        {
            int rocketConsumption = amount <= 0 ? 1 : amount;

            switch (rocketId)
            {
                case 7: return TryConsumeColumn("ammo_hstrm01", ref AmmoHstrm01, rocketConsumption);
                case 8: return TryConsumeColumn("ammo_ubr100", ref AmmoUbr100, rocketConsumption);
                case 9: return TryConsumeColumn("ammo_eco10", ref AmmoEco10, rocketConsumption);
                default:
                    return false;
            }
        }
        public bool TryConsumeExplosiveAmmo(string explosiveCode)
        {
            switch (explosiveCode)
            {
                case "SMB": return TryConsumeColumn("ammo_smb01", ref AmmoSmb01, 1);
                case "ISH": return TryConsumeColumn("ammo_ish01", ref AmmoIsh01, 1);
                case "EMP": return TryConsumeColumn("ammo_emp01", ref AmmoEmp01, 1);
                default:
                    return false;
            }
        }


        public bool RefreshQuestRewardData()
        {
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);

                DataRow row = client.ExecuteQueryRow("SELECT credits, uridium, experience, honor, ammo_lcb10, ammo_mcb25, ammo_mcb50, ammo_ucb100, ammo_sab50, ammo_rsb75, ammo_r310, ammo_plt2026, ammo_plt2021, ammo_dcr250, ammo_hstrm01, ammo_ubr100, ammo_eco10, ammo_smb01, ammo_ish01, ammo_emp01 FROM users WHERE id=@id LIMIT 1");
                if (row == null)
                    return false;

                Func<string, long, long> getInt64 = (columnName, defaultValue) =>
                {
                    try
                    {
                        if (!row.Table.Columns.Contains(columnName) || row[columnName] == DBNull.Value)
                            return defaultValue;
                        return Convert.ToInt64(row[columnName]);
                    }
                    catch
                    {
                        return defaultValue;
                    }
                };

                bool changed = false;
                long value;

                value = getInt64("credits", this.mCredits);
                if (this.mCredits != value) { this.mCredits = value; changed = true; }

                value = getInt64("uridium", this.mUridium);
                if (this.mUridium != value) { this.mUridium = value; changed = true; }

                value = getInt64("experience", this.mExperience);
                if (this.mExperience != value)
                {
                    this.mExperience = value;
                    changed = true;
                }

                int level = ExperienceSystem.GetLevelFromExperience(this.mExperience);
                if (this.mLevel != level) { this.mLevel = level; changed = true; }

                value = getInt64("honor", this.mHonor);
                if (this.mHonor != value) { this.mHonor = value; changed = true; }

                lock (this.mPrimaryAmmoSyncLock)
                {
                    if (!this.mPrimaryAmmoDirty)
                    {
                        value = getInt64("ammo_lcb10", this.AmmoLcb10); if (value > this.AmmoLcb10) { this.AmmoLcb10 = value; this.mDbAmmoLcb10 = value; changed = true; }
                        value = getInt64("ammo_mcb25", this.AmmoMcb25); if (value > this.AmmoMcb25) { this.AmmoMcb25 = value; this.mDbAmmoMcb25 = value; changed = true; }
                        value = getInt64("ammo_mcb50", this.AmmoMcb50); if (value > this.AmmoMcb50) { this.AmmoMcb50 = value; this.mDbAmmoMcb50 = value; changed = true; }
                        value = getInt64("ammo_ucb100", this.AmmoUcb100); if (value > this.AmmoUcb100) { this.AmmoUcb100 = value; this.mDbAmmoUcb100 = value; changed = true; }
                        value = getInt64("ammo_sab50", this.AmmoSab50); if (value > this.AmmoSab50) { this.AmmoSab50 = value; this.mDbAmmoSab50 = value; changed = true; }
                        value = getInt64("ammo_rsb75", this.AmmoRsb75); if (value > this.AmmoRsb75) { this.AmmoRsb75 = value; this.mDbAmmoRsb75 = value; changed = true; }
                    }
                }

                lock (this.mSecondaryAmmoSyncLock)
                {
                    if (!this.mSecondaryAmmoDirty)
                    {
                        value = getInt64("ammo_r310", this.AmmoR310); if (value > this.AmmoR310) { this.AmmoR310 = value; this.mDbAmmoR310 = value; changed = true; }
                        value = getInt64("ammo_plt2026", this.AmmoPlt2026); if (value > this.AmmoPlt2026) { this.AmmoPlt2026 = value; this.mDbAmmoPlt2026 = value; changed = true; }
                        value = getInt64("ammo_plt2021", this.AmmoPlt2021); if (value > this.AmmoPlt2021) { this.AmmoPlt2021 = value; this.mDbAmmoPlt2021 = value; changed = true; }
                        value = getInt64("ammo_dcr250", this.AmmoDcr250); if (value > this.AmmoDcr250) { this.AmmoDcr250 = value; this.mDbAmmoDcr250 = value; changed = true; }
                        value = getInt64("ammo_hstrm01", this.AmmoHstrm01); if (value > this.AmmoHstrm01) { this.AmmoHstrm01 = value; this.mDbAmmoHstrm01 = value; changed = true; }
                        value = getInt64("ammo_ubr100", this.AmmoUbr100); if (value > this.AmmoUbr100) { this.AmmoUbr100 = value; this.mDbAmmoUbr100 = value; changed = true; }
                        value = getInt64("ammo_eco10", this.AmmoEco10); if (value > this.AmmoEco10) { this.AmmoEco10 = value; this.mDbAmmoEco10 = value; changed = true; }
                        value = getInt64("ammo_smb01", this.AmmoSmb01); if (value > this.AmmoSmb01) { this.AmmoSmb01 = value; this.mDbAmmoSmb01 = value; changed = true; }
                        value = getInt64("ammo_ish01", this.AmmoIsh01); if (value > this.AmmoIsh01) { this.AmmoIsh01 = value; this.mDbAmmoIsh01 = value; changed = true; }
                        value = getInt64("ammo_emp01", this.AmmoEmp01); if (value > this.AmmoEmp01) { this.AmmoEmp01 = value; this.mDbAmmoEmp01 = value; changed = true; }
                    }
                }

                return changed;
            }
        }

        public bool RefreshAmmoFromDbIfHigher()
        {
            long perfStart = PerformanceProfiler.Start();
            try
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient("RefreshAmmoFromDbIfHigher"))
                {
                    client.ClearParameters();
                    client.SetParameter("id", (object)this.mId);

                    DataRow row = client.ExecuteQueryRow("SELECT ammo_lcb10, ammo_mcb25, ammo_mcb50, ammo_ucb100, ammo_sab50, ammo_rsb75, ammo_r310, ammo_plt2026, ammo_plt2021, ammo_dcr250, ammo_hstrm01, ammo_ubr100, ammo_eco10, ammo_smb01, ammo_ish01, ammo_emp01 FROM users WHERE id=@id LIMIT 1");
                    if (row == null) return false;

                    Func<string, long, long> getInt64 = (columnName, defaultValue) =>
                    {
                        try
                        {
                            if (!row.Table.Columns.Contains(columnName) || row[columnName] == DBNull.Value)
                                return defaultValue;
                            return Convert.ToInt64(row[columnName]);
                        }
                        catch
                        {
                            return defaultValue;
                        }
                    };

                    bool changed = false;
                    long v;

                    lock (this.mPrimaryAmmoSyncLock)
                    {
                        if (!this.mPrimaryAmmoDirty)
                        {
                            v = getInt64("ammo_lcb10", AmmoLcb10); if (v > AmmoLcb10) { AmmoLcb10 = v; mDbAmmoLcb10 = v; changed = true; }
                            v = getInt64("ammo_mcb25", AmmoMcb25); if (v > AmmoMcb25) { AmmoMcb25 = v; mDbAmmoMcb25 = v; changed = true; }
                            v = getInt64("ammo_mcb50", AmmoMcb50); if (v > AmmoMcb50) { AmmoMcb50 = v; mDbAmmoMcb50 = v; changed = true; }
                            v = getInt64("ammo_ucb100", AmmoUcb100); if (v > AmmoUcb100) { AmmoUcb100 = v; mDbAmmoUcb100 = v; changed = true; }
                            v = getInt64("ammo_sab50", AmmoSab50); if (v > AmmoSab50) { AmmoSab50 = v; mDbAmmoSab50 = v; changed = true; }
                            v = getInt64("ammo_rsb75", AmmoRsb75); if (v > AmmoRsb75) { AmmoRsb75 = v; mDbAmmoRsb75 = v; changed = true; }
                        }
                    }

                    lock (this.mSecondaryAmmoSyncLock)
                    {
                        if (!this.mSecondaryAmmoDirty)
                        {
                            v = getInt64("ammo_r310", AmmoR310); if (v > AmmoR310) { AmmoR310 = v; mDbAmmoR310 = v; changed = true; }
                            v = getInt64("ammo_plt2026", AmmoPlt2026); if (v > AmmoPlt2026) { AmmoPlt2026 = v; mDbAmmoPlt2026 = v; changed = true; }
                            v = getInt64("ammo_plt2021", AmmoPlt2021); if (v > AmmoPlt2021) { AmmoPlt2021 = v; mDbAmmoPlt2021 = v; changed = true; }
                            v = getInt64("ammo_dcr250", AmmoDcr250); if (v > AmmoDcr250) { AmmoDcr250 = v; mDbAmmoDcr250 = v; changed = true; }
                            v = getInt64("ammo_hstrm01", AmmoHstrm01); if (v > AmmoHstrm01) { AmmoHstrm01 = v; mDbAmmoHstrm01 = v; changed = true; }
                            v = getInt64("ammo_ubr100", AmmoUbr100); if (v > AmmoUbr100) { AmmoUbr100 = v; mDbAmmoUbr100 = v; changed = true; }
                            v = getInt64("ammo_eco10", AmmoEco10); if (v > AmmoEco10) { AmmoEco10 = v; mDbAmmoEco10 = v; changed = true; }
                            v = getInt64("ammo_smb01", AmmoSmb01); if (v > AmmoSmb01) { AmmoSmb01 = v; mDbAmmoSmb01 = v; changed = true; }
                            v = getInt64("ammo_ish01", AmmoIsh01); if (v > AmmoIsh01) { AmmoIsh01 = v; mDbAmmoIsh01 = v; changed = true; }
                            v = getInt64("ammo_emp01", AmmoEmp01); if (v > AmmoEmp01) { AmmoEmp01 = v; mDbAmmoEmp01 = v; changed = true; }
                        }
                    }

                    this.MarkAmmoClientUpdateIfNeeded(changed);
                    return changed;
                }
            }
            finally
            {
                PerformanceProfiler.LogTimer("RefreshAmmoFromDbIfHigher", this.mId, perfStart);
            }
        }

        public bool HasPendingWebsiteConfigRefresh(SqlDatabaseClient client, out int activeConfig)
        {
            long perfStart = PerformanceProfiler.Start();
            activeConfig = this.ActiveConfig;

            try
            {
                if (client == null)
                    return false;

                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);

                DataRow row = client.ExecuteQueryRow(
                    "SELECT config_refresh_pending, active_config, shipid FROM users WHERE id=@id LIMIT 1"
                );

                if (row == null)
                    return false;

                int pending = 0;
                if (row.Table.Columns.Contains("config_refresh_pending") && row["config_refresh_pending"] != DBNull.Value)
                    pending = Convert.ToInt32(row["config_refresh_pending"]);

                if (row.Table.Columns.Contains("active_config") && row["active_config"] != DBNull.Value)
                    activeConfig = Convert.ToInt32(row["active_config"]);

                return pending > 0;
            }
            catch
            {
                return false;
            }
            finally
            {
                PerformanceProfiler.LogTimer("HasPendingWebsiteConfigRefresh", this.mId, perfStart);
            }
        }

        public void ClearPendingWebsiteConfigRefreshFlag(SqlDatabaseClient client)
        {
            if (client == null)
                return;

            try
            {
                client.ClearParameters();
                client.SetParameter("id", (object)this.mId);
                client.ExecuteNonQuery("UPDATE users SET config_refresh_pending = 0 WHERE id=@id LIMIT 1");
            }
            catch
            {
            }
        }




        public bool HasAutoRocketCpu
        {
            get
            {
                return this.ActiveConfig == 1 ? this.mHasAutoRocketCpuCfgA : this.mHasAutoRocketCpuCfgB;
            }
        }

        public bool HasCargoCompressor
        {
            get
            {
                return this.ActiveConfig == 1 ? this.mHasCargoCompressorCfgA : this.mHasCargoCompressorCfgB;
            }
        }

        public bool HasRocketLauncherCpu
        {
            get
            {
                if (this.EquippedRocketLauncherType > 0)
                    return true;

                return this.ActiveConfig == 1 ? this.mHasRocketLauncherCpuCfgA : this.mHasRocketLauncherCpuCfgB;
            }
        }

        public int EquippedRocketLauncherType
        {
            get
            {
                int launcherType = this.ActiveConfig == 1 ? this.mRocketLauncherTypeCfgA : this.mRocketLauncherTypeCfgB;
                return launcherType == 1 || launcherType == 2 ? launcherType : 0;
            }
        }

        public bool HasRocketLauncher
        {
            get
            {
                return this.EquippedRocketLauncherType > 0;
            }
        }

        public bool HasAnyRocketLauncherAmmo
        {
            get
            {
                return this.AmmoHstrm01 > 0L || this.AmmoUbr100 > 0L || this.AmmoEco10 > 0L;
            }
        }

        public void RefreshEquippedExtras(SqlDatabaseClient MySqlClient)
        {
            if (MySqlClient == null)
                return;

            this.mHasAutoRocketCpuCfgA = false;
            this.mHasAutoRocketCpuCfgB = false;
            this.mHasCargoCompressorCfgA = false;
            this.mHasCargoCompressorCfgB = false;
            this.mHasRocketLauncherCpuCfgA = false;
            this.mHasRocketLauncherCpuCfgB = false;
            this.mRocketLauncherTypeCfgA = 0;
            this.mRocketLauncherTypeCfgB = 0;

            try
            {
                MySqlClient.ClearParameters();
                MySqlClient.SetParameter("pid", (object)this.mId);
                MySqlClient.SetParameter("sid", (object)this.mShipId);

                DataTable extrasTable = MySqlClient.ExecuteQueryTable(
                    "SELECT sc.name AS cfg, ss.item_id, i.name AS item_name, i.lootIds AS item_lootids " +
                    "FROM ship_config sc " +
                    "INNER JOIN ship_slot ss ON ss.ship_config_id = sc.id " +
                    "LEFT JOIN items i ON i.id = ss.item_id " +
                    "WHERE sc.player_id = @pid AND sc.ship_design_id = @sid " +
                    "AND ss.row_name = 'extras' AND ss.item_id > 0"
                );

                if (extrasTable != null)
                {
                    foreach (DataRow row in extrasTable.Rows)
                    {
                        string cfg = row["cfg"].ToString().ToUpperInvariant();
                        if (cfg != "A" && cfg != "B")
                            continue;

                        int itemId = Convert.ToInt32(row["item_id"]);
                        string itemName = row.Table.Columns.Contains("item_name") && row["item_name"] != DBNull.Value ? row["item_name"].ToString().Trim() : string.Empty;
                        string lootIds = row.Table.Columns.Contains("item_lootids") && row["item_lootids"] != DBNull.Value ? row["item_lootids"].ToString() : string.Empty;

                        bool isHst1 = itemId == EXTRA_ID_HELLSTORM_HST1
                            || string.Equals(itemName, "HST-1", StringComparison.OrdinalIgnoreCase)
                            || lootIds.IndexOf("rocketlauncher_hst-1", StringComparison.OrdinalIgnoreCase) >= 0;
                        bool isHst2 = itemId == EXTRA_ID_HELLSTORM_HST2
                            || string.Equals(itemName, "HST-2", StringComparison.OrdinalIgnoreCase)
                            || lootIds.IndexOf("rocketlauncher_hst-2", StringComparison.OrdinalIgnoreCase) >= 0;
                        bool isAutoRocketCpu = itemId == EXTRA_ID_AUTO_ROCKET_CPU
                            || itemName.IndexOf("AROL", StringComparison.OrdinalIgnoreCase) >= 0
                            || itemName.IndexOf("AUTO-ROCKET", StringComparison.OrdinalIgnoreCase) >= 0
                            || itemName.IndexOf("AUTO ROCKET", StringComparison.OrdinalIgnoreCase) >= 0
                            || lootIds.IndexOf("arol", StringComparison.OrdinalIgnoreCase) >= 0
                            || lootIds.IndexOf("auto_rocket", StringComparison.OrdinalIgnoreCase) >= 0
                            || lootIds.IndexOf("auto-rocket", StringComparison.OrdinalIgnoreCase) >= 0
                            || lootIds.IndexOf("autorocket", StringComparison.OrdinalIgnoreCase) >= 0;
                        bool isRllbCpu = string.Equals(itemName, "RLLB-1", StringComparison.OrdinalIgnoreCase)
                            || lootIds.IndexOf("rllb", StringComparison.OrdinalIgnoreCase) >= 0;

                        if (isAutoRocketCpu)
                        {
                            if (cfg == "A")
                                this.mHasAutoRocketCpuCfgA = true;
                            else
                                this.mHasAutoRocketCpuCfgB = true;
                        }
                        else if (itemId == EXTRA_ID_CARGO_COMPRESSOR)
                        {
                            if (cfg == "A")
                                this.mHasCargoCompressorCfgA = true;
                            else
                                this.mHasCargoCompressorCfgB = true;
                        }

                        if (isRllbCpu)
                        {
                            if (cfg == "A")
                                this.mHasRocketLauncherCpuCfgA = true;
                            else
                                this.mHasRocketLauncherCpuCfgB = true;
                        }

                        if (isHst2)
                        {
                            if (cfg == "A")
                            {
                                this.mRocketLauncherTypeCfgA = 2;
                                this.mHasRocketLauncherCpuCfgA = true;
                            }
                            else
                            {
                                this.mRocketLauncherTypeCfgB = 2;
                                this.mHasRocketLauncherCpuCfgB = true;
                            }
                        }
                        else if (isHst1)
                        {
                            if (cfg == "A" && this.mRocketLauncherTypeCfgA < 2)
                            {
                                this.mRocketLauncherTypeCfgA = 1;
                                this.mHasRocketLauncherCpuCfgA = true;
                            }
                            else if (cfg == "B" && this.mRocketLauncherTypeCfgB < 2)
                            {
                                this.mRocketLauncherTypeCfgB = 1;
                                this.mHasRocketLauncherCpuCfgB = true;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Output.WriteLine("RefreshEquippedExtras() error: " + ex.Message);
            }

            this.UpdateCargoMaxForCurrentConfig();
        }

        public void UpdateCargoMaxForCurrentConfig()
        {
            int baseCargo = this.mBaseCargo2010;

            if (baseCargo <= 0)
                baseCargo = (this.mShipMaxCargo > 0 ? this.mShipMaxCargo : 1000);

            int multiplier = this.HasCargoCompressor ? 2 : 1;
            this.mShipMaxCargo = baseCargo * multiplier;
        }

        public string GetCpuItemsPayload(bool includeRocketLauncherCpu)
        {
            int[] cpu = new int[16] { 0, 0, 0, 0, 4, 0, 0, 1, 1, 0, 1, 0, 2, 0, 0, 0 };

            cpu[11] = this.HasAutoRocketCpu ? 1 : 0;

            cpu[13] = includeRocketLauncherCpu && this.HasRocketLauncherCpu ? 1 : 0;

            return "ITM|" + string.Join("|", cpu);
        }

        public string GetCpuItemsPayload()
        {
            return this.GetCpuItemsPayload(this.HasRocketLauncherCpu);
        }

        public int GetCurrentCargoTotal()
        {
            long total = 0L;
            if (this.mLabInfos != null)
            {
                total += (long)this.mLabInfos.Prometium;
                total += (long)this.mLabInfos.Endurium;
                total += (long)this.mLabInfos.Terbium;
                total += (long)this.mLabInfos.Palladium;
                total += (long)this.mLabInfos.Prometid;
                total += (long)this.mLabInfos.Duranium;
                total += (long)this.mLabInfos.Promerium;
                total += (long)this.mLabInfos.Seprom;
            }

            if (total < 0L) total = 0L;
            if (total > (long)int.MaxValue) return int.MaxValue;
            return (int)total;
        }

    }
}


