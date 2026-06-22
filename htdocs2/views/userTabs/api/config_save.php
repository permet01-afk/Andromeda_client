<?php
/**
 * config_save.php (DO 2010-style)
 *
 * Objectif :
 *  - Config A/B = 2 presets indépendants
 *  - player_inventory = inventaire TOTAL (on ne décrémente jamais quand on équipe)
 *  - Donc un même item peut être présent sur A ET sur B (comme DarkOrbit),
 *    car seule la config active est utilisée en jeu.
 *
 * On continue d'utiliser :
 *  - ship_slot (par ship_config)
 *  - drone_slot (global, pas séparé A/B dans ta DB actuelle)
 *  - ship_config_stats (pour l'émulateur)
 */

require_once __DIR__ . '/bootstrap.php';
header('Content-Type: application/json');

$pid = $_SESSION['player_id'] ?? null;
if (!$pid) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

/* ✅ DO 2010 : bloquer sauvegarde si joueur en combat */
$now = time();
$st = $db->prepare("SELECT in_fight_until FROM users WHERE id = :pid LIMIT 1");
$st->execute([':pid' => $pid]);
$until = (int)$st->fetchColumn();

if ($until > $now) {
    http_response_code(403);
    echo json_encode([
        'error' => 'in_combat',
        'remaining' => ($until - $now)
    ]);
    exit;
}

/**
 * Convertit des quantités lasers/shields/speed en points (0–10 chacun, somme ≤ 15)
 * pour remplir player_config (damageX/shieldX/speedX).
 */
function computeConfigPoints(int $lasers, int $shields, int $speeds): array
{
    $wD = max(0, $lasers);
    $wS = max(0, $shields);
    $wV = max(0, $speeds);

    $total = $wD + $wS + $wV;
    if ($total <= 0) return [0,0,0];

    $pD = 15.0 * $wD / $total;
    $pS = 15.0 * $wS / $total;
    $pV = 15.0 * $wV / $total;

    $pD = min($pD, 10.0);
    $pS = min($pS, 10.0);
    $pV = min($pV, 10.0);

    $sum = $pD + $pS + $pV;
    if ($sum > 15.0) {
        $k  = 15.0 / $sum;
        $pD *= $k; $pS *= $k; $pV *= $k;
    }

    $dmg    = (int)round($pD);
    $shield = (int)round($pS);
    $speed  = (int)round($pV);

    $sum = $dmg + $shield + $speed;
    if ($sum > 15) {
        $delta = $sum - 15;
        while ($delta > 0) {
            if ($dmg >= $shield && $dmg >= $speed && $dmg > 0) $dmg--;
            elseif ($shield >= $dmg && $shield >= $speed && $shield > 0) $shield--;
            elseif ($speed > 0) $speed--;
            $delta--;
        }
    }
    return [$dmg,$shield,$speed];
}

/* -----------------------------------------------------------
 * 0) table ship_config_stats
 * ----------------------------------------------------------- */
