<?php
declare(strict_types=1);

ob_start();
ini_set('display_errors', '0');
error_reporting(E_ALL);

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }

    throw new ErrorException($message, 0, $severity, $file, $line);
});

function skylab_api_json(array $payload, int $status = 200): void
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    session_start();

    if (empty($_SESSION['loggedIn']) || empty($_SESSION['player_id'])) {
        skylab_api_json(['success' => false, 'message' => 'Authentication required.'], 401);
    }

    require_once __DIR__ . '/../../libs/Database.php';
    require_once __DIR__ . '/../../libs/SkylabService.php';

    $config = require __DIR__ . '/../../config/database.php';
    $db = new Database($config['host'], $config['dbname'], $config['username'], $config['password']);
    $service = new SkylabService($db, (int)$_SESSION['player_id']);
    $action = (string)($_POST['action'] ?? $_GET['action'] ?? 'load');

    if ($action !== 'load') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            skylab_api_json(['success' => false, 'message' => 'Invalid request method.'], 405);
        }

        $sessionToken = (string)($_SESSION['skylab_csrf_token'] ?? '');
        $postedToken = (string)($_POST['csrf_token'] ?? '');

        if ($sessionToken === '' || !hash_equals($sessionToken, $postedToken)) {
            skylab_api_json(['success' => false, 'message' => 'Invalid security token.'], 403);
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
            skylab_api_json(['success' => false, 'message' => 'Unknown Skylab action.'], 400);
    }

    skylab_api_json(['success' => true, 'state' => $state]);
} catch (Throwable $e) {
    error_log('[Skylab API] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

    $message = $e instanceof RuntimeException ? $e->getMessage() : 'Skylab request failed.';
    skylab_api_json(['success' => false, 'message' => $message], 400);
}
