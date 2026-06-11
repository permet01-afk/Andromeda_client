<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['terms_of_use']) || $_SESSION['terms_of_use'] !== true || !isset($_SESSION['loggedIn']) || $_SESSION['loggedIn'] !== true) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated.',
    ]);
    exit();
}

$playerId = (int)($_SESSION['player_id'] ?? 0);
if ($playerId <= 0) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid player session.',
    ]);
    exit();
}

require_once __DIR__ . '/../../libs/Database.php';
require_once __DIR__ . '/../../libs/DailyLoginBonusService.php';
require_once __DIR__ . '/../../config/database.php';

try {
    $db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);
    $service = new DailyLoginBonusService($db, $playerId);
    $action = (string)($_POST['action'] ?? $_GET['action'] ?? 'state');

    if ($action === 'claim') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Invalid request method.',
            ]);
            exit();
        }

        $sessionToken = (string)($_SESSION['daily_login_csrf_token'] ?? '');
        $postedToken = (string)($_POST['csrf_token'] ?? '');
        if ($sessionToken === '' || $postedToken === '' || !hash_equals($sessionToken, $postedToken)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Invalid security token.',
            ]);
            exit();
        }

        $state = $service->claim();
        echo json_encode([
            'success' => true,
            'message' => $state['claim_message'],
            'state' => $state,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit();
    }

    echo json_encode([
        'success' => true,
        'state' => $service->getState(),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage() !== '' ? $e->getMessage() : 'Unable to process Daily Login Bonus right now.',
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to process Daily Login Bonus right now.',
    ]);
}
