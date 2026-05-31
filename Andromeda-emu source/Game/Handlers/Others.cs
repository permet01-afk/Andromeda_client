using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Maps.Collectables;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Specialized;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Threading;
using OrbitReborn_Emulator.Game.GalaxyGates;

namespace OrbitReborn_Emulator.Game.Handlers
{
    public static class Others
    {
        public static List<int> invasionPortal = new List<int>();

        private const int FASTBUY_LASER_LCB10 = 1;
        private const int FASTBUY_LASER_MCB25 = 2;
        private const int FASTBUY_LASER_MCB50 = 3;
        private const int FASTBUY_LASER_SAB50 = 5;

        private const int FASTBUY_ROCKET_R310 = 1;
        private const int FASTBUY_ROCKET_PLT2026 = 2;
        private const int FASTBUY_ROCKET_PLT2021 = 3;

        private const int FASTBUY_LASER_BATCH = 1000;
        private const int FASTBUY_ROCKET_BATCH = 100;

        private const int LOGOUT_COUNTDOWN_SECONDS = 5;
        private const double LOGOUT_DAMAGE_CANCEL_SECONDS = 10.0;
        private const int MAP_45_TO_44_PORTAL_ID = 413;
        private const int MAP_44_ID = 16;

        private static readonly object Map45To44ArrivalSync = new object();
        private static readonly Random Map45To44ArrivalRandom = new Random();
        private static readonly int[][] Map45To44SafeArrivals = new int[][]
        {
            new int[] { 12000, 9000 },
            new int[] { 18000, 11000 },
            new int[] { 24000, 15000 },
            new int[] { 30000, 17000 },
            new int[] { 21000, 19000 },
            new int[] { 26000, 8000 }
        };

        private static bool IsPvpMap(int mapId)
        {
            return mapId == 13 || mapId == 14 || mapId == 15 || mapId == 16 || mapId == 29;
        }

        private static bool UsesPvpPortalCombatBlock(int mapId, int portalId)
        {
            return IsPvpMap(mapId)
                || portalId == 407
                || portalId == 409
                || portalId == 411;
        }

        private static PortalInfo CreateMap45To44SafeArrivalPortal()
        {
            int index;

            lock (Map45To44ArrivalSync)
            {
                index = Map45To44ArrivalRandom.Next(0, Map45To44SafeArrivals.Length);
            }

            int[] point = Map45To44SafeArrivals[index];
            return new PortalInfo(null, MAP_45_TO_44_PORTAL_ID, point[0], point[1], MAP_44_ID, 0, 1);
        }

        private static void DisposePortalJumpTimer(Session session)
        {
            if (session?.CharacterInfo?.PortalJumpTimer != null)
            {
                session.CharacterInfo.PortalJumpTimer.Dispose();
                session.CharacterInfo.PortalJumpTimer = (Timer)null;
                --TimerManager.TimerRunning;
            }
        }

        private static void ClearGalaxyGateInternalPortals(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            if (session.CharacterInfo.GalaxyGateInternalPortals != null)
                session.CharacterInfo.GalaxyGateInternalPortals.Clear();
            else
                session.CharacterInfo.GalaxyGateInternalPortals = new CList<PortalInfo>();

            if (session.CharacterInfo.GalaxyGateInternalPortalDestinations != null)
                session.CharacterInfo.GalaxyGateInternalPortalDestinations.Clear();
            else
                session.CharacterInfo.GalaxyGateInternalPortalDestinations = new CDictionnary<int, PortalInfo>();

            MapInstance instance = MapManager.GetInstanceByMapId(session.CharacterInfo.MapId);
            if (instance != null)
                instance.SendPortals(session);
        }

