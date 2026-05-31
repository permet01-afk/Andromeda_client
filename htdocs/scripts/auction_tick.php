<?php
/**
 * Optional auction maintenance runner.
 * You can call it from a cron/task scheduler, or ignore it: the Auction page also runs maintenance on page load.
 */

require_once __DIR__ . '/../libs/Database.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../libs/AuctionService.php';

$db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);
$auction = new AuctionService($db, 0);
$result = $auction->runMaintenance();

if (PHP_SAPI === 'cli') {
    echo 'Auction maintenance completed.' . PHP_EOL;
    echo 'Settled rounds: ' . (int)$result['settled_rounds'] . PHP_EOL;
    echo 'Auction open: ' . ($result['auction_open'] ? 'yes' : 'no') . PHP_EOL;
    echo 'Server time: ' . $result['server_time'] . PHP_EOL;
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
echo 'Auction maintenance completed.' . "\n";
echo 'Settled rounds: ' . (int)$result['settled_rounds'] . "\n";
echo 'Auction open: ' . ($result['auction_open'] ? 'yes' : 'no') . "\n";
echo 'Server time: ' . $result['server_time'] . "\n";
