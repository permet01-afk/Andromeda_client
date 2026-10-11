using System;
using System.Diagnostics;
using System.Threading;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;

namespace OrbitReborn_Emulator.Game.Handlers
{
    public static partial class Fight
    {
        // One admitted attack command, bound to an exact target/life/map. A timer
        // never resolves a new target from the mutable SelectedPlayer property.
        internal sealed class PrimaryLaserState
        {
            internal Session Owner;
            internal CharacterInfo Info;
            internal ShipGameplayLease OwnerLife;
            internal int MapId, TargetId;
            internal long SelectionGeneration;
            internal long OwnerTdmLife, PlayerTdmLife;
            internal MapActor OwnerActor, PlayerActor;
            internal Npc Npc;
            internal string NpcLife;
            internal Session Player;
            internal CharacterInfo PlayerInfo;
            internal ShipGameplayLease PlayerLife;
            internal Timer Timer;
            internal Action ResumeTick;
            internal bool WaitingForRange;
            internal long RangeRetryDeadline;
        }

        [ThreadStatic] private static PrimaryLaserState executingPrimaryLaser;
        private const int PRIMARY_LASER_RANGE_CHECK_MS = 50;

        private static void SuspendPrimaryLaserForRange(Session owner, int targetId)
        {
            var state = executingPrimaryLaser;
            if (state == null || state.Owner != owner || state.TargetId != targetId
                || !IsPrimaryLaserCurrent(state)) return;
            LaserVisualService.PauseForRange(owner, targetId);
            state.WaitingForRange = true;
            // Keep the existing full attack/auto-launcher retry rate while out
            // of laser range. Lightweight probes must not accelerate it.
            state.RangeRetryDeadline = Stopwatch.GetTimestamp()
                + (long)Math.Ceiling(state.Info.AttackSpeed * Stopwatch.Frequency / 1000.0);
        }

        private static bool ShouldWaitForPrimaryLaserRange(PrimaryLaserState state)
        {
            if (!state.WaitingForRange || Stopwatch.GetTimestamp() >= state.RangeRetryDeadline)
                return false;
            // Read the same authoritative positions as the normal admission
            // path. Do not advance motion or admit damage from client positions.
            double distance = state.Npc != null ? GetDistanceNpc(state.Owner, state.Npc)
                : GetDistance(state.Owner, state.Player);
            return distance > GetLaserRange(state.Info.SelectedAmmo);
        }

        private static bool IsPrimaryLaserCurrent(PrimaryLaserState state, bool checkTargetLife = true)
        {
            if (state == null || state.Owner.CharacterInfo != state.Info
                || state.Info.PrimaryLaser != state || state.Owner.StoppedPlayer
                || state.Info.Disconnected || state.Info.Destroy
                || state.Info.GameplayLease != state.OwnerLife
                || Interlocked.Read(ref state.Owner.TdmLifeGeneration) != state.OwnerTdmLife
                || state.Owner.CurrentMapId != state.MapId
                || state.Info.SelectedPlayer != state.TargetId
                || state.Info.LaserSelectionGeneration != state.SelectionGeneration) return false;
            if (!checkTargetLife) return true;
            var map = MapManager.GetInstanceByMapId(state.MapId);
            if (map == null) return false;
            if (state.OwnerActor != null && !ReferenceEquals(state.OwnerActor,
                map.GetActorByReferenceId(state.Owner.CharacterId, MapActorType.UserCharacter))) return false;
            if (state.Npc != null)
            {
                var actor = map.GetActorByReferenceId(state.TargetId, MapActorType.AiBot);
                return actor != null && ReferenceEquals(actor.ReferenceObject, state.Npc)
                    && !state.Npc.IsDestroying && state.Npc.ShipHp > 0 && state.Npc.VisualLifeToken == state.NpcLife;
            }
            return state.Player != null && state.Player.CharacterInfo == state.PlayerInfo
                && !state.Player.StoppedPlayer && !state.PlayerInfo.Disconnected && !state.PlayerInfo.Destroy && state.PlayerInfo.ShipHp > 0
                && state.PlayerInfo.GameplayLease == state.PlayerLife
                && Interlocked.Read(ref state.Player.TdmLifeGeneration) == state.PlayerTdmLife
                && (state.PlayerActor == null || ReferenceEquals(state.PlayerActor,
                    map.GetActorByReferenceId(state.TargetId, MapActorType.UserCharacter)))
                && state.Player.CurrentMapId == state.MapId;
        }

        private static int PrimaryLaserWait(CharacterInfo info)
        {
            long remaining = Interlocked.Read(ref info.PrimaryLaserDeadline) - Stopwatch.GetTimestamp();
            return remaining <= 0 ? 0 : (int)Math.Min(int.MaxValue,
                Math.Ceiling(remaining * 1000.0 / Stopwatch.Frequency));
        }

