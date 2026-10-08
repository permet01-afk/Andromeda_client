using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using OrbitReborn_Emulator.Game.Event.Tdm;

// Pure production state-machine tests. No emulator startup, sockets or SQL.
public static class TdmRuntimeTests
{
    private static readonly List<object> Tests = new List<object>();
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
    private sealed class Harness
    {
        public long Time = 1000000, Request;
        public TdmEventService E;
        public readonly Dictionary<int,TdmPresence> Players = new Dictionary<int,TdmPresence>();
        public Harness() { E = new TdmEventService(() => Time); E.Enable(); }
        public TdmPresence Player(int id, int company, int level = 14)
        {
            var p = new TdmPresence { Id=id,Company=company,Level=level,Map=TdmRules.Home(company),X=TdmRules.BeaconX,Y=TdmRules.BeaconY,Connected=true,Ready=true,Compatible=true };
            Players[id]=p;E.Observe(p);E.Open(id);return p;
        }
        public void Join(int id) { Check(Cmd(id,"JOIN")=="","JOIN "+id); }
        public string Cmd(int id,string action,string reference="") { return E.Command(id,E.Id,++Request,action,reference); }
        public Dictionary<string,object> Snapshot(int id) { return Json.Deserialize<Dictionary<string,object>>(Json.Serialize(E.Snapshot(id))); }
        public Dictionary<string,object> Part(int id,string name) { return Snapshot(id)[name] as Dictionary<string,object>; }
        public string Ref(int id,string name) { var x=Part(id,name);return x==null?"":Convert.ToString(x["id"]); }
        public int Value(int id,string key) {return Convert.ToInt32(Part(id,"match")[key]);}
        public void Step(long ms) { Time+=ms;E.Tick(); }
        public void Teams(int a,int b,int level=14)
        {
            for(int n=0;n<a;n++){Player(100+n,1,level);Join(100+n);}
            for(int n=0;n<b;n++){Player(200+n,2,level);Join(200+n);}
            E.Tick();
        }
        public void AcceptAll()
        {
            foreach(int id in Players.Keys.ToArray()) {string offer=Ref(id,"offer");if(offer!="")Check(Cmd(id,"ACCEPT",offer)=="","ACCEPT");}
            E.Tick();
        }
        public void Start(int n=3) {Teams(n,n);AcceptAll();E.DrainEffects();}
        public void Kill(int victim,int killer) {Check(E.Die(victim,killer,E.Life(victim)),"death admitted");}
        public void Repair(int id) {var m=Part(id,"match");Check(Cmd(id,"REPAIR",Convert.ToString(m["deathId"]))=="","repair");}
    }
    private static void Check(bool ok,string message) {if(!ok)throw new Exception(message);}
    private static void Test(string name,Action test)
    {
        try {test();Tests.Add(new{name=name,status="PASS"});}
        catch(Exception e){Tests.Add(new{name=name,status="FAIL",error=e.ToString()});}
    }
    public static int Main(string[] args)
    {
        Test("event OFF/ON/stale/repeated start-stop",()=>{
            var h=new Harness();string first=h.E.Id;h.E.Enable();Check(first==h.E.Id,"enable idempotent");h.Player(1,1);h.Join(1);
            h.E.Disable();h.E.Disable();Check(!h.E.Active,"off");Check(!h.E.Open(1),"stale open");
            Check(h.E.Command(1,first,1,"JOIN","")==TdmRules.Unavailable,"stale join");h.E.Enable();Check(h.E.Id!=first,"new event epoch");
            Check(h.Cmd(1,"JOIN")!="","old lobby token");Check(h.E.Open(1),"new lobby");h.Join(1);
        });
        Test("beacon near/far/company/map; OPEN never enrolls",()=>{
            var h=new Harness();var p=h.Player(1,1);Check(!Convert.ToBoolean(h.Snapshot(1)["queued"]),"open must not JOIN");
            p.X+=401;h.E.Observe(p);Check(!h.E.Open(1),"far");p.X=TdmRules.BeaconX;p.Map=5;h.E.Observe(p);Check(!h.E.Open(1),"other home");
            Check(!TdmRules.NearBeacon(13,1,10670,6509),"normal portal map");Check(TdmRules.NearBeacon(9,3,10670,6509),"VRU");
        });
        Test("eligibility level/READY/GG-compatible and one queue",()=>{
            var h=new Harness();var p=h.Player(1,1,7);Check(h.Cmd(1,"JOIN")!="","below8");p.Level=8;h.E.Observe(p);h.Join(1);
            Check(h.Cmd(1,"JOIN")!="","double join");p.Company=2;h.E.Observe(p);Check(!Convert.ToBoolean(h.Snapshot(1)["queued"]),"company change removes");
            p.Ready=false;h.E.Observe(p);Check(h.Cmd(1,"JOIN")!="","dead");p.Ready=true;p.Compatible=false;h.E.Observe(p);Check(h.Cmd(1,"JOIN")!="","GG/incompatible");
        });
        Test("brackets do not mix and level changes invalidate queue",()=>{
            var h=new Harness();for(int i=0;i<3;i++){h.Player(100+i,1,13);h.Join(100+i);h.Player(200+i,2,14);h.Join(200+i);}h.E.Tick();
            Check(h.Part(100,"offer")==null,"mixed brackets");h.Players[100].Level=14;h.E.Observe(h.Players[100]);Check(!Convert.ToBoolean(h.Snapshot(100)["queued"]),"bracket change");
        });
        foreach(int n in new[]{3,4,5,8}){int size=n;Test(size+"v"+size+" FIFO and immutable faction",()=>{
            var h=new Harness();h.Teams(size,size);Check(Convert.ToInt32(h.Part(100,"offer")["size"])==size,"size");h.AcceptAll();
            Check(h.E.DrainEffects().Count(e=>e.Kind=="ENTER")==2*size,"balanced roster");Check(h.Players[100].Company==1&&h.Players[200].Company==2,"company unchanged");
        });}
        Test("7vs5 -> 5v5; oldest FIFO; two remain",()=>{var h=new Harness();h.Teams(7,5);h.AcceptAll();Check(h.E.Contains(104)&&!h.E.Contains(105),"FIFO");Check(Convert.ToBoolean(h.Snapshot(105)["queued"])&&Convert.ToBoolean(h.Snapshot(106)["queued"]),"remainder");});
        Test("offer timeout/minimum and accepting players keep FIFO",()=>{
            var h=new Harness();h.Teams(3,3);h.Cmd(100,"ACCEPT",h.Ref(100,"offer"));h.Cmd(200,"ACCEPT",h.Ref(200,"offer"));h.Step(15000);
            Check(h.Part(100,"match")==null,"under3 cancels");Check(Convert.ToBoolean(h.Snapshot(100)["queued"]),"acceptor retained");Check(!Convert.ToBoolean(h.Snapshot(101)["queued"]),"timeout removed");
        });
        Test("offer revalidation disconnect/decline and stale accept",()=>{
            var h=new Harness();h.Teams(3,3);string offer=h.Ref(100,"offer");h.Cmd(100,"DECLINE",offer);Check(h.Cmd(100,"ACCEPT",offer)!="","declined");
            h.Players[200].Connected=false;h.E.Observe(h.Players[200]);Check(h.Cmd(200,"ACCEPT",offer)!="","disconnected");h.Step(15000);Check(h.Part(101,"match")==null,"no admission");
        });
        Test("safe exists before transfer; all hostile sources blocked; confinement",()=>{
            var h=new Harness();h.Start();Check(h.E.Safe,"safe before effects");Check(!h.E.CanDamage(100,200),"laser/rocket/launcher/SMB/chain/venom policy");
            Check(h.E.Move(100,3500,6550)&&h.E.Move(100,4100,6550),"inside");Check(!h.E.Move(100,4101,6550),"outside");
            h.Step(19999);Check(!h.E.CanDamage(100,200),"20 real seconds");h.Step(1);Check(h.E.CanDamage(100,200),"safe expiry");Check(h.E.Move(100,17000,6550),"active movement");
            Check(Convert.ToInt64(h.Part(100,"match")["endsAt"])-h.Time==900000,"clock begins after safe");
        });
        Test("TDM friendly fire / third company / no membership",()=>{var h=new Harness();h.Start();h.Step(20000);h.Player(300,3);Check(!h.E.CanDamage(100,101)&&!h.E.CanDamage(300,200)&&!h.E.CanDamage(100,999),"relations");Check(h.E.CanDamage(100,200),"enemy");});
        Test("3->2->1->0; unique death; duplicate repair; no reentry",()=>{
            var h=new Harness();h.Start();h.Step(20000);long old=h.E.Life(200);h.Kill(200,100);Check(h.Value(200,"lives")==2&&h.Value(100,"scoreA")==1,"firstdeath");
            Check(!h.E.Die(200,100,old),"duplicate death");string death=Convert.ToString(h.Part(200,"match")["deathId"]);h.Repair(200);Check(h.Cmd(200,"REPAIR",death)!="","duplicate repair");
            h.Step(20000);h.Kill(200,100);Check(h.Value(200,"lives")==1,"second");h.Repair(200);h.Step(20000);h.Kill(200,100);
            Check(!h.E.Contains(200),"eliminated");Check(h.E.DrainEffects().Any(e=>e.Player==200&&e.Kind=="HOME"),"home READY effect");Check(h.Cmd(200,"JOIN")!="","no recycling");
        });
        Test("NAZ20 valid hostile drops before shot; invalid/FF retain",()=>{
            var h=new Harness();h.Start();h.Step(20000);h.Kill(200,100);h.Repair(200);Check(!h.E.CanDamage(100,200),"protected incoming");
            long end=Convert.ToInt64(h.Part(200,"match")["nazEnd"]);Check(!h.E.Attack(200,201)&&!h.E.Attack(200,999),"invalid");Check(Convert.ToInt64(h.Part(200,"match")["nazEnd"])==end,"retained");
            Check(h.E.Attack(200,100)&&h.E.CanDamage(100,200),"valid breaks");
            h.Kill(200,100);h.Repair(200);h.Step(19999);Check(!h.E.CanDamage(100,200),"19.999");h.Step(1);Check(h.E.CanDamage(100,200),"20");
        });
        Test("delayed attacker epoch after death/repair",()=>{var h=new Harness();h.Start();h.Step(20000);long life=h.E.Life(100);h.Kill(100,200);h.Repair(100);Check(!h.E.CanDamage(100,200,life),"old projectile");Check(h.E.CanDamage(100,200,h.E.Life(100)),"new projectile");});
        Test("repair timeout returns home, no Phase5",()=>{var h=new Harness();h.Start();h.Step(20000);h.Kill(200,100);h.Step(15000);Check(!h.E.Contains(200),"expired");Check(h.E.DrainEffects().Any(e=>e.Player==200&&e.Kind=="HOME"),"home effect");});
        Test("reconnect preserves lives/death/repair/NAZ deadlines",()=>{
            var h=new Harness();h.Start();h.Step(20000);h.Kill(200,100);var before=h.Part(200,"match");h.E.Disconnect(200,false);h.Step(5000);
            Check(h.E.Reconnect(200),"grace reconnect");var after=h.Part(200,"match");foreach(string key in new[]{"lives","deathId","repairEnd","nazEnd","id"})Check(Convert.ToString(before[key])==Convert.ToString(after[key]),"preserve "+key);
            h.Repair(200);long deadline=Convert.ToInt64(h.Part(200,"match")["nazEnd"]);h.E.Disconnect(200,false);h.Step(5000);Check(h.E.Reconnect(200),"second reconnect");Check(Convert.ToInt64(h.Part(200,"match")["nazEnd"])==deadline,"no refreshed NAZ");
        });
        Test("disconnect grace then refill same company FIFO; no dead replacement",()=>{
            var h=new Harness();h.Start();h.Step(20000);h.Player(210,2);h.Join(210);h.Kill(200,100);h.E.Tick();Check(h.Part(210,"offer")==null,"repairable not vacant");
            h.Repair(200);h.E.Disconnect(201,false);h.Step(14999);Check(h.Part(210,"offer")==null,"reserved grace");h.Step(1);
            string offer=h.Ref(210,"offer");Check(offer!="","real vacancy");h.Cmd(210,"ACCEPT",offer);h.E.Tick();Check(h.E.Contains(210)&&h.Value(210,"lives")==3,"refill");Check(!h.E.Reconnect(201),"expired cannot recover slot");
        });
        Test("empty opponents30 cancels without victory reward",()=>{
            var h=new Harness();h.Start();h.Step(20000);for(int id=200;id<203;id++)h.E.Disconnect(id,false);h.E.Tick();h.Step(29999);Check(h.Part(100,"match")!=null,"grace");h.Step(1);
            Check(Convert.ToString(h.Part(100,"result")["outcome"])=="CANCELLED","not free victory");Check(Convert.ToString(h.Part(100,"result")["reason"])==TdmRules.EmptyResult,"message");
        });
        Test("900s win/loss and STAY prefers third company with resets",()=>{
            var h=new Harness();h.Start();h.Step(20000);h.Kill(200,100);h.Repair(200);h.Step(900000);
            Check(Convert.ToString(h.Part(100,"result")["outcome"])=="WIN"&&Convert.ToString(h.Part(200,"result")["outcome"])=="LOSS","result");
            string old=h.Ref(100,"result");for(int i=100;i<103;i++)h.Cmd(i,"STAY",old);
            for(int i=0;i<3;i++){h.Player(400+i,2);h.Join(400+i);h.Player(500+i,3);h.Join(500+i);}h.E.Tick();
            Check(Convert.ToInt32(h.Part(100,"offer")["companyB"])==3,"third company priority");h.AcceptAll();Check(h.Ref(100,"match")!=old&&h.Value(100,"lives")==3&&h.Value(100,"scoreA")==0&&h.E.Safe,"new match reset");
        });
        Test("900s draw; environmental death no score; no economic credits",()=>{
            var h=new Harness();h.Start();h.Step(20000);h.Kill(100,0);h.Repair(100);h.Step(900000);Check(Convert.ToString(h.Part(100,"result")["outcome"])=="DRAW","draw");
            Check(!h.E.Rewards.Enabled&&!h.E.Rewards.Credits.HasValue&&!h.E.Rewards.Uridium.HasValue,"unset economy");
        });
        Test("map unavailable rollback; stale effects and stop idempotence",()=>{
            var h=new Harness();h.Start();string match=h.Ref(100,"match");h.E.TransferFailed(match);Check(h.Part(100,"match")==null,"rollback");
            Check(h.E.DrainEffects().Count(e=>e.Kind=="HOME")==6,"all returned");h.E.Disable();var first=h.E.DrainEffects();h.E.Disable();Check(h.E.DrainEffects().Length==0,"stop repeat");
            h.E.Enable();h.E.TransferFailed(match);Check(h.E.Active,"stale callback ignored");
        });
        Test("parallel duplicate lethal impacts debit one life/score",()=>{
            var h=new Harness();h.Start();h.Step(20000);long life=h.E.Life(200);int accepted=0;
            Parallel.For(0,64,i=>{if(h.E.Die(200,100,life))System.Threading.Interlocked.Increment(ref accepted);});
            Check(accepted==1&&h.Value(200,"lives")==2&&h.Value(100,"scoreA")==1,"atomic death");
        });
        Test("duplicate command request cannot mutate twice",()=>{
            var h=new Harness();h.Player(1,1);Check(h.E.Command(1,h.E.Id,55,"JOIN","")=="","join");h.E.Command(1,h.E.Id,55,"LEAVE","");Check(Convert.ToBoolean(h.Snapshot(1)["queued"]),"replayed request cannot be repurposed");
        });
        Test("30th kill finishes on next pulse without a timer reset",()=>{
            var h=new Harness();h.Start();h.Step(20000);int victim=202;
            for(int count=1;count<=30;count++) {
                h.Kill(victim,100);
                if(count==30)break;
                if(count%2==1){h.Repair(victim);h.Step(20000);}
                else {h.Cmd(victim,"LEAVE");victim=600+count;h.Player(victim,2);h.Join(victim);h.E.Tick();h.Cmd(victim,"ACCEPT",h.Ref(victim,"offer"));h.E.Tick();h.Step(20000);}
            }
            Check(!h.E.CanDamage(100,200),"30th kill closes new attacks before result publication");
            h.E.Tick();Check(Convert.ToString(h.Part(100,"result")["outcome"])=="WIN","score30 win");Check(Convert.ToInt32(h.Part(100,"result")["scoreA"])==30,"exact30");
        });
        Test("reciprocal lethal impacts in the same pulse both score",()=>{
            var h=new Harness();h.Start();h.Step(20000);long a=h.E.Life(100),b=h.E.Life(200);
            Parallel.Invoke(()=>Check(h.E.Die(100,200,a),"reciprocal A"),()=>Check(h.E.Die(200,100,b),"reciprocal B"));
            Check(h.Value(101,"scoreA")==1&&h.Value(101,"scoreB")==1,"no order-biased lost kill");
        });
        Test("zero-life slot is spent, not a refill vacancy",()=>{
            var h=new Harness();h.Start();h.Step(20000);
            for(int n=0;n<3;n++){h.Kill(200,100);if(n<2){h.Repair(200);h.Step(20000);}}
            h.Player(210,2);h.Join(210);h.E.Tick();Check(h.Part(210,"offer")==null,"eliminated slot cannot be recycled");
        });
        Test("result deadline and stay without opponent clean up",()=>{
            var h=new Harness();h.Start();h.Step(20000);h.Kill(200,100);h.Repair(200);h.Step(900000);
            h.Cmd(100,"STAY",h.Ref(100,"result"));h.Step(30000);Check(h.Part(101,"result")==null,"no choice home");
            h.Step(30000);Check(!Convert.ToBoolean(h.Snapshot(100)["queued"])&&h.Part(100,"result")==null,"stay timeout home");
        });
        Test("HELLO replay on connected member cannot heal/teleport",()=>{
            var h=new Harness();h.Start();long life=h.E.Life(100);Check(h.E.Reconnect(100),"resync allowed");
            Check(h.E.Life(100)==life&&h.E.DrainEffects().Length==0,"no replay effect");
        });
        Test("leaving map83 after transfer invalidates membership",()=>{
            var h=new Harness();h.Teams(3,3);h.AcceptAll();var e=h.E.DrainEffects().First(x=>x.Player==100);
            h.Players[100].Map=83;h.E.Observe(h.Players[100]);Check(h.E.MarkEntered(e),"entered committed");
            h.Players[100].Map=1;h.E.Observe(h.Players[100]);Check(!h.E.Contains(100),"external map change leaves match");
        });
        Test("configured rewards remain disabled; negative settings rejected",()=>{
            var rewards=new TdmRewardPolicy(credits:12);
            var engine=new TdmEventService(()=>1000000,rewards);
            Check(!engine.Rewards.Enabled&&engine.Rewards.Credits==12&&engine.Rewards.Uridium==null,"configuration cannot enable payouts");
            bool rejected=false;try{new TdmRewardPolicy(uridium:-1);}catch(ArgumentOutOfRangeException){rejected=true;}
            Check(rejected,"reject negative reward");
        });
        Test("same-company lethal attribution never adds score",()=>{
            var h=new Harness();h.Start();h.Step(20000);h.Kill(100,101);
            Check(h.Value(101,"scoreA")==0&&h.Value(101,"scoreB")==0,"no friendly kill score");
        });
        Test("lethal callback crossing end deadline preserves timed result",()=>{
            var h=new Harness();h.Start();h.Step(20000);h.Kill(200,100);h.Repair(200);
            h.Time+=900000;h.E.AbortParticipant(100);
            Check(Convert.ToString(h.Part(100,"result")["outcome"])=="WIN","stale lethal cannot replace result");
        });
        string output=Json.Serialize(Tests);if(args.Length>0)System.IO.File.WriteAllText(args[0],output);
        Console.WriteLine(output);return output.Contains("\"FAIL\"")?1:0;
    }
}
