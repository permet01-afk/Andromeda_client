<?php
// Skylab V1 is a read-only visual mockup; production, transport, upgrades and DB writes are intentionally not implemented yet.
$skylabAssets = 'img/skylab/';

$skylabOres = [
    ['name' => 'Prometium', 'amount' => 12480, 'capacity' => 105600, 'class' => 'prometium'],
    ['name' => 'Endurium', 'amount' => 11820, 'capacity' => 105600, 'class' => 'endurium'],
    ['name' => 'Terbium', 'amount' => 9720, 'capacity' => 105600, 'class' => 'terbium'],
    ['name' => 'Prometid', 'amount' => 820, 'capacity' => 5280, 'class' => 'prometid'],
    ['name' => 'Duranium', 'amount' => 760, 'capacity' => 5280, 'class' => 'duranium'],
    ['name' => 'Xenomit', 'amount' => 180, 'capacity' => 528, 'class' => 'xenomit'],
    ['name' => 'Promerium', 'amount' => 92, 'capacity' => 528, 'class' => 'promerium'],
    ['name' => 'Seprom', 'amount' => 12, 'capacity' => 48, 'class' => 'seprom'],
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
    'basic' => ['name' => 'Basic module', 'type' => 'Core', 'level' => 8, 'power' => 90, 'production' => 'Unlocks higher module levels.', 'consumption' => '90 energy', 'left' => 400, 'top' => 315, 'state' => 'Active'],
    'solar' => ['name' => 'Solar module', 'type' => 'Energy', 'level' => 8, 'power' => 0, 'production' => 'Energy capacity: 950', 'consumption' => 'No energy consumption', 'left' => 262, 'top' => 12, 'state' => 'Active'],
    'storage' => ['name' => 'Storage module', 'type' => 'Storage', 'level' => 7, 'power' => 70, 'production' => 'Increases Skylab storage capacity.', 'consumption' => '70 energy', 'left' => 96, 'top' => 314, 'state' => 'Active'],
    'transport' => ['name' => 'Transport module', 'type' => 'Logistics', 'level' => 5, 'power' => 45, 'production' => 'Moves ores between Skylab and ship cargo.', 'consumption' => '45 energy', 'left' => 3, 'top' => 274, 'state' => 'Mock only'],
    'prometium' => ['name' => 'Prometium collector', 'type' => 'Collector', 'level' => 8, 'power' => 85, 'production' => '+3,200 Prometium/hour', 'consumption' => '85 energy', 'left' => 65, 'top' => 13, 'state' => 'Active'],
    'endurium' => ['name' => 'Endurium collector', 'type' => 'Collector', 'level' => 8, 'power' => 85, 'production' => '+3,200 Endurium/hour', 'consumption' => '85 energy', 'left' => 7, 'top' => 61, 'state' => 'Active'],
    'terbium' => ['name' => 'Terbium collector', 'type' => 'Collector', 'level' => 8, 'power' => 85, 'production' => '+3,200 Terbium/hour', 'consumption' => '85 energy', 'left' => 7, 'top' => 124, 'state' => 'Active'],
    'prometid' => ['name' => 'Prometid refinery', 'type' => 'Refinery', 'level' => 6, 'power' => 115, 'production' => '+160 Prometid/hour', 'consumption' => 'Consumes Prometium and Endurium', 'left' => 505, 'top' => 15, 'state' => 'Active'],
    'duranium' => ['name' => 'Duranium refinery', 'type' => 'Refinery', 'level' => 6, 'power' => 115, 'production' => '+160 Duranium/hour', 'consumption' => 'Consumes Endurium and Terbium', 'left' => 576, 'top' => 57, 'state' => 'Active'],
    'promerium' => ['name' => 'Promerium refinery', 'type' => 'Refinery', 'level' => 4, 'power' => 145, 'production' => '+18 Promerium/hour', 'consumption' => 'Consumes Prometid, Duranium and Xenomit', 'left' => 580, 'top' => 128, 'state' => 'Active'],
    'xeno' => ['name' => 'Xeno module', 'type' => 'Support', 'level' => 3, 'power' => 110, 'production' => 'Supports Promerium production.', 'consumption' => '110 energy', 'left' => 586, 'top' => 198, 'state' => 'Active'],
    'seprom' => ['name' => 'Seprom refinery', 'type' => 'Refinery', 'level' => 2, 'power' => 175, 'production' => '+2 Seprom/hour', 'consumption' => 'Consumes Promerium', 'left' => 580, 'top' => 315, 'state' => 'Active'],
];