        private static void ReservePrimaryLaserDeadline(CharacterInfo info)
        {
            info.PreviousDamageTime = DateTime.Now.TimeOfDay.TotalMilliseconds;
            Interlocked.Exchange(ref info.PrimaryLaserDeadline, Stopwatch.GetTimestamp()
                + (long)Math.Ceiling(info.AttackSpeed * Stopwatch.Frequency / 1000.0));
        }

        // Return 0 for stale/cooldown, -1 for missing ammo, 1 for a committed
        // salvo. Only this short admission section is shared with selection;
        // slow damage/reward transactions execute after it has been released.
        private static int AdmitLaserVolley(Session owner, LaserVolleySnapshot volley, int targetId)
        {
            var info = owner.CharacterInfo;
            lock (info.PrimaryLaserSync)
            {
                if (info.SelectedPlayer != targetId || info.Destroy || info.Disconnected || owner.StoppedPlayer
                    || IsStalePrimaryCleanup(owner)) return 0;
                if (executingPrimaryLaser != null && executingPrimaryLaser.Owner == owner
                    && !IsPrimaryLaserCurrent(executingPrimaryLaser)) return 0;
                if (volley.AmmoId == 6 ? !IsRsbReady(owner) : PrimaryLaserWait(info) > 0) return 0;
                if (!info.TryConsumeLaserAmmo(volley)) return -1;
                if (volley.AmmoId != 6) ReservePrimaryLaserDeadline(info);
                return 1;
            }
        }

        private static void CancelPrimaryLaser(CharacterInfo info)
        {
            lock (info.PrimaryLaserSync)
            {
                var state = info.PrimaryLaser;
                info.PrimaryLaser = null;
                if (state != null) LaserVisualService.Stop(state.Owner);
                if (state != null && state.Timer != null) state.Timer.Dispose();
                if (info.LaserAttackTimer != null) info.LaserAttackTimer.Dispose();
                info.LaserAttackTimer = null;
                // The weapon deadline deliberately survives stop, target change and death.
            }
        }

        private static void StartPrimaryLaser(Session owner, object target)
        {
            var info = owner.CharacterInfo;
            lock (info.PrimaryLaserSync)
            {
                CancelPrimaryLaser(info);
                var npc = target as Npc;
                var player = target as Session;
                var map = MapManager.GetInstanceByMapId(owner.CurrentMapId);
                if (map == null) return;
                var state = new PrimaryLaserState {
                    Owner = owner, Info = info, OwnerLife = info.GameplayLease,
                    MapId = owner.CurrentMapId, TargetId = npc != null ? npc.Id : player.CharacterId,
                    SelectionGeneration = info.LaserSelectionGeneration,
                    OwnerTdmLife = Interlocked.Read(ref owner.TdmLifeGeneration),
                    PlayerTdmLife = player == null ? 0 : Interlocked.Read(ref player.TdmLifeGeneration),
                    OwnerActor = map.GetActorByReferenceId(owner.CharacterId, MapActorType.UserCharacter),
                    PlayerActor = player == null ? null : map.GetActorByReferenceId(player.CharacterId, MapActorType.UserCharacter),
                    Npc = npc, NpcLife = npc == null ? null : npc.VisualLifeToken,
                    Player = player, PlayerInfo = player == null ? null : player.CharacterInfo,
                    PlayerLife = player == null ? null : player.CharacterInfo.GameplayLease
                };
                state.ResumeTick = () => LaserAttackTimer(state);
                info.PrimaryLaser = state;
                if (!IsPrimaryLaserCurrent(state)) { info.PrimaryLaser = null; return; }
                state.Timer = new Timer(LaserAttackTimer, state, Timeout.Infinite, Timeout.Infinite);
                info.LaserAttackTimer = state.Timer;
                state.Timer.Change(PrimaryLaserWait(info), Timeout.Infinite);
            }
        }

        private static void SchedulePrimaryLaser(PrimaryLaserState state, int fallbackDelay)
        {
            lock (state.Info.PrimaryLaserSync)
            {
                if (!IsPrimaryLaserCurrent(state)) return;
                int wait = PrimaryLaserWait(state.Info);
                state.Timer.Change(wait > 0 ? wait : fallbackDelay, Timeout.Infinite);
            }
        }

        private static bool IsStalePrimaryCleanup(Session owner)
        {
            var state = executingPrimaryLaser;
            return state != null && state.Owner == owner && !IsPrimaryLaserCurrent(state, false);
        }

        internal static void StopLaserForTarget(Session owner, Session player, int targetId)
        {
            StopLaser(owner, player, true, targetId);
        }
    }
}
