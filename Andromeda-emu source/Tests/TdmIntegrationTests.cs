using System;
using System.Reflection;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Event;
using OrbitReborn_Emulator.Game.Event.Tdm;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Sessions;

// Compile beside EquipmentPhase1Tests, /main:TdmIntegrationTests.
// Uses its constructor-free players: no DB manager, socket or emulator is started.
public static class TdmIntegrationTests
{
    const BindingFlags Flags=BindingFlags.Instance|BindingFlags.Static|BindingFlags.Public|BindingFlags.NonPublic;
    static int count;
    static void Check(bool value,string message){if(!value)throw new Exception(message);Console.WriteLine("PASS "+message);count++;}
    static void Set(object obj,string name,object value){obj.GetType().GetField(name,Flags).SetValue(obj,value);}
    static Session Player(int id,int faction){
        var info=(CharacterInfo)typeof(EquipmentPhase1Tests).GetMethod("Character",Flags).Invoke(null,null);
        Set(info,"mId",id);info.FactionId=faction;info.MapId=83;
        var s=(Session)typeof(EquipmentPhase1Tests).GetMethod("Player",Flags).Invoke(null,new object[]{info,id});
        Set(s,"mMapId",83);s.DroneLifeEpoch=23;return s;
    }
    public static int Main(){try{
        long clock=1000000;var core=new TdmEventService(()=>clock);
        typeof(TeamDeathMatch).GetField("State",Flags).SetValue(null,core);core.Enable();
        for(int id=1;id<=6;id++){
            int c=id<=3?1:2;core.Observe(new TdmPresence{Id=id,Company=c,Level=14,Map=TdmRules.Home(c),X=10670,Y=6509,Connected=true,Ready=true,Compatible=true});
            core.Open(id);core.Command(id,core.Id,1,"JOIN","");
        }
        core.Tick();var serializer=new System.Web.Script.Serialization.JavaScriptSerializer();
        var snap=serializer.Deserialize<dynamic>(serializer.Serialize(core.Snapshot(1)));string offer=snap["offer"]["id"];
        for(int id=1;id<=6;id++)core.Command(id,core.Id,2,"ACCEPT",offer);
        core.Tick();core.DrainEffects();
        var attacker=Player(1,1);var ally=Player(2,1);var victim=Player(4,2);
        foreach(var s in new[]{attacker,ally,victim})s.TdmLifeGeneration=core.Life(s.CharacterId);
        var can=typeof(Fight).GetMethod("GetPvpRefusalReason",Flags);
        Check(can.Invoke(null,new object[]{attacker,victim}).ToString()=="TeamDeathMatchSafe","real Fight handler blocks SAFE");
        clock+=20000;core.Tick();
        attacker.CharacterInfo.Members.Add(victim.CharacterId,victim.CharacterId);
        Check(can.Invoke(null,new object[]{attacker,victim}).ToString()=="None","TDM enemy permission precedes group");
        Check(can.Invoke(null,new object[]{attacker,ally}).ToString()=="TeamDeathMatchSafe","real Fight handler blocks ally");
        var context=DroneWearService.Capture(victim,GameplayDeathCause.Pvp);
        victim.CharacterInfo.UpdateAttacker(attacker);victim.CharacterInfo.ShipHp=0;DroneWearService.MarkLethalImpact(victim,context);
        Fight.KillGameplayPlayer(victim,context,true);
        Check(core.IsDead(4),"actual KillGameplayPlayer enters TDM death");
        Check(victim.DroneLifeEpoch==23&&!victim.CharacterInfo.DeadCommitted&&!victim.CharacterInfo.DroneWearPersistenceBlocked,"no Phase4 epoch, no Phase5 commit, no DB-failure fallback");
        Check(victim.CharacterInfo.PendingDroneDeath==null&&victim.CharacterInfo.TdmDead,"normal death token consumed only by TDM");
        snap=serializer.Deserialize<dynamic>(serializer.Serialize(core.Snapshot(4)));Check((int)snap["match"]["lives"]==2,"actual death leaves2");
        Fight.KillGameplayPlayer(victim,context,true);snap=serializer.Deserialize<dynamic>(serializer.Serialize(core.Snapshot(4)));Check((int)snap["match"]["lives"]==2,"duplicate real kill callback ignored");
        core.Command(4,core.Id,3,"REPAIR",(string)snap["match"]["deathId"]);
        victim.CharacterInfo.Destroy=false;victim.CharacterInfo.ShipHp=100;victim.TdmLifeGeneration=core.Life(4);
        Check(!DroneWearService.IsCurrentLife(victim,context),"production context rejects old target life");
        Check(!TeamDeathMatch.ValidProjectile(victim,context.TdmLife),"production projectile rejects old attacker life");
        var normal=Player(7,3);normal.CharacterInfo.MapId=1;normal.TdmLifeGeneration=0;
        Check(!TeamDeathMatch.TryDeath(normal,null),"normal death remains outside TDM hook");
        normal.CharacterInfo.MapId=51;Check(!TeamDeathMatch.TryDeath(normal,null),"GG death outside hook");
        normal.CharacterInfo.MapId=81;Check(!TeamDeathMatch.TryDeath(normal,null),"Invasion death outside hook");
        Check(DroneWearRules.AfterDeath(3,0,false)==1000&&DroneWearRules.AfterDeath(3,0,true)==0,"normal wear and Invasion exemption unchanged");
        var map=(OrbitReborn_Emulator.Game.Maps.MapInstance)System.Runtime.Serialization.FormatterServices.GetUninitializedObject(typeof(OrbitReborn_Emulator.Game.Maps.MapInstance));
        var chain=typeof(Fight).GetMethod("ApplyShieldOnlyDamageToPlayer",Flags);
        int allyShield=ally.CharacterInfo.ShipShield;
        chain.Invoke(null,new object[]{attacker,ally,1000,map});
        Check(ally.CharacterInfo.ShipShield==allyShield,"real Chain handler rejects TDM ally before impact");
        victim.CharacterInfo.TdmDead=false;
        int protectedShield=victim.CharacterInfo.ShipShield;
        chain.Invoke(null,new object[]{attacker,victim,1000,map});
        Check(victim.CharacterInfo.ShipShield==protectedShield,"real Chain handler rejects respawn NAZ before impact");
        var clients=(System.Collections.Concurrent.ConcurrentDictionary<int,Session>)typeof(TeamDeathMatch).GetField("Clients",Flags).GetValue(null);
        clients[attacker.CharacterId]=attacker;
        // Reproduce an already-returned pilot dying normally before old result expiry.
        core.Disable();attacker.CharacterInfo.MapId=1;attacker.CharacterInfo.ShipHp=0;attacker.CharacterInfo.Destroy=true;
        typeof(TeamDeathMatch).GetMethod("Pump",Flags).Invoke(null,null);
        Check(attacker.CharacterInfo.ShipHp==0&&attacker.CharacterInfo.Destroy&&attacker.CharacterInfo.MapId==1,"old HOME effect cannot heal or teleport a normal death");
        TeamDeathMatch.BeforeLogin(attacker,false);
        Check(!clients.ContainsKey(attacker.CharacterId),"unsupported reconnect drops old desktop registration");
        Console.WriteLine("PASS "+count+" production integration assertions; no DB initialized.");return 0;
    }catch(Exception ex){Console.Error.WriteLine(ex);return 1;}}
}
