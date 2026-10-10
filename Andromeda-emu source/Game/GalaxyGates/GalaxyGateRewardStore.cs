using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Storage;
using System;
using System.Data;

namespace OrbitReborn_Emulator.Game.GalaxyGates
{
    public interface IGalaxyGateRewardTransaction : IDisposable
    {
        DataTable Query(string sql, params object[] parameters);
        int Execute(string sql, params object[] parameters);
        void Commit();
    }

    internal sealed class GalaxyGateRewardTransaction : IGalaxyGateRewardTransaction
    {
        private readonly SqlDatabaseTransaction db = new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString());
        public DataTable Query(string sql, params object[] parameters) { return db.Query(sql, parameters); }
        public int Execute(string sql, params object[] parameters) { return db.Execute(sql, parameters); }
        public void Commit() { db.Commit(); }
        public void Dispose() { db.Dispose(); }
    }

    public sealed class GalaxyGateRewardReceipt
    {
        public bool Paid;
        public DataRow Balance;
        public int Seprom;
    }

    /// <summary>The completed Gate row is the durable, consumable claim.
    /// All gains and its reset commit together. No runtime balance is a source of truth.</summary>
    public sealed class GalaxyGateRewardStore
    {
        private readonly Func<IGalaxyGateRewardTransaction> begin;
        public GalaxyGateRewardStore() : this(() => new GalaxyGateRewardTransaction()) { }
        public GalaxyGateRewardStore(Func<IGalaxyGateRewardTransaction> begin) { this.begin = begin; }

        public GalaxyGateRewardReceipt Claim(int userId, int gateId)
        {
            GalaxyGateRewardService.GateReward reward;
            if (userId <= 0 || !GalaxyGateRewardService.TryGetReward(gateId, out reward))
                throw new ArgumentOutOfRangeException("gateId");
            using (var tx = begin())
            {
                // Fail closed on nontransactional installations; never create/alter tables here.
                var engines = tx.Query("SHOW TABLE STATUS WHERE Name IN ('users','player_galaxy_gates','player_cargo')");
                if (engines.Rows.Count != 3) throw new InvalidOperationException("Missing Galaxy Gate reward tables.");
                foreach (DataRow engine in engines.Rows)
                    if (!string.Equals(Convert.ToString(engine["Engine"]), "InnoDB", StringComparison.OrdinalIgnoreCase))
                        throw new InvalidOperationException("Galaxy Gate rewards require InnoDB tables.");

                // Same lock order as prepare/spin/buy_life: users, Gate, cargo.
                var users = tx.Query("SELECT credits,uridium,experience,honor,level,ammo_ucb100,gg_rings FROM users WHERE id=@uid FOR UPDATE", "@uid", userId);
                if (users.Rows.Count != 1) throw new InvalidOperationException("Pilot not found.");
                var gates = tx.Query("SELECT completed,on_map FROM player_galaxy_gates WHERE user_id=@uid AND gate_id=@gid FOR UPDATE", "@uid", userId, "@gid", gateId);
                if (gates.Rows.Count > 1) throw new InvalidOperationException("Duplicate Galaxy Gate rows.");
                var cargo = tx.Query("SELECT seprom FROM player_cargo WHERE id=@uid FOR UPDATE", "@uid", userId);
                if (cargo.Rows.Count != 1) throw new InvalidOperationException("Pilot cargo not found.");
                bool paid = gates.Rows.Count == 1 && Convert.ToInt32(gates.Rows[0]["completed"]) == 1;
                if (paid)
                {
                    DataRow user = users.Rows[0];
                    long experience = checked(Convert.ToInt64(user["experience"]) + reward.Experience);
                    int rings = Convert.ToInt32(user["gg_rings"]);
                    if (gateId == 1 || rings >= gateId - 1) rings = Math.Max(rings, gateId);
                    rings = Math.Max(0, Math.Min(4, rings));
                    RequireOne(tx.Execute("UPDATE users SET credits=credits+@cre,uridium=uridium+@uri,experience=experience+@xp,honor=honor+@hon,ammo_ucb100=ammo_ucb100+@ammo,level=@level,gg_rings=@rings WHERE id=@uid",
                        "@cre", reward.Credits, "@uri", reward.Uridium, "@xp", reward.Experience, "@hon", reward.Honor,
                        "@ammo", reward.Ucb100, "@level", ExperienceSystem.GetLevelFromExperience(experience), "@rings", rings, "@uid", userId));
                    RequireOne(tx.Execute("UPDATE player_cargo SET seprom=seprom+@seprom WHERE id=@uid", "@seprom", reward.Seprom, "@uid", userId));
                    RequireOne(tx.Execute("UPDATE player_galaxy_gates SET on_map=0,completed=0,current_wave=0,lives=0,parts='[]' WHERE user_id=@uid AND gate_id=@gid AND completed=1", "@uid", userId, "@gid", gateId));
                }
                var receipt = new GalaxyGateRewardReceipt {
                    Paid = paid,
                    Balance = tx.Query("SELECT credits,uridium,experience,honor,level,ammo_ucb100,gg_rings FROM users WHERE id=@uid", "@uid", userId).Rows[0],
                    Seprom = Convert.ToInt32(tx.Query("SELECT seprom FROM player_cargo WHERE id=@uid", "@uid", userId).Rows[0][0])
                };
                // If Commit throws with an uncertain outcome, retry reads the durable claim;
                // it never repeats a committed reward, and refreshes balances even on a no-op.
                tx.Commit();
                return receipt;
            }
        }

        private static void RequireOne(int rows)
        {
            if (rows != 1) throw new InvalidOperationException("Galaxy Gate reward update did not affect exactly one row.");
        }
    }
}
