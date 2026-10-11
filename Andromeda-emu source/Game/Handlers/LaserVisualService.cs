using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Incoming;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Npcs;
using OrbitReborn_Emulator.Game.Sessions;

namespace OrbitReborn_Emulator.Game.Handlers
{
    // Optional visual protocol. This registry never advances movement, admits a
    // shot, changes an attack timer, or writes gameplay/persistent state.
    internal static class LaserVisualService
    {
        private sealed class PublicId
        {
            internal string Value;
            internal long DroneEpoch, TdmLife;
        }
        private sealed class Observer
        {
            internal string Scope;
            internal MapInstance Map;
            internal readonly Dictionary<int, string> Lives = new Dictionary<int, string>();
        }
        private sealed class Engagement
        {
            internal object Attacker, Target;
            internal MapActor AttackerActor, TargetActor;
            internal MapInstance Map;
            internal int AttackerId, TargetId, Pattern, Shield, Fat, Expansion;
            internal int AttackerGateOwner, TargetGateOwner;
            internal string AttackerLife, TargetLife, State = "ATTACKING", Channel = "P";
            internal long Generation, Sequence, Selection;
            internal double Range;
        }
        private static readonly object Sync = new object();
        private static readonly ConditionalWeakTable<object, PublicId> PublicIds = new ConditionalWeakTable<object, PublicId>();
        private static readonly ConditionalWeakTable<Session, Observer> Observers = new ConditionalWeakTable<Session, Observer>();
        private static readonly Dictionary<object, Engagement> Active = new Dictionary<object, Engagement>();
        private static readonly Dictionary<object, Engagement> Bursts = new Dictionary<object, Engagement>();
        private static readonly Dictionary<object, HashSet<Engagement>> Involving = new Dictionary<object, HashSet<Engagement>>();
        private static long nextGeneration;

