// Production loader / kill / cleanup on an explicit synthetic MariaDB fixture.
// No real emulator listener or owner account is used; packets use loopback sockets.
using System;
using OrbitReborn_Emulator;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Linq;
using System.Reflection;
using System.Runtime.Serialization;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Techs;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Specialized;
using OrbitReborn_Emulator.Storage;
using OrbitReborn_Emulator.Util;
internal static class ShipLifecycleRuntimeTests
{
    const int P=710005;
    const BindingFlags F=BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static;
    static int checks;
    static readonly ConcurrentDictionary<int,Session> sessions=new ConcurrentDictionary<int,Session>();
    static readonly List<TcpClient> receivers=new List<TcpClient>();
    static void Check(bool ok,string name){if(!ok)throw new Exception(name);checks++;Console.WriteLine("PASS "+name);}
    static object Fixture(string name,params object[] args){return typeof(ShipLifecycleDatabaseTests).GetMethod(name,F).Invoke(null,args);}
    static void Set(object o,string name,object value){o.GetType().GetField(name,F).SetValue(o,value);}
    static void SetStatic(Type t,string name,object value){t.GetField(name,F).SetValue(null,value);}
    static void Exec(string s){Fixture("Exec",s);}
    static long Value(string s){return (long)Fixture("Value",s);}
    static Session Shell(int id)
    {
        var c=(CharacterInfo)typeof(EquipmentPhase1Tests).GetMethod("Character",F).Invoke(null,null);
        Set(c,"mId",id);Set(c,"mSessionId",id);Set(c,"mUsername","fixture_"+id);
        var s=(Session)typeof(EquipmentPhase1Tests).GetMethod("Player",F).Invoke(null,new object[]{c,id});
        Set(s,"mAuthProcessed",true);Set(s,"TechState",new TechRuntimeState());Set(s,"DroneGameplayToken",Guid.NewGuid().ToString("N"));
        var listener=new TcpListener(IPAddress.Loopback,0);listener.Start();var receiver=new TcpClient();receiver.Connect((IPEndPoint)listener.LocalEndpoint);
        Set(s,"mSocket",listener.AcceptSocket());listener.Stop();receivers.Add(receiver);sessions[id]=s;return s;
    }
    static Session Load()
    {
        var s=Shell(P);s.ShipLease=ShipLifecycleService.BeginGameplay(P,s.DroneGameplayToken);s.DroneLifeEpoch=s.ShipLease.Epoch;
        using(var db=SqlDatabaseManager.GetClient())
        {
            s.CharacterInfo=CharacterInfoLoader.GenerateCharacterInfo(db,P,P,"");
            s.CharacterInfo.RefreshUserData(db);
        }
        s.CharacterInfo.Disconnected=false;SessionManager.RegisterAuthenticatedSession(s);return s;
    }
    static MapInstance Map(params Session[] players)
    {
        var map=(MapInstance)FormatterServices.GetUninitializedObject(typeof(MapInstance));
        foreach(var f in typeof(MapInstance).GetFields(F))
            if(!f.IsStatic && (f.FieldType==typeof(object) || f.FieldType.IsGenericType && f.FieldType.GetGenericTypeDefinition()==typeof(CDictionnary<,>)))f.SetValue(map,Activator.CreateInstance(f.FieldType));
        var info=(MapInfo)FormatterServices.GetUninitializedObject(typeof(MapInfo));Set(info,"mId",1);Set(info,"mName","1-1");Set(info,"Collectables",new CDictionnary<int,OrbitReborn_Emulator.Game.Maps.Collectables.Collectable>());Set(map,"mInfo",info);
        var actors=(CDictionnary<int,MapActor>)typeof(MapInstance).GetField("mActors",F).GetValue(map);
        var users=(CDictionnary<int,MapActor>)typeof(MapInstance).GetField("mUserActorsByReferenceId",F).GetValue(map);
        int n=0;foreach(var s in players){var a=new MapActor(++n,MapActorType.UserCharacter,s.Id,s.CharacterId,s,new Vector2(1000,1000),map);actors.Add(a.Id,a);users.Add(s.CharacterId,a);}
        var maps=new CDictionnary<int,MapInstance>();maps.Add(1,map);SetStatic(typeof(MapManager),"mMapInstances",maps);SetStatic(typeof(MapManager),"mMapInstancesByMapId",new Dictionary<int,MapInstance>{{1,map}});return map;
    }
    static string Packets(TcpClient c)
    {
        Thread.Sleep(60);var bytes=new List<byte>();while(c.Available>0){var b=new byte[c.Available];int n=c.GetStream().Read(b,0,b.Length);bytes.AddRange(b.Take(n));}return Encoding.UTF8.GetString(bytes.ToArray());
    }
    static void Group(string method,params object[] args){typeof(CharacterInfo).Assembly.GetType("OrbitReborn_Emulator.Game.Handlers.GroupManager").GetMethod(method,F).Invoke(null,args);}
    static int Main(string[] args)
    {
        try
        {
            if(args.Length<1 || args[0]!="--isolated-13385")throw new Exception("Explicit isolated fixture required.");
            AppDomain.CurrentDomain.FirstChanceException += (sender, ev) => { if (ev.Exception is MySql.Data.MySqlClient.MySqlException) Console.Error.WriteLine("FIXTURE SQL: "+ev.Exception.Message); };
            Fixture("Configure");SetStatic(typeof(CharacterInfo),"mSepromSafeTableEnsured",true);SqlDatabaseManager.Initialize();SetStatic(typeof(SessionManager),"mSessions",sessions);SetStatic(typeof(SessionManager),"mSessionsToStop",new CList<int>());SetStatic(typeof(SessionManager),"mCharacterSessionIndex",new ConcurrentDictionary<int,int>());SetStatic(typeof(SessionManager),"mSyncRoot",new object());
            if(args.Length>1 && args[1]=="hulls")
            {
                foreach(int ship in new[]{1,3,4,5,6,7,8,9,10,17,18,56,59,63,64,65,66,67})
                {
                    Fixture("Seed",ship,8,3,17000);var s=Load();Check(s.CharacterInfo.ShipId==ship && s.CharacterInfo.GameplayLease==s.ShipLease,"fresh loader uses authoritative hull/design "+ship);DroneWearService.EndGameplay(P,s.DroneGameplayToken);
                }
                Console.WriteLine("PASS "+checks+" authoritative hull loader assertions");return 0;
            }
            if(args.Length>1 && args[1]=="loader-repaired")
            {
                var s=Load();Check(s.CharacterInfo.ShipHp==1000 && s.CharacterInfo.Config1.Shield==0 && s.CharacterInfo.Config2.Shield==0,"actual constructor + RefreshUserData preserves Repair HP1000 / both shields0");
                Check(s.CharacterInfo.GameplayLease==s.ShipLease && s.CharacterInfo.CaptureLaserVolley().LaserCount==31,"loader binds new lease and equipment snapshot N31");
                Check(s.CharacterInfo.MapId==1 && s.CharacterInfo.LocX==2000 && s.CharacterInfo.LocY==1100,"actual loader uses stored x-1 coordinates");
                Exec("UPDATE users SET active_config=2 WHERE id=710005");using(var db=SqlDatabaseManager.GetClient())s.CharacterInfo.RefreshUserData(db);
                Check(s.CharacterInfo.ActiveConfig==2 && s.CharacterInfo.CaptureLaserVolley().LaserCount==15 && s.CharacterInfo.ShipHp==1000 && s.CharacterInfo.Config2.Shield==0,"config B reload uses its own N15 without heal after Repair");
                DroneWearService.EndGameplay(P,s.DroneGameplayToken);Console.WriteLine("PASS "+checks+" loader assertions");return 0;
            }
            Fixture("Seed",10,8,3,17000);
            if(args.Length>1 && args[1]=="admin")
            {
                var evac=Load();Map(evac);long epoch=evac.DroneLifeEpoch;evac.CharacterInfo.Disconnected=true;
                Fight.EvacuatePlayer(evac,true);
                Check(Value("SELECT COUNT(*) FROM ship_lifecycle_log")==0 && Value("SELECT SUM(damage_units) FROM drone")==136000,"administrative evacuation creates no death journal or wear");
                Check(Value("SELECT COUNT(*) FROM player_ship_state WHERE status='READY'")==1 && Value("SELECT life_epoch FROM player_drone_state")==epoch,"administrative evacuation preserves READY and life epoch");
                Console.WriteLine("PASS "+checks+" production administrative assertions");return 0;
            }
            var hero=Load();var remote=Shell(710006);MapInstance map=Map(hero,remote);
            hero.CharacterInfo.Members.Add(P);hero.CharacterInfo.Members.Add(remote.CharacterId);hero.CharacterInfo.GroupLeader=true;
            remote.CharacterInfo.Members.Add(P);remote.CharacterInfo.Members.Add(remote.CharacterId);remote.CharacterInfo.PlayerInRange.Add(P);remote.CharacterInfo.SelectedPlayer=P;remote.CharacterInfo.Attacking=true;
            Exec("DELETE FROM player_cargo WHERE id=710005;INSERT INTO player_cargo(id,prometium) VALUES(710005,100)");hero.CharacterInfo.LabInfos.Prometium=100;
            hero.CharacterInfo.SelectedAmmo=1;Check(hero.CharacterInfo.CaptureLaserVolley().LaserCount==31 && hero.CharacterInfo.TryConsumeLaserAmmo(hero.CharacterInfo.CaptureLaserVolley()),"real runtime reserves N31 ammo before death");
            hero.CharacterInfo.LastISH=hero.CharacterInfo.LastSMB=UnixTimestamp.GetCurrent();
            hero.CharacterInfo.BattleRepairCount=8;hero.CharacterInfo.BattleRepairTimer=new Timer(_=>{},null,60000,60000);
            hero.CharacterInfo.EnergyLeechTimer=new Timer(_=>{},null,60000,60000);hero.CharacterInfo.RocketProbabilityMaximizerTimer=new Timer(_=>{},null,60000,60000);
            hero.TechState.Records[1]=new TechRecord{TechId=1,Amount=2,CooldownUntil=9999999999,ActiveUntil=9999999000};
            var context=DroneWearService.Capture(hero,GameplayDeathCause.Npc);hero.CharacterInfo.ShipHp=0;DroneWearService.MarkLethalImpact(hero,context);
            Fight.KillGameplayPlayer(hero,context);
            Check(hero.CharacterInfo.DeadCommitted && !hero.CharacterInfo.DroneWearPersistenceBlocked && hero.StoppedPlayer,"production KillGameplayPlayer completes terminal cleanup");
            Check(Value("SELECT prometium FROM player_cargo WHERE id=710005")==80 && hero.CharacterInfo.LabInfos.Prometium==80 && map.Info.Collectables.Count==1,"normal death preserves 20 percent cargo loss and one dropped cargo box");
            Check(Value("SELECT current_hp FROM users")==0 && Value("SELECT SUM(damage_units) FROM drone")==144000,"real kill coordinator commits HP0 and eight wears once");
            Check(Value("SELECT COUNT(*) FROM player_drone_state WHERE gameplay_token IS NOT NULL")==0,"real Session cleanup releases owner token");
            Check(Value("SELECT ammo_lcb10 FROM users")==92,"terminal cleanup flushes actual pending ammo delta 123 to 92");
            Check(Value("SELECT cooldown_ISH FROM users")>0 && Value("SELECT cooldown_SMB FROM users")>0,"terminal cleanup preserves current cooldowns");
            Check(map.GetActorByReferenceId(P,MapActorType.UserCharacter)==null && !hero.MapJoined && !hero.MapAuthed && !hero.CharacterInfo.CanMove,"no playable actor or map re-entry after death");
            Check(remote.CharacterInfo.SelectedPlayer==0 && !remote.CharacterInfo.Attacking && !remote.CharacterInfo.PlayerInRange.Contains(P),"remote target, attack and range cleaned");
            Check(hero.CharacterInfo.BattleRepairCount==0 && hero.CharacterInfo.BattleRepairTimer==null && hero.CharacterInfo.EnergyLeechTimer==null && hero.CharacterInfo.RocketProbabilityMaximizerTimer==null,"BRB stops and ELA/RPM callbacks suspend");
            Check(hero.TechState.Records[1].Amount==2 && hero.TechState.Records[1].CooldownUntil==9999999999,"paid TECH quantity and absolute cooldown untouched");
            string hp=Packets(receivers[0]),rp=Packets(receivers[1]);
            System.IO.File.WriteAllText(args.Length>1?args[1]:"phase5-runtime-packets.txt","HERO\n"+hp.Replace("\0","\n")+"\nREMOTE\n"+rp.Replace("\0","\n"));
            Check(hp.Contains("K|710005|0") && hp.Contains("ERR|1") && rp.Contains("K|710005|0"),"real hero/remote K type0 and terminal ERR1 packets");
            Check(!hp.Split('\0').Any(p=>p.StartsWith("0|i|")||p.StartsWith("0|I|")),"no init/map-load packet after lethal path");
            Fight.KillGameplayPlayer(hero,context);Check(Value("SELECT COUNT(*) FROM ship_lifecycle_log")==1,"duplicate lethal coordinator cannot republish wear");
            Group("UpdateGroup",remote);Check(remote.CharacterInfo.Members.Contains(P),"group updater retains destroyed member");
            Check(Packets(receivers[1]).Contains("lgo=\"1\""),"destroyed group member reported offline without marker");
            using(var db=SqlDatabaseManager.GetClient())
            {
                var dead=CharacterInfoLoader.GenerateCharacterInfo(db,P,P,"");dead.RefreshUserData(db);Check(dead.ShipHp==0,"defensive loader never heals DESTROYED even when invoked directly");
                hero.CharacterInfo.ShipHp=3999;hero.CharacterInfo.MapId=2;hero.CharacterInfo.SynchronizeStatistics(db,1);
                Check(Value("SELECT current_hp FROM users")==0 && Value("SELECT mapid FROM users")==1,"old CharacterInfo SynchronizeStatistics cannot overwrite committed death");
            }
            Thread.Sleep(1100);var replacement=Shell(P);Group("RestoreDestroyedMember",replacement);Check(replacement.CharacterInfo.Members.Count==2 && replacement.CharacterInfo.GroupLeader,"next gameplay session restores same group and leader");
            replacement.CharacterInfo.DeadCommitted=true;Group("SuspendDestroyedMember",replacement);sessions.TryRemove(P,out replacement);
            var gm=typeof(CharacterInfo).Assembly.GetType("OrbitReborn_Emulator.Game.Handlers.GroupManager");gm.GetMethod("leaveGroup",F).Invoke(Activator.CreateInstance(gm),new object[]{remote});
            var afterDissolve=Shell(P);Group("RestoreDestroyedMember",afterDissolve);Check(afterDissolve.CharacterInfo.Members.Count==0,"dissolving a group also clears retained destroyed membership");
            Console.WriteLine("PASS "+checks+" isolated production runtime assertions");return 0;
        }
        catch(Exception e){Console.Error.WriteLine(e);return 1;}
        finally{foreach(var c in receivers)c.Close();}
    }
}
