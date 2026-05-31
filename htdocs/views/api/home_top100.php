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

require_once __DIR__ . '/../../libs/Database.php';
require_once __DIR__ . '/../../libs/HomeLeaderboardService.php';
require_once __DIR__ . '/../../config/database.php';

function homeApiDecodeLegacyHtmlEntitiesForDisplay($value)
{
    $decoded = html_entity_decode((string)$value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return preg_replace('/[\x00-\x1F\x7F]/u', '', $decoded);
}

function homeApiPlayerRows(array $rows, $scoreKey)
{
    $out = [];

    foreach ($rows as $row) {
        $out[] = [
            'username' => homeApiDecodeLegacyHtmlEntitiesForDisplay($row['username'] ?? ''),
            'factionid' => (int)($row['factionid'] ?? 0),
            'grade' => (int)($row['grade'] ?? 0),
            $scoreKey => (int)($row[$scoreKey] ?? 0),
        ];
    }

    return $out;
}

function homeApiClanRows(array $rows)
{
    $out = [];

    foreach ($rows as $row) {
        $out[] = [
            'clan_tag' => homeApiDecodeLegacyHtmlEntitiesForDisplay($row['clan_tag'] ?? ''),
            'clan_name' => homeApiDecodeLegacyHtmlEntitiesForDisplay($row['clan_name'] ?? ''),
            'total_experience' => (int)($row['total_experience'] ?? 0),
        ];
    }

    return $out;
}

try {
    $db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);
    $leaderboards = HomeLeaderboardService::getLeaderboards($db, 100);

    echo json_encode([
        'success' => true,
        'generatedAt' => time(),
        'leaderboards' => [
            'rankpoints' => homeApiPlayerRows($leaderboards['rankpoints'] ?? [], 'rankpoints'),
            'experience' => homeApiPlayerRows($leaderboards['experience'] ?? [], 'experience'),
            'honor' => homeApiPlayerRows($leaderboards['honor'] ?? [], 'honor'),
            'clans' => homeApiClanRows($leaderboards['clans'] ?? []),
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to load top 100 right now.',
    ]);
}
