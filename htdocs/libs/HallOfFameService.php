<?php

require_once __DIR__ . '/HomeLeaderboardService.php';
require_once __DIR__ . '/BeginnerStatusService.php';
require_once __DIR__ . '/TitleService.php';

/** Read-only Hall of Fame views over existing authoritative statistics.
 * No schema creation, rewards, old Rankpoints or PvP-point score are used here.
 */
final class HallOfFameService
{
    const CACHE_VERSION = 'hof_existing_stats_v1';
    const CATEGORIES = ['your_rank', 'top_user', 'experience', 'honor', 'ships_destroyed', 'clans', 'companies', 'titles'];
    const TOP_USER_EXPRESSION = '(CAST(u.experience AS DECIMAL(30,3)) / 1000 + CAST(u.honor AS DECIMAL(30,3)) / 100)';

    public static function getCategory($db, string $category, int $limit = 100, int $faction = 0, int $playerId = 0, string $metric = ''): array
    {
        if (!in_array($category, self::CATEGORIES, true)) {
            throw new InvalidArgumentException('Unknown Hall of Fame category.');
        }
        if ($faction < 0 || $faction > 3) {
            throw new InvalidArgumentException('Unknown company filter.');
        }
        if ($category === 'companies' && !in_array($metric, ['', 'experience'], true)) {
            throw new InvalidArgumentException('Unknown company metric.');
        }
        if ($category === 'companies') {
            $metric = 'experience'; // Owner-approved comparison; no original DoPs formula claimed.
        }
        $limit = max(1, min(100, $limit));
        $meta = [
            'limit' => $limit,
            'faction' => $faction,
            'mode' => 'total',
            'cache_ttl_seconds' => $category === 'your_rank' ? 0 : ($category === 'titles' ? 10 : HomeLeaderboardService::CACHE_TTL_SECONDS),
            'pending_categories' => ['aliens_destroyed', 'galaxy_gates', 'events', 'last_week', 'highest_climbers'],
        ];
        if ($category === 'your_rank') {
            $meta['player'] = self::getPlayerGrade($db, $playerId);
            $meta['metric'] = 'existing_andromeda_grade';
            $meta['grade_rule'] = 'Honor descending, experience descending, id ascending; existing company grade allocation is unchanged.';
            return ['category' => $category, 'rows' => [], 'meta' => $meta];
        }
        if ($category === 'top_user') {
            $meta['metric'] = 'experience / 1000 + honor / 100';
            $meta['provenance'] = 'Official DarkOrbit FAQ, November 2013; exact 2010 formula not independently confirmed.';
            $meta['historical_evidence_year'] = 2013;
            $meta['period_2010_confirmed'] = false;
            $meta['score_is_derived'] = true;
            $meta['score_is_grade'] = false;
        } elseif ($category === 'clans') {
            $meta['metric'] = 'sum_member_experience';
            $meta['provenance'] = 'Existing Andromeda clan ranking; original DoPs clan score formula unavailable.';
        } elseif ($category === 'companies') {
            $meta['metric'] = $metric !== '' ? $metric : null;
            $meta['metric_requires_owner_decision'] = false;
            $meta['provenance'] = 'Owner-approved sum of eligible players experience; Andromeda adaptation, not a certified original DoPs formula.';
            $meta['ranked'] = $metric !== '';
        } elseif ($category === 'titles') {
            $meta['metric'] = 'currently_displayed_title_holders';
            $meta['is_numeric_ranking'] = false;
        } else {
            $meta['metric'] = $category === 'ships_destroyed' ? 'eligible_player_destructions' : $category;
        }
        $meta['eligibility'] = $category === 'clans'
            ? 'Existing clan rule: non-banned members, with optional company filter; no new activity exclusion.'
            : ($category === 'titles'
                ? 'Currently displayed non-banned holders and active NPC title holder; no historical holder archive.'
                : 'Existing player rule: active within 14 days and no active ban; no new administrator exclusion.');
        // The same host may run independent databases in private previews.
        // Namespace without an extra SQL query and never expose connection data.
        $databaseContext = (defined('DB_HOST') ? (string)DB_HOST : '') . '|' . (defined('DB_NAME') ? (string)DB_NAME : '');
        $cacheKey = self::CACHE_VERSION . '_' . substr(hash('sha256', $databaseContext), 0, 20) . '_' . $category . '_' . $limit . '_' . $faction . '_' . $metric;
        $rows = HomeLeaderboardService::remember($cacheKey, $meta['cache_ttl_seconds'], function () use ($db, $category, $limit, $faction, $metric) {
            if ($category === 'clans') {
                return self::getClans($db, $limit, $faction);
            }
            if ($category === 'companies') {
                return self::getCompanies($db, $faction, $metric);
            }
            if ($category === 'titles') {
                return self::getTitleHolders($db, $limit, $faction);
            }
            return self::getPlayers($db, $category, $limit, $faction);
        });
        if ($category === 'titles') {
            $now = time();
            $rows = array_values(array_filter($rows, static function ($row) use ($now) {
                return empty($row['expires_at']) || strtotime((string)$row['expires_at'] . ' UTC') > $now;
            }));
        }
        foreach ($rows as $i => &$row) {
            $row['position'] = $category === 'titles' || ($category === 'companies' && $metric === '') ? null : $i + 1;
            if ($category === 'titles') {
                $row['label'] = TitleService::getTitleLabel((string)($row['title_key'] ?? ''));
            }
        }
        unset($row);
        return ['category' => $category, 'rows' => $rows, 'meta' => $meta];
    }

