<?php if (!isset($huntingContracts)) { $huntingContracts = []; } ?>

<section class="quest-section">
    <div class="quest-section__intro">
        <h3>Hunting Contracts</h3>
        <p>Your current NPC achievement system is kept here. Complete each alien contract up to level 10.</p>
    </div>

    <div class="quest-card-grid quest-card-grid--contracts">
        <?php foreach ($huntingContracts as $contract) { ?>
            <article class="quest-card<?php echo $contract['can_claim'] ? ' is-ready' : ''; ?><?php echo $contract['is_maxed'] ? ' is-completed' : ''; ?>">
                <header class="quest-card__header">
                    <div>
                        <h4><?php echo quest_h($contract['npc']); ?></h4>
                        <span class="quest-card__meta"><?php echo $contract['is_maxed'] ? 'Mastered' : 'Level ' . (int)$contract['level'] . '/10'; ?></span>
                    </div>
                    <span class="quest-status <?php echo $contract['is_maxed'] ? 'quest-status--completed' : ($contract['can_claim'] ? 'quest-status--ready' : 'quest-status--progress'); ?>">
                        <?php echo $contract['is_maxed'] ? 'Completed' : ($contract['can_claim'] ? 'Ready' : 'In progress'); ?>
                    </span>
                </header>

                <div class="quest-card__body">
                    <?php if ($contract['is_maxed']) { ?>
                        <p class="quest-description">All contracts for this alien species have been completed.</p>
                    <?php } else { ?>
                        <p class="quest-description">Destroy <?php echo number_format((int)$contract['goal']); ?> <?php echo quest_h($contract['npc']); ?> units.</p>

                        <div class="quest-rewards">
                            <div><span>Credits</span><strong><?php echo number_format((int)$contract['reward_credits']); ?></strong></div>
                            <div><span>Uridium</span><strong><?php echo number_format((int)$contract['reward_uridium']); ?></strong></div>
                            <div><span>Honor</span><strong><?php echo number_format((int)$contract['reward_honor']); ?></strong></div>
                            <div><span>XP</span><strong><?php echo number_format((int)$contract['reward_experience']); ?></strong></div>
                        </div>

                        <div class="quest-progress">
                            <div class="quest-progress__labels">
                                <span>Progress</span>
                                <span><?php echo number_format((int)$contract['progress']); ?> / <?php echo number_format((int)$contract['goal']); ?></span>
                            </div>
                            <div class="quest-progress__track">
                                <div class="quest-progress__fill<?php echo $contract['can_claim'] ? ' is-complete' : ''; ?>" style="width: <?php echo (float)$contract['percent']; ?>%;"></div>
                            </div>
                        </div>

                        <?php if ($contract['can_claim']) { ?>
                            <form method="post" class="quest-action-form">
                                <input type="hidden" name="csrf_token" value="<?php echo quest_h($questToken); ?>" />
                                <input type="hidden" name="quest_action" value="claim_contract" />
                                <input type="hidden" name="npc_name" value="<?php echo quest_h($contract['npc']); ?>" />
                                <button class="quest-button quest-button--claim" type="submit">Claim Reward</button>
                            </form>
                        <?php } else { ?>
                            <div class="quest-button quest-button--locked">In progress</div>
                        <?php } ?>
                    <?php } ?>
                </div>
            </article>
        <?php } ?>
    </div>
</section>
