<?php
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');

if (!isset($_SESSION['terms_of_use']) || $_SESSION['terms_of_use'] !== true || !isset($_SESSION['loggedIn']) || $_SESSION['loggedIn'] !== true || (int)($_SESSION['player_id'] ?? 0) <= 0) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated.',
    ]);
    exit();
}

require_once __DIR__ . '/../../libs/Database.php';
require_once __DIR__ . '/../../libs/HomeLeaderboardService.php';
require_once __DIR__ . '/../../libs/HallOfFameService.php';
require_once __DIR__ . '/../../config/database.php';

function homeApiDecodeLegacyHtmlEntitiesForDisplay($value)
{
    $decoded = html_entity_decode((string)$value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return preg_replace('/[\x00-\x1F\x7F]/u', '', $decoded);
}

function homeApiHallOfFamePayload(array $payload): array
{
    $textFields = ['username', 'clan_tag', 'clan_name', 'name', 'title_key', 'label', 'scope', 'holder_type', 'holder_name', 'expires_at'];
    $intFields = ['position', 'player_id', 'clanid', 'factionid', 'grade', 'members', 'holder_player_id', 'holder_npc_id', 'holder_map_id'];
    $numericFields = ['score', 'total_experience', 'experience', 'honor', 'ships_destroyed'];
    $rows = [];
    foreach ($payload['rows'] as $row) {
        $clean = [];
        foreach ($textFields as $field) {
            if (array_key_exists($field, $row)) {
                $clean[$field] = $row[$field] === null ? null : homeApiDecodeLegacyHtmlEntitiesForDisplay($row[$field]);
            }
        }
        foreach ($intFields as $field) {
            if (array_key_exists($field, $row)) {
                $clean[$field] = $row[$field] === null ? null : (int)$row[$field];
            }
        }
        foreach ($numericFields as $field) {
            if (array_key_exists($field, $row)) {
                // Decimal text keeps the Top User sort score exact across JSON.
                $clean[$field] = $row[$field] === null ? null : (string)$row[$field];
            }
        }
        $rows[] = $clean;
    }
    $payload['rows'] = $rows;
    if (isset($payload['meta']['player'])) {
        $player = $payload['meta']['player'];
        foreach (['username', 'clan_tag'] as $field) {
            if (isset($player[$field])) {
                $player[$field] = homeApiDecodeLegacyHtmlEntitiesForDisplay($player[$field]);
            }
        }
        foreach (['player_id', 'grade', 'factionid', 'level'] as $field) {
            if (isset($player[$field])) {
                $player[$field] = (int)$player[$field];
            }
        }
        $payload['meta']['player'] = $player;
    }
    return $payload;
}

function homeApiQueryText(string $key): string
{
    if (!isset($_GET[$key])) {
        return '';
    }
    if (!is_scalar($_GET[$key])) {
        throw new InvalidArgumentException('Invalid ranking parameter.');
    }
    return (string)$_GET[$key];
}

try {
    $category = homeApiQueryText('category');
    if ($category === '') {
        $category = 'top_user';
    }
    $faction = 0;
    $limit = 100;
    $metric = homeApiQueryText('metric');
    if ($category !== '') {
        if (!in_array($category, HallOfFameService::CATEGORIES, true)) {
            throw new InvalidArgumentException('Unknown Hall of Fame category.');
        }
        if (isset($_GET['faction'])) {
            $parsedFaction = filter_var($_GET['faction'], FILTER_VALIDATE_INT);
            if ($parsedFaction === false || $parsedFaction < 0 || $parsedFaction > 3) {
                throw new InvalidArgumentException('Unknown company filter.');
            }
            $faction = (int)$parsedFaction;
        }
        if (isset($_GET['limit'])) {
            $parsedLimit = filter_var($_GET['limit'], FILTER_VALIDATE_INT);
            if ($parsedLimit === false) {
                throw new InvalidArgumentException('Invalid ranking limit.');
            }
            $limit = max(1, min(100, (int)$parsedLimit));
        }
        if ($category === 'companies' && !in_array($metric, ['', 'experience'], true)) {
            throw new InvalidArgumentException('Unknown company metric.');
        }
    }
    $playerId = (int)($_SESSION['player_id'] ?? 0);
    session_write_close();
    $db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);
    $payload = homeApiHallOfFamePayload(HallOfFameService::getCategory($db, $category, $limit, $faction, $playerId, $metric));
    echo json_encode(['success' => true, 'generatedAt' => time()] + $payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to load top 100 right now.',
    ]);
}
