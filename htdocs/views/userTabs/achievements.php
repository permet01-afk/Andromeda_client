<?php




include_once 'libs/database.php';
include_once 'config/database.php';


if (!isset($db)) {
    $db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);
}

$npc_names = [
  'Streuner', 'Lordakia', 'Saimon', 'Mordon', 'Devolarium',
  'Sibelon', 'Sibelonit', 'Lordakium', 'Kristallin', 'Kristallon', 'Cubikon'
];

$CLAIM_BONUS = 1.25; 


$npc_data = [];
$npc_data['Streuner']   = [15, 400,     1,    1,     400,     2];
$npc_data['Lordakia']   = [15, 800,     2,    2,     800,     4];
$npc_data['Saimon']     = [15, 1600,    4,    3,     1600,    8];
$npc_data['Mordon']     = [15, 6400,    8,    8,     3200,    16];
$npc_data['Devolarium'] = [10, 51200,   16,   32,    6400,    32];
$npc_data['Sibelonit']  = [15, 12800,   12,   16,    3200,    16];
$npc_data['Sibelon']    = [5,  102400,  32,   64,    12800,   64];
$npc_data['Lordakium']  = [8,  204800,  64,   128,   25600,   128];
$npc_data['Kristallin'] = [15, 12800,   16,   16,    6400,    32];
$npc_data['Kristallon'] = [8,  409600,  128,  256,   51200,   256];
$npc_data['Cubikon']    = [5,  1638400, 1024, 4096,  512000,  4096];


function get_lvl_npc_count($k, $lvl) {
    return (int)floor($k * pow($lvl, 3));
}

function get_cumulative_lvl_npc_count($k, $lvl) {
    if ($lvl == 0) return 0;
    $count = 0;
    for ($i = 1; $i <= $lvl; $i++) {
        $count += get_lvl_npc_count($k, $i);
    }
    return $count;
}




if (isset($_GET['claim'])) {
    $npc_name = urldecode($_GET['claim']);
    
    if (in_array($npc_name, $npc_names)) {
        
        $sql = "SELECT " . $npc_name . " FROM users_npc_counts WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $_SESSION['player_id']]);
        $current_kills = $stmt->fetchColumn();

        $sql = "SELECT " . $npc_name . " FROM users_npc_lvl WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $_SESSION['player_id']]);
        $current_lvl = $stmt->fetchColumn();

        
        $k = $npc_data[$npc_name][0];
        $needed_total = get_cumulative_lvl_npc_count($k, $current_lvl) + get_lvl_npc_count($k, $current_lvl + 1);

        if ($current_kills >= $needed_total && $current_lvl < 10) {
            
            $goal = get_lvl_npc_count($k, $current_lvl + 1);
            $reward_credits = $goal * $npc_data[$npc_name][1] * $CLAIM_BONUS;
            $reward_uridium = $goal * $npc_data[$npc_name][2] * $CLAIM_BONUS;
            $reward_exp     = $goal * $npc_data[$npc_name][4] * $CLAIM_BONUS;
            $reward_honor   = $goal * $npc_data[$npc_name][5] * $CLAIM_BONUS;

            
            $db->prepare("UPDATE users_npc_lvl SET " . $npc_name . " = " . $npc_name . " + 1 WHERE id = :id")
               ->execute([':id' => $_SESSION['player_id']]);

            $db->prepare("UPDATE users SET credits = credits + :cr, uridium = uridium + :uri, experience = experience + :exp, honor = honor + :hon WHERE id = :id")
               ->execute([
                   ':cr' => $reward_credits,
                   ':uri' => $reward_uridium,
                   ':exp' => $reward_exp,
                   ':hon' => $reward_honor,
                   ':id' => $_SESSION['player_id']
               ]);

            
            header('Location: view.php?page=user&tab=achievements');
            exit;
        }
    }
}




$sth = $db->prepare("SELECT * FROM users_npc_counts WHERE id = :id LIMIT 1");
$sth->execute([':id' => $_SESSION['player_id']]);
$npc_count = $sth->fetch(PDO::FETCH_ASSOC);

