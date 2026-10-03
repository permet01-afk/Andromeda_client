<?php
/** Phase 3. No DDL. All writers lock users first, then instances/configs in ID order. */
final class DroneLevelService
{
    public static function threshold(int $level): int { return [100,200,400,800,1600,0][max(1,min(6,$level))-1]; }
    public static function assertSchema(PDO $db): void
    {
        try { $db->query('SELECT level, progress_points FROM drone LIMIT 0'); }
        catch (PDOException $e) { throw new RuntimeException('SQL MANUAL ACTION REQUIRED: PHASE3_DRONE_LEVELS_SQL.txt', 0, $e); }
    }
    public static function lockPlayer(PDO $db, int $pid): array
    {
        if (!$db->inTransaction()) throw new LogicException('Drone state requires an active transaction.');
        $q=$db->prepare('SELECT id, shipid, active_config, in_fight_until FROM users WHERE id=? FOR UPDATE');
        $q->execute([$pid]); $user=$q->fetch(PDO::FETCH_ASSOC);
        if (!$user) throw new RuntimeException('Player not found.');
        return $user;
    }
    public static function laser(int $id): int { return [10=>40,11=>60,12=>100,1=>150][$id] ?? 0; }
    public static function shield(int $id): int { return [35=>1000,36=>2000,37=>4000,2=>10000][$id] ?? 0; }
    public static function speed(int $id): int { return [30=>2,31=>3,32=>4,33=>5,34=>7,4=>10][$id] ?? 0; }
    public static function fullHavok(array $drones): bool
    {
        $iris=[];
        foreach ($drones as $d) if ((int)$d['item_id']===3 && !isset($iris[(int)$d['id']])) $iris[(int)$d['id']]=!empty($d['havok']);
        return count($iris)>0 && !in_array(false,$iris,true);
    }
    public static function laserUnits(int $base, array $drone, bool $full): int
    { return $base*(100+2*((int)$drone['level']-1))*((int)$drone['item_id']===3 && $full ? 110 : 100); }
    public static function shieldUnits(int $base, array $drone): int
    { return $base*(100+4*((int)$drone['level']-1))*100; }
    public static function roundUnits(int $units): int { return intdiv($units+5000,10000); }

    // Caller holds the player row until COMMIT; never trust levels received from the browser.
    // Rebuild every owned ship's A/B cache: drone instances and their A/B slots are global.
    public static function recalculate(PDO $db, int $pid): array
    {
        $user=self::lockPlayer($db,$pid);
        $q=$db->prepare('SELECT d.id,d.item_id,d.level,d.progress_points,
            CASE WHEN d.item_id=3 AND i.id IS NOT NULL AND (i.id=9001 OR LOWER(i.name) LIKE \'%havok%\' OR LOWER(i.name) LIKE \'%havoc%\') THEN 1 ELSE 0 END AS havok
            FROM drone d LEFT JOIN drone_design_equipped de ON de.drone_id=d.id LEFT JOIN items i ON i.id=de.design_item_id
            WHERE d.player_id=? ORDER BY d.id');
        $q->execute([$pid]);$drones=[];
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $d){
            $level=(int)$d['level'];$points=(int)$d['progress_points'];
            if($level<1 || $level>6 || $points<0 || ($level===6 && $points!==0) || ($level<6 && $points>=self::threshold($level))) throw new RuntimeException('Invalid drone progression.');
            $drones[(int)$d['id']]=$d;
        }
        $full=self::fullHavok($drones);$droneCounts=['A'=>['lasers'=>0,'shields'=>0],'B'=>['lasers'=>0,'shields'=>0]];$totals=['A'=>[0,0],'B'=>[0,0]];
        $q=$db->prepare('SELECT s.drone_id,s.config,s.item_id FROM drone_slot_config s JOIN drone d ON d.id=s.drone_id WHERE d.player_id=? AND s.slot_index>=0 AND s.slot_index<CASE WHEN d.item_id=3 THEN 2 ELSE 1 END ORDER BY d.id,s.config,s.slot_index');
        $q->execute([$pid]);
        foreach($q as $s){$d=$drones[(int)$s['drone_id']]??null;$cfg=$s['config'];if(!$d || !isset($totals[$cfg]) || !in_array((int)$d['item_id'],[3,5],true))continue;
            $droneCounts[$cfg]['lasers']+=self::laser((int)$s['item_id'])>0?1:0;$droneCounts[$cfg]['shields']+=self::shield((int)$s['item_id'])>0?1:0;
            $totals[$cfg][0]+=self::laserUnits(self::laser((int)$s['item_id']),$d,$full);
            $totals[$cfg][1]+=self::shieldUnits(self::shield((int)$s['item_id']),$d);
        }
        $q=$db->prepare('SELECT sc.*,sd.base_speed_2010 FROM ship_config sc JOIN ship_design sd ON sd.ship_design_id=sc.ship_design_id WHERE sc.player_id=? ORDER BY sc.id');$q->execute([$pid]);$configs=$q->fetchAll(PDO::FETCH_ASSOC);
        $slots=$db->prepare('SELECT item_id FROM ship_slot WHERE ship_config_id=? AND item_id IS NOT NULL');
        $up=$db->prepare('INSERT INTO ship_config_stats(ship_config_id,config,lasers_slots,gen_slots,extras_slots,damage_total,shield_total,speed_total) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE damage_total=VALUES(damage_total),shield_total=VALUES(shield_total),speed_total=VALUES(speed_total)');
        $result=[];
        foreach($configs as $c){
            $cfg=$c['name'];if(!isset($totals[$cfg]))continue;
            [$damage,$shield]=$totals[$cfg];$counts=['lasers'=>0,'shields'=>0,'speeds'=>0];
            
            $speed=max(1,(int)$c['base_speed_2010']);$slots->execute([(int)$c['id']]);
            foreach($slots as $s){$id=(int)$s['item_id'];$counts['lasers']+=self::laser($id)>0?1:0;$counts['shields']+=self::shield($id)>0?1:0;$counts['speeds']+=self::speed($id)>0?1:0;$damage+=self::laser($id)*10000;$shield+=self::shield($id)*10000;$speed+=self::speed($id);}
            $counts['lasers']+=$droneCounts[$cfg]['lasers'];$counts['shields']+=$droneCounts[$cfg]['shields'];
            $damage=self::roundUnits($damage);$shield=self::roundUnits($shield);
            $up->execute([(int)$c['id'],$cfg,(int)$c['lasers_slots'],(int)$c['gen_slots'],(int)$c['extras_slots'],$damage,$shield,$speed]);
            if((int)$c['ship_design_id']===(int)$user['shipid'])$result[$cfg]=['damage'=>$damage,'shield'=>$shield,'speed'=>$speed,'counts'=>$counts];
        }
        $active=$result[(int)$user['active_config']===2?'B':'A']??null;
        if($active)$db->prepare('UPDATE users SET damages=?,max_shield=?,speed=? WHERE id=?')->execute([$active['damage'],$active['shield'],$active['speed'],$pid]);
        return $result;
    }
}
