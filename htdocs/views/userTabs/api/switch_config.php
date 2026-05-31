<?php
require_once __DIR__ . '/bootstrap.php';
header('Content-Type: application/json');

$pid = $_SESSION['player_id'] ?? null;
if (!$pid) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}


$now = time();
$st = $db->prepare("SELECT in_fight_until FROM users WHERE id = :pid LIMIT 1");
$st->execute([':pid' => $pid]);
$until = (int)$st->fetchColumn();
if ($until > $now) {
    http_response_code(403);
    echo json_encode(['error' => 'in_combat', 'remaining' => ($until - $now)]);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload)) $payload = [];


$cfgNum = isset($payload['config']) ? (int)$payload['config'] : 0;
$cfgName = isset($payload['name']) ? (string)$payload['name'] : '';

$activeConfig = 1;
if ($cfgNum === 2 || strtoupper($cfgName) === 'B') $activeConfig = 2;

try {
    $db->beginTransaction();

    
    $db->prepare("UPDATE users SET active_config = :ac WHERE id = :pid")
       ->execute([':ac' => $activeConfig, ':pid' => $pid]);

    $activeName = ($activeConfig === 2) ? 'B' : 'A';

    
    $shipIdStmt = $db->prepare("SELECT shipid FROM users WHERE id = :pid LIMIT 1");
    $shipIdStmt->execute([':pid' => $pid]);
    $shipDesignId = (int)$shipIdStmt->fetchColumn();
    if ($shipDesignId <= 0) $shipDesignId = 1;

    
    $cfgStmt = $db->prepare("SELECT id FROM ship_config WHERE player_id = :p AND ship_design_id = :sid AND name = :n LIMIT 1");
    $cfgStmt->execute([':p' => $pid, ':sid' => $shipDesignId, ':n' => $activeName]);
    $shipConfigId = (int)$cfgStmt->fetchColumn();

    $updatedStats = false;
    if ($shipConfigId > 0) {
        $st2 = $db->prepare("SELECT damage_total, shield_total, speed_total FROM ship_config_stats WHERE ship_config_id = :cid LIMIT 1");
        $st2->execute([':cid' => $shipConfigId]);
        if ($r = $st2->fetch(PDO::FETCH_ASSOC)) {
            $db->prepare("UPDATE users SET damages=:d, max_shield=:s, speed=:v WHERE id=:pid")
               ->execute([
                   ':d' => (int)$r['damage_total'],
                   ':s' => (int)$r['shield_total'],
                   ':v' => (int)$r['speed_total'],
                   ':pid' => $pid,
               ]);
            $updatedStats = true;
        }
    }

    
    if (!$updatedStats) {
        $pcExists = $db->query("SHOW TABLES LIKE 'player_config'")->fetchColumn();
        if ($pcExists) {
            $pc = $db->prepare("SELECT damage1, shield1, speed1, damage2, shield2, speed2 FROM player_config WHERE player_id = :pid LIMIT 1");
            $pc->execute([':pid' => $pid]);
            if ($r = $pc->fetch(PDO::FETCH_ASSOC)) {
                if ($activeConfig === 2) {
                    $d = (int)$r['damage2'];
                    $s = (int)$r['shield2'];
                    $v = (int)$r['speed2'];
                } else {
                    $d = (int)$r['damage1'];
                    $s = (int)$r['shield1'];
                    $v = (int)$r['speed1'];
                }
                $db->prepare("UPDATE users SET damages=:d, max_shield=:s, speed=:v WHERE id=:pid")
                   ->execute([':d' => $d, ':s' => $s, ':v' => $v, ':pid' => $pid]);
            }
        }
    }

    
    
    $dr = $db->prepare("SELECT id, item_id, name FROM drone WHERE player_id = :p ORDER BY id");
    $dr->execute([':p' => $pid]);
    $drRows = $dr->fetchAll(PDO::FETCH_ASSOC);

    $slotCountOf = function (array $droneRow): int {
        $iid = (int)($droneRow['item_id'] ?? 0);
        $name = (string)($droneRow['name'] ?? '');
        if ($iid === 5 || stripos($name, 'flax') === 0) return 1;
        return 2;
    };

    if (!empty($drRows)) {
        foreach ($drRows as $d) {
            $did = (int)$d['id'];
            $slotMax = $slotCountOf($d);

            
            $ins = $db->prepare("INSERT IGNORE INTO drone_slot (drone_id, slot_index, item_id) VALUES (:d,:s,NULL)");
            for ($s = 0; $s < $slotMax; $s++) {
                $ins->execute([':d' => $did, ':s' => $s]);
            }
            $db->prepare("DELETE FROM drone_slot WHERE drone_id = :d AND slot_index >= :m")
               ->execute([':d' => $did, ':m' => $slotMax]);

            
            $db->prepare("UPDATE drone_slot SET item_id = NULL WHERE drone_id = :d")
               ->execute([':d' => $did]);

            
            $db->prepare("UPDATE drone_slot ds JOIN drone_slot_config dsc ON dsc.drone_id = ds.drone_id AND dsc.slot_index = ds.slot_index AND dsc.config = :cfg SET ds.item_id = dsc.item_id WHERE ds.drone_id = :d")
               ->execute([':cfg' => $activeName, ':d' => $did]);
        }
    }

    $db->commit();
    echo json_encode(['ok' => true, 'active' => $activeName]);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'switch_failed', 'message' => $e->getMessage()]);
}
