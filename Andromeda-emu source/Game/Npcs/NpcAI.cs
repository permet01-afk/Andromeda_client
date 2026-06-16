using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Titles;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Specialized;
using OrbitReborn_Emulator.Util;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Windows;

namespace OrbitReborn_Emulator.Game.Npcs
{
    public class NpcAI
    {
        public static readonly Random RandomPos = new Random();
        public static CList<Npc> NpcList;
        public static CList<Npc> NpcToRemove;
        public static CList<Npc> NpcToAdd;
        private static Timer mPerformUpdate;
        private static object mSyncRoot;
        private static CDictionnary<string, List<string>> RegisteredNpc;

        private const int ORBIT_RADIUS = 380;
        private const int CHASE_DISTANCE = 550;
        private const int STOP_SHOOT_RANGE = 450;
        private const int AI_TICK_RATE = 800;
        private const int NPC_MOVEMENT_TICK_RATE = 550;
        private const int MAP45_BOSS_CUBIKON_MARKER_LIFETIME_TICKS = 6;
        private const double ORBIT_SLOT_ANGLE_STEP_DEG = 12.0;
        private const double ORBIT_SLOT_MAX_OFFSET_DEG = 120.0;
        private const int NPC_STACK_DISTANCE = 95;
        private const int STACK_RESOLVE_COOLDOWN_MS = 900;

        private const int INSTANT_SHOOT_RANGE = STOP_SHOOT_RANGE;

        private const int NPC_MIN_COORD = 5;
        private const int PORTAL_SPAWN_EXCLUSION_RADIUS = 1400;
        private const int PORTAL_MOVEMENT_EXCLUSION_RADIUS = 800;
        private const int PORTAL_RANDOM_POSITION_ATTEMPTS = 24;
        private const int PORTAL_MOVEMENT_REDIRECT_DISTANCE = 650;
        private const int PORTAL_MOVEMENT_EXIT_PADDING = 120;

        private const double CUBIKON_PROTEGIT_LEASH_DISTANCE = 900.0;
        private const int MAP45_ID = 29;
        private const int MAP45_BOSS_CUBIKON_MIN_X = 14000;
        private const int MAP45_BOSS_CUBIKON_MAX_X = 28000;
        private const int MAP45_BOSS_CUBIKON_MIN_Y = 19000;
        private const int MAP45_BOSS_CUBIKON_MAX_Y = 23500;

        private const int AGGRESSIVE_DETECT_RANGE = 600;
        private const double IDLE_MAP_COMBAT_GRACE_SECONDS = 12.0;

        private static readonly HashSet<string> AggressiveNpcNames = new HashSet<string>()
        {
            "-=[ Lordakia ]=-",
            "-=[ Boss Lordakia ]=-",
            "-=[ Saimon ]=-",
            "-=[ Boss Saimon ]=-",
            "-=[ Devolarium ]=-",
            "-=[ Boss Devolarium ]=-",
            "-=[ Sibelonit ]=-",
            "-=[ Boss Sibelonit ]=-",
            "-=[ Sibelon ]=-",
            "-=[ Boss Sibelon ]=-",
            "-=[ Kristallin ]=-",
            "-=[ Boss Kristallin ]=-",
            "-=[ Mordon ]=-",
            "-=[ Boss Mordon ]=-",
            "-=[ Protegit ]=-",
            "-=[ Uber Lordakia ]=-",
            "-=[ Uber Saimon ]=-",
            "-=[ Uber Devolarium ]=-",
            "-=[ Uber Sibelonit ]=-",
            "-=[ Uber Sibelon ]=-",
            "-=[ Uber Kristallin ]=-",
            "-=[ Uber Mordon ]=-",
            "-=[ Boss Protegit ]=-",
            "-=[ Invader ]=-",
            "Invader"
        };

        private static readonly Dictionary<int, bool> WasOutOfRange = new Dictionary<int, bool>();
        private static readonly Dictionary<int, int> LastInstantShootTick = new Dictionary<int, int>();
        private static readonly Dictionary<int, int> LastStackResolveTick = new Dictionary<int, int>();

        private static readonly MapActor[] EmptyMapActorArray = new MapActor[0];
        private const double CHASE_DISTANCE_SQUARED = CHASE_DISTANCE * CHASE_DISTANCE;
        private const double STOP_SHOOT_RANGE_SQUARED = STOP_SHOOT_RANGE * STOP_SHOOT_RANGE;
        private const double INSTANT_SHOOT_RANGE_SQUARED = INSTANT_SHOOT_RANGE * INSTANT_SHOOT_RANGE;
        private const double NPC_ATTACK_WAKE_RANGE_SQUARED = 900.0 * 900.0;
        private const double CUBIKON_PROTEGIT_LEASH_DISTANCE_SQUARED = CUBIKON_PROTEGIT_LEASH_DISTANCE * CUBIKON_PROTEGIT_LEASH_DISTANCE;


        private const double REGEN_DELAY_SECONDS = 15.0;
        private const double HP_REGEN_PERCENT_PER_SECOND = 0.01;
        private const double SHIELD_REGEN_PERCENT_PER_SECOND = 0.01;

        private static readonly Dictionary<int, double> HpRegenCarry = new Dictionary<int, double>();
        private static readonly Dictionary<int, double> ShieldRegenCarry = new Dictionary<int, double>();

        private static void LogTimerFailure(string callbackName, Exception ex)
        {
            Output.WriteLine((object)("[NpcAITimer] " + callbackName + " failed: " + ex.ToString()), OutputLevel.CriticalError);
        }

        private static void StopNpcPathFinder(Npc npc)
        {
            if (npc == null)
                return;

            Timer pathFinder = npc.PathFinder;
            npc.PathFinder = null;
            npc.IsMoving = false;

            if (pathFinder == null)
                return;

            try
            {
                pathFinder.Dispose();
            }
            catch { }
        }

        private static int GetStableNpcOffset(Npc npc, int salt, int minInclusive, int maxExclusive)
        {
            int span = maxExclusive - minInclusive;
            if (npc == null || span <= 0)
                return minInclusive;

            unchecked
            {
                int hash = npc.Id;
                hash = (hash * 397) ^ npc.TargetId;
                hash = (hash * 397) ^ npc.MapId;
                hash = (hash * 397) ^ salt;
                return minInclusive + ((hash & 0x7fffffff) % span);
            }
        }

        private static void SleepNpcMovement(Npc npc)
        {
            if (npc == null)
                return;

            if (!npc.IsMoving && npc.PathFinder == null && npc.NewLocX == npc.LocX && npc.NewLocY == npc.LocY)
                return;

            npc.StopMovementAtCurrentPosition();
        }

        private static void GetNpcMovementBounds(int mapId, out int minX, out int maxX, out int minY, out int maxY)
        {
            int safeMinX;
            int safeMaxX;
            int safeMinY;
            int safeMaxY;
            ShipMovement.GetRadiationSafeBounds(mapId, out safeMinX, out safeMaxX, out safeMinY, out safeMaxY);

            minX = Math.Max(NPC_MIN_COORD, safeMinX + NPC_MIN_COORD);
            minY = Math.Max(NPC_MIN_COORD, safeMinY + NPC_MIN_COORD);
            maxX = Math.Max(minX + 1, safeMaxX);
            maxY = Math.Max(minY + 1, safeMaxY);
        }

        public static bool IsMap45BossCubikon(string npcName, int mapId)
        {
            return mapId == MAP45_ID && npcName == "-=[ Boss Cubikon ]=-";
        }

        private static bool IsMap45BossCubikon(Npc npc)
        {
            return npc != null && IsMap45BossCubikon(npc.Name, npc.MapId);
        }

        public static void SendMap45BossCubikonMarker(Npc npc)
        {
            if (!IsMap45BossCubikon(npc) || npc.IsDestroying)
                return;

            MapInstance instance = MapManager.GetInstanceByMapId(npc.MapId);
            if (instance == null)
                return;

            instance.BroadcastMessage(PacketComposer.Compose("MM", "SR|" + npc.Id + "|" + npc.LocX + "|" + npc.LocY + "|" + MAP45_BOSS_CUBIKON_MARKER_LIFETIME_TICKS), false);
        }

        public static void HideMap45BossCubikonMarker(Npc npc)
        {
            if (!IsMap45BossCubikon(npc))
                return;

            MapInstance instance = MapManager.GetInstanceByMapId(npc.MapId);
            if (instance == null)
                return;

            instance.BroadcastMessage(PacketComposer.Compose("MM", "HM|" + npc.Id), false);
        }

        private static void ClampMap45BossCubikonPosition(ref int x, ref int y)
        {
            x = Math.Max(MAP45_BOSS_CUBIKON_MIN_X, Math.Min(MAP45_BOSS_CUBIKON_MAX_X, x));
            y = Math.Max(MAP45_BOSS_CUBIKON_MIN_Y, Math.Min(MAP45_BOSS_CUBIKON_MAX_Y, y));
        }

        public static void GetMap45BossCubikonPosition(out int x, out int y)
        {
            for (int attempt = 0; attempt < PORTAL_RANDOM_POSITION_ATTEMPTS; ++attempt)
            {
                int candidateX = NpcAI.RandomPos.Next(MAP45_BOSS_CUBIKON_MIN_X, MAP45_BOSS_CUBIKON_MAX_X + 1);
                int candidateY = NpcAI.RandomPos.Next(MAP45_BOSS_CUBIKON_MIN_Y, MAP45_BOSS_CUBIKON_MAX_Y + 1);

                if (!IsInsidePortalRadius(MAP45_ID, candidateX, candidateY, PORTAL_SPAWN_EXCLUSION_RADIUS))
                {
                    x = candidateX;
                    y = candidateY;
                    return;
                }
            }

            x = (MAP45_BOSS_CUBIKON_MIN_X + MAP45_BOSS_CUBIKON_MAX_X) / 2;
            y = (MAP45_BOSS_CUBIKON_MIN_Y + MAP45_BOSS_CUBIKON_MAX_Y) / 2;
        }

