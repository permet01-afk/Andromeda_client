using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Web.Script.Serialization;

namespace OrbitReborn_Emulator.Game.Quests
{
    // The historical namespace is an extension of the existing quest progress
    // service and existing player-quest rows. It never writes Havok/Weekly rows.
    internal static partial class QuestObjectiveProgress
    {
        internal sealed class HistoricalEvent
        {
            public string Kind, Target, Variant, Weapon, EventKey;
            public int MapId, Faction, TargetFaction, TargetShip, PlayerShip, AmmoId, TargetId;
            public double Amount, ElapsedSeconds, FromX, FromY, X, Y, HpFraction;
            public bool Cloaked, Eligible = true, Enemy, IsLethal;
            public long At;
        }

        internal sealed class HistoricalAttempt
        {
            public int QuestId;
            public long Version, LastPersistedAt, Generation;
            public bool Dirty, CriticalDirty;
            public string AttemptId, Code;
            public Dictionary<string, object> Variant, Root, State;
            public readonly Dictionary<string, List<Dictionary<string, object>>> Index = new Dictionary<string, List<Dictionary<string, object>>>(StringComparer.Ordinal);
            public HashSet<string> ActiveIds = new HashSet<string>(StringComparer.Ordinal);
        }

        private sealed partial class HistoricalPlayer
        {
            public readonly object Sync = new object();
            public readonly object Writer = new object();
            public QuestWriteBatch PendingWrite;
            public bool Loaded, Retiring;
            public int ReloadQueued;
            public long Revision = -1, LastTick, LastRevisionPoll, LastNotice, SnapshotSerial;
            public Exception LastFailure;
            public Session Owner;
            public List<HistoricalAttempt> Attempts = new List<HistoricalAttempt>();
        }

        private static readonly ConcurrentDictionary<int, HistoricalPlayer> HistoricalPlayers = new ConcurrentDictionary<int, HistoricalPlayer>();
        private static readonly object HistoricalFeatureSync = new object();
        private static volatile bool HistoricalFeature;
        private static volatile bool HistoricalFeatureKnown;
        private static int HistoricalFeaturePolling;
        private static long HistoricalFeatureChecked;
        private static Timer HistoricalTimer;
        private static int HistoricalTimerBusy;
        private static long HistoricalEvents, HistoricalLoads, HistoricalUpdates, HistoricalRevisionReads, HistoricalCasConflicts;
        private static long HistoricalLastError;

        internal static Dictionary<string, object> HistoricalDict(object value)
        {
            return value as Dictionary<string, object> ?? new Dictionary<string, object>(StringComparer.Ordinal);
        }
        internal static object HistoricalGet(Dictionary<string, object> value, string key)
        {
            object result; return value != null && value.TryGetValue(key, out result) ? result : null;
        }
        internal static string HistoricalText(Dictionary<string, object> value, string key, string fallback = "")
        {
            object v = HistoricalGet(value, key); return v == null ? fallback : Convert.ToString(v, CultureInfo.InvariantCulture);
        }
        internal static double HistoricalNumber(Dictionary<string, object> value, string key, double fallback = 0)
        {
            object v = HistoricalGet(value, key); if (v == null) return fallback;
            double n; return double.TryParse(Convert.ToString(v, CultureInfo.InvariantCulture), NumberStyles.Float, CultureInfo.InvariantCulture, out n) && !double.IsNaN(n) && !double.IsInfinity(n) ? n : fallback;
        }
        internal static bool HistoricalBool(Dictionary<string, object> value, string key)
        {
            object v = HistoricalGet(value, key); return v is bool && (bool)v;
        }
        internal static List<object> HistoricalList(object value)
        {
            var result = new List<object>(); var items = value as IEnumerable;
            if (items != null && !(value is string) && !(value is IDictionary)) foreach (object item in items) result.Add(item);
            return result;
        }
        private static JavaScriptSerializer HistoricalSerializer()
        {
            return new JavaScriptSerializer { MaxJsonLength = 16 * 1024 * 1024, RecursionLimit = 128 };
        }
        private static long HistoricalNow() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }
        private static Dictionary<string, object> HistoricalStateMap(Dictionary<string, object> state, string name)
        {
            var map = HistoricalGet(state, name) as Dictionary<string, object>;
            if (map == null) { map = new Dictionary<string, object>(StringComparer.Ordinal); state[name] = map; }
            return map;
        }

        public static void InitializeHistoricalProgress()
        {
            if (HistoricalTimer == null)
                HistoricalTimer = new Timer(HistoricalTick, null, 1000, 1000);
        }

        internal static bool HistoricalEnabled()
        {
            long now = HistoricalNow();
            if (now - Interlocked.Read(ref HistoricalFeatureChecked) < 5000) return HistoricalFeature;
            if (HistoricalFeatureKnown)
            {
                // A transient SQL outage must not suspend counters in an already
                // admitted session or hold a combat callback behind a feature poll.
                if (Interlocked.CompareExchange(ref HistoricalFeaturePolling, 1, 0) == 0)
                {
                    Interlocked.Exchange(ref HistoricalFeatureChecked, now);
                    ThreadPool.QueueUserWorkItem(unused =>
                    {
                        try { ReadHistoricalFeature(); }
                        finally { Volatile.Write(ref HistoricalFeaturePolling, 0); }
                    });
                }
                return HistoricalFeature;
            }
            return ReadHistoricalFeature();
        }

        private static bool ReadHistoricalFeature()
        {
            lock (HistoricalFeatureSync)
            {
                try
                {
                    using (var client = SqlDatabaseManager.GetClient("HistoricalQuest.Feature"))
                        HistoricalFeature = Convert.ToInt32(client.ExecuteScalar("SELECT COALESCE(MAX(enabled),0) FROM site_quest_features WHERE feature_key='historical_catalog'"), CultureInfo.InvariantCulture) == 1;
                    HistoricalFeatureKnown = true;
                }
                catch (Exception error) { HistoricalError(error); }
                Interlocked.Exchange(ref HistoricalFeatureChecked, HistoricalNow());
                return HistoricalFeature;
            }
        }

        private static void HistoricalError(Exception error)
        {
            long now = HistoricalNow(), previous = Interlocked.Read(ref HistoricalLastError);
            if (now - previous > 10000 && Interlocked.CompareExchange(ref HistoricalLastError, now, previous) == previous)
                Output.WriteLine("[HistoricalQuest] " + error.Message, OutputLevel.Warning);
        }

        private static HistoricalEvent HistoricalContext(Session session, string kind)
        {
            var c = session.CharacterInfo;
            return new HistoricalEvent { Kind = kind, At = HistoricalNow(), MapId = c.MapId, Faction = c.FactionId, PlayerShip = c.ShipId,
                X = c.LocX, Y = c.LocY, FromX = c.LocX, FromY = c.LocY, Cloaked = c.Invisible == 1,
                HpFraction = c.ShipMaxHp > 0 ? (double)c.ShipHp / c.ShipMaxHp : 0 };
        }

        private static void HistoricalTick(object unused)
        {
            if (Interlocked.Exchange(ref HistoricalTimerBusy, 1) != 0) return;
            try
            {
                ScheduleOrdinaryQuestSaves(HistoricalNow());
                if (!HistoricalEnabled()) return;
                OrbitReborn_Emulator.Game.Maps.Collectables.NaturalOre.TickWorld(HistoricalNow());
                foreach (Session session in SessionManager.SessionsUser.Values)
                {
                    if (session == null || session.CharacterInfo == null || session.IsChat || !session.GameplayReady) continue;
                    var evt = HistoricalContext(session, "tick");
                    ProcessHistoricalEvent(session, evt, false);
                }
            }
            catch (Exception error) { HistoricalError(error); }
            finally { Volatile.Write(ref HistoricalTimerBusy, 0); }
        }

