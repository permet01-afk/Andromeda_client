<?php
/** Explicit local maintenance entry point. Quest rules remain in QuestService. */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
ini_set('display_errors', '0');
if (count($argv) === 2 && $argv[1] === '--help') {
    echo "Historical QuestService maintenance (dry-run by default)\n"
        . "--action=inspect|install|activate|restore --expect-db=DATABASE --expect-port=PORT\n"
        . "--expect-catalogue-sha256=SHA256 [--snapshot-id=ARCHIVE]\n"
        . "Writes require --execute --maintenance-confirmed --receipt-dir=ABSOLUTE_DIRECTORY_OUTSIDE_HTDOCS\n"
        . "Stop the emulator and HTTP quest mutations and verify a full backup first.\n";
    exit;
}

function maintenanceOptions(array $args): array
{
    $allowed = ['action','expect-db','expect-port','expect-catalogue-sha256','snapshot-id','receipt-dir','execute','maintenance-confirmed'];
    $out = [];
    foreach (array_slice($args, 1) as $arg) {
        if (!preg_match('/^--([a-z][a-z0-9-]*)(?:=(.*))?$/D', $arg, $m) || !in_array($m[1], $allowed, true) || isset($out[$m[1]])) {
            throw new RuntimeException('Unknown, malformed or duplicate maintenance option.');
        }
        $out[$m[1]] = $m[2] ?? true;
    }
    $out['action'] = $out['action'] ?? 'inspect';
    if (!in_array($out['action'], ['inspect','install','activate','restore'], true)) throw new RuntimeException('Unknown maintenance action.');
    if (!preg_match('/^[A-Za-z0-9_]+$/D', (string)($out['expect-db'] ?? ''))
        || !preg_match('/^[0-9]{1,5}$/D', (string)($out['expect-port'] ?? ''))
        || (int)$out['expect-port'] < 1 || (int)$out['expect-port'] > 65535
        || !preg_match('/^[a-f0-9]{64}$/D', (string)($out['expect-catalogue-sha256'] ?? ''))) {
        throw new RuntimeException('Expected database, port and exact catalogue SHA-256 are mandatory.');
    }
    foreach (['execute','maintenance-confirmed'] as $flag) if (isset($out[$flag]) && $out[$flag] !== true) throw new RuntimeException('Confirmation flags do not accept values.');
    if ($out['action'] === 'restore' && !preg_match('/^[a-f0-9]{32}$/D', (string)($out['snapshot-id'] ?? ''))) throw new RuntimeException('Restore requires an explicit archive snapshot identifier.');
    return $out;
}

function maintenanceFeature(PDO $db): ?array
{
    $q = $db->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='site_quest_features'");
    if ((int)$q->fetchColumn() === 0) return null;
    $r = $db->query("SELECT enabled,catalogue_sha256,snapshot_id FROM site_quest_features WHERE feature_key='historical_catalog'")->fetch(PDO::FETCH_ASSOC);
    return $r ?: null;
}

function maintenanceReceipt(string $dir, array $value): string
{
    $path = $dir . DIRECTORY_SEPARATOR . 'historical-maintenance-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '.json';
    $handle = fopen($path, 'x');
    if ($handle === false) throw new RuntimeException('Cannot create a new maintenance receipt.');
    try {
        $encoded = json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
        $offset = 0; $length = strlen($encoded);
        while ($offset < $length) {
            $written = fwrite($handle, substr($encoded, $offset));
            if ($written === false || $written === 0) throw new RuntimeException('Cannot write a complete maintenance receipt.');
            $offset += $written;
        }
        if (!fflush($handle)) throw new RuntimeException('Cannot flush the complete maintenance receipt.');
    } finally { fclose($handle); }
    return $path;
}