        public static void Initialize()
        {
            Others.invasionPortal.Add(204);
            Others.invasionPortal.Add(205);
            Others.invasionPortal.Add(206);
            DataRouter.RegisterHandler("l", new ProcessRequestCallback(Others.Logout), false);
            DataRouter.RegisterHandler("o", new ProcessRequestCallback(Others.LogoutCancel), false);
            DataRouter.RegisterHandler("j", new ProcessRequestCallback(Others.PortalJump), false);
            DataRouter.RegisterHandler("PNG", new ProcessRequestCallback(Others.ErrorSupressor), false);
            DataRouter.RegisterHandler("RDY", new ProcessRequestCallback(Others.ErrorSupressor), false);
            DataRouter.RegisterHandler("5", new ProcessRequestCallback(Others.FastBuy), false);
            DataRouter.RegisterHandler("i", new ProcessRequestCallback(Others.ErrorSupressor), false);
            DataRouter.RegisterHandler("bx", new ProcessRequestCallback(Others.ErrorSupressor), false);
            DataRouter.RegisterHandler("x", new ProcessRequestCallback(Others.CollectBox), false);
            DataRouter.RegisterHandler("QST", new ProcessRequestCallback(Others.QuestSync), false);
        }

        private static void ErrorSupressor(Session Session, ClientMessage Message)
        {
        }

        private static void QuestSync(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.IsChat || Session.CharacterInfo == null)
                return;

            string action = (Message.GetNextString(1) ?? string.Empty).Trim().ToUpperInvariant();
            if (action != "SYNC" && action != "REWARD_SYNC")
                return;

            try
            {
                Session.CharacterInfo.RefreshQuestRewardData();
                Session.SendData(UserDataComposer.Compose(Session));
                Session.SendData(PacketComposer.Compose("B", Session.CharacterInfo.GetPrimaryWeaponInfoPayload()));
                Session.SendData(PacketComposer.Compose("3", Session.CharacterInfo.GetSecondaryWeaponInfoPayload()));
            }
            catch (Exception ex)
            {
                Console.WriteLine("[QUEST] Reward sync failed: " + ex.Message);
            }
        }

        private static void FastBuy(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.IsChat || Session.CharacterInfo == null)
                return;

            string packetType = (Message.GetNextString(1) ?? string.Empty).Trim();
            int requestedId = Message.GetNextInt(2);
            string legacyId = string.Empty;

            if (packetType.ToLowerInvariant() == "buy")
                legacyId = Message.GetNextString(2);

            bool isLaser;
            int resolvedId;
            int amount;
            long creditsCost;
            long uridiumCost;
            string columnName;
            string itemLabel;

            if (!TryResolveFastBuyConfig(packetType, requestedId, legacyId, out isLaser, out resolvedId, out amount, out creditsCost, out uridiumCost, out columnName, out itemLabel))
            {
                if (packetType.ToLowerInvariant() == "s")
                    return;

                Session.SendData(PacketComposer.Compose("A", "STD|Fast Buy item is not available."));
                return;
            }

            if (creditsCost > 0L)
            {
                long credits = Session.CharacterInfo.GetUpdatedCredits();
                if (credits < creditsCost)
                {
                    Session.SendData(PacketComposer.Compose("A", "STD|Not enough Credits (" + creditsCost + " required)."));
                    return;
                }
            }

