<?php
require_once __DIR__ . '/../libs/HomeLeaderboardService.php';
require_once __DIR__ . '/../libs/HallOfFameService.php';
require_once __DIR__ . '/../libs/DailyLoginBonusService.php';
require_once __DIR__ . '/../includes/legacy_message_display.php';

if (!function_exists('homeDecodeLegacyHtmlEntitiesForDisplay')) {
    function homeDecodeLegacyHtmlEntitiesForDisplay($value)
    {
        $decoded = html_entity_decode((string)$value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return preg_replace('/[\x00-\x1F\x7F]/u', '', $decoded);
    }
}

if (!function_exists('homeRenderLogMessage')) {
    function homeRenderLogMessage($message)
    {
        return andromedaRenderLegacySystemMessage($message);
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

if (!function_exists('homeGetNextTdmStart')) {
    function homeGetNextTdmStart(DateTimeImmutable $now)
    {
        // Calendar follows Config/tdm_schedule.json, like the other event panels.
        return homeGetNextScheduledStart($now, [
            ['day' => 1, 'time' => '20:00:00'],
            ['day' => 4, 'time' => '20:00:00'],
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
$top10 = $leaderboards['top_user'] ?? [];
$top10Experience = $leaderboards['experience'] ?? [];
$top10Honor = $leaderboards['honor'] ?? [];
$top10Clans = $leaderboards['clans'] ?? [];

$registeredPlayers = number_format(HomeLeaderboardService::getRegisteredPlayerCount($db));
$serverStats = HomeLeaderboardService::getServerStats($db);

$eventTimezone = new DateTimeZone('Europe/Zurich');
$tdmNow = new DateTimeImmutable('now', $eventTimezone);
$tdmNextStart = homeGetNextTdmStart($tdmNow);
$tdmNextLabel = $tdmNextStart->format('l, d M H:i T');
$tdmCountdown = homeFormatCountdown($tdmNextStart->getTimestamp() - $tdmNow->getTimestamp());
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
$experience = number_format((int)($currentUser['experience'] ?? 0));
$honor = number_format((int)($currentUser['honor'] ?? 0));
$pilotLevel = BeginnerStatusService::levelFromExperience($currentUser['experience'] ?? 0);
$gradeName = HallOfFameService::gradeName((int)($currentUser['grade'] ?? 0));
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
        'cycle_days' => DailyLoginBonusService::CYCLE_DAYS,
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

<link rel="stylesheet" type="text/css" href="styles/home.css?v=8" />

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
                <a class="discord-link" href="https://discord.gg/A8nQyxTfWU" target="_blank" rel="noopener noreferrer">discord.gg/A8nQyxTfWU</a>
            </div>
            <a class="discord-cta" href="https://discord.gg/A8nQyxTfWU" target="_blank" rel="noopener noreferrer">Join Discord</a>
        </aside>
    </header>

    <div class="dashboard-grid">
        <div class="dashboard-column dashboard-column-pilot">
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
                                <span><?php echo htmlspecialchars($gradeName, ENT_QUOTES, 'UTF-8'); ?></span>
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
                            <dt>Credits</dt>
                            <dd><?php echo $credits; ?></dd>
                        </div>

                        <div class="stat-row">
                            <dt>Uridium</dt>
                            <dd><?php echo $uridium; ?></dd>
                        </div>
                        <div class="stat-row">
                            <dt>Level</dt>
                            <dd><?php echo (int)$pilotLevel; ?></dd>
                        </div>
                    </dl>
                </div>
            </section>

            <section class="dashboard-card hof-card" data-hof-category="top_user" data-hof-score-field="score" data-hof-provenance="Official FAQ 2013; exact 2010 formula not independently confirmed">
                <header class="card-header">
                    <h2>Hall of fame</h2>
                    <a class="card-link" id="open-top100" href="#">View top 100</a>
                </header>

                <div class="tab-group" data-tabs>
                    <div class="tab-controls" role="tablist" aria-label="Hall of fame leaderboards">
                        <button class="tab-control is-active" type="button" role="tab" id="tab-topuser" aria-controls="panel-topuser" aria-selected="true">Top User</button>
                        <button class="tab-control" type="button" role="tab" id="tab-experience" aria-controls="panel-experience" aria-selected="false">Experience</button>
                        <button class="tab-control" type="button" role="tab" id="tab-honor" aria-controls="panel-honor" aria-selected="false">Honor</button>
                        <button class="tab-control" type="button" role="tab" id="tab-clan" aria-controls="panel-clan" aria-selected="false">Clan</button>
                    </div>

                    <div class="tab-panels">
                        <div class="tab-panel is-active" id="panel-topuser" role="tabpanel" aria-labelledby="tab-topuser">
                            <ol class="leaderboard">
                                <?php homeRenderPilotLeaderboardRows($top10, 'score', 'No pilots ranked yet.'); ?>
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
        </div>

        <div class="dashboard-column dashboard-column-status">
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
            </section>

            <section class="dashboard-card news-card">
                <header class="card-header">
                    <h2>News</h2>
                </header>

                <div class="news-stream">
                    <article class="news-item">
                        <time datetime="2026-02-01">01/02/2026</time>
                        <p><?php echo (defined('ANDROMEDA_HISTORICAL_CATALOGUE') && ANDROMEDA_HISTORICAL_CATALOGUE === true) ? 'Welcome to Andromeda' : 'Welcome to Andromeda Beta by Lefaucheur'; ?></p>
                    </article>
                </div>
            </section>

            <section class="dashboard-card log-card">
                <header class="card-header">
                    <h2>Activity log</h2>
                </header>

                <ul class="log-list">
                    <?php if (empty($userlog)) { ?>
                        <li class="leaderboard-empty">No recent activity.</li>
                    <?php } ?>
                    <?php foreach ($userlog as $log) { ?>
                        <li class="log-entry">
                            <time class="log-time" datetime="<?php echo htmlspecialchars($log['timestamp'], ENT_QUOTES, 'UTF-8'); ?>">
                                <?php echo htmlspecialchars($log['timestamp'], ENT_QUOTES, 'UTF-8'); ?>
                            </time>
                            <div class="log-message"><?php echo homeRenderLogMessage($log['message']); ?></div>
                        </li>
                    <?php } ?>
                </ul>
            </section>
        </div>

        <div class="dashboard-column dashboard-column-events">
            <section class="dashboard-card events-card">
                <header class="card-header">
                    <h2>Events</h2>
                </header>

                <div class="events-stack">
                    <div class="event-panel <?php echo $spaceballActive ? 'is-active' : 'is-scheduled'; ?>"<?php if (defined('ANDROMEDA_HISTORICAL_CATALOGUE') && ANDROMEDA_HISTORICAL_CATALOGUE === true) { ?> data-next-start="<?php echo $spaceballNextStart->getTimestamp(); ?>"<?php } ?>>
                        <div class="event-title-row">
                            <span class="event-name">Spaceball</span>
                            <?php if ($spaceballActive) { ?><span class="event-status">Active</span><?php } ?>
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

                    <div class="event-panel <?php echo $invasionActive ? 'is-active' : 'is-scheduled'; ?>"<?php if (defined('ANDROMEDA_HISTORICAL_CATALOGUE') && ANDROMEDA_HISTORICAL_CATALOGUE === true) { ?> data-next-start="<?php echo $invasionNextStart->getTimestamp(); ?>"<?php } ?>>
                        <div class="event-title-row">
                            <span class="event-name">Invasion</span>
                            <?php if ($invasionActive) { ?><span class="event-status">Active</span><?php } ?>
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

                    <div class="event-panel is-scheduled"<?php if (defined('ANDROMEDA_HISTORICAL_CATALOGUE') && ANDROMEDA_HISTORICAL_CATALOGUE === true) { ?> data-next-start="<?php echo $tdmNextStart->getTimestamp(); ?>"<?php } ?>>
                        <div class="event-title-row">
                            <span class="event-name">Team Deathmatch</span>
                        </div>
                        <dl class="event-details">
                            <div>
                                <dt>Status</dt>
                                <dd>Join from Gate on your x-1 map</dd>
                            </div>
                            <div>
                                <dt>Schedule</dt>
                                <dd>Monday 20:00 / Thursday 20:00</dd>
                            </div>
                            <div>
                                <dt>Duration</dt>
                                <dd>60 minutes</dd>
                            </div>
                            <div>
                                <dt>Next start</dt>
                                <dd><?php echo htmlspecialchars($tdmNextLabel, ENT_QUOTES, 'UTF-8'); ?></dd>
                            </div>
                            <div>
                                <dt>Countdown</dt>
                                <dd><?php echo htmlspecialchars($tdmCountdown, ENT_QUOTES, 'UTF-8'); ?></dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </section>
        </div>
    </div>
</section>


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
                    <strong data-daily-claimed-count><?php echo (int)($dailyLoginState['claimed_count'] ?? 0); ?> / <?php echo (int)($dailyLoginState['cycle_days'] ?? DailyLoginBonusService::CYCLE_DAYS); ?></strong>
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
                claimedCount.textContent = String(state.claimed_count || 0) + ' / ' + String(state.cycle_days || 5);
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


});
</script>
