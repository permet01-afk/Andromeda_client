<?php
// Included only after the existing view.php Terms, login and session-player guards.
if (!isset($db, $sessionPlayerId) || !($db instanceof PDO) || (int)$sessionPlayerId <= 0) {
    http_response_code(403);
    exit;
}
require_once __DIR__.'/../libs/LogbookHistoryService.php';
require_once __DIR__.'/../includes/legacy_message_display.php';
$historyError = null;
try {
    $historyPage = LogbookHistoryService::page(
        $db, (int)$sessionPlayerId,
        is_string($_GET['before'] ?? '') ? ($_GET['before'] ?? '') : 'invalid',
        is_string($_GET['after'] ?? '') ? ($_GET['after'] ?? '') : 'invalid'
    );
} catch (InvalidArgumentException $exception) {
    http_response_code(400);
    $historyError = 'This history link is invalid. Return to the newest entries.';
    $historyPage = ['rows' => [], 'older' => null, 'newer' => null];
}
$historyEscape = static fn($value): string => htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?>
<section class="hist-entire-history" aria-labelledby="entire-history-title">
    <header class="hist-entire-history-header">
        <h1 id="entire-history-title">Entire logbook history</h1>
        <a href="view.php?page=home">Home</a>
    </header>
    <?php if ($historyError !== null) { ?><p role="alert"><?php echo $historyEscape($historyError); ?></p><?php } ?>
    <div class="hist-entire-history-scroll" role="region" aria-label="Logbook entries" tabindex="0">
        <table class="hist-entire-history-table">
            <thead><tr><th scope="col">Date</th><th scope="col">Action</th></tr></thead>
            <tbody>
                <?php foreach ($historyPage['rows'] as $historyRow) { ?>
                <tr data-log-id="<?php echo (int)$historyRow['id']; ?>">
                    <td><time datetime="<?php echo $historyEscape(str_replace(' ', 'T', $historyRow['timestamp'])); ?>"><?php
                        $historyDate = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', (string)$historyRow['timestamp']);
                        echo $historyEscape($historyDate ? $historyDate->format('d.m.Y - H:i') : $historyRow['timestamp']);
                    ?></time></td>
                    <td class="legacy-system-message"><?php echo andromedaRenderLegacySystemMessage((string)$historyRow['message']); ?></td>
                </tr>
                <?php } ?>
                <?php if (!$historyPage['rows'] && $historyError === null) { ?><tr><td colspan="2">No logbook entries.</td></tr><?php } ?>
            </tbody>
        </table>
    </div>
    <nav class="hist-history-pagination" aria-label="Logbook pages">
        <a class="hist-history-newest" href="view.php?page=history">Newest entries</a>
        <?php if ($historyPage['newer'] !== null) { ?><a class="hist-history-newer" rel="prev" href="view.php?page=history&amp;after=<?php echo $historyEscape($historyPage['newer']); ?>">Newer entries</a><?php } ?>
        <?php if ($historyPage['older'] !== null) { ?><a class="hist-history-older" rel="next" href="view.php?page=history&amp;before=<?php echo $historyEscape($historyPage['older']); ?>">Older entries</a><?php } ?>
    </nav>
</section>
