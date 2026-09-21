using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Storage;
using System;
using System.Collections.Concurrent;
using System.Data;
using System.Globalization;
using System.Threading;

namespace OrbitReborn_Emulator.Game.Techs
{
    public static class TechInventoryService
    {
        private static readonly ConcurrentDictionary<int, object> PlayerLocks = new ConcurrentDictionary<int, object>();
        private static readonly DateTime Epoch = new DateTime(1970,1,1,0,0,0,DateTimeKind.Utc);
        public static object SyncRoot(int playerId) { return PlayerLocks.GetOrAdd(playerId, ignored => new object()); }
        public static IDisposable BeginTransition(Session session)
        {
            return new Transition(session);
        }
        private sealed class Transition : IDisposable
        {
            private Session session;
            private readonly object gate;
            public Transition(Session owner)
            {
                session = owner;
                gate = SyncRoot(owner.CharacterId);
                lock (gate) ++owner.TechState.TransitionDepth;
            }
            public void Dispose()
            {
                Session owner = Interlocked.Exchange(ref session,null);
                if (owner != null) lock (gate) --owner.TechState.TransitionDepth;
            }
        }
        public static bool IsCurrent(Session session)
        {
            return session != null && session.CharacterInfo != null && session.Authenticated && !session.IsChat
                && !session.Stopped && !session.StoppedPlayer
                && object.ReferenceEquals(SessionManager.GetSessionByCharacterId(session.CharacterId), session);
        }

        private static double Timestamp(object value)
        {
            if (value == null || value == DBNull.Value) return 0;
            return (DateTime.SpecifyKind(Convert.ToDateTime(value, CultureInfo.InvariantCulture), DateTimeKind.Utc)-Epoch).TotalSeconds;
        }
        private static DateTime DbNow(SqlDatabaseTransaction db)
        {
            return DateTime.SpecifyKind(Convert.ToDateTime(db.Scalar("SELECT UTC_TIMESTAMP(6)"), CultureInfo.InvariantCulture), DateTimeKind.Utc);
        }
        private static string DateValue(DateTime value) { return value.ToString("yyyy-MM-dd HH:mm:ss.ffffff", CultureInfo.InvariantCulture); }
        private static SqlDatabaseTransaction Open()
        {
            SqlDatabaseTransaction db = new SqlDatabaseTransaction(SqlDatabaseManager.GenerateConnectionString());
            try { TechSchema.Require(db); return db; }
            catch { db.Dispose(); throw; }
        }

        // Same relative order as PHP: wallet -> slots -> active builds -> inventory -> events.
        // No C# TECH operation acquires Skylab locks after the wallet.
        private static DataTable LockPlayer(SqlDatabaseTransaction db, int playerId)
        {
            if (db.Query("SELECT id FROM users WHERE id=@id FOR UPDATE", "@id",playerId).Rows.Count != 1)
                throw new InvalidOperationException("TECH player does not exist.");
            for (int slot = 1; slot <= 3; ++slot)
                db.Execute("INSERT INTO player_tech_slots (player_id,slot_no,unlocked_at) VALUES (@id,@slot,IF(@slot=1,UTC_TIMESTAMP(6),NULL)) ON DUPLICATE KEY UPDATE player_id=VALUES(player_id)", "@id",playerId,"@slot",slot);
            DataTable slots = db.Query("SELECT slot_no FROM player_tech_slots WHERE player_id=@id ORDER BY slot_no FOR UPDATE", "@id",playerId);
            if (slots.Rows.Count != 3) throw new InvalidOperationException("Invalid TECH halls.");
            DataTable builds = db.Query("SELECT id,tech_id,ends_at,credited_at FROM player_tech_builds WHERE player_id=@id AND credited_at IS NULL ORDER BY id FOR UPDATE", "@id",playerId);
            for (int tech = 1; tech <= 5; ++tech)
                db.Execute("INSERT INTO player_tech_inventory (player_id,tech_id,amount) VALUES (@id,@tech,0) ON DUPLICATE KEY UPDATE player_id=VALUES(player_id)", "@id",playerId,"@tech",tech);
            // Lock in tech_id order BEFORE updating any individual inventory row.
            ReadRecords(db,playerId,true);
            return builds;
        }

        private static void CreditDue(SqlDatabaseTransaction db, int playerId, DataTable builds, DateTime now)
        {
            foreach (DataRow build in builds.Rows)
            {
                if (Timestamp(build["ends_at"]) > (now-Epoch).TotalSeconds) continue;
                int tech = Convert.ToInt32(build["tech_id"]);
                if (!TechRules.IsKnown(tech)) throw new InvalidOperationException("Invalid TECH build.");
                int changed = db.Execute("UPDATE player_tech_inventory SET amount=amount+1,version=version+1 WHERE player_id=@id AND tech_id=@tech AND amount<@max", "@id",playerId,"@tech",tech,"@max",TechRules.MaxAmount);
                if (changed != 1) continue; // Keep the paid build at the technical bound.
                if (db.Execute("UPDATE player_tech_builds SET credited_at=@now,active_slot_no=NULL WHERE id=@build AND credited_at IS NULL", "@now",DateValue(now),"@build",build["id"]) != 1)
                    throw new InvalidOperationException("TECH delivery invariant failed.");
            }
        }

