

using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using System.Collections.Generic;
using System.Threading;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Titles;

namespace OrbitReborn_Emulator.Game.Maps
{
    internal class MapHandler
    {
        public static void OpenPublicConnection(Session Session, int MapId, PortalInfo LinkedPortal = null)
        {
            MapHandler.PrepareMap(Session, MapId, LinkedPortal, false);
        }

        public static void ResyncCurrentMap(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            int mapId = Session.CharacterInfo.MapId;
            MapInfo mapInfo = MapInfoLoader.GetMapInfo(mapId);
            if (mapInfo == null)
                return;

            if (!MapManager.InstanceIsLoadedForMap(mapInfo.Id))
                MapManager.TryLoadMapInstance(mapInfo.Id);

            MapInstance instance = MapManager.GetInstanceByMapId(mapInfo.Id);
            if (instance == null)
                return;

            Session.AbsoluteMapId = mapInfo.Id;
            Session.MapAuthed = true;
            Session.MapJoined = true;
            TitleService.RefreshDisplayedTitle(Session, false);

            Session.SendData(PacketComposer.Compose("i", Session.CharacterInfo.MapId.ToString()));
            Session.SendData(UserDataComposer.Compose(Session));

            if (Session.CharacterInfo.Settings.ShowDrones == 1)
            {
                Session.SendData(PacketComposer.Compose("n", "d|" + (object)Session.CharacterId + "|" + Session.CharacterInfo.GetDronePacketString()));
            }
            else
            {
                int flax, iris;
                Session.CharacterInfo.GetDroneDisplayCounts(out flax, out iris);
                Session.SendData(PacketComposer.Compose("n", "e|" + (object)Session.CharacterId + "|" + (object)flax + "/" + (object)iris));
            }

            Session.SendData(PacketComposer.Compose("n", "pt|" + (object)Session.CharacterId + "|" + Session.CharacterInfo.GameTitle));

            Session.CharacterInfo.ClientPortalIds = null;
            Session.SendData(PacketComposer.Compose("N", "-1"));
            instance.SendObjects(Session);
            instance.SendPortals(Session);
            GalaxyGateWaveService.OnPlayerEnteredMap(Session);

            Fight.SendTechStatus(Session);
            Fight.SendOwnerTechVisualReplay(Session);
            Fight.SendRocketLauncherProtocolState(Session, true);

            ShipMovement.CheckWarningZone(Session);
            ShipMovement.CheckPeaceZone(Session);
            ShipMovement.CheckPortalZone(Session, true);

            if (Session.CharacterInfo.UpdateMovementTimer != null)
                Session.CharacterInfo.UpdateMovementTimer.Dispose();

            ShipMovement.UpdateMovement((object)Session);
            Session.CharacterInfo.UpdateMovementTimer = new Timer(new TimerCallback(ShipMovement.UpdateMovement), (object)Session, 300, 300);

            ShipMovement.CheckAliensInRange((object)Session);
            ShipMovement.CheckPlayerInRange((object)Session);
        }

        public static void PrepareMap(Session Session, int MapId, PortalInfo LinkedPortal, bool BypassAuthentication = false)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            MapInfo mapInfo = MapInfoLoader.GetMapInfo(MapId);
            if (mapInfo == null)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|This map is not available."));
                return;
            }

