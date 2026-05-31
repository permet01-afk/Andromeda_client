<?php

class QuestService
{
    const MAX_ACTIVE_SITE_QUESTS = 5;
    const MAX_ACTIVE_BASIC_QUESTS = 5; // Backward-compatible alias.
    const HAVOK_ITEM_ID = 9001;

    private $db;
    private $playerId;
    private $schemaInstalled = false;
    private $questCatalogSynced = false;
    private $npcRowsEnsured = false;
    private $playerQuestRowsCache = null;
    private $objectivesGroupedCache = null;

    public function __construct(PDO $db, int $playerId)
    {
        $this->db = $db;
        $this->playerId = $playerId;

        try {
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->db->exec('SET NAMES utf8mb4');
        } catch (Exception $e) {
            // Keep compatibility with older local MySQL setups.
        }
    }

    public function preparePage(): void
    {
        $this->ensureQuestCatalog();
        $this->ensureNpcRowsOnce();
    }

    private function ensureSchemaInstalled(): void
    {
        if ($this->schemaInstalled) {
            return;
        }

        $this->installSchema();
        $this->schemaInstalled = true;
    }

    private function ensureQuestCatalog(): void
    {
        if ($this->questCatalogSynced) {
            return;
        }

        $this->ensureSchemaInstalled();
        $this->syncBasicQuestCatalog();
        $this->syncPvpQuestCatalog();
        $this->syncHavokQuestCatalog();
        $this->questCatalogSynced = true;
        $this->clearQuestReadCaches();
    }

    private function ensureNpcRowsOnce(): void
    {
        if ($this->npcRowsEnsured) {
            return;
        }

        $this->ensureNpcRows();
        $this->npcRowsEnsured = true;
    }

    private function clearQuestReadCaches(): void
    {
        $this->playerQuestRowsCache = null;
        $this->objectivesGroupedCache = null;
    }


    public function acceptBasicQuest(string $code): string
    {
        return $this->acceptQuest($code, ['Starter', 'Ore Collection', 'NPC Hunt']);
    }

    public function acceptPvpQuest(string $code): string
    {
        return $this->acceptQuest($code, ['PVP']);
    }

    public function acceptHavokQuest(string $code): string
    {
        return $this->acceptQuest($code, ['Havok']);
    }

    public function abortBasicQuest(string $code): string
    {
        return $this->abortQuest($code, ['Starter', 'Ore Collection', 'NPC Hunt']);
    }

    public function abortPvpQuest(string $code): string
    {
        return $this->abortQuest($code, ['PVP']);
    }

    public function abortHavokQuest(string $code): string
    {
        return $this->abortQuest($code, ['Havok']);
    }

    private function acceptQuest(string $code, array $allowedCategories): string
    {
        $this->ensureQuestCatalog();
        $this->ensureNpcRowsOnce();

        $quest = $this->getQuestByCode($code);
        if (!$quest) {
            throw new Exception('Quest not found.');
        }
        if (!in_array((string)$quest['category'], $allowedCategories, true)) {
            throw new Exception('This quest cannot be accepted from this section.');
        }

        $existing = $this->getPlayerQuestRow((int)$quest['id']);
        if ($existing && (string)$existing['status'] === 'completed') {
            throw new Exception('This quest is already completed.');
        }
        if ($existing && (string)$existing['status'] === 'in_progress') {
            throw new Exception('This quest is already in progress.');
        }

        if ($this->getActiveSiteQuestCount() >= self::MAX_ACTIVE_SITE_QUESTS) {
            throw new Exception('You can only have 5 Basic/PVP/Havok Quests active at the same time.');
        }

        $objectives = $this->getObjectivesForQuest((int)$quest['id']);
        $baseline = $this->buildBaseline($objectives);

        $stmt = $this->db->prepare(
            'INSERT INTO site_player_quests (player_id, quest_id, status, baseline_json, progress_json, accepted_at)
             VALUES (:player_id, :quest_id, :status, :baseline_json, NULL, NOW())
             ON DUPLICATE KEY UPDATE status = VALUES(status), baseline_json = VALUES(baseline_json), progress_json = NULL, accepted_at = VALUES(accepted_at), claimed_at = NULL'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':quest_id' => (int)$quest['id'],
            ':status' => 'in_progress',
            ':baseline_json' => json_encode($baseline),
        ]);

        $this->resetObjectiveProgressRows((int)$quest['id'], $objectives);
        $this->clearQuestReadCaches();

