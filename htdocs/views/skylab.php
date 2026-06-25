<?php
$skylabAssets = 'img/skylab/';
$skylabModuleAssets = $skylabAssets . 'modules_large/';

$skylabOres = [
    ['name' => 'Prometium', 'amount' => 12480, 'capacity' => 64000],
    ['name' => 'Endurium', 'amount' => 11820, 'capacity' => 64000],
    ['name' => 'Terbium', 'amount' => 9720, 'capacity' => 64000],
    ['name' => 'Prometid', 'amount' => 820, 'capacity' => 12000],
    ['name' => 'Duranium', 'amount' => 760, 'capacity' => 12000],
    ['name' => 'Xenomit', 'amount' => 180, 'capacity' => 4000],
    ['name' => 'Promerium', 'amount' => 92, 'capacity' => 4000],
    ['name' => 'Seprom', 'amount' => 12, 'capacity' => 1000],
];

$skylabLayers = [
    ['file' => 'uplink_prometiumCollector.png', 'left' => 223, 'top' => 81, 'class' => 'uplink'],
    ['file' => 'uplink_enduriumCollector.png', 'left' => 161, 'top' => 132, 'class' => 'uplink'],
    ['file' => 'uplink_terbiumCollector.png', 'left' => 66, 'top' => 215, 'class' => 'uplink'],
    ['file' => 'uplink_prometidRefinery.png', 'left' => 458, 'top' => 90, 'class' => 'uplink'],
    ['file' => 'uplink_duraniumRefinery.png', 'left' => 506, 'top' => 137, 'class' => 'uplink'],
    ['file' => 'uplink_promeriumRefinery.png', 'left' => 458, 'top' => 208, 'class' => 'uplink'],
    ['file' => 'uplink_xenoModule.png', 'left' => 526, 'top' => 301, 'class' => 'uplink'],
    ['file' => 'uplink_sepromRefinery.png', 'left' => 475, 'top' => 355, 'class' => 'uplink'],
    ['file' => 'prometium_collector_layer.gif', 'left' => 207, 'top' => 141, 'class' => 'machine'],
    ['file' => 'endurium_collector_layer.gif', 'left' => 126, 'top' => 192, 'class' => 'machine'],
    ['file' => 'terbium_collector_layer.gif', 'left' => 54, 'top' => 244, 'class' => 'machine'],
    ['file' => 'prometid_refinery_layer.gif', 'left' => 389, 'top' => 181, 'class' => 'machine'],
    ['file' => 'duranium_refinery_layer.gif', 'left' => 452, 'top' => 195, 'class' => 'machine'],
    ['file' => 'promerium_refinery_layer.gif', 'left' => 387, 'top' => 258, 'class' => 'machine'],
    ['file' => 'xeno_module_layer.gif', 'left' => 450, 'top' => 267, 'class' => 'machine'],
    ['file' => 'seprom_refinery_layer.gif', 'left' => 387, 'top' => 313, 'class' => 'machine'],
];

