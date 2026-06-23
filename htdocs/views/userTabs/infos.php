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




$pid = (int)($_SESSION['player_id'] ?? 0);
$shipDesignId = (int)($u['shipId'] ?? 1);
if ($shipDesignId <= 0) $shipDesignId = 1;
$activeConfig = (int)($u['active_config'] ?? 1);
$activeName   = ($activeConfig === 2) ? 'B' : 'A';


$designStmt = $db->prepare("SELECT base_hp_2010, base_speed_2010, bonus_damage_pct, bonus_shield_pct FROM ship_design WHERE ship_design_id = :sid LIMIT 1");
$designStmt->execute([':sid' => $shipDesignId]);
$design = $designStmt->fetch(PDO::FETCH_ASSOC);

$baseHp2010    = (int)($design['base_hp_2010'] ?? 100000);
$baseSpeed2010 = (int)($design['base_speed_2010'] ?? 250);
$bonusDmgPct   = (int)($design['bonus_damage_pct'] ?? 0);
$bonusShdPct   = (int)($design['bonus_shield_pct'] ?? 0);


if ($baseHp2010 <= 0) $baseHp2010 = 100000;
if ($baseSpeed2010 <= 0) $baseSpeed2010 = 250;


$hpLvl = (int)($u['hp_lvl'] ?? 0);
if ($hpLvl < 0 || $hpLvl > 10) $hpLvl = 0;

$pilotBioActiveForStats = false;
$pilotBioLevelsForStats = [];
$pilotBioEffectsForStats = [];

