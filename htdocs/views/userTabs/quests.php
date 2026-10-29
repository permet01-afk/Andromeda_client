<?php
require_once 'libs/QuestService.php';
require_once 'libs/WeeklyMissionService.php';
require_once 'libs/MissionControlPresenter.php';

$section = isset($_GET['section']) ? (string)$_GET['section'] : 'contracts';
$allowedSections = ['normal', 'challenges', 'daily', 'event', 'contracts', 'basic', 'pvp', 'havok', 'weekly'];
if (!in_array($section, $allowedSections, true)) {
    $section = 'contracts';
}
// The public Daily tab reuses the installed Weekly engine and its action names.
if ($section === 'daily') {
    $section = 'weekly';
} elseif (in_array($section, ['challenges', 'event'], true)) {
    $section = 'normal';
}

$playerId = (int)($_SESSION['player_id'] ?? 0);
$questToken = $questCsrfToken ?? ($_SESSION['quest_csrf_token'] ?? '');
$questService = new QuestService($db, $playerId);
$weeklyMissionService = new WeeklyMissionService($db, $playerId);
$questError = '';
$questNotice = '';
// A successful service action may wake another same-origin game tab. The hint
// contains no counters or rewards; the game must fetch its authenticated state.
$questLifecycleNotice = [];
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && isset($_SESSION['quest_lifecycle_notice'])) {
    $pendingHint = $_SESSION['quest_lifecycle_notice'];
    unset($_SESSION['quest_lifecycle_notice']);
    if (is_array($pendingHint) && (int)($pendingHint['player_id'] ?? 0) === $playerId
        && in_array($pendingHint['action'] ?? '', ['accept', 'abort', 'claim'], true)
        && preg_match('/^[a-f0-9]{24}$/D', (string)($pendingHint['nonce'] ?? ''))) $questLifecycleNotice = $pendingHint;
}
$queueQuestLifecycleHint = static function (string $action) use ($playerId): void {
    try { $_SESSION['quest_lifecycle_notice'] = ['player_id' => $playerId, 'nonce' => bin2hex(random_bytes(12)), 'action' => $action]; }
    catch (Throwable $ignoredHintFailure) { /* The normal refresh path remains available. */ }
};
$weeklyError = '';
$historicalActive = false;
$historicalMeta = [];
$historicalCatalogues = ['normal' => [], 'challenges' => [], 'daily' => [], 'event' => []];
try {
    $historicalActive = method_exists($questService, 'isHistoricalCatalogActive') && $questService->isHistoricalCatalogActive();
} catch (Exception $historicalAvailabilityException) {
    // Existing custom quests remain usable if the optional historical catalogue is not activated.
}
if ($historicalActive && (!isset($_GET['section']) || in_array($section, ['basic', 'pvp'], true))) {
    $section = 'normal';
} elseif (!$historicalActive && in_array($section, ['normal', 'challenges', 'daily', 'event'], true)) {
    $section = 'contracts';
}

