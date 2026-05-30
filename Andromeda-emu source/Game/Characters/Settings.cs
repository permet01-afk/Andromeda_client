// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Characters.Settings
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

namespace OrbitReborn_Emulator.Game.Characters
{
    public class Settings
    {
        private int mPlayerId;
        private string mSet;
        private string mMinimapScale;
        private string mResizableWindows;
        private int mDisplayPlayerNames;
        private int mDisplayChat;
        private int mPlayMusic;
        private int mPlaySfx;
        private string mBarStatus;
        private string mWindowSettings;
        private string mClientResolution;
        private int mAutoRefinement;
        private int mQuickSlotStopAttack;
        private int mDoubleClickAttack;
        private int mAutoStart;
        private int mDisplayNotification;
        private int mShowDrones;
        private int mDisplayWindowBackground;
        private int mAlwaysDraggableWindows;
        private int mPreloadUserShips;
        private int mQualityPresseting;
        private int mQualityCustomized;
        private int mQualityBackground;
        private int mQualityPoizone;
        private int mQualityShip;
        private int mQualityEngine;
        private int mQualityCollectable;
        private int mQualityAttack;
        private int mQualityEffect;
        private int mQualityExplosion;
        private string mQuickbarSlot;
        private string mMainmenuPosition;
        private string mSlotmenuPosition;
        private string mSlotmenuOrder;

        public int PlayerId
        {
            get
            {
                return this.mPlayerId;
            }
        }

        public string Set
        {
            get
            {
                return this.mSet;
            }
        }

        public string MinimapScale
        {
            get
            {
                return this.mMinimapScale;
            }
        }

        public string ResizableWindows
        {
            get
            {
                return this.mResizableWindows;
            }
        }

        public int DisplayPlayerNames
        {
            get
            {
                return this.mDisplayPlayerNames;
            }
        }

        public int DisplayChat
        {
            get
            {
                return this.mDisplayChat;
            }
        }

        public int PlayMusic
        {
            get
            {
                return this.mPlayMusic;
            }
        }

        public int PlaySfx
        {
            get
            {
                return this.mPlaySfx;
            }
        }

        public string BarStatus
        {
            get
            {
                return this.mBarStatus;
            }
        }

        public string WindowSettings
        {
            get
            {
                return this.mWindowSettings;
            }
        }

        public string ClientResolution
        {
            get
            {
                return this.mClientResolution;
            }
        }

        public int AutoRefinement
        {
            get
            {
                return this.mAutoRefinement;
            }
            set
            {
                this.mAutoRefinement = value;
            }
        }

        public int QuickSlotStopAttack
        {
            get
            {
                return this.mQuickSlotStopAttack;
            }
        }

        public int DoubleClickAttack
        {
            get
            {
                return this.mDoubleClickAttack;
            }
        }

        public int AutoStart
        {
            get
            {
                return this.mAutoStart;
            }
        }

        public int DisplayNotification
        {
            get
            {
                return this.mDisplayNotification;
            }
        }

        public int ShowDrones
        {
            get
            {
                return this.mShowDrones;
            }
            set
            {
                this.mShowDrones = value;
            }
        }

        public int DisplayWindowBackground
        {
            get
            {
                return this.mDisplayWindowBackground;
            }
        }

        public int AlwaysDraggableWindows
        {
            get
            {
                return this.mAlwaysDraggableWindows;
            }
        }

        public int PreloadUserShips
        {
            get
            {
                return this.mPreloadUserShips;
            }
        }

        public int QualityPresseting
        {
            get
            {
                return this.mQualityPresseting;
            }
        }

        public int QualityCustomized
        {
            get
            {
                return this.mQualityCustomized;
            }
        }

        public int QualityBackground
        {
            get
            {
                return this.mQualityBackground;
            }
        }

        public int QualityPoizone
        {
            get
            {
                return this.mQualityPoizone;
            }
        }

        public int QualityShip
        {
            get
            {
                return this.mQualityShip;
            }
        }

        public int QualityEngine
        {
            get
            {
                return this.mQualityEngine;
            }
        }

        public int QualityCollectable
        {
            get
            {
                return this.mQualityCollectable;
            }
        }

        public int QualityAttack
        {
            get
            {
                return this.mQualityAttack;
            }
        }

        public int QualityEffect
        {
            get
            {
                return this.mQualityEffect;
            }
        }

        public int QualityExplosion
        {
            get
            {
                return this.mQualityExplosion;
            }
        }

        public string QuickbarSlot
        {
            get
            {
                return this.mQuickbarSlot;
            }
        }

        public string MainmenuPosition
        {
            get
            {
                return this.mMainmenuPosition;
            }
        }

        public string SlotmenuPosition
        {
            get
            {
                return this.mSlotmenuPosition;
            }
        }

        public string SlotmenuOrder
        {
            get
            {
                return this.mSlotmenuOrder;
            }
        }

        public Settings(int PlayerId, string Set, string MinimapScale, string ResizableWindows, int DisplayPlayerNames, int DisplayChat, int PlayMusic, int PlaySfx, string BarStatus, string WindowSettings, string ClientResolution, int AutoRefinement, int QuickSlotStopAttack, int DoubleClickAttack, int AutoStart, int DisplayNotification, int ShowDrones, int DisplayWindowBackground, int AlwaysDraggableWindows, int PreloadUserShips, int QualityPresseting, int QualityCustomized, int QualityBackground, int QualityPoizone, int QualityShip, int QualityEngine, int QualityCollectable, int QualityAttack, int QualityEffect, int QualityExplosion, string QuickbarSlot, string MainmenuPosition, string SlotmenuPosition, string SlotmenuOrder)
        {
            this.mPlayerId = PlayerId;
            this.mSet = Set;
            this.mMinimapScale = MinimapScale;
            this.mResizableWindows = ResizableWindows;
            this.mDisplayPlayerNames = DisplayPlayerNames;
            this.mDisplayChat = DisplayChat;
            this.mPlayMusic = PlayMusic;
            this.mPlaySfx = PlaySfx;
            this.mBarStatus = BarStatus;
            this.mWindowSettings = WindowSettings;
            this.mClientResolution = ClientResolution;
            this.mAutoRefinement = AutoRefinement;
            this.mQuickSlotStopAttack = QuickSlotStopAttack;
            this.mDoubleClickAttack = DoubleClickAttack;
            this.mAutoStart = AutoStart;
            this.mDisplayNotification = DisplayNotification;
            this.mShowDrones = ShowDrones;
            this.mDisplayWindowBackground = DisplayWindowBackground;
            this.mAlwaysDraggableWindows = AlwaysDraggableWindows;
            this.mPreloadUserShips = PreloadUserShips;
            this.mQualityPresseting = QualityPresseting;
            this.mQualityCustomized = QualityCustomized;
            this.mQualityBackground = QualityBackground;
            this.mQualityPoizone = QualityPoizone;
            this.mQualityShip = QualityShip;
            this.mQualityEngine = QualityEngine;
            this.mQualityCollectable = QualityCollectable;
            this.mQualityAttack = QualityAttack;
            this.mQualityEffect = QualityEffect;
            this.mQualityExplosion = QualityExplosion;
            this.mQuickbarSlot = QuickbarSlot;
            this.mMainmenuPosition = MainmenuPosition;
            this.mSlotmenuPosition = SlotmenuPosition;
            this.mSlotmenuOrder = SlotmenuOrder;
        }
    }
}




