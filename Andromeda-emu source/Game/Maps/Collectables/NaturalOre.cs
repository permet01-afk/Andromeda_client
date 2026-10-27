using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Quests;
using OrbitReborn_Emulator.Game.Portal;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Util;
using System;

namespace OrbitReborn_Emulator.Game.Maps.Collectables
{
    // Authentic ore types/one-unit pickups, using the existing c/collect protocol.
    // Density 12/species/map and 15-second respawn are explicit Andromeda
    // operational defaults, not a claim about undocumented Flash server values.
    internal sealed class NaturalOre : Collectable
    {
        internal const int DensityPerSpecies = 12;
        internal const int RespawnMilliseconds = 15000;
        private const int FieldRadiusX = 600;
        private const int FieldRadiusY = 400;
        private const int PortalClearance = 1400;
        private const int HomeCompoundClearance = 4000;
        // Numeric fields are map-specific Andromeda adaptations, not original
        // server coordinates. Rows: map id; pairs: Prometium, Endurium, Terbium.
        // A zero pair means that this species does not naturally occur here.
        private static readonly int[][] FieldCentres = {
            new[] { 0, 0, 0, 0, 0, 0 },
            new[] { 6500, 7200, 12000, 7800, 0, 0 },       // 1-1
            new[] { 6800, 3000, 2800, 6500, 6800, 6200 },  // 1-2
            new[] { 0, 0, 9000, 3000, 14500, 8500 },      // 1-3
            new[] { 0, 0, 7800, 9000, 13000, 11100 },      // 1-4
            new[] { 9500, 3500, 6000, 6500, 0, 0 },       // 2-1
            new[] { 6800, 4300, 2800, 6100, 4000, 8000 },  // 2-2
            new[] { 0, 0, 11000, 3200, 12500, 8000 },      // 2-3
            new[] { 0, 0, 8000, 5000, 14500, 9800 },       // 2-4
            new[] { 7000, 6800, 11500, 4200, 0, 0 },       // 3-1
            new[] { 5200, 3200, 2800, 7500, 6000, 6800 },  // 3-2
            new[] { 0, 0, 6500, 8200, 13000, 4800 },       // 3-3
            new[] { 0, 0, 7300, 7500, 14000, 10300 }       // 3-4
        };
        private readonly int resourceId;
        private int spawnIndex;
        private long respawnAt;
        private bool available = true;

        private NaturalOre(int id, int resourceId, int x, int y, int mapId)
            : base(id, resourceId + 29, x, y, mapId) { this.resourceId = resourceId; }

        private static bool OutsideCircle(int x, int y, int cx, int cy, int radius)
        {
            long dx = (long)x - cx, dy = (long)y - cy;
            return dx * dx + dy * dy >= (long)radius * radius;
        }

        private bool IsSafeSpawnPosition(int x, int y)
        {
            int safeMinX, safeMaxX, safeMinY, safeMaxY;
            ShipMovement.GetRadiationSafeBounds(this.MapId, out safeMinX, out safeMaxX, out safeMinY, out safeMaxY);
            if (x < safeMinX + 1000 || x >= safeMaxX - 1000 || y < safeMinY + 1000 || y >= safeMaxY - 1000) return false;
            if (PortalManager.Portals == null) return false;
            foreach (var portal in PortalManager.Portals.Keys)
            {
                if (portal != null && portal.MapId == this.MapId && !OutsideCircle(x, y, portal.PosX, portal.PosY, PortalClearance)) return false;
            }
            // Reserve the distinct home station/GG compound without querying SQL
            // or reproducing the per-player Galaxy Gate placement algorithm.
            // 4000 covers the four existing GG placements plus the ore clearance.
            if (this.MapId == 1 && !OutsideCircle(x, y, 2000, 1200, HomeCompoundClearance)) return false;
            if (this.MapId == 5 && !OutsideCircle(x, y, 19000, 1200, HomeCompoundClearance)) return false;
            if (this.MapId == 9 && !OutsideCircle(x, y, 19200, 11500, HomeCompoundClearance)) return false;
            return true;
        }

        private bool MoveToSpawnPosition(Random random)
        {
            if (this.MapId < 1 || this.MapId >= FieldCentres.Length || resourceId < 1 || resourceId > 3) return false;
            int index = (resourceId - 1) * 2;
            int centreX = FieldCentres[this.MapId][index], centreY = FieldCentres[this.MapId][index + 1];
            if (centreX == 0 || centreY == 0) return false;
            // Stable 4x3 strata keep twelve objects grouped without overlapping.
            // The same index stays in its stratum after every respawn. Trimming
            // each cell by 20% leaves spacing for the native 48px ore animations.
            int cell = spawnIndex % DensityPerSpecies, col = cell % 4, row = cell / 4;
            int minX = centreX - FieldRadiusX + col * (2 * FieldRadiusX) / 4;
            int maxX = centreX - FieldRadiusX + (col + 1) * (2 * FieldRadiusX) / 4;
            int minY = centreY - FieldRadiusY + row * (2 * FieldRadiusY) / 3;
            int maxY = centreY - FieldRadiusY + (row + 1) * (2 * FieldRadiusY) / 3;
            int paddingX = (maxX - minX) / 5, paddingY = (maxY - minY) / 5;
            for (int attempt = 0; attempt < 8; attempt++)
            {
                int x = random.Next(minX + paddingX, maxX - paddingX);
                int y = random.Next(minY + paddingY, maxY - paddingY);
                if (!IsSafeSpawnPosition(x, y)) continue;
                this.X = x; this.Y = y; return true;
            }
            // A future portal/configuration change must not scatter an ore out
            // of its field or emit it at an unsafe position. Retry this slot later.
            return false;
        }