/** Refuse a restore that would overwrite legacy progress changed after activation. */
function maintenanceArchiveDisposition(PDO $db, string $snapshot): array
{
    $q = $db->prepare('SELECT row_kind,row_key,row_json,sha256 FROM site_quest_legacy_archive WHERE snapshot_id=?');
    $q->execute([$snapshot]); $archive = $q->fetchAll(PDO::FETCH_ASSOC);
    if (!$archive) throw new RuntimeException('Archive snapshot not found.');
    $original = $activated = []; $ids = [];
    foreach ($archive as $stored) {
        $table = $stored['row_kind'];
        if (!in_array($table, ['site_quests','site_quest_objectives','site_player_quests','site_player_quest_objective_progress'], true)
            || !hash_equals($stored['sha256'], hash('sha256', $stored['row_json']))) throw new RuntimeException('Archive integrity check failed.');
        $r = json_decode($stored['row_json'], true, 512, JSON_THROW_ON_ERROR);
        $original[$table][$stored['row_key']] = $r; $activated[$table][$stored['row_key']] = $r;
        if ($table === 'site_quests') { $ids[] = (int)$r['id']; $activated[$table][$stored['row_key']]['enabled'] = 0; }
        if ($table === 'site_player_quests' && $r['status'] === 'in_progress') $activated[$table][$stored['row_key']]['status'] = 'archived';
    }
    if (!$ids) throw new RuntimeException('Archive contains no legacy definitions.');
    $normalize = static function(array $row, string $table): array {
        if ($table === 'site_quests') unset($row['updated_at']);
        foreach ($row as &$v) if ($v !== null) $v = (string)$v;
        unset($v); ksort($row); return $row;
    };
    $oldMatches = $activeMatches = true; $counts = [];
    foreach (['site_quests','site_quest_objectives','site_player_quests','site_player_quest_objective_progress'] as $table) {
        $where = $table === 'site_quests' ? 'id' : 'quest_id';
        $rows = $db->query('SELECT * FROM `' . $table . '` WHERE `' . $where . '` IN (' . implode(',', $ids) . ')')->fetchAll(PDO::FETCH_ASSOC);
        $current = [];
        foreach ($rows as $row) {
            $key = isset($row['id']) ? (string)$row['id'] : implode(':', [$row['player_id'],$row['quest_id'],$row['objective_type'],$row['target_key']]);
            $current[$key] = $normalize($row, $table);
        }
        $old = $live = [];
        foreach ($original[$table] ?? [] as $k => $r) $old[$k] = $normalize($r, $table);
        foreach ($activated[$table] ?? [] as $k => $r) $live[$k] = $normalize($r, $table);
        ksort($current); ksort($old); ksort($live);
        $oldMatches = $oldMatches && $current === $old;
        $activeMatches = $activeMatches && $current === $live;
        $counts[$table] = count($rows);
    }
    if (!$oldMatches && !$activeMatches) throw new RuntimeException('Legacy rows changed since the archive; restore refused to preserve later progress.');
    return ['already_restored' => $oldMatches, 'activation_rows_unchanged' => $activeMatches, 'counts' => $counts];
}