$noticeMap = [
    'accepted' => 'Quest accepted.',
    'claimed' => 'Quest reward claimed.',
    'aborted' => 'Quest aborted.',
    'contract_claimed' => 'Hunting contract reward claimed.',
    'weekly_claimed' => 'Daily mission reward claimed.',
];
if (isset($_GET['quest_msg']) && isset($noticeMap[$_GET['quest_msg']])) {
    $questNotice = $noticeMap[$_GET['quest_msg']];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['quest_action'])) {
    try {
        $postedToken = (string)($_POST['csrf_token'] ?? '');
        if ($questToken === '' || !hash_equals((string)$questToken, $postedToken)) {
            throw new Exception('Security token expired. Please refresh the page and try again.');
        }

        $action = (string)$_POST['quest_action'];
        if ($historicalActive && in_array($action, ['accept_basic', 'claim_basic', 'abort_basic', 'accept_pvp', 'claim_pvp', 'abort_pvp'], true)) {
            throw new Exception('This quest is archived. Select a mission from the Normal category.');
        }
        if (in_array($action, ['accept_historical', 'claim_historical', 'abort_historical'], true)) {
            if (!$historicalActive) {
                throw new Exception('Historical missions are not available.');
            }
            $historicalCode = (string)($_POST['quest_code'] ?? '');
            if ($action === 'accept_historical') {
                $questService->acceptHistoricalQuest($historicalCode);
                $queueQuestLifecycleHint('accept');
                $historicalNotice = 'accepted';
            } elseif ($action === 'claim_historical') {
                $questService->claimHistoricalQuest($historicalCode);
                $queueQuestLifecycleHint('claim');
                $historicalNotice = 'claimed';
            } else {
                $questService->abortHistoricalQuest($historicalCode);
                $queueQuestLifecycleHint('abort');
                $historicalNotice = 'aborted';
            }
            $historicalSection = in_array($section, ['normal', 'challenges', 'daily', 'event'], true) ? $section : 'normal';
            header('Location: ' . MissionControlPresenter::returnUrl($historicalSection, $historicalCode, $historicalNotice));
            exit;
        }
        if ($action === 'accept_basic') {
            $questService->acceptBasicQuest((string)($_POST['quest_code'] ?? ''));
            $queueQuestLifecycleHint('accept');
            header('Location: ' . MissionControlPresenter::returnUrl('basic', (string)($_POST['quest_code'] ?? ''), 'accepted'));
            exit;
        }

        if ($action === 'claim_basic') {
            $questService->claimBasicQuest((string)($_POST['quest_code'] ?? ''));
            $queueQuestLifecycleHint('claim');
            header('Location: ' . MissionControlPresenter::returnUrl('basic', (string)($_POST['quest_code'] ?? ''), 'claimed'));
            exit;
        }

        if ($action === 'abort_basic') {
            $questService->abortBasicQuest((string)($_POST['quest_code'] ?? ''));
            $queueQuestLifecycleHint('abort');
            header('Location: ' . MissionControlPresenter::returnUrl('basic', (string)($_POST['quest_code'] ?? ''), 'aborted'));
            exit;
        }

        if ($action === 'accept_pvp') {
            $questService->acceptPvpQuest((string)($_POST['quest_code'] ?? ''));
            $queueQuestLifecycleHint('accept');
            header('Location: ' . MissionControlPresenter::returnUrl('pvp', (string)($_POST['quest_code'] ?? ''), 'accepted'));
            exit;
        }

        if ($action === 'claim_pvp') {
            $questService->claimPvpQuest((string)($_POST['quest_code'] ?? ''));
            $queueQuestLifecycleHint('claim');
            header('Location: ' . MissionControlPresenter::returnUrl('pvp', (string)($_POST['quest_code'] ?? ''), 'claimed'));
            exit;
        }

        if ($action === 'abort_pvp') {
            $questService->abortPvpQuest((string)($_POST['quest_code'] ?? ''));
            $queueQuestLifecycleHint('abort');
            header('Location: ' . MissionControlPresenter::returnUrl('pvp', (string)($_POST['quest_code'] ?? ''), 'aborted'));
            exit;
        }

        if ($action === 'accept_havok') {
            $questService->acceptHavokQuest((string)($_POST['quest_code'] ?? ''));
            $queueQuestLifecycleHint('accept');
            header('Location: ' . MissionControlPresenter::returnUrl('havok', (string)($_POST['quest_code'] ?? ''), 'accepted'));
            exit;
        }

        if ($action === 'claim_havok') {
            $questService->claimHavokQuest((string)($_POST['quest_code'] ?? ''));
            $queueQuestLifecycleHint('claim');
            header('Location: ' . MissionControlPresenter::returnUrl('havok', (string)($_POST['quest_code'] ?? ''), 'claimed'));
            exit;
        }

        if ($action === 'claim_weekly') {
            $weeklyMissionService->claimWeeklyMission((string)($_POST['quest_code'] ?? ''));
            $queueQuestLifecycleHint('claim');
            header('Location: ' . MissionControlPresenter::returnUrl('weekly', (string)($_POST['quest_code'] ?? ''), 'weekly_claimed'));
            exit;
        }

        if ($action === 'abort_havok') {
            $questService->abortHavokQuest((string)($_POST['quest_code'] ?? ''));
            $queueQuestLifecycleHint('abort');
            header('Location: ' . MissionControlPresenter::returnUrl('havok', (string)($_POST['quest_code'] ?? ''), 'aborted'));
            exit;
        }

        if ($action === 'claim_contract') {
            $questService->claimHuntingContract((string)($_POST['npc_name'] ?? ''));
            $queueQuestLifecycleHint('claim');
            header('Location: ' . MissionControlPresenter::returnUrl('contracts', (string)($_POST['npc_name'] ?? ''), 'contract_claimed'));
            exit;
        }
    } catch (Exception $e) {
        $questError = $e->getMessage();
    }
}

