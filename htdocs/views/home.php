<?php
require_once __DIR__ . '/../libs/HomeLeaderboardService.php';

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

if (!function_exists('homeGetNextSpaceballStart')) {
    function homeGetNextSpaceballStart(DateTimeImmutable $now)
    {
        $slots = [
            ['day' => 3, 'time' => '19:00:00'],
            ['day' => 0, 'time' => '17:00:00'],
        ];
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

$spaceballTimezone = new DateTimeZone('Europe/Zurich');
$spaceballNow = new DateTimeImmutable('now', $spaceballTimezone);
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
?>

<link rel="stylesheet" type="text/css" href="styles/home.css?v=4" />

<section class="dashboard">
    <header class="dashboard-header">
        <h1>Command Center Overview</h1>
        <p>Stay up to date with your pilot stats, server activity, and the best pilots in the sector.</p>
    </header>

    <div class="dashboard-grid">
        <section class="dashboard-card user-card">
            <header class="card-header">
                <h2>Your pilot</h2>
            </header>

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

<script>
document.addEventListener('DOMContentLoaded', function () {
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
