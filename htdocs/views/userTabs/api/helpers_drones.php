<?php


function drone_slot_count_from_item(int $itemId): int {
    
    return ($itemId === 5) ? 1 : 2;
}


function parse_user_drones_types(array $user): array {
    $str = (string)($user['drones'] ?? '');
    $str = trim($str);
    if ($str === '') return [];

    $parts = preg_split('/-+/', $str);
    if (!is_array($parts)) return [];

    $types = [];
    foreach ($parts as $p) {
        $p = trim($p);
        if ($p === '') continue;

        $before = explode('/', $p, 2)[0];
        if ($before === '' || !ctype_digit($before)) continue;

        $t = (int)$before;

        
        
        
        if ($t === 2 || $t === 5 || $t === 15) {
            $types[] = 5;   
        } elseif ($t === 3 || $t === 25) {
            $types[] = 3;   
        }

        
        if (count($types) >= 8) break;
    }

    return $types;
}


function count_user_drones_row(array $user): int {
    
    $types = parse_user_drones_types($user);
    return count($types);
}


function sync_drones_tables(PDO $db, int $playerId, array $desiredItemIds): void
{
    
    if (!is_array($desiredItemIds)) $desiredItemIds = [];
    $desiredItemIds = array_values(array_slice($desiredItemIds, 0, 8));

    
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

    
    $cur = $db->prepare("SELECT id, item_id, name FROM drone WHERE player_id=:p ORDER BY id");
    $cur->execute([':p' => $playerId]);
    $rows = $cur->fetchAll(PDO::FETCH_ASSOC);
    $have = count($rows);

    
    
    
    
    
    
    
    
    $existingNames = [];
    $maxNum = ['Iris' => 0, 'Flax' => 0];
    foreach ($rows as $rr) {
        $nm = trim((string)($rr['name'] ?? ''));
        if ($nm !== '') {
            $existingNames[strtolower($nm)] = true;
        }
        
        if (preg_match('/^(iris|flax)\s*#?\s*(\d+)\s*$/i', $nm, $m)) {
            $label = ucfirst(strtolower($m[1]));
            $num = (int)$m[2];
            if ($num > ($maxNum[$label] ?? 0)) $maxNum[$label] = $num;
        }
    }

    $makeUniqueName = function (string $label) use (&$existingNames, &$maxNum): string {
        $label = ($label === 'Flax') ? 'Flax' : 'Iris';
        $n = (int)($maxNum[$label] ?? 0);
        do {
            $n++;
            $candidate = $label . ' ' . $n;
        } while (isset($existingNames[strtolower($candidate)]));

        $existingNames[strtolower($candidate)] = true;
        $maxNum[$label] = $n;
        return $candidate;
    };

    $want = is_array($desiredItemIds) ? count($desiredItemIds) : 0;
    if ($want <= 0) {
        
        return;
    }

    
    $insDrone = $db->prepare("INSERT INTO drone (player_id, name, item_id, level) VALUES (:p,:n,:iid,6)");
    $updDroneItem = $db->prepare("UPDATE drone SET item_id = :iid WHERE id = :id AND (item_id IS NULL OR item_id = 0)");

    $insGlobalSlot = $db->prepare("
        INSERT IGNORE INTO drone_slot (drone_id, slot_index, item_id)
        VALUES (:d,:s,NULL)
    ");
    $delGlobalExtra = $db->prepare("DELETE FROM drone_slot WHERE drone_id = :d AND slot_index >= :sc");

    $insCfgSlot = $db->prepare("
        INSERT IGNORE INTO drone_slot_config (drone_id, config, slot_index, item_id)
        VALUES (:d,:c,:s,NULL)
    ");
    $delCfgExtra = $db->prepare("DELETE FROM drone_slot_config WHERE drone_id = :d AND slot_index >= :sc");

    
    if ($have < $want) {
        for ($i = $have; $i < $want; $i++) {
            $iid = (int)($desiredItemIds[$i] ?? 3);
            $label = ($iid === 5) ? 'Flax' : 'Iris';
            
            $name = $makeUniqueName($label);

            $insDrone->execute([':p' => $playerId, ':n' => $name, ':iid' => $iid]);
            $did = (int)$db->lastInsertId();

            
            $slotCount = drone_slot_count_from_item($iid);

            
            $delGlobalExtra->execute([':d' => $did, ':sc' => $slotCount]);
            $delCfgExtra->execute([':d' => $did, ':sc' => $slotCount]);

            for ($s = 0; $s < $slotCount; $s++) {
                $insGlobalSlot->execute([':d' => $did, ':s' => $s]);
                $insCfgSlot->execute([':d' => $did, ':c' => 'A', ':s' => $s]);
                $insCfgSlot->execute([':d' => $did, ':c' => 'B', ':s' => $s]);
            }
        }

        
        $cur->execute([':p' => $playerId]);
        $rows = $cur->fetchAll(PDO::FETCH_ASSOC);
    }

    
    foreach ($rows as $idx => $r) {
        $did = (int)$r['id'];
        $desiredItem = (int)($desiredItemIds[$idx] ?? ($r['item_id'] ?? 3));

        
        $updDroneItem->execute([':iid' => $desiredItem, ':id' => $did]);

        
        $iid = (int)($r['item_id'] ?? 0);
        if ($iid <= 0) $iid = $desiredItem;

        $slotCount = drone_slot_count_from_item($iid);

        
        $delGlobalExtra->execute([':d' => $did, ':sc' => $slotCount]);
        $delCfgExtra->execute([':d' => $did, ':sc' => $slotCount]);

        
        for ($s = 0; $s < $slotCount; $s++) {
            $insGlobalSlot->execute([':d' => $did, ':s' => $s]);
            $insCfgSlot->execute([':d' => $did, ':c' => 'A', ':s' => $s]);
            $insCfgSlot->execute([':d' => $did, ':c' => 'B', ':s' => $s]);
        }
    }
}


function ensure_drone_design_equipped_table(PDO $db): void
{
    $db->exec("CREATE TABLE IF NOT EXISTS drone_design_equipped (
        drone_id INT(11) NOT NULL,
        design_item_id INT(11) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (drone_id),
        KEY idx_design_item_id (design_item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function drone_design_code_from_item(?array $item): ?string
{
    if (!$item) return null;
    $name = strtolower((string)($item['name'] ?? ''));
    $id = (int)($item['id'] ?? 0);
    $category = strtolower((string)($item['category'] ?? ($item['cat'] ?? '')));

    // Havok est reconnu prioritairement par son id/nom, même si l'ancienne table items
    // utilise encore une catégorie générique. Les API renverront ensuite category=drone_design.
    if ($id === 9001 || strpos($name, 'havok') !== false || strpos($name, 'havoc') !== false) {
        return 'havok';
    }

    if ($category !== '' && $category !== 'drone_design') {
        return null;
    }

    return null;
}

function is_drone_design_item(?array $item): bool
{
    if (!$item) return false;
    return strtolower((string)($item['category'] ?? ($item['cat'] ?? ''))) === 'drone_design';
}

function is_havok_design_item(?array $item): bool
{
    return drone_design_code_from_item($item) === 'havok';
}
