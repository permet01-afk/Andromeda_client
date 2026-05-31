<?php
session_start();

try {
    $db = new PDO(
        'mysql:host=127.0.0.1;dbname=andromeda;charset=utf8mb4',
        'root',
        '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'db_connection_failed',
        'message' => $e->getMessage()
    ]);
    exit;
}

if (!isset($_SESSION['player_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}



session_write_close();