        private bool CanCollect(Session user)
        {
            if (user == null || user.CharacterInfo == null || !user.GameplayReady || user.IsChat || user.Stopped || user.StoppedPlayer
                || !user.MapJoined || !user.MapAuthed || user.CurrentMapId != this.MapId) return false;
            var character = user.CharacterInfo;
            return character.MapId == this.MapId && !character.Destroy && !character.Disconnected && !character.DeadCommitted && character.ShipHp > 0;
        }

        public override void Collect(Session user)
        {
            if (!CanCollect(user) || !QuestObjectiveProgress.HistoricalEnabled()) return;
            ShipMovement.AdvanceMovingPlayerToCurrentPosition(user);
            var map = MapManager.GetInstanceByMapId(this.MapId);
            lock (this)
            {
                if (!available || this.Collecting || map == null || !CanCollect(user) ||
                    !map.Info.Collectables.ContainsKey(this.Id) ||
                    !DistanceUtil.IsWithinRangeSquared(this.X, this.Y, user.CharacterInfo.LocX, user.CharacterInfo.LocY, 300)) return;
                this.Collecting = true;
                try
                {
                    if (!user.CharacterInfo.TryCollectHistoricalNaturalOre(resourceId))
                    { user.SendData(PacketComposer.Compose("y", "BTB")); return; }
                    available = false;
                    respawnAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + RespawnMilliseconds;
                    map.Info.Collectables.Remove(this.Id);
                    map.BroadcastMessage(PacketComposer.Compose("2", this.Id.ToString()), false);
                }
                finally { this.Collecting = false; }
            }
            user.SendData(user.CharacterInfo.GetCargoMessage());
            user.SendData(PacketComposer.Compose("e", resourceId.ToString()));
            QuestOreProgress.AddOreProgress(user.CharacterId, resourceId, 1);
            QuestObjectiveProgress.AddHistoricalOre(user, resourceId, 1, true);
        }

        private void Respawn(MapInstance map, long now)
        {
            lock (this)
            {
                if (available || respawnAt > now) return;
                if (!this.MoveToSpawnPosition(RandomProvider.Current))
                { respawnAt = now + RespawnMilliseconds; return; }
                available = true;
                map.Info.Collectables.Add(this.Id, this);
                map.BroadcastMessage(PacketComposer.Compose("c", this.Id + "|" + this.Type + "|" + this.X + "|" + this.Y), false);
            }
        }

        internal static void TickWorld(long now)
        {
            if (MapManager.MapInstances == null) return;
            foreach (MapInstance map in MapManager.MapInstances.Values)
            {
                if (map == null || map.HumanActorCount == 0 || map.MapId < 1 || map.MapId > 12) continue;
                lock (map.Info.NaturalOres)
                {
                    if (!map.Info.NaturalOresInitialized)
                    {
                        int sector = (map.MapId - 1) % 4 + 1;
                        // Historical lower-map species (official ore FAQ, 2013):
                        // X-1 Prometium/Endurium, X-2 all three, X-3/X-4 Endurium/Terbium.
                        // Density and respawn remain explicit Andromeda adaptations.
                        int[] species = sector == 1 ? new[] { 1, 2 } : sector == 2 ? new[] { 1, 2, 3 } : new[] { 2, 3 };
                        int sequence = 0;
                        foreach (int ore in species)
                        for (int i = 0; i < DensityPerSpecies; i++)
                        {
                            // High reserved IDs cannot collide with legacy Session.Id+100 cargo.
                            var item = new NaturalOre(2000000000 + sequence++, ore, 0, 0, map.MapId) { spawnIndex = i };
                            map.Info.NaturalOres.Add(item);
                            if (item.MoveToSpawnPosition(RandomProvider.Current))
                            {
                                map.Info.Collectables.Add(item.Id, item);
                                map.BroadcastMessage(PacketComposer.Compose("c", item.Id + "|" + item.Type + "|" + item.X + "|" + item.Y), false);
                            }
                            else { item.available = false; item.respawnAt = now + RespawnMilliseconds; }
                        }
                        map.Info.NaturalOresInitialized = true;
                    }
                    foreach (var item in map.Info.NaturalOres) item.Respawn(map, now);
                }
            }
        }
    }
}
