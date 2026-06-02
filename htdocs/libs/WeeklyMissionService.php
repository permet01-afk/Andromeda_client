<?php

require_once __DIR__ . '/TitleService.php';

class WeeklyMissionService
{
    const WEEKLY_TIMEZONE = 'Europe/Zurich';

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

    public function getWeeklyState(): array
    {
        $meta = $this->getWeeklyMeta();
        $this->ensureCurrentWeeklyMissions($meta);

        return [
            'meta' => $meta,
            'missions' => $this->getCurrentWeeklyMissions($meta),
        ];
    }

    public function claimWeeklyMission(string $code): string
    {
        $code = trim($code);
        if ($code === '') {
            throw new Exception('Missing weekly mission code.');
        }

        $meta = $this->getWeeklyMeta();
        $this->ensureCurrentWeeklyMissions($meta);

        try {
            $this->db->beginTransaction();

            $missionStmt = $this->db->prepare(
                'SELECT m.*, pwm.status AS player_status, pwm.accepted_at, pwm.claimed_at
                 FROM site_weekly_missions m
                 INNER JOIN site_player_weekly_missions pwm
                    ON pwm.mission_id = m.id
                   AND pwm.player_id = :player_id
                   AND pwm.week_key = :week_key
                 WHERE m.code = :code
                   AND m.enabled = 1
                   AND m.rotation_group = :rotation_group
                 LIMIT 1 FOR UPDATE'
            );
            $missionStmt->execute([
                ':player_id' => $this->playerId,
                ':week_key' => $meta['week_key'],
                ':code' => $code,
                ':rotation_group' => $meta['rotation_group'],
            ]);
            $mission = $missionStmt->fetch(PDO::FETCH_ASSOC);
            if (!$mission) {
                throw new Exception('This weekly mission is not active this week.');
            }
            if ((string)$mission['player_status'] === 'claimed') {
                throw new Exception('Reward already claimed.');
            }
            if ((string)$mission['player_status'] !== 'in_progress') {
                throw new Exception('This weekly mission is not active.');
            }

            $objectives = $this->getObjectivesForMission((int)$mission['id']);
            $progress = $this->buildMissionProgress((int)$mission['id'], $meta['week_key'], $objectives, 'in_progress');
            if (!$progress['is_complete']) {
                throw new Exception('This weekly mission is not complete yet.');
            }

            $userStmt = $this->db->prepare('SELECT experience FROM users WHERE id = :player_id LIMIT 1 FOR UPDATE');
            $userStmt->execute([':player_id' => $this->playerId]);
            $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);
            if (!$userRow) {
                throw new Exception('Player account not found.');
            }

            $rewardExperience = (int)$mission['reward_experience'];
            $newExperience = max(0, (int)$userRow['experience'] + $rewardExperience);
            $newLevel = self::getLevelFromExperience($newExperience);

            $rewardStmt = $this->db->prepare(
                'UPDATE users
                 SET uridium = uridium + :uridium,
                     experience = experience + :experience,
                     level = :level,
                     honor = honor + :honor,
                     ammo_ucb100 = ammo_ucb100 + :ucb100,
                     ammo_rsb75 = ammo_rsb75 + :rsb75
                 WHERE id = :player_id'
            );
            $rewardStmt->execute([
                ':uridium' => (int)$mission['reward_uridium'],
                ':experience' => $rewardExperience,
                ':level' => $newLevel,
                ':honor' => (int)$mission['reward_honor'],
                ':ucb100' => (int)$mission['reward_ucb100'],
                ':rsb75' => (int)$mission['reward_rsb75'],
                ':player_id' => $this->playerId,
            ]);

            $rewardSeprom = (int)$mission['reward_seprom'];
            if ($rewardSeprom > 0) {
                $this->grantCargoSeprom($rewardSeprom);
            }

            $completeStmt = $this->db->prepare(
                'UPDATE site_player_weekly_missions
                 SET status = :status, claimed_at = NOW()
                 WHERE player_id = :player_id
                   AND mission_id = :mission_id
                   AND week_key = :week_key'
            );
            $completeStmt->execute([
                ':status' => 'claimed',
                ':player_id' => $this->playerId,
                ':mission_id' => (int)$mission['id'],
                ':week_key' => $meta['week_key'],
            ]);

            TitleService::trackWeeklyMissionClaim($this->db, $this->playerId);

            $this->db->commit();
            return 'Weekly mission reward claimed.';
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function getWeeklyMeta(): array
    {
        $tz = new DateTimeZone(self::WEEKLY_TIMEZONE);
        $now = new DateTimeImmutable('now', $tz);
        $isoYear = (int)$now->format('o');
        $isoWeek = (int)$now->format('W');
        $weekKey = sprintf('%04d-W%02d', $isoYear, $isoWeek);
        $rotationIndex = (($isoYear * 53) + $isoWeek - 1) % 3;
        $rotationGroup = ['A', 'B', 'C'][$rotationIndex];
        $nextReset = $now->modify('next monday')->setTime(0, 0, 0);
        if ((int)$now->format('N') === 1 && $now->format('H:i:s') === '00:00:00') {
            $nextReset = $now->modify('+7 days');
        }

        $secondsRemaining = max(0, $nextReset->getTimestamp() - $now->getTimestamp());

        return [
            'week_key' => $weekKey,
            'rotation_group' => $rotationGroup,
            'timezone' => self::WEEKLY_TIMEZONE,
            'reset_at' => $nextReset->format('Y-m-d H:i:s'),
            'seconds_remaining' => $secondsRemaining,
            'time_remaining_text' => $this->formatRemainingTime($secondsRemaining),
        ];
    }

    private function ensureCurrentWeeklyMissions(array $meta): void
    {
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO site_player_weekly_missions
                (player_id, mission_id, week_key, status, accepted_at)
             SELECT :player_id, m.id, :week_key, :status, NOW()
             FROM site_weekly_missions m
             WHERE m.enabled = 1
               AND m.rotation_group = :rotation_group'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':week_key' => $meta['week_key'],
            ':status' => 'in_progress',
            ':rotation_group' => $meta['rotation_group'],
        ]);
    }

    private function getCurrentWeeklyMissions(array $meta): array
    {
        $stmt = $this->db->prepare(
            'SELECT m.*,
                    pwm.status AS player_status,
                    pwm.accepted_at,
                    pwm.claimed_at
             FROM site_weekly_missions m
             INNER JOIN site_player_weekly_missions pwm
                ON pwm.mission_id = m.id
               AND pwm.player_id = :player_id
               AND pwm.week_key = :week_key
             WHERE m.enabled = 1
               AND m.rotation_group = :rotation_group
             ORDER BY m.slot ASC, m.id ASC'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':week_key' => $meta['week_key'],
            ':rotation_group' => $meta['rotation_group'],
        ]);
        $missions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$missions) {
            return [];
        }

        $objectivesByMission = $this->getObjectivesGroupedForMissions(array_map(function ($row) {
            return (int)$row['id'];
        }, $missions));

        $result = [];
        foreach ($missions as $mission) {
            $result[] = $this->formatMissionForOutput($mission, $meta, $objectivesByMission[(int)$mission['id']] ?? []);
        }

        return $result;
    }

    private function formatMissionForOutput(array $mission, array $meta, array $objectives): array
    {
        $missionId = (int)$mission['id'];
        $status = (string)($mission['player_status'] ?? 'in_progress');
        $progress = $this->buildMissionProgress($missionId, $meta['week_key'], $objectives, $status);

        return [
            'id' => $missionId,
            'code' => (string)$mission['code'],
            'title' => (string)$mission['title'],
            'description' => (string)$mission['description'],
            'category' => 'Weekly Missions',
            'group' => 'weekly',
            'difficulty' => (string)($mission['difficulty'] ?? ''),
            'recommended_level' => (int)($mission['recommended_level'] ?? 0),
            'rotation_group' => (string)$mission['rotation_group'],
            'slot' => (int)$mission['slot'],
            'week_key' => $meta['week_key'],
            'reset_at' => $meta['reset_at'],
            'time_remaining_text' => $meta['time_remaining_text'],
            'status' => $status,
            'accepted_at' => $mission['accepted_at'] ?? null,
            'claimed_at' => $mission['claimed_at'] ?? null,
            'objectives' => $progress['objectives'],
            'is_complete' => $progress['is_complete'],
            'reward_credits' => 0,
            'reward_uridium' => (int)$mission['reward_uridium'],
            'reward_experience' => (int)$mission['reward_experience'],
            'reward_honor' => (int)$mission['reward_honor'],
            'reward_ucb100' => (int)$mission['reward_ucb100'],
            'reward_rsb75' => (int)$mission['reward_rsb75'],
            'reward_seprom' => (int)$mission['reward_seprom'],
            'reward_item_id' => 0,
            'reward_item_qty' => 0,
            'reward_item_name' => '',
        ];
    }

    private function getObjectivesForMission(int $missionId): array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM site_weekly_mission_objectives
             WHERE mission_id = :mission_id
             ORDER BY sort_order ASC, id ASC'
        );
        $stmt->execute([':mission_id' => $missionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getObjectivesGroupedForMissions(array $missionIds): array
    {
        $missionIds = array_values(array_unique(array_filter(array_map('intval', $missionIds))));
        if (!$missionIds) {
            return [];
        }

        $placeholders = [];
        $params = [];
        foreach ($missionIds as $idx => $missionId) {
            $key = ':mission_id_' . $idx;
            $placeholders[] = $key;
            $params[$key] = $missionId;
        }

        $stmt = $this->db->prepare(
            'SELECT * FROM site_weekly_mission_objectives
             WHERE mission_id IN (' . implode(',', $placeholders) . ')
             ORDER BY mission_id ASC, sort_order ASC, id ASC'
        );
        $stmt->execute($params);

        $grouped = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $grouped[(int)$row['mission_id']][] = $row;
        }
        return $grouped;
    }

    private function buildMissionProgress(int $missionId, string $weekKey, array $objectives, string $status): array
    {
        if ($status === 'in_progress') {
            $this->ensureMissionProgressRows($missionId, $weekKey, $objectives);
        }

        $progressRows = $this->getMissionProgressRows($missionId, $weekKey);
        $isComplete = true;
        $items = [];

        foreach ($objectives as $objective) {
            $type = (string)$objective['objective_type'];
            $target = (string)$objective['target_key'];
            $required = (int)$objective['required_amount'];
            $current = $status === 'claimed' ? $required : (int)($progressRows[$type . '|' . $target] ?? 0);
            $displayCurrent = min($current, $required);
            $complete = $current >= $required;
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
                'label' => (string)$objective['objective_label'],
            ];
        }

        if ($status !== 'in_progress' && $status !== 'claimed') {
            $isComplete = false;
        }

        return ['is_complete' => $isComplete, 'objectives' => $items];
    }

    private function ensureMissionProgressRows(int $missionId, string $weekKey, array $objectives): void
    {
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO site_player_weekly_mission_progress
                (player_id, mission_id, week_key, objective_type, target_key, current_amount)
             VALUES
                (:player_id, :mission_id, :week_key, :objective_type, :target_key, 0)'
        );

        foreach ($objectives as $objective) {
            $stmt->execute([
                ':player_id' => $this->playerId,
                ':mission_id' => $missionId,
                ':week_key' => $weekKey,
                ':objective_type' => (string)$objective['objective_type'],
                ':target_key' => (string)$objective['target_key'],
            ]);
        }
    }

    private function getMissionProgressRows(int $missionId, string $weekKey): array
    {
        $stmt = $this->db->prepare(
            'SELECT objective_type, target_key, current_amount
             FROM site_player_weekly_mission_progress
             WHERE player_id = :player_id
               AND mission_id = :mission_id
               AND week_key = :week_key'
        );
        $stmt->execute([
            ':player_id' => $this->playerId,
            ':mission_id' => $missionId,
            ':week_key' => $weekKey,
        ]);

        $progress = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $progress[(string)$row['objective_type'] . '|' . (string)$row['target_key']] = (int)$row['current_amount'];
        }
        return $progress;
    }

    private function formatRemainingTime(int $seconds): string
    {
        $days = intdiv($seconds, 86400);
        $seconds %= 86400;
        $hours = intdiv($seconds, 3600);
        $seconds %= 3600;
        $minutes = intdiv($seconds, 60);

        if ($days > 0) {
            return sprintf('%dd %02dh %02dm', $days, $hours, $minutes);
        }
        return sprintf('%02dh %02dm', $hours, $minutes);
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

    private function grantCargoSeprom(int $qty): void
    {
        if ($qty <= 0) {
            return;
        }

        $stmt = $this->db->prepare('UPDATE player_cargo SET seprom = seprom + :qty WHERE id = :player_id');
        $stmt->execute([':qty' => $qty, ':player_id' => $this->playerId]);
        if ($stmt->rowCount() > 0) {
            return;
        }

        $this->db->prepare('INSERT INTO player_cargo (id, seprom) VALUES (:player_id, :qty)')
            ->execute([':player_id' => $this->playerId, ':qty' => $qty]);
    }
}
