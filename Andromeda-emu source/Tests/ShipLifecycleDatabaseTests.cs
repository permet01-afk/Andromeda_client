// Explicit local fixture only. Never reads the emulator configuration file.
using System;
using System.Collections;
using System.Data;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;
using OrbitReborn_Emulator.Config;
using OrbitReborn_Emulator.Game.Characters;
using OrbitReborn_Emulator.Game.GalaxyGates;
using OrbitReborn_Emulator.Storage;

internal static class ShipLifecycleDatabaseTests
{
    const string Dsn="Server=127.0.0.1;Port=13385;Database=andromeda;Uid=phase5_fixture;Password=phase5-isolated-only;Pooling=false";
    const int Player=710005;
    static int checks;
    static void Check(bool ok,string name){if(!ok)throw new Exception(name);checks++;Console.WriteLine("PASS "+name);}
    static void Exec(string sql){using(var c=new MySqlConnection(Dsn)){c.Open();using(var q=c.CreateCommand()){q.CommandText="SET SESSION sql_mode='';"+sql;q.ExecuteNonQuery();}}}
    static string Text(string sql){using(var c=new MySqlConnection(Dsn)){c.Open();using(var q=c.CreateCommand()){q.CommandText=sql;return Convert.ToString(q.ExecuteScalar());}}}
    static long Value(string sql){return long.Parse(Text(sql));}
    static void Configure()
    {
        var field=typeof(ConfigManager).GetField("mConfigData",BindingFlags.Static|BindingFlags.NonPublic);
        var values=(IDictionary)Activator.CreateInstance(field.FieldType);
        foreach(var pair in new[]{new[]{"mysql.host","127.0.0.1"},new[]{"mysql.dbname","andromeda"},new[]{"mysql.user","phase5_fixture"},new[]{"mysql.pass","phase5-isolated-only"}})
            values.Add(pair[0],new ConfigElement(pair[0],ConfigElementType.Text,pair[1]));
        foreach(var pair in new[]{new[]{"mysql.port","13385"},new[]{"mysql.pool.min","0"},new[]{"mysql.pool.max","40"},new[]{"mysql.pool.lifetime","30"}})
            values.Add(pair[0],new ConfigElement(pair[0],ConfigElementType.Integer,int.Parse(pair[1])));
        field.SetValue(null,values);
    }
    static void Seed(int ship=10,int count=8,int item=3,int damage=0)
    {
        Exec("DELETE FROM ship_lifecycle_log;DELETE FROM player_ship_state;DELETE FROM drone_operation_log;DELETE FROM player_drone_state;DELETE FROM drone_slot_config;DELETE FROM drone_slot;DELETE FROM drone_design_equipped;DELETE FROM drone;DELETE FROM player_inventory;DELETE FROM ship_slot;DELETE FROM ship_config_stats;DELETE FROM ship_config;DELETE FROM player_galaxy_gates;DELETE FROM users;DELETE FROM items;DELETE FROM ship_design;");
        Exec("INSERT INTO users(id,username,shipid,factionid,active_config,credits,uridium,level,drones,current_hp,max_hp,current_shield,current_shield1,current_shield2,ammo_lcb10) VALUES("+Player+",'phase5_fixture',"+ship+",1,1,200000,5000,20,'',4000,4000,700,800,900,123);"+
            "INSERT INTO items(id,name,category,type) VALUES(1,'LF-3','laser',0),(2,'BO2','generator',4),(3,'Iris','drone',0),(5,'Flax','drone',0),(9001,'Havok','drone_design',1);"+
            "INSERT INTO ship_design(ship_design_id,ship_design_nom,base_hp_2010,base_speed_2010,laser_slots_2010,generator_slots_2010,extra_slots_2010) VALUES("+ship+",'Fixture ship',4000,300,15,15,6);"+
            "INSERT INTO ship_config(id,player_id,ship_design_id,name,lasers_slots,gen_slots,extras_slots) VALUES(810001,"+Player+","+ship+",'A',15,15,6),(810002,"+Player+","+ship+",'B',15,15,6);"+
            "INSERT INTO player_inventory(player_id,item_id,qty) VALUES("+Player+",1,31),("+Player+",2,16),("+Player+",9001,8),("+Player+","+item+","+count+");");
        for(int i=0;i<15;i++)Exec("INSERT INTO ship_slot(ship_config_id,row_name,slot_index,item_id) VALUES(810001,'lasers',"+i+",1),(810002,'lasers',"+i+",1)");
        for(int i=0;i<count;i++)
        {
            int id=820001+i;
            Exec("INSERT INTO drone(id,player_id,item_id,name,level,progress_points,damage_units) VALUES("+id+","+Player+","+item+",'fixture"+id+"',5,17,"+damage+")");
            if(item==3)Exec("INSERT INTO drone_design_equipped(drone_id,design_item_id) VALUES("+id+",9001)");
            for(int slot=0;slot<(item==3?2:1);slot++)Exec("INSERT INTO drone_slot(drone_id,slot_index,item_id) VALUES("+id+","+slot+",1);INSERT INTO drone_slot_config(drone_id,config,slot_index,item_id) VALUES("+id+",'A',"+slot+",1),("+id+",'B',"+slot+",2)");
        }
    }
    static ShipGameplayLease Begin(){return ShipLifecycleService.BeginGameplay(Player,Guid.NewGuid().ToString("N"));}
    static GameplayDeathContext Context(ShipGameplayLease l,GameplayDeathCause cause=GameplayDeathCause.Npc,int map=1,bool invasion=false){return new GameplayDeathContext(l.Epoch,l.Token,map,cause,invasion);}
    static void Refused(Action action,string name){bool refused=false;try{action();}catch(InvalidOperationException){refused=true;}Check(refused,name);}
    static void SaveAttempt(ShipGameplayLease lease,int hp)
    {
        using(var conn=new MySqlConnection(Dsn))
        {
            conn.Open();var db=new SqlDatabaseClient(999,conn);db.SetParameter("p",Player);db.SetParameter("hp",hp);
            db.ExecuteNonQuery("UPDATE users SET current_hp=@hp,current_shield=777,mapid=2,locx=777 WHERE id=@p"+ShipLifecycleService.SaveFence(db,lease)+" LIMIT 1");
        }
    }
    static int Main(string[] args)
    {
        try
        {
            if(args.Length<1 || args[0]!="--isolated-13385")throw new Exception("Explicit --isolated-13385 required. Provision a fresh isolated server first.");
            Configure();
            string mode=args.Length>1?args[1]:"suite";
            if(mode=="seed-drone-repair"){Seed(10,1,3,54000);var l=Begin();DroneWearService.EndGameplay(Player,l.Token);Console.WriteLine("DRONE REPAIR FIXTURE");return 0;}
            if(mode=="death-gate" || mode=="death-gate-last")
            {
                Seed();Exec("INSERT INTO player_galaxy_gates(user_id,gate_id,on_map,lives,current_wave) VALUES("+Player+",1,1,"+(mode=="death-gate"?3:1)+",2)");
                int map=Enumerable.Range(1,1000).First(m=>GalaxyGateWaveService.IsGateMap(m)&&GalaxyGateWaveService.GateIdFromMap(m)==1);
                var l=Begin();ShipLifecycleService.AdmitDeath(Player,Context(l,map:map));DroneWearService.EndGameplay(Player,l.Token);return 0;
            }
            if(mode=="seed-ready"){Seed();Begin();Exec("UPDATE player_drone_state SET gameplay_token=NULL");Console.WriteLine("READY");return 0;}
            if(mode=="death" || mode=="death-owned" || mode=="death-phoenix" || mode=="death-invasion" || mode=="death-destroy-drone")
            {
                Seed(mode=="death-phoenix"?1:10,8,3,mode=="death-destroy-drone"?59000:17000);
                var l=Begin();ShipLifecycleService.AdmitDeath(Player,Context(l,invasion:mode=="death-invasion"));
                if(mode!="death-owned")DroneWearService.EndGameplay(Player,l.Token);
                Console.WriteLine("DESTROYED "+Text("SELECT destruction_id FROM player_ship_state"));return 0;
            }
            if(mode=="begin-end") {var l=Begin();Console.WriteLine("LAUNCH epoch="+l.Epoch+" hp="+Value("SELECT current_hp FROM users"));DroneWearService.EndGameplay(Player,l.Token);return 0;}
            if(mode=="restart")
            {
                DroneWearService.Initialize();Check(Text("SELECT status FROM player_ship_state")=="DESTROYED","restart preserves DESTROYED");
                Check(Value("SELECT COUNT(*) FROM player_drone_state WHERE gameplay_token IS NOT NULL")==0,"exclusive runtime guard recovers orphan token");
                Refused(()=>Begin(),"restart cannot launch destroyed ship");return 0;
            }
            if(mode=="crash-before-commit")
            {
                using(var db=new SqlDatabaseTransaction(Dsn)){db.Execute("UPDATE users SET current_hp=0 WHERE id=@p","@p",Player);db.Execute("UPDATE drone SET damage_units=damage_units+1000 WHERE player_id=@p","@p",Player);Environment.Exit(0);}return 0;
            }
            foreach(GameplayDeathCause cause in Enum.GetValues(typeof(GameplayDeathCause)))
            {
                Seed();var l=Begin();var context=Context(l,cause);
                var results=new DroneDeathResult[16];Parallel.For(0,results.Length,i=>results[i]=ShipLifecycleService.AdmitDeath(Player,context));
                Check(results.All(x=>x!=null && x.NextEpoch==l.Epoch+1),cause+" repeated death returns one durable result");
                Check(Value("SELECT SUM(damage_units) FROM drone")==8000,cause+" exactly one wear per drone");
                Check(Value("SELECT current_hp FROM users")==0 && Text("SELECT status FROM player_ship_state")=="DESTROYED",cause+" HP0 and DESTROYED committed together");
                Check(Value("SELECT COUNT(*) FROM ship_lifecycle_log")==1 && Value("SELECT COUNT(*) FROM drone_operation_log")==1,cause+" distinct ship/drone journals once");
                Check(Value("SELECT repair_cost FROM player_ship_state")==500,"normal captured price 500");
                SaveAttempt(l,99999);Check(Value("SELECT current_hp FROM users")==0 && Value("SELECT mapid FROM users")==1,"old save cannot resurrect/relocate destroyed ship");
                Refused(()=>Begin(),"direct C# launch refused while destroyed");
                DroneWearService.EndGameplay(Player,"not-the-owner");Check(Value("SELECT COUNT(*) FROM player_drone_state WHERE gameplay_token IS NOT NULL")==1,"wrong owner cannot release repair lock");
                DroneWearService.EndGameplay(Player,l.Token);Check(Value("SELECT COUNT(*) FROM player_drone_state WHERE gameplay_token IS NOT NULL")==0,"owner cleanup releases token");
                Check(Value("SELECT current_shield+current_shield1+current_shield2 FROM users")==0,"all shields zero");
            }
            Seed();var old=Begin();DroneWearService.EndGameplay(Player,old.Token);var next=Begin();
            Check(ShipLifecycleService.AdmitDeath(Player,Context(old))==null,"stale lethal callback cannot affect next life");
            SaveAttempt(old,17);Check(Value("SELECT current_hp FROM users")==4000,"old lease cannot save over new life");
            SaveAttempt(next,321);Check(Value("SELECT current_hp FROM users")==321,"current lease can save");
            DroneWearService.EndGameplay(Player,next.Token);
            int winners=0;Parallel.For(0,12,i=>{try{Begin();System.Threading.Interlocked.Increment(ref winners);}catch(InvalidOperationException){}});Check(winners==1,"twelve concurrent Launches have one owner");
            Seed(1);var phoenix=Begin();ShipLifecycleService.AdmitDeath(Player,Context(phoenix));Check(Value("SELECT repair_cost FROM player_ship_state")==0,"Phoenix free");
            Seed(10);var inv=Begin();ShipLifecycleService.AdmitDeath(Player,Context(inv,invasion:true));Check(Value("SELECT repair_cost FROM player_ship_state")==0 && Value("SELECT SUM(damage_units) FROM drone")==0,"qualified Invasion price and wear captured together");
            foreach(int lives in new[]{3,1})
            {
                Seed(10,1,5);Exec("INSERT INTO player_galaxy_gates(user_id,gate_id,on_map,lives,current_wave) VALUES("+Player+",1,1,"+lives+",2)");
                int map=Enumerable.Range(1,1000).First(m=>GalaxyGateWaveService.IsGateMap(m)&&GalaxyGateWaveService.GateIdFromMap(m)==1);
                var l=Begin();var c=Context(l,map:map);ShipLifecycleService.AdmitDeath(Player,c);ShipLifecycleService.AdmitDeath(Player,c);
                Check(Value("SELECT lives FROM player_galaxy_gates")==lives-1 && Value("SELECT damage_units FROM drone")==1500,"GG life/wear exactly once (lives="+lives+")");
                Check(Value("SELECT repair_cost FROM player_ship_state")==500 && Value("SELECT mapid FROM users")==1,"GG captured normal price and x-1 destination");
                Check(Value("SELECT current_wave FROM player_galaxy_gates")== (lives==1?0:2),"GG failed/progress state retained");
            }
            Seed(10,8,3,59000);var destroyed=Begin();ShipLifecycleService.AdmitDeath(Player,Context(destroyed));
            Check(Value("SELECT COUNT(*) FROM drone")==0 && Value("SELECT COUNT(*) FROM drone_slot_config")==0 && Value("SELECT COUNT(*) FROM drone_design_equipped")==0,"threshold drones and assignments removed");
            Check(Value("SELECT qty FROM player_inventory WHERE item_id=1")==31 && Value("SELECT qty FROM player_inventory WHERE item_id=9001")==8,"mounted LF3/Havok ownership preserved");
            Check(Text("SELECT drones FROM users")=="" && Value("SELECT damage_total FROM ship_config_stats WHERE ship_config_id=810001")==2250,"legacy projection and real N rebuild after destruction");
            DroneWearService.EndGameplay(Player,destroyed.Token);
            Console.WriteLine("PASS "+checks+" isolated lifecycle assertions");return 0;
        }
        catch(Exception e){Console.Error.WriteLine(e);return 1;}
    }
}
