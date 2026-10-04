<?php
require_once __DIR__ . '/DroneWearService.php';

final class ShipRepairService
{
    public const MANUAL_SQL = 'SQL MANUAL ACTION REQUIRED: PHASE5_SHIP_DEATH_SQL.txt';

    public static function assertSchema(PDO $db): void
    {
        try {
            DroneWearService::assertSchema($db);
            $db->query('SELECT player_id,status,ship_id,ship_generation,destruction_id,death_life_epoch,destroyed_at,cause,destination_map,destination_x,destination_y,repair_cost,invasion_exempt,version FROM player_ship_state LIMIT 0');
            $db->query('SELECT player_id,operation_key,operation_type,destruction_id,life_epoch,ship_generation,result_data FROM ship_lifecycle_log LIMIT 0');
            $engines=$db->query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('player_ship_state','ship_lifecycle_log')")->fetchAll(PDO::FETCH_COLUMN);
            if(count($engines)!==2 || count(array_filter($engines,static function($e){return strcasecmp($e,'InnoDB')!==0;}))) throw new RuntimeException(self::MANUAL_SQL);
        } catch(Throwable $e) { throw new RuntimeException(self::MANUAL_SQL,0,$e); }
    }

    public static function state(PDO $db,int $pid,bool $includeConfigurations=false): array
    {
        self::assertSchema($db);
        $q=$db->prepare("SELECT u.shipid,u.current_hp,u.max_hp,u.booster_hp_time,u.uridium,u.active_config,u.current_shield1,u.current_shield2,u.speed_lvl,u.booster_dmg_time,u.booster_shd_time,COALESCE(s.status,'READY') AS status,COALESCE(s.ship_generation,1) AS ship_generation,s.ship_id,s.destruction_id,s.repair_cost,COALESCE(s.version,1) AS version,d.gameplay_token FROM users u LEFT JOIN player_ship_state s ON s.player_id=u.id LEFT JOIN player_drone_state d ON d.player_id=u.id WHERE u.id=?");
        $q->execute([$pid]); $s=$q->fetch(PDO::FETCH_ASSOC);
        if(!$s) throw new RuntimeException('Player not found.');
        if($s['ship_id']!==null && (int)$s['ship_id']!==(int)$s['shipid']) throw new RuntimeException('Active ship identity changed. Please refresh the hangar.');
        $s['can_repair']=$s['status']==='DESTROYED' && empty($s['gameplay_token']);
        $s['can_launch']=$s['status']==='READY';
        unset($s['gameplay_token']); // Ownership tokens never leave the server.
        foreach(['shipid','current_hp','max_hp','uridium','ship_generation','version','repair_cost'] as $key) $s[$key]=(int)$s[$key];
        if((int)$s['booster_hp_time']>time()) $s['max_hp']+=(int)($s['max_hp']*0.10);
        $s['active_config']=(int)$s['active_config']===2?2:1;
        if($s['status']==='DESTROYED') $s['current_hp']=0;
        if($includeConfigurations) $s['configurations']=self::configurationStats($db,$pid,$s);
        unset($s['booster_hp_time'],$s['current_shield1'],$s['current_shield2'],$s['speed_lvl'],$s['booster_dmg_time'],$s['booster_shd_time']);
        return $s;
    }

