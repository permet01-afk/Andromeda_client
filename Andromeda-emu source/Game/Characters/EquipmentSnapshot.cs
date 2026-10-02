using System;
using System.Data;

namespace OrbitReborn_Emulator.Game.Characters
{
    // Immutable equipment facts for one configuration. Legacy slot tables are not inputs.
    public sealed class EquipmentSnapshot
    {
        public static readonly EquipmentSnapshot Empty = new EquipmentSnapshot(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

        public int ShipLaserCapacity { get; private set; }
        public int ShipLaserCount { get; private set; }
        public int ShipLF1Count { get; private set; }
        public int ShipMP1Count { get; private set; }
        public int ShipLF2Count { get; private set; }
        public int ShipLF3Count { get; private set; }
        public int DroneLaserCount { get; private set; }
        public int DroneLF1Count { get; private set; }
        public int DroneMP1Count { get; private set; }
        public int DroneLF2Count { get; private set; }
        public int DroneLF3Count { get; private set; }
        public int TotalLaserCount { get { return ShipLaserCount + DroneLaserCount; } }
        public bool IsShipFullLF3
        {
            get { return ShipLaserCapacity > 0 && ShipLaserCount == ShipLaserCapacity && ShipLF3Count == ShipLaserCapacity; }
        }

        public EquipmentSnapshot(int capacity, int shipCount, int shipLF1, int shipMP1, int shipLF2, int shipLF3,
            int droneCount, int droneLF1, int droneMP1, int droneLF2, int droneLF3)
        {
            ShipLaserCapacity = Math.Max(0, capacity);
            ShipLaserCount = Math.Max(0, shipCount);
            ShipLF1Count = Math.Max(0, shipLF1);
            ShipMP1Count = Math.Max(0, shipMP1);
            ShipLF2Count = Math.Max(0, shipLF2);
            ShipLF3Count = Math.Max(0, shipLF3);
            DroneLaserCount = Math.Max(0, droneCount);
            DroneLF1Count = Math.Max(0, droneLF1);
            DroneMP1Count = Math.Max(0, droneMP1);
            DroneLF2Count = Math.Max(0, droneLF2);
            DroneLF3Count = Math.Max(0, droneLF3);
        }

        internal static EquipmentSnapshot FromRow(DataRow row)
        {
            return new EquipmentSnapshot(Read(row, "laser_capacity"), Read(row, "ship_count"),
                Read(row, "ship_lf1"), Read(row, "ship_mp1"), Read(row, "ship_lf2"), Read(row, "ship_lf3"),
                Read(row, "drone_count"), Read(row, "drone_lf1"), Read(row, "drone_mp1"), Read(row, "drone_lf2"), Read(row, "drone_lf3"));
        }

        private static int Read(DataRow row, string column)
        {
            return row[column] == DBNull.Value ? 0 : Convert.ToInt32(row[column]);
        }

        // ANDROMEDA ADAPTATION — historically probable. Hull slots only; never drones/damage.
        // Unmapped legacy ships have no certified expansion family.
        public int GetExpansionStage(int shipId)
        {
            switch (shipId)
            {
                case 1: case 3: case 4: case 5: case 6: case 7: case 8: case 9: case 10:
                case 17: case 18: case 56: case 59: case 63: case 64: case 65: case 66: case 67:
                    if (ShipLaserCapacity <= 0 || ShipLaserCount < ShipLaserCapacity) return 1;
                    return IsShipFullLF3 ? 3 : 2;
                default: return 1;
            }
        }

        public int GetVisualLaserType(int ammoId)
        {
            switch (ammoId)
            {
                case 1:
                case 2: return IsShipFullLF3 ? 1 : 0;
                case 3: return IsShipFullLF3 ? 2 : 0;
                case 4: return 3;
                case 5: return 4;
                case 6: return 6;
                default: return 0;
            }
        }
    }

    // Captured once before admission: subsequent config/ammo changes affect the next volley.
    public sealed class LaserVolleySnapshot
    {
        public int ActiveConfig { get; private set; }
        public int AmmoId { get; private set; }
        public EquipmentSnapshot Equipment { get; private set; }
        public int MaxDamage { get; private set; }
        public double NpcMultiplier { get; private set; }
        public double PlayerMultiplier { get; private set; }
        public int SkilledLaser { get; private set; }
        public bool ApisBuilt { get; private set; }
        public int ExpansionStage { get; private set; }
        public int LaserCount { get { return Equipment.TotalLaserCount; } }
        public int VisualLaserType { get { return Equipment.GetVisualLaserType(AmmoId); } }

        internal LaserVolleySnapshot(int config, int ammoId, EquipmentSnapshot equipment, int maxDamage,
            double npcMultiplier, double playerMultiplier, int skilledLaser, bool apisBuilt, int shipId)
        {
            ExpansionStage = equipment.GetExpansionStage(shipId);
            ActiveConfig = config;
            AmmoId = ammoId;
            Equipment = equipment;
            MaxDamage = maxDamage;
            NpcMultiplier = npcMultiplier;
            PlayerMultiplier = playerMultiplier;
            SkilledLaser = skilledLaser;
            ApisBuilt = apisBuilt;
        }
    }
}