        // Writer serializes SQL and lifecycle reloads; Sync only protects RAM.
        // A poll never makes an already loaded event wait for a slow SQL writer.
        private static bool EnsureHistoricalLoaded(Session session, HistoricalPlayer player, bool force)
        {
            bool loaded, due, blockingReload;
            lock (player.Sync)
            {
                loaded = player.Loaded && player.Owner == session;
                blockingReload = LegacyNeedsReloadLocked(player);
                due = force || !loaded || player.Revision < 0 || blockingReload || HistoricalNow() - player.LastRevisionPoll >= 5000;
                if (!due) return true;
            }
            if (loaded && !force && !blockingReload)
            {
                if (Interlocked.CompareExchange(ref player.ReloadQueued, 1, 0) == 0)
                    ThreadPool.QueueUserWorkItem(unused =>
                    {
                        bool borrowed = false;
                        try
                        {
                            if (!(borrowed = Monitor.TryEnter(player.Writer))) return;
                            lock (player.Sync)
                            {
                                HistoricalPlayer current;
                                if (!HistoricalPlayers.TryGetValue(session.CharacterId, out current) || !Object.ReferenceEquals(current, player) || player.Owner != session || player.Retiring) return;
                            }
                            RefreshHistoricalLocked(session, player, false);
                        }
                        catch (Exception error) { lock (player.Sync) player.LastFailure = error; HistoricalError(error); }
                        finally { if (borrowed) Monitor.Exit(player.Writer); Volatile.Write(ref player.ReloadQueued, 0); }
                    });
                return true;
            }
            bool entered = false;
            try
            {
                if (force || !loaded || blockingReload) { Monitor.Enter(player.Writer); entered = true; }
                else if (!(entered = Monitor.TryEnter(player.Writer))) return true;
                return RefreshHistoricalLocked(session, player, force);
            }
            finally { if (entered) Monitor.Exit(player.Writer); }
        }

        // Historical name retained for internal callers; no Sync is held here.
        private static bool RefreshHistoricalLocked(Session session, HistoricalPlayer player, bool force)
        {
            if (Monitor.IsEntered(player.Sync)) throw new InvalidOperationException("Quest SQL reload cannot hold the progress lock.");
            long now = HistoricalNow(), previousRevision;
            bool ownerChanged;
            lock (player.Sync) { previousRevision = player.Revision; ownerChanged = player.Owner != session; }
            long revision;
            using (var client = SqlDatabaseManager.GetClient("HistoricalQuest.Revision"))
            {
                client.SetParameter("id", session.CharacterId);
                object scalar = client.ExecuteScalar("SELECT revision FROM site_quest_revisions WHERE player_id=@id LIMIT 1");
                revision = scalar == null || scalar == DBNull.Value ? 0 : Convert.ToInt64(scalar, CultureInfo.InvariantCulture);
            }
            Interlocked.Increment(ref HistoricalRevisionReads);
            lock (player.Sync)
            {
                player.LastRevisionPoll = now;
                if (!force && !ownerChanged && player.Loaded && revision == player.Revision && !LegacyNeedsReloadLocked(player)) return true;
            }
            // Reconcile a prior uncertain commit before replacing any cache.
            // Events may still arrive during SQL. Drain and retry rather than
            // overwriting a generation which was admitted after the snapshot.
            for (int retry = 0; retry < 8; retry++)
            {
                if (!FlushQuestPlayerWithWriter(session.CharacterId, player, true)) return false;
            var attempts = new List<HistoricalAttempt>();
            using (var client = SqlDatabaseManager.GetClient("HistoricalQuest.Active"))
            {
                client.SetParameter("id", session.CharacterId);
                DataTable rows = client.ExecuteQueryTable("SELECT pq.quest_id,pq.attempt_id,pq.state_version,pq.progress_json,q.code,q.definition_json FROM site_player_quests pq INNER JOIN site_quests q ON q.id=pq.quest_id WHERE pq.player_id=@id AND pq.status='in_progress' AND q.source_domain='historical' AND q.enabled=1");
                foreach (DataRow row in rows.Rows)
                {
                    string attemptId = Convert.ToString(row["attempt_id"], CultureInfo.InvariantCulture);
                    if (attemptId.Length != 32 || row["progress_json"] == DBNull.Value) continue;
                    var state = HistoricalDict(HistoricalSerializer().DeserializeObject(Convert.ToString(row["progress_json"], CultureInfo.InvariantCulture)));
                    if (HistoricalText(state, "attempt_id") != attemptId) continue;
                    var definition = HistoricalDict(HistoricalSerializer().DeserializeObject(Convert.ToString(row["definition_json"], CultureInfo.InvariantCulture)));
                    var variants = HistoricalDict(HistoricalGet(definition, "variants"));
                    string company = Convert.ToInt32(HistoricalNumber(state, "variant_company", session.CharacterInfo.FactionId)).ToString(CultureInfo.InvariantCulture);
                    var variant = HistoricalDict(HistoricalGet(variants, company));
                    if (variant.Count == 0 || !HistoricalBool(variant, "enabled")) continue;
                    var attempt = new HistoricalAttempt { QuestId = Convert.ToInt32(row["quest_id"]), AttemptId = attemptId,
                        Code = Convert.ToString(row["code"], CultureInfo.InvariantCulture), LastPersistedAt = now,
                        Version = Convert.ToInt64(row["state_version"]), State = state, Variant = variant, Root = HistoricalDict(HistoricalGet(variant, "ast")) };
                    if (HistoricalText(state, "definition_sha256") != HistoricalText(variant, "definition_sha256") || HistoricalText(variant, "definition_sha256").Length != 64)
                        { state["failed_reason"] = "definition_changed"; attempt.Dirty = true; attempt.Generation++; }
                    HistoricalStateMap(state, "nodes"); HistoricalStateMap(state, "sequence"); HistoricalStateMap(state, "node_started_at_unix");
                    var unsupported = HistoricalUnsupported(variant);
                    if (unsupported.Count > 0) { state["failed_reason"] = "unsupported_definition:" + string.Join(",", unsupported); attempt.Dirty = true; attempt.Generation++; }
                    IndexHistoricalNodes(attempt.Root, attempt.Index); RefreshHistoricalActive(attempt);
                    attempts.Add(attempt);
                }
            }

                LoadLegacyProgress(session, player);
                lock (player.Sync)
                {
                    if (HasQuestDirtyLocked(player)) continue;
                    player.Attempts = attempts; player.Revision = revision; player.LastFailure = null;
                    player.Loaded = true;
                    if (player.Owner != session) { player.Owner = session; player.Retiring = false; player.LastTick = now; player.SnapshotSerial = 0; }
                    foreach (HistoricalAttempt attempt in attempts) if (attempt.Dirty) MarkQuestDirty(session.CharacterId, player);
                    Interlocked.Increment(ref HistoricalLoads);
                }
                if (previousRevision >= 0)
                {
                    session.CharacterInfo.RefreshQuestRewardData();
                    session.CharacterInfo.RefreshHistoricalQuestCargo();
                }
                return true;
            }
            throw new InvalidOperationException("Quest reload retained concurrent unsaved progress; retry is required.");
        }

        private static void IndexHistoricalNodes(Dictionary<string, object> node, Dictionary<string, List<Dictionary<string, object>>> index)
        {
            string action = HistoricalText(node, "action");
            if (action.Length > 0)
            {
                List<Dictionary<string, object>> nodes;
                if (!index.TryGetValue(action, out nodes)) index[action] = nodes = new List<Dictionary<string, object>>();
                nodes.Add(node); return;
            }
            foreach (object child in HistoricalList(HistoricalGet(node, "children"))) IndexHistoricalNodes(HistoricalDict(child), index);
        }

        internal static bool HistoricalNodeCompleted(Dictionary<string, object> node, Dictionary<string, object> state)
        {
            string action = HistoricalText(node, "action");
            if (action.Length > 0)
                return HistoricalNumber(HistoricalStateMap(state, "nodes"), HistoricalText(node, "id")) >= HistoricalNumber(node, "quantity", double.MaxValue);
            var children = HistoricalList(HistoricalGet(node, "children"));
            if (children.Count == 0) return false;
            int completed = children.Count(c => HistoricalNodeCompleted(HistoricalDict(c), state));
            string op = HistoricalText(node, "op", "and");
            if (op == "or") return completed > 0;
            if (op == "n_of_m") return completed >= Math.Max(1, (int)HistoricalNumber(node, "required_children", children.Count));
            return completed == children.Count;
        }

        private static void HistoricalActive(Dictionary<string, object> node, Dictionary<string, object> state, HashSet<string> active)
        {
            if (HistoricalNodeCompleted(node, state)) return;
            if (HistoricalText(node, "action").Length > 0) { active.Add(HistoricalText(node, "id")); return; }
            var children = HistoricalList(HistoricalGet(node, "children"));
            string op = HistoricalText(node, "op", "and");
            if (op == "sequence")
            {
                int cursor = 0;
                while (cursor < children.Count && HistoricalNodeCompleted(HistoricalDict(children[cursor]), state)) cursor++;
                HistoricalStateMap(state, "sequence")[HistoricalText(node, "id")] = cursor;
                if (cursor < children.Count) HistoricalActive(HistoricalDict(children[cursor]), state, active);
            }
            else foreach (object child in children) HistoricalActive(HistoricalDict(child), state, active);
        }

