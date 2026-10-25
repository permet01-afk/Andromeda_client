<?php

require_once __DIR__ . '/HomeLeaderboardService.php';

/** Bounded, read-only views of completed results written by the game server. */
final class HistoricalResultsService
{
    const CACHE_VERSION = 'completed_rankings_v1';
    const EVENT_TYPES = ['spaceball', 'tdm', 'invasion'];

    public static function getCategory($db, string $category, int $limit, array $options): array
    {
        $limit = max(1, min(100, $limit));
        $selection = self::selection($category, $options);
        $context = (defined('DB_HOST') ? DB_HOST : '') . '|' . (defined('DB_NAME') ? DB_NAME : '');
        $key = self::CACHE_VERSION . '_' . substr(hash('sha256', $context), 0, 20) . '_' . $category . '_' . $limit . '_' . hash('sha256', json_encode($selection));
        return HomeLeaderboardService::remember($key, 30, function () use ($db, $category, $limit, $selection) {
            try {
                return $category === 'gates' ? self::gates($db, $limit, $selection) : self::events($db, $limit, $selection);
            } catch (PDOException $error) {
                // Missing forward migration must not turn a normal ranking view into a 500.
                if (!in_array((string)$error->getCode(), ['42S02', '42S22'], true)) {
                    throw $error;
                }
                return ['category' => $category, 'rows' => [], 'meta' => $selection + [
                    'available' => false, 'message' => 'These rankings are not available yet.', 'occurrences' => [],
                ]];
            }
        });
    }

    public static function selection(string $category, array $options): array
    {
        if ($category === 'gates') {
            $gate = (string)($options['gate'] ?? '1');
            if (!in_array($gate, ['1', '2', '3', '4'], true)) {
                throw new InvalidArgumentException('Unknown gate.');
            }
            return ['gate' => (int)$gate];
        }
        if ($category !== 'events') {
            throw new InvalidArgumentException('Unknown result category.');
        }
        $event = (string)($options['event'] ?? 'spaceball');
        $scope = (string)($options['scope'] ?? 'companies');
        $period = (string)($options['period'] ?? 'latest');
        $occurrence = (string)($options['occurrence'] ?? '');
        if (!in_array($event, self::EVENT_TYPES, true)
            || !in_array($scope, $event === 'tdm' ? ['companies', 'players'] : ['companies'], true)
            || !in_array($period, ['latest', 'occurrence', 'total'], true)
            || ($occurrence !== '' && !preg_match('/^[a-f0-9]{32}$/D', $occurrence))
            || ($period === 'occurrence' && $occurrence === '')) {
            throw new InvalidArgumentException('Unknown event selection.');
        }
        return compact('event', 'scope', 'period', 'occurrence');
    }

