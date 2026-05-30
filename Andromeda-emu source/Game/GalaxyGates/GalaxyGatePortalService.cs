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
        // Very high IDs to avoid collision with SQL portals (which are small: 1..999, etc.)
        private const int GG_PORTAL_ID_BASE = 91000000;

        // ---------------------------------------------------------------------
        // Galaxy Gates (X-1) layout
        // ---------------------------------------------------------------------
        // Goal: reproduce the DarkOrbit "triangle":
        // - Alpha / Beta / Gamma: evenly spaced but not perfectly vertically aligned
        // - Delta: placed on the perpendicular bisector (Alpha-Gamma) so that:
        //     distance(Delta, Alpha) == distance(Delta, Gamma)
        // - MMO: group on the right side of the base (Delta to the right of Beta)
        // - EIC + VRU: group on the left side of the base (Delta to the left of Beta)
        // ---------------------------------------------------------------------
        private const int GG_BETA_FORWARD = 1400;      // Distance "in front of" the base
        private const int GG_BETA_SHIFT_TOP = 800;     // Y shift for top bases (maps 1 & 5)
        private const int GG_BETA_SHIFT_BOTTOM = -800; // Y shift for bottom base (map 9)

        // Distance between Alpha<->Beta and Beta<->Gamma
        private const int GG_STEP_Y = 1000;

        // Small X shift to avoid a perfect vertical alignment
        private const int GG_STEP_X = 500;

        // Scale used to position Delta (percentage of the perpendicular vector).
        // 0.85 = compact triangle.
        private const double GG_DELTA_SCALE = 0.85;

        public static bool IsGalaxyGatePortalId(int portalId)
        {
            return portalId >= GG_PORTAL_ID_BASE && portalId < (GG_PORTAL_ID_BASE + 9000000);
        }

        // Called when entering a map and sending the portal list (SendPortals)
        // => Fills Session.CharacterInfo.GalaxyGatePortals + destinations
        public static void RefreshForSession(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return;

            // Always reset (important so we never keep GG portals outside X-1)
            session.CharacterInfo.GalaxyGatePortals = new CList<PortalInfo>();
            session.CharacterInfo.GalaxyGatePortalDestinations = new CDictionnary<int, PortalInfo>();

            int mapId = session.CharacterInfo.MapId;

            // Show Galaxy Gate portals ONLY on the player's own X-1 base map:
            // - MMO: 1-1 (mapId = 1)
            // - EIC: 2-1 (mapId = 5)
            // - VRU: 3-1 (mapId = 9)
            int faction = session.CharacterInfo.RealFaction > 0 ? session.CharacterInfo.RealFaction : session.CharacterInfo.FactionId;
            int homeX1MapId = faction == 2 ? 5 : (faction == 3 ? 9 : 1);

            if (mapId != homeX1MapId)
                return;

            // Station coordinates (exactly the same as MapInstance.SendObjects)
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
                    int gateId = Convert.ToInt32(row["gate_id"]); // 1..4

                    // Expected type by the Flash client (game.xml):
                    // 1=standardGate, 2=galaxyGate1, 3=galaxyGate2, 4=galaxyGate3, 5=galaxyGate4
                    // Therefore: Alpha(1)->2, Beta(2)->3, Gamma(3)->4, Delta(4)->5
                    int portalType = gateId + 1;

                    // Safety: if gateId is outside 1..4, fallback to standard gate type
                    if (portalType < 2 || portalType > 5)
                        portalType = 1;

                    // Destination map
                    int targetMapId = gateId == 1 ? 51 :
                                      gateId == 2 ? 52 :
                                      gateId == 3 ? 53 :
                                      gateId == 4 ? 55 : 51;

                    // -----------------------------------------------------------------
                    // GG portal position near the base
                    // -----------------------------------------------------------------
                    // Geometric construction:
                    //   - Place Beta at a fixed offset from the base.
                    //   - Alpha and Gamma are symmetric around Beta (same distance).
                    //   - Delta is placed on the perpendicular vector to (Alpha-Gamma) passing through Beta,
                    //     which guarantees: distance(Delta, Alpha) == distance(Delta, Gamma).
                    // Mirroring by company:
                    //   - MMO (map 1): group on the right, Delta to the right of Beta.
                    //   - EIC (map 5): group on the left, Delta to the left of Beta.
                    //   - VRU (map 9): group on the left, Delta to the left of Beta (base is at the bottom).

                    // "In front of" the base direction (MMO -> +X, EIC/VRU -> -X)
                    int dirX = mapId == 1 ? 1 : -1;

                    // Beta offset relative to the station
                    int betaOffsetX = dirX * GG_BETA_FORWARD;
                    int betaOffsetY = (mapId == 9) ? GG_BETA_SHIFT_BOTTOM : GG_BETA_SHIFT_TOP;

                    // Alpha -> Beta -> Gamma line orientation (not perfectly vertical)
                    // MMO + VRU: goes down while moving left (Alpha more to the right)
                    // EIC: goes down while moving right (Alpha more to the left)
                    int vX = (mapId == 5) ? -GG_STEP_X : GG_STEP_X;
                    int vY = -GG_STEP_Y;

                    // Perpendicular vector to (Alpha-Gamma): w = (GG_STEP_Y, vX)
                    int deltaForward = (int)Math.Round(GG_STEP_Y * GG_DELTA_SCALE);
                    int deltaSide = (int)Math.Round(vX * GG_DELTA_SCALE);

                    int offsetX = 0;
                    int offsetY = 0;

                    switch (gateId)
                    {
                        case 1: // Alpha
                            offsetX = betaOffsetX + vX;
                            offsetY = betaOffsetY + vY;
                            break;

                        case 2: // Beta
                            offsetX = betaOffsetX;
                            offsetY = betaOffsetY;
                            break;

                        case 3: // Gamma
                            offsetX = betaOffsetX - vX;
                            offsetY = betaOffsetY - vY;
                            break;

                        case 4: // Delta
                            // MMO: +w  /  EIC+VRU: -w
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

                    // Unique ID per player + gate
                    int portalId = GG_PORTAL_ID_BASE + (session.CharacterInfo.Id * 10) + gateId;

                    // Visible portal on X-1
                    PortalInfo spawnPortal = new PortalInfo(
                        client,
                        portalId,
                        portalX,
                        portalY,
                        mapId,
                        0,
                        portalType
                    );

                    // "Virtual" LinkedPortal: only used to place the player on arrival
                    // (MapHandler.EnterMap reads LinkedPortal.PosX/PosY)
                    PortalInfo destinationPortal = new PortalInfo(
                        client,
                        portalId,
                        10500,   // Arrival X (safe value)
                        6500,    // Arrival Y (safe value)
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