try {
    $pilotBioStmt = $db->prepare("
        SELECT n.node_code, n.effect_values_json, COALESCE(l.level, 0) AS level
        FROM pilot_bio_nodes n
        INNER JOIN player_pilot_bio_state s ON s.user_id = :pid
        LEFT JOIN player_pilot_bio_levels l ON l.user_id = :pid AND l.node_code = n.node_code
        WHERE n.node_code IN ('ship_hull_i', 'ship_hull_ii', 'shield_engineering')
    ");
    $pilotBioStmt->execute([':pid' => $pid]);
    $pilotBioRows = $pilotBioStmt->fetchAll(PDO::FETCH_ASSOC);
    if (!empty($pilotBioRows)) {
        $pilotBioActiveForStats = true;
        foreach ($pilotBioRows as $pilotBioRow) {
            $pilotBioCode = (string)($pilotBioRow['node_code'] ?? '');
            if ($pilotBioCode === '') {
                continue;
            }
            $pilotBioLevelsForStats[$pilotBioCode] = max(0, (int)($pilotBioRow['level'] ?? 0));
            $decodedEffectValues = json_decode((string)($pilotBioRow['effect_values_json'] ?? ''), true);
            if (is_array($decodedEffectValues)) {
                $pilotBioEffectsForStats[$pilotBioCode] = array_values(array_map('intval', $decodedEffectValues));
            }
        }
    }
} catch (Throwable $e) {
    $pilotBioActiveForStats = false;
    $pilotBioLevelsForStats = [];
    $pilotBioEffectsForStats = [];
}

$getPilotBioHpValue = static function (string $nodeCode, int $level, array $fallbackValues) use ($pilotBioEffectsForStats): int {
    if ($level <= 0) {
        return 0;
    }
    $values = $pilotBioEffectsForStats[$nodeCode] ?? $fallbackValues;
    if (empty($values)) {
        return 0;
    }
    $index = min($level, count($values)) - 1;
    return (int)$values[$index];
};

$pilotBioHpBonus = 0;
if ($pilotBioActiveForStats) {
    $pilotBioHpBonus += $getPilotBioHpValue('ship_hull_i', min(2, (int)($pilotBioLevelsForStats['ship_hull_i'] ?? 0)), [5000, 10000]);
    $pilotBioHpBonus += $getPilotBioHpValue('ship_hull_ii', min(3, (int)($pilotBioLevelsForStats['ship_hull_ii'] ?? 0)), [5000, 15000, 50000]);
}

$getPilotBioPercentValue = static function (string $nodeCode, int $level, array $fallbackValues) use ($pilotBioEffectsForStats): int {
    if ($level <= 0) {
        return 0;
    }
    $values = $pilotBioEffectsForStats[$nodeCode] ?? $fallbackValues;
    if (empty($values)) {
        return 0;
    }
    $index = min($level, count($values)) - 1;
    return max(0, (int)$values[$index]);
};

$pilotBioShieldEngineeringPercent = 0;
if ($pilotBioActiveForStats) {
    $pilotBioShieldEngineeringPercent = $getPilotBioPercentValue('shield_engineering', min(5, (int)($pilotBioLevelsForStats['shield_engineering'] ?? 0)), [4, 8, 12, 18, 25]);
}

$shipHp = $baseHp2010 + ($pilotBioActiveForStats ? $pilotBioHpBonus : (5000 * $hpLvl));

$now = time();
$hasBoosterHp = ((int)($u['booster_hp_time'] ?? 0) > $now);
if ($hasBoosterHp) {
    $shipHp += (int)($shipHp * 0.10);
}


$speedLvl = (int)($u['speed_lvl'] ?? 0);
if ($speedLvl < 0 || $speedLvl > 5) $speedLvl = 0;
$fallbackSpeed = $baseSpeed2010 + (10 * $speedLvl);

$statsA = ['damage' => 0, 'shield' => 0, 'speed' => $fallbackSpeed];
$statsB = ['damage' => 0, 'shield' => 0, 'speed' => $fallbackSpeed];

$st = $db->prepare("SELECT sc.name, scs.damage_total, scs.shield_total, scs.speed_total FROM ship_config sc LEFT JOIN ship_config_stats scs ON scs.ship_config_id = sc.id AND scs.config = sc.name WHERE sc.player_id = :pid AND sc.ship_design_id = :sid AND sc.name IN ('A','B')");
$st->execute([':pid' => $pid, ':sid' => $shipDesignId]);
$rows = $st->fetchAll(PDO::FETCH_ASSOC);

$hasBoosterDmg = ((int)($u['booster_dmg_time'] ?? 0) > $now);
$hasBoosterShd = ((int)($u['booster_shd_time'] ?? 0) > $now);


$hasBoosterSpd = false;

foreach ($rows as $r) {
    $name = strtoupper($r['name'] ?? '');
    $dmg = (int)($r['damage_total'] ?? 0);
    $shd = (int)($r['shield_total'] ?? 0);
    $spd = (int)($r['speed_total'] ?? 0);
    if ($spd <= 0) $spd = $fallbackSpeed;
    if ($bonusDmgPct > 0) $dmg += (int)($dmg * ($bonusDmgPct / 100));
    if ($bonusShdPct > 0) $shd += (int)($shd * ($bonusShdPct / 100));
    if ($pilotBioShieldEngineeringPercent > 0) $shd = (int)round($shd * (1 + ($pilotBioShieldEngineeringPercent / 100)));
    if ($hasBoosterDmg) $dmg += (int)($dmg * 0.10);
    if ($hasBoosterShd) $shd += (int)($shd * 0.25);
    if ($hasBoosterSpd) $spd += 20;

    if ($name === 'A') $statsA = ['damage' => $dmg, 'shield' => $shd, 'speed' => $spd];
    if ($name === 'B') $statsB = ['damage' => $dmg, 'shield' => $shd, 'speed' => $spd];
}
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

    /* HANGAR */
    .ship-preview {
        background: radial-gradient(circle at center, #1e293b 0%, #0b1221 70%);
        height: 200px;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        border-bottom: 1px solid var(--color-border);
    }
    .ship-preview img {
        max-height: 140px;
        filter: drop-shadow(0 0 15px rgba(94, 234, 212, 0.3));
        transition: transform 0.3s;
    }
    .ship-preview:hover img { transform: scale(1.05); }

    .config-tabs {
        display: flex;
        background: rgba(0,0,0,0.3);
    }
    .cfg-btn {
        flex: 1;
        background: transparent;
        border: none;
        padding: 1rem;
        color: #64748b;
        font-weight: 700;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
    }
    .cfg-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
    .cfg-btn.active {
        color: var(--color-accent, #5eead4);
        border-bottom-color: var(--color-accent, #5eead4);
        background: rgba(94, 234, 212, 0.05);
    }

    .ship-stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-top: 1rem;
    }
    .ship-stat-box {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 10px;
        border-radius: 6px;
        text-align: center;
    }
    .s-label { display: block; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
    .s-val { font-size: 1.1rem; font-weight: bold; }
    
    .val-hp { color: #4ade80; }
    .val-shd { color: #38bdf8; }
    .val-dmg { color: #f87171; }
    .val-spd { color: #facc15; }

    .active-badge {
        position: absolute;
        top: 10px; right: 10px;
        background: rgba(0,0,0,0.6);
        color: #fff;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        border: 1px solid rgba(255,255,255,0.2);
    }
</style>

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

    <div class="profile-card">
        <div class="card-header">
            <h2 class="card-title">Ship Hangar</h2>
            <div style="font-size:0.8rem; color:#94a3b8;">Active: <b style="color:#fff;">Config <?= ($activeName === 'B' ? '2' : '1') ?></b></div>
        </div>
        
        <div class="ship-preview">
            <div class="active-badge">Online</div>
            <img src="img/ship/<?=$shipDesignId?>.png" alt="Current Ship">
        </div>

        <div class="config-tabs">
            <button id="tabA" class="cfg-btn active" onclick="switchConfig('A')">Configuration 1</button>
            <button id="tabB" class="cfg-btn" onclick="switchConfig('B')">Configuration 2</button>
        </div>

        <div class="card-body">
            
            <div id="cfgPanelA" class="ship-stats-grid">
                <div class="ship-stat-box">
                    <span class="s-label">Hitpoints</span>
                    <span class="s-val val-hp"><?= number_format($shipHp) ?></span>
                </div>
                <div class="ship-stat-box">
                    <span class="s-label">Shield</span>
                    <span class="s-val val-shd"><?= number_format($statsA['shield']) ?></span>
                </div>
                <div class="ship-stat-box">
                    <span class="s-label">Laser Damage</span>
                    <span class="s-val val-dmg"><?= number_format($statsA['damage']) ?></span>
                </div>
                <div class="ship-stat-box">
                    <span class="s-label">Speed</span>
                    <span class="s-val val-spd"><?= number_format($statsA['speed']) ?></span>
                </div>
            </div>

            <div id="cfgPanelB" class="ship-stats-grid" style="display:none;">
                <div class="ship-stat-box">
                    <span class="s-label">Hitpoints</span>
                    <span class="s-val val-hp"><?= number_format($shipHp) ?></span>
                </div>
                <div class="ship-stat-box">
                    <span class="s-label">Shield</span>
                    <span class="s-val val-shd"><?= number_format($statsB['shield']) ?></span>
                </div>
                <div class="ship-stat-box">
                    <span class="s-label">Laser Damage</span>
                    <span class="s-val val-dmg"><?= number_format($statsB['damage']) ?></span>
                </div>
                <div class="ship-stat-box">
                    <span class="s-label">Speed</span>
                    <span class="s-val val-spd"><?= number_format($statsB['speed']) ?></span>
                </div>
            </div>

        </div>
    </div>

</div>

<script>
    function switchConfig(cfg) {
        // Gestion des boutons
        document.getElementById('tabA').classList.remove('active');
        document.getElementById('tabB').classList.remove('active');
        document.getElementById('tab' + cfg).classList.add('active');

        // Gestion des panneaux
        document.getElementById('cfgPanelA').style.display = 'none';
        document.getElementById('cfgPanelB').style.display = 'none';
        document.getElementById('cfgPanel' + cfg).style.display = 'grid';
    }

    // Initialisation sur la config active du joueur (visuellement)
    const currentActive = '<?= $activeName ?>';
    switchConfig(currentActive);
</script>
