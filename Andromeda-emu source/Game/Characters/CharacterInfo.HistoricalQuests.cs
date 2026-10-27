using OrbitReborn_Emulator.Game.Laboratory;
using OrbitReborn_Emulator.Storage;
using System;
using System.Data;

namespace OrbitReborn_Emulator.Game.Characters
{
    public partial class CharacterInfo
    {
        // One bounded, runtime-only record; the exact pending death reference
        // prevents an old or non-lethal hit from supplying a later kill weapon.
        internal volatile Tuple<GameplayDeathContext, int, string, int> HistoricalLethalPlayerWeapon;
        private void PublishHistoricalCargo(DataRow row)
        {
            this.mLabInfos.Prometium = Convert.ToInt32(row["prometium"]);
            this.mLabInfos.Endurium = Convert.ToInt32(row["endurium"]);
            this.mLabInfos.Terbium = Convert.ToInt32(row["terbium"]);
            this.mLabInfos.Xenomit = Convert.ToInt32(row["xenomit"]);
            this.mLabInfos.Palladium = Convert.ToInt32(row["palladium"]);
            this.mLabInfos.Prometid = Convert.ToInt32(row["prometid"]);
            this.mLabInfos.Duranium = Convert.ToInt32(row["duranium"]);
            this.mLabInfos.Promerium = Convert.ToInt32(row["promerium"]);
            this.mLabInfos.Seprom = Convert.ToInt32(row["seprom"]);
            this.mShipCargo = this.GetCurrentCargoTotal();
            // Enhancement ammunition/timers may be dirty in RAM. Never reload
            // player_reff here merely because a web quest granted cargo.
        }

        public void RefreshHistoricalQuestCargo()
        {
            lock (this.mRefinementSyncRoot)
            using (var db = new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString()))
            {
                var rows = db.Query("SELECT prometium,endurium,terbium,xenomit,palladium,prometid,duranium,promerium,seprom FROM player_cargo WHERE id=@id", "@id", this.mId);
                if (rows.Rows.Count != 1) throw new InvalidOperationException("Quest cargo unavailable.");
                db.Commit(); this.PublishHistoricalCargo(rows.Rows[0]);
            }
        }

        public bool TryCollectHistoricalNaturalOre(int resourceId)
        {
            lock (this.mRefinementSyncRoot)
            {
                this.EnsureRefiningStateReady();
                DataRow row;
                if (!RefiningUpgradeStore.TryCollectNaturalOre(this.mId, resourceId, this.ShipMaxCargo, out row)) return false;
                this.PublishHistoricalCargo(row); return true;
            }
        }
    }
}
