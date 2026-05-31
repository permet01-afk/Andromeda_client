<?php
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "This script must be run from the command line." . PHP_EOL;
    exit(1);
}

require_once __DIR__ . '/../libs/Database.php';
require_once __DIR__ . '/../config/database.php';

date_default_timezone_set('Europe/Zurich');

function out(string $message): void
{
    echo '[' . date('Y-m-d H:i:s') . '] ' . $message . PHP_EOL;
}

function writeClanLog(PDO $db, int $clanId, string $actionType, array $details): void
{
    try {
        $stmt = $db->prepare("INSERT INTO clan_log (clan_id, actor_user_id, action_type, details) VALUES (:clan_id, NULL, :action_type, :details)");
        $stmt->execute([
            ':clan_id' => $clanId,
            ':action_type' => $actionType,
            ':details' => json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    } catch (Throwable $e) {
        out("Clan #{$clanId}: could not write clan log entry: " . $e->getMessage());
    }
}

function hasRunToday($lastRunDate, string $today): bool
{
    if ($lastRunDate === null || $lastRunDate === '') {
        return false;
    }

    return substr((string)$lastRunDate, 0, 10) === $today;
}

function processClanTax(PDO $db, int $clanId, string $today): array
{
    $result = [
        'status' => 'skipped',
        'charged_count' => 0,
        'total_amount' => 0,
        'rate_bps' => 0,
    ];

    try {
        $db->beginTransaction();

        $settingsStmt = $db->prepare("SELECT active, rate_bps, last_run_date FROM clan_tax_settings WHERE clan_id = :clan_id LIMIT 1 FOR UPDATE");
        $settingsStmt->execute([':clan_id' => $clanId]);
        $settings = $settingsStmt->fetch(PDO::FETCH_ASSOC);

        if (!$settings) {
            $db->rollBack();
            $result['status'] = 'missing_settings';
            return $result;
        }

        $active = (int)$settings['active'] === 1;
        $rateBps = (int)$settings['rate_bps'];
        $result['rate_bps'] = $rateBps;

        if (!$active) {
            $db->rollBack();
            $result['status'] = 'inactive';
            return $result;
        }

        if ($rateBps < 100 || $rateBps > 500) {
            $db->rollBack();
            $result['status'] = 'invalid_rate';
            return $result;
        }

        if (hasRunToday($settings['last_run_date'] ?? null, $today)) {
            $db->rollBack();
            $result['status'] = 'already_processed';
            return $result;
        }

        $db->prepare("INSERT IGNORE INTO clan_wallet (clan_id, balance) VALUES (:clan_id, 0)")
           ->execute([':clan_id' => $clanId]);

        $membersStmt = $db->prepare("SELECT id, credits FROM users WHERE clanid = :clan_id FOR UPDATE");
        $membersStmt->execute([':clan_id' => $clanId]);
        $members = $membersStmt->fetchAll(PDO::FETCH_ASSOC);

        $taxRows = [];
        foreach ($members as $member) {
            $credits = (int)$member['credits'];
            if ($credits <= 0) {
                continue;
            }

            $tax = intdiv($credits * $rateBps, 10000);
            if ($tax <= 0) {
                continue;
            }

            $taxRows[] = [
                'user_id' => (int)$member['id'],
                'tax' => $tax,
            ];
        }

        $debitedTotal = 0;
        $debitedCount = 0;

        if (!empty($taxRows)) {
            $debitStmt = $db->prepare("UPDATE users SET credits = credits - :tax WHERE id = :user_id AND clanid = :clan_id AND credits >= :tax");

            foreach ($taxRows as $row) {
                $debitStmt->execute([
                    ':tax' => $row['tax'],
                    ':user_id' => $row['user_id'],
                    ':clan_id' => $clanId,
                ]);

                if ($debitStmt->rowCount() === 1) {
                    $debitedTotal += $row['tax'];
                    $debitedCount++;
                }
            }
        }

        if ($debitedTotal > 0) {
            $walletStmt = $db->prepare("UPDATE clan_wallet SET balance = balance + :amount WHERE clan_id = :clan_id");
            $walletStmt->execute([
                ':amount' => $debitedTotal,
                ':clan_id' => $clanId,
            ]);
        }

        $db->prepare("UPDATE clan_tax_settings SET last_run_date = :today WHERE clan_id = :clan_id")
           ->execute([
               ':today' => $today,
               ':clan_id' => $clanId,
           ]);

        writeClanLog($db, $clanId, 'tax_run', [
            'processed_date' => $today,
            'charged_count' => $debitedCount,
            'total_amount' => $debitedTotal,
            'rate_bps' => $rateBps,
        ]);

        $db->commit();

        $result['status'] = 'processed';
        $result['charged_count'] = $debitedCount;
        $result['total_amount'] = $debitedTotal;
        return $result;
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }

        writeClanLog($db, $clanId, 'tax_run_error', [
            'processed_date' => $today,
            'error' => $e->getMessage(),
        ]);

        $result['status'] = 'error';
        $result['error'] = $e->getMessage();
        return $result;
    }
}

$db = null;
$lockAcquired = false;
$exitCode = 0;
$today = date('Y-m-d');

try {
    $db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    out("Starting daily clan tax run for {$today}.");

    $lockStmt = $db->query("SELECT GET_LOCK('andromeda_clan_tax_daily_lock', 10)");
    $lockAcquired = ((int)$lockStmt->fetchColumn() === 1);

    if (!$lockAcquired) {
        out('Another clan tax runner is already executing. Exiting.');
        exit(1);
    }

    $clansStmt = $db->prepare("
        SELECT c.id AS clan_id, c.clan_tag, c.clan_name
        FROM clan_tax_settings t
        JOIN clan c ON c.id = t.clan_id
        WHERE t.active = 1
        ORDER BY c.id ASC
    ");
    $clansStmt->execute();
    $clans = $clansStmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$clans) {
        out('No clan with active daily tax. Nothing to do.');
    }

    $processedClans = 0;
    $skippedClans = 0;
    $errorClans = 0;
    $totalMembers = 0;
    $totalAmount = 0;

    foreach ($clans as $clan) {
        $clanId = (int)$clan['clan_id'];
        $clanLabel = '[' . ($clan['clan_tag'] ?? '') . '] ' . ($clan['clan_name'] ?? ('Clan #' . $clanId));
        $result = processClanTax($db, $clanId, $today);

        if ($result['status'] === 'processed') {
            $processedClans++;
            $totalMembers += (int)$result['charged_count'];
            $totalAmount += (int)$result['total_amount'];
            out("Clan #{$clanId} {$clanLabel}: processed, members charged={$result['charged_count']}, total={$result['total_amount']}, rate_bps={$result['rate_bps']}.");
        } elseif ($result['status'] === 'error') {
            $errorClans++;
            $exitCode = 1;
            out("Clan #{$clanId} {$clanLabel}: error: {$result['error']}.");
        } else {
            $skippedClans++;
            out("Clan #{$clanId} {$clanLabel}: skipped ({$result['status']}).");
        }
    }

    out("Done. Processed clans={$processedClans}, skipped clans={$skippedClans}, error clans={$errorClans}, members charged={$totalMembers}, total taxed={$totalAmount}.");
} catch (Throwable $e) {
    $exitCode = 1;
    out('Fatal error: ' . $e->getMessage());
} finally {
    if ($lockAcquired && $db instanceof PDO) {
        try {
            $releaseStmt = $db->query("SELECT RELEASE_LOCK('andromeda_clan_tax_daily_lock')");
            $released = $releaseStmt ? $releaseStmt->fetchColumn() : null;
            if ((int)$released !== 1) {
                out('Warning: MySQL lock was not released cleanly.');
            }
        } catch (Throwable $e) {
            out('Warning: could not release MySQL lock: ' . $e->getMessage());
        }
    }
}

exit($exitCode);