    // Read-only presentation of the existing Infos A/B totals. Current values
    // are the last saved state, not live combat telemetry. No equipment sync.
    private static function configurationStats(PDO $db,int $pid,array $ship): array
    {
        $q=$db->prepare('SELECT base_speed_2010,bonus_damage_pct,bonus_shield_pct FROM ship_design WHERE ship_design_id=? LIMIT 1');
        $q->execute([$ship['shipid']]);$design=$q->fetch(PDO::FETCH_ASSOC) ?: [];
        $baseSpeed=(int)($design['base_speed_2010']??250);
        if($baseSpeed<=0)$baseSpeed=250;
        $speedLevel=(int)$ship['speed_lvl'];
        if($speedLevel<0 || $speedLevel>5)$speedLevel=0;
        $fallback=['damage'=>0,'max_shield'=>0,'speed'=>$baseSpeed+10*$speedLevel,'current_shield'=>null];
        $configs=[1=>$fallback,2=>$fallback];
        $shieldPercent=0;
        try {
            $q=$db->prepare("SELECT n.effect_values_json,COALESCE(l.level,0) AS level FROM pilot_bio_nodes n INNER JOIN player_pilot_bio_state s ON s.user_id=? LEFT JOIN player_pilot_bio_levels l ON l.user_id=s.user_id AND l.node_code=n.node_code WHERE n.node_code='shield_engineering'");
            $q->execute([$pid]);$bio=$q->fetch(PDO::FETCH_ASSOC);
            if($bio){
                $level=max(0,min(5,(int)$bio['level']));
                $values=json_decode((string)$bio['effect_values_json'],true);
                $values=is_array($values)?array_values(array_map('intval',$values)):[4,8,12,18,25];
                if($level>0 && count($values)>0)$shieldPercent=max(0,(int)$values[min($level,count($values))-1]);
            }
        } catch(PDOException $e) { /* Same optional Pilot Bio fallback as Infos. */ }
        $q=$db->prepare("SELECT sc.name,scs.damage_total,scs.shield_total,scs.speed_total FROM ship_config sc LEFT JOIN ship_config_stats scs ON scs.ship_config_id=sc.id AND scs.config=sc.name WHERE sc.player_id=? AND sc.ship_design_id=? AND sc.name IN ('A','B')");
        $q->execute([$pid,$ship['shipid']]);$now=time();
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
            $config=$row['name']==='B'?2:1;
            $damage=max(0,(int)$row['damage_total']);$shield=max(0,(int)$row['shield_total']);
            $damageBonus=max(0,(int)($design['bonus_damage_pct']??0));$shieldBonus=max(0,(int)($design['bonus_shield_pct']??0));
            $damage+=(int)($damage*$damageBonus/100);$shield+=(int)($shield*$shieldBonus/100);
            if($shieldPercent>0)$shield=(int)round($shield*(1+$shieldPercent/100));
            if((int)$ship['booster_dmg_time']>$now)$damage+=(int)($damage*.10);
            if((int)$ship['booster_shd_time']>$now)$shield+=(int)($shield*.25);
            $speed=(int)$row['speed_total'];
            $configs[$config]=['damage'=>$damage,'max_shield'=>$shield,'speed'=>$speed>0?$speed:$fallback['speed'],'current_shield'=>null];
        }
        foreach([1,2] as $config){
            $saved=$ship['current_shield'.$config];
            $configs[$config]['current_shield']=$ship['status']==='DESTROYED'?0:($saved===null || (int)$saved<0?null:min($configs[$config]['max_shield'],(int)$saved));
        }
        return $configs;
    }

    public static function requireReady(PDO $db,int $pid): void
    {
        if(!self::state($db,$pid)['can_launch']) throw new RuntimeException('Your ship has been destroyed. Repair your ship before you can launch.');
    }

    // Caller must hold users FOR UPDATE. Shared lock order: users -> ship -> drone.
    public static function lockState(PDO $db,int $pid,int $shipId): array
    {
        if(!$db->inTransaction()) throw new LogicException('Lifecycle transaction required.');
        $db->prepare('INSERT IGNORE INTO player_ship_state(player_id,ship_id) VALUES(?,?)')->execute([$pid,$shipId]);
        $q=$db->prepare('SELECT * FROM player_ship_state WHERE player_id=? FOR UPDATE');$q->execute([$pid]);$s=$q->fetch(PDO::FETCH_ASSOC);
        if(!$s || (int)$s['ship_id']!==$shipId) throw new RuntimeException('Active ship identity changed. Please refresh the hangar.');
        return $s;
    }

    private static function replay(PDO $db,int $pid,string $requestId,string $destruction,int $generation): ?array
    {
        $q=$db->prepare("SELECT destruction_id,ship_generation,result_data FROM ship_lifecycle_log WHERE player_id=? AND operation_type='repair' AND (operation_key=? OR destruction_id=?) ORDER BY operation_key=? DESC LIMIT 1");
        $q->execute([$pid,'repair:'.$requestId,$destruction,'repair:'.$requestId]);$r=$q->fetch(PDO::FETCH_ASSOC);
        if(!$r)return null;
        if($r['destruction_id']!==$destruction || (int)$r['ship_generation']!==$generation) throw new RuntimeException('This repair request belongs to another ship. Refresh the hangar.');
        $result=json_decode($r['result_data'],true,512,JSON_THROW_ON_ERROR);$result['replayed']=true;return $result;
    }

    public static function repair(PDO $db,int $pid,string $requestId,string $destruction,int $generation): array
    {
        if(!preg_match('/\A[0-9a-f]{32}\z/D',$requestId) || !preg_match('/\A[0-9a-f]{32}\z/D',$destruction) || $generation<1) throw new InvalidArgumentException('Invalid repair request.');
        self::assertSchema($db);
        try {
            $db->beginTransaction();
            $q=$db->prepare('SELECT id,shipid,current_hp,max_hp,uridium FROM users WHERE id=? FOR UPDATE');$q->execute([$pid]);$u=$q->fetch(PDO::FETCH_ASSOC);
            if(!$u)throw new RuntimeException('Player not found.');
            $s=self::lockState($db,$pid,(int)$u['shipid']);
            $d=DroneWearService::lockState($db,$pid);
            $prior=self::replay($db,$pid,$requestId,$destruction,$generation);
            if($prior!==null){$db->commit();return $prior;}
            if((int)$s['ship_generation']!==$generation || $s['destruction_id']!==$destruction) throw new RuntimeException('This repair request belongs to another ship. Refresh the hangar.');
            if($s['status']!=='DESTROYED')throw new RuntimeException('Your ship is already ready.');
            if(!empty($d['gameplay_token']))throw new RuntimeException('Your game session is closing. Please try again shortly.');
            $cost=(int)$s['repair_cost'];
            if($s['repair_cost']===null || !in_array($cost,[0,500],true))throw new RuntimeException('Invalid repair price.');
            if((int)$u['uridium']<$cost)throw new RuntimeException('Not enough Uridium.');
            $hp=min(1000,(int)$u['max_hp']);
            if($hp<1 || !in_array((int)$s['destination_map'],[1,5,9],true))throw new RuntimeException('Invalid ship repair destination.');
            $q=$db->prepare('UPDATE users SET uridium=uridium-?,current_hp=?,current_shield=0,current_shield1=0,current_shield2=0,mapid=?,locx=?,locy=?,online=0 WHERE id=? AND uridium>=?');
            $q->execute([$cost,$hp,$s['destination_map'],$s['destination_x'],$s['destination_y'],$pid,$cost]);
            if($q->rowCount()!==1)throw new RuntimeException('The ship could not be repaired.');
            $db->prepare("UPDATE player_ship_state SET status='READY',version=version+1 WHERE player_id=?")->execute([$pid]);
            $result=['ok'=>true,'status'=>'READY','hp'=>$hp,'cost'=>$cost,'destruction_id'=>$destruction,'ship_generation'=>$generation,'version'=>(int)$s['version']+1,'message'=>'Your ship has been repaired.'];
            $db->prepare("INSERT INTO ship_lifecycle_log(player_id,operation_key,operation_type,destruction_id,ship_generation,result_data) VALUES(?,?,'repair',?,?,?)")->execute([$pid,'repair:'.$requestId,$destruction,$generation,json_encode($result,JSON_THROW_ON_ERROR)]);
            $db->commit();return $result;
        } catch(Throwable $e) {
            if($db->inTransaction())$db->rollBack();
            // Resolve a lost COMMIT response by the unique destruction/request key.
            try {$prior=self::replay($db,$pid,$requestId,$destruction,$generation);if($prior!==null)return $prior;}catch(Throwable $ignored){}
            throw $e;
        }
    }

    // Cosmetic design changes preserve DESTROYED and its captured price/death ID.
    // Hull replacement semantics are deliberately handled by the Shop, not by Repair.
    public static function changeDesign(PDO $db,int $pid,int $oldShip,int $newShip): void
    {
        $s=self::lockState($db,$pid,$oldShip);
        $d=DroneWearService::lockState($db,$pid);
        if(!empty($d['gameplay_token']))throw new RuntimeException('Log out of the game before changing your ship.');
        $db->prepare('UPDATE player_ship_state SET ship_id=?,ship_generation=ship_generation+1,version=version+1 WHERE player_id=?')->execute([$newShip,$pid]);
    }

    // Existing active-hull replacement, never an automatic recovery. Only a
    // voluntary Shop purchase of the free Phoenix may replace a destroyed hull.
    public static function replaceHull(PDO $db,int $pid,int $oldShip,int $newShip,int $newMaxHp,bool $shopPhoenix=false): void
    {
        self::assertSchema($db);
        $s=self::lockState($db,$pid,$oldShip);
        $d=DroneWearService::lockState($db,$pid);
        if(!empty($d['gameplay_token']))throw new RuntimeException('Log out of the game before changing your ship.');
        if($s['status']==='DESTROYED' && !($shopPhoenix && $newShip===1)) throw new RuntimeException('Repair your ship first, or choose the free Phoenix in the Shop.');
        if($newMaxHp<1 || $newShip===$oldShip)throw new RuntimeException('Invalid ship replacement.');
        $event=$s['destruction_id']??bin2hex(random_bytes(16));
        $db->prepare("UPDATE player_ship_state SET status='READY',ship_id=?,ship_generation=ship_generation+1,version=version+1,destruction_id=NULL,death_life_epoch=NULL,destroyed_at=NULL,cause=NULL,repair_cost=NULL,invasion_exempt=0 WHERE player_id=?")->execute([$newShip,$pid]);
        // This is a new purchased hull, not Repair. Its equipment replacement is
        // still performed by the existing Shop/Auction transaction.
        $db->prepare('UPDATE users SET current_hp=?,current_shield=0,current_shield1=0,current_shield2=0,config_refresh_pending=1 WHERE id=?')->execute([$newMaxHp,$pid]);
        $db->prepare("INSERT INTO ship_lifecycle_log(player_id,operation_key,operation_type,destruction_id,ship_generation,result_data) VALUES(?,?,'replace',?,?,?)")->execute([$pid,'replace:'.bin2hex(random_bytes(16)),$event,(int)$s['ship_generation']+1,json_encode(['old_ship'=>$oldShip,'new_ship'=>$newShip,'status'=>'READY','voluntary_shop_phoenix'=>$shopPhoenix],JSON_THROW_ON_ERROR)]);
    }
}
