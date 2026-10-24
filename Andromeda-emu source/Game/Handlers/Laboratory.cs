

using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Game.Laboratory;

namespace OrbitReborn_Emulator.Game.Handlers
{
    public static class Laboratory
    {
        public static void Initialize()
        {
            DataRouter.RegisterHandler("T", new ProcessRequestCallback(Laboratory.SellOre), false);
            DataRouter.RegisterHandler("LAB", new ProcessRequestCallback(Laboratory.Lab), false);
            DataRouter.RegisterHandler("b", new ProcessRequestCallback(Laboratory.GetOrePrices), false);
        }

        private static void ProdReff(Session Session, ClientMessage Message)
        {
            long resId = (long)Message.GetNextInt(3);
            int amount = (int)Message.GetNextInt(4);

            if (resId < 0 || amount < 0)
                return;

            if (amount > 20000)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|Can't create more than 20,000 units at once."));
                return;
            }

            lock (Session.CharacterInfo.RefinementSyncRoot)
            {
            if (resId == 11L)
            {
                if (Session.CharacterInfo.LabInfos.GetCargo(1L) < 20 * amount) return;
                if (Session.CharacterInfo.LabInfos.GetCargo(2L) < 10 * amount) return;

                Session.CharacterInfo.RemoveCargo(1L, 20 * amount);
                Session.CharacterInfo.RemoveCargo(2L, 10 * amount);
                Session.CharacterInfo.AddCargo(11L, amount);
                Session.SendData(Session.CharacterInfo.GetCargoMessage());
                return;
            }

            if (resId == 12L)
            {
                if (Session.CharacterInfo.LabInfos.GetCargo(3L) < 20 * amount) return;
                if (Session.CharacterInfo.LabInfos.GetCargo(2L) < 10 * amount) return;

                Session.CharacterInfo.RemoveCargo(3L, 20 * amount);
                Session.CharacterInfo.RemoveCargo(2L, 10 * amount);
                Session.CharacterInfo.AddCargo(12L, amount);
                Session.SendData(Session.CharacterInfo.GetCargoMessage());
                return;
            }

            if (resId == 13L)
            {
                if (Session.CharacterInfo.LabInfos.GetCargo(11L) < 10 * amount) return;
                if (Session.CharacterInfo.LabInfos.GetCargo(12L) < 10 * amount) return;
                if (Session.CharacterInfo.LabInfos.GetCargo(4L) < amount) return;

                Session.CharacterInfo.RemoveCargo(11L, 10 * amount);
                Session.CharacterInfo.RemoveCargo(12L, 10 * amount);
                Session.CharacterInfo.RemoveCargo(4L, amount);
                Session.CharacterInfo.AddCargo(13L, amount);
                Session.SendData(Session.CharacterInfo.GetCargoMessage());
                return;
            }
            }
        }

        private static bool IsUpgradeOreAllowed(string type, int oreId)
        {
            return RefiningUpgradeRules.IsAllowed(type, oreId);
        }

