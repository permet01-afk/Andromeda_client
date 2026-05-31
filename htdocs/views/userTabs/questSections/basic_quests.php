<?php
if (!isset($basicQuests)) {
    $basicQuests = [];
}
$activeBasicQuestCount = 0;
foreach ($basicQuests as $basicQuestForCount) {
    if ((string)($basicQuestForCount['status'] ?? '') === 'in_progress') {
        $activeBasicQuestCount++;
    }
}
$activeQuestCount = isset($activeQuestCount) ? (int)$activeQuestCount : $activeBasicQuestCount;
$maxActiveQuestCount = isset($maxActiveQuestCount) ? (int)$maxActiveQuestCount : 5;
$basicQuestLimitReached = $activeQuestCount >= $maxActiveQuestCount;
$basicHasPriorityOpen = quest_has_priority_open($basicQuests);
$basicOpenedFirstAvailable = false;
?>

<section class="quest-section">
    <div class="quest-section__intro">
        <h3>Basic Quests</h3>
        <p>Active quests: <?php echo (int)$activeQuestCount; ?> / <?php echo (int)$maxActiveQuestCount; ?></p>
    </div>

    <div class="quest-basic-list">
        <?php foreach ($basicQuests as $quest) { ?>
            <?php
                $statusData = quest_status_data($quest);
                $isAccepted = $statusData['isAccepted'];
                $isCompleted = $statusData['isCompleted'];
                $isReady = $statusData['isReady'];
                $isOpen = quest_should_open_default($quest, $basicHasPriorityOpen, $basicOpenedFirstAvailable);
                $contentId = quest_card_dom_id('basic-quest-details', $quest);
            ?>
            <article class="basic-quest-card is-collapsible<?php echo $isOpen ? ' is-open' : ''; ?><?php echo $isReady ? ' is-ready' : ''; ?><?php echo $isCompleted ? ' is-completed' : ''; ?>" data-quest-card>
                <header class="basic-quest-card__header">
                    <button class="quest-card-toggle" type="button" data-quest-toggle aria-expanded="<?php echo $isOpen ? 'true' : 'false'; ?>" aria-controls="<?php echo quest_h($contentId); ?>">
                        <span class="quest-card-toggle__text">
                            <span class="basic-quest-card__category"><?php echo quest_h($quest['category']); ?></span>
                            <span class="quest-card-title"><?php echo quest_h($quest['title']); ?></span>
                            <span class="quest-card-summary"><?php echo quest_h(quest_progress_summary($quest['objectives'])); ?></span>
                        </span>
                        <span class="quest-card-toggle__icon" aria-hidden="true"></span>
                    </button>
                    <span class="quest-status <?php echo $statusData['class']; ?>"><?php echo $statusData['label']; ?></span>
                </header>

                <div class="basic-quest-card__content" id="<?php echo quest_h($contentId); ?>"<?php echo $isOpen ? '' : ' hidden'; ?>>
                    <div class="basic-quest-card__main">
                        <p class="quest-description"><?php echo quest_h($quest['description']); ?></p>

                        <div class="basic-objectives">
                            <?php foreach ($quest['objectives'] as $objective) { ?>
                                <div class="basic-objective<?php echo $objective['complete'] ? ' is-complete' : ''; ?>">
                                    <div class="basic-objective__labels">
                                        <span><?php echo quest_h($objective['label']); ?></span>
                                        <strong><?php echo number_format((int)$objective['current']); ?> / <?php echo number_format((int)$objective['required']); ?></strong>
                                    </div>
                                    <div class="quest-progress__track">
                                        <div class="quest-progress__fill<?php echo $objective['complete'] ? ' is-complete' : ''; ?>" style="width: <?php echo (float)$objective['percent']; ?>%;"></div>
                                    </div>
                                </div>
                            <?php } ?>
                        </div>
                    </div>

                    <aside class="basic-quest-card__side">
                        <div class="quest-rewards quest-rewards--vertical">
                            <div><span>Credits</span><strong><?php echo number_format((int)$quest['reward_credits']); ?></strong></div>
                            <div><span>Uridium</span><strong><?php echo number_format((int)$quest['reward_uridium']); ?></strong></div>
                        </div>

                        <?php if ($isCompleted) { ?>
                            <div class="quest-button quest-button--completed">Completed</div>
                        <?php } elseif ($isReady) { ?>
                            <form method="post" class="quest-action-form">
                                <input type="hidden" name="csrf_token" value="<?php echo quest_h($questToken); ?>" />
                                <input type="hidden" name="quest_action" value="claim_basic" />
                                <input type="hidden" name="quest_code" value="<?php echo quest_h($quest['code']); ?>" />
                                <button class="quest-button quest-button--claim" type="submit">Claim Reward</button>
                            </form>
                        <?php } elseif ($isAccepted) { ?>
                            <form method="post" class="quest-action-form">
                                <input type="hidden" name="csrf_token" value="<?php echo quest_h($questToken); ?>" />
                                <input type="hidden" name="quest_action" value="abort_basic" />
                                <input type="hidden" name="quest_code" value="<?php echo quest_h($quest['code']); ?>" />
                                <button class="quest-button quest-button--abort" type="submit">Abort Quest</button>
                            </form>
                        <?php } elseif ($basicQuestLimitReached) { ?>
                            <div class="quest-button quest-button--locked">Limit reached</div>
                        <?php } else { ?>
                            <form method="post" class="quest-action-form">
                                <input type="hidden" name="csrf_token" value="<?php echo quest_h($questToken); ?>" />
                                <input type="hidden" name="quest_action" value="accept_basic" />
                                <input type="hidden" name="quest_code" value="<?php echo quest_h($quest['code']); ?>" />
                                <button class="quest-button" type="submit">Accept Quest</button>
                            </form>
                        <?php } ?>
                    </aside>
                </div>
            </article>
        <?php } ?>
    </div>
</section>
