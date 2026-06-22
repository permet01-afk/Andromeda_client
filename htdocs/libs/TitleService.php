<?php

class TitleService
{
    const BEGINNER_TITLE = 'title_5';
    const MOST_WANTED_TITLE = 'title_14';
    const SPACEBALL_CHAMPION_TITLE = 'title_400';
    const UBER_HUNTER_TITLE = 'title_401';
    const BOSS_SLAYER_TITLE = 'title_402';
    const PROTEGIT_BREAKER_TITLE = 'title_403';
    const PVP_HUNTER_TITLE = 'title_404';
    const WEEKLY_GRINDER_TITLE = 'title_405';
    const ANDROMEDA_ELITE_TITLE = 'title_406';

    private $db;
    private $playerId;

    private static $translationLabels = null;

    private static $fallbackLabels = [
        'title_5' => 'Beginner',
        'title_14' => 'Most Wanted',
        'title_400' => 'Spaceball Champion',
        'title_401' => 'Uber Hunter',
        'title_402' => 'Boss Slayer',
        'title_403' => 'Protegit Breaker',
        'title_404' => 'PvP Hunter',
        'title_405' => 'Weekly Grinder',
        'title_406' => 'Andromeda Elite',
    ];

    private static $managedTitles = [
        'title_14' => true,
        'title_400' => true,
        'title_401' => true,
        'title_402' => true,
        'title_403' => true,
        'title_404' => true,
        'title_405' => true,
        'title_406' => true,
    ];

    private static $permanentDefinitions = [
        'title_401' => [
            'condition' => 'Destroy 500 Uber NPCs on 4-5.',
            'progress_key' => 'uber_npc_map29',
            'target' => 500,
            'progress_label' => 'Uber NPCs destroyed on 4-5',
        ],
        'title_402' => [
            'condition' => 'Destroy 25 Boss Cubikons on 4-5.',
            'progress_key' => 'boss_cubikon_map29',
            'target' => 25,
            'progress_label' => 'Boss Cubikons destroyed on 4-5',
        ],
        'title_403' => [
            'condition' => 'Destroy 500 Boss Protegits on 4-5.',
            'progress_key' => 'boss_protegit_map29',
            'target' => 500,
            'progress_label' => 'Boss Protegits destroyed on 4-5',
        ],
        'title_404' => [
            'condition' => 'Destroy 100 eligible enemy pilots.',
            'progress_key' => 'eligible_pvp_kill',
            'target' => 100,
            'progress_label' => 'eligible enemy pilots destroyed',
        ],
        'title_405' => [
            'condition' => 'Claim 25 Weekly Missions.',
            'progress_key' => 'weekly_mission_claim',
            'target' => 25,
            'progress_label' => 'Weekly Missions claimed',
        ],
    ];

    public function __construct(PDO $db, int $playerId)
    {
        $this->db = $db;
        $this->playerId = $playerId;
    }

    public static function getTitleLabel(string $titleKey): string
    {
        $titleKey = trim($titleKey);
        if ($titleKey === '') {
            return '';
        }

        $labels = self::getTranslationLabels();
        if (isset($labels[$titleKey]) && $labels[$titleKey] !== '') {
            return $labels[$titleKey];
        }

        if (isset(self::$fallbackLabels[$titleKey])) {
            return self::$fallbackLabels[$titleKey];
        }

        return 'Unknown title';
    }

    public function getState(): array
    {
        $this->ensureSchema();
        $this->expirePlayerTemporaryTitles();
        $this->syncDisplayedTitle();

        $user = $this->getUserRow();
        $currentTitle = (string)($user['game_title'] ?? '');
        $selectedTitle = $this->getSelectedPermanentTitle();
        $temporary = $this->getActiveTemporaryOverride();
        $mostWantedHolderLabel = $this->getMostWantedHolderLabel();
        $unlockedMap = $this->getUnlockedPermanentMap();
        $progressMap = $this->getProgressMap();

        return [
            'current_title' => $currentTitle,
            'current_label' => self::getTitleLabel($currentTitle),
            'temporary' => $temporary,
            'has_temporary' => !empty($temporary),
            'selected_title' => $selectedTitle,
            'selected_label' => self::getTitleLabel($selectedTitle),
            'beginner' => $this->buildBeginnerCard($user, $currentTitle),
            'temporary_titles' => $this->buildTemporaryCards($temporary, $mostWantedHolderLabel),
            'permanent_titles' => $this->buildPermanentCards($unlockedMap, $progressMap, $selectedTitle, !empty($temporary)),
        ];
    }

