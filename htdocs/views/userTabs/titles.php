<?php
require_once __DIR__ . '/../../libs/TitleService.php';

$titleMessage = '';
$titleError = '';
$titleState = [
    'current_label' => '',
    'temporary' => [],
    'has_temporary' => false,
    'selected_label' => '',
    'beginner' => [],
    'temporary_titles' => [],
    'permanent_titles' => [],
];

$escapeTitle = function ($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
};

$badgeClass = function ($status) {
    $status = strtolower((string)$status);
    if ($status === 'active' || $status === 'equipped' || $status === 'unlocked') {
        return ' titles-badge--good';
    }
    if ($status === 'locked') {
        return ' titles-badge--locked';
    }
    if ($status === 'starter' || $status === 'not active') {
        return ' titles-badge--muted';
    }
    return '';
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
            $titleMessage = 'Permanent title removed.';
        } elseif ($action === 'remove_temporary') {
            $titleService->removeTemporaryTitle();
            $titleMessage = 'Temporary title removed.';
        }
    }

    $titleState = $titleService->getState();
} catch (Exception $exception) {
    $titleError = $exception->getMessage();
}

$currentLabel = $titleState['current_label'] !== '' ? $titleState['current_label'] : 'No title displayed';
$temporaryLabel = !empty($titleState['temporary']) ? $titleState['temporary']['label'] : 'None';
$selectedLabel = $titleState['selected_label'] !== '' ? $titleState['selected_label'] : 'None selected';
$hasTemporary = !empty($titleState['has_temporary']);

$renderTitleCard = function (array $card) use ($escapeTitle, $titleCsrfToken, $hasTemporary, $badgeClass) {
    $label = $card['label'] ?? 'Unknown title';
    $type = $card['type'] ?? '';
    $status = $card['status'] ?? '';
    $condition = $card['condition'] ?? '';
    $progressPercent = isset($card['progress_percent']) ? max(0, min(100, (int)$card['progress_percent'])) : 0;
    $progressText = (string)($card['progress_text'] ?? '');
    $canEquip = !empty($card['can_equip']);
    $disabledByTemporary = !empty($card['disabled_by_temporary']);
    $isEquipped = !empty($card['is_equipped']);
    $isLocked = !empty($card['is_locked']);
    ?>
    <article class="title-card<?php echo $isEquipped ? ' is-equipped' : ''; ?><?php echo $isLocked ? ' is-locked' : ''; ?>">
        <div class="title-card__topline">
            <span class="titles-badge titles-badge--type"><?php echo $escapeTitle($type); ?></span>
            <span class="titles-badge<?php echo $badgeClass($status); ?>"><?php echo $escapeTitle($status); ?></span>
        </div>
        <h3><?php echo $escapeTitle($label); ?></h3>
        <p><?php echo $escapeTitle($condition); ?></p>
        <?php if ($progressText !== '') { ?>
            <div class="title-progress" aria-label="<?php echo $escapeTitle($progressText); ?>">
                <span style="width: <?php echo $progressPercent; ?>%"></span>
            </div>
            <div class="title-card__progress-text"><?php echo $escapeTitle($progressText); ?></div>
        <?php } ?>
        <div class="title-card__actions">
            <?php if ($isEquipped) { ?>
                <button class="titles-button" type="button" disabled>Equipped</button>
            <?php } elseif ($canEquip) { ?>
                <form method="post">
                    <input type="hidden" name="title_csrf_token" value="<?php echo $escapeTitle($titleCsrfToken ?? ''); ?>" />
                    <input type="hidden" name="title_action" value="equip" />
                    <input type="hidden" name="title_key" value="<?php echo $escapeTitle($card['title_key'] ?? ''); ?>" />
                    <button class="titles-button" type="submit">Equip</button>
                </form>
            <?php } elseif ($disabledByTemporary) { ?>
                <button class="titles-button titles-button--disabled" type="button" disabled>Temporary active</button>
            <?php } elseif ($isLocked) { ?>
                <span class="title-card__hint">Unlock this title to equip it.</span>
            <?php } else { ?>
                <span class="title-card__hint">Not selectable.</span>
            <?php } ?>
        </div>
    </article>
    <?php
};
?>