$skylabModules = [
    'solar' => ['name' => 'Solar module', 'type' => 'Energy', 'level' => 8, 'power' => 0, 'production' => 'Energy capacity: 950', 'consumption' => 'No energy consumption', 'efficiency' => '100%', 'left' => 262, 'top' => 12, 'state' => 'Active'],
    'prometium' => ['name' => 'Prometium collector', 'type' => 'Collector', 'level' => 8, 'power' => 85, 'production' => '+3,200 Prometium/hour', 'consumption' => '85 energy', 'efficiency' => '100%', 'left' => 65, 'top' => 13, 'state' => 'Active'],
    'endurium' => ['name' => 'Endurium collector', 'type' => 'Collector', 'level' => 8, 'power' => 85, 'production' => '+3,200 Endurium/hour', 'consumption' => '85 energy', 'efficiency' => '100%', 'left' => 7, 'top' => 61, 'state' => 'Active'],
    'terbium' => ['name' => 'Terbium collector', 'type' => 'Collector', 'level' => 8, 'power' => 85, 'production' => '+3,200 Terbium/hour', 'consumption' => '85 energy', 'efficiency' => '100%', 'left' => 7, 'top' => 124, 'state' => 'Active'],
    'prometid' => ['name' => 'Prometid refinery', 'type' => 'Refinery', 'level' => 6, 'power' => 115, 'production' => '+160 Prometid/hour', 'consumption' => 'Consumes Prometium and Endurium', 'efficiency' => '100%', 'left' => 505, 'top' => 15, 'state' => 'Active'],
    'duranium' => ['name' => 'Duranium refinery', 'type' => 'Refinery', 'level' => 6, 'power' => 115, 'production' => '+160 Duranium/hour', 'consumption' => 'Consumes Endurium and Terbium', 'efficiency' => '100%', 'left' => 576, 'top' => 57, 'state' => 'Active'],
    'promerium' => ['name' => 'Promerium refinery', 'type' => 'Refinery', 'level' => 4, 'power' => 145, 'production' => '+18 Promerium/hour', 'consumption' => 'Consumes Prometid, Duranium and Xenomit', 'efficiency' => '100%', 'left' => 580, 'top' => 128, 'state' => 'Active'],
    'xeno' => ['name' => 'Xeno module', 'type' => 'Support', 'level' => 3, 'power' => 110, 'production' => 'Supports Promerium production.', 'consumption' => '110 energy', 'efficiency' => '100%', 'left' => 586, 'top' => 198, 'state' => 'Active'],
    'transport' => ['name' => 'Transport module', 'type' => 'Logistics', 'level' => 5, 'power' => 45, 'production' => 'Moves ores between Skylab and ship cargo.', 'consumption' => '45 energy', 'efficiency' => '100%', 'left' => 3, 'top' => 274, 'state' => 'Read-only'],
    'storage' => ['name' => 'Storage module', 'type' => 'Storage', 'level' => 7, 'power' => 70, 'production' => 'Increases Skylab storage capacity.', 'consumption' => '70 energy', 'efficiency' => '100%', 'left' => 96, 'top' => 314, 'state' => 'Active'],
    'basic' => ['name' => 'Basic module', 'type' => 'Core', 'level' => 8, 'power' => 90, 'production' => 'Unlocks higher module levels.', 'consumption' => '90 energy', 'efficiency' => '100%', 'left' => 400, 'top' => 315, 'state' => 'Active'],
    'seprom' => ['name' => 'Seprom refinery', 'type' => 'Refinery', 'level' => 2, 'power' => 175, 'production' => '+2 Seprom/hour', 'consumption' => 'Consumes Promerium', 'efficiency' => '100%', 'left' => 580, 'top' => 315, 'state' => 'Active'],
];

$selectedModuleId = 'prometium';
$selectedModule = $skylabModules[$selectedModuleId];

foreach ($skylabModules as $key => $module) {
    $skylabModules[$key]['active'] = false;
    $skylabModules[$key]['canUpgrade'] = false;
    $skylabModules[$key]['canToggle'] = false;
    $skylabModules[$key]['canTransport'] = false;
    $skylabModules[$key]['resourceKey'] = null;
    $skylabModules[$key]['upgrading'] = false;
    $skylabModules[$key]['upgradeRemainingSeconds'] = 0;
    $skylabModules[$key]['nextLevelCost'] = null;
}

$skylabState = [
    'available' => false,
    'message' => 'Skylab database is not installed yet. Preview mode is active.',
    'resources' => [],
    'modules' => [],
    'energy' => ['available' => 0, 'consumed' => 0, 'free' => 0],
    'transports' => [],
    'cargo_note' => '',
];

try {
    require_once __DIR__ . '/../libs/SkylabService.php';

    if (isset($db, $sessionPlayerId) && (int)$sessionPlayerId > 0) {
        $skylabService = new SkylabService($db, (int)$sessionPlayerId);
        $skylabState = $skylabService->getState();
    }
} catch (Throwable $e) {
    $skylabState['available'] = false;
    $skylabState['message'] = 'Skylab is temporarily unavailable. Preview mode is active.';
}

$skylabAvailable = !empty($skylabState['available']);
$skylabMessage = (string)($skylabState['message'] ?? '');

if (!empty($skylabState['resources']) && is_array($skylabState['resources'])) {
    $skylabOres = $skylabState['resources'];
}

if (!empty($skylabState['modules']) && is_array($skylabState['modules'])) {
    foreach ($skylabState['modules'] as $key => $module) {
        if (!isset($skylabModules[$key]) || !is_array($module)) {
            continue;
        }

        $skylabModules[$key] = array_merge($skylabModules[$key], [
            'name' => (string)($module['name'] ?? $skylabModules[$key]['name']),
            'type' => (string)($module['type'] ?? $skylabModules[$key]['type']),
            'level' => (int)($module['level'] ?? $skylabModules[$key]['level']),
            'power' => (int)($module['power'] ?? $skylabModules[$key]['power']),
            'production' => (string)($module['production'] ?? $skylabModules[$key]['production']),
            'consumption' => (string)($module['consumption'] ?? $skylabModules[$key]['consumption']),
            'efficiency' => (string)($module['efficiency'] ?? $skylabModules[$key]['efficiency']),
            'state' => (string)($module['state'] ?? $skylabModules[$key]['state']),
            'active' => !empty($module['active']),
            'canUpgrade' => !empty($module['canUpgrade']),
            'canToggle' => !empty($module['canToggle']),
            'canTransport' => !empty($module['canTransport']),
            'resourceKey' => $module['resourceKey'] ?? null,
            'upgrading' => !empty($module['upgrading']),
            'upgradeRemainingSeconds' => (int)($module['upgradeRemainingSeconds'] ?? 0),
            'nextLevelCost' => $module['nextLevelCost'] ?? null,
        ]);
    }
}