        private static bool IsInsidePortalRadius(int mapId, int x, int y, int radius)
        {
            CList<PortalInfo> portals = PortalManager.GetPortalForMap(mapId);
            if (portals == null)
                return false;

            int radiusSquared = radius * radius;
            foreach (PortalInfo portal in (IEnumerable<PortalInfo>)portals.Keys)
            {
                int dx = x - portal.PosX;
                int dy = y - portal.PosY;
                if ((dx * dx) + (dy * dy) <= radiusSquared)
                    return true;
            }

            return false;
        }

        private static void PushOutOfPortalRadius(int mapId, ref int x, ref int y, int radius, int minX, int maxX, int minY, int maxY)
        {
            CList<PortalInfo> portals = PortalManager.GetPortalForMap(mapId);
            if (portals == null)
                return;

            int paddedRadius = radius + 20;
            int radiusSquared = radius * radius;
            int centerX = (minX + maxX) / 2;
            int centerY = (minY + maxY) / 2;

            foreach (PortalInfo portal in (IEnumerable<PortalInfo>)portals.Keys)
            {
                double dx = x - portal.PosX;
                double dy = y - portal.PosY;
                double distSquared = (dx * dx) + (dy * dy);

                if (distSquared > radiusSquared)
                    continue;

                if (distSquared < 1.0)
                {
                    dx = portal.PosX >= centerX ? -1.0 : 1.0;
                    dy = portal.PosY >= centerY ? -1.0 : 1.0;
                    distSquared = 2.0;
                }

                double dist = Math.Sqrt(distSquared);
                double scale = paddedRadius / dist;

                x = portal.PosX + (int)Math.Round(dx * scale);
                y = portal.PosY + (int)Math.Round(dy * scale);

                x = Math.Max(minX, Math.Min(maxX, x));
                y = Math.Max(minY, Math.Min(maxY, y));
            }
        }

        private static double DistanceSquaredPointToSegment(int pointX, int pointY, int startX, int startY, int endX, int endY)
        {
            double vx = endX - startX;
            double vy = endY - startY;
            double wx = pointX - startX;
            double wy = pointY - startY;
            double lenSquared = (vx * vx) + (vy * vy);

            if (lenSquared <= 0.0001)
            {
                double dx = pointX - startX;
                double dy = pointY - startY;
                return (dx * dx) + (dy * dy);
            }

            double t = ((wx * vx) + (wy * vy)) / lenSquared;
            if (t < 0.0) t = 0.0;
            if (t > 1.0) t = 1.0;

            double closestX = startX + (t * vx);
            double closestY = startY + (t * vy);
            double diffX = pointX - closestX;
            double diffY = pointY - closestY;
            return (diffX * diffX) + (diffY * diffY);
        }

        private static bool TryFindPortalContainingPoint(int mapId, int x, int y, int radius, out PortalInfo blockingPortal)
        {
            blockingPortal = null;

            CList<PortalInfo> portals = PortalManager.GetPortalForMap(mapId);
            if (portals == null)
                return false;

            int radiusSquared = radius * radius;
            foreach (PortalInfo portal in (IEnumerable<PortalInfo>)portals.Keys)
            {
                int dx = x - portal.PosX;
                int dy = y - portal.PosY;
                if ((dx * dx) + (dy * dy) <= radiusSquared)
                {
                    blockingPortal = portal;
                    return true;
                }
            }

            return false;
        }

        private static bool TryFindPortalBlockingPatrolSegment(int mapId, int startX, int startY, int endX, int endY, int radius, out PortalInfo blockingPortal)
        {
            blockingPortal = null;

            CList<PortalInfo> portals = PortalManager.GetPortalForMap(mapId);
            if (portals == null)
                return false;

            int radiusSquared = radius * radius;
            foreach (PortalInfo portal in (IEnumerable<PortalInfo>)portals.Keys)
            {
                double distSquared = DistanceSquaredPointToSegment(portal.PosX, portal.PosY, startX, startY, endX, endY);
                if (distSquared <= radiusSquared)
                {
                    blockingPortal = portal;
                    return true;
                }
            }

            return false;
        }

        private static void RedirectPatrolAwayFromPortal(PortalInfo portal, int currentX, int currentY, ref int x, ref int y, int radius, int minX, int maxX, int minY, int maxY)
        {
            if (portal == null)
                return;

            int centerX = (minX + maxX) / 2;
            int centerY = (minY + maxY) / 2;

            double dx = currentX - portal.PosX;
            double dy = currentY - portal.PosY;
            double distSquared = (dx * dx) + (dy * dy);

            if (distSquared < 1.0)
            {
                dx = currentX >= centerX ? 1.0 : -1.0;
                dy = currentY >= centerY ? 1.0 : -1.0;
                distSquared = (dx * dx) + (dy * dy);
            }

            double dist = Math.Sqrt(distSquared);
            double desiredDistance = radius + PORTAL_MOVEMENT_EXIT_PADDING;

            double startDistanceFromPortal = Math.Sqrt(distSquared);
            if (startDistanceFromPortal >= radius)
                desiredDistance = startDistanceFromPortal + PORTAL_MOVEMENT_REDIRECT_DISTANCE;

            x = portal.PosX + (int)Math.Round((dx / dist) * desiredDistance);
            y = portal.PosY + (int)Math.Round((dy / dist) * desiredDistance);

            x = Math.Max(minX, Math.Min(maxX, x));
            y = Math.Max(minY, Math.Min(maxY, y));
            PushOutOfPortalRadius(portal.MapId, ref x, ref y, radius, minX, maxX, minY, maxY);
        }

        private static void ClampNpcDestinationToMapBounds(int mapId, ref int x, ref int y)
        {
            int minX;
            int maxX;
            int minY;
            int maxY;
            GetNpcMovementBounds(mapId, out minX, out maxX, out minY, out maxY);

            x = Math.Max(minX, Math.Min(maxX, x));
            y = Math.Max(minY, Math.Min(maxY, y));
        }

        private static void NormalizeNpcPatrolDestination(int mapId, int currentX, int currentY, ref int x, ref int y)
        {
            int minX;
            int maxX;
            int minY;
            int maxY;
            GetNpcMovementBounds(mapId, out minX, out maxX, out minY, out maxY);

            currentX = Math.Max(minX, Math.Min(maxX, currentX));
            currentY = Math.Max(minY, Math.Min(maxY, currentY));
            x = Math.Max(minX, Math.Min(maxX, x));
            y = Math.Max(minY, Math.Min(maxY, y));

            PortalInfo blockingPortal;
            if (TryFindPortalContainingPoint(mapId, currentX, currentY, PORTAL_MOVEMENT_EXCLUSION_RADIUS, out blockingPortal))
            {
                RedirectPatrolAwayFromPortal(blockingPortal, currentX, currentY, ref x, ref y, PORTAL_MOVEMENT_EXCLUSION_RADIUS, minX, maxX, minY, maxY);
                return;
            }

            PushOutOfPortalRadius(mapId, ref x, ref y, PORTAL_MOVEMENT_EXCLUSION_RADIUS, minX, maxX, minY, maxY);

            for (int attempt = 0; attempt < 3; ++attempt)
            {
                if (!TryFindPortalBlockingPatrolSegment(mapId, currentX, currentY, x, y, PORTAL_MOVEMENT_EXCLUSION_RADIUS, out blockingPortal))
                    break;

                RedirectPatrolAwayFromPortal(blockingPortal, currentX, currentY, ref x, ref y, PORTAL_MOVEMENT_EXCLUSION_RADIUS, minX, maxX, minY, maxY);
            }
        }

        private static void NormalizeMap45BossCubikonDestination(int currentX, int currentY, ref int x, ref int y)
        {
            currentX = Math.Max(MAP45_BOSS_CUBIKON_MIN_X, Math.Min(MAP45_BOSS_CUBIKON_MAX_X, currentX));
            currentY = Math.Max(MAP45_BOSS_CUBIKON_MIN_Y, Math.Min(MAP45_BOSS_CUBIKON_MAX_Y, currentY));
            ClampMap45BossCubikonPosition(ref x, ref y);

            PortalInfo blockingPortal;
            if (TryFindPortalContainingPoint(MAP45_ID, currentX, currentY, PORTAL_MOVEMENT_EXCLUSION_RADIUS, out blockingPortal))
            {
                RedirectPatrolAwayFromPortal(blockingPortal, currentX, currentY, ref x, ref y, PORTAL_MOVEMENT_EXCLUSION_RADIUS, MAP45_BOSS_CUBIKON_MIN_X, MAP45_BOSS_CUBIKON_MAX_X, MAP45_BOSS_CUBIKON_MIN_Y, MAP45_BOSS_CUBIKON_MAX_Y);
                return;
            }

            PushOutOfPortalRadius(MAP45_ID, ref x, ref y, PORTAL_MOVEMENT_EXCLUSION_RADIUS, MAP45_BOSS_CUBIKON_MIN_X, MAP45_BOSS_CUBIKON_MAX_X, MAP45_BOSS_CUBIKON_MIN_Y, MAP45_BOSS_CUBIKON_MAX_Y);

            for (int attempt = 0; attempt < 3; ++attempt)
            {
                if (!TryFindPortalBlockingPatrolSegment(MAP45_ID, currentX, currentY, x, y, PORTAL_MOVEMENT_EXCLUSION_RADIUS, out blockingPortal))
                    break;

                RedirectPatrolAwayFromPortal(blockingPortal, currentX, currentY, ref x, ref y, PORTAL_MOVEMENT_EXCLUSION_RADIUS, MAP45_BOSS_CUBIKON_MIN_X, MAP45_BOSS_CUBIKON_MAX_X, MAP45_BOSS_CUBIKON_MIN_Y, MAP45_BOSS_CUBIKON_MAX_Y);
            }
        }

        private static void NormalizeMap45BossCubikonDestination(ref int x, ref int y)
        {
            NormalizeMap45BossCubikonDestination(x, y, ref x, ref y);
        }

        private static void NormalizeNpcPatrolDestination(int mapId, ref int x, ref int y)
        {
            NormalizeNpcPatrolDestination(mapId, x, y, ref x, ref y);
        }

