// Decompiled with JetBrains decompiler
// Type: OrbitReborn_Emulator.Game.Maps.MapHandler
// Assembly: MilkyWay Emulator, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: 41E1229A-7B44-4276-8108-A67D8866C227
// Assembly location: C:\Totally not GTA\andromedaserver\Emulator\MilkyWay Emulator.exe

using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using System.Collections.Generic;
using System.Threading;
using OrbitReborn_Emulator.Game.GalaxyGates;

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

            // Reconnect/refresh: the actor already exists server-side and must not be removed.
            Session.AbsoluteMapId = mapInfo.Id;
            Session.MapAuthed = true;
            Session.MapJoined = true;

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

            if (Session.CharacterInfo.GameTitle != "")
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
            ShipMovement.CheckPortalZone(Session);

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
                // 1-1..1-4
                mapId == 1 || mapId == 2 || mapId == 3 || mapId == 4 ||
                // 2-1..2-4
                mapId == 5 || mapId == 6 || mapId == 7 || mapId == 8 ||
                // 3-1..3-4
                mapId == 9 || mapId == 10 || mapId == 11 || mapId == 12 ||
                // 1-5..1-8
                mapId == 17 || mapId == 18 || mapId == 19 || mapId == 20 ||
                // 2-5..2-8
                mapId == 21 || mapId == 22 || mapId == 23 || mapId == 24 ||
                // 3-5..3-8
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
                    if (Session.CharacterInfo.GameTitle != "")
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
                    if (Session.CharacterInfo.GameTitle != "")
                        Session.SendData(PacketComposer.Compose("n", "pt|" + (object)Session.CharacterId + "|" + Session.CharacterInfo.GameTitle));
                }

                Session.CharacterInfo.Attacker = (Session)null;
                Session.CharacterInfo.Attacked.Clear();
                Session.CharacterInfo.SelectedPlayer = 0;

                // IMPORTANT : arrêter l'état "attaque" au changement de map
                Session.CharacterInfo.Attacking = false;

                // Safe immédiat UNIQUEMENT si la map d'arrivée a une peace zone portail
                if (IsHomePeaceMap(Session.CharacterInfo.MapId))
                    Session.CharacterInfo.NoFightTimer = 10;   // >=10 => pas de combat lock
                else
                    Session.CharacterInfo.NoFightTimer = 0;

                // ------------------------------------------------------------
                // IMPORTANT (Flash-like): reset SHS state on map change
                // Empêche de conserver un twinkle ON provenant de la map précédente.
                // Le (re)enable sera géré ensuite par ExecuteNoFightMonitor.
                // ------------------------------------------------------------
                Session.CharacterInfo.ShieldTwinkleEnabled = false;
                Session.SendData(PacketComposer.Compose("A", "SHS|0|0|0"));

                // Optionnel mais conseillé: stopper les timers d'attaque si encore actifs
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
                Session.CharacterInfo.ClientPortalIds = null; // force snapshot propre sur nouvelle map
                Instance.SendPortals(Session);
                GalaxyGateWaveService.OnPlayerEnteredMap(Session);

                // Flash parity: TX|S refreshes the owner runtime/UI state, but map visuals are still
                // driven by visual TX|A replays. The hero is not part of SendObjects(), so re-send
                // the owner tech visuals explicitly after map entry / respawn.
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
                ShipMovement.CheckPortalZone(Session);
            }

            if (Session.CharacterInfo.KillStrek >= 10)
                Session.SendData(PacketComposer.Compose("n", "fx|start|RAGE|" + (object)Session.CharacterInfo.Id));
        }
    }
}