        return 'Quest accepted.';
    }

    public function claimBasicQuest(string $code): string
    {
        return $this->claimQuest($code, ['Starter', 'Ore Collection', 'NPC Hunt']);
    }

    public function claimPvpQuest(string $code): string
    {
        return $this->claimQuest($code, ['PVP']);
    }

    public function claimHavokQuest(string $code): string
    {
        return $this->claimQuest($code, ['Havok']);
    }

    private function claimQuest(string $code, array $allowedCategories): string
    {
        $this->ensureQuestCatalog();
        $this->ensureNpcRowsOnce();

        $quest = $this->getQuestByCode($code);
        if (!$quest) {
            throw new Exception('Quest not found.');
        }
        if (!in_array((string)$quest['category'], $allowedCategories, true)) {
            throw new Exception('This quest cannot be claimed from this section.');
        }

        try {
            $this->db->beginTransaction();

            $playerQuestStmt = $this->db->prepare(
                'SELECT * FROM site_player_quests WHERE player_id = :player_id AND quest_id = :quest_id LIMIT 1 FOR UPDATE'
            );
            $playerQuestStmt->execute([
                ':player_id' => $this->playerId,
                ':quest_id' => (int)$quest['id'],
            ]);
            $playerQuest = $playerQuestStmt->fetch(PDO::FETCH_ASSOC);

            if (!$playerQuest || (string)$playerQuest['status'] !== 'in_progress') {
                throw new Exception('This quest is not in progress.');
            }

            $objectives = $this->getObjectivesForQuest((int)$quest['id']);
            $progress = $this->buildQuestProgress($objectives, $playerQuest);
            if (!$progress['is_complete']) {
                throw new Exception('Quest objectives are not complete yet.');
            }

            $userStmt = $this->db->prepare(
                'SELECT experience FROM users WHERE id = :player_id LIMIT 1 FOR UPDATE'
            );
            $userStmt->execute([':player_id' => $this->playerId]);
            $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);
            if (!$userRow) {
                throw new Exception('Player account not found.');
            }

            $rewardExperience = (int)$quest['reward_experience'];
            $newExperience = max(0, (int)$userRow['experience'] + $rewardExperience);
            $newLevel = self::getLevelFromExperience($newExperience);

            $rewardStmt = $this->db->prepare(
                'UPDATE users
                 SET credits = credits + :credits,
                     uridium = uridium + :uridium,
                     experience = experience + :experience,
                     level = :level,
                     honor = honor + :honor,
                     ammo_ucb100 = ammo_ucb100 + :ucb100,
                     ammo_rsb75 = ammo_rsb75 + :rsb75
                 WHERE id = :player_id'
            );
            $rewardStmt->execute([
                ':credits' => (int)$quest['reward_credits'],
                ':uridium' => (int)$quest['reward_uridium'],
                ':experience' => $rewardExperience,
                ':level' => $newLevel,
                ':honor' => (int)$quest['reward_honor'],
                ':ucb100' => (int)($quest['reward_ucb100'] ?? 0),
                ':rsb75' => (int)($quest['reward_rsb75'] ?? 0),
                ':player_id' => $this->playerId,
            ]);

            $rewardSeprom = (int)($quest['reward_seprom'] ?? 0);
            if ($rewardSeprom > 0) {
                $this->grantCargoSeprom($rewardSeprom);
            }

            $rewardItemId = (int)($quest['reward_item_id'] ?? 0);
            $rewardItemQty = (int)($quest['reward_item_qty'] ?? 0);
            if ($rewardItemId > 0 && $rewardItemQty > 0) {
                $this->grantInventoryItem($rewardItemId, $rewardItemQty);
            }

            $completeStmt = $this->db->prepare(
                'UPDATE site_player_quests
                 SET status = :status, claimed_at = NOW()
                 WHERE player_id = :player_id AND quest_id = :quest_id'
            );
            $completeStmt->execute([
                ':status' => 'completed',
                ':player_id' => $this->playerId,
                ':quest_id' => (int)$quest['id'],
            ]);

            $this->db->commit();
            $this->clearQuestReadCaches();
            return 'Quest reward claimed.';
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    private function abortQuest(string $code, array $allowedCategories): string
    {
        $this->ensureQuestCatalog();

        $quest = $this->getQuestByCode($code);
        if (!$quest) {
            throw new Exception('Quest not found.');
        }
        if (!in_array((string)$quest['category'], $allowedCategories, true)) {
            throw new Exception('This quest cannot be aborted from this section.');
        }

        try {
            $this->db->beginTransaction();

            $playerQuestStmt = $this->db->prepare(
                'SELECT * FROM site_player_quests WHERE player_id = :player_id AND quest_id = :quest_id LIMIT 1 FOR UPDATE'
            );
            $playerQuestStmt->execute([
                ':player_id' => $this->playerId,
                ':quest_id' => (int)$quest['id'],
            ]);
            $playerQuest = $playerQuestStmt->fetch(PDO::FETCH_ASSOC);

            if (!$playerQuest) {
                throw new Exception('This quest is not in progress.');
            }
            if ((string)$playerQuest['status'] === 'completed') {
                throw new Exception('This quest has already been completed.');
            }
            if ((string)$playerQuest['status'] !== 'in_progress') {
                throw new Exception('This quest is not in progress.');
            }

            $this->deleteObjectiveProgressRows((int)$quest['id']);

            $deleteStmt = $this->db->prepare(
                'DELETE FROM site_player_quests WHERE player_id = :player_id AND quest_id = :quest_id AND status = :status'
            );
            $deleteStmt->execute([
                ':player_id' => $this->playerId,
                ':quest_id' => (int)$quest['id'],
                ':status' => 'in_progress',
            ]);

            $this->db->commit();
            $this->clearQuestReadCaches();
            return 'Quest aborted.';
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function getRewardSyncState(): array
    {
        $stmt = $this->db->prepare(
            'SELECT credits, uridium, experience, honor, level, ammo_ucb100, ammo_rsb75
             FROM users
             WHERE id = :player_id
             LIMIT 1'
        );
        $stmt->execute([':player_id' => $this->playerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return [];
        }

        $experience = (int)($row['experience'] ?? 0);
        $level = (int)($row['level'] ?? 0);
        if ($level <= 0) {
            $level = self::getLevelFromExperience($experience);
        }

        return [
            'credits' => (int)($row['credits'] ?? 0),
            'uridium' => (int)($row['uridium'] ?? 0),
            'experience' => $experience,
            'honor' => (int)($row['honor'] ?? 0),
            'level' => $level,
            'ammo_ucb100' => (int)($row['ammo_ucb100'] ?? 0),
            'ammo_rsb75' => (int)($row['ammo_rsb75'] ?? 0),
            'cargo_seprom' => $this->getCargoSepromAmount(),
        ];
    }

    private static function getLevelFromExperience(int $experience): int
    {
        if ($experience < 10000) {
            return 1;
        }

        $level = 2;
        while ($level < 30 && $experience >= self::experienceForLevel($level + 1)) {
            $level++;
        }

        return $level;
    }

    private static function experienceForLevel(int $level): int
    {
        if ($level <= 1) {
            return 0;
        }

        return 10000 * (2 ** ($level - 2));
    }

    public function claimHuntingContract(string $npcName): string
    {
        $catalog = $this->huntingContractsCatalog();
        if (!isset($catalog[$npcName])) {
            throw new Exception('Invalid hunting contract.');
        }

        $this->ensureNpcRowsOnce();
        $npcColumn = $this->validateNpcName($npcName);
        $data = $catalog[$npcName];

        try {
            $this->db->beginTransaction();

            $countStmt = $this->db->prepare('SELECT `' . $npcColumn . '` FROM users_npc_counts WHERE id = :id LIMIT 1 FOR UPDATE');
            $countStmt->execute([':id' => $this->playerId]);
            $currentKills = (int)$countStmt->fetchColumn();

            $lvlStmt = $this->db->prepare('SELECT `' . $npcColumn . '` FROM users_npc_lvl WHERE id = :id LIMIT 1 FOR UPDATE');
            $lvlStmt->execute([':id' => $this->playerId]);
            $currentLvl = (int)$lvlStmt->fetchColumn();

            if ($currentLvl >= 10) {
                throw new Exception('This hunting contract is already mastered.');
            }

            $k = (int)$data['k'];
            $goal = $this->contractLevelGoal($k, $currentLvl + 1);
            $progressBeforeLevel = $this->contractCumulativeGoal($k, $currentLvl);
            $progressInCurrentLevel = $currentKills - $progressBeforeLevel;

            if ($progressInCurrentLevel < $goal) {
                throw new Exception('This hunting contract is not complete yet.');
            }

            $claimBonus = 1.25;
            $rewardCredits = (int)floor($goal * (int)$data['credits'] * $claimBonus);
            $rewardUridium = (int)floor($goal * (int)$data['uridium'] * $claimBonus);
            $rewardExperience = (int)floor($goal * (int)$data['experience'] * $claimBonus);
            $rewardHonor = (int)floor($goal * (int)$data['honor'] * $claimBonus);

            $this->db->prepare('UPDATE users_npc_lvl SET `' . $npcColumn . '` = `' . $npcColumn . '` + 1 WHERE id = :id')
                ->execute([':id' => $this->playerId]);

            $this->db->prepare(
                'UPDATE users
                 SET credits = credits + :credits,
                     uridium = uridium + :uridium,
                     experience = experience + :experience,
                     honor = honor + :honor
                 WHERE id = :id'
            )->execute([
                ':credits' => $rewardCredits,
                ':uridium' => $rewardUridium,
                ':experience' => $rewardExperience,
                ':honor' => $rewardHonor,
                ':id' => $this->playerId,
            ]);

            $this->db->commit();
            return 'Hunting contract reward claimed.';
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function getBasicQuests(): array
    {
        $this->ensureQuestCatalog();

        return $this->getQuestList("category IN ('Starter', 'Ore Collection', 'NPC Hunt')");
    }

    public function getHavokQuests(): array
    {
        $this->ensureQuestCatalog();

        return $this->getQuestList("category = 'Havok'");
    }

    public function getPvpQuests(): array
    {
        $this->ensureQuestCatalog();

        return $this->getQuestList("category = 'PVP'");
    }

    public function getActiveTrackerQuests(): array
    {
        $this->ensureSchemaInstalled();

        $stmt = $this->db->prepare(
            'SELECT q.*,
                    pq.id AS player_quest_row_id,
                    pq.status AS player_status,
                    pq.baseline_json AS player_baseline_json,
                    pq.progress_json AS player_progress_json,
                    pq.accepted_at AS player_accepted_at,
                    pq.claimed_at AS player_claimed_at
             FROM site_player_quests pq
             INNER JOIN site_quests q ON q.id = pq.quest_id
             WHERE pq.player_id = :player_id
               AND pq.status = :status
               AND q.enabled = 1
             ORDER BY pq.accepted_at ASC, q.sort_order ASC, q.id ASC'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':status' => 'in_progress',
        ]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$rows) {
            return [];
        }

        $objectivesByQuest = $this->getObjectivesGrouped();
        $result = [];
        foreach ($rows as $row) {
            $questId = (int)$row['id'];
            $playerQuest = [
                'id' => (int)$row['player_quest_row_id'],
                'player_id' => $this->playerId,
                'quest_id' => $questId,
                'status' => (string)$row['player_status'],
                'baseline_json' => $row['player_baseline_json'],
                'progress_json' => $row['player_progress_json'],
                'accepted_at' => $row['player_accepted_at'],
                'claimed_at' => $row['player_claimed_at'],
            ];

            $item = $this->formatQuestForOutput($row, $playerQuest, $objectivesByQuest[$questId] ?? []);
            $category = (string)$row['category'];
            $item['group'] = $category === 'PVP' ? 'pvp' : ($category === 'Havok' ? 'havok' : 'basic');
            $result[] = $item;
        }

        return $result;
    }

    private function getQuestList(string $categoryWhere): array
    {
        $questRows = $this->db->query('SELECT * FROM site_quests WHERE enabled = 1 AND ' . $categoryWhere . ' ORDER BY sort_order ASC, id ASC')->fetchAll(PDO::FETCH_ASSOC);
        $objectivesByQuest = $this->getObjectivesGrouped();
        $playerRows = $this->getPlayerQuestRows();

        $result = [];
        foreach ($questRows as $quest) {
            $questId = (int)$quest['id'];
            $result[] = $this->formatQuestForOutput($quest, $playerRows[$questId] ?? null, $objectivesByQuest[$questId] ?? []);
        }

        usort($result, function (array $left, array $right): int {
            $leftPriority = $this->questDisplayPriority($left);
            $rightPriority = $this->questDisplayPriority($right);
            if ($leftPriority !== $rightPriority) {
                return $leftPriority <=> $rightPriority;
            }

            $leftSort = (int)($left['sort_order'] ?? 0);
            $rightSort = (int)($right['sort_order'] ?? 0);
            if ($leftSort !== $rightSort) {
                return $leftSort <=> $rightSort;
            }

            return (int)$left['id'] <=> (int)$right['id'];
        });

        return $result;
    }

    private function questDisplayPriority(array $quest): int
    {
        $status = (string)($quest['status'] ?? 'available');
        if ($status === 'completed') {
            return 40;
        }
        if ($status === 'in_progress' && !empty($quest['is_complete'])) {
            return 10;
        }
        if ($status === 'in_progress') {
            return 20;
        }
        return 30;
    }

    private function formatQuestForOutput(array $quest, ?array $playerQuest, array $objectives): array
    {
        $questId = (int)$quest['id'];
        $progress = $this->buildQuestProgress($objectives, $playerQuest);

        $status = 'available';
        if ($playerQuest) {
            $status = (string)$playerQuest['status'];
        }

        return [
            'id' => $questId,
            'code' => (string)$quest['code'],
            'title' => (string)$quest['title'],
            'description' => (string)$quest['description'],
            'category' => (string)$quest['category'],
            'sort_order' => (int)($quest['sort_order'] ?? 0),
            'status' => $status,
            'accepted_at' => $playerQuest['accepted_at'] ?? null,
            'claimed_at' => $playerQuest['claimed_at'] ?? null,
            'objectives' => $progress['objectives'],
            'is_complete' => $progress['is_complete'],
            'reward_credits' => (int)$quest['reward_credits'],
            'reward_uridium' => (int)$quest['reward_uridium'],
            'reward_experience' => (int)$quest['reward_experience'],
            'reward_honor' => (int)$quest['reward_honor'],
            'reward_ucb100' => (int)($quest['reward_ucb100'] ?? 0),
            'reward_rsb75' => (int)($quest['reward_rsb75'] ?? 0),
            'reward_seprom' => (int)($quest['reward_seprom'] ?? 0),
            'reward_item_id' => (int)($quest['reward_item_id'] ?? 0),
            'reward_item_qty' => (int)($quest['reward_item_qty'] ?? 0),
            'reward_item_name' => $this->rewardItemName((int)($quest['reward_item_id'] ?? 0)),
        ];
    }

    public function getHuntingContracts(): array
    {
        $this->ensureNpcRowsOnce();
        $counts = $this->getNpcCounts();
        $levels = $this->getNpcLevels();
        $result = [];

        foreach ($this->huntingContractsCatalog() as $npcName => $data) {
            $lvl = (int)($levels[$npcName] ?? 0);
            $totalKills = (int)($counts[$npcName] ?? 0);
            $k = (int)$data['k'];
            $goal = $this->contractLevelGoal($k, $lvl + 1);
            $killsBeforeThisLevel = $this->contractCumulativeGoal($k, $lvl);
            $progressInCurrentLevel = $totalKills - $killsBeforeThisLevel;
            $displayProgress = max(0, min($progressInCurrentLevel, $goal));
            $pct = $goal > 0 ? min(100, ($displayProgress / $goal) * 100) : 0;
            $canClaim = ($progressInCurrentLevel >= $goal && $lvl < 10);
            $isMaxed = ($lvl >= 10);
            $claimBonus = 1.25;

            $result[] = [
                'npc' => $npcName,
                'level' => $lvl,
                'goal' => $goal,
                'progress' => $displayProgress,
                'percent' => $pct,
                'can_claim' => $canClaim,
                'is_maxed' => $isMaxed,
                'reward_credits' => (int)floor($goal * (int)$data['credits'] * $claimBonus),
                'reward_uridium' => (int)floor($goal * (int)$data['uridium'] * $claimBonus),
                'reward_experience' => (int)floor($goal * (int)$data['experience'] * $claimBonus),
                'reward_honor' => (int)floor($goal * (int)$data['honor'] * $claimBonus),
            ];
        }

        return $result;
    }

    public function getActiveQuestCount(): int
    {
        $this->ensureSchemaInstalled();
        return $this->getActiveSiteQuestCount();
    }

    public function getMaxActiveQuestCount(): int
    {
        return self::MAX_ACTIVE_SITE_QUESTS;
    }

    private function installSchema(): void
    {
        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS site_quests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(64) NOT NULL UNIQUE,
                title VARCHAR(180) NOT NULL,
                description TEXT NOT NULL,
                category VARCHAR(64) NOT NULL DEFAULT 'Basic',
                min_level INT NOT NULL DEFAULT 0,
                reward_credits BIGINT NOT NULL DEFAULT 0,
                reward_uridium BIGINT NOT NULL DEFAULT 0,
                reward_experience BIGINT NOT NULL DEFAULT 0,
                reward_honor BIGINT NOT NULL DEFAULT 0,
                reward_ucb100 BIGINT NOT NULL DEFAULT 0,
                reward_rsb75 BIGINT NOT NULL DEFAULT 0,
                reward_seprom BIGINT NOT NULL DEFAULT 0,
                reward_item_id INT NOT NULL DEFAULT 0,
                reward_item_qty INT NOT NULL DEFAULT 0,
                enabled TINYINT(1) NOT NULL DEFAULT 1,
                sort_order INT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY idx_enabled_sort (enabled, sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS site_quest_objectives (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quest_id INT NOT NULL,
                objective_type VARCHAR(32) NOT NULL,
                target_key VARCHAR(64) NOT NULL,
                required_amount INT NOT NULL DEFAULT 1,
                sort_order INT NOT NULL DEFAULT 0,
                KEY idx_quest_sort (quest_id, sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS site_player_quests (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                player_id INT NOT NULL,
                quest_id INT NOT NULL,
                status VARCHAR(24) NOT NULL DEFAULT 'in_progress',
                baseline_json TEXT NULL,
                progress_json TEXT NULL,
                accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                claimed_at DATETIME DEFAULT NULL,
                UNIQUE KEY uniq_player_quest (player_id, quest_id),
                KEY idx_player_status (player_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS site_quest_ore_counts (
                player_id INT NOT NULL PRIMARY KEY,
                prometium BIGINT NOT NULL DEFAULT 0,
                endurium BIGINT NOT NULL DEFAULT 0,
                terbium BIGINT NOT NULL DEFAULT 0,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS site_player_quest_objective_progress (
                player_id INT NOT NULL,
                quest_id INT NOT NULL,
                objective_type VARCHAR(32) NOT NULL,
                target_key VARCHAR(64) NOT NULL,
                current_amount INT NOT NULL DEFAULT 0,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (player_id, quest_id, objective_type, target_key),
                KEY idx_player_quest (player_id, quest_id),
                KEY idx_player_objective (player_id, objective_type, target_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->ensureColumn('site_quests', 'reward_ucb100', 'BIGINT NOT NULL DEFAULT 0 AFTER reward_honor');
        $this->ensureColumn('site_quests', 'reward_rsb75', 'BIGINT NOT NULL DEFAULT 0 AFTER reward_ucb100');
        $this->ensureColumn('site_quests', 'reward_seprom', 'BIGINT NOT NULL DEFAULT 0 AFTER reward_rsb75');
        $this->ensureColumn('site_quests', 'reward_item_id', 'INT NOT NULL DEFAULT 0 AFTER reward_seprom');
        $this->ensureColumn('site_quests', 'reward_item_qty', 'INT NOT NULL DEFAULT 0 AFTER reward_item_id');
        $this->ensureColumn('site_player_quests', 'progress_json', 'TEXT NULL AFTER baseline_json');
    }

    private function ensureColumn(string $table, string $column, string $definition): void
    {
        try {
            $quotedColumn = $this->db->quote($column);
            $stmt = $this->db->query('SHOW COLUMNS FROM `' . $table . '` LIKE ' . $quotedColumn);
            if (!$stmt || !$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->db->exec('ALTER TABLE `' . $table . '` ADD COLUMN `' . $column . '` ' . $definition);
            }
        } catch (Exception $e) {
            // The next write will expose the issue. This keeps older local setups tolerant.
        }
    }

    private function syncBasicQuestCatalog(): void
    {
        $this->syncQuestCatalogItems($this->basicQuestCatalog());
    }

    private function syncPvpQuestCatalog(): void
    {
        $this->syncQuestCatalogItems($this->pvpQuestCatalog());
    }

    private function syncHavokQuestCatalog(): void
    {
        $this->syncQuestCatalogItems($this->havokQuestCatalog());
    }

    private function syncQuestCatalogItems(array $quests): void
    {
        foreach ($quests as $quest) {
            $stmt = $this->db->prepare(
                'INSERT INTO site_quests (code, title, description, category, min_level, reward_credits, reward_uridium, reward_experience, reward_honor, reward_ucb100, reward_rsb75, reward_seprom, reward_item_id, reward_item_qty, enabled, sort_order)
                 VALUES (:code, :title, :description, :category, :min_level, :reward_credits, :reward_uridium, :reward_experience, :reward_honor, :reward_ucb100, :reward_rsb75, :reward_seprom, :reward_item_id, :reward_item_qty, 1, :sort_order)
                 ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    description = VALUES(description),
                    category = VALUES(category),
                    min_level = VALUES(min_level),
                    reward_credits = VALUES(reward_credits),
                    reward_uridium = VALUES(reward_uridium),
                    reward_experience = VALUES(reward_experience),
                    reward_honor = VALUES(reward_honor),
                    reward_ucb100 = VALUES(reward_ucb100),
                    reward_rsb75 = VALUES(reward_rsb75),
                    reward_seprom = VALUES(reward_seprom),
                    reward_item_id = VALUES(reward_item_id),
                    reward_item_qty = VALUES(reward_item_qty),
                    enabled = 1,
                    sort_order = VALUES(sort_order)'
            );
            $stmt->execute([
                ':code' => $quest['code'],
                ':title' => $quest['title'],
                ':description' => $quest['description'],
                ':category' => $quest['category'],
                ':min_level' => (int)$quest['min_level'],
                ':reward_credits' => (int)$quest['reward_credits'],
                ':reward_uridium' => (int)$quest['reward_uridium'],
                ':reward_experience' => (int)$quest['reward_experience'],
                ':reward_honor' => (int)$quest['reward_honor'],
                ':reward_ucb100' => (int)($quest['reward_ucb100'] ?? 0),
                ':reward_rsb75' => (int)($quest['reward_rsb75'] ?? 0),
                ':reward_seprom' => (int)($quest['reward_seprom'] ?? 0),
                ':reward_item_id' => (int)($quest['reward_item_id'] ?? 0),
                ':reward_item_qty' => (int)($quest['reward_item_qty'] ?? 0),
                ':sort_order' => (int)$quest['sort_order'],
            ]);

            $questId = (int)$this->db->lastInsertId();
            if ($questId <= 0) {
                $idStmt = $this->db->prepare('SELECT id FROM site_quests WHERE code = :code LIMIT 1');
                $idStmt->execute([':code' => $quest['code']]);
                $questId = (int)$idStmt->fetchColumn();
            }

            $this->db->prepare('DELETE FROM site_quest_objectives WHERE quest_id = :quest_id')->execute([':quest_id' => $questId]);
            foreach ($quest['objectives'] as $idx => $objective) {
                $objStmt = $this->db->prepare(
                    'INSERT INTO site_quest_objectives (quest_id, objective_type, target_key, required_amount, sort_order)
                     VALUES (:quest_id, :objective_type, :target_key, :required_amount, :sort_order)'
                );
                $objStmt->execute([
                    ':quest_id' => $questId,
                    ':objective_type' => $objective['type'],
                    ':target_key' => $objective['target'],
                    ':required_amount' => (int)$objective['amount'],
                    ':sort_order' => ($idx + 1) * 10,
                ]);
            }
        }
    }

    private function getQuestByCode(string $code): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM site_quests WHERE code = :code AND enabled = 1 LIMIT 1');
        $stmt->execute([':code' => $code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function getPlayerQuestRow(int $questId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM site_player_quests WHERE player_id = :player_id AND quest_id = :quest_id LIMIT 1');
        $stmt->execute([':player_id' => $this->playerId, ':quest_id' => $questId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function getPlayerQuestRows(): array
    {
        if ($this->playerQuestRowsCache !== null) {
            return $this->playerQuestRowsCache;
        }

        $stmt = $this->db->prepare('SELECT * FROM site_player_quests WHERE player_id = :player_id');
        $stmt->execute([':player_id' => $this->playerId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $indexed = [];
        foreach ($rows as $row) {
            $indexed[(int)$row['quest_id']] = $row;
        }
        $this->playerQuestRowsCache = $indexed;
        return $indexed;
    }

    private function getObjectivesForQuest(int $questId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM site_quest_objectives WHERE quest_id = :quest_id ORDER BY sort_order ASC, id ASC');
        $stmt->execute([':quest_id' => $questId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getObjectivesGrouped(): array
    {
        if ($this->objectivesGroupedCache !== null) {
            return $this->objectivesGroupedCache;
        }

        $rows = $this->db->query('SELECT * FROM site_quest_objectives ORDER BY quest_id ASC, sort_order ASC, id ASC')->fetchAll(PDO::FETCH_ASSOC);
        $grouped = [];
        foreach ($rows as $row) {
            $grouped[(int)$row['quest_id']][] = $row;
        }
        $this->objectivesGroupedCache = $grouped;
        return $grouped;
    }

    private function buildBaseline(array $objectives): array
    {
        $baseline = ['npc' => [], 'ore' => [], 'pvp' => [], 'ore_source' => 'quest_ore_counts'];
        $npcTargets = [];
        $oreTargets = [];
        $needsPvpBaseline = false;

        foreach ($objectives as $objective) {
            $type = (string)$objective['objective_type'];
            if ($type === 'npc_kill') {
                $npcTargets[] = (string)$objective['target_key'];
            } elseif ($type === 'ore_have') {
                $oreTargets[] = (string)$objective['target_key'];
            } elseif ($type === 'player_kill') {
                $needsPvpBaseline = true;
            }
        }

        if ($npcTargets) {
            $counts = $this->getNpcCounts($npcTargets);
            foreach (array_unique($npcTargets) as $target) {
                $baseline['npc'][$target] = (int)($counts[$target] ?? 0);
            }
        }

        if ($oreTargets) {
            $oreCounts = $this->getQuestOreCounts($oreTargets);
            foreach (array_unique($oreTargets) as $target) {
                $column = $this->oreColumn($target);
                $baseline['ore'][$target] = (int)($oreCounts[$column] ?? 0);
            }
            $baseline['ore_source'] = 'quest_ore_counts';
        }

        if ($needsPvpBaseline) {
            $baseline['pvp']['user_kill'] = $this->getPlayerKillCount();
        }

        return $baseline;
    }

    private function ensurePlayerQuestBaseline(array $playerQuest, array $objectives): array
    {
        $baseline = ['npc' => [], 'ore' => [], 'pvp' => []];
        if (!empty($playerQuest['baseline_json'])) {
            $decoded = json_decode((string)$playerQuest['baseline_json'], true);
            if (is_array($decoded)) {
                $baseline = array_replace_recursive($baseline, $decoded);
            }
        }

        $changed = false;
        $npcTargets = [];
        $oreTargets = [];
        $needsPvpBaseline = false;
        foreach ($objectives as $objective) {
            $type = (string)$objective['objective_type'];
            $target = (string)$objective['target_key'];
            if ($type === 'npc_kill' && !array_key_exists($target, $baseline['npc'])) {
                $npcTargets[] = $target;
            }
            if ($type === 'ore_have' && !array_key_exists($target, $baseline['ore'])) {
                $oreTargets[] = $target;
            }
            if ($type === 'player_kill' && !array_key_exists('user_kill', $baseline['pvp'])) {
                $needsPvpBaseline = true;
            }
        }

        if ($npcTargets) {
            $counts = $this->getNpcCounts($npcTargets);
            foreach (array_unique($npcTargets) as $target) {
                $baseline['npc'][$target] = (int)($counts[$target] ?? 0);
                $changed = true;
            }
        }

        if ($oreTargets) {
            $oreCounts = $this->getQuestOreCounts($oreTargets);
            foreach (array_unique($oreTargets) as $target) {
                $column = $this->oreColumn($target);
                $baseline['ore'][$target] = (int)($oreCounts[$column] ?? 0);
                $changed = true;
            }
            $baseline['ore_source'] = 'quest_ore_counts';
        }

        if ($needsPvpBaseline) {
            $baseline['pvp']['user_kill'] = $this->getPlayerKillCount();
            $changed = true;
        }

        if ($changed && isset($playerQuest['id'])) {
            $playerQuest['baseline_json'] = json_encode($baseline);
            $stmt = $this->db->prepare('UPDATE site_player_quests SET baseline_json = :baseline_json WHERE id = :id AND player_id = :player_id');
            $stmt->execute([
                ':baseline_json' => $playerQuest['baseline_json'],
                ':id' => (int)$playerQuest['id'],
                ':player_id' => $this->playerId,
            ]);
        }

        return $playerQuest;
    }

    private function getActiveSiteQuestCount(): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM site_player_quests WHERE player_id = :player_id AND status = :status');
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':status' => 'in_progress',
        ]);
        return (int)$stmt->fetchColumn();
    }

    private function resetObjectiveProgressRows(int $questId, array $objectives): void
    {
        $this->deleteObjectiveProgressRows($questId);

        $stmt = $this->db->prepare(
            'INSERT INTO site_player_quest_objective_progress
                (player_id, quest_id, objective_type, target_key, current_amount)
             VALUES
                (:player_id, :quest_id, :objective_type, :target_key, 0)'
        );

        foreach ($objectives as $objective) {
            $stmt->execute([
                ':player_id' => $this->playerId,
                ':quest_id' => $questId,
                ':objective_type' => (string)$objective['objective_type'],
                ':target_key' => (string)$objective['target_key'],
            ]);
        }
    }

    private function deleteObjectiveProgressRows(int $questId): void
    {
        $stmt = $this->db->prepare(
            'DELETE FROM site_player_quest_objective_progress WHERE player_id = :player_id AND quest_id = :quest_id'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':quest_id' => $questId,
        ]);
    }

    private function ensureObjectiveProgressRows(int $questId, array $objectives, array $playerQuest): void
    {
        if ((string)($playerQuest['status'] ?? '') !== 'in_progress') {
            return;
        }

        $progressState = $this->decodeProgressState($playerQuest);
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO site_player_quest_objective_progress
                (player_id, quest_id, objective_type, target_key, current_amount)
             VALUES
                (:player_id, :quest_id, :objective_type, :target_key, :current_amount)'
        );

        foreach ($objectives as $objective) {
            $type = (string)$objective['objective_type'];
            $target = (string)$objective['target_key'];
            $required = (int)$objective['required_amount'];
            $seed = min($required, max(0, $this->legacyProgressAmount($progressState, $type, $target)));

            $stmt->execute([
                ':player_id' => $this->playerId,
                ':quest_id' => $questId,
                ':objective_type' => $type,
                ':target_key' => $target,
                ':current_amount' => $seed,
            ]);
        }
    }

    private function decodeProgressState(?array $playerQuest): array
    {
        $progressState = ['npc' => [], 'ore' => [], 'pvp' => [], 'gate' => []];
        if ($playerQuest && !empty($playerQuest['progress_json'])) {
            $decodedProgress = json_decode((string)$playerQuest['progress_json'], true);
            if (is_array($decodedProgress)) {
                $progressState = array_replace_recursive($progressState, $decodedProgress);
            }
        }
        return $progressState;
    }

    private function legacyProgressAmount(array $progressState, string $type, string $target): int
    {
        if ($type === 'npc_kill') {
            return (int)($progressState['npc'][$target] ?? 0);
        }
        if ($type === 'ore_have') {
            return (int)($progressState['ore'][$target] ?? 0);
        }
        if ($type === 'player_kill') {
            return (int)($progressState['pvp'][$target] ?? $progressState['pvp']['user_kill'] ?? 0);
        }
        if ($type === 'galaxy_gate_complete') {
            return (int)($progressState['gate'][$target] ?? 0);
        }
        return 0;
    }

    private function getObjectiveProgressRows(int $questId): array
    {
        $stmt = $this->db->prepare(
            'SELECT objective_type, target_key, current_amount
             FROM site_player_quest_objective_progress
             WHERE player_id = :player_id AND quest_id = :quest_id'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':quest_id' => $questId,
        ]);

        $progress = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $key = (string)$row['objective_type'] . '|' . (string)$row['target_key'];
            $progress[$key] = (int)$row['current_amount'];
        }

        return $progress;
    }

    private function buildQuestProgress(array $objectives, ?array $playerQuest): array
    {
        $isCompletedPlayerQuest = $playerQuest && (string)($playerQuest['status'] ?? '') === 'completed';
        $isInProgressPlayerQuest = $playerQuest && (string)($playerQuest['status'] ?? '') === 'in_progress';
        $questId = $playerQuest ? (int)($playerQuest['quest_id'] ?? 0) : 0;

        $strictProgress = [];
        if ($isInProgressPlayerQuest && $questId > 0) {
            $this->ensureObjectiveProgressRows($questId, $objectives, $playerQuest);
            $strictProgress = $this->getObjectiveProgressRows($questId);
        }

        $items = [];
        $isComplete = true;

        foreach ($objectives as $objective) {
            $type = (string)$objective['objective_type'];
            $target = (string)$objective['target_key'];
            $required = (int)$objective['required_amount'];
            $current = 0;
            $label = '';

            if ($type === 'npc_kill') {
                $label = 'Destroy ' . number_format($required) . ' ' . $this->pluralizeNpc($target, $required);
            } elseif ($type === 'ore_have') {
                $label = 'Collect ' . number_format($required) . ' ' . $target . ' in cargo when a ship is destroyed';
            } elseif ($type === 'player_kill') {
                $label = 'Destroy ' . number_format($required) . ' player ' . ($required === 1 ? 'ship' : 'ships');
            } elseif ($type === 'galaxy_gate_complete') {
                $label = 'Complete ' . number_format($required) . ' Galaxy Gate ' . $target . ($required === 1 ? '' : 's');
            }

            if ($isCompletedPlayerQuest) {
                $current = $required;
            } elseif ($isInProgressPlayerQuest) {
                $current = (int)($strictProgress[$type . '|' . $target] ?? 0);
            }

            $displayCurrent = min($current, $required);
            $complete = ($current >= $required);
            if (!$complete) {
                $isComplete = false;
            }

            $items[] = [
                'type' => $type,
                'target' => $target,
                'required' => $required,
                'current' => $displayCurrent,
                'raw_current' => $current,
                'percent' => $required > 0 ? min(100, ($displayCurrent / $required) * 100) : 100,
                'complete' => $complete,
                'label' => $label,
            ];
        }

        if (!$playerQuest) {
            $isComplete = false;
        }

        return ['is_complete' => $isComplete, 'objectives' => $items];
    }

    private function ensureNpcRows(): void
    {
        $this->db->prepare('INSERT IGNORE INTO users_npc_counts (id) VALUES (:id)')->execute([':id' => $this->playerId]);
        $this->db->prepare('INSERT IGNORE INTO users_npc_lvl (id) VALUES (:id)')->execute([':id' => $this->playerId]);
    }

    private function getNpcCounts(array $targets = []): array
    {
        $columns = $targets ? array_unique($targets) : array_keys($this->npcColumns());
        $safeColumns = [];
        $virtualCounts = [];
        foreach ($columns as $column) {
            $column = (string)$column;
            if ($column === 'StreuneR_X8') {
                // StreuneR from x-8 is tracked only by live quest progress rows.
                // Do not query users_npc_counts: MySQL column names/collations can treat
                // Streuner and StreuneR as the same key on some installs.
                $virtualCounts['StreuneR_X8'] = 0;
                continue;
            }
            $safeColumns[] = '`' . $this->validateNpcName($column) . '`';
        }
        if (!$safeColumns) {
            return $virtualCounts;
        }

        $stmt = $this->db->prepare('SELECT ' . implode(', ', $safeColumns) . ' FROM users_npc_counts WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $this->playerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return array_merge($virtualCounts, $row ?: []);
    }

    private function getNpcLevels(): array
    {
        $safeColumns = array_map(function ($column) {
            return '`' . $column . '`';
        }, array_keys($this->npcColumns()));
        $stmt = $this->db->prepare('SELECT ' . implode(', ', $safeColumns) . ' FROM users_npc_lvl WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $this->playerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: [];
    }

    private function getQuestOreCounts(array $targets = []): array
    {
        $defaults = ['prometium' => 0, 'endurium' => 0, 'terbium' => 0];

        try {
            $this->db->prepare('INSERT IGNORE INTO site_quest_ore_counts (player_id) VALUES (:id)')->execute([':id' => $this->playerId]);

            $columns = [];
            $targetList = $targets ? array_unique($targets) : ['Prometium', 'Endurium', 'Terbium'];
            foreach ($targetList as $target) {
                $columns[] = '`' . $this->oreColumn((string)$target) . '`';
            }
            if (!$columns) {
                return $defaults;
            }

            $stmt = $this->db->prepare('SELECT ' . implode(', ', $columns) . ' FROM site_quest_ore_counts WHERE player_id = :id LIMIT 1');
            $stmt->execute([':id' => $this->playerId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                return $defaults;
            }

            return array_merge($defaults, $row);
        } catch (Exception $e) {
            return $defaults;
        }
    }

    private function getCargoAmounts(): array
    {
        try {
            $stmt = $this->db->prepare('SELECT prometium, endurium, terbium FROM player_cargo WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $this->playerId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                return ['prometium' => 0, 'endurium' => 0, 'terbium' => 0];
            }
            return $row;
        } catch (Exception $e) {
            return ['prometium' => 0, 'endurium' => 0, 'terbium' => 0];
        }
    }

    private function getPlayerKillCount(): int
    {
        try {
            $stmt = $this->db->prepare('SELECT user_kill FROM users WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $this->playerId]);
            return (int)$stmt->fetchColumn();
        } catch (Exception $e) {
            return 0;
        }
    }

    private function validateNpcName(string $npcName): string
    {
        $columns = $this->npcColumns();
        if (!isset($columns[$npcName])) {
            throw new Exception('Invalid NPC target.');
        }
        return $columns[$npcName];
    }

    private function npcColumns(): array
    {
        return [
            'Streuner' => 'Streuner',
            'Lordakia' => 'Lordakia',
            'Saimon' => 'Saimon',
            'Mordon' => 'Mordon',
            'Devolarium' => 'Devolarium',
            'Sibelon' => 'Sibelon',
            'Sibelonit' => 'Sibelonit',
            'Lordakium' => 'Lordakium',
            'Kristallin' => 'Kristallin',
            'Kristallon' => 'Kristallon',
            'Cubikon' => 'Cubikon',
        ];
    }

    private function oreColumn(string $ore): string
    {
        $map = [
            'Prometium' => 'prometium',
            'Endurium' => 'endurium',
            'Terbium' => 'terbium',
        ];
        if (!isset($map[$ore])) {
            throw new Exception('Invalid ore target.');
        }
        return $map[$ore];
    }

    private function contractLevelGoal(int $k, int $lvl): int
    {
        return (int)floor($k * pow($lvl, 3));
    }

    private function contractCumulativeGoal(int $k, int $lvl): int
    {
        if ($lvl <= 0) {
            return 0;
        }
        $count = 0;
        for ($i = 1; $i <= $lvl; $i++) {
            $count += $this->contractLevelGoal($k, $i);
        }
        return $count;
    }

    private function pluralizeNpc(string $npc, int $amount): string
    {
        if ($amount === 1) {
            return $npc;
        }
        $special = [
            'Lordakia' => 'Lordakia',
            'StreuneR_X8' => 'StreuneR',
            'Devolarium' => 'Devolariums',
            'Saimon' => 'Saimons',
        ];
        return $special[$npc] ?? ($npc . 's');
    }

    private function basicQuestCatalog(): array
    {
        $quests = [
            [
                'code' => 'first_assignment',
                'title' => 'First assignment',
                'description' => 'Time for your first assignment: collect 8 Prometium found in cargo when a ship is destroyed, then destroy 6 Streuners.',
                'category' => 'Starter',
                'min_level' => 0,
                'reward_credits' => 2000000,
                'reward_uridium' => 12000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 10,
                'objectives' => [
                    ['type' => 'ore_have', 'target' => 'Prometium', 'amount' => 8],
                    ['type' => 'npc_kill', 'target' => 'Streuner', 'amount' => 6],
                ],
            ],
            [
                'code' => 'collecting_mission_1',
                'title' => 'Collecting mission',
                'description' => 'Collect 20 Prometium, the little red rocks found in cargo when a ship is destroyed.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 1000000,
                'reward_uridium' => 6000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 20,
                'objectives' => [['type' => 'ore_have', 'target' => 'Prometium', 'amount' => 20]],
            ],
            [
                'code' => 'collecting_mission_2',
                'title' => 'Collecting mission (2)',
                'description' => 'Collect 40 Prometium, the little red rocks found in cargo when a ship is destroyed.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 2000000,
                'reward_uridium' => 12000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 30,
                'objectives' => [['type' => 'ore_have', 'target' => 'Prometium', 'amount' => 40]],
            ],
            [
                'code' => 'collecting_mission_3',
                'title' => 'Collecting mission (3)',
                'description' => 'Collect 80 Prometium, the little red rocks found in cargo when a ship is destroyed.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 3000000,
                'reward_uridium' => 20000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 40,
                'objectives' => [['type' => 'ore_have', 'target' => 'Prometium', 'amount' => 80]],
            ],
            [
                'code' => 'ore_wanted_now_1',
                'title' => 'Ore wanted now',
                'description' => 'Collect 30 Endurium, the blue rocks found in cargo when a ship is destroyed.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 1500000,
                'reward_uridium' => 8000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 50,
                'objectives' => [['type' => 'ore_have', 'target' => 'Endurium', 'amount' => 30]],
            ],
            [
                'code' => 'ore_wanted_now_2',
                'title' => 'Ore wanted now! (2)',
                'description' => 'Collect 60 Endurium, the blue rocks found in cargo when a ship is destroyed.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 3000000,
                'reward_uridium' => 16000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 60,
                'objectives' => [['type' => 'ore_have', 'target' => 'Endurium', 'amount' => 60]],
            ],
            [
                'code' => 'ore_wanted_now_3',
                'title' => 'Ore wanted now! (3)',
                'description' => 'Collect 120 Endurium, the blue rocks found in cargo when a ship is destroyed.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 5000000,
                'reward_uridium' => 28000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 70,
                'objectives' => [['type' => 'ore_have', 'target' => 'Endurium', 'amount' => 120]],
            ],
            [
                'code' => 'terbium_wanted_now_1',
                'title' => 'Terbium wanted now!',
                'description' => 'Collect 40 Terbium, the golden rocks found in cargo when a ship is destroyed.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 3000000,
                'reward_uridium' => 14000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 80,
                'objectives' => [['type' => 'ore_have', 'target' => 'Terbium', 'amount' => 40]],
            ],
            [
                'code' => 'terbium_wanted_now_2',
                'title' => 'Terbium wanted now! (2)',
                'description' => 'Collect 80 Terbium, the golden rocks found in cargo when a ship is destroyed.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 5000000,
                'reward_uridium' => 26000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 90,
                'objectives' => [['type' => 'ore_have', 'target' => 'Terbium', 'amount' => 80]],
            ],
            [
                'code' => 'show_us_1',
                'title' => "Show us what you're made of!",
                'description' => 'Those pesky Streuners keep interfering with our work. Destroy 5 of them.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 1500000,
                'reward_uridium' => 8000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 100,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Streuner', 'amount' => 5]],
            ],
            [
                'code' => 'show_us_2',
                'title' => "Show us what you're made of! (2)",
                'description' => 'There are still way too many Streuners. Shoot down another 10 of them.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 3000000,
                'reward_uridium' => 15000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 110,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Streuner', 'amount' => 10]],
            ],
            [
                'code' => 'show_us_3',
                'title' => "Show us what you're made of! (3)",
                'description' => 'The Streuners are getting harder to hold back. Destroy 20 of them.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 5000000,
                'reward_uridium' => 30000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 120,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Streuner', 'amount' => 20]],
            ],
            [
                'code' => 'lordakia_1',
                'title' => 'Lordakians sighted!',
                'description' => 'Lordakians have been sighted near our sectors. Destroy 10 Lordakia.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 3000000,
                'reward_uridium' => 18000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 130,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Lordakia', 'amount' => 10]],
            ],
            [
                'code' => 'lordakia_2',
                'title' => 'Lordakians sighted! (2)',
                'description' => 'The Lordakians seem to be regrouping. Destroy 20 of them.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 5000000,
                'reward_uridium' => 28000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 140,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Lordakia', 'amount' => 20]],
            ],
            [
                'code' => 'lordakia_3',
                'title' => 'Lordakians sighted! (3)',
                'description' => 'The Lordakians have started attacking our sectors. Destroy 40 Lordakia.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 7000000,
                'reward_uridium' => 50000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 150,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Lordakia', 'amount' => 40]],
            ],
            [
                'code' => 'mordons_1',
                'title' => 'Battle of the Mordons!',
                'description' => 'Our scouts assume the Mordons are behind attacks around Planet Terra. Destroy 10 Mordons.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 4000000,
                'reward_uridium' => 22000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 160,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Mordon', 'amount' => 10]],
            ],
            [
                'code' => 'mordons_2',
                'title' => 'Battle of the Mordons! (2)',
                'description' => 'The Mordons are not giving up. Destroy 20 Mordons.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 6000000,
                'reward_uridium' => 38000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 170,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Mordon', 'amount' => 20]],
            ],
            [
                'code' => 'devolarian_invasion',
                'title' => 'Devolarian invasion!',
                'description' => 'Red alert! Devolariums are attacking colonies in the X-3 sectors. Destroy 3 Devolariums.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 4000000,
                'reward_uridium' => 25000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 180,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Devolarium', 'amount' => 3]],
            ],
            [
                'code' => 'saimonites_1',
                'title' => 'Wretched Saimonites!',
                'description' => 'Saimonites are aggressive and fast. Destroy 20 Saimons on the X-3 and X-4 maps.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 3000000,
                'reward_uridium' => 24000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 190,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Saimon', 'amount' => 20]],
            ],
            [
                'code' => 'saimonites_2',
                'title' => 'Wretched Saimonites! (2)',
                'description' => 'We cannot allow the Saimonites to keep getting in our way. Destroy 40 Saimons.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 3000000,
                'reward_uridium' => 50000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 200,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Saimon', 'amount' => 40]],
            ],
            [
                'code' => 'classic_diversion',
                'title' => 'Diversion',
                'description' => 'Create a diversion by destroying 1 Devolarium.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 1500000,
                'reward_uridium' => 8000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 210,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Devolarium', 'amount' => 1]],
            ],
            [
                'code' => 'classic_mysterious_cube',
                'title' => 'Mysterious Cube',
                'description' => 'Destroy 3 Saimons, 1 Devolarium and 1 Mordon to secure the sector.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 3500000,
                'reward_uridium' => 12000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 220,
                'objectives' => [
                    ['type' => 'npc_kill', 'target' => 'Saimon', 'amount' => 3],
                    ['type' => 'npc_kill', 'target' => 'Devolarium', 'amount' => 1],
                    ['type' => 'npc_kill', 'target' => 'Mordon', 'amount' => 1],
                ],
            ],
            [
                'code' => 'classic_hold_position',
                'title' => 'Hold Position!',
                'description' => 'Hold your position by destroying 10 Lordakia and 2 Devolariums.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 5000000,
                'reward_uridium' => 18000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 230,
                'objectives' => [
                    ['type' => 'npc_kill', 'target' => 'Lordakia', 'amount' => 10],
                    ['type' => 'npc_kill', 'target' => 'Devolarium', 'amount' => 2],
                ],
            ],
            [
                'code' => 'classic_tour_de_force',
                'title' => 'Tour de Force',
                'description' => 'Destroy one alien of each supported classic type, from Streuner to Cubikon.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 25000000,
                'reward_uridium' => 50000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 240,
                'objectives' => [
                    ['type' => 'npc_kill', 'target' => 'Streuner', 'amount' => 1],
                    ['type' => 'npc_kill', 'target' => 'Lordakia', 'amount' => 1],
                    ['type' => 'npc_kill', 'target' => 'Saimon', 'amount' => 1],
                    ['type' => 'npc_kill', 'target' => 'Mordon', 'amount' => 1],
                    ['type' => 'npc_kill', 'target' => 'Devolarium', 'amount' => 1],
                    ['type' => 'npc_kill', 'target' => 'Sibelon', 'amount' => 1],
                    ['type' => 'npc_kill', 'target' => 'Sibelonit', 'amount' => 1],
                    ['type' => 'npc_kill', 'target' => 'Lordakium', 'amount' => 1],
                    ['type' => 'npc_kill', 'target' => 'Kristallin', 'amount' => 1],
                    ['type' => 'npc_kill', 'target' => 'Kristallon', 'amount' => 1],
                    ['type' => 'npc_kill', 'target' => 'Cubikon', 'amount' => 1],
                ],
            ],
            [
                'code' => 'classic_sibelon_patrol',
                'title' => 'Sibelon Patrol',
                'description' => 'Clear the patrol route by destroying 10 Sibelonits and 3 Sibelons.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 15000000,
                'reward_uridium' => 30000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 250,
                'objectives' => [
                    ['type' => 'npc_kill', 'target' => 'Sibelonit', 'amount' => 10],
                    ['type' => 'npc_kill', 'target' => 'Sibelon', 'amount' => 3],
                ],
            ],
            [
                'code' => 'classic_lordakium_threat',
                'title' => 'Lordakium Threat',
                'description' => 'Push back the Lordakium threat by destroying 5 Lordakiums.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 25000000,
                'reward_uridium' => 40000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 260,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Lordakium', 'amount' => 5]],
            ],
            [
                'code' => 'classic_crystal_sweep',
                'title' => 'Crystal Sweep',
                'description' => 'Sweep the crystal sectors by destroying 20 Kristallins and 5 Kristallons.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 30000000,
                'reward_uridium' => 50000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 270,
                'objectives' => [
                    ['type' => 'npc_kill', 'target' => 'Kristallin', 'amount' => 20],
                    ['type' => 'npc_kill', 'target' => 'Kristallon', 'amount' => 5],
                ],
            ],
            [
                'code' => 'classic_cubikon_ahoy',
                'title' => 'Cubikon Ahoy!',
                'description' => 'Coordinate your attack and destroy 1 Cubikon.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 12000000,
                'reward_uridium' => 25000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 280,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Cubikon', 'amount' => 1]],
            ],
            [
                'code' => 'classic_streuner_r_patrol',
                'title' => 'StreuneR Patrol',
                'description' => 'Clean up the X-8 patrol route by destroying 25 StreuneR NPCs.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 8000000,
                'reward_uridium' => 20000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 290,
                'objectives' => [['type' => 'npc_kill', 'target' => 'StreuneR_X8', 'amount' => 25]],
            ],
            [
                'code' => 'classic_lower_maps_cleanup',
                'title' => 'Lower Maps Cleanup',
                'description' => 'Clean up the lower maps by destroying Streuners, Lordakia, Saimons and Mordons.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 15000000,
                'reward_uridium' => 30000,
                'reward_experience' => 0,
                'reward_honor' => 0,
                'sort_order' => 300,
                'objectives' => [
                    ['type' => 'npc_kill', 'target' => 'Streuner', 'amount' => 15],
                    ['type' => 'npc_kill', 'target' => 'Lordakia', 'amount' => 15],
                    ['type' => 'npc_kill', 'target' => 'Saimon', 'amount' => 10],
                    ['type' => 'npc_kill', 'target' => 'Mordon', 'amount' => 5],
                ],
            ],
        ];

        return array_merge($quests, $this->classicArchiveQuestCatalog());
    }

    private function classicArchiveQuestCatalog(): array
    {
        return [
            [
                'code' => 'archive_resource_shortage',
                'title' => 'Resource shortage',
                'description' => 'Collect 300 Prometium for the company resource reserve.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 500000,
                'reward_uridium' => 1000,
                'reward_experience' => 750000,
                'reward_honor' => 0,
                'sort_order' => 310,
                'objectives' => [['type' => 'ore_have', 'target' => 'Prometium', 'amount' => 300]],
            ],
            [
                'code' => 'archive_steal_resources_1',
                'title' => 'Steal resources (1)',
                'description' => 'Collect 200 Prometium for a classic resource operation.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 2500000,
                'reward_uridium' => 4000,
                'reward_experience' => 100000,
                'reward_honor' => 0,
                'sort_order' => 320,
                'objectives' => [['type' => 'ore_have', 'target' => 'Prometium', 'amount' => 200]],
            ],
            [
                'code' => 'archive_steal_resources_2',
                'title' => 'Steal resources (2)',
                'description' => 'Collect 220 Endurium for a classic resource operation.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 2700000,
                'reward_uridium' => 5000,
                'reward_experience' => 120000,
                'reward_honor' => 0,
                'sort_order' => 330,
                'objectives' => [['type' => 'ore_have', 'target' => 'Endurium', 'amount' => 220]],
            ],
            [
                'code' => 'archive_steal_resources_3',
                'title' => 'Steal resources (3)',
                'description' => 'Collect 240 Terbium for a classic resource operation.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 3000000,
                'reward_uridium' => 6000,
                'reward_experience' => 140000,
                'reward_honor' => 0,
                'sort_order' => 340,
                'objectives' => [['type' => 'ore_have', 'target' => 'Terbium', 'amount' => 240]],
            ],
            [
                'code' => 'archive_steal_resources_4',
                'title' => 'Steal resources (4)',
                'description' => 'Collect 300 Terbium for a classic resource operation.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 4500000,
                'reward_uridium' => 8000,
                'reward_experience' => 200000,
                'reward_honor' => 0,
                'sort_order' => 350,
                'objectives' => [['type' => 'ore_have', 'target' => 'Terbium', 'amount' => 300]],
            ],
            [
                'code' => 'archive_steal_resources_5',
                'title' => 'Steal resources (5)',
                'description' => 'Collect 400 Terbium for a classic resource operation.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 6000000,
                'reward_uridium' => 12000,
                'reward_experience' => 500000,
                'reward_honor' => 0,
                'sort_order' => 360,
                'objectives' => [['type' => 'ore_have', 'target' => 'Terbium', 'amount' => 400]],
            ],
            [
                'code' => 'archive_scroungers_delight',
                'title' => "Scrounger's delight",
                'description' => 'Collect 200 Terbium for the company resource reserve.',
                'category' => 'Ore Collection',
                'min_level' => 0,
                'reward_credits' => 8000000,
                'reward_uridium' => 5000,
                'reward_experience' => 1000000,
                'reward_honor' => 0,
                'sort_order' => 370,
                'objectives' => [['type' => 'ore_have', 'target' => 'Terbium', 'amount' => 200]],
            ],
            [
                'code' => 'archive_sibelons_strike_back_1',
                'title' => 'Sibelons strike back!',
                'description' => 'Destroy 2 Sibelons in the classic alien sector campaign.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 640000,
                'reward_uridium' => 500,
                'reward_experience' => 64000,
                'reward_honor' => 0,
                'sort_order' => 410,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Sibelon', 'amount' => 2]],
            ],
            [
                'code' => 'archive_sibelons_strike_back_2',
                'title' => 'Sibelons strike back! (2)',
                'description' => 'Destroy 4 Sibelons in the classic alien sector campaign.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 1280000,
                'reward_uridium' => 1000,
                'reward_experience' => 128000,
                'reward_honor' => 0,
                'sort_order' => 420,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Sibelon', 'amount' => 4]],
            ],
            [
                'code' => 'archive_sibelons_strike_back_3',
                'title' => 'Sibelons strike back! (3)',
                'description' => 'Destroy 8 Sibelons in the classic alien sector campaign.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 2560000,
                'reward_uridium' => 2000,
                'reward_experience' => 256000,
                'reward_honor' => 0,
                'sort_order' => 430,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Sibelon', 'amount' => 8]],
            ],
            [
                'code' => 'archive_200_sibelons',
                'title' => '200!',
                'description' => 'Destroy 200 Sibelons to complete this classic high-volume alien hunt.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 65000000,
                'reward_uridium' => 20000,
                'reward_experience' => 6500000,
                'reward_honor' => 0,
                'sort_order' => 440,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Sibelon', 'amount' => 200]],
            ],
            [
                'code' => 'archive_plague_sibelonites_1',
                'title' => 'Plague of Sibelonites (1)',
                'description' => 'Destroy 25 Sibelonits to reduce the Sibelonit plague.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 1000000,
                'reward_uridium' => 2000,
                'reward_experience' => 80000,
                'reward_honor' => 0,
                'sort_order' => 510,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Sibelonit', 'amount' => 25]],
            ],
            [
                'code' => 'archive_plague_sibelonites_2',
                'title' => 'Plague of Sibelonites (2)',
                'description' => 'Destroy 75 Sibelonits to reduce the Sibelonit plague.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 2250000,
                'reward_uridium' => 5000,
                'reward_experience' => 150000,
                'reward_honor' => 0,
                'sort_order' => 520,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Sibelonit', 'amount' => 75]],
            ],
            [
                'code' => 'archive_plague_sibelonites_3',
                'title' => 'Plague of Sibelonites (3)',
                'description' => 'Destroy 150 Sibelonits to reduce the Sibelonit plague.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 5000000,
                'reward_uridium' => 10000,
                'reward_experience' => 250000,
                'reward_honor' => 0,
                'sort_order' => 530,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Sibelonit', 'amount' => 150]],
            ],
            [
                'code' => 'archive_plague_sibelonites_4',
                'title' => 'Plague of Sibelonites (4)',
                'description' => 'Destroy 225 Sibelonits to reduce the Sibelonit plague.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 7500000,
                'reward_uridium' => 30000,
                'reward_experience' => 400000,
                'reward_honor' => 0,
                'sort_order' => 540,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Sibelonit', 'amount' => 225]],
            ],
            [
                'code' => 'archive_plague_sibelonites_5',
                'title' => 'Plague of Sibelonites (5)',
                'description' => 'Destroy 300 Sibelonits to reduce the Sibelonit plague.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 12000000,
                'reward_uridium' => 50000,
                'reward_experience' => 600000,
                'reward_honor' => 0,
                'sort_order' => 550,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Sibelonit', 'amount' => 300]],
            ],
            [
                'code' => 'archive_mothership_1',
                'title' => 'Mothership (1)',
                'description' => 'Destroy 10 Lordakiums and weaken the enemy mothership line.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 5000000,
                'reward_uridium' => 2500,
                'reward_experience' => 100000,
                'reward_honor' => 0,
                'sort_order' => 610,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Lordakium', 'amount' => 10]],
            ],
            [
                'code' => 'archive_mothership_2',
                'title' => 'Mothership (2)',
                'description' => 'Destroy 25 Lordakiums and weaken the enemy mothership line.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 7500000,
                'reward_uridium' => 5000,
                'reward_experience' => 175000,
                'reward_honor' => 0,
                'sort_order' => 620,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Lordakium', 'amount' => 25]],
            ],
            [
                'code' => 'archive_mothership_3',
                'title' => 'Mothership (3)',
                'description' => 'Destroy 75 Lordakiums and weaken the enemy mothership line.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 15000000,
                'reward_uridium' => 12500,
                'reward_experience' => 250000,
                'reward_honor' => 0,
                'sort_order' => 630,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Lordakium', 'amount' => 75]],
            ],
            [
                'code' => 'archive_mothership_4',
                'title' => 'Mothership (4)',
                'description' => 'Destroy 150 Lordakiums and weaken the enemy mothership line.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 30000000,
                'reward_uridium' => 30000,
                'reward_experience' => 400000,
                'reward_honor' => 0,
                'sort_order' => 640,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Lordakium', 'amount' => 150]],
            ],
            [
                'code' => 'archive_decrystallization_1',
                'title' => 'Decrystallization (1)',
                'description' => 'Destroy 10 Kristallons in the crystal sectors.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 7500000,
                'reward_uridium' => 5000,
                'reward_experience' => 250000,
                'reward_honor' => 0,
                'sort_order' => 710,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Kristallon', 'amount' => 10]],
            ],
            [
                'code' => 'archive_decrystallization_2',
                'title' => 'Decrystallization (2)',
                'description' => 'Destroy 25 Kristallons in the crystal sectors.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 12500000,
                'reward_uridium' => 7500,
                'reward_experience' => 500000,
                'reward_honor' => 0,
                'sort_order' => 720,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Kristallon', 'amount' => 25]],
            ],
            [
                'code' => 'archive_decrystallization_3',
                'title' => 'Decrystallization (3)',
                'description' => 'Destroy 75 Kristallons in the crystal sectors.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 25000000,
                'reward_uridium' => 15000,
                'reward_experience' => 1000000,
                'reward_honor' => 0,
                'sort_order' => 730,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Kristallon', 'amount' => 75]],
            ],
            [
                'code' => 'archive_decrystallization_4',
                'title' => 'Decrystallization (4)',
                'description' => 'Destroy 500 Kristallins in the crystal sectors.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 30000000,
                'reward_uridium' => 20000,
                'reward_experience' => 3000000,
                'reward_honor' => 0,
                'sort_order' => 740,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Kristallin', 'amount' => 500]],
            ],
            [
                'code' => 'archive_decrystallization_5',
                'title' => 'Decrystallization (5)',
                'description' => 'Destroy 100 Kristallons in the crystal sectors.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 40000000,
                'reward_uridium' => 25000,
                'reward_experience' => 2000000,
                'reward_honor' => 0,
                'sort_order' => 750,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Kristallon', 'amount' => 100]],
            ],
            [
                'code' => 'archive_decrystallization_6',
                'title' => 'Decrystallization (6)',
                'description' => 'Destroy 150 Kristallons in the crystal sectors.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 60000000,
                'reward_uridium' => 50000,
                'reward_experience' => 3000000,
                'reward_honor' => 0,
                'sort_order' => 760,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Kristallon', 'amount' => 150]],
            ],
            [
                'code' => 'archive_pull_out_all_the_stops',
                'title' => 'Pull out all the stops',
                'description' => 'Destroy 10 Cubikons with your company pilots.',
                'category' => 'NPC Hunt',
                'min_level' => 0,
                'reward_credits' => 25000000,
                'reward_uridium' => 20000,
                'reward_experience' => 6000000,
                'reward_honor' => 2000,
                'sort_order' => 810,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Cubikon', 'amount' => 10]],
            ],
            [
                'code' => 'archive_streuner_invasion_1',
                'title' => 'StreuneR invasion (1)',
                'description' => 'Destroy 50 StreuneR aliens in the X-8 invasion sector.',
                'category' => 'NPC Hunt',
                'min_level' => 12,
                'reward_credits' => 500000,
                'reward_uridium' => 500,
                'reward_experience' => 100000,
                'reward_honor' => 0,
                'sort_order' => 910,
                'objectives' => [['type' => 'npc_kill', 'target' => 'StreuneR_X8', 'amount' => 50]],
            ],
            [
                'code' => 'archive_streuner_invasion_2',
                'title' => 'StreuneR invasion (2)',
                'description' => 'Destroy 150 StreuneR aliens in the X-8 invasion sector.',
                'category' => 'NPC Hunt',
                'min_level' => 12,
                'reward_credits' => 1500000,
                'reward_uridium' => 750,
                'reward_experience' => 100000,
                'reward_honor' => 0,
                'sort_order' => 920,
                'objectives' => [['type' => 'npc_kill', 'target' => 'StreuneR_X8', 'amount' => 150]],
            ],
            [
                'code' => 'archive_streuner_invasion_3',
                'title' => 'StreuneR invasion (3)',
                'description' => 'Destroy 300 StreuneR aliens in the X-8 invasion sector.',
                'category' => 'NPC Hunt',
                'min_level' => 12,
                'reward_credits' => 3000000,
                'reward_uridium' => 1000,
                'reward_experience' => 100000,
                'reward_honor' => 0,
                'sort_order' => 930,
                'objectives' => [['type' => 'npc_kill', 'target' => 'StreuneR_X8', 'amount' => 300]],
            ],
            [
                'code' => 'archive_streuner_invasion_4',
                'title' => 'StreuneR invasion (4)',
                'description' => 'Destroy 450 StreuneR aliens in the X-8 invasion sector.',
                'category' => 'NPC Hunt',
                'min_level' => 12,
                'reward_credits' => 4500000,
                'reward_uridium' => 2000,
                'reward_experience' => 150000,
                'reward_honor' => 0,
                'sort_order' => 940,
                'objectives' => [['type' => 'npc_kill', 'target' => 'StreuneR_X8', 'amount' => 450]],
            ],
            [
                'code' => 'archive_streuner_invasion_5',
                'title' => 'StreuneR invasion (5)',
                'description' => 'Destroy 600 StreuneR aliens in the X-8 invasion sector.',
                'category' => 'NPC Hunt',
                'min_level' => 12,
                'reward_credits' => 6000000,
                'reward_uridium' => 4000,
                'reward_experience' => 250000,
                'reward_honor' => 0,
                'sort_order' => 950,
                'objectives' => [['type' => 'npc_kill', 'target' => 'StreuneR_X8', 'amount' => 600]],
            ],
        ];
    }

    private function rewardItemName(int $itemId): string
    {
        if ($itemId <= 0) {
            return '';
        }
        if ($itemId === self::HAVOK_ITEM_ID) {
            return 'Havok Drone Design';
        }

        try {
            $stmt = $this->db->prepare('SELECT name FROM items WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $itemId]);
            $name = $stmt->fetchColumn();
            return $name ? (string)$name : ('Item #' . $itemId);
        } catch (Exception $e) {
            return 'Item #' . $itemId;
        }
    }

    private function grantCargoSeprom(int $qty): void
    {
        if ($qty <= 0) {
            return;
        }

        try {
            $stmt = $this->db->prepare('UPDATE player_cargo SET seprom = seprom + :qty WHERE id = :player_id');
            $stmt->execute([':qty' => $qty, ':player_id' => $this->playerId]);
            if ($stmt->rowCount() > 0) {
                return;
            }

            $this->db->prepare('INSERT INTO player_cargo (id, seprom) VALUES (:player_id, :qty)')
                ->execute([':player_id' => $this->playerId, ':qty' => $qty]);
        } catch (Exception $e) {
            // Let the claim transaction fail instead of silently losing a Seprom reward.
            throw $e;
        }
    }

    private function getCargoSepromAmount(): int
    {
        try {
            $stmt = $this->db->prepare('SELECT seprom FROM player_cargo WHERE id = :player_id LIMIT 1');
            $stmt->execute([':player_id' => $this->playerId]);
            return max(0, (int)$stmt->fetchColumn());
        } catch (Exception $e) {
            return 0;
        }
    }

    private function grantInventoryItem(int $itemId, int $qty): void
    {
        if ($itemId <= 0 || $qty <= 0) {
            return;
        }

        // Robust stack handling: keep a single row even if older installs created duplicates.
        $stmt = $this->db->prepare('SELECT qty FROM player_inventory WHERE player_id = :pid AND item_id = :iid FOR UPDATE');
        $stmt->execute([':pid' => $this->playerId, ':iid' => $itemId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($rows)) {
            $total = $qty;
            foreach ($rows as $row) {
                $total += (int)($row['qty'] ?? 0);
            }

            $this->db->prepare('DELETE FROM player_inventory WHERE player_id = :pid AND item_id = :iid')
                ->execute([':pid' => $this->playerId, ':iid' => $itemId]);
            $this->db->prepare('INSERT INTO player_inventory (player_id, item_id, qty) VALUES (:pid, :iid, :qty)')
                ->execute([':pid' => $this->playerId, ':iid' => $itemId, ':qty' => $total]);
        } else {
            $this->db->prepare('INSERT INTO player_inventory (player_id, item_id, qty) VALUES (:pid, :iid, :qty)')
                ->execute([':pid' => $this->playerId, ':iid' => $itemId, ':qty' => $qty]);
        }
    }

    private function havokQuestCatalog(): array
    {
        $rewardFields = [
            'reward_credits' => 0,
            'reward_uridium' => 0,
            'reward_experience' => 0,
            'reward_honor' => 0,
            'reward_ucb100' => 0,
            'reward_rsb75' => 0,
            'reward_seprom' => 0,
            'reward_item_id' => self::HAVOK_ITEM_ID,
            'reward_item_qty' => 1,
        ];

        return [
            array_merge($rewardFields, [
                'code' => 'havok_cubikon_100',
                'title' => 'Havok Trial: Cubikon',
                'description' => 'Destroy 100 Cubikons after accepting this quest to earn one Havok drone design.',
                'category' => 'Havok',
                'min_level' => 0,
                'reward_credits' => 75000000,
                'reward_uridium' => 25000,
                'reward_experience' => 7500000,
                'reward_honor' => 50000,
                'reward_ucb100' => 8000,
                'reward_rsb75' => 5000,
                'reward_seprom' => 500,
                'sort_order' => 2000,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Cubikon', 'amount' => 100]],
            ]),
            array_merge($rewardFields, [
                'code' => 'havok_delta_5',
                'title' => 'Havok Trial: Delta Gates',
                'description' => 'Complete 10 Galaxy Gate Delta runs after accepting this quest to earn one Havok drone design.',
                'category' => 'Havok',
                'min_level' => 0,
                'reward_credits' => 90000000,
                'reward_uridium' => 30000,
                'reward_experience' => 8500000,
                'reward_honor' => 55000,
                'reward_ucb100' => 9000,
                'reward_rsb75' => 6000,
                'reward_seprom' => 600,
                'sort_order' => 2010,
                'objectives' => [['type' => 'galaxy_gate_complete', 'target' => 'Delta', 'amount' => 10]],
            ]),
            array_merge($rewardFields, [
                'code' => 'havok_beta_5',
                'title' => 'Havok Trial: Beta Gates',
                'description' => 'Complete 10 Galaxy Gate Beta runs after accepting this quest to earn one Havok drone design.',
                'category' => 'Havok',
                'min_level' => 0,
                'reward_credits' => 75000000,
                'reward_uridium' => 25000,
                'reward_experience' => 7500000,
                'reward_honor' => 50000,
                'reward_ucb100' => 8000,
                'reward_rsb75' => 5000,
                'reward_seprom' => 500,
                'sort_order' => 2020,
                'objectives' => [['type' => 'galaxy_gate_complete', 'target' => 'Beta', 'amount' => 10]],
            ]),
            array_merge($rewardFields, [
                'code' => 'havok_alpha_5',
                'title' => 'Havok Trial: Alpha Gates',
                'description' => 'Complete 10 Galaxy Gate Alpha runs after accepting this quest to earn one Havok drone design.',
                'category' => 'Havok',
                'min_level' => 0,
                'reward_credits' => 60000000,
                'reward_uridium' => 20000,
                'reward_experience' => 6000000,
                'reward_honor' => 40000,
                'reward_ucb100' => 7000,
                'reward_rsb75' => 4000,
                'reward_seprom' => 400,
                'sort_order' => 2030,
                'objectives' => [['type' => 'galaxy_gate_complete', 'target' => 'Alpha', 'amount' => 10]],
            ]),
            array_merge($rewardFields, [
                'code' => 'havok_gamma_5',
                'title' => 'Havok Trial: Gamma Gates',
                'description' => 'Complete 5 Galaxy Gate Gamma runs after accepting this quest to earn one Havok drone design.',
                'category' => 'Havok',
                'min_level' => 0,
                'reward_credits' => 105000000,
                'reward_uridium' => 35000,
                'reward_experience' => 10000000,
                'reward_honor' => 70000,
                'reward_ucb100' => 11000,
                'reward_rsb75' => 7000,
                'reward_seprom' => 700,
                'sort_order' => 2040,
                'objectives' => [['type' => 'galaxy_gate_complete', 'target' => 'Gamma', 'amount' => 5]],
            ]),
            array_merge($rewardFields, [
                'code' => 'havok_kristallon_100',
                'title' => 'Havok Trial: Kristallon',
                'description' => 'Destroy 500 Kristallons after accepting this quest to earn one Havok drone design.',
                'category' => 'Havok',
                'min_level' => 0,
                'reward_credits' => 115000000,
                'reward_uridium' => 35000,
                'reward_experience' => 11000000,
                'reward_honor' => 75000,
                'reward_ucb100' => 11000,
                'reward_rsb75' => 7000,
                'reward_seprom' => 700,
                'sort_order' => 2050,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Kristallon', 'amount' => 500]],
            ]),
            array_merge($rewardFields, [
                'code' => 'havok_streuner_r_100',
                'title' => 'Havok Trial: StreuneR',
                'description' => 'Destroy 400 StreuneR NPCs in x-8 after accepting this quest to earn one Havok drone design.',
                'category' => 'Havok',
                'min_level' => 0,
                'reward_credits' => 90000000,
                'reward_uridium' => 30000,
                'reward_experience' => 8500000,
                'reward_honor' => 60000,
                'reward_ucb100' => 9000,
                'reward_rsb75' => 6000,
                'reward_seprom' => 600,
                'sort_order' => 2060,
                'objectives' => [['type' => 'npc_kill', 'target' => 'StreuneR_X8', 'amount' => 400]],
            ]),
            array_merge($rewardFields, [
                'code' => 'havok_lordakium_150',
                'title' => 'Havok Trial: Lordakium',
                'description' => 'Destroy 650 Lordakiums after accepting this quest to earn one Havok drone design.',
                'category' => 'Havok',
                'min_level' => 0,
                'reward_credits' => 190000000,
                'reward_uridium' => 50000,
                'reward_experience' => 16000000,
                'reward_honor' => 100000,
                'reward_ucb100' => 12000,
                'reward_rsb75' => 10000,
                'reward_seprom' => 1000,
                'sort_order' => 2070,
                'objectives' => [['type' => 'npc_kill', 'target' => 'Lordakium', 'amount' => 650]],
            ]),
        ];
    }

    private function pvpQuestCatalog(): array
    {
        return [
            [
                'code' => 'pvp_first_blood',
                'title' => 'First Blood',
                'description' => 'Prove yourself in combat by destroying 1 enemy player ship.',
                'category' => 'PVP',
                'min_level' => 0,
                'reward_credits' => 1000000,
                'reward_uridium' => 5000,
                'reward_experience' => 51200,
                'reward_honor' => 512,
                'reward_ucb100' => 500,
                'reward_rsb75' => 750,
                'sort_order' => 1000,
                'objectives' => [['type' => 'player_kill', 'target' => 'user_kill', 'amount' => 1]],
            ],
            [
                'code' => 'pvp_enemy_hunter',
                'title' => 'Enemy Hunter',
                'description' => 'Hunt down enemy pilots and destroy 3 player ships.',
                'category' => 'PVP',
                'min_level' => 0,
                'reward_credits' => 2000000,
                'reward_uridium' => 10000,
                'reward_experience' => 153600,
                'reward_honor' => 1536,
                'reward_ucb100' => 1500,
                'reward_rsb75' => 2250,
                'sort_order' => 1010,
                'objectives' => [['type' => 'player_kill', 'target' => 'user_kill', 'amount' => 3]],
            ],
            [
                'code' => 'pvp_combat_pilot',
                'title' => 'Combat Pilot',
                'description' => 'Show consistent PvP skill by destroying 5 player ships.',
                'category' => 'PVP',
                'min_level' => 0,
                'reward_credits' => 3000000,
                'reward_uridium' => 15000,
                'reward_experience' => 256000,
                'reward_honor' => 2560,
                'reward_ucb100' => 2500,
                'reward_rsb75' => 3750,
                'sort_order' => 1020,
                'objectives' => [['type' => 'player_kill', 'target' => 'user_kill', 'amount' => 5]],
            ],
            [
                'code' => 'pvp_battle_tested',
                'title' => 'Battle Tested',
                'description' => 'Survive the front line and destroy 10 player ships.',
                'category' => 'PVP',
                'min_level' => 0,
                'reward_credits' => 5000000,
                'reward_uridium' => 25000,
                'reward_experience' => 512000,
                'reward_honor' => 5120,
                'reward_ucb100' => 5000,
                'reward_rsb75' => 7500,
                'sort_order' => 1030,
                'objectives' => [['type' => 'player_kill', 'target' => 'user_kill', 'amount' => 10]],
            ],
            [
                'code' => 'pvp_elite_hunter',
                'title' => 'Elite Hunter',
                'description' => 'Become a feared hunter by destroying 25 player ships.',
                'category' => 'PVP',
                'min_level' => 0,
                'reward_credits' => 7000000,
                'reward_uridium' => 35000,
                'reward_experience' => 1280000,
                'reward_honor' => 12800,
                'reward_ucb100' => 12500,
                'reward_rsb75' => 18750,
                'sort_order' => 1040,
                'objectives' => [['type' => 'player_kill', 'target' => 'user_kill', 'amount' => 25]],
            ],
            [
                'code' => 'pvp_sector_dominator',
                'title' => 'Sector Dominator',
                'description' => 'Dominate contested sectors by destroying 50 player ships.',
                'category' => 'PVP',
                'min_level' => 0,
                'reward_credits' => 10000000,
                'reward_uridium' => 50000,
                'reward_experience' => 2560000,
                'reward_honor' => 25600,
                'reward_ucb100' => 25000,
                'reward_rsb75' => 37500,
                'sort_order' => 1050,
                'objectives' => [['type' => 'player_kill', 'target' => 'user_kill', 'amount' => 50]],
            ],
            [
                'code' => 'pvp_warlord',
                'title' => 'Warlord',
                'description' => 'Reach the top of the battlefield by destroying 100 player ships.',
                'category' => 'PVP',
                'min_level' => 0,
                'reward_credits' => 12000000,
                'reward_uridium' => 60000,
                'reward_experience' => 5120000,
                'reward_honor' => 51200,
                'reward_ucb100' => 50000,
                'reward_rsb75' => 75000,
                'sort_order' => 1060,
                'objectives' => [['type' => 'player_kill', 'target' => 'user_kill', 'amount' => 100]],
            ],
        ];
    }

    private function huntingContractsCatalog(): array
    {
        return [
            'Streuner' => ['k' => 15, 'credits' => 400, 'uridium' => 1, 'experience' => 400, 'honor' => 2],
            'Lordakia' => ['k' => 15, 'credits' => 800, 'uridium' => 2, 'experience' => 800, 'honor' => 4],
            'Saimon' => ['k' => 15, 'credits' => 1600, 'uridium' => 4, 'experience' => 1600, 'honor' => 8],
            'Mordon' => ['k' => 15, 'credits' => 6400, 'uridium' => 8, 'experience' => 3200, 'honor' => 16],
            'Devolarium' => ['k' => 10, 'credits' => 51200, 'uridium' => 16, 'experience' => 6400, 'honor' => 32],
            'Sibelon' => ['k' => 5, 'credits' => 102400, 'uridium' => 32, 'experience' => 12800, 'honor' => 64],
            'Sibelonit' => ['k' => 15, 'credits' => 12800, 'uridium' => 12, 'experience' => 3200, 'honor' => 16],
            'Lordakium' => ['k' => 8, 'credits' => 204800, 'uridium' => 64, 'experience' => 25600, 'honor' => 128],
            'Kristallin' => ['k' => 15, 'credits' => 12800, 'uridium' => 16, 'experience' => 6400, 'honor' => 32],
            'Kristallon' => ['k' => 8, 'credits' => 409600, 'uridium' => 128, 'experience' => 51200, 'honor' => 256],
            'Cubikon' => ['k' => 5, 'credits' => 1638400, 'uridium' => 1024, 'experience' => 512000, 'honor' => 4096],
        ];
    }
}
