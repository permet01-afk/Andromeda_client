

using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Specialized;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Handlers
{
    public static class Handshake
    {
        public static void Initialize()
        {
            DataRouter.RegisterHandler("LOGIN", new ProcessRequestCallback(Handshake.GetUserInfo), true);
        }

        private static void SyncSelectedWeaponsFromFlashSettings(Session Session, string flashSet)
        {
            if (Session == null || Session.CharacterInfo == null || string.IsNullOrWhiteSpace(flashSet))
                return;

            string[] parts = flashSet.Split('|');
            int parsedAmmo;
            if (parts.Length > 15 && int.TryParse(parts[15], out parsedAmmo) && parsedAmmo > 0)
            {
                Session.CharacterInfo.SelectedAmmo = parsedAmmo;
            }

            int parsedRocket;
            if (parts.Length > 16 && int.TryParse(parts[16], out parsedRocket)
                && (parsedRocket == 1 || parsedRocket == 2 || parsedRocket == 3 || parsedRocket == 10))
            {
                Session.CharacterInfo.SelectedRocket = parsedRocket;
                if (parsedRocket != 10)
                {
                    Session.CharacterInfo.SelectedRocketAuto = parsedRocket;
                }
                else if (Session.CharacterInfo.SelectedRocketAuto <= 0)
                {
                    Session.CharacterInfo.SelectedRocketAuto = 1;
                }

                Session.CharacterInfo.LastRocketShotType = parsedRocket;
            }
        }

        private static void GetUserInfo(Session Session, ClientMessage Message)
        {
            string nextString = Message.GetNextString(2);
            Session.TryAuthenticate(nextString, Session.RemoteAddress);

            if (Session.ReconnectHandoffTarget != null)
                Session = Session.ReconnectHandoffTarget;

            if (!Session.Authenticated)
                return;

            bool reconnectHandoff = Session.ConsumeReconnectHandoffFlag();

            Output.WriteLine("LOGIN OK for ticket " + nextString + " from " + Session.RemoteAddress, OutputLevel.Notification);
            Output.WriteLine("[LOGIN_FLOW] Begin post-login data refresh for " + Session.CharacterId, OutputLevel.DebugInformation);
            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                Session.CharacterInfo.RefreshSettings(client);

                if (reconnectHandoff)
                    Session.CharacterInfo.RefreshUserDataPreservingRuntime(client);
                else
                    Session.CharacterInfo.RefreshUserData(client);

                Session.CharacterInfo.StartBoosterAutoRefresh();
                Session.CharacterInfo.RefreshClan(client);
                Output.WriteLine("[LOGIN_FLOW] DB refresh completed for " + Session.CharacterId, OutputLevel.DebugInformation);

                Session.CharacterInfo.NpcInRange.Clear();
                if (reconnectHandoff)
                {
                    Session.CharacterInfo.PlayerInRange.Clear();
                }
                else
                {
                    foreach (int key in (IEnumerable<int>)Session.CharacterInfo.PlayerInRange.Keys)
                    {
                        Session sessionByCharacterId = SessionManager.GetSessionByCharacterId(key);
                        if (sessionByCharacterId != null && sessionByCharacterId.CharacterInfo != null)
                        {
                            sessionByCharacterId.CharacterInfo.PlayerInRange.Remove(Session.CharacterId);
                            sessionByCharacterId.SendData(MapUserLeaveComposer.Compose(Session.CharacterId));
                        }
                    }
                    Session.CharacterInfo.PlayerInRange.Clear();
                }
            }
            SyncSelectedWeaponsFromFlashSettings(Session, Session.CharacterInfo.Settings != null ? Session.CharacterInfo.Settings.Set : null);
            Session.CharacterInfo.AuthTicket = nextString;
            Session.CharacterInfo.Disconnected = false;
            if (!reconnectHandoff)
                MapManager.RemoveUserFromMap(Session);
            Output.WriteLine("[LOGIN_FLOW] Sending settings/init packets for " + Session.CharacterId, OutputLevel.DebugInformation);
            Session.SendData(PacketComposer.Compose("A", "SET|" + Session.CharacterInfo.Settings.Set));
            Session.SendData(PacketComposer.Compose("7", "CLIENT_RESOLUTION|" + Session.CharacterInfo.Settings.ClientResolution));
            Session.SendData(PacketComposer.Compose("7", "MINIMAP_SCALE," + Session.CharacterInfo.Settings.MinimapScale));
            Session.SendData(PacketComposer.Compose("7", "RESIZABLE_WINDOWS," + Session.CharacterInfo.Settings.ResizableWindows));
            Session.SendData(PacketComposer.Compose("7", "DISPLAY_PLAYER_NAMES|" + (object)Session.CharacterInfo.Settings.DisplayPlayerNames));
            Session.SendData(PacketComposer.Compose("7", "DISPLAY_CHAT|" + (object)Session.CharacterInfo.Settings.DisplayChat));
            Session.SendData(PacketComposer.Compose("7", "BAR_STATUS|" + Session.CharacterInfo.Settings.BarStatus));
            Session.SendData(PacketComposer.Compose("7", "WINDOW_SETTINGS," + Session.CharacterInfo.Settings.WindowSettings));
            Session.SendData(PacketComposer.Compose("7", "AUTO_REFINEMENT|" + (object)Session.CharacterInfo.Settings.AutoRefinement));
            Session.SendData(PacketComposer.Compose("7", "QUICKSLOT_STOP_ATTACK|" + (object)Session.CharacterInfo.Settings.QuickSlotStopAttack));
            Session.SendData(PacketComposer.Compose("7", "DOUBLECLICK_ATTACK|" + (object)Session.CharacterInfo.Settings.DoubleClickAttack));
            Session.SendData(PacketComposer.Compose("7", "AUTO_START|" + (object)Session.CharacterInfo.Settings.AutoStart));
            Session.SendData(PacketComposer.Compose("7", "DISPLAY_NOTIFICATIONS|" + (object)Session.CharacterInfo.Settings.DisplayNotification));
            Session.SendData(PacketComposer.Compose("7", "SHOW_DRONES|" + (object)Session.CharacterInfo.Settings.ShowDrones));
            Session.SendData(PacketComposer.Compose("7", "DISPLAY_WINDOW_BACKGROUND|" + (object)Session.CharacterInfo.Settings.DisplayWindowBackground));
            Session.SendData(PacketComposer.Compose("7", "ALWAYS_DRAGGABLE_WINDOWS|" + (object)Session.CharacterInfo.Settings.AlwaysDraggableWindows));
            Session.SendData(PacketComposer.Compose("7", "PRELOAD_USER_SHIPS|" + (object)Session.CharacterInfo.Settings.PreloadUserShips));
            Session.SendData(PacketComposer.Compose("7", "QUALITY_PRESETTING|" + (object)Session.CharacterInfo.Settings.QualityPresseting));
            Session.SendData(PacketComposer.Compose("7", "QUALITY_CUSTOMIZED|" + (object)Session.CharacterInfo.Settings.QualityCustomized));
            Session.SendData(PacketComposer.Compose("7", "QUALITY_BACKGROUND|" + (object)Session.CharacterInfo.Settings.QualityBackground));
            Session.SendData(PacketComposer.Compose("7", "QUALITY_POIZONE|" + (object)Session.CharacterInfo.Settings.QualityPoizone));
            Session.SendData(PacketComposer.Compose("7", "QUALITY_SHIP|" + (object)Session.CharacterInfo.Settings.QualityShip));
            Session.SendData(PacketComposer.Compose("7", "QUALITY_ENGINE|" + (object)Session.CharacterInfo.Settings.QualityEngine));
            Session.SendData(PacketComposer.Compose("7", "QUALITY_COLLECTABLE|" + (object)Session.CharacterInfo.Settings.QualityCollectable));
            Session.SendData(PacketComposer.Compose("7", "QUALITY_ATTACK|" + (object)Session.CharacterInfo.Settings.QualityAttack));
            Session.SendData(PacketComposer.Compose("7", "QUALITY_EFFECT|" + (object)Session.CharacterInfo.Settings.QualityEffect));
            Session.SendData(PacketComposer.Compose("7", "QUALITY_EXPLOSION|" + (object)Session.CharacterInfo.Settings.QualityExplosion));
            Session.SendData(PacketComposer.Compose("7", "QUICKBAR_SLOT|" + Session.CharacterInfo.Settings.QuickbarSlot));
            Session.SendData(PacketComposer.Compose("7", "SLOTMENU_POSITION," + Session.CharacterInfo.Settings.SlotmenuPosition));
            Session.SendData(PacketComposer.Compose("7", "SLOTMENU_ORDER," + Session.CharacterInfo.Settings.SlotmenuOrder));
            Session.SendData(PacketComposer.Compose("7", "MAINMENU_POSITION," + Session.CharacterInfo.Settings.MainmenuPosition));
            int startMapId = Session.CharacterInfo.MapId;
            if (!Session.CharacterInfo.IsAdmin && !Session.CharacterInfo.IsMod)
            {
                int requiredLevel;
                if (!MapAccessService.CanAccessMap(Session.CharacterInfo.FactionId, Session.CharacterInfo.Level, startMapId, out requiredLevel))
                {
                    startMapId = MapAccessService.GetHomeMapX1(Session.CharacterInfo.FactionId);
                }
            }
            Output.WriteLine("[LOGIN_FLOW] Preparing map " + startMapId + " for " + Session.CharacterId, OutputLevel.DebugInformation);
            if (reconnectHandoff)
                MapHandler.ResyncCurrentMap(Session);
            else
                MapHandler.OpenPublicConnection(Session, startMapId, (PortalInfo)null);
            Session.SendData(PacketComposer.Compose("B", Session.CharacterInfo.GetPrimaryWeaponInfoPayload()));
            Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));
            if (Session.CharacterInfo.AmmoSyncTimer == null)
            {
                Session.CharacterInfo.AmmoSyncTimer = new System.Threading.Timer(
                    new TimerCallback(Handshake.AmmoSyncTick),
                    (object)Session,
                    5000,
                    5000
                );
            }
            if (Session.CharacterInfo.ConfigRefreshTimer == null)
            {
                Session.CharacterInfo.ConfigRefreshTimer = new System.Threading.Timer(
                    new TimerCallback(Handshake.ConfigRefreshTick),
                    (object)Session,
                    5000,
                    5000
                );
            }
            Session.SendData(PacketComposer.Compose("7", "HS"));
            Session.SendData(PacketComposer.Compose("S", "CFG|" + Session.CharacterInfo.ActiveConfig));
            Session.SendData(PacketComposer.Compose("A", Session.CharacterInfo.GetCpuItemsPayload(Fight.ShouldAdvertiseRocketLauncherCpu(Session))));
            Session.SendData(PacketComposer.Compose("A", "CPU|C|" + (object)100));
            Fight.SendRocketLauncherProtocolState(Session, true);
            if (Session.CharacterInfo.HasAutoRocketCpu)
            {
                int state = (Session.CharacterInfo.AutoRocketSkill == 1) ? 1 : 0;
                Session.SendData(PacketComposer.Compose("A", "CPU|R|" + (object)state));
            }
            Fight.SendTechStatus(Session);
            Fight.SendShipSkillStatus(Session);
            Session.SendData(PacketComposer.Compose("m", "1|1000|1000"));
            Session.SendData(Session.CharacterInfo.GetCargoMessage());
            int totalSeconds = (int)DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1)).TotalSeconds;

            int dmgPct = (Session.CharacterInfo.BoosterDmgTime > totalSeconds) ? 10 : 0;
            int hpPct = (Session.CharacterInfo.BoosterHpTime > totalSeconds) ? 10 : 0;
            int shdPct = (Session.CharacterInfo.BoosterShdTime > totalSeconds) ? 25 : 0;

            Session.SendData(PacketComposer.Compose("A", "BS|0/0/" + dmgPct + "/" + shdPct + "/0/0/0/" + hpPct));

            Session.SendData(PacketComposer.Compose("A", "JV|0"));
            Session.SendData(PacketComposer.Compose("A", "BK|" + (object)Session.CharacterInfo.BootyKeys));
            Session.SendData(PacketComposer.Compose("POI", "RDY"));
            Session.SendData(PacketComposer.Compose("A", "STD|~~~ Andromeda ~~~"));
            Session.CharacterInfo.SendCollectibles(Session);
            Session.SendData(PacketComposer.Compose("A", "CLD|ISH|" + (object)Session.CharacterInfo.CoolDownISH));
            Session.SendData(PacketComposer.Compose("A", "CLD|SMB|" + (object)Session.CharacterInfo.CoolDownSMB));
            Session.SendData(PacketComposer.Compose("CSS", "1"));
            Session.SendData(PacketComposer.Compose("SMP", "1|1"));
            Session.SendData(PacketComposer.Compose("UI", "W|HW|10"));
            Output.WriteLine("[LOGIN_FLOW] Post-login sequence completed for " + Session.CharacterId, OutputLevel.DebugInformation);
            Spaceball.ShowHud(Session);
            if (!reconnectHandoff)
            {
                Session.CharacterInfo.WarningZone = false;
                if (Session.CharacterInfo.WarningZoneTimer != null)
                {
                    Session.CharacterInfo.WarningZoneTimer.Dispose();
                    --TimerManager.TimerRunning;
                    Session.CharacterInfo.WarningZoneTimer = (Timer)null;
                }
                ShipMovement.CheckWarningZone(Session);
                Session.CharacterInfo.PeaceZone = false;
                ShipMovement.CheckPeaceZone(Session);
                Session.CharacterInfo.NewLocX = Session.CharacterInfo.LocX;
                Session.CharacterInfo.NewLocY = Session.CharacterInfo.LocY;
                Session.CharacterInfo.RandomDamage = new Random();
                Session.CharacterInfo.Destroy = false;
                Session.CharacterInfo.Attacking = false;
                Session.CharacterInfo.CanLaserAttack = true;
                Session.CharacterInfo.OutOfRange = false;
                Session.CharacterInfo.CanMove = true;
                Session.CharacterInfo.NoFightTimer = 0;
            }
            else
            {
                ShipMovement.CheckWarningZone(Session);
                ShipMovement.CheckPeaceZone(Session);
            }
            ShipMovement.CheckAliensInRange((object)Session);
            ShipMovement.CheckPlayerInRange((object)Session);
            if (Session.CharacterInfo.UpdateGroupTimer != null)
                Session.CharacterInfo.UpdateGroupTimer.Dispose();
            Session.CharacterInfo.UpdateGroupTimer = new System.Threading.Timer(new TimerCallback(GroupManager.UpdateGroup), (object)Session, (int)0, 1000);
            if (Session.CharacterInfo.MapId == 83 || _1v1.IsOnMap(Session.CharacterInfo.MapId))
            {
                Fight.KillPlayer(Session, true);
            }

            try
            {
                foreach (var otherSession in SessionManager.SessionsUser.Values)
                {
                    if (otherSession != null && otherSession.CharacterInfo != null &&
                        otherSession.CharacterId != Session.CharacterId &&
                        otherSession.CharacterInfo.Members.ContainsKey(Session.CharacterId))
                    {
                        foreach (var kvp in otherSession.CharacterInfo.Members)
                        {
                            if (!Session.CharacterInfo.Members.ContainsKey(kvp.Key))
                                Session.CharacterInfo.Members.Add(kvp.Key, kvp.Value);
                        }

                        GroupManager.SendFullGroupStateToMembers(otherSession);
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Group restoration error: " + ex.Message);
            }
        }
        private static void LogTimerFailure(string callbackName, Exception ex)
        {
            Output.WriteLine((object)("[HandshakeTimer] " + callbackName + " failed: " + ex.ToString()), OutputLevel.CriticalError);
        }

        private static void AmmoSyncTick(object state)
        {
            long perfStart = PerformanceProfiler.Start();
            int perfUserId = 0;
            bool perfActive = false;
            try
            {
                Session s = (Session)state;
                if (s == null || s.CharacterInfo == null || !s.Authenticated || s.Stopped)
                    return;

                perfUserId = s.CharacterId;
                perfActive = true;
                bool ammoChanged = s.CharacterInfo.ConsumeAmmoSyncClientUpdatePending();

                try
                {
                    ammoChanged |= s.CharacterInfo.FlushPendingPrimaryAmmoToDb();
                }
                catch (Exception ex)
                {
                    Output.WriteLine((object)("[Handshake] Primary ammo flush failed for charId=" + s.CharacterId + ": " + ex.ToString()), OutputLevel.Warning);
                }

                try
                {
                    ammoChanged |= s.CharacterInfo.FlushPendingSecondaryAmmoToDb();
                }
                catch (Exception ex)
                {
                    Output.WriteLine((object)("[Handshake] Secondary ammo flush failed for charId=" + s.CharacterId + ": " + ex.ToString()), OutputLevel.Warning);
                }

                if (s.CharacterInfo.RefreshAmmoFromDbIfHigher())
                    ammoChanged = true;

                if (ammoChanged)
                {
                    s.CharacterInfo.ConsumeAmmoSyncClientUpdatePending();
                    s.SendData(PacketComposer.Compose("B", s.CharacterInfo.GetPrimaryWeaponInfoPayload()));
                    s.SendData(PacketComposer.Compose("3", s.CharacterInfo.GetSecondaryWeaponInfoPayload()));
                    Fight.SendRocketLauncherProtocolState(s, true);
                }

                if (s.MapJoined && s.MapAuthed && (s.CharacterInfo.MapId == 1 || s.CharacterInfo.MapId == 5 || s.CharacterInfo.MapId == 9))
                {
                    MapInstance instance = MapManager.GetInstanceByMapId(s.CharacterInfo.MapId);
                    if (instance != null)
                        instance.SendPortals(s);
                }
            }
            catch (Exception ex)
            {
                LogTimerFailure("AmmoSyncTick", ex);
            }
            finally
            {
                if (perfActive)
                    PerformanceProfiler.LogTimer("AmmoSyncTick", perfUserId, perfStart);
            }
        }

        private static void ConfigRefreshTick(object state)
        {
            long perfStart = PerformanceProfiler.Start();
            int perfUserId = 0;
            bool perfActive = false;
            try
            {
                Session s = (Session)state;
                if (s == null || s.CharacterInfo == null || !s.Authenticated || s.Stopped)
                    return;

                perfUserId = s.CharacterId;
                perfActive = true;
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient("ConfigRefreshTick"))
                {
                    int dbActiveConfig;

                    if (!s.CharacterInfo.HasPendingWebsiteConfigRefresh(client, out dbActiveConfig))
                        return;

                    s.CharacterInfo.RefreshUserData(client);

                    if (dbActiveConfig == 1 || dbActiveConfig == 2)
                        s.CharacterInfo.ActiveConfig = dbActiveConfig;

                    SelectAction.SendConfigurationRefresh(s, true, true);

                    s.SendData(PacketComposer.Compose("B", s.CharacterInfo.GetPrimaryWeaponInfoPayload()));
                    s.SendData(PacketComposer.Compose("3", s.CharacterInfo.GetSecondaryWeaponInfoPayload()));

                    s.CharacterInfo.ClearPendingWebsiteConfigRefreshFlag(client);
                }
            }
            catch (Exception ex)
            {
                LogTimerFailure("ConfigRefreshTick", ex);
            }
            finally
            {
                if (perfActive)
                    PerformanceProfiler.LogTimer("ConfigRefreshTick", perfUserId, perfStart);
            }
        }

    }
}
