<?php



$sth = $db->prepare("SELECT tokens, tickets FROM users_infos WHERE id = :id LIMIT 1");
$sth->execute([':id' => $_SESSION['player_id']]);
$datauserInfos = $sth->fetchAll();
$tokens  = $datauserInfos[0]['tokens'] ?? 0;




$sth = $db->prepare("
    SELECT
        username, grade, factionid, clanid, credits, uridium, rankpoints, user_kill, npc_kill,
        experience, honor,
        max_hp, speed, damages, max_shield, drones, apis_built, zeus_built,
        dmg_lvl, hp_lvl, shd_lvl, speed_lvl, logfiles, booty_keys, drone_parts, skilltree,
        booster_dmg_time, booster_shd_time, booster_spd_time, booster_npc_time,
        booster_hp_time,
        active_config,
        shipid AS shipId
    FROM users
    WHERE id = :id
    LIMIT 1
");
$sth->execute([':id' => $_SESSION['player_id']]);
$datauser = $sth->fetchAll();

if (empty($datauser)) {
    echo "<div class='msg-box error'>User not found.</div>";
    exit;
}
$u = $datauser[0];




$userclan = '';
$userclanTag = '';
if ((int)$u['clanid'] !== 0) {
    $sth = $db->prepare("SELECT clan_name, clan_tag FROM clan WHERE id = :clanid LIMIT 1");
    $sth->execute([':clanid' => $u['clanid']]);
    $dataclan = $sth->fetchAll();
    if (!empty($dataclan)) {
        $userclan = $dataclan[0]['clan_name'];
        
        $userclanTag = '[' . $dataclan[0]['clan_tag'] . ']';
    }
}




$rank_name = [
    1 => "Basic Space Pilot", 2 => "Space Pilot", 3 => "Chief Space Pilot", 4 => "Basic Sergeant", 5 => "Sergeant", 6 => "Chief Sergeant",
    7 => "Basic Lieutenant", 8 => "Lieutenant", 9 => "Chief Lieutenant", 10 => "Basic Captain", 11 => "Captain", 12 => "Chief Captain",
    13 => "Basic Major", 14 => "Major", 15 => "Chief Major", 16 => "Basic Colonel", 17 => "Colonel", 18 => "Chief Colonel",
    19 => "Basic General", 20 => "General", 21 => "Game Administrator", 22 => "Outlaw", 23 => "Supreme General"
];
if ((int)$u['grade'] < 20) {
    $rank_after = $db->prepare("SELECT rankpoints FROM users WHERE grade > " . (int)$u['grade'] . " AND factionid=" . (int)$u['factionid'] . " ORDER BY rankpoints ASC LIMIT 1");
    $rank_after->execute();
    $data_rank = $rank_after->fetch();
    $nextrankpoints = isset($data_rank['rankpoints']) ? number_format($data_rank['rankpoints']) : 'N/A';
} else {
    $nextrankpoints = 'Max Rank';
}




$shipDesignId = max(1, (int)($u['shipId'] ?? 1));
?>

<style>
    .dashboard-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        align-items: start;
    }
    @media (max-width: 950px) {
        .dashboard-grid { grid-template-columns: 1fr; }
    }

    /* CARTES */
    .profile-card {
        background: var(--color-surface, #0b1221);
        border: 1px solid var(--color-border, #1e293b);
        border-radius: 8px;
        padding: 0;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    .card-header {
        background: rgba(8, 14, 26, 0.6);
        border-bottom: 1px solid var(--color-border, #1e293b);
        padding: 1rem 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .card-title {
        color: var(--color-accent, #5eead4);
        font-weight: 700;
        text-transform: uppercase;
        font-size: 1.1rem;
        margin: 0;
    }

    .card-body {
        padding: 1.5rem;
    }

    /* IDENTITÉ (Nouvelle mise en page style DO) */
    .pilot-header {
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px dashed rgba(255,255,255,0.1);
    }
    
    .pilot-name-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1.3rem;
        color: #fff;
        margin-bottom: 8px;
        font-weight: bold;
    }
    
    .clan-tag { color: #94a3b8; font-weight: 600; }
    .company-mini-icon { height: 24px; width: auto; vertical-align: middle; }
    
    .pilot-rank-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        color: #cbd5e1;
    }
    .rank-icon { height: 18px; width: auto; }
    .rank-icon[src$="ranks/23.png"] { transform: translateX(-5px); }

    /* STATS LISTE */
    .stats-list { display: flex; flex-direction: column; gap: 0.8rem; }
    .stat-row { 
        display: flex; justify-content: space-between; 
        padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 4px;
        font-size: 0.9rem;
    }
    .stat-row:hover { background: rgba(255,255,255,0.06); }
    .stat-label { color: #94a3b8; }
    .stat-val { color: #fff; font-weight: 600; }
    .currency-val { color: var(--color-accent, #5eead4); }

    .dashboard-grid { grid-template-columns: 1fr; }
    .dashboard-grid .stats-list { display:grid; grid-template-columns:1fr 1fr; column-gap:28px; }
    .dashboard-grid .stat-row { margin:0!important; padding:8px 12px!important; border:0!important; }
    @media(max-width:700px){ .dashboard-grid .stats-list { grid-template-columns:1fr; } }
</style>

<?php include __DIR__.'/ship_panel.php'; ?>
<div class="dashboard-grid">
    
    <div class="profile-card">
        <div class="card-header">
            <h2 class="card-title">Pilot Profile</h2>
            <span style="color:#64748b; font-size:0.9rem;">ID: <?=$_SESSION['player_id']?></span>
        </div>
        <div class="card-body">
            
            <div class="pilot-header">
                <div class="pilot-name-row">
                    <?php if(!empty($userclanTag)): ?>
                        <span class="clan-tag"><?= $userclanTag ?></span>
                    <?php endif; ?>
                    
                    <span class="pilot-username"><?= htmlspecialchars($u['username']) ?></span>
                    
                    <img src="img/ranks/company/<?=$u['factionid']?>.png" class="company-mini-icon" alt="Company">
                </div>

                <div class="pilot-rank-row">
                    <img src="img/ranks/<?=$u['grade']?>.png" class="rank-icon" alt="Rank">
                    <span><?= $rank_name[$u['grade']] ?></span>
                </div>
            </div>

            <div class="stats-list">
                <div class="stat-row">
                    <span class="stat-label">Experience</span>
                    <span class="stat-val"><?= number_format($u['experience']) ?></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Honor</span>
                    <span class="stat-val"><?= number_format($u['honor']) ?></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Rank Points</span>
                    <span class="stat-val"><?= number_format($u['rankpoints']) ?></span>
                </div>
                <div class="stat-row" style="margin-top:10px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:15px;">
                    <span class="stat-label">Credits</span>
                    <span class="stat-val currency-val"><?= number_format($u['credits']) ?> C.</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Uridium</span>
                    <span class="stat-val currency-val" style="color:#fff;"><?= number_format($u['uridium']) ?> U.</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Booty Keys</span>
                    <span class="stat-val"><?= number_format($u['booty_keys']) ?></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Logfiles</span>
                    <span class="stat-val"><?= number_format($u['logfiles']) ?></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Tokens</span>
                    <span class="stat-val" style="color:#facc15;"><?= $tokens ?></span>
                </div>
            </div>

        </div>
    </div>

</div>
