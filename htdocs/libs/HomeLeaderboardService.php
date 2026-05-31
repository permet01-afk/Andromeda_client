<?php

/**
 * Small cached data provider for the dashboard leaderboards.
 *
 * The Home page only needs top 10 rows. Top 100 rows are loaded lazily by
 * views/api/home_top100.php when the player opens the modal.
 */
class HomeLeaderboardService
{
    const CACHE_TTL_SECONDS = 60;
    const STATS_CACHE_TTL_SECONDS = 10;

    public static function getLeaderboards($db, $limit = 10)
    {
        $limit = max(1, min(100, (int)$limit));
        $lastActiveLimit = time() - (3600 * 14 * 24);
        $cacheKey = 'leaderboards_v3_' . $limit;

        return self::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($db, $limit, $lastActiveLimit) {
            return [
                'rankpoints' => self::fetchAll($db, "
                    SELECT u.username, u.rankpoints, u.factionid, u.grade
                    FROM users u
                    LEFT JOIN bans b
                        ON b.user_id = u.id
                       AND b.timestamp_expire > UNIX_TIMESTAMP()
                    WHERE u.lastlogin > :last_active_limit
                      AND b.id IS NULL
                    ORDER BY u.rankpoints DESC
                    LIMIT " . $limit, [
                        ':last_active_limit' => $lastActiveLimit,
                    ]),

                'experience' => self::fetchAll($db, "
                    SELECT u.username, u.experience, u.factionid, u.grade
                    FROM users u
                    LEFT JOIN bans b
                        ON b.user_id = u.id
                       AND b.timestamp_expire > UNIX_TIMESTAMP()
                    WHERE u.lastlogin > :last_active_limit
                      AND b.id IS NULL
                    ORDER BY u.experience DESC
                    LIMIT " . $limit, [
                        ':last_active_limit' => $lastActiveLimit,
                    ]),

                'honor' => self::fetchAll($db, "
                    SELECT u.username, u.honor, u.factionid, u.grade
                    FROM users u
                    LEFT JOIN bans b
                        ON b.user_id = u.id
                       AND b.timestamp_expire > UNIX_TIMESTAMP()
                    WHERE u.lastlogin > :last_active_limit
                      AND b.id IS NULL
                    ORDER BY u.honor DESC
                    LIMIT " . $limit, [
                        ':last_active_limit' => $lastActiveLimit,
                    ]),

                'clans' => self::fetchAll($db, "
                    SELECT c.id AS clanid,
                           c.clan_tag,
                           c.clan_name,
                           SUM(u.experience) AS total_experience
                    FROM users u
                    INNER JOIN clan c ON c.id = u.clanid
                    LEFT JOIN bans b
                        ON b.user_id = u.id
                       AND b.timestamp_expire > UNIX_TIMESTAMP()
                    WHERE u.clanid <> 0
                      AND b.id IS NULL
                    GROUP BY c.id, c.clan_tag, c.clan_name
                    ORDER BY total_experience DESC
                    LIMIT " . $limit),
            ];
        });
    }

    public static function getServerStats($db)
    {
        return self::remember('server_stats_v2', self::STATS_CACHE_TTL_SECONDS, function () use ($db) {
            $rows = self::fetchAll($db, "
                SELECT skey, sval
                FROM server_statistics
                WHERE skey IN ('active_connections', 'active_MMO', 'active_EIC', 'active_VRU')
            ");

            $stats = [
                'active_connections' => 0,
                'active_MMO' => 0,
                'active_EIC' => 0,
                'active_VRU' => 0,
            ];

            foreach ($rows as $row) {
                $key = (string)($row['skey'] ?? '');
                if (array_key_exists($key, $stats)) {
                    $stats[$key] = (int)($row['sval'] ?? 0);
                }
            }

            return $stats;
        });
    }

    public static function getRegisteredPlayerCount($db)
    {
        return self::remember('registered_players_v2', self::CACHE_TTL_SECONDS, function () use ($db) {
            $sth = $db->prepare('SELECT COUNT(*) FROM users');
            $sth->execute();

            return (int)$sth->fetchColumn();
        });
    }

    private static function fetchAll($db, $sql, array $params = [])
    {
        $sth = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $paramType = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $sth->bindValue($key, $value, $paramType);
        }
        $sth->execute();

        return $sth->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function remember($key, $ttlSeconds, $callback)
    {
        $file = self::cacheFile($key);
        $now = time();

        if (is_file($file) && is_readable($file)) {
            $payload = json_decode((string)@file_get_contents($file), true);
            if (is_array($payload) && isset($payload['expires'], $payload['data']) && (int)$payload['expires'] > $now) {
                return $payload['data'];
            }
        }

        $data = call_user_func($callback);
        self::writeCache($file, [
            'expires' => $now + max(1, (int)$ttlSeconds),
            'data' => $data,
        ]);

        return $data;
    }

    private static function cacheFile($key)
    {
        $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'andromeda_home_cache';

        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        return $dir . DIRECTORY_SEPARATOR . sha1((string)$key) . '.json';
    }

    private static function writeCache($file, array $payload)
    {
        $json = json_encode($payload);
        if ($json === false) {
            return;
        }

        $tmp = $file . '.' . getmypid() . '.tmp';
        if (@file_put_contents($tmp, $json, LOCK_EX) !== false) {
            @rename($tmp, $file);
        } else {
            @unlink($tmp);
        }
    }
}
