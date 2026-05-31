<?php

require_once __DIR__ . '/../../libs/ShopPurchaseService.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}

$sth = $db->prepare("SELECT username, grade, factionid, clanid, credits, uridium, rankpoints, user_kill, npc_kill, max_hp, speed, damages, 
max_shield, drones, apis_built, zeus_built, dmg_lvl, hp_lvl, shd_lvl, speed_lvl, logfiles, booty_keys, drone_parts, skilltree, booster_dmg_time,
booster_shd_time, booster_spd_time, booster_npc_time, shipId 
FROM users WHERE id = :id LIMIT 1");
$sth->execute(array(':id' => $_SESSION['player_id']));
$datauser = $sth->fetchAll();

require_once('./libs/Laboratory.php');
$lab = new Laboratory($_SESSION['player_id'], $datauser[0]['skilltree'], $datauser[0]['logfiles'], $db );


$message_status = "";
$message_type = "";

if (!empty($_SESSION['upgrade_flash']) && is_array($_SESSION['upgrade_flash'])) {
    $message_status = (string)($_SESSION['upgrade_flash']['message'] ?? '');
    $message_type = (string)($_SESSION['upgrade_flash']['type'] ?? 'success');
    unset($_SESSION['upgrade_flash']);
}

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

if(isset($_GET['buy'])) {
    $buymessage = buy($_GET['buy'],$datauser,$lab,$db);
    $type = (strpos($buymessage, 'Error') !== false) ? 'error' : 'success';

    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }
    $_SESSION['upgrade_flash'] = [
        'message' => $buymessage,
        'type' => $type,
    ];

    header('Location: view.php?page=user&tab=upgrades');
    exit;
}


function buy($item,$datauser,$lab,$db)
{
    
    if($item == 'healt_upgrade')
    {
        $service = new ShopPurchaseService($db, (int)$_SESSION['player_id']);
        return $service->buyHpUpgrade();
    }
    
    
    else if(in_array($item, ['dmgskill','shd_absskill','repskill','smbskill','shregskill']))
    {
        $skill_map = [
            'dmgskill' => 'dmg',
            'shd_absskill' => 'shd_abs',
            'repskill' => 'rep',
            'smbskill' => 'smb',
            'shregskill' => 'shreg'
            
            
        ];

        
        if (!isset($skill_map[$item])) return "Error: Invalid Skill";

        $skill = $skill_map[$item];
        if($lab->buy_skill($skill)) {
            return "Purchase success !";
        } else {
            return "Error : Not enough logfiles or maximum level reached!";
        }
    }
    return "Error: Unknown item";
}
?>

