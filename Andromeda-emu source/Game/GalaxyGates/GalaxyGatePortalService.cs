using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Storage;
using System;
using System.Data;

namespace OrbitReborn_Emulator.Game.GalaxyGates
{
    public static class GalaxyGatePortalService
    {
        private const int GG_PORTAL_ID_BASE = 91000000;

        private const int GG_BETA_FORWARD = 1400;
        private const int GG_BETA_SHIFT_TOP = 800;
        private const int GG_BETA_SHIFT_BOTTOM = -800;

        private const int GG_STEP_Y = 1000;

        private const int GG_STEP_X = 500;

        private const double GG_DELTA_SCALE = 0.85;

        public static bool IsGalaxyGatePortalId(int portalId)
        {
            return portalId >= GG_PORTAL_ID_BASE && portalId < (GG_PORTAL_ID_BASE + 9000000);
        }

        public static void RefreshForSession(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            session.CharacterInfo.GalaxyGatePortals = new CList<PortalInfo>();
            session.CharacterInfo.GalaxyGatePortalDestinations = new CDictionnary<int, PortalInfo>();

            int mapId = session.CharacterInfo.MapId;

            int faction = session.CharacterInfo.RealFaction > 0 ? session.CharacterInfo.RealFaction : session.CharacterInfo.FactionId;
            int homeX1MapId = faction == 2 ? 5 : (faction == 3 ? 9 : 1);

            if (mapId != homeX1MapId)
                return;

            int baseX = 2000;
            int baseY = 1200;

            if (mapId == 5)
            {
                baseX = 19000;
                baseY = 1200;
            }
            else if (mapId == 9)
            {
                baseX = 19200;
                baseY = 11500;
            }

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                client.ClearParameters();
                client.SetParameter("userId", (object)session.CharacterInfo.Id);

                DataTable dt = client.ExecuteQueryTable(
                    "SELECT gate_id FROM player_galaxy_gates WHERE user_id = @userId AND on_map = 1"
                );

                if (dt == null || dt.Rows.Count == 0)
                    return;

                foreach (DataRow row in dt.Rows)
                {
                    int gateId = Convert.ToInt32(row["gate_id"]);

                    int portalType = gateId + 1;

                    if (portalType < 2 || portalType > 5)
                        portalType = 1;

                    int targetMapId = gateId == 1 ? 51 :
                                      gateId == 2 ? 52 :
                                      gateId == 3 ? 53 :
                                      gateId == 4 ? 55 : 51;


                    int dirX = mapId == 1 ? 1 : -1;

                    int betaOffsetX = dirX * GG_BETA_FORWARD;
                    int betaOffsetY = (mapId == 9) ? GG_BETA_SHIFT_BOTTOM : GG_BETA_SHIFT_TOP;

                    int vX = (mapId == 5) ? -GG_STEP_X : GG_STEP_X;
                    int vY = -GG_STEP_Y;

                    int deltaForward = (int)Math.Round(GG_STEP_Y * GG_DELTA_SCALE);
                    int deltaSide = (int)Math.Round(vX * GG_DELTA_SCALE);

                    int offsetX = 0;
                    int offsetY = 0;

                    switch (gateId)
                    {
                        case 1:
                            offsetX = betaOffsetX + vX;
                            offsetY = betaOffsetY + vY;
                            break;

                        case 2:
                            offsetX = betaOffsetX;
                            offsetY = betaOffsetY;
                            break;

                        case 3:
                            offsetX = betaOffsetX - vX;
                            offsetY = betaOffsetY - vY;
                            break;

                        case 4:
                            offsetX = betaOffsetX + (dirX * deltaForward);
                            offsetY = betaOffsetY + (dirX * deltaSide);
                            break;

                        default:
                            offsetX = betaOffsetX;
                            offsetY = betaOffsetY;
                            break;
                    }

                    int portalX = baseX + offsetX;
                    int portalY = baseY + offsetY;

                    int portalId = GG_PORTAL_ID_BASE + (session.CharacterInfo.Id * 10) + gateId;

                    PortalInfo spawnPortal = new PortalInfo(
                        client,
                        portalId,
                        portalX,
                        portalY,
                        mapId,
                        0,
                        portalType
                    );

                    PortalInfo destinationPortal = new PortalInfo(
                        client,
                        portalId,
                        10500,
                        6500,
                        targetMapId,
                        0,
                        portalType
                    );

                    session.CharacterInfo.GalaxyGatePortals.Add(spawnPortal);
                    session.CharacterInfo.GalaxyGatePortalDestinations.Add(spawnPortal.Id, destinationPortal);
                }
            }
        }

        public static bool TryGetDestination(Session session, int portalId, out PortalInfo destination)
        {
            destination = null;

            if (session?.CharacterInfo?.GalaxyGatePortalDestinations == null)
                return false;

            if (!session.CharacterInfo.GalaxyGatePortalDestinations.ContainsKey(portalId))
                return false;

            destination = session.CharacterInfo.GalaxyGatePortalDestinations[portalId];
            return destination != null;
        }
    }
}