        private static void SendSafeState(Session Session)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            Session.SendData(Session.CharacterInfo.GetSepromSafeMessage());
        }

        private static void SendSafeError(Session Session, string error)
        {
            string message = "Seprom Safe error.";

            switch (error)
            {
                case "invalid_level":
                    message = "Invalid safe level.";
                    break;

                case "already_unlocked":
                    message = "This safe level is already unlocked.";
                    break;

                case "unlock_order":
                    message = "You must unlock Safe levels in order.";
                    break;

                case "not_enough_uridium":
                    message = "Not enough uridium.";
                    break;

                case "safe_locked":
                    message = "Unlock Safe level 1 first.";
                    break;

                case "not_enough_seprom":
                    message = "Not enough Seprom in cargo.";
                    break;

                case "safe_full":
                    message = "Your Seprom Safe is full.";
                    break;

                case "safe_empty":
                    message = "Your Seprom Safe is empty.";
                    break;

                case "cargo_full":
                    message = "Your cargo bay is full.";
                    break;

                case "invalid_amount":
                    message = "Invalid amount.";
                    break;

                case "trade_only":
                    message = "You must be inside the trade zone (station) to use the Seprom Safe.";
                    break;

                case "db_unavailable":
                    message = "Database unavailable.";
                    break;

                default:
                    if (!string.IsNullOrEmpty(error))
                        message = error;
                    break;
            }

            Session.SendData(PacketComposer.Compose("A", "STD|" + message));
        }

        private static void HandleSafe(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null)
                return;

            string action = (Message.GetNextString(2) ?? string.Empty).ToUpperInvariant();
            if (action == "GET")
            {
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    if (client != null)
                        Session.CharacterInfo.LoadSepromSafe(client);
                }
                Laboratory.SendSafeState(Session);
                return;
            }

            if (!Session.CharacterInfo.TradeZone)
            {
                Laboratory.SendSafeError(Session, "trade_only");
                Laboratory.SendSafeState(Session);
                return;
            }

            if (action == "UNLOCK")
            {
                int level = Message.GetNextInt(3);
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    int cost;
                    string error;
                    if (client != null)
                        Session.CharacterInfo.LoadSepromSafe(client);
                    if (!Session.CharacterInfo.TryUnlockSepromSafe(client, level, out cost, out error))
                    {
                        Laboratory.SendSafeError(Session, error);
                        Laboratory.SendSafeState(Session);
                        return;
                    }

                    Session.SendData(UserDataComposer.Compose(Session));
                    Laboratory.SendSafeState(Session);
                    Session.SendData(PacketComposer.Compose("A", "STD|Seprom Safe level " + level + " unlocked."));
                }
                return;
            }

            if (action == "DEPOSIT")
            {
                int amount = Message.GetNextInt(3);
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    int moved;
                    string error;
                    if (client != null)
                        Session.CharacterInfo.LoadSepromSafe(client);
                    if (!Session.CharacterInfo.TryDepositSepromToSafe(client, amount, out moved, out error))
                    {
                        Laboratory.SendSafeError(Session, error);
                        Laboratory.SendSafeState(Session);
                        return;
                    }

                    Session.SendData(Session.CharacterInfo.GetCargoMessage());
                    Laboratory.SendSafeState(Session);
                    Session.SendData(PacketComposer.Compose("A", "STD|Moved " + moved + " Seprom to Safe."));
                }
                return;
            }

            if (action == "WITHDRAW")
            {
                int amount = Message.GetNextInt(3);
                using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
                {
                    int moved;
                    string error;
                    if (client != null)
                        Session.CharacterInfo.LoadSepromSafe(client);
                    if (!Session.CharacterInfo.TryWithdrawSepromFromSafe(client, amount, out moved, out error))
                    {
                        Laboratory.SendSafeError(Session, error);
                        Laboratory.SendSafeState(Session);
                        return;
                    }

                    Session.SendData(Session.CharacterInfo.GetCargoMessage());
                    Laboratory.SendSafeState(Session);
                    Session.SendData(PacketComposer.Compose("A", "STD|Moved " + moved + " Seprom from Safe to cargo."));
                }
                return;
            }

        }

        private static void AddReff(Session Session, ClientMessage Message)
        {
            if (Session == null || Session.CharacterInfo == null || Session.CharacterInfo.LabInfos == null)
                return;
            int oreId = Message.GetNextInt(4);
            int oreAmount = Message.GetNextInt(5);
            string type = (Message.GetNextString(3) ?? string.Empty).ToUpperInvariant();
            string error;
            if (!Session.CharacterInfo.TryApplyRefiningUpgrade(type, oreId, oreAmount, out error))
            {
                string message = (error ?? "Unable to apply the upgrade.").Replace('|', '/');
                Session.SendData(PacketComposer.Compose("LAB", "UPD|ERROR|" + message));
                Session.SendData(PacketComposer.Compose("A", "STD|" + message));
                Session.SendData(Session.CharacterInfo.GetCargoMessage());
                Session.SendData(Session.CharacterInfo.GetReffMessage());
                return;
            }
            if (type == "SHIELD")
                Session.SendData(PacketComposer.Compose("A", "SHD|" + (object)Session.CharacterInfo.ShipShield + "|" + (object)Session.CharacterInfo.ShipMaxShield));
            if (type == "DRIVING")
                Session.SendData(PacketComposer.Compose("A", "v|" + (object)Session.CharacterInfo.ShipSpeed));
            Session.SendData(Session.CharacterInfo.GetCargoMessage());
            Session.SendData(Session.CharacterInfo.GetReffMessage());
            Session.SendData(PacketComposer.Compose("LAB", "UPD|OK"));
        }

        private static void Lab(Session Session, ClientMessage Message)
        {
            string mainAction = Message.GetNextString(1);

            if (mainAction == "REF")
            {
                if (Message.GetNextString(2) == "PROD")
                    Laboratory.ProdReff(Session, Message);
                return;
            }

            if (mainAction == "UPD")
            {
                if (Message.GetNextString(2) == "SET")
                {
                    Laboratory.AddReff(Session, Message);
                    return;
                }

                if (Message.GetNextString(2) == "GET")
                {
                    Session.SendData(Session.CharacterInfo.GetCargoMessage());
                    Session.SendData(Session.CharacterInfo.GetReffMessage());
                    Laboratory.SendSafeState(Session);
                    return;
                }

                return;
            }

            if (mainAction == "SAFE")
            {
                Laboratory.HandleSafe(Session, Message);
                return;
            }

        }


        private static int GetBasePrice(int iResId)
        {
            switch (iResId)
            {
                case 1: return 30;
                case 2: return 45;
                case 3: return 75;
                case 11: return 600;
                case 12: return 600;
                case 13: return 1500;
                default: return 0;
            }
        }

        private static int GetPriceForSession(Session Session, int iResId)
        {
            int basePrice = GetBasePrice(iResId);
            if (basePrice <= 0)
                return 0;

            long honor = 0;
            if (Session != null && Session.CharacterInfo != null)
                honor = Session.CharacterInfo.Honor;

            int divisor = 500000 / basePrice;
            if (divisor <= 0) divisor = 1;

            long bonusLong = honor / divisor;
            int price = basePrice;

            int maxPrice = basePrice * 2;
            long maxBonus = maxPrice - basePrice;

            if (bonusLong > maxBonus) bonusLong = maxBonus;
            if (bonusLong < 0) bonusLong = 0;

            price += (int)bonusLong;
            return price;
        }


        private static void SellOre(Session Session, ClientMessage Message)
        {
            if (!Session.CharacterInfo.TradeZone)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|You must be inside the trade zone (station) to sell ores."));
                return;
            }

            string arg1 = Message.GetNextString(1);

            int oreId;
            int amount;

            if (!string.IsNullOrEmpty(arg1) && arg1.ToLowerInvariant() == "sell")
            {
                oreId = Message.GetNextInt(2);
                amount = Message.GetNextInt(3);
            }
            else
            {
                oreId = Message.GetNextInt(1);
                amount = Message.GetNextInt(2);
            }

            if (oreId <= 0 || amount <= 0)
                return;

            int price = Laboratory.GetPriceForSession(Session, oreId);
            if (price <= 0)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|This resource cannot be sold."));
                return;
            }

            long creditsLong = (long)amount * (long)price;
            if (creditsLong > int.MaxValue)
            {
                Session.SendData(PacketComposer.Compose("A", "STD|Amount is too large."));
                return;
            }

            int credits = (int)creditsLong;

            // Serialize stock validation and debit with enhancement upgrades. Do not
            // hold a legacy SQL lease while waiting for this player-local lock.
            lock (Session.CharacterInfo.RefinementSyncRoot)
            {
                if (amount > Session.CharacterInfo.LabInfos.GetCargo((long)oreId)) return;
                Session.CharacterInfo.RemoveCargo((long)oreId, amount);
            }
            Session.SendData(Session.CharacterInfo.GetCargoMessage());

            using (SqlDatabaseClient client = SqlDatabaseManager.GetClient())
            {
                Session.CharacterInfo.AddReward(client, credits, 0, 0, false);
                Session.SendData(PacketComposer.Compose("y", "CRE|" + credits + "|" + Session.CharacterInfo.Credits));
            }
        }

        private static void GetOrePrices(Session Session, ClientMessage Message)
        {
            Session.SendData(PacketComposer.Compose("g",
                Laboratory.GetPriceForSession(Session, 1).ToString() + "|" +
                (object)Laboratory.GetPriceForSession(Session, 2) + "|" +
                (object)Laboratory.GetPriceForSession(Session, 3) + "|" +
                (object)Laboratory.GetPriceForSession(Session, 11) + "|" +
                (object)Laboratory.GetPriceForSession(Session, 12) + "|" +
                (object)Laboratory.GetPriceForSession(Session, 13)));
        }
    }
}
