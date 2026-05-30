using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
using System;

namespace OrbitReborn_Emulator.Game.Maps.Collectables
{
    /// <summary>
    /// BonusBox rewards tuned to match DarkOrbit "classic" (circa 2010).
    ///
    /// Notes:
    /// - Normal maps: small credits/uridium + x1/x2/x3 laser ammo.
    /// - Battle maps 4-1/4-2/4-3 (mapIds 13/14/15): 1.5x rewards (rounded up when needed)
    ///   and a small chance for PLT-2021 rockets.
    ///
    /// Packet format kept legacy-compatible: 0|y|TYPE|...|
    /// Flash will formatLegacy() it to LOG_MESSAGE internally.
    /// </summary>
    internal class BonusBox : Collectable
    {
        // --- DarkOrbit classic 2010 value tables (amounts) ---
        // Credits / Uridium are now rolled from ranges (not fixed values),
        // so rewards don't feel constant (e.g. 150 credits, 30 uridium, 450 uridium, etc.).

        private static readonly int[] LCB10 = { 10, 20, 50 };
        private static readonly int[] MCB25 = { 5, 10, 20 };
        private static readonly int[] MCB50 = { 5, 10, 20 };

        // DarkOrbit battle map multiplier (4-1/4-2/4-3)
        private const double BATTLE_MULTIPLIER = 1.5;

        // Laser ammo ids (match Flash LaserPattern ids)
        private const int LASER_LCB10 = 1;
        private const int LASER_MCB25 = 2;
        private const int LASER_MCB50 = 3;

        // Rocket ids (match Flash RocketPattern ids)
        private const int ROCKET_PLT2021 = 3;

        public BonusBox(int Id, int X, int Y, int MapId)
            : base(Id, 2, X, Y, MapId)
        {
        }

        public override void Collect(Session user)
        {
            if (this.Collecting)
            {
                user.SendData(PacketComposer.Compose("A", "STD|This box is already being collected."));
                return;
            }

            MapInstance instanceByMapId = MapManager.GetInstanceByMapId(this.MapId);
            if (instanceByMapId == null ||
                !instanceByMapId.Info.Collectables.ContainsKey(this.Id) ||
                !DistanceUtil.IsWithinRangeSquared(this.X, this.Y, user.CharacterInfo.LocX, user.CharacterInfo.LocY, 300))
            {
                return;
            }

            this.Collecting = true;

            Random random = RandomProvider.Current;
            bool isBattleMap = IsBattleMap(this.MapId);

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                // Weighted distribution (approx. classic feel)
                // Normal maps:
                // - Credits 50%
                // - Uridium 25%
                // - LCB-10 15%
                // - MCB-25 6%
                // - MCB-50 4%
                // Battle maps (4-1..4-3): same but with a small rocket chance.

                int roll = random.Next(0, 100);

                if (isBattleMap)
                {
                    if (roll < 45)
                    {
                        int credits = ApplyBattleMultiplier(RollCredits(random), true, false);
                        GiveCredits(client, user, credits);
                    }
                    else if (roll < 70)
                    {
                        int uridium = ApplyBattleMultiplier(RollUridium(random), true, false);
                        GiveUridium(client, user, uridium);
                    }
                    else if (roll < 85)
                    {
                        int amount = ApplyBattleMultiplier(Pick(random, LCB10), true, true);
                        GiveLaserAmmo(client, user, LASER_LCB10, amount);
                    }
                    else if (roll < 92)
                    {
                        int amount = ApplyBattleMultiplier(Pick(random, MCB25), true, true);
                        GiveLaserAmmo(client, user, LASER_MCB25, amount);
                    }
                    else if (roll < 97)
                    {
                        int amount = ApplyBattleMultiplier(Pick(random, MCB50), true, true);
                        GiveLaserAmmo(client, user, LASER_MCB50, amount);
                    }
                    else
                    {
                        // Small chance to get PLT-2021 rockets on 4-1/4-2/4-3
                        int rockets = random.Next(6, 29); // inclusive 6..28
                        GiveRocketAmmo(client, user, ROCKET_PLT2021, rockets);
                    }
                }
                else
                {
                    if (roll < 50)
                    {
                        int credits = RollCredits(random);
                        GiveCredits(client, user, credits);
                    }
                    else if (roll < 75)
                    {
                        int uridium = RollUridium(random);
                        GiveUridium(client, user, uridium);
                    }
                    else if (roll < 90)
                    {
                        int amount = Pick(random, LCB10);
                        GiveLaserAmmo(client, user, LASER_LCB10, amount);
                    }
                    else if (roll < 96)
                    {
                        int amount = Pick(random, MCB25);
                        GiveLaserAmmo(client, user, LASER_MCB25, amount);
                    }
                    else
                    {
                        int amount = Pick(random, MCB50);
                        GiveLaserAmmo(client, user, LASER_MCB50, amount);
                    }
                }
            }

            // Remove & respawn box
            instanceByMapId.BroadcastMessage(PacketComposer.Compose("2", this.Id.ToString()), false);

