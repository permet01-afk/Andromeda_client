<?php
if (!isset($basicQuests)) {
    $basicQuests = [];
}
$activeQuestCount = isset($activeQuestCount) ? (int)$activeQuestCount : 0;
$maxActiveQuestCount = isset($maxActiveQuestCount) ? (int)$maxActiveQuestCount : 5;
$questLimitReached = $activeQuestCount >= $maxActiveQuestCount;
?>

<section class="quest-section">
    <div class="quest-section__intro">
        <h3>Basic Quests</h3>
        <p>Early DarkOrbit-style assignments recovered from the external server quest data. Active Basic/PVP quests: <?php echo (int)$activeQuestCount; ?> / <?php echo (int)$maxActiveQuestCount; ?>.</p>
        <?php if ($questLimitReached) { ?>
            <p>Complete or claim one of your active Basic/PVP quests before accepting another one.</p>
        <?php } ?>
    </div>

    <div class="quest-basic-list">
        <?php foreach ($basicQuests as $quest) { ?>
            <?php
                $status = (string)$quest['status'];
                $isAccepted = $status === 'in_progress';
                $isCompleted = $status === 'completed';
                $isReady = $isAccepted && (bool)$quest['is_complete'];
                $statusClass = $isCompleted ? 'quest-status--completed' : ($isReady ? 'quest-status--ready' : ($isAccepted ? 'quest-status--progress' : 'quest-status--available'));
                $statusLabel = $isCompleted ? 'Completed' : ($isReady ? 'Ready' : ($isAccepted ? 'In progress' : 'Available'));
            ?>
            <article class="basic-quest-card<?php echo $isReady ? ' is-ready' : ''; ?><?php echo $isCompleted ? ' is-completed' : ''; ?>">
                <div class="basic-quest-card__main">
                    <header class="basic-quest-card__header">
                        <div>
                            <span class="basic-quest-card__category"><?php echo quest_h($quest['category']); ?></span>
                            <h4><?php echo quest_h($quest['title']); ?></h4>
                        </div>
                        <span class="quest-status <?php echo $statusClass; ?>"><?php echo $statusLabel; ?></span>
                    </header>

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
                        <div class="quest-button quest-button--locked">In progress</div>
                    <?php } elseif ($questLimitReached) { ?>
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
            </article>
        <?php } ?>
    </div>
</section>
