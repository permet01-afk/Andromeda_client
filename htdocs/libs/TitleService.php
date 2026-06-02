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

    private static $labels = [
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

    public function __construct(PDO $db, int $playerId)
    {
        $this->db = $db;
        $this->playerId = $playerId;
    }

    public static function getTitleLabel(string $titleKey): string
    {
        return self::$labels[$titleKey] ?? $titleKey;
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
        $permanentTitles = $this->getUnlockedPermanentTitles();

        return [
            'current_title' => $currentTitle,
            'current_label' => $currentTitle !== '' ? self::getTitleLabel($currentTitle) : '',
            'temporary' => $temporary,
            'selected_title' => $selectedTitle,
            'selected_label' => $selectedTitle !== '' ? self::getTitleLabel($selectedTitle) : '',
            'permanent_titles' => $permanentTitles,
        ];
    }

    public function equipPermanentTitle(string $titleKey): void
    {
        $this->ensureSchema();
        $titleKey = trim($titleKey);
        if ($titleKey === '') {
            throw new Exception('Missing title.');
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
        $stmt = $this->db->prepare(
            'SELECT title_key, source, expires_at
             FROM player_titles
             WHERE player_id = :player_id
               AND title_scope = :title_scope
               AND revoked_at IS NULL
               AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
               AND title_key IN ('title_14', 'title_400')
             ORDER BY CASE title_key WHEN 'title_14' THEN 1 WHEN 'title_400' THEN 2 ELSE 3 END
             LIMIT 1'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':title_scope' => 'temporary',
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return [];
        }

        return [
            'title_key' => (string)$row['title_key'],
            'label' => self::getTitleLabel((string)$row['title_key']),
            'source' => (string)$row['source'],
            'expires_at' => $row['expires_at'] ?? null,
        ];
    }

    private function getUnlockedPermanentTitles(): array
    {
        $stmt = $this->db->prepare(
            'SELECT title_key, source, unlocked_at
             FROM player_titles
             WHERE player_id = :player_id
               AND title_scope = :title_scope
               AND revoked_at IS NULL
             ORDER BY unlocked_at ASC, title_key ASC'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':title_scope' => 'permanent',
        ]);

        $items = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $titleKey = (string)$row['title_key'];
            $items[] = [
                'title_key' => $titleKey,
                'label' => self::getTitleLabel($titleKey),
                'source' => (string)$row['source'],
                'unlocked_at' => $row['unlocked_at'] ?? null,
            ];
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