        private static void RefreshHistoricalActive(HistoricalAttempt attempt)
        {
            attempt.ActiveIds.Clear(); HistoricalActive(attempt.Root, attempt.State, attempt.ActiveIds);
        }

        internal static bool ProcessHistoricalAttempt(HistoricalAttempt attempt, HistoricalEvent evt)
        {
            var state = attempt.State;
            if (HistoricalBool(state, "completed") || HistoricalGet(state, "failed_reason") != null) return false;
            bool changed = false;
            if ((int)HistoricalNumber(state, "variant_company", evt.Faction) != evt.Faction)
                return HistoricalFail(state, "company_changed");
            var constraints = HistoricalDict(HistoricalGet(attempt.Variant, "constraints"));
            double limit = HistoricalNumber(constraints, "time_limit_seconds");
            double started = HistoricalNumber(state, "started_at_unix");
            if (started > 0 && evt.At < started) return false; // An earlier admitted event cannot belong to a later acceptance.
            if (limit > 0 && started > 0 && evt.At - started >= limit * 1000)
                return HistoricalFail(state, "time_limit");
            if (evt.Kind == "death" && HistoricalText(state, "last_death_event") != evt.EventKey)
            {
                state["last_death_event"] = evt.EventKey; state["deaths"] = HistoricalNumber(state, "deaths") + 1; changed = true;
                if (HistoricalBool(constraints, "no_death") || (HistoricalGet(constraints, "max_deaths") != null && HistoricalNumber(state, "deaths") > HistoricalNumber(constraints, "max_deaths")))
                    return HistoricalFail(state, "death_constraint");
            }
            if (evt.Kind == "damage_received" && evt.Amount > 0)
            {
                state["damage_received"] = HistoricalNumber(state, "damage_received") + evt.Amount; changed = true;
                if (HistoricalGet(constraints, "max_damage_received") != null && HistoricalNumber(state, "damage_received") > HistoricalNumber(constraints, "max_damage_received"))
                    return HistoricalFail(state, "damage_limit");
            }
            if (evt.Kind == "weapon")
            {
                if (HistoricalBool(constraints, "no_fire")) return HistoricalFail(state, "weapon_prohibited");
                string weapon = HistoricalText(constraints, "required_weapon");
                if (weapon.Length > 0 && !HistoricalWeaponMatches(weapon, evt)) return HistoricalFail(state, "wrong_weapon");
            }
            if (evt.Kind == "movement" && evt.Amount > 0 && HistoricalBool(constraints, "no_movement"))
                return HistoricalFail(state, "movement_prohibited");
            if (evt.Kind == "kill_player" && evt.Enemy)
            {
                state["player_kills"] = HistoricalNumber(state, "player_kills") + 1; changed = true;
                if (HistoricalGet(constraints, "max_player_kills") != null && HistoricalNumber(state, "player_kills") > HistoricalNumber(constraints, "max_player_kills"))
                    return HistoricalFail(state, "player_kill_limit");
            }
            if ((evt.Kind == "kill_npc" || (evt.Kind == "damage_npc" && evt.IsLethal)) && (evt.Variant ?? "normal") == "normal" && HistoricalNameIn(HistoricalGet(constraints, "prohibited_kill_targets"), evt.Target))
                return HistoricalFail(state, "prohibited_target_destroyed");
            string prohibitedDamage = HistoricalText(constraints, "prohibited_damage_target");
            if (evt.Kind == "damage_npc" && prohibitedDamage.Length > 0 && string.Equals(prohibitedDamage, evt.Target, StringComparison.OrdinalIgnoreCase))
                return HistoricalFail(state, "prohibited_target_damaged");

            int scoreIndex = 0;
            foreach (object rawScore in HistoricalList(HistoricalGet(attempt.Variant, "scoring")))
            {
                var score = HistoricalDict(rawScore); string kind = HistoricalText(score, "kind");
                var scores = HistoricalStateMap(state, "scoring"); string key = (scoreIndex++).ToString(CultureInfo.InvariantCulture);
                if (kind == "MAXIMIZE_NPC_KILLS" && evt.Kind == "kill_npc" && (evt.Variant ?? "normal") == "normal" && HistoricalNameIn(HistoricalGet(score, "target"), evt.Target))
                { scores[key] = HistoricalNumber(scores, key) + 1; changed = true; }
                else if (kind == "MINIMIZE_DAMAGE_RECEIVED" && evt.Kind == "damage_received")
                { scores[key] = HistoricalNumber(state, "damage_received"); changed = true; }
                else if (kind == "MIN_ELAPSED" && (evt.Kind == "tick" || evt.Kind == "kill_npc" || evt.Kind == "ore" || evt.Kind == "resource" || evt.Kind == "cargo_ore"))
                { scores[key] = Math.Max(0, (evt.At - started) / 1000.0); changed = true; }
            }

            // Continuous objectives count proven online time only. A disconnect
            // or an unverifiable server gap breaks an unfinished continuous stay.
            double previousServer = HistoricalNumber(state, "last_tick_at_unix");
            bool interrupted = evt.Kind == "disconnect" || (evt.Kind == "tick" && previousServer > 0 && evt.At - previousServer > 3000);
            if (evt.Kind == "tick") { state["last_tick_at_unix"] = evt.At; }
            List<Dictionary<string, object>> stays;
            if (attempt.Index.TryGetValue("stay_on_map", out stays))
            foreach (var stay in stays)
            {
                string stayId = HistoricalText(stay, "id");
                if (!attempt.ActiveIds.Contains(stayId)) continue;
                var values = HistoricalStateMap(state, "nodes");
                double value = HistoricalNumber(values, stayId);
                if (interrupted && HistoricalBool(stay, "continuous") && value > 0)
                { values[stayId] = 0; changed = true; }
                double absenceLimit = HistoricalNumber(stay, "max_absence_seconds");
                if (absenceLimit > 0 && (evt.Kind == "tick" || evt.Kind == "disconnect"))
                {
                    var presence = HistoricalStateMap(state, "last_presence_at_unix");
                    double lastPresence = HistoricalNumber(presence, stayId);
                    if (lastPresence > 0 && evt.At - lastPresence > absenceLimit * 1000)
                        return HistoricalFail(state, "absence_limit");
                    object presenceMaps = HistoricalGet(stay, "maps") ?? HistoricalGet(stay, "map") ?? HistoricalGet(stay, "target");
                    // Absence means leaving the sector, not cloaking inside it.
                    // No unproven deadline is imposed before the first entry.
                    if (evt.Kind == "tick" && HistoricalMapMatches(presenceMaps, evt.MapId, evt.Faction))
                    { presence[stayId] = evt.At; changed = true; }
                }
            }

            foreach (string action in HistoricalEventActions(evt.Kind))
            {
                List<Dictionary<string, object>> nodes;
                if (!attempt.Index.TryGetValue(action, out nodes)) continue;
                foreach (var node in nodes)
                {
                    string id = HistoricalText(node, "id");
                    if (!attempt.ActiveIds.Contains(id)) continue;
                    bool matches = HistoricalLeafMatches(node, evt);
                    var counters = HistoricalStateMap(state, "nodes");
                    double previous = HistoricalNumber(counters, id), required = HistoricalNumber(node, "quantity", double.MaxValue);
                    if (!matches)
                    {
                        if (evt.Kind == "tick" && HistoricalText(node, "action") == "stay_on_map" && HistoricalBool(node, "continuous") && previous > 0 && previous < required)
                        { counters[id] = 0; changed = true; }
                        continue;
                    }
                    double amount = evt.Amount;
                    if (action == "travel_radiation_zone") amount = HistoricalRadiationTravelDistance(evt.MapId, evt.FromX, evt.FromY, evt.X, evt.Y);
                    else if (action == "stay_on_map") amount = evt.ElapsedSeconds;
                    else if (action == "visit_map" || action == "visit_coordinates" || action == "galaxy_gate_complete") amount = 1;
                    else if (evt.Kind == "cargo_box") amount = 1;
                    double next = Math.Min(required, previous + Math.Max(0, amount));
                    if (next > previous)
                    {
                        counters[id] = next; changed = true;
                        if (action == "visit_coordinates" || action == "visit_map" || (previous < required && next >= required)) attempt.CriticalDirty = true;
                    }
                }
            }
            if (changed)
            {
                state["last_server_unix_ms"] = evt.At;
                RefreshHistoricalActive(attempt);
                if (HistoricalNodeCompleted(attempt.Root, state)) { state["completed"] = true; state["completed_at_unix"] = evt.At; }
            }
            return changed;
        }

        private static bool HistoricalFail(Dictionary<string, object> state, string reason)
        {
            state["failed_reason"] = reason; state["completed"] = false; return true;
        }