    public function equipPermanentTitle(string $titleKey): void
    {
        $this->ensureSchema();
        $titleKey = trim($titleKey);
        if ($titleKey === '') {
            throw new Exception('Missing title.');
        }
        if ($this->getActiveTemporaryOverride()) {
            throw new Exception('Temporary title is active. Remove it before selecting a permanent title.');
        }
        if (!$this->isPermanentTitleUnlocked($titleKey)) {
            throw new Exception('This title is not unlocked.');
        }

        $stmt = $this->db->prepare(
            'INSERT INTO player_title_selection (player_id, selected_title_key)
             VALUES (:player_id, :title_key)
             ON DUPLICATE KEY UPDATE selected_title_key = VALUES(selected_title_key)'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':title_key' => $titleKey,
        ]);

        $this->syncDisplayedTitle();
    }

    public function removePermanentTitle(): void
    {
        $this->ensureSchema();
        $stmt = $this->db->prepare(
            'INSERT INTO player_title_selection (player_id, selected_title_key)
             VALUES (:player_id, :title_key)
             ON DUPLICATE KEY UPDATE selected_title_key = VALUES(selected_title_key)'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':title_key' => '',
        ]);

        $this->syncDisplayedTitle();
    }

    public function removeTemporaryTitle(): void
    {
        $this->ensureSchema();
        $activeTemporaries = $this->getActiveTemporaryRows();
        if (!$activeTemporaries) {
            throw new Exception('No temporary title is active.');
        }

        $hasMostWanted = false;
        foreach ($activeTemporaries as $temporary) {
            if ((string)$temporary['title_key'] === self::MOST_WANTED_TITLE) {
                $hasMostWanted = true;
                break;
            }
        }

        $stmt = $this->db->prepare(
            'UPDATE player_titles
             SET revoked_at = UTC_TIMESTAMP()
             WHERE player_id = :player_id
               AND title_scope = :title_scope
               AND title_key IN (:most_wanted, :spaceball)
               AND revoked_at IS NULL'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':title_scope' => 'temporary',
            ':most_wanted' => self::MOST_WANTED_TITLE,
            ':spaceball' => self::SPACEBALL_CHAMPION_TITLE,
        ]);

        if ($hasMostWanted) {
            $stmt = $this->db->prepare(
                'UPDATE title_runtime_state
                 SET title_key = :title_key,
                     holder_type = :holder_type,
                     holder_player_id = 0,
                     holder_npc_id = 0,
                     holder_map_id = 0,
                     assigned_at = NULL,
                     expires_at = NULL
                 WHERE state_key = :state_key
                   AND holder_type = :old_holder_type
                   AND holder_player_id = :player_id'
            );
            $stmt->execute([
                ':title_key' => self::MOST_WANTED_TITLE,
                ':holder_type' => 'none',
                ':state_key' => 'most_wanted',
                ':old_holder_type' => 'player',
                ':player_id' => $this->playerId,
            ]);
        }

        $this->syncDisplayedTitle();
    }

    public static function trackWeeklyMissionClaim(PDO $db, int $playerId): void
    {
        if ($playerId <= 0 || !self::hasSchema($db)) {
            return;
        }

        $progressKey = 'weekly_mission_claim';
        $targetAmount = 25;

        $stmt = $db->prepare(
            'SELECT current_amount
             FROM player_title_progress
             WHERE player_id = :player_id
               AND progress_key = :progress_key
             LIMIT 1'
        );
        $stmt->execute([
            ':player_id' => $playerId,
            ':progress_key' => $progressKey,
        ]);
        $currentAmount = (int)$stmt->fetchColumn();
        $nextAmount = min($targetAmount, $currentAmount + 1);

        $stmt = $db->prepare(
            'INSERT INTO player_title_progress (player_id, progress_key, current_amount)
             VALUES (:player_id, :progress_key, :current_amount)
             ON DUPLICATE KEY UPDATE current_amount = VALUES(current_amount)'
        );
        $stmt->execute([
            ':player_id' => $playerId,
            ':progress_key' => $progressKey,
            ':current_amount' => $nextAmount,
        ]);

        if ($currentAmount < $targetAmount && $nextAmount >= $targetAmount) {
            self::grantPermanentTitle($db, $playerId, self::WEEKLY_GRINDER_TITLE, 'weekly_missions');
            $service = new self($db, $playerId);
            $service->syncDisplayedTitle();
        }
    }

    private static function grantPermanentTitle(PDO $db, int $playerId, string $titleKey, string $source): void
    {
        $stmt = $db->prepare(
            'INSERT INTO player_titles (player_id, title_key, title_scope, source, expires_at, revoked_at)
             VALUES (:player_id, :title_key, :title_scope, :source, NULL, NULL)
             ON DUPLICATE KEY UPDATE title_scope = VALUES(title_scope), source = VALUES(source), expires_at = NULL, revoked_at = NULL'
        );
        $stmt->execute([
            ':player_id' => $playerId,
            ':title_key' => $titleKey,
            ':title_scope' => 'permanent',
            ':source' => $source,
        ]);

        $stmt = $db->prepare('SELECT selected_title_key FROM player_title_selection WHERE player_id = :player_id LIMIT 1');
        $stmt->execute([':player_id' => $playerId]);
        $selected = (string)$stmt->fetchColumn();
        if ($selected === '') {
            $stmt = $db->prepare(
                'INSERT INTO player_title_selection (player_id, selected_title_key)
                 VALUES (:player_id, :title_key)
                 ON DUPLICATE KEY UPDATE selected_title_key = IF(selected_title_key = \'\', VALUES(selected_title_key), selected_title_key)'
            );
            $stmt->execute([
                ':player_id' => $playerId,
                ':title_key' => $titleKey,
            ]);
        }
    }

    private function buildBeginnerCard(array $user, string $currentTitle): array
    {
        $active = (int)($user['canBeginner'] ?? 0) === 1 && (int)($user['rankpoints'] ?? 0) < 25000;
        return [
            'title_key' => self::BEGINNER_TITLE,
            'label' => self::getTitleLabel(self::BEGINNER_TITLE),
            'type' => 'Starter',
            'status' => $active || $currentTitle === self::BEGINNER_TITLE ? 'Active' : 'Not active',
            'condition' => 'Available while beginner protection is active.',
            'description' => 'Starter title. It is not selectable as a permanent title.',
            'progress_text' => '',
            'progress_percent' => 0,
            'can_equip' => false,
            'is_equipped' => false,
            'is_locked' => !$active && $currentTitle !== self::BEGINNER_TITLE,
        ];
    }

    private function buildTemporaryCards(array $activeTemporary, string $mostWantedHolderLabel): array
    {
        $activeKey = (string)($activeTemporary['title_key'] ?? '');
        $mostWantedHolderText = $mostWantedHolderLabel !== '' ? 'Current holder: ' . $mostWantedHolderLabel : '';
        return [
            [
                'title_key' => self::MOST_WANTED_TITLE,
                'label' => self::getTitleLabel(self::MOST_WANTED_TITLE),
                'type' => 'Temporary',
                'status' => $activeKey === self::MOST_WANTED_TITLE ? 'Active' : 'Not active',
                'condition' => 'Kill the current title holder. Expires after 7 days.',
                'holder_text' => $mostWantedHolderText,
                'expires_at' => $activeKey === self::MOST_WANTED_TITLE ? ($activeTemporary['expires_at'] ?? null) : null,
            ],
            [
                'title_key' => self::SPACEBALL_CHAMPION_TITLE,
                'label' => self::getTitleLabel(self::SPACEBALL_CHAMPION_TITLE),
                'type' => 'Temporary',
                'status' => $activeKey === self::SPACEBALL_CHAMPION_TITLE ? 'Active' : 'Not active',
                'condition' => 'Awarded to online pilots on 4-4 from the winning company. Lasts until the next Spaceball.',
                'expires_at' => $activeKey === self::SPACEBALL_CHAMPION_TITLE ? ($activeTemporary['expires_at'] ?? null) : null,
            ],
        ];
    }

    private function buildPermanentCards(array $unlockedMap, array $progressMap, string $selectedTitle, bool $temporaryActive): array
    {
        $cards = [];
        foreach (self::$permanentDefinitions as $titleKey => $definition) {
            $current = (int)($progressMap[$definition['progress_key']] ?? 0);
            $target = (int)$definition['target'];
            $unlocked = isset($unlockedMap[$titleKey]);
            $equipped = $selectedTitle === $titleKey;
            $cards[] = [
                'title_key' => $titleKey,
                'label' => self::getTitleLabel($titleKey),
                'type' => 'Permanent',
                'status' => $equipped ? 'Equipped' : ($unlocked ? 'Unlocked' : 'Locked'),
                'condition' => $definition['condition'],
                'progress_current' => min($current, $target),
                'progress_target' => $target,
                'progress_percent' => $target > 0 ? max(0, min(100, (int)floor((min($current, $target) / $target) * 100))) : 0,
                'progress_text' => min($current, $target) . ' / ' . $target . ' ' . $definition['progress_label'],
                'can_equip' => $unlocked && !$equipped && !$temporaryActive,
                'disabled_by_temporary' => $unlocked && !$equipped && $temporaryActive,
                'is_equipped' => $equipped,
                'is_locked' => !$unlocked,
            ];
        }

        if (isset($unlockedMap[self::ANDROMEDA_ELITE_TITLE])) {
            $equipped = $selectedTitle === self::ANDROMEDA_ELITE_TITLE;
            $cards[] = [
                'title_key' => self::ANDROMEDA_ELITE_TITLE,
                'label' => self::getTitleLabel(self::ANDROMEDA_ELITE_TITLE),
                'type' => 'Special',
                'status' => $equipped ? 'Equipped' : 'Unlocked',
                'condition' => 'Special event title.',
                'progress_current' => 0,
                'progress_target' => 0,
                'progress_percent' => 100,
                'progress_text' => '',
                'can_equip' => !$equipped && !$temporaryActive,
                'disabled_by_temporary' => !$equipped && $temporaryActive,
                'is_equipped' => $equipped,
                'is_locked' => false,
            ];
        }

        return $cards;
    }

    private function syncDisplayedTitle(): string
    {
        $resolved = $this->resolveDisplayedTitle();
        $stmt = $this->db->prepare('UPDATE users SET game_title = :title_key WHERE id = :player_id LIMIT 1');
        $stmt->execute([
            ':title_key' => $resolved,
            ':player_id' => $this->playerId,
        ]);

        return $resolved;
    }

    private function resolveDisplayedTitle(): string
    {
        $this->expirePlayerTemporaryTitles();
        if ($this->hasActiveTemporaryTitle(self::MOST_WANTED_TITLE)) {
            return self::MOST_WANTED_TITLE;
        }
        if ($this->hasActiveTemporaryTitle(self::SPACEBALL_CHAMPION_TITLE)) {
            return self::SPACEBALL_CHAMPION_TITLE;
        }

        $selected = $this->getSelectedPermanentTitle();
        if ($selected !== '' && $this->isPermanentTitleUnlocked($selected)) {
            return $selected;
        }

        $user = $this->getUserRow();
        if ((int)($user['canBeginner'] ?? 0) === 1 && (int)($user['rankpoints'] ?? 0) < 25000) {
            return self::BEGINNER_TITLE;
        }

        $current = (string)($user['game_title'] ?? '');
        if ($current !== '' && !isset(self::$managedTitles[$current])) {
            return $current;
        }

        return '';
    }

    private function getUserRow(): array
    {
        $stmt = $this->db->prepare('SELECT id, game_title, canBeginner, rankpoints FROM users WHERE id = :player_id LIMIT 1');
        $stmt->execute([':player_id' => $this->playerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : [];
    }

    private function getSelectedPermanentTitle(): string
    {
        $stmt = $this->db->prepare('SELECT selected_title_key FROM player_title_selection WHERE player_id = :player_id LIMIT 1');
        $stmt->execute([':player_id' => $this->playerId]);
        return (string)$stmt->fetchColumn();
    }

    private function getActiveTemporaryOverride(): array
    {
        $rows = $this->getActiveTemporaryRows();
        if (!$rows) {
            return [];
        }

        $row = $rows[0];
        return [
            'title_key' => (string)$row['title_key'],
            'label' => self::getTitleLabel((string)$row['title_key']),
            'source' => (string)$row['source'],
            'expires_at' => $row['expires_at'] ?? null,
        ];
    }

    private function getActiveTemporaryRows(): array
    {
        $stmt = $this->db->prepare(
            'SELECT title_key, source, expires_at
             FROM player_titles
             WHERE player_id = :player_id
               AND title_scope = :title_scope
               AND revoked_at IS NULL
               AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
               AND title_key IN (:most_wanted_filter, :spaceball_filter)
             ORDER BY CASE title_key WHEN :most_wanted_order THEN 1 WHEN :spaceball_order THEN 2 ELSE 3 END'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':title_scope' => 'temporary',
            ':most_wanted_filter' => self::MOST_WANTED_TITLE,
            ':spaceball_filter' => self::SPACEBALL_CHAMPION_TITLE,
            ':most_wanted_order' => self::MOST_WANTED_TITLE,
            ':spaceball_order' => self::SPACEBALL_CHAMPION_TITLE,
        ]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($rows) ? $rows : [];
    }

    private function getMostWantedHolderLabel(): string
    {
        $stmt = $this->db->prepare(
            'SELECT trs.holder_type, u.username
             FROM title_runtime_state trs
             LEFT JOIN users u ON u.id = trs.holder_player_id
             WHERE trs.state_key = :state_key
               AND trs.title_key = :title_key
             LIMIT 1'
        );
        $stmt->execute([
            ':state_key' => 'most_wanted',
            ':title_key' => self::MOST_WANTED_TITLE,
        ]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            return '';
        }

        $holderType = strtolower(trim((string)($row['holder_type'] ?? '')));
        if ($holderType === 'player') {
            return trim((string)($row['username'] ?? ''));
        }
        if ($holderType === 'npc') {
            return 'NPC';
        }
        return '';
    }

    private function getUnlockedPermanentMap(): array
    {
        $stmt = $this->db->prepare(
            'SELECT title_key, source, unlocked_at
             FROM player_titles
             WHERE player_id = :player_id
               AND title_scope = :title_scope
               AND revoked_at IS NULL'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':title_scope' => 'permanent',
        ]);

        $items = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $items[(string)$row['title_key']] = $row;
        }
        return $items;
    }

    private function getProgressMap(): array
    {
        $stmt = $this->db->prepare(
            'SELECT progress_key, current_amount
             FROM player_title_progress
             WHERE player_id = :player_id'
        );
        $stmt->execute([':player_id' => $this->playerId]);

        $items = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $items[(string)$row['progress_key']] = (int)$row['current_amount'];
        }
        return $items;
    }

    private function isPermanentTitleUnlocked(string $titleKey): bool
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*)
             FROM player_titles
             WHERE player_id = :player_id
               AND title_key = :title_key
               AND title_scope = :title_scope
               AND revoked_at IS NULL'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':title_key' => $titleKey,
            ':title_scope' => 'permanent',
        ]);
        return (int)$stmt->fetchColumn() > 0;
    }

    private function hasActiveTemporaryTitle(string $titleKey): bool
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*)
             FROM player_titles
             WHERE player_id = :player_id
               AND title_key = :title_key
               AND title_scope = :title_scope
               AND revoked_at IS NULL
               AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':title_key' => $titleKey,
            ':title_scope' => 'temporary',
        ]);
        return (int)$stmt->fetchColumn() > 0;
    }

    private function expirePlayerTemporaryTitles(): void
    {
        $stmt = $this->db->prepare(
            'UPDATE player_titles
             SET revoked_at = UTC_TIMESTAMP()
             WHERE player_id = :player_id
               AND title_scope = :title_scope
               AND revoked_at IS NULL
               AND expires_at IS NOT NULL
               AND expires_at <= UTC_TIMESTAMP()'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':title_scope' => 'temporary',
        ]);
    }

    private static function getTranslationLabels(): array
    {
        if (self::$translationLabels !== null) {
            return self::$translationLabels;
        }

        self::$translationLabels = self::$fallbackLabels;
        $path = __DIR__ . '/../flashinput/translationSpacemap.php';
        if (!is_file($path)) {
            return self::$translationLabels;
        }

        $content = @file_get_contents($path);
        if (!is_string($content) || $content === '') {
            return self::$translationLabels;
        }

        if (preg_match_all("/<item\\s+id='(title_[^']+)'><!\\[CDATA\\[(.*?)\\]\\]><\\/item>/s", $content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $key = (string)$match[1];
                $label = trim(html_entity_decode((string)$match[2], ENT_QUOTES, 'UTF-8'));
                if ($label !== '') {
                    self::$translationLabels[$key] = $label;
                }
            }
        }

        return self::$translationLabels;
    }

    private function ensureSchema(): void
    {
        if (!self::hasSchema($this->db)) {
            throw new Exception('Titles tables are not installed yet.');
        }
    }

    public static function hasSchema(PDO $db): bool
    {
        foreach (['player_titles', 'player_title_selection', 'player_title_progress', 'title_runtime_state'] as $table) {
            $stmt = $db->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :table_name');
            $stmt->execute([':table_name' => $table]);
            if ((int)$stmt->fetchColumn() <= 0) {
                return false;
            }
        }
        return true;
    }
}
?>
