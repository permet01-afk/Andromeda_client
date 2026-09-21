<?php
declare(strict_types=1);
ob_start();
ini_set('display_errors', '0');
error_reporting(E_ALL);
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) { return false; }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    session_start();
    $context = array_intersect_key($_SESSION, array_flip(['loggedIn','terms_of_use','player_id','skylab_csrf_token']));
    session_write_close();
    require_once __DIR__ . '/../../libs/TechFactoryHttp.php';
    [$status,$payload] = TechFactoryHttp::handle($_SERVER['REQUEST_METHOD'] ?? '', $_GET, $_POST, $context,
        static function (int $playerId): TechFactoryService {
            require_once __DIR__ . '/../../config/database.php';
            if (DB_TYPE !== 'mysql') { throw new RuntimeException('Unsupported database driver.'); }
            // PDO throws instead of the legacy Database class echoing connection errors.
            $db = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS,
                [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES=>false]);
            return new TechFactoryService($db, $playerId);
        });
} catch (Throwable $error) {
    error_log('[Tech Factory endpoint] ' . $error->getMessage());
    $status = 500;
    $payload = ['success'=>false,'message'=>'Tech Factory is temporarily unavailable. Please try again.'];
}
while (ob_get_level() > 0) { ob_end_clean(); }
http_response_code($status);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if ($status === 405) { header('Allow: GET, POST'); }
echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