    private static function gates($db, int $limit, array $selection): array
    {
        $rows = self::fetchAll($db, 'SELECT receipt.player_id, receipt.elapsed_ms, receipt.company_at_start AS factionid,
                receipt.completed_at, u.username, u.grade,
                COALESCE(c.clan_tag, \'\') AS clan_tag
            FROM (SELECT player_id, gate_id, MIN(elapsed_ms) AS elapsed_ms FROM gg_completed_runs
                WHERE gate_id = :gate AND rank_eligible = 1 AND rule_version = 1 AND elapsed_ms IS NOT NULL
                GROUP BY player_id, gate_id) best
            INNER JOIN gg_completed_runs receipt ON receipt.player_id = best.player_id AND receipt.gate_id = best.gate_id
                AND receipt.elapsed_ms = best.elapsed_ms AND receipt.rank_eligible = 1 AND receipt.rule_version = 1
            INNER JOIN users u ON u.id = best.player_id LEFT JOIN clan c ON c.id = u.clanid
            WHERE NOT EXISTS (SELECT 1 FROM bans b WHERE b.user_id = u.id AND b.timestamp_expire > UNIX_TIMESTAMP())
            AND NOT EXISTS (SELECT 1 FROM gg_completed_runs earlier WHERE earlier.player_id = receipt.player_id
                AND earlier.gate_id = receipt.gate_id AND earlier.elapsed_ms = receipt.elapsed_ms
                AND earlier.rank_eligible = 1 AND earlier.rule_version = 1
                AND (earlier.completed_at < receipt.completed_at OR
                    (earlier.completed_at = receipt.completed_at AND earlier.run_id < receipt.run_id)))
            ORDER BY best.elapsed_ms ASC, best.player_id ASC LIMIT ' . $limit, [':gate' => $selection['gate']]);
        $previous = null;
        $position = 0;
        foreach ($rows as $index => &$row) {
            if ($previous === null || (string)$row['elapsed_ms'] !== $previous) {
                $position = $index + 1;
            }
            $previous = (string)$row['elapsed_ms'];
            $row['position'] = $position;
        }
        unset($row);
        return ['category' => 'gates', 'rows' => $rows, 'meta' => $selection + ['available' => true, 'limit' => $limit]];
    }

    private static function events($db, int $limit, array $selection): array
    {
        $occurrences = self::fetchAll($db, 'SELECT run_key, started_at, ended_at, status FROM event_ranking_runs
            WHERE event_type = :event AND rules_version = 1 ORDER BY started_at DESC, run_key DESC LIMIT 30', [':event' => $selection['event']]);
        $meta = $selection + ['available' => true, 'occurrences' => $occurrences, 'limit' => $limit];
        if ($selection['period'] === 'latest') {
            if (!$occurrences) {
                return ['category' => 'events', 'rows' => [], 'meta' => $meta];
            }
            $selected = $occurrences[0];
        } elseif ($selection['period'] === 'occurrence') {
            $selectedRows = self::fetchAll($db, 'SELECT run_key, started_at, ended_at, status FROM event_ranking_runs
                WHERE event_type = :event AND rules_version = 1 AND run_key = :run LIMIT 1', [':event' => $selection['event'], ':run' => $selection['occurrence']]);
            if (!$selectedRows) {
                throw new InvalidArgumentException('Unknown event occurrence.');
            }
            $selected = $selectedRows[0];
        } else {
            $selected = null;
        }
        $params = [':event' => $selection['event'], ':entity' => $selection['scope'] === 'players' ? 'player' : 'company'];
        $where = 'r.event_type = :event AND r.rules_version = 1';
        if ($selected !== null) {
            $where .= ' AND r.run_key = :run';
            $params[':run'] = $selected['run_key'];
            $meta['selected_occurrence'] = $selected;
        } else {
            $where .= " AND r.status = 'finished'";
        }
        $metrics = [
            'spaceball' => ['goals'],
            'tdm' => $selection['scope'] === 'players' ? ['damage', 'kills', 'deaths'] : ['match_wins'],
            'invasion' => ['progress', 'damage'],
        ][$selection['event']];
        $metricColumns = [];
        foreach ($metrics as $metric) {
            // These tokens are fixed server-owned allowlists, never request input.
            $metricColumns[] = "COALESCE(SUM(CASE WHEN s.metric = '" . $metric . "' THEN s.score ELSE 0 END), 0) AS " . $metric;
        }
        $score = $metrics[0];
        $aggregate = 'SELECT s.entity_id, ' . implode(', ', $metricColumns) . ',
                CASE WHEN MIN(s.company_at_event) = MAX(s.company_at_event) THEN MIN(s.company_at_event) ELSE 0 END AS event_company,
                CASE WHEN COUNT(DISTINCT s.outcome) = 1 THEN MIN(s.outcome) ELSE \'mixed\' END AS outcome
            FROM event_ranking_runs r INNER JOIN event_ranking_results s ON s.run_key = r.run_key
            WHERE ' . $where . ' AND s.entity_type = :entity
            AND s.metric IN (\'' . implode("','", $metrics) . '\') GROUP BY s.entity_id';
        $order = 'results.' . $score . ' DESC' . ($selection['event'] === 'invasion' ? ', results.damage DESC' : '');
        if ($selection['scope'] === 'players') {
            $sql = 'SELECT results.*, results.entity_id AS player_id, results.event_company AS factionid,
                u.username, u.grade, COALESCE(c.clan_tag, \'\') AS clan_tag
                FROM (' . $aggregate . ') results INNER JOIN users u ON u.id = results.entity_id
                LEFT JOIN clan c ON c.id = u.clanid
                WHERE NOT EXISTS (SELECT 1 FROM bans b WHERE b.user_id = u.id AND b.timestamp_expire > UNIX_TIMESTAMP())
                ORDER BY ' . $order . ', results.entity_id ASC LIMIT ' . $limit;
        } else {
            $sql = 'SELECT results.*, results.entity_id AS factionid FROM (' . $aggregate . ') results
                WHERE results.entity_id IN (1, 2, 3) ORDER BY ' . $order . ', results.entity_id ASC LIMIT 3';
        }
        $rows = self::fetchAll($db, $sql, $params);
        foreach ($rows as $index => &$row) {
            $row['score'] = (string)$row[$score];
            $row['position'] = $index + 1;
            if ($selection['scope'] === 'companies') {
                $row['name'] = [1 => 'MMO', 2 => 'EIC', 3 => 'VRU'][(int)$row['factionid']] ?? '';
            }
        }
        unset($row);
        return ['category' => 'events', 'rows' => $rows, 'meta' => $meta];
    }

    private static function fetchAll($db, string $sql, array $params): array
    {
        $statement = $db->prepare($sql);
        foreach ($params as $name => $value) {
            $statement->bindValue($name, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $statement->execute();
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }
}