$sth = $db->prepare("SELECT * FROM users_npc_lvl WHERE id = :id LIMIT 1");
$sth->execute([':id' => $_SESSION['player_id']]);
$npc_lvl = $sth->fetch(PDO::FETCH_ASSOC);

if (!$npc_count || !$npc_lvl) {
    
    $db->prepare("INSERT IGNORE INTO users_npc_counts (id) VALUES (:id)")->execute([':id' => $_SESSION['player_id']]);
    $db->prepare("INSERT IGNORE INTO users_npc_lvl (id) VALUES (:id)")->execute([':id' => $_SESSION['player_id']]);
    echo "<script>window.location.reload();</script>";
}
?>

<style>
    :root {
        --color-surface: #0b1221;
        --color-border: #1e293b;
        --color-accent: #5eead4;
        --color-accent-dim: rgba(94, 234, 212, 0.1);
        --color-gold: #fbbf24;
    }

    .achievements-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: 20px;
        padding: 20px 0;
    }

    /* QUEST CARD */
    .quest-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        overflow: hidden;
        position: relative;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        transition: transform 0.2s, border-color 0.2s;
        display: flex;
        flex-direction: column;
    }

    .quest-card:hover {
        border-color: #334155;
        transform: translateY(-2px);
    }

    .quest-card.ready {
        border-color: var(--color-gold);
        box-shadow: 0 0 15px rgba(251, 191, 36, 0.2);
    }

    /* HEADER */
    .quest-header {
        background: rgba(15, 23, 42, 0.8);
        padding: 15px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .quest-info h3 {
        margin: 0;
        font-size: 1.2rem;
        color: #fff;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .quest-lvl {
        font-size: 0.9rem;
        color: var(--color-accent);
        font-weight: bold;
    }

    /* BODY */
    .quest-body {
        padding: 15px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .quest-desc {
        color: #94a3b8;
        font-size: 0.9rem;
        margin-bottom: 15px;
        line-height: 1.4;
    }

    /* REWARDS TABLE */
    .quest-rewards {
        background: rgba(0,0,0,0.2);
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 15px;
        font-size: 0.8rem;
    }
    .reward-row { display: flex; justify-content: space-between; color: #cbd5e1; margin-bottom: 3px; }
    .reward-val { font-weight: bold; color: #fff; }
    .reward-uri { color: #fff; text-shadow: 0 0 5px rgba(255,255,255,0.5); }

    /* PROGRESS BAR */
    .progress-container {
        margin-bottom: 15px;
    }
    .progress-labels {
        display: flex; justify-content: space-between;
        font-size: 0.8rem; color: #cbd5e1; margin-bottom: 5px;
    }
    .progress-track {
        height: 8px;
        background: #1e293b;
        border-radius: 4px;
        overflow: hidden;
    }
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-accent), #3b82f6);
        border-radius: 4px;
        transition: width 0.5s ease;
    }
    .progress-fill.complete {
        background: linear-gradient(90deg, #facc15, #fbbf24);
    }

    /* BUTTONS */
    .btn-claim {
        display: block;
        width: 100%;
        text-align: center;
        background: linear-gradient(135deg, #facc15, #b45309);
        color: #fff;
        font-weight: bold;
        text-transform: uppercase;
        padding: 10px;
        border-radius: 4px;
        text-decoration: none;
        box-shadow: 0 4px 10px rgba(251, 191, 36, 0.4);
        border: 1px solid #fbbf24;
    }
    .btn-claim:hover { filter: brightness(1.1); }

    .btn-locked {
        display: block;
        width: 100%;
        text-align: center;
        background: rgba(255,255,255,0.05);
        color: #64748b;
        font-size: 0.85rem;
        padding: 10px;
        border-radius: 4px;
        border: 1px solid var(--color-border);
        cursor: not-allowed;
    }
</style>

<div class="CMSContent">
    
    <div style="background: rgba(8,14,26,0.8); padding: 15px; border-bottom: 1px solid #1e293b; margin-bottom: 20px;">
        <h2 style="color: var(--color-accent); margin:0 0 5px 0;">Pilot Achievements</h2>
        <p style="color: #94a3b8; margin:0; font-size:0.9rem;">Complete hunting contracts to earn Uridium, Credits, and Honor.</p>
    </div>

    <div class="achievements-grid">
        <?php foreach ($npc_names as $npc_name): ?>
            <?php
                
                $lvl = (int)($npc_lvl[$npc_name] ?? 0);
                $total_kills = (int)($npc_count[$npc_name] ?? 0);
                $k = (int)$npc_data[$npc_name][0];

                
                $goal = get_lvl_npc_count($k, $lvl + 1);
                
                
                $kills_before_this_level = get_cumulative_lvl_npc_count($k, $lvl);
                $progress_in_current_level = $total_kills - $kills_before_this_level;
                
                
                
                $display_progress = max(0, min($progress_in_current_level, $goal));
                
                
                $pct = ($goal > 0) ? ($display_progress / $goal) * 100 : 0;
                if ($pct > 100) $pct = 100;

                
                
                $can_claim = ($progress_in_current_level >= $goal && $lvl < 10);
                $is_maxed = ($lvl >= 10);

                
                $r_cre = number_format($goal * $npc_data[$npc_name][1] * $CLAIM_BONUS);
                $r_uri = number_format($goal * $npc_data[$npc_name][2] * $CLAIM_BONUS);
                $r_exp = number_format($goal * $npc_data[$npc_name][4] * $CLAIM_BONUS);
                $r_hon = number_format($goal * $npc_data[$npc_name][5] * $CLAIM_BONUS);
            ?>

            <div class="quest-card <?= $can_claim ? 'ready' : '' ?>">
                <div class="quest-header">
                    <div class="quest-info">
                        <h3><?= $npc_name ?></h3>
                    </div>
                    <div class="quest-lvl"><?= $is_maxed ? 'MASTERED' : 'Level ' . $lvl . '/10' ?></div>
                </div>

                <div class="quest-body">
                    <?php if ($is_maxed): ?>
                        <div class="quest-desc" style="color:#10b981;">
                            All contracts for this alien species have been completed. Superiority achieved.
                        </div>
                    <?php else: ?>
                        <div class="quest-desc">
                            <strong>Mission:</strong> Exterminate 
                            <span style="color:#fff"><?= number_format($goal) ?></span> units.
                            <br>Target: <?= $npc_name ?>.
                        </div>

                        <div class="quest-rewards">
                            <div class="reward-row"><span>Credits:</span> <span class="reward-val"><?= $r_cre ?></span></div>
                            <div class="reward-row"><span>Uridium:</span> <span class="reward-val reward-uri"><?= $r_uri ?></span></div>
                            <div class="reward-row"><span>Honor:</span> <span class="reward-val"><?= $r_hon ?></span></div>
                            <div class="reward-row"><span>XP:</span> <span class="reward-val"><?= $r_exp ?></span></div>
                        </div>

                        <div class="progress-container">
                            <div class="progress-labels">
                                <span>Progress</span>
                                <span><?= number_format($display_progress) ?> / <?= number_format($goal) ?></span>
                            </div>
                            <div class="progress-track">
                                <div class="progress-fill <?= $can_claim ? 'complete' : '' ?>" style="width: <?= $pct ?>%;"></div>
                            </div>
                        </div>

                        <?php if ($can_claim): ?>
                            <a href="view.php?page=user&tab=achievements&claim=<?= urlencode($npc_name) ?>" class="btn-claim">
                                Claim Reward
                            </a>
                        <?php else: ?>
                            <div class="btn-locked">IN PROGRESS</div>
                        <?php endif; ?>

                    <?php endif; ?>
                </div>
            </div>

        <?php endforeach; ?>
    </div>
</div>