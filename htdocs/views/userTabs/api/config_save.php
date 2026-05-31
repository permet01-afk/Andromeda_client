<?php


require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/helpers_drones.php';
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
    echo json_encode([
        'error' => 'in_combat',
        'remaining' => ($until - $now)
    ]);
    exit;
}


function computeConfigPoints(int $lasers, int $shields, int $speeds): array
{
    $wD = max(0, $lasers);
    $wS = max(0, $shields);
    $wV = max(0, $speeds);

    $total = $wD + $wS + $wV;
    if ($total <= 0) return [0, 0, 0];

    $pD = 15.0 * $wD / $total;
    $pS = 15.0 * $wS / $total;
    $pV = 15.0 * $wV / $total;

    $pD = min($pD, 10.0);
    $pS = min($pS, 10.0);
    $pV = min($pV, 10.0);

    $sum = $pD + $pS + $pV;
    if ($sum > 15.0) {
        $k = 15.0 / $sum;
        $pD *= $k;
        $pS *= $k;
        $pV *= $k;
    }

    $dmg = (int)round($pD);
    $shield = (int)round($pS);
    $speed = (int)round($pV);

    $sum = $dmg + $shield + $speed;
    if ($sum > 15) {
        $delta = $sum - 15;
        while ($delta > 0) {
            if ($dmg >= $shield && $dmg >= $speed && $dmg > 0) $dmg--;
            elseif ($shield >= $dmg && $shield >= $speed && $shield > 0) $shield--;
            elseif ($speed > 0) $speed--;
            $delta--;
        }
    }
    return [$dmg, $shield, $speed];
}

