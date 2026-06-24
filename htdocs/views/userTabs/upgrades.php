<?php

require_once __DIR__ . '/../../libs/PilotBioService.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}

if (empty($_SESSION['pilot_bio_csrf_token'])) {
    $_SESSION['pilot_bio_csrf_token'] = bin2hex(random_bytes(32));
}

$pilotBioCsrfToken = $_SESSION['pilot_bio_csrf_token'];
$pilotBioFlash = $_SESSION['pilot_bio_flash'] ?? null;
unset($_SESSION['pilot_bio_flash']);

$pilotBioService = new PilotBioService($db, (int)$_SESSION['player_id']);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['pilot_bio_action'])) {
    $postedToken = (string)($_POST['pilot_bio_csrf_token'] ?? '');
    $result = ['success' => false, 'message' => 'Invalid request.'];

    if (hash_equals($pilotBioCsrfToken, $postedToken)) {
        $action = (string)$_POST['pilot_bio_action'];
        if ($action === 'exchange_point') {
            $result = $pilotBioService->exchangeResearchPoint();
        } elseif ($action === 'save_bio_changes') {
            $rawNodeCodes = (string)($_POST['node_codes'] ?? '[]');
            $nodeCodes = json_decode($rawNodeCodes, true);
            if (!is_array($nodeCodes)) {
                $nodeCodes = [];
            }
            $result = $pilotBioService->saveNodeUpgrades($nodeCodes);
        } elseif ($action === 'upgrade_node') {
            $result = $pilotBioService->upgradeNode((string)($_POST['node_code'] ?? ''));
        } elseif ($action === 'reset_bio') {
            $result = $pilotBioService->resetPilotBio();
        }
    }

    $_SESSION['pilot_bio_flash'] = [
        'message' => $result['message'],
        'type' => $result['success'] ? 'success' : 'error',
    ];

    header('Location: view.php?page=user&tab=upgrades');
    exit;
}

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

$pilotBio = $pilotBioService->getViewModel();
$pilotBioTrackLabels = [
    'defense' => 'Defense',
    'progression' => 'Progression',
    'offense' => 'Offense',
];

$nodesByTrack = [];
foreach ($pilotBioTrackLabels as $trackCode => $trackLabel) {
    $nodesByTrack[$trackCode] = [];
}
foreach ($pilotBio['catalog'] as $pilotNode) {
    $trackCode = (string)($pilotNode['track'] ?? '');
    if (!isset($nodesByTrack[$trackCode])) {
        $nodesByTrack[$trackCode] = [];
    }
    $nodesByTrack[$trackCode][] = $pilotNode;
}

$escapePilot = static function ($value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
};

$state = $pilotBio['state'];
$schemaReady = (bool)$pilotBio['schema_ready'];
$stateReady = $schemaReady && $state !== null;
$researchPoints = $stateReady ? (int)$state['research_points'] : 0;
$spentPoints = $stateReady ? (int)$state['spent_points'] : 0;
$logfiles = (int)$pilotBio['resources']['logfiles'];
$nextPointCost = $pilotBio['next_point_cost'];
$maxResearchPoints = (int)$pilotBio['max_research_points'];
$pilotBioClientNodes = [];
foreach ($pilotBio['catalog'] as $pilotNode) {
    $pilotBioClientNodes[(string)$pilotNode['node_code']] = [
        'code' => (string)$pilotNode['node_code'],
        'displayName' => (string)$pilotNode['display_name'],
        'status' => (string)$pilotNode['status'],
        'level' => (int)$pilotNode['level'],
        'maxLevel' => (int)$pilotNode['max_level'],
        'prerequisites' => $pilotNode['prerequisites'],
        'effectTexts' => $pilotNode['effect_texts'],
    ];
}
$pilotBioClientPayload = [
    'stateReady' => $stateReady,
    'researchPoints' => $researchPoints,
    'spentPoints' => $spentPoints,
    'nodes' => $pilotBioClientNodes,
];
?>

