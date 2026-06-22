<?php
/**
 * config_load.php (DO 2010-style)
 *
 * Charge tout ce qu'il faut pour l'UI d'équipement :
 * - Inventaire TOTAL joueur (avec icône)
 * - Configurations A et B du ship actuel + slots (ship_slot)
 * - Drones + slots (global)
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/helpers_drones.php';
header('Content-Type: application/json');

$pid = $_SESSION['player_id'] ?? null;
if (!$pid) {
  http_response_code(401);
  echo json_encode(['error' => 'unauthorized']);
  exit;
}

try {
  /* ---------- 0) Ship actuel (ship_design_id) ---------- */
  $shipIdStmt = $db->prepare("SELECT shipid FROM users WHERE id = :pid LIMIT 1");
  $shipIdStmt->execute([':pid'=>$pid]);
  $shipDesignId = (int)$shipIdStmt->fetchColumn();
  if ($shipDesignId <= 0) $shipDesignId = 1;

  // Slots selon ship_design
  $slots = ['lasers_slots'=>10,'gen_slots'=>4,'extras_slots'=>6];
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
    $slots['lasers_slots'] = (int)$r['lasers_slots'];
    $slots['gen_slots']    = (int)$r['gen_slots'];
    $slots['extras_slots'] = (int)$r['extras_slots'];
  }

  /* ---------- 1) INVENTAIRE TOTAL ---------- */
  $inv = $db->prepare("
    SELECT
      i.id,
      i.name,
      i.category,
      i.type,
      i.selling_credits,
      CASE
        WHEN i.category='laser' THEN '/views/userTabs/icons/laser.png'
        WHEN i.category='generator' AND i.type=4 THEN '/views/userTabs/icons/shield.png'
        WHEN i.category='generator' AND i.type=3 THEN '/views/userTabs/icons/speed.png'
        ELSE NULL
      END AS icon,
      pi.qty
    FROM items i
    JOIN player_inventory pi ON pi.item_id = i.id
    WHERE pi.player_id = :pid
    ORDER BY i.category, i.name
  ");
  $inv->execute([':pid'=>$pid]);
  $inventory = $inv->fetchAll(PDO::FETCH_ASSOC);

  /* ---------- 2) CONFIGS A/B du ship actuel ---------- */
  // Créer A/B si absentes pour CE ship
  $db->prepare("
    INSERT IGNORE INTO ship_config (player_id, ship_design_id, name, lasers_slots, gen_slots, extras_slots)
    VALUES
      (:p,:sid,'A',:ls,:gs,:es),
      (:p,:sid,'B',:ls,:gs,:es)
  ")->execute([
    ':p'=>$pid, ':sid'=>$shipDesignId,
    ':ls'=>$slots['lasers_slots'], ':gs'=>$slots['gen_slots'], ':es'=>$slots['extras_slots']
  ]);

  // Aligner slots sur ship_design
  $db->prepare("
    UPDATE ship_config
    SET lasers_slots=:ls, gen_slots=:gs, extras_slots=:es
    WHERE player_id=:p AND ship_design_id=:sid
  ")->execute([
    ':p'=>$pid, ':sid'=>$shipDesignId,
    ':ls'=>$slots['lasers_slots'], ':gs'=>$slots['gen_slots'], ':es'=>$slots['extras_slots']
  ]);

  $cfg = $db->prepare("
    SELECT id, name, lasers_slots, gen_slots, extras_slots
    FROM ship_config
    WHERE player_id = :p AND ship_design_id = :sid
    ORDER BY name
  ");
  $cfg->execute([':p'=>$pid, ':sid'=>$shipDesignId]);
  $configs = $cfg->fetchAll(PDO::FETCH_ASSOC);

  $slotsStmt = $db->prepare("
    SELECT
      s.id,
      s.row_name,
      s.slot_index,
      s.item_id,
      i.name       AS item_name,
      i.category   AS item_category,
      i.type       AS item_type,
      CASE
        WHEN i.category='laser' THEN '/views/userTabs/icons/laser.png'
        WHEN i.category='generator' AND i.type=4 THEN '/views/userTabs/icons/shield.png'
        WHEN i.category='generator' AND i.type=3 THEN '/views/userTabs/icons/speed.png'
        ELSE NULL
      END AS item_icon
    FROM ship_slot s
    LEFT JOIN items i ON i.id = s.item_id
    WHERE s.ship_config_id = :cid
    ORDER BY s.row_name, s.slot_index
  ");

  foreach ($configs as &$c) {
    $plan = [
      ['lasers',     (int)$c['lasers_slots']],
      ['generators', (int)$c['gen_slots']],
      ['extras',     (int)$c['extras_slots']],
    ];
    foreach ($plan as [$row, $n]) {
      for ($i = 0; $i < $n; $i++) {
        $db->prepare("
          INSERT IGNORE INTO ship_slot (ship_config_id, row_name, slot_index)
          VALUES (:cid, :row, :idx)
        ")->execute([':cid'=>$c['id'], ':row'=>$row, ':idx'=>$i]);
      }
    }

    $slotsStmt->execute([':cid'=>$c['id']]);
    $c['slots'] = $slotsStmt->fetchAll(PDO::FETCH_ASSOC);
  }
  unset($c);

  /* ---------- 3) DRONES ---------- */
  $u = $db->prepare("SELECT drones, apis_built, zeus_built FROM users WHERE id=:p LIMIT 1");
  $u->execute([':p'=>$pid]);
  $userRow = $u->fetch(PDO::FETCH_ASSOC);

  $desired = count_user_drones_row($userRow);
  sync_drones_tables($db, (int)$pid, $desired);

  $dr = $db->prepare("SELECT id, name FROM drone WHERE player_id=:p ORDER BY id");
  $dr->execute([':p'=>$pid]);
  $drones = $dr->fetchAll(PDO::FETCH_ASSOC);

  $drs = $db->prepare("
    SELECT
      ds.drone_id,
      ds.slot_index,
      ds.item_id,
      i.name      AS item_name,
      i.category  AS item_category,
      i.type      AS item_type,
      CASE
        WHEN i.category='laser' THEN '/views/userTabs/icons/laser.png'
        WHEN i.category='generator' AND i.type=4 THEN '/views/userTabs/icons/shield.png'
        WHEN i.category='generator' AND i.type=3 THEN '/views/userTabs/icons/speed.png'
        ELSE NULL
      END AS item_icon
    FROM drone_slot ds
    LEFT JOIN items i ON i.id = ds.item_id
    WHERE ds.drone_id = :d
    ORDER BY ds.slot_index
  ");
  foreach ($drones as &$d) {
    $drs->execute([':d'=>$d['id']]);
    $d['slots'] = $drs->fetchAll(PDO::FETCH_ASSOC);
  }
  unset($d);

  echo json_encode([
    'player_id' => $pid,
    'ship_design_id' => $shipDesignId,
    'inventory' => $inventory,
    'configs'   => $configs,
    'drones'    => $drones
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['error' => 'load_failed', 'message' => $e->getMessage()]);
}