            if (!MapManager.InstanceIsLoadedForMap(mapInfo.Id))
                MapManager.TryLoadMapInstance(mapInfo.Id);

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(mapInfo.Id);
            if (instanceByMapId == null)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|This map is not available."));
                return;
            }
            if (mapInfo.CurrentCompanyUsers(Session.CharacterInfo.FactionId) >= mapInfo.MaxUsers && !Session.CharacterInfo.IsAdmin && !Session.CharacterInfo.IsMod)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|The map is full for your company !"));
                if (Session.CharacterInfo.MapId != MapId)
                    return;
                Fight.KillPlayer(Session);
            }
            else
            {
                MapManager.RemoveUserFromMap(Session);
                Session.AbsoluteMapId = mapInfo.Id;
                Session.CharacterInfo.MapId = mapInfo.Id;
                Session.MapJoined = false;
                Session.MapAuthed = true;
                MapHandler.EnterMap(Session, instanceByMapId, LinkedPortal);
            }
        }

        private static bool IsHomePeaceMap(int mapId)
        {
            return
                mapId == 1 || mapId == 2 || mapId == 3 || mapId == 4 ||
                mapId == 5 || mapId == 6 || mapId == 7 || mapId == 8 ||
                mapId == 9 || mapId == 10 || mapId == 11 || mapId == 12 ||
                mapId == 17 || mapId == 18 || mapId == 19 || mapId == 20 ||
                mapId == 21 || mapId == 22 || mapId == 23 || mapId == 24 ||
                mapId == 25 || mapId == 26 || mapId == 27 || mapId == 28;
        }


        public static void EnterMap(Session Session, MapInstance Instance, PortalInfo LinkedPortal)
        {
            if (!Session.MapAuthed || Session.MapJoined || Session.AbsoluteMapId != Instance.MapId || (Instance == null || Session.MapJoined || !Session.MapAuthed))
                return;
            if (!Instance.AddUserToMap(Session))
            {
                MapManager.RemoveUserFromMap(Session);
            }
            else
            {
                Session.MapAuthed = true;
                Session.MapJoined = true;
                TitleService.RefreshDisplayedTitle(Session, false);
                if (LinkedPortal != null)
                {
                    Session.CharacterInfo.LocX = LinkedPortal.PosX;
                    Session.CharacterInfo.LocY = LinkedPortal.PosY;
                    Session.CharacterInfo.NewLocX = Session.CharacterInfo.LocX;
                    Session.CharacterInfo.NewLocY = Session.CharacterInfo.LocY;
                    Session.SendData(PacketComposer.Compose("i", LinkedPortal.MapId.ToString()));
                    Session.SendData(UserDataComposer.Compose(Session));
                    if (Session.CharacterInfo.Settings.ShowDrones == 1)
                    {
                        Session.SendData(PacketComposer.Compose("n", "d|" + (object)Session.CharacterId + "|" + Session.CharacterInfo.GetDronePacketString()));
                    }
                    else
                    {
                        int flax, iris;
                        Session.CharacterInfo.GetDroneDisplayCounts(out flax, out iris);

                        Session.SendData(PacketComposer.Compose("n", "e|" + (object)Session.CharacterId + "|" + (object)flax + "/" + (object)iris));
                    }
                    Session.SendData(PacketComposer.Compose("n", "pt|" + (object)Session.CharacterId + "|" + Session.CharacterInfo.GameTitle));
                    Session.CharacterInfo.CurrentPortal = LinkedPortal.Id;
                }
                else
                {
                    Session.SendData(PacketComposer.Compose("i", Session.CharacterInfo.MapId.ToString()));
                    Session.SendData(UserDataComposer.Compose(Session));
                    if (Session.CharacterInfo.Settings.ShowDrones == 1)
                    {
                        Session.SendData(PacketComposer.Compose("n", "d|" + (object)Session.CharacterId + "|" + Session.CharacterInfo.GetDronePacketString()));
                    }
                    else
                    {
                        int flax, iris;
                        Session.CharacterInfo.GetDroneDisplayCounts(out flax, out iris);

                        Session.SendData(PacketComposer.Compose("n", "e|" + (object)Session.CharacterId + "|" + (object)flax + "/" + (object)iris));
                    }
                    Session.SendData(PacketComposer.Compose("n", "pt|" + (object)Session.CharacterId + "|" + Session.CharacterInfo.GameTitle));
                }

                Session.CharacterInfo.Attacker = (Session)null;
                Session.CharacterInfo.Attacked.Clear();
                Session.CharacterInfo.SelectedPlayer = 0;

                Session.CharacterInfo.Attacking = false;

                if (IsHomePeaceMap(Session.CharacterInfo.MapId))
                    Session.CharacterInfo.NoFightTimer = 10;
                else
                    Session.CharacterInfo.NoFightTimer = 0;

                Session.CharacterInfo.ShieldTwinkleEnabled = false;
                Session.SendData(PacketComposer.Compose("A", "SHS|0|0|0"));

                if (Session.CharacterInfo.LaserAttackTimer != null)
                {
                    Session.CharacterInfo.LaserAttackTimer.Dispose();
                    Session.CharacterInfo.LaserAttackTimer = null;
                }
                if (Session.CharacterInfo.RocketAttackTimer != null)
                {
                    Session.CharacterInfo.RocketAttackTimer.Dispose();
                    Session.CharacterInfo.RocketAttackTimer = null;
                }

                List<int> previousPlayersInRange = new List<int>();
                lock (Session.CharacterInfo.PlayerInRange)
                {
                    foreach (int item_0 in (IEnumerable<int>)Session.CharacterInfo.PlayerInRange.Keys)
                        previousPlayersInRange.Add(item_0);

                    Session.CharacterInfo.PlayerInRange.Clear();
                }

                foreach (int item_0 in previousPlayersInRange)
                {
                    Session local_2 = SessionManager.GetSessionByCharacterId(item_0);
                    if (local_2 != null && local_2.CharacterInfo != null)
                        local_2.SendData(MapUserLeaveComposer.Compose(Session.CharacterId));
                }

                lock (Session.CharacterInfo.NpcInRange)
                    Session.CharacterInfo.NpcInRange.Clear();

                Session.SendData(PacketComposer.Compose("N", "-1"));
                Instance.SendObjects(Session);
                Session.CharacterInfo.ClientPortalIds = null;
                Instance.SendPortals(Session);
                GalaxyGateWaveService.OnPlayerEnteredMap(Session);

                Fight.SendTechStatus(Session);
                Fight.SendOwnerTechVisualReplay(Session);
                Fight.SendRocketLauncherProtocolState(Session, true);

                Session.CharacterInfo.WarningZone = false;
                if (Session.CharacterInfo.WarningZoneTimer != null)
                {
                    Session.CharacterInfo.WarningZoneTimer.Dispose();
                    Session.CharacterInfo.WarningZoneTimer = (Timer)null;
                }

                ShipMovement.CheckWarningZone(Session);

                Session.CharacterInfo.PeaceZone = false;
                ShipMovement.CheckPeaceZone(Session);

                if (Session.CharacterInfo.UpdateMovementTimer != null)
                    Session.CharacterInfo.UpdateMovementTimer.Dispose();

                ShipMovement.UpdateMovement((object)Session);
                Session.CharacterInfo.UpdateMovementTimer = new Timer(new TimerCallback(ShipMovement.UpdateMovement), (object)Session, 300, 300);

                ShipMovement.CheckPeaceZone(Session);
                ShipMovement.CheckPortalZone(Session, true);
            }

            if (Session.CharacterInfo.KillStrek >= 10)
                Session.SendData(PacketComposer.Compose("n", "fx|start|RAGE|" + (object)Session.CharacterInfo.Id));
        }
    }
}
