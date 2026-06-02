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
    if ($status === 'active' || $status === 'equipped' || $status === 'selected' || $status === 'unlocked') {
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

$titleVisualClass = function ($titleKey) {
    $map = [
        'title_14' => 'most-wanted',
        'title_400' => 'spaceball',
        'title_401' => 'uber',
        'title_402' => 'boss',
        'title_403' => 'protegit',
        'title_404' => 'pvp',
        'title_405' => 'weekly',
        'title_406' => 'elite',
        'title_5' => 'beginner',
    ];
    return $map[(string)$titleKey] ?? 'standard';
};

$titleIcon = function ($titleKey) {
    $map = [
        'title_14' => 'img/titles/title_most_wanted.svg',
        'title_400' => 'img/titles/title_spaceball.svg',
        'title_401' => 'img/titles/title_uber.svg',
        'title_402' => 'img/titles/title_boss.svg',
        'title_403' => 'img/titles/title_protegit.svg',
        'title_404' => 'img/titles/title_pvp.svg',
        'title_405' => 'img/titles/title_weekly.svg',
        'title_406' => 'img/titles/title_current.svg',
        'title_5' => 'img/titles/title_beginner.svg',
    ];
    return $map[(string)$titleKey] ?? 'img/titles/title_current.svg';
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
        } elseif ($action === 'remove_displayed') {
            $stateBeforeRemove = $titleService->getState();
            if (!empty($stateBeforeRemove['has_temporary'])) {
                $titleService->removeTemporaryTitle();
            }
            $titleService->removePermanentTitle();
            $titleMessage = 'Title removed.';
        } elseif ($action === 'remove_temporary') {
            $titleService->removeTemporaryTitle();
            $titleMessage = 'Temporary title abandoned.';
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
$canRemoveDisplayedTitle = $hasTemporary || $titleState['selected_label'] !== '';

$renderTitleCard = function (array $card, bool $selectionMode = false) use ($escapeTitle, $hasTemporary, $badgeClass, $titleVisualClass, $titleIcon) {
    $label = $card['label'] ?? 'Unknown title';
    $type = $card['type'] ?? '';
    $status = $card['status'] ?? '';
    $displayStatus = !empty($card['is_equipped']) ? 'Selected' : $status;
    $condition = $card['condition'] ?? '';
    $titleKey = (string)($card['title_key'] ?? '');
    $visualClass = $titleVisualClass($card['title_key'] ?? '');
    $iconSrc = $titleIcon($card['title_key'] ?? '');
    $progressPercent = isset($card['progress_percent']) ? max(0, min(100, (int)$card['progress_percent'])) : 0;
    $progressText = (string)($card['progress_text'] ?? '');
    $canEquip = !empty($card['can_equip']);
    $disabledByTemporary = !empty($card['disabled_by_temporary']);
    $isEquipped = !empty($card['is_equipped']);
    $isLocked = !empty($card['is_locked']);
    $isSelectable = $selectionMode && $canEquip && !$hasTemporary;
    $isDisabledSelectable = $selectionMode && !$isEquipped && ($disabledByTemporary || $isLocked || !$canEquip);
    $cardClass = 'title-card title-card--' . $escapeTitle($visualClass) . ($isEquipped ? ' is-equipped' : '') . ($isLocked ? ' is-locked' : '') . ($isDisabledSelectable ? ' is-disabled' : '');
    ?>
    <?php if ($selectionMode && ($isSelectable || ($isEquipped && !$hasTemporary))) { ?>
        <label class="title-card-option">
            <input class="title-card__radio" type="radio" name="title_key" value="<?php echo $escapeTitle($titleKey); ?>"<?php echo $isEquipped ? ' checked' : ''; ?> />
            <span class="<?php echo $cardClass; ?>">
    <?php } else { ?>
        <article class="<?php echo $cardClass; ?>">
    <?php } ?>
        <div class="title-card__emblem" aria-hidden="true">
            <img src="<?php echo $escapeTitle($iconSrc); ?>" alt="" loading="lazy" />
        </div>
        <div class="title-card__content">
            <div class="title-card__topline">
                <span class="titles-badge titles-badge--type"><?php echo $escapeTitle($type); ?></span>
                <span class="titles-badge<?php echo $badgeClass($displayStatus); ?>"><?php echo $escapeTitle($displayStatus); ?></span>
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
                    <span class="title-card__hint title-card__hint--selected">Currently selected</span>
                <?php } elseif ($isSelectable) { ?>
                    <span class="title-card__hint">Click to select, then save.</span>
                <?php } elseif ($disabledByTemporary) { ?>
                    <span class="title-card__hint">Temporary title active.</span>
                <?php } elseif ($isLocked) { ?>
                    <span class="title-card__hint">Unlock this title to equip it.</span>
                <?php } else { ?>
                    <span class="title-card__hint">Not selectable.</span>
                <?php } ?>
            </div>
        </div>
    <?php if ($selectionMode && ($isSelectable || ($isEquipped && !$hasTemporary))) { ?>
            </span>
        </label>
    <?php } else { ?>
        </article>
    <?php } ?>
    <?php
};
?>

<div class="user-tab-panel titles-panel">
    <div class="titles-hero">
        <div class="titles-hero__copy">
            <span class="titles-kicker">Pilot identity</span>
            <h2>TITLES</h2>
            <p>Temporary titles always override your selected permanent title.</p>
        </div>
        <div class="titles-hero__planet" aria-hidden="true"></div>
        <div class="titles-hero__ship" aria-hidden="true"></div>
    </div>

    <?php if ($titleMessage !== '') { ?>
        <div class="titles-alert titles-alert--success"><?php echo $escapeTitle($titleMessage); ?></div>
    <?php } ?>

    <?php if ($titleError !== '') { ?>
        <div class="titles-alert titles-alert--error"><?php echo $escapeTitle($titleError); ?></div>
    <?php } ?>

    <?php if ($hasTemporary) { ?>
        <div class="titles-temporary-warning">
            <span>A temporary title is active. It overrides your selected permanent title.</span>
            <form method="post" class="titles-inline-form">
                <input type="hidden" name="title_csrf_token" value="<?php echo $escapeTitle($titleCsrfToken ?? ''); ?>" />
                <input type="hidden" name="title_action" value="remove_displayed" />
                <button class="titles-button titles-button--danger" type="submit">Abandon title</button>
            </form>
        </div>
    <?php } ?>

    <div class="titles-summary-grid">
        <section class="titles-summary-card titles-summary-card--current">
            <div class="titles-summary-card__icon" aria-hidden="true">
                <img src="img/titles/title_current.svg" alt="" loading="lazy" />
            </div>
            <div>
                <span class="titles-summary-label">Current Displayed Title</span>
                <strong><?php echo $escapeTitle($currentLabel); ?></strong>
                <p>Shown in-game now.</p>
            </div>
        </section>
    </div>

    <section class="titles-section">
        <div class="titles-section__header">
            <h3>Temporary Titles</h3>
            <span>Gameplay titles with priority over permanents</span>
        </div>
        <div class="titles-card-grid titles-card-grid--two">
            <?php foreach (($titleState['temporary_titles'] ?? []) as $card) { ?>
                <?php
                $temporaryActive = ($card['status'] ?? '') === 'Active';
                $temporaryClass = 'title-card title-card--temporary title-card--' . $escapeTitle($titleVisualClass($card['title_key'] ?? '')) . ($temporaryActive ? ' is-active' : '');
                ?>
                <label class="title-card-option title-card-option--temporary">
                    <input class="title-card__radio title-card__radio--temporary" type="radio" name="title_selection" value="temporary"<?php echo $temporaryActive ? ' checked' : ''; ?> />
                    <span class="<?php echo $temporaryClass; ?>">
                    <div class="title-card__emblem" aria-hidden="true">
                        <img src="<?php echo $escapeTitle($titleIcon($card['title_key'] ?? '')); ?>" alt="" loading="lazy" />
                    </div>
                    <div class="title-card__content">
                        <div class="title-card__topline">
                            <span class="titles-badge titles-badge--type"><?php echo $escapeTitle($card['type'] ?? 'Temporary'); ?></span>
                            <span class="titles-badge<?php echo $badgeClass($card['status'] ?? ''); ?>"><?php echo $escapeTitle($card['status'] ?? ''); ?></span>
                        </div>
                        <h3><?php echo $escapeTitle($card['label'] ?? 'Unknown title'); ?></h3>
                        <p><?php echo $escapeTitle($card['condition'] ?? ''); ?></p>
                        <?php if (!empty($card['expires_at'])) { ?>
                            <div class="title-card__progress-text">Expires: <?php echo $escapeTitle($card['expires_at']); ?></div>
                        <?php } ?>
                    </div>
                    </span>
                </label>
            <?php } ?>
        </div>
    </section>

    <section class="titles-section">
        <div class="titles-section__header">
            <h3>Permanent Titles</h3>
            <span><?php echo $hasTemporary ? 'Abandon your temporary title before changing your permanent title.' : 'Select one unlocked title, then save your choice.'; ?></span>
        </div>
        <form id="titles-save-form" method="post" class="titles-permanent-form<?php echo $hasTemporary ? ' is-disabled' : ''; ?>">
            <input type="hidden" name="title_csrf_token" value="<?php echo $escapeTitle($titleCsrfToken ?? ''); ?>" />
            <input type="hidden" name="title_action" value="equip" />
            <div class="titles-card-grid">
            <?php foreach (($titleState['permanent_titles'] ?? []) as $card) { ?>
                <?php $renderTitleCard($card, true); ?>
            <?php } ?>
            <?php if (!empty($titleState['beginner'])) { ?>
                <?php $renderTitleCard($titleState['beginner']); ?>
            <?php } ?>
            </div>
        </form>
        <div class="titles-action-bar">
            <div>
                <strong><?php echo $escapeTitle($selectedLabel); ?></strong>
                <span>Selected permanent title</span>
            </div>
            <div class="titles-action-bar__buttons">
                <form id="titles-remove-form" method="post" class="titles-remove-form">
                    <input type="hidden" name="title_csrf_token" value="<?php echo $escapeTitle($titleCsrfToken ?? ''); ?>" />
                    <input type="hidden" name="title_action" value="remove_displayed" />
                    <button class="titles-button titles-button--ghost" type="submit"<?php echo !$canRemoveDisplayedTitle ? ' disabled' : ''; ?>>Remove</button>
                </form>
                <button class="titles-button titles-button--primary" type="submit" form="titles-save-form"<?php echo $hasTemporary || $titleState['selected_label'] === '' ? ' disabled' : ''; ?>>Save changes</button>
            </div>
        </div>
    </section>
</div>

<script>
(function () {
    var saveButton = document.querySelector('.titles-button--primary[form="titles-save-form"]');
    var permanentRadios = document.querySelectorAll('.title-card__radio[name="title_key"]');
    var temporaryRadios = document.querySelectorAll('.title-card__radio--temporary');

    function selectPermanent() {
        if (saveButton) {
            saveButton.disabled = false;
        }
    }

    function selectTemporary() {
        if (saveButton) {
            saveButton.disabled = true;
        }
    }

    permanentRadios.forEach(function (radio) {
        radio.addEventListener('change', selectPermanent);
    });

    temporaryRadios.forEach(function (radio) {
        radio.addEventListener('change', selectTemporary);
    });
})();
</script>
