<?php

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/helpers_drones.php'; 
header('Content-Type: application/json');

$userId = $_SESSION['player_id'] ?? 0;
if ($userId <= 0) {
    echo json_encode(['error' => 'Not logged in']);
    exit;
}




$IRIS_PRICES = [15000, 24000, 42000, 60000, 84000, 96000, 126000, 200000];
$FLAX_PRICES = [100000, 200000, 400000, 800000, 1600000, 3200000, 6400000, 12800000];

const NON_SELLABLE_ITEM_IDS = [9001];


$PRICES = [
    
    10 => ['price' => 10000,   'currency' => 'credits', 'name' => 'LF-1'],
    11 => ['price' => 40000,   'currency' => 'credits', 'name' => 'MP-1'],
    12 => ['price' => 250000,  'currency' => 'credits', 'name' => 'LF-2'],
    1  => ['price' => 10000,   'currency' => 'uridium', 'name' => 'LF-3'],
    
    30 => ['price' => 2000,  'currency' => 'credits', 'name' => 'G3N-1010'],
    31 => ['price' => 4000,  'currency' => 'credits', 'name' => 'G3N-2010'],
    32 => ['price' => 8000,  'currency' => 'credits', 'name' => 'G3N-3210'],
    33 => ['price' => 16000, 'currency' => 'credits', 'name' => 'G3N-3310'],
    34 => ['price' => 32000, 'currency' => 'credits', 'name' => 'G3N-6900'],
    4  => ['price' => 2000,  'currency' => 'uridium', 'name' => 'G3N-7900'],
    
    35 => ['price' => 8000,   'currency' => 'credits', 'name' => 'SG3N-A01'],
    36 => ['price' => 24000,  'currency' => 'credits', 'name' => 'SG3N-A02'],
    37 => ['price' => 256000, 'currency' => 'credits', 'name' => 'SG3N-B01'],
    2  => ['price' => 10000,  'currency' => 'uridium', 'name' => 'SG3N-B02'],
    
    20 => ['price' => 15000, 'currency' => 'uridium', 'name' => 'Auto-Rocket CPU'],
    21 => ['price' => 15000, 'currency' => 'uridium', 'name' => 'Cargo Compressor'],
    38 => ['price' => 500000, 'currency' => 'credits', 'name' => 'HST-1'],
    39 => ['price' => 15000, 'currency' => 'uridium', 'name' => 'HST-2'],
];


$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = [];

$itemId  = (int)($input['item_id'] ?? 0);
$droneId = (int)($input['drone_id'] ?? 0); 

if (in_array($itemId, NON_SELLABLE_ITEM_IDS, true)) {
    echo json_encode(['error' => 'This item cannot be sold.']);
    exit;
}

$clampIndex = function(int $n): int {
    if ($n < 0) return 0;
    if ($n > 7) return 7;
    return $n;
};