        private static IEnumerable<string> HistoricalEventActions(string kind)
        {
            switch (kind)
            {
                case "tick": return new[] { "stay_on_map", "visit_map", "visit_coordinates" };
                case "movement": return new[] { "travel_distance", "travel_radiation_zone", "visit_coordinates", "visit_map" };
                case "ore": return new[] { "collect_ore", "collect_resource" };
                case "cargo_ore": return new[] { "collect_cargo_ore" };
                case "resource": return new[] { "collect_resource" };
                case "cargo_box": return new[] { "steal_player_cargo", "collect_cargo_box" };
                case "bonus_box": return new[] { "collect_bonus_box" };
                case "damage_npc": return new[] { "damage_npc", "assist_damage_npc" };
                case "damage_player": return new[] { "damage_player" };
                case "damage_received": return new[] { "take_damage" };
                case "gate": return new[] { "galaxy_gate_complete", "complete_galaxy_gate" };
                default: return new[] { kind };
            }
        }

        internal static bool HistoricalLeafMatches(Dictionary<string, object> node, HistoricalEvent evt)
        {
            string action = HistoricalText(node, "action");
            object maps = HistoricalGet(node, "maps") ?? HistoricalGet(node, "map");
            if (maps == null && (action == "stay_on_map" || action == "visit_map")) maps = HistoricalGet(node, "target");
            if (maps != null && !HistoricalMapMatches(maps, evt.MapId, evt.Faction)) return false;
            object cloak = HistoricalGet(node, "cloaked");
            if (cloak is bool && (bool)cloak != evt.Cloaked) return false;
            if (HistoricalGet(node, "hp_fraction_max") != null && evt.HpFraction >= HistoricalNumber(node, "hp_fraction_max")) return false;
            string playerShip = HistoricalText(node, "player_ship");
            if (playerShip.Length > 0 && !HistoricalShipMatches(playerShip, evt.PlayerShip)) return false;
            string weapon = HistoricalText(node, "required_weapon");
            if (weapon.Length > 0 && !HistoricalWeaponMatches(weapon, evt)) return false;
            if (action == "visit_coordinates")
            {
                var point = HistoricalList(HistoricalGet(node, "coordinates"));
                double radius = HistoricalNumber(node, "radius", -1);
                if (point.Count < 2 || radius < 0) return false; // Never invent a historical radius.
                double x = Convert.ToDouble(point[0], CultureInfo.InvariantCulture) * 100, y = Convert.ToDouble(point[1], CultureInfo.InvariantCulture) * 100;
                return HistoricalSegmentDistanceSquared(evt.FromX, evt.FromY, evt.X, evt.Y, x, y) <= radius * radius;
            }
            if (action == "visit_map" || action == "stay_on_map") return evt.Kind == "tick" || evt.Kind == "movement";
            if (action == "travel_distance") return evt.Kind == "movement";
            if (action == "travel_radiation_zone") return evt.Kind == "movement" && HistoricalRadiationTravelDistance(evt.MapId, evt.FromX, evt.FromY, evt.X, evt.Y) > 0;
            if (action == "take_damage") return evt.Kind == "damage_received";
            if (action == "steal_player_cargo")
            {
                if (evt.Kind != "cargo_box" || evt.TargetId <= 0 || !evt.Enemy || !evt.Eligible) return false;
                object ships = HistoricalGet(node, "ships");
                return ships == null || HistoricalList(ships).Any(x => HistoricalShipMatches(Convert.ToString(x), evt.TargetShip));
            }
            if (action == "collect_bonus_box") return evt.Kind == "bonus_box";
            if (action == "collect_cargo_box") return evt.Kind == "cargo_box";
            if (action == "collect_ore" || action == "collect_cargo_ore" || action == "collect_resource")
                return string.Equals(HistoricalText(node, "target"), evt.Target, StringComparison.OrdinalIgnoreCase);
            if (action == "galaxy_gate_complete" || action == "complete_galaxy_gate")
                return string.Equals(HistoricalText(node, "target"), evt.Target, StringComparison.OrdinalIgnoreCase);
            if (action == "kill_player" || action == "damage_player")
            {
                if (!evt.Eligible || !evt.Enemy) return false;
                string company = HistoricalText(node, "target_company");
                int targetCompany = HistoricalFactionId(company);
                if (targetCompany > 0 && evt.TargetFaction != targetCompany) return false;
                object ships = HistoricalGet(node, "ships");
                if (ships != null && !HistoricalList(ships).Any(x => HistoricalShipMatches(Convert.ToString(x), evt.TargetShip))) return false;
                string target = HistoricalText(node, "target");
                foreach (string ship in new[] { "Phoenix", "Leonov", "Liberator", "Piranha", "Nostromo", "Vengeance", "BigBoy", "Goliath" })
                    if (target.IndexOf(ship, StringComparison.OrdinalIgnoreCase) >= 0 && !HistoricalShipMatches(ship, evt.TargetShip)) return false;
                int fromTarget = target.IndexOf("EIC", StringComparison.OrdinalIgnoreCase) >= 0 ? 2 : target.IndexOf("VRU", StringComparison.OrdinalIgnoreCase) >= 0 ? 3 : target.IndexOf("MMO", StringComparison.OrdinalIgnoreCase) >= 0 ? 1 : 0;
                return fromTarget == 0 || fromTarget == evt.TargetFaction;
            }
            if (action == "kill_npc" || action == "damage_npc" || action == "assist_damage_npc")
            {
                if (!evt.Eligible) return false;
                object targets = HistoricalGet(node, "targets") ?? HistoricalGet(node, "target");
                if (!HistoricalNameIn(targets, evt.Target)) return false;
                string variant = HistoricalText(node, "variant", "normal");
                if (variant.Length == 0) variant = "normal";
                return string.Equals(variant, evt.Variant ?? "normal", StringComparison.OrdinalIgnoreCase);
            }
            return false;
        }

        internal static bool HistoricalMapMatches(object expression, int mapId, int faction)
        {
            if (!(expression is string)) return HistoricalList(expression).Any(x => HistoricalMapMatches(x, mapId, faction));
            string map = ((string)expression).Trim().Replace(" map", "").Replace("own ", "").Replace("own_", "");
            if (map.Contains(",")) return map.Split(',').Any(x => HistoricalMapMatches(x.Trim(), mapId, faction));
            int actualFaction, suffix; HistoricalMapParts(mapId, out actualFaction, out suffix);
            if (map == "PvP_maps" || map == "4-X") return mapId >= 13 && mapId <= 16;
            if (map == "MMO_territory") return actualFaction == 1;
            if (map == "EIC_territory") return actualFaction == 2;
            if (map == "VRU_territory") return actualFaction == 3;
            if (map == "enemy_home_maps" || map == "one_enemy_X-1" || map == "enemy_home") return suffix == 1 && actualFaction > 0 && actualFaction != faction;
            bool enemy = map.StartsWith("enemy_", StringComparison.Ordinal) || map.StartsWith("enemy ", StringComparison.Ordinal) || map.StartsWith("each_enemy_", StringComparison.Ordinal);
            string relative = map.Replace("each_enemy_", "").Replace("enemy_", "").Replace("enemy ", "");
            if (relative.StartsWith("X-", StringComparison.Ordinal))
            {
                int wanted; return int.TryParse(relative.Substring(2), out wanted) && suffix == wanted && actualFaction > 0 && (enemy ? actualFaction != faction : actualFaction == faction);
            }
            string[] pair = map.Split('-'); int a, b;
            if (pair.Length == 2 && int.TryParse(pair[0], out a) && int.TryParse(pair[1], out b))
                return a == 4 ? mapId == (b <= 4 ? 12 + b : b == 5 ? 29 : -1) : actualFaction == a && suffix == b;
            return false;
        }

