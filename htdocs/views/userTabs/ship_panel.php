<?php
require_once __DIR__.'/../../libs/ShipRepairService.php';
$shipNames=[1=>'Phoenix',3=>'Leonov',4=>'Defcom',5=>'Liberator',6=>'Piranha',7=>'Nostromo',8=>'Vengeance',9=>'Bigboy',10=>'Goliath',17=>'Vengeance Corsair',18=>'Vengeance Lightning',56=>'Goliath Enforcer',59=>'Goliath Bastion',63=>'Goliath Solace',64=>'Goliath Diminisher',65=>'Goliath Spectrum',66=>'Goliath Sentinel',67=>'Goliath Venom'];
$shipPanelState=null;
try{$shipPanelState=ShipRepairService::state($db,(int)$_SESSION['player_id']);}catch(Throwable $e){error_log('[Ship panel] '.$e->getMessage());}
$shipPanelId=(int)($shipPanelState['shipid']??($shipDesignId??1));
$shipPanelName=$shipNames[$shipPanelId]??'Active ship';
$shipPanelDestroyed=$shipPanelState!==null && $shipPanelState['status']==='DESTROYED';
?>
<link rel="stylesheet" href="styles/ship-lifecycle.css?v=phase5-1">
<section id="ship-lifecycle-panel" class="ship-lifecycle-panel<?= $shipPanelDestroyed?' is-destroyed':'' ?>" aria-labelledby="ship-panel-title" data-csrf="<?= htmlspecialchars((string)($_SESSION['ship_repair_csrf']??''),ENT_QUOTES,'UTF-8') ?>">
    <div class="ship-lifecycle-portrait">
        <img id="ship-panel-portrait" src="img/ship-lifecycle/<?= isset($shipNames[$shipPanelId])?$shipPanelId:1 ?>.png" alt="<?= htmlspecialchars($shipPanelName,ENT_QUOTES,'UTF-8') ?>">
    </div>
    <div class="ship-lifecycle-details">
        <div class="ship-lifecycle-heading"><span class="ship-lifecycle-eyebrow">ACTIVE SHIP</span><span id="ship-panel-status" class="ship-lifecycle-badge"><?= $shipPanelState?htmlspecialchars($shipPanelState['status']):'UNAVAILABLE' ?></span></div>
        <h2 id="ship-panel-title"><?= htmlspecialchars($shipPanelName,ENT_QUOTES,'UTF-8') ?></h2>
        <p class="ship-lifecycle-hp">HIT POINTS <strong id="ship-panel-hp"><?= $shipPanelState?number_format($shipPanelState['current_hp']).' / '.number_format($shipPanelState['max_hp']):'—' ?></strong></p>
        <div class="ship-lifecycle-hp-track"><span id="ship-panel-hp-fill"></span></div>
        <p id="ship-panel-message" role="status"><?= !$shipPanelState?'The hangar is temporarily unavailable.':($shipPanelDestroyed?'Repair your ship before you can launch.':'Your ship is ready to launch.') ?></p>
        <p id="ship-panel-phoenix" class="ship-lifecycle-alternative" <?= !($shipPanelDestroyed && $shipPanelId!==1 && $shipPanelState['uridium']<$shipPanelState['repair_cost'])?'hidden':'' ?>>A free Phoenix is available in the <a href="view.php?page=shop&amp;tab=ship">Shop</a>. Buying it replaces your current ship.</p>
        <div class="ship-lifecycle-actions">
            <button id="ship-panel-repair" type="button" <?= !$shipPanelDestroyed?'hidden':'' ?> <?= empty($shipPanelState['can_repair'])?'disabled':'' ?>>REPAIR · <?= (int)($shipPanelState['repair_cost']??0) ?> U.</button>
            <a id="ship-panel-launch" href="<?= !empty($shipPanelState['can_launch'])?'spacemap_html5/spacemap.php':'#' ?>" aria-disabled="<?= !empty($shipPanelState['can_launch'])?'false':'true' ?>">LAUNCH</a>
        </div>
    </div>
</section>
<script id="ship-panel-initial" type="application/json"><?= json_encode($shipPanelState,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?></script>
<script src="js/ship-lifecycle.js?v=phase5-1" defer></script>