try {
    $db->beginTransaction();
    if (function_exists('ensure_drone_design_equipped_table')) {
        ensure_drone_design_equipped_table($db);
    }

    
    $isDrone = ($itemId === 3 || $itemId === 5);

    $refundAmount = 0;
    $currency = 'credits';
    $itemName = 'Item';

    if ($isDrone) {
        
        
        

        
        
        $droneStrType = ($itemId === 3) ? 3 : 2;

        
        $stmt = $db->prepare("SELECT drones FROM users WHERE id = :id FOR UPDATE");
        $stmt->execute([':id' => $userId]);
        $userRow = $stmt->fetch(PDO::FETCH_ASSOC);

        
        $all = $db->prepare("SELECT id, item_id FROM drone WHERE player_id = :pid ORDER BY id ASC FOR UPDATE");
        $all->execute([':pid' => $userId]);
        $dronesAll = $all->fetchAll(PDO::FETCH_ASSOC);

        $countAll = count($dronesAll);
        if ($countAll <= 0) {
            throw new Exception("No drone available to sell.");
        }

        
        $target = null;
        $targetIndexGlobal = -1;

        if ($droneId > 0) {
            
            foreach ($dronesAll as $i => $r) {
                if ((int)$r['id'] === $droneId) {
                    $target = $r;
                    $targetIndexGlobal = $i;
                    break;
                }
            }
            if (!$target) {
                throw new Exception("Drone not found.");
            }
            if ((int)$target['item_id'] !== $itemId) {
                throw new Exception("This drone is not this type.");
            }
        } else {
            
            for ($i = $countAll - 1; $i >= 0; $i--) {
                if ((int)$dronesAll[$i]['item_id'] === $itemId) {
                    $target = $dronesAll[$i];
                    $targetIndexGlobal = $i;
                    $droneId = (int)$target['id'];
                    break;
                }
            }
            if (!$target) {
                throw new Exception("You do not have this drone type to sell.");
            }
        }

        $designCheck = $db->prepare("SELECT design_item_id FROM drone_design_equipped WHERE drone_id = :did LIMIT 1");
        $designCheck->execute([':did' => $droneId]);
        $equippedDesignId = (int)$designCheck->fetchColumn();
        if (in_array($equippedDesignId, NON_SELLABLE_ITEM_IDS, true)) {
            throw new Exception("This item cannot be sold.");
        }

        
        $typeIndex = 0;
        for ($i = 0; $i < $targetIndexGlobal; $i++) {
            if ((int)$dronesAll[$i]['item_id'] === $itemId) {
                $typeIndex++;
            }
        }

        $priceIndex = $clampIndex($typeIndex);

        if ($itemId === 3) {
            $basePrice = (int)($IRIS_PRICES[$priceIndex] ?? 0);
            $currency = 'uridium';
            $itemName = 'Iris Drone';
        } else {
            $basePrice = (int)($FLAX_PRICES[$priceIndex] ?? 0);
            $currency = 'credits';
            $itemName = 'Flax Drone';
        }

        if ($basePrice <= 0) {
            throw new Exception("Invalid drone price.");
        }

        $refundAmount = (int)floor($basePrice * 0.50);

        
        $db->prepare("DELETE FROM drone_design_equipped WHERE drone_id = :did")->execute([':did' => $droneId]);
        $db->prepare("DELETE FROM drone_slot_config WHERE drone_id = :did")->execute([':did' => $droneId]);
        $db->prepare("DELETE FROM drone_slot WHERE drone_id = :did")->execute([':did' => $droneId]);
        $db->prepare("DELETE FROM drone WHERE id = :did")->execute([':did' => $droneId]);

        
        $inv = $db->prepare("SELECT qty FROM player_inventory WHERE player_id = :pid AND item_id = :iid");
        $inv->execute([':pid' => $userId, ':iid' => $itemId]);
        $invRow = $inv->fetch(PDO::FETCH_ASSOC);
        if ($invRow && (int)$invRow['qty'] > 0) {
            if ((int)$invRow['qty'] === 1) {
                $db->prepare("DELETE FROM player_inventory WHERE player_id = :pid AND item_id = :iid")
                   ->execute([':pid' => $userId, ':iid' => $itemId]);
            } else {
                $db->prepare("UPDATE player_inventory SET qty = qty - 1 WHERE player_id = :pid AND item_id = :iid")
                   ->execute([':pid' => $userId, ':iid' => $itemId]);
            }
        }

        
        
        
        
        $sth = $db->prepare("SELECT item_id FROM drone WHERE player_id = :pid ORDER BY id ASC LIMIT 8");
        $sth->execute([':pid' => $userId]);

        $tokens = [];
        foreach ($sth->fetchAll(PDO::FETCH_COLUMN) as $iid) {
            $iid = (int)$iid;
            if ($iid === 3) {
                $tokens[] = "3/0"; 
            } elseif ($iid === 5) {
                $tokens[] = "2/0"; 
            }
        }

        $newString = implode("-", $tokens);
        if (empty($newString)) $newString = "";

        $updU = $db->prepare("UPDATE users SET drones = :d WHERE id = :id");
        $updU->execute([':d' => $newString, ':id' => $userId]);

    } else {
        
        
        
        if (!isset($PRICES[$itemId])) {
            throw new Exception("This item cannot be sold.");
        }

        $data = $PRICES[$itemId];
        $itemName = $data['name'];
        $currency = $data['currency'];
        $basePrice = (int)$data['price'];
        $refundAmount = (int)floor($basePrice * 0.50);

        
        $stmt = $db->prepare("SELECT qty FROM player_inventory WHERE player_id = :pid AND item_id = :iid");
        $stmt->execute([':pid' => $userId, ':iid' => $itemId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || (int)$row['qty'] < 1) {
            throw new Exception("You do not have this item.");
        }

        
        if ((int)$row['qty'] === 1) {
            $db->prepare("DELETE FROM player_inventory WHERE player_id = :pid AND item_id = :iid")
               ->execute([':pid' => $userId, ':iid' => $itemId]);
        } else {
            $db->prepare("UPDATE player_inventory SET qty = qty - 1 WHERE player_id = :pid AND item_id = :iid")
               ->execute([':pid' => $userId, ':iid' => $itemId]);
        }

        
        if ($itemId === 9001) {
            $designSel = $db->prepare("
                SELECT dde.drone_id
                FROM drone_design_equipped dde
                JOIN drone d ON d.id = dde.drone_id
                WHERE d.player_id = :pid AND dde.design_item_id = :iid
                ORDER BY dde.updated_at DESC, dde.drone_id DESC
                LIMIT 1
            ");
            $designSel->execute([':pid' => $userId, ':iid' => $itemId]);
            $equippedDroneId = (int)$designSel->fetchColumn();
            if ($equippedDroneId > 0) {
                $db->prepare("DELETE FROM drone_design_equipped WHERE drone_id = :did")
                   ->execute([':did' => $equippedDroneId]);
            }
        }

        
        $db->prepare("UPDATE ship_slot SET item_id = NULL
                      WHERE item_id = :iid
                        AND ship_config_id IN (SELECT id FROM ship_config WHERE player_id = :pid)
                      LIMIT 1")
           ->execute([':iid' => $itemId, ':pid' => $userId]);

        
        $db->prepare("UPDATE drone_slot_config SET item_id = NULL
                      WHERE item_id = :iid
                        AND drone_id IN (SELECT id FROM drone WHERE player_id = :pid)
                      LIMIT 1")
           ->execute([':iid' => $itemId, ':pid' => $userId]);
    }

    
    
    if (!in_array($currency, ['credits', 'uridium'], true)) {
        throw new Exception("Dev error: invalid currency.");
    }

    $sql = "UPDATE users SET $currency = $currency + :amount WHERE id = :id";
    $pay = $db->prepare($sql);
    $pay->execute([':amount' => $refundAmount, ':id' => $userId]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'msg' => "Sold: {$itemName} (+".number_format($refundAmount)." ".ucfirst($currency).")"
    ]);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['error' => $e->getMessage()]);
}
?>