try {
    $questService->preparePage();
    $huntingContracts = $questService->getHuntingContracts();
    $basicQuests = $historicalActive ? [] : $questService->getBasicQuests();
    $pvpQuests = $historicalActive ? [] : $questService->getPvpQuests();
    if ($historicalActive) {
        $historicalRows = $questService->getHistoricalQuests();
        $historicalMeta = $questService->getHistoricalMeta();
        $historicalCategoryGroups = ['normal' => 'normal', 'challenges' => 'challenges', 'daily' => 'daily', 'event' => 'event'];
        foreach ($historicalRows as $historicalRow) {
            $historicalCategory = strtolower((string)($historicalRow['historical_category'] ?? 'Normal'));
            if (isset($historicalCategoryGroups[$historicalCategory])) {
                $historicalCatalogues[$historicalCategoryGroups[$historicalCategory]][] = $historicalRow;
            }
        }
    }
    $havokQuests = $questService->getHavokQuests();
    try {
        $weeklyState = $weeklyMissionService->getWeeklyState();
        $weeklyMissions = $weeklyState['missions'] ?? [];
        $weeklyMeta = $weeklyState['meta'] ?? [];
        $weeklyError = (string)($weeklyState['error'] ?? '');
    } catch (Exception $weeklyException) {
        $weeklyMissions = [];
        $weeklyMeta = $weeklyMissionService->getWeeklyMeta();
        $weeklyError = 'Daily missions are temporarily unavailable.';
    }
    $activeQuestCount = $questService->getActiveQuestCount();
    $maxActiveQuestCount = $questService->getMaxActiveQuestCount();
} catch (Exception $e) {
    $huntingContracts = [];
    $basicQuests = [];
    $pvpQuests = [];
    $havokQuests = [];
    $weeklyMissions = [];
    $weeklyMeta = [];
    $weeklyError = '';
    $activeQuestCount = 0;
    $maxActiveQuestCount = QuestService::MAX_ACTIVE_SITE_QUESTS;
    $questError = $questError !== '' ? $questError : $e->getMessage();
}

// Use the same cached player context that produced the historical objectives.
// The legacy fallback needs one indexed lookup; neither path polls or mutates it.
$mcCompany = (int)($historicalMeta['company'] ?? 0);
if ($playerId > 0 && !in_array($mcCompany, [1, 2, 3], true)) {
    try {
        $mcCompanyStmt = $db->prepare('SELECT factionid FROM users WHERE id = :player_id LIMIT 1');
        $mcCompanyStmt->execute([':player_id' => $playerId]);
        $mcCompany = (int)$mcCompanyStmt->fetchColumn();
    } catch (Exception $portraitException) {
        // The common Nyx portrait remains valid when company context is unavailable.
    }
}
$mcMinimumLevels = [];
try {
    // One batch projection, not another catalogue engine or an eligibility check.
    $mcLevelRows = $db->query('SELECT code, min_level FROM site_quests WHERE enabled = 1')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($mcLevelRows as $mcLevelRow) {
        $mcMinimumLevels[(string)$mcLevelRow['code']] = (int)$mcLevelRow['min_level'] > 0 ? (int)$mcLevelRow['min_level'] : null;
    }
} catch (Exception $levelMetadataException) {
    // Missing metadata leaves the sort disabled rather than fabricating levels.
}

$mcState = MissionControlPresenter::build([
    'normal' => $historicalCatalogues['normal'],
    'challenges' => $historicalCatalogues['challenges'],
    'daily' => $historicalCatalogues['daily'],
    'event' => $historicalCatalogues['event'],
    'contracts' => $huntingContracts,
    'basic' => $basicQuests,
    'pvp' => $pvpQuests,
    'havok' => $havokQuests,
    'weekly' => $weeklyMissions,
], [
    'section' => $section,
    'filter' => $_GET['mc_filter'] ?? 'all',
    'states' => $_GET['mc_states'] ?? null,
    'selectedKey' => $_GET['mc_selected'] ?? ($_POST['mc_selected'] ?? ''),
    'activeCount' => $activeQuestCount,
    'maxActiveCount' => $maxActiveQuestCount,
    'company' => $mcCompany,
    'minimumLevels' => $mcMinimumLevels,
    'weeklyMeta' => $weeklyMeta,
    'csrfToken' => $questToken,
    'notice' => $questNotice,
    'lifecycleNotice' => $questLifecycleNotice,
    'playerId' => $playerId,
    'runtimeReasonLabels' => HistoricalQuestLabels::runtimeReasons(),
    'error' => $questError,
    'weeklyError' => $weeklyError,
    'historicalMode' => $historicalActive,
    'historicalMeta' => $historicalMeta,
]);

include __DIR__ . '/questSections/mission_control.php';