<div class="user-tab-panel titles-panel">
    <div class="user-tab-panel__header titles-header">
        <div>
            <h2>Titles</h2>
            <p>Titles appear under your pilot name in-game. Temporary titles always override your selected permanent title.</p>
        </div>
        <form method="post" class="titles-remove-form">
            <input type="hidden" name="title_csrf_token" value="<?php echo $escapeTitle($titleCsrfToken ?? ''); ?>" />
            <input type="hidden" name="title_action" value="remove" />
            <button class="titles-button titles-button--ghost" type="submit"<?php echo $titleState['selected_label'] === '' ? ' disabled' : ''; ?>>Remove permanent title</button>
        </form>
    </div>

    <?php if ($titleMessage !== '') { ?>
        <div class="titles-alert titles-alert--success"><?php echo $escapeTitle($titleMessage); ?></div>
    <?php } ?>

    <?php if ($titleError !== '') { ?>
        <div class="titles-alert titles-alert--error"><?php echo $escapeTitle($titleError); ?></div>
    <?php } ?>

    <?php if ($hasTemporary) { ?>
        <div class="titles-alert titles-alert--notice">
            Temporary title is active. Remove it before selecting a permanent title.
        </div>
    <?php } ?>

    <div class="titles-summary-grid">
        <section class="titles-summary-card">
            <span class="titles-summary-label">Current Displayed Title</span>
            <strong><?php echo $escapeTitle($currentLabel); ?></strong>
            <p>Shown in-game now.</p>
        </section>

        <section class="titles-summary-card titles-summary-card--temporary">
            <span class="titles-summary-label">Temporary Override</span>
            <strong><?php echo $escapeTitle($temporaryLabel); ?></strong>
            <p>Temporary titles override permanent titles.</p>
            <?php if ($hasTemporary) { ?>
                <form method="post" class="titles-inline-form">
                    <input type="hidden" name="title_csrf_token" value="<?php echo $escapeTitle($titleCsrfToken ?? ''); ?>" />
                    <input type="hidden" name="title_action" value="remove_temporary" />
                    <button class="titles-button titles-button--danger" type="submit">Remove temporary title</button>
                </form>
            <?php } ?>
        </section>

        <section class="titles-summary-card">
            <span class="titles-summary-label">Selected Permanent Title</span>
            <strong><?php echo $escapeTitle($selectedLabel); ?></strong>
            <p>Returns automatically when a temporary title expires or is removed.</p>
        </section>
    </div>

    <section class="titles-section">
        <div class="titles-section__header">
            <h3>Temporary Titles</h3>
            <span>Gameplay titles with priority over permanents</span>
        </div>
        <div class="titles-card-grid titles-card-grid--two">
            <?php foreach (($titleState['temporary_titles'] ?? []) as $card) { ?>
                <article class="title-card title-card--temporary<?php echo ($card['status'] ?? '') === 'Active' ? ' is-active' : ''; ?>">
                    <div class="title-card__topline">
                        <span class="titles-badge titles-badge--type"><?php echo $escapeTitle($card['type'] ?? 'Temporary'); ?></span>
                        <span class="titles-badge<?php echo $badgeClass($card['status'] ?? ''); ?>"><?php echo $escapeTitle($card['status'] ?? ''); ?></span>
                    </div>
                    <h3><?php echo $escapeTitle($card['label'] ?? 'Unknown title'); ?></h3>
                    <p><?php echo $escapeTitle($card['condition'] ?? ''); ?></p>
                    <?php if (!empty($card['expires_at'])) { ?>
                        <div class="title-card__progress-text">Expires: <?php echo $escapeTitle($card['expires_at']); ?></div>
                    <?php } ?>
                </article>
            <?php } ?>
        </div>
    </section>

    <section class="titles-section">
        <div class="titles-section__header">
            <h3>Permanent Titles</h3>
            <span>Unlocked titles can be equipped when no temporary title is active</span>
        </div>
        <div class="titles-card-grid">
            <?php foreach (($titleState['permanent_titles'] ?? []) as $card) { ?>
                <?php $renderTitleCard($card); ?>
            <?php } ?>
            <?php if (!empty($titleState['beginner'])) { ?>
                <?php $renderTitleCard($titleState['beginner']); ?>
            <?php } ?>
        </div>
    </section>
</div>
