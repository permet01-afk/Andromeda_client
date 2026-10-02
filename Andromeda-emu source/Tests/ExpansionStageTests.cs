// Standalone: compile with EquipmentPhase1Tests.cs and /main:ExpansionStageTests.
// Synthetic runtime objects and loopback sockets only; Program/SQL are never initialized.
using System;
using System.Linq;
using System.Text;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.Serialization;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Threading;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.Handlers;
using OrbitReborn_Emulator.Game.Maps;
using OrbitReborn_Emulator.Game.Sessions;
using OrbitReborn_Emulator.Communication;
using OrbitReborn_Emulator.Communication.Outgoing;
using OrbitReborn_Emulator.Libs;
using OrbitReborn_Emulator.Specialized;

internal static class ExpansionStageTests
{
    const BindingFlags F=BindingFlags.Instance|BindingFlags.Static|BindingFlags.Public|BindingFlags.NonPublic;
    static int checks;
    static readonly List<string> Packets=new List<string>();
    static void Check(bool condition,string name){checks++;if(!condition)throw new Exception(name);}
    static void Set(object obj,string name,object value){obj.GetType().GetField(name,F).SetValue(obj,value);}
    static void Static(Type type,string name,object value){type.GetField(name,F).SetValue(null,value);}
    static EquipmentSnapshot Equipment(int count,int lf3,int drones=16,int capacity=15)
    {return new EquipmentSnapshot(capacity,count,0,0,count-lf3,lf3,drones,0,0,0,drones);}
    static void Equip(CharacterConfig config,EquipmentSnapshot equipment){typeof(CharacterConfig).GetProperty("Equipment").SetValue(config,equipment,null);}
    static Session Player(int id)
    {
        var c=(CharacterInfo)typeof(EquipmentPhase1Tests).GetMethod("Character",F).Invoke(null,null);
        Set(c,"mId",id);Set(c,"mShipId",10);Set(c,"mUsername","Expansion fixture");Set(c,"mClanTag","");
        Set(c,"mSettings",FormatterServices.GetUninitializedObject(typeof(Settings)));
        return (Session)typeof(EquipmentPhase1Tests).GetMethod("Player",F).Invoke(null,new object[]{c,id});
    }
    static string Text(ServerMessage message){return Encoding.UTF8.GetString(message.ToDeltas()).TrimEnd('\0');}
    sealed class Wire:IDisposable
    {
        Socket socket;TcpClient client;
        public Wire(Session s){var l=new TcpListener(IPAddress.Loopback,0);l.Start();client=new TcpClient();client.Connect((IPEndPoint)l.LocalEndpoint);socket=l.AcceptSocket();l.Stop();Set(s,"mSocket",socket);}
        public string[] Read(){var b=new byte[65536];var text=new StringBuilder();for(int n=0;n<3;){Thread.Sleep(5);if(client.Available==0){n++;continue;}n=0;text.Append(Encoding.UTF8.GetString(b,0,client.GetStream().Read(b,0,Math.Min(b.Length,client.Available))));}return text.ToString().Split(new[]{'\0'},StringSplitOptions.RemoveEmptyEntries);}
        public void Dispose(){socket.Dispose();client.Close();}
    }
    public static int Main(string[] args)
    {
        try
        {
            foreach(int ship in new[]{1,3,4,5,6,7,8,9,10,17,18,56,59,63,64,65,66,67})
            foreach(int drones in new[]{0,12,16,100})
            {
                Check(Equipment(0,0,drones).GetExpansionStage(ship)==1,"empty hull");
                Check(Equipment(14,14,drones).GetExpansionStage(ship)==1,"incomplete hull ignores drones");
                Check(Equipment(15,14,drones).GetExpansionStage(ship)==2,"mixed full hull");
                Check(Equipment(15,15,drones).GetExpansionStage(ship)==3,"LF3 hull");
                Check(Equipment(0,0,drones,0).GetExpansionStage(ship)==1,"zero capacity");
            }
            foreach(int ship in new[]{2,58,0,-1,999})Check(Equipment(15,15).GetExpansionStage(ship)==1,"legacy fallback");
            var a=Player(900001);var o=Player(900002);var unrelated=Player(900003);
            Equip(a.CharacterInfo.Config1,Equipment(15,15));Equip(a.CharacterInfo.Config2,Equipment(8,8,0));
            var capture=a.CharacterInfo.CaptureLaserVolley(6);a.CharacterInfo.ActiveConfig=2;
            Check(capture.ExpansionStage==3&&capture.ActiveConfig==1&&capture.LaserCount==31&&capture.VisualLaserType==6,"immutable burst capture");
            Check(a.CharacterInfo.ExpansionStage==1&&a.CharacterInfo.CaptureLaserVolley().LaserCount==8,"next config capture");
            var map=(MapInstance)FormatterServices.GetUninitializedObject(typeof(MapInstance));
            var info=(MapInfo)FormatterServices.GetUninitializedObject(typeof(MapInfo));Set(info,"mId",1);Set(map,"mInfo",info);
            Set(map,"mActors",new CDictionnary<int,MapActor>());
            var actors=new[]{a,o,unrelated}.Select((s,i)=>new MapActor(i+1,MapActorType.UserCharacter,s.Id,s.CharacterId,s.CharacterInfo,new Vector2(1000,1000),map)).ToArray();
            Set(map,"mUserActorSnapshotCache",actors);Set(map,"mActorSnapshotCache",actors);
            Static(typeof(SessionManager),"mSessions",new ConcurrentDictionary<int,Session>(new[]{a,o,unrelated}.ToDictionary(s=>s.Id)));
            Static(typeof(SessionManager),"mCharacterSessionIndex",new ConcurrentDictionary<int,int>(new[]{a,o,unrelated}.ToDictionary(s=>s.CharacterId,s=>s.Id)));
            Static(typeof(SessionManager),"mSyncRoot",new object());
            Static(typeof(MapManager),"mMapInstances",new CDictionnary<int,MapInstance>());
            Static(typeof(MapManager),"mMapInstancesByMapId",new Dictionary<int,MapInstance>{{1,map}});
            using(var wa=new Wire(a))using(var wo=new Wire(o))using(var wu=new Wire(unrelated))
            {
                int previous=1;
                foreach(int stage in new[]{2,3,1,3})
                {
                    a.CharacterInfo.ActiveConfig=1;
                    Equip(a.CharacterInfo.Config1,Equipment(stage==1?14:15,stage==2?14:stage==1?14:15));
                    SelectAction.PublishExpansionStage(a,previous);
                    foreach(var wire in new[]{wa,wo,wu}){var p=wire.Read();Check(p.Length==1&&p[0]=="0|ES|900001|"+stage,"map broadcast without target/group filter");Packets.AddRange(p);}
                    SelectAction.PublishExpansionStage(a,stage);
                    Check(wa.Read().Length+wo.Read().Length+wu.Read().Length==0,"same stage emits nothing");
                    string hero=Text(UserDataComposer.Compose(a));Check(hero.Split('|')[19]==stage.ToString(),"hero I field19");Packets.Add(hero);
                    string enter=Text(MapUserEnterComposer.Compose(a.CharacterInfo,o));Check(enter.Split('|')[4]==stage.ToString(),"remote C field4");Packets.Add(enter);
                    var list=new CList<MapActor>();list.Add(actors[0]);string initial=Text(MapUserObjectListComposer.Compose(list,o));Check(initial.Split('|')[4]==stage.ToString(),"initial object list field4");Packets.Add(initial);
                    // Natural respawn/reconnect/jump compose from current snapshot, never a stage cache.
                    Check(Text(UserDataComposer.Compose(a)).Split('|')[19]==stage.ToString(),"fresh natural init");
                    previous=stage;
                }
                Equip(a.CharacterInfo.Config2,Equipment(8,8,0));a.CharacterInfo.ActiveConfig=2;
                SelectAction.PublishExpansionStage(a,previous);
                Check(wo.Read().Single()=="0|ES|900001|1","A/B observer immediate");wa.Read();wu.Read();
                // Represents a successfully reloaded immutable snapshot; does not call a database.
                Equip(a.CharacterInfo.Config2,Equipment(15,14));SelectAction.PublishExpansionStage(a,1);
                Check(wo.Read().Single()=="0|ES|900001|2","web snapshot refresh publication");wa.Read();wu.Read();
            }
            if(args.Length>0)File.WriteAllLines(args[0],Packets);
            Console.WriteLine("PASS: "+checks+" assertions; synthetic snapshots, actual composers and loopback broadcast; no SQL.");return 0;
        }
        catch(Exception e){Console.Error.WriteLine(e);return 1;}
    }
}
