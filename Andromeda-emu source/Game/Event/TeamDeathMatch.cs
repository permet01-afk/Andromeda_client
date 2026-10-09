using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Event.Tdm;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Techs;

namespace OrbitReborn_Emulator.Game.Event
{
    // Runtime adapter. The core never calls back into gameplay locks.
    // MOBILE TDM SUPPORT: DEFERRED TO FUTURE PHASE.
    public static class TeamDeathMatch
    {
        private static readonly long StartedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        private static readonly System.Diagnostics.Stopwatch Elapsed = System.Diagnostics.Stopwatch.StartNew();
        public static readonly TdmEventService State = new TdmEventService(() => StartedAt + Elapsed.ElapsedMilliseconds);
        private static readonly ConcurrentDictionary<int, Session> Clients = new ConcurrentDictionary<int, Session>();
        private static readonly ConcurrentDictionary<int, int[]> Vitals = new ConcurrentDictionary<int, int[]>();
        private static Timer Pulse;
        private static int Pumping;
        private static long LastPublish;
        public static void Initialize()
        {
            DataRouter.RegisterHandler("TDM", Handle);
            Pulse = new Timer(_ => Tick(), null, 250, 250);
        }
        public static bool IsActive() { return State.Active; }
        public static bool SafeBattle() { return State.Safe; }
        public static void Enable(string occurrenceId = null) { State.Enable(occurrenceId); PublishAll(); }
        public static void Disable() { State.Disable(); TdmRewardRuntime.Capture(State); Pump(); PublishAll(); }
        public static bool IsParticipant(Session s) { return s != null && State.Contains(s.CharacterId); }
        public static bool IsTdm(Session s) { return s != null && s.CharacterInfo != null && s.CharacterInfo.MapId == TdmRules.Map; }
        private static TdmPresence Read(Session s)
        {
            var c = s.CharacterInfo;
            return new TdmPresence { Id = s.CharacterId, Company = c.FactionId, Level = c.Level, Map = c.MapId, X = c.LocX, Y = c.LocY,
                Connected = !s.Stopped && !s.StoppedPlayer && !c.Disconnected,
                Ready = !c.Destroy && !c.DeadCommitted && c.ShipHp > 0 && !c.IsJumping && !s.HasPendingGameplayDeath,
                Compatible = !GalaxyGateWaveService.IsGateMap(c.MapId) && !_1v1.IsOnMap(c.MapId) && !_1v1.IsCharacterInMatch(s.CharacterId) && c.MapId != 80 && c.MapId != 81 };
        }
        private static void Handle(Session s, ClientMessage message)
        {
            if (s == null || s.IsChat || s.CharacterInfo == null || message.GetNextInt(1) != 1) return;
            string action = message.GetNextString(2);
            if (action == "HELLO")
            {
                Session previous;
                bool changed = !Clients.TryGetValue(s.CharacterId, out previous) || !ReferenceEquals(previous, s);
                Clients[s.CharacterId] = s; State.Observe(Read(s));
                State.Reconnect(s.CharacterId, changed);
                Pump(); Publish(s); return;
            }
            Session registered;
            if (!Clients.TryGetValue(s.CharacterId, out registered) || !ReferenceEquals(registered, s))
            { Notice(s, "Team Deathmatch requires the current desktop HTML5 client."); return; }
            State.Observe(Read(s));
            if (action == "OPEN") { TryOpenLobby(s, true); return; }
            if (action == "SYNC") { Publish(s); return; }
            long request;
            if (!long.TryParse(message.GetNextString(4), out request)) return;
            string error = State.Command(s.CharacterId, message.GetNextString(3), request, action, message.GetNextString(5));
            Pump(); Publish(s, error);
        }
        public static bool TryOpenLobby(Session s, bool explicitOpen = false)
        {
            if (s == null || s.CharacterInfo == null) return false;
            var c = s.CharacterInfo;
            bool near = TdmRules.NearBeacon(c.MapId, c.FactionId, c.LocX, c.LocY);
            if (!near) { if (explicitOpen) Publish(s, "Approach the TDM beacon and press J."); return explicitOpen; }
            Session registered;
            if (!Clients.TryGetValue(s.CharacterId, out registered) || !ReferenceEquals(registered, s))
            { if (State.Active) Notice(s, "Team Deathmatch requires the current desktop HTML5 client."); return State.Active; }
            State.Observe(Read(s)); bool opened = State.Open(s.CharacterId);
            Publish(s, opened ? "" : !State.Active ? TdmRules.Unavailable : "A connected READY ship is required.", true);
            return true; // BEFORE normal jump state/timers/position mutation
        }
        private static void Tick()
        {
            try
            {
                foreach (var item in Clients.ToArray())
                {
                    var s = item.Value; if (s.CharacterInfo == null) continue;
                    State.Observe(Read(s));
                    if (s.StoppedPlayer && !State.Contains(item.Key)) { Session ignored; Clients.TryRemove(item.Key, out ignored); }
                }
                State.Tick(); TdmRewardRuntime.Capture(State); Pump();
                long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                if (now - Interlocked.Read(ref LastPublish) >= 1000) { Interlocked.Exchange(ref LastPublish, now); PublishAll(); }
            }
            catch (Exception ex) { Output.WriteLine("[TDM] pulse: " + ex, OutputLevel.CriticalError); }
        }
        public static void Publish(Session s, string error = "", bool open = false)
        {
            if (s == null || s.CharacterInfo == null || s.Stopped || s.StoppedPlayer) return;
            var json = new JavaScriptSerializer().Serialize(State.Snapshot(s.CharacterId, error, open));
            s.SendData(PacketComposer.Compose("TDM", "1|" + Convert.ToBase64String(Encoding.UTF8.GetBytes(json))));
        }
        private static void PublishAll() { foreach (var s in Clients.Values.ToArray()) Publish(s); }
        private static void Notice(Session s, string text) { s.SendData(PacketComposer.Compose("A", "STD|" + text)); }
        public static void RecordDamage(Session a, Session v, long amount)
        { if (IsTdm(a) && IsTdm(v)) State.RecordDamage(a.CharacterId, v.CharacterId, amount); }
        public static void RewardCompleted(TdmRewardClaim claim, TdmRewardReceipt receipt)
        {
            State.SetRewardReceipt(claim.PlayerId, claim.MatchId, receipt);
            Session s;
            if (!Clients.TryGetValue(claim.PlayerId, out s) || s.CharacterInfo == null || s.Stopped || s.StoppedPlayer) return;
            try
            {
                if (receipt.status == "PAID")
                {
                    // Absolute DB read, never an in-memory reward delta on replay.
                    s.CharacterInfo.RefreshTdmRewardData();
                    s.SendData(UserDataComposer.Compose(s));
                    Notice(s, "TDM REWARD: " + receipt.experience + " Experience, " + receipt.uridium + " Uridium, " + receipt.honor + " Honor.");
                }
                Publish(s);
            }
            catch (Exception ex) { Output.WriteLine("[TDM] paid reward UI refresh: " + ex.Message, OutputLevel.Warning); }
        }
        public static bool CanDamage(Session a, Session v)
        { return IsTdm(a) && IsTdm(v) && State.CanDamage(a.CharacterId, v.CharacterId); }
        public static bool ValidAttack(Session a, Session v)
        { return !IsTdm(a) && !IsTdm(v) || (IsTdm(a) && IsTdm(v) && State.Attack(a.CharacterId, v.CharacterId)); }
        public static bool ValidProjectile(Session a, long life)
        { return a != null && Interlocked.Read(ref a.TdmLifeGeneration) == life; }
        public static bool AllowMove(Session s, int x, int y)
        {
            if (!IsTdm(s) || State.Move(s.CharacterId, x, y)) return true;
            s.SendData(UserDataComposer.Compose(s)); return false;
        }
        // Under existing victim lifecycle/impact locks, BEFORE Phase4/5 and rewards.
        public static bool TryDeath(Session victim, GameplayDeathContext context)
        {
            if (!IsTdm(victim)) return false;
            var c = victim.CharacterInfo;
            if (!DroneWearService.IsPendingDeath(victim, context)) return true;
            var killer = context.Cause == GameplayDeathCause.Pvp ? c.Attacker : null;
            bool admitted = State.Die(victim.CharacterId, killer == null ? 0 : killer.CharacterId, context.TdmLife);
            // ANDROMEDA CUSTOM: no wear, hull debt, cargo loss or kill payout.
            c.TdmDead = true; c.PendingDroneDeath = null; c.Destroy = true;
            c.CanMove = false; c.CanLaserAttack = false;
            if (!admitted && !State.IsDead(victim.CharacterId)) State.AbortParticipant(victim.CharacterId);
            return true;
        }
        public static void BeforeLogin(Session s, bool supportsTdm)
        {
            // A supported reconnect resumes after HELLO. Restart has no membership.
            // Never resurrect a runtime match merely from persisted map83.
            if (!supportsTdm)
            {
                Session ignored; Clients.TryRemove(s.CharacterId, out ignored);
                if (IsParticipant(s)) { State.Disconnect(s.CharacterId, true); ReturnHome(s, false); }
            }
            if (IsTdm(s) && !IsParticipant(s)) ReturnHome(s, false);
        }
        public static void BeforeDisconnect(Session s, bool explicitLeave)
        {
            if (s == null || s.CharacterInfo == null || s.IsChat) return;
            Session owner;
            if (Clients.TryGetValue(s.CharacterId, out owner) && !ReferenceEquals(owner, s)) return;
            bool tdm = IsTdm(s) || s.CharacterInfo.TdmDead;
            if (tdm) Vitals[s.CharacterId] = new[] { s.CharacterInfo.ShipHp, s.CharacterInfo.ShipShield };
            State.Disconnect(s.CharacterId, explicitLeave);
            if (tdm) ReturnHome(s, false);
        }
        public static void removeUserFromTdm(Session s) { BeforeDisconnect(s, true); }
        private static void StopCombat(Session s)
        {
            Fight.StopLaser(s, null); Fight.StopCurrentShipSkill(s, true); TechInventoryService.StopBattleRepairOnDeath(s);
            ShipMovement.StopMovementTracking(s);
            var c = s.CharacterInfo; c.SelectedPlayer = 0; c.Attacker = null; c.Attacking = false;
            c.NoFightTimer = 0; c.IsRepairing = false; c.OutOfRange = false;
            var map = MapManager.GetInstanceByMapId(s.CurrentMapId);
            if (map != null) foreach (var actor in map.GetUserActorSnapshot())
            {
                var other = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (other == null || other.CharacterInfo == null || other.CharacterId == s.CharacterId) continue;
                other.CharacterInfo.PlayerInRange.Remove(s.CharacterId);
                if (other.CharacterInfo.SelectedPlayer == s.CharacterId) { Fight.StopLaser(other, s); other.CharacterInfo.SelectedPlayer = 0; }
            }
        }
        private static void Restore(Session s)
        {
            var c = s.CharacterInfo; c.TdmDead = false; c.PendingDroneDeath = null; c.Destroy = false;
            c.ShipHp = c.ShipMaxHp; c.ShipShield = c.ShipMaxShield;
            c.CanMove = true; c.CanLaserAttack = true; c.PeaceZone = false; c.TradeZone = false;
        }
        private static void ReturnHome(Session s, bool transfer)
        {
            try { StopCombat(s); }
            catch (Exception ex) { Output.WriteLine("[TDM] combat cleanup: " + ex, OutputLevel.CriticalError); }
            Restore(s); Interlocked.Increment(ref s.TdmLifeGeneration);
            var c = s.CharacterInfo;
            int home = TdmRules.Home(c.FactionId);
            c.LocX = c.FactionId == 1 ? 2000 : c.FactionId == 2 ? 18500 : 19000; c.LocY = c.FactionId == 3 ? 11300 : 1100;
            c.NewLocX = c.LocX; c.NewLocY = c.LocY;
            try
            {
                if (transfer && !s.Stopped && !s.StoppedPlayer && !c.Disconnected) MapHandler.OpenPublicConnection(s, home);
            }
            finally
            {
                // Even a missing home map cannot leave map83 in the normal save path.
                // The next login can rebuild the home scene once map loading recovers.
                if (!transfer || c.MapId != home || !s.MapJoined)
                {
                    try { MapManager.RemoveUserFromMap(s); }
                    finally { c.MapId = home; s.AbsoluteMapId = home; s.MapJoined = false; s.MapAuthed = false; }
                    if (transfer) Notice(s, "You have been returned home. Please reconnect to reload the map.");
                }
            }
        }
        private static void Pump()
        {
            if (Interlocked.CompareExchange(ref Pumping, 1, 0) != 0) return;
            try
            {
                TdmEffect[] work;
                while ((work = State.DrainEffects()).Length > 0) foreach (var e in work)
                {
                    Session s;
                    if (!Clients.TryGetValue(e.Player, out s) || s.CharacterInfo == null || !State.IsCurrent(e)) continue;
                    try
                    {
                        lock (TechInventoryService.SyncRoot(s.CharacterId))
                        lock (s.CharacterInfo.DroneImpactSyncRoot)
                        {
                            if (!State.IsCurrent(e)) continue;
                            if (e.Kind == "HOME")
                            {
                                // Result expiry / repeated LEAVE must never heal, teleport
                                // or undo a normal Phase5 death after the pilot is home.
                                if (IsTdm(s) || s.CharacterInfo.TdmDead)
                                {
                                    if (s.CharacterInfo.TdmDead && s.MapJoined) PublishDeath(s);
                                    ReturnHome(s, !s.StoppedPlayer);
                                }
                                int[] ignored; Vitals.TryRemove(s.CharacterId, out ignored); Publish(s); continue;
                            }
                            if (s.Stopped || s.StoppedPlayer || s.CharacterInfo.Disconnected) { State.Disconnect(s.CharacterId, false); continue; }
                            if (e.Kind == "ENTER" && !Read(s).Eligible) { State.TransferFailed(e.MatchId); continue; }
                            StopCombat(s); Interlocked.Exchange(ref s.TdmLifeGeneration, e.Generation);
                            var info = MapInfoLoader.GetMapInfo(TdmRules.Map);
                            if (info == null || info.MaxUsers < TdmRules.Max) { State.TransferFailed(e.MatchId); continue; }
                            if (e.Kind != "DEATH" || !IsTdm(s))
                            {
                                Restore(s);
                                int[] vitals;
                                if (e.Kind == "RECONNECT" && Vitals.TryRemove(s.CharacterId, out vitals))
                                { s.CharacterInfo.ShipHp = Math.Max(1, Math.Min(vitals[0], s.CharacterInfo.ShipMaxHp)); s.CharacterInfo.ShipShield = Math.Min(vitals[1], s.CharacterInfo.ShipMaxShield); }
                                double angle = e.Seat * Math.PI / 4;
                                s.CharacterInfo.LocX = TdmRules.SpawnX(e.Side) + (int)Math.Round(Math.Cos(angle) * 360);
                                s.CharacterInfo.LocY = 6550 + (int)Math.Round(Math.Sin(angle) * 360);
                                s.CharacterInfo.NewLocX = s.CharacterInfo.LocX; s.CharacterInfo.NewLocY = s.CharacterInfo.LocY;
                                MapHandler.OpenPublicConnection(s, TdmRules.Map);
                                if (s.CharacterInfo.MapId != TdmRules.Map || !s.MapJoined) { State.TransferFailed(e.MatchId); continue; }
                                if (!State.MarkEntered(e)) { ReturnHome(s, true); continue; }
                            }
                            if (e.Kind == "DEATH")
                            {
                                s.CharacterInfo.TdmDead = true; s.CharacterInfo.Destroy = true; s.CharacterInfo.ShipHp = 0;
                                s.CharacterInfo.CanMove = s.CharacterInfo.CanLaserAttack = false; Publish(s);
                                PublishDeath(s);
                                MapManager.RemoveUserFromMap(s);
                            }
                            Publish(s);
                        }
                    }
                    catch (Exception ex) { State.TransferFailed(e.MatchId); Output.WriteLine("[TDM] transfer/cleanup: " + ex, OutputLevel.CriticalError); }
                }
            }
            finally { Interlocked.Exchange(ref Pumping, 0); }
        }
        private static void PublishDeath(Session s)
        {
            var map = MapManager.GetInstanceByMapId(s.CurrentMapId);
            if (map == null) return;
            foreach (var actor in map.GetUserActorSnapshot())
            {
                var observer = SessionManager.GetSessionById(actor.ReferenceSessionId);
                if (observer != null) observer.SendData(PacketComposer.Compose("K", s.CharacterId + "|TDM"));
            }
        }
    }
}
