using System;
using System.Data;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Storage;

namespace OrbitReborn_Emulator.Game.Event.Tdm
{
    public interface ITdmRewardTransaction : IDisposable
    {
        DataTable Query(string sql, params object[] parameters);
        int Execute(string sql, params object[] parameters);
        void Commit();
    }
    internal sealed class TdmRewardTransaction : ITdmRewardTransaction
    {
        private readonly SqlDatabaseTransaction Db = new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString());
        public DataTable Query(string sql, params object[] parameters) { return Db.Query(sql, parameters); }
        public int Execute(string sql, params object[] parameters) { return Db.Execute(sql, parameters); }
        public void Commit() { Db.Commit(); }
        public void Dispose() { Db.Dispose(); }
    }
    // Every writer locks users FIRST. This also serializes different match claims
    // for one player, so cap5 is enforced across threads/processes, not in a cache.
    public sealed class TdmRewardStore
    {
        private readonly Func<ITdmRewardTransaction> Open;
        public TdmRewardStore(Func<ITdmRewardTransaction> open) { Open = open; }
        public TdmRewardReceipt Pay(TdmRewardClaim claim)
        {
            claim.Validate();
            string json = new JavaScriptSerializer().Serialize(claim);
            string hash;
            using (var sha = SHA256.Create()) hash = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(json))).Replace("-", "").ToLowerInvariant();
            using (var db = Open())
            {
                var player = db.Query("SELECT id,experience FROM users WHERE id=@p FOR UPDATE", "@p", claim.PlayerId);
                if (player.Rows.Count != 1) throw new InvalidOperationException("TDM reward player missing.");
                var prior = db.Query("SELECT claim_hash,status,q,experience,uridium,honor FROM tdm_reward_log WHERE player_id=@p AND match_id=@m AND reward_version=@v FOR UPDATE",
                    "@p", claim.PlayerId, "@m", claim.MatchId, "@v", TdmRewardClaim.Version);
                // Hold table metadata locks before checking engines/unique key. No DDL
                // is ever attempted here, including when the manual schema is missing.
                var engines = db.Query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('users','tdm_reward_log')");
                if (engines.Rows.Count != 2 || engines.Rows.Cast<DataRow>().Any(r => !string.Equals(Convert.ToString(r["ENGINE"]), "InnoDB", StringComparison.OrdinalIgnoreCase)))
                    throw new InvalidOperationException("TDM rewards require transactional InnoDB users and journal.");
                var indexes = db.Query("SELECT INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tdm_reward_log' ORDER BY INDEX_NAME,SEQ_IN_INDEX");
                bool unique = indexes.Rows.Cast<DataRow>().Where(r => Convert.ToInt32(r["NON_UNIQUE"]) == 0).GroupBy(r => Convert.ToString(r["INDEX_NAME"]))
                    .Any(g => string.Join(",", g.OrderBy(r => Convert.ToInt32(r["SEQ_IN_INDEX"])).Select(r => Convert.ToString(r["COLUMN_NAME"]))) == "player_id,match_id,reward_version");
                if (!unique) throw new InvalidOperationException("TDM reward unique claim key missing.");
                if (prior.Rows.Count != 0)
                {
                    var row = prior.Rows[0];
                    if (Convert.ToString(row["claim_hash"]) != hash) throw new InvalidOperationException("TDM stale/conflicting reward claim.");
                    var previous = new TdmRewardReceipt { status = Convert.ToString(row["status"]), q = Convert.ToInt32(row["q"]),
                        experience = Convert.ToInt64(row["experience"]), uridium = Convert.ToInt64(row["uridium"]), honor = Convert.ToInt64(row["honor"]) };
                    db.Commit(); return previous; // committed receipt, NEVER another credit
                }
                var receipt = new TdmRewardReceipt { status = "INELIGIBLE", q = claim.Q };
                if (claim.Eligible)
                {
                    var counts = db.Query("SELECT COUNT(*) AS paid FROM tdm_reward_log WHERE player_id=@p AND occurrence_id=@o AND status='PAID'", "@p", claim.PlayerId, "@o", claim.OccurrenceId);
                    receipt = Convert.ToInt32(counts.Rows[0]["paid"]) >= 5 ? new TdmRewardReceipt { status = "CAP", q = claim.Q } : claim.Formula();
                }
                int inserted = db.Execute("INSERT INTO tdm_reward_log(player_id,match_id,reward_version,occurrence_id,claim_hash,status,q,experience,uridium,honor,claim_json,created_at) VALUES(@p,@m,@v,@o,@h,@s,@q,@x,@u,@hon,@json,UTC_TIMESTAMP())",
                    "@p", claim.PlayerId, "@m", claim.MatchId, "@v", TdmRewardClaim.Version, "@o", claim.OccurrenceId, "@h", hash, "@s", receipt.status,
                    "@q", receipt.q, "@x", receipt.experience, "@u", receipt.uridium, "@hon", receipt.honor, "@json", json);
                if (inserted != 1) throw new InvalidOperationException("TDM journal insert failed.");
                if (receipt.status == "PAID")
                {
                    long experience = checked(Convert.ToInt64(player.Rows[0]["experience"]) + receipt.experience);
                    int updated = db.Execute("UPDATE users SET experience=experience+@x,uridium=uridium+@u,honor=honor+@h,level=@l WHERE id=@p",
                        "@x", receipt.experience, "@u", receipt.uridium, "@h", receipt.honor, "@l", ExperienceSystem.GetLevelFromExperience(experience), "@p", claim.PlayerId);
                    if (updated != 1) throw new InvalidOperationException("TDM payment failed.");
                }
                // Uncertain commit may be retried ONLY with the same durable claim.
                // The unique journal and users lock resolve the committed/not-committed case.
                db.Commit(); return receipt;
            }
        }
    }
}
