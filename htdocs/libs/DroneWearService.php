<?php
require_once __DIR__ . '/DroneLevelService.php';

/** Phase 4: no DDL. All writers acquire users first, then state/instances. */
final class DroneWearService
{
    public const MAX_DAMAGE_UNITS = 60000;
    public const IRIS_DEATH_WEAR = 1000;
    public const FLAX_DEATH_WEAR = 1500;
    public const IRIS_REPAIR_COST = 500;
    public const FLAX_REPAIR_COST = 12500;
    // User decision: standard pricing for every account in this first lot.
    // No inferred Premium entitlement, vouchers or automatic repair.
    public static function displayPercent(int $units): int
    {
        if ($units < 0 || $units > self::MAX_DAMAGE_UNITS) throw new RuntimeException('Invalid drone damage.');
        return intdiv($units + 300, 600);
    }
    public static function price(int $itemId): array
    {
        if ($itemId === 3) return ['currency'=>'uridium', 'amount'=>self::IRIS_REPAIR_COST];
        if ($itemId === 5) return ['currency'=>'credits', 'amount'=>self::FLAX_REPAIR_COST];
        throw new RuntimeException('This drone cannot be repaired.');
    }
    public static function assertSchema(PDO $db): void
    {
        try {
            $db->query('SELECT damage_units FROM drone LIMIT 0');
            $db->query('SELECT player_id,life_epoch,equipment_version,gameplay_token FROM player_drone_state LIMIT 0');
            $db->query('SELECT operation_key,operation_type,drone_id,result_data FROM drone_operation_log LIMIT 0');
            $engines=$db->query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('users','drone','player_inventory','drone_slot','drone_slot_config','drone_design_equipped','ship_config','ship_slot','ship_config_stats','player_galaxy_gates','player_drone_state','drone_operation_log')")->fetchAll(PDO::FETCH_COLUMN);
            if (count($engines)!==12 || count(array_filter($engines,fn($engine)=>strcasecmp((string)$engine,'InnoDB')===0))!==12)
                throw new RuntimeException('SQL MANUAL ACTION REQUIRED: PHASE4_DRONE_WEAR_SQL.txt (transactional InnoDB tables required).');
        } catch (PDOException $e) {
            throw new RuntimeException('SQL MANUAL ACTION REQUIRED: PHASE4_DRONE_WEAR_SQL.txt',0,$e);
        }
    }
    public static function lockState(PDO $db, int $pid): array
    {
        if (!$db->inTransaction()) throw new LogicException('An active transaction is required.');
        // Caller already holds users row; no new row can race that lock.
        $db->prepare('INSERT IGNORE INTO player_drone_state(player_id) VALUES(?)')->execute([$pid]);
        $q=$db->prepare('SELECT life_epoch,equipment_version,gameplay_token FROM player_drone_state WHERE player_id=? FOR UPDATE');
        $q->execute([$pid]); return $q->fetch(PDO::FETCH_ASSOC);
    }
    public static function bumpVersion(PDO $db, int $pid): void
    {
        self::lockState($db,$pid);
        $db->prepare('UPDATE player_drone_state SET equipment_version=equipment_version+1 WHERE player_id=?')->execute([$pid]);
    }
    public static function requireVersion(PDO $db, int $pid, $expected): void
    {
        $state=self::lockState($db,$pid);
        if (!is_int($expected) || $expected < 0 || (string)$expected !== (string)$state['equipment_version'])
            throw new RuntimeException('Equipment changed. Reload before saving.');
    }
    public static function metadata(PDO $db, int $pid): array
    {
        $q=$db->prepare('SELECT equipment_version,gameplay_token FROM player_drone_state WHERE player_id=?');
        $q->execute([$pid]); $state=$q->fetch(PDO::FETCH_ASSOC) ?: ['equipment_version'=>0,'gameplay_token'=>null];
        return ['equipment_version'=>(int)$state['equipment_version'], 'repair_offline'=>empty($state['gameplay_token']),
            'repair_prices'=>['3'=>self::price(3),'5'=>self::price(5)]];
    }
    public static function repair(PDO $db, int $pid, int $droneId, string $requestKey, int $expectedVersion): array
    {
        if ($droneId <= 0 || !preg_match('/^[a-f0-9]{32}$/D',$requestKey)) throw new RuntimeException('Invalid repair request.');
        self::assertSchema($db);
        $key='repair:'.$requestKey;
        try {
            $db->beginTransaction();
            DroneLevelService::lockPlayer($db,$pid);
            $state=self::lockState($db,$pid);
            $q=$db->prepare('SELECT drone_id,result_data FROM drone_operation_log WHERE player_id=? AND operation_key=?');
            $q->execute([$pid,$key]); $previous=$q->fetch(PDO::FETCH_ASSOC);
            if ($previous) {
                if ((int)$previous['drone_id'] !== $droneId) throw new RuntimeException('Invalid repair request.');
                $result=json_decode($previous['result_data'],true,512,JSON_THROW_ON_ERROR);
                $db->commit(); return $result;
            }
            if (!empty($state['gameplay_token'])) throw new RuntimeException('Disconnect from the spacemap before repairing a drone.');
            if ((int)$state['equipment_version'] !== $expectedVersion) throw new RuntimeException('Equipment changed. Refresh before repairing.');
            $q=$db->prepare('SELECT id,item_id,level,progress_points,damage_units FROM drone WHERE player_id=? AND id=? FOR UPDATE');
            $q->execute([$pid,$droneId]); $drone=$q->fetch(PDO::FETCH_ASSOC);
            if (!$drone) throw new RuntimeException('Drone not found.');
            $price=self::price((int)$drone['item_id']);
            if ((int)$drone['damage_units'] <= 0) throw new RuntimeException('Drone is already fully repaired.');
            if ((int)$drone['damage_units'] >= self::MAX_DAMAGE_UNITS) throw new RuntimeException('This drone cannot be repaired.');
            $level=(int)$drone['level'];
            if ($level<1 || $level>6) throw new RuntimeException('Invalid drone level.');
            $currency=$price['currency']; // server whitelist from price(), never input
            $q=$db->prepare("UPDATE users SET $currency=$currency-? WHERE id=? AND $currency>=?");
            $q->execute([$price['amount'],$pid,$price['amount']]);
            if ($q->rowCount()!==1) throw new RuntimeException($currency==='uridium'?'Not enough Uridium.':'Not enough Credits.');
            $level=max(1,$level-1);
            $db->prepare('UPDATE drone SET damage_units=0,level=?,progress_points=0 WHERE id=? AND player_id=?')->execute([$level,$droneId,$pid]);
            DroneLevelService::recalculate($db,$pid);
            self::bumpVersion($db,$pid);
            $db->prepare('UPDATE users SET config_refresh_pending=1 WHERE id=?')->execute([$pid]);
            $result=['ok'=>true,'message'=>'Drone repaired.','drone_id'=>$droneId,'level'=>$level,'progress_points'=>0,
                'damage_units'=>0,'damage_percent'=>0,'next_threshold'=>DroneLevelService::threshold($level),
                'paid'=>$price,'equipment_version'=>(int)$state['equipment_version']+1];
            $db->prepare("INSERT INTO drone_operation_log(player_id,operation_key,operation_type,drone_id,result_data) VALUES(?,?,'repair',?,?)")
                ->execute([$pid,$key,$droneId,json_encode($result,JSON_THROW_ON_ERROR)]);
            $db->commit(); return $result;
        } catch (Throwable $e) {
            if ($db->inTransaction()) { try { $db->rollBack(); } catch (Throwable $ignored) {} }
            // Never repeat the debit. A replay with the SAME key will retrieve a
            // committed result. If the connection still works, resolve it now.
            try {
                $q=$db->prepare('SELECT drone_id,result_data FROM drone_operation_log WHERE player_id=? AND operation_key=?');
                $q->execute([$pid,$key]); $saved=$q->fetch(PDO::FETCH_ASSOC);
                if ($saved && (int)$saved['drone_id']===$droneId) return json_decode($saved['result_data'],true,512,JSON_THROW_ON_ERROR);
            } catch (Throwable $ignored) {}
            throw $e;
        }
    }
}
