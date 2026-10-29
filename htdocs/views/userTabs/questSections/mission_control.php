<?php
// Presentation only. The enclosing controller supplies real service state and handles POST/CSRF.
$mc = isset($mcState) && is_array($mcState) ? $mcState : [];
$mcH = static function ($value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
};
$mcNumber = static function ($value): string {
    return is_numeric($value) ? number_format((int)$value) : '—';
};
$mcSection = (string)($mc['section'] ?? 'contracts');
$mcFilter = (string)($mc['filter'] ?? 'all');
$mcMissions = array_values(array_filter((array)($mc['missions'] ?? []), 'is_array'));
$mcSectionMissions = array_values(array_filter($mcMissions, static function (array $mission) use ($mcSection): bool {
    return (string)($mission['group'] ?? '') === $mcSection;
}));
$mcVisibleMissions = (array)($mc['visibleMissions'] ?? $mcSectionMissions);
$mcSelected = (string)($mc['selectedKey'] ?? '');
$mcKeys = array_column($mcVisibleMissions, 'id');
if (!in_array($mcSelected, $mcKeys, true)) {
    $mcSelected = (string)($mcVisibleMissions[0]['id'] ?? '');
}
$mcStates = ['available', 'active', 'ready', 'completed', 'locked'];
$mcCompany = (int)($mc['company'] ?? 0);
$mcPortraits = [1 => 'mmo', 2 => 'eic', 3 => 'vru'];
$mcPortrait = $mcPortraits[$mcCompany] ?? 'nyx';
$mcAsset = 'assets/historical/mission-control/';
$mcHasLevel = false;
foreach ($mcSectionMissions as $mcMission) {
    if (isset($mcMission['minLevel']) && is_numeric($mcMission['minLevel'])) {
        $mcHasLevel = true;
        break;
    }
}
$mcChecked = [
    'available' => in_array($mcFilter, ['all', 'available', 'active'], true),
    'locked' => in_array($mcFilter, ['all', 'locked'], true),
    'completed' => in_array($mcFilter, ['all', 'completed'], true),
];
if (is_array($mc['checkedStates'] ?? null)) {
    foreach ($mcChecked as $mcStateKey => $_) $mcChecked[$mcStateKey] = in_array($mcStateKey, $mc['checkedStates'], true);
}
?>
<link rel="stylesheet" href="assets/historical/mission-control.css?v=20261028daily" />
<script src="assets/historical/mission-control.js?v=20261028daily" defer></script>
<div class="mc-shell" id="mission-control" data-mc-root data-mc-section="<?php echo $mcH($mcSection); ?>" data-mc-filter="<?php echo $mcH($mcFilter); ?>" data-mc-player-id="<?php echo (int)($mc['playerId'] ?? 0); ?>">
    <script type="application/json" data-mc-groups><?php echo json_encode($mc['groups'] ?? [], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?></script>
    <script type="application/json" data-mc-lifecycle-notice><?php echo json_encode($mc['lifecycleNotice'] ?? [], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?></script>
    <script type="application/json" data-mc-runtime-reasons><?php echo json_encode($mc['runtimeReasonLabels'] ?? [], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?></script>
    <div class="mc-reopen" data-mc-reopen hidden>
        <button type="button" class="mc-button" data-mc-open>Open Mission Control</button>
    </div>
    <section class="mc-window" data-mc-window aria-label="Mission Control">
        <header class="mc-titlebar">
            <h2>Mission Control</h2>
            <span class="mc-active-count">Active quests <strong data-mc-active-count><?php echo $mcH($mcNumber($mc['activeCount'] ?? null)); ?><?php if (isset($mc['maxActiveCount']) && is_numeric($mc['maxActiveCount'])) { ?> / <?php echo $mcH($mcNumber($mc['maxActiveCount'])); ?><?php } ?></strong></span>
        </header>
        <?php foreach (['error' => 'alert', 'weeklyError' => 'alert', 'notice' => 'status'] as $mcMessageKey => $mcRole) { ?>
            <?php if (!empty($mc[$mcMessageKey])) { ?>
                <p class="mc-message<?php echo $mcRole === 'alert' ? ' mc-message--error' : ''; ?>" role="<?php echo $mcH($mcRole); ?>"><?php echo $mcH($mc[$mcMessageKey]); ?></p>
            <?php } ?>
        <?php } ?>
        <nav class="mc-tabs" role="tablist" aria-label="Mission categories">
            <?php foreach ((array)($mc['groups'] ?? []) as $mcGroup) { ?>
                <a id="mc-tab-<?php echo $mcH($mcGroup['id'] ?? ''); ?>" class="mc-tab<?php echo (string)($mcGroup['id'] ?? '') === $mcSection ? ' is-selected' : ''; ?>" role="tab" aria-controls="mc-tab-content" data-mc-tab="<?php echo $mcH($mcGroup['id'] ?? ''); ?>" aria-selected="<?php echo (string)($mcGroup['id'] ?? '') === $mcSection ? 'true' : 'false'; ?>" href="<?php echo $mcH($mcGroup['url'] ?? 'view.php?page=user&tab=quests'); ?>" title="<?php echo $mcH($mcGroup['label'] ?? ''); ?>"<?php echo (string)($mcGroup['id'] ?? '') === $mcSection ? ' aria-current="page"' : ''; ?>>
                    <span><?php echo $mcH($mcGroup['label'] ?? ''); ?></span>
                    <small><?php echo $mcH($mcNumber($mcGroup['count'] ?? null)); ?></small>
                </a>
            <?php } ?>
        </nav>
        <?php if (!empty($mc['weeklyMeta'])) { $mcWeekly = (array)$mc['weeklyMeta']; ?>
            <div class="mc-weekly-summary" data-mc-weekly-summary<?php echo $mcSection === 'weekly' ? '' : ' hidden'; ?>>
                <?php if (!empty($mcWeekly['rotation_group'])) { ?><span>Rotation: <?php echo $mcH($mcWeekly['rotation_group']); ?></span><?php } ?>
                <?php if (!empty($mcWeekly['time_remaining_text'])) { ?><span>Time remaining: <?php echo $mcH($mcWeekly['time_remaining_text']); ?></span><?php } ?>
                <?php if (!empty($mcWeekly['reset_at'])) { ?><span>Next reset: <?php echo $mcH($mcWeekly['reset_at']); ?> Europe/Zurich</span><?php } ?>
            </div>
        <?php } ?>
        <div class="mc-body" id="mc-tab-content" role="tabpanel" data-mc-tab-panel aria-labelledby="mc-tab-<?php echo $mcH($mcSection); ?>">
            <aside class="mc-list-column" aria-label="Mission list">
                <div class="mc-portrait<?php echo $mcPortrait === 'nyx' ? '' : ' mc-portrait--company'; ?>" aria-hidden="true">
                    <img src="<?php echo $mcH($mcAsset . 'portrait-' . $mcPortrait . '.png'); ?>" alt="" width="<?php echo $mcPortrait === 'nyx' ? '177' : '280'; ?>" height="<?php echo $mcPortrait === 'nyx' ? '322' : '320'; ?>" />
                </div>
                <div class="mc-tools" data-mc-tools>
                    <fieldset class="mc-filter-set">
                        <legend class="mc-sr-only">Filter missions</legend>
                        <?php foreach (['available' => 'Available', 'locked' => 'Unavailable', 'completed' => 'Completed'] as $mcFilterId => $mcFilterLabel) { ?>
                            <label class="mc-filter mc-filter--<?php echo $mcH($mcFilterId); ?>" title="<?php echo $mcH($mcFilterLabel); ?>">
                                <input type="checkbox" data-mc-filter-state="<?php echo $mcH($mcFilterId); ?>"<?php echo $mcChecked[$mcFilterId] ? ' checked' : ''; ?> />
                                <span class="mc-filter-art" aria-hidden="true"></span>
                                <span class="mc-filter-label"><?php echo $mcH($mcFilterLabel); ?></span>
                            </label>
                        <?php } ?>
                    </fieldset>
                    <button type="button" class="mc-sort" data-mc-sort aria-label="Sort by level, ascending" title="<?php echo $mcHasLevel ? 'Sort by level' : 'No level information supplied for this category'; ?>"<?php echo $mcHasLevel ? '' : ' disabled'; ?>>
                        <span class="mc-sort-art" aria-hidden="true"></span><span class="mc-filter-label">Level</span>
                    </button>
                </div>
                <p class="mc-list-status"><span data-mc-visible-count><?php echo count($mcVisibleMissions); ?></span> missions <span class="mc-active-filter" data-mc-active-filter<?php echo $mcFilter === 'active' ? '' : ' hidden'; ?>>· Active</span></p>
                <div class="mc-list" data-mc-list>
                    <?php foreach ($mcMissions as $mcIndex => $mcMission) {
                        $mcId = (string)($mcMission['id'] ?? '');
                        $mcDomId = 'mc-detail-' . substr(hash('sha256', $mcId), 0, 16);
                        $mcStateName = in_array((string)($mcMission['state'] ?? ''), $mcStates, true) ? (string)$mcMission['state'] : 'locked';
                        $mcMissionGroup = (string)($mcMission['group'] ?? '');
                        $mcFilterGroup = in_array($mcStateName, ['active', 'ready'], true) ? 'available' : $mcStateName;
                        $mcInitiallyVisible = $mcMissionGroup === $mcSection && !empty($mcChecked[$mcFilterGroup])
                            && ($mcFilter !== 'active' || in_array($mcStateName, ['active', 'ready'], true));
                        $mcIconType = (string)($mcMission['iconType'] ?? '');
                        $mcIcon = $mcIconType === 'pvp' || $mcMissionGroup === 'pvp' ? '51_questType_pvp_framed.png' : ($mcIconType === 'time' || $mcMissionGroup === 'weekly' ? '49_questType_time_framed.png' : '53_questType_kill_framed.png');
                        $mcIsSelected = $mcId === $mcSelected;
                    ?>
                        <a href="<?php echo $mcH($mcMission['url'] ?? 'view.php?page=user&tab=quests'); ?>" class="mc-choice mc-choice--<?php echo $mcH($mcStateName); ?><?php echo $mcIsSelected ? ' is-selected' : ''; ?>" data-mc-choice data-mc-group="<?php echo $mcH($mcMissionGroup); ?>" data-mc-key="<?php echo $mcH($mcId); ?>" data-mc-state="<?php echo $mcH($mcStateName); ?>" data-mc-level="<?php echo isset($mcMission['minLevel']) && is_numeric($mcMission['minLevel']) ? (int)$mcMission['minLevel'] : ''; ?>" data-mc-order="<?php echo $mcIndex; ?>" aria-controls="<?php echo $mcH($mcDomId); ?>" aria-current="<?php echo $mcIsSelected ? 'true' : 'false'; ?>" title="<?php echo $mcH(!empty($mcMission['lockReason']) ? $mcMission['lockReason'] : $mcMission['title'] ?? ''); ?>"<?php echo $mcInitiallyVisible ? '' : ' hidden'; ?>>
                            <img class="mc-choice-icon" src="<?php echo $mcH($mcAsset . $mcIcon); ?>" alt="" width="32" height="32" />
                            <span class="mc-choice-copy"><span class="mc-choice-name"><?php echo $mcH($mcMission['title'] ?? ''); ?></span><span class="mc-choice-meta"><span><?php echo $mcH($mcMission['stateLabel'] ?? ''); ?></span><span><?php echo isset($mcMission['minLevel']) && is_numeric($mcMission['minLevel']) ? 'Lv. ' . (int)$mcMission['minLevel'] : ''; ?></span></span></span>
                        </a>
                    <?php } ?>
                </div>
                <p class="mc-list-empty" data-mc-list-empty<?php echo $mcVisibleMissions ? ' hidden' : ''; ?>><?php echo $mcSectionMissions ? 'No missions match these filters.' : 'No missions are currently available in this category.'; ?></p>
            </aside>
            <div class="mc-detail-column" data-mc-details>
                <?php foreach ($mcMissions as $mcMission) {
                    $mcId = (string)($mcMission['id'] ?? '');
                    $mcDomId = 'mc-detail-' . substr(hash('sha256', $mcId), 0, 16);
                    $mcIsSelected = $mcId === $mcSelected;
                ?>
                    <article id="<?php echo $mcH($mcDomId); ?>" class="mc-detail" data-mc-detail data-mc-group="<?php echo $mcH($mcMission['group'] ?? ''); ?>" data-mc-key="<?php echo $mcH($mcId); ?>" data-mc-code="<?php echo $mcH($mcMission['code'] ?? ''); ?>" data-mc-attempt="<?php echo $mcH($mcMission['attemptId'] ?? ''); ?>" data-mc-definition="<?php echo $mcH($mcMission['definitionSha256'] ?? ''); ?>" data-mc-version="<?php echo (int)($mcMission['stateVersion'] ?? 0); ?>" data-mc-completed="<?php echo in_array($mcMission['state'] ?? '', ['ready', 'completed'], true) ? 'true' : 'false'; ?>" data-mc-failed="<?php echo !empty($mcMission['failureLabel']) ? 'true' : 'false'; ?>" aria-label="<?php echo $mcH($mcMission['title'] ?? 'Mission'); ?>"<?php echo $mcIsSelected ? '' : ' hidden'; ?>>
                        <section class="mc-description">
                            <div class="mc-detail-heading"><h3><?php echo $mcH($mcMission['title'] ?? ''); ?></h3><span class="mc-state-label"><?php echo $mcH($mcMission['stateLabel'] ?? ''); ?></span></div>
                            <div class="mc-description-scroll"><?php if (!empty($mcMission['description'])) { ?><p><?php echo nl2br($mcH($mcMission['description']), false); ?></p><?php } ?>
                                <?php foreach ((array)($mcMission['constraintLabels'] ?? []) as $mcRule) { ?><p class="mc-mission-meta"><?php echo $mcH($mcRule); ?></p><?php } ?>
                                <?php if (!empty($mcMission['adaptationNotice'])) { ?><p class="mc-mission-meta"><?php echo $mcH($mcMission['adaptationNotice']); ?></p><?php } ?>
                                <?php if (!empty($mcMission['failureLabel'])) { ?><p class="mc-lock-reason"><?php echo $mcH($mcMission['failureLabel']); ?></p><?php } ?>
                                <?php if (!empty($mcMission['difficulty']) || !empty($mcMission['recommendedLevel']) || (($mcMission['group'] ?? '') === 'contracts' && isset($mcMission['contractLevel']))) { ?>
                                    <p class="mc-mission-meta">
                                        <?php if (!empty($mcMission['difficulty'])) { ?><span>Difficulty: <?php echo $mcH($mcMission['difficulty']); ?></span><?php } ?>
                                        <?php if (!empty($mcMission['recommendedLevel'])) { ?><span>Recommended level: <?php echo (int)$mcMission['recommendedLevel']; ?>+</span><?php } ?>
                                        <?php if (($mcMission['group'] ?? '') === 'contracts' && isset($mcMission['contractLevel'])) { ?><span>Contract level: <?php echo (int)$mcMission['contractLevel']; ?> / 10</span><?php } ?>
                                    </p>
                                <?php } ?>
                                <?php if (!empty($mcMission['lockReason'])) { ?><p class="mc-lock-reason"><?php echo $mcH($mcMission['lockReason']); ?></p><?php } ?>
                                <?php if (!empty($mcMission['eligibleCompanies']) && count($mcMission['eligibleCompanies']) < 3) { ?><p class="mc-mission-meta">Companies: <?php echo $mcH(implode(', ', $mcMission['eligibleCompanies'])); ?></p><?php } ?>
                                <?php if (!empty($mcMission['prerequisiteLabels'])) { ?><p class="mc-mission-meta">Required missions: <?php echo $mcH(implode(', ', $mcMission['prerequisiteLabels'])); ?></p><?php } ?>
                            </div>
                        </section>
                        <section class="mc-objectives">
                            <h4>Overview</h4>
                            <div class="mc-pane-scroll">
                                <?php if (!empty($mcMission['objectiveModeLabel'])) { ?><p class="mc-objective-mode"><?php echo $mcH($mcMission['objectiveModeLabel']); ?></p><?php } ?>
                                <ul class="mc-objective-list">
                                    <?php foreach ((array)($mcMission['objectives'] ?? []) as $mcObjective) {
                                        $mcPercent = max(0, min(100, (float)($mcObjective['percent'] ?? 0)));
                                        $mcScore = !empty($mcObjective['score']);
                                        $mcDepth = max(0, min(5, (int)($mcObjective['depth'] ?? 0)));
                                        $mcObjectiveActive = !array_key_exists('active', $mcObjective) || !empty($mcObjective['active']);
                                        $mcHasGoal = isset($mcObjective['required']) && is_numeric($mcObjective['required']) && (float)$mcObjective['required'] > 0;
                                    ?>
                                        <li class="mc-objective<?php echo !empty($mcObjective['complete']) ? ' is-complete' : ''; ?><?php echo $mcScore ? ' is-score' : ''; ?><?php echo !$mcObjectiveActive && empty($mcObjective['complete']) ? ' is-upcoming' : ''; ?>" data-mc-node-id="<?php echo $mcH($mcObjective['id'] ?? ''); ?>" data-mc-required="<?php echo $mcH($mcObjective['required'] ?? ''); ?>" data-mc-unit="<?php echo $mcH($mcObjective['progress_unit'] ?? ''); ?>" style="--mc-objective-depth:<?php echo $mcDepth; ?>">
                                            <span class="mc-objective-label"><?php echo $mcH($mcObjective['label'] ?? ''); ?><?php foreach ((array)($mcObjective['conditions'] ?? []) as $mcCondition) { ?><br /><small><?php echo $mcH($mcCondition); ?></small><?php } ?><small data-mc-blocked-reason hidden></small></span>
                                            <strong data-mc-progress-text><?php if (isset($mcObjective['progress_text'])) { echo $mcH($mcObjective['progress_text']); } else { echo $mcH(isset($mcObjective['current_display']) ? $mcObjective['current_display'] : $mcNumber($mcObjective['current'] ?? null)); if (!$mcScore && $mcHasGoal) { ?> / <?php echo $mcH($mcNumber($mcObjective['required'])); } } ?><?php echo $mcScore ? ' · Score' : ''; ?></strong>
                                            <?php if (!$mcScore && $mcHasGoal) { ?><progress max="100" value="<?php echo $mcH($mcPercent); ?>" aria-label="<?php echo $mcH($mcObjective['label'] ?? 'Objective progress'); ?>"><?php echo $mcH($mcPercent); ?>%</progress><?php } ?>
                                        </li>
                                    <?php } ?>
                                </ul>
                                <?php foreach ((array)($mcMission['scoreLines'] ?? []) as $mcScoreLine) { ?><p class="mc-mission-meta" data-mc-score-key="<?php echo $mcH($mcScoreLine['score_key'] ?? ''); ?>" data-mc-score-unit="<?php echo $mcH($mcScoreLine['progress_unit'] ?? ''); ?>"><?php echo $mcH($mcScoreLine['label'] ?? ''); ?> <span data-mc-score-value><?php echo $mcH($mcScoreLine['progress_text'] ?? ''); ?></span></p><?php } ?>
                                <?php if (empty($mcMission['objectives']) && ($mcMission['state'] ?? '') === 'completed') { ?><p class="mc-completed-note">Completed</p><?php } ?>
                            </div>
                        </section>
                        <section class="mc-reward-section">
                            <h4>Reward</h4>
                            <div class="mc-pane-scroll"><dl class="mc-rewards">
                                <?php foreach ((array)($mcMission['rewards'] ?? []) as $mcReward) { if (is_numeric($mcReward['amount'] ?? null) && (float)$mcReward['amount'] === 0.0) { continue; } ?>
                                    <div><dt><?php echo $mcH($mcReward['label'] ?? ''); ?></dt><dd><?php echo $mcH($mcNumber($mcReward['amount'] ?? null)); ?></dd></div>
                                <?php } ?>
                            </dl><?php if (empty($mcMission['rewards']) && ($mcMission['state'] ?? '') === 'completed') { ?><p class="mc-completed-note">Completed</p><?php } ?></div>
                        </section>
                        <footer class="mc-actions">
                            <?php foreach ((array)($mcMission['actions'] ?? []) as $mcAction) { ?>
                                <form method="post" action="<?php echo $mcH($mcMission['formAction'] ?? 'view.php?page=user&tab=quests'); ?>" class="mc-action-form">
                                    <input type="hidden" name="csrf_token" value="<?php echo $mcH($mc['csrfToken'] ?? ''); ?>" />
                                    <input type="hidden" name="quest_action" value="<?php echo $mcH($mcAction['questAction'] ?? ''); ?>" />
                                    <?php foreach ((array)($mcAction['fields'] ?? []) as $mcFieldName => $mcFieldValue) { if (in_array((string)$mcFieldName, ['quest_code', 'npc_name'], true)) { ?>
                                        <input type="hidden" name="<?php echo $mcH($mcFieldName); ?>" value="<?php echo $mcH($mcFieldValue); ?>" />
                                    <?php } } ?>
                                    <button class="mc-button<?php echo (string)($mcAction['id'] ?? '') === 'abort' ? ' mc-button--secondary' : ''; ?>" type="submit"<?php echo !empty($mcAction['enabled']) ? '' : ' disabled'; ?>><?php echo $mcH($mcAction['label'] ?? ''); ?></button>
                                </form>
                            <?php } ?>
                        </footer>
                    </article>
                <?php } ?>
                <p class="mc-no-selection" data-mc-no-selection<?php echo $mcSelected !== '' ? ' hidden' : ''; ?>>Select a mission to view its objectives and rewards.</p>
            </div>
        </div>
        <footer class="mc-window-footer">
            <button class="mc-button mc-button--secondary" type="button" data-mc-close>Close</button>
        </footer>
    </section>
</div>
