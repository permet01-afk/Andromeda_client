<?php
require_once __DIR__.'/../../libs/ShipRepairService.php';
$shipNames=[1=>'Phoenix',3=>'Leonov',4=>'Defcom',5=>'Liberator',6=>'Piranha',7=>'Nostromo',8=>'Vengeance',9=>'Bigboy',10=>'Goliath',17=>'Vengeance Corsair',18=>'Vengeance Lightning',56=>'Goliath Enforcer',59=>'Goliath Bastion',63=>'Goliath Solace',64=>'Goliath Diminisher',65=>'Goliath Spectrum',66=>'Goliath Sentinel',67=>'Goliath Venom'];
$shipPanelState=null;
try{$shipPanelState=ShipRepairService::state($db,(int)$_SESSION['player_id'],true);}catch(Throwable $e){error_log('[Ship panel] '.$e->getMessage());}
$shipPanelId=(int)($shipPanelState['shipid']??($shipDesignId??1));
$shipPanelName=$shipNames[$shipPanelId]??'Active ship';
$shipPanelDestroyed=$shipPanelState!==null && $shipPanelState['status']==='DESTROYED';
$shipPanelConfig=(int)($shipPanelState['active_config']??1);
$shipPanelStats=$shipPanelState['configurations'][$shipPanelConfig]??null;
$shipPanelNumber=static fn($value)=>$value===null?'—':number_format((int)$value);
?>
<link rel="stylesheet" href="styles/ship-lifecycle.css?v=phase5-window14-2">
<section id="ship-lifecycle-panel" class="ship-lifecycle-panel<?= $shipPanelDestroyed?' is-destroyed':'' ?>" aria-labelledby="ship-panel-title" data-csrf="<?= htmlspecialchars((string)($_SESSION['ship_repair_csrf']??''),ENT_QUOTES,'UTF-8') ?>">
    <header class="ship-lifecycle-heading"><h2 id="ship-panel-title">ACTIVE SHIP</h2><span id="ship-panel-status" class="ship-lifecycle-badge"><?= $shipPanelState?htmlspecialchars($shipPanelState['status']):'UNAVAILABLE' ?></span></header>
    <div class="ship-lifecycle-body">
        <div class="ship-lifecycle-portrait">
            <img id="ship-panel-portrait" src="img/ship-lifecycle/<?= isset($shipNames[$shipPanelId])?$shipPanelId:1 ?>.png" alt="<?= htmlspecialchars($shipPanelName,ENT_QUOTES,'UTF-8') ?>">
            <span><?= htmlspecialchars($shipPanelName,ENT_QUOTES,'UTF-8') ?> · active hull</span>
        </div>
        <div class="ship-lifecycle-details">
            <div class="ship-lifecycle-name"><h3><?= htmlspecialchars($shipPanelName,ENT_QUOTES,'UTF-8') ?></h3><a class="ship-lifecycle-loadout" href="view.php?page=user&amp;tab=configurations">LOADOUT ↗</a></div>
            <div class="ship-lifecycle-tabs" role="tablist" aria-label="View ship configuration">
                <?php foreach([1,2] as $config): ?>
                <button id="ship-panel-tab-<?= $config ?>" type="button" role="tab" data-config="<?= $config ?>" aria-controls="ship-panel-stats" aria-selected="<?= $shipPanelConfig===$config?'true':'false' ?>" tabindex="<?= $shipPanelConfig===$config?'0':'-1' ?>">Configuration <?= $config ?> <small id="ship-panel-active-<?= $config ?>" <?= $shipPanelConfig!==$config?'hidden':'' ?>>ACTIVE</small></button>
                <?php endforeach; ?>
            </div>
            <div id="ship-panel-stats" class="ship-lifecycle-stats" role="tabpanel" aria-labelledby="ship-panel-tab-<?= $shipPanelConfig ?>">
                <div class="ship-lifecycle-stat"><span>HIT POINTS</span><strong><b id="ship-panel-hp-current"><?= $shipPanelNumber($shipPanelState['current_hp']??null) ?></b><small> / <span id="ship-panel-hp-max"><?= $shipPanelNumber($shipPanelState['max_hp']??null) ?></span></small></strong><div class="ship-lifecycle-track"><i id="ship-panel-hp-fill"></i></div></div>
                <div class="ship-lifecycle-stat"><span id="ship-panel-shield-label">SHIELD</span><strong><b id="ship-panel-shield-current"><?= $shipPanelNumber($shipPanelStats['current_shield']??null) ?></b><small id="ship-panel-shield-fraction"> / <span id="ship-panel-shield-max"><?= $shipPanelNumber($shipPanelStats['max_shield']??null) ?></span></small></strong><div class="ship-lifecycle-track shield"><i id="ship-panel-shield-fill"></i></div></div>
                <div class="ship-lifecycle-stat"><span>LASER DAMAGE</span><strong id="ship-panel-damage"><?= $shipPanelNumber($shipPanelStats['damage']??null) ?></strong></div>
                <div class="ship-lifecycle-stat"><span>SPEED</span><strong id="ship-panel-speed"><?= $shipPanelNumber($shipPanelStats['speed']??null) ?></strong></div>
            </div>
            <div class="ship-lifecycle-footer">
                <p id="ship-panel-message" role="status"><?= !$shipPanelState?'The hangar is temporarily unavailable.':($shipPanelDestroyed?'Your ship must be repaired before you can play.':'Last saved state · Current hit points are shared by both configurations.') ?></p>
                <p id="ship-panel-phoenix" class="ship-lifecycle-alternative" <?= !($shipPanelDestroyed && $shipPanelId!==1 && $shipPanelState['uridium']<$shipPanelState['repair_cost'])?'hidden':'' ?>>A free Phoenix is available in the <a href="view.php?page=shop&amp;tab=ship">Shop</a>. Buying it replaces your current ship.</p>
                <button id="ship-panel-repair" class="ship-lifecycle-repair" type="button" <?= !$shipPanelDestroyed?'hidden':'' ?> <?= empty($shipPanelState['can_repair'])?'disabled':'' ?>>REPAIR — <?= (int)($shipPanelState['repair_cost']??0)===0?'FREE':number_format((int)$shipPanelState['repair_cost']).' U.' ?></button>
            </div>
        </div>
    </div>
</section>
<script id="ship-panel-initial" type="application/json"><?= json_encode($shipPanelState,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?></script>
<script src="js/ship-lifecycle.js?v=phase5-window14-2" defer></script>
