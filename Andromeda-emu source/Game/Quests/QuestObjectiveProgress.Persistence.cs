using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Linq;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Quests
{
    internal static partial class QuestObjectiveProgress
    {
        // One existing world tick schedules one ordinary save cycle. A player
        // is queued only after real progress changes. There are no player timers.
        private const long OrdinaryQuestSaveInterval = 10000;
        private static readonly ConcurrentDictionary<int, HistoricalPlayer> QuestDirtyPlayers = new ConcurrentDictionary<int, HistoricalPlayer>();
        private static long LastOrdinaryQuestSave;
        private static int OrdinaryQuestSaveBusy;
        private static long QuestSaveBatches, QuestSaveFailures, QuestSaveCycles;

        private sealed class HistoricalWriteSnapshot
        {
            public HistoricalAttempt Attempt;
            public int PlayerId, QuestId;
            public long Version, Generation;
            public string AttemptId, Progress;
            public bool Obsolete;
        }

        private sealed class QuestWriteBatch
        {
            public readonly List<HistoricalWriteSnapshot> Historical = new List<HistoricalWriteSnapshot>();
            public LegacyWriteBatch Legacy;
        }

        private static void MarkQuestDirty(int playerId, HistoricalPlayer player)
        {
            QuestDirtyPlayers[playerId] = player;
        }

        private static void RemoveQuestDirtyIfSame(int playerId, HistoricalPlayer player)
        {
            ((ICollection<KeyValuePair<int, HistoricalPlayer>>)QuestDirtyPlayers)
                .Remove(new KeyValuePair<int, HistoricalPlayer>(playerId, player));
        }

        private static bool HasQuestDirtyLocked(HistoricalPlayer player)
        {
            return player.PendingWrite != null || player.Attempts.Any(a => a.Dirty) || HasLegacyDirtyLocked(player);
        }

        private static QuestWriteBatch CaptureQuestWriteLocked(int playerId, HistoricalPlayer player)
        {
            var batch = new QuestWriteBatch();
            foreach (HistoricalAttempt attempt in player.Attempts.Where(a => a.Dirty))
                batch.Historical.Add(new HistoricalWriteSnapshot { Attempt = attempt, PlayerId = playerId,
                    QuestId = attempt.QuestId, AttemptId = attempt.AttemptId, Version = attempt.Version,
                    Generation = attempt.Generation, Progress = HistoricalSerializer().Serialize(attempt.State) });
            batch.Legacy = CaptureLegacyProgressLocked(player);
            return batch.Historical.Count == 0 && batch.Legacy == null ? null : batch;
        }

        private static void StoreHistoricalSnapshot(SqlDatabaseTransaction db, HistoricalWriteSnapshot snapshot)
        {
            int written = db.Execute("UPDATE site_player_quests SET progress_json=@progress,state_version=state_version+1 " +
                "WHERE player_id=@id AND quest_id=@quest AND status='in_progress' AND attempt_id=@attempt AND state_version=@version",
                "@progress", snapshot.Progress, "@id", snapshot.PlayerId, "@quest", snapshot.QuestId,
                "@attempt", snapshot.AttemptId, "@version", snapshot.Version);
            if (written == 1) return;
            // A timeout at COMMIT may have applied this immutable batch. Reuse
            // that exact batch until the outcome is known; never replay a delta.
            DataTable current = db.Query("SELECT status,attempt_id,state_version,progress_json FROM site_player_quests " +
                "WHERE player_id=@id AND quest_id=@quest FOR UPDATE", "@id", snapshot.PlayerId, "@quest", snapshot.QuestId);
            if (current.Rows.Count == 0 || Convert.ToString(current.Rows[0]["status"], CultureInfo.InvariantCulture) != "in_progress" ||
                Convert.ToString(current.Rows[0]["attempt_id"], CultureInfo.InvariantCulture) != snapshot.AttemptId)
            { snapshot.Obsolete = true; return; }
            DataRow row = current.Rows[0];
            if (Convert.ToInt64(row["state_version"], CultureInfo.InvariantCulture) == snapshot.Version + 1 &&
                string.Equals(Convert.ToString(row["progress_json"], CultureInfo.InvariantCulture), snapshot.Progress, StringComparison.Ordinal)) return;
            Interlocked.Increment(ref HistoricalCasConflicts);
            throw new InvalidOperationException("Quest state version changed outside this writer; pending progress is retained for reconciliation.");
        }

        private static void PersistQuestWrite(QuestWriteBatch batch)
        {
            // No Sync/actor/movement lock is held during database I/O.
            using (var db = new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString()))
            {
                foreach (HistoricalWriteSnapshot snapshot in batch.Historical.OrderBy(s => s.QuestId)) StoreHistoricalSnapshot(db, snapshot);
                PersistLegacyProgress(db, batch.Legacy);
                db.Commit();
            }
        }

        private static void AcknowledgeQuestWriteLocked(HistoricalPlayer player, QuestWriteBatch batch)
        {
            foreach (HistoricalWriteSnapshot snapshot in batch.Historical)
            {
                HistoricalAttempt attempt = snapshot.Attempt;
                if (!player.Attempts.Contains(attempt) || attempt.AttemptId != snapshot.AttemptId) continue;
                if (snapshot.Obsolete) { player.Attempts.Remove(attempt); player.Revision = -1; continue; }
                attempt.Version = snapshot.Version + 1;
                attempt.LastPersistedAt = HistoricalNow();
                // A new kill/ore/tick while SQL was slow remains visible and dirty.
                if (attempt.Generation == snapshot.Generation) { attempt.Dirty = false; attempt.CriticalDirty = false; }
                Interlocked.Increment(ref HistoricalUpdates);
            }
            AcknowledgeLegacyProgressLocked(player, batch.Legacy);
        }

        private static bool FlushQuestPlayer(int playerId, HistoricalPlayer player, bool critical)
        {
            if (Monitor.IsEntered(player.Sync)) throw new InvalidOperationException("Quest writer cannot be awaited while holding the progress lock.");
            bool entered = false;
            try
            {
                if (critical) { Monitor.Enter(player.Writer); entered = true; }
                else if (!(entered = Monitor.TryEnter(player.Writer))) return false;
                return FlushQuestPlayerWithWriter(playerId, player, critical);
            }
            finally { if (entered) Monitor.Exit(player.Writer); }
        }

        private static bool FlushQuestPlayerWithWriter(int playerId, HistoricalPlayer player, bool critical)
        {
            if (Monitor.IsEntered(player.Sync)) throw new InvalidOperationException("Quest SQL cannot hold the progress lock.");
            try
            {
                do
                {
                    QuestWriteBatch batch;
                    lock (player.Sync)
                    {
                        if (player.PendingWrite == null) player.PendingWrite = CaptureQuestWriteLocked(playerId, player);
                        batch = player.PendingWrite;
                        if (batch == null) { player.LastFailure = null; RemoveQuestDirtyIfSame(playerId, player); return true; }
                    }
                    PersistQuestWrite(batch);
                    lock (player.Sync)
                    {
                        AcknowledgeQuestWriteLocked(player, batch);
                        player.PendingWrite = null; player.LastFailure = null;
                        Interlocked.Increment(ref QuestSaveBatches);
                        if (!HasQuestDirtyLocked(player)) { RemoveQuestDirtyIfSame(playerId, player); return true; }
                        MarkQuestDirty(playerId, player);
                    }
                    // Ordinary cycles save one immutable generation per player.
                    // A critical barrier drains any generation admitted meanwhile.
                } while (critical);
                return true;
            }
            catch (Exception error)
            {
                lock (player.Sync) { player.LastFailure = error; MarkQuestDirty(playerId, player); }
                Interlocked.Increment(ref QuestSaveFailures); HistoricalError(error); return false;
            }
        }

        private static void ScheduleOrdinaryQuestSaves(long now)
        {
            long last = Interlocked.Read(ref LastOrdinaryQuestSave);
            if (now - last < OrdinaryQuestSaveInterval || Interlocked.CompareExchange(ref LastOrdinaryQuestSave, now, last) != last) return;
            if (Interlocked.CompareExchange(ref OrdinaryQuestSaveBusy, 1, 0) != 0) return;
            // Freeze the finite dirty cohort. Later events join the next cycle.
            var dirty = QuestDirtyPlayers.ToArray();
            ThreadPool.QueueUserWorkItem(unused =>
            {
                try
                {
                    Interlocked.Increment(ref QuestSaveCycles);
                    foreach (var entry in dirty)
                    {
                        HistoricalPlayer current;
                        if (!HistoricalPlayers.TryGetValue(entry.Key, out current) || !Object.ReferenceEquals(current, entry.Value))
                        { RemoveQuestDirtyIfSame(entry.Key, entry.Value); continue; }
                        FlushQuestPlayer(entry.Key, entry.Value, false);
                    }
                }
                catch (Exception error) { HistoricalError(error); }
                finally { Volatile.Write(ref OrdinaryQuestSaveBusy, 0); }
            });
        }

        // Legacy callers use the same session/cache/writer and save cycle.
        private static HistoricalPlayer GetQuestPlayerForLegacy(int playerId)
        {
            Session session = SessionManager.GetSessionByCharacterId(playerId);
            if (session == null)
            {
                HistoricalPlayer pending;
                return HistoricalPlayers.TryGetValue(playerId, out pending) ? pending : null;
            }
            if (session.CharacterInfo == null || session.IsChat || !session.GameplayReady)
            {
                HistoricalPlayer retired;
                return HistoricalPlayers.TryGetValue(playerId, out retired) ? retired : new HistoricalPlayer { PlayerId = playerId, Owner = session, Retiring = true };
            }
            while (true)
            {
                var player = HistoricalPlayers.GetOrAdd(playerId, unused => new HistoricalPlayer());
                if (!EnsureHistoricalLoaded(session, player, false))
                    throw new InvalidOperationException("Quest cache initialization did not confirm pending persistence; synchronous fallback is forbidden.", player.LastFailure);
                lock (player.Sync)
                {
                    HistoricalPlayer current;
                    if (!HistoricalPlayers.TryGetValue(playerId, out current) || !Object.ReferenceEquals(current, player)) continue;
                    return player;
                }
            }
        }

        private static void NotifyQuestLive(int playerId, HistoricalPlayer player)
        {
            lock (player.Sync)
            {
                Session owner = player.Owner;
                if (owner == null || owner.CharacterId != playerId || !owner.GameplayReady || player.Retiring) return;
                var context = HistoricalContext(owner, "checkpoint");
                player.LastNotice = context.At;
                PublishHistoricalState(owner, player, context);
            }
        }
    }
}
