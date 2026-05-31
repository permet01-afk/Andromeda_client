<?php

class ShopPurchaseService
{
    private $db;
    private $playerId;
    private $loggingAvailable = true;
    private static $logSchemaChecked = false;

    private $allowedCurrencies = ['credits', 'uridium'];

    private $allowedUserColumns = [
        'ammo_lcb10',
        'ammo_mcb25',
        'ammo_mcb50',
        'ammo_sab50',
        'ammo_rsb75',
        'ammo_r310',
        'ammo_plt2021',
        'ammo_plt2026',
        'ammo_dcr250',
        'ammo_eco10',
        'ammo_ubr100',
        'ammo_hstrm01',
        'ammo_smb01',
        'ammo_ish01',
        'ammo_emp01',
        'logfiles',
        'booty_keys',
    ];

    public function __construct(PDO $db, int $playerId)
    {
        $this->db = $db;
        $this->playerId = $playerId;

        try {
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->db->exec('SET NAMES utf8mb4');
        } catch (Exception $e) {
            // Keep the page usable even if the connection refuses an option.
        }
    }

    public function buyInventoryItem(string $itemCode, int $itemId, int $qty, int $unitPrice, string $currency, string $displayName): string
    {
        $qty = max(1, min(1000000, $qty));
        $price = $this->safeCost($unitPrice, $qty);
        $currency = $this->assertCurrency($currency);

        return $this->runPurchase('shop_items', $itemCode, $displayName, $qty, $currency, $price, function () use ($itemId, $qty, $currency, $price) {
            $this->lockUser(['credits', 'uridium']);
            $this->assertBalance($currency, $price);
            $this->grantInventoryItem($this->playerId, $itemId, $qty);
            $this->debitCurrency($currency, $price);
        }, 'Bought: ' . number_format($qty) . 'x ' . $displayName);
    }