<style>
    .pilot-bio-shell {
        --pilot-bg: #07111f;
        --pilot-panel: rgba(8, 18, 33, 0.92);
        --pilot-border: rgba(92, 210, 255, 0.32);
        --pilot-accent: #5ed6ff;
        --pilot-accent-soft: rgba(94, 214, 255, 0.18);
        --pilot-active: #8ee6ff;
        --pilot-disabled: #687386;
        color: #d7e7f7;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .pilot-bio-hero,
    .pilot-bio-card {
        background:
            radial-gradient(circle at top left, rgba(94, 214, 255, 0.14), transparent 34%),
            linear-gradient(145deg, rgba(8, 18, 33, 0.97), rgba(5, 10, 19, 0.95));
        border: 1px solid var(--pilot-border);
        border-radius: 8px;
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.35), inset 0 0 22px rgba(94, 214, 255, 0.05);
    }

    .pilot-bio-hero {
        padding: 1.35rem 1.5rem;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1.25rem;
    }

    .pilot-bio-title {
        margin: 0 0 0.35rem;
        color: #ffffff;
        font-size: 1.55rem;
        letter-spacing: 0;
    }

    .pilot-bio-subtitle {
        margin: 0;
        color: #9eb4c9;
        line-height: 1.45;
        max-width: 740px;
    }

    .pilot-bio-resources {
        display: grid;
        grid-template-columns: repeat(3, minmax(120px, 1fr));
        gap: 0.65rem;
        min-width: 390px;
    }

    .pilot-bio-resource {
        border: 1px solid rgba(94, 214, 255, 0.2);
        background: rgba(3, 8, 16, 0.52);
        border-radius: 6px;
        padding: 0.75rem;
    }

    .pilot-bio-resource span {
        display: block;
        color: #7f93a8;
        font-size: 0.78rem;
        text-transform: uppercase;
    }

    .pilot-bio-resource strong {
        color: #ffffff;
        font-size: 1.05rem;
    }

    .pilot-bio-message {
        border-radius: 7px;
        padding: 0.9rem 1rem;
        border: 1px solid rgba(94, 214, 255, 0.24);
        background: rgba(94, 214, 255, 0.08);
        color: #cfefff;
    }

    .pilot-bio-message.is-error {
        border-color: rgba(248, 113, 113, 0.42);
        background: rgba(248, 113, 113, 0.1);
        color: #fecaca;
    }

    .pilot-bio-message.is-success {
        border-color: rgba(74, 222, 128, 0.36);
        background: rgba(74, 222, 128, 0.1);
        color: #bbf7d0;
    }

    .pilot-bio-card {
        padding: 1.25rem;
        overflow: visible;
    }

    .pilot-bio-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(94, 214, 255, 0.16);
        margin-bottom: 1rem;
    }

    .pilot-bio-toolbar h2 {
        margin: 0;
        color: var(--pilot-accent);
        font-size: 1.08rem;
        text-transform: uppercase;
    }

    .pilot-bio-exchange {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #91a8bd;
        font-size: 0.9rem;
    }

    .pilot-bio-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .pilot-bio-button {
        border: 1px solid var(--pilot-accent);
        background: rgba(94, 214, 255, 0.1);
        color: #ffffff;
        border-radius: 5px;
        padding: 0.65rem 0.9rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.16s ease, box-shadow 0.16s ease, color 0.16s ease;
    }

    .pilot-bio-button:hover {
        background: var(--pilot-accent);
        color: #06101d;
        box-shadow: 0 0 16px rgba(94, 214, 255, 0.26);
    }

    .pilot-bio-button:disabled {
        border-color: rgba(124, 139, 156, 0.34);
        background: rgba(124, 139, 156, 0.08);
        color: #7f8b9a;
        cursor: not-allowed;
        box-shadow: none;
    }

    .pilot-bio-button.is-reset {
        border-color: rgba(248, 113, 113, 0.58);
        background: rgba(248, 113, 113, 0.08);
    }

    .pilot-bio-button.is-reset:hover {
        background: rgba(248, 113, 113, 0.92);
        color: #ffffff;
        box-shadow: 0 0 16px rgba(248, 113, 113, 0.24);
    }

    .pilot-bio-button.is-discard {
        border-color: rgba(148, 163, 184, 0.48);
        background: rgba(148, 163, 184, 0.08);
    }

    .pilot-bio-unsaved {
        color: #facc15;
        font-size: 0.82rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0;
    }

    .pilot-bio-unsaved[hidden] {
        display: none;
    }

    .pilot-bio-tree {
        overflow: visible;
        padding: 0.25rem 0;
        position: relative;
    }

    .pilot-bio-tree-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.9rem;
        max-width: 1040px;
        margin: 0 auto;
        overflow: visible;
    }

    .pilot-bio-track {
        border: 1px solid rgba(94, 214, 255, 0.12);
        background: rgba(0, 0, 0, 0.18);
        border-radius: 7px;
        padding: 1rem;
        overflow: visible;
    }

    .pilot-bio-track-title {
        margin: 0 0 0.85rem;
        color: var(--pilot-accent);
        font-size: 0.78rem;
        letter-spacing: 0;
        text-align: center;
        text-transform: uppercase;
    }

    .pilot-bio-track-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
        gap: 0.8rem 0.65rem;
        overflow: visible;
    }

    .pilot-bio-node {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        min-width: 0;
        z-index: 1;
    }

    .pilot-bio-node:hover,
    .pilot-bio-node:focus-within {
        z-index: 40;
    }

    .pilot-bio-node-button {
        border: 0;
        padding: 0;
        width: 74px;
        height: 85px;
        cursor: pointer;
        background: none;
    }

    .pilot-bio-node-button:disabled {
        cursor: default;
    }

    .pilot-bio-node-icon {
        width: 74px;
        height: 85px;
        display: block;
        background-image: url("img/pilotbio/skilltree_texture.png");
        background-repeat: no-repeat;
        filter: drop-shadow(0 0 7px rgba(94, 214, 255, 0.22));
        opacity: 0.92;
    }

    .pilot-bio-node.is-locked .pilot-bio-node-icon,
    .pilot-bio-node.is-later .pilot-bio-node-icon {
        filter: grayscale(1);
        opacity: 0.45;
    }

    .pilot-bio-node.can-upgrade .pilot-bio-node-icon {
        filter: drop-shadow(0 0 12px rgba(94, 214, 255, 0.5));
    }

    .pilot-bio-node.is-maxed .pilot-bio-node-icon {
        filter: drop-shadow(0 0 14px rgba(74, 222, 128, 0.48));
    }

    .pilot-bio-node.is-pending .pilot-bio-node-icon {
        filter: drop-shadow(0 0 15px rgba(250, 204, 21, 0.46));
    }

    .pilot-bio-node.is-pending .pilot-bio-node-status {
        color: #facc15;
    }

    .pilot-bio-points {
        position: absolute;
        top: 66px;
        width: 74px;
        text-align: center;
        color: #ffffff;
        font-size: 0.72rem;
        text-shadow: 0 1px 4px #000;
        pointer-events: none;
    }

    .pilot-bio-node-name {
        width: 100%;
        min-height: 2.25rem;
        color: #dcecff;
        font-size: 0.72rem;
        line-height: 1.15;
        text-align: center;
    }

    .pilot-bio-node-status {
        color: #88a1b7;
        font-size: 0.65rem;
        text-transform: uppercase;
    }

    .pilot-bio-node.can-upgrade .pilot-bio-node-status {
        color: var(--pilot-active);
    }

    .pilot-bio-node.is-maxed .pilot-bio-node-status {
        color: #86efac;
    }

    .pilot-bio-node-tooltip {
        position: absolute;
        left: 50%;
        bottom: calc(100% + 10px);
        transform: translateX(-50%) translateY(4px);
        z-index: 60;
        width: min(320px, calc(100vw - 40px));
        border: 1px solid rgba(94, 214, 255, 0.32);
        background: rgba(3, 8, 16, 0.97);
        color: #dcecff;
        padding: 0.8rem;
        border-radius: 7px;
        box-shadow: 0 14px 24px rgba(0, 0, 0, 0.4);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 0.14s ease, transform 0.14s ease, visibility 0.14s ease;
    }

    .pilot-bio-node:hover .pilot-bio-node-tooltip,
    .pilot-bio-node:focus-within .pilot-bio-node-tooltip {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(0);
    }

    .pilot-bio-node.tooltip-left .pilot-bio-node-tooltip {
        left: 0;
        transform: translateY(4px);
    }

    .pilot-bio-node.tooltip-left:hover .pilot-bio-node-tooltip,
    .pilot-bio-node.tooltip-left:focus-within .pilot-bio-node-tooltip {
        transform: translateY(0);
    }

    .pilot-bio-node.tooltip-right .pilot-bio-node-tooltip {
        left: auto;
        right: 0;
        transform: translateY(4px);
    }

    .pilot-bio-node.tooltip-right:hover .pilot-bio-node-tooltip,
    .pilot-bio-node.tooltip-right:focus-within .pilot-bio-node-tooltip {
        transform: translateY(0);
    }

    .pilot-bio-node-tooltip strong {
        display: block;
        color: #ffffff;
        margin-bottom: 0.35rem;
    }

    .pilot-bio-node-tooltip span {
        display: block;
        color: #8ea5bb;
        font-size: 0.78rem;
        line-height: 1.35;
        margin-top: 0.35rem;
    }

    .pilot-bio-node-tooltip em {
        display: block;
        color: #cfefff;
        font-style: normal;
        font-size: 0.78rem;
        line-height: 1.35;
        margin-top: 0.35rem;
    }

    .pilot-bio-modal {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 1.25rem;
        background: rgba(0, 0, 0, 0.66);
    }

    .pilot-bio-modal.is-open {
        display: flex;
    }

    .pilot-bio-modal-panel {
        width: min(440px, 100%);
        border: 1px solid rgba(94, 214, 255, 0.4);
        background:
            radial-gradient(circle at top left, rgba(94, 214, 255, 0.15), transparent 40%),
            rgba(5, 12, 22, 0.98);
        border-radius: 8px;
        box-shadow: 0 22px 50px rgba(0, 0, 0, 0.54), inset 0 0 20px rgba(94, 214, 255, 0.05);
        padding: 1.25rem;
    }

    .pilot-bio-modal-panel h3 {
        margin: 0 0 0.65rem;
        color: #ffffff;
        font-size: 1.1rem;
    }

    .pilot-bio-modal-panel p {
        margin: 0;
        color: #9eb4c9;
        line-height: 1.45;
    }

    .pilot-bio-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.2rem;
    }

    #pilot_skill_1 { background-position: -1406px 0; }
    #pilot_skill_2 { background-position: -444px 0; }
    #pilot_skill_3 { background-position: -962px 0; }
    #pilot_skill_4 { background-position: -1332px 0; }
    #pilot_skill_5 { background-position: -370px 0; }
    #pilot_skill_6 { background-position: -518px 0; }
    #pilot_skill_7 { background-position: -296px 0; }
    #pilot_skill_8 { background-position: -1628px 0; }
    #pilot_skill_9 { background-position: -1184px 0; }
    #pilot_skill_12 { background-position: -1702px 0; }
    #pilot_skill_13 { background-position: -1036px 0; }
    #pilot_skill_16 { background-position: -888px 0; }
    #pilot_skill_17 { background-position: -740px 0; }
    #pilot_skill_20 { background-position: -1110px 0; }
    #pilot_skill_21 { background-position: -1776px 0; }
    #pilot_skill_22 { background-position: -2072px 0; }
    #pilot_skill_23 { background-position: -592px 0; }
    #pilot_skill_24 { background-position: -1554px 0; }
    #pilot_skill_25 { background-position: -1924px 0; }

    @media (max-width: 900px) {
        .pilot-bio-hero,
        .pilot-bio-toolbar {
            flex-direction: column;
            align-items: stretch;
        }

        .pilot-bio-actions,
        .pilot-bio-exchange {
            align-items: stretch;
            flex-direction: column;
        }

        .pilot-bio-resources {
            min-width: 0;
            grid-template-columns: 1fr;
        }

        .pilot-bio-tree-grid {
            grid-template-columns: 1fr;
            gap: 0.55rem;
        }

        .pilot-bio-track {
            padding: 0.75rem;
        }

        .pilot-bio-node-name {
            font-size: 0.66rem;
        }
    }
