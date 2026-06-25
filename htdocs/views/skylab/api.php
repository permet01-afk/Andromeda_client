<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['loggedIn']) || empty($_SESSION['player_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required.']);
    exit;
}

require_once __DIR__ . '/../../libs/Database.php';
require_once __DIR__ . '/../../libs/SkylabService.php';

$config = require __DIR__ . '/../../config/database.php';
$db = new Database($config['host'], $config['dbname'], $config['username'], $config['password']);
$service = new SkylabService($db, (int)$_SESSION['player_id']);
$action = (string)($_POST['action'] ?? $_GET['action'] ?? 'load');

try {
    if ($action !== 'load') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
            exit;
        }

        $sessionToken = (string)($_SESSION['skylab_csrf_token'] ?? '');
        $postedToken = (string)($_POST['csrf_token'] ?? '');

        if ($sessionToken === '' || !hash_equals($sessionToken, $postedToken)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Invalid security token.']);
            exit;
        }
    }

    switch ($action) {
        case 'load':
            $state = $service->getState();
            break;

        case 'toggle_module':
            $state = $service->toggleModule((string)($_POST['module_key'] ?? ''));
            break;

        case 'start_upgrade':
            $state = $service->startUpgrade((string)($_POST['module_key'] ?? ''));
            break;

        case 'start_transport':
            $state = $service->startTransport((string)($_POST['resource_key'] ?? ''), (int)($_POST['amount'] ?? 0));
            break;

        case 'collect_transport':
            $state = $service->collectTransport((int)($_POST['transport_id'] ?? 0));
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Unknown Skylab action.']);
            exit;
    }

    echo json_encode(['success' => true, 'state' => $state], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
