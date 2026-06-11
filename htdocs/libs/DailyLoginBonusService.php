<?php

class DailyLoginBonusService
{
    const TIMEZONE = 'Europe/Zurich';

    private $db;
    private $playerId;

    public function __construct(PDO $db, int $playerId)
    {
        $this->db = $db;
        $this->playerId = $playerId;

        try {
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->db->exec('SET NAMES utf8mb4');
        } catch (Exception $e) {
        }
    }

    public function getState(): array
    {
        $meta = $this->getWeekMeta();
        $schemaReady = $this->hasSchema();
        $claims = $schemaReady ? $this->getWeekClaims($meta['week_key']) : [];

        return $this->buildState($meta, $claims, $schemaReady);
    }

    public function claim(): array
    {
        if ($this->playerId <= 0) {
            throw new Exception('Invalid player session.');
        }

        if (!$this->hasSchema()) {
            throw new Exception('Daily Login Bonus is not installed yet.');
        }

        $meta = $this->getWeekMeta();

        try {
            $this->db->beginTransaction();

            $userStmt = $this->db->prepare(
                'SELECT id, booster_dmg_time, booster_hp_time, booster_shd_time
                 FROM users
                 WHERE id = :player_id
                 LIMIT 1
                 FOR UPDATE'
            );
            $userStmt->execute([':player_id' => $this->playerId]);
            $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);
            if (!$userRow) {
                throw new Exception('Player account not found.');
            }

            $claimStmt = $this->db->prepare(
                'SELECT day_number, claim_date
                 FROM site_daily_login_claims
                 WHERE player_id = :player_id
                   AND week_key = :week_key
                 ORDER BY day_number ASC
                 FOR UPDATE'
            );
            $claimStmt->execute([
                ':player_id' => $this->playerId,
                ':week_key' => $meta['week_key'],
            ]);
            $claims = $claimStmt->fetchAll(PDO::FETCH_ASSOC);
            $state = $this->buildState($meta, $claims, true);

            if (!$state['can_claim']) {
                throw new Exception($state['claim_message']);
            }

            $day = (int)$state['next_day'];
            $reward = $this->getRewardByDay($day);
            if (empty($reward)) {
                throw new Exception('Daily reward is not available.');
            }

            $insertStmt = $this->db->prepare(
                'INSERT INTO site_daily_login_claims
                    (player_id, week_key, day_number, claim_date, claimed_at, rewards_json)
                 VALUES
                    (:player_id, :week_key, :day_number, :claim_date, :claimed_at, :rewards_json)'
            );
            $insertStmt->execute([
                ':player_id' => $this->playerId,
                ':week_key' => $meta['week_key'],
                ':day_number' => $day,
                ':claim_date' => $meta['today_key'],
                ':claimed_at' => $meta['now_sql'],
                ':rewards_json' => json_encode($reward['lines'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);

            $this->grantReward($reward, $userRow);

            $this->db->commit();

            $newState = $this->getState();
            $newState['claim_message'] = 'Daily reward claimed.';

            return $newState;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public static function rewardCatalog(): array
    {
        return [
            1 => [
                'uridium' => 5000,
                'ammo_mcb25' => 10000,
                'lines' => ['5,000 Uridium', '10,000 MCB-25'],
            ],
            2 => [
                'uridium' => 7500,
                'ammo_mcb50' => 10000,
                'lines' => ['7,500 Uridium', '10,000 MCB-50'],
            ],
            3 => [
                'uridium' => 10000,
                'ammo_ucb100' => 10000,
                'lines' => ['10,000 Uridium', '10,000 UCB-100'],
            ],
            4 => [
                'uridium' => 17500,
                'ammo_ucb100' => 20000,
                'ammo_rsb75' => 5000,
                'lines' => ['17,500 Uridium', '20,000 UCB-100', '5,000 RSB-75'],
            ],
            5 => [
                'uridium' => 17500,
                'ammo_rsb75' => 15000,
                'promerium' => 1000,
                'lines' => ['17,500 Uridium', '15,000 RSB-75', '1,000 Promerium'],
            ],
            6 => [
                'uridium' => 20000,
                'seprom' => 1800,
                'lines' => ['20,000 Uridium', '1,800 Seprom'],
            ],
            7 => [
                'seprom' => 1000,
                'booster_dmg_hours' => 5,
                'booster_shd_hours' => 5,
                'booster_hp_hours' => 5,
                'ammo_ucb100' => 15000,
                'ammo_rsb75' => 20000,
                'lines' => [
                    '1,000 Seprom',
                    '5h Damage Booster',
                    '5h Shield Booster',
                    '5h HP Booster',
                    '15,000 UCB-100',
                    '20,000 RSB-75',
                ],
            ],
        ];
    }

    private function buildState(array $meta, array $claims, bool $schemaReady): array
    {
        $claimedDays = [];
        $claimedToday = false;

        foreach ($claims as $claim) {
            $day = (int)($claim['day_number'] ?? 0);
            if ($day > 0) {
                $claimedDays[$day] = true;
            }
            if ((string)($claim['claim_date'] ?? '') === $meta['today_key']) {
                $claimedToday = true;
            }
        }

        $claimedCount = count($claimedDays);
        $weekCompleted = $claimedCount >= 7;
        $nextDay = min(7, $claimedCount + 1);
        $canClaim = $schemaReady && !$claimedToday && !$weekCompleted;
        $claimMessage = 'Day ' . $nextDay . ' reward is ready to claim.';

        if (!$schemaReady) {
            $claimMessage = 'Daily Login Bonus is not installed yet.';
        } elseif ($weekCompleted) {
            $claimMessage = 'Week completed. Come back after the weekly reset.';
        } elseif ($claimedToday) {
            $claimMessage = 'Already claimed. Come back tomorrow.';
        }

        $cards = [];
        foreach (self::rewardCatalog() as $day => $reward) {
            $state = 'locked';
            $stateLabel = 'Locked';
            if (isset($claimedDays[$day])) {
                $state = 'claimed';
                $stateLabel = 'Claimed';
            } elseif ($canClaim && $day === $nextDay) {
                $state = 'today';
                $stateLabel = 'Today';
            }

            $cards[] = [
                'day' => $day,
                'state' => $state,
                'state_label' => $stateLabel,
                'lines' => $reward['lines'],
            ];
        }

        return [
            'schema_ready' => $schemaReady,
            'week_key' => $meta['week_key'],
            'today_key' => $meta['today_key'],
            'week_reset_label' => 'Monday 00:00 Europe/Zurich',
            'next_reset_label' => $meta['next_reset_label'],
            'claimed_count' => $claimedCount,
            'claimed_today' => $claimedToday,
            'week_completed' => $weekCompleted,
            'next_day' => $nextDay,
            'can_claim' => $canClaim,
            'auto_open' => $canClaim,
            'claim_message' => $claimMessage,
            'cards' => $cards,
        ];
    }

    private function grantReward(array $reward, array $userRow): void
    {
        $userRewards = [
            'uridium' => (int)($reward['uridium'] ?? 0),
            'ammo_mcb25' => (int)($reward['ammo_mcb25'] ?? 0),
            'ammo_mcb50' => (int)($reward['ammo_mcb50'] ?? 0),
            'ammo_ucb100' => (int)($reward['ammo_ucb100'] ?? 0),
            'ammo_rsb75' => (int)($reward['ammo_rsb75'] ?? 0),
        ];

        $boosterRewards = [
            'booster_dmg_time' => (int)($reward['booster_dmg_hours'] ?? 0),
            'booster_shd_time' => (int)($reward['booster_shd_hours'] ?? 0),
            'booster_hp_time' => (int)($reward['booster_hp_hours'] ?? 0),
        ];

        $updates = [];
        $params = [':player_id' => $this->playerId];
        foreach ($userRewards as $column => $qty) {
            if ($qty <= 0) {
                continue;
            }
            $updates[] = '`' . $column . '` = `' . $column . '` + :' . $column;
            $params[':' . $column] = $qty;
        }

        $now = time();
        foreach ($boosterRewards as $column => $hours) {
            if ($hours <= 0) {
                continue;
            }
            $current = (int)($userRow[$column] ?? 0);
            $base = ($current > $now) ? $current : $now;
            $updates[] = '`' . $column . '` = :' . $column;
            $params[':' . $column] = $base + ($hours * 3600);
        }

        if (!empty($updates)) {
            $sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = :player_id';
            $this->db->prepare($sql)->execute($params);
        }

        $this->grantCargoOre('promerium', (int)($reward['promerium'] ?? 0));
        $this->grantCargoOre('seprom', (int)($reward['seprom'] ?? 0));
    }

    private function grantCargoOre(string $oreKey, int $qty): void
    {
        if ($qty <= 0) {
            return;
        }

        $allowed = ['promerium', 'seprom'];
        if (!in_array($oreKey, $allowed, true)) {
            throw new Exception('Invalid cargo ore reward.');
        }

        $sql = 'INSERT INTO player_cargo (id, `' . $oreKey . '`)
                VALUES (:player_id, :qty)
                ON DUPLICATE KEY UPDATE `' . $oreKey . '` = `' . $oreKey . '` + VALUES(`' . $oreKey . '`)';
        $this->db->prepare($sql)->execute([
            ':player_id' => $this->playerId,
            ':qty' => $qty,
        ]);
    }

    private function getRewardByDay(int $day): array
    {
        $catalog = self::rewardCatalog();
        return $catalog[$day] ?? [];
    }

    private function getWeekClaims(string $weekKey): array
    {
        $stmt = $this->db->prepare(
            'SELECT day_number, claim_date
             FROM site_daily_login_claims
             WHERE player_id = :player_id
               AND week_key = :week_key
             ORDER BY day_number ASC'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':week_key' => $weekKey,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getWeekMeta(): array
    {
        $timezone = new DateTimeZone(self::TIMEZONE);
        $now = new DateTimeImmutable('now', $timezone);
        $daysSinceMonday = ((int)$now->format('N')) - 1;
        $weekStart = $now->setTime(0, 0, 0)->modify('-' . $daysSinceMonday . ' days');
        $nextReset = $weekStart->modify('+7 days');

        return [
            'now' => $now,
            'now_sql' => $now->format('Y-m-d H:i:s'),
            'week_key' => $weekStart->format('Y-m-d'),
            'today_key' => $now->format('Y-m-d'),
            'next_reset_label' => $nextReset->format('l, d M H:i T'),
        ];
    }

    private function hasSchema(): bool
    {
        try {
            $stmt = $this->db->prepare(
                "SELECT COUNT(*)
                 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'site_daily_login_claims'"
            );
            $stmt->execute();
            return ((int)$stmt->fetchColumn()) > 0;
        } catch (Exception $e) {
            return false;
        }
    }
}