$selectedModule = $skylabModules['prometium'];
?>

<style>
    .skylab-page {
        display: flex;
        justify-content: center;
        padding: 2rem 1rem;
        width: 100%;
    }

    .skylab-shell {
        width: min(100%, 1180px);
        background: rgba(8, 13, 24, 0.96);
        border: 1px solid rgba(71, 85, 105, 0.8);
        border-radius: 8px;
        box-shadow: 0 26px 70px rgba(0, 0, 0, 0.46);
        overflow: hidden;
    }

    .skylab-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid rgba(51, 65, 85, 0.9);
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.82));
    }

    .skylab-title {
        margin: 0;
        color: #f8fafc;
        font-size: 1.15rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .skylab-subtitle {
        margin: 0.25rem 0 0;
        color: #94a3b8;
        font-size: 0.82rem;
    }

    .skylab-badge {
        border: 1px solid rgba(34, 211, 238, 0.44);
        border-radius: 999px;
        color: #67e8f9;
        background: rgba(8, 47, 73, 0.34);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        padding: 0.45rem 0.75rem;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .skylab-body {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 310px;
        gap: 1rem;
        padding: 1rem;
    }

    .skylab-map-wrap {
        overflow-x: auto;
        padding-bottom: 0.25rem;
    }

    .skylab-map {
        position: relative;
        width: 772px;
        height: 407px;
        background: url("<?php echo $skylabAssets; ?>background.jpg") center / 100% 100% no-repeat;
        border: 1px solid #1e293b;
        box-shadow: inset 0 0 40px rgba(2, 6, 23, 0.78), 0 0 24px rgba(14, 165, 233, 0.12);
        isolation: isolate;
    }

    .skylab-layer {
        position: absolute;
        pointer-events: none;
        user-select: none;
    }

    .skylab-layer.uplink {
        opacity: 0.74;
        mix-blend-mode: screen;
    }

    .skylab-ore-row {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
        width: 772px;
        margin-bottom: 0.5rem;
    }

    .skylab-ore {
        min-height: 42px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        background: rgba(2, 6, 23, 0.78);
        box-shadow: inset 0 0 16px rgba(14, 165, 233, 0.06);
        padding: 4px 5px;
    }

    .skylab-ore-name {
        color: #cbd5e1;
        display: block;
        font-size: 0.66rem;
        font-weight: 800;
        line-height: 1;
    }

    .skylab-ore-value {
        color: #f8fafc;
        display: block;
        font-size: 0.74rem;
        font-weight: 900;
        margin-top: 3px;
    }

    .skylab-ore-bar {
        height: 3px;
        background: #020617;
        border-radius: 999px;
        overflow: hidden;
        margin-top: 4px;
    }

    .skylab-ore-fill {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #0ea5e9, #67e8f9);
    }

    .skylab-module {
        position: absolute;
        z-index: 7;
        width: 128px;
        min-height: 47px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 4px;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.86));
        color: #e2e8f0;
        cursor: pointer;
        padding: 5px 6px;
        text-align: left;
        box-shadow: 0 7px 16px rgba(0, 0, 0, 0.28);
    }

    .skylab-module:hover,
    .skylab-module.is-selected {
        border-color: rgba(34, 211, 238, 0.75);
        box-shadow: 0 0 18px rgba(34, 211, 238, 0.24), 0 7px 16px rgba(0, 0, 0, 0.28);
    }

    .skylab-module-name {
        display: block;
        font-size: 0.68rem;
        font-weight: 900;
        line-height: 1.08;
    }

    .skylab-module-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.35rem;
        margin-top: 5px;
        color: #94a3b8;
        font-size: 0.68rem;
        font-weight: 800;
    }

    .skylab-module-level {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 18px;
        color: #f8fafc;
        background: rgba(14, 165, 233, 0.18);
        border: 1px solid rgba(14, 165, 233, 0.35);
        border-radius: 3px;
    }

    .skylab-side {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .skylab-panel,
    .skylab-actions {
        border: 1px solid rgba(51, 65, 85, 0.86);
        border-radius: 8px;
        background: rgba(2, 6, 23, 0.72);
        padding: 1rem;
    }

    .skylab-panel h3,
    .skylab-actions h3 {
        color: #f8fafc;
        font-size: 0.95rem;
        letter-spacing: 0.08em;
        margin: 0 0 0.8rem;
        text-transform: uppercase;
    }

    .skylab-panel-type {
        color: #67e8f9;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .skylab-info-grid {
        display: grid;
        gap: 0.55rem;
        margin-top: 0.85rem;
    }

    .skylab-info-row {
        display: grid;
        grid-template-columns: 96px 1fr;
        gap: 0.75rem;
        border-bottom: 1px solid rgba(51, 65, 85, 0.56);
        padding-bottom: 0.45rem;
    }

    .skylab-info-label {
        color: #64748b;
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
    }

    .skylab-info-value {
        color: #e2e8f0;
        font-size: 0.82rem;
        font-weight: 700;
    }

    .skylab-action-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.55rem;
    }

    .skylab-mock-button {
        border: 1px solid rgba(51, 65, 85, 0.95);
        border-radius: 4px;
        background: rgba(15, 23, 42, 0.94);
        color: #94a3b8;
        cursor: not-allowed;
        font-size: 0.76rem;
        font-weight: 900;
        letter-spacing: 0.06em;
        padding: 0.75rem;
        text-transform: uppercase;
        width: 100%;
    }

    .skylab-transport-icons {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        margin-top: 0.8rem;
        opacity: 0.65;
    }

    .skylab-note {
        color: #94a3b8;
        font-size: 0.78rem;
        line-height: 1.45;
        margin: 0;
    }

    @media (max-width: 980px) {
        .skylab-body {
            grid-template-columns: 1fr;
        }

        .skylab-side {
            grid-row: 2;
        }
    }

    @media (max-width: 640px) {
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
                <p class="skylab-subtitle">A visual preview of the Andromeda Skylab. Production, upgrades and transport are disabled in this version.</p>
            </div>
            <span class="skylab-badge">Read-only preview</span>
        </header>

        <div class="skylab-body">
            <div class="skylab-map-wrap">
                <div class="skylab-ore-row">
                    <?php foreach ($skylabOres as $ore) {
                        $ratio = $ore['capacity'] > 0 ? min(100, max(0, ($ore['amount'] / $ore['capacity']) * 100)) : 0;
                    ?>
                        <div class="skylab-ore <?php echo htmlspecialchars($ore['class'], ENT_QUOTES, 'UTF-8'); ?>">
                            <span class="skylab-ore-name"><?php echo htmlspecialchars($ore['name'], ENT_QUOTES, 'UTF-8'); ?></span>
                            <span class="skylab-ore-value"><?php echo number_format($ore['amount']); ?></span>
                            <span class="skylab-ore-bar"><span class="skylab-ore-fill" style="width: <?php echo number_format($ratio, 2, '.', ''); ?>%;"></span></span>
                        </div>
                    <?php } ?>
                </div>

                <div class="skylab-map" aria-label="Skylab visual layout">

                    <?php foreach ($skylabLayers as $layer) { ?>
                        <img class="skylab-layer <?php echo htmlspecialchars($layer['class'], ENT_QUOTES, 'UTF-8'); ?>"
                             src="<?php echo $skylabAssets . htmlspecialchars($layer['file'], ENT_QUOTES, 'UTF-8'); ?>"
                             alt=""
                             style="left: <?php echo (int)$layer['left']; ?>px; top: <?php echo (int)$layer['top']; ?>px;" />
                    <?php } ?>

                    <?php foreach ($skylabModules as $key => $module) { ?>
                        <button class="skylab-module<?php echo $key === 'prometium' ? ' is-selected' : ''; ?>"
                                type="button"
                                data-skylab-module="<?php echo htmlspecialchars($key, ENT_QUOTES, 'UTF-8'); ?>"
                                style="left: <?php echo (int)$module['left']; ?>px; top: <?php echo (int)$module['top']; ?>px;">
                            <span class="skylab-module-name"><?php echo htmlspecialchars($module['name'], ENT_QUOTES, 'UTF-8'); ?></span>
                            <span class="skylab-module-meta">
                                <span class="skylab-module-level">L<?php echo (int)$module['level']; ?></span>
                                <span><?php echo (int)$module['power']; ?> EP</span>
                            </span>
                        </button>
                    <?php } ?>
                </div>
            </div>

            <aside class="skylab-side">
                <div class="skylab-panel">
                    <span class="skylab-panel-type" id="skylab-module-type"><?php echo htmlspecialchars($selectedModule['type'], ENT_QUOTES, 'UTF-8'); ?></span>
                    <h3 id="skylab-module-name"><?php echo htmlspecialchars($selectedModule['name'], ENT_QUOTES, 'UTF-8'); ?></h3>
                    <div class="skylab-info-grid">
                        <div class="skylab-info-row">
                            <span class="skylab-info-label">Level</span>
                            <span class="skylab-info-value" id="skylab-module-level"><?php echo (int)$selectedModule['level']; ?></span>
                        </div>
                        <div class="skylab-info-row">
                            <span class="skylab-info-label">State</span>
                            <span class="skylab-info-value" id="skylab-module-state"><?php echo htmlspecialchars($selectedModule['state'], ENT_QUOTES, 'UTF-8'); ?></span>
                        </div>
                        <div class="skylab-info-row">
                            <span class="skylab-info-label">Output</span>
                            <span class="skylab-info-value" id="skylab-module-production"><?php echo htmlspecialchars($selectedModule['production'], ENT_QUOTES, 'UTF-8'); ?></span>
                        </div>
                        <div class="skylab-info-row">
                            <span class="skylab-info-label">Consumption</span>
                            <span class="skylab-info-value" id="skylab-module-consumption"><?php echo htmlspecialchars($selectedModule['consumption'], ENT_QUOTES, 'UTF-8'); ?></span>
                        </div>
                    </div>
                </div>

                <div class="skylab-actions">
                    <h3>Module actions</h3>
                    <div class="skylab-action-grid">
                        <button class="skylab-mock-button" type="button" disabled>Upgrade unavailable</button>
                        <button class="skylab-mock-button" type="button" disabled>Activate / Deactivate unavailable</button>
                        <button class="skylab-mock-button" type="button" disabled>Transport unavailable</button>
                    </div>
                    <div class="skylab-transport-icons" aria-hidden="true">
                        <img src="<?php echo $skylabAssets; ?>to_ship_0.png" alt="" width="29" height="36" />
                        <img src="<?php echo $skylabAssets; ?>but_right_0.png" alt="" width="23" height="17" />
                        <img src="<?php echo $skylabAssets; ?>to_skylab_0.png" alt="" width="41" height="36" />
                    </div>
                    <p class="skylab-note">This page is a visual mockup only. No resources are produced, moved or saved.</p>
                </div>
            </aside>
        </div>
    </div>
</section>

<script>
    window.andromedaSkylabMockModules = <?php echo json_encode($skylabModules, JSON_UNESCAPED_SLASHES); ?>;
    document.querySelectorAll("[data-skylab-module]").forEach(function(button) {
        button.addEventListener("click", function() {
            const moduleId = button.getAttribute("data-skylab-module");
            const module = window.andromedaSkylabMockModules[moduleId];
            if (!module) return;
            document.querySelectorAll("[data-skylab-module]").forEach(function(item) {
                item.classList.toggle("is-selected", item === button);
            });
            document.getElementById("skylab-module-type").textContent = module.type;
            document.getElementById("skylab-module-name").textContent = module.name;
            document.getElementById("skylab-module-level").textContent = module.level;
            document.getElementById("skylab-module-state").textContent = module.state;
            document.getElementById("skylab-module-production").textContent = module.production;
            document.getElementById("skylab-module-consumption").textContent = module.consumption;
        });
    });
</script>