        internal static void HistoricalMapParts(int mapId, out int faction, out int suffix)
        {
            faction = suffix = 0;
            if (mapId >= 1 && mapId <= 12) { faction = (mapId - 1) / 4 + 1; suffix = (mapId - 1) % 4 + 1; }
            if (mapId >= 17 && mapId <= 28) { faction = (mapId - 17) / 4 + 1; suffix = (mapId - 17) % 4 + 5; }
        }
        private static int HistoricalFactionId(string value)
        {
            switch ((value ?? "").ToUpperInvariant()) { case "MMO": case "1": return 1; case "EIC": case "2": return 2; case "VRU": case "3": return 3; default: return 0; }
        }
        internal static bool HistoricalShipMatches(string name, int shipId)
        {
            shipId = DroneRules.NormalizeShip(shipId);
            switch ((name ?? "").Replace(" ", "").ToLowerInvariant())
            { case "phoenix": return shipId == 1; case "yamato": return shipId == 2; case "leonov": return shipId == 3; case "defcom": return shipId == 4; case "liberator": return shipId == 5; case "piranha": return shipId == 6; case "nostromo": return shipId == 7; case "bigboy": return shipId == 9; case "vengeance": return shipId == 8; case "goliath": return shipId == 10; default: return false; }
        }
        private static bool HistoricalWeaponMatches(string rule, HistoricalEvent evt)
        {
            string value = rule.ToLowerInvariant();
            if (value == "rockets" || value == "rocket") return evt.Weapon == "rocket" || evt.Weapon == "rockets";
            if (value == "laser" || value == "lasers") return evt.Weapon == "laser";
            if (value == "x-1 laser") return evt.Weapon == "laser" && evt.AmmoId == 1;
            if (value == "x-2 laser") return evt.Weapon == "laser" && evt.AmmoId == 2;
            return false;
        }
        private static bool HistoricalNameIn(object values, string value)
        {
            if (values == null || string.IsNullOrEmpty(value)) return false;
            if (values is string) return string.Equals((string)values, value, StringComparison.Ordinal);
            return HistoricalList(values).Any(x => string.Equals(Convert.ToString(x), value, StringComparison.Ordinal));
        }
        internal static double HistoricalSegmentDistanceSquared(double ax, double ay, double bx, double by, double px, double py)
        {
            double dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
            double t = length > 0 ? Math.Max(0, Math.Min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
            double x = ax + t * dx - px, y = ay + t * dy - py; return x * x + y * y;
        }

        private static bool HistoricalEventAdmitted(Session session, HistoricalEvent context)
        {
            if (context.Kind == "movement") return HistoricalMovementReady(session);
            return session.GameplayReady || context.Kind == "sync" || context.Kind == "checkpoint" || context.Kind == "disconnect" || context.Kind == "death" || context.Kind == "gate";
        }

        private static bool ProcessHistoricalEvent(Session session, HistoricalEvent evt, bool realEvent = true)
        {
            if (session == null || session.CharacterInfo == null || session.IsChat || !HistoricalEventAdmitted(session, evt) || !HistoricalEnabled()) return false;
            HistoricalPlayer player = null;
            try
            {
                Interlocked.Increment(ref HistoricalEvents);
                while (true)
                {
                    player = HistoricalPlayers.GetOrAdd(session.CharacterId, id => new HistoricalPlayer());
                    lock (player.Sync)
                    {
                        if (!HistoricalEventAdmitted(session, evt))
                        {
                            if (player.Owner == null && !HasQuestDirtyLocked(player)) RemoveHistoricalPlayerIfSame(session.CharacterId, player);
                            return false;
                        }
                    }
                    if (!EnsureHistoricalLoaded(session, player, evt.Kind == "sync")) return false;
                    bool any = false, critical = evt.Kind == "sync" || evt.Kind == "checkpoint" || evt.Kind == "disconnect" || evt.Kind == "death" || evt.Kind == "gate";
                    lock (player.Sync)
                    {
                        HistoricalPlayer inserted;
                        if (!HistoricalPlayers.TryGetValue(session.CharacterId, out inserted) || !Object.ReferenceEquals(inserted, player)) continue;
                        if (player.Owner != session || !HistoricalEventAdmitted(session, evt))
                        {
                            if (player.Owner == null && !HasQuestDirtyLocked(player)) RemoveHistoricalPlayerIfSame(session.CharacterId, player);
                            return false;
                        }
                        if (player.Retiring && evt.Kind != "disconnect" && evt.Kind != "checkpoint") return false;
                        if (evt.Kind == "tick")
                        {
                            long gap = evt.At - player.LastTick;
                            evt.ElapsedSeconds = player.LastTick > 0 && gap <= 3000 ? Math.Max(0, Math.Min(2, gap / 1000.0)) : 0;
                            player.LastTick = evt.At;
                        }
                        foreach (HistoricalAttempt attempt in player.Attempts)
                        {
                            bool changed = ProcessHistoricalAttempt(attempt, evt);
                            if (changed) { attempt.Dirty = true; attempt.Generation++; any = true; }
                            critical = critical || (attempt.Dirty && HistoricalRequiresPersist(attempt, evt));
                        }
                        if (HasQuestDirtyLocked(player)) MarkQuestDirty(session.CharacterId, player);
                        // A real counter is visible before ordinary disk I/O.
                        if (critical || evt.At - player.LastNotice >= 1000)
                        { player.LastNotice = evt.At; PublishHistoricalState(session, player, evt); }
                    }
                    if (critical)
                    {
                        if (!FlushQuestPlayer(session.CharacterId, player, true)) return false;
                        lock (player.Sync) PublishHistoricalState(session, player, evt);
                    }
                    return any;
                }
            }
            catch (Exception error)
            {
                if (player != null) lock (player.Sync) { player.LastFailure = error; if (HasQuestDirtyLocked(player)) MarkQuestDirty(session.CharacterId, player); }
                HistoricalError(error); return false;
            }
        }

        private static string HistoricalBlockedReason(Dictionary<string, object> node, HistoricalAttempt attempt, HistoricalEvent context)
        {
            string id = HistoricalText(node, "id");
            if (HistoricalNodeCompleted(node, attempt.State)) return "completed";
            if (!attempt.ActiveIds.Contains(id)) return "inactive_step";
            object maps = HistoricalGet(node, "maps") ?? HistoricalGet(node, "map");
            string action = HistoricalText(node, "action");
            if (maps == null && (action == "stay_on_map" || action == "visit_map")) maps = HistoricalGet(node, "target");
            if (maps != null && !HistoricalMapMatches(maps, context.MapId, context.Faction)) return "wrong_map";
            object cloak = HistoricalGet(node, "cloaked");
            if (cloak is bool && (bool)cloak != context.Cloaked) return (bool)cloak ? "cloak_required" : "uncloaked_required";
            if (HistoricalGet(node, "hp_fraction_max") != null && context.HpFraction >= HistoricalNumber(node, "hp_fraction_max")) return "hp_above_limit";
            return null;
        }

        internal static bool HistoricalRequiresPersist(HistoricalAttempt attempt, HistoricalEvent context)
        {
            if (!attempt.Dirty) return false;
            bool lifecycleCheckpoint = context.Kind == "sync" || context.Kind == "checkpoint" || context.Kind == "disconnect" || context.Kind == "death" || context.Kind == "gate";
            return lifecycleCheckpoint || attempt.CriticalDirty || HistoricalBool(attempt.State, "completed") || HistoricalGet(attempt.State, "failed_reason") != null;
        }

        private static string BuildHistoricalState(HistoricalPlayer player, HistoricalEvent context)
        {
            var missions = new List<object>();
            foreach (HistoricalAttempt attempt in player.Attempts)
            {
                var nodes = new List<object>();
                foreach (var node in attempt.Index.Values.SelectMany(x => x))
                {
                    string id = HistoricalText(node, "id");
                    nodes.Add(new { id = id, current = HistoricalNumber(HistoricalStateMap(attempt.State, "nodes"), id),
                        required = HistoricalNumber(node, "quantity"), active = attempt.ActiveIds.Contains(id),
                        completed = HistoricalNodeCompleted(node, attempt.State), blocked_reason = HistoricalBlockedReason(node, attempt, context) });
                }
                double elapsed = Math.Max(0, (context.At - HistoricalNumber(attempt.State, "started_at_unix", context.At)) / 1000.0);
                double limit = HistoricalNumber(HistoricalDict(HistoricalGet(attempt.Variant, "constraints")), "time_limit_seconds");
                missions.Add(new { code = attempt.Code, attempt_id = attempt.AttemptId,
                    definition_sha256 = HistoricalText(attempt.State, "definition_sha256"), state_version = attempt.Version,
                    completed = HistoricalBool(attempt.State, "completed"), failed_reason = HistoricalGet(attempt.State, "failed_reason"),
                    nodes = nodes, sequence = HistoricalStateMap(attempt.State, "sequence"), scoring = HistoricalStateMap(attempt.State, "scoring"),
                    timing = new { elapsed_seconds = elapsed, time_remaining_seconds = limit > 0 ? (object)Math.Max(0, limit - elapsed) : null } });
            }
            return HistoricalSerializer().Serialize(new { schema_version = 1, server_time_ms = context.At,
                serial = ++player.SnapshotSerial, missions = missions, legacy = BuildLegacyStateLocked(player) });
        }
        private static void PublishHistoricalState(Session session, HistoricalPlayer player, HistoricalEvent context)
        {
            session.SendData(PacketComposer.Compose("QST", "STATE|" + BuildHistoricalState(player, context)));
        }

        public static void RefreshHistoricalProgress(Session session)
        {
            if (session == null || session.CharacterInfo == null) return;
            HistoricalPlayer player;
            if (HistoricalPlayers.TryGetValue(session.CharacterId, out player)) lock (player.Sync) player.Revision = -1;
            ProcessHistoricalEvent(session, HistoricalContext(session, "sync"), false);
        }
        public static void CheckpointHistoricalProgress(Session session)
        {
            if (session != null && session.CharacterInfo != null)
            {
                ProcessHistoricalEvent(session, HistoricalContext(session, "checkpoint"), false);
                RequireHistoricalProgressPersisted(session);
            }
        }
        private static void RequireHistoricalProgressPersisted(Session session)
        {
            HistoricalPlayer player;
            if (HistoricalPlayers.TryGetValue(session.CharacterId, out player))
                lock (player.Sync)
                    if (player.Owner == session && (player.Revision < 0 || HasQuestDirtyLocked(player)))
                        throw new InvalidOperationException("Historical quest checkpoint was not persisted; dirty state is retained for retry.", player.LastFailure);
        }
        private static void RemoveHistoricalPlayerIfSame(int characterId, HistoricalPlayer player)
        {
            // GetOrAdd may execute a losing factory. Only remove the actual
            // returned instance, never a replacement/new owner's cache by key.
            ((ICollection<KeyValuePair<int, HistoricalPlayer>>)HistoricalPlayers)
                .Remove(new KeyValuePair<int, HistoricalPlayer>(characterId, player));
        }
        public static void HistoricalDisconnected(Session session)
        {
            if (session == null || session.IsChat) return;
            HistoricalPlayer player;
            if (HistoricalPlayers.TryGetValue(session.CharacterId, out player) && player.Owner == session)
            {
                lock (player.Sync) if (player.Owner == session) player.Retiring = true;
                ProcessHistoricalEvent(session, HistoricalContext(session, "disconnect"));
                if (!FlushQuestPlayer(session.CharacterId, player, true))
                    throw new InvalidOperationException("Quest disconnect persistence failed; pending state is retained for retry.", player.LastFailure);
                RequireHistoricalProgressPersisted(session);
                lock (player.Sync)
                    if (player.Owner == session && !HasQuestDirtyLocked(player)) { RemoveHistoricalPlayerIfSame(session.CharacterId, player); RemoveQuestDirtyIfSame(session.CharacterId, player); }
            }
        }
        private static void HistoricalNpcIdentity(string raw, out string name, out string variant)
        {
            name = (raw ?? "").Trim().Replace("-=[", "").Replace("]=-", "").Trim(); variant = "normal";
            if (name.StartsWith("Boss ", StringComparison.Ordinal)) { variant = "Boss"; name = name.Substring(5); }
            else if (name.StartsWith("Uber ", StringComparison.Ordinal)) { variant = "Uber"; name = name.Substring(5); }
        }
        public static bool AddHistoricalNpcKill(Session session, string rawName, int mapId, Npc npc = null)
        {
            if (session == null || session.CharacterInfo == null) return false;
            string name, variant; HistoricalNpcIdentity(rawName, out name, out variant);
            var evt = HistoricalContext(session, "kill_npc"); evt.Target = name; evt.Variant = variant; evt.MapId = mapId; evt.Amount = 1;
            Tuple<long, string, int> hit;
            if (npc != null && npc.HistoricalWeapons.TryGetValue(session.CharacterId, out hit) && hit.Item1 == npc.SpawnSeq)
            { evt.Weapon = hit.Item2; evt.AmmoId = hit.Item3; }
            return ProcessHistoricalEvent(session, evt);
        }
        // Called only at the authoritative laser impact, under the victim's
        // existing impact lock. Metadata failure must not interrupt combat.
        internal static void CaptureHistoricalLethalPlayerWeapon(Session attacker, Session victim, GameplayDeathContext context, string weapon, int ammoId)
        {
            if (attacker == null || attacker.CharacterInfo == null || victim == null || victim.CharacterInfo == null || context == null) return;
            var info = victim.CharacterInfo;
            try
            {
                if (info.ShipHp > 0 || context.Cause != GameplayDeathCause.Pvp || !DroneWearService.IsPendingDeath(victim, context)) return;
                info.HistoricalLethalPlayerWeapon = Tuple.Create(context, attacker.CharacterId, weapon, ammoId);
            }
            catch (Exception) { info.HistoricalLethalPlayerWeapon = null; }
        }

        public static bool AddHistoricalPlayerKill(Session attacker, Session victim, bool rewardAsEnemy, bool sameGroup, bool sameRemote)
        {
            if (attacker == null || attacker.CharacterInfo == null || victim == null || victim.CharacterInfo == null) return false;
            var evt = HistoricalContext(attacker, "kill_player"); evt.Amount = 1; evt.TargetId = victim.CharacterId;
            evt.TargetFaction = victim.CharacterInfo.FactionId; evt.TargetShip = victim.CharacterInfo.ShipId;
            var info = victim.CharacterInfo; var hit = info.HistoricalLethalPlayerWeapon;
            if (hit != null && hit.Item1 != null && info.DeadCommitted && info.DroneDeathPublishing
                && ReferenceEquals(info.PendingDroneDeath, hit.Item1) && hit.Item1.Cause == GameplayDeathCause.Pvp
                && hit.Item1.SessionToken == victim.DroneGameplayToken && hit.Item1.MapId == info.MapId
                && hit.Item1.TdmLife == Interlocked.Read(ref victim.TdmLifeGeneration)
                && hit.Item1.LifeEpoch == Interlocked.Read(ref victim.DroneLifeEpoch) - 1)
            {
                info.HistoricalLethalPlayerWeapon = null;
                if (hit.Item2 == attacker.CharacterId) { evt.Weapon = hit.Item3; evt.AmmoId = hit.Item4; }
            }
            evt.Enemy = evt.TargetFaction > 0 && evt.TargetFaction != evt.Faction;
            evt.Eligible = rewardAsEnemy && evt.Enemy && attacker.CharacterId != victim.CharacterId && !sameGroup && !sameRemote
                && (attacker.CharacterInfo.ClanId <= 0 || attacker.CharacterInfo.ClanId != victim.CharacterInfo.ClanId);
            return ProcessHistoricalEvent(attacker, evt);
        }
        public static void AddHistoricalOre(Session session, long resourceId, int amount, bool natural)
        {
            if (session == null || session.CharacterInfo == null || amount <= 0) return;
            var evt = HistoricalContext(session, natural ? "ore" : "cargo_ore"); evt.Target = HistoricalOreName(resourceId); evt.Amount = amount;
            if (evt.Target.Length > 0) ProcessHistoricalEvent(session, evt);
        }
        public static void AddHistoricalResource(Session session, long resourceId, int amount)
        {
            if (session == null || session.CharacterInfo == null || amount <= 0) return;
            var evt = HistoricalContext(session, "resource"); evt.Target = HistoricalOreName(resourceId); evt.Amount = amount;
            if (evt.Target.Length > 0) ProcessHistoricalEvent(session, evt);
        }
        private static string HistoricalOreName(long id)
        {
            switch (id) { case 1: return "Prometium"; case 2: return "Endurium"; case 3: return "Terbium"; case 4: return "Xenomit"; case 11: return "Prometid"; case 12: return "Duranium"; case 13: return "Promerium"; case 14: return "Seprom"; default: return ""; }
        }
        public static void AddHistoricalCargoBox(Session session, int ownerId, int ownerFaction, int ownerShip)
        {
            if (session == null || session.CharacterInfo == null) return;
            var evt = HistoricalContext(session, "cargo_box"); evt.Amount = 1; evt.TargetId = ownerId; evt.TargetFaction = ownerFaction; evt.TargetShip = ownerShip;
            evt.Enemy = ownerId > 0 && ownerId != session.CharacterId && ownerFaction > 0 && ownerFaction != evt.Faction;
            ProcessHistoricalEvent(session, evt);
        }
        public static void AddHistoricalBonusBox(Session session)
        {
            if (session == null || session.CharacterInfo == null) return;
            var evt = HistoricalContext(session, "bonus_box"); evt.Amount = 1; ProcessHistoricalEvent(session, evt);
        }
        internal static double HistoricalRadiationTravelDistance(int mapId, double fromX, double fromY, double toX, double toY)
        {
            if (double.IsNaN(fromX) || double.IsNaN(fromY) || double.IsNaN(toX) || double.IsNaN(toY)
                || double.IsInfinity(fromX) || double.IsInfinity(fromY) || double.IsInfinity(toX) || double.IsInfinity(toY)) return 0;
            double dx = toX - fromX, dy = toY - fromY;
            double length = Math.Sqrt(dx * dx + dy * dy);
            if (length <= 0 || double.IsNaN(length) || double.IsInfinity(length)) return 0;
            int minX, maxX, minY, maxY;
            ShipMovement.GetRadiationSafeBounds(mapId, out minX, out maxX, out minY, out maxY);
            double enter = 0, leave = 1;
            // Clip the safe part of the segment; only its complement is radiation travel.
            // The right/top edges are outside, as in IsInsideRadiationSafeArea.
            if (dx == 0)
            {
                if (fromX < minX || fromX >= maxX) return length;
            }
            else
            {
                double a = (minX - fromX) / dx, b = (maxX - fromX) / dx;
                enter = Math.Max(enter, Math.Min(a, b));
                leave = Math.Min(leave, Math.Max(a, b));
            }
            if (dy == 0)
            {
                if (fromY < minY || fromY >= maxY) return length;
            }
            else
            {
                double a = (minY - fromY) / dy, b = (maxY - fromY) / dy;
                enter = Math.Max(enter, Math.Min(a, b));
                leave = Math.Min(leave, Math.Max(a, b));
            }
            double safeFraction = Math.Max(0, leave - enter);
            return length * Math.Max(0, Math.Min(1, 1 - safeFraction));
        }
        public static void AddHistoricalMovement(Session session, int fromX, int fromY)
        {
            if (!HistoricalMovementReady(session)) return;
            var evt = HistoricalContext(session, "movement"); evt.FromX = fromX; evt.FromY = fromY;
            double dx = evt.X - fromX, dy = evt.Y - fromY; evt.Amount = Math.Sqrt(dx * dx + dy * dy); ProcessHistoricalEvent(session, evt, false);
        }
        private static bool HistoricalMovementReady(Session session)
        {
            if (session == null || session.CharacterInfo == null || !session.GameplayReady || session.IsChat || session.Stopped || session.StoppedPlayer) return false;
            var c = session.CharacterInfo;
            return !c.Destroy && !c.Disconnected && !c.DeadCommitted && c.ShipHp > 0
                && session.MapJoined && session.MapAuthed && session.CurrentMapId > 0 && session.CurrentMapId == c.MapId;
        }
        public static void AddHistoricalWeapon(Session session, string weapon, int ammoId)
        {
            if (session == null || session.CharacterInfo == null) return;
            var evt = HistoricalContext(session, "weapon"); evt.Weapon = weapon; evt.AmmoId = ammoId; ProcessHistoricalEvent(session, evt);
        }
        public static void AddHistoricalNpcDamage(Session session, Npc npc, int damage, string weapon, int ammoId)
        {
            if (session == null || session.CharacterInfo == null || npc == null || damage <= 0) return;
            if (weapon != "laser" && weapon != "rocket") AddHistoricalWeapon(session, weapon, ammoId);
            npc.HistoricalWeapons[session.CharacterId] = Tuple.Create((long)npc.SpawnSeq, weapon, ammoId);
            var evt = HistoricalContext(session, "damage_npc"); string name, variant; HistoricalNpcIdentity(npc.Name, out name, out variant);
            evt.Target = name; evt.Variant = variant; evt.Amount = damage; evt.MapId = npc.MapId; evt.Weapon = weapon; evt.AmmoId = ammoId; evt.IsLethal = npc.ShipHp <= 0;
            ProcessHistoricalEvent(session, evt);
        }
        public static void AddHistoricalPlayerDamage(Session attacker, Session victim, int damage, string weapon, int ammoId)
        {
            if (attacker == null || attacker.CharacterInfo == null || victim == null || victim.CharacterInfo == null || damage <= 0) return;
            if (weapon != "laser" && weapon != "rocket") AddHistoricalWeapon(attacker, weapon, ammoId);
            var evt = HistoricalContext(attacker, "damage_player"); evt.Amount = damage; evt.TargetId = victim.CharacterId; evt.TargetFaction = victim.CharacterInfo.FactionId; evt.TargetShip = victim.CharacterInfo.ShipId;
            evt.Enemy = evt.TargetFaction > 0 && evt.TargetFaction != evt.Faction; evt.Weapon = weapon; evt.AmmoId = ammoId;
            bool sameGroup = attacker.CharacterInfo.Members != null && attacker.CharacterInfo.Members.Contains(victim.CharacterId);
            evt.Eligible = evt.Enemy && !sameGroup && (attacker.CharacterInfo.ClanId <= 0 || attacker.CharacterInfo.ClanId != victim.CharacterInfo.ClanId)
                && (string.IsNullOrEmpty(attacker.RemoteAddress) || attacker.RemoteAddress != victim.RemoteAddress);
            ProcessHistoricalEvent(attacker, evt);
            AddHistoricalDamageReceived(victim, damage);
        }
        public static void AddHistoricalDamageReceived(Session session, int damage)
        {
            if (session == null || session.CharacterInfo == null || damage <= 0) return;
            var evt = HistoricalContext(session, "damage_received"); evt.Amount = damage; ProcessHistoricalEvent(session, evt);
        }
        public static void AddHistoricalDeath(Session session)
        {
            if (session == null || session.CharacterInfo == null) return;
            var evt = HistoricalContext(session, "death");
            evt.EventKey = session.DroneGameplayToken + ":" + session.DroneLifeEpoch + ":" + session.TdmLifeGeneration;
            ProcessHistoricalEvent(session, evt);
        }
        public static void AddHistoricalGate(Session session, string gate)
        {
            if (session == null || session.CharacterInfo == null) return;
            var evt = HistoricalContext(session, "gate"); evt.Target = gate; evt.Amount = 1; ProcessHistoricalEvent(session, evt);
        }
        // Every semantic field is checked before admitting runtime progress.
        // Documentary labels have an explicit whitelist; a future condition
        // cannot silently disappear merely because this version does not know it.
        internal static List<string> HistoricalUnsupported(Dictionary<string, object> variant)
        {
            var errors = new List<string>();
            var supportedConstraints = new HashSet<string>(new[] { "time_limit_seconds", "time_comparison", "no_death", "no_fire", "no_movement", "max_damage_received", "max_deaths", "required_weapon", "max_player_kills", "prohibited_kill_targets", "prohibited_damage_target" }, StringComparer.Ordinal);
            var constraints = HistoricalDict(HistoricalGet(variant, "constraints"));
            foreach (var pair in constraints)
                if (pair.Value != null && !supportedConstraints.Contains(pair.Key)) errors.Add("constraint." + pair.Key);
            foreach (string key in new[] { "no_death", "no_fire", "no_movement" })
                if (HistoricalGet(constraints, key) != null && !(HistoricalGet(constraints, key) is bool)) errors.Add("constraint_type:" + key);
            string required = HistoricalText(constraints, "required_weapon");
            if (required.Length > 0 && !HistoricalSupportedWeapon(required)) errors.Add("weapon:" + required);
            if (HistoricalGet(constraints, "prohibited_damage_target") != null) errors.Add("unavailable_prohibited_object:" + HistoricalText(constraints, "prohibited_damage_target"));
            string comparison = HistoricalText(constraints, "time_comparison");
            if (comparison.Length > 0 && comparison != "strictly_less_than") errors.Add("time_comparison:" + comparison);
            foreach (string key in new[] { "time_limit_seconds", "max_damage_received", "max_deaths", "max_player_kills" })
                if (HistoricalGet(constraints, key) != null && HistoricalNumber(constraints, key, -1) < 0) errors.Add("invalid_constraint:" + key);
            foreach (object rawScore in HistoricalList(HistoricalGet(variant, "scoring")))
            {
                var score = HistoricalDict(rawScore); string kind = HistoricalText(score, "kind");
                if (kind != "MIN_ELAPSED" && kind != "MINIMIZE_DAMAGE_RECEIVED" && kind != "MAXIMIZE_NPC_KILLS") errors.Add("scoring:" + kind);
                if (HistoricalBool(score, "mandatory")) errors.Add("mandatory_scoring_without_threshold");
                if (kind == "MAXIMIZE_NPC_KILLS" && HistoricalText(score, "target") != "Lordakia" && HistoricalText(score, "target") != "Streuner") errors.Add("scoring_target:" + HistoricalText(score, "target"));
                foreach (var pair in score)
                    if (pair.Value != null && !new[] { "kind", "target", "mandatory", "quantity", "hard_deadline_seconds", "basis", "threshold" }.Contains(pair.Key)) errors.Add("scoring_field:" + pair.Key);
                if (HistoricalGet(score, "hard_deadline_seconds") != null || HistoricalGet(score, "threshold") != null || HistoricalGet(score, "quantity") != null) errors.Add("scoring_threshold_not_implemented");
            }
            HistoricalValidateNode(HistoricalDict(HistoricalGet(variant, "ast")), (int)HistoricalNumber(variant, "company", 1), errors);
            return errors.Distinct(StringComparer.Ordinal).ToList();
        }
        private static bool HistoricalSupportedWeapon(string value)
        { return value == "X-1 laser" || value == "X-2 laser" || value == "rockets" || value == "rocket" || value == "laser" || value == "lasers"; }
        private static void HistoricalValidateNode(Dictionary<string, object> node, int company, List<string> errors)
        {
            string id = HistoricalText(node, "id"), action = HistoricalText(node, "action");
            if (id.Length == 0) errors.Add("node_id_missing");
            var children = HistoricalList(HistoricalGet(node, "children"));
            if (action.Length == 0)
            {
                foreach (var pair in node)
                    if (pair.Value != null && !new[] { "id", "op", "children", "required_children" }.Contains(pair.Key)) errors.Add(id + ":group_field:" + pair.Key);
                string op = HistoricalText(node, "op");
                if (op != "and" && op != "or" && op != "sequence" && op != "n_of_m") errors.Add(id + ":op:" + op);
                if (children.Count == 0) errors.Add(id + ":empty_group");
                if (op == "n_of_m" && (HistoricalNumber(node, "required_children") < 1 || HistoricalNumber(node, "required_children") > children.Count)) errors.Add(id + ":invalid_choice_count");
                foreach (object child in children) HistoricalValidateNode(HistoricalDict(child), company, errors);
                return;
            }
            var supported = new HashSet<string>(new[] { "kill_npc", "kill_player", "collect_resource", "collect_ore", "collect_cargo_ore", "collect_cargo_box", "steal_player_cargo", "collect_bonus_box", "assist_damage_npc", "damage_npc", "damage_player", "take_damage", "stay_on_map", "visit_map", "travel_distance", "travel_radiation_zone", "visit_coordinates", "galaxy_gate_complete", "complete_galaxy_gate" }, StringComparer.Ordinal);
            if (!supported.Contains(action)) errors.Add(id + ":action:" + action);
            var fields = new HashSet<string>(new[] { "id", "op", "action", "target", "targets", "quantity", "variant", "map", "maps", "required_weapon", "origin", "source_filter", "unit", "aggregation", "source_target_literal", "cloaked", "continuous", "hp_fraction_max", "max_absence_seconds", "target_company", "ships", "player_ship", "coordinates", "radius" }, StringComparer.Ordinal);
            foreach (var pair in node) if (pair.Value != null && !fields.Contains(pair.Key)) errors.Add(id + ":field:" + pair.Key);
            foreach (string key in new[] { "cloaked", "continuous" })
                if (HistoricalGet(node, key) != null && !(HistoricalGet(node, key) is bool)) errors.Add(id + ":field_type:" + key);
            if (HistoricalGet(node, "hp_fraction_max") != null && (HistoricalNumber(node, "hp_fraction_max", -1) <= 0 || HistoricalNumber(node, "hp_fraction_max", 2) > 1)) errors.Add(id + ":hp_fraction");
            if (HistoricalGet(node, "max_absence_seconds") != null && HistoricalNumber(node, "max_absence_seconds", -1) <= 0) errors.Add(id + ":absence_duration");
            string unit = HistoricalText(node, "unit");
            if (unit.Length > 0 && (unit != "cargo_boxes" || action != "steal_player_cargo")) errors.Add(id + ":unit:" + unit);
            double quantity = HistoricalNumber(node, "quantity", -1);
            if (quantity <= 0 || double.IsNaN(quantity) || double.IsInfinity(quantity) || quantity > 9007199254740991L) errors.Add(id + ":quantity");
            object map = HistoricalGet(node, "maps") ?? HistoricalGet(node, "map");
            if (map == null && (action == "stay_on_map" || action == "visit_map")) map = HistoricalGet(node, "target");
            if (map != null && !Enumerable.Range(1, 29).Any(m => Enumerable.Range(1, 3).Any(f => HistoricalMapMatches(map, m, f)))) errors.Add(id + ":map:" + Convert.ToString(map));
            string weapon = HistoricalText(node, "required_weapon");
            if (weapon.Length > 0 && !HistoricalSupportedWeapon(weapon)) errors.Add(id + ":weapon:" + weapon);
            if (action == "kill_npc" || action == "damage_npc" || action == "assist_damage_npc")
            {
                object rawTargets = HistoricalGet(node, "targets") ?? HistoricalGet(node, "target");
                var targets = rawTargets is string ? new List<object> { rawTargets } : HistoricalList(rawTargets);
                var actualTypes = new[] { "Streuner", "StreuneR", "Lordakia", "Mordon", "Saimon", "Devolarium", "Sibelon", "Sibelonit", "Lordakium", "Kristallin", "Kristallon", "Protegit", "Cubikon" };
                if (targets.Count == 0) errors.Add(id + ":npc_target_missing");
                foreach (object target in targets) if (!actualTypes.Contains(Convert.ToString(target), StringComparer.Ordinal)) errors.Add(id + ":npc:" + Convert.ToString(target));
            }
            if (action == "steal_player_cargo" && HistoricalGet(node, "ships") != null)
            {
                var ships = HistoricalList(HistoricalGet(node, "ships"));
                var actualShips = new[] { "Phoenix", "Yamato", "Leonov", "Defcom", "Liberator", "Piranha", "Nostromo", "BigBoy", "Vengeance", "Goliath" };
                if (ships.Count == 0) errors.Add(id + ":cargo_ships_missing");
                foreach (object ship in ships) if (!actualShips.Contains(Convert.ToString(ship), StringComparer.Ordinal)) errors.Add(id + ":cargo_ship:" + Convert.ToString(ship));
            }
            if (action == "collect_ore" && !new[] { "Prometium", "Endurium", "Terbium" }.Contains(HistoricalText(node, "target"), StringComparer.Ordinal)) errors.Add(id + ":natural_ore:" + HistoricalText(node, "target"));
            if (action == "collect_resource" || action == "collect_cargo_ore")
                if (!new[] { "Prometium", "Endurium", "Terbium", "Xenomit", "Prometid", "Duranium", "Promerium", "Seprom" }.Contains(HistoricalText(node, "target"), StringComparer.Ordinal)) errors.Add(id + ":resource:" + HistoricalText(node, "target"));
            string npcVariant = HistoricalText(node, "variant", "normal");
            if (npcVariant != "normal" && npcVariant != "Boss" && npcVariant != "Uber") errors.Add(id + ":npc_variant:" + npcVariant);
            if (action == "visit_coordinates" && HistoricalNumber(node, "radius", -1) < 0) errors.Add(id + ":coordinate_tolerance_unproven");
            string owner = HistoricalText(node, "target_company");
            if (owner.Length > 0 && owner != "enemy" && HistoricalFactionId(owner) == 0) errors.Add(id + ":target_company:" + owner);
            string source = HistoricalText(node, "source_filter");
            if (source.Length > 0 && source != "SALVAGE_spec_any") errors.Add(id + ":source_filter:" + source);
            string origin = HistoricalText(node, "origin");
            if (origin.Length > 0 && origin != "natural_ore" && origin != "resource_acquisition" && origin != "destroyed_ships") errors.Add(id + ":origin:" + origin);
            string aggregation = HistoricalText(node, "aggregation");
            if (aggregation.Length > 0 && aggregation != "one_shared_counter_across_allowed_species" && aggregation != "one_shared_damage_counter") errors.Add(id + ":aggregation:" + aggregation);
        }

        internal static Dictionary<string, long> HistoricalMetrics()
        {
            return new Dictionary<string, long> { { "events", Interlocked.Read(ref HistoricalEvents) }, { "definition_loads", Interlocked.Read(ref HistoricalLoads) },
                { "progress_updates", Interlocked.Read(ref HistoricalUpdates) }, { "revision_reads", Interlocked.Read(ref HistoricalRevisionReads) }, { "cas_conflicts", Interlocked.Read(ref HistoricalCasConflicts) }, { "cached_players", HistoricalPlayers.Count },
                { "dirty_players", QuestDirtyPlayers.Count }, { "save_batches", Interlocked.Read(ref QuestSaveBatches) },
                { "save_failures", Interlocked.Read(ref QuestSaveFailures) }, { "ordinary_cycles", Interlocked.Read(ref QuestSaveCycles) }, { "ordinary_interval_ms", OrdinaryQuestSaveInterval } };
        }
    }
}
