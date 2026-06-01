<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function quest_api_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!isset($_SESSION['terms_of_use']) || $_SESSION['terms_of_use'] != true || !isset($_SESSION['loggedIn']) || $_SESSION['loggedIn'] != true) {
    quest_api_response(['ok' => false, 'error' => 'Not authenticated.'], 403);
}

$playerId = (int)($_SESSION['player_id'] ?? 0);
if ($playerId <= 0) {
    quest_api_response(['ok' => false, 'error' => 'Missing player session.'], 403);
}

if (empty($_SESSION['quest_csrf_token'])) {
    try {
        $_SESSION['quest_csrf_token'] = bin2hex(random_bytes(32));
    } catch (Exception $e) {
        $_SESSION['quest_csrf_token'] = sha1(uniqid('', true));
    }
}
$csrfToken = (string)$_SESSION['quest_csrf_token'];

require_once __DIR__ . '/../../libs/Database.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../libs/QuestService.php';
require_once __DIR__ . '/../../libs/WeeklyMissionService.php';

try {
    $db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);
    $questService = new QuestService($db, $playerId);
    $weeklyMissionService = new WeeklyMissionService($db, $playerId);
} catch (Exception $e) {
    quest_api_response(['ok' => false, 'error' => 'Quest service unavailable: ' . $e->getMessage()], 500);
}

function quest_api_payload(QuestService $questService, WeeklyMissionService $weeklyMissionService, string $csrfToken, string $message = '', bool $includeCatalog = false, bool $includePlayerState = false): array
{
    if ($includeCatalog) {
        $questService->preparePage();
    }

    $activeQuests = $questService->getActiveTrackerQuests();
    try {
        $weeklyState = $weeklyMissionService->getWeeklyState();
    } catch (Exception $e) {
        $weeklyState = [
            'meta' => $weeklyMissionService->getWeeklyMeta(),
            'missions' => [],
            'error' => 'Weekly Missions SQL is not installed yet.',
        ];
    }

    $payload = [
        'ok' => true,
        'message' => $message,
        'csrfToken' => $csrfToken,
        'activeCount' => $questService->getActiveQuestCount(),
        'maxActive' => $questService->getMaxActiveQuestCount(),
        'activeQuests' => $activeQuests,
        'weekly' => $weeklyState,
    ];

    if ($includeCatalog) {
        $payload['quests'] = [
            'basic' => $questService->getBasicQuests(),
            'pvp' => $questService->getPvpQuests(),
            'havok' => $questService->getHavokQuests(),
        ];
    }

    if ($includePlayerState) {
        $payload['playerState'] = $questService->getRewardSyncState();
    }

    return $payload;
}

$action = (string)($_GET['action'] ?? $_POST['action'] ?? 'list');

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $postedToken = (string)($_POST['csrf_token'] ?? '');
        if ($csrfToken === '' || !hash_equals($csrfToken, $postedToken)) {
            throw new Exception('Security token expired. Please reopen the quest window and try again.');
        }
    }

    if ($action === 'list') {
        quest_api_response(quest_api_payload($questService, $weeklyMissionService, $csrfToken, '', true));
    }

    if ($action === 'list_active') {
        quest_api_response(quest_api_payload($questService, $weeklyMissionService, $csrfToken));
    }

    if ($action === 'accept') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            throw new Exception('Invalid request method.');
        }
        $code = trim((string)($_POST['quest_code'] ?? ''));
        $group = strtolower(trim((string)($_POST['quest_group'] ?? 'basic')));
        if ($code === '') {
            throw new Exception('Missing quest code.');
        }
        if ($group === 'pvp') {
            $message = $questService->acceptPvpQuest($code);
        } elseif ($group === 'havok') {
            $message = $questService->acceptHavokQuest($code);
        } elseif ($group === 'weekly') {
            throw new Exception('Weekly Missions are activated automatically.');
        } else {
            $message = $questService->acceptBasicQuest($code);
        }
        quest_api_response(quest_api_payload($questService, $weeklyMissionService, $csrfToken, $message));
    }

    if ($action === 'claim') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            throw new Exception('Invalid request method.');
        }
        $code = trim((string)($_POST['quest_code'] ?? ''));
        $group = strtolower(trim((string)($_POST['quest_group'] ?? 'basic')));
        if ($code === '') {
            throw new Exception('Missing quest code.');
        }
        if ($group === 'pvp') {
            $message = $questService->claimPvpQuest($code);
        } elseif ($group === 'havok') {
            $message = $questService->claimHavokQuest($code);
        } elseif ($group === 'weekly') {
            $message = $weeklyMissionService->claimWeeklyMission($code);
        } else {
            $message = $questService->claimBasicQuest($code);
        }
        quest_api_response(quest_api_payload($questService, $weeklyMissionService, $csrfToken, $message, false, true));
    }

    if ($action === 'abort') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            throw new Exception('Invalid request method.');
        }
        $code = trim((string)($_POST['quest_code'] ?? ''));
        $group = strtolower(trim((string)($_POST['quest_group'] ?? 'basic')));
        if ($code === '') {
            throw new Exception('Missing quest code.');
        }
        if ($group === 'pvp') {
            $message = $questService->abortPvpQuest($code);
        } elseif ($group === 'havok') {
            $message = $questService->abortHavokQuest($code);
        } elseif ($group === 'weekly') {
            throw new Exception('Weekly Missions cannot be aborted.');
        } else {
            $message = $questService->abortBasicQuest($code);
        }
        quest_api_response(quest_api_payload($questService, $weeklyMissionService, $csrfToken, $message));
    }

    throw new Exception('Unknown action.');
} catch (Exception $e) {
    quest_api_response([
        'ok' => false,
        'error' => $e->getMessage(),
        'csrfToken' => $csrfToken,
    ], 400);
}
