<?php
require_once __DIR__ . '/../../libs/TitleService.php';

$titleMessage = '';
$titleError = '';
$titleState = [
    'current_title' => '',
    'current_label' => '',
    'temporary' => [],
    'selected_title' => '',
    'selected_label' => '',
    'permanent_titles' => [],
];

$escapeTitle = function ($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
};

try {
    $titleService = new TitleService($db, (int)$sessionPlayerId);

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['title_action'])) {
        $submittedToken = (string)($_POST['title_csrf_token'] ?? '');
        if (!hash_equals((string)$titleCsrfToken, $submittedToken)) {
            throw new Exception('Security token expired. Please refresh the page and try again.');
        }

        $action = (string)$_POST['title_action'];
        if ($action === 'equip') {
            $titleService->equipPermanentTitle((string)($_POST['title_key'] ?? ''));
            $titleMessage = 'Title equipped.';
        } elseif ($action === 'remove') {
            $titleService->removePermanentTitle();
            $titleMessage = 'Title removed.';
        }
    }

    $titleState = $titleService->getState();
} catch (Exception $exception) {
    $titleError = $exception->getMessage();
}
?>

<div class="user-tab-panel titles-panel">
    <div class="user-tab-panel__header">
        <div>
            <h2>Titles</h2>
            <p>Choose the permanent title shown under your pilot name. Temporary titles override your selection automatically.</p>
        </div>
        <form method="post" class="titles-remove-form">
            <input type="hidden" name="title_csrf_token" value="<?php echo $escapeTitle($titleCsrfToken ?? ''); ?>" />
            <input type="hidden" name="title_action" value="remove" />
            <button class="titles-button titles-button--ghost" type="submit"<?php echo $titleState['selected_title'] === '' ? ' disabled' : ''; ?>>Remove title</button>
        </form>
    </div>

    <?php if ($titleMessage !== '') { ?>
        <div class="titles-alert titles-alert--success"><?php echo $escapeTitle($titleMessage); ?></div>
    <?php } ?>

    <?php if ($titleError !== '') { ?>
        <div class="titles-alert titles-alert--error"><?php echo $escapeTitle($titleError); ?></div>
    <?php } ?>

    <div class="titles-summary-grid">
        <section class="titles-summary-card">
            <span class="titles-summary-label">Current displayed title</span>
            <strong><?php echo $titleState['current_label'] !== '' ? $escapeTitle($titleState['current_label']) : 'No title displayed'; ?></strong>
            <p><?php echo $titleState['current_title'] !== '' ? $escapeTitle($titleState['current_title']) : 'Your pilot name is currently shown without a title.'; ?></p>
        </section>

        <section class="titles-summary-card">
            <span class="titles-summary-label">Temporary override</span>
            <?php if (!empty($titleState['temporary'])) { ?>
                <strong><?php echo $escapeTitle($titleState['temporary']['label']); ?></strong>
                <p>
                    Source: <?php echo $escapeTitle($titleState['temporary']['source']); ?>
                    <?php if (!empty($titleState['temporary']['expires_at'])) { ?>
                        · Expires: <?php echo $escapeTitle($titleState['temporary']['expires_at']); ?>
                    <?php } ?>
                </p>
            <?php } else { ?>
                <strong>None</strong>
                <p>Most Wanted and Spaceball Champion appear here when active.</p>
            <?php } ?>
        </section>

        <section class="titles-summary-card">
            <span class="titles-summary-label">Selected permanent title</span>
            <strong><?php echo $titleState['selected_label'] !== '' ? $escapeTitle($titleState['selected_label']) : 'None selected'; ?></strong>
            <p><?php echo $titleState['selected_title'] !== '' ? $escapeTitle($titleState['selected_title']) : 'Unlock a title below, then equip it here.'; ?></p>
        </section>
    </div>

    <section class="titles-list-card">
        <div class="titles-list-card__header">
            <h3>Unlocked permanent titles</h3>
            <span><?php echo count($titleState['permanent_titles']); ?> unlocked</span>
        </div>

        <?php if (empty($titleState['permanent_titles'])) { ?>
            <div class="titles-empty">
                <strong>No permanent title unlocked yet.</strong>
                <p>Earn titles through 4-5 NPC hunts, eligible PvP kills, Weekly Missions, or admin events.</p>
            </div>
        <?php } else { ?>
            <div class="titles-table">
                <?php foreach ($titleState['permanent_titles'] as $title) { ?>
                    <?php $isSelected = (string)$title['title_key'] === (string)$titleState['selected_title']; ?>
                    <article class="titles-row<?php echo $isSelected ? ' is-selected' : ''; ?>">
                        <div>
                            <strong><?php echo $escapeTitle($title['label']); ?></strong>
                            <span><?php echo $escapeTitle($title['title_key']); ?></span>
                        </div>
                        <div>
                            <span>Source</span>
                            <strong><?php echo $escapeTitle($title['source']); ?></strong>
                        </div>
                        <div>
                            <span>Unlocked</span>
                            <strong><?php echo $escapeTitle($title['unlocked_at'] ?? ''); ?></strong>
                        </div>
                        <form method="post">
                            <input type="hidden" name="title_csrf_token" value="<?php echo $escapeTitle($titleCsrfToken ?? ''); ?>" />
                            <input type="hidden" name="title_action" value="equip" />
                            <input type="hidden" name="title_key" value="<?php echo $escapeTitle($title['title_key']); ?>" />
                            <button class="titles-button" type="submit"<?php echo $isSelected ? ' disabled' : ''; ?>>
                                <?php echo $isSelected ? 'Equipped' : 'Equip'; ?>
                            </button>
                        </form>
                    </article>
                <?php } ?>
            </div>
        <?php } ?>
    </section>
</div>