$selectedModule = $skylabModules[$selectedModuleId];
$skylabCsrfToken = (string)($skylabCsrfToken ?? ($_SESSION['skylab_csrf_token'] ?? ''));
?>

<style>
    .skylab-page {
        display: flex;
        justify-content: center;
        padding: 1.5rem 1rem;
        width: 100%;
    }

    .skylab-shell {
        width: min(100%, 824px);
        background: #070d13;
        border: 1px solid rgba(74, 92, 106, 0.92);
        border-radius: 4px;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
        overflow: hidden;
    }

    .skylab-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        min-height: 48px;
        padding: 0.6rem 0.95rem;
        border-bottom: 1px solid #243642;
        background: linear-gradient(180deg, #141e25 0%, #0a1016 100%);
    }

    .skylab-title {
        margin: 0;
        color: #f5f8fb;
        font-size: 1rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .skylab-subtitle {
        margin: 0.15rem 0 0;
        color: #8ea3ae;
        font-size: 0.72rem;
    }

    .skylab-badge {
        color: #d7edf6;
        border: 1px solid rgba(122, 153, 169, 0.7);
        background: rgba(12, 20, 27, 0.92);
        font-size: 0.7rem;
        font-weight: 800;
        padding: 0.35rem 0.65rem;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .skylab-status-line {
        padding: 0.55rem 0.95rem;
        border-bottom: 1px solid #172733;
        background: rgba(8, 16, 23, 0.92);
        color: #9fc7d8;
        font-size: 0.72rem;
        font-weight: 800;
    }

    .skylab-status-line.is-preview {
        color: #f2d477;
    }

    .skylab-body {
        display: flex;
        justify-content: center;
        padding: 0.75rem;
        background: radial-gradient(circle at center, rgba(22, 42, 54, 0.45), rgba(4, 8, 12, 0.98) 72%);
    }

    .skylab-map-wrap {
        display: flex;
        justify-content: center;
        max-width: 100%;
        overflow: hidden;
        padding: 0;
        width: 100%;
    }

    .skylab-map {
        position: relative;
        box-sizing: border-box;
        flex: 0 0 auto;
        width: 772px;
        height: 407px;
        background: url("<?php echo $skylabAssets; ?>background.jpg") center / 100% 100% no-repeat;
        border: 1px solid #293d49;
        box-shadow: inset 0 0 34px rgba(0, 0, 0, 0.72), 0 0 22px rgba(0, 0, 0, 0.55);
        transform-origin: top center;
        isolation: isolate;
    }

    .skylab-resource-bar {
        position: absolute;
        top: 11px;
        left: 8px;
        z-index: 12;
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 3px;
        width: 756px;
        pointer-events: none;
    }

    .skylab-resource {
        min-height: 34px;
        padding: 3px 5px;
        border: 1px solid rgba(83, 110, 124, 0.82);
        background: linear-gradient(180deg, rgba(9, 16, 22, 0.96), rgba(2, 7, 11, 0.96));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -10px 16px rgba(255, 255, 255, 0.03);
    }

    .skylab-resource-name {
        display: block;
        color: #eff8ff;
        font-size: 0.58rem;
        font-weight: 900;
        line-height: 1.1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .skylab-resource-value {
        display: block;
        margin-top: 2px;
        color: #a7d7ed;
        font-size: 0.58rem;
        font-weight: 700;
        line-height: 1.1;
        white-space: nowrap;
    }

    .skylab-resource-track {
        display: block;
        height: 3px;
        margin-top: 3px;
        background: #050b10;
        border: 1px solid rgba(35, 55, 65, 0.86);
        overflow: hidden;
    }

    .skylab-resource-fill {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #0b7194, #69d6f3);
    }

    .skylab-layer {
        position: absolute;
        pointer-events: none;
        user-select: none;
    }

    .skylab-layer.uplink {
        opacity: 0.8;
        mix-blend-mode: screen;
    }

    .skylab-modules-layer {
        position: absolute;
        left: 16px;
        top: 50px;
        z-index: 14;
        width: 772px;
        height: 364px;
    }

    .skylab-module {
        position: absolute;
        width: 132px;
        height: 43px;
        border: 0;
        color: #f4fbff;
        cursor: pointer;
        padding: 5px 8px;
        text-align: left;
        background:
            url("<?php echo $skylabAssets; ?>box_small_left_top_active.png") left top no-repeat,
            url("<?php echo $skylabAssets; ?>box_small_right_top_active.png") right top no-repeat,
            url("<?php echo $skylabAssets; ?>box_small_left_bottom_active.png") left bottom no-repeat,
            url("<?php echo $skylabAssets; ?>box_small_right_bottom_active.png") right bottom no-repeat,
            rgba(2, 8, 13, 0.78);
        font-family: Arial, Helvetica, sans-serif;
        overflow: hidden;
    }

    .skylab-module:hover,
    .skylab-module.is-selected {
        filter: brightness(1.18);
    }

    .skylab-module.is-selected {
        box-shadow: 0 0 0 1px rgba(108, 203, 238, 0.85), 0 0 12px rgba(80, 181, 230, 0.28);
    }

    .skylab-module-name {
        display: block;
        color: #fff;
        font-size: 0.66rem;
        font-weight: 900;
        line-height: 1.08;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 0 1px 1px #000;
        white-space: nowrap;
    }

    .skylab-module-meta {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        margin-top: 5px;
        color: #d7edf6;
        font-size: 0.65rem;
        font-weight: 900;
        line-height: 14px;
    }

    .skylab-module-icon-text {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 36px;
    }

    .skylab-module-icon-text img {
        width: 14px;
        height: 14px;
        object-fit: contain;
    }

    .skylab-popup {
        position: absolute;
        z-index: 30;
        right: 14px;
        top: 52px;
        width: 359px;
        color: #e6f5fa;
        font-family: Arial, Helvetica, sans-serif;
        filter: drop-shadow(0 14px 20px rgba(0, 0, 0, 0.56));
    }

    .skylab-popup.is-hidden {
        display: none;
    }

    .skylab-popup-header {
        position: relative;
        height: 39px;
        background: url("<?php echo $skylabModuleAssets; ?>popup_header.png") left top no-repeat;
    }

    .skylab-popup-title {
        display: block;
        padding: 10px 44px 0 16px;
        color: #ffcc00;
        font-size: 0.78rem;
        font-weight: 900;
        line-height: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 0 1px 1px #000;
        white-space: nowrap;
    }

    .skylab-popup-close {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 24px;
        height: 24px;
        border: 0;
        background: url("<?php echo $skylabModuleAssets; ?>close_button_sprite.png") no-repeat center -24px;
        cursor: pointer;
        font-size: 0;
    }

    .skylab-popup-close:hover {
        background-position: center 0;
    }

    .skylab-popup-close:active {
        background-position: center -48px;
    }

    .skylab-popup-middle {
        min-height: 260px;
        background: url("<?php echo $skylabModuleAssets; ?>popup_middle.png") left top repeat-y;
        padding: 6px 16px 0;
    }

    .skylab-popup-tabs {
        display: flex;
        align-items: flex-end;
        gap: 0;
        height: 18px;
        margin-bottom: 4px;
    }

    .skylab-popup-tab {
        width: 76px;
        height: 16px;
        border: 0;
        background: url("<?php echo $skylabModuleAssets; ?>subtab_sprite_76x16px.png") left top no-repeat;
        color: #dcecf2;
        font-size: 0.61rem;
        font-weight: 900;
        line-height: 16px;
        text-align: center;
    }

    .skylab-popup-tab.is-active {
        color: #fff6c7;
    }

    .skylab-popup-content {
        min-height: 196px;
        padding: 20px 24px;
        background: url("<?php echo $skylabModuleAssets; ?>content_bg_326x243px.png") left top / 100% 100% no-repeat;
    }

    .skylab-popup-row {
        display: grid;
        grid-template-columns: 122px 1fr;
        align-items: center;
        min-height: 25px;
        color: #eaf8fc;
        font-size: 0.72rem;
        font-weight: 900;
    }

    .skylab-popup-value {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f8d76f;
    }

    .skylab-popup-value img {
        width: 14px;
        height: 14px;
        object-fit: contain;
    }

    .skylab-popup-progress {
        position: relative;
        width: 218px;
        height: 14px;
        margin: 12px 0 11px;
    }

    .skylab-popup-progress img {
        position: absolute;
        inset: 0;
    }

    .skylab-popup-message {
        color: #9fb5bf;
        font-size: 0.66rem;
        line-height: 1.35;
    }

    .skylab-popup-actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-top: 9px;
    }

    .skylab-popup-action {
        min-height: 24px;
        border: 1px solid #52626b;
        background: url("<?php echo $skylabAssets; ?>bg_button.png") center / 100% 100% repeat-x;
        color: #c6d7df;
        cursor: not-allowed;
        font-size: 0.62rem;
        font-weight: 900;
        text-transform: uppercase;
    }

    .skylab-popup-action:not(:disabled) {
        color: #f2fbff;
        cursor: pointer;
    }

    .skylab-popup-action:not(:disabled):hover {
        filter: brightness(1.18);
    }

    .skylab-popup-transport {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin-top: 10px;
        opacity: 0.8;
    }

    .skylab-transports {
        margin-top: 9px;
        color: #9fb5bf;
        font-size: 0.64rem;
        line-height: 1.3;
    }

    .skylab-transport-row {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 6px;
        min-height: 22px;
        border-top: 1px solid rgba(104, 130, 142, 0.2);
        padding-top: 5px;
    }

    .skylab-transport-collect {
        border: 1px solid #52626b;
        background: rgba(16, 30, 39, 0.92);
        color: #f2fbff;
        cursor: pointer;
        font-size: 0.58rem;
        font-weight: 900;
        text-transform: uppercase;
    }

    .skylab-popup-footer {
        height: 47px;
        background: url("<?php echo $skylabModuleAssets; ?>popup_footer.png") left top no-repeat;
    }

    @media (max-width: 860px) {
        .skylab-shell {
            width: 100%;
        }

        .skylab-head {
            align-items: flex-start;
            flex-direction: column;
        }
    }
</style>

<section class="skylab-page">
    <div class="skylab-shell">
        <header class="skylab-head">
            <div>
                <h1 class="skylab-title">Skylab</h1>
                <p class="skylab-subtitle"><?php echo $skylabAvailable ? 'Manage ore production, module upgrades and ship transports.' : htmlspecialchars($skylabMessage, ENT_QUOTES, 'UTF-8'); ?></p>
            </div>
            <span class="skylab-badge"><?php echo $skylabAvailable ? 'Online' : 'Preview mode'; ?></span>
        </header>
        <div class="skylab-status-line<?php echo $skylabAvailable ? '' : ' is-preview'; ?>" id="skylab-status-line">
            <?php echo htmlspecialchars($skylabMessage, ENT_QUOTES, 'UTF-8'); ?>
        </div>

        <div class="skylab-body">
            <div class="skylab-map-wrap">
                <div class="skylab-map" aria-label="Skylab visual layout">
                    <div class="skylab-resource-bar">
                        <?php foreach ($skylabOres as $ore) {
                            $ratio = $ore['capacity'] > 0 ? min(100, max(0, ($ore['amount'] / $ore['capacity']) * 100)) : 0;
                        ?>
                            <div class="skylab-resource">
                                <span class="skylab-resource-name"><?php echo htmlspecialchars($ore['name'], ENT_QUOTES, 'UTF-8'); ?></span>
                                <span class="skylab-resource-value" data-skylab-resource-value="<?php echo htmlspecialchars((string)($ore['key'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>"><?php echo number_format($ore['amount']); ?> / <?php echo number_format($ore['capacity']); ?></span>
                                <span class="skylab-resource-track"><span class="skylab-resource-fill" style="width: <?php echo number_format($ratio, 2, '.', ''); ?>%;"></span></span>
                            </div>
                        <?php } ?>
                    </div>

                    <?php foreach ($skylabLayers as $layer) { ?>
                        <img class="skylab-layer <?php echo htmlspecialchars($layer['class'], ENT_QUOTES, 'UTF-8'); ?>"
                             src="<?php echo $skylabAssets . htmlspecialchars($layer['file'], ENT_QUOTES, 'UTF-8'); ?>"
                             alt=""
                             style="left: <?php echo (int)$layer['left']; ?>px; top: <?php echo (int)$layer['top']; ?>px;" />
                    <?php } ?>

                    <div class="skylab-modules-layer">
                        <?php foreach ($skylabModules as $key => $module) { ?>
                            <button class="skylab-module"
                                    type="button"
                                    data-skylab-module="<?php echo htmlspecialchars($key, ENT_QUOTES, 'UTF-8'); ?>"
                                    style="left: <?php echo (int)$module['left']; ?>px; top: <?php echo (int)$module['top']; ?>px;">
                                <span class="skylab-module-name"><?php echo htmlspecialchars($module['name'], ENT_QUOTES, 'UTF-8'); ?></span>
                                <span class="skylab-module-meta">
                                    <span class="skylab-module-icon-text">
                                        <img src="<?php echo $skylabAssets; ?>icon_level.png" alt="" />
                                        <span data-skylab-module-level="<?php echo htmlspecialchars($key, ENT_QUOTES, 'UTF-8'); ?>"><?php echo (int)$module['level']; ?></span>
                                    </span>
                                    <span class="skylab-module-icon-text">
                                        <img src="<?php echo $skylabAssets; ?>power.png" alt="" />
                                        <span data-skylab-module-power="<?php echo htmlspecialchars($key, ENT_QUOTES, 'UTF-8'); ?>"><?php echo (int)$module['power']; ?></span>
                                    </span>
                                </span>
                            </button>
                        <?php } ?>
                    </div>

                    <div class="skylab-popup is-hidden" id="skylab-module-popup">
                        <div class="skylab-popup-header">
                            <span class="skylab-popup-title" id="skylab-popup-name"><?php echo htmlspecialchars($selectedModule['name'], ENT_QUOTES, 'UTF-8'); ?></span>
                            <button class="skylab-popup-close" type="button" id="skylab-popup-close">Close</button>
                        </div>
                        <div class="skylab-popup-middle">
                            <div class="skylab-popup-tabs" aria-hidden="true">
                                <span class="skylab-popup-tab is-active">Overview</span>
                                <span class="skylab-popup-tab">Upgrade</span>
                            </div>
                            <div class="skylab-popup-content">
                                <div class="skylab-popup-row">
                                    <span>Level</span>
                                    <span class="skylab-popup-value">
                                        <img src="<?php echo $skylabAssets; ?>icon_level.png" alt="" />
                                        <span id="skylab-popup-level"><?php echo (int)$selectedModule['level']; ?></span>
                                    </span>
                                </div>
                                <div class="skylab-popup-row">
                                    <span>Power consumption</span>
                                    <span class="skylab-popup-value">
                                        <img src="<?php echo $skylabAssets; ?>power.png" alt="" />
                                        <span id="skylab-popup-power"><?php echo (int)$selectedModule['power']; ?></span>
                                    </span>
                                </div>
                                <div class="skylab-popup-row">
                                    <span>Production</span>
                                    <span class="skylab-popup-value" id="skylab-popup-production"><?php echo htmlspecialchars($selectedModule['production'], ENT_QUOTES, 'UTF-8'); ?></span>
                                </div>
                                <div class="skylab-popup-row">
                                    <span>Efficiency</span>
                                    <span class="skylab-popup-value">
                                        <img src="<?php echo $skylabAssets; ?>efficiency.png" alt="" />
                                        <span id="skylab-popup-efficiency"><?php echo htmlspecialchars($selectedModule['efficiency'], ENT_QUOTES, 'UTF-8'); ?></span>
                                    </span>
                                </div>
                                <div class="skylab-popup-progress" aria-hidden="true">
                                    <img src="<?php echo $skylabAssets; ?>construction_grid.png" alt="" />
                                    <img src="<?php echo $skylabModuleAssets; ?>progressbar_01.png" alt="" />
                                </div>
                                <div class="skylab-popup-row">
                                    <span>State</span>
                                    <span class="skylab-popup-value" id="skylab-popup-state"><?php echo htmlspecialchars($selectedModule['state'], ENT_QUOTES, 'UTF-8'); ?></span>
                                </div>
                                <p class="skylab-popup-message" id="skylab-popup-consumption"><?php echo htmlspecialchars($selectedModule['consumption'], ENT_QUOTES, 'UTF-8'); ?></p>
                                <div class="skylab-popup-actions">
                                    <button class="skylab-popup-action" type="button" id="skylab-upgrade-action" <?php echo $skylabAvailable && !empty($selectedModule['canUpgrade']) ? '' : 'disabled'; ?>>Upgrade</button>
                                    <button class="skylab-popup-action" type="button" id="skylab-toggle-action" <?php echo $skylabAvailable && !empty($selectedModule['canToggle']) ? '' : 'disabled'; ?>><?php echo !empty($selectedModule['active']) ? 'Deactivate' : 'Activate'; ?></button>
                                    <button class="skylab-popup-action" type="button" id="skylab-transport-action" <?php echo $skylabAvailable && !empty($selectedModule['canTransport']) ? '' : 'disabled'; ?>>Transport</button>
                                </div>
                                <div class="skylab-popup-transport" aria-hidden="true">
                                    <img src="<?php echo $skylabAssets; ?>to_ship_0.png" alt="" width="29" height="36" />
                                    <img src="<?php echo $skylabAssets; ?>but_right_0.png" alt="" width="23" height="17" />
                                    <img src="<?php echo $skylabAssets; ?>to_skylab_0.png" alt="" width="41" height="36" />
                                </div>
                                <div class="skylab-transports" id="skylab-transports"></div>
                            </div>
                        </div>
                        <div class="skylab-popup-footer"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<script>
    window.andromedaSkylabModules = <?php echo json_encode($skylabModules, JSON_UNESCAPED_SLASHES); ?>;
    window.andromedaSkylabState = <?php echo json_encode($skylabState, JSON_UNESCAPED_SLASHES); ?>;
    window.andromedaSkylabConfig = {
        available: <?php echo $skylabAvailable ? 'true' : 'false'; ?>,
        csrfToken: <?php echo json_encode($skylabCsrfToken, JSON_UNESCAPED_SLASHES); ?>,
        apiUrl: "views/skylab/api.php"
    };

    (function() {
        const mapWrap = document.querySelector(".skylab-map-wrap");
        const map = document.querySelector(".skylab-map");
        const popup = document.getElementById("skylab-module-popup");
        const statusLine = document.getElementById("skylab-status-line");
        const transportsBox = document.getElementById("skylab-transports");
        const actions = {
            upgrade: document.getElementById("skylab-upgrade-action"),
            toggle: document.getElementById("skylab-toggle-action"),
            transport: document.getElementById("skylab-transport-action")
        };
        const fields = {
            name: document.getElementById("skylab-popup-name"),
            level: document.getElementById("skylab-popup-level"),
            power: document.getElementById("skylab-popup-power"),
            production: document.getElementById("skylab-popup-production"),
            efficiency: document.getElementById("skylab-popup-efficiency"),
            state: document.getElementById("skylab-popup-state"),
            consumption: document.getElementById("skylab-popup-consumption")
        };
        let selectedModuleId = null;
        let modules = window.andromedaSkylabModules || {};
        let skylabState = window.andromedaSkylabState || {};
        const config = window.andromedaSkylabConfig || {};

        function resizeSkylabMap() {
            if (!mapWrap || !map) return;
            const scale = Math.min(1, mapWrap.clientWidth / 772);
            map.style.transform = "scale(" + scale + ")";
            mapWrap.style.height = Math.ceil(414 * scale) + "px";
        }

        function formatNumber(value) {
            return Number(value || 0).toLocaleString("en-US");
        }

        function showMessage(message, isError) {
            if (!statusLine || !message) return;
            statusLine.textContent = message;
            statusLine.classList.toggle("is-preview", !!isError || !config.available);
        }

        function getSelectedModule() {
            return selectedModuleId ? modules[selectedModuleId] : null;
        }

        function updateActionButtons(module) {
            if (!module) return;
            const enabled = !!config.available;
            actions.upgrade.disabled = !enabled || !module.canUpgrade;
            actions.toggle.disabled = !enabled || !module.canToggle;
            actions.transport.disabled = !enabled || !module.canTransport;
            actions.toggle.textContent = module.active ? "Deactivate" : "Activate";
        }

        function updatePopup(module) {
            if (!module) return;
            fields.name.textContent = module.name;
            fields.level.textContent = module.level;
            fields.power.textContent = module.power;
            fields.production.textContent = module.production;
            fields.efficiency.textContent = module.efficiency;
            fields.state.textContent = module.state;
            fields.consumption.textContent = module.consumption;
            updateActionButtons(module);
        }

        function selectModule(button) {
            selectedModuleId = button.getAttribute("data-skylab-module");
            const module = modules[selectedModuleId];
            if (!module) return;

            document.querySelectorAll("[data-skylab-module]").forEach(function(item) {
                item.classList.toggle("is-selected", item === button);
            });

            updatePopup(module);
            popup.classList.remove("is-hidden");
        }

        function updateResources(resources) {
            if (!Array.isArray(resources)) return;
            resources.forEach(function(resource) {
                const value = document.querySelector('[data-skylab-resource-value="' + resource.key + '"]');
                if (!value) return;
                const track = value.parentElement ? value.parentElement.querySelector(".skylab-resource-fill") : null;
                const capacity = Number(resource.capacity || 0);
                const amount = Number(resource.amount || 0);
                value.textContent = formatNumber(amount) + " / " + formatNumber(capacity);
                if (track) {
                    const ratio = capacity > 0 ? Math.min(100, Math.max(0, (amount / capacity) * 100)) : 0;
                    track.style.width = ratio.toFixed(2) + "%";
                }
            });
        }

        function updateModuleButtons() {
            Object.keys(modules).forEach(function(moduleId) {
                const module = modules[moduleId];
                const level = document.querySelector('[data-skylab-module-level="' + moduleId + '"]');
                const power = document.querySelector('[data-skylab-module-power="' + moduleId + '"]');
                if (level) level.textContent = module.level || 0;
                if (power) power.textContent = module.power || 0;
            });
        }

        function renderTransports() {
            if (!transportsBox) return;
            const transports = Array.isArray(skylabState.transports) ? skylabState.transports : [];

            if (!transports.length) {
                transportsBox.textContent = "No active transports.";
                return;
            }

            transportsBox.innerHTML = transports.map(function(transport) {
                const ready = !!transport.ready;
                const time = ready ? "Ready" : formatTime(transport.remainingSeconds || 0);
                const button = ready
                    ? '<button class="skylab-transport-collect" type="button" data-skylab-collect="' + transport.id + '">Collect</button>'
                    : '<span>' + time + '</span>';

                return '<div class="skylab-transport-row">'
                    + '<span>' + formatNumber(transport.amount) + ' ' + escapeHtml(transport.resourceName || transport.resourceKey) + ' to ship cargo</span>'
                    + button
                    + '</div>';
            }).join("");
        }

        function formatTime(seconds) {
            seconds = Math.max(0, Number(seconds || 0));
            const minutes = Math.floor(seconds / 60);
            const rest = seconds % 60;
            return minutes + "m " + rest + "s";
        }

        function escapeHtml(value) {
            return String(value).replace(/[&<>"']/g, function(char) {
                return {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                }[char];
            });
        }

        function applyState(nextState) {
            if (!nextState) return;
            skylabState = nextState;
            if (nextState.modules) {
                Object.keys(nextState.modules).forEach(function(moduleId) {
                    modules[moduleId] = Object.assign({}, modules[moduleId] || {}, nextState.modules[moduleId]);
                });
            }
            updateResources(nextState.resources);
            updateModuleButtons();
            renderTransports();
            if (selectedModuleId && modules[selectedModuleId]) {
                updatePopup(modules[selectedModuleId]);
            }
            showMessage(nextState.message || "Skylab updated.", false);
        }

        async function postSkylab(action, payload) {
            if (!config.available) {
                showMessage(skylabState.message || "Skylab database is not installed yet. Preview mode is active.", true);
                return;
            }

            const body = new FormData();
            body.set("action", action);
            body.set("csrf_token", config.csrfToken || "");

            Object.keys(payload || {}).forEach(function(key) {
                body.set(key, payload[key]);
            });

            const response = await fetch(config.apiUrl, {
                method: "POST",
                body: body,
                credentials: "same-origin"
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || "Skylab action failed.");
            }

            applyState(data.state);
        }

        document.querySelectorAll("[data-skylab-module]").forEach(function(button) {
            button.addEventListener("click", function() {
                selectModule(button);
            });
        });

        document.getElementById("skylab-popup-close").addEventListener("click", function() {
            popup.classList.add("is-hidden");
            selectedModuleId = null;
            document.querySelectorAll("[data-skylab-module]").forEach(function(item) {
                item.classList.remove("is-selected");
            });
        });

        actions.upgrade.addEventListener("click", function() {
            const module = getSelectedModule();
            if (!module || !selectedModuleId) return;
            postSkylab("start_upgrade", { module_key: selectedModuleId }).catch(function(error) {
                showMessage(error.message, true);
            });
        });

        actions.toggle.addEventListener("click", function() {
            if (!selectedModuleId) return;
            postSkylab("toggle_module", { module_key: selectedModuleId }).catch(function(error) {
                showMessage(error.message, true);
            });
        });

        actions.transport.addEventListener("click", function() {
            const module = getSelectedModule();
            if (!module || !module.resourceKey) return;
            const amount = window.prompt("Amount to transport to ship cargo:", "100");
            if (amount === null) return;
            postSkylab("start_transport", {
                resource_key: module.resourceKey,
                amount: amount
            }).catch(function(error) {
                showMessage(error.message, true);
            });
        });

        transportsBox.addEventListener("click", function(event) {
            const button = event.target.closest("[data-skylab-collect]");
            if (!button) return;
            postSkylab("collect_transport", {
                transport_id: button.getAttribute("data-skylab-collect")
            }).catch(function(error) {
                showMessage(error.message, true);
            });
        });

        window.addEventListener("resize", resizeSkylabMap);
        renderTransports();
        resizeSkylabMap();
    }());
</script>