</style>

<div class="pilot-bio-shell">
    <header class="pilot-bio-hero">
        <div>
            <h1 class="pilot-bio-title">Pilot Bio</h1>
            <p class="pilot-bio-subtitle">Use Research Points to improve your pilot skills.</p>
        </div>
        <div class="pilot-bio-resources">
            <div class="pilot-bio-resource">
                <span>Research Points</span>
                <strong data-pilot-bio-research><?php echo number_format($researchPoints); ?></strong>
            </div>
            <div class="pilot-bio-resource">
                <span>Spent Points</span>
                <strong data-pilot-bio-spent><?php echo number_format($spentPoints); ?></strong>
            </div>
            <div class="pilot-bio-resource">
                <span>Logfiles</span>
                <strong><?php echo number_format($logfiles); ?></strong>
            </div>
        </div>
    </header>

    <?php if ($pilotBioFlash && is_array($pilotBioFlash)) { ?>
        <div class="pilot-bio-message is-<?php echo $escapePilot($pilotBioFlash['type'] ?? 'error'); ?>">
            <?php echo $escapePilot($pilotBioFlash['message'] ?? ''); ?>
        </div>
    <?php } ?>

    <?php if (!$schemaReady) { ?>
        <div class="pilot-bio-message is-error">
            Pilot Bio is temporarily unavailable. Please try again later.
        </div>
    <?php } elseif (!$stateReady) { ?>
        <div class="pilot-bio-message">
            Pilot Bio is not available for this pilot yet.
        </div>
    <?php } ?>

    <section class="pilot-bio-card">
        <div class="pilot-bio-toolbar">
            <h2>Skill Tree</h2>
            <div class="pilot-bio-actions">
                <form method="post" class="pilot-bio-exchange">
                    <input type="hidden" name="pilot_bio_csrf_token" value="<?php echo $escapePilot($pilotBioCsrfToken); ?>">
                    <input type="hidden" name="pilot_bio_action" value="exchange_point">
                    <span>
                        <?php if ($nextPointCost === null) { ?>
                            Maximum Research Points reached
                        <?php } else { ?>
                            Next Research Point: <?php echo number_format((int)$nextPointCost); ?> Logfiles
                        <?php } ?>
                    </span>
                    <button class="pilot-bio-button" type="submit"<?php echo (!$schemaReady || !$stateReady || $nextPointCost === null || $logfiles < (int)$nextPointCost) ? ' disabled' : ''; ?>>Exchange Logfiles</button>
                </form>
                <?php if ($stateReady) { ?>
                    <span class="pilot-bio-unsaved" data-pilot-bio-unsaved hidden>Unsaved changes</span>
                    <form method="post" data-pilot-bio-save-form>
                        <input type="hidden" name="pilot_bio_csrf_token" value="<?php echo $escapePilot($pilotBioCsrfToken); ?>">
                        <input type="hidden" name="pilot_bio_action" value="save_bio_changes">
                        <input type="hidden" name="node_codes" value="[]" data-pilot-bio-pending-input>
                        <button class="pilot-bio-button" type="submit" data-pilot-bio-save disabled>Save</button>
                    </form>
                    <button class="pilot-bio-button is-discard" type="button" data-pilot-bio-discard disabled>Discard Changes</button>
                    <form method="post" data-pilot-bio-reset-form hidden>
                        <input type="hidden" name="pilot_bio_csrf_token" value="<?php echo $escapePilot($pilotBioCsrfToken); ?>">
                        <input type="hidden" name="pilot_bio_action" value="reset_bio">
                    </form>
                    <button class="pilot-bio-button is-reset" type="button" data-pilot-bio-reset-open>Reset Pilot Bio</button>
                <?php } ?>
            </div>
        </div>

        <div class="pilot-bio-tree" aria-label="Pilot Bio Skill Tree">
            <div class="pilot-bio-tree-grid">
                <?php foreach ($pilotBioTrackLabels as $trackCode => $trackLabel) {
                    $trackNodes = $nodesByTrack[$trackCode] ?? [];
                    if (empty($trackNodes)) {
                        continue;
                    }
                ?>
                    <section class="pilot-bio-track pilot-bio-track-<?php echo $escapePilot($trackCode); ?>">
                        <h3 class="pilot-bio-track-title"><?php echo $escapePilot($trackLabel); ?></h3>
                        <div class="pilot-bio-track-grid">
                            <?php foreach ($trackNodes as $nodeIndex => $node) {
                                $classes = ['pilot-bio-node'];
                                if ($nodeIndex === 0) $classes[] = 'tooltip-left';
                                if ($nodeIndex === count($trackNodes) - 1) $classes[] = 'tooltip-right';
                                if ($node['status'] !== 'active') $classes[] = 'is-later';
                                if (!empty($node['is_locked'])) $classes[] = 'is-locked';
                                if (!empty($node['can_upgrade'])) $classes[] = 'can-upgrade';
                                if (!empty($node['is_maxed'])) $classes[] = 'is-maxed';
                                $statusLabel = 'Unavailable';
                                if ($node['is_maxed']) {
                                    $statusLabel = 'Maxed';
                                } elseif ($node['can_upgrade']) {
                                    $statusLabel = 'Available';
                                } elseif ($node['status'] === 'active' && $stateReady) {
                                    $statusLabel = $node['is_locked'] ? 'Locked' : 'No points';
                                } elseif ($node['status'] === 'active') {
                                    $statusLabel = 'Unavailable';
                                }
                            ?>
                                <div class="<?php echo implode(' ', $classes); ?>" data-pilot-bio-node="<?php echo $escapePilot($node['node_code']); ?>">
                                    <button class="pilot-bio-node-button" type="button" data-pilot-bio-node-button<?php echo empty($node['can_upgrade']) ? ' disabled' : ''; ?> aria-label="<?php echo $escapePilot($node['display_name']); ?>">
                                        <span class="pilot-bio-node-icon" id="pilot_skill_<?php echo (int)$node['slot']; ?>"></span>
                                        <span class="pilot-bio-points" data-pilot-bio-points><?php echo (int)$node['level']; ?>/<?php echo (int)$node['max_level']; ?></span>
                                    </button>
                                    <div class="pilot-bio-node-name"><?php echo $escapePilot($node['display_name']); ?></div>
                                    <div class="pilot-bio-node-status" data-pilot-bio-status><?php echo $escapePilot($statusLabel); ?></div>
                                    <div class="pilot-bio-node-tooltip">
                                        <strong><?php echo $escapePilot($node['display_name']); ?></strong>
                                        <em data-pilot-bio-tooltip-level>Level <?php echo (int)$node['level']; ?>/<?php echo (int)$node['max_level']; ?> - <?php echo $escapePilot($statusLabel); ?></em>
                                        <span><?php echo $escapePilot($node['description']); ?></span>
                                        <span data-pilot-bio-current>Current: <?php echo $escapePilot($node['effect_text']); ?></span>
                                        <?php if (!$node['is_maxed']) { ?>
                                            <span data-pilot-bio-next>Next level: <?php echo $escapePilot($node['next_effect_text']); ?></span>
                                        <?php } ?>
                                        <span>Cost: <?php echo ($node['status'] === 'active') ? '1 Research Point per level' : 'Not available'; ?></span>
                                        <span>Prerequisite: <?php echo $escapePilot($node['prerequisite_text']); ?></span>
                                        <?php if ($node['v1_note'] !== '') { ?>
                                            <span><?php echo $escapePilot($node['v1_note']); ?></span>
                                        <?php } ?>
                                        <?php if (!$stateReady && $node['status'] === 'active') { ?>
                                            <span>Pilot Bio is not available for this pilot yet.</span>
                                        <?php } ?>
                                    </div>
                                </div>
                            <?php } ?>
                        </div>
                    </section>
                <?php } ?>
            </div>
        </div>
    </section>

