<?php

/** Owner-approved rule: Beginner through level 11 inclusive.
 * Level is derived from XP with the same thresholds as ExperienceSystem.cs.
 * canBeginner is a compatibility cache, not a permanent opt-out flag.
 */
final class BeginnerStatusService
{
    const LAST_BEGINNER_LEVEL = 11;
    const LEVEL_12_EXPERIENCE = 10240000;
    const MAX_LEVEL = 30;

    public static function levelFromExperience($experience): int
    {
        $experience = max(0, (int)$experience);
        $level = 1;
        $nextThreshold = 10000;
        while ($level < self::MAX_LEVEL && $experience >= $nextThreshold) {
            ++$level;
            $nextThreshold *= 2;
        }
        return $level;
    }

    public static function isBeginnerLevel(int $level): bool
    {
        return $level >= 1 && $level <= self::LAST_BEGINNER_LEVEL;
    }

    public static function isBeginnerExperience($experience): bool
    {
        return self::isBeginnerLevel(self::levelFromExperience($experience));
    }

    public static function normalizeUserRow($db, array $row): array
    {
        if (!$row) {
            return [];
        }
        $row['level'] = self::levelFromExperience($row['experience'] ?? 0);
        $beginner = self::isBeginnerLevel($row['level']) ? 1 : 0;
        if ((int)($row['canBeginner'] ?? 0) !== $beginner && (int)($row['id'] ?? 0) > 0) {
            // Evaluate against the current SQL XP to avoid restoring a stale flag
            // if a reward crossed level 12 after the row above was read.
            $sqlRule = 'CASE WHEN COALESCE(experience, 0) < ' . self::LEVEL_12_EXPERIENCE . ' THEN 1 ELSE 0 END';
            $stmt = $db->prepare('UPDATE users SET canBeginner = ' . $sqlRule .
                ' WHERE id = :player_id AND COALESCE(canBeginner, 0) <> ' . $sqlRule . ' LIMIT 1');
            $stmt->execute([':player_id' => (int)$row['id']]);
        }
        $row['canBeginner'] = $beginner;
        return $row;
    }

    public static function normalizePlayerCache($db, int $playerId): void
    {
        if ($playerId <= 0) {
            return;
        }
        $stmt = $db->prepare('SELECT id, experience, level, canBeginner FROM users WHERE id = :player_id LIMIT 1');
        $stmt->execute([':player_id' => $playerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (is_array($row)) {
            self::normalizeUserRow($db, $row);
        }
    }
}
