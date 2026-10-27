using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Data;
using System.Globalization;
using System.Linq;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Quests
{
    internal static partial class QuestObjectiveProgress
    {
        private sealed class LegacyObjectiveState
        {
            public int Id, Required, Current;
            public string Code, AttemptId, WeekKey, Type, Target;
            public long Generation;
            public bool Weekly, Dirty;
        }

        private sealed class LegacyOreState
        {
            public long Prometium, Endurium, Terbium, Generation;
            public bool Dirty;
        }

        private sealed partial class HistoricalPlayer
        {
            public int PlayerId;
            public bool LegacyLoaded, LegacyReloadDeferred;
            public long LegacyGeneration;
            public string LegacyWeekKey;
            public List<LegacyObjectiveState> LegacyObjectives = new List<LegacyObjectiveState>();
            public List<LegacyObjectiveState> WeeklyObjectives = new List<LegacyObjectiveState>();
            public LegacyOreState OreCounts = new LegacyOreState();
        }

        // State references are ACK handles only. SQL uses these captured values,
        // never the mutable rows which subsequent gameplay is allowed to update.
        private sealed class LegacyObjectiveWrite
        {
            public readonly LegacyObjectiveState State;
            public readonly int Id, Required, Current;
            public readonly string AttemptId, WeekKey, Type, Target;
            public readonly long Generation;
            public readonly bool Weekly;
            public bool Obsolete;
            public LegacyObjectiveWrite(LegacyObjectiveState state)
            {
                State = state; Id = state.Id; Required = state.Required; Current = state.Current;
                AttemptId = state.AttemptId; WeekKey = state.WeekKey; Type = state.Type;
                Target = state.Target; Generation = state.Generation; Weekly = state.Weekly;
            }
        }

        private sealed class LegacyOreWrite
        {
            public readonly LegacyOreState State;
            public readonly long Prometium, Endurium, Terbium, Generation;
            public LegacyOreWrite(LegacyOreState state)
            {
                State = state; Prometium = state.Prometium; Endurium = state.Endurium;
                Terbium = state.Terbium; Generation = state.Generation;
            }
        }

        private sealed class LegacyWriteBatch
        {
            public readonly int PlayerId;
            public readonly ReadOnlyCollection<LegacyObjectiveWrite> Objectives;
            public readonly LegacyOreWrite Ore;
            public LegacyWriteBatch(int playerId, List<LegacyObjectiveWrite> objectives, LegacyOreWrite ore)
            { PlayerId = playerId; Objectives = objectives.AsReadOnly(); Ore = ore; }
        }

        private static bool LegacyNeedsReloadLocked(HistoricalPlayer player)
        {
            string week;
            GetWeeklyRotationGroup(out week);
            return !player.LegacyLoaded || player.LegacyReloadDeferred || player.LegacyWeekKey != week;
        }

        private static string LegacyText(DataRow row, string name)
        { return Convert.ToString(row[name], CultureInfo.InvariantCulture); }

        private static bool ValidLegacyAttempt(string value)
        {
            return value != null && value.Length == 32 && value.All(c =>
                (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));
        }

        private static void LoadLegacyProgress(Session session, HistoricalPlayer player)
        {
            if (Monitor.IsEntered(player.Sync) || !Monitor.IsEntered(player.Writer))
                throw new InvalidOperationException("Legacy load requires Writer outside the progress lock.");
            long generation;
            lock (player.Sync) generation = player.LegacyGeneration;
            int playerId = session.CharacterId;
            string week;
            string rotation = GetWeeklyRotationGroup(out week);
            var legacy = new List<LegacyObjectiveState>();
            var weekly = new List<LegacyObjectiveState>();
            var ore = new LegacyOreState();
            using (var db = new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString()))
            {
                // Old Havok rows predate attempt IDs. Compare under the genuine
                // player-quest row lock; preserve their counters and rewards.
                DataTable attempts = db.Query(
                    "SELECT pq.quest_id,pq.attempt_id FROM site_player_quests pq INNER JOIN site_quests q ON q.id=pq.quest_id " +
                    "WHERE pq.player_id=@id AND pq.status='in_progress' AND q.enabled=1 " +
                    "AND EXISTS(SELECT 1 FROM site_quest_objectives o WHERE o.quest_id=pq.quest_id) FOR UPDATE", "@id", playerId);
                foreach (DataRow row in attempts.Rows)
                {
                    if (row["attempt_id"] != DBNull.Value) continue;
                    db.Execute("UPDATE site_player_quests SET attempt_id=@attempt WHERE player_id=@id AND quest_id=@quest " +
                        "AND status='in_progress' AND attempt_id IS NULL", "@attempt", Guid.NewGuid().ToString("N"),
                        "@id", playerId, "@quest", Convert.ToInt32(row["quest_id"], CultureInfo.InvariantCulture));
                }
                DataTable rows = db.Query(
                    "SELECT pq.quest_id,pq.attempt_id,q.code,o.objective_type,o.target_key,o.required_amount,COALESCE(p.current_amount,0) AS current_amount " +
                    "FROM site_player_quests pq INNER JOIN site_quests q ON q.id=pq.quest_id INNER JOIN site_quest_objectives o ON o.quest_id=q.id " +
                    "LEFT JOIN site_player_quest_objective_progress p ON p.player_id=pq.player_id AND p.quest_id=pq.quest_id " +
                    "AND p.objective_type=o.objective_type AND p.target_key=o.target_key " +
                    "WHERE pq.player_id=@id AND pq.status='in_progress' AND q.enabled=1 " +
                    "ORDER BY pq.accepted_at ASC,q.sort_order ASC,pq.quest_id ASC,o.sort_order ASC,o.id ASC", "@id", playerId);
                foreach (DataRow row in rows.Rows)
                {
                    string attempt = LegacyText(row, "attempt_id");
                    if (!ValidLegacyAttempt(attempt)) throw new InvalidOperationException("Legacy quest has an invalid attempt identity.");
                    legacy.Add(ReadLegacyObjective(row, false, attempt, null));
                }
                db.Execute("INSERT IGNORE INTO site_player_weekly_missions (player_id,mission_id,week_key,status,accepted_at) " +
                    "SELECT @id,m.id,@week,'in_progress',NOW() FROM site_weekly_missions m WHERE m.enabled=1 AND m.rotation_group=@rotation",
                    "@id", playerId, "@week", week, "@rotation", rotation);
                rows = db.Query(
                    "SELECT pwm.mission_id AS quest_id,m.code,o.objective_type,o.target_key,o.required_amount,COALESCE(p.current_amount,0) AS current_amount " +
                    "FROM site_player_weekly_missions pwm INNER JOIN site_weekly_missions m ON m.id=pwm.mission_id " +
                    "INNER JOIN site_weekly_mission_objectives o ON o.mission_id=m.id " +
                    "LEFT JOIN site_player_weekly_mission_progress p ON p.player_id=pwm.player_id AND p.mission_id=pwm.mission_id " +
                    "AND p.week_key=pwm.week_key AND p.objective_type=o.objective_type AND p.target_key=o.target_key " +
                    "WHERE pwm.player_id=@id AND pwm.week_key=@week AND pwm.status='in_progress' AND m.enabled=1 AND m.rotation_group=@rotation " +
                    "ORDER BY m.slot ASC,pwm.mission_id ASC,o.sort_order ASC,o.id ASC",
                    "@id", playerId, "@week", week, "@rotation", rotation);
                foreach (DataRow row in rows.Rows) weekly.Add(ReadLegacyObjective(row, true, null, week));
                rows = db.Query("SELECT prometium,endurium,terbium FROM site_quest_ore_counts WHERE player_id=@id", "@id", playerId);
                if (rows.Rows.Count != 0)
                {
                    ore.Prometium = Convert.ToInt64(rows.Rows[0]["prometium"], CultureInfo.InvariantCulture);
                    ore.Endurium = Convert.ToInt64(rows.Rows[0]["endurium"], CultureInfo.InvariantCulture);
                    ore.Terbium = Convert.ToInt64(rows.Rows[0]["terbium"], CultureInfo.InvariantCulture);
                }
                db.Commit();
            }
            lock (player.Sync)
            {
                if (player.LegacyGeneration != generation || HasLegacyDirtyLocked(player))
                { player.LegacyReloadDeferred = true; return; }
                player.PlayerId = playerId;
                player.LegacyObjectives = legacy; player.WeeklyObjectives = weekly; player.OreCounts = ore;
                player.LegacyWeekKey = week; player.LegacyLoaded = true; player.LegacyReloadDeferred = false;
            }
        }

        private static LegacyObjectiveState ReadLegacyObjective(DataRow row, bool weekly, string attempt, string week)
        {
            return new LegacyObjectiveState {
                Id = Convert.ToInt32(row["quest_id"], CultureInfo.InvariantCulture), Code = LegacyText(row, "code"),
                AttemptId = attempt, WeekKey = week, Weekly = weekly, Type = LegacyText(row, "objective_type"),
                Target = LegacyText(row, "target_key"), Required = Convert.ToInt32(row["required_amount"], CultureInfo.InvariantCulture),
                Current = Convert.ToInt32(row["current_amount"], CultureInfo.InvariantCulture)
            };
        }

        private static bool LegacyCanAdmitLocked(int playerId, HistoricalPlayer player)
        {
            return player.LegacyLoaded && !player.Retiring && player.Owner != null &&
                player.Owner.CharacterId == playerId && player.Owner.GameplayReady;
        }

        private static bool ApplyLegacyProgressLocked(HistoricalPlayer player, string type, string target,
            int amount, bool distribute, out bool critical)
        {
            bool changed = false;
            critical = false;
            int remaining = amount;
            foreach (var row in player.LegacyObjectives)
            {
                if (row.Type != type || row.Target != target || row.Current >= row.Required) continue;
                int add = Math.Min(distribute ? remaining : amount, row.Required - row.Current);
                if (add <= 0) continue;
                row.Current += add; row.Dirty = true; row.Generation = ++player.LegacyGeneration;
                changed = true; critical |= row.Current >= row.Required;
                if (!distribute) break;
                remaining -= add;
                if (remaining <= 0) break;
            }
            return changed;
        }

        private static bool AddBufferedLegacyProgress(int playerId, HistoricalPlayer player, string type,
            string target, int amount, bool distribute)
        {
            bool changed, critical;
            lock (player.Sync)
            {
                if (!LegacyCanAdmitLocked(playerId, player)) return false;
                changed = ApplyLegacyProgressLocked(player, type, target, amount, distribute, out critical);
                if (changed) MarkQuestDirty(playerId, player);
            }
            if (critical) { NotifyQuestLive(playerId, player); FlushQuestPlayer(playerId, player, true); }
            return changed;
        }

        private static bool AddBufferedWeeklyProgress(int playerId, HistoricalPlayer player, string type,
            List<string> targets, int amount)
        {
            bool changed = false, critical = false;
            lock (player.Sync)
            {
                if (!LegacyCanAdmitLocked(playerId, player)) return false;
                foreach (string target in targets)
                {
                    if (String.IsNullOrEmpty(target)) continue;
                    foreach (var row in player.WeeklyObjectives)
                    {
                        if (row.Type != type || row.Target != target || row.Current >= row.Required) continue;
                        int add = Math.Min(amount, row.Required - row.Current);
                        if (add <= 0) continue;
                        row.Current += add; row.Dirty = true; row.Generation = ++player.LegacyGeneration;
                        changed = true; critical |= row.Current >= row.Required;
                    }
                }
                if (changed) MarkQuestDirty(playerId, player);
            }
            if (critical) { NotifyQuestLive(playerId, player); FlushQuestPlayer(playerId, player, true); }
            return changed;
        }

        internal static bool TryBufferOreProgress(int playerId, long resourceId, int amount, out bool changed)
        {
            changed = false;
            HistoricalPlayer player = GetQuestPlayerForLegacy(playerId);
            if (player == null) return false;
            string target = GetOreTarget(resourceId);
            if (target == null || amount <= 0) return true;
            bool critical;
            lock (player.Sync)
            {
                // Once this cache was selected, retirement must not reopen the
                // old synchronous path after its final persistence barrier.
                if (!LegacyCanAdmitLocked(playerId, player)) return true;
                var ore = player.OreCounts;
                checked {
                    if (resourceId == 1) ore.Prometium += amount;
                    else if (resourceId == 2) ore.Endurium += amount;
                    else ore.Terbium += amount;
                }
                ore.Dirty = true; ore.Generation = ++player.LegacyGeneration;
                changed = ApplyLegacyProgressLocked(player, "ore_have", target, amount, true, out critical);
                MarkQuestDirty(playerId, player);
            }
            if (critical) { NotifyQuestLive(playerId, player); FlushQuestPlayer(playerId, player, true); }
            return true;
        }

        private static bool HasLegacyDirtyLocked(HistoricalPlayer player)
        {
            return player.OreCounts.Dirty || player.LegacyObjectives.Any(row => row.Dirty) ||
                player.WeeklyObjectives.Any(row => row.Dirty);
        }

        private static LegacyWriteBatch CaptureLegacyProgressLocked(HistoricalPlayer player)
        {
            var rows = player.LegacyObjectives.Concat(player.WeeklyObjectives)
                .Where(row => row.Dirty).Select(row => new LegacyObjectiveWrite(row)).ToList();
            var ore = player.OreCounts.Dirty ? new LegacyOreWrite(player.OreCounts) : null;
            return rows.Count == 0 && ore == null ? null : new LegacyWriteBatch(player.PlayerId, rows, ore);
        }

        private static void PersistLegacyProgress(SqlDatabaseTransaction db, LegacyWriteBatch batch)
        {
            if (batch == null) return;
            foreach (var mission in batch.Objectives.GroupBy(row => new { row.Weekly, row.Id, row.AttemptId, row.WeekKey }))
            {
                var first = mission.First();
                DataTable identity = first.Weekly
                    ? db.Query("SELECT status,week_key FROM site_player_weekly_missions WHERE player_id=@id AND mission_id=@mission AND week_key=@week FOR UPDATE",
                        "@id", batch.PlayerId, "@mission", first.Id, "@week", first.WeekKey)
                    : db.Query("SELECT status,attempt_id FROM site_player_quests WHERE player_id=@id AND quest_id=@quest FOR UPDATE",
                        "@id", batch.PlayerId, "@quest", first.Id);
                bool current = identity.Rows.Count != 0 && LegacyText(identity.Rows[0], "status") == "in_progress" &&
                    (first.Weekly ? LegacyText(identity.Rows[0], "week_key") == first.WeekKey : LegacyText(identity.Rows[0], "attempt_id") == first.AttemptId);
                foreach (var row in mission)
                {
                    if (!current) { row.Obsolete = true; continue; }
                    if (row.Weekly)
                        db.Execute("INSERT INTO site_player_weekly_mission_progress (player_id,mission_id,week_key,objective_type,target_key,current_amount,updated_at) " +
                            "SELECT @id,@mission,@week,@type,@target,LEAST(@current,@required),NOW() FROM site_weekly_missions m WHERE m.id=@mission AND m.enabled=1 " +
                            "ON DUPLICATE KEY UPDATE current_amount=LEAST(GREATEST(current_amount,VALUES(current_amount)),@required),updated_at=NOW()",
                            "@id", batch.PlayerId, "@mission", row.Id, "@week", row.WeekKey, "@type", row.Type, "@target", row.Target,
                            "@current", row.Current, "@required", row.Required);
                    else
                        db.Execute("INSERT INTO site_player_quest_objective_progress (player_id,quest_id,objective_type,target_key,current_amount,updated_at) " +
                            "SELECT @id,@quest,@type,@target,LEAST(@current,@required),NOW() FROM site_quests q WHERE q.id=@quest AND q.enabled=1 " +
                            "ON DUPLICATE KEY UPDATE current_amount=LEAST(GREATEST(current_amount,VALUES(current_amount)),@required),updated_at=NOW()",
                            "@id", batch.PlayerId, "@quest", row.Id, "@type", row.Type, "@target", row.Target,
                            "@current", row.Current, "@required", row.Required);
                }
            }
            if (batch.Ore != null)
                db.Execute("INSERT INTO site_quest_ore_counts (player_id,prometium,endurium,terbium,updated_at) VALUES (@id,@prom,@endu,@terb,NOW()) " +
                    "ON DUPLICATE KEY UPDATE prometium=GREATEST(prometium,VALUES(prometium)),endurium=GREATEST(endurium,VALUES(endurium))," +
                    "terbium=GREATEST(terbium,VALUES(terbium)),updated_at=NOW()",
                    "@id", batch.PlayerId, "@prom", batch.Ore.Prometium, "@endu", batch.Ore.Endurium, "@terb", batch.Ore.Terbium);
        }

        private static void AcknowledgeLegacyProgressLocked(HistoricalPlayer player, LegacyWriteBatch batch)
        {
            if (batch == null) return;
            foreach (var row in batch.Objectives)
            {
                var source = row.Weekly ? player.WeeklyObjectives : player.LegacyObjectives;
                if (!source.Contains(row.State)) continue;
                if (row.Obsolete)
                {
                    source.Remove(row.State); player.LegacyReloadDeferred = true; player.Revision = -1;
                }
                else if (row.State.Generation == row.Generation) row.State.Dirty = false;
            }
            if (batch.Ore != null && Object.ReferenceEquals(player.OreCounts, batch.Ore.State) &&
                player.OreCounts.Generation == batch.Ore.Generation) player.OreCounts.Dirty = false;
        }

        private static List<object> BuildLegacyStateLocked(HistoricalPlayer player)
        {
            var result = new List<object>();
            foreach (var group in player.LegacyObjectives.Concat(player.WeeklyObjectives)
                .GroupBy(row => new { row.Weekly, row.Id, row.Code, row.AttemptId, row.WeekKey }))
            {
                var first = group.First();
                result.Add(new {
                    kind = first.Weekly ? "weekly" : "legacy", id = first.Id, code = first.Code,
                    attempt_id = first.AttemptId, week_key = first.WeekKey,
                    completed = group.All(row => row.Current >= row.Required),
                    objectives = group.Select(row => new { type = row.Type, target = row.Target, current = row.Current, required = row.Required }).ToList()
                });
            }
            return result;
        }
    }
}