    private static function getPlayers($db, string $category, int $limit, int $faction): array
    {
        $scores = [
            'top_user' => self::TOP_USER_EXPRESSION,
            'experience' => 'u.experience',
            'honor' => 'u.honor',
            'ships_destroyed' => 'u.user_kill',
        ];
        $params = [':last_active_limit' => time() - 3600 * 14 * 24];
        $companyWhere = self::companyWhere($faction, $params);
        return self::fetchAll($db, 'SELECT u.id AS player_id, u.username, u.factionid, u.grade,
                COALESCE(c.clan_tag, \'\') AS clan_tag, ' . $scores[$category] . ' AS score
            FROM users u LEFT JOIN clan c ON c.id = u.clanid
            WHERE u.lastlogin > :last_active_limit
              AND NOT EXISTS (SELECT 1 FROM bans b WHERE b.user_id = u.id AND b.timestamp_expire > UNIX_TIMESTAMP())' . $companyWhere . '
            ORDER BY score DESC, u.id ASC LIMIT ' . $limit, $params);
    }

    private static function getClans($db, int $limit, int $faction): array
    {
        $params = [];
        $companyWhere = self::companyWhere($faction, $params);
        return self::fetchAll($db, 'SELECT c.id AS clanid, c.clan_tag, c.clan_name,
                SUM(u.experience) AS score, SUM(u.experience) AS total_experience
            FROM users u INNER JOIN clan c ON c.id = u.clanid
            WHERE u.clanid <> 0
              AND NOT EXISTS (SELECT 1 FROM bans b WHERE b.user_id = u.id AND b.timestamp_expire > UNIX_TIMESTAMP())' . $companyWhere . '
            GROUP BY c.id, c.clan_tag, c.clan_name
            ORDER BY score DESC, c.id ASC LIMIT ' . $limit, $params);
    }

    private static function getCompanies($db, int $faction, string $metric): array
    {
        $params = [':last_active_limit' => time() - 3600 * 14 * 24];
        $companyWhere = self::companyWhere($faction, $params);
        $totals = self::fetchAll($db, 'SELECT u.factionid, COUNT(*) AS members,
                SUM(u.experience) AS experience, SUM(u.honor) AS honor, SUM(u.user_kill) AS ships_destroyed
            FROM users u WHERE u.factionid IN (1, 2, 3) AND u.lastlogin > :last_active_limit
              AND NOT EXISTS (SELECT 1 FROM bans b WHERE b.user_id = u.id AND b.timestamp_expire > UNIX_TIMESTAMP())' . $companyWhere . '
            GROUP BY u.factionid', $params);
        $found = [];
        foreach ($totals as $row) {
            $found[(int)$row['factionid']] = $row;
        }
        $out = [];
        foreach ([1 => 'MMO', 2 => 'EIC', 3 => 'VRU'] as $id => $name) {
            if ($faction !== 0 && $faction !== $id) {
                continue;
            }
            $row = $found[$id] ?? ['factionid' => $id, 'members' => 0, 'experience' => 0, 'honor' => 0, 'ships_destroyed' => 0];
            $row['name'] = $name;
            $row['score'] = $metric === '' ? null : $row[$metric];
            $out[] = $row;
        }
        if ($metric !== '') {
            usort($out, function ($a, $b) {
                $comparison = self::compareIntegerTotals($a['score'], $b['score']);
                if ($comparison === 0) {
                    return (int)$a['factionid'] <=> (int)$b['factionid'];
                }
                return -$comparison;
            });
        }
        return $out;
    }

    private static function getTitleHolders($db, int $limit, int $faction): array
    {
        $params = [];
        $companyWhere = self::companyWhere($faction, $params);
        $rows = self::fetchAll($db, 'SELECT u.game_title AS title_key,
                COALESCE(t.title_scope, \'displayed\') AS scope, \'player\' AS holder_type,
                u.id AS holder_player_id, u.username AS holder_name, u.factionid, u.grade,
                COALESCE(c.clan_tag, \'\') AS clan_tag, t.expires_at
            FROM users u LEFT JOIN clan c ON c.id = u.clanid
            LEFT JOIN player_titles t ON t.player_id = u.id AND t.title_key = u.game_title
            WHERE COALESCE(u.game_title, \'\') <> \'\'
              AND (u.game_title <> \'title_5\' OR COALESCE(u.experience, 0) < ' . BeginnerStatusService::LEVEL_12_EXPERIENCE . ')
              AND (t.title_key IS NULL OR (t.revoked_at IS NULL AND (t.expires_at IS NULL OR t.expires_at > UTC_TIMESTAMP())))
              AND NOT EXISTS (SELECT 1 FROM bans b WHERE b.user_id = u.id AND b.timestamp_expire > UNIX_TIMESTAMP())' . $companyWhere . '
            ORDER BY u.game_title ASC, u.id ASC LIMIT ' . $limit, $params);
        if ($faction === 0 && count($rows) < $limit) {
            $npcRows = self::fetchAll($db, 'SELECT title_key, \'temporary\' AS scope,
                    \'npc\' AS holder_type, 0 AS holder_player_id, \'NPC\' AS holder_name,
                    holder_npc_id, holder_map_id, 0 AS factionid, 0 AS grade, \'\' AS clan_tag, expires_at
                FROM title_runtime_state WHERE holder_type = \'npc\'
                  AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
                ORDER BY title_key ASC LIMIT ' . ($limit - count($rows)));
            $rows = array_merge($rows, $npcRows);
        }
        return $rows;
    }

    private static function compareIntegerTotals($a, $b): int
    {
        $a = (string)$a;
        $b = (string)$b;
        $negativeA = substr($a, 0, 1) === '-';
        $negativeB = substr($b, 0, 1) === '-';
        if ($negativeA !== $negativeB) {
            return $negativeA ? -1 : 1;
        }
        $a = ltrim($a, '-0');
        $b = ltrim($b, '-0');
        $comparison = strlen($a) <=> strlen($b);
        if ($comparison === 0) {
            $comparison = strcmp($a, $b) <=> 0;
        }
        return $negativeA ? -$comparison : $comparison;
    }

    private static function getPlayerGrade($db, int $playerId): array
    {
        if ($playerId <= 0) {
            return [];
        }
        $rows = self::fetchAll($db, 'SELECT u.id AS player_id, u.username, u.grade, u.factionid,
                u.experience, u.honor, u.level, COALESCE(c.clan_tag, \'\') AS clan_tag
            FROM users u LEFT JOIN clan c ON c.id = u.clanid
            WHERE u.id = :player_id LIMIT 1', [':player_id' => $playerId]);
        if (!$rows) {
            return [];
        }
        $row = $rows[0];
        $row['level'] = BeginnerStatusService::levelFromExperience($row['experience']);
        $row['beginner'] = BeginnerStatusService::isBeginnerLevel($row['level']);
        $row['rank_icon'] = 'img/ranks/' . max(0, (int)$row['grade']) . '.png';
        return $row;
    }

    private static function companyWhere(int $faction, array &$params): string
    {
        if ($faction === 0) {
            return '';
        }
        $params[':faction'] = $faction;
        return ' AND u.factionid = :faction';
    }

    private static function fetchAll($db, string $sql, array $params = []): array
    {
        $stmt = $db->prepare($sql);
        foreach ($params as $name => $value) {
            $stmt->bindValue($name, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
