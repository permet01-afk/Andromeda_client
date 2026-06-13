<?php

require_once __DIR__ . '/../../libs/ShopPurchaseService.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}

$DESIGNS = [
    17 => ['name' => 'Vengeance Enforcer', 'base_ship' => 'Vengeance', 'base_id' => 8,  'price' => 50000,  'currency' => 'uridium', 'bonus' => '+5% Damage'],
    18 => ['name' => 'Vengeance Lightning', 'base_ship' => 'Vengeance', 'base_id' => 8,  'price' => 150000, 'currency' => 'uridium', 'bonus' => 'Lightning Design +10% Damage'],
    56 => ['name' => 'Goliath Enforcer',   'base_ship' => 'Goliath',   'base_id' => 10, 'price' => 100000, 'currency' => 'uridium', 'bonus' => '+5% Damage'],
    59 => ['name' => 'Goliath Bastion',    'base_ship' => 'Goliath',   'base_id' => 10, 'price' => 100000, 'currency' => 'uridium', 'bonus' => '+10% Shield'],
    63 => ['name' => 'Goliath Solace',     'base_ship' => 'Goliath',   'base_id' => 10, 'price' => 250000, 'currency' => 'uridium', 'bonus' => '+10% Shield + Ability'],
    64 => ['name' => 'Goliath Diminisher', 'base_ship' => 'Goliath',   'base_id' => 10, 'price' => 250000, 'currency' => 'uridium', 'bonus' => '+5% Damage + Ability'],
    65 => ['name' => 'Goliath Spectrum',   'base_ship' => 'Goliath',   'base_id' => 10, 'price' => 250000, 'currency' => 'uridium', 'bonus' => '+25% Shield + Ability'],
    66 => ['name' => 'Goliath Sentinel',   'base_ship' => 'Goliath',   'base_id' => 10, 'price' => 250000, 'currency' => 'uridium', 'bonus' => '+10% Shield + Ability'],
    67 => ['name' => 'Goliath Venom',      'base_ship' => 'Goliath',   'base_id' => 10, 'price' => 250000, 'currency' => 'uridium', 'bonus' => '+5% Damage + Ability'],
];

$pid = (int)$_SESSION['player_id'];
$shopPurchaseService = new ShopPurchaseService($db, $pid);
$buymessage = $buymessage ?? '';

if (!empty($_SESSION['shop_flash'])) {
    $buymessage = $_SESSION['shop_flash'];
    unset($_SESSION['shop_flash']);
}

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

$redirectWithShopMessage = function (string $message): void {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }
    $_SESSION['shop_flash'] = $message;
    header('Location: view.php?page=shop&tab=designs');
    exit;
};

if (isset($_GET['buy'])) {
    $buyId = (int)str_replace('design', '', (string)$_GET['buy']);
    if (isset($DESIGNS[$buyId])) {
        $redirectWithShopMessage($shopPurchaseService->buyDesign($buyId, $DESIGNS[$buyId]));
    }
}


$ownedStmt = $db->prepare("SELECT design_id FROM player_designs WHERE player_id = :pid");
$ownedStmt->execute([':pid' => $pid]);
$ownedDesigns = $ownedStmt->fetchAll(PDO::FETCH_COLUMN);


$uStmt = $db->prepare("SELECT credits, uridium FROM users WHERE id = :pid LIMIT 1");
$uStmt->execute([':pid' => $pid]);
$user = $uStmt->fetch();
?>

<style>
    .shop-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1.5rem; box-shadow: var(--shadow-lg); user-select: none; }
    .shop-title { font-size: 1.25rem; font-weight: 700; color: var(--color-accent); margin-bottom: 1.5rem; text-transform: uppercase; border-bottom: 1px solid var(--color-border); padding-bottom: 0.75rem; }
    .design-row { display: flex; align-items: center; background: rgba(8, 14, 26, 0.4); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 0.75rem; transition: transform var(--transition-fast); }
    .design-row:hover { border-color: var(--color-accent-strong); transform: translateY(-2px); }
    .design-img { width: 100px; margin-right: 1.5rem; flex-shrink: 0; }
    .design-img img { width: 100%; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5)); pointer-events: none; }
    .design-info { flex: 1; }
    .design-name { font-size: 1.1rem; font-weight: 600; color: var(--color-text); display: block; }
    .design-meta { font-size: 0.85rem; color: var(--color-text-muted); }
    .design-bonus { color: var(--color-accent-strong); font-weight: bold; margin-top: 4px; display: block; }
    .design-action { width: 220px; text-align: right; padding-left: 1rem; border-left: 1px solid var(--color-border); }
    .btn-buy { display: inline-block; padding: 0.5rem 1.5rem; background: linear-gradient(135deg, rgba(94, 234, 212, 0.9), rgba(34, 211, 238, 0.78)); color: #032029; font-weight: 700; border-radius: var(--radius-sm); text-transform: uppercase; font-size: 0.85rem; }
    .owned-label { color: var(--color-accent); font-weight: 700; font-size: 0.85rem; text-transform: uppercase; }
    .msg-box { background: rgba(94, 234, 212, 0.1); border: 1px solid var(--color-border-strong); color: var(--color-accent); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem; }
</style>

<div class="shop-card">
    <h2 class="shop-title">Hangar • Ship Designs</h2>

    <?php if(!empty($buymessage)): ?>
        <div class="msg-box"><?= htmlspecialchars($buymessage) ?></div>
    <?php endif; ?>

    <div class="design-list">
        <?php foreach ($DESIGNS as $id => $d): 
            $isOwned = in_array($id, $ownedDesigns);
            $imgId = $id; 
        ?>
            <div class="design-row">
                <div class="design-img">
                    <img src="img/shop/<?= $imgId ?>.png" alt="<?= $d['name'] ?>">
                </div>
                
                <div class="design-info">
                    <span class="design-name"><?= $d['name'] ?></span>
                    <span class="design-meta">For Ship: <b><?= $d['base_ship'] ?></b></span>
                    <span class="design-bonus"><?= $d['bonus'] ?></span>
                </div>

                <div class="design-action">
                    <?php if ($isOwned): ?>
                        <span class="owned-label">Already Owned</span>
                    <?php else: ?>
                        <div style="margin-bottom: 8px;">
                            Price: <span style="color: var(--color-accent-strong); font-weight: 700;"><?= number_format($d['price']) ?></span> <?= ucfirst($d['currency']) ?>
                        </div>
                        <a href="view.php?page=shop&tab=designs&buy=design<?= $id ?>" class="btn-buy">Buy Design</a>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>

<?php
function buyDesign($designId, $db, $data) {
    $pid = (int)($_SESSION['player_id'] ?? 0);
    $service = new ShopPurchaseService($db, $pid);
    return $service->buyDesign((int)$designId, $data);
}
?>