        private static int Id(object actor) { var p = actor as Session; return p != null ? p.CharacterId : ((Npc)actor).Id; }
        private static MapActor Resolve(MapInstance map, object actor)
        {
            return map == null || actor == null ? null : map.GetActorByReferenceId(Id(actor), actor is Npc ? MapActorType.AiBot : MapActorType.UserCharacter);
        }
        private static string Life(object actor, MapActor mapActor)
        {
            if (mapActor == null) return null;
            var npc = actor as Npc;
            if (npc != null) return npc.VisualLifeToken;
            var player = (Session)actor;
            var id = PublicIds.GetValue(mapActor, k => new PublicId());
            long epoch = Interlocked.Read(ref player.DroneLifeEpoch);
            long tdmLife = Interlocked.Read(ref player.TdmLifeGeneration);
            // Life() is called under Sync. Internal life counters select a new
            // opaque public ID; neither counter nor any lease reaches the wire.
            if (id.Value == null || id.DroneEpoch != epoch || id.TdmLife != tdmLife)
            {
                id.Value = Guid.NewGuid().ToString("N");
                id.DroneEpoch = epoch;
                id.TdmLife = tdmLife;
            }
            return id.Value;
        }
        private static bool Alive(object actor, MapInstance map)
        {
            var npc = actor as Npc;
            if (npc != null) return !npc.IsDestroying && npc.ShipHp > 0 && npc.MapId == map.MapId;
            var p = actor as Session;
            return p != null && p.CharacterInfo != null && !p.StoppedPlayer && !p.CharacterInfo.Disconnected
                && !p.CharacterInfo.Destroy && p.CharacterInfo.ShipHp > 0 && p.CurrentMapId == map.MapId;
        }
        private static bool Current(Engagement e)
        {
            if (!Alive(e.Attacker, e.Map) || !Alive(e.Target, e.Map)
                || !ReferenceEquals(Resolve(e.Map, e.Attacker), e.AttackerActor)
                || !ReferenceEquals(Resolve(e.Map, e.Target), e.TargetActor)
                || Life(e.Attacker, e.AttackerActor) != e.AttackerLife || Life(e.Target, e.TargetActor) != e.TargetLife) return false;
            var p = e.Attacker as Session;
            return p != null ? p.CharacterInfo.SelectedPlayer == e.TargetId && p.CharacterInfo.LaserSelectionGeneration == e.Selection
                : ((Npc)e.Attacker).TargetId == e.TargetId && ((Npc)e.Attacker).IsAttacking
                    && Interlocked.Read(ref ((Npc)e.Attacker).LaserVisualEpoch) == e.Selection;
        }
        private static double CurrentRange(Engagement e)
        {
            var player = e.Attacker as Session;
            return player != null && e.Channel == "P" ? Fight.GetLaserRange(player.CharacterInfo.SelectedAmmo) : e.Range;
        }
        private static double DistanceSquared(Engagement e)
        {
            var ap = e.Attacker as Session; var tp = e.Target as Session;
            double ax = ap != null ? ap.CharacterInfo.LocX : ((Npc)e.Attacker).LocX;
            double ay = ap != null ? ap.CharacterInfo.LocY : ((Npc)e.Attacker).LocY;
            double tx = tp != null ? tp.CharacterInfo.LocX : ((Npc)e.Target).LocX;
            double ty = tp != null ? tp.CharacterInfo.LocY : ((Npc)e.Target).LocY;
            return (ax-tx)*(ax-tx)+(ay-ty)*(ay-ty);
        }
        private static void Index(object actor, Engagement e)
        {
            HashSet<Engagement> set;
            if (!Involving.TryGetValue(actor, out set)) Involving[actor] = set = new HashSet<Engagement>();
            set.Add(e);
        }
        private static void Unindex(object actor, Engagement e)
        {
            HashSet<Engagement> set;
            if (Involving.TryGetValue(actor, out set)) { set.Remove(e); if (set.Count == 0) Involving.Remove(actor); }
        }
        // GG may create/remove actors while holding its own lock. Resolve this
        // immutable ownership before Sync, never from a publication under Sync.
        private static int GateOwner(object actor)
        {
            var npc = actor as Npc;
            if (npc == null || !GalaxyGateWaveService.IsGateMap(npc.MapId)) return 0;
            int owner;
            return GalaxyGateWaveService.TryGetNpcOwner(npc.Id, out owner) && owner > 0 ? owner : -1;
        }
        private static bool Visible(Session observer, Observer view, Engagement e)
        {
            if (view.Map != e.Map || observer.CurrentMapId != e.Map.MapId) return false;
            string life;
            if (!view.Lives.TryGetValue(e.AttackerId, out life) || life != e.AttackerLife
                || !view.Lives.TryGetValue(e.TargetId, out life) || life != e.TargetLife) return false;
            var an = e.Attacker as Npc; var tn = e.Target as Npc;
            if (an != null && GalaxyGateWaveService.IsGateMap(an.MapId) && e.AttackerGateOwner != observer.CharacterId) return false;
            if (tn != null && GalaxyGateWaveService.IsGateMap(tn.MapId) && e.TargetGateOwner != observer.CharacterId) return false;
            return (e.AttackerId == observer.CharacterId || (an != null ? observer.CharacterInfo.NpcInRange.Contains(e.AttackerId) : observer.CharacterInfo.PlayerInRange.Contains(e.AttackerId)))
                && (e.TargetId == observer.CharacterId || (tn != null ? observer.CharacterInfo.NpcInRange.Contains(e.TargetId) : observer.CharacterInfo.PlayerInRange.Contains(e.TargetId)));
        }
        private static string Payload(Observer view, Engagement e, string action, string channel)
        {
            return "1|"+action+"|"+view.Scope+"|"+e.AttackerId+"|"+e.TargetId+"|"+e.Map.MapId+"|"+e.Map.InstanceId
                +"|"+e.AttackerLife+"|"+e.TargetLife+"|"+e.Generation+"|"+e.Sequence+"|"+e.State+"|"+channel
                +"|"+e.Pattern+"|"+e.Shield+"|"+e.Fat+"|"+e.Expansion;
        }
        private static void Publish(Engagement e, string action)
        {
            foreach (var actor in e.Map.GetUserActorSnapshot())
            {
                if (actor == null || actor.ReferenceSessionId <= 0) continue;
                var observer = SessionManager.GetSessionById(actor.ReferenceSessionId); Observer view;
                if (observer != null && observer.CharacterInfo != null && observer.CharacterId != e.AttackerId
                    && Observers.TryGetValue(observer, out view) && Visible(observer, view, e))
                    observer.SendData(PacketComposer.Compose("LVS", Payload(view, e, action, e.Channel)));
            }
        }
        private static void StopLocked(Engagement e)
        {
            e.State = "STOPPED"; e.Sequence++; Publish(e, "STATE");
            Engagement current;
            if (Active.TryGetValue(e.Attacker, out current) && ReferenceEquals(current,e)) Active.Remove(e.Attacker);
            if (Bursts.TryGetValue(e.Attacker, out current) && ReferenceEquals(current,e)) Bursts.Remove(e.Attacker);
            Unindex(e.Attacker,e); Unindex(e.Target,e);
        }
        internal static void Stop(object attacker)
        {
            if (attacker == null) return;
            lock (Sync)
            {
                Engagement e;
                if (Active.TryGetValue(attacker, out e)) StopLocked(e);
                if (Bursts.TryGetValue(attacker, out e)) StopLocked(e);
            }
        }
        internal static void Remove(object actor)
        {
            if (actor == null) return;
            var npc=actor as Npc; var player=actor as Session;
            int mapId=npc!=null ? npc.MapId : player.CharacterInfo==null ? 0 : player.CharacterInfo.MapId;
            // MapManager may call RemoveMap while holding its map registry lock.
            var map=MapManager.GetInstanceByMapId(mapId);
            lock (Sync)
            {
                var retiredLives=new HashSet<string>();
                string currentLife=Life(actor,Resolve(map,actor));
                if(currentLife!=null)retiredLives.Add(currentLife);
                HashSet<Engagement> set;
                if (Involving.TryGetValue(actor, out set)) foreach (var e in new List<Engagement>(set))
                {
                    retiredLives.Add(ReferenceEquals(e.Attacker,actor)?e.AttackerLife:e.TargetLife);
                    StopLocked(e);
                }
                // Publish STOP first; pruning must not hide the terminal state.
                if(map!=null)foreach(var visible in map.GetUserActorSnapshot())
                {
                    var observer=visible==null?null:SessionManager.GetSessionById(visible.ReferenceSessionId); Observer view; string life;
                    if(observer!=null && Observers.TryGetValue(observer,out view) && view.Map==map
                        && view.Lives.TryGetValue(Id(actor),out life) && retiredLives.Contains(life)) view.Lives.Remove(Id(actor));
                }
                if(player!=null)Observers.Remove(player);
            }
        }
        internal static void RemoveMap(MapInstance map)
        {
            lock (Sync)
            {
                foreach (var e in new List<Engagement>(Active.Values)) if (e.Map == map) StopLocked(e);
                foreach (var e in new List<Engagement>(Bursts.Values)) if (e.Map == map) StopLocked(e);
            }
        }
        internal static void PauseForRange(object attacker, int targetId)
        {
            lock (Sync)
            {
                Engagement e;
                if (Active.TryGetValue(attacker, out e) && e.TargetId == targetId && Current(e) && e.State != "PAUSED_RANGE")
                { e.State="PAUSED_RANGE"; e.Sequence++; Publish(e,"STATE"); }
            }
        }
        // Called only after an existing authoritative movement update, or an
        // existing combat tick. Cost follows engagements involving this actor.
        internal static void PositionChanged(object actor)
        {
            if (actor == null) return;
            lock (Sync)
            {
                HashSet<Engagement> set;
                if (!Involving.TryGetValue(actor, out set)) return;
                foreach (var e in new List<Engagement>(set))
                {
                    if (!Current(e)) { StopLocked(e); continue; }
                    double range = CurrentRange(e);
                    if (e.Channel == "P" && e.State != "PAUSED_RANGE" && DistanceSquared(e) > range*range)
                    { e.State = "PAUSED_RANGE"; e.Sequence++; Publish(e,"STATE"); }
                    // Returning within range is NOT a visual admission.
                }
            }
        }
        internal static void Shot(MapInstance map, object attacker, object target, int pattern, int shield, int fat, int expansion, double range, bool burst, long expectedSelection)
        {
            if (map == null || attacker == null || target == null) return;
            int attackerGateOwner=GateOwner(attacker), targetGateOwner=GateOwner(target);
            if (attackerGateOwner < 0 || targetGateOwner < 0) return;
            lock (Sync)
            {
                var aa=Resolve(map,attacker); var ta=Resolve(map,target);
                if (aa == null || ta == null || !Alive(attacker,map) || !Alive(target,map)) return;
                var player=attacker as Session;
                long selection=player == null ? Interlocked.Read(ref ((Npc)attacker).LaserVisualEpoch) : player.CharacterInfo.LaserSelectionGeneration;
                if (selection != expectedSelection || (player != null ? player.CharacterInfo.SelectedPlayer != Id(target)
                    : ((Npc)attacker).TargetId != Id(target) || !((Npc)attacker).IsAttacking)) return;
                var al=Life(attacker,aa); var tl=Life(target,ta); Engagement e;
                Active.TryGetValue(attacker,out e);
                if (burst)
                {
                    Engagement priorBurst;
                    if (Bursts.TryGetValue(attacker,out priorBurst)) StopLocked(priorBurst);
                    e = null; // RSB never wakes, pauses or replaces the primary job.
                }
                else if (e != null && (!Current(e) || e.Target != target || e.AttackerLife != al || e.TargetLife != tl || e.Selection != selection))
                { StopLocked(e); e=null; }
                if (e == null)
                {
                    e=new Engagement { Map=map,Attacker=attacker,Target=target,AttackerActor=aa,TargetActor=ta,
                        AttackerId=Id(attacker),TargetId=Id(target),AttackerLife=al,TargetLife=tl,Selection=selection,
                        AttackerGateOwner=attackerGateOwner,TargetGateOwner=targetGateOwner,
                        Generation=Interlocked.Increment(ref nextGeneration),Channel=burst?"R":"P" };
                    if (!burst) Active[attacker]=e; else Bursts[attacker]=e;
                    Index(attacker,e); Index(target,e);
                }
                e.Pattern=pattern; e.Shield=shield; e.Fat=fat; e.Expansion=expansion; e.Range=range;
                e.State="ATTACKING"; e.Sequence++; Publish(e,"SHOT");
                // The shot was already committed by the caller. Movement can
                // cross the boundary between admission and this publication:
                // keep that shot, but do not wake later pulses while outside.
                double currentRange = CurrentRange(e);
                if (!burst && DistanceSquared(e) > currentRange*currentRange)
                { e.State="PAUSED_RANGE"; e.Sequence++; Publish(e,"STATE"); }
            }
        }
        private static void Append(ServerMessage message, string payload)
        { message.AppendShort("0|LVS"); message.Append(payload); message.AppendBreak(); }
        private static void AppendLife(ServerMessage message, Session observer, Observer view, object actor, MapActor mapActor)
        {
            string life=Life(actor,mapActor); if (life == null) return;
            int id=Id(actor); view.Lives[id]=life;
            Append(message,"LIFE|1|"+view.Scope+"|"+id+"|"+view.Map.MapId+"|"+view.Map.InstanceId+"|"+life);
        }
        internal static void AppendCreate(ServerMessage message, Session observer, object actor)
        {
            if (message == null || observer == null || actor == null) return;
            lock (Sync)
            {
                Observer view;
                if (!Observers.TryGetValue(observer,out view) || observer.CurrentMapId != view.Map.MapId) return;
                var mapActor=Resolve(view.Map,actor); if (mapActor == null) return;
                AppendLife(message,observer,view,actor,mapActor);
                HashSet<Engagement> set;
                if (Involving.TryGetValue(actor,out set)) foreach (var e in new List<Engagement>(set))
                    if (e.Channel == "P" && Current(e) && Visible(observer,view,e)) Append(message,Payload(view,e,"SNAPSHOT","P"));
            }
        }
        internal static void Created(Session observer, object actor)
        {
            Observer view;
            if (observer == null || !Observers.TryGetValue(observer, out view)) return;
            var message=new ServerMessage(); AppendCreate(message,observer,actor); observer.SendData(message);
        }
        internal static void Negotiate(Session session, ClientMessage message)
        {
            if (session == null || session.CharacterInfo == null || session.CurrentMapId <= 0 || message.GetNextString(1)!= "1") return;
            string requestNonce=message.GetNextString(2);
            if(requestNonce.Length!=0)
            {
                if(requestNonce.Length<16 || requestNonce.Length>64)return;
                foreach(char c in requestNonce)if(!((c>='0'&&c<='9')||(c>='a'&&c<='f')||(c>='A'&&c<='F')))return;
            }
            var map=MapManager.GetInstanceByMapId(session.CurrentMapId); if(map==null)return;
            var info=session.CharacterInfo;
            var expectedSelf=Resolve(map,session); if(expectedSelf==null)return;
            var allowedNpcs=new Dictionary<int, Tuple<MapActor,string>>();
            foreach(int id in (IEnumerable<int>)info.NpcInRange.Keys)
            {
                var actor=map.GetActorByReferenceId(id,MapActorType.AiBot); var npc=actor==null?null:actor.ReferenceObject as Npc;
                if(npc!=null && GalaxyGateWaveService.CanSessionInteractWithNpc(session,npc))
                    allowedNpcs[id]=Tuple.Create(actor,npc.VisualLifeToken);
            }
            lock(Sync)
            {
                if(session.CharacterInfo!=info || session.CurrentMapId!=map.MapId || !ReferenceEquals(Resolve(map,session),expectedSelf))return;
                Observers.Remove(session);
                var view=new Observer { Scope=Guid.NewGuid().ToString("N"),Map=map }; Observers.Add(session,view);
                var self=Resolve(map,session); if(self==null)return;
                var packet=PacketComposer.Compose("LVS","READY|1|"+view.Scope+"|"+map.MapId+"|"+map.InstanceId+"|"+Life(session,self)+(requestNonce.Length==0?"":"|"+requestNonce));
                packet.AppendBreak();
                AppendLife(packet,session,view,session,self);
                foreach(var actor in map.GetUserActorSnapshot())
                {
                    if(actor==null || actor.ReferenceId==session.CharacterId || !session.CharacterInfo.PlayerInRange.Contains(actor.ReferenceId))continue;
                    var player=SessionManager.GetSessionById(actor.ReferenceSessionId);
                    if(player!=null)AppendLife(packet,session,view,player,actor);
                }
                foreach(var allowed in allowedNpcs)
                {
                    var actor=map.GetActorByReferenceId(allowed.Key,MapActorType.AiBot); var npc=actor==null?null:actor.ReferenceObject as Npc;
                    if(npc!=null && ReferenceEquals(actor,allowed.Value.Item1) && npc.VisualLifeToken==allowed.Value.Item2
                        && info.NpcInRange.Contains(allowed.Key) && Alive(npc,map))AppendLife(packet,session,view,npc,actor);
                }
                foreach(var e in Active.Values)if(Current(e)&&Visible(session,view,e))Append(packet,Payload(view,e,"SNAPSHOT","P"));
                session.SendData(packet);
            }
        }
    }
}
