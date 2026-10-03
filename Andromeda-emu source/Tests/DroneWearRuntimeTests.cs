using System;
using System.Data;
using System.Linq;
using System.Collections;
using System.Reflection;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Game.Handlers;

internal static class DroneWearRuntimeTests
{
    static BindingFlags F=BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Static|BindingFlags.Instance;
    static int checks;
    static void Check(bool ok,string text){if(!ok)throw new Exception(text);checks++;Console.WriteLine("PASS "+text);}
    static void Set(object o,string name,object value){o.GetType().GetField(name,F).SetValue(o,value);}
    static Session Player(int id){
        var c=(CharacterInfo)typeof(EquipmentPhase1Tests).GetMethod("Character",F).Invoke(null,null);
        Set(c,"mId",id);var s=(Session)typeof(EquipmentPhase1Tests).GetMethod("Player",F).Invoke(null,new object[]{c,id});
        Set(s,"DroneGameplayToken",Guid.NewGuid().ToString("N"));s.DroneLifeEpoch=17;return s;
    }
    static int Main(){try{
        var s=Player(910001);var c=DroneWearService.Capture(s,GameplayDeathCause.Pvp);
        Check(DroneWearService.IsCurrentLife(s,c),"current life accepted");
        s.DroneLifeEpoch++;
        Check(!DroneWearService.IsCurrentLife(s,c),"old rocket/callback life rejected after respawn");
        var newLife=DroneWearService.Capture(s,GameplayDeathCause.Npc);
        s.CharacterInfo.Destroy=true;Check(!DroneWearService.IsCurrentLife(s,newLife),"publication window rejects impacts");s.CharacterInfo.Destroy=false;
        s.CharacterInfo.Disconnected=true;Check(!DroneWearService.IsCurrentLife(s,newLife),"disconnected runtime rejects impacts");s.CharacterInfo.Disconnected=false;
        var other=Player(910002);other.DroneLifeEpoch=s.DroneLifeEpoch;
        Check(!DroneWearService.IsCurrentLife(other,newLife),"a different session cannot reuse the life");
        s.CharacterInfo.ShipHp=12345;
        typeof(Fight).GetMethod("ApplyDamageToPlayer",F).Invoke(null,new object[]{other,s,999999,System.Runtime.Serialization.FormatterServices.GetUninitializedObject(typeof(OrbitReborn_Emulator.Game.Maps.MapInstance)),c});
        Check(s.CharacterInfo.ShipHp==12345,"actual delayed rocket damage method leaves new life intact");
        var gate=typeof(Session).GetProperty("HasPendingGameplayDeath",F);
        Check(!(bool)gate.GetValue(s,null),"live player can log out");
        s.CharacterInfo.ShipHp=0;Check((bool)gate.GetValue(s,null),"lethal hit pending admission blocks logout/release");
        s.CharacterInfo.ShipHp=1000;s.CharacterInfo.DroneDeathPublishing=true;Check((bool)gate.GetValue(s,null),"publication blocks handoff/logout");s.CharacterInfo.DroneDeathPublishing=false;
        var lethal=DroneWearService.Capture(s,GameplayDeathCause.Npc);
        var competing=DroneWearService.Capture(s,GameplayDeathCause.Radiation);
        s.CharacterInfo.ShipHp=0;
        lock(s.CharacterInfo.DroneImpactSyncRoot) { DroneWearService.MarkLethalImpact(s,lethal);DroneWearService.MarkLethalImpact(s,competing); }
        Check(s.CharacterInfo.Destroy && DroneWearService.IsPendingDeath(s,lethal) && !DroneWearService.IsPendingDeath(s,competing),"first lethal impact freezes one death before callbacks");
        s.CharacterInfo.PendingDroneDeath=null;s.CharacterInfo.Destroy=false;s.CharacterInfo.ShipHp=1000;
        var inv=typeof(CharacterInfo).Assembly.GetType("OrbitReborn_Emulator.Game.Event.Invasion");
        var eligible=inv.GetMethod("IsDroneWearExemptParticipant",F);
        var runs=(IDictionary)inv.GetField("RunsByMapId",F).GetValue(null);
        var run=Activator.CreateInstance(inv.GetNestedType("InvasionRun",F),true);
        Set(run,"MapId",1);Set(run,"FactionId",1);Set(run,"Running",true);runs[1]=run;
        try{
            inv.GetField("mActive",F).SetValue(null,true);
            Check((bool)eligible.Invoke(null,new object[]{s}),"active matching Invasion runtime exemption");
            s.CharacterInfo.FactionId=2;Check(!(bool)eligible.Invoke(null,new object[]{s}),"wrong faction not exempt");s.CharacterInfo.FactionId=1;
            Set(run,"Running",false);Check(!(bool)eligible.Invoke(null,new object[]{s}),"ended Invasion run not exempt");Set(run,"Running",true);
            inv.GetField("mActive",F).SetValue(null,false);Check(!(bool)eligible.Invoke(null,new object[]{s}),"same map without active event not exempt");
        }finally{runs.Remove(1);inv.GetField("mActive",F).SetValue(null,false);}
        // Production runtime application of a repair: damage/shield fall, N and
        // an already captured volley stay unchanged; no shield heal is possible.
        var info=s.CharacterInfo;Set(info,"mShipId",10);var before=info.CaptureLaserVolley();var rows=new DataTable();
        foreach(var field in new[]{"ship_design_id","laser_capacity","damage_total","shield_total","speed_total","ship_count","ship_lf1","ship_mp1","ship_lf2","ship_lf3","drone_count","drone_lf1","drone_mp1","drone_lf2","drone_lf3"})rows.Columns.Add(field,typeof(int));
        rows.Columns.Add("config",typeof(string));
        foreach(string cfg in new[]{"A","B"}){var row=rows.NewRow();foreach(DataColumn col in rows.Columns)if(col.DataType==typeof(int))row[col]=0;row["ship_design_id"]=10;row["laser_capacity"]=15;row["ship_count"]=15;row["ship_lf3"]=15;row["drone_count"]=16;row["drone_lf3"]=16;row["damage_total"]=5101;row["shield_total"]=185600;row["config"]=cfg;rows.Rows.Add(row);}
        info.Config1.Shield=190000;info.Config2.Shield=2000;
        info.ApplyDroneProgression(new DroneEquipmentState(Enumerable.Range(1,8).Select(id=>new DroneState(id,3,5,0,true)).ToArray(),rows,10,false,true));
        Check(info.Config1.Shield==185600 && info.Config2.Shield==2000,"repair clamps shield without healing configuration 2");
        Check(info.CaptureLaserVolley().LaserCount==31 && before.LaserCount==26,"new snapshot real N / captured volley immutable");
        Check(info.GetDronePacketString().Contains("24,H") && !info.GetDronePacketString().Contains("25,H"),"next login/publish packet L5 Havok");
        var beforeDestruction=info.CaptureLaserVolley();
        foreach(DataRow row in rows.Rows){row["drone_count"]=14;row["drone_lf3"]=14;}
        info.ApplyDroneProgression(new DroneEquipmentState(Enumerable.Range(1,7).Select(id=>new DroneState(id,3,5,0,true)).ToArray(),rows,10,false,true));
        Check(beforeDestruction.LaserCount==31 && info.CaptureLaserVolley().LaserCount==29,"destruction publishes N31 to N29, old volley unchanged");
        Check(new DroneState(1,3,5,0,true).Gain(18).Points==18,"Phase3 progression resumes from repair zero");
        Console.WriteLine("PASS: "+checks+" runtime assertions; no game/database connection.");return 0;
    }catch(Exception e){Console.Error.WriteLine(e);return 1;}}
}