        public static void GetRandomNpcPosition(int mapId, out int x, out int y)
        {
            int minX;
            int maxX;
            int minY;
            int maxY;
            GetNpcMovementBounds(mapId, out minX, out maxX, out minY, out maxY);

            for (int attempt = 0; attempt < PORTAL_RANDOM_POSITION_ATTEMPTS; ++attempt)
            {
                int candidateX = NpcAI.RandomPos.Next(minX, maxX);
                int candidateY = NpcAI.RandomPos.Next(minY, maxY);

                if (!IsInsidePortalRadius(mapId, candidateX, candidateY, PORTAL_SPAWN_EXCLUSION_RADIUS))
                {
                    x = candidateX;
                    y = candidateY;
                    return;
                }
            }

            x = NpcAI.RandomPos.Next(minX, maxX);
            y = NpcAI.RandomPos.Next(minY, maxY);
            NormalizeNpcPatrolDestination(mapId, ref x, ref y);
        }

        private static void StopCurrentMovement(Npc npc)
        {
            if (npc == null)
                return;

            bool hadMovement = npc.IsMoving || npc.NewLocX != npc.LocX || npc.NewLocY != npc.LocY;
            int previousX = npc.LocX;
            int previousY = npc.LocY;

            npc.StopMovementAtCurrentPosition();

            if (!hadMovement)
                return;

            int smoothTime = npc.GetVisualStopSmoothingTime(previousX, previousY, npc.LocX, npc.LocY);

            MapInstance inst = MapManager.GetInstanceByMapId(npc.MapId);
            if (inst != null)
            {
                inst.BroadcastMessageInRange(
                    MapShipMovementComposer.Compose(npc.Id, npc.LocX, npc.LocY, smoothTime),
                    npc.Id,
                    false
                );
            }
        }

        public static List<string> GetNpcTemplate(string name)
        {
            if (string.IsNullOrEmpty(name)) return null;
            if (RegisteredNpc != null && RegisteredNpc.ContainsKey(name)) return RegisteredNpc[name];
            return null;
        }

        private static void AddDerivedNpcTemplate(string name, string sourceName, int npcPoints)
        {
            if (NpcAI.RegisteredNpc.ContainsKey(name) || !NpcAI.RegisteredNpc.ContainsKey(sourceName))
                return;

            List<string> template = new List<string>(NpcAI.RegisteredNpc[sourceName]);
            template[0] = name;
            template[20] = npcPoints.ToString();
            NpcAI.RegisteredNpc.Add(name, template);
        }

        public static void PreloadNpcs()
        {
            NpcAI.RegisteredNpc = new CDictionnary<string, List<string>>();

            NpcAI.RegisteredNpc.Add("-=[ Streuner ]=-", new List<string>() { "-=[ Streuner ]=-", "1", "0", "0", "2", "800", "800", "400", "400", "280", "400", "1", "0", "0", "0", "", "0", "0", "0", "0", "1", "18" });
            NpcAI.RegisteredNpc.Add("-=[ Boss Streuner ]=-", new List<string>() { "-=[ Boss Streuner ]=-", "1", "0", "0", "23", "3200", "3200", "1600", "1600", "250", "1600", "4", "0", "0", "0", "", "0", "0", "0", "0", "2", "80" });
            NpcAI.RegisteredNpc.Add("-=[ Lordakia ]=-", new List<string>() { "-=[ Lordakia ]=-", "1", "0", "0", "71", "2000", "2000", "2000", "2000", "320", "800", "2", "0", "0", "0", "", "0", "0", "0", "0", "2", "70" });
            NpcAI.RegisteredNpc.Add("-=[ Boss Lordakia ]=-", new List<string>() { "-=[ Boss Lordakia ]=-", "1", "0", "0", "36", "8000", "8000", "8000", "8000", "320", "3200", "8", "0", "0", "0", "", "0", "0", "0", "0", "4", "313" });
            NpcAI.RegisteredNpc.Add("-=[ Saimon ]=-", new List<string>() { "-=[ Saimon ]=-", "1", "0", "0", "75", "6000", "6000", "3000", "3000", "320", "1600", "4", "0", "0", "0", "", "0", "0", "0", "0", "3", "175" });
            NpcAI.RegisteredNpc.Add("-=[ Boss Saimon ]=-", new List<string>() { "-=[ Boss Saimon ]=-", "1", "0", "0", "37", "24000", "24000", "12000", "12000", "300", "6400", "16", "0", "0", "0", "", "0", "0", "0", "0", "6", "700" });
            NpcAI.RegisteredNpc.Add("-=[ Sibelon ]=-", new List<string>() { "-=[ Sibelon ]=-", "1", "0", "0", "74", "200000", "200000", "200000", "200000", "100", "102400", "32", "0", "0", "0", "", "0", "0", "0", "0", "19", "2625" });
            NpcAI.RegisteredNpc.Add("-=[ Boss Sibelon ]=-", new List<string>() { "-=[ Boss Sibelon ]=-", "1", "0", "0", "46", "800000", "800000", "800000", "800000", "175", "409600", "128", "0", "0", "0", "", "0", "0", "0", "0", "38", "10500" });
            NpcAI.RegisteredNpc.Add("-=[ Kristallin ]=-", new List<string>() { "-=[ Kristallin ]=-", "2", "0", "0", "78", "50000", "50000", "40000", "40000", "320", "12800", "16", "0", "0", "0", "", "0", "0", "0", "0", "6", "1050" });
            NpcAI.RegisteredNpc.Add("-=[ Boss Kristallin ]=-", new List<string>() { "-=[ Boss Kristallin ]=-", "2", "0", "0", "38", "200000", "200000", "160000", "160000", "340", "51200", "64", "0", "0", "0", "", "0", "0", "0", "0", "12", "4200" });
            NpcAI.RegisteredNpc.Add("-=[ Kristallon ]=-", new List<string>() { "-=[ Kristallon ]=-", "2", "0", "0", "79", "400000", "400000", "300000", "300000", "250", "409600", "128", "0", "0", "0", "", "0", "0", "0", "0", "28", "4375" });
            NpcAI.RegisteredNpc.Add("-=[ Boss Kristallon ]=-", new List<string>() { "-=[ Boss Kristallon ]=-", "2", "0", "0", "35", "1600000", "1600000", "1200000", "1200000", "250", "1638400", "512", "0", "0", "0", "", "0", "0", "0", "0", "56", "17500" });
            NpcAI.RegisteredNpc.Add("-=[ Cubikon ]=-", new List<string>() { "-=[ Cubikon ]=-", "2", "0", "0", "80", "1600000", "1600000", "1200000", "1200000", "30", "1638400", "1024", "0", "0", "0", "", "0", "0", "0", "0", "100", "0" });
            NpcAI.RegisteredNpc.Add("-=[ Boss Cubikon ]=-", new List<string>() { "-=[ Boss Cubikon ]=-", "17", "0", "0", "39", "2000000", "2000000", "2000000", "2000000", "20", "6553600", "4096", "0", "0", "0", "", "0", "0", "0", "0", "100", "35000" });

            if (!NpcAI.RegisteredNpc.ContainsKey("-=[ Mordon ]=-")) NpcAI.RegisteredNpc.Add("-=[ Mordon ]=-", new List<string>() { "-=[ Mordon ]=-", "1", "0", "0", "73", "20000", "20000", "10000", "10000", "125", "6400", "8", "0", "0", "0", "", "0", "0", "0", "0", "8", "350" });
            if (!NpcAI.RegisteredNpc.ContainsKey("-=[ Boss Mordon ]=-")) NpcAI.RegisteredNpc.Add("-=[ Boss Mordon ]=-", new List<string>() { "-=[ Boss Mordon ]=-", "1", "0", "0", "31", "80000", "80000", "40000", "40000", "150", "25600", "32", "0", "0", "0", "", "0", "0", "0", "0", "32", "1365" });
            if (!NpcAI.RegisteredNpc.ContainsKey("-=[ Devolarium ]=-")) NpcAI.RegisteredNpc.Add("-=[ Devolarium ]=-", new List<string>() { "-=[ Devolarium ]=-", "1", "0", "0", "72", "100000", "100000", "100000", "100000", "150", "51200", "16", "0", "0", "0", "", "0", "0", "0", "0", "32", "1050" });
            if (!NpcAI.RegisteredNpc.ContainsKey("-=[ Boss Devolarium ]=-")) NpcAI.RegisteredNpc.Add("-=[ Boss Devolarium ]=-", new List<string>() { "-=[ Boss Devolarium ]=-", "1", "0", "0", "26", "400000", "400000", "400000", "400000", "150", "204800", "64", "0", "0", "0", "", "0", "0", "0", "0", "128", "4375" });
            if (!NpcAI.RegisteredNpc.ContainsKey("-=[ Sibelonit ]=-")) NpcAI.RegisteredNpc.Add("-=[ Sibelonit ]=-", new List<string>() { "-=[ Sibelonit ]=-", "1", "0", "0", "76", "40000", "40000", "40000", "40000", "320", "12800", "16", "0", "0", "0", "", "0", "0", "0", "0", "12", "875" });
            if (!NpcAI.RegisteredNpc.ContainsKey("-=[ Boss Sibelonit ]=-")) NpcAI.RegisteredNpc.Add("-=[ Boss Sibelonit ]=-", new List<string>() { "-=[ Boss Sibelonit ]=-", "1", "0", "0", "27", "160000", "160000", "160000", "160000", "300", "102400", "48", "0", "0", "0", "", "0", "0", "0", "0", "48", "3762" });
            if (!NpcAI.RegisteredNpc.ContainsKey("-=[ Lordakium ]=-")) NpcAI.RegisteredNpc.Add("-=[ Lordakium ]=-", new List<string>() { "-=[ Lordakium ]=-", "1", "0", "0", "77", "300000", "300000", "200000", "200000", "230", "204800", "64", "0", "0", "0", "", "0", "0", "0", "0", "20", "3500" });
            if (!NpcAI.RegisteredNpc.ContainsKey("-=[ Boss Lordakium ]=-")) NpcAI.RegisteredNpc.Add("-=[ Boss Lordakium ]=-", new List<string>() { "-=[ Boss Lordakium ]=-", "1", "0", "0", "28", "1200000", "1200000", "800000", "800000", "200", "819200", "256", "0", "0", "0", "", "0", "0", "0", "0", "80", "14000" });
            if (!NpcAI.RegisteredNpc.ContainsKey("-=[ Protegit ]=-")) NpcAI.RegisteredNpc.Add("-=[ Protegit ]=-", new List<string>() { "-=[ Protegit ]=-", "1", "0", "0", "81", "60000", "60000", "50000", "50000", "500", "12800", "16", "0", "0", "0", "", "0", "0", "0", "0", "15", "1225" });
            if (!NpcAI.RegisteredNpc.ContainsKey("-=[ StreuneR ]=-")) NpcAI.RegisteredNpc.Add("-=[ StreuneR ]=-", new List<string>() { "-=[ StreuneR ]=-", "1", "0", "0", "85", "20000", "20000", "10000", "10000", "280", "6400", "8", "0", "0", "0", "", "0", "0", "0", "0", "8", "425" });
            if (!NpcAI.RegisteredNpc.ContainsKey("-=[ Boss StreuneR ]=-")) NpcAI.RegisteredNpc.Add("-=[ Boss StreuneR ]=-", new List<string>() { "-=[ Boss StreuneR ]=-", "1", "0", "0", "34", "80000", "80000", "40000", "40000", "200", "25600", "32", "0", "0", "0", "", "0", "0", "0", "0", "32", "1750" });

            AddDerivedNpcTemplate("-=[ Uber Streuner ]=-", "-=[ Streuner ]=-", 3);
            AddDerivedNpcTemplate("-=[ Uber Lordakia ]=-", "-=[ Lordakia ]=-", 6);
            AddDerivedNpcTemplate("-=[ Uber Saimon ]=-", "-=[ Saimon ]=-", 9);
            AddDerivedNpcTemplate("-=[ Uber Mordon ]=-", "-=[ Mordon ]=-", 24);
            AddDerivedNpcTemplate("-=[ Uber Devolarium ]=-", "-=[ Devolarium ]=-", 96);
            AddDerivedNpcTemplate("-=[ Uber Sibelon ]=-", "-=[ Sibelon ]=-", 57);
            AddDerivedNpcTemplate("-=[ Uber Sibelonit ]=-", "-=[ Sibelonit ]=-", 36);
            AddDerivedNpcTemplate("-=[ Uber Lordakium ]=-", "-=[ Lordakium ]=-", 60);
            AddDerivedNpcTemplate("-=[ Uber Kristallin ]=-", "-=[ Kristallin ]=-", 18);
            AddDerivedNpcTemplate("-=[ Uber Kristallon ]=-", "-=[ Kristallon ]=-", 84);
            AddDerivedNpcTemplate("-=[ Uber StreuneR ]=-", "-=[ StreuneR ]=-", 24);
            AddDerivedNpcTemplate("-=[ Boss Protegit ]=-", "-=[ Protegit ]=-", 45);
        }