        private static TechRecord[] ReadRecords(SqlDatabaseTransaction db, int playerId, bool forUpdate)
        {
            DataTable rows = db.Query("SELECT tech_id,amount,version,cooldown_until,active_until,active_use_id FROM player_tech_inventory WHERE player_id=@id ORDER BY tech_id" + (forUpdate ? " FOR UPDATE" : ""), "@id",playerId);
            if (rows.Rows.Count != 5) throw new InvalidOperationException("Invalid TECH inventory.");
            TechRecord[] records = new TechRecord[6];
            foreach (DataRow row in rows.Rows)
            {
                int id = Convert.ToInt32(row["tech_id"]);
                long amount = Convert.ToInt64(row["amount"]);
                if (!TechRules.IsKnown(id) || records[id] != null || amount < 0 || amount > TechRules.MaxAmount)
                    throw new InvalidOperationException("Invalid TECH quantity.");
                records[id] = new TechRecord { TechId=id, Amount=(int)amount, Version=Convert.ToUInt64(row["version"]),
                    CooldownUntil=Timestamp(row["cooldown_until"]), ActiveUntil=Timestamp(row["active_until"]),
                    ActiveUseId=row["active_use_id"] == DBNull.Value ? null : Convert.ToString(row["active_use_id"]) };
            }
            return records;
        }

        public static void Start(Session session)
        {
            if (session == null || session.CharacterInfo == null) return;
            lock (SyncRoot(session.CharacterId))
            {
                if (!IsCurrent(session)) return;
                if (!session.TechState.Started)
                {
                    // A cached CharacterInfo may have belonged to another session.
                    DisposeEffectTimers(session);
                    ++session.TechState.CallbackEpoch;
                    session.TechState.Started = true;
                }
                Refresh(session,true);
                if (session.TechState.RefreshTimer == null)
                    session.TechState.RefreshTimer = new Timer(RefreshTick,session,5000,5000);
            }
        }

        private static void RefreshTick(object state)
        {
            Session session = state as Session;
            if (session == null || session.CharacterId <= 0 || session.IsChat) return;
            object gate = SyncRoot(session.CharacterId);
            // Skip an overlapping tick rather than build a timer queue while DB is slow.
            if (!Monitor.TryEnter(gate)) return;
            try { if (IsCurrent(session) && session.TechState.TransitionDepth == 0) Refresh(session,false); }
            finally { Monitor.Exit(gate); }
        }

        public static bool Refresh(Session session, bool force)
        {
            lock (SyncRoot(session.CharacterId))
            {
                if (!IsCurrent(session)) return false;
                try
                {
                    TechRecord[] records;
                    using (SqlDatabaseTransaction db = Open())
                    {
                        DataTable builds = LockPlayer(db,session.CharacterId);
                        DateTime now = DbNow(db);
                        CreditDue(db,session.CharacterId,builds,now);
                        records = ReadRecords(db,session.CharacterId,false);
                        // An incomplete marker is NEVER automatically refunded or replayed as damage.
                        db.Execute("UPDATE player_tech_use_events SET state='needs_review',resolved_at=@now WHERE player_id=@id AND state='reserved' AND (session_generation<>@generation OR reserved_at<DATE_SUB(@now,INTERVAL 60 SECOND))", "@now",DateValue(now),"@id",session.CharacterId,"@generation",session.TechState.Generation);
                        db.Commit();
                    }
                    session.TechState.Records = records;
                    session.TechState.Available = true;
                    Fight.RestorePersistentTechEffects(session);
                    Fight.SendTechStatusIfChanged(session,force);
                    return true;
                }
                catch (Exception error)
                {
                    Failed(session,error);
                    Fight.SendTechStatusIfChanged(session,force);
                    return false;
                }
            }
        }