$db = null; $locked = false;
try {
    $o = maintenanceOptions($argv);
    $webRoot = realpath(dirname(__DIR__));
    if (!$webRoot) throw new RuntimeException('Application root missing.');
    require $webRoot . '/config/database.php';
    if (DB_TYPE !== 'mysql' || !preg_match('/^([A-Za-z0-9_.:-]+)(?:;port=([0-9]+))?$/D', DB_HOST, $host)) throw new RuntimeException('Unsupported configured SQL endpoint.');
    $port = isset($host[2]) ? (int)$host[2] : (defined('DB_PORT') ? (int)DB_PORT : 3306);
    if (DB_NAME !== $o['expect-db'] || $port !== (int)$o['expect-port']) throw new RuntimeException('Configured SQL endpoint differs from the explicit expectation.');
    $catalogueFile = $webRoot . '/data/historical-quests.json';
    $sha = hash_file('sha256', $catalogueFile);
    $meta = json_decode((string)file_get_contents($webRoot . '/data/historical-quests.meta.json'), true, 512, JSON_THROW_ON_ERROR);
    $catalogue = json_decode((string)file_get_contents($catalogueFile), true, 512, JSON_THROW_ON_ERROR);
    if (!hash_equals($o['expect-catalogue-sha256'], $sha) || !hash_equals((string)$meta['catalogue_sha256'], $sha)
        || count($catalogue['quests']) !== $meta['catalogue_count'] || count($catalogue['quests']) !== $catalogue['logical_missions']) throw new RuntimeException('Catalogue file or metadata differs from the explicit SHA-256 expectation.');
    $db = new PDO('mysql:host=' . $host[1] . ';port=' . $port . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::MYSQL_ATTR_MULTI_STATEMENTS=>false]);
    $db->exec('SET SESSION TRANSACTION READ ONLY'); $db->beginTransaction();
    $identity = $db->query('SELECT @@port AS port,DATABASE() AS db,VERSION() AS version')->fetch();
    if ((int)$identity['port'] !== (int)$o['expect-port'] || $identity['db'] !== $o['expect-db']) throw new RuntimeException('Actual SQL endpoint differs from the explicit expectation.');
    $feature = maintenanceFeature($db);
    $summary = ['action'=>$o['action'], 'database'=>$identity['db'], 'port'=>(int)$identity['port'], 'server_version'=>$identity['version'],
        'catalogue_sha256'=>$sha, 'logical_missions'=>count($catalogue['quests']), 'enabled_definitions'=>count(array_filter($catalogue['quests'], static fn($q)=>$q['enabled'])),
        'feature'=>$feature, 'online_accounts'=>(int)$db->query('SELECT COUNT(*) FROM users WHERE online<>0')->fetchColumn(),
        'plan'=>['install'=>'Idempotent schema check and exact catalogue upsert through QuestService; first installation remains disabled.',
            'activate'=>'Archive verified legacy Basic/PvP definitions and attempts, then activate historical definitions transactionally.',
            'restore'=>'Restore verified legacy rows through QuestService; keep historical progress, receipts and all account rewards.']];
    $db->rollBack();
    if (!isset($o['execute']) || $o['action'] === 'inspect') {
        echo json_encode(['status'=>'DRY_RUN_READ_ONLY', 'SQL_mutations'=>0, 'inspection'=>$summary], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n"; exit;
    }
    if (!isset($o['maintenance-confirmed'])) throw new RuntimeException('Stop the emulator and HTTP quest mutations, then supply --maintenance-confirmed.');
    if ($summary['online_accounts'] !== 0) throw new RuntimeException('Online gameplay accounts remain; maintenance refused.');
    $receiptArgument = $o['receipt-dir'] ?? null;
    if (!is_string($receiptArgument) || trim($receiptArgument) === ''
        || !preg_match('~^(?:[A-Za-z]:[\\\\/]|/(?!/))~', $receiptArgument)) {
        throw new RuntimeException('An explicit absolute local receipt directory outside htdocs is mandatory.');
    }
    $dir = realpath($receiptArgument);
    $norm = static fn(string $p): string => strtolower(str_replace('\\','/',rtrim($p,'/\\')));
    if (!$dir || !is_writable($dir) || $norm($dir) === $norm($webRoot) || str_starts_with($norm($dir), $norm($webRoot) . '/')) throw new RuntimeException('A writable receipt directory outside htdocs is mandatory.');
    $db->exec('SET SESSION TRANSACTION READ WRITE');
    $locked = (int)$db->query("SELECT GET_LOCK('andromeda.historical.maintenance',0)")->fetchColumn() === 1;
    if (!$locked) throw new RuntimeException('Another catalogue maintenance operation holds the lock.');
    if ((int)$db->query('SELECT COUNT(*) FROM users WHERE online<>0')->fetchColumn() !== 0) throw new RuntimeException('A gameplay account connected during preflight; maintenance refused.');
    $beforeReceipt = maintenanceReceipt($dir, ['status'=>'PREFLIGHT_CONFIRMED','utc'=>gmdate('c'),'inspection'=>$summary,'emulator_and_HTTP_mutations_stopped_confirmed'=>true]);
    require_once $webRoot . '/libs/QuestService.php'; $service = new QuestService($db, 0);
    if ($o['action'] === 'install') $result = $service->installHistoricalCatalog();
    elseif ($o['action'] === 'activate') {
        $current = maintenanceFeature($db);
        if ($current && (int)$current['enabled'] === 1) {
            if (!hash_equals((string)$current['catalogue_sha256'], $sha)) throw new RuntimeException('Active catalogue differs; install the approved definitions in maintenance first.');
            $result = ['already_active'=>true,'snapshot_id'=>$current['snapshot_id'],'SQL_mutations'=>0];
        } else $result = $service->activateHistoricalCatalog();
    } else {
        $current = maintenanceFeature($db);
        if (!$current || (string)$current['snapshot_id'] !== $o['snapshot-id']) throw new RuntimeException('Snapshot does not match the current feature archive.');
        $disposition = maintenanceArchiveDisposition($db, $o['snapshot-id']);
        if ((int)$current['enabled'] === 0 && $disposition['already_restored']) $result = ['already_restored'=>true,'snapshot_id'=>$o['snapshot-id'],'SQL_mutations'=>0];
        else $result = $service->restoreHistoricalLegacyArchive($o['snapshot-id']);
    }
    $receipt = maintenanceReceipt($dir, ['status'=>'MAINTENANCE_COMPLETED','utc'=>gmdate('c'),'action'=>$o['action'],'catalogue_sha256'=>$sha,'result'=>$result,'preflight_receipt'=>$beforeReceipt]);
    echo json_encode(['status'=>'MAINTENANCE_COMPLETED','action'=>$o['action'],'result'=>$result,'receipt'=>$receipt], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
} catch (Throwable $e) {
    if ($db instanceof PDO && $db->inTransaction()) $db->rollBack();
    $reason = $e instanceof PDOException ? 'SQL operation failed; SQLSTATE ' . $e->getCode() . '. Check the local server without disclosing credentials.' : $e->getMessage();
    fwrite(STDERR, json_encode(['status'=>'REFUSED_OR_FAILED','reason'=>$reason], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n"); exit(1);
} finally {
    if ($locked && $db instanceof PDO) $db->query("SELECT RELEASE_LOCK('andromeda.historical.maintenance')");
}
