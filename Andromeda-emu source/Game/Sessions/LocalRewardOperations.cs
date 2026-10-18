using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using OrbitReborn_Emulator.Game.Techs;
using OrbitReborn_Emulator.Storage;

namespace OrbitReborn_Emulator.Game.Sessions
{
    // Process-local work only: a crash may lose an unfinished kill. No SQL
    // admission, durable journal, recovery worker, polling or new timer.
    internal static class LocalRewardOperations
    {
        internal static readonly object AdmissionGate = new object();
        private sealed class OwnerState
        {
            internal bool Closed;
            internal Exception Failure;
            internal readonly List<Receipt> Pending = new List<Receipt>();
        }
        private static readonly ConditionalWeakTable<Session, OwnerState> Owners = new ConditionalWeakTable<Session, OwnerState>();
        private static long NextId;
        [ThreadStatic] private static Receipt Current;
        private static OwnerState State(Session owner) { return Owners.GetValue(owner, ignored => new OwnerState()); }
        internal static bool IsSettlingFor(Session owner) { return Current != null && object.ReferenceEquals(Current.Owner, owner); }
        internal static bool CanApplyReservedProgression(Session owner)
        {
            return IsSettlingFor(owner) && Current.TransportAtAdmission
                && object.ReferenceEquals(owner.CharacterInfo, Current.Info);
        }
        internal static bool HasFailed(Session owner)
        {
            if (owner == null || owner.IsChat) return false;
            lock (AdmissionGate) return State(owner).Failure != null;
        }
        internal static bool CanReserveUnderGate(Session owner)
        {
            if (!Monitor.IsEntered(AdmissionGate)) throw new InvalidOperationException("Reward admission gate required.");
            return owner != null && !owner.IsChat && owner.CharacterInfo != null
                && owner.CharacterInfo.RuntimeDataLoaded && owner.GameplayReady
                && !owner.StoppedPlayer && !owner.CharacterInfo.Disconnected && !State(owner).Closed;
        }
        internal static Receipt TryReserveUnderGate(Session owner, Action<Session> action, string sourceKey = null)
        {
            if (action == null) throw new ArgumentNullException("action");
            if (!CanReserveUnderGate(owner)) return null;
            var receipt = new Receipt(owner, action, ++NextId, sourceKey);
            State(owner).Pending.Add(receipt);
            return receipt;
        }
        internal static void Open(Session owner)
        {
            if (owner == null || owner.IsChat) return;
            lock (AdmissionGate)
            {
                if (State(owner).Failure != null) throw new InvalidOperationException("Failed actor must reload from SQL.");
                State(owner).Closed = false;
            }
        }
        internal static bool Drain(Session owner) { return DrainCore(owner, false); }
        internal static bool CloseAndDrain(Session owner) { return DrainCore(owner, true); }
        private static bool DrainCore(Session owner, bool close)
        {
            if (owner == null || owner.IsChat || owner.CharacterInfo == null) return true;
            if (Monitor.IsEntered(AdmissionGate)) throw new InvalidOperationException("Cannot drain while admitting rewards.");
            lock (TechInventoryService.SyncRoot(owner.CharacterId))
            lock (owner.CharacterInfo.DroneImpactSyncRoot)
            {
                Receipt[] work;
                lock (AdmissionGate)
                {
                    OwnerState state = State(owner);
                    if (close) state.Closed = true;
                    work = state.Pending.ToArray();
                }
                bool success = true;
                // Retirement runs its own pending actions; it never waits for a
                // callback worker which could itself be waiting for this lock.
                foreach (Receipt receipt in work) success = receipt.Complete() && success;
                return success && !HasFailed(owner);
            }
        }
        internal sealed class Receipt
        {
            internal readonly Session Owner;
            internal readonly object Info;
            internal readonly long Id;
            internal readonly string SourceKey;
            internal readonly bool TransportAtAdmission;
            private Action<Session> Action;
            // AdmissionGate protects: 0 Pending, 1 Running, 2 Completed, 3 Failed.
            private int Status;
            internal Exception Failure;
            internal string StateName
            {
                get { lock (AdmissionGate) return Status == 0 ? "PENDING" : Status == 1 ? "RUNNING" : Status == 2 ? "COMPLETED_IN_MEMORY" : "FAILED_NO_REPLAY"; }
            }
            internal Receipt(Session owner, Action<Session> action, long id, string source)
            { Owner = owner; Info = owner.CharacterInfo; Action = action; Id = id; SourceKey = source; TransportAtAdmission = !owner.Stopped; }
            internal bool Complete()
            {
                if (Monitor.IsEntered(AdmissionGate) || Current != null)
                    throw new InvalidOperationException("Nested/admission reward completion is not supported.");
                lock (TechInventoryService.SyncRoot(Owner.CharacterId))
                lock (Owner.CharacterInfo.DroneImpactSyncRoot)
                {
                    Action<Session> action;
                    bool blockedByFailure = false;
                    lock (AdmissionGate)
                    {
                        if (Status == 2) return true;
                        if (Status == 3) return false;
                        OwnerState state = State(Owner);
                        if (state.Failure != null)
                        {
                            Failure = state.Failure; Status = 3; Action = null;
                            blockedByFailure = true;
                        }
                        if (!blockedByFailure)
                        {
                            if (Status == 1) throw new InvalidOperationException("Recursive reward completion.");
                            Status = 1;
                        }
                        action = Action;
                    }
                    if (blockedByFailure)
                    {
                        Output.WriteLine("[NPC reward] player=" + Owner.CharacterId + " operation=" + Id + " not executed after previous SQL failure; no replay.", OutputLevel.CriticalError);
                        return false;
                    }
                    try
                    {
                        Current = this;
                        // The life epoch may legitimately change at death. The
                        // operation belongs to this loaded actor, not a new login.
                        if (!object.ReferenceEquals(Owner.CharacterInfo, Info)
                            || !Owner.CharacterInfo.RuntimeDataLoaded || Owner.IsChat
                            || !object.ReferenceEquals(SessionManager.GetSessionByCharacterId(Owner.CharacterId), Owner))
                            throw new InvalidOperationException("Admitted reward actor was retired before settlement.");
                        using (SqlFailureScope scope = SqlFailureScope.Begin())
                        { action(Owner); scope.ThrowIfFailed(); }
                    }
                    catch (Exception error)
                    {
                        lock (AdmissionGate)
                        {
                            Failure = error; Status = 3; Action = null;
                            State(Owner).Closed = true; State(Owner).Failure = error;
                        }
                        // No blind retry and no timer exception escaping to stop
                        // the emulator. Retire this actor; next login reloads SQL.
                        Owner.FailRewardOperation(error);
                        return false;
                    }
                    finally { Current = null; }
                    lock (AdmissionGate)
                    { Status = 2; Action = null; State(Owner).Pending.Remove(this); }
                    return true;
                }
            }
        }
    }
}