$db->exec("
    CREATE TABLE IF NOT EXISTS ship_config_stats (
        ship_config_id INT PRIMARY KEY,
        config        CHAR(1) NOT NULL,
        lasers_slots  INT NOT NULL DEFAULT 0,
        gen_slots     INT NOT NULL DEFAULT 0,
        extras_slots  INT NOT NULL DEFAULT 0,
        damage_total  INT NOT NULL DEFAULT 0,
        shield_total  INT NOT NULL DEFAULT 0,
        speed_total   INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

/* -----------------------------------------------------------
 * 1) payload
 * ----------------------------------------------------------- */
$raw = file_get_contents('php://input');
if (!$raw && isset($_POST['payload'])) $raw = $_POST['payload'];

$payload = json_decode($raw, true);
if (!is_array($payload)) $payload = [];

$hasConfigs = isset($payload['configs']) && is_array($payload['configs']);

// Compat UI HTML5 : dronesA/dronesB
if (!isset($payload['drones']) || !is_array($payload['drones'])) {
    if (isset($payload['dronesA']) && is_array($payload['dronesA'])) $payload['drones'] = $payload['dronesA'];
    elseif (isset($payload['dronesB']) && is_array($payload['dronesB'])) $payload['drones'] = $payload['dronesB'];
    else $payload['drones'] = [];
}
$hasDrones = is_array($payload['drones']) && count($payload['drones']) > 0;

try {
    $db->beginTransaction();

    /* -------------------------------------------------------
     * 2) ship_design_id actuel + slots
     * ------------------------------------------------------- */
    $shipIdStmt = $db->prepare("SELECT shipid FROM users WHERE id = :pid LIMIT 1");
    $shipIdStmt->execute([':pid'=>$pid]);
    $shipDesignId = (int)$shipIdStmt->fetchColumn();
    if ($shipDesignId <= 0) $shipDesignId = 1;
	
	// ✅ Vitesse de base du ship actuel (DO 2010)
$baseSpeed2010 = 250;
$spdStmt = $db->prepare("SELECT base_speed_2010 FROM ship_design WHERE ship_design_id = :sid LIMIT 1");
$spdStmt->execute([':sid' => $shipDesignId]);
$baseSpeed2010 = (int)$spdStmt->fetchColumn();
if ($baseSpeed2010 <= 0) $baseSpeed2010 = 250;


    $designSlots = ['lasers_slots'=>10,'gen_slots'=>4,'extras_slots'=>6];
    $ds = $db->prepare("
        SELECT
          laser_slots_2010 AS lasers_slots,
          generator_slots_2010 AS gen_slots,
          extra_slots_2010 AS extras_slots
        FROM ship_design
        WHERE ship_design_id = :sid
        LIMIT 1
    ");
    $ds->execute([':sid'=>$shipDesignId]);
    if ($r = $ds->fetch(PDO::FETCH_ASSOC)) {
        $designSlots['lasers_slots'] = (int)$r['lasers_slots'];
        $designSlots['gen_slots']    = (int)$r['gen_slots'];
        $designSlots['extras_slots'] = (int)$r['extras_slots'];
    }

    // S'assurer que A/B existent pour CE vaisseau
    $db->prepare("
        INSERT IGNORE INTO ship_config (player_id, ship_design_id, name, lasers_slots, gen_slots, extras_slots)
        VALUES
          (:p,:sid,'A',:ls,:gs,:es),
          (:p,:sid,'B',:ls,:gs,:es)
    ")->execute([
        ':p'=>$pid, ':sid'=>$shipDesignId,
        ':ls'=>$designSlots['lasers_slots'],
        ':gs'=>$designSlots['gen_slots'],
        ':es'=>$designSlots['extras_slots'],
    ]);

    // Aligner les slots (utile si tu changes de ship)
    $db->prepare("
        UPDATE ship_config
        SET lasers_slots=:ls, gen_slots=:gs, extras_slots=:es
        WHERE player_id=:p AND ship_design_id=:sid
    ")->execute([
        ':p'=>$pid, ':sid'=>$shipDesignId,
        ':ls'=>$designSlots['lasers_slots'],
        ':gs'=>$designSlots['gen_slots'],
        ':es'=>$designSlots['extras_slots'],
    ]);

    /* -------------------------------------------------------
     * 3) Catalogue items + inventaire TOTAL
     * ------------------------------------------------------- */
    $itemsMap = [];
    $itQ = $db->query("SELECT id, name, category, type FROM items");
    foreach ($itQ as $row) {
        $itemsMap[(int)$row['id']] = [
            'name' => $row['name'],
            'cat'  => $row['category'],
            'type' => (int)$row['type'],
        ];
    }

    $ownedQty = [];
    $oq = $db->prepare("SELECT item_id, qty FROM player_inventory WHERE player_id = :p");
    $oq->execute([':p'=>$pid]);
    foreach ($oq->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $ownedQty[(int)$r['item_id']] = (int)$r['qty'];
    }

    /* -------------------------------------------------------
     * 4) Sauvegarde configs A/B (ship_slot)
     *    IMPORTANT : on ne touche pas à player_inventory !
     * ------------------------------------------------------- */
    if ($hasConfigs) {

        // Charger configs A/B du ship actuel
        $cfgStmt = $db->prepare("
            SELECT id, name, lasers_slots, gen_slots, extras_slots
            FROM ship_config
            WHERE player_id = :p AND ship_design_id = :sid
        ");
        $cfgStmt->execute([':p'=>$pid, ':sid'=>$shipDesignId]);
        $configs = $cfgStmt->fetchAll(PDO::FETCH_ASSOC);

        $cfgByName = [];
        foreach ($configs as $c) $cfgByName[$c['name']] = $c;

        $idsWanted = [];
        foreach ($payload['configs'] as $conf) {
            if (!is_array($conf)) continue;
            $n = (($conf['name'] ?? 'A') === 'B') ? 'B' : 'A';
            if (!isset($cfgByName[$n])) continue;
            $idsWanted[] = (int)$cfgByName[$n]['id'];
        }
        $idsWanted = array_values(array_unique($idsWanted));

        if (!empty($idsWanted)) {
            $in = implode(',', array_map('intval', $idsWanted));

            // Clear slots pour les configs concernées
            $db->exec("UPDATE ship_slot SET item_id = NULL WHERE ship_config_id IN ($in)");

            // Re-apply depuis payload
            foreach ($payload['configs'] as $conf) {
                if (!is_array($conf)) continue;

                $name = (($conf['name'] ?? 'A') === 'B') ? 'B' : 'A';
                if (!isset($cfgByName[$name])) continue;

                $c = $cfgByName[$name];

                $rowsSpec = [
                    'lasers'     => (int)$c['lasers_slots'],
                    'generators' => (int)$c['gen_slots'],
                    'extras'     => (int)$c['extras_slots'],
                ];

                $slots = $conf['slots'] ?? [];
                if (!is_array($slots)) $slots = [];

                // Compteur par config => empêche d'équiper plus que le total OWNED
                $usedCounts = [];

                foreach ($rowsSpec as $row => $max) {
                    $list = $slots[$row] ?? [];
                    if (!is_array($list)) $list = [];

                    $n = min(count($list), $max);

                    for ($i = 0; $i < $n; $i++) {
                        $iid = (int)($list[$i] ?? 0);
                        if ($iid <= 0) continue;

                        $info = $itemsMap[$iid] ?? null;
                        if (!$info) continue;

                        $ok = false;
                        if ($row === 'lasers'     && $info['cat'] === 'laser')     $ok = true;
                        if ($row === 'generators' && $info['cat'] === 'generator') $ok = true;
                        if ($row === 'extras'     && $info['cat'] === 'extra')     $ok = true;
                        if (!$ok) continue;

                        $usedCounts[$iid] = ($usedCounts[$iid] ?? 0) + 1;
                        $maxOwn = $ownedQty[$iid] ?? 0;
                        if ($usedCounts[$iid] > $maxOwn) {
                            // Trop demandé => on ignore simplement
                            continue;
                        }

                        $db->prepare("
                            UPDATE ship_slot
                            SET item_id = :i
                            WHERE ship_config_id = :c AND row_name = :r AND slot_index = :s
                        ")->execute([
                            ':i' => $iid,
                            ':c' => (int)$c['id'],
                            ':r' => $row,
                            ':s' => $i
                        ]);
                    }
                }
            }
        }
    }

    /* -------------------------------------------------------
     * 5) Drones (drone_slot) — toujours global dans ta DB
     * ------------------------------------------------------- */
    if ($hasDrones) {

        $dr = $db->prepare("SELECT id FROM drone WHERE player_id = :p ORDER BY id");
        $dr->execute([':p'=>$pid]);
        $drIds = $dr->fetchAll(PDO::FETCH_COLUMN);

        $usedDroneCounts = [];

        foreach ($payload['drones'] as $idx => $d) {
            if (!is_array($d)) continue;

            $did = $drIds[$idx] ?? null;
            if (!$did) continue;

            // Clear
            $db->prepare("UPDATE drone_slot SET item_id = NULL WHERE drone_id = :d")
               ->execute([':d'=>$did]);

            // Appliquer slots 0..1
            $slots = $d['slots'] ?? [];
            if (!is_array($slots)) $slots = [];

            for ($s = 0; $s < 2; $s++) {
                $iid = isset($slots[$s]) ? (int)$slots[$s] : 0;
                if ($iid <= 0) continue;

                $info = $itemsMap[$iid] ?? null;
                if (!$info) continue;

                // Drones : lasers + shield gens
                $ok = ($info['cat'] === 'laser') || ($info['cat'] === 'generator' && (int)$info['type'] === 4);
                if (!$ok) continue;

                $usedDroneCounts[$iid] = ($usedDroneCounts[$iid] ?? 0) + 1;
                $maxOwn = $ownedQty[$iid] ?? 0;
                if ($usedDroneCounts[$iid] > $maxOwn) continue;

                $db->prepare("
                    UPDATE drone_slot
                    SET item_id = :i
                    WHERE drone_id = :d AND slot_index = :s
                ")->execute([
                    ':i' => $iid,
                    ':d' => $did,
                    ':s' => $s
                ]);
            }
        }
    }

    /* -------------------------------------------------------
     * 6) Recalcul stats par config
     * ------------------------------------------------------- */
    $DMG_PER_LASER = 200;
$SHD_PER_GEN   = 10000;
$SPD_PER_GEN   = 10;
$BASE_SPEED    = $baseSpeed2010;


    $cfg = $db->prepare("
        SELECT id, name, lasers_slots, gen_slots, extras_slots
        FROM ship_config
        WHERE player_id = :p AND ship_design_id = :sid
        ORDER BY name
    ");
    $cfg->execute([':p'=>$pid, ':sid'=>$shipDesignId]);
    $configs = $cfg->fetchAll(PDO::FETCH_ASSOC);

    $countShip = $db->prepare("
        SELECT i.category, i.type, COUNT(*) AS n
        FROM ship_slot s
        JOIN items i ON i.id = s.item_id
        WHERE s.item_id IS NOT NULL AND s.ship_config_id = :cid
        GROUP BY i.category, i.type
    ");

    // Drones comptés globalement
    $dr = $db->prepare("SELECT id FROM drone WHERE player_id = :p");
    $dr->execute([':p'=>$pid]);
    $drIds = $dr->fetchAll(PDO::FETCH_COLUMN);

    $droneLasers  = 0;
    $droneShields = 0;

    if (!empty($drIds)) {
        $in = implode(',', array_map('intval', $drIds));
        $qd = $db->query("
            SELECT i.category, i.type, COUNT(*) AS n
            FROM drone_slot ds
            JOIN items i ON i.id = ds.item_id
            WHERE ds.item_id IS NOT NULL AND ds.drone_id IN ($in)
            GROUP BY i.category, i.type
        ");
        foreach ($qd as $r) {
            $cat = $r['category'];
            $typ = (int)$r['type'];
            $n   = (int)$r['n'];
            if ($cat === 'laser') $droneLasers += $n;
            elseif ($cat === 'generator' && $typ === 4) $droneShields += $n;
        }
    }

    $upStats = $db->prepare("
        INSERT INTO ship_config_stats (
            ship_config_id, config,
            lasers_slots, gen_slots, extras_slots,
            damage_total, shield_total, speed_total
        ) VALUES (
            :cid, :cfg,
            :ls, :gs, :es,
            :dmg, :shd, :spd
        )
        ON DUPLICATE KEY UPDATE
            lasers_slots = VALUES(lasers_slots),
            gen_slots    = VALUES(gen_slots),
            extras_slots = VALUES(extras_slots),
            damage_total = VALUES(damage_total),
            shield_total = VALUES(shield_total),
            speed_total  = VALUES(speed_total)
    ");

    $statsByName       = [];
    $equipCountsByName = [];

    foreach ($configs as $c) {
        $cid  = (int)$c['id'];
        $name = $c['name'];

        $shipLasers  = 0;
        $shipShields = 0;
        $shipSpeeds  = 0;

        $countShip->execute([':cid'=>$cid]);
        foreach ($countShip as $r) {
            $cat = $r['category'];
            $typ = (int)$r['type'];
            $n   = (int)$r['n'];
            if ($cat === 'laser') $shipLasers += $n;
            elseif ($cat === 'generator' && $typ === 4) $shipShields += $n;
            elseif ($cat === 'generator' && $typ === 3) $shipSpeeds += $n;
        }

        $totalLasers  = $shipLasers  + $droneLasers;
        $totalShields = $shipShields + $droneShields;

        $damage = $DMG_PER_LASER * $totalLasers;
        $shield = $SHD_PER_GEN   * $totalShields;
        $speed  = $BASE_SPEED    + $SPD_PER_GEN * $shipSpeeds;

        $upStats->execute([
            ':cid'=>$cid, ':cfg'=>$name,
            ':ls'=>(int)$c['lasers_slots'],
            ':gs'=>(int)$c['gen_slots'],
            ':es'=>(int)$c['extras_slots'],
            ':dmg'=>$damage, ':shd'=>$shield, ':spd'=>$speed
        ]);

        $statsByName[$name] = ['damage'=>$damage,'shield'=>$shield,'speed'=>$speed];
        $equipCountsByName[$name] = [
            'lasers'=>$totalLasers,
            'shields'=>$totalShields,
            'speeds'=>$shipSpeeds
        ];
    }

    /* -------------------------------------------------------
     * 7) player_config (si tu l'utilises encore)
     * ------------------------------------------------------- */
    $A = $equipCountsByName['A'] ?? ['lasers'=>0,'shields'=>0,'speeds'=>0];
    $B = $equipCountsByName['B'] ?? ['lasers'=>0,'shields'=>0,'speeds'=>0];

    [$d1,$s1,$v1] = computeConfigPoints($A['lasers'], $A['shields'], $A['speeds']);
    [$d2,$s2,$v2] = computeConfigPoints($B['lasers'], $B['shields'], $B['speeds']);

    // Table player_config peut être supprimée dans le futur : on ignore si absente
    $pcExists = $db->query("SHOW TABLES LIKE 'player_config'")->fetchColumn();
    if ($pcExists) {
        $pcSel = $db->prepare("SELECT COUNT(*) FROM player_config WHERE player_id = :pid");
        $pcSel->execute([':pid'=>$pid]);
        $exists = ((int)$pcSel->fetchColumn() > 0);

        if ($exists) {
            $pcUpd = $db->prepare("
                UPDATE player_config
                SET damage1=:d1, shield1=:s1, speed1=:v1,
                    damage2=:d2, shield2=:s2, speed2=:v2
                WHERE player_id=:pid
            ");
            $pcUpd->execute([':pid'=>$pid, ':d1'=>$d1, ':s1'=>$s1, ':v1'=>$v1, ':d2'=>$d2, ':s2'=>$s2, ':v2'=>$v2]);
        } else {
            $pcIns = $db->prepare("
                INSERT INTO player_config (player_id, damage1, shield1, speed1, damage2, shield2, speed2)
                VALUES (:pid,:d1,:s1,:v1,:d2,:s2,:v2)
            ");
            $pcIns->execute([':pid'=>$pid, ':d1'=>$d1, ':s1'=>$s1, ':v1'=>$v1, ':d2'=>$d2, ':s2'=>$s2, ':v2'=>$v2]);
        }
    }

    /* -------------------------------------------------------
     * 8) Update users.* pour la config active
     * ------------------------------------------------------- */
    $u = $db->prepare("SELECT active_config FROM users WHERE id = :u LIMIT 1");
    $u->execute([':u'=>$pid]);
    $ac = (int)$u->fetchColumn();
    $activeName = ($ac === 2) ? 'B' : 'A';

    if (isset($statsByName[$activeName])) {
        $s = $statsByName[$activeName];
        $upd = $db->prepare("
            UPDATE users
            SET damages=:dmg, max_shield=:shd, speed=:spd
            WHERE id=:u
        ");
        $upd->execute([':dmg'=>$s['damage'], ':shd'=>$s['shield'], ':spd'=>$s['speed'], ':u'=>$pid]);
    }

    $db->commit();
    echo json_encode(['ok'=>true]);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['error'=>'save_failed','message'=>$e->getMessage()]);
}