</div>

<div class="pilot-bio-modal" data-pilot-bio-reset-modal aria-hidden="true">
    <div class="pilot-bio-modal-panel" role="dialog" aria-modal="true" aria-labelledby="pilotBioResetTitle">
        <h3 id="pilotBioResetTitle">Reset Pilot Bio?</h3>
        <p>This will reset all Pilot Bio skills and return spent Research Points. This action cannot be undone.</p>
        <div class="pilot-bio-modal-actions">
            <button class="pilot-bio-button is-discard" type="button" data-pilot-bio-reset-cancel>Cancel</button>
            <button class="pilot-bio-button is-reset" type="button" data-pilot-bio-reset-confirm>Reset Pilot Bio</button>
        </div>
    </div>
</div>

<script type="application/json" id="pilotBioClientData"><?php echo json_encode($pilotBioClientPayload, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT); ?></script>
<script>
(function () {
    const dataEl = document.getElementById("pilotBioClientData");
    if (!dataEl) return;

    let pilotData = null;
    try {
        pilotData = JSON.parse(dataEl.textContent || "{}");
    } catch (_) {
        return;
    }

    const nodes = pilotData && pilotData.nodes ? pilotData.nodes : {};
    const nodeElements = {};
    document.querySelectorAll("[data-pilot-bio-node]").forEach(el => {
        nodeElements[String(el.getAttribute("data-pilot-bio-node") || "")] = el;
    });
    const nodeEntries = Object.keys(nodes).map(code => {
        const node = nodes[code] || {};
        node.code = code;
        node.baseLevel = Math.max(0, parseInt(node.level, 10) || 0);
        node.level = node.baseLevel;
        node.maxLevel = Math.max(0, parseInt(node.maxLevel, 10) || 0);
        node.prerequisites = Array.isArray(node.prerequisites) ? node.prerequisites : [];
        node.effectTexts = node.effectTexts || {};
        node.el = nodeElements[code] || null;
        node.button = node.el ? node.el.querySelector("[data-pilot-bio-node-button]") : null;
        node.pointsEl = node.el ? node.el.querySelector("[data-pilot-bio-points]") : null;
        node.statusEl = node.el ? node.el.querySelector("[data-pilot-bio-status]") : null;
        node.tooltipLevelEl = node.el ? node.el.querySelector("[data-pilot-bio-tooltip-level]") : null;
        node.currentEl = node.el ? node.el.querySelector("[data-pilot-bio-current]") : null;
        node.nextEl = node.el ? node.el.querySelector("[data-pilot-bio-next]") : null;
        return node;
    });

    const researchEl = document.querySelector("[data-pilot-bio-research]");
    const spentEl = document.querySelector("[data-pilot-bio-spent]");
    const unsavedEl = document.querySelector("[data-pilot-bio-unsaved]");
    const saveForm = document.querySelector("[data-pilot-bio-save-form]");
    const saveButton = document.querySelector("[data-pilot-bio-save]");
    const discardButton = document.querySelector("[data-pilot-bio-discard]");
    const pendingInput = document.querySelector("[data-pilot-bio-pending-input]");
    const resetOpen = document.querySelector("[data-pilot-bio-reset-open]");
    const resetForm = document.querySelector("[data-pilot-bio-reset-form]");
    const resetModal = document.querySelector("[data-pilot-bio-reset-modal]");
    const resetCancel = document.querySelector("[data-pilot-bio-reset-cancel]");
    const resetConfirm = document.querySelector("[data-pilot-bio-reset-confirm]");

    const baseResearchPoints = Math.max(0, parseInt(pilotData.researchPoints, 10) || 0);
    const baseSpentPoints = Math.max(0, parseInt(pilotData.spentPoints, 10) || 0);
    let researchPoints = baseResearchPoints;
    let spentPoints = baseSpentPoints;
    let pendingNodes = [];

    const formatNumber = value => Math.max(0, parseInt(value, 10) || 0).toLocaleString();
    const isActiveNode = node => node && node.status === "active";
    const effectText = (node, level) => {
        const key = String(Math.max(0, parseInt(level, 10) || 0));
        return node.effectTexts && node.effectTexts[key] ? node.effectTexts[key] : "Active bonus.";
    };
    const prerequisitesMet = node => {
        if (!node || !Array.isArray(node.prerequisites)) return true;
        return node.prerequisites.every(req => {
            const requiredNode = nodes[String(req.node || "")];
            const requiredLevel = Math.max(0, parseInt(req.level, 10) || 0);
            return requiredNode && (parseInt(requiredNode.level, 10) || 0) >= requiredLevel;
        });
    };
    const canUpgrade = node => {
        return !!pilotData.stateReady
            && isActiveNode(node)
            && node.level < node.maxLevel
            && researchPoints > 0
            && prerequisitesMet(node);
    };
    const statusFor = node => {
        if (!isActiveNode(node) || !pilotData.stateReady) return "Unavailable";
        if (node.level > node.baseLevel) return "Pending";
        if (node.level >= node.maxLevel) return "Maxed";
        if (!prerequisitesMet(node)) return "Locked";
        if (researchPoints <= 0) return "No points";
        return "Available";
    };
    const renderNode = node => {
        if (!node || !node.el) return;
        const status = statusFor(node);
        const upgradable = canUpgrade(node);
        const maxed = node.level >= node.maxLevel;
        const pending = node.level > node.baseLevel;
        node.el.classList.toggle("is-later", !isActiveNode(node));
        node.el.classList.toggle("is-locked", isActiveNode(node) && pilotData.stateReady && !maxed && !prerequisitesMet(node));
        node.el.classList.toggle("can-upgrade", upgradable);
        node.el.classList.toggle("is-maxed", maxed);
        node.el.classList.toggle("is-pending", pending);
        if (node.button) node.button.disabled = !upgradable;
        if (node.pointsEl) node.pointsEl.textContent = `${node.level}/${node.maxLevel}`;
        if (node.statusEl) node.statusEl.textContent = status;
        if (node.tooltipLevelEl) node.tooltipLevelEl.textContent = `Level ${node.level}/${node.maxLevel} - ${status}`;
        if (node.currentEl) node.currentEl.textContent = `Current: ${effectText(node, node.level)}`;
        if (node.nextEl) {
            node.nextEl.textContent = maxed
                ? "Next level: Maximum level reached."
                : `Next level: ${effectText(node, node.level + 1)}`;
        }
    };
    const renderAll = () => {
        if (researchEl) researchEl.textContent = formatNumber(researchPoints);
        if (spentEl) spentEl.textContent = formatNumber(spentPoints);
        nodeEntries.forEach(renderNode);
        const hasPending = pendingNodes.length > 0;
        if (pendingInput) pendingInput.value = JSON.stringify(pendingNodes);
        if (unsavedEl) unsavedEl.hidden = !hasPending;
        if (saveButton) saveButton.disabled = !hasPending;
        if (discardButton) discardButton.disabled = !hasPending;
    };
    const discardChanges = () => {
        researchPoints = baseResearchPoints;
        spentPoints = baseSpentPoints;
        pendingNodes = [];
        nodeEntries.forEach(node => {
            node.level = node.baseLevel;
        });
        renderAll();
    };
    const openResetModal = () => {
        if (!resetModal) return;
        resetModal.classList.add("is-open");
        resetModal.setAttribute("aria-hidden", "false");
    };
    const closeResetModal = () => {
        if (!resetModal) return;
        resetModal.classList.remove("is-open");
        resetModal.setAttribute("aria-hidden", "true");
    };

    nodeEntries.forEach(node => {
        if (!node.button) return;
        node.button.addEventListener("click", () => {
            if (!canUpgrade(node)) return;
            node.level += 1;
            researchPoints -= 1;
            spentPoints += 1;
            pendingNodes.push(node.code);
            renderAll();
        });
    });

    if (discardButton) {
        discardButton.addEventListener("click", discardChanges);
    }

    if (saveForm) {
        saveForm.addEventListener("submit", event => {
            if (pendingNodes.length === 0) {
                event.preventDefault();
                return;
            }
            if (pendingInput) pendingInput.value = JSON.stringify(pendingNodes);
        });
    }

    if (resetOpen) {
        resetOpen.addEventListener("click", openResetModal);
    }
    if (resetCancel) {
        resetCancel.addEventListener("click", closeResetModal);
    }
    if (resetConfirm) {
        resetConfirm.addEventListener("click", () => {
            if (resetForm) resetForm.submit();
        });
    }
    if (resetModal) {
        resetModal.addEventListener("click", event => {
            if (event.target === resetModal) closeResetModal();
        });
    }
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeResetModal();
    });

    renderAll();
})();
</script>
