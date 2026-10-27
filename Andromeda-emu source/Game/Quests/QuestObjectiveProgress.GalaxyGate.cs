using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.GalaxyGates;
using System;
using System.Data;
using System.Globalization;
using System.Linq;

namespace OrbitReborn_Emulator.Game.Quests
{
    internal static partial class QuestObjectiveProgress
    {
        // Called only for the final NPC, inside the existing durable completion
        // transaction. The run receipt / completed flag is the idempotency key;
        // normal Gate economic rewards remain a separate later operation.
        internal static bool ApplyGalaxyGateCompletionInTransaction(IGalaxyGateTimingTransaction tx, int playerId, int gateId, CharacterInfo character)
        {
            string gate = GetGalaxyGateTarget(gateId.ToString(CultureInfo.InvariantCulture));
            if (gate == null) throw new InvalidOperationException("Unknown completed gate.");
            var tables = tx.Query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('site_quests','site_quest_objectives','site_player_quests','site_player_quest_objective_progress')");
            if (tables.Rows.Count == 0) return false; // Pre-quest installations retain their original Gate behavior.
            if (tables.Rows.Count != 4) throw new InvalidOperationException("Incomplete quest storage for Gate completion.");
            foreach (DataRow row in tables.Rows)
                if (!string.Equals(Convert.ToString(row["ENGINE"]), "InnoDB", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("Gate quest progression requires InnoDB tables.");

            bool changed = false;
            // Preserve the established legacy/Havok allocation: one completed
            // gate advances the oldest compatible active legacy objective once.
            var legacy = tx.Query(
                "SELECT pq.quest_id,qo.required_amount,COALESCE(p.current_amount,0) AS current_amount FROM site_player_quests pq " +
                "INNER JOIN site_quests q ON q.id=pq.quest_id INNER JOIN site_quest_objectives qo ON qo.quest_id=pq.quest_id " +
                "LEFT JOIN site_player_quest_objective_progress p ON p.player_id=pq.player_id AND p.quest_id=pq.quest_id AND p.objective_type=qo.objective_type AND p.target_key=qo.target_key " +
                "WHERE pq.player_id=@uid AND pq.status='in_progress' AND q.enabled=1 AND qo.objective_type='galaxy_gate_complete' AND qo.target_key=@gate " +
                "AND COALESCE(p.current_amount,0)<qo.required_amount ORDER BY pq.accepted_at,q.sort_order,pq.quest_id,qo.sort_order,qo.id LIMIT 1 FOR UPDATE",
                "@uid", playerId, "@gate", gate);
            if (legacy.Rows.Count == 1)
            {
                DataRow row = legacy.Rows[0];
                int result = tx.Execute("INSERT INTO site_player_quest_objective_progress (player_id,quest_id,objective_type,target_key,current_amount,updated_at) " +
                    "VALUES (@uid,@quest,'galaxy_gate_complete',@gate,1,NOW()) ON DUPLICATE KEY UPDATE current_amount=LEAST(current_amount+1,@required),updated_at=NOW()",
                    "@uid", playerId, "@quest", Convert.ToInt32(row["quest_id"]), "@gate", gate, "@required", Convert.ToInt32(row["required_amount"]));
                if (result <= 0) throw new InvalidOperationException("Gate legacy progress was not stored.");
                changed = true;
            }

            var columns = tx.Query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='site_quests' AND COLUMN_NAME IN ('source_domain','definition_json')");
            var featureTable = tx.Query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='site_quest_features'");
            if (columns.Rows.Count != 2 || featureTable.Rows.Count == 0) return changed;
            var enabled = tx.Query("SELECT enabled FROM site_quest_features WHERE feature_key='historical_catalog' LIMIT 1");
            if (enabled.Rows.Count == 0 || Convert.ToInt32(enabled.Rows[0][0]) != 1) return changed;

            var active = tx.Query("SELECT pq.quest_id,pq.attempt_id,pq.state_version,pq.progress_json,q.code,q.definition_json FROM site_player_quests pq " +
                "INNER JOIN site_quests q ON q.id=pq.quest_id WHERE pq.player_id=@uid AND pq.status='in_progress' AND q.source_domain='historical' AND q.enabled=1 ORDER BY pq.quest_id FOR UPDATE", "@uid", playerId);
            foreach (DataRow row in active.Rows)
            {
                HistoricalAttempt attempt = ReadHistoricalGateAttempt(row);
                if (attempt == null) continue;
                var state = attempt.State;
                // A disconnected pilot may still have a valid final NPC event.
                // Basic Gate completion needs no fabricated HP/cloak/map state.
                // Conditional definitions wait for a verifiable live context.
                if (character == null && attempt.Index.Values.SelectMany(x => x).Any(n =>
                    HistoricalGet(n, "hp_fraction_max") != null || HistoricalGet(n, "cloaked") != null || HistoricalGet(n, "map") != null || HistoricalGet(n, "maps") != null || HistoricalGet(n, "player_ship") != null)) continue;
                DataRow identity = null;
                if (character == null)
                {
                    var identities = tx.Query("SELECT factionid,shipid FROM users WHERE id=@uid", "@uid", playerId);
                    if (identities.Rows.Count != 1) throw new InvalidOperationException("Gate completion pilot identity unavailable.");
                    identity = identities.Rows[0];
                }
                var evt = new HistoricalEvent { Kind = "gate", Target = gate, Amount = 1, At = HistoricalNow(),
                    Faction = character != null ? character.FactionId : Convert.ToInt32(identity["factionid"]),
                    PlayerShip = character != null ? character.ShipId : Convert.ToInt32(identity["shipid"]), MapId = character != null ? character.MapId : 0,
                    X = character != null ? character.LocX : 0, Y = character != null ? character.LocY : 0,
                    Cloaked = character != null && character.Invisible == 1, HpFraction = character != null && character.ShipMaxHp > 0 ? (double)character.ShipHp / character.ShipMaxHp : 0 };
                if (!ProcessHistoricalAttempt(attempt, evt)) continue;
                int stored = tx.Execute("UPDATE site_player_quests SET progress_json=@progress,state_version=state_version+1 WHERE player_id=@uid AND quest_id=@quest AND status='in_progress' AND attempt_id=@attempt AND state_version=@version",
                    "@progress", HistoricalSerializer().Serialize(state), "@uid", playerId, "@quest", attempt.QuestId, "@attempt", attempt.AttemptId, "@version", attempt.Version);
                if (stored != 1) throw new InvalidOperationException("Gate historical progress was not stored.");
                changed = true;
            }
            if (changed)
                tx.Execute("INSERT INTO site_quest_revisions (player_id,revision) VALUES (@uid,1) ON DUPLICATE KEY UPDATE revision=revision+1", "@uid", playerId);
            return changed;
        }
        private static HistoricalAttempt ReadHistoricalGateAttempt(DataRow row)
        {
            try
            {
                var state = HistoricalDict(HistoricalSerializer().DeserializeObject(Convert.ToString(row["progress_json"], CultureInfo.InvariantCulture)));
                string attemptId = Convert.ToString(row["attempt_id"], CultureInfo.InvariantCulture);
                if (attemptId.Length != 32 || HistoricalText(state, "attempt_id") != attemptId) return null;
                var definition = HistoricalDict(HistoricalSerializer().DeserializeObject(Convert.ToString(row["definition_json"], CultureInfo.InvariantCulture)));
                var variants = HistoricalDict(HistoricalGet(definition, "variants"));
                string company = ((int)HistoricalNumber(state, "variant_company")).ToString(CultureInfo.InvariantCulture);
                var variant = HistoricalDict(HistoricalGet(variants, company));
                if (!HistoricalBool(variant, "enabled") || HistoricalText(state, "definition_sha256") != HistoricalText(variant, "definition_sha256") || HistoricalUnsupported(variant).Count != 0) return null;
                var attempt = new HistoricalAttempt { QuestId = Convert.ToInt32(row["quest_id"]), AttemptId = attemptId,
                    Version = Convert.ToInt64(row["state_version"]), Variant = variant, State = state, Root = HistoricalDict(HistoricalGet(variant, "ast")) };
                IndexHistoricalNodes(attempt.Root, attempt.Index); RefreshHistoricalActive(attempt);
                return attempt.Index.ContainsKey("galaxy_gate_complete") || attempt.Index.ContainsKey("complete_galaxy_gate") ? attempt : null;
            }
            // A malformed unrelated quest cannot imprison a completed Gate.
            // SQL failures are intentionally outside this block and still roll
            // back a legitimate completion, preserving it for retry.
            catch (ArgumentException) { return null; }
            catch (FormatException) { return null; }
            catch (InvalidOperationException) { return null; }
            catch (OverflowException) { return null; }
        }
    }
}
