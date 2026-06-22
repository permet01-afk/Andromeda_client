<?php
// ==============================
// 1) Tokens / Tickets
// ==============================
$sth = $db->prepare("SELECT tokens, tickets FROM users_infos WHERE id = :id LIMIT 1");
$sth->execute([
    ':id' => $_SESSION['player_id']
]);
$datauserInfos = $sth->fetchAll();

$tokens  = $datauserInfos[0]['tokens'] ?? 0;
$tickets = $datauserInfos[0]['tickets'] ?? 0;


// ==============================
// 2) User data
// ==============================
// ✅ On ajoute active_config + on force shipid AS shipId (plus safe)
$sth = $db->prepare("
    SELECT
        username, grade, factionid, clanid, credits, uridium, rankpoints, user_kill, npc_kill,
        max_hp, speed, damages, max_shield, drones, apis_built, zeus_built,
        dmg_lvl, hp_lvl, shd_lvl, speed_lvl, logfiles, booty_keys, drone_parts, skilltree,
        booster_dmg_time, booster_shd_time, booster_spd_time, booster_npc_time,
        active_config,
        shipid AS shipId
    FROM users
    WHERE id = :id
    LIMIT 1
");
$sth->execute([
    ':id' => $_SESSION['player_id']
]);
$datauser = $sth->fetchAll();

if (empty($datauser)) {
    echo "<div class='box'><div class='title'>Error</div><div style='padding:15px;'>User not found.</div></div>";
    exit;
}

$u = $datauser[0];


// ==============================
// 3) Clan name/tag
// ==============================
if ((int)$u['clanid'] !== 0) {
    $sth = $db->prepare("SELECT clan_name, clan_tag FROM clan WHERE id = :clanid LIMIT 1");
    $sth->execute([
        ':clanid' => $u['clanid']
    ]);
    $dataclan = $sth->fetchAll();

    if (!empty($dataclan)) {
        $userclan = '[' . ($dataclan[0]['clan_tag'] ?? '') . ']' . ($dataclan[0]['clan_name'] ?? '');
    } else {
        $userclan = 'No clan';
    }
} else {
    $userclan = 'No clan';
}


// ==============================
// 4) Rank helper
// ==============================
$rank_name = [
    1 => "Basic Space Pilot", 2 => "Space Pilot", 3 => "Chief Space Pilot", 4 => "Basic Sergeant", 5 => "Sergeant", 6 => "Chief Sergeant",
    7 => "Basic Lieutenant", 8 => "Lieutenant", 9 => "Chief Lieutenant", 10 => "Basic Captain", 11 => "Captain", 12 => "Chief Captain",
    13 => "Basic Major", 14 => "Major", 15 => "Chief Major", 16 => "Basic Colonel", 17 => "Colonel", 18 => "Chief Colonel",
    19 => "Basic General", 20 => "General", 21 => "Game Administrator", 22 => "Outlaw"
];

if ((int)$u['grade'] < 20) {
    $rank_after = $db->prepare("
        SELECT rankpoints, grade
        FROM users
        WHERE grade > " . (int)$u['grade'] . " AND factionid=" . (int)$u['factionid'] . "
        ORDER BY rankpoints ASC
        LIMIT 1
    ");
    $rank_after->execute();
    $data_rank = $rank_after->fetchAll();

    $nextrankindex = (int)$u['grade'] + 1;

    if (!isset($data_rank[0]['rankpoints'])) {
        $nextrankpoints = 'N/A';
    } else {
        $nextrankpoints = number_format($data_rank[0]['rankpoints']);
    }
} else {
    $nextrankindex  = (int)$u['grade'];
    $nextrankpoints = 'You are the KING';
}


// ==============================
// ✅ 5) DO2010 : Ship stats A/B (NEW SYSTEM)
// ==============================
$pid = (int)($_SESSION['player_id'] ?? 0);

// Ship actuel
$shipDesignId = (int)($u['shipId'] ?? 1);
if ($shipDesignId <= 0) $shipDesignId = 1;

// Config active
$activeConfig = (int)($u['active_config'] ?? 1);
$activeName   = ($activeConfig === 2) ? 'B' : 'A';

// Base stats ship_design
$baseHp2010     = 0;
$baseSpeed2010  = 0;
$bonusDmgPct    = 0;
$bonusShdPct    = 0;

$designStmt = $db->prepare("
    SELECT base_hp_2010, base_speed_2010, bonus_damage_pct, bonus_shield_pct
    FROM ship_design
    WHERE ship_design_id = :sid
    LIMIT 1
");
$designStmt->execute([':sid' => $shipDesignId]);
$design = $designStmt->fetch(PDO::FETCH_ASSOC);

if ($design) {
    $baseHp2010    = (int)$design['base_hp_2010'];
    $baseSpeed2010 = (int)$design['base_speed_2010'];
    $bonusDmgPct   = (int)$design['bonus_damage_pct'];
    $bonusShdPct   = (int)$design['bonus_shield_pct'];
}

// HP : on affiche ce que le serveur a en DB (max_hp) car il est déjà synchro
$shipHp = (int)($u['max_hp'] ?? $baseHp2010);

// Fallback A/B si aucune config enregistrée
$statsA = ['damage' => 0, 'shield' => 0, 'speed' => $baseSpeed2010];
$statsB = ['damage' => 0, 'shield' => 0, 'speed' => $baseSpeed2010];

// Lire ship_config_stats
$st = $db->prepare("
    SELECT sc.name, scs.damage_total, scs.shield_total, scs.speed_total
    FROM ship_config sc
    LEFT JOIN ship_config_stats scs ON scs.ship_config_id = sc.id AND scs.config = sc.name
    WHERE sc.player_id = :pid
      AND sc.ship_design_id = :sid
      AND sc.name IN ('A','B')
");
$st->execute([':pid' => $pid, ':sid' => $shipDesignId]);

$rows = $st->fetchAll(PDO::FETCH_ASSOC);

// Boosters (comme l’émulateur)
$now = time();
$hasBoosterDmg = ((int)($u['booster_dmg_time'] ?? 0) > $now);
$hasBoosterShd = ((int)($u['booster_shd_time'] ?? 0) > $now);
$hasBoosterSpd = ((int)($u['booster_spd_time'] ?? 0) > $now);

foreach ($rows as $r) {
    $name = strtoupper($r['name'] ?? '');

    $dmg = (int)($r['damage_total'] ?? 0);
    $shd = (int)($r['shield_total'] ?? 0);
    $spd = (int)($r['speed_total'] ?? $baseSpeed2010);

    // ✅ Bonus design (%)
    if ($bonusDmgPct > 0) $dmg += (int)($dmg * ($bonusDmgPct / 100));
    if ($bonusShdPct > 0) $shd += (int)($shd * ($bonusShdPct / 100));

    // ✅ Boosters (mêmes valeurs que ton émulateur)
    if ($hasBoosterDmg) $dmg += (int)($dmg * 0.10);
    if ($hasBoosterShd) $shd += (int)($shd * 0.25);
    if ($hasBoosterSpd) $spd += 20;

    if ($name === 'A') $statsA = ['damage' => $dmg, 'shield' => $shd, 'speed' => $spd];
    if ($name === 'B') $statsB = ['damage' => $dmg, 'shield' => $shd, 'speed' => $spd];
}
?>

<div class="box">
	<div class="title">User informations</div>
	<div id="user-infos">
		<div class="stat"><div class="stat-left">Username</div><div class="stat-right"><?=$u['username']?></div></div>
		<div class="stat"><div class="stat-left">Clan</div><div class="stat-right"><?=$userclan?></div></div>
		<div class="stat"><div class="stat-left">Company</div><div class="stat-right"><img src="img/ranks/company/<?=$u['factionid']?>.png"></div></div>
		<div class="stat"><div class="stat-left">Grade</div><div class="stat-right"><img src="img/ranks/<?=$u['grade']?>.png">-<?=$rank_name[$u['grade']]?></div></div>
		<div class="stat"><div class="stat-left">Next Grade</div><div class="stat-right"><img src="img/ranks/<?=$nextrankindex?>.png">-<?=$nextrankpoints?></div></div>
		<div class="stat"><div class="stat-left">Rankpoints</div><div class="stat-right"><?=number_format($u['rankpoints'])?></div></div>
		<div class="stat"><div class="stat-left">Players kills</div><div class="stat-right"><?=number_format($u['user_kill'])?></div></div>
		<div class="stat"><div class="stat-left">Npc points</div><div class="stat-right"><?=number_format($u['npc_kill'])?></div></div>
		<div class="stat"><div class="stat-left">Credits</div><div class="stat-right"><?=number_format($u['credits'])?></div></div>
		<div class="stat"><div class="stat-left">Uridium</div><div class="stat-right"><?=number_format($u['uridium'])?></div></div>
		<div class="stat"><div class="stat-left">Logfiles</div><div class="stat-right"><?=number_format($u['logfiles'])?></div></div>
		<div class="stat"><div class="stat-left">Booty keys</div><div class="stat-right"><?=number_format($u['booty_keys'])?></div></div>
		<div class="stat"><div class="stat-left">Drone parts</div><div class="stat-right"><?=number_format($u['drone_parts'])?></div></div>
		<div class="stat"><div class="stat-left">Tokens</div><div class="stat-right"><?=$tokens?></div></div>
		<div class="stat"><div class="stat-left">Lottery's tickets</div><div class="stat-right"><?=$tickets?></div></div>
		<br>
	</div>
</div>

<div class="box" style="margin-left: 40px;">
	<div class="title">Ship informations</div>

	<div id="user-ship">
		<center><img src="img/ship/<?=$shipDesignId?>.png" /></center>
		<br>

		<div style="display:flex; gap:10px; justify-content:center; margin-bottom:15px;">
			<button type="button" id="btnCfgA"
				style="padding:6px 14px;border-radius:8px;border:1px solid #2c3a52;background:#0b1422;color:#fff;cursor:pointer;">
				Config 1
			</button>

			<button type="button" id="btnCfgB"
				style="padding:6px 14px;border-radius:8px;border:1px solid #2c3a52;background:#0b1422;color:#fff;cursor:pointer;">
				Config 2
			</button>
		</div>

		<!-- CONFIG A -->
		<div id="panelCfgA">
			<div class="stat"><div class="stat-left">Health points</div><div class="stat-right" style="color: green; font-weight: bold;"><?=number_format($shipHp)?></div></div>
			<div class="stat"><div class="stat-left">Shield points</div><div class="stat-right" style="color: #299E9E; font-weight: bold;"><?=number_format($statsA['shield'])?></div></div>
			<div class="stat"><div class="stat-left">Damages points</div><div class="stat-right" style="color: red; font-weight: bold;"><?=number_format($statsA['damage'])?></div></div>
			<div class="stat"><div class="stat-left">Speed</div><div class="stat-right" style="color: #B01AB0; font-weight: bold;"><?=number_format($statsA['speed'])?></div></div>
		</div>

		<!-- CONFIG B -->
		<div id="panelCfgB" style="display:none;">
			<div class="stat"><div class="stat-left">Health points</div><div class="stat-right" style="color: green; font-weight: bold;"><?=number_format($shipHp)?></div></div>
			<div class="stat"><div class="stat-left">Shield points</div><div class="stat-right" style="color: #299E9E; font-weight: bold;"><?=number_format($statsB['shield'])?></div></div>
			<div class="stat"><div class="stat-left">Damages points</div><div class="stat-right" style="color: red; font-weight: bold;"><?=number_format($statsB['damage'])?></div></div>
			<div class="stat"><div class="stat-left">Speed</div><div class="stat-right" style="color: #B01AB0; font-weight: bold;"><?=number_format($statsB['speed'])?></div></div>
		</div>

		<div style="margin-top:10px;text-align:center;font-size:12px;opacity:.7;">
			Active config in game: <b><?=($activeName === 'B' ? '2' : '1')?></b>

		</div>
	</div>
</div>

<script>
(function(){
	const btnA = document.getElementById('btnCfgA');
	const btnB = document.getElementById('btnCfgB');
	const pA = document.getElementById('panelCfgA');
	const pB = document.getElementById('panelCfgB');

	function setActive(cfg){
		if(cfg === 'B'){
			pA.style.display = 'none';
			pB.style.display = 'block';
			btnA.style.opacity = '0.6';
			btnB.style.opacity = '1';
		}else{
			pA.style.display = 'block';
			pB.style.display = 'none';
			btnA.style.opacity = '1';
			btnB.style.opacity = '0.6';
		}
	}

	btnA.addEventListener('click', ()=>setActive('A'));
	btnB.addEventListener('click', ()=>setActive('B'));

	// Affiche par défaut la config active du joueur
	setActive('<?=$activeName?>');
})();
</script>