try {

    
    $col = $db->query("SHOW COLUMNS FROM users LIKE 'config_refresh_pending'")->fetchColumn();
    if (!$col) {
        $db->exec("ALTER TABLE users ADD COLUMN config_refresh_pending TINYINT(1) NOT NULL DEFAULT 0");
    }


    $db->exec("
        CREATE TABLE IF NOT EXISTS ship_config_stats (
            ship_config_id INT PRIMARY KEY,
            config        CHAR(1) NOT NULL,
            lasers_slots  INT NOT NULL DEFAULT 0,
            gen_slots     INT NOT NULL DEFAULT 0,
            extras_slots  INT NOT NULL DEFAULT 0,
            damage_total  INT NOT NULL DEFAULT 0,
            shield_total  INT NOT NULL DEFAULT 0,
            speed_total   INT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    
    $db->exec("
        CREATE TABLE IF NOT EXISTS drone_slot_config (
            drone_id    INT(11) NOT NULL,
            config      CHAR(1) NOT NULL,
            slot_index  TINYINT(4) NOT NULL,
            item_id     INT(11) DEFAULT NULL,
            PRIMARY KEY (drone_id, config, slot_index),
            KEY idx_drone_config (drone_id, config)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    if (function_exists('ensure_drone_design_equipped_table')) {
        ensure_drone_design_equipped_table($db);
    }

    
    $raw = file_get_contents('php://input');
    if (!$raw && isset($_POST['payload'])) $raw = $_POST['payload'];

    $payload = json_decode($raw, true);
    if (!is_array($payload)) $payload = [];

    $hasConfigs = isset($payload['configs']) && is_array($payload['configs']);

    
    $dronesA = (isset($payload['dronesA']) && is_array($payload['dronesA'])) ? $payload['dronesA'] : null;
    $dronesB = (isset($payload['dronesB']) && is_array($payload['dronesB'])) ? $payload['dronesB'] : null;
    $legacy  = (isset($payload['drones'])  && is_array($payload['drones']))  ? $payload['drones']  : null;

    if ($dronesA === null && $dronesB === null) {
        $dronesA = $legacy ?? [];
        $dronesB = $legacy ?? [];
    } else {
        if ($dronesA === null) $dronesA = $dronesB ?? [];
        if ($dronesB === null) $dronesB = $dronesA ?? [];
    }

    $hasDrones = (is_array($dronesA) && count($dronesA) > 0) || (is_array($dronesB) && count($dronesB) > 0);

    $db->beginTransaction();

    
    
    
    $appliedCounts = ['A' => [], 'B' => []];

    
    $shipIdStmt = $db->prepare("SELECT shipid FROM users WHERE id = :pid LIMIT 1");
    $shipIdStmt->execute([':pid' => $pid]);
    $shipDesignId = (int)$shipIdStmt->fetchColumn();
    if ($shipDesignId <= 0) $shipDesignId = 1;

    
    $currentShipId = $shipDesignId;

    
    $allowedDesignIds = [$currentShipId];
    if (in_array($currentShipId, [10, 56, 59, 63, 64, 65, 66, 67], true)) {
        $allowedDesignIds = [10, 56, 59, 63, 64, 65, 66, 67];
    } elseif (in_array($currentShipId, [8, 17], true)) {
        $allowedDesignIds = [8, 17];
    }

    $requestedDesignId = isset($payload['design_id']) ? (int)$payload['design_id'] : 0;

    if ($requestedDesignId > 0 && $requestedDesignId !== $currentShipId) {

        if (!in_array($requestedDesignId, $allowedDesignIds, true)) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['error' => 'invalid_design']);
            exit;
        }

        
        $baseShipId = null;
        if (in_array($requestedDesignId, [10, 56, 59, 63, 64, 65, 66, 67], true)) $baseShipId = 10;
        if (in_array($requestedDesignId, [8, 17], true))     $baseShipId = 8;

        if ($baseShipId !== null && $requestedDesignId !== $baseShipId) {
            $own = $db->prepare("SELECT 1 FROM player_designs WHERE player_id = :p AND design_id = :d LIMIT 1");
            $own->execute([':p' => $pid, ':d' => $requestedDesignId]);
            if (!$own->fetchColumn()) {
                $db->rollBack();
                http_response_code(403);
                echo json_encode(['error' => 'design_not_owned']);
                exit;
            }
        }

        $updShip = $db->prepare("UPDATE users SET shipid = :sid WHERE id = :pid");
        $updShip->execute([':sid' => $requestedDesignId, ':pid' => $pid]);

        $currentShipId = $requestedDesignId;
    }

    
    $shipDesignId = $currentShipId;

    
    $baseSpeed2010 = 250;
    $spdStmt = $db->prepare("SELECT base_speed_2010 FROM ship_design WHERE ship_design_id = :sid LIMIT 1");
    $spdStmt->execute([':sid' => $shipDesignId]);
    $baseSpeed2010 = (int)$spdStmt->fetchColumn();
    if ($baseSpeed2010 <= 0) $baseSpeed2010 = 250;

    $designSlots = ['lasers_slots' => 10, 'gen_slots' => 4, 'extras_slots' => 6];
    $ds = $db->prepare("
        SELECT
          laser_slots_2010 AS lasers_slots,
          generator_slots_2010 AS gen_slots,
          extra_slots_2010 AS extras_slots
        FROM ship_design
        WHERE ship_design_id = :sid
        LIMIT 1
    ");
    $ds->execute([':sid' => $shipDesignId]);
    if ($r = $ds->fetch(PDO::FETCH_ASSOC)) {
        $designSlots['lasers_slots'] = (int)$r['lasers_slots'];
        $designSlots['gen_slots'] = (int)$r['gen_slots'];
        $designSlots['extras_slots'] = (int)$r['extras_slots'];
    }

    
    $db->prepare("
        INSERT IGNORE INTO ship_config (player_id, ship_design_id, name, lasers_slots, gen_slots, extras_slots)
        VALUES
          (:p,:sid,'A',:ls,:gs,:es),
          (:p,:sid,'B',:ls,:gs,:es)
    ")->execute([
        ':p' => $pid, ':sid' => $shipDesignId,
        ':ls' => $designSlots['lasers_slots'],
        ':gs' => $designSlots['gen_slots'],
        ':es' => $designSlots['extras_slots'],
    ]);

    
    $db->prepare("
        UPDATE ship_config
        SET lasers_slots=:ls, gen_slots=:gs, extras_slots=:es
        WHERE player_id=:p AND ship_design_id=:sid
    ")->execute([
        ':p' => $pid, ':sid' => $shipDesignId,
        ':ls' => $designSlots['lasers_slots'],
        ':gs' => $designSlots['gen_slots'],
        ':es' => $designSlots['extras_slots'],
    ]);

    
    $itemsMap = [];
    $itQ = $db->query("SELECT id, name, CASE WHEN id=9001 OR LOWER(name) LIKE '%havok%' OR LOWER(name) LIKE '%havoc%' THEN 'drone_design' ELSE category END AS category, type FROM items");
    foreach ($itQ as $row) {
        $itemsMap[(int)$row['id']] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'cat' => $row['category'],
            'category' => $row['category'],
            'type' => (int)$row['type'],
        ];
    }

    $ownedQty = [];
    $oq = $db->prepare("SELECT item_id, SUM(qty) AS qty FROM player_inventory WHERE player_id = :p GROUP BY item_id");
    $oq->execute([':p' => $pid]);
    foreach ($oq->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $ownedQty[(int)$r['item_id']] = (int)$r['qty'];
    }

    
    if ($hasConfigs) {

        
        $cfgStmt = $db->prepare("
            SELECT id, name, lasers_slots, gen_slots, extras_slots
            FROM ship_config
            WHERE player_id = :p AND ship_design_id = :sid
        ");
        $cfgStmt->execute([':p' => $pid, ':sid' => $shipDesignId]);
        $configs = $cfgStmt->fetchAll(PDO::FETCH_ASSOC);

        $cfgByName = [];
        foreach ($configs as $c) $cfgByName[$c['name']] = $c;

        $idsWanted = [];
        foreach ($payload['configs'] as $conf) {
            if (!is_array($conf)) continue;
            $n = (($conf['name'] ?? 'A') === 'B') ? 'B' : 'A';
            if (!isset($cfgByName[$n])) continue;
            $idsWanted[] = (int)$cfgByName[$n]['id'];
        }
        $idsWanted = array_values(array_unique($idsWanted));

        if (!empty($idsWanted)) {
            $in = implode(',', array_map('intval', $idsWanted));

            
            $db->exec("UPDATE ship_slot SET item_id = NULL WHERE ship_config_id IN ($in)");

            
            foreach ($payload['configs'] as $conf) {
                if (!is_array($conf)) continue;

                $name = (($conf['name'] ?? 'A') === 'B') ? 'B' : 'A';
                if (!isset($cfgByName[$name])) continue;

                $c = $cfgByName[$name];

                $rowsSpec = [
                    'lasers' => (int)$c['lasers_slots'],
                    'generators' => (int)$c['gen_slots'],
                    'extras' => (int)$c['extras_slots'],
                ];

                $slots = $conf['slots'] ?? [];
                if (!is_array($slots)) $slots = [];

                
                $usedCounts = [];

                foreach ($rowsSpec as $row => $max) {
                    $list = $slots[$row] ?? [];
                    if (!is_array($list)) $list = [];

                    $n = min(count($list), $max);

                    for ($i = 0; $i < $n; $i++) {
                        $iid = (int)($list[$i] ?? 0);
                        if ($iid <= 0) continue;

                        $info = $itemsMap[$iid] ?? null;
                        if (!$info) continue;

                        $ok = false;
                        if ($row === 'lasers' && $info['cat'] === 'laser') $ok = true;
                        if ($row === 'generators' && $info['cat'] === 'generator') $ok = true;
                        if ($row === 'extras' && $info['cat'] === 'extra') $ok = true;
                        if (!$ok) continue;

                        $usedCounts[$iid] = ($usedCounts[$iid] ?? 0) + 1;
                        $maxOwn = $ownedQty[$iid] ?? 0;
                        if ($usedCounts[$iid] > $maxOwn) {
                            
                            continue;
                        }

                        $db->prepare("
                            UPDATE ship_slot
                            SET item_id = :i
                            WHERE ship_config_id = :c AND row_name = :r AND slot_index = :s
                        ")->execute([
                            ':i' => $iid,
                            ':c' => (int)$c['id'],
                            ':r' => $row,
                            ':s' => $i
                        ]);

                        
                        
                        $appliedCounts[$name][$iid] = ($appliedCounts[$name][$iid] ?? 0) + 1;
                    }
                }
            }
        }
    }

    


$dr = $db->prepare("SELECT id, item_id, name FROM drone WHERE player_id = :p ORDER BY id");
$dr->execute([':p' => $pid]);
$drRows = $dr->fetchAll(PDO::FETCH_ASSOC);

$drIds = [];
$drSlotCountById = [];
$drItemIdById = [];

foreach ($drRows as $r) {
    $did = (int)$r['id'];
    $drIds[] = $did;

    $iid = (int)($r['item_id'] ?? 0);
    $nm  = strtolower((string)($r['name'] ?? ''));

    
    $slotCount = ($iid === 5 || strpos($nm, 'flax') !== false) ? 1 : 2;

    $drSlotCountById[$did] = $slotCount;
    $drItemIdById[$did] = $iid;
}


if (!empty($drIds)) {
    $insGlobal = $db->prepare("
        INSERT IGNORE INTO drone_slot (drone_id, slot_index, item_id)
        VALUES (:d,:s,NULL)
    ");
    $delGlobalExtra = $db->prepare("
        DELETE FROM drone_slot
        WHERE drone_id = :d AND slot_index >= :sc
    ");

    foreach ($drIds as $did) {
        $slotCount = (int)($drSlotCountById[$did] ?? 2);

        
        $delGlobalExtra->execute([':d' => (int)$did, ':sc' => $slotCount]);

        
        for ($s = 0; $s < $slotCount; $s++) {
            $insGlobal->execute([':d' => (int)$did, ':s' => $s]);
        }
    }
}

$saveDroneConfig = function (string $cfg, array $dronesPayload) use ($db, $drIds, $drSlotCountById, $itemsMap, $ownedQty, $appliedCounts) {

    if (empty($drIds)) return;

    
    
    
    $usedDroneCounts = $appliedCounts[$cfg] ?? [];

    $insCfgSlot = $db->prepare("
        INSERT IGNORE INTO drone_slot_config (drone_id, config, slot_index, item_id)
        VALUES (:d,:c,:s,NULL)
    ");
    $delCfgExtra = $db->prepare("
        DELETE FROM drone_slot_config
        WHERE drone_id = :d AND config = :c AND slot_index >= :sc
    ");
    $clrCfg = $db->prepare("
        UPDATE drone_slot_config
        SET item_id = NULL
        WHERE drone_id = :d AND config = :c
    ");

    foreach ($dronesPayload as $idx => $d) {
        if (!is_array($d)) continue;

        $did = $drIds[$idx] ?? null;
        if (!$did) continue;
        $did = (int)$did;

        $slotCount = (int)($drSlotCountById[$did] ?? 2);

        
        $delCfgExtra->execute([':d' => $did, ':c' => $cfg, ':sc' => $slotCount]);

        
        for ($s = 0; $s < $slotCount; $s++) {
            $insCfgSlot->execute([':d' => $did, ':c' => $cfg, ':s' => $s]);
        }

        
        $clrCfg->execute([':d' => $did, ':c' => $cfg]);

        
        $slots = $d['slots'] ?? [];
        if (!is_array($slots)) $slots = [];

        for ($s = 0; $s < $slotCount; $s++) {
            $iid = isset($slots[$s]) ? (int)$slots[$s] : 0;
            if ($iid <= 0) continue;

            $info = $itemsMap[$iid] ?? null;
            if (!$info) continue;

            
            $ok = ($info['cat'] === 'laser') || ($info['cat'] === 'generator' && (int)$info['type'] === 4);
            if (!$ok) continue;

            $usedDroneCounts[$iid] = ($usedDroneCounts[$iid] ?? 0) + 1;
            $maxOwn = $ownedQty[$iid] ?? 0;
            if ($usedDroneCounts[$iid] > $maxOwn) continue;

            $db->prepare("
                UPDATE drone_slot_config
                SET item_id = :i
                WHERE drone_id = :d AND config = :c AND slot_index = :s
            ")->execute([
                ':i' => $iid,
                ':d' => $did,
                ':c' => $cfg,
                ':s' => $s
            ]);
        }
    }
};

if ($hasDrones) {
    $saveDroneConfig('A', $dronesA);
    $saveDroneConfig('B', $dronesB);
}

$requestedDroneDesigns = [];
$collectDroneDesigns = function (array $dronesPayload) use (&$requestedDroneDesigns, $drIds) {
    foreach ($dronesPayload as $idx => $dronePayload) {
        if (!is_array($dronePayload)) continue;
        $did = $drIds[$idx] ?? null;
        if (!$did) continue;
        $designItemId = (int)($dronePayload['design_item_id'] ?? $dronePayload['designItemId'] ?? 0);
        if ($designItemId > 0 && !isset($requestedDroneDesigns[(int)$did])) {
            $requestedDroneDesigns[(int)$did] = $designItemId;
        }
    }
};

if ($hasDrones && !empty($drIds)) {
    $collectDroneDesigns($dronesA);
    $collectDroneDesigns($dronesB);

    $validDroneDesigns = [];
    $usedDesignCounts = [];

    foreach ($requestedDroneDesigns as $did => $designItemId) {
        $did = (int)$did;
        $designItemId = (int)$designItemId;
        $itemInfo = $itemsMap[$designItemId] ?? null;
        if (!$itemInfo) continue;
        if (!function_exists('is_havok_design_item') || !is_havok_design_item($itemInfo)) continue;
        if ((int)($drItemIdById[$did] ?? 0) !== 3) continue;

        $usedDesignCounts[$designItemId] = ($usedDesignCounts[$designItemId] ?? 0) + 1;
        if ($usedDesignCounts[$designItemId] > (int)($ownedQty[$designItemId] ?? 0)) {
            continue;
        }

        $validDroneDesigns[$did] = $designItemId;
    }

    $inDesignDrones = implode(',', array_map('intval', $drIds));
    $db->exec("DELETE FROM drone_design_equipped WHERE drone_id IN ($inDesignDrones)");

    if (!empty($validDroneDesigns)) {
        $insertDesign = $db->prepare("
            INSERT INTO drone_design_equipped (drone_id, design_item_id)
            VALUES (:did, :design_item_id)
            ON DUPLICATE KEY UPDATE design_item_id = VALUES(design_item_id)
        ");
        foreach ($validDroneDesigns as $did => $designItemId) {
            $insertDesign->execute([':did' => (int)$did, ':design_item_id' => (int)$designItemId]);
        }
    }
}

$havokDroneIds = [];
if (!empty($drIds)) {
    $inHavokDrones = implode(',', array_map('intval', $drIds));
    try {
        $havokStmt = $db->query("
            SELECT dde.drone_id, dde.design_item_id, i.name, CASE WHEN i.id=9001 OR LOWER(i.name) LIKE '%havok%' OR LOWER(i.name) LIKE '%havoc%' THEN 'drone_design' ELSE i.category END AS category, i.type
            FROM drone_design_equipped dde
            LEFT JOIN items i ON i.id = dde.design_item_id
            WHERE dde.drone_id IN ($inHavokDrones)
        ");
        foreach ($havokStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $item = [
                'id' => (int)($row['design_item_id'] ?? 0),
                'name' => (string)($row['name'] ?? ''),
                'cat' => (string)($row['category'] ?? ''),
                'category' => (string)($row['category'] ?? ''),
                'type' => (int)($row['type'] ?? 0),
            ];
            if (function_exists('is_havok_design_item') && is_havok_design_item($item)) {
                $havokDroneIds[(int)$row['drone_id']] = true;
            }
        }
    } catch (Exception $e) {
        $havokDroneIds = [];
    }
}


    
    $BASE_SPEED = $baseSpeed2010;

    
    $LASER_DAMAGE_BY_ID = [
        10 => 40,   
        11 => 60,   
        12 => 100,  
        1  => 150,  
    ];

    $SHIELD_VALUE_BY_ID = [
        35 => 1000,   
        36 => 2000,   
        37 => 4000,   
        2  => 10000,  
    ];

    $SPEED_BONUS_BY_ID = [
        30 => 2,   
        31 => 3,   
        32 => 4,   
        33 => 5,   
        34 => 7,   
        4  => 10,  
    ];

    
    $cfg = $db->prepare("
        SELECT id, name, lasers_slots, gen_slots, extras_slots
        FROM ship_config
        WHERE player_id = :p AND ship_design_id = :sid
        ORDER BY name
    ");
    $cfg->execute([':p' => $pid, ':sid' => $shipDesignId]);
    $configs = $cfg->fetchAll(PDO::FETCH_ASSOC);

    
    $countShip = $db->prepare("
        SELECT s.item_id, i.category, i.type, COUNT(*) AS n
        FROM ship_slot s
        JOIN items i ON i.id = s.item_id
        WHERE s.item_id IS NOT NULL AND s.ship_config_id = :cid
        GROUP BY s.item_id, i.category, i.type
    ");

    
    $droneTotals = [
        'A' => ['laser' => 0, 'shield' => 0, 'damage' => 0.0, 'boostable_damage' => 0.0, 'shield_points' => 0],
        'B' => ['laser' => 0, 'shield' => 0, 'damage' => 0.0, 'boostable_damage' => 0.0, 'shield_points' => 0],
    ];
    $equippedHavokCount = min(8, count($havokDroneIds));

    // Havok rule: 2% per equipped Havok from 1 to 7, full 8 Havoks = 20% total.
    $havokBonusPct = ($equippedHavokCount >= 8)
        ? 20
        : ($equippedHavokCount * 2);

    $havokDroneDamageMultiplier = 1.0 + ($havokBonusPct / 100.0);

    if (!empty($drIds)) {
        $in = implode(',', array_map('intval', $drIds));

        $qd = $db->prepare("
            SELECT dsc.drone_id, dsc.item_id, i.category, i.type
            FROM drone_slot_config dsc
            JOIN items i ON i.id = dsc.item_id
            WHERE dsc.item_id IS NOT NULL
              AND dsc.config = :cfg
              AND dsc.drone_id IN ($in)
            ORDER BY dsc.drone_id, dsc.slot_index
        ");

        foreach (['A', 'B'] as $cfgName) {
            $qd->execute([':cfg' => $cfgName]);
            foreach ($qd->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $droneId = (int)$r['drone_id'];
                $iid = (int)$r['item_id'];
                $cat = $r['category'];
                $typ = (int)$r['type'];

                if ($cat === 'laser') {
                    $droneTotals[$cfgName]['laser'] += 1;
                    $dmgPer = (float)($LASER_DAMAGE_BY_ID[$iid] ?? 0);
                    $droneTotals[$cfgName]['damage'] += $dmgPer;

                    // Havok v2 rule: each equipped Havok gives +2% to Iris drone laser damage
                    // in the saved configuration. Flax laser damage stays unboosted.
                    if ((int)($drItemIdById[$droneId] ?? 0) === 3) {
                        $droneTotals[$cfgName]['boostable_damage'] += $dmgPer;
                    }

                } elseif ($cat === 'generator' && $typ === 4) {
                    $droneTotals[$cfgName]['shield'] += 1;
                    $shdPer = $SHIELD_VALUE_BY_ID[$iid] ?? 0;
                    $droneTotals[$cfgName]['shield_points'] += $shdPer;
                }
                
            }
        }
    }

    $upStats = $db->prepare("
        INSERT INTO ship_config_stats (
            ship_config_id, config,
            lasers_slots, gen_slots, extras_slots,
            damage_total, shield_total, speed_total
        ) VALUES (
            :cid, :cfg,
            :ls, :gs, :es,
            :dmg, :shd, :spd
        )
        ON DUPLICATE KEY UPDATE
            lasers_slots = VALUES(lasers_slots),
            gen_slots    = VALUES(gen_slots),
            extras_slots = VALUES(extras_slots),
            damage_total = VALUES(damage_total),
            shield_total = VALUES(shield_total),
            speed_total  = VALUES(speed_total)
    ");

    $statsByName       = [];
    $equipCountsByName = [];

    foreach ($configs as $c) {
        $cid  = (int)$c['id'];
        $name = $c['name']; 

        
        $shipLasers  = 0;
        $shipShields = 0;
        $shipSpeeds  = 0;

        
        $shipDamage     = 0;
        $shipShieldPts  = 0;
        $shipSpeedBonus = 0;

        $countShip->execute([':cid' => $cid]);
        foreach ($countShip as $r) {
            $iid = (int)$r['item_id'];
            $cat = $r['category'];
            $typ = (int)$r['type'];
            $n   = (int)$r['n'];

            if ($cat === 'laser') {
                $shipLasers += $n;
                $shipDamage += ($LASER_DAMAGE_BY_ID[$iid] ?? 0) * $n;

            } elseif ($cat === 'generator' && $typ === 4) {
                $shipShields += $n;
                $shipShieldPts += ($SHIELD_VALUE_BY_ID[$iid] ?? 0) * $n;

            } elseif ($cat === 'generator' && $typ === 3) {
                $shipSpeeds += $n;
                $shipSpeedBonus += ($SPEED_BONUS_BY_ID[$iid] ?? 0) * $n;
            }
        }

        $droneLasers  = $droneTotals[$name]['laser'] ?? 0;
        $droneShields = $droneTotals[$name]['shield'] ?? 0;
        $baseDroneDamage = (float)($droneTotals[$name]['damage'] ?? 0);
        $boostableDroneDamage = (float)($droneTotals[$name]['boostable_damage'] ?? 0);
        $nonBoostableDroneDamage = max(0.0, $baseDroneDamage - $boostableDroneDamage);
        $droneDamage = $nonBoostableDroneDamage + ($boostableDroneDamage * $havokDroneDamageMultiplier);
        $droneShield  = $droneTotals[$name]['shield_points'] ?? 0;

        $totalLasers  = $shipLasers  + $droneLasers;
        $totalShields = $shipShields + $droneShields;

        $damage = (int)round($shipDamage + $droneDamage);
        $shield = (int)($shipShieldPts + $droneShield);
        $speed  = (int)($BASE_SPEED + $shipSpeedBonus);

        $upStats->execute([
            ':cid' => $cid,
            ':cfg' => $name,
            ':ls'  => (int)$c['lasers_slots'],
            ':gs'  => (int)$c['gen_slots'],
            ':es'  => (int)$c['extras_slots'],
            ':dmg' => $damage,
            ':shd' => $shield,
            ':spd' => $speed
        ]);

        $statsByName[$name] = ['damage' => $damage, 'shield' => $shield, 'speed' => $speed];
        $equipCountsByName[$name] = [
            'lasers'  => $totalLasers,
            'shields' => $totalShields,
            'speeds'  => $shipSpeeds
        ];
    }



    $AStats = $statsByName['A'] ?? ['damage' => 0, 'shield' => 0, 'speed' => 0];
    $BStats = $statsByName['B'] ?? ['damage' => 0, 'shield' => 0, 'speed' => 0];

    $d1 = (int)$AStats['damage'];
    $s1 = (int)$AStats['shield'];
    $v1 = (int)$AStats['speed'];

    $d2 = (int)$BStats['damage'];
    $s2 = (int)$BStats['shield'];
    $v2 = (int)$BStats['speed'];

    
    $pcExists = $db->query("SHOW TABLES LIKE 'player_config'")->fetchColumn();
    if ($pcExists) {
        $pcSel = $db->prepare("SELECT COUNT(*) FROM player_config WHERE player_id = :pid");
        $pcSel->execute([':pid' => $pid]);
        $exists = ((int)$pcSel->fetchColumn() > 0);

        if ($exists) {
            $pcUpd = $db->prepare("
                UPDATE player_config
                SET damage1=:d1, shield1=:s1, speed1=:v1,
                    damage2=:d2, shield2=:s2, speed2=:v2
                WHERE player_id=:pid
            ");
            $pcUpd->execute([
                ':pid' => $pid,
                ':d1' => $d1, ':s1' => $s1, ':v1' => $v1,
                ':d2' => $d2, ':s2' => $s2, ':v2' => $v2
            ]);
        } else {
            $pcIns = $db->prepare("
                INSERT INTO player_config (player_id, damage1, shield1, speed1, damage2, shield2, speed2)
                VALUES (:pid,:d1,:s1,:v1,:d2,:s2,:v2)
            ");
            $pcIns->execute([
                ':pid' => $pid,
                ':d1' => $d1, ':s1' => $s1, ':v1' => $v1,
                ':d2' => $d2, ':s2' => $s2, ':v2' => $v2
            ]);
        }
    }

    
    $u = $db->prepare("SELECT active_config FROM users WHERE id = :u LIMIT 1");
    $u->execute([':u' => $pid]);
    $ac = (int)$u->fetchColumn();
    $activeName = ($ac === 2) ? 'B' : 'A';

    if (isset($statsByName[$activeName])) {
        $s = $statsByName[$activeName];
        $upd = $db->prepare("
            UPDATE users
            SET damages=:dmg, max_shield=:shd, speed=:spd
            WHERE id=:u
        ");
        $upd->execute([
            ':dmg' => (int)$s['damage'],
            ':shd' => (int)$s['shield'],
            ':spd' => (int)$s['speed'],
            ':u'   => $pid
        ]);
    }

    
    if (!empty($drIds)) {
        $in = implode(',', array_map('intval', $drIds));

        $db->exec("UPDATE drone_slot SET item_id = NULL WHERE drone_id IN ($in)");

        $copy = $db->prepare("
            UPDATE drone_slot ds
            JOIN drone_slot_config dsc
              ON dsc.drone_id = ds.drone_id
             AND dsc.slot_index = ds.slot_index
             AND dsc.config = :cfg
            SET ds.item_id = dsc.item_id
            WHERE ds.drone_id IN ($in)
        ");
        $copy->execute([':cfg' => $activeName]);
    }

    $db->prepare("
        UPDATE users
        SET config_refresh_pending = 1
        WHERE id = :u
    ")->execute([':u' => $pid]);

    $db->commit();
    echo json_encode(['ok' => true]);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'save_failed', 'message' => $e->getMessage()]);
}
