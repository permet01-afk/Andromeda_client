<?php

header('Content-Type: application/json; charset=utf-8');

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
if (empty($_SESSION['player_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Auth required"]);
    exit();
}

$databaseClass = __DIR__ . '/../../libs/Database.php';
if (!is_file($databaseClass)) {
    $databaseClass = __DIR__ . '/../../libs/database.php';
}
require_once $databaseClass;
require_once __DIR__ . '/../../config/database.php';

function gg_safe_parts($json) {
    $parts = json_decode((string)$json, true);
    if (!is_array($parts)) return [];

    $clean = [];
    foreach ($parts as $part) {
        $part = (int)$part;
        if ($part > 0) $clean[] = $part;
    }

    $clean = array_values(array_unique($clean));
    sort($clean);
    return $clean;
}

function gg_pick_weighted($weights) {
    $total = array_sum($weights);
    if ($total <= 0) return null;

    $roll = mt_rand(1, $total);
    $current = 0;

    foreach ($weights as $key => $weight) {
        $current += (int)$weight;
        if ($roll <= $current) return $key;
    }

    foreach ($weights as $key => $weight) return $key;
    return null;
}

function gg_pick_gate_part_from_pool($gatesConfig, $poolGateIds) {
    $total = 0;
    foreach ($poolGateIds as $gateId) {
        if (isset($gatesConfig[$gateId])) $total += (int)$gatesConfig[$gateId]['total'];
    }

    if ($total <= 0) return [1, 1];

    $roll = mt_rand(1, $total);
    $offset = 0;

    foreach ($poolGateIds as $gateId) {
        if (!isset($gatesConfig[$gateId])) continue;
        $gateTotal = (int)$gatesConfig[$gateId]['total'];
        if ($roll <= ($offset + $gateTotal)) {
            return [$gateId, $roll - $offset];
        }
        $offset += $gateTotal;
    }

    return [$poolGateIds[0], 1];
}

function gg_target_pool($selectedGateId) {
    return ((int)$selectedGateId === 4) ? [4] : [1, 2, 3];
}

function gg_pick_gate_part_for_selection($gatesConfig, $poolGateIds, $selectedGateId, $selectedBiasPercent = 25) {
    $selectedGateId = (int)$selectedGateId;
    $selectedBiasPercent = max(0, min(100, (int)$selectedBiasPercent));

    if (count($poolGateIds) > 1 && in_array($selectedGateId, $poolGateIds, true) && mt_rand(1, 100) <= $selectedBiasPercent) {
        return gg_pick_gate_part_from_pool($gatesConfig, [$selectedGateId]);
    }

    return gg_pick_gate_part_from_pool($gatesConfig, $poolGateIds);
}

function gg_pool_label($poolGateIds, $gatesConfig) {
    if (count($poolGateIds) === 1 && (int)$poolGateIds[0] === 4) {
        return 'Delta';
    }
    return 'Alpha/Beta/Gamma';
}

function gg_multiplier_label($level) {
    return 'x' . ((int)$level + 1);
}

function gg_missing_parts_for_pool($gatesConfig, $userParts, $gatesOnMap, $poolGateIds) {
    $missing = [];

    foreach ($poolGateIds as $gateId) {
        if (!isset($gatesConfig[$gateId])) continue;
        if (isset($gatesOnMap[$gateId])) continue;

        $owned = array_fill_keys($userParts[$gateId] ?? [], true);
        $total = (int)$gatesConfig[$gateId]['total'];

        for ($partId = 1; $partId <= $total; $partId++) {
            if (!isset($owned[$partId])) {
                $missing[] = ['gid' => $gateId, 'pid' => $partId];
            }
        }
    }

    return $missing;
}

function gg_add_part_if_missing(&$userParts, $gateId, $partId) {
    if (!isset($userParts[$gateId])) $userParts[$gateId] = [];
    if (in_array($partId, $userParts[$gateId], true)) return false;

    $userParts[$gateId][] = (int)$partId;
    $userParts[$gateId] = array_values(array_unique($userParts[$gateId]));
    sort($userParts[$gateId]);
    return true;
}

function gg_format_qty($value) {
    return number_format((int)$value, 0, '.', ',');
}

function gg_has_column($db, $table, $column) {
    static $cache = [];
    $key = $table . '.' . $column;
    if (array_key_exists($key, $cache)) return $cache[$key];

    $stmt = $db->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table
          AND COLUMN_NAME = :column
    ");
    $stmt->execute([':table' => $table, ':column' => $column]);
    $cache[$key] = ((int)$stmt->fetchColumn() > 0);
    return $cache[$key];
}

function gg_extra_life_price($purchaseCount) {
    $purchaseCount = max(0, min(30, (int)$purchaseCount));
    return 10000 * (2 ** $purchaseCount);
}

function gg_reset_inactive_life_purchases($db, $userId) {
    if (!gg_has_column($db, 'player_galaxy_gates', 'life_purchases')) return;

    $stmt = $db->prepare("
        UPDATE player_galaxy_gates
        SET life_purchases = 0
        WHERE user_id = :uid
          AND on_map = 0
          AND life_purchases <> 0
    ");
    $stmt->execute([':uid' => $userId]);
}

function gg_build_gate_status($db, $userId, $gatesConfig, $totalWaves) {
    $lifePurchaseAvailable = gg_has_column($db, 'player_galaxy_gates', 'life_purchases');
    if ($lifePurchaseAvailable) gg_reset_inactive_life_purchases($db, $userId);

    $columns = "gate_id, parts, on_map, completed, lives, current_wave";
    if ($lifePurchaseAvailable) $columns .= ", life_purchases";

    $stmt = $db->prepare("SELECT " . $columns . " FROM player_galaxy_gates WHERE user_id = :uid");
    $stmt->execute([':uid' => $userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $gatesStatus = [];
    foreach ($gatesConfig as $gateId => $info) {
        $gatesStatus[$gateId] = [
            'id' => $gateId,
            'name' => $info['name'],
            'current' => 0,
            'total' => $info['total'],
            'parts' => [],
            'filled' => false,
            'ready' => false,
            'on_map' => false,
            'completed' => false,
            'lives' => 0,
            'current_wave' => 0,
            'total_waves' => $totalWaves,
            'life_purchase_available' => $lifePurchaseAvailable,
            'life_purchases' => 0,
            'extra_life_price' => gg_extra_life_price(0),
            'can_buy_life' => false
        ];
    }

    foreach ($rows as $row) {
        $gateId = (int)$row['gate_id'];
        if (!isset($gatesStatus[$gateId])) continue;

        $parts = gg_safe_parts($row['parts'] ?? '[]');
        $current = count($parts);
        $onMap = ((int)($row['on_map'] ?? 0) === 1);
        $completed = ((int)($row['completed'] ?? 0) === 1);
        $lifePurchases = $lifePurchaseAvailable ? (int)($row['life_purchases'] ?? 0) : 0;

        $gatesStatus[$gateId]['current'] = $current;
        $gatesStatus[$gateId]['parts'] = $parts;
        $gatesStatus[$gateId]['filled'] = ($current >= $gatesConfig[$gateId]['total']);
        $gatesStatus[$gateId]['ready'] = ($current >= $gatesConfig[$gateId]['total']) && !$onMap;
        $gatesStatus[$gateId]['on_map'] = $onMap;
        $gatesStatus[$gateId]['completed'] = $completed;
        $gatesStatus[$gateId]['lives'] = (int)($row['lives'] ?? 0);
        $gatesStatus[$gateId]['current_wave'] = (int)($row['current_wave'] ?? 0);
        $gatesStatus[$gateId]['life_purchases'] = $lifePurchases;
        $gatesStatus[$gateId]['extra_life_price'] = gg_extra_life_price($lifePurchases);
        $gatesStatus[$gateId]['can_buy_life'] = $lifePurchaseAvailable && $onMap && !$completed && ((int)($row['lives'] ?? 0) > 0);
    }

    return $gatesStatus;
}

function gg_build_pilot_bar($db, $userId) {
    $stmtPilot = $db->prepare("SELECT credits, uridium, experience, honor, rankpoints FROM users WHERE id = :id LIMIT 1");
    $stmtPilot->execute([':id' => $userId]);
    $freshPilot = $stmtPilot->fetch(PDO::FETCH_ASSOC);

    return [
        'credits' => number_format((int)($freshPilot['credits'] ?? 0)),
        'uridium' => number_format((int)($freshPilot['uridium'] ?? 0)),
        'experience' => number_format((int)($freshPilot['experience'] ?? 0)),
        'honor' => number_format((int)($freshPilot['honor'] ?? 0)),
        'rankpoints' => number_format((int)($freshPilot['rankpoints'] ?? 0)),
    ];
}

try {
    $db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('SET NAMES utf8');

    $userId = (int)$_SESSION['player_id'];
    $action = $_REQUEST['action'] ?? 'spin';

    $gatesConfig = [
        1 => ['total' => 34,  'name' => 'Alpha'],
        2 => ['total' => 48,  'name' => 'Beta'],
        3 => ['total' => 82,  'name' => 'Gamma'],
        4 => ['total' => 128, 'name' => 'Delta']
    ];

    $costPerSpin = 40;
    $totalWaves = 10;

    if ($action === 'init') {
        $stmt = $db->prepare("SELECT gg_multiplier FROM users WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $multiplierLevel = max(0, min(5, (int)($user['gg_multiplier'] ?? 0)));

        echo json_encode([
            'status' => 'success',
            'gates' => gg_build_gate_status($db, $userId, $gatesConfig, $totalWaves),
            'multiplier_next' => $multiplierLevel + 1
        ]);
        exit();
    }

    if ($action === 'prepare') {
        $gateId = (int)($_POST['gate_id'] ?? 0);
        if (!isset($gatesConfig[$gateId])) {
            echo json_encode(["status" => "error", "message" => "Invalid Gate"]);
            exit();
        }

        $db->beginTransaction();

        $lockUser = $db->prepare("SELECT id FROM users WHERE id = :id LIMIT 1 FOR UPDATE");
        $lockUser->execute([':id' => $userId]);
        if (!$lockUser->fetch(PDO::FETCH_ASSOC)) {
            throw new RuntimeException('Pilot not found.');
        }

        $stmt = $db->prepare("SELECT parts, on_map FROM player_galaxy_gates WHERE user_id = :uid AND gate_id = :gid LIMIT 1 FOR UPDATE");
        $stmt->execute([':uid' => $userId, ':gid' => $gateId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $parts = $row ? gg_safe_parts($row['parts'] ?? '[]') : [];

        if (!$row || count($parts) < $gatesConfig[$gateId]['total']) {
            $db->rollBack();
            echo json_encode(["status" => "error", "message" => "Missing parts!"]);
            exit();
        }

        if ((int)$row['on_map'] === 1) {
            $db->rollBack();
            echo json_encode(["status" => "error", "message" => "Already on map!"]);
            exit();
        }

        if (gg_has_column($db, 'player_galaxy_gates', 'life_purchases')) {
            $stmt = $db->prepare("UPDATE player_galaxy_gates SET parts = '[]', on_map = 1, completed = 0, lives = 3, life_purchases = 0, current_wave = 1 WHERE user_id = :uid AND gate_id = :gid");
        } else {
            $stmt = $db->prepare("UPDATE player_galaxy_gates SET parts = '[]', on_map = 1, completed = 0, lives = 3, current_wave = 1 WHERE user_id = :uid AND gate_id = :gid");
        }
        $stmt->execute([':uid' => $userId, ':gid' => $gateId]);

        $db->commit();

        $gatesStatus = gg_build_gate_status($db, $userId, $gatesConfig, $totalWaves);

        echo json_encode([
            "status" => "success",
            "message" => $gatesConfig[$gateId]['name'] . " gate prepared!",
            "gate" => $gatesStatus[$gateId]
        ]);
        exit();
    }

    if ($action === 'buy_life') {
        $gateId = (int)($_POST['gate_id'] ?? 0);
        if (!isset($gatesConfig[$gateId])) {
            echo json_encode(["status" => "error", "message" => "Invalid Gate"]);
            exit();
        }

        if (!gg_has_column($db, 'player_galaxy_gates', 'life_purchases')) {
            echo json_encode(["status" => "error", "message" => "Extra life purchases are not available yet."]);
            exit();
        }

        $db->beginTransaction();

        $userStmt = $db->prepare("SELECT uridium FROM users WHERE id = :id LIMIT 1 FOR UPDATE");
        $userStmt->execute([':id' => $userId]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            throw new RuntimeException('Pilot not found.');
        }

        $gateStmt = $db->prepare("SELECT on_map, completed, lives, life_purchases FROM player_galaxy_gates WHERE user_id = :uid AND gate_id = :gid LIMIT 1 FOR UPDATE");
        $gateStmt->execute([':uid' => $userId, ':gid' => $gateId]);
        $gateRow = $gateStmt->fetch(PDO::FETCH_ASSOC);

        if (!$gateRow || (int)$gateRow['on_map'] !== 1 || (int)$gateRow['completed'] === 1 || (int)$gateRow['lives'] <= 0) {
            $db->rollBack();
            echo json_encode(["status" => "error", "message" => "This Galaxy Gate is not active."]);
            exit();
        }

        $lifePurchases = (int)($gateRow['life_purchases'] ?? 0);
        $price = gg_extra_life_price($lifePurchases);

        if ((int)$user['uridium'] < $price) {
            $db->rollBack();
            echo json_encode(["status" => "error", "message" => "Not enough Uridium."]);
            exit();
        }

        $payStmt = $db->prepare("UPDATE users SET uridium = uridium - :price WHERE id = :id AND uridium >= :price");
        $payStmt->execute([':price' => $price, ':id' => $userId]);
        if ($payStmt->rowCount() !== 1) {
            $db->rollBack();
            echo json_encode(["status" => "error", "message" => "Not enough Uridium."]);
            exit();
        }

        $lifeStmt = $db->prepare("
            UPDATE player_galaxy_gates
            SET lives = lives + 1,
                life_purchases = life_purchases + 1
            WHERE user_id = :uid
              AND gate_id = :gid
              AND on_map = 1
              AND completed = 0
              AND lives > 0
        ");
        $lifeStmt->execute([':uid' => $userId, ':gid' => $gateId]);
        if ($lifeStmt->rowCount() !== 1) {
            $db->rollBack();
            echo json_encode(["status" => "error", "message" => "This Galaxy Gate is not active."]);
            exit();
        }

        $db->commit();

        $gatesStatus = gg_build_gate_status($db, $userId, $gatesConfig, $totalWaves);
        $pilotBarStats = gg_build_pilot_bar($db, $userId);

        echo json_encode([
            "status" => "success",
            "message" => $gatesConfig[$gateId]['name'] . " extra life purchased for " . number_format($price) . " Uridium.",
            "gate" => $gatesStatus[$gateId],
            "pilot" => $pilotBarStats
        ]);
        exit();
    }

    $spinAmount = (int)($_POST['amount'] ?? 1);
    $allowedSpins = [1, 5, 10, 100];
    if (!in_array($spinAmount, $allowedSpins, true)) $spinAmount = 1;

    $selectedGateId = (int)($_POST['gate_id'] ?? 1);
    if (!isset($gatesConfig[$selectedGateId])) $selectedGateId = 1;

    $targetPool = gg_target_pool($selectedGateId);
    $poolLabel = gg_pool_label($targetPool, $gatesConfig);
    $totalCost = $costPerSpin * $spinAmount;

    $db->beginTransaction();

    $stmt = $db->prepare("SELECT uridium, gg_multiplier FROM users WHERE id = :id LIMIT 1 FOR UPDATE");
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || (int)$user['uridium'] < $totalCost) {
        $db->rollBack();
        echo json_encode(["status" => "error", "message" => "Not enough Uridium! Need " . number_format($totalCost) . " U."]);
        exit();
    }

    $stmt = $db->prepare("SELECT gate_id, parts, on_map FROM player_galaxy_gates WHERE user_id = :uid FOR UPDATE");
    $stmt->execute([':uid' => $userId]);
    $dbParts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $userParts = [];
    $gatesOnMap = [];
    $existingGateRows = [];
    $touchedGates = [];

    foreach ($gatesConfig as $gateId => $info) {
        $userParts[$gateId] = [];
    }

    foreach ($dbParts as $row) {
        $gateId = (int)$row['gate_id'];
        if (!isset($gatesConfig[$gateId])) continue;

        $existingGateRows[$gateId] = true;
        $userParts[$gateId] = gg_safe_parts($row['parts'] ?? '[]');
        if ((int)$row['on_map'] === 1) $gatesOnMap[$gateId] = true;
    }

    $currentMultLvl = max(0, min(5, (int)$user['gg_multiplier']));
    $startingMultLvl = $currentMultLvl;

    $lootSummary = [];
    $partsByGate = [];
    $rewardDetails = [];
    $hasGatePartEvent = false;
    $multiplierWasUsed = false;
    $multiplierUseText = '';
    $missingLimited = false;
    $stats = [
        'new_parts' => 0,
        'duplicates' => 0,
        'multiplier_increased' => 0,
        'multiplier_max' => 0,
        'multiplier_used' => 0
    ];

    $probabilities = ['ammo' => 62, 'part' => 20, 'resource' => 10, 'logfiles' => 8];
    $ammoChances = ['mcb25' => 20, 'mcb50' => 25, 'sab50' => 20, 'ucb100' => 10, 'plt2026' => 5, 'dcr250' => 5, 'plt2021' => 8, 'hstrm01' => 7];
    $rewardsBase = [
        'mcb25' => 140,
        'mcb50' => 80,
        'sab50' => 80,
        'ucb100' => 20,
        'plt2026' => 10,
        'dcr250' => 3,
        'plt2021' => 0,
        'hstrm01' => 0,
        'xenomit' => 15,
        'promerium' => 10,
        'logfiles' => 2
    ];
    $names = [
        'mcb25' => 'MCB-25',
        'mcb50' => 'MCB-50',
        'sab50' => 'SAB-50',
        'ucb100' => 'UCB-100',
        'plt2026' => 'PLT-2026',
        'dcr250' => 'DCR-250',
        'plt2021' => 'PLT-2021',
        'hstrm01' => 'HSTRM-01',
        'xenomit' => 'Xenomit',
        'promerium' => 'Promerium',
        'logfiles' => 'Logfiles'
    ];
    $resultMeta = [
        'mcb25' => ['kind' => 'ammo', 'description' => 'Laser ammo', 'icon' => 'img/items/mcb25.png'],
        'mcb50' => ['kind' => 'ammo', 'description' => 'Laser ammo', 'icon' => 'img/items/mcb50.png'],
        'sab50' => ['kind' => 'ammo', 'description' => 'Shield transfer ammo', 'icon' => 'img/items/sab50.png'],
        'ucb100' => ['kind' => 'ammo', 'description' => 'Elite laser ammo', 'icon' => 'img/items/ucb100.png'],
        'plt2026' => ['kind' => 'rocket', 'description' => 'Rocket', 'icon' => 'img/items/plt2026.png'],
        'dcr250' => ['kind' => 'rocket', 'description' => 'Special rocket', 'icon' => 'img/items/dcr250.png'],
        'plt2021' => ['kind' => 'rocket', 'description' => 'Rocket', 'icon' => 'img/items/plt2021.png'],
        'hstrm01' => ['kind' => 'rocket', 'description' => 'Hellstorm rocket', 'icon' => 'img/items/hstrm01.png'],
        'xenomit' => ['kind' => 'resource', 'description' => 'Resource', 'icon' => 'img/items/xenomit.png'],
        'promerium' => ['kind' => 'resource', 'description' => 'Resource', 'icon' => 'img/items/promerium.png'],
        'logfiles' => ['kind' => 'logfiles', 'description' => 'Pilot Bio resource', 'icon' => 'img/items/logfile.png']
    ];
    $gateIconIds = ['Alpha' => 1, 'Beta' => 2, 'Gamma' => 3, 'Delta' => 4];

    for ($i = 0; $i < $spinAmount; $i++) {
        $category = gg_pick_weighted($probabilities);

        if ($category === 'part') {
            list($gateId, $partId) = gg_pick_gate_part_for_selection($gatesConfig, $targetPool, $selectedGateId, 25);
            $hasGatePartEvent = true;

            $isOwned = in_array($partId, $userParts[$gateId], true);
            $isGateOnMap = isset($gatesOnMap[$gateId]);

            if ($isOwned || $isGateOnMap) {
                $stats['duplicates']++;

                if ($currentMultLvl < 5) {
                    $currentMultLvl++;
                    $stats['multiplier_increased']++;
                } else {
                    $stats['multiplier_max']++;
                }

                continue;
            }

            $partsToGrant = $currentMultLvl + 1;
            $addedThisEvent = [];

            if (gg_add_part_if_missing($userParts, $gateId, $partId)) {
                $addedThisEvent[] = ['gid' => $gateId, 'pid' => $partId];
                $touchedGates[$gateId] = true;
            }

            while (count($addedThisEvent) < $partsToGrant) {
                $missing = gg_missing_parts_for_pool($gatesConfig, $userParts, $gatesOnMap, $targetPool);
                if (empty($missing)) {
                    $missingLimited = true;
                    break;
                }

                $extra = $missing[mt_rand(0, count($missing) - 1)];
                if (gg_add_part_if_missing($userParts, $extra['gid'], $extra['pid'])) {
                    $addedThisEvent[] = $extra;
                    $touchedGates[$extra['gid']] = true;
                } else {
                    break;
                }
            }

            foreach ($addedThisEvent as $part) {
                $gName = $gatesConfig[$part['gid']]['name'];
                $partsByGate[$gName] = ($partsByGate[$gName] ?? 0) + 1;
                $stats['new_parts']++;
            }

            if ($partsToGrant > 1 && count($addedThisEvent) > 0) {
                $stats['multiplier_used']++;
                $multiplierWasUsed = true;
                $multiplierUseText = gg_multiplier_label($currentMultLvl) . ' used on gate parts';
                $currentMultLvl = 0;
            }

            continue;
        }

        if ($category === 'ammo') {
            $rewardKey = gg_pick_weighted($ammoChances);
        } elseif ($category === 'resource') {
            $rewardKey = mt_rand(0, 1) ? 'xenomit' : 'promerium';
        } else {
            $rewardKey = 'logfiles';
        }

        $actualMultiplier = $currentMultLvl + 1;
        $baseAmount = $rewardsBase[$rewardKey];
        if ($rewardKey === 'plt2021') {
            $baseAmount = mt_rand(1, 5);
        } elseif ($rewardKey === 'hstrm01') {
            $baseAmount = mt_rand(2, 10);
        }
        $amount = $baseAmount * $actualMultiplier;
        $lootSummary[$rewardKey] = ($lootSummary[$rewardKey] ?? 0) + $amount;

        if ($actualMultiplier > 1) {
            $stats['multiplier_used']++;
            $multiplierWasUsed = true;
            $multiplierUseText = 'x' . $actualMultiplier . ' used on ' . ($names[$rewardKey] ?? $rewardKey);
            $currentMultLvl = 0;
        }
    }

    $dbCols = [
        'mcb25' => 'ammo_mcb25',
        'mcb50' => 'ammo_mcb50',
        'sab50' => 'ammo_sab50',
        'ucb100' => 'ammo_ucb100',
        'plt2026' => 'ammo_plt2026',
        'dcr250' => 'ammo_dcr250',
        'plt2021' => 'ammo_plt2021',
        'hstrm01' => 'ammo_hstrm01',
        'logfiles' => 'logfiles'
    ];

    $updatesUser = ["uridium = uridium - :cost", "gg_multiplier = :finalMult"];
    $paramsUser = [':id' => $userId, ':cost' => $totalCost, ':finalMult' => $currentMultLvl];

    foreach ($lootSummary as $key => $qty) {
        if (!isset($dbCols[$key])) continue;
        $col = $dbCols[$key];
        $updatesUser[] = "$col = $col + :$key";
        $paramsUser[":$key"] = $qty;
    }

    $sqlUser = "UPDATE users SET " . implode(', ', $updatesUser) . " WHERE id = :id AND uridium >= :cost";
    $updateUser = $db->prepare($sqlUser);
    $updateUser->execute($paramsUser);
    if ($updateUser->rowCount() < 1) {
        throw new RuntimeException('Unable to debit Uridium safely.');
    }

    $updatesCargo = [];
    $paramsCargo = [':id' => $userId];
    if (isset($lootSummary['xenomit'])) {
        $updatesCargo[] = "xenomit = xenomit + :xeno";
        $paramsCargo[':xeno'] = $lootSummary['xenomit'];
    }
    if (isset($lootSummary['promerium'])) {
        $updatesCargo[] = "promerium = promerium + :prom";
        $paramsCargo[':prom'] = $lootSummary['promerium'];
    }

    if (!empty($updatesCargo)) {
        $sqlCargo = "UPDATE player_cargo SET " . implode(', ', $updatesCargo) . " WHERE id = :id";
        $db->prepare($sqlCargo)->execute($paramsCargo);
    }

    $stmtInsert = $db->prepare("INSERT INTO player_galaxy_gates (user_id, gate_id, parts) VALUES (:uid, :gid, :parts) ON DUPLICATE KEY UPDATE parts = VALUES(parts)");
    foreach ($gatesConfig as $gateId => $info) {
        if (empty($touchedGates[$gateId])) continue;

        $stmtInsert->execute([
            ':uid' => $userId,
            ':gid' => $gateId,
            ':parts' => json_encode($userParts[$gateId])
        ]);
    }

    $db->commit();

    $resultCards = [];
    foreach ($partsByGate as $gateName => $qty) {
        $gateIconId = $gateIconIds[$gateName] ?? 1;
        $resultCards[] = [
            'key' => 'gate_part_' . strtolower($gateName),
            'label' => $gateName . ' Gate Part',
            'description' => 'Gate Part',
            'quantity' => '+' . gg_format_qty($qty),
            'raw_quantity' => $qty,
            'kind' => 'part',
            'icon' => 'img/galaxygates/gate_' . $gateIconId . '_1.png'
        ];
    }

    foreach ($lootSummary as $key => $qty) {
        $meta = $resultMeta[$key] ?? ['kind' => 'item', 'description' => 'Materializer reward', 'icon' => null];
        $resultCards[] = [
            'key' => $key,
            'label' => $names[$key] ?? $key,
            'description' => $meta['description'],
            'quantity' => '+' . gg_format_qty($qty),
            'raw_quantity' => $qty,
            'kind' => $meta['kind'],
            'icon' => $meta['icon']
        ];
    }

    foreach ($lootSummary as $key => $qty) {
        $label = $names[$key] ?? $key;
        $rewardDetails[] = $label . ' +' . gg_format_qty($qty);
    }

    $partDetails = [];
    foreach ($partsByGate as $gateName => $qty) {
        $partDetails[] = $gateName . ' +' . gg_format_qty($qty);
    }

    $logs = [];
    $logs[] = [
        'label' => 'MATERIALIZE',
        'message' => 'x' . $spinAmount . ' ' . $poolLabel . ' — Cost: ' . number_format($totalCost) . ' U.',
        'type' => 'normal'
    ];

    if (!empty($partDetails)) {
        $partMessage = 'Gate parts: ' . implode(', ', $partDetails) . '.';
        if ($missingLimited) $partMessage .= ' Multiplier limited by remaining missing parts.';
        $logs[] = ['label' => 'PARTS', 'message' => $partMessage, 'type' => 'part'];
    } elseif ($hasGatePartEvent) {
        $duplicateMessage = $stats['duplicates'] . ' duplicate/on-map gate part(s).';
        if ($stats['multiplier_increased'] > 0) {
            $duplicateMessage .= ' Multiplier increased.';
        }
        if ($stats['multiplier_max'] > 0) {
            $duplicateMessage .= ' Multiplier already at x6.';
        }
        $logs[] = ['label' => 'PARTS', 'message' => $duplicateMessage, 'type' => 'part'];
    }

    if (!empty($rewardDetails)) {
        $logs[] = ['label' => 'REWARDS', 'message' => implode(', ', $rewardDetails) . '.', 'type' => 'item'];
    }

    $multMsg = gg_multiplier_label($startingMultLvl) . ' → ' . gg_multiplier_label($currentMultLvl);
    if ($multiplierWasUsed) {
        $multMsg .= ' (' . $multiplierUseText;
        if ($stats['multiplier_used'] > 1) {
            $multMsg .= '; ' . $stats['multiplier_used'] . ' multiplier uses in this batch';
        }
        $multMsg .= ')';
    } elseif ($stats['multiplier_increased'] > 0) {
        $multMsg .= ' (duplicate parts increased it)';
    }
    $logs[] = ['label' => 'MULTI', 'message' => $multMsg . '.', 'type' => 'mult'];

    $gatesStatus = gg_build_gate_status($db, $userId, $gatesConfig, $totalWaves);
    $pilotBarStats = gg_build_pilot_bar($db, $userId);

    echo json_encode([
        'status' => 'success',
        'log' => $logs[0]['message'],
        'logs' => $logs,
        'log_group' => $logs,
        'result_cards' => $resultCards,
        'multiplier_next' => $currentMultLvl + 1,
        'gate_updates' => array_values($gatesStatus),
        'type' => $hasGatePartEvent ? 'part' : 'item',
        'pilot' => $pilotBarStats
    ]);

} catch (Exception $e) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }

    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
