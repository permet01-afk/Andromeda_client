<?php
// Never uses config/database.php. Explicit new local fixture, no DDL privileges.
if(PHP_SAPI!=='cli' || ($argv[1]??'')!=='--isolated-13385'){fwrite(STDERR,"Explicit --isolated-13385 required.\n");exit(2);}
require_once __DIR__.'/../libs/ShipRepairService.php';
$db=new PDO('mysql:host=127.0.0.1;port=13385;dbname=andromeda;charset=utf8mb4','phase5_fixture','phase5-isolated-only',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
$pid=710005;$checks=0;
function check(bool $ok,string $name):void{global $checks;if(!$ok)throw new RuntimeException($name);$checks++;echo "PASS $name\n";}
function value(string $sql){global $db;return $db->query($sql)->fetchColumn();}
function fingerprint():string{global $db;$all=[];foreach(['drone','drone_slot','drone_slot_config','drone_design_equipped','player_inventory','ship_config','ship_slot','ship_config_stats','player_galaxy_gates'] as $t)$all[$t]=$db->query("SELECT * FROM $t ORDER BY 1")->fetchAll(PDO::FETCH_ASSOC);$all['user']= $db->query('SELECT drones,ammo_lcb10,active_config FROM users WHERE id=710005')->fetch(PDO::FETCH_ASSOC);return hash('sha256',json_encode($all));}
function refused(callable $call,string $message):void{try{$call();}catch(Throwable $e){check($e->getMessage()===$message,'refused: '.$message);return;}throw new RuntimeException('Expected refusal: '.$message);}
try{
    $mode=$argv[2]??'repair';$s=ShipRepairService::state($db,$pid);$request=str_repeat('a',32);
    if($mode==='owned'){
        check(!$s['can_repair'],'token blocks repair even when online=0');
        refused(fn()=>ShipRepairService::repair($db,$pid,$request,$s['destruction_id'],$s['ship_generation']),'Your game session is closing. Please try again shortly.');
        check((int)value('SELECT current_hp FROM users')===0,'locked repair preserves HP0');
    }elseif($mode==='insufficient'){
        $db->exec('UPDATE users SET uridium=499');$before=fingerprint();
        refused(fn()=>ShipRepairService::repair($db,$pid,$request,$s['destruction_id'],$s['ship_generation']),'Not enough Uridium.');
        check(value('SELECT status FROM player_ship_state')==='DESTROYED' && (int)value('SELECT current_hp FROM users')===0 && (int)value('SELECT uridium FROM users')===499 && $before===fingerprint(),'insufficient funds makes no mutation');
    }elseif($mode==='repair-once'||$mode==='lost-response'){
        $id=$argv[3]??$request;
        $result=ShipRepairService::repair($db,$pid,$id,$s['destruction_id'],$s['ship_generation']);
        if($mode==='lost-response')exit(0); // COMMIT succeeded; discard response deliberately.
        echo json_encode($result)."\n";
    }elseif($mode==='shop-phoenix'||$mode==='shop-owned'||$mode==='shop-other'||$mode==='shop-ready'){
        require_once __DIR__.'/../libs/ShopPurchaseService.php';
        $old=$s;$before=$db->query('SELECT * FROM drone ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);$credits=(int)value('SELECT credits FROM users');
        $ship=$mode==='shop-other'?5:1;
        $message=(new ShopPurchaseService($db,$pid))->buyShip($ship,['currency'=>'credits','price'=>0,'name'=>$ship===1?'Phoenix':'Liberator','hp'=>4000,'lasers'=>1,'gens'=>1,'extras'=>1]);
        $next=ShipRepairService::state($db,$pid);
        if($mode==='shop-owned'||$mode==='shop-other'){
            check($next['status']==='DESTROYED' && $next['shipid']===$old['shipid'] && $next['destruction_id']===$old['destruction_id'],'Shop cannot replace token-owned hull or silently repair a non-Phoenix purchase');
        }else{
            check($next['status']==='READY' && $next['shipid']===1 && $next['current_hp']===4000 && $next['ship_generation']===$old['ship_generation']+1,'actual voluntary Shop purchase creates a new READY Phoenix');
            check((int)value('SELECT COUNT(*) FROM ship_slot WHERE ship_config_id IN (810001,810002) AND item_id IS NOT NULL')===0,'Shop keeps its existing old-hull equipment replacement policy');
            check((int)value('SELECT COUNT(*) FROM ship_config WHERE ship_design_id=1')===2,'Shop creates both Phoenix configurations');
        }
        check($before===$db->query('SELECT * FROM drone ORDER BY id')->fetchAll(PDO::FETCH_ASSOC) && $credits===(int)value('SELECT credits FROM users'),'Shop bridge does not alter drones or create currency');
        echo $message."\n";
    }elseif($mode==='auction'){
        require_once __DIR__.'/../libs/AuctionService.php';
        $before=fingerprint();$db->beginTransaction();
        $method=new ReflectionMethod(AuctionService::class,'grantShip');$method->setAccessible(true);
        try{refused(fn()=>$method->invoke(new AuctionService($db,$pid),$pid,8),'Repair your ship first, or choose the free Phoenix in the Shop.');}finally{$db->rollBack();}
        check($before===fingerprint() && value('SELECT status FROM player_ship_state')==='DESTROYED','auction grant cannot resurrect a destroyed hull');
    }elseif($mode==='replace-phoenix'){
        $old=$s;$before=fingerprint();$uri=(int)value('SELECT uridium FROM users');
        $db->beginTransaction();$db->query('SELECT id FROM users WHERE id=710005 FOR UPDATE')->fetch();
        ShipRepairService::replaceHull($db,$pid,$s['shipid'],1,4000,true);
        $db->exec('UPDATE users SET shipid=1,max_hp=4000 WHERE id=710005');$db->commit();
        $next=ShipRepairService::state($db,$pid);check($next['status']==='READY' && $next['shipid']===1 && $next['ship_generation']===$old['ship_generation']+1,'voluntary Phoenix replacement issues a new READY hull generation');
        check($uri===(int)value('SELECT uridium FROM users') && $before===fingerprint(),'replacement lifecycle itself does not debit, touch drones or restore equipment');
        refused(fn()=>ShipRepairService::repair($db,$pid,$request,$old['destruction_id'],$old['ship_generation']),'This repair request belongs to another ship. Refresh the hangar.');
    }elseif($mode==='design'){
        $old=$s;$db->beginTransaction();$db->query('SELECT id FROM users WHERE id=710005 FOR UPDATE')->fetch();
        ShipRepairService::changeDesign($db,$pid,$s['shipid'],63);$db->exec('UPDATE users SET shipid=63 WHERE id=710005');$db->commit();
        $next=ShipRepairService::state($db,$pid);check($next['status']==='DESTROYED' && $next['destruction_id']===$old['destruction_id'] && $next['current_hp']===0 && $next['repair_cost']===$old['repair_cost'],'design management preserves destroyed state, identity of death and captured price');
        refused(fn()=>ShipRepairService::repair($db,$pid,$request,$old['destruction_id'],$old['ship_generation']),'This repair request belongs to another ship. Refresh the hangar.');
    }else{
        $before=fingerprint();$uri=(int)value('SELECT uridium FROM users');$epoch=value('SELECT life_epoch FROM player_drone_state');
        $result=ShipRepairService::repair($db,$pid,$request,$s['destruction_id'],$s['ship_generation']);
        check($result['status']==='READY' && $result['hp']===1000,'repair commits READY and HP1000');
        check((int)value('SELECT uridium FROM users')===$uri-$s['repair_cost'],'exact captured repair debit');
        check((int)value('SELECT current_shield+current_shield1+current_shield2 FROM users')===0,'all three current shields reset');
        check((int)value('SELECT mapid FROM users')===1 && (int)value('SELECT locx FROM users')===2000 && (int)value('SELECT locy FROM users')===1100,'repair uses captured x-1 base');
        check($epoch===value('SELECT life_epoch FROM player_drone_state') && !value('SELECT gameplay_token FROM player_drone_state'),'repair creates no gameplay life/token');
        check($before===fingerprint(),'repair preserves drone IDs/wear/levels/points/Havok/slots/equipment/ammo/Gate/users.drones');
        $replay=ShipRepairService::repair($db,$pid,$request,$s['destruction_id'],$s['ship_generation']);
        $other=ShipRepairService::repair($db,$pid,str_repeat('b',32),$s['destruction_id'],$s['ship_generation']);
        check($replay['replayed'] && $other['replayed'] && (int)value("SELECT COUNT(*) FROM ship_lifecycle_log WHERE operation_type='repair'")===1,'same and different request IDs replay one repair');
        check((int)value('SELECT uridium FROM users')===$uri-$s['repair_cost'],'replay never charges twice');
        check(ShipRepairService::state($db,$pid)['can_launch'],'launch becomes available after repair');
    }
    echo "PASS $checks PHP lifecycle assertions ($mode)\n";
}catch(Throwable $e){if($db->inTransaction())$db->rollBack();fwrite(STDERR,$e."\n");exit(1);}
