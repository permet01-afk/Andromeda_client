<?php
// Explicit test-only MariaDB, fresh datadir/port. Never loads CMS bootstrap.
if (PHP_SAPI !== 'cli' || ($argv[1] ?? '') !== '--isolated-13384') exit(2);
require_once __DIR__.'/../libs/DroneWearService.php';
$db=new PDO('mysql:host=127.0.0.1;port=13384;dbname=phase4_fixture;charset=utf8mb4','phase4_fixture','isolated-test-only',[
 PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
$db->exec("SET SESSION sql_mode=''");
$pid=710004;$did=820001;$checks=0;
function check($ok,string $name): void { global $checks; if(!$ok)throw new RuntimeException($name);++$checks;echo "PASS $name\n"; }
function value(string $sql) { global $db;return $db->query($sql)->fetchColumn(); }
function rejected(callable $f,string $message): void {try{$f();}catch(RuntimeException $e){check($e->getMessage()===$message,$message);return;}throw new RuntimeException('Expected refusal: '.$message);}
function resetFixture(int $item=3,int $level=6,int $points=0,int $damage=54000): void {
 global $db,$pid,$did;
 $db->exec('DELETE FROM drone_operation_log');
 $db->exec("UPDATE player_drone_state SET gameplay_token=NULL,equipment_version=0 WHERE player_id=$pid");
 $db->exec("UPDATE users SET uridium=5000,credits=200000,current_shield=190000,current_shield1=0,current_shield2=190000 WHERE id=$pid");
 $db->exec("UPDATE drone SET item_id=$item,level=$level,progress_points=$points,damage_units=$damage WHERE id=$did");
}
function repair(?string $key=null,int $version=0,int $drone=820001,int $player=710004): array {
 global $db;return DroneWearService::repair($db,$player,$drone,$key??bin2hex(random_bytes(16)),$version);
}
if (($argv[2]??'')==='worker') {
 try {echo json_encode(repair($argv[3],0));}catch(Throwable $e){echo json_encode(['error'=>$e->getMessage()]);exit(1);}exit;
}
// Run C# fixture first; it leaves one Iris with two laser/shield slots.
check((int)value('SELECT COUNT(*) FROM drone')===1,'controlled C# fixture present');
check(DroneWearService::MAX_DAMAGE_UNITS===60000 && DroneWearService::IRIS_DEATH_WEAR===1000 && DroneWearService::FLAX_DEATH_WEAR===1500,'same constants as C# vectors');
foreach([[1000,2],[2000,3],[3000,5],[1500,3],[59000,98],[59999,100]] as [$units,$expected])check(DroneWearService::displayPercent($units)===$expected,"round $units");
foreach([[6,0,54000,5],[5,700,30000,4],[2,80,15000,1],[1,60,10000,1]] as [$level,$points,$damage,$after]) {
 resetFixture(3,$level,$points,$damage);$r=repair();
 check($r['level']===$after && (int)value('SELECT progress_points FROM drone')===0 && (int)value('SELECT damage_units FROM drone')===0,"repair L$level to L$after points reset");
 check((int)value('SELECT uridium FROM users')===4500 && (int)value('SELECT credits FROM users')===200000,'Iris standard cost exact / other currency unchanged');
 check((int)value('SELECT COUNT(*) FROM drone_slot_config WHERE item_id IS NOT NULL')===4,'repair keeps both configurations slots');
 check((int)value('SELECT qty FROM player_inventory WHERE item_id=1')===31 && (int)value('SELECT qty FROM player_inventory WHERE item_id=9001')===8,'repair never mutates LF3/Havok ownership');
}
resetFixture();$r=repair();
check((int)value("SELECT damage_total FROM ship_config_stats WHERE config='A'")===2606,'L5 +8% laser and full Havok recalculated');
check((int)value("SELECT shield_total FROM ship_config_stats WHERE config='B'")===23200,'L5 +16% shield recalculated');
resetFixture(5,6,0,30000);repair();
check((int)value('SELECT credits FROM users')===187500 && (int)value('SELECT uridium FROM users')===5000,'Flax standard cost exact');
resetFixture();$db->exec('UPDATE users SET uridium=499');rejected(fn()=>repair(),'Not enough Uridium.');
check((int)value('SELECT damage_units FROM drone')===54000 && (int)value('SELECT level FROM drone')===6,'insufficient wallet zero mutation');
resetFixture(5);$db->exec('UPDATE users SET credits=12499');rejected(fn()=>repair(),'Not enough Credits.');
resetFixture(3,6,0,0);rejected(fn()=>repair(),'Drone is already fully repaired.');check((int)value('SELECT uridium FROM users')===5000,'damage zero no debit');
resetFixture();$db->exec("UPDATE player_drone_state SET gameplay_token=REPEAT('a',32)");rejected(fn()=>repair(),'Disconnect from the spacemap before repairing a drone.');
check((int)value('SELECT uridium FROM users')===5000,'online rejection no debit');
resetFixture();rejected(fn()=>repair(null,99),'Equipment changed. Refresh before repairing.');
rejected(fn()=>repair(null,0,99999),'Drone not found.');
rejected(fn()=>repair(str_repeat('z',32)),'Invalid repair request.');
resetFixture(3,6,0,60000);rejected(fn()=>repair(),'This drone cannot be repaired.');
resetFixture();$key=bin2hex(random_bytes(16));$first=repair($key);$again=repair($key);
check($first===$again && (int)value('SELECT uridium FROM users')===4500 && (int)value('SELECT COUNT(*) FROM drone_operation_log')===1,'lost response / same request once only');
rejected(fn()=>repair($key,0,99999),'Invalid repair request.');
resetFixture();$db->exec("CREATE TRIGGER phase4_fail_repair BEFORE INSERT ON drone_operation_log FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture rollback'");
$failed=false;try{repair();}catch(Throwable $e){$failed=true;}finally{$db->exec('DROP TRIGGER phase4_fail_repair');}
check($failed && (int)value('SELECT uridium FROM users')===5000 && (int)value('SELECT damage_units FROM drone')===54000 && (int)value('SELECT level FROM drone')===6,'failure before COMMIT rolls back debit / level / wear');
resetFixture();$key=bin2hex(random_bytes(16));$workers=[];
for($i=0;$i<8;$i++){
 $p=proc_open([PHP_BINARY,__FILE__,'--isolated-13384','worker',$key],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
 fclose($pipes[0]);$workers[]=[$p,$pipes];
}
foreach($workers as [$p,$pipes]){$out=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);check(proc_close($p)===0 && (json_decode($out,true)['ok']??false),'concurrent replay succeeds '.$err);}
check((int)value('SELECT uridium FROM users')===4500 && (int)value('SELECT COUNT(*) FROM drone_operation_log')===1,'eight concurrent requests one debit');
resetFixture();$db->beginTransaction();DroneLevelService::lockPlayer($db,$pid);DroneWearService::requireVersion($db,$pid,0);DroneWearService::bumpVersion($db,$pid);$db->commit();
$db->beginTransaction();try{rejected(fn()=>DroneWearService::requireVersion($db,$pid,0),'Equipment changed. Reload before saving.');}finally{$db->rollBack();}
echo "PASS: $checks assertions, isolated database only. Standard pricing for all.\n";
