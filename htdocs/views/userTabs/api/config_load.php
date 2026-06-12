<?php

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/helpers_drones.php';
header('Content-Type: application/json');

$pid = $_SESSION['player_id'] ?? null;
if (!$pid) {
  http_response_code(401);
  echo json_encode(['error' => 'unauthorized']);
  exit;
}
$pid = (int)$pid;

function config_load_icon_case(string $alias = 'i'): string
{
  return "CASE
        WHEN {$alias}.id=9001 OR LOWER({$alias}.name) LIKE '%havok%' OR LOWER({$alias}.name) LIKE '%havoc%' THEN '/spacemap_html5/graphics/havoks/1.png'
        WHEN {$alias}.category='laser' THEN '/views/userTabs/icons/laser.png'
        WHEN {$alias}.category='generator' AND {$alias}.type=4 THEN '/views/userTabs/icons/shield.png'
        WHEN {$alias}.category='generator' AND {$alias}.type=3 THEN '/views/userTabs/icons/speed.png'
        WHEN {$alias}.category='drone_design' THEN '/spacemap_html5/graphics/havoks/1.png'
        ELSE NULL
      END";
}

function config_load_ensure_ship_configs(PDO $db, int $playerId, int $shipDesignId, array $slots): array
{
  $insert = $db->prepare("INSERT IGNORE INTO ship_config (player_id, ship_design_id, name, lasers_slots, gen_slots, extras_slots)
    VALUES (:p_a,:sid_a,'A',:ls_a,:gs_a,:es_a), (:p_b,:sid_b,'B',:ls_b,:gs_b,:es_b)");
  $insert->execute([
    ':p_a' => $playerId,
    ':sid_a' => $shipDesignId,
    ':ls_a' => (int)$slots['lasers_slots'],
    ':gs_a' => (int)$slots['gen_slots'],
    ':es_a' => (int)$slots['extras_slots'],
    ':p_b' => $playerId,
    ':sid_b' => $shipDesignId,
    ':ls_b' => (int)$slots['lasers_slots'],
    ':gs_b' => (int)$slots['gen_slots'],
    ':es_b' => (int)$slots['extras_slots'],
  ]);

  $cfg = $db->prepare("SELECT id, name, lasers_slots, gen_slots, extras_slots
    FROM ship_config
    WHERE player_id = :p AND ship_design_id = :sid
    ORDER BY name");
  $cfg->execute([':p' => $playerId, ':sid' => $shipDesignId]);
  $configs = $cfg->fetchAll(PDO::FETCH_ASSOC);

  $needReload = false;
  $update = $db->prepare("UPDATE ship_config
    SET lasers_slots=:ls_set, gen_slots=:gs_set, extras_slots=:es_set
    WHERE id=:id AND (lasers_slots<>:ls_chk OR gen_slots<>:gs_chk OR extras_slots<>:es_chk)");

  foreach ($configs as $config) {
    if ((int)$config['lasers_slots'] !== (int)$slots['lasers_slots'] ||
        (int)$config['gen_slots'] !== (int)$slots['gen_slots'] ||
        (int)$config['extras_slots'] !== (int)$slots['extras_slots']) {
      $update->execute([
        ':id' => (int)$config['id'],
        ':ls_set' => (int)$slots['lasers_slots'],
        ':gs_set' => (int)$slots['gen_slots'],
        ':es_set' => (int)$slots['extras_slots'],
        ':ls_chk' => (int)$slots['lasers_slots'],
        ':gs_chk' => (int)$slots['gen_slots'],
        ':es_chk' => (int)$slots['extras_slots'],
      ]);
      $needReload = true;
    }
  }

  if ($needReload) {
    $cfg->execute([':p' => $playerId, ':sid' => $shipDesignId]);
    $configs = $cfg->fetchAll(PDO::FETCH_ASSOC);
  }

  return $configs;
}

function config_load_ensure_ship_slots(PDO $db, array $configs): void
{
  if (empty($configs)) return;

  $ids = array_map(function ($c) { return (int)$c['id']; }, $configs);
  $in = implode(',', $ids);
  $existing = [];

  $rows = $db->query("SELECT ship_config_id, row_name, slot_index FROM ship_slot WHERE ship_config_id IN ($in)")->fetchAll(PDO::FETCH_ASSOC);
  foreach ($rows as $row) {
    $existing[(int)$row['ship_config_id'] . '|' . (string)$row['row_name'] . '|' . (int)$row['slot_index']] = true;
  }

  $insert = $db->prepare('INSERT IGNORE INTO ship_slot (ship_config_id, row_name, slot_index) VALUES (:cid, :row, :idx)');
  foreach ($configs as $c) {
    $plan = [
      ['lasers',     (int)$c['lasers_slots']],
      ['generators', (int)$c['gen_slots']],
      ['extras',     (int)$c['extras_slots']],
    ];
    foreach ($plan as $spec) {
      $rowName = $spec[0];
      $count = $spec[1];
      for ($i = 0; $i < $count; $i++) {
        $key = (int)$c['id'] . '|' . $rowName . '|' . $i;
        if (!isset($existing[$key])) {
          $insert->execute([':cid' => (int)$c['id'], ':row' => $rowName, ':idx' => $i]);
          $existing[$key] = true;
        }
      }
    }
  }
}

function config_load_attach_ship_slots(PDO $db, array $configs): array
{
  if (empty($configs)) return $configs;

  $byId = [];
  $limits = [];
  foreach ($configs as $idx => $c) {
    $cid = (int)$c['id'];
    $byId[$cid] = $idx;
    $limits[$cid] = [
      'lasers' => (int)$c['lasers_slots'],
      'generators' => (int)$c['gen_slots'],
      'extras' => (int)$c['extras_slots'],
    ];
    $configs[$idx]['slots'] = [];
  }

  $in = implode(',', array_keys($byId));
  $iconCase = config_load_icon_case('i');
  $stmt = $db->query("SELECT
      s.id,
      s.ship_config_id,
      s.row_name,
      s.slot_index,
      s.item_id,
      i.name AS item_name,
      i.category AS item_category,
      i.type AS item_type,
      {$iconCase} AS item_icon
    FROM ship_slot s
    LEFT JOIN items i ON i.id = s.item_id
    WHERE s.ship_config_id IN ($in)
    ORDER BY s.ship_config_id, s.row_name, s.slot_index");

  foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $slot) {
    $cid = (int)$slot['ship_config_id'];
    if (!isset($byId[$cid])) continue;
    $rowName = (string)$slot['row_name'];
    $slotIndex = (int)$slot['slot_index'];
    if (!isset($limits[$cid][$rowName]) || $slotIndex < 0 || $slotIndex >= $limits[$cid][$rowName]) continue;
    unset($slot['ship_config_id']);
    $configs[$byId[$cid]]['slots'][] = $slot;
  }

  return $configs;
}

function config_load_ensure_drone_slot_config_table(PDO $db): void
{
  $db->exec("CREATE TABLE IF NOT EXISTS drone_slot_config (
    drone_id    INT(11) NOT NULL,
    config      CHAR(1) NOT NULL,
    slot_index  TINYINT(4) NOT NULL,
    item_id     INT(11) DEFAULT NULL,
    PRIMARY KEY (drone_id, config, slot_index),
    KEY idx_drone_config (drone_id, config)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function config_load_drone_slot_count(?int $droneItemId, string $name=''): int
{
  if (function_exists('drone_slot_count_from_item') && $droneItemId !== null) {
    return (int)drone_slot_count_from_item((int)$droneItemId);
  }

  $iid = (int)($droneItemId ?? 0);
  if ($iid === 5) return 1;
  if ($iid === 3) return 2;

  $n = strtolower($name);
  if (strpos($n, 'flax') !== false) return 1;
  return 2;
}

function config_load_drones_need_sync(array $dronesBase, array $desiredTypes): bool
{
  if (empty($desiredTypes)) return false;
  if (count($dronesBase) < count($desiredTypes)) return true;

  foreach ($desiredTypes as $idx => $desiredItem) {
    if (!isset($dronesBase[$idx])) return true;
    $current = (int)($dronesBase[$idx]['item_id'] ?? 0);
    if ($current <= 0 || $current !== (int)$desiredItem) return true;
  }

  return false;
}

function config_load_ensure_drone_slots(PDO $db, array &$dronesBase): void
{
  if (empty($dronesBase)) return;

  $ids = [];
  foreach ($dronesBase as &$drone) {
    $slotCount = config_load_drone_slot_count(isset($drone['item_id']) ? (int)$drone['item_id'] : null, (string)($drone['name'] ?? ''));
    $slotCount = max(1, min(2, $slotCount));
    $drone['slot_count'] = $slotCount;
    $ids[] = (int)$drone['id'];
  }
  unset($drone);

  $in = implode(',', array_map('intval', $ids));
  $existingGlobal = [];
  try {
    foreach ($db->query("SELECT drone_id, slot_index FROM drone_slot WHERE drone_id IN ($in)")->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $existingGlobal[(int)$row['drone_id'] . '|' . (int)$row['slot_index']] = true;
    }
  } catch (Exception $e) {
    $existingGlobal = [];
  }

  $existingCfg = [];
  foreach ($db->query("SELECT drone_id, config, slot_index FROM drone_slot_config WHERE drone_id IN ($in) AND config IN ('A','B')")->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $existingCfg[(int)$row['drone_id'] . '|' . (string)$row['config'] . '|' . (int)$row['slot_index']] = true;
  }

  $insGlobal = null;
  try {
    $insGlobal = $db->prepare('INSERT IGNORE INTO drone_slot (drone_id, slot_index, item_id) VALUES (:d, :s, NULL)');
  } catch (Exception $e) {
    // Some old installs may not have drone_slot; config slots are still enough for the UI.
    $insGlobal = null;
  }
  $insCfg = $db->prepare('INSERT IGNORE INTO drone_slot_config (drone_id, config, slot_index, item_id) VALUES (:d, :c, :s, NULL)');

  foreach ($dronesBase as $drone) {
    $did = (int)$drone['id'];
    $slotCount = (int)$drone['slot_count'];
    for ($slot = 0; $slot < $slotCount; $slot++) {
      $globalKey = $did . '|' . $slot;
      if (!isset($existingGlobal[$globalKey])) {
        if ($insGlobal !== null) {
          try {
            $insGlobal->execute([':d' => $did, ':s' => $slot]);
          } catch (Exception $e) {
            // Some old installs may not have drone_slot; config slots are still enough for the UI.
          }
        }
        $existingGlobal[$globalKey] = true;
      }
      foreach (['A', 'B'] as $cfg) {
        $cfgKey = $did . '|' . $cfg . '|' . $slot;
        if (!isset($existingCfg[$cfgKey])) {
          $insCfg->execute([':d' => $did, ':c' => $cfg, ':s' => $slot]);
          $existingCfg[$cfgKey] = true;
        }
      }
    }
  }
}

function config_load_build_drones_by_config(PDO $db, array $dronesBase): array
{
  if (empty($dronesBase)) return ['A' => [], 'B' => []];

  $ids = [];
  $slotCountById = [];
  $baseById = [];
  foreach ($dronesBase as $d) {
    $did = (int)$d['id'];
    $ids[] = $did;
    $slotCountById[$did] = (int)($d['slot_count'] ?? 2);
    $baseById[$did] = $d;
  }

  $in = implode(',', array_map('intval', $ids));

  $designsByDrone = [];
  if (function_exists('ensure_drone_design_equipped_table')) {
    ensure_drone_design_equipped_table($db);
  }

  try {
    $designIconCase = config_load_icon_case('i');
    $designSql = "SELECT
        dde.drone_id,
        dde.design_item_id,
        i.name AS design_name,
        CASE WHEN i.id=9001 OR LOWER(i.name) LIKE '%havok%' OR LOWER(i.name) LIKE '%havoc%' THEN 'drone_design' ELSE i.category END AS design_category,
        i.type AS design_type,
        {$designIconCase} AS design_icon
      FROM drone_design_equipped dde
      LEFT JOIN items i ON i.id = dde.design_item_id
      WHERE dde.drone_id IN ($in)";

    foreach ($db->query($designSql)->fetchAll(PDO::FETCH_ASSOC) as $designRow) {
      $did = (int)$designRow['drone_id'];
      $designItem = [
        'id' => (int)($designRow['design_item_id'] ?? 0),
        'name' => (string)($designRow['design_name'] ?? ''),
        'category' => (string)($designRow['design_category'] ?? ''),
        'cat' => (string)($designRow['design_category'] ?? ''),
        'type' => (int)($designRow['design_type'] ?? 0),
      ];
      $designCode = function_exists('drone_design_code_from_item') ? drone_design_code_from_item($designItem) : null;
      if (!$designCode) continue;
      $designsByDrone[$did] = [
        'design_item_id' => (int)$designRow['design_item_id'],
        'design_code' => $designCode,
        'design_name' => $designRow['design_name'] ?: ucfirst($designCode),
        'design_icon' => $designCode === 'havok' ? '/spacemap_html5/graphics/havoks/1.png' : ($designRow['design_icon'] ?? null),
      ];
    }
  } catch (Exception $e) {
    $designsByDrone = [];
  }

  $result = ['A' => [], 'B' => []];
  foreach (['A', 'B'] as $cfg) {
    foreach ($dronesBase as $d) {
      $copy = $d;
      $did = (int)($copy['id'] ?? 0);
      $design = $designsByDrone[$did] ?? null;
      $copy['design_item_id'] = $design ? (int)$design['design_item_id'] : 0;
      $copy['design_code'] = $design['design_code'] ?? null;
      $copy['design_name'] = $design['design_name'] ?? null;
      $copy['design_icon'] = $design['design_icon'] ?? null;
      $copy['slots'] = [];
      $result[$cfg][] = $copy;
    }
  }

  $indexByCfgAndId = ['A' => [], 'B' => []];
  foreach (['A', 'B'] as $cfg) {
    foreach ($result[$cfg] as $idx => $d) {
      $indexByCfgAndId[$cfg][(int)$d['id']] = $idx;
    }
  }

  $in = implode(',', array_map('intval', $ids));

  $iconCase = config_load_icon_case('i');
  $sql = "SELECT
      dsc.config,
      dsc.drone_id,
      dsc.slot_index,
      dsc.item_id,
      i.name AS item_name,
      i.category AS item_category,
      i.type AS item_type,
      {$iconCase} AS item_icon
    FROM drone_slot_config dsc
    LEFT JOIN items i ON i.id = dsc.item_id
    WHERE dsc.drone_id IN ($in) AND dsc.config IN ('A','B')
    ORDER BY dsc.drone_id, dsc.config, dsc.slot_index";

  foreach ($db->query($sql)->fetchAll(PDO::FETCH_ASSOC) as $slot) {
    $cfg = ((string)$slot['config'] === 'B') ? 'B' : 'A';
    $did = (int)$slot['drone_id'];
    if (!isset($indexByCfgAndId[$cfg][$did])) continue;
    $slotIndex = (int)$slot['slot_index'];
    if ($slotIndex < 0 || $slotIndex >= ($slotCountById[$did] ?? 2)) continue;
    unset($slot['config']);
    $result[$cfg][$indexByCfgAndId[$cfg][$did]]['slots'][] = $slot;
  }

  return $result;
}

try {
  $userStmt = $db->prepare('SELECT shipid, drones, apis_built, zeus_built, active_config FROM users WHERE id = :pid LIMIT 1');
  $userStmt->execute([':pid' => $pid]);
  $userRow = $userStmt->fetch(PDO::FETCH_ASSOC) ?: [];

  $currentShipId = (int)($userRow['shipid'] ?? 0);
  if ($currentShipId <= 0) $currentShipId = 1;

  $baseShipId = $currentShipId;
  $familyDesignIds = [$baseShipId];
  if (in_array($currentShipId, [10, 56, 59, 63, 64, 65, 66, 67], true)) {
    $baseShipId = 10;
    $familyDesignIds = [10, 56, 59, 63, 64, 65, 66, 67];
  } elseif (in_array($currentShipId, [8, 17, 18], true)) {
    $baseShipId = 8;
    $familyDesignIds = [8, 17, 18];
  }

  $shipDesignId = $currentShipId;

  $slots = ['lasers_slots' => 10, 'gen_slots' => 4, 'extras_slots' => 6];
  $ds = $db->prepare("SELECT laser_slots_2010 AS lasers_slots, generator_slots_2010 AS gen_slots, extra_slots_2010 AS extras_slots
    FROM ship_design
    WHERE ship_design_id = :sid
    LIMIT 1");
  $ds->execute([':sid' => $shipDesignId]);
  if ($r = $ds->fetch(PDO::FETCH_ASSOC)) {
    $slots['lasers_slots'] = (int)$r['lasers_slots'];
    $slots['gen_slots'] = (int)$r['gen_slots'];
    $slots['extras_slots'] = (int)$r['extras_slots'];
  }

  $iconCase = config_load_icon_case('i');
  $inv = $db->prepare("SELECT
      i.id,
      i.name,
      CASE WHEN i.id=9001 OR LOWER(i.name) LIKE '%havok%' OR LOWER(i.name) LIKE '%havoc%' THEN 'drone_design' ELSE i.category END AS category,
      i.type,
      i.selling_credits,
      {$iconCase} AS icon,
      SUM(pi.qty) AS qty
    FROM items i
    JOIN player_inventory pi ON pi.item_id = i.id
    WHERE pi.player_id = :pid AND (i.category IN ('laser', 'generator', 'extra', 'drone_design') OR i.id=9001 OR LOWER(i.name) LIKE '%havok%' OR LOWER(i.name) LIKE '%havoc%')
    GROUP BY i.id, i.name, i.category, i.type, i.selling_credits
    HAVING qty > 0
    ORDER BY i.category, i.name");
  $inv->execute([':pid' => $pid]);
  $inventory = $inv->fetchAll(PDO::FETCH_ASSOC);

  $SKIN_META = [
    10 => ['name' => 'Goliath (Standard)',  'bonus' => ''],
    56 => ['name' => 'Goliath Enforcer',    'bonus' => '+5% Damage'],
    59 => ['name' => 'Goliath Bastion',     'bonus' => '+10% Shield'],
    63 => ['name' => 'Goliath Solace',      'bonus' => '+10% Shield + Ability'],
    64 => ['name' => 'Goliath Diminisher',  'bonus' => '+5% Damage + Ability'],
    65 => ['name' => 'Goliath Spectrum',    'bonus' => '+25% Shield + Ability'],
    66 => ['name' => 'Goliath Sentinel',    'bonus' => '+10% Shield + Ability'],
    67 => ['name' => 'Goliath Venom',       'bonus' => '+5% Damage + Ability'],
    8  => ['name' => 'Vengeance (Standard)','bonus' => ''],
    17 => ['name' => 'Vengeance Enforcer',  'bonus' => '+5% Damage'],
    18 => ['name' => 'Vengeance Lightning', 'bonus' => 'Lightning Design'],
  ];

  $mkSkin = function (int $id) use ($SKIN_META) {
    $m = $SKIN_META[$id] ?? ['name' => 'Design #' . $id, 'bonus' => ''];
    return [
      'design_id' => $id,
      'name' => $m['name'],
      'bonus' => $m['bonus'],
      'image' => "/img/shop/{$id}.png",
    ];
  };

  $availableSkins = [$mkSkin((int)$baseShipId)];
  $candidates = array_values(array_filter($familyDesignIds, function ($x) use ($baseShipId) {
    return (int)$x !== (int)$baseShipId;
  }));

  if (!empty($candidates)) {
    $placeholders = implode(',', array_fill(0, count($candidates), '?'));
    $st = $db->prepare("SELECT design_id FROM player_designs WHERE player_id = ? AND design_id IN ($placeholders)");
    $st->execute(array_merge([$pid], $candidates));
    $owned = array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN, 0));
    foreach ($candidates as $did) {
      if (in_array((int)$did, $owned, true)) {
        $availableSkins[] = $mkSkin((int)$did);
      }
    }
  }

  $configs = config_load_ensure_ship_configs($db, $pid, $shipDesignId, $slots);
  config_load_ensure_ship_slots($db, $configs);
  $configs = config_load_attach_ship_slots($db, $configs);

  config_load_ensure_drone_slot_config_table($db);
  if (function_exists('ensure_drone_design_equipped_table')) {
    ensure_drone_design_equipped_table($db);
  }

  $desiredTypes = [];
  if (function_exists('parse_user_drones_types')) {
    $desiredTypes = parse_user_drones_types($userRow);
  }
  if (empty($desiredTypes) && function_exists('count_user_drones_row')) {
    $desired = (int)count_user_drones_row($userRow);
    if ($desired > 0) $desiredTypes = array_fill(0, $desired, 3);
  }

  $dr = $db->prepare('SELECT id, name, item_id FROM drone WHERE player_id=:p ORDER BY id');
  $dr->execute([':p' => $pid]);
  $dronesBase = $dr->fetchAll(PDO::FETCH_ASSOC);

  if (!empty($desiredTypes) && function_exists('sync_drones_tables') && config_load_drones_need_sync($dronesBase, $desiredTypes)) {
    sync_drones_tables($db, $pid, $desiredTypes);
    $dr->execute([':p' => $pid]);
    $dronesBase = $dr->fetchAll(PDO::FETCH_ASSOC);
  }

  config_load_ensure_drone_slots($db, $dronesBase);
  $dronesByConfig = config_load_build_drones_by_config($db, $dronesBase);
  $dronesA = $dronesByConfig['A'];
  $dronesB = $dronesByConfig['B'];

  $ac = (int)($userRow['active_config'] ?? 0);
  $activeName = ($ac === 2) ? 'B' : 'A';
  $dronesCompat = ($activeName === 'B') ? $dronesB : $dronesA;

  echo json_encode([
    'player_id' => $pid,
    'ship_design_id' => $currentShipId,
    'current_skin_id' => $currentShipId,
    'base_ship_id' => $baseShipId,
    'available_skins' => $availableSkins,
    'inventory' => $inventory,
    'configs' => $configs,
    'dronesA' => $dronesA,
    'dronesB' => $dronesB,
    'drones' => $dronesCompat,
    'active_config' => $ac,
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['error' => 'load_failed', 'message' => $e->getMessage()]);
}
