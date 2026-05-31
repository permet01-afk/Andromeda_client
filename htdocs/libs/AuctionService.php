<?php

class AuctionService
{
    const TIMEZONE = 'Europe/Paris';

    private $db;
    private $playerId;

    public function __construct(PDO $db, int $playerId = 0)
    {
        $this->db = $db;
        $this->playerId = $playerId;

        try {
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->db->exec('SET NAMES utf8mb4');
        } catch (Exception $e) {
            // Keep the site usable even if the connection does not accept the option.
        }
    }

    public function preparePage(): array
    {
        $this->installSchema();
        $this->syncCatalog();
        $this->refreshUnbidLotsFromCatalog();
        $this->settleExpiredRounds();

        return $this->getState();
    }

    public function runMaintenance(): array
    {
        $this->installSchema();
        $this->syncCatalog();
        $this->refreshUnbidLotsFromCatalog();
        $settled = $this->settleExpiredRounds();
        $state = $this->getState(false);

        return [
            'settled_rounds' => $settled,
            'auction_open' => (bool)$state['schedule']['is_open'],
            'server_time' => $state['schedule']['now_label'],
        ];
    }

    public function placeBid(int $lotId, int $bidCredits): string
    {
        if ($this->playerId <= 0) {
            throw new Exception('Invalid player session.');
        }

        $this->installSchema();
        $this->syncCatalog();
        $this->refreshUnbidLotsFromCatalog();
        $this->settleExpiredRounds();

        $schedule = $this->getScheduleInfo();
        if (!$schedule['is_open']) {
            throw new Exception('Auction is currently closed.');
        }

        if ($bidCredits <= 0) {
            throw new Exception('Invalid bid amount.');
        }

        $nowSql = $this->sqlDate($this->now());

        try {
            $this->db->beginTransaction();

            $lotStmt = $this->db->prepare(
                "SELECT l.*, r.status AS round_status, r.ends_at, ai.code, ai.name, ai.grant_type, ai.ref_id, ai.qty
                 FROM auction_lots l
                 INNER JOIN auction_rounds r ON r.id = l.round_id
                 INNER JOIN auction_items ai ON ai.id = l.auction_item_id
                 WHERE l.id = :lot_id
                 LIMIT 1
                 FOR UPDATE"
            );
            $lotStmt->execute([':lot_id' => $lotId]);
            $lot = $lotStmt->fetch(PDO::FETCH_ASSOC);
            if (!$lot) {
                throw new Exception('Auction lot not found.');
            }

            if ((string)$lot['round_status'] !== 'active' || strtotime((string)$lot['ends_at']) <= strtotime($nowSql)) {
                throw new Exception('This auction round is closed.');
            }

            $item = [
                'code' => (string)$lot['code'],
                'name' => (string)$lot['name'],
                'grant_type' => (string)$lot['grant_type'],
                'ref_id' => (string)$lot['ref_id'],
                'qty' => (int)$lot['qty'],
            ];
            $this->assertCanReceiveItem($this->playerId, $item);

            $currentBid = (int)$lot['current_bid_credits'];
            $minIncrement = max(1, (int)$lot['min_increment_credits']);
            $minimumRequired = $currentBid + $minIncrement;

            if ($bidCredits < $minimumRequired) {
                throw new Exception('Your bid must be at least ' . number_format($minimumRequired) . ' Credits.');
            }

            $previousBidderId = $lot['current_bidder_id'] !== null ? (int)$lot['current_bidder_id'] : null;
            $previousBid = (int)$lot['current_bid_credits'];
            $isOwnIncrease = ($previousBidderId !== null && $previousBidderId === $this->playerId);
            $creditsToPay = $isOwnIncrease ? ($bidCredits - $previousBid) : $bidCredits;

            if ($creditsToPay <= 0) {
                throw new Exception('Invalid bid increase.');
            }

            $userStmt = $this->db->prepare('SELECT credits FROM users WHERE id = :id LIMIT 1 FOR UPDATE');
            $userStmt->execute([':id' => $this->playerId]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);
            if (!$user) {
                throw new Exception('Player not found.');
            }

            if ((int)$user['credits'] < $creditsToPay) {
                throw new Exception('Not enough Credits.');
            }

            $payStmt = $this->db->prepare('UPDATE users SET credits = credits - :amount WHERE id = :id');
            $payStmt->execute([':amount' => $creditsToPay, ':id' => $this->playerId]);

            if (!$isOwnIncrease && $previousBidderId !== null && $previousBid > 0) {
                $refundStmt = $this->db->prepare('UPDATE users SET credits = credits + :amount WHERE id = :id');
                $refundStmt->execute([':amount' => $previousBid, ':id' => $previousBidderId]);
            }

            $bidStmt = $this->db->prepare(
                'INSERT INTO auction_bids (lot_id, player_id, bid_credits, previous_bidder_id, previous_bid_credits)
                 VALUES (:lot_id, :player_id, :bid_credits, :previous_bidder_id, :previous_bid_credits)'
            );
            $bidStmt->execute([
                ':lot_id' => $lotId,
                ':player_id' => $this->playerId,
                ':bid_credits' => $bidCredits,
                ':previous_bidder_id' => $previousBidderId,
                ':previous_bid_credits' => $previousBid,
            ]);

            $updateLot = $this->db->prepare(
                'UPDATE auction_lots
                 SET current_bid_credits = :bid, current_bidder_id = :bidder
                 WHERE id = :lot_id'
            );
            $updateLot->execute([
                ':bid' => $bidCredits,
                ':bidder' => $this->playerId,
                ':lot_id' => $lotId,
            ]);

            $this->db->commit();

            return 'Bid accepted. You are now the highest bidder for ' . $lot['name'] . '.';
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    private function installSchema(): void
    {
        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS auction_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(64) NOT NULL UNIQUE,
                name VARCHAR(128) NOT NULL,
                category VARCHAR(64) NOT NULL,
                description VARCHAR(255) DEFAULT NULL,
                image_path VARCHAR(255) DEFAULT NULL,
                grant_type VARCHAR(32) NOT NULL,
                ref_id VARCHAR(64) NOT NULL,
                qty INT NOT NULL DEFAULT 1,
                uridium_value INT NOT NULL DEFAULT 0,
                starting_bid_credits BIGINT NOT NULL DEFAULT 0,
                min_increment_credits BIGINT NOT NULL DEFAULT 1,
                enabled TINYINT(1) NOT NULL DEFAULT 1,
                sort_order INT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY idx_enabled_sort (enabled, sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS auction_rounds (
                id INT AUTO_INCREMENT PRIMARY KEY,
                round_key VARCHAR(32) NOT NULL UNIQUE,
                starts_at DATETIME NOT NULL,
                ends_at DATETIME NOT NULL,
                daily_round TINYINT NOT NULL DEFAULT 1,
                status VARCHAR(16) NOT NULL DEFAULT 'active',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                closed_at DATETIME DEFAULT NULL,
                KEY idx_status_ends (status, ends_at),
                KEY idx_starts (starts_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS auction_lots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                round_id INT NOT NULL,
                auction_item_id INT NOT NULL,
                starting_bid_credits BIGINT NOT NULL DEFAULT 0,
                min_increment_credits BIGINT NOT NULL DEFAULT 1,
                current_bid_credits BIGINT NOT NULL DEFAULT 0,
                current_bidder_id INT DEFAULT NULL,
                settled TINYINT(1) NOT NULL DEFAULT 0,
                settled_at DATETIME DEFAULT NULL,
                UNIQUE KEY uniq_round_item (round_id, auction_item_id),
                KEY idx_round (round_id),
                KEY idx_bidder (current_bidder_id),
                KEY idx_settled (settled)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS auction_bids (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                lot_id INT NOT NULL,
                player_id INT NOT NULL,
                bid_credits BIGINT NOT NULL,
                previous_bidder_id INT DEFAULT NULL,
                previous_bid_credits BIGINT NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                KEY idx_lot_created (lot_id, created_at),
                KEY idx_player_created (player_id, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS auction_wins (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                round_id INT NOT NULL,
                lot_id INT NOT NULL UNIQUE,
                player_id INT NOT NULL,
                auction_item_id INT NOT NULL,
                final_bid_credits BIGINT NOT NULL,
                grant_status VARCHAR(16) NOT NULL DEFAULT 'pending',
                error_message VARCHAR(255) DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                granted_at DATETIME DEFAULT NULL,
                KEY idx_player_created (player_id, created_at),
                KEY idx_round (round_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS drone_slot_config (
                drone_id INT(11) NOT NULL,
                config CHAR(1) NOT NULL,
                slot_index TINYINT(4) NOT NULL,
                item_id INT(11) DEFAULT NULL,
                PRIMARY KEY (drone_id, config, slot_index),
                KEY idx_drone_config (drone_id, config)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    }

    private function syncCatalog(): void
    {
        $stmt = $this->db->prepare(
            "INSERT INTO auction_items
                (code, name, category, description, image_path, grant_type, ref_id, qty, uridium_value, starting_bid_credits, min_increment_credits, enabled, sort_order)
             VALUES
                (:code, :name, :category, :description, :image_path, :grant_type, :ref_id, :qty, :uridium_value, :starting_bid_credits, :min_increment_credits, :enabled, :sort_order)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                category = VALUES(category),
                description = VALUES(description),
                image_path = VALUES(image_path),
                grant_type = VALUES(grant_type),
                ref_id = VALUES(ref_id),
                qty = VALUES(qty),
                uridium_value = VALUES(uridium_value),
                starting_bid_credits = VALUES(starting_bid_credits),
                min_increment_credits = VALUES(min_increment_credits),
                enabled = VALUES(enabled),
                sort_order = VALUES(sort_order)"
        );

        foreach ($this->catalog() as $item) {
            $stmt->execute([
                ':code' => $item['code'],
                ':name' => $item['name'],
                ':category' => $item['category'],
                ':description' => $item['description'],
                ':image_path' => $item['image_path'],
                ':grant_type' => $item['grant_type'],
                ':ref_id' => (string)$item['ref_id'],
                ':qty' => (int)$item['qty'],
                ':uridium_value' => (int)$item['uridium_value'],
                ':starting_bid_credits' => (int)$item['starting_bid_credits'],
                ':min_increment_credits' => (int)$item['min_increment_credits'],
                ':enabled' => 1,
                ':sort_order' => (int)$item['sort_order'],
            ]);
        }

        $this->syncActiveUnsoldLotsFromCatalog();
    }

    private function syncActiveUnsoldLotsFromCatalog(): void
    {
        $this->db->exec(
            "UPDATE auction_lots l
             INNER JOIN auction_items ai ON ai.id = l.auction_item_id
             INNER JOIN auction_rounds r ON r.id = l.round_id
             SET
                l.starting_bid_credits = ai.starting_bid_credits,
                l.min_increment_credits = ai.min_increment_credits,
                l.current_bid_credits = ai.starting_bid_credits
             WHERE r.status = 'active'
               AND l.settled = 0
               AND l.current_bidder_id IS NULL"
        );
    }

    private function refreshUnbidLotsFromCatalog(): void
    {
        try {
            $this->db->exec(
                "UPDATE auction_lots l
                 INNER JOIN auction_items ai ON ai.id = l.auction_item_id
                 SET
                    l.starting_bid_credits = ai.starting_bid_credits,
                    l.min_increment_credits = ai.min_increment_credits,
                    l.current_bid_credits = ai.starting_bid_credits
                 WHERE l.current_bidder_id IS NULL
                   AND l.settled = 0"
            );
        } catch (Exception $e) {
            // Keep existing active bids untouched. Only unbid lots are refreshed after catalog updates.
        }
    }

    private function getState(bool $ensureActiveRound = true): array
    {
        $schedule = $this->getScheduleInfo();
        $round = null;
        $lots = [];

        if ($schedule['is_open'] && $ensureActiveRound) {
            $round = $this->ensureActiveRound($schedule);
            $lots = $this->getRoundLots((int)$round['id']);
        } else {
            $lots = $this->getCatalogPreviewLots();
        }

        return [
            'schedule' => $schedule,
            'round' => $round,
            'lots' => $lots,
            'daily_windows' => $this->dailyWindows(),
        ];
    }

    private function getScheduleInfo(): array
    {
        $now = $this->now();
        $today = $now->format('Y-m-d');
        $windows = $this->dailyWindows();
        $active = null;
        $next = null;

        foreach ($windows as $index => $window) {
            $start = new DateTimeImmutable($today . ' ' . $window[0] . ':00', $now->getTimezone());
            $end = new DateTimeImmutable($today . ' ' . $window[1] . ':00', $now->getTimezone());

            if ($now >= $start && $now < $end) {
                $active = [
                    'round_number' => $index + 1,
                    'start' => $start,
                    'end' => $end,
                    'key' => $start->format('Ymd') . '-' . ($index + 1),
                ];
                break;
            }

            if ($now < $start && $next === null) {
                $next = [
                    'round_number' => $index + 1,
                    'start' => $start,
                    'end' => $end,
                    'key' => $start->format('Ymd') . '-' . ($index + 1),
                ];
            }
        }

        if ($next === null) {
            $tomorrow = $now->modify('+1 day')->format('Y-m-d');
            $first = $windows[0];
            $start = new DateTimeImmutable($tomorrow . ' ' . $first[0] . ':00', $now->getTimezone());
            $end = new DateTimeImmutable($tomorrow . ' ' . $first[1] . ':00', $now->getTimezone());
            $next = [
                'round_number' => 1,
                'start' => $start,
                'end' => $end,
                'key' => $start->format('Ymd') . '-1',
            ];
        }

        $target = $active ? $active['end'] : $next['start'];

        return [
            'is_open' => $active !== null,
            'round_number' => $active ? $active['round_number'] : null,
            'round_key' => $active ? $active['key'] : null,
            'starts_at' => $active ? $this->sqlDate($active['start']) : null,
            'ends_at' => $active ? $this->sqlDate($active['end']) : null,
            'next_round_number' => $next['round_number'],
            'next_starts_at' => $this->sqlDate($next['start']),
            'next_ends_at' => $this->sqlDate($next['end']),
            'target_timestamp' => $target->getTimestamp(),
            'now_timestamp' => $now->getTimestamp(),
            'now_label' => $now->format('Y-m-d H:i:s T'),
            'timezone' => self::TIMEZONE,
        ];
    }

    private function ensureActiveRound(array $schedule): array
    {
        $stmt = $this->db->prepare('SELECT * FROM auction_rounds WHERE round_key = :round_key LIMIT 1');
        $stmt->execute([':round_key' => $schedule['round_key']]);
        $round = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$round) {
            $insert = $this->db->prepare(
                'INSERT INTO auction_rounds (round_key, starts_at, ends_at, daily_round, status)
                 VALUES (:round_key, :starts_at, :ends_at, :daily_round, :status)'
            );
            $insert->execute([
                ':round_key' => $schedule['round_key'],
                ':starts_at' => $schedule['starts_at'],
                ':ends_at' => $schedule['ends_at'],
                ':daily_round' => (int)$schedule['round_number'],
                ':status' => 'active',
            ]);

            $stmt->execute([':round_key' => $schedule['round_key']]);
            $round = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if ((string)$round['status'] !== 'active') {
            return $round;
        }

        $this->ensureLots((int)$round['id']);
        return $round;
    }

    private function ensureLots(int $roundId): void
    {

        // Keep existing, not-yet-bid lots aligned with the current catalog after a patch.
        // Lots with a current bidder are never modified, so active bids stay safe.
        $syncUnbidLots = $this->db->prepare(
            'UPDATE auction_lots l
             INNER JOIN auction_items ai ON ai.id = l.auction_item_id
             SET l.starting_bid_credits = ai.starting_bid_credits,
                 l.min_increment_credits = ai.min_increment_credits,
                 l.current_bid_credits = ai.starting_bid_credits
             WHERE l.round_id = :round_id
               AND l.current_bidder_id IS NULL
               AND ai.enabled = 1'
        );
        $syncUnbidLots->execute([':round_id' => $roundId]);
        $items = $this->db->query('SELECT * FROM auction_items WHERE enabled = 1 ORDER BY sort_order ASC, id ASC')->fetchAll(PDO::FETCH_ASSOC);
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO auction_lots
                (round_id, auction_item_id, starting_bid_credits, min_increment_credits, current_bid_credits)
             VALUES
                (:round_id, :auction_item_id, :starting_bid_credits, :min_increment_credits, :current_bid_credits)'
        );

        foreach ($items as $item) {
            $starting = (int)$item['starting_bid_credits'];
            $stmt->execute([
                ':round_id' => $roundId,
                ':auction_item_id' => (int)$item['id'],
                ':starting_bid_credits' => $starting,
                ':min_increment_credits' => max(1, (int)$item['min_increment_credits']),
                ':current_bid_credits' => $starting,
            ]);
        }
    }

    private function getRoundLots(int $roundId): array
    {
        $stmt = $this->db->prepare(
            "SELECT
                l.id AS lot_id,
                l.starting_bid_credits,
                l.min_increment_credits,
                l.current_bid_credits,
                l.current_bidder_id,
                ai.id AS auction_item_id,
                ai.code,
                ai.name,
                ai.category,
                ai.description,
                ai.image_path,
                ai.grant_type,
                ai.ref_id,
                ai.qty,
                ai.uridium_value,
                u.username AS current_bidder_name
             FROM auction_lots l
             INNER JOIN auction_items ai ON ai.id = l.auction_item_id
             LEFT JOIN users u ON u.id = l.current_bidder_id
             WHERE l.round_id = :round_id AND ai.enabled = 1
             ORDER BY ai.sort_order ASC, ai.id ASC"
        );
        $stmt->execute([':round_id' => $roundId]);
        $lots = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($lots as &$lot) {
            $lot['minimum_required_bid'] = (int)$lot['current_bid_credits'] + max(1, (int)$lot['min_increment_credits']);
            $lot['eligibility_reason'] = $this->getEligibilityReason($this->playerId, $lot);
        }
        unset($lot);

        return $lots;
    }

    private function getCatalogPreviewLots(): array
    {
        $items = $this->db->query('SELECT * FROM auction_items WHERE enabled = 1 ORDER BY sort_order ASC, id ASC')->fetchAll(PDO::FETCH_ASSOC);
        $lots = [];
        foreach ($items as $item) {
            $lots[] = [
                'lot_id' => null,
                'starting_bid_credits' => (int)$item['starting_bid_credits'],
                'min_increment_credits' => max(1, (int)$item['min_increment_credits']),
                'current_bid_credits' => (int)$item['starting_bid_credits'],
                'current_bidder_id' => null,
                'current_bidder_name' => null,
                'auction_item_id' => (int)$item['id'],
                'code' => $item['code'],
                'name' => $item['name'],
                'category' => $item['category'],
                'description' => $item['description'],
                'image_path' => $item['image_path'],
                'grant_type' => $item['grant_type'],
                'ref_id' => $item['ref_id'],
                'qty' => (int)$item['qty'],
                'uridium_value' => (int)$item['uridium_value'],
                'minimum_required_bid' => (int)$item['starting_bid_credits'] + max(1, (int)$item['min_increment_credits']),
                'eligibility_reason' => '',
            ];
        }
        return $lots;
    }

    public function settleExpiredRounds(): int
    {
        $settledRounds = 0;
        $lockAcquired = false;

        try {
            $lock = $this->db->query("SELECT GET_LOCK('andromeda_auction_settle', 5)")->fetchColumn();
            $lockAcquired = ((int)$lock === 1);
            if (!$lockAcquired) {
                return 0;
            }

            $nowSql = $this->sqlDate($this->now());
            $roundsStmt = $this->db->prepare("SELECT * FROM auction_rounds WHERE status = 'active' AND ends_at <= :now ORDER BY ends_at ASC");
            $roundsStmt->execute([':now' => $nowSql]);
            $rounds = $roundsStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($rounds as $round) {
                $this->settleRound((int)$round['id']);
                $settledRounds++;
            }
        } catch (Exception $e) {
            // Maintenance should never break the page. Failed rounds remain active and can be retried.
        } finally {
            if ($lockAcquired) {
                try {
                    $this->db->query("SELECT RELEASE_LOCK('andromeda_auction_settle')");
                } catch (Exception $e) {
                }
            }
        }

        return $settledRounds;
    }

    private function settleRound(int $roundId): void
    {
        try {
            $this->db->beginTransaction();

            $roundLock = $this->db->prepare("SELECT * FROM auction_rounds WHERE id = :id LIMIT 1 FOR UPDATE");
            $roundLock->execute([':id' => $roundId]);
            $round = $roundLock->fetch(PDO::FETCH_ASSOC);
            if (!$round || (string)$round['status'] !== 'active') {
                $this->db->commit();
                return;
            }

            $this->db->prepare("UPDATE auction_rounds SET status = 'settling' WHERE id = :id")->execute([':id' => $roundId]);

            $lotsStmt = $this->db->prepare(
                "SELECT l.*, ai.code, ai.name, ai.grant_type, ai.ref_id, ai.qty, ai.id AS auction_item_id
                 FROM auction_lots l
                 INNER JOIN auction_items ai ON ai.id = l.auction_item_id
                 WHERE l.round_id = :round_id AND l.settled = 0
                 ORDER BY l.id ASC
                 FOR UPDATE"
            );
            $lotsStmt->execute([':round_id' => $roundId]);
            $lots = $lotsStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($lots as $lot) {
                $lotId = (int)$lot['id'];
                $winnerId = $lot['current_bidder_id'] !== null ? (int)$lot['current_bidder_id'] : 0;
                $finalBid = (int)$lot['current_bid_credits'];

                if ($winnerId <= 0) {
                    $this->markLotSettled($lotId);
                    continue;
                }

                $existingWin = $this->db->prepare('SELECT id FROM auction_wins WHERE lot_id = :lot_id LIMIT 1');
                $existingWin->execute([':lot_id' => $lotId]);
                if ($existingWin->fetchColumn()) {
                    $this->markLotSettled($lotId);
                    continue;
                }

                $winStmt = $this->db->prepare(
                    'INSERT INTO auction_wins (round_id, lot_id, player_id, auction_item_id, final_bid_credits, grant_status)
                     VALUES (:round_id, :lot_id, :player_id, :auction_item_id, :final_bid_credits, :grant_status)'
                );
                $winStmt->execute([
                    ':round_id' => $roundId,
                    ':lot_id' => $lotId,
                    ':player_id' => $winnerId,
                    ':auction_item_id' => (int)$lot['auction_item_id'],
                    ':final_bid_credits' => $finalBid,
                    ':grant_status' => 'pending',
                ]);
                $winId = (int)$this->db->lastInsertId();

                try {
                    $this->grantItem($winnerId, $lot);
                    $this->db->prepare("UPDATE auction_wins SET grant_status = 'granted', granted_at = :now WHERE id = :id")
                        ->execute([':now' => $this->sqlDate($this->now()), ':id' => $winId]);
                } catch (Exception $grantError) {
                    $this->refundCredits($winnerId, $finalBid);
                    $this->db->prepare("UPDATE auction_wins SET grant_status = 'failed', error_message = :error, granted_at = :now WHERE id = :id")
                        ->execute([
                            ':error' => substr($grantError->getMessage(), 0, 250),
                            ':now' => $this->sqlDate($this->now()),
                            ':id' => $winId,
                        ]);
                }

                $this->markLotSettled($lotId);
            }

            $this->db->prepare("UPDATE auction_rounds SET status = 'closed', closed_at = :now WHERE id = :id")
                ->execute([':now' => $this->sqlDate($this->now()), ':id' => $roundId]);

            $this->db->commit();
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    private function markLotSettled(int $lotId): void
    {
        $this->db->prepare('UPDATE auction_lots SET settled = 1, settled_at = :now WHERE id = :id')
            ->execute([':now' => $this->sqlDate($this->now()), ':id' => $lotId]);
    }

    private function grantItem(int $playerId, array $item): void
    {
        $grantType = (string)$item['grant_type'];
        $refId = (string)$item['ref_id'];
        $qty = max(1, (int)$item['qty']);

        switch ($grantType) {
            case 'inventory_item':
                $this->grantInventoryItem($playerId, (int)$refId, $qty);
                return;

            case 'user_column':
                $this->grantUserColumn($playerId, $refId, $qty);
                return;

            case 'design':
                $this->grantDesign($playerId, (int)$refId);
                return;

            case 'iris':
                $this->grantIris($playerId);
                return;

            case 'booster':
                $this->grantBooster($playerId, $refId, $qty);
                return;

            case 'ship':
                $this->grantShip($playerId, (int)$refId);
                return;
        }

        throw new Exception('Unknown grant type: ' . $grantType);
    }

    private function grantInventoryItem(int $playerId, int $itemId, int $qty): void
    {
        $stmt = $this->db->prepare('SELECT qty FROM player_inventory WHERE player_id = :pid AND item_id = :iid LIMIT 1 FOR UPDATE');
        $stmt->execute([':pid' => $playerId, ':iid' => $itemId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $this->db->prepare('UPDATE player_inventory SET qty = qty + :qty WHERE player_id = :pid AND item_id = :iid')
                ->execute([':qty' => $qty, ':pid' => $playerId, ':iid' => $itemId]);
        } else {
            $this->db->prepare('INSERT INTO player_inventory (player_id, item_id, qty) VALUES (:pid, :iid, :qty)')
                ->execute([':pid' => $playerId, ':iid' => $itemId, ':qty' => $qty]);
        }
    }

    private function grantUserColumn(int $playerId, string $column, int $qty): void
    {
        $allowed = $this->allowedUserColumns();
        if (!in_array($column, $allowed, true)) {
            throw new Exception('Invalid user reward column.');
        }

        $sql = 'UPDATE users SET `' . $column . '` = `' . $column . '` + :qty WHERE id = :pid';
        $this->db->prepare($sql)->execute([':qty' => $qty, ':pid' => $playerId]);
    }

    private function grantDesign(int $playerId, int $designId): void
    {
        $check = $this->db->prepare('SELECT COUNT(*) FROM player_designs WHERE player_id = :pid AND design_id = :did');
        $check->execute([':pid' => $playerId, ':did' => $designId]);
        if ((int)$check->fetchColumn() > 0) {
            throw new Exception('Player already owns this design.');
        }

        $this->db->prepare('INSERT INTO player_designs (player_id, design_id) VALUES (:pid, :did)')
            ->execute([':pid' => $playerId, ':did' => $designId]);
    }

    private function grantIris(int $playerId): void
    {
        $userStmt = $this->db->prepare('SELECT drones FROM users WHERE id = :pid LIMIT 1 FOR UPDATE');
        $userStmt->execute([':pid' => $playerId]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            throw new Exception('Player not found for Iris reward.');
        }

        $desired = $this->parseDroneItemIds((string)($user['drones'] ?? ''));

        try {
            $droneStmt = $this->db->prepare('SELECT item_id FROM drone WHERE player_id = :pid ORDER BY id ASC FOR UPDATE');
            $droneStmt->execute([':pid' => $playerId]);
            $tableDrones = [];
            foreach ($droneStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $itemId = (int)($row['item_id'] ?? 3);
                $tableDrones[] = ($itemId === 5) ? 5 : 3;
            }
            if (count($tableDrones) > count($desired)) {
                $desired = $tableDrones;
            }
        } catch (Exception $e) {
            // If legacy drone tables are missing, continue with users.drones.
        }

        if (count($desired) >= 8) {
            throw new Exception('Player already has the maximum number of drones.');
        }

        $desired[] = 3;
        $this->db->prepare('UPDATE users SET drones = :drones WHERE id = :pid')
            ->execute([':drones' => $this->buildDronesString($desired), ':pid' => $playerId]);

        $this->grantInventoryItem($playerId, 3, 1);

        $this->syncDronesTablesForReward($playerId, $desired);
    }

    private function grantBooster(int $playerId, string $column, int $hours): void
    {
        $allowed = ['booster_dmg_time', 'booster_hp_time', 'booster_shd_time'];
        if (!in_array($column, $allowed, true)) {
            throw new Exception('Invalid booster reward.');
        }

        $stmt = $this->db->prepare('SELECT `' . $column . '` FROM users WHERE id = :pid LIMIT 1 FOR UPDATE');
        $stmt->execute([':pid' => $playerId]);
        $current = (int)$stmt->fetchColumn();
        $base = ($current > time()) ? $current : time();
        $newTime = $base + (3600 * max(1, $hours));

        $this->db->prepare('UPDATE users SET `' . $column . '` = :new_time WHERE id = :pid')
            ->execute([':new_time' => $newTime, ':pid' => $playerId]);
    }

    private function grantShip(int $playerId, int $shipId): void
    {
        $ships = $this->shipGrantData();
        if (!isset($ships[$shipId])) {
            throw new Exception('Invalid ship reward.');
        }
        $data = $ships[$shipId];

        $st = $this->db->prepare('SELECT shipId FROM users WHERE id = :id LIMIT 1 FOR UPDATE');
        $st->execute([':id' => $playerId]);
        $user = $st->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            throw new Exception('Player not found for ship reward.');
        }

        $oldId = (int)$user['shipId'];
        if ($oldId === $shipId) {
            throw new Exception('Player is already flying this ship.');
        }

        $oldCfgQ = $this->db->prepare('SELECT id FROM ship_config WHERE player_id = :p AND ship_design_id = :s');
        $oldCfgQ->execute([':p' => $playerId, ':s' => $oldId]);
        $oldCfgs = $oldCfgQ->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($oldCfgs)) {
            $ids = implode(',', array_map('intval', $oldCfgs));
            $this->db->exec('UPDATE ship_slot SET item_id = NULL WHERE ship_config_id IN (' . $ids . ')');
            try {
                $this->db->exec('UPDATE ship_config_stats SET damage_total = 0, shield_total = 0 WHERE ship_config_id IN (' . $ids . ')');
            } catch (Exception $e) {
            }
        }

        $upd = $this->db->prepare('UPDATE users SET shipId = :sid, max_hp = :hp WHERE id = :uid');
        $upd->execute([':sid' => $shipId, ':hp' => (int)$data['hp'], ':uid' => $playerId]);

        $ins = $this->db->prepare(
            "INSERT IGNORE INTO ship_config (player_id, ship_design_id, name, lasers_slots, gen_slots, extras_slots)
             VALUES (:p, :s, 'A', :l, :g, :e), (:p, :s, 'B', :l, :g, :e)"
        );
        $ins->execute([
            ':p' => $playerId,
            ':s' => $shipId,
            ':l' => (int)$data['lasers'],
            ':g' => (int)$data['gens'],
            ':e' => (int)$data['extras'],
        ]);

        $newCfgQ = $this->db->prepare('SELECT id FROM ship_config WHERE player_id = :p AND ship_design_id = :s');
        $newCfgQ->execute([':p' => $playerId, ':s' => $shipId]);
        $newCfgs = $newCfgQ->fetchAll(PDO::FETCH_COLUMN);

        $slotIns = $this->db->prepare('INSERT IGNORE INTO ship_slot (ship_config_id, row_name, slot_index) VALUES (:c, :r, :i)');
        foreach ($newCfgs as $cid) {
            $rows = [
                ['lasers', (int)$data['lasers']],
                ['generators', (int)$data['gens']],
                ['extras', (int)$data['extras']],
            ];
            foreach ($rows as $row) {
                for ($i = 0; $i < $row[1]; $i++) {
                    $slotIns->execute([':c' => (int)$cid, ':r' => $row[0], ':i' => $i]);
                }
            }
        }
    }

    private function assertCanReceiveItem(int $playerId, array $item): void
    {
        $reason = $this->getEligibilityReason($playerId, $item);
        if ($reason !== '') {
            throw new Exception($reason);
        }
    }

    private function getEligibilityReason(int $playerId, array $item): string
    {
        if ($playerId <= 0) {
            return '';
        }

        $grantType = (string)($item['grant_type'] ?? '');
        $refId = (string)($item['ref_id'] ?? '');

        try {
            if ($grantType === 'design') {
                $check = $this->db->prepare('SELECT COUNT(*) FROM player_designs WHERE player_id = :pid AND design_id = :did');
                $check->execute([':pid' => $playerId, ':did' => (int)$refId]);
                return ((int)$check->fetchColumn() > 0) ? 'You already own this design.' : '';
            }

            if ($grantType === 'iris') {
                $userStmt = $this->db->prepare('SELECT drones FROM users WHERE id = :pid LIMIT 1');
                $userStmt->execute([':pid' => $playerId]);
                $dronesStr = (string)$userStmt->fetchColumn();
                $count = count($this->parseDroneItemIds($dronesStr));

                try {
                    $tableStmt = $this->db->prepare('SELECT COUNT(*) FROM drone WHERE player_id = :pid');
                    $tableStmt->execute([':pid' => $playerId]);
                    $count = max($count, (int)$tableStmt->fetchColumn());
                } catch (Exception $e) {
                }

                return ($count >= 8) ? 'You already have the maximum number of drones.' : '';
            }

            if ($grantType === 'ship') {
                $shipStmt = $this->db->prepare('SELECT shipId FROM users WHERE id = :pid LIMIT 1');
                $shipStmt->execute([':pid' => $playerId]);
                return ((int)$shipStmt->fetchColumn() === (int)$refId) ? 'You are already flying this ship.' : '';
            }
        } catch (Exception $e) {
            return '';
        }

        return '';
    }

    private function refundCredits(int $playerId, int $amount): void
    {
        if ($amount <= 0) {
            return;
        }

        $this->db->prepare('UPDATE users SET credits = credits + :amount WHERE id = :pid')
            ->execute([':amount' => $amount, ':pid' => $playerId]);
    }

    private function allowedUserColumns(): array
    {
        return [
            'ammo_mcb50',
            'ammo_sab50',
            'ammo_rsb75',
            'ammo_plt2021',
            'ammo_dcr250',
            'ammo_ubr100',
            'ammo_hstrm01',
            'ammo_smb01',
            'ammo_ish01',
            'ammo_emp01',
            'logfiles',
            'booty_keys',
        ];
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

    private function syncDronesTablesForReward(int $playerId, array $desiredItemIds): void
    {
        $desiredItemIds = array_values(array_slice($desiredItemIds, 0, 8));
        if (count($desiredItemIds) <= 0) {
            return;
        }

        $cur = $this->db->prepare('SELECT id, item_id, name FROM drone WHERE player_id = :p ORDER BY id ASC FOR UPDATE');
        $cur->execute([':p' => $playerId]);
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
        $insGlobalSlot = $this->db->prepare('INSERT IGNORE INTO drone_slot (drone_id, slot_index, item_id) VALUES (:d, :s, NULL)');
        $delGlobalExtra = $this->db->prepare('DELETE FROM drone_slot WHERE drone_id = :d AND slot_index >= :sc');
        $insCfgSlot = $this->db->prepare('INSERT IGNORE INTO drone_slot_config (drone_id, config, slot_index, item_id) VALUES (:d, :c, :s, NULL)');
        $delCfgExtra = $this->db->prepare('DELETE FROM drone_slot_config WHERE drone_id = :d AND slot_index >= :sc');

        if ($have < $want) {
            for ($i = $have; $i < $want; $i++) {
                $itemId = (int)($desiredItemIds[$i] ?? 3);
                $label = ($itemId === 5) ? 'Flax' : 'Iris';
                $name = $makeUniqueName($label);

                $insDrone->execute([':p' => $playerId, ':n' => $name, ':iid' => $itemId]);
                $droneId = (int)$this->db->lastInsertId();
                $slotCount = $this->droneSlotCountFromItem($itemId);

                $delGlobalExtra->execute([':d' => $droneId, ':sc' => $slotCount]);
                $delCfgExtra->execute([':d' => $droneId, ':sc' => $slotCount]);
                for ($slot = 0; $slot < $slotCount; $slot++) {
                    $insGlobalSlot->execute([':d' => $droneId, ':s' => $slot]);
                    $insCfgSlot->execute([':d' => $droneId, ':c' => 'A', ':s' => $slot]);
                    $insCfgSlot->execute([':d' => $droneId, ':c' => 'B', ':s' => $slot]);
                }
            }

            $cur->execute([':p' => $playerId]);
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
            $delGlobalExtra->execute([':d' => $droneId, ':sc' => $slotCount]);
            $delCfgExtra->execute([':d' => $droneId, ':sc' => $slotCount]);

            for ($slot = 0; $slot < $slotCount; $slot++) {
                $insGlobalSlot->execute([':d' => $droneId, ':s' => $slot]);
                $insCfgSlot->execute([':d' => $droneId, ':c' => 'A', ':s' => $slot]);
                $insCfgSlot->execute([':d' => $droneId, ':c' => 'B', ':s' => $slot]);
            }
        }
    }

    private function now(): DateTimeImmutable
    {
        return new DateTimeImmutable('now', new DateTimeZone(self::TIMEZONE));
    }

    private function sqlDate(DateTimeInterface $date): string
    {
        return $date->format('Y-m-d H:i:s');
    }

    private function dailyWindows(): array
    {
        return [
            ['12:00', '13:00'],
            ['18:00', '19:00'],
            ['22:00', '23:00'],
        ];
    }

    private function shipGrantData(): array
    {
        return [
            3 => ['name' => 'Leonov', 'hp' => 64000, 'lasers' => 6, 'gens' => 6, 'extras' => 2],
            8 => ['name' => 'Vengeance', 'hp' => 180000, 'lasers' => 10, 'gens' => 10, 'extras' => 2],
            10 => ['name' => 'Goliath', 'hp' => 256000, 'lasers' => 15, 'gens' => 15, 'extras' => 3],
        ];
    }

    private function catalog(): array
    {
        return [
            ['code' => 'lf3', 'name' => 'LF-3 Laser', 'category' => 'Equipment', 'description' => 'Elite laser cannon.', 'image_path' => 'img/items/lf3.png', 'grant_type' => 'inventory_item', 'ref_id' => 1, 'qty' => 1, 'uridium_value' => 10000, 'starting_bid_credits' => 4000000, 'min_increment_credits' => 1, 'sort_order' => 10],
            ['code' => 'bo2', 'name' => 'SG3N-B02 Shield', 'category' => 'Equipment', 'description' => '10,000 shield generator.', 'image_path' => 'img/items/sg3n.png', 'grant_type' => 'inventory_item', 'ref_id' => 2, 'qty' => 1, 'uridium_value' => 10000, 'starting_bid_credits' => 4000000, 'min_increment_credits' => 1, 'sort_order' => 20],
            ['code' => 'speed_7900', 'name' => 'G3N-7900 Speed Generator', 'category' => 'Equipment', 'description' => '+10 speed generator.', 'image_path' => 'img/items/g3n7900.png', 'grant_type' => 'inventory_item', 'ref_id' => 4, 'qty' => 1, 'uridium_value' => 2000, 'starting_bid_credits' => 800000, 'min_increment_credits' => 1, 'sort_order' => 30],
            ['code' => 'auto_rocket_cpu', 'name' => 'Auto-Rocket CPU', 'category' => 'Equipment', 'description' => 'Fires rockets automatically.', 'image_path' => 'img/items/arol.png', 'grant_type' => 'inventory_item', 'ref_id' => 20, 'qty' => 1, 'uridium_value' => 15000, 'starting_bid_credits' => 6000000, 'min_increment_credits' => 1, 'sort_order' => 40],
            ['code' => 'cargo_compressor', 'name' => 'Cargo Compressor', 'category' => 'Equipment', 'description' => 'Doubles cargo space.', 'image_path' => 'img/items/cargo.png', 'grant_type' => 'inventory_item', 'ref_id' => 21, 'qty' => 1, 'uridium_value' => 15000, 'starting_bid_credits' => 6000000, 'min_increment_credits' => 1, 'sort_order' => 50],
            ['code' => 'hst2', 'name' => 'HST-2', 'category' => 'Equipment', 'description' => 'Elite rocket launcher.', 'image_path' => 'img/items/hst2.png', 'grant_type' => 'inventory_item', 'ref_id' => 39, 'qty' => 1, 'uridium_value' => 15000, 'starting_bid_credits' => 6000000, 'min_increment_credits' => 1, 'sort_order' => 60],

            ['code' => 'iris', 'name' => 'Iris Drone', 'category' => 'Drones', 'description' => 'Elite drone with 2 slots.', 'image_path' => 'img/items/iris.png', 'grant_type' => 'iris', 'ref_id' => 3, 'qty' => 1, 'uridium_value' => 15000, 'starting_bid_credits' => 250000000, 'min_increment_credits' => 1, 'sort_order' => 100],

            ['code' => 'mcb50_3000', 'name' => 'MCB-50', 'category' => 'Laser Ammunition', 'description' => 'Lot of 3,000 laser ammo.', 'image_path' => 'img/items/mcb50.png', 'grant_type' => 'user_column', 'ref_id' => 'ammo_mcb50', 'qty' => 3000, 'uridium_value' => 3000, 'starting_bid_credits' => 1200000, 'min_increment_credits' => 1, 'sort_order' => 200],
            ['code' => 'sab50_3000', 'name' => 'SAB-50', 'category' => 'Laser Ammunition', 'description' => 'Lot of 3,000 shield-drain ammo.', 'image_path' => 'img/items/sab50.png', 'grant_type' => 'user_column', 'ref_id' => 'ammo_sab50', 'qty' => 3000, 'uridium_value' => 3000, 'starting_bid_credits' => 1200000, 'min_increment_credits' => 1, 'sort_order' => 210],
            ['code' => 'rsb75_3000', 'name' => 'RSB-75', 'category' => 'Laser Ammunition', 'description' => 'Lot of 3,000 elite laser ammo.', 'image_path' => 'img/items/rsb75.png', 'grant_type' => 'user_column', 'ref_id' => 'ammo_rsb75', 'qty' => 3000, 'uridium_value' => 15000, 'starting_bid_credits' => 6000000, 'min_increment_credits' => 1, 'sort_order' => 220],

            ['code' => 'plt2021_1000', 'name' => 'PLT-2021', 'category' => 'Rockets', 'description' => 'Lot of 1,000 rockets.', 'image_path' => 'img/items/plt2021.png', 'grant_type' => 'user_column', 'ref_id' => 'ammo_plt2021', 'qty' => 1000, 'uridium_value' => 5000, 'starting_bid_credits' => 2000000, 'min_increment_credits' => 1, 'sort_order' => 300],
            ['code' => 'dcr250_1000', 'name' => 'DCR-250', 'category' => 'Rockets', 'description' => 'Lot of 1,000 slow-down rockets.', 'image_path' => 'img/items/dcr250.png', 'grant_type' => 'user_column', 'ref_id' => 'ammo_dcr250', 'qty' => 1000, 'uridium_value' => 5000, 'starting_bid_credits' => 2000000, 'min_increment_credits' => 1, 'sort_order' => 310],
            ['code' => 'ubr100_1000', 'name' => 'UBR-100', 'category' => 'Rockets', 'description' => 'Lot of 1,000 elite rockets.', 'image_path' => 'img/items/ubr100.png', 'grant_type' => 'user_column', 'ref_id' => 'ammo_ubr100', 'qty' => 1000, 'uridium_value' => 30000, 'starting_bid_credits' => 12000000, 'min_increment_credits' => 1, 'sort_order' => 320],
            ['code' => 'hstrm01_1000', 'name' => 'HSTRM-01', 'category' => 'Rockets', 'description' => 'Lot of 1,000 Hellstorm rockets.', 'image_path' => 'img/items/hstrm01.png', 'grant_type' => 'user_column', 'ref_id' => 'ammo_hstrm01', 'qty' => 1000, 'uridium_value' => 25000, 'starting_bid_credits' => 10000000, 'min_increment_credits' => 1, 'sort_order' => 330],

            ['code' => 'smb01_25', 'name' => 'SMB-01', 'category' => 'Special Items', 'description' => 'Lot of 25 instant mines.', 'image_path' => 'img/items/smb-01.png', 'grant_type' => 'user_column', 'ref_id' => 'ammo_smb01', 'qty' => 25, 'uridium_value' => 10000, 'starting_bid_credits' => 4000000, 'min_increment_credits' => 1, 'sort_order' => 400],
            ['code' => 'ish01_25', 'name' => 'ISH-01', 'category' => 'Special Items', 'description' => 'Lot of 25 instant shields.', 'image_path' => 'img/items/ish-01.png', 'grant_type' => 'user_column', 'ref_id' => 'ammo_ish01', 'qty' => 25, 'uridium_value' => 10000, 'starting_bid_credits' => 4000000, 'min_increment_credits' => 1, 'sort_order' => 410],
            ['code' => 'emp01_25', 'name' => 'EMP-01', 'category' => 'Special Items', 'description' => 'Lot of 25 EMP bursts.', 'image_path' => 'img/items/emp-01.png', 'grant_type' => 'user_column', 'ref_id' => 'ammo_emp01', 'qty' => 25, 'uridium_value' => 12500, 'starting_bid_credits' => 5000000, 'min_increment_credits' => 1, 'sort_order' => 420],

            ['code' => 'logfile', 'name' => 'Logfile', 'category' => 'Resources', 'description' => '1 Logfile.', 'image_path' => 'img/items/logfile.png', 'grant_type' => 'user_column', 'ref_id' => 'logfiles', 'qty' => 1, 'uridium_value' => 150, 'starting_bid_credits' => 60000, 'min_increment_credits' => 1, 'sort_order' => 500],
            ['code' => 'booty_key', 'name' => 'Booty Key', 'category' => 'Resources', 'description' => '1 Booty Key.', 'image_path' => 'img/items/booty-key.png', 'grant_type' => 'user_column', 'ref_id' => 'booty_keys', 'qty' => 1, 'uridium_value' => 7000, 'starting_bid_credits' => 2800000, 'min_increment_credits' => 1, 'sort_order' => 510],

            ['code' => 'vengeance_enforcer', 'name' => 'Vengeance Enforcer', 'category' => 'Ship Designs', 'description' => 'Vengeance design. +5% Damage.', 'image_path' => 'img/shop/17.png', 'grant_type' => 'design', 'ref_id' => 17, 'qty' => 1, 'uridium_value' => 50000, 'starting_bid_credits' => 20000000, 'min_increment_credits' => 1, 'sort_order' => 600],
            ['code' => 'goliath_enforcer', 'name' => 'Goliath Enforcer', 'category' => 'Ship Designs', 'description' => 'Goliath design. +5% Damage.', 'image_path' => 'img/shop/56.png', 'grant_type' => 'design', 'ref_id' => 56, 'qty' => 1, 'uridium_value' => 100000, 'starting_bid_credits' => 40000000, 'min_increment_credits' => 1, 'sort_order' => 610],
            ['code' => 'goliath_bastion', 'name' => 'Goliath Bastion', 'category' => 'Ship Designs', 'description' => 'Goliath design. +10% Shield.', 'image_path' => 'img/shop/59.png', 'grant_type' => 'design', 'ref_id' => 59, 'qty' => 1, 'uridium_value' => 100000, 'starting_bid_credits' => 40000000, 'min_increment_credits' => 1, 'sort_order' => 620],
            ['code' => 'goliath_solace', 'name' => 'Goliath Solace', 'category' => 'Ship Designs', 'description' => 'Goliath ability design.', 'image_path' => 'img/shop/63.png', 'grant_type' => 'design', 'ref_id' => 63, 'qty' => 1, 'uridium_value' => 250000, 'starting_bid_credits' => 100000000, 'min_increment_credits' => 1, 'sort_order' => 630],
            ['code' => 'goliath_diminisher', 'name' => 'Goliath Diminisher', 'category' => 'Ship Designs', 'description' => 'Goliath ability design.', 'image_path' => 'img/shop/64.png', 'grant_type' => 'design', 'ref_id' => 64, 'qty' => 1, 'uridium_value' => 250000, 'starting_bid_credits' => 100000000, 'min_increment_credits' => 1, 'sort_order' => 640],
            ['code' => 'goliath_spectrum', 'name' => 'Goliath Spectrum', 'category' => 'Ship Designs', 'description' => 'Goliath ability design.', 'image_path' => 'img/shop/65.png', 'grant_type' => 'design', 'ref_id' => 65, 'qty' => 1, 'uridium_value' => 250000, 'starting_bid_credits' => 100000000, 'min_increment_credits' => 1, 'sort_order' => 650],
            ['code' => 'goliath_sentinel', 'name' => 'Goliath Sentinel', 'category' => 'Ship Designs', 'description' => 'Goliath ability design.', 'image_path' => 'img/shop/66.png', 'grant_type' => 'design', 'ref_id' => 66, 'qty' => 1, 'uridium_value' => 250000, 'starting_bid_credits' => 100000000, 'min_increment_credits' => 1, 'sort_order' => 660],
            ['code' => 'goliath_venom', 'name' => 'Goliath Venom', 'category' => 'Ship Designs', 'description' => 'Goliath ability design.', 'image_path' => 'img/shop/67.png', 'grant_type' => 'design', 'ref_id' => 67, 'qty' => 1, 'uridium_value' => 250000, 'starting_bid_credits' => 100000000, 'min_increment_credits' => 1, 'sort_order' => 670],

            ['code' => 'damage_booster_1h', 'name' => 'Damage Booster', 'category' => 'Boosters', 'description' => '+10% Damage for 5 hours.', 'image_path' => 'img/dmg.png', 'grant_type' => 'booster', 'ref_id' => 'booster_dmg_time', 'qty' => 5, 'uridium_value' => 50000, 'starting_bid_credits' => 20000000, 'min_increment_credits' => 1, 'sort_order' => 700],
            ['code' => 'hp_booster_1h', 'name' => 'HP Booster', 'category' => 'Boosters', 'description' => '+10% Hitpoints for 5 hours.', 'image_path' => 'img/hp.png', 'grant_type' => 'booster', 'ref_id' => 'booster_hp_time', 'qty' => 5, 'uridium_value' => 50000, 'starting_bid_credits' => 20000000, 'min_increment_credits' => 1, 'sort_order' => 710],
            ['code' => 'shield_booster_1h', 'name' => 'Shield Booster', 'category' => 'Boosters', 'description' => '+25% Shield for 5 hours.', 'image_path' => 'img/sh.png', 'grant_type' => 'booster', 'ref_id' => 'booster_shd_time', 'qty' => 5, 'uridium_value' => 50000, 'starting_bid_credits' => 20000000, 'min_increment_credits' => 1, 'sort_order' => 720],

            ['code' => 'leonov', 'name' => 'Leonov', 'category' => 'Ships', 'description' => 'Ship reward. It will be equipped on win.', 'image_path' => 'img/shop/3.png', 'grant_type' => 'ship', 'ref_id' => 3, 'qty' => 1, 'uridium_value' => 9000, 'starting_bid_credits' => 3600000, 'min_increment_credits' => 1, 'sort_order' => 800],
            ['code' => 'vengeance', 'name' => 'Vengeance', 'category' => 'Ships', 'description' => 'Ship reward. It will be equipped on win.', 'image_path' => 'img/shop/8.png', 'grant_type' => 'ship', 'ref_id' => 8, 'qty' => 1, 'uridium_value' => 30000, 'starting_bid_credits' => 12000000, 'min_increment_credits' => 1, 'sort_order' => 810],
            ['code' => 'goliath', 'name' => 'Goliath', 'category' => 'Ships', 'description' => 'Ship reward. It will be equipped on win.', 'image_path' => 'img/shop/10.png', 'grant_type' => 'ship', 'ref_id' => 10, 'qty' => 1, 'uridium_value' => 80000, 'starting_bid_credits' => 32000000, 'min_increment_credits' => 1, 'sort_order' => 820],
        ];
    }
}