            this.MoveToRandomPosition(random);
            this.Collecting = false;

            instanceByMapId.BroadcastMessage(
                PacketComposer.Compose("c", this.Id + "|" + this.Type + "|" + this.X + "|" + this.Y),
                false
            );
        }

        private static bool IsBattleMap(int mapId)
        {
            // 4-1, 4-2, 4-3 (see maps table)
            return mapId == 13 || mapId == 14 || mapId == 15;
        }


        private static int RollCredits(Random rnd)
        {
            // Weighted tiers (feel-good variety, still balanced)
            // 55%: 100..300
            // 30%: 301..800
            // 12%: 801..2000
            //  3%: 2001..5000
            int roll = rnd.Next(0, 100);
            if (roll < 55) return rnd.Next(100, 301);
            if (roll < 85) return rnd.Next(301, 801);
            if (roll < 97) return rnd.Next(801, 2001);
            return rnd.Next(2001, 5001);
        }

        private static int RollUridium(Random rnd)
        {
            // Weighted tiers (includes larger hits like 450)
            // 60%: 10..60
            // 25%: 61..150
            // 12%: 151..300
            //  3%: 301..450
            int roll = rnd.Next(0, 100);
            if (roll < 60) return rnd.Next(10, 61);
            if (roll < 85) return rnd.Next(61, 151);
            if (roll < 97) return rnd.Next(151, 301);
            return rnd.Next(301, 451);
        }

        private static int Pick(Random rnd, int[] values)
        {
            return values[rnd.Next(0, values.Length)];
        }

        private static int ApplyBattleMultiplier(int amount, bool isBattle, bool roundUp)
        {
            if (!isBattle)
                return amount;

            double v = amount * BATTLE_MULTIPLIER;
            return roundUp ? (int)Math.Ceiling(v) : (int)Math.Round(v);
        }

        private static void GiveCredits(SqlDatabaseClient client, Session user, int credits)
        {
            if (credits <= 0) return;

            user.CharacterInfo.AddReward(client, credits, 0, 0, true);
            user.SendData(PacketComposer.Compose("y", "CRE|" + credits + "|" + user.CharacterInfo.Credits));
        }

        private static void GiveUridium(SqlDatabaseClient client, Session user, int uridium)
        {
            if (uridium <= 0) return;

            user.CharacterInfo.AddReward(client, 0, uridium, 0, true);
            user.SendData(PacketComposer.Compose("y", "URI|" + uridium + "|" + user.CharacterInfo.Uridium));
        }

        private static void GiveLaserAmmo(SqlDatabaseClient client, Session user, int ammoId, int amount)
        {
            if (amount <= 0) return;

            string column;
            switch (ammoId)
            {
                case LASER_LCB10:
                    column = "ammo_lcb10";
                    break;
                case LASER_MCB25:
                    column = "ammo_mcb25";
                    break;
                case LASER_MCB50:
                    column = "ammo_mcb50";
                    break;
                default:
                    return;
            }

            client.ClearParameters();
            client.SetParameter("id", user.CharacterInfo.Id);
            client.ExecuteNonQuery(
                "UPDATE users SET " + column + " = " + column + " + " + amount + " WHERE id = @id LIMIT 1"
            );

            // Update in-memory count
            if (ammoId == LASER_LCB10) user.CharacterInfo.AmmoLcb10 += amount;
            else if (ammoId == LASER_MCB25) user.CharacterInfo.AmmoMcb25 += amount;
            else if (ammoId == LASER_MCB50) user.CharacterInfo.AmmoMcb50 += amount;

            // Flash expects: y|BAT|<ammoId>|<amount>
            user.SendData(PacketComposer.Compose("y", "BAT|" + ammoId + "|" + amount));

            // Refresh HUD ammo counters (packet B)
            user.SendData(PacketComposer.Compose("B", user.CharacterInfo.GetPrimaryWeaponInfoPayload()));
        }

        private static void GiveRocketAmmo(SqlDatabaseClient client, Session user, int rocketId, int amount)
        {
            if (amount <= 0) return;

            string column;
            switch (rocketId)
            {
                case ROCKET_PLT2021:
                    column = "ammo_plt2021";
                    break;
                default:
                    return;
            }

            client.ClearParameters();
            client.SetParameter("id", user.CharacterInfo.Id);
            client.ExecuteNonQuery(
                "UPDATE users SET " + column + " = " + column + " + " + amount + " WHERE id = @id LIMIT 1"
            );

            // Update in-memory count
            if (rocketId == ROCKET_PLT2021) user.CharacterInfo.AmmoPlt2021 += amount;

            // Flash expects: y|ROK|<rocketId>|<amount>
            user.SendData(PacketComposer.Compose("y", "ROK|" + rocketId + "|" + amount));

            // Refresh HUD rocket counters (packet 3)
            user.SendData(PacketComposer.Compose("3", user.CharacterInfo.GetSecondaryWeaponInfoPayload()));
        }
    }
}
