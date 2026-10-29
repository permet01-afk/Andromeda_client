<?php
declare(strict_types=1);

/** Explicit offline data maintenance only. Never invoked by a player request. */
final class WeeklyUberMigration
{
    public const MISSION_CODE = 'weekly_uber_endurance_45';
    public const REGULAR_TARGET = '29:Uber Streuner';
    public const LEGACY_X8_TARGET = '29:Uber StreuneR';
    public const X8_TARGET = '29:Uber StreuneR_X8';

    private static function rows(PDO $db, string $sql, array $parameters = []): array
    {
        $statement = $db->prepare($sql);
        $statement->execute($parameters);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Returns source data for an external receipt; no write occurs. */
    public static function inspect(PDO $db, bool $locked = false): array
    {
        if ($locked && !$db->inTransaction()) throw new RuntimeException('A maintenance transaction is required.');
        $suffix = $locked ? ' FOR UPDATE' : '';
        $missions = self::rows($db, 'SELECT * FROM site_weekly_missions WHERE code=?' . $suffix, [self::MISSION_CODE]);
        if (count($missions) !== 1) throw new RuntimeException('Exactly one existing Uber Endurance definition is required.');
        $mission = $missions[0];
        if ((string)$mission['rotation_group'] !== 'C' || !in_array((int)$mission['reward_uridium'], [45000,9000], true)
            || (int)$mission['enabled'] !== 1) throw new RuntimeException('Unexpected Uber Endurance group, reward or availability.');
        $id = (int)$mission['id'];
        $objectives = self::rows($db, 'SELECT * FROM site_weekly_mission_objectives WHERE mission_id=? ORDER BY id' . $suffix, [$id]);
        $regular = $legacy = $canonical = [];
        foreach ($objectives as $objective) {
            if ((string)$objective['objective_type'] !== 'weekly_npc_kill') continue;
            if ((string)$objective['target_key'] === self::REGULAR_TARGET) $regular[] = $objective;
            elseif ((string)$objective['target_key'] === self::LEGACY_X8_TARGET) $legacy[] = $objective;
            elseif ((string)$objective['target_key'] === self::X8_TARGET) $canonical[] = $objective;
        }
        if (count($regular) !== 1 || (int)$regular[0]['required_amount'] !== 80
            || count($legacy) + count($canonical) !== 1
            || (int)($legacy[0]['required_amount'] ?? $canonical[0]['required_amount'] ?? 0) !== 20) {
            throw new RuntimeException('The exact distinct 80 / 20 objectives are required; no inferred replacement is allowed.');
        }
        $attempts = self::rows($db, 'SELECT * FROM site_player_weekly_missions WHERE mission_id=? ORDER BY player_id,week_key' . $suffix, [$id]);
        $progress = self::rows($db, 'SELECT * FROM site_player_weekly_mission_progress WHERE mission_id=? ORDER BY player_id,week_key,objective_type,target_key' . $suffix, [$id]);
        $states = [];
        foreach ($attempts as $attempt) $states[(string)$attempt['player_id'] . '|' . (string)$attempt['week_key']] = (string)$attempt['status'];
        $normalize = $ambiguous = [];
        foreach ($progress as $row) {
            if ((string)$row['objective_type'] !== 'weekly_npc_kill' || (string)$row['target_key'] !== self::LEGACY_X8_TARGET) continue;
            $status = $states[(string)$row['player_id'] . '|' . (string)$row['week_key']] ?? null;
            // Closed attempts and all their original counters remain byte-for-byte intact.
            if ($status === 'claimed') continue;
            if ((int)$row['current_amount'] !== 0 || $status !== 'in_progress') {
                $ambiguous[] = ['player_id'=>$row['player_id'], 'week_key'=>$row['week_key'],
                    'target_key'=>$row['target_key'], 'current_amount'=>$row['current_amount'], 'status'=>$status];
            } else {
                // A zero carries no kill attribution. Normalize only its spelling to
                // the existing regular key; never copy it to the new X8 objective.
                $normalize[] = $row;
            }
        }
        $engines = self::rows($db, "SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('site_weekly_missions','site_weekly_mission_objectives','site_player_weekly_missions','site_player_weekly_mission_progress') ORDER BY TABLE_NAME");
        if (count($engines) !== 4 || array_filter($engines, static fn(array $r): bool => strcasecmp((string)$r['ENGINE'], 'InnoDB') !== 0)) {
            throw new RuntimeException('Existing Weekly tables must already use InnoDB; no automatic engine conversion is allowed.');
        }
        return [
            'summary'=>[
                'mission_code'=>self::MISSION_CODE, 'mission_id'=>$id, 'rotation_group'=>'C', 'reward_uridium'=>(int)$mission['reward_uridium'],
                'regular_objective_id'=>(int)$regular[0]['id'], 'regular_target'=>self::REGULAR_TARGET, 'regular_required'=>80,
                'x8_objective_id'=>(int)($legacy[0]['id'] ?? $canonical[0]['id']), 'x8_target'=>self::X8_TARGET, 'x8_required'=>20,
                'definition_already_canonical'=>count($canonical) === 1, 'objective_rows'=>count($objectives),
                'attempt_rows'=>count($attempts), 'claimed_attempt_rows'=>count(array_filter($attempts, static fn(array $r): bool => $r['status'] === 'claimed')),
                'progress_rows'=>count($progress), 'zero_legacy_keys_to_normalize'=>count($normalize),
                'ambiguous_nonclaimed_rows'=>count($ambiguous), 'can_apply'=>count($ambiguous) === 0,
                'schema_changes'=>0, 'reward_changes'=>0, 'period_changes'=>0,
            ],
            'snapshot'=>['mission'=>$mission, 'objectives'=>$objectives, 'attempts'=>$attempts, 'progress'=>$progress],
            'normalize'=>$normalize, 'ambiguous'=>$ambiguous,
        ];
    }

    /** Transactional and idempotent; a durable external pre-write receipt is mandatory. */
    public static function apply(PDO $db, callable $archiveBeforeWrite): array
    {
        if ($db->inTransaction()) throw new RuntimeException('Nested maintenance transactions are refused.');
        $db->beginTransaction();
        try {
            $before = self::inspect($db, true);
            $archiveBeforeWrite($before);
            if (!$before['summary']['can_apply']) {
                throw new RuntimeException('Ambiguous nonclaimed legacy progress exists. No counter was assigned or reset; review the external receipt.');
            }
            $id = $before['summary']['mission_id'];
            $renamed = 0;
            if (!$before['summary']['definition_already_canonical']) {
                $statement = $db->prepare('UPDATE site_weekly_mission_objectives SET target_key=? WHERE id=? AND mission_id=? AND objective_type=? AND BINARY target_key=BINARY ? AND required_amount=20');
                $statement->execute([self::X8_TARGET, $before['summary']['x8_objective_id'], $id, 'weekly_npc_kill', self::LEGACY_X8_TARGET]);
                if ($statement->rowCount() !== 1) throw new RuntimeException('The locked legacy objective changed unexpectedly.');
                $renamed = 1;
            }
            foreach ($before['normalize'] as $row) {
                $statement = $db->prepare('UPDATE site_player_weekly_mission_progress SET target_key=?,updated_at=updated_at WHERE player_id=? AND mission_id=? AND week_key=? AND objective_type=? AND BINARY target_key=BINARY ? AND current_amount=0');
                $statement->execute([self::REGULAR_TARGET, $row['player_id'], $id, $row['week_key'], 'weekly_npc_kill', self::LEGACY_X8_TARGET]);
                if ($statement->rowCount() !== 1) throw new RuntimeException('The locked zero legacy key changed unexpectedly.');
            }
            $after = self::inspect($db, true);
            $expected = $before['snapshot'];
            foreach ($expected['objectives'] as &$objective) {
                if ((int)$objective['id'] === $before['summary']['x8_objective_id']) $objective['target_key'] = self::X8_TARGET;
            }
            unset($objective);
            $normalizable = [];
            foreach ($before['normalize'] as $row) $normalizable[(string)$row['player_id'] . '|' . (string)$row['week_key']] = true;
            foreach ($expected['progress'] as &$row) {
                if ((string)$row['objective_type'] === 'weekly_npc_kill' && (string)$row['target_key'] === self::LEGACY_X8_TARGET
                    && isset($normalizable[(string)$row['player_id'] . '|' . (string)$row['week_key']])) $row['target_key'] = self::REGULAR_TARGET;
            }
            unset($row);
            $stable = static function (array $rows): array {
                usort($rows, static fn(array $a,array $b): int => strcmp(json_encode($a,JSON_THROW_ON_ERROR),json_encode($b,JSON_THROW_ON_ERROR)));
                return $rows;
            };
            foreach (['objectives','attempts','progress'] as $table) {
                if ($stable($expected[$table]) !== $stable($after['snapshot'][$table])) throw new RuntimeException('Unexpected maintenance data change; the transaction has been rolled back.');
            }
            if ($expected['mission'] !== $after['snapshot']['mission']) throw new RuntimeException('Mission rewards or rules changed unexpectedly.');
            $db->commit();
            return ['status'=>'WEEKLY_UBER_MAINTENANCE_COMPLETED', 'definition_keys_changed'=>$renamed,
                'zero_progress_keys_normalized'=>count($before['normalize']), 'already_applied'=>$renamed === 0 && count($before['normalize']) === 0,
                'progress_amounts_changed'=>0, 'claims_changed'=>0, 'rewards_changed'=>0, 'schema_changes'=>0, 'summary'=>$after['summary']];
        } catch (Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            throw $error;
        }
    }
}