            if (uridiumCost > 0L)
            {
                long uridium = Session.CharacterInfo.GetUpdatedUridium();
                if (uridium < uridiumCost)
                {
                    Session.SendData(PacketComposer.Compose("A", "STD|Not enough Uridium (" + uridiumCost + " required)."));
                    return;
                }
            }

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                if (!ApplyFastBuyPurchase(client, Session, isLaser, resolvedId, amount, creditsCost, uridiumCost, columnName))
                {
                    Session.CharacterInfo.GetUpdatedCredits();
                    Session.CharacterInfo.GetUpdatedUridium();
                    Session.SendData(UserDataComposer.Compose(Session));
                    Session.SendData(PacketComposer.Compose("A", "STD|Purchase failed. Please try again."));
                    return;
                }
            }

            Session.SendData(PacketComposer.Compose("A", "STD|" + BuildFastBuyPurchaseMessage(itemLabel, amount, creditsCost, uridiumCost)));
        }

        private static bool TryResolveFastBuyConfig(string packetType, int requestedId, string legacyId, out bool isLaser, out int resolvedId, out int amount, out long creditsCost, out long uridiumCost, out string columnName, out string itemLabel)
        {
            isLaser = false;
            resolvedId = 0;
            amount = 0;
            creditsCost = 0L;
            uridiumCost = 0L;
            columnName = string.Empty;
            itemLabel = string.Empty;

            string mode = (packetType ?? string.Empty).Trim().ToLowerInvariant();

            if (mode == "buy")
            {
                string legacy = (legacyId ?? string.Empty).Trim().ToLowerInvariant();
                switch (legacy)
                {
                    case "ammo_x1":
                        mode = "b";
                        requestedId = FASTBUY_LASER_LCB10;
                        break;
                    case "ammo_x2":
                        mode = "b";
                        requestedId = FASTBUY_LASER_MCB25;
                        break;
                    case "ammo_x3":
                        mode = "b";
                        requestedId = FASTBUY_LASER_MCB50;
                        break;
                    case "ammo_x5":
                        mode = "b";
                        requestedId = FASTBUY_LASER_SAB50;
                        break;
                    case "r_r310":
                        mode = "r";
                        requestedId = FASTBUY_ROCKET_R310;
                        break;
                    case "r_plt2026":
                        mode = "r";
                        requestedId = FASTBUY_ROCKET_PLT2026;
                        break;
                    case "r_plt2021":
                        mode = "r";
                        requestedId = FASTBUY_ROCKET_PLT2021;
                        break;
                    default:
                        return false;
                }
            }

            if (mode == "b")
            {
                isLaser = true;
                switch (requestedId)
                {
                    case FASTBUY_LASER_LCB10:
                        resolvedId = FASTBUY_LASER_LCB10;
                        amount = FASTBUY_LASER_BATCH;
                        creditsCost = 1000L;
                        columnName = "ammo_lcb10";
                        itemLabel = "LCB-10";
                        return true;
                    case FASTBUY_LASER_MCB25:
                        resolvedId = FASTBUY_LASER_MCB25;
                        amount = FASTBUY_LASER_BATCH;
                        creditsCost = 200000L;
                        columnName = "ammo_mcb25";
                        itemLabel = "MCB-25";
                        return true;
                    case FASTBUY_LASER_MCB50:
                        resolvedId = FASTBUY_LASER_MCB50;
                        amount = FASTBUY_LASER_BATCH;
                        uridiumCost = 1000L;
                        columnName = "ammo_mcb50";
                        itemLabel = "MCB-50";
                        return true;
                    case FASTBUY_LASER_SAB50:
                        resolvedId = FASTBUY_LASER_SAB50;
                        amount = FASTBUY_LASER_BATCH;
                        uridiumCost = 1000L;
                        columnName = "ammo_sab50";
                        itemLabel = "SAB-50";
                        return true;
                    default:
                        return false;
                }
            }

            if (mode == "r")
            {
                switch (requestedId)
                {
                    case FASTBUY_ROCKET_R310:
                        resolvedId = FASTBUY_ROCKET_R310;
                        amount = FASTBUY_ROCKET_BATCH;
                        creditsCost = 1000L;
                        columnName = "ammo_r310";
                        itemLabel = "R-310";
                        return true;
                    case FASTBUY_ROCKET_PLT2026:
                        resolvedId = FASTBUY_ROCKET_PLT2026;
                        amount = FASTBUY_ROCKET_BATCH;
                        creditsCost = 5000L;
                        columnName = "ammo_plt2026";
                        itemLabel = "PLT-2026";
                        return true;
                    case FASTBUY_ROCKET_PLT2021:
                        resolvedId = FASTBUY_ROCKET_PLT2021;
                        amount = FASTBUY_ROCKET_BATCH;
                        uridiumCost = 500L;
                        columnName = "ammo_plt2021";
                        itemLabel = "PLT-2021";
                        return true;
                    default:
                        return false;
                }
            }

            return false;
        }

        private static bool ApplyFastBuyPurchase(SqlDatabaseClient client, Session session, bool isLaser, int itemId, int amount, long creditsCost, long uridiumCost, string columnName)
        {
            if (client == null || session == null || session.CharacterInfo == null || string.IsNullOrEmpty(columnName) || amount <= 0)
                return false;

            client.ClearParameters();
            client.SetParameter("id", (object)session.CharacterInfo.Id);

            int affected = client.ExecuteNonQuery(
                "UPDATE users SET credits = credits - " + creditsCost + ", uridium = uridium - " + uridiumCost + ", " + columnName + " = " + columnName + " + " + amount + " WHERE id = @id AND credits >= " + creditsCost + " AND uridium >= " + uridiumCost + " LIMIT 1"
            );

            if (affected <= 0)
                return false;

            session.CharacterInfo.Credits -= creditsCost;
            session.CharacterInfo.Uridium -= uridiumCost;

            if (session.CharacterInfo.Credits < 0L)
                session.CharacterInfo.Credits = 0L;
            if (session.CharacterInfo.Uridium < 0L)
                session.CharacterInfo.Uridium = 0L;

            if (isLaser)
            {
                switch (itemId)
                {
                    case FASTBUY_LASER_LCB10:
                        session.CharacterInfo.AmmoLcb10 += amount;
                        break;
                    case FASTBUY_LASER_MCB25:
                        session.CharacterInfo.AmmoMcb25 += amount;
                        break;
                    case FASTBUY_LASER_MCB50:
                        session.CharacterInfo.AmmoMcb50 += amount;
                        break;
                    case FASTBUY_LASER_SAB50:
                        session.CharacterInfo.AmmoSab50 += amount;
                        break;
                }

                session.SendData(UserDataComposer.Compose(session));
                session.SendData(PacketComposer.Compose("y", "BAT|" + itemId + "|" + amount));
                session.SendData(PacketComposer.Compose("B", session.CharacterInfo.GetPrimaryWeaponInfoPayload()));
            }
            else
            {
                switch (itemId)
                {
                    case FASTBUY_ROCKET_R310:
                        session.CharacterInfo.AmmoR310 += amount;
                        break;
                    case FASTBUY_ROCKET_PLT2026:
                        session.CharacterInfo.AmmoPlt2026 += amount;
                        break;
                    case FASTBUY_ROCKET_PLT2021:
                        session.CharacterInfo.AmmoPlt2021 += amount;
                        break;
                }

                session.SendData(UserDataComposer.Compose(session));
                session.SendData(PacketComposer.Compose("y", "ROK|" + itemId + "|" + amount));
                session.SendData(PacketComposer.Compose("3", session.CharacterInfo.GetSecondaryWeaponInfoPayload()));
            }

            return true;
        }

        private static string BuildFastBuyPurchaseMessage(string itemLabel, int amount, long creditsCost, long uridiumCost)
        {
            if (creditsCost > 0L)
                return "Bought " + amount + " " + itemLabel + " for " + creditsCost + " Credits.";
            if (uridiumCost > 0L)
                return "Bought " + amount + " " + itemLabel + " for " + uridiumCost + " Uridium.";
            return "Bought " + amount + " " + itemLabel + ".";
        }

        private static void CollectBox(Session Session, ClientMessage Message)
        {
            int nextInt = Message.GetNextInt(1);
            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(Session.CharacterInfo.MapId);
            if (!instanceByMapId.Info.Collectables.ContainsKey(nextInt))
                return;
            Collectable collectable = instanceByMapId.Info.Collectables[nextInt];
            if (collectable == null)
                Session.SendData(PacketComposer.Compose("A", "STD|Box is already beeing collected !"));
            else
                collectable.Collect(Session);
        }

        private static bool HasRecentIncomingDamage(Session session, double seconds)
        {
            if (session == null || session.CharacterInfo == null)
                return false;

            double now = UnixTimestamp.GetCurrent();

            if (session.CharacterInfo.LastShieldDamageReceived > 0.0
                && now - session.CharacterInfo.LastShieldDamageReceived < seconds)
                return true;

            if (session.CharacterInfo.LastAttackByAttackerReceived > 0.0
                && now - session.CharacterInfo.LastAttackByAttackerReceived < seconds)
                return true;

            return false;
        }

        private static bool IsLogoutBlocked(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return true;

            if (session.CharacterInfo.Destroy || session.CharacterInfo.ShipHp <= 0)
                return true;

            if (GalaxyGateWaveService.IsGateMap(session.CharacterInfo.MapId)
                || GalaxyGateWaveService.IsGateMap(session.CurrentMapId))
                return true;

            if (session.CharacterInfo.WarningZone)
                return true;

            if (session.CharacterInfo.Attacking)
                return true;

            if (session.CharacterInfo.Attacked != null && session.CharacterInfo.Attacked.Count > 0)
                return true;

            return HasRecentIncomingDamage(session, LOGOUT_DAMAGE_CANCEL_SECONDS);
        }

        private static void CancelLogoutFromServer(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            if (session.CharacterInfo.DisconnectTimer != null)
            {
                session.CharacterInfo.DisconnectTimer.Dispose();
                session.CharacterInfo.DisconnectTimer = (Timer)null;
                --TimerManager.TimerRunning;
            }

            session.CharacterInfo.DisconnectCounter = 0;
            session.SendData(PacketComposer.Compose("t", ""));
        }

        private static void Logout(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.IsChat || Session.CharacterInfo == null)
                return;

            if (Session.CharacterInfo.DisconnectTimer != null)
            {
                Session.CharacterInfo.DisconnectTimer.Dispose();
                --TimerManager.TimerRunning;
                Session.CharacterInfo.DisconnectTimer = (Timer)null;
            }


            if (IsLogoutBlocked(Session))
            {
                Session.SendData(PacketComposer.Compose("t", ""));
                return;
            }

            Session.CharacterInfo.DisconnectCounter = 0;
            Session.CharacterInfo.DisconnectTimer = new Timer(new TimerCallback(Others.LogoutTimer), (object)Session, 0, 1000);
            ++TimerManager.TimerRunning;
        }

        private static void LogoutTimer(object state)
        {
            Session session = (Session)state;
            if (session == null || session.CharacterInfo == null)
                return;

            if (session.CharacterInfo.DisconnectTimer == null)
                return;

            if (session.CharacterInfo.Disconnected || session.StoppedPlayer || session.CharacterInfo.Destroy)
            {
                session.CharacterInfo.StopBoosterAutoRefresh();

                session.CharacterInfo.DisconnectTimer.Dispose();
                session.CharacterInfo.DisconnectTimer = (Timer)null;
                --TimerManager.TimerRunning;
                return;
            }

            if (IsLogoutBlocked(session))
            {
                CancelLogoutFromServer(session);
                return;
            }

            if (session.CharacterInfo.DisconnectCounter >= LOGOUT_COUNTDOWN_SECONDS)
            {
                session.CharacterInfo.DisconnectTimer.Dispose();
                session.CharacterInfo.DisconnectTimer = (Timer)null;
                --TimerManager.TimerRunning;

                session.CharacterInfo.StopBoosterAutoRefresh();

                session.SendData(PacketComposer.Compose("l", ""));

                session.CharacterInfo.Disconnected = true;

                foreach (int key in (IEnumerable<int>)session.CharacterInfo.PlayerInRange.Keys)
                {
                    Session other = SessionManager.GetSessionByCharacterId(key);
                    if (other != null && other.CharacterInfo != null)
                    {
                        other.CharacterInfo.PlayerInRange.Remove(session.CharacterId);
                        other.SendData(MapUserLeaveComposer.Compose(session.CharacterId));
                    }
                }

                MapManager.RemoveUserFromMap(session);

                if (TeamDeathMatch.IsActive())
                    TeamDeathMatch.removeUserFromTdm(session);

                SessionManager.StopSession(session.Id);
                return;
            }

            session.CharacterInfo.DisconnectCounter++;
        }

        private static void LogoutCancel(Session Session, ClientMessage Message)
        {
            if (Session.CharacterInfo.DisconnectTimer != null)
            {
                Session.CharacterInfo.DisconnectTimer.Dispose();
                --TimerManager.TimerRunning;
                Session.CharacterInfo.DisconnectTimer = (Timer)null;
            }
            Session.SendData(PacketComposer.Compose("t", ""));
        }

        private static void PortalJump(Session Session, ClientMessage Message)
        {
            bool canJump = true;
            bool internalGatePortal = false;

            if (MapManager.GetInstanceByMapId(Session.CurrentMapId) == null ||
                (Session.CharacterInfo.CurrentPortal == 0 || Session.CharacterInfo.IsJumping || !Session.CharacterInfo.PortalZone))
                return;

            DisposePortalJumpTimer(Session);

            Session.CharacterInfo.PendingGalaxyGateDestination = null;

            PortalInfo portalById1 = PortalManager.GetPortalById(Session.CharacterInfo.CurrentPortal);
            PortalInfo portalById2 = null;

            if (portalById1 == null && GalaxyGatePortalService.IsGalaxyGatePortalId(Session.CharacterInfo.CurrentPortal))
            {
                if (Session.CharacterInfo.GalaxyGatePortals != null)
                {
                    foreach (PortalInfo p in (System.Collections.Generic.IEnumerable<PortalInfo>)Session.CharacterInfo.GalaxyGatePortals.Keys)
                    {
                        if (p.Id == Session.CharacterInfo.CurrentPortal)
                        {
                            portalById1 = p;
                            break;
                        }
                    }
                }

                if (portalById1 != null && GalaxyGatePortalService.TryGetDestination(Session, portalById1.Id, out PortalInfo dest))
                {
                    portalById2 = dest;
                    Session.CharacterInfo.PendingGalaxyGateDestination = dest;
                }
            }

            if (portalById2 == null)
            {
                if (Session.CharacterInfo.GalaxyGateInternalPortals != null)
                {
                    foreach (PortalInfo p in (System.Collections.Generic.IEnumerable<PortalInfo>)Session.CharacterInfo.GalaxyGateInternalPortals.Keys)
                    {
                        if (p.Id == Session.CharacterInfo.CurrentPortal)
                        {
                            portalById1 = p;
                            break;
                        }
                    }
                }

                if (portalById1 != null && GalaxyGateWaveService.TryGetInternalDestination(Session, portalById1.Id, out PortalInfo internalDest))
                {
                    portalById2 = internalDest;
                    Session.CharacterInfo.PendingGalaxyGateDestination = internalDest;

                    Session.CharacterInfo.PendingGalaxyGateRewardGateId = GalaxyGateWaveService.GateIdFromMap(Session.CharacterInfo.MapId);

                    internalGatePortal = true;
                }
            }

            if (portalById1 != null && portalById2 == null)
            {
                portalById2 = PortalManager.GetPortalById(portalById1.LinkedId);
            }

            if (portalById2 == null && Session.CharacterInfo.CurrentPortal == MAP_45_TO_44_PORTAL_ID)
                portalById2 = CreateMap45To44SafeArrivalPortal();

            if (portalById1 == null || portalById2 == null)
                return;

            bool isPvpMap = UsesPvpPortalCombatBlock(Session.CharacterInfo.MapId, Session.CharacterInfo.CurrentPortal);

            const double PVP_PORTAL_COMBAT_BLOCK_SECONDS = 5.0;
            bool underAttack = (UnixTimestamp.GetCurrent() - Session.CharacterInfo.LastAttackByAttackerReceived < PVP_PORTAL_COMBAT_BLOCK_SECONDS);

            if (isPvpMap && underAttack)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|You can't jump if you are under attack!"));
                return;
            }


            if (!Session.CharacterInfo.IsAdmin && !Session.CharacterInfo.IsMod)
            {
                int targetMapId = Others.invasionPortal.Contains(portalById1.Id) ? 81 : portalById2.MapId;
                int requiredLevel;
                if (!MapAccessService.CanAccessMap(Session.CharacterInfo.FactionId, Session.CharacterInfo.Level, targetMapId, out requiredLevel))
                {
                    Session.SendData(PacketComposer.Compose("k", requiredLevel.ToString()));
                    return;
                }
            }

            canJump = checkCanJump(Session, portalById1);
            if (canJump)
            {
                if (internalGatePortal)
                    ClearGalaxyGateInternalPortals(Session);

                Session.CharacterInfo.IsJumping = true;
                if (Others.invasionPortal.Contains(portalById1.Id))
                    Session.SendData(PacketComposer.Compose("U", "81|" + (object)portalById1.Id));
                else
                    Session.SendData(PacketComposer.Compose("U", portalById2.MapId.ToString() + "|" + (object)portalById1.Id));

                Session.CharacterInfo.PortalJumpTimer = new Timer(new TimerCallback(Others.ChangeMap), (object)Session, 3000, 0);
                ++TimerManager.TimerRunning;
            }
        }

        private static bool checkCanJump(Session Session, PortalInfo portal)
        {
            switch (portal.Id)
            {
                case 204:
                case 205:
                case 206:
                    if (!Invasion.Active)
                    {
                        Session.SendData(PacketComposer.Compose("A", "STD|Invasion isn't active !"));
                        return false;
                    }
                    return true;
                case 201:
                    if (Session.CharacterInfo.FactionId != 1)
                    {
                        Session.SendData(PacketComposer.Compose("A", "STD|Only MMO can jump this portal !"));
                        return false;
                    }
                    return true;
                case 202:
                    if (Session.CharacterInfo.FactionId != 2)
                    {
                        Session.SendData(PacketComposer.Compose("A", "STD|Only EIC can jump this portal !"));
                        return false;
                    }
                    return true;
                case 203:
                    if (Session.CharacterInfo.FactionId != 3)
                    {
                        Session.SendData(PacketComposer.Compose("A", "STD|Only VRU can jump this portal !"));
                        return false;
                    }
                    return true;
                default:
                    return true;
            }
        }

        private static void ChangeMap(object state)
        {
            Session session = (Session)state;
            if (session == null)
                return;

            if (MapManager.GetInstanceByMapId(session.CurrentMapId) == null)
            {
                DisposePortalJumpTimer(session);
                session.CharacterInfo.IsJumping = false;
                session.CharacterInfo.CanMove = true;
                session.SendData(UserDataComposer.Compose(session));
                return;
            }

            bool isPvpMap = UsesPvpPortalCombatBlock(session.CharacterInfo.MapId, session.CharacterInfo.CurrentPortal);

            const double PVP_PORTAL_COMBAT_BLOCK_SECONDS = 5.0;
            bool underAttack = (UnixTimestamp.GetCurrent() - session.CharacterInfo.LastAttackByAttackerReceived < PVP_PORTAL_COMBAT_BLOCK_SECONDS);

            if (isPvpMap && underAttack)
            {
                session.SendData(PacketComposer.Compose("A", "STD|Jump canceled, you are under attack!"));
                session.CharacterInfo.IsJumping = false;
                session.CharacterInfo.CanMove = true;
                session.SendData(UserDataComposer.Compose(session));
                DisposePortalJumpTimer(session);
                return;
            }

            PortalInfo portalById = null;

            if (session.CharacterInfo.PendingGalaxyGateDestination != null)
            {
                portalById = session.CharacterInfo.PendingGalaxyGateDestination;
                session.CharacterInfo.PendingGalaxyGateDestination = null;
            }
            else
            {
                PortalInfo p1 = PortalManager.GetPortalById(session.CharacterInfo.CurrentPortal);
                if (p1 != null)
                    portalById = PortalManager.GetPortalById(p1.LinkedId);
            }

            if (session.CharacterInfo.CurrentPortal == MAP_45_TO_44_PORTAL_ID)
                portalById = CreateMap45To44SafeArrivalPortal();

            if (portalById == null && !Others.invasionPortal.Contains(session.CharacterInfo.CurrentPortal))
            {
                DisposePortalJumpTimer(session);
                session.CharacterInfo.IsJumping = false;
                session.CharacterInfo.CanMove = true;
                session.SendData(UserDataComposer.Compose(session));
                return;
            }


            if (!session.CharacterInfo.IsAdmin && !session.CharacterInfo.IsMod)
            {
                int targetMapId = Others.invasionPortal.Contains(session.CharacterInfo.CurrentPortal) ? 81 : portalById.MapId;
                int requiredLevel;
                if (!MapAccessService.CanAccessMap(session.CharacterInfo.FactionId, session.CharacterInfo.Level, targetMapId, out requiredLevel))
                {
                    session.SendData(PacketComposer.Compose("k", requiredLevel.ToString()));
                    session.CharacterInfo.IsJumping = false;
                    session.CharacterInfo.CanMove = true;
                    session.SendData(UserDataComposer.Compose(session));
                    DisposePortalJumpTimer(session);
                    return;
                }
            }

            session.CharacterInfo.CanMove = false;

            if (session.CharacterInfo.PathFinding != null)
            {
                session.CharacterInfo.PathFinding.Dispose();
                session.CharacterInfo.IsMoving = false;
                session.CharacterInfo.LastMove.Stop();
            }
            if (session.CharacterInfo.PathTime != null)
                session.CharacterInfo.PathTime.Dispose();

            if (session.CharacterInfo.PendingGalaxyGateRewardGateId > 0)
            {
                int gateId = session.CharacterInfo.PendingGalaxyGateRewardGateId;
                session.CharacterInfo.PendingGalaxyGateRewardGateId = 0;

                GalaxyGateRewardService.GiveCompletionReward(session, gateId);
            }

            if (Others.invasionPortal.Contains(session.CharacterInfo.CurrentPortal))
                MapHandler.OpenPublicConnection(session, 81, null);
            else
                MapHandler.OpenPublicConnection(session, portalById.MapId, portalById);

            session.CharacterInfo.IsJumping = false;
            ShipMovement.RefreshZones(session);

            session.CharacterInfo.Invincible = true;
            session.SendData(PacketComposer.Compose("n", "fx|start|INVINCIBILITY|" + session.CharacterId));

            if (session.CharacterInfo.InvincibilityTimer != null)
                session.CharacterInfo.InvincibilityTimer.Dispose();

            session.CharacterInfo.InvincibilityTimer = new Timer(new TimerCallback(Others.RemoveInvincibility), (object)session, 10000, 0);

            session.CharacterInfo.CanMove = true;
            session.CharacterInfo.SendCollectibles(session);

            DisposePortalJumpTimer(session);
        }

        private static void RemoveInvincibility(object state)
        {
            Session session = (Session)state;
            if (session == null || session.CharacterInfo == null)
                return;

            session.CharacterInfo.Invincible = false;
            session.SendData(PacketComposer.Compose("n", "fx|end|INVINCIBILITY|" + session.CharacterId));

            if (session.CharacterInfo.InvincibilityTimer != null)
            {
                session.CharacterInfo.InvincibilityTimer.Dispose();
                session.CharacterInfo.InvincibilityTimer = null;
            }
        }
    }
}