<style>
    :root {
        --color-surface: #0b1221;
        --color-border: #1e293b;
        --color-accent: #5eead4; /* Cyan theme */
        --color-success: #4ade80; /* Green theme */
        --color-danger: #f87171; /* Red theme */
        --color-text-muted: #94a3b8;
    }

    /* Layout général */
    .upgrades-layout {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    /* Cartes principales */
    .upgrade-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }

    .card-header {
        background: rgba(8, 14, 26, 0.6);
        border-bottom: 1px solid var(--color-border);
        padding: 1rem 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .card-title {
        color: var(--color-accent);
        font-weight: 700;
        text-transform: uppercase;
        font-size: 1.1rem;
        margin: 0;
    }

    .card-body {
        padding: 1.5rem;
    }

    /* Grille des Skills */
    .skills-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.5rem;
    }

    /* Élément Skill individuel */
    .skill-item {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 6px;
        padding: 1.2rem;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        transition: transform 0.2s, background 0.2s, border-color 0.2s;
    }
    .skill-item:hover {
        background: rgba(255,255,255,0.05);
        border-color: rgba(94, 234, 212, 0.3);
        transform: translateY(-2px);
    }

    .skill-header {
        margin-bottom: 5px;
    }
    .skill-name {
        font-weight: bold;
        color: #fff;
        font-size: 1.1rem;
        display: block;
    }

    .skill-desc {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        min-height: 40px;
        line-height: 1.4;
    }

    /* --- Indicateurs à "Pips" (Points) --- */
    .skill-status-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 10px 0 15px 0;
        padding: 8px 12px;
        background: rgba(0,0,0,0.2);
        border-radius: 4px;
    }

    .level-text {
        font-family: 'Courier New', monospace; /* Police technique */
        font-weight: bold;
        color: var(--color-accent);
        font-size: 0.9rem;
    }

    .pips-visual {
        display: flex;
        gap: 6px; 
    }

    .pip {
        width: 10px;
        height: 10px;
        border-radius: 2px; 
        border: 1px solid var(--color-border);
        background: rgba(255,255,255,0.05);
        transition: all 0.3s ease;
    }

    .pip.active {
        background: var(--color-accent);
        border-color: var(--color-accent);
        box-shadow: 0 0 8px var(--color-accent);
    }
    
    /* Variante verte pour la santé */
    .pip.health-type.active {
        background: var(--color-success);
        border-color: var(--color-success);
        box-shadow: 0 0 8px var(--color-success);
    }

    /* Boutons */
    .btn-upgrade {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 10px 15px;
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid var(--color-accent);
        color: #fff;
        text-decoration: none;
        border-radius: 4px;
        font-size: 0.9rem;
        font-weight: 600;
        transition: all 0.2s;
    }
    .btn-upgrade:hover {
        background: var(--color-accent);
        color: #0b1221;
        box-shadow: 0 0 15px rgba(94, 234, 212, 0.3);
    }
    /* Variante bouton vert pour la santé */
    .btn-upgrade.btn-health {
         border-color: var(--color-success);
    }
    .btn-upgrade.btn-health:hover {
         background: var(--color-success);
          box-shadow: 0 0 15px rgba(74, 222, 128, 0.3);
    }

    .btn-upgrade.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        border-color: var(--color-border) !important;
        background: transparent !important;
        color: var(--color-text-muted) !important;
        pointer-events: none;
        box-shadow: none !important;
    }
    .cost-badge {
        font-size: 0.8rem;
        opacity: 0.9;
        font-weight: normal;
    }

    .btn-upgrade.has-tooltip {
        position: relative;
        overflow: visible;
    }
    .btn-upgrade.has-tooltip::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 50%;
        bottom: calc(100% + 10px);
        transform: translateX(-50%) translateY(4px);
        background: rgba(6, 12, 22, 0.96);
        border: 1px solid var(--color-border, #1e293b);
        color: #e2e8f0;
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        line-height: 1.35;
        width: max-content;
        max-width: 220px;
        text-align: center;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
        z-index: 50;
        box-shadow: 0 8px 18px rgba(0,0,0,0.28);
    }
    .btn-upgrade.has-tooltip::before {
        content: '';
        position: absolute;
        left: 50%;
        bottom: calc(100% + 4px);
        transform: translateX(-50%);
        border: 6px solid transparent;
        border-top-color: var(--color-border, #1e293b);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease, visibility 0.15s ease;
        z-index: 49;
        pointer-events: none;
    }
    .btn-upgrade.has-tooltip:hover::after,
    .btn-upgrade.has-tooltip:hover::before {
        opacity: 1;
        visibility: visible;
    }
    .btn-upgrade.has-tooltip:hover::after {
        transform: translateX(-50%) translateY(0);
    }

    /* Messages */
    .msg-box {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
        text-align: center;
        font-weight: bold;
    }
    .msg-success { background: rgba(74, 222, 128, 0.1); border: 1px solid var(--color-success); color: var(--color-success); }
    .msg-error { background: rgba(248, 113, 113, 0.1); border: 1px solid var(--color-danger); color: var(--color-danger); }

</style>

<div class="upgrades-layout">

    <?php if(!empty($message_status)): ?>
        <div class="msg-box <?= ($message_type == 'success') ? 'msg-success' : 'msg-error' ?>">
            <?= htmlspecialchars($message_status) ?>
        </div>
    <?php endif; ?>

    <div class="upgrade-card">
        <div class="card-header">
            <h2 class="card-title" style="color: var(--color-success);">Ship Integrity</h2>
            <div style="color: var(--color-text-muted); font-size: 0.9rem;">
                Resources: <span style="color:#fff;"><?= number_format($datauser[0]['uridium']) ?> U.</span>
            </div>
        </div>
        <div class="card-body">
            
            <?php
                
                $currentHpLvl = $datauser[0]['hp_lvl'];
                $maxHpLvl = 10; 
                $hpPrice = pow($currentHpLvl * 20, 2) + 100;
                $isMaxed = ($currentHpLvl >= $maxHpLvl);
            ?>

            <div class="skill-item" style="border-color: rgba(74, 222, 128, 0.2);">
                <div class="skill-header">
                    <span class="skill-name">Hull Reinforced Plating</span>
                </div>
                <p class="skill-desc">
                    Reinforces the ship's structure layout. Increases base Hitpoints by <strong style="color:var(--color-success);">+5,000</strong> per level.
                </p>
                
                <div class="skill-status-container">
                    <span class="level-text" style="color: var(--color-success);">Level <?= $currentHpLvl ?> / <?= $maxHpLvl ?></span>
                    <div class="pips-visual">
                        <?php for($i = 1; $i <= $maxHpLvl; $i++): ?>
                            <div class="pip health-type <?= ($i <= $currentHpLvl) ? 'active' : '' ?>"></div>
                        <?php endfor; ?>
                    </div>
                </div>

                <?php if(!$isMaxed): ?>
                    <a href="view.php?page=user&tab=upgrades&buy=healt_upgrade" class="btn-upgrade btn-health">
                        <span>UPGRADE HULL</span>
                        <span class="cost-badge"><?= number_format($hpPrice) ?> Uridium</span>
                    </a>
                <?php else: ?>
                    <div class="btn-upgrade disabled">
                        <span>MAXIMUM LEVEL REACHED</span>
                    </div>
                <?php endif; ?>
            </div>

        </div>
    </div>

    <div class="upgrade-card">
        <div class="card-header">
            <h2 class="card-title">Tech Laboratory</h2>
            <div style="color: var(--color-text-muted); font-size: 0.9rem;">
                Resources: <span style="color:#fff;"><?= number_format($datauser[0]['logfiles']) ?> Logfiles</span>
            </div>
        </div>
        <div class="card-body">
            
            <div class="skills-grid">

                <?php
                
                
                $skillsConfig = [
                    [ 'id' => 'dmg', 'buy_code' => 'dmgskill', 'name' => 'Laser Engineering', 'max' => 5, 'desc_key' => 'dmg' ],
                    
                    [ 'id' => 'shd_abs', 'buy_code' => 'shd_absskill', 'name' => 'Shield Mechanics', 'max' => 3, 'desc_key' => 'shd_abs' ],
                    [ 'id' => 'shreg', 'buy_code' => 'shregskill', 'name' => 'Shield Regeneration', 'max' => 5, 'desc_key' => 'shreg' ],
                    
                    [ 'id' => 'rep', 'buy_code' => 'repskill', 'name' => 'Repair Bot Tech', 'max' => 3, 'desc_key' => 'rep' ],
                    [ 'id' => 'smb', 'buy_code' => 'smbskill', 'name' => 'Smartbomb Tech', 'max' => 2, 'desc_key' => 'smb' ]
                ];

                foreach($skillsConfig as $sk):
                    $currentLvl = $lab->skills[$sk['id']];
                    $maxLvl = $sk['max'];
                    
                    
                    $price = method_exists($lab, 'get_skill_Prix') ? $lab->get_skill_Prix($sk['id']) : "???"; 
                    
                    
                    $description = $lab->get_skill_description($sk['desc_key']);

                    
                    if($sk['id'] === 'dmg') {
                        $description = "Increases Laser Damage on NPCs and Players by <strong style='color:#fff'>2%</strong> per level (Max 10%).";
                    }

                    $isSkillMaxed = ($currentLvl >= $maxLvl);
                ?>

                <div class="skill-item">
                    <div class="skill-header">
                        <span class="skill-name"><?= $sk['name'] ?></span>
                    </div>
                    
                    <div class="skill-desc"><?= $description ?></div>

                     <div class="skill-status-container">
                        <span class="level-text">Lvl <?= $currentLvl ?> / <?= $maxLvl ?></span>
                        <div class="pips-visual">
                             <?php for($i = 1; $i <= $maxLvl; $i++): ?>
                                <div class="pip <?= ($i <= $currentLvl) ? 'active' : '' ?>"></div>
                            <?php endfor; ?>
                        </div>
                    </div>

                    <?php if(!$isSkillMaxed): ?>
                        <a href="view.php?page=user&tab=upgrades&buy=<?= $sk['buy_code'] ?>" class="btn-upgrade has-tooltip" data-tooltip="You currently have <?= number_format($datauser[0]['logfiles']) ?> Logfiles.">
                            <span>RESEARCH</span>
                            <span class="cost-badge"><?= number_format((float)$price) ?> Logfiles</span>
                        </a>
                    <?php else: ?>
                        <div class="btn-upgrade disabled">
                            <span>RESEARCH COMPLETED</span>
                        </div>
                    <?php endif; ?>
                </div>

                <?php endforeach; ?>

            </div> </div>
    </div>
</div>