        public static void LaunchAI()
        {
            NpcAI.PreloadNpcs();
            NpcAI.mSyncRoot = new object();
            NpcAI.NpcList = new CList<Npc>();
            NpcAI.NpcToRemove = new CList<Npc>();
            NpcAI.NpcToAdd = new CList<Npc>();

            foreach (int map in new int[] { 1, 5, 9 }) NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Streuner ]=-"], map, 21, true);
            foreach (int map in new int[] { 2, 6, 10 })
            {
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Streuner ]=-"], map, 10, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Lordakia ]=-"], map, 14, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Streuner ]=-"], map, 3, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Lordakia ]=-"], map, 3, true);
            }
            foreach (int map in new int[] { 3, 7, 11 })
            {
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Lordakia ]=-"], map, 8, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Saimon ]=-"], map, 11, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Mordon ]=-"], map, 7, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Devolarium ]=-"], map, 7, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Saimon ]=-"], map, 3, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Mordon ]=-"], map, 2, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Devolarium ]=-"], map, 2, true);
            }
            foreach (int map in new int[] { 4, 8, 12 })
            {
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Lordakia ]=-"], map, 6, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Saimon ]=-"], map, 9, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Mordon ]=-"], map, 6, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Sibelon ]=-"], map, 7, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Saimon ]=-"], map, 3, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Sibelon ]=-"], map, 3, true);
            }
            foreach (int map in new int[] { 17, 21, 25 })
            {
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Lordakia ]=-"], map, 6, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Sibelonit ]=-"], map, 15, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Lordakium ]=-"], map, 7, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Sibelonit ]=-"], map, 3, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Lordakium ]=-"], map, 3, true);
            }
            foreach (int map in new int[] { 18, 22, 26 })
            {
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Kristallin ]=-"], map, 13, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Kristallon ]=-"], map, 10, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Cubikon ]=-"], map, 2, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Kristallin ]=-"], map, 3, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Kristallon ]=-"], map, 5, true);
            }
            foreach (int map in new int[] { 19, 23, 27 })
            {
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Kristallin ]=-"], map, 15, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Kristallon ]=-"], map, 7, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Kristallin ]=-"], map, 3, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Kristallon ]=-"], map, 4, true);
            }
            foreach (int map in new int[] { 20, 24, 28 })
            {
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ StreuneR ]=-"], map, 21, true);
                NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss StreuneR ]=-"], map, 3, true);
            }

            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Uber Streuner ]=-"], 29, 10, true);
            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Uber Lordakia ]=-"], 29, 10, true);
            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Uber Saimon ]=-"], 29, 9, true);
            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Uber Mordon ]=-"], 29, 7, true);
            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Uber Devolarium ]=-"], 29, 5, true);
            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Uber Sibelonit ]=-"], 29, 8, true);
            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Uber Sibelon ]=-"], 29, 4, true);
            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Uber Lordakium ]=-"], 29, 4, true);
            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Uber Kristallin ]=-"], 29, 6, true);
            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Uber Kristallon ]=-"], 29, 3, true);
            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Uber StreuneR ]=-"], 29, 4, true);
            NpcAI.CreateNpc(NpcAI.RegisteredNpc["-=[ Boss Cubikon ]=-"], 29, 2, true);

            TitleService.StartRuntime();

            NpcAI.mPerformUpdate = new Timer(new TimerCallback(NpcAI.PerformUpdate), (object)null, 0, AI_TICK_RATE);
            ++TimerManager.TimerRunning;
        }

        public static void CreateNpc(List<string> npc, int mapId, int amount = 1, bool bRespawn = true)
        {
            MapInfo mapInfo = MapInfoLoader.GetMapInfo(mapId);
            if (mapInfo == null)
                return;

            if (!MapManager.InstanceIsLoadedForMap(mapInfo.Id))
                MapManager.TryLoadMapInstance(mapInfo.Id);

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(mapId);
            if (instanceByMapId == null)
                return;

            for (int index = 0; index < amount; ++index)
            {
                int LocX;
                int LocY;
                int randomLocX = 0;
                int randomLocY = 0;
                bool isMap45BossCubikon = IsMap45BossCubikon(npc[0], mapId);

                if (!(npc[2] != "0") || !(npc[3] != "0"))
                {
                    if (isMap45BossCubikon)
                        NpcAI.GetMap45BossCubikonPosition(out randomLocX, out randomLocY);
                    else
                        NpcAI.GetRandomNpcPosition(mapId, out randomLocX, out randomLocY);
                }

                LocX = !(npc[2] != "0") ? randomLocX : Convert.ToInt32(npc[2]);
                LocY = !(npc[3] != "0") ? randomLocY : Convert.ToInt32(npc[3]);
                if (isMap45BossCubikon)
                    NormalizeMap45BossCubikonDestination(ref LocX, ref LocY);
                else
                    NormalizeNpcPatrolDestination(mapId, ref LocX, ref LocY);

                Npc newInstance = NpcManager.CreateNewInstance(
                    npc[0], mapId, LocX, LocY, Convert.ToInt32(npc[4]), Convert.ToInt32(npc[5]), Convert.ToInt32(npc[6]),
                    Convert.ToInt32(npc[7]), Convert.ToInt32(npc[8]), Convert.ToInt32(npc[9]), Convert.ToInt32(npc[10]),
                    Convert.ToInt32(npc[11]), Convert.ToInt32(npc[12]), Convert.ToInt32(npc[13]), Convert.ToInt32(npc[14]),
                    npc[15], Convert.ToInt32(npc[16]), Convert.ToInt32(npc[17]), Convert.ToInt32(npc[18]), Convert.ToInt32(npc[19]),
                    Convert.ToInt32(npc[20]), Convert.ToInt32(npc[21])
                );

                if (newInstance.Name == "-=[ Boss Cubikon ]=-" ||
                    newInstance.Name == "-=[ Invader ]=-" || newInstance.Name == "-=[ Super Invader ]=-" || newInstance.Name == "-=[ Fast Invader ]=-")
                    newInstance.IsBoss = 1;

                newInstance.SharedRewards = 1;
                newInstance.Respawn = bRespawn;

                instanceByMapId.AddNpcToMap(newInstance);
                NpcAI.NpcToAdd.Add(newInstance);
                if (isMap45BossCubikon)
                    SendMap45BossCubikonMarker(newInstance);

                WasOutOfRange[newInstance.Id] = true;
                LastInstantShootTick[newInstance.Id] = 0;
                LastStackResolveTick[newInstance.Id] = 0;


                HpRegenCarry[newInstance.Id] = 0;
                ShieldRegenCarry[newInstance.Id] = 0;
            }
        }

        public static void Respawn(string name, int mapId)
        {
            NpcAI.CreateNpc(NpcAI.RegisteredNpc[name], mapId, 1, true);
        }

        private static void MoveNpc(Npc Npc, double time)
        {
            Vector vector1 = new Vector((double)Npc.LocX, (double)Npc.LocY);
            Vector vector2 = new Vector((double)Npc.NewLocX, (double)Npc.NewLocY);
            Vector vector3 = Vector.Subtract(vector2, vector1);
            double dx3 = vector3.X;
            double dy3 = vector3.Y;
            double distanceSquared = dx3 * dx3 + dy3 * dy3;
            Vector position = ShipMovement.calculatePosition(vector1, vector2, time, (double)Npc.ShipSpeed / 1000.0);
            Vector vector4 = Vector.Subtract(vector1, position);
            double dx4 = vector4.X;
            double dy4 = vector4.Y;
            double traveledSquared = dx4 * dx4 + dy4 * dy4;
            if (traveledSquared > distanceSquared)
            {
                Npc.LocX = Npc.NewLocX;
                Npc.LocY = Npc.NewLocY;
                NpcAI.StopNpcPathFinder(Npc);
                return;
            }
            else
            {
                Npc.LocX = (int)position.X;
                Npc.LocY = (int)position.Y;
            }
        }

        public static void TryMoveNpc(Npc Npc)
        {
            if (Npc.NewLocX != Npc.LocX || Npc.NewLocY != Npc.LocY)
            {
                DateTime now = DateTime.Now;
                TimeSpan timeSpan = now - Npc.LastMove;
                if (timeSpan.TotalMilliseconds >= 0.0 && timeSpan.TotalMilliseconds < 100.0)
                    return;

                int oldLocX = Npc.LocX;
                int oldLocY = Npc.LocY;

                NpcAI.MoveNpc(Npc, timeSpan.TotalMilliseconds);
                Npc.LastMove = now;

                if (Npc.LocX != oldLocX || Npc.LocY != oldLocY)
                {
                    MapInstance instance = MapManager.GetInstanceByMapId(Npc.MapId);
                    if (instance != null)
                        Fight.BroadcastLockIntentForMovedTarget(instance, Npc.Id);
                }
            }
            else if (Npc.PathFinder != null)
            {
                NpcAI.StopNpcPathFinder(Npc);
            }
        }

        public static void PathFinding(object state)
        {
            try
            {
                Npc Npc = (Npc)state;
                if (Npc == null)
                    return;
                if (Npc.IsDestroying)
                {
                    NpcAI.StopNpcPathFinder(Npc);
                    return;
                }
                else
                    NpcAI.TryMoveNpc(Npc);

            }
            catch (Exception ex)
            {
                LogTimerFailure("PathFinding", ex);
            }
        }

        private static int GetInstantShootCooldownMs(Npc npc)
        {
            if (npc == null)
                return Npc.ResolveAttackGuardCooldownMs((string)null);

            return npc.GetAttackGuardCooldownMs();
        }

        private static double GetRangeSquared(int range)
        {
            return (double)range * (double)range;
        }

        private static int GetNpcStopShootRange(Npc npc)
        {
            return Invasion.GetNpcAttackRange(npc, STOP_SHOOT_RANGE);
        }

        private static int GetNpcInstantShootRange(Npc npc)
        {
            return Invasion.GetNpcAttackRange(npc, INSTANT_SHOOT_RANGE);
        }

        private static int GetNpcChaseDistance(Npc npc)
        {
            int stopShootRange = GetNpcStopShootRange(npc);
            int chaseDistance;
            if (stopShootRange > STOP_SHOOT_RANGE)
                chaseDistance = stopShootRange + (CHASE_DISTANCE - STOP_SHOOT_RANGE);
            else
                chaseDistance = CHASE_DISTANCE;

            return Invasion.GetNpcChaseDistance(npc, chaseDistance);
        }

        private static double GetNpcStopShootRangeSquared(Npc npc)
        {
            return GetRangeSquared(GetNpcStopShootRange(npc));
        }

        private static double GetNpcInstantShootRangeSquared(Npc npc)
        {
            return GetRangeSquared(GetNpcInstantShootRange(npc));
        }

        private static double GetNpcChaseDistanceSquared(Npc npc)
        {
            return GetRangeSquared(GetNpcChaseDistance(npc));
        }

        private static double GetNpcAttackWakeRangeSquared(Npc npc)
        {
            return GetRangeSquared(Math.Max(900, GetNpcChaseDistance(npc)));
        }

        private static void TryInstantShoot(Npc npc, Session targetSession, double distanceSquared)
        {
            if (npc == null || targetSession == null || targetSession.CharacterInfo == null)
                return;

            bool outOfRange = (distanceSquared > GetNpcInstantShootRangeSquared(npc));

            bool wasOut;
            if (!WasOutOfRange.TryGetValue(npc.Id, out wasOut))
                wasOut = true;

            WasOutOfRange[npc.Id] = outOfRange;

            if (!wasOut)
                return;

            if (outOfRange)
                return;

            int nowTick = Environment.TickCount;
            int lastTick = 0;
            int instantShootCooldownMs = GetInstantShootCooldownMs(npc);
            LastInstantShootTick.TryGetValue(npc.Id, out lastTick);

            if (lastTick != 0 && unchecked(nowTick - lastTick) < instantShootCooldownMs)
                return;

            LastInstantShootTick[npc.Id] = nowTick;

            npc.StopMovementBeforeAttack();
            npc.Attack(npc);
        }

        private static Dictionary<int, MapInstance> CreateMapInstanceCache()
        {
            return new Dictionary<int, MapInstance>();
        }

        private static MapInstance GetCachedMapInstance(int mapId, Dictionary<int, MapInstance> mapInstanceCache)
        {
            if (mapInstanceCache == null)
                return MapManager.GetInstanceByMapId(mapId);

            MapInstance mapInst;
            if (!mapInstanceCache.TryGetValue(mapId, out mapInst))
            {
                mapInst = MapManager.GetInstanceByMapId(mapId);
                mapInstanceCache[mapId] = mapInst;
            }

            return mapInst;
        }

        private static MapActor[] GetCachedUserActorSnapshot(MapInstance mapInst, Dictionary<int, MapActor[]> userActorSnapshotCache)
        {
            if (mapInst == null)
                return EmptyMapActorArray;

            if (userActorSnapshotCache == null)
                return mapInst.GetUserActorSnapshot();

            MapActor[] snapshot;
            if (!userActorSnapshotCache.TryGetValue(mapInst.MapId, out snapshot))
            {
                snapshot = mapInst.GetUserActorSnapshot();
                userActorSnapshotCache[mapInst.MapId] = snapshot;
            }

            return snapshot;
        }

        private static bool HasRecentNpcCombat(Npc npc, double now)
        {
            if (npc == null)
                return false;

            if (npc.LastNpcCombatActivityTick > 0.0 && now - npc.LastNpcCombatActivityTick < IDLE_MAP_COMBAT_GRACE_SECONDS)
                return true;

            if (npc.LastNpcDamageReceivedTick > 0.0 && now - npc.LastNpcDamageReceivedTick < IDLE_MAP_COMBAT_GRACE_SECONDS)
                return true;

            if (npc.LastNpcDamageDealtTick > 0.0 && now - npc.LastNpcDamageDealtTick < IDLE_MAP_COMBAT_GRACE_SECONDS)
                return true;

            return false;
        }

        private static bool CanSkipNpcAiOnIdleMap(Npc npc, MapInstance mapInst, double now)
        {
            if (npc == null || npc.IsDestroying)
                return false;

            if (GalaxyGateWaveService.IsGateMap(npc.MapId))
                return false;

            if (mapInst != null && !mapInst.Unloaded && mapInst.HasHumanActors)
                return false;

            if (npc.TargetId > 0 || npc.AttackTimer != null || npc.IsAttacking)
                return false;

            if (npc.RewardOwnerId > 0 || npc.EmpInterruptedTargetId > 0 || npc.DespawnAt > 0.0)
                return false;

            if (npc.ParentNpcId != 0)
                return false;

            if (npc.SpawnedMinions != null && npc.SpawnedMinions.Count > 0)
                return false;

            if (HasRecentNpcCombat(npc, now))
                return false;

            return true;
        }

        private static Dictionary<int, Dictionary<int, List<Npc>>> BuildNpcTargetGroups(Dictionary<int, MapInstance> mapInstanceCache, double now)
        {
            Dictionary<int, Dictionary<int, List<Npc>>> groupsByMap = new Dictionary<int, Dictionary<int, List<Npc>>>();

            foreach (Npc npc in (IEnumerable<Npc>)NpcAI.NpcList.Keys)
            {
                if (npc == null || npc.IsDestroying || npc.TargetId <= 0)
                    continue;

                MapInstance mapInst = GetCachedMapInstance(npc.MapId, mapInstanceCache);
                if (CanSkipNpcAiOnIdleMap(npc, mapInst, now))
                    continue;

                AddNpcToTargetGroup(groupsByMap, npc, npc.TargetId);
            }

            return groupsByMap;
        }

        private static void AddNpcToTargetGroup(Dictionary<int, Dictionary<int, List<Npc>>> groupsByMap, Npc npc, int targetId)
        {
            if (groupsByMap == null || npc == null || npc.IsDestroying || targetId <= 0)
                return;

            Dictionary<int, List<Npc>> targetGroups;
            if (!groupsByMap.TryGetValue(npc.MapId, out targetGroups))
            {
                targetGroups = new Dictionary<int, List<Npc>>();
                groupsByMap[npc.MapId] = targetGroups;
            }

            List<Npc> group;
            if (!targetGroups.TryGetValue(targetId, out group))
            {
                group = new List<Npc>();
                targetGroups[targetId] = group;
            }

            for (int i = 0; i < group.Count; i++)
            {
                if (group[i] != null && group[i].Id == npc.Id)
                    return;
            }

            int insertIndex = group.FindIndex(x => x != null && x.Id > npc.Id);
            if (insertIndex < 0)
                group.Add(npc);
            else
                group.Insert(insertIndex, npc);
        }

        private static void RemoveNpcFromTargetGroup(Dictionary<int, Dictionary<int, List<Npc>>> groupsByMap, Npc npc, int targetId)
        {
            if (groupsByMap == null || npc == null || targetId <= 0)
                return;

            Dictionary<int, List<Npc>> targetGroups;
            if (!groupsByMap.TryGetValue(npc.MapId, out targetGroups))
                return;

            List<Npc> group;
            if (!targetGroups.TryGetValue(targetId, out group))
                return;

            for (int i = group.Count - 1; i >= 0; i--)
            {
                if (group[i] == null || group[i].Id == npc.Id)
                    group.RemoveAt(i);
            }

            if (group.Count == 0)
                targetGroups.Remove(targetId);

            if (targetGroups.Count == 0)
                groupsByMap.Remove(npc.MapId);
        }

        private static void RefreshNpcTargetGroup(Dictionary<int, Dictionary<int, List<Npc>>> groupsByMap, Npc npc, int previousTargetId)
        {
            if (groupsByMap == null || npc == null)
                return;

            if (previousTargetId == npc.TargetId)
                return;

            RemoveNpcFromTargetGroup(groupsByMap, npc, previousTargetId);
            AddNpcToTargetGroup(groupsByMap, npc, npc.TargetId);
        }

        private static List<Npc> GetSameTargetNpcGroup(Npc npc, Dictionary<int, Dictionary<int, List<Npc>>> groupsByMap)
        {
            if (npc == null || npc.TargetId <= 0 || groupsByMap == null)
                return null;

            Dictionary<int, List<Npc>> targetGroups;
            if (!groupsByMap.TryGetValue(npc.MapId, out targetGroups))
                return null;

            List<Npc> group;
            if (!targetGroups.TryGetValue(npc.TargetId, out group))
                return null;

            return group;
        }

        private static double GetOrbitAngleOffset(Npc npc, Dictionary<int, Dictionary<int, List<Npc>>> npcTargetGroups)
        {
            if (npc == null || npc.TargetId <= 0)
                return 0.0;

            List<Npc> sameTargetNpcs = GetSameTargetNpcGroup(npc, npcTargetGroups);
            if (sameTargetNpcs == null || sameTargetNpcs.Count <= 1)
                return 0.0;

            int validCount = 0;
            int myIndex = -1;

            for (int i = 0; i < sameTargetNpcs.Count; i++)
            {
                Npc otherNpc = sameTargetNpcs[i];
                if (otherNpc == null || otherNpc.IsDestroying)
                    continue;

                if (otherNpc.MapId != npc.MapId || otherNpc.TargetId != npc.TargetId)
                    continue;

                if (otherNpc.Id == npc.Id)
                    myIndex = validCount;

                ++validCount;
            }

            if (validCount <= 1 || myIndex < 0)
                return 0.0;

            double centeredIndex = myIndex - ((validCount - 1) / 2.0);
            double offsetDeg = centeredIndex * ORBIT_SLOT_ANGLE_STEP_DEG;
            offsetDeg = Math.Max(-ORBIT_SLOT_MAX_OFFSET_DEG, Math.Min(ORBIT_SLOT_MAX_OFFSET_DEG, offsetDeg));

            return offsetDeg * (Math.PI / 180.0);
        }

        private static bool ShouldResolveNpcStackConflict(Npc npc, Dictionary<int, Dictionary<int, List<Npc>>> npcTargetGroups)
        {
            if (npc == null || npc.TargetId <= 0)
                return false;

            List<Npc> sameTargetNpcs = GetSameTargetNpcGroup(npc, npcTargetGroups);
            if (sameTargetNpcs == null || sameTargetNpcs.Count <= 1)
                return false;

            int minDistSquared = NPC_STACK_DISTANCE * NPC_STACK_DISTANCE;
            int resolverId = npc.Id;
            bool hasConflict = false;

            for (int i = 0; i < sameTargetNpcs.Count; i++)
            {
                Npc otherNpc = sameTargetNpcs[i];
                if (otherNpc == null || otherNpc.Id == npc.Id || otherNpc.IsDestroying)
                    continue;

                if (otherNpc.MapId != npc.MapId || otherNpc.TargetId != npc.TargetId)
                    continue;

                int dx = otherNpc.LocX - npc.LocX;
                int dy = otherNpc.LocY - npc.LocY;
                if ((dx * dx) + (dy * dy) < minDistSquared)
                {
                    hasConflict = true;
                    if (otherNpc.Id > resolverId)
                        resolverId = otherNpc.Id;
                }
            }

            if (!hasConflict || resolverId != npc.Id)
                return false;

            int nowTick = Environment.TickCount;
            int lastResolveTick;
            if (!LastStackResolveTick.TryGetValue(npc.Id, out lastResolveTick))
                lastResolveTick = 0;

            if (lastResolveTick != 0 && unchecked(nowTick - lastResolveTick) < STACK_RESOLVE_COOLDOWN_MS)
                return false;

            LastStackResolveTick[npc.Id] = nowTick;
            return true;
        }

        private static double GetStableOrbitAngle(Npc npc, Dictionary<int, Dictionary<int, List<Npc>>> npcTargetGroups)
        {
            if (npc == null)
                return 0.0;

            int normalizedBaseDeg = Math.Abs((npc.TargetId * 37) + (npc.MapId * 17)) % 360;
            double baseAngle = normalizedBaseDeg * (Math.PI / 180.0);
            return baseAngle + GetOrbitAngleOffset(npc, npcTargetGroups);
        }


        private static bool IsValidCubikonTarget(int targetId, int mapId, int cubikonX, int cubikonY)
        {
            if (targetId <= 0)
                return false;

            Session session = SessionManager.GetSessionByCharacterId(targetId);
            if (session == null || session.CharacterInfo == null)
                return false;

            if (session.CharacterInfo.MapId != mapId)
                return false;

            double dx = session.CharacterInfo.LocX - cubikonX;
            double dy = session.CharacterInfo.LocY - cubikonY;
            double distanceSquared = dx * dx + dy * dy;
            double maxDistanceSquared = CUBIKON_PROTEGIT_LEASH_DISTANCE * CUBIKON_PROTEGIT_LEASH_DISTANCE;

            return distanceSquared <= maxDistanceSquared;
        }

        private static int GetCubikonDefenseTarget(Npc cubikon, int mapId, int cubikonX, int cubikonY, int ignoreTargetId)
        {
            if (cubikon == null)
                return 0;

            cubikon.RefreshOwnerClaimState();

            int ownerId = cubikon.RewardOwnerId;
            if (ownerId <= 0)
                return 0;

            Session ownerSession = SessionManager.GetSessionByCharacterId(ownerId);
            if (!IsValidAggroTarget(ownerSession, mapId))
                return 0;

            if (IsHiddenFromNpcAggro(ownerSession) && ignoreTargetId != ownerId)
                return 0;

            double dx = ownerSession.CharacterInfo.LocX - cubikonX;
            double dy = ownerSession.CharacterInfo.LocY - cubikonY;
            double distanceSquared = dx * dx + dy * dy;
            double maxDistanceSquared = CUBIKON_PROTEGIT_LEASH_DISTANCE * CUBIKON_PROTEGIT_LEASH_DISTANCE;

            if (distanceSquared > maxDistanceSquared)
                return 0;

            return ownerId;
        }

        public static bool IsAggressiveNpcName(string npcName)
        {
            return !string.IsNullOrEmpty(npcName) && AggressiveNpcNames.Contains(npcName);
        }

        private static bool IsHiddenFromNpcAggro(Session session)
        {
            if (session == null || session.CharacterInfo == null)
                return false;

            double now = UnixTimestamp.GetCurrent();
            return session.CharacterInfo.Invisible == 1
                || session.CharacterInfo.IsInvisibleForAll
                || Npc.IsSessionUnderNpcEmpLockBreak(session, now);
        }

        public static bool IsValidAggroTarget(Session session, int mapId)
        {
            if (session == null || session.CharacterInfo == null)
                return false;

            if (session.CharacterInfo.MapId != mapId)
                return false;

            if (session.CharacterInfo.Destroy || session.CharacterInfo.ShipHp <= 0)
                return false;

            if (session.CharacterInfo.PeaceZone)
                return false;

            if (session.CharacterInfo.WarningZone)
                return false;

            return true;
        }

        private static int FindAggressiveTarget(Npc npc, MapActor[] userActorSnapshot)
        {
            if (npc == null || userActorSnapshot == null || userActorSnapshot.Length == 0)
                return 0;

            int gateOwnerCharacterId = 0;
            bool gateNpc = GalaxyGateWaveService.IsGateMap(npc.MapId);
            if (gateNpc && !GalaxyGateWaveService.TryGetNpcOwner(npc.Id, out gateOwnerCharacterId))
                return 0;

            int bestTargetId = 0;
            double bestDistanceSquared = double.MaxValue;
            double maxDistanceSquared = GetRangeSquared(Invasion.GetNpcAttackRange(npc, AGGRESSIVE_DETECT_RANGE));

            foreach (MapActor mapActor in userActorSnapshot)
            {
                if (mapActor == null || mapActor.Type != MapActorType.UserCharacter || mapActor.ReferenceSessionId <= 0)
                    continue;

                Session session = SessionManager.GetSessionById(mapActor.ReferenceSessionId);
                if (gateNpc && session != null && session.CharacterId != gateOwnerCharacterId)
                    continue;
                if (!IsValidAggroTarget(session, npc.MapId))
                    continue;

                if (IsHiddenFromNpcAggro(session))
                    continue;

                double dx = session.CharacterInfo.LocX - npc.LocX;
                double dy = session.CharacterInfo.LocY - npc.LocY;
                double distanceSquared = dx * dx + dy * dy;

                if (distanceSquared > maxDistanceSquared)
                    continue;

                if (distanceSquared < bestDistanceSquared)
                {
                    bestDistanceSquared = distanceSquared;
                    bestTargetId = session.CharacterId;
                }
            }

            return bestTargetId;
        }

        private static void PerformUpdate(object state)
        {
            long perfStart = PerformanceProfiler.Start();
            try
            {
                Random random = NpcAI.RandomPos;

                lock (NpcAI.mSyncRoot)
                {
                    Dictionary<int, MapInstance> mapInstanceCache = CreateMapInstanceCache();
                    Dictionary<int, MapActor[]> userActorSnapshotCache = new Dictionary<int, MapActor[]>();
                    double now = UnixTimestamp.GetCurrent();
                    Dictionary<int, Dictionary<int, List<Npc>>> npcTargetGroups = BuildNpcTargetGroups(mapInstanceCache, now);

                    foreach (Npc item_1 in (IEnumerable<Npc>)NpcAI.NpcList.Keys)
                    {
                        if (item_1 == null || item_1.Name == "Spaceball")
                            continue;

                        if (item_1.IsDestroying)
                            continue;

                        int previousTargetId = item_1.TargetId;
                        MapInstance currentMapInst = GetCachedMapInstance(item_1.MapId, mapInstanceCache);

                        if (CanSkipNpcAiOnIdleMap(item_1, currentMapInst, now))
                        {
                            NpcAI.SleepNpcMovement(item_1);
                            continue;
                        }

                        bool isCubikonMinion = (item_1.ParentNpcId != 0 && item_1.ShipId == 81);
                        Npc parentNpc = null;
                        int parentX = 0;
                        int parentY = 0;

                        if (isCubikonMinion)
                        {
                            if (currentMapInst != null)
                            {
                                MapActor parentActor = currentMapInst.GetActorByReferenceId(item_1.ParentNpcId, MapActorType.AiBot);
                                if (parentActor != null && parentActor.ReferenceObject is Npc)
                                {
                                    parentNpc = (Npc)parentActor.ReferenceObject;
                                    parentX = parentNpc.LocX;
                                    parentY = parentNpc.LocY;
                                }
                            }

                            if (parentNpc == null || parentNpc.IsDestroying || parentNpc.ShipHp <= 0)
                            {
                                if (item_1.DespawnAt <= 0.0)
                                    item_1.DespawnAt = now + 3.0;

                                item_1.StopNpcAttack();
                            }
                            else
                            {
                                parentNpc.RefreshOwnerClaimState();

                                const double CUBIKON_IDLE_SECONDS = 10.0;
                                if (now - parentNpc.LastAttackReceived >= CUBIKON_IDLE_SECONDS)
                                {
                                    if (item_1.DespawnAt <= 0.0)
                                        item_1.DespawnAt = now + 2.0;

                                    item_1.StopNpcAttack();
                                }
                                else
                                {
                                    int desiredTargetId = GetCubikonDefenseTarget(parentNpc, item_1.MapId, parentX, parentY, item_1.TargetId);
                                    const double RETARGET_COOLDOWN_SECONDS = 1.0;

                                    if (desiredTargetId <= 0)
                                    {
                                        if (item_1.TargetId != 0 || item_1.IsAttacking)
                                            item_1.StopNpcAttack();
                                    }
                                    else if (item_1.TargetId != desiredTargetId || !IsValidCubikonTarget(item_1.TargetId, item_1.MapId, parentX, parentY))
                                    {
                                        if (now - item_1.MinionLastRetargetTick >= RETARGET_COOLDOWN_SECONDS)
                                        {
                                            item_1.MinionLastRetargetTick = now;
                                            item_1.LockTarget(desiredTargetId);
                                        }
                                    }
                                }
                            }
                        }

                        if (item_1.DespawnAt > 0.0 && now >= item_1.DespawnAt)
                        {
                            MapInstance despawnMap = GetCachedMapInstance(item_1.MapId, mapInstanceCache);
                            if (despawnMap != null)
                            {
                                MapActor despawnActor = despawnMap.GetActorByReferenceId(item_1.Id, MapActorType.AiBot);
                                if (despawnActor != null)
                                    despawnMap.KickNpc(despawnActor.Id);

                                if (item_1.ParentNpcId != 0)
                                {
                                    MapActor parentActor = despawnMap.GetActorByReferenceId(item_1.ParentNpcId, MapActorType.AiBot);
                                    if (parentActor != null && parentActor.ReferenceObject is Npc)
                                    {
                                        Npc cubikon = (Npc)parentActor.ReferenceObject;
                                        byte ignored;
                                        cubikon.SpawnedMinions.TryRemove(item_1.Id, out ignored);
                                    }
                                }
                            }

                            NpcAI.NpcToRemove.Add(item_1);
                            continue;
                        }

                        int local_2 = item_1.LocX;
                        int local_3 = item_1.LocY;
                        bool shouldMove = false;
                        bool isAggressiveNpc = IsAggressiveNpcName(item_1.Name);

                        if (!isCubikonMinion && item_1.ParentNpcId == 0)
                            item_1.RefreshOwnerClaimState();

                        if (!isCubikonMinion && isAggressiveNpc)
                        {
                            int ownerTargetId = item_1.RewardOwnerId;
                            Session ownerTargetSession = ownerTargetId > 0 ? SessionManager.GetSessionByCharacterId(ownerTargetId) : null;
                            bool ownerTargetHidden = IsHiddenFromNpcAggro(ownerTargetSession);

                            if (ownerTargetId > 0 && IsValidAggroTarget(ownerTargetSession, item_1.MapId) && (!ownerTargetHidden || item_1.TargetId == ownerTargetId))
                            {
                                if (item_1.TargetId != ownerTargetId || item_1.AttackTimer == null)
                                    item_1.LockTarget(ownerTargetId);
                            }
                            else if (item_1.TargetId == 0)
                            {
                                int aggressiveTargetId = FindAggressiveTarget(item_1, GetCachedUserActorSnapshot(currentMapInst, userActorSnapshotCache));
                                if (aggressiveTargetId > 0)
                                    item_1.TargetId = aggressiveTargetId;
                            }
                        }

                        if (item_1.TargetId == 0 && item_1.EmpInterruptedTargetId > 0)
                        {
                            int empTargetId = item_1.EmpInterruptedTargetId;
                            if (!item_1.IsEmpLockBlockedFor(empTargetId, now))
                            {
                                Session empTargetSession = SessionManager.GetSessionByCharacterId(empTargetId);
                                if (IsValidAggroTarget(empTargetSession, item_1.MapId)
                                    && !IsHiddenFromNpcAggro(empTargetSession)
                                    && GalaxyGateWaveService.CanNpcAttackSession(item_1, empTargetSession))
                                {
                                    item_1.ClearEmpInterruptedTarget();
                                    item_1.LockTarget(empTargetId);
                                }
                                else
                                {
                                    item_1.ClearEmpInterruptedTarget();
                                }
                            }
                        }

                        RefreshNpcTargetGroup(npcTargetGroups, item_1, previousTargetId);
                        previousTargetId = item_1.TargetId;

                        if (item_1.TargetId != 0)
                        {
                            Session local_4 = SessionManager.GetSessionByCharacterId(item_1.TargetId);
                            bool droppedForCombatIdle = false;

                            if (GalaxyGateWaveService.IsGateMap(item_1.MapId))
                            {
                                int gateOwnerCharacterId;
                                if (!GalaxyGateWaveService.TryGetNpcOwner(item_1.Id, out gateOwnerCharacterId))
                                {
                                    item_1.StopNpcAttack();
                                    StopCurrentMovement(item_1);
                                    NpcToRemove.Add(item_1);
                                    continue;
                                }

                                if (item_1.TargetId != gateOwnerCharacterId)
                                {
                                    item_1.StopNpcAttack();
                                    StopCurrentMovement(item_1);
                                    Session ownerSession = SessionManager.GetSessionByCharacterId(gateOwnerCharacterId);
                                    if (ownerSession != null && ownerSession.CharacterInfo != null && ownerSession.CharacterInfo.MapId == item_1.MapId)
                                    {
                                        item_1.SetTargetWithoutAttackTimer(gateOwnerCharacterId);
                                        local_4 = ownerSession;
                                    }
                                    else
                                    {
                                        local_4 = null;
                                    }
                                }
                            }

                            if (!IsValidAggroTarget(local_4, item_1.MapId))
                            {
                                item_1.StopNpcAttack();
                                StopCurrentMovement(item_1);
                                local_4 = null;
                            }

                            if (local_4 != null && item_1.ShouldDropNpcTargetForCombatIdle(now))
                            {
                                item_1.StopNpcAttack();
                                StopCurrentMovement(item_1);
                                WasOutOfRange[item_1.Id] = true;

                                if (IsMap45BossCubikon(item_1))
                                {
                                    GetMap45BossCubikonPosition(out local_2, out local_3);
                                    NormalizeMap45BossCubikonDestination(item_1.LocX, item_1.LocY, ref local_2, ref local_3);
                                }
                                else
                                {
                                    GetRandomNpcPosition(item_1.MapId, out local_2, out local_3);
                                    NormalizeNpcPatrolDestination(item_1.MapId, item_1.LocX, item_1.LocY, ref local_2, ref local_3);
                                }
                                shouldMove = true;
                                droppedForCombatIdle = true;
                                local_4 = null;
                            }

                            if (local_4 != null && local_4.CharacterInfo != null)
                            {
                                double diffX = item_1.LocX - local_4.CharacterInfo.LocX;
                                double diffY = item_1.LocY - local_4.CharacterInfo.LocY;
                                double distSquared = (diffX * diffX) + (diffY * diffY);
                                double npcAttackWakeRangeSquared = GetNpcAttackWakeRangeSquared(item_1);
                                double npcChaseDistanceSquared = GetNpcChaseDistanceSquared(item_1);
                                double npcStopShootRangeSquared = GetNpcStopShootRangeSquared(item_1);

                                TryInstantShoot(item_1, local_4, distSquared);

                                if (distSquared < npcAttackWakeRangeSquared)
                                {
                                    if (item_1.AttackTimer == null)
                                        item_1.LockTarget(item_1.TargetId);

                                    item_1.IsAttacking = true;
                                }
                                else
                                {
                                    item_1.IsAttacking = false;
                                }


                                if (distSquared > npcChaseDistanceSquared)
                                {
                                    local_2 = local_4.CharacterInfo.LocX + GetStableNpcOffset(item_1, 11, -50, 50);
                                    local_3 = local_4.CharacterInfo.LocY + GetStableNpcOffset(item_1, 17, -50, 50);
                                    shouldMove = true;
                                }
                                else if (distSquared <= npcStopShootRangeSquared)
                                {
                                    if (ShouldResolveNpcStackConflict(item_1, npcTargetGroups))
                                    {
                                        double angle = GetStableOrbitAngle(item_1, npcTargetGroups);
                                        local_2 = local_4.CharacterInfo.LocX + (int)(Math.Cos(angle) * ORBIT_RADIUS);
                                        local_3 = local_4.CharacterInfo.LocY + (int)(Math.Sin(angle) * ORBIT_RADIUS);
                                        shouldMove = true;
                                    }
                                    else if (item_1.IsMoving)
                                    {
                                        StopCurrentMovement(item_1);
                                    }
                                    else
                                    {
                                        shouldMove = false;
                                    }
                                }
                                else
                                {
                                    double angle = Math.Atan2(diffY, diffX) + GetOrbitAngleOffset(item_1, npcTargetGroups);
                                    int currentOrbitRadius = ORBIT_RADIUS + GetStableNpcOffset(item_1, 23, -30, 30);

                                    local_2 = local_4.CharacterInfo.LocX + (int)(Math.Cos(angle) * currentOrbitRadius);
                                    local_3 = local_4.CharacterInfo.LocY + (int)(Math.Sin(angle) * currentOrbitRadius);
                                    shouldMove = true;
                                }
                            }
                            else if (!droppedForCombatIdle)
                            {
                                item_1.StopNpcAttack();
                                StopCurrentMovement(item_1);
                                WasOutOfRange[item_1.Id] = true;
                            }
                        }
                        else
                        {
                            if (isCubikonMinion && parentNpc == null)
                            {
                                local_2 = item_1.LocX;
                                local_3 = item_1.LocY;
                                shouldMove = false;
                            }
                            else if (!item_1.IsMoving)
                            {
                                if (isCubikonMinion && parentNpc != null)
                                {
                                    local_2 = parentX + random.Next(-200, 200);
                                    local_3 = parentY + random.Next(-200, 200);
                                }
                                else if (IsMap45BossCubikon(item_1))
                                {
                                    GetMap45BossCubikonPosition(out local_2, out local_3);
                                }
                                else
                                {
                                    GetRandomNpcPosition(item_1.MapId, out local_2, out local_3);
                                }

                                shouldMove = true;
                            }
                            else
                            {
                                int correctedX = item_1.NewLocX;
                                int correctedY = item_1.NewLocY;
                                NormalizeNpcPatrolDestination(item_1.MapId, item_1.LocX, item_1.LocY, ref correctedX, ref correctedY);

                                if (correctedX != item_1.NewLocX || correctedY != item_1.NewLocY)
                                {
                                    local_2 = correctedX;
                                    local_3 = correctedY;
                                    shouldMove = true;
                                }
                            }

                            WasOutOfRange[item_1.Id] = true;
                        }

                        if (isCubikonMinion && parentNpc != null)
                        {
                            double dxP = local_2 - parentX;
                            double dyP = local_3 - parentY;
                            double distPSquared = (dxP * dxP) + (dyP * dyP);

                            if (distPSquared > CUBIKON_PROTEGIT_LEASH_DISTANCE_SQUARED)
                            {
                                double distP = Math.Sqrt(distPSquared);
                                double ratio = CUBIKON_PROTEGIT_LEASH_DISTANCE / distP;
                                local_2 = parentX + (int)(dxP * ratio);
                                local_3 = parentY + (int)(dyP * ratio);
                                shouldMove = true;
                            }
                        }

                        if (item_1.TargetId != 0)
                            ClampNpcDestinationToMapBounds(item_1.MapId, ref local_2, ref local_3);
                        else if (IsMap45BossCubikon(item_1))
                            NormalizeMap45BossCubikonDestination(item_1.LocX, item_1.LocY, ref local_2, ref local_3);
                        else
                            NormalizeNpcPatrolDestination(item_1.MapId, item_1.LocX, item_1.LocY, ref local_2, ref local_3);

                        if (shouldMove)
                        {
                            double destDx = (double)(item_1.NewLocX - local_2);
                            double destDy = (double)(item_1.NewLocY - local_3);
                            double distToNewDestSquared = destDx * destDx + destDy * destDy;

                            if (!item_1.IsMoving || distToNewDestSquared > 40000.0)
                            {
                                if (item_1.IsMoving)
                                    item_1.AdvanceMovementToCurrentPosition();

                                item_1.NewLocX = local_2;
                                item_1.NewLocY = local_3;

                                NpcAI.StopNpcPathFinder(item_1);

                                item_1.LastMove = DateTime.Now;

                                NpcAI.TryMoveNpc(item_1);

                                double travelDx = (double)(item_1.LocX - item_1.NewLocX);
                                double travelDy = (double)(item_1.LocY - item_1.NewLocY);
                                double travelTime =
                                    Math.Sqrt(travelDx * travelDx + travelDy * travelDy) / (double)item_1.ShipSpeed * 1000.0;

                                item_1.IsMoving = true;

                                MapInstance mapInst = GetCachedMapInstance(item_1.MapId, mapInstanceCache);
                                if (mapInst != null)
                                    mapInst.BroadcastMessageInRange(
                                        MapShipMovementComposer.Compose(item_1.Id, item_1.NewLocX, item_1.NewLocY, travelTime),
                                        item_1.Id,
                                        false
                                    );

                                if (item_1.PathFinder == null)
                                    item_1.PathFinder = new Timer(new TimerCallback(NpcAI.PathFinding), (object)item_1, NPC_MOVEMENT_TICK_RATE, NPC_MOVEMENT_TICK_RATE);
                            }
                        }

                        if (IsMap45BossCubikon(item_1))
                            SendMap45BossCubikonMarker(item_1);

                        if (UnixTimestamp.GetCurrent() - item_1.LastAttackReceived >= REGEN_DELAY_SECONDS)
                        {
                            double tickScale = AI_TICK_RATE / 1000.0;
                            bool needsUpdate = false;

                            MapInstance inst = GetCachedMapInstance(item_1.MapId, mapInstanceCache);
                            if (inst != null)
                            {
                                if (HP_REGEN_PERCENT_PER_SECOND > 0 && item_1.ShipHp < item_1.ShipMaxHp)
                                {
                                    double carry = 0;
                                    HpRegenCarry.TryGetValue(item_1.Id, out carry);

                                    double regen = (item_1.ShipMaxHp * HP_REGEN_PERCENT_PER_SECOND * tickScale) + carry;
                                    int add = (int)regen;

                                    HpRegenCarry[item_1.Id] = regen - add;

                                    if (add > 0)
                                    {
                                        item_1.ShipHp = Math.Min(item_1.ShipMaxHp, item_1.ShipHp + add);
                                        needsUpdate = true;
                                    }
                                }
                                else
                                {
                                    HpRegenCarry[item_1.Id] = 0;
                                }

                                if (SHIELD_REGEN_PERCENT_PER_SECOND > 0 && item_1.ShipShield < item_1.ShipMaxShield)
                                {
                                    double carry = 0;
                                    ShieldRegenCarry.TryGetValue(item_1.Id, out carry);

                                    double regen = (item_1.ShipMaxShield * SHIELD_REGEN_PERCENT_PER_SECOND * tickScale) + carry;
                                    int add = (int)regen;

                                    ShieldRegenCarry[item_1.Id] = regen - add;

                                    if (add > 0)
                                    {
                                        item_1.ShipShield = Math.Min(item_1.ShipMaxShield, item_1.ShipShield + add);
                                        needsUpdate = true;
                                    }
                                }
                                else
                                {
                                    ShieldRegenCarry[item_1.Id] = 0;
                                }

                                if (needsUpdate)
                                {
                                    foreach (MapActor actor in inst.GetUserActorSnapshot())
                                    {
                                        if (actor.Type == MapActorType.UserCharacter)
                                        {
                                            Session s = SessionManager.GetSessionById(actor.ReferenceSessionId);
                                            if (s != null && s.CharacterInfo != null && s.CharacterInfo.SelectedPlayer == item_1.Id)
                                                s.SendData(PacketComposer.Compose("Y", "0|" + (object)item_1.Id + "|L|" + (object)item_1.ShipHp + "|" + (object)item_1.ShipShield + "|" + (object)0));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                long perfCleanupStart = PerformanceProfiler.Start();
                foreach (Npc key in (IEnumerable<Npc>)NpcAI.NpcToRemove.Keys)
                {
                    if (key != null)
                    {
                        NpcAI.StopNpcPathFinder(key);
                        NpcAI.NpcList.Remove(key);
                        WasOutOfRange.Remove(key.Id);
                        LastInstantShootTick.Remove(key.Id);
                        LastStackResolveTick.Remove(key.Id);
                        HpRegenCarry.Remove(key.Id);
                        ShieldRegenCarry.Remove(key.Id);
                    }
                }
                NpcAI.NpcToRemove.Clear();

                foreach (Npc key in (IEnumerable<Npc>)NpcAI.NpcToAdd.Keys)
                {
                    if (key != null)
                    {
                        NpcAI.NpcList.Add(key);
                        if (!WasOutOfRange.ContainsKey(key.Id)) WasOutOfRange[key.Id] = true;
                        if (!LastInstantShootTick.ContainsKey(key.Id)) LastInstantShootTick[key.Id] = 0;
                        if (!LastStackResolveTick.ContainsKey(key.Id)) LastStackResolveTick[key.Id] = 0;

                        if (!HpRegenCarry.ContainsKey(key.Id)) HpRegenCarry[key.Id] = 0;
                        if (!ShieldRegenCarry.ContainsKey(key.Id)) ShieldRegenCarry[key.Id] = 0;
                    }
                }
                NpcAI.NpcToAdd.Clear();
                PerformanceProfiler.LogCleanup("NpcAI.AddRemove", perfCleanupStart);

            }
            catch (Exception ex)
            {
                LogTimerFailure("PerformUpdate", ex);
            }
            finally
            {
                PerformanceProfiler.LogTimer("NpcAI.PerformUpdate", 0, perfStart);
            }
        }
    }
}
