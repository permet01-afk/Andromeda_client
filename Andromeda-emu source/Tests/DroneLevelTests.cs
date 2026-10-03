// Standalone tests against the compiled emulator, without a DB/login.
using System;
using System.Data;
using System.Linq;
using System.Reflection;
using System.Collections.Generic;
using System.IO;
using System.Collections;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Runtime.Serialization;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Specialized;
using System.Web.Script.Serialization;
using OrbitReborn_Emulator.Game.Characters;

internal static class DroneLevelTests
{
    static int checks;
    static BindingFlags F=BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance|BindingFlags.Static;
    static void Check(bool ok,string name){if(!ok)throw new Exception(name);checks++;}
    static int D(int level,bool full=false){return DroneRules.RoundUnits(DroneRules.DroneLaserUnits(300,new DroneState(1,3,level,0,full),full));}
    static void Set(object o,string field,object value){o.GetType().GetField(field,F).SetValue(o,value);}
    static void Static(Type type,string field,object value){type.GetField(field,F).SetValue(null,value);}
    static Session Player(int id){
        var c=(CharacterInfo)typeof(EquipmentPhase1Tests).GetMethod("Character",F).Invoke(null,null);
        Set(c,"mId",id);return (Session)typeof(EquipmentPhase1Tests).GetMethod("Player",F).Invoke(null,new object[]{c,id});
    }
    static void Index(params Session[] sessions){
        var byId=new ConcurrentDictionary<int,Session>();var byCharacter=new ConcurrentDictionary<int,int>();
        foreach(var s in sessions){byId[s.Id]=s;byCharacter[s.CharacterId]=s.Id;}
        Static(typeof(SessionManager),"mSessions",byId);Static(typeof(SessionManager),"mCharacterSessionIndex",byCharacter);
        Static(typeof(SessionManager),"mSyncRoot",new object());
    }
    static string Packet(TcpClient receiver){
        var bytes=new List<byte>();int next;
        do{next=receiver.GetStream().ReadByte();if(next<0)throw new Exception("EOF");bytes.Add((byte)next);}while(next!=0);
        return Encoding.UTF8.GetString(bytes.ToArray()).TrimEnd('\0');
    }
    static void RemotePackets(){
        var listener=new TcpListener(IPAddress.Loopback,0);listener.Start();
        try{using(var heroRx=new TcpClient())using(var otherRx=new TcpClient()){
            heroRx.Connect((IPEndPoint)listener.LocalEndpoint);otherRx.Connect((IPEndPoint)listener.LocalEndpoint);
            heroRx.ReceiveTimeout=otherRx.ReceiveTimeout=3000;
            using(var heroTx=listener.AcceptSocket())using(var otherTx=listener.AcceptSocket()){
                var hero=Player(900001);var other=Player(900002);Index(hero,other);
                Set(hero,"mSocket",heroTx);Set(other,"mSocket",otherTx);
                var map=(MapInstance)FormatterServices.GetUninitializedObject(typeof(MapInstance));
                var mapInfo=(MapInfo)FormatterServices.GetUninitializedObject(typeof(MapInfo));Set(mapInfo,"mId",1);Set(map,"mInfo",mapInfo);
                Set(map,"mActors",new CDictionnary<int,MapActor>());
                Set(map,"mUserActorSnapshotCache",new[]{new MapActor(1,MapActorType.UserCharacter,hero.Id,hero.CharacterId,hero,new Vector2(1000,1000),map),new MapActor(2,MapActorType.UserCharacter,other.Id,other.CharacterId,other,new Vector2(1000,1000),map)});
                Static(typeof(MapManager),"mMapInstances",new CDictionnary<int,MapInstance>());
                Static(typeof(MapManager),"mMapInstancesByMapId",new Dictionary<int,MapInstance>{{1,map}});
                foreach(int level in new[]{1,2,6}){
                    Set(hero.CharacterInfo,"mDroneFleet",Enumerable.Range(1,8).Select(id=>new DroneState(id,3,level,0,id==1)).ToArray());
                    DroneProgressionService.PublishDrones(hero);
                    string expected="0|n|d|900001|"+hero.CharacterInfo.GetDronePacketString();
                    Check(Packet(heroRx)==expected,"hero real socket fleet L"+level);
                    Check(Packet(otherRx)==expected,"observer real socket fleet L"+level);
                    Check(heroRx.Available==0&&otherRx.Available==0,"one final fleet packet, no ship recreation");
                }
                Set(hero,"mSocket",null);Set(other,"mSocket",null);
            }
        }}finally{listener.Stop();}
    }
    static readonly Type InvasionType=typeof(CharacterInfo).Assembly.GetType("OrbitReborn_Emulator.Game.Event.Invasion");
    static Session Resolve(OrbitReborn_Emulator.Game.Npcs.Npc npc,Session owner){return (Session)InvasionType.GetMethod("ResolveDroneRewardOwner",F).Invoke(null,new object[]{npc,owner});}
    static void InvasionEligibility(){
        var npc=(OrbitReborn_Emulator.Game.Npcs.Npc)typeof(EquipmentPhase1Tests).GetMethod("Target",F).Invoke(null,new object[]{10});
        var owner=Player(900001);var other=Player(900002);Index(owner,other);
        var runs=(IDictionary)InvasionType.GetField("RunsByNpcId",F).GetValue(null);
        Check(!(bool)InvasionType.GetMethod("IsInvasionNpc",F).Invoke(null,new object[]{npc})&&Resolve(npc,owner)==null,"map alone never implies Invasion");
        var run=Activator.CreateInstance(InvasionType.GetNestedType("InvasionRun",F),true);Set(run,"MapId",1);Set(run,"FactionId",1);
        runs[npc.Id]=run;
        try{
            npc.Attackers[owner.CharacterId]=1;npc.Attackers[other.CharacterId]=999;
            Check(Resolve(npc,owner)==owner,"valid claimed owner wins over damage share");
            owner.CharacterInfo.FactionId=2;
            Check(Resolve(npc,owner)==other,"wrong faction excluded, eligible fallback");
            other.CharacterInfo.MapId=2;
            Check(Resolve(npc,owner)==null,"no eligible map/faction beneficiary");
            other.CharacterInfo.MapId=1;other.CharacterInfo.Destroy=true;
            Check(Resolve(npc,owner)==null,"destroyed beneficiary excluded");
            other.CharacterInfo.Destroy=false;npc.Attackers[other.CharacterId]=0;
            Check(Resolve(npc,owner)==null,"zero damage never eligible");
        }finally{runs.Remove(npc.Id);}
    }
    static int Main(string[] args){try{Run(args);return 0;}catch(Exception ex){Console.Error.WriteLine(ex);return 1;}}
    static void Run(string[] args)
    {
        for(int l=1;l<=6;l++){
            var iris=new DroneState(1,3,l,0,false);var flax=new DroneState(2,5,l,0,true);
            Check(D(l)==new[]{300,306,312,318,324,330}[l-1],"Iris 2LF3 L"+l);
            Check(DroneRules.RoundUnits(DroneRules.DroneLaserUnits(150,flax,true))==new[]{150,153,156,159,162,165}[l-1],"Flax LF3, never Havok");
            Check(DroneRules.RoundUnits(DroneRules.DroneLaserUnits(250,iris,false))==new[]{250,255,260,265,270,275}[l-1],"mixed LF2/LF3");
            Check(DroneRules.RoundUnits(DroneRules.DroneShieldUnits(10000,iris))==new[]{10000,10400,10800,11200,11600,12000}[l-1],"BO2 L"+l);
            Check(iris.PacketCode=="2"+(l-1)&&flax.PacketCode=="1"+(l-1),"packet levels");
            Check(new DroneState(1,3,l,0,true).PacketCode=="2"+(l-1)+",H","H suffix");
        }
        Check(DroneRules.RoundUnits(DroneRules.DroneShieldUnits(20000,new DroneState(1,3,6,0,true)))==24000,"Iris 2BO2 L6");
        for(int n=0;n<=8;n++)for(int h=0;h<=n;h++){
            var fleet=Enumerable.Range(1,n).Select(id=>new DroneState(id,3,1,0,id<=h)).ToArray();
            Check(DroneRules.FullHavok(fleet)==(n>0&&h==n),"full set based on real ownership "+h+"/"+n);
            Check(DroneRules.FullHavok(fleet.Concat(new[]{new DroneState(99,5,1,0,true)}))==(n>0&&h==n),"Flax excluded");
        }
        Check(!DroneRules.FullHavok(new[]{new DroneState(1,3,1,0,false),new DroneState(1,3,1,0,true)}),"duplicate ID cannot supply another design");
        Check(2250+8*D(1)==4650&&2250+8*D(6)==4890&&2250+8*D(1,true)==4890&&2250+8*D(6,true)==5154,"four reference totals");
        Check(DroneRules.RoundUnits(DroneRules.DroneLaserUnits(150,new DroneState(1,3,6,0,true),true))==182,"181.5 rounds half UP");
        for(int l=1;l<6;l++){
            int t=DroneRules.Threshold(l);var d=new DroneState(1,3,l,t-1,false);
            Check(d.Gain(0).Level==l&&d.Gain(1).Level==l+1&&d.Gain(1).Points==0,"threshold boundary "+l);
            Check(d.Gain(2).Points==(l==5?0:1),"overflow boundary "+l);
        }
        var overflow=new DroneState(1,3,1,95,false).Gain(18);Check(overflow.Level==2&&overflow.Points==13,"95+18");
        var multi=new DroneState(1,3,1,0,false).Gain(750);Check(multi.Level==4&&multi.Points==50,"multi level");
        Check(new DroneState(1,3,1,0,false).Gain(3100).Level==6,"3100 terminal");
        Check(new DroneState(1,3,6,0,false).Gain(int.MaxValue).Points==0,"terminal freezes");
        foreach(int points in new[]{0,20,50,80,90,95,97,99}){
            var d=new DroneState(points+1,3,1,points,false).Gain(18);Check((d.Level==1?d.Points:100+d.Points)==points+18,"each drone receives full award");
        }
        Check(DroneRules.NpcAward(10,"-=[ Kristallon ]=-")==18,"Goliath BK 18");
        Check(DroneRules.NpcAward(1,"Kristallon")==72,"EN Phoenix BK 72 overrides DE");
        Check(DroneRules.NpcAward(3,"Streuner")==3,"EN Leonov Streuner 3 overrides DE");
        Check(DroneRules.PvpAward(10,10)==25,"Goliath PvP 25");
        Check(DroneRules.NpcAward(10,"StreuneR")==1&&DroneRules.NpcAward(10,"Streuner")==0,"case-distinct NPCs");
        Check(DroneRules.NpcAward(999,"Boss Cubikon")==18&&DroneRules.NpcAward(1,"Boss Protegit")==3,"custom precedence");
        Check(DroneRules.NpcAward(10,"Cubikon",true)==10,"explicit Invasion context wins");
        Check(DroneRules.NpcAward(10,"Boss Imaginary")==0&&DroneRules.NpcAward(10,"Unmapped")==0,"unknown names fail closed");
        foreach(int id in new[]{10,56,59,63,64,65,66,67})Check(DroneRules.NpcAward(id,"Kristallon")==18,"Goliath normalization");
        foreach(int id in new[]{8,17,18})Check(DroneRules.NpcAward(id,"Kristallon")==30,"Vengeance normalization");
        var reference=(Dictionary<string,object>)new JavaScriptSerializer().DeserializeObject(File.ReadAllText(args[0]));
        foreach(var entry in (object[])reference["bonus_vectors"]){
            var vector=(Dictionary<string,object>)entry;int l=Convert.ToInt32(vector["level"]);
            var iris=new DroneState(1,3,l,0,false);var flax=new DroneState(2,5,l,0,false);
            Check(D(l)==Convert.ToInt32(vector["iris_2lf3"]),"shared Iris vector");
            Check(DroneRules.RoundUnits(DroneRules.DroneLaserUnits(150,flax,false))==Convert.ToInt32(vector["flax_lf3"]),"shared Flax vector");
            Check(DroneRules.RoundUnits(DroneRules.DroneShieldUnits(10000,iris))==Convert.ToInt32(vector["drone_bo2"]),"shared shield vector");
        }
        var npc=(Dictionary<string,object>)reference["npc"];
        foreach(var row in npc){var values=(object[])row.Value;for(int i=0;i<10;i++)Check(DroneRules.NpcAward(i+1,row.Key)==Convert.ToInt32(values[i]),"NPC matrix cell");}
        var pvp=(object[])reference["pvp"];for(int a=0;a<10;a++)for(int v=0;v<10;v++)Check(DroneRules.PvpAward(a+1,v+1)==Convert.ToInt32(((object[])pvp[a])[v]),"PvP matrix cell");
        // Actual atomic runtime publication on a CharacterInfo created by the existing Phase 1 harness.
        var info=(CharacterInfo)typeof(EquipmentPhase1Tests).GetMethod("Character",F).Invoke(null,null);
        typeof(CharacterInfo).GetField("mShipId",F).SetValue(info,10);
        info.Config1.Shield=12345;info.Config2.Shield=23456;info.ShipHp=45678;info.SelectedPlayer=887;
        var old=info.CaptureLaserVolley();
        DataTable t1=new DataTable();foreach(string f in new[]{"ship_design_id","laser_capacity","damage_total","shield_total","ship_count","ship_lf1","ship_mp1","ship_lf2","ship_lf3","drone_count","drone_lf1","drone_mp1","drone_lf2","drone_lf3"})t1.Columns.Add(f,typeof(int));t1.Columns.Add("config",typeof(string));
        foreach(string cfg in new[]{"A","B"}){var row=t1.NewRow();foreach(DataColumn c in t1.Columns)if(c.DataType==typeof(int))row[c]=0;row["ship_design_id"]=10;row["laser_capacity"]=15;row["damage_total"]=5154;row["shield_total"]=192000;row["ship_count"]=15;row["ship_lf3"]=15;row["drone_count"]=16;row["drone_lf3"]=16;row["config"]=cfg;t1.Rows.Add(row);}
        info.ApplyDroneProgression(new DroneEquipmentState(Enumerable.Range(1,8).Select(id=>new DroneState(id,3,6,0,true)).ToArray(),t1,10,true));
        Check(info.Config1.MaxDamage==5154&&info.Config2.MaxDamage==5154,"A/B published together");
        Check(info.Config1.Shield==12345&&info.Config2.Shield==23456&&info.ShipHp==45678,"no free heal");
        Check(info.SelectedPlayer==887&&info.ActiveConfig==1,"selection / config retained");
        Check(old.MaxDamage==3900&&old.LaserCount==26,"in-flight volley unchanged");
        var next=info.CaptureLaserVolley();Check(next.MaxDamage==5154&&next.LaserCount==31&&next.Equipment.IsShipFullLF3,"next volley new totals, real N, hull full LF3");
        Check(info.TryConsumeLaserAmmo(next)&&info.AmmoLcb10==69,"level bonus never multiplies ammo debit");
        Check(info.GetDronePacketString()=="3/2-25,H-25,H/4-25,H-25,H-25,H-25,H/2-25,H-25,H","cached fleet packet");
        info.Config1.Shield=999999;info.ApplyDroneProgression(new DroneEquipmentState(new DroneState[0],t1,10,true));Check(info.Config1.Shield==192000,"shield clamps down");
        var npcTarget=(OrbitReborn_Emulator.Game.Npcs.Npc)typeof(EquipmentPhase1Tests).GetMethod("Target",F).Invoke(null,new object[]{10});
        var admission=npcTarget.GetType().GetMethod("TryAdmitDeathReward",F);
        int admitted=0;
        System.Threading.Tasks.Parallel.For(0,100,i=>{if((bool)admission.Invoke(npcTarget,null))System.Threading.Interlocked.Increment(ref admitted);});
        Check(admitted==1,"100 simultaneous death callbacks admitted once");
        npcTarget.GetType().GetField("mDeathRewardAdmission",F).SetValue(npcTarget,0);
        Check((bool)admission.Invoke(npcTarget,null),"next spawn can admit its own death");
        int pvpAdmitted=0;info.ResetPvpRewardGuard();
        var pvpGuard=typeof(CharacterInfo).GetMethod("TryAcquirePvpRewardGuard",F);
        System.Threading.Tasks.Parallel.For(0,100,i=>{if((bool)pvpGuard.Invoke(info,null))System.Threading.Interlocked.Increment(ref pvpAdmitted);});
        Check(pvpAdmitted==1,"100 simultaneous PvP reward callbacks admitted once");
        RemotePackets(); InvasionEligibility();
        Console.WriteLine("PASS: "+checks+" assertions");
    }
}
