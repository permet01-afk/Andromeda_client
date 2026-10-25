<?php

/** Read-only projection of auto/update_ranks.php. Never assigns a grade. */
final class GradeProgressionService
{
    const MAX_STAT = '9223372036854775807';
    const MIN_STAT = '-9223372036854775808';
    const RULE_VERSION = 'andromeda_relative_v1';
    // Keep the existing allocator's percentages and floating ceil expression.
    const QUOTAS = [19 => 0.25, 18 => 1, 17 => 1.75, 16 => 2, 15 => 2,
        14 => 2, 13 => 2, 12 => 3, 11 => 3, 10 => 4, 9 => 5, 8 => 7,
        7 => 8, 6 => 9, 5 => 10, 4 => 10, 3 => 10, 2 => 10, 1 => 10];

    public static function getForPlayer($db, int $playerId): array
    {
        $now = time();
        $fallback = self::emptyResult($now);
        if ($playerId <= 0) {
            return $fallback;
        }
        foreach (['inTransaction', 'beginTransaction', 'commit', 'rollBack', 'exec'] as $method) {
            if (!method_exists($db, $method)) {
                return $fallback;
            }
        }
        $owned = false;
        try {
            // Do not change the transaction or isolation of another caller.
            if ($db->inTransaction()) {
                return $fallback;
            }
            $db->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
            if (!$db->beginTransaction()) {
                return $fallback;
            }
            $owned = true;
            $engines = self::fetchAll($db, "SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('users', 'bans')");
            if (count($engines) !== 2 || count(array_filter($engines, static function ($row) {
                return strtolower((string)$row['ENGINE']) === 'innodb';
            })) !== 2) {
                $db->rollBack();
                $owned = false;
                return $fallback;
            }
            $rows = self::fetchAll($db, 'SELECT u.id, u.grade, u.factionid, u.honor, u.experience,
                COALESCE(u.is_admin, 0) AS is_admin, COALESCE(u.is_mod, 0) AS is_mod,
                (u.lastlogin > :cutoff) AS is_recent,
                EXISTS (SELECT 1 FROM bans b WHERE b.user_id = u.id AND b.timestamp_expire > :now) AS is_banned
                FROM users u WHERE u.id = :player_id LIMIT 1',
                [':cutoff' => $now - 14 * 24 * 3600, ':now' => $now, ':player_id' => $playerId]);
            if (!$rows) {
                $db->commit();
                $owned = false;
                return $fallback;
            }
            $facts = ['now' => $now, 'player' => $rows[0], 'counts' => [], 'heads' => [], 'position' => 0];
            $early = self::eligibilityResult($rows[0], $now);
            if ($early !== null) {
                $db->commit();
                $owned = false;
                return $early;
            }
            $params = [];
            $where = self::eligibleWhere('u', 'counts', $now, $params);
            foreach (self::fetchAll($db, 'SELECT u.factionid, COUNT(*) AS amount FROM users u
                WHERE ' . $where . ' GROUP BY u.factionid', $params) as $row) {
                $facts['counts'][(int)$row['factionid']] = (int)$row['amount'];
            }
            $parts = [];
            $params = [];
            for ($company = 1; $company <= 3; $company++) {
                $where = self::eligibleWhere('u', 'head' . $company, $now, $params);
                $parts[] = '(SELECT u.id, u.factionid, u.honor, u.experience FROM users u
                    WHERE ' . $where . ' AND u.factionid = ' . $company . '
                    ORDER BY u.honor DESC, u.experience DESC, u.id ASC LIMIT 2)';
            }
            foreach (self::fetchAll($db, implode(' UNION ALL ', $parts), $params) as $row) {
                $facts['heads'][(int)$row['factionid']][] = $row;
            }
            // UNION ALL preserves the selected rows, not their output order.
            foreach ($facts['heads'] as &$head) {
                usort($head, [self::class, 'exactCompare']);
            }
            unset($head);
            $params = [];
            $where = self::eligibleWhere('u', 'position', $now, $params);
            $params += [':company' => (int)$rows[0]['factionid'], ':honor_a' => self::integer($rows[0]['honor']),
                ':honor_b' => self::integer($rows[0]['honor']), ':xp_a' => self::integer($rows[0]['experience']),
                ':xp_b' => self::integer($rows[0]['experience']), ':player' => $playerId];
            $position = self::fetchAll($db, 'SELECT COUNT(*) + 1 AS position FROM users u WHERE ' . $where . '
                AND u.factionid = :company AND (u.honor > CAST(:honor_a AS SIGNED) OR (u.honor = CAST(:honor_b AS SIGNED)
                AND (u.experience > CAST(:xp_a AS SIGNED) OR (u.experience = CAST(:xp_b AS SIGNED) AND u.id < :player))))', $params);
            $facts['position'] = (int)$position[0]['position'];
            $result = self::calculate($facts);
            if ($result['status'] === 'boundary_required') {
                $offset = (int)$result['_boundary_position'] - 1;
                $params = [':company' => (int)$rows[0]['factionid']];
                $where = self::eligibleWhere('u', 'boundary', $now, $params);
                $boundary = self::fetchAll($db, 'SELECT u.id, u.factionid, u.honor, u.experience
                    FROM users u WHERE ' . $where . ' AND u.factionid = :company
                    ORDER BY u.honor DESC, u.experience DESC, u.id ASC LIMIT 1 OFFSET ' . $offset, $params);
                if (!$boundary) {
                    throw new UnexpectedValueException('Missing snapshot boundary.');
                }
                $facts['boundary'] = $boundary[0];
                $result = self::calculate($facts);
            }
            $thresholds = self::calculateThresholds($facts);
            $positions = [];
            foreach (['current', 'next'] as $kind) {
                if ($thresholds[$kind]['status'] === 'boundary_required') {
                    $positions[] = $thresholds[$kind]['_boundary_position'];
                }
            }
            foreach (array_unique($positions) as $position) {
                $params = [':company' => (int)$rows[0]['factionid'], ':excluded_player' => $playerId];
                $where = self::eligibleWhere('u', 'threshold', $now, $params);
                $boundary = self::fetchAll($db, 'SELECT u.id, u.factionid, u.honor, u.experience
                    FROM users u WHERE ' . $where . ' AND u.factionid = :company AND u.id <> :excluded_player
                    ORDER BY u.honor DESC, u.experience DESC, u.id ASC LIMIT 1 OFFSET ' . ((int)$position - 1), $params);
                if (!$boundary) {
                    throw new UnexpectedValueException('Missing threshold snapshot boundary.');
                }
                $facts['threshold_boundaries'][(int)$position] = $boundary[0];
            }
            $result['thresholds'] = $positions ? self::calculateThresholds($facts) : $thresholds;
            $db->commit();
            $owned = false;
            return $result;
        } catch (Throwable $e) {
            try {
                if ($owned && $db->inTransaction()) {
                    $db->rollBack();
                }
            } catch (Throwable $rollbackError) { /* Safe read failure remains unavailable. */ }
            // No query, connection setting or private database error in the API.
            $fallback['reason'] = 'read_unavailable';
            return $fallback;
        }
    }

    /** Pure calculation seam; fixtures supply bounded snapshot facts, not SQL. */
    public static function calculate(array $facts): array
    {
        $now = (int)$facts['now'];
        $player = $facts['player'];
        $early = self::eligibilityResult($player, $now);
        if ($early !== null) {
            return $early;
        }
        $result = self::playerResult($player, $now);
        $company = (int)$player['factionid'];
        $count = (int)($facts['counts'][$company] ?? 0);
        $position = (int)$facts['position'];
        if ($count < 1 || $position < 1 || $position > $count) {
            throw new UnexpectedValueException('Inconsistent snapshot population.');
        }
        $candidates = [];
        foreach ([1, 2, 3] as $id) {
            $amount = (int)($facts['counts'][$id] ?? 0);
            $head = $facts['heads'][$id] ?? [];
            if (($amount === 0) !== (count($head) === 0) || count($head) > 2) {
                throw new UnexpectedValueException('Inconsistent snapshot heads.');
            }
            if ($head) {
                $candidates[] = $head[0];
            }
        }
        $ambiguous = false;
        for ($a = 0; $a < count($candidates); $a++) {
            for ($b = $a + 1; $b < count($candidates); $b++) {
                $ambiguous = $ambiguous || self::precisionAmbiguous($candidates[$a], $candidates[$b]);
            }
        }
        // Intentionally retain the legacy allocator's float exception for23.
        usort($candidates, [self::class, 'legacyCompare']);
        $global = $candidates[0];
        $globalHere = (int)$global['factionid'] === $company;
        $bands = self::bands($count, $globalHere);
        $projected = 1;
        foreach ($bands as $grade => $range) {
            if ($position >= $range[0] && $position <= $range[1]) {
                $projected = $grade;
                break;
            }
        }
        $result['company_count'] = $count;
        $result['company_position'] = $position;
        $result['projected_grade'] = $projected;
        $targets = array_filter(array_unique(array_merge(array_keys($bands), [23])), static function ($grade) use ($result) {
            return $grade > $result['current_grade'];
        });
        $target = $targets ? min($targets) : null;
        $result['target_grade'] = $target;
        if ($ambiguous) {
            $result['status'] = 'not_estimable';
            $result['reason'] = 'global_precision_ambiguous';
            return $result;
        }
        if ($projected !== $result['current_grade']) {
            $result['status'] = 'awaiting_recalculation';
            $result['reason'] = $projected > $result['current_grade'] ? 'already_at_next_boundary' : 'grade_recalculation_pending';
            if ($projected > $result['current_grade']) {
                $result['missing'] = ['honor' => '0', 'experience_at_equal_honor' => '0', 'honor_if_experience_unchanged' => '0'];
            }
            return $result;
        }
        if ($projected === 23) {
            $result['status'] = 'top_grade';
            $result['reason'] = 'highest_grade';
            return $result;
        }
        $boundary = $target === 23 ? $global : null;
        if ($boundary === null) {
            $boundaryPosition = $bands[$target][1];
            $head = $facts['heads'][$company] ?? [];
            $boundary = $boundaryPosition <= count($head) ? $head[$boundaryPosition - 1] : ($facts['boundary'] ?? null);
            if ($boundary === null) {
                $result['status'] = 'boundary_required';
                $result['_boundary_position'] = $boundaryPosition;
                return $result;
            }
        }
        if ((int)$boundary['id'] === (int)$player['id']) {
            throw new UnexpectedValueException('A next-grade boundary cannot be the same player.');
        }
        $honor = self::integer($boundary['honor']);
        $experience = self::integer($boundary['experience']);
        $requiredXp = (int)$player['id'] < (int)$boundary['id'] ? $experience : self::addOne($experience);
        $xpComparison = self::compareIntegers($result['current']['experience'], $experience);
        $requiredHonorOnly = $xpComparison > 0 || ($xpComparison === 0 && (int)$player['id'] < (int)$boundary['id'])
            ? $honor : self::addOne($honor);
        if (!self::statFits($requiredXp)) {
            $requiredXp = null;
        }
        if (!self::statFits($requiredHonorOnly)) {
            $requiredHonorOnly = null;
        }
        if ($requiredXp === null && $requiredHonorOnly === null) {
            $result['status'] = 'not_estimable';
            $result['reason'] = 'numeric_limit';
            return $result;
        }
        $selectedHonor = $requiredXp !== null ? $honor : $requiredHonorOnly;
        $selectedXp = $requiredXp === null ? $result['current']['experience']
            : (self::compareIntegers($result['current']['experience'], $requiredXp) > 0 ? $result['current']['experience'] : $requiredXp);
        if ($target === 23 && self::precisionAmbiguous(['id' => $player['id'], 'honor' => $selectedHonor,
            'experience' => $selectedXp], $global)) {
            $result['status'] = 'not_estimable';
            $result['reason'] = 'global_precision_ambiguous';
            return $result;
        }
        $result['status'] = 'estimate';
        $result['reason'] = 'relative_boundary';
        $result['is_estimate'] = true;
        $result['basis'] = $requiredXp === null ? 'honor_only' : 'honor_then_experience';
        $result['required'] = ['honor' => $selectedHonor, 'experience_at_equal_honor' => $requiredXp,
            'honor_if_experience_unchanged' => $requiredHonorOnly];
        $result['missing'] = ['honor' => self::difference($selectedHonor, $result['current']['honor']),
            'experience_at_equal_honor' => $requiredXp === null ? null : self::difference($requiredXp, $result['current']['experience']),
            'honor_if_experience_unchanged' => $requiredHonorOnly === null ? null : self::difference($requiredHonorOnly, $result['current']['honor'])];
        return $result;
    }

    /** Minimum honor at fixed XP/id after removing and reinserting this player. */
    public static function calculateThresholds(array $facts): array
    {
        $player = $facts['player'];
        $grade = (int)$player['grade'];
        $early = self::eligibilityResult($player, (int)$facts['now']);
        if ($early !== null) {
            return $early['thresholds'];
        }
        $out = self::thresholdsResult('unavailable', 'snapshot_unavailable', $grade);
        if (($grade < 1 || $grade > 20) && $grade !== 23) {
            return self::thresholdsResult('not_estimable', 'special_grade', $grade);
        }
        $company = (int)$player['factionid'];
        $count = (int)($facts['counts'][$company] ?? 0);
        if ($count < 1) {
            throw new UnexpectedValueException('Inconsistent threshold population.');
        }
        $heads = [];
        foreach ([1, 2, 3] as $id) {
            foreach ($facts['heads'][$id] ?? [] as $head) {
                if ((int)$head['id'] !== (int)$player['id']) {
                    $heads[$id] = $head;
                    break;
                }
            }
            $others = (int)($facts['counts'][$id] ?? 0) - ($id === $company ? 1 : 0);
            if (($others > 0) !== isset($heads[$id])) {
                throw new UnexpectedValueException('Inconsistent threshold heads.');
            }
        }
        $candidates = array_values($heads);
        usort($candidates, [self::class, 'legacyCompare']);
        $globalHere = $candidates && (int)$candidates[0]['factionid'] === $company;
        $bands = self::bands($count, $globalHere);
        $targets = array_filter(array_unique(array_merge(array_keys($bands), [23])), static function ($candidate) use ($grade) {
            return $candidate > $grade;
        });
        $next = $targets ? min($targets) : null;
        $out['next']['grade'] = $next;
        for ($a = 0; $a < count($candidates); $a++) {
            for ($b = $a + 1; $b < count($candidates); $b++) {
                if (self::precisionAmbiguous($candidates[$a], $candidates[$b])) {
                    $out['current'] = self::thresholdResult($grade, 'not_estimable', 'global_precision_ambiguous');
                    $out['next'] = self::thresholdResult($next, $next === null ? 'top_grade' : 'not_estimable', $next === null ? 'highest_grade' : 'global_precision_ambiguous');
                    return $out;
                }
            }
        }
        foreach (['current' => $grade, 'next' => $next] as $kind => $target) {
            if ($target === null) {
                $out[$kind] = self::thresholdResult(null, 'top_grade', 'highest_grade');
                continue;
            }
            if ($target === 23) {
                $out[$kind] = self::supremeThreshold($player, $heads);
                continue;
            }
            $lastPosition = 0;
            foreach ($bands as $bandGrade => $range) {
                if ($bandGrade >= $target) {
                    $lastPosition = max($lastPosition, $range[1]);
                }
            }
            if ($lastPosition >= $count) {
                $out[$kind] = self::thresholdResult($target, 'no_lower_boundary', 'all_honor_values_qualify');
                continue;
            }
            if ($lastPosition < 1) {
                $out[$kind] = self::thresholdResult($target, 'not_estimable', 'no_grade_slot');
                continue;
            }
            $otherHeads = array_values(array_filter($facts['heads'][$company] ?? [], static function ($head) use ($player) {
                return (int)$head['id'] !== (int)$player['id'];
            }));
            $boundary = $otherHeads[$lastPosition - 1] ?? ($facts['threshold_boundaries'][$lastPosition] ?? null);
            if ($boundary === null) {
                $out[$kind] = self::thresholdResult($target, 'boundary_required', 'snapshot_boundary');
                $out[$kind]['_boundary_position'] = $lastPosition;
                continue;
            }
            $required = self::fixedExperienceHonor($player, $boundary);
            if (!self::statFits($required)) {
                $out[$kind] = self::thresholdResult($target, 'not_estimable', 'numeric_limit');
            } elseif ($required === self::MIN_STAT) {
                $out[$kind] = self::thresholdResult($target, 'no_lower_boundary', 'all_honor_values_qualify');
            } else {
                $out[$kind] = self::thresholdResult($target, 'estimate', 'relative_minimum_honor', $required);
            }
        }
        return $out;
    }

    private static function supremeThreshold(array $player, array $heads): array
    {
        if (!$heads) {
            return self::thresholdResult(23, 'no_lower_boundary', 'all_honor_values_qualify');
        }
        $required = self::MIN_STAT;
        foreach ($heads as $head) {
            $candidate = self::fixedExperienceHonor($player, $head);
            if (self::compareIntegers($candidate, $required) > 0) {
                $required = $candidate;
            }
        }
        if (!self::statFits($required)) {
            $reason = self::isSupremeAtHonor($player, $heads, self::MAX_STAT) ? 'global_precision_ambiguous' : 'numeric_limit';
            return self::thresholdResult(23, 'not_estimable', $reason);
        }
        $at = self::isSupremeAtHonor($player, $heads, $required);
        $before = $required !== self::MIN_STAT && self::isSupremeAtHonor($player, $heads, self::subtractOne($required));
        if (!$at || $before) {
            return self::thresholdResult(23, 'not_estimable', 'global_precision_ambiguous');
        }
        return $required === self::MIN_STAT
            ? self::thresholdResult(23, 'no_lower_boundary', 'all_honor_values_qualify')
            : self::thresholdResult(23, 'estimate', 'relative_minimum_honor', $required);
    }

    private static function isSupremeAtHonor(array $player, array $heads, string $honor): bool
    {
        $candidate = $player;
        $candidate['honor'] = $honor;
        foreach ($heads as $company => $head) {
            $comparison = (int)$company === (int)$player['factionid']
                ? self::exactCompare($candidate, $head) : self::legacyCompare($candidate, $head);
            if ($comparison >= 0) {
                return false;
            }
        }
        return true;
    }

    private static function fixedExperienceHonor(array $player, array $boundary): string
    {
        $comparison = self::compareIntegers($player['experience'], $boundary['experience']);
        $honor = self::integer($boundary['honor']);
        return $comparison > 0 || ($comparison === 0 && (int)$player['id'] < (int)$boundary['id']) ? $honor : self::addOne($honor);
    }

    private static function thresholdResult(?int $grade, string $status, string $reason, ?string $honor = null): array
    {
        return ['grade' => $grade, 'status' => $status, 'honor' => $honor, 'reason' => $reason];
    }

    private static function thresholdsResult(string $status, string $reason, ?int $grade = null): array
    {
        return ['basis' => 'minimum_honor_at_fixed_experience',
            'current' => self::thresholdResult($grade, $status, $reason),
            'next' => self::thresholdResult(null, $status, $reason)];
    }

    private static function bands(int $count, bool $globalHere): array
    {
        $bands = [];
        $start = 1;
        if ($globalHere) {
            $bands[23] = [1, 1];
            $start++;
        }
        if ($start <= $count) {
            $bands[20] = [$start, $start];
            $start++;
        }
        $remaining = $count - $start + 1;
        $predictedCount = 0;
        foreach (self::QUOTAS as $grade => $percentage) {
            if ($predictedCount < $remaining) {
                $places = (int)ceil($remaining / 100 * $percentage);
                $end = min($count, $start + $places - 1);
                if ($start <= $end) {
                    $bands[$grade] = [$start, $end];
                }
                $predictedCount += $places;
                $start = $end + 1;
            }
        }
        return $bands;
    }

    private static function emptyResult(int $now): array
    {
        return ['status' => 'unavailable', 'reason' => 'snapshot_unavailable',
            'rule_version' => self::RULE_VERSION, 'as_of_unix' => $now, 'as_of_utc' => gmdate('Y-m-d\TH:i:s\Z', $now),
            'is_estimate' => false, 'basis' => null, 'current_grade' => null, 'projected_grade' => null,
            'target_grade' => null, 'current_company' => null, 'company_position' => null, 'company_count' => null,
            'current' => null, 'required' => null, 'missing' => null,
            'thresholds' => self::thresholdsResult('unavailable', 'snapshot_unavailable')];
    }

    private static function playerResult(array $player, int $now): array
    {
        $result = self::emptyResult($now);
        $result['current_grade'] = (int)$player['grade'];
        $result['current_company'] = (int)$player['factionid'];
        $result['current'] = ['honor' => self::integer($player['honor']), 'experience' => self::integer($player['experience'])];
        return $result;
    }

    private static function eligibilityResult(array $player, int $now): ?array
    {
        $result = self::playerResult($player, $now);
        if ((int)($player['is_admin'] ?? 0) !== 0 || (int)($player['is_mod'] ?? 0) !== 0) {
            $result['status'] = 'staff';
            $result['reason'] = 'staff';
        } elseif ((int)$player['factionid'] < 1 || (int)$player['factionid'] > 3) {
            $result['status'] = 'ineligible';
            $result['reason'] = 'invalid_company';
        } elseif (!empty($player['is_banned'])) {
            $result['status'] = 'ineligible';
            $result['reason'] = 'banned';
        } elseif (empty($player['is_recent'])) {
            $result['status'] = 'ineligible';
            $result['reason'] = 'inactive';
        } else {
            return null;
        }
        $result['thresholds'] = self::thresholdsResult($result['status'], $result['reason'], $result['current_grade']);
        return $result;
    }

    private static function eligibleWhere(string $alias, string $suffix, int $now, array &$params): string
    {
        $params[':cutoff_' . $suffix] = $now - 14 * 24 * 3600;
        $params[':now_' . $suffix] = $now;
        return $alias . '.factionid IN (1, 2, 3) AND ' . $alias . '.lastlogin > :cutoff_' . $suffix . '
            AND COALESCE(' . $alias . '.is_admin, 0) = 0 AND COALESCE(' . $alias . '.is_mod, 0) = 0
            AND NOT EXISTS (SELECT 1 FROM bans b WHERE b.user_id = ' . $alias . '.id AND b.timestamp_expire > :now_' . $suffix . ')';
    }

    private static function fetchAll($db, string $sql, array $params = []): array
    {
        $statement = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $statement->execute();
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function legacyCompare(array $a, array $b): int
    {
        foreach (['honor', 'experience'] as $key) {
            $left = (float)self::integer($a[$key]);
            $right = (float)self::integer($b[$key]);
            if ($left != $right) {
                return $left > $right ? -1 : 1;
            }
        }
        return (int)$a['id'] <=> (int)$b['id'];
    }

    private static function exactCompare(array $a, array $b): int
    {
        foreach (['honor', 'experience'] as $key) {
            $comparison = self::compareIntegers($a[$key], $b[$key]);
            if ($comparison !== 0) {
                return -$comparison;
            }
        }
        return (int)$a['id'] <=> (int)$b['id'];
    }

    private static function precisionAmbiguous(array $a, array $b): bool
    {
        foreach (['honor', 'experience'] as $key) {
            $left = self::integer($a[$key]);
            $right = self::integer($b[$key]);
            $exact = self::compareIntegers($left, $right);
            if ($exact !== 0) {
                return (float)$left === (float)$right;
            }
        }
        return false;
    }

    public static function integer($value): string
    {
        if ((!is_int($value) && !is_string($value)) || !preg_match('/^-?[0-9]+$/D', (string)$value)) {
            throw new UnexpectedValueException('Exact integer required.');
        }
        $negative = substr((string)$value, 0, 1) === '-';
        $digits = ltrim($negative ? substr((string)$value, 1) : (string)$value, '0');
        return $digits === '' ? '0' : ($negative ? '-' : '') . $digits;
    }

    public static function compareIntegers($a, $b): int
    {
        $a = self::integer($a);
        $b = self::integer($b);
        $an = $a[0] === '-';
        $bn = $b[0] === '-';
        if ($an !== $bn) {
            return $an ? -1 : 1;
        }
        $aa = $an ? substr($a, 1) : $a;
        $bb = $bn ? substr($b, 1) : $b;
        $comparison = strlen($aa) <=> strlen($bb);
        if ($comparison === 0) {
            $comparison = strcmp($aa, $bb) <=> 0;
        }
        return $an ? -$comparison : $comparison;
    }

    private static function statFits(string $value): bool
    {
        return self::compareIntegers($value, self::MIN_STAT) >= 0 && self::compareIntegers($value, self::MAX_STAT) <= 0;
    }

    public static function addOne(string $value): string
    {
        $value = self::integer($value);
        if ($value[0] === '-') {
            $digits = self::subtractAbsolute(substr($value, 1), '1');
            return $digits === '0' ? '0' : '-' . $digits;
        }
        return self::addAbsolute($value, '1');
    }

    public static function subtractOne(string $value): string
    {
        $value = self::integer($value);
        if ($value[0] === '-') {
            return '-' . self::addAbsolute(substr($value, 1), '1');
        }
        return $value === '0' ? '-1' : self::subtractAbsolute($value, '1');
    }

    public static function difference(string $required, string $current): string
    {
        $required = self::integer($required);
        $current = self::integer($current);
        if (self::compareIntegers($required, $current) <= 0) {
            return '0';
        }
        $rn = $required[0] === '-';
        $cn = $current[0] === '-';
        if ($rn) {
            return self::subtractAbsolute(substr($current, 1), substr($required, 1));
        }
        return $cn ? self::addAbsolute($required, substr($current, 1)) : self::subtractAbsolute($required, $current);
    }

    private static function addAbsolute(string $a, string $b): string
    {
        $out = '';
        $carry = 0;
        for ($i = strlen($a) - 1, $j = strlen($b) - 1; $i >= 0 || $j >= 0 || $carry; $i--, $j--) {
            $digit = ($i >= 0 ? ord($a[$i]) - 48 : 0) + ($j >= 0 ? ord($b[$j]) - 48 : 0) + $carry;
            $out = (string)($digit % 10) . $out;
            $carry = intdiv($digit, 10);
        }
        return $out;
    }

    private static function subtractAbsolute(string $a, string $b): string
    {
        $out = '';
        $borrow = 0;
        for ($i = strlen($a) - 1, $j = strlen($b) - 1; $i >= 0; $i--, $j--) {
            $digit = ord($a[$i]) - 48 - ($j >= 0 ? ord($b[$j]) - 48 : 0) - $borrow;
            $borrow = $digit < 0 ? 1 : 0;
            $out = (string)($digit + ($borrow ? 10 : 0)) . $out;
        }
        return ltrim($out, '0') === '' ? '0' : ltrim($out, '0');
    }
}
