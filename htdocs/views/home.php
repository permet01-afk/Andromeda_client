<?php
require_once __DIR__ . '/../libs/HomeLeaderboardService.php';
require_once __DIR__ . '/../libs/DailyLoginBonusService.php';

if (!function_exists('homeDecodeLegacyHtmlEntitiesForDisplay')) {
    function homeDecodeLegacyHtmlEntitiesForDisplay($value)
    {
        $decoded = html_entity_decode((string)$value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return preg_replace('/[\x00-\x1F\x7F]/u', '', $decoded);
    }
}

if (!function_exists('homeRenderPilotLeaderboardRows')) {
    function homeRenderPilotLeaderboardRows(array $rows, $scoreKey, $emptyMessage)
    {
        if (empty($rows)) {
            echo '<li class="leaderboard-empty">' . htmlspecialchars($emptyMessage, ENT_QUOTES, 'UTF-8') . '</li>';
            return;
        }

        foreach ($rows as $index => $player) {
            $factionId = (int)($player['factionid'] ?? 0);
            $grade = (int)($player['grade'] ?? 0);
            $username = htmlspecialchars(homeDecodeLegacyHtmlEntitiesForDisplay($player['username'] ?? ''), ENT_QUOTES, 'UTF-8');
            $score = number_format((int)($player[$scoreKey] ?? 0));
            ?>
            <li class="leaderboard-row">
                <span class="leaderboard-rank">#<?php echo $index + 1; ?></span>
                <span class="leaderboard-company"><img src="img/ranks/company/<?php echo $factionId; ?>.png" alt="Company <?php echo $factionId; ?>" /></span>
                <span class="leaderboard-grade"><img src="img/ranks/<?php echo $grade; ?>.png" alt="Grade <?php echo $grade; ?>" /></span>
                <span class="leaderboard-name"><?php echo $username; ?></span>
                <span class="leaderboard-score"><?php echo $score; ?></span>
            </li>
            <?php
        }
    }
}

if (!function_exists('homeRenderClanLeaderboardRows')) {
    function homeRenderClanLeaderboardRows(array $rows, $emptyMessage)
    {
        if (empty($rows)) {
            echo '<li class="leaderboard-empty">' . htmlspecialchars($emptyMessage, ENT_QUOTES, 'UTF-8') . '</li>';
            return;
        }

        foreach ($rows as $index => $clan) {
            $tag = htmlspecialchars(homeDecodeLegacyHtmlEntitiesForDisplay((string)($clan['clan_tag'] ?? '')), ENT_QUOTES, 'UTF-8');
            $name = htmlspecialchars(homeDecodeLegacyHtmlEntitiesForDisplay((string)($clan['clan_name'] ?? '')), ENT_QUOTES, 'UTF-8');
            $score = number_format((int)($clan['total_experience'] ?? 0));
            ?>
            <li class="leaderboard-row">
                <span class="leaderboard-rank">#<?php echo $index + 1; ?></span>
                <span class="leaderboard-name"><?php echo '[' . $tag . '] ' . $name; ?></span>
                <span class="leaderboard-score"><?php echo $score; ?></span>
            </li>
            <?php
        }
    }
}

if (!function_exists('homeGetNextScheduledStart')) {
    function homeGetNextScheduledStart(DateTimeImmutable $now, array $slots)
    {
        $next = null;

        foreach ($slots as $slot) {
            $daysUntil = ((int)$slot['day'] - (int)$now->format('w') + 7) % 7;
            $candidate = $now->setTime(0, 0, 0)->modify('+' . $daysUntil . ' days');
            $timeParts = array_map('intval', explode(':', $slot['time']));
            $hour = $timeParts[0] ?? 0;
            $minute = $timeParts[1] ?? 0;
            $second = $timeParts[2] ?? 0;
            $candidate = $candidate->setTime($hour, $minute, $second);
            if ($candidate <= $now) {
                $candidate = $candidate->modify('+7 days');
            }
            if ($next === null || $candidate < $next) {
                $next = $candidate;
            }
        }

        return $next;
    }
}

if (!function_exists('homeGetNextSpaceballStart')) {
    function homeGetNextSpaceballStart(DateTimeImmutable $now)
    {
        return homeGetNextScheduledStart($now, [
            ['day' => 3, 'time' => '19:00:00'],
            ['day' => 0, 'time' => '17:00:00'],
        ]);
    }
}

if (!function_exists('homeGetNextInvasionStart')) {
    function homeGetNextInvasionStart(DateTimeImmutable $now)
    {
        return homeGetNextScheduledStart($now, [
            ['day' => 6, 'time' => '17:00:00'],
        ]);
    }
}

if (!function_exists('homeFormatCountdown')) {
    function homeFormatCountdown($seconds)
    {
        $seconds = max(0, (int)$seconds);
        $days = intdiv($seconds, 86400);
        $seconds %= 86400;
        $hours = intdiv($seconds, 3600);
        $seconds %= 3600;
        $minutes = intdiv($seconds, 60);

        $parts = [];
        if ($days > 0) {
            $parts[] = $days . 'd';
        }
        if ($hours > 0 || $days > 0) {
            $parts[] = $hours . 'h';
        }
        $parts[] = $minutes . 'm';

        return implode(' ', $parts);
    }
}

if (!function_exists('homeRenderDailyRewardCards')) {
    function homeRenderDailyRewardCards(array $cards)
    {
        foreach ($cards as $card) {
            $day = (int)($card['day'] ?? 0);
            $state = preg_replace('/[^a-z0-9_-]/i', '', (string)($card['state'] ?? 'locked'));
            $stateLabel = htmlspecialchars((string)($card['state_label'] ?? 'Locked'), ENT_QUOTES, 'UTF-8');
            $lines = is_array($card['lines'] ?? null) ? $card['lines'] : [];
            ?>
            <article class="daily-reward-card is-<?php echo $state; ?>" data-daily-day="<?php echo $day; ?>">
                <div class="daily-reward-card-top">
                    <span class="daily-reward-day">Day <?php echo $day; ?></span>
                    <span class="daily-reward-state" data-daily-state><?php echo $stateLabel; ?></span>
                </div>
                <div class="daily-reward-lines">
                    <?php foreach ($lines as $line) { ?>
                        <div class="daily-reward-line">
                            <span class="daily-reward-dot" aria-hidden="true"></span>
                            <span><?php echo htmlspecialchars((string)$line, ENT_QUOTES, 'UTF-8'); ?></span>
                        </div>
                    <?php } ?>
                </div>
            </article>
            <?php
        }
    }
}

$playerId = (int)($_SESSION['player_id'] ?? 0);

$sth = $db->prepare('
    SELECT u.username,
           u.grade,
           u.factionid,
           u.clanid,
           u.credits,
           u.uridium,
           u.rankpoints,
           u.experience,
           u.honor,
           c.clan_tag
    FROM users u
    LEFT JOIN clan c ON c.id = u.clanid
    WHERE u.id = :id
    LIMIT 1
');
$sth->execute([
    ':id' => $playerId,
]);
$currentUser = $sth->fetch(PDO::FETCH_ASSOC) ?: [];

$sth = $db->prepare('SELECT timestamp, message FROM users_log WHERE playerid = :playerid ORDER BY timestamp DESC LIMIT 10');
$sth->execute([
    ':playerid' => $playerId,
]);
$userlog = $sth->fetchAll(PDO::FETCH_ASSOC);

$leaderboards = HomeLeaderboardService::getLeaderboards($db, 10);
$top10 = $leaderboards['rankpoints'] ?? [];
$top10Experience = $leaderboards['experience'] ?? [];
$top10Honor = $leaderboards['honor'] ?? [];
$top10Clans = $leaderboards['clans'] ?? [];

$registeredPlayers = number_format(HomeLeaderboardService::getRegisteredPlayerCount($db));
$serverStats = HomeLeaderboardService::getServerStats($db);

$eventTimezone = new DateTimeZone('Europe/Zurich');
$spaceballNow = new DateTimeImmutable('now', $eventTimezone);
$spaceballNextStart = homeGetNextSpaceballStart($spaceballNow);
$spaceballCountdownSeconds = $spaceballNextStart !== null ? $spaceballNextStart->getTimestamp() - $spaceballNow->getTimestamp() : 0;
$spaceballCountdown = homeFormatCountdown($spaceballCountdownSeconds);
$spaceballNextLabel = $spaceballNextStart !== null ? $spaceballNextStart->format('l, d M H:i T') : 'Not scheduled';
$spaceballActive = false;
$spaceballEventStatement = $db->prepare('SELECT isActif FROM event_information WHERE id = 3 LIMIT 1');
$spaceballEventStatement->execute();
$spaceballEventRow = $spaceballEventStatement->fetch(PDO::FETCH_ASSOC);
if ($spaceballEventRow) {
    $spaceballActive = ((int)($spaceballEventRow['isActif'] ?? 0)) === 1;
}

$invasionNow = new DateTimeImmutable('now', $eventTimezone);
$invasionNextStart = homeGetNextInvasionStart($invasionNow);
$invasionCountdownSeconds = $invasionNextStart !== null ? $invasionNextStart->getTimestamp() - $invasionNow->getTimestamp() : 0;
$invasionCountdown = homeFormatCountdown($invasionCountdownSeconds);
$invasionNextLabel = $invasionNextStart !== null ? $invasionNextStart->format('l, d M H:i T') : 'Not scheduled';
$invasionActive = false;
$invasionEventStatement = $db->prepare('SELECT isActif FROM event_information WHERE id = 1 LIMIT 1');
$invasionEventStatement->execute();
$invasionEventRow = $invasionEventStatement->fetch(PDO::FETCH_ASSOC);
if ($invasionEventRow) {
    $invasionActive = ((int)($invasionEventRow['isActif'] ?? 0)) === 1;
}

$username = htmlspecialchars(homeDecodeLegacyHtmlEntitiesForDisplay($currentUser['username'] ?? ''), ENT_QUOTES, 'UTF-8');
$clanLabel = '';
if ((int)($currentUser['clanid'] ?? 0) !== 0 && !empty($currentUser['clan_tag'])) {
    $clanLabel = htmlspecialchars('[' . homeDecodeLegacyHtmlEntitiesForDisplay($currentUser['clan_tag']) . ']', ENT_QUOTES, 'UTF-8');
}
$credits = number_format((int)($currentUser['credits'] ?? 0));
$uridium = number_format((int)($currentUser['uridium'] ?? 0));
$rankpoints = number_format((int)($currentUser['rankpoints'] ?? 0));
$experience = number_format((int)($currentUser['experience'] ?? 0));
$honor = number_format((int)($currentUser['honor'] ?? 0));
$onlinePlayers = number_format(max(0, (int)($serverStats['active_connections'] ?? 0)));

$companyCounts = [
    'mmo' => number_format(max(0, (int)($serverStats['active_MMO'] ?? 0))),
    'eic' => number_format(max(0, (int)($serverStats['active_EIC'] ?? 0))),
    'vru' => number_format(max(0, (int)($serverStats['active_VRU'] ?? 0))),
];

try {
    $dailyLoginService = new DailyLoginBonusService($db, $playerId);
    $dailyLoginState = $dailyLoginService->getState();
} catch (Throwable $e) {
    $dailyLoginState = [
        'schema_ready' => false,
        'week_reset_label' => 'Monday 00:00 Europe/Zurich',
        'next_reset_label' => 'Not available',
        'claimed_count' => 0,
        'claimed_today' => false,
        'week_completed' => false,
        'next_day' => 1,
        'can_claim' => false,
        'auto_open' => false,
        'claim_message' => 'Daily Login Bonus is not available right now.',
        'cards' => [],
    ];
}

$dailyLoginCsrfToken = isset($dailyLoginCsrfToken) ? (string)$dailyLoginCsrfToken : '';
$dailyLoginStateJson = json_encode($dailyLoginState, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>

<link rel="stylesheet" type="text/css" href="styles/home.css?v=7" />

<section class="dashboard">
    <header class="dashboard-hero">
        <div class="dashboard-header">
            <h1>Command Center Overview</h1>
            <p>Stay up to date with your pilot stats, server activity, and the best pilots in the sector.</p>
        </div>

        <aside class="discord-card" aria-label="Andromeda Discord">
            <div class="discord-mark" aria-hidden="true">
                <svg viewBox="0 0 48 48" focusable="false" role="img">
                    <path d="M18.2 17.8c1.8-0.8 3.6-1.2 5.8-1.2s4.1 0.4 5.8 1.2l1.4-2.6c3 0.7 5.8 2.1 8.1 4.1 0.1 5.3-1.3 10.1-4.2 14.4-2.1 1.5-4.3 2.5-6.8 3.1l-1.8-3c1-0.3 2-0.8 3-1.4-0.5-0.3-0.9-0.6-1.3-0.9-2.8 1.2-5.6 1.2-8.4 0-0.4 0.3-0.8 0.6-1.3 0.9 0.9 0.6 1.9 1.1 3 1.4l-1.8 3c-2.5-0.6-4.8-1.6-6.8-3.1-2.9-4.3-4.3-9.1-4.2-14.4 2.3-2 5.1-3.4 8.1-4.1l1.4 2.6Zm0.5 9.1c1.2 0 2.1-1.1 2.1-2.4s-0.9-2.4-2.1-2.4-2.1 1.1-2.1 2.4 0.9 2.4 2.1 2.4Zm10.6 0c1.2 0 2.1-1.1 2.1-2.4s-0.9-2.4-2.1-2.4-2.1 1.1-2.1 2.4 0.9 2.4 2.1 2.4Z" />
                </svg>
            </div>
            <div class="discord-copy">
                <h2>Join our Discord</h2>
                <p>Chat with pilots, follow events and server news.</p>
                <a class="discord-link" href="https://discord.gg/BEVpW6H7" target="_blank" rel="noopener noreferrer">discord.gg/BEVpW6H7</a>
            </div>
            <a class="discord-cta" href="https://discord.gg/BEVpW6H7" target="_blank" rel="noopener noreferrer">Join Discord</a>
        </aside>
    </header>

    <div class="dashboard-grid">
        <section class="dashboard-card user-card">
            <header class="card-header">
                <h2>Your pilot</h2>
            </header>

            <div class="pilot-card-layout">
                <dl class="stat-list">
                    <div class="stat-row">
                        <dt>Username</dt>
                        <dd>
                            <?php if ($clanLabel !== '') { ?>
                                <span class="stat-badge"><?php echo $clanLabel; ?></span>
                            <?php } ?>
                            <span><?php echo $username; ?></span>
                        </dd>
                    </div>

                    <div class="stat-row">
                        <dt>Company</dt>
                        <dd class="stat-media">
                            <img src="img/ranks/company/<?php echo (int)($currentUser['factionid'] ?? 0); ?>.png" alt="Company" />
                        </dd>
                    </div>

                    <div class="stat-row">
                        <dt>Grade</dt>
                        <dd class="stat-media">
                            <img src="img/ranks/<?php echo (int)($currentUser['grade'] ?? 0); ?>.png" alt="Grade <?php echo (int)($currentUser['grade'] ?? 0); ?>" />
                            <span><?php echo (int)($currentUser['grade'] ?? 0); ?></span>
                        </dd>
                    </div>

                    <div class="stat-row">
                        <dt>Experience</dt>
                        <dd><?php echo $experience; ?></dd>
                    </div>

                    <div class="stat-row">
                        <dt>Honor</dt>
                        <dd><?php echo $honor; ?></dd>
                    </div>

                    <div class="stat-row">
                        <dt>Rank points</dt>
                        <dd><?php echo $rankpoints; ?></dd>
                    </div>

                    <div class="stat-row">
                        <dt>Credits</dt>
                        <dd><?php echo $credits; ?></dd>
                    </div>

                    <div class="stat-row">
                        <dt>Uridium</dt>
                        <dd><?php echo $uridium; ?></dd>
                    </div>
                </dl>
            </div>
        </section>

        <section class="dashboard-card system-card">
            <header class="card-header">
                <h2>Andromeda status</h2>
            </header>

            <ul class="stat-summary">
                <li>
                    <span class="summary-label">Server time</span>
                    <span class="summary-value" data-label="Online">
                        <img src="img/Tick.png" alt="Online" width="20" height="20" />
                        <?php echo date('H:i:s T'); ?>
                    </span>
                </li>

                <li>
                    <span class="summary-label">Active pilots</span>
                    <span class="summary-value company-breakdown">
                        <span><img src="img/ranks/company/1.png" alt="MMO" /> <?php echo $companyCounts['mmo']; ?></span>
                        <span><img src="img/ranks/company/2.png" alt="EIC" /> <?php echo $companyCounts['eic']; ?></span>
                        <span><img src="img/ranks/company/3.png" alt="VRU" /> <?php echo $companyCounts['vru']; ?></span>
                    </span>
                </li>

                <li>
                    <span class="summary-label">Pilots connected</span>
                    <span class="summary-value"><?php echo $onlinePlayers; ?></span>
                </li>

                <li>
                    <span class="summary-label">Registered accounts</span>
                    <span class="summary-value"><?php echo $registeredPlayers; ?></span>
                </li>
            </ul>

            <section class="news-feed">
                <header class="card-subheader">
                    <h3>News</h3>
                </header>

                <div class="news-stream">
                    <article class="news-item">
                        <time datetime="2026-02-01">01/02/2026</time>
                        <p>Welcome to Andromeda Beta by Lefaucheur</p>
                    </article>
                </div>
            </section>
        </section>

        <section class="dashboard-card events-card">
            <header class="card-header">
                <h2>Events</h2>
            </header>

            <div class="events-stack">
                <div class="event-panel <?php echo $spaceballActive ? 'is-active' : 'is-scheduled'; ?>">
                    <div class="event-title-row">
                        <span class="event-name">Spaceball</span>
                        <span class="event-status"><?php echo $spaceballActive ? 'Active' : 'Scheduled'; ?></span>
                    </div>

                    <dl class="event-details">
                        <div>
                            <dt>Status</dt>
                            <dd><?php echo $spaceballActive ? 'Active now on 4-4' : 'Next battle on 4-4'; ?></dd>
                        </div>
                        <div>
                            <dt>Schedule</dt>
                            <dd>Wednesday 19:00 / Sunday 17:00</dd>
                        </div>
                        <div>
                            <dt>Next start</dt>
                            <dd><?php echo htmlspecialchars($spaceballNextLabel, ENT_QUOTES, 'UTF-8'); ?></dd>
                        </div>
                        <div>
                            <dt>Countdown</dt>
                            <dd><?php echo htmlspecialchars($spaceballCountdown, ENT_QUOTES, 'UTF-8'); ?></dd>
                        </div>
                    </dl>
                </div>

                <div class="event-panel <?php echo $invasionActive ? 'is-active' : 'is-scheduled'; ?>">
                    <div class="event-title-row">
                        <span class="event-name">Invasion</span>
                        <span class="event-status"><?php echo $invasionActive ? 'Active' : 'Scheduled'; ?></span>
                    </div>

                    <dl class="event-details">
                        <div>
                            <dt>Status</dt>
                            <dd><?php echo $invasionActive ? 'Active or starting soon' : 'Defend your x-5 map'; ?></dd>
                        </div>
                        <div>
                            <dt>Schedule</dt>
                            <dd>Saturday 17:00</dd>
                        </div>
                        <div>
                            <dt>Maps</dt>
                            <dd>1-5 / 2-5 / 3-5</dd>
                        </div>
                        <div>
                            <dt>Next start</dt>
                            <dd><?php echo htmlspecialchars($invasionNextLabel, ENT_QUOTES, 'UTF-8'); ?></dd>
                        </div>
                        <div>
                            <dt>Countdown</dt>
                            <dd><?php echo htmlspecialchars($invasionCountdown, ENT_QUOTES, 'UTF-8'); ?></dd>
                        </div>
                    </dl>
                </div>
            </div>
        </section>

        <section class="dashboard-card hof-card">
            <header class="card-header">
                <h2>Hall of fame</h2>
                <a class="card-link" id="open-top100" href="#">View top 100</a>
            </header>

            <div class="tab-group" data-tabs>
                <div class="tab-controls" role="tablist" aria-label="Hall of fame leaderboards">
                    <button class="tab-control is-active" type="button" role="tab" id="tab-rankpoints" aria-controls="panel-rankpoints" aria-selected="true">Rankpoints</button>
                    <button class="tab-control" type="button" role="tab" id="tab-experience" aria-controls="panel-experience" aria-selected="false">Experience</button>
                    <button class="tab-control" type="button" role="tab" id="tab-honor" aria-controls="panel-honor" aria-selected="false">Honor</button>
                    <button class="tab-control" type="button" role="tab" id="tab-clan" aria-controls="panel-clan" aria-selected="false">Clan</button>
                </div>

                <div class="tab-panels">
                    <div class="tab-panel is-active" id="panel-rankpoints" role="tabpanel" aria-labelledby="tab-rankpoints">
                        <ol class="leaderboard">
                            <?php homeRenderPilotLeaderboardRows($top10, 'rankpoints', 'No pilots ranked yet.'); ?>
                        </ol>
                    </div>

                    <div class="tab-panel" id="panel-experience" role="tabpanel" aria-labelledby="tab-experience">
                        <ol class="leaderboard">
                            <?php homeRenderPilotLeaderboardRows($top10Experience, 'experience', 'No pilots ranked yet.'); ?>
                        </ol>
                    </div>

                    <div class="tab-panel" id="panel-honor" role="tabpanel" aria-labelledby="tab-honor">
                        <ol class="leaderboard">
                            <?php homeRenderPilotLeaderboardRows($top10Honor, 'honor', 'No pilots ranked yet.'); ?>
                        </ol>
                    </div>

                    <div class="tab-panel" id="panel-clan" role="tabpanel" aria-labelledby="tab-clan">
                        <ol class="leaderboard">
                            <?php homeRenderClanLeaderboardRows($top10Clans, 'No clans ranked yet.'); ?>
                        </ol>
                    </div>
                </div>
            </div>
        </section>

        <section class="dashboard-card log-card">
            <header class="card-header">
                <h2>Activity log</h2>
            </header>

            <ul class="log-list">
                <?php foreach ($userlog as $log) { ?>
                    <li class="log-entry">
                        <time class="log-time" datetime="<?php echo htmlspecialchars($log['timestamp'], ENT_QUOTES, 'UTF-8'); ?>">
                            <?php echo htmlspecialchars($log['timestamp'], ENT_QUOTES, 'UTF-8'); ?>
                        </time>
                        <div class="log-message"><?php echo $log['message']; ?></div>
                    </li>
                <?php } ?>
            </ul>
        </section>
    </div>
</section>


<div class="modal-overlay" id="top100Modal" hidden>
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="top100Title">
        <header class="modal-header">
            <h2 id="top100Title">Top 100</h2>
            <button class="modal-close" type="button" id="top100Close" aria-label="Close">✕</button>
        </header>

        <div class="modal-status" id="top100Status" hidden aria-live="polite"></div>

        <div class="tab-group" data-tabs>
            <div class="tab-controls" role="tablist" aria-label="Top 100 leaderboards">
                <button class="tab-control is-active" type="button" role="tab" id="modal-tab-rankpoints" aria-controls="modal-panel-rankpoints" aria-selected="true">Rankpoints</button>
                <button class="tab-control" type="button" role="tab" id="modal-tab-experience" aria-controls="modal-panel-experience" aria-selected="false">Experience</button>
                <button class="tab-control" type="button" role="tab" id="modal-tab-honor" aria-controls="modal-panel-honor" aria-selected="false">Honor</button>
                <button class="tab-control" type="button" role="tab" id="modal-tab-clan" aria-controls="modal-panel-clan" aria-selected="false">Clan</button>
            </div>

            <div class="tab-panels modal-body">
                <div class="tab-panel is-active" id="modal-panel-rankpoints" role="tabpanel" aria-labelledby="modal-tab-rankpoints">
                    <ol class="leaderboard" id="modal-leaderboard-rankpoints">
                        <li class="leaderboard-empty">Open the top 100 to load this ranking.</li>
                    </ol>
                </div>

                <div class="tab-panel" id="modal-panel-experience" role="tabpanel" aria-labelledby="modal-tab-experience">
                    <ol class="leaderboard" id="modal-leaderboard-experience">
                        <li class="leaderboard-empty">Open the top 100 to load this ranking.</li>
                    </ol>
                </div>

                <div class="tab-panel" id="modal-panel-honor" role="tabpanel" aria-labelledby="modal-tab-honor">
                    <ol class="leaderboard" id="modal-leaderboard-honor">
                        <li class="leaderboard-empty">Open the top 100 to load this ranking.</li>
                    </ol>
                </div>

                <div class="tab-panel" id="modal-panel-clan" role="tabpanel" aria-labelledby="modal-tab-clan">
                    <ol class="leaderboard" id="modal-leaderboard-clans">
                        <li class="leaderboard-empty">Open the top 100 to load this ranking.</li>
                    </ol>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal-overlay daily-login-overlay" id="dailyLoginModal" hidden>
    <div class="daily-login-card" role="dialog" aria-modal="true" aria-labelledby="dailyLoginTitle">
        <header class="daily-login-hero">
            <div class="daily-login-copy">
                <span class="daily-login-kicker">Andromeda Rewards</span>
                <h2 id="dailyLoginTitle">Daily Login Bonus</h2>
                <p>Claim one reward per day. Missing a day keeps you behind until the weekly reset.</p>
            </div>
            <div class="daily-login-reset">Weekly reset: <?php echo htmlspecialchars((string)($dailyLoginState['week_reset_label'] ?? 'Monday 00:00 Europe/Zurich'), ENT_QUOTES, 'UTF-8'); ?></div>
        </header>

        <div class="daily-login-body">
            <div class="daily-login-status" id="dailyLoginStatus" aria-live="polite">
                <div>
                    <strong data-daily-status-title>
                        <?php echo ((bool)($dailyLoginState['can_claim'] ?? false)) ? 'Today\'s reward available:' : 'Daily Login Bonus:'; ?>
                    </strong>
                    <span data-daily-status-message><?php echo htmlspecialchars((string)($dailyLoginState['claim_message'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
                <div class="daily-login-claimed">
                    <span>Claimed this week:</span>
                    <strong data-daily-claimed-count><?php echo (int)($dailyLoginState['claimed_count'] ?? 0); ?> / 7</strong>
                </div>
            </div>

            <section class="daily-reward-grid" aria-label="Daily Login Bonus rewards">
                <?php homeRenderDailyRewardCards($dailyLoginState['cards'] ?? []); ?>
            </section>

            <footer class="daily-login-footer">
                <div class="daily-login-note">Future days unlock one at a time. Claim manually after logging in.</div>
                <div class="daily-login-actions">
                    <button class="daily-login-button daily-login-button-secondary" type="button" id="dailyLoginClose">Close</button>
                    <button class="daily-login-button daily-login-button-primary" type="button" id="dailyLoginClaim" <?php echo ((bool)($dailyLoginState['can_claim'] ?? false)) ? '' : 'disabled'; ?>>Claim Daily Reward</button>
                </div>
            </footer>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
    window.ANDROMEDA_DAILY_LOGIN = {
        state: <?php echo $dailyLoginStateJson ?: '{}'; ?>,
        csrfToken: <?php echo json_encode($dailyLoginCsrfToken, JSON_UNESCAPED_SLASHES); ?>
    };

    document.querySelectorAll('[data-tabs]').forEach(function (group) {
        var controls = group.querySelectorAll('[role="tab"]');
        var panels = group.querySelectorAll('[role="tabpanel"]');

        controls.forEach(function (control) {
            control.addEventListener('click', function () {
                controls.forEach(function (btn) {
                    btn.classList.remove('is-active');
                    btn.setAttribute('aria-selected', 'false');
                });
                panels.forEach(function (panel) {
                    panel.classList.remove('is-active');
                });

                control.classList.add('is-active');
                control.setAttribute('aria-selected', 'true');

                var targetId = control.getAttribute('aria-controls');
                if (targetId) {
                    var targetPanel = group.querySelector('#' + targetId);
                    if (targetPanel) {
                        targetPanel.classList.add('is-active');
                    }
                }
            });
        });
    });

    (function () {
        var config = window.ANDROMEDA_DAILY_LOGIN || {};
        var state = config.state || {};
        var modal = document.getElementById('dailyLoginModal');
        var closeBtn = document.getElementById('dailyLoginClose');
        var claimBtn = document.getElementById('dailyLoginClaim');
        var statusBox = document.getElementById('dailyLoginStatus');
        var statusTitle = document.querySelector('[data-daily-status-title]');
        var statusMessage = document.querySelector('[data-daily-status-message]');
        var claimedCount = document.querySelector('[data-daily-claimed-count]');

        if (!modal || !closeBtn || !claimBtn) return;

        function setModalOpen(open) {
            modal.hidden = !open;
            document.body.classList.toggle('modal-open', open || !document.getElementById('top100Modal').hidden);
        }

        function setStatus(message, isError) {
            if (statusMessage) {
                statusMessage.textContent = message || '';
            }
            if (statusBox) {
                statusBox.classList.toggle('is-error', !!isError);
            }
        }

        function renderDailyState(nextState) {
            state = nextState || state || {};
            if (statusTitle) {
                statusTitle.textContent = state.can_claim ? "Today's reward available:" : 'Daily Login Bonus:';
            }
            setStatus(state.claim_message || '', false);
            if (claimedCount) {
                claimedCount.textContent = String(state.claimed_count || 0) + ' / 7';
            }
            claimBtn.disabled = !state.can_claim;

            if (Array.isArray(state.cards)) {
                state.cards.forEach(function (card) {
                    var el = document.querySelector('[data-daily-day="' + card.day + '"]');
                    if (!el) return;
                    el.classList.remove('is-claimed', 'is-today', 'is-locked');
                    el.classList.add('is-' + (card.state || 'locked'));
                    var badge = el.querySelector('[data-daily-state]');
                    if (badge) {
                        badge.textContent = card.state_label || 'Locked';
                    }
                });
            }
        }

        function claimReward() {
            if (claimBtn.disabled) {
                return;
            }

            claimBtn.disabled = true;
            claimBtn.textContent = 'Claiming...';
            setStatus('Claiming your daily reward...', false);

            var body = new URLSearchParams();
            body.set('action', 'claim');
            body.set('csrf_token', config.csrfToken || '');

            fetch('views/api/daily_login_bonus.php', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                },
                body: body.toString()
            })
                .then(function (response) {
                    return response.json().then(function (payload) {
                        if (!response.ok || !payload || !payload.success) {
                            throw new Error((payload && payload.message) || 'Unable to claim Daily Login Bonus.');
                        }
                        return payload;
                    });
                })
                .then(function (payload) {
                    renderDailyState(payload.state || {});
                    setStatus(payload.message || 'Daily reward claimed.', false);
                })
                .catch(function (error) {
                    setStatus(error.message || 'Unable to claim Daily Login Bonus.', true);
                    claimBtn.disabled = !state.can_claim;
                })
                .finally(function () {
                    claimBtn.textContent = 'Claim Daily Reward';
                });
        }

        closeBtn.addEventListener('click', function () {
            setModalOpen(false);
        });

        modal.addEventListener('click', function (event) {
            if (event.target === modal) {
                setModalOpen(false);
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !modal.hidden) {
                setModalOpen(false);
            }
        });

        claimBtn.addEventListener('click', claimReward);
        renderDailyState(state);

        if (state.auto_open) {
            setModalOpen(true);
        }
    })();

    (function () {
        var openBtn = document.getElementById('open-top100');
        var modal = document.getElementById('top100Modal');
        var closeBtn = document.getElementById('top100Close');
        var status = document.getElementById('top100Status');
        var loaded = false;
        var loading = false;
        var numberFormatter = null;

        try {
            numberFormatter = new Intl.NumberFormat();
        } catch (e) {
            numberFormatter = null;
        }

        if (!openBtn || !modal || !closeBtn) return;

        function escapeHtml(value) {
            return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                }[ch];
            });
        }

        function formatNumber(value) {
            var n = Number(value || 0);
            if (numberFormatter) {
                return numberFormatter.format(n);
            }
            return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        function setStatus(message, isError) {
            if (!status) return;
            status.textContent = message || '';
            status.hidden = !message;
            status.classList.toggle('is-error', !!isError);
        }

        function emptyRow(message) {
            return '<li class="leaderboard-empty">' + escapeHtml(message) + '</li>';
        }

        function renderPilotRows(rows, scoreKey) {
            if (!Array.isArray(rows) || rows.length === 0) {
                return emptyRow('No pilots ranked yet.');
            }

            return rows.map(function (player, index) {
                var factionId = parseInt(player.factionid || 0, 10);
                var grade = parseInt(player.grade || 0, 10);
                return '<li class="leaderboard-row">' +
                    '<span class="leaderboard-rank">#' + (index + 1) + '</span>' +
                    '<span class="leaderboard-company"><img src="img/ranks/company/' + factionId + '.png" alt="Company ' + factionId + '" /></span>' +
                    '<span class="leaderboard-grade"><img src="img/ranks/' + grade + '.png" alt="Grade ' + grade + '" /></span>' +
                    '<span class="leaderboard-name">' + escapeHtml(player.username || '') + '</span>' +
                    '<span class="leaderboard-score">' + formatNumber(player[scoreKey] || 0) + '</span>' +
                '</li>';
            }).join('');
        }

        function renderClanRows(rows) {
            if (!Array.isArray(rows) || rows.length === 0) {
                return emptyRow('No clans ranked yet.');
            }

            return rows.map(function (clan, index) {
                var label = '[' + (clan.clan_tag || '') + '] ' + (clan.clan_name || '');
                return '<li class="leaderboard-row">' +
                    '<span class="leaderboard-rank">#' + (index + 1) + '</span>' +
                    '<span class="leaderboard-name">' + escapeHtml(label) + '</span>' +
                    '<span class="leaderboard-score">' + formatNumber(clan.total_experience || 0) + '</span>' +
                '</li>';
            }).join('');
        }

        function setLoadingRows() {
            ['rankpoints', 'experience', 'honor', 'clans'].forEach(function (key) {
                var el = document.getElementById('modal-leaderboard-' + key);
                if (el) {
                    el.innerHTML = emptyRow('Loading...');
                }
            });
        }

        function renderTop100(leaderboards) {
            var rankpoints = document.getElementById('modal-leaderboard-rankpoints');
            var experience = document.getElementById('modal-leaderboard-experience');
            var honor = document.getElementById('modal-leaderboard-honor');
            var clans = document.getElementById('modal-leaderboard-clans');

            if (rankpoints) rankpoints.innerHTML = renderPilotRows(leaderboards.rankpoints || [], 'rankpoints');
            if (experience) experience.innerHTML = renderPilotRows(leaderboards.experience || [], 'experience');
            if (honor) honor.innerHTML = renderPilotRows(leaderboards.honor || [], 'honor');
            if (clans) clans.innerHTML = renderClanRows(leaderboards.clans || []);
        }

        function loadTop100() {
            if (loaded || loading) {
                return;
            }

            loading = true;
            setStatus('Loading top 100...', false);
            setLoadingRows();

            fetch('views/api/home_top100.php', {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    return response.json();
                })
                .then(function (payload) {
                    if (!payload || !payload.success) {
                        throw new Error((payload && payload.message) || 'Unable to load top 100.');
                    }
                    renderTop100(payload.leaderboards || {});
                    loaded = true;
                    setStatus('', false);
                })
                .catch(function () {
                    setStatus('Unable to load the top 100 right now. Close this window and try again.', true);
                    ['rankpoints', 'experience', 'honor', 'clans'].forEach(function (key) {
                        var el = document.getElementById('modal-leaderboard-' + key);
                        if (el) {
                            el.innerHTML = emptyRow('Top 100 unavailable.');
                        }
                    });
                })
                .finally(function () {
                    loading = false;
                });
        }

        function openModal(e) {
            e.preventDefault();
            modal.hidden = false;
            document.body.classList.add('modal-open');

            var mainActive = document.querySelector('.hof-card [role="tab"].is-active');
            var map = {
                'tab-rankpoints': 'modal-tab-rankpoints',
                'tab-experience': 'modal-tab-experience',
                'tab-honor': 'modal-tab-honor',
                'tab-clan': 'modal-tab-clan'
            };
            if (mainActive && map[mainActive.id]) {
                var target = document.getElementById(map[mainActive.id]);
                if (target) target.click();
            }

            loadTop100();
        }

        function closeModal() {
            modal.hidden = true;
            document.body.classList.remove('modal-open');
        }

        openBtn.addEventListener('click', openModal);
        closeBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !modal.hidden) closeModal();
        });
    })();
});
</script>
