// Explicit isolated database only; never starts the game or uses its connection settings.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;
using OrbitReborn_Emulator.Config;
using OrbitReborn_Emulator.Game.Characters;

internal static class DroneWearDatabaseTests
{
    const string Dsn="Server=127.0.0.1;Port=13384;Database=phase4_fixture;Uid=phase4_fixture;Password=isolated-test-only;Pooling=false";
    const int Player=710004;
    static int checks;
    static void Check(bool ok,string name) { if (!ok) throw new Exception(name); checks++; Console.WriteLine("PASS "+name); }
    static void Exec(string sql) { using(var c=new MySqlConnection(Dsn)){c.Open();using(var q=c.CreateCommand()){q.CommandText="SET SESSION sql_mode='';"+sql;q.ExecuteNonQuery();}} }
    static long Value(string sql) { using(var c=new MySqlConnection(Dsn)){c.Open();using(var q=c.CreateCommand()){q.CommandText=sql;return Convert.ToInt64(q.ExecuteScalar());}} }
    static void Configuration()
    {
        var field=typeof(ConfigManager).GetField("mConfigData",BindingFlags.Static|BindingFlags.NonPublic);
        var values=(IDictionary)Activator.CreateInstance(field.FieldType);
        values.Add("mysql.host",new ConfigElement("mysql.host",ConfigElementType.Text,"127.0.0.1"));
        values.Add("mysql.port",new ConfigElement("mysql.port",ConfigElementType.Integer,13384));
        values.Add("mysql.dbname",new ConfigElement("mysql.dbname",ConfigElementType.Text,"phase4_fixture"));
        values.Add("mysql.user",new ConfigElement("mysql.user",ConfigElementType.Text,"phase4_fixture"));
        values.Add("mysql.pass",new ConfigElement("mysql.pass",ConfigElementType.Text,"isolated-test-only"));
        values.Add("mysql.pool.min",new ConfigElement("mysql.pool.min",ConfigElementType.Integer,0));
        values.Add("mysql.pool.max",new ConfigElement("mysql.pool.max",ConfigElementType.Integer,40));
        field.SetValue(null,values);
    }
    static void Seed(int count=8, int item=3, int damage=0)
    {
        Exec("DELETE FROM drone_operation_log;DELETE FROM player_drone_state;DELETE FROM drone_slot_config;DELETE FROM drone_slot;DELETE FROM drone_design_equipped;DELETE FROM drone;DELETE FROM player_inventory;DELETE FROM ship_slot;DELETE FROM ship_config_stats;DELETE FROM ship_config;DELETE FROM player_galaxy_gates;DELETE FROM users;DELETE FROM items;DELETE FROM ship_design;");
        Exec("INSERT INTO users(id,username,shipid,factionid,active_config,credits,uridium,level,drones) VALUES("+Player+",'phase4_fixture',10,1,1,200000,5000,20,'');"+
            "INSERT INTO items(id,name,category,type) VALUES(1,'LF-3','laser',0),(2,'BO2','generator',4),(3,'Iris','drone',0),(5,'Flax','drone',0),(9001,'Havok','drone_design',1);"+
            "INSERT INTO ship_design(ship_design_id,ship_design_nom,base_speed_2010,laser_slots_2010,generator_slots_2010,extra_slots_2010) VALUES(10,'Goliath',300,15,15,6);"+
            "INSERT INTO ship_config(id,player_id,ship_design_id,name,lasers_slots,gen_slots,extras_slots) VALUES(810001,"+Player+",10,'A',15,15,6),(810002,"+Player+",10,'B',15,15,6);"+
            "INSERT INTO player_inventory(player_id,item_id,qty) VALUES("+Player+",1,31),("+Player+",2,16),("+Player+",9001,8),("+Player+","+item+","+count+");");
        for(int i=0;i<15;i++) Exec("INSERT INTO ship_slot(ship_config_id,row_name,slot_index,item_id) VALUES(810001,'lasers',"+i+",1),(810002,'lasers',"+i+",1)");
        for(int i=0;i<count;i++)
        {
            int id=820001+i;
            Exec("INSERT INTO drone(id,player_id,item_id,name,level,progress_points,damage_units) VALUES("+id+","+Player+","+item+",'fixture"+id+"',6,0,"+damage+")");
            if(item==3) Exec("INSERT INTO drone_design_equipped(drone_id,design_item_id) VALUES("+id+",9001)");
            for(int slot=0;slot<(item==3?2:1);slot++) Exec("INSERT INTO drone_slot(drone_id,slot_index,item_id) VALUES("+id+","+slot+",1);INSERT INTO drone_slot_config(drone_id,config,slot_index,item_id) VALUES("+id+",'A',"+slot+",1),("+id+",'B',"+slot+",2)");
        }
    }
    static GameplayDeathContext Context(string token,long epoch,int map=1,bool invasion=false)
    {return new GameplayDeathContext(epoch,token,map,GameplayDeathCause.Npc,invasion);}
    static DroneDeathResult Death(GameplayDeathContext c){return DroneWearService.AdmitDeath(Player,c,1,2000,1100);}
    static int Main(string[] args)
    {
        try
        {
            if(args.Length<1 || args[0]!="--isolated-13384") throw new Exception("Explicit --isolated-13384 required; provision phase4_fixture first.");
            Configuration();
            if(args.Length==2 && args[1]=="--login-read") {
                DroneWearService.Initialize();string t=Guid.NewGuid().ToString("N");DroneWearService.BeginGameplay(Player,t);
                Console.WriteLine("LEVEL="+Value("SELECT level FROM drone WHERE id=820001")+" WEAR="+Value("SELECT damage_units FROM drone WHERE id=820001"));
                System.Threading.Thread.Sleep(200);DroneWearService.EndGameplay(Player,t);return 0;
            }
            if(args.Length==2 && args[1]=="--exit-after-commit") {
                Seed(1,3);DroneWearService.Initialize();string t=Guid.NewGuid().ToString("N");long e=DroneWearService.BeginGameplay(Player,t);
                Death(Context(t,e));Console.WriteLine("Fixture committed; exit without runtime respawn/logout.");return 0;
            }
            if(args.Length==2 && args[1]=="--restart-check") {
                DroneWearService.Initialize();string t=Guid.NewGuid().ToString("N");long e=DroneWearService.BeginGameplay(Player,t);
                Check(e==3 && Value("SELECT damage_units FROM drone")==1000 && Value("SELECT COUNT(*) FROM drone_operation_log")==1,"new process retains one wear and recovers stale session");
                Check(Value("SELECT current_hp FROM users")==1000 && Value("SELECT mapid FROM users")==1,"durable respawn survives exited process");
                DroneWearService.EndGameplay(Player,t);return 0;
            }
            if(args.Length==2 && args[1]=="--seed-eight") { Seed(8,3,54000); DroneProgressionService.Load(Player);Console.WriteLine("Isolated eight-drone UI fixture ready.");return 0; }
            if(args.Length==2 && args[1]=="--death-middle") {
                DroneWearService.Initialize();string t=Guid.NewGuid().ToString("N");long e=DroneWearService.BeginGameplay(Player,t);
                Exec("UPDATE drone SET damage_units=59000 WHERE id=820004");Death(Context(t,e));DroneWearService.EndGameplay(Player,t);Console.WriteLine("Isolated middle-drone death admitted.");return 0;
            }
            for(int i=0;i<60;i++) Check(DroneWearRules.AfterDeath(3,i*1000,false)==(i+1)*1000,"Iris exact increment "+i);
            for(int i=0;i<40;i++) Check(DroneWearRules.AfterDeath(5,i*1500,false)==(i+1)*1500,"Flax exact increment "+i);
            Check(DroneWearRules.DisplayPercent(1000)==2 && DroneWearRules.DisplayPercent(2000)==3 && DroneWearRules.DisplayPercent(3000)==5 && DroneWearRules.DisplayPercent(59000)==98,"integer rounding");
            Check(DroneWearRules.DisplayPercent(59999)==100 && 59999<DroneWearRules.MaxDamageUnits,"display is not threshold");
            Seed(); DroneWearService.Initialize();
            string token=Guid.NewGuid().ToString("N");long epoch=DroneWearService.BeginGameplay(Player,token);
            var context=Context(token,epoch); var first=Death(context);
            Check(Value("SELECT MIN(damage_units) FROM drone")==1000 && Value("SELECT MAX(damage_units) FROM drone")==1000,"all eight Iris gain wear");
            Check(first.Equipment.ForShip(10).Rows.Cast<DataRow>().First(r=>r["config"].ToString()=="A")["damage_total"].ToString()=="5154","wear does not reduce power");
            Parallel.For(0,20,i=>Death(context));
            Check(Value("SELECT COUNT(*) FROM drone_operation_log")==1 && Value("SELECT MAX(damage_units) FROM drone")==1000,"20 repeated/concurrent callbacks one wear");
            var discarded=Death(Context(token,first.NextEpoch)); // Simulate committed result not delivered.
            var recovered=Death(Context(token,first.NextEpoch));
            Check(recovered.NextEpoch==discarded.NextEpoch && Value("SELECT MAX(damage_units) FROM drone")==2000,"lost result replay reads durable operation");
            Check(Death(Context("wrong",recovered.NextEpoch))==null,"different session is fenced");
            Check(Death(Context(token,9999))==null,"wrong life cannot mutate");
            var exempt=Death(Context(token,recovered.NextEpoch,17,true));
            Check(Value("SELECT MAX(damage_units) FROM drone")==2000,"qualified active Invasion zero increment");
            var ordinary=Death(Context(token,exempt.NextEpoch,17,false));
            Check(Value("SELECT MAX(damage_units) FROM drone")==3000,"same map after Invasion gains wear");
            // Real transaction rollback after mutations, before the journal/commit.
            Exec("CREATE TRIGGER phase4_fail_log BEFORE INSERT ON drone_operation_log FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture rollback'");
            bool failed=false;try{Death(Context(token,ordinary.NextEpoch));}catch{failed=true;}
            Exec("DROP TRIGGER phase4_fail_log");
            Check(failed && Value("SELECT MAX(damage_units) FROM drone")==3000,"failure before commit rolls back every drone");
            Check(Value("SELECT life_epoch FROM player_drone_state WHERE player_id="+Player)==ordinary.NextEpoch,"rollback retains life epoch");
            DroneWearService.EndGameplay(Player,token);
            Check(Value("SELECT gameplay_token IS NULL FROM player_drone_state WHERE player_id="+Player)==1,"clean logout releases repair gate");

            foreach(int lost in new[]{820001,820004,820008})
            {
                Seed();token=Guid.NewGuid().ToString("N");epoch=DroneWearService.BeginGameplay(Player,token);
                Exec("UPDATE drone SET damage_units=59000 WHERE id="+lost);
                var result=Death(Context(token,epoch));
                Check(Value("SELECT COUNT(*) FROM drone")==7 && Value("SELECT COUNT(*) FROM drone WHERE id="+lost)==0,"destroy exact instance "+lost);
                Check(Value("SELECT qty FROM player_inventory WHERE item_id=1")==31 && Value("SELECT qty FROM player_inventory WHERE item_id=2")==16,"mounted equipment ownership unchanged");
                Check(Value("SELECT qty FROM player_inventory WHERE item_id=9001")==8 && Value("SELECT COUNT(*) FROM drone_design_equipped")==7,"Havok detached, never lost or credited");
                Check(Value("SELECT qty FROM player_inventory WHERE item_id=3")==7,"only drone ownership decremented");
                Check(result.Equipment.ForShip(10).Rows.Cast<DataRow>().First(r=>r["config"].ToString()=="A")["drone_count"].ToString()=="14","N becomes 15+14");
                Check(DroneRules.FullHavok(result.Equipment.Drones),"seven surviving Iris still full Havok");
                Check(Value("SELECT COUNT(*) FROM drone_slot_config WHERE drone_id="+lost)==0 && Value("SELECT COUNT(*) FROM drone_slot WHERE drone_id="+lost)==0,"both configurations and legacy slots detached");
                Check(Value("SELECT CHAR_LENGTH(drones)-CHAR_LENGTH(REPLACE(drones,'-','')) FROM users")==6,"legacy projection has seven stable instances");
                Check(result.Equipment.Drones.Select(d=>d.Id).SequenceEqual(Enumerable.Range(820001,8).Where(id=>id!=lost)), "survivor identities remain stable");
            }
            Seed(1,5,58500);token=Guid.NewGuid().ToString("N");epoch=DroneWearService.BeginGameplay(Player,token);Death(Context(token,epoch));
            Check(Value("SELECT COUNT(*) FROM drone")==0 && Value("SELECT COUNT(*) FROM player_inventory WHERE item_id=5")==0,"Flax 40th death destroys without negative ownership");
            Seed(1,3);token=Guid.NewGuid().ToString("N");epoch=DroneWearService.BeginGameplay(Player,token);
            Exec("INSERT INTO player_galaxy_gates(user_id,gate_id,on_map,lives,current_wave) VALUES("+Player+",1,1,3,2)");
            // Alpha map is resolved from production constants, not assumed here.
            int gateMap=Enumerable.Range(1,1000).First(m=>OrbitReborn_Emulator.Game.GalaxyGates.GalaxyGateWaveService.IsGateMap(m) && OrbitReborn_Emulator.Game.GalaxyGates.GalaxyGateWaveService.GateIdFromMap(m)==1);
            var gate=Death(Context(token,epoch,gateMap));Death(Context(token,epoch,gateMap));
            Check(gate.GateLives==2 && Value("SELECT lives FROM player_galaxy_gates")==2 && Value("SELECT damage_units FROM drone")==1000,"GG life and wear committed once together");
            Check(Value("SELECT mapid FROM users")==1 && Value("SELECT current_hp FROM users")==1000,"respawn survives process loss before runtime publication");
            DroneWearService.EndGameplay(Player,token);
            long relog=DroneWearService.BeginGameplay(Player,Guid.NewGuid().ToString("N"));
            Check(relog>gate.NextEpoch && Value("SELECT damage_units FROM drone")==1000,"logout/login retains committed wear and advances life");
            Seed(1,5);token=Guid.NewGuid().ToString("N");epoch=DroneWearService.BeginGameplay(Player,token);
            Exec("INSERT INTO player_galaxy_gates(user_id,gate_id,on_map,lives,current_wave) VALUES("+Player+",1,1,3,2)");
            Death(Context(token,epoch,gateMap));
            Check(Value("SELECT damage_units FROM drone")==1500 && Value("SELECT lives FROM player_galaxy_gates")==2,"GG Flax wears and loses Gate life");
            // Leave the one-Iris fixture expected by the PHP repair suite.
            Seed(1,3);token=Guid.NewGuid().ToString("N");DroneWearService.BeginGameplay(Player,token);DroneWearService.EndGameplay(Player,token);
            Console.WriteLine("PASS: "+checks+" assertions, isolated MariaDB only.");return 0;
        } catch(Exception e){Console.Error.WriteLine(e);return 1;}
    }
}