    public function buyUserColumn(string $itemCode, string $column, int $qty, int $unitPrice, string $currency, string $displayName): string
    {
        $qty = max(1, min(1000000, $qty));
        $price = $this->safeCost($unitPrice, $qty);
        $currency = $this->assertCurrency($currency);
        $column = $this->assertUserColumn($column);

        return $this->runPurchase('shop_ammo', $itemCode, $displayName, $qty, $currency, $price, function () use ($column, $qty, $currency, $price) {
            $this->lockUser(['credits', 'uridium']);
            $this->assertBalance($currency, $price);

            $sql = 'UPDATE users SET `' . $currency . '` = `' . $currency . '` - :cost_set, `' . $column . '` = `' . $column . '` + :qty WHERE id = :pid AND `' . $currency . '` >= :cost_check';
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':cost_set' => $price, ':cost_check' => $price, ':qty' => $qty, ':pid' => $this->playerId]);
            if ($stmt->rowCount() < 1) {
                throw new Exception('Not enough ' . ucfirst($currency) . '.');
            }
        }, 'Purchased ' . number_format($qty) . ' unit(s) of ' . strtoupper($itemCode));
    }

    public function buyDrone(string $droneCode, array $prices): string
    {
        $isIris = ($droneCode === 'iris');
        if (!$isIris && $droneCode !== 'flax') {
            return 'Error: Invalid drone.';
        }

        $currency = $isIris ? 'uridium' : 'credits';
        $displayName = $isIris ? 'Iris' : 'Flax';
        $itemId = $isIris ? 3 : 5;

        $pricePreview = 0;
        return $this->runPurchase('shop_drones', $droneCode, $displayName, 1, $currency, 0, function () use ($prices, $currency, $displayName, $itemId, &$pricePreview) {
            $user = $this->lockUser(['drones', 'credits', 'uridium']);
            $desired = $this->parseDroneItemIds((string)($user['drones'] ?? ''));

            try {
                $droneStmt = $this->db->prepare('SELECT item_id FROM drone WHERE player_id = :pid ORDER BY id ASC FOR UPDATE');
                $droneStmt->execute([':pid' => $this->playerId]);
                $tableDrones = [];
                foreach ($droneStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                    $tableDrones[] = ((int)($row['item_id'] ?? 3) === 5) ? 5 : 3;
                }
                if (count($tableDrones) > count($desired)) {
                    $desired = $tableDrones;
                }
            } catch (Exception $e) {
                // Legacy installs may not have the drone table yet.
            }

            if (count($desired) >= 8) {
                throw new Exception('Max Drones reached (8).');
            }

            $sameTypeOwned = 0;
            foreach ($desired as $ownedItemId) {
                if ((int)$ownedItemId === $itemId) {
                    $sameTypeOwned++;
                }
            }
            $idx = max(0, min(7, $sameTypeOwned));
            $price = (int)($prices[$idx] ?? 0);
            if ($price <= 0) {
                throw new Exception('Invalid drone price.');
            }
            $pricePreview = $price;

            $this->assertBalance($currency, $price);

            $desired[] = $itemId;
            $this->db->prepare('UPDATE users SET drones = :drones WHERE id = :pid')
                ->execute([':drones' => $this->buildDronesString($desired), ':pid' => $this->playerId]);

            $this->grantInventoryItem($this->playerId, $itemId, 1);
            $this->syncDronesTables($this->playerId, $desired);
            $this->debitCurrency($currency, $price);
        }, 'Bought: ' . $displayName, function () use (&$pricePreview) {
            return $pricePreview;
        });
    }

    public function buyDesign(int $designId, array $data): string
    {
        $currency = $this->assertCurrency((string)$data['currency']);
        $price = (int)$data['price'];
        $name = (string)$data['name'];

        return $this->runPurchase('shop_designs', 'design' . $designId, $name, 1, $currency, $price, function () use ($designId, $currency, $price) {
            $this->lockUser(['credits', 'uridium']);

            $check = $this->db->prepare('SELECT COUNT(*) FROM player_designs WHERE player_id = :pid AND design_id = :did');
            $check->execute([':pid' => $this->playerId, ':did' => $designId]);
            if ((int)$check->fetchColumn() > 0) {
                throw new Exception('You already own this design.');
            }

            $this->assertBalance($currency, $price);
            $this->db->prepare('INSERT INTO player_designs (player_id, design_id) VALUES (:pid, :did)')
                ->execute([':pid' => $this->playerId, ':did' => $designId]);
            $this->debitCurrency($currency, $price);
        }, 'Congratulations! You purchased the ' . $name . '. You can equip it in the Configurations tab.');
    }

    public function buyShip(int $shipId, array $data): string
    {
        $currency = $this->assertCurrency((string)$data['currency']);
        $price = (int)$data['price'];
        $name = (string)$data['name'];

        return $this->runPurchase('shop_ships', 'ship' . $shipId, $name, 1, $currency, $price, function () use ($shipId, $data, $currency, $price) {
            $user = $this->lockUser(['credits', 'uridium', 'shipId']);
            $oldId = (int)($user['shipId'] ?? 1);
            if ($oldId === $shipId) {
                throw new Exception('You are already flying this ship.');
            }

            $this->assertBalance($currency, $price);

            $oldCfgQ = $this->db->prepare('SELECT id FROM ship_config WHERE player_id = :pid AND ship_design_id = :sid');
            $oldCfgQ->execute([':pid' => $this->playerId, ':sid' => $oldId]);
            $oldCfgs = $oldCfgQ->fetchAll(PDO::FETCH_COLUMN);
            if (!empty($oldCfgs)) {
                $ids = implode(',', array_map('intval', $oldCfgs));
                $this->db->exec('UPDATE ship_slot SET item_id = NULL WHERE ship_config_id IN (' . $ids . ')');
                try {
                    $this->db->exec('UPDATE ship_config_stats SET damage_total = 0, shield_total = 0 WHERE ship_config_id IN (' . $ids . ')');
                } catch (Exception $e) {
                    // Optional table on some installs.
                }
            }

            $upd = $this->db->prepare('UPDATE users SET `' . $currency . '` = `' . $currency . '` - :cost_set, shipId = :sid, max_hp = :hp WHERE id = :pid AND `' . $currency . '` >= :cost_check');
            $upd->execute([
                ':cost_set' => $price,
                ':cost_check' => $price,
                ':sid' => $shipId,
                ':hp' => (int)$data['hp'],
                ':pid' => $this->playerId,
            ]);
            if ($upd->rowCount() < 1) {
                throw new Exception('Not enough ' . ucfirst($currency) . '.');
            }

            $this->ensureShipConfigsAndSlots($this->playerId, $shipId, (int)$data['lasers'], (int)$data['gens'], (int)$data['extras']);
        }, 'Transaction successful! ' . $name . ' equipped. Previous equipment moved to inventory.');
    }

    public function buyBooster(string $boosterCode, string $column, int $hours, int $pricePerHour, string $displayName): string
    {
        $allowed = ['booster_dmg_time', 'booster_hp_time', 'booster_shd_time'];
        if (!in_array($column, $allowed, true)) {
            return 'Error: Invalid booster.';
        }

        $hours = max(1, min(720, $hours));
        $price = $this->safeCost($pricePerHour, $hours);

        return $this->runPurchase('shop_boosters', $boosterCode, $displayName, $hours, 'uridium', $price, function () use ($column, $hours, $price) {
            $user = $this->lockUser(['uridium', $column]);
            $current = (int)($user[$column] ?? 0);
            $newTime = (($current > time()) ? $current : time()) + (3600 * $hours);

            $stmt = $this->db->prepare('UPDATE users SET uridium = uridium - :cost_set, `' . $column . '` = :new_time WHERE id = :pid AND uridium >= :cost_check');
            $stmt->execute([':cost_set' => $price, ':cost_check' => $price, ':new_time' => $newTime, ':pid' => $this->playerId]);
            if ($stmt->rowCount() < 1) {
                throw new Exception('Not enough Uridium.');
            }
        }, 'Purchase success !');
    }

    public function buyHpUpgrade(): string
    {
        $pricePreview = 0;
        return $this->runPurchase('user_upgrades', 'healt_upgrade', 'HP Upgrade', 1, 'uridium', 0, function () use (&$pricePreview) {
            $user = $this->lockUser(['uridium', 'hp_lvl', 'max_hp']);
            $level = (int)($user['hp_lvl'] ?? 0);
            if ($level >= 10) {
                throw new Exception('Maximum level reached.');
            }

            $price = (int)(pow($level * 20, 2) + 100);
            $pricePreview = $price;
            $this->assertBalance('uridium', $price);

            $stmt = $this->db->prepare('UPDATE users SET uridium = uridium - :cost_set, max_hp = max_hp + 5000, hp_lvl = hp_lvl + 1 WHERE id = :pid AND uridium >= :cost_check AND hp_lvl = :level');
            $stmt->execute([':cost_set' => $price, ':cost_check' => $price, ':pid' => $this->playerId, ':level' => $level]);
            if ($stmt->rowCount() < 1) {
                throw new Exception('Not enough uridium or maximum level reached.');
            }
        }, 'Purchase success !', function () use (&$pricePreview) {
            return $pricePreview;
        });
    }

    private function runPurchase(string $source, string $itemCode, string $itemName, int $qty, string $currency, int $price, callable $callback, string $successMessage, callable $priceResolver = null): string
    {
        try {
            $this->db->beginTransaction();
            $callback();
            if ($priceResolver !== null) {
                $price = (int)$priceResolver();
            }
            $this->db->commit();
            $this->logPurchase($source, $itemCode, $itemName, $qty, $currency, $price, 'success', $successMessage);
            return $successMessage;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($priceResolver !== null) {
                $price = (int)$priceResolver();
            }
            $message = $this->friendlyError($e->getMessage());
            $this->logPurchase($source, $itemCode, $itemName, $qty, $currency, $price, 'failed', $message);
            return $message;
        }
    }

    private function installLogSchema(): void
    {
        try {
            $this->db->exec("CREATE TABLE IF NOT EXISTS site_purchase_log (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                player_id INT NOT NULL,
                source VARCHAR(40) NOT NULL,
                item_code VARCHAR(80) NOT NULL,
                item_name VARCHAR(160) DEFAULT NULL,
                quantity INT NOT NULL DEFAULT 1,
                currency VARCHAR(20) DEFAULT NULL,
                price INT NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL,
                message VARCHAR(255) DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_player_created (player_id, created_at),
                KEY idx_status_created (status, created_at),
                KEY idx_source_created (source, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (Exception $e) {
            $this->loggingAvailable = false;
        }
    }

    private function logPurchase(string $source, string $itemCode, string $itemName, int $qty, string $currency, int $price, string $status, string $message): void
    {
        if (!self::$logSchemaChecked) {
            $this->installLogSchema();
            self::$logSchemaChecked = true;
        }

        if (!$this->loggingAvailable) {
            return;
        }

        try {
            $stmt = $this->db->prepare('INSERT INTO site_purchase_log (player_id, source, item_code, item_name, quantity, currency, price, status, message) VALUES (:pid, :source, :code, :name, :qty, :currency, :price, :status, :message)');
            $stmt->execute([
                ':pid' => $this->playerId,
                ':source' => substr($source, 0, 40),
                ':code' => substr($itemCode, 0, 80),
                ':name' => substr($itemName, 0, 160),
                ':qty' => max(1, $qty),
                ':currency' => substr($currency, 0, 20),
                ':price' => max(0, $price),
                ':status' => substr($status, 0, 20),
                ':message' => substr($message, 0, 255),
            ]);
        } catch (Exception $e) {
            // Logging must never block an actual shop action.
        }
    }

    private function lockUser(array $columns): array
    {
        $safe = [];
        foreach ($columns as $column) {
            if (!preg_match('/^[A-Za-z0-9_]+$/', (string)$column)) {
                continue;
            }
            $safe[] = '`' . $column . '`';
        }
        if (empty($safe)) {
            $safe[] = 'id';
        }

        $sql = 'SELECT ' . implode(', ', array_unique($safe)) . ' FROM users WHERE id = :pid LIMIT 1 FOR UPDATE';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':pid' => $this->playerId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            throw new Exception('User not found.');
        }
        return $user;
    }

    private function assertBalance(string $currency, int $price): void
    {
        if ($price <= 0) {
            return;
        }

        $stmt = $this->db->prepare('SELECT `' . $currency . '` FROM users WHERE id = :pid LIMIT 1');
        $stmt->execute([':pid' => $this->playerId]);
        if ((int)$stmt->fetchColumn() < $price) {
            throw new Exception('Not enough ' . ucfirst($currency) . '.');
        }
    }

    private function debitCurrency(string $currency, int $price): void
    {
        if ($price <= 0) {
            return;
        }

        $stmt = $this->db->prepare('UPDATE users SET `' . $currency . '` = `' . $currency . '` - :price_set WHERE id = :pid AND `' . $currency . '` >= :price_check');
        $stmt->execute([':price_set' => $price, ':price_check' => $price, ':pid' => $this->playerId]);
        if ($stmt->rowCount() < 1) {
            throw new Exception('Not enough ' . ucfirst($currency) . '.');
        }
    }

    private function grantInventoryItem(int $playerId, int $itemId, int $qty): void
    {
        $qty = max(1, $qty);

        $stmt = $this->db->prepare('SELECT qty FROM player_inventory WHERE player_id = :pid AND item_id = :iid FOR UPDATE');
        $stmt->execute([':pid' => $playerId, ':iid' => $itemId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($rows)) {
            $total = $qty;
            foreach ($rows as $row) {
                $total += (int)($row['qty'] ?? 0);
            }

            $this->db->prepare('DELETE FROM player_inventory WHERE player_id = :pid AND item_id = :iid')
                ->execute([':pid' => $playerId, ':iid' => $itemId]);
            $this->db->prepare('INSERT INTO player_inventory (player_id, item_id, qty) VALUES (:pid, :iid, :qty)')
                ->execute([':pid' => $playerId, ':iid' => $itemId, ':qty' => $total]);
        } else {
            $this->db->prepare('INSERT INTO player_inventory (player_id, item_id, qty) VALUES (:pid, :iid, :qty)')
                ->execute([':pid' => $playerId, ':iid' => $itemId, ':qty' => $qty]);
        }
    }

    private function ensureShipConfigsAndSlots(int $playerId, int $shipId, int $lasers, int $gens, int $extras): void
    {
        $this->db->prepare("INSERT IGNORE INTO ship_config (player_id, ship_design_id, name, lasers_slots, gen_slots, extras_slots)
            VALUES (:p_a, :s_a, 'A', :l_a, :g_a, :e_a), (:p_b, :s_b, 'B', :l_b, :g_b, :e_b)")
            ->execute([
                ':p_a' => $playerId, ':s_a' => $shipId, ':l_a' => $lasers, ':g_a' => $gens, ':e_a' => $extras,
                ':p_b' => $playerId, ':s_b' => $shipId, ':l_b' => $lasers, ':g_b' => $gens, ':e_b' => $extras,
            ]);

        $this->db->prepare('UPDATE ship_config SET lasers_slots = :l_set, gen_slots = :g_set, extras_slots = :e_set WHERE player_id = :p AND ship_design_id = :s AND (lasers_slots <> :l_chk OR gen_slots <> :g_chk OR extras_slots <> :e_chk)')
            ->execute([':p' => $playerId, ':s' => $shipId, ':l_set' => $lasers, ':g_set' => $gens, ':e_set' => $extras, ':l_chk' => $lasers, ':g_chk' => $gens, ':e_chk' => $extras]);

        $stmt = $this->db->prepare('SELECT id, lasers_slots, gen_slots, extras_slots FROM ship_config WHERE player_id = :p AND ship_design_id = :s');
        $stmt->execute([':p' => $playerId, ':s' => $shipId]);
        $configs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (empty($configs)) {
            throw new Exception('Unable to create ship configurations.');
        }

        $slotIns = $this->db->prepare('INSERT IGNORE INTO ship_slot (ship_config_id, row_name, slot_index) VALUES (:c, :r, :i)');
        foreach ($configs as $config) {
            $rows = [
                ['lasers', (int)$config['lasers_slots']],
                ['generators', (int)$config['gen_slots']],
                ['extras', (int)$config['extras_slots']],
            ];
            foreach ($rows as $row) {
                for ($i = 0; $i < $row[1]; $i++) {
                    $slotIns->execute([':c' => (int)$config['id'], ':r' => $row[0], ':i' => $i]);
                }
            }
        }
    }

    private function syncDronesTables(int $playerId, array $desiredItemIds): void
    {
        $desiredItemIds = array_values(array_slice($desiredItemIds, 0, 8));
        if (empty($desiredItemIds)) {
            return;
        }

        try {
            $this->db->exec("CREATE TABLE IF NOT EXISTS drone_slot_config (
                drone_id INT(11) NOT NULL,
                config CHAR(1) NOT NULL,
                slot_index TINYINT(4) NOT NULL,
                item_id INT(11) DEFAULT NULL,
                PRIMARY KEY (drone_id, config, slot_index),
                KEY idx_drone_config (drone_id, config)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $cur = $this->db->prepare('SELECT id, item_id, name FROM drone WHERE player_id = :pid ORDER BY id ASC FOR UPDATE');
            $cur->execute([':pid' => $playerId]);
            $rows = $cur->fetchAll(PDO::FETCH_ASSOC);
            $have = count($rows);
            $want = count($desiredItemIds);

            $existingNames = [];
            $maxNum = ['Iris' => 0, 'Flax' => 0];
            foreach ($rows as $row) {
                $name = trim((string)($row['name'] ?? ''));
                if ($name !== '') {
                    $existingNames[strtolower($name)] = true;
                }
                if (preg_match('/^(iris|flax)\s*#?\s*(\d+)\s*$/i', $name, $m)) {
                    $label = ucfirst(strtolower($m[1]));
                    $num = (int)$m[2];
                    if ($num > ($maxNum[$label] ?? 0)) {
                        $maxNum[$label] = $num;
                    }
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

            $insDrone = $this->db->prepare('INSERT INTO drone (player_id, name, item_id, level) VALUES (:p, :n, :iid, 6)');
            $updDroneItem = $this->db->prepare('UPDATE drone SET item_id = :iid WHERE id = :id AND (item_id IS NULL OR item_id = 0)');
            $insGlobalSlot = null;
            try {
                $insGlobalSlot = $this->db->prepare('INSERT IGNORE INTO drone_slot (drone_id, slot_index, item_id) VALUES (:d, :s, NULL)');
            } catch (Exception $e) {
                // Some old installs do not use the legacy drone_slot table.
                $insGlobalSlot = null;
            }
            $insCfgSlot = $this->db->prepare('INSERT IGNORE INTO drone_slot_config (drone_id, config, slot_index, item_id) VALUES (:d, :c, :s, NULL)');

            if ($have < $want) {
                for ($i = $have; $i < $want; $i++) {
                    $itemId = (int)($desiredItemIds[$i] ?? 3);
                    $label = ($itemId === 5) ? 'Flax' : 'Iris';
                    $insDrone->execute([':p' => $playerId, ':n' => $makeUniqueName($label), ':iid' => $itemId]);
                    $droneId = (int)$this->db->lastInsertId();
                    $slotCount = $this->droneSlotCountFromItem($itemId);
                    for ($slot = 0; $slot < $slotCount; $slot++) {
                        if ($insGlobalSlot !== null) {
                            try {
                                $insGlobalSlot->execute([':d' => $droneId, ':s' => $slot]);
                            } catch (Exception $e) {
                                // The config-specific slots are enough for the web UI.
                            }
                        }
                        $insCfgSlot->execute([':d' => $droneId, ':c' => 'A', ':s' => $slot]);
                        $insCfgSlot->execute([':d' => $droneId, ':c' => 'B', ':s' => $slot]);
                    }
                }
                $cur->execute([':pid' => $playerId]);
                $rows = $cur->fetchAll(PDO::FETCH_ASSOC);
            }

            foreach ($rows as $idx => $row) {
                if ($idx >= $want) {
                    break;
                }
                $droneId = (int)$row['id'];
                $desiredItem = (int)($desiredItemIds[$idx] ?? ($row['item_id'] ?? 3));
                $updDroneItem->execute([':iid' => $desiredItem, ':id' => $droneId]);
                $actualItem = (int)($row['item_id'] ?? 0);
                if ($actualItem <= 0) {
                    $actualItem = $desiredItem;
                }
                $slotCount = $this->droneSlotCountFromItem($actualItem);
                for ($slot = 0; $slot < $slotCount; $slot++) {
                    if ($insGlobalSlot !== null) {
                        try {
                            $insGlobalSlot->execute([':d' => $droneId, ':s' => $slot]);
                        } catch (Exception $e) {
                            // The config-specific slots are enough for the web UI.
                        }
                    }
                    $insCfgSlot->execute([':d' => $droneId, ':c' => 'A', ':s' => $slot]);
                    $insCfgSlot->execute([':d' => $droneId, ':c' => 'B', ':s' => $slot]);
                }
            }
        } catch (Exception $e) {
            throw new Exception('Unable to create drone after purchase.');
        }
    }

    private function parseDroneItemIds(string $dronesStr): array
    {
        $dronesStr = trim($dronesStr);
        if ($dronesStr === '') {
            return [];
        }

        $parts = preg_split('/-+/', $dronesStr, -1, PREG_SPLIT_NO_EMPTY);
        if (!is_array($parts)) {
            return [];
        }

        $items = [];
        foreach ($parts as $part) {
            $before = trim(explode('/', trim((string)$part), 2)[0]);
            if ($before === '' || !ctype_digit($before)) {
                continue;
            }

            $type = (int)$before;
            if ($type === 3 || $type === 25) {
                $items[] = 3;
            } elseif ($type === 2 || $type === 5 || $type === 15) {
                $items[] = 5;
            }

            if (count($items) >= 8) {
                break;
            }
        }
        return $items;
    }

    private function buildDronesString(array $itemIds): string
    {
        $tokens = [];
        foreach (array_slice($itemIds, 0, 8) as $itemId) {
            $tokens[] = ((int)$itemId === 5) ? '2/0' : '3/0';
        }
        return implode('-', $tokens);
    }

    private function droneSlotCountFromItem(int $itemId): int
    {
        return ($itemId === 5) ? 1 : 2;
    }

    private function assertCurrency(string $currency): string
    {
        $currency = strtolower(trim($currency));
        if (!in_array($currency, $this->allowedCurrencies, true)) {
            throw new Exception('Invalid currency.');
        }
        return $currency;
    }

    private function assertUserColumn(string $column): string
    {
        if (!in_array($column, $this->allowedUserColumns, true)) {
            throw new Exception('Invalid item target.');
        }
        return $column;
    }

    private function safeCost(int $unitPrice, int $qty): int
    {
        $unitPrice = max(0, $unitPrice);
        $qty = max(1, $qty);
        $cost = $unitPrice * $qty;
        if ($cost < 0 || $cost > 2147483647) {
            throw new Exception('Invalid purchase amount.');
        }
        return $cost;
    }

    private function friendlyError(string $message): string
    {
        $message = trim($message);
        if ($message === '') {
            $message = 'Purchase failed.';
        }
        if (stripos($message, 'error') === 0) {
            return $message;
        }
        return 'Error: ' . $message;
    }
}