        /// <summary>Called under the player lifecycle lock, after gameplay validation.
        /// No retries: a failed Commit can have an uncertain result.</summary>
        public static bool TryConsume(Session session, int techId, string details, out string useId)
        {
            useId = Guid.NewGuid().ToString("D");
            if (!IsCurrent(session) || session.TechState.TransitionDepth != 0 || !TechRules.IsKnown(techId)) return false;
            string reservedId = useId;
            try
            {
                TechRecord[] records;
                using (SqlDatabaseTransaction db = Open())
                {
                    DataTable builds = LockPlayer(db,session.CharacterId);
                    DateTime now = DbNow(db);
                    CreditDue(db,session.CharacterId,builds,now);
                    records = ReadRecords(db,session.CharacterId,false);
                    if (!TechRules.CanReserve(records[techId], (now-Epoch).TotalSeconds))
                    {
                        db.Commit(); // Independent due builds are still legitimately delivered.
                        session.TechState.Records = records;
                        session.TechState.Available = true;
                        return false;
                    }
                    DateTime cooldown = now.AddSeconds(TechRules.CooldownFromStart(techId));
                    DateTime? active = TechRules.Duration(techId) > 0 ? (DateTime?)now.AddSeconds(TechRules.Duration(techId)) : null;
                    int changed = db.Execute("UPDATE player_tech_inventory SET amount=amount-1,version=version+1,cooldown_until=@cooldown,active_until=@active,active_use_id=@use WHERE player_id=@id AND tech_id=@tech AND amount>0 AND (cooldown_until IS NULL OR cooldown_until<=@now) AND (active_until IS NULL OR active_until<=@now)",
                        "@cooldown",DateValue(cooldown),"@active",active.HasValue ? DateValue(active.Value) : null,"@use",reservedId,"@id",session.CharacterId,"@tech",techId,"@now",DateValue(now));
                    if (changed != 1) throw new InvalidOperationException("TECH reservation invariant failed.");
                    db.Execute("INSERT INTO player_tech_use_events (use_id,player_id,tech_id,reserved_at,session_generation,state,details) VALUES (@use,@id,@tech,@now,@generation,'reserved',@details)",
                        "@use",reservedId,"@id",session.CharacterId,"@tech",techId,"@now",DateValue(now),"@generation",session.TechState.Generation,"@details",(details ?? "").Length > 1024 ? details.Substring(0,1024) : details ?? "");
                    records = ReadRecords(db,session.CharacterId,false);
                    db.Commit();
                }
                session.TechState.Records = records;
                session.TechState.Available = true;
                session.TechState.TimerUseIds[techId] = reservedId;
                return true;
            }
            catch (Exception error)
            {
                Failed(session,error);
                // Even if COMMIT actually succeeded, do not grant a new RAM effect here.
                ResolveEvent(session,reservedId,false,"Commit/result uncertain; no effect granted by this call.");
                return false;
            }
        }

        public static void ResolveEvent(Session session, string useId, bool applied, string details)
        {
            try
            {
                using (SqlDatabaseTransaction db = Open())
                {
                    db.Query("SELECT id FROM users WHERE id=@id FOR UPDATE","@id",session.CharacterId);
                    db.Execute("UPDATE player_tech_use_events SET state=@state,resolved_at=UTC_TIMESTAMP(6),details=LEFT(CONCAT(details,'; ',@details),1024) WHERE use_id=@use AND player_id=@id AND state='reserved'",
                        "@state",applied ? "applied" : "needs_review","@details",details,"@use",useId,"@id",session.CharacterId);
                    db.Commit();
                }
            }
            catch (Exception error) { Log(session,error); } // Reservation remains detectable; no refund.
        }

        public static Timer GuardedTimer(Session session, int techId, TimerCallback callback, int due, int period)
        {
            string use = session.TechState.TimerUseIds[techId];
            int epoch = session.TechState.CallbackEpoch;
            return new Timer(ignored => {
                lock (SyncRoot(session.CharacterId))
                {
                    if (!IsCurrent(session) || session.TechState.TransitionDepth != 0 || session.TechState.CallbackEpoch != epoch || use == null
                        || session.TechState.TimerUseIds[techId] != use) return;
                    try { callback(session); }
                    catch (Exception error) { Log(session,error); }
                }
            }, null, due, period);
        }

        public static void Suspend(Session session)
        {
            if (session == null || session.CharacterId <= 0 || session.IsChat) return;
            lock (SyncRoot(session.CharacterId))
            {
                ++session.TechState.CallbackEpoch;
                if (session.TechState.RefreshTimer != null) session.TechState.RefreshTimer.Dispose();
                session.TechState.RefreshTimer = null;
                session.TechState.Started = false;
                // Do not dispose timers belonging to a newer owner of a cached CharacterInfo.
                if (session.CharacterInfo != null && session.CharacterInfo.SessionId == session.Id) DisposeEffectTimers(session);
            }
        }

        private static void DisposeEffectTimers(Session session)
        {
            var info = session.CharacterInfo;
            if (info.EnergyLeechTimer != null) info.EnergyLeechTimer.Dispose();
            if (info.RocketProbabilityMaximizerTimer != null) info.RocketProbabilityMaximizerTimer.Dispose();
            if (info.BattleRepairTimer != null) info.BattleRepairTimer.Dispose();
            info.EnergyLeechTimer = null;
            info.RocketProbabilityMaximizerTimer = null;
            info.BattleRepairTimer = null;
            info.BattleRepairCount = 0;
        }

        private static void Failed(Session session, Exception error)
        {
            session.TechState.Available = false; // Never advertise cached quantities as permission.
            Log(session,error);
        }
        private static void Log(Session session, Exception error)
        {
            if (DateTime.UtcNow < session.TechState.NextErrorLog) return;
            session.TechState.NextErrorLog = DateTime.UtcNow.AddSeconds(30);
            Output.WriteLine("[Tech Factory] player=" + session.CharacterId + " " + error.Message, OutputLevel.Warning);
        }
    }
}
