<?php

require_once __DIR__ . '/../../libs/ShopPurchaseService.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}

$SHIPS = [
    1  => ['name' => 'Phoenix',    'price' => 0,       'currency' => 'credits', 'hp' => 4000,   'lasers' => 1,  'gens' => 1,  'extras' => 1],
    3  => ['name' => 'Leonov',     'price' => 9000,    'currency' => 'uridium', 'hp' => 64000,  'lasers' => 6,  'gens' => 6,  'extras' => 2],
    4  => ['name' => 'Defcom',     'price' => 32000,    'currency' => 'credits', 'hp' => 16000,  'lasers' => 2,  'gens' => 2,  'extras' => 1],
    5  => ['name' => 'Liberator',  'price' => 64000,   'currency' => 'credits', 'hp' => 16000,  'lasers' => 4,  'gens' => 6,  'extras' => 2],
    6  => ['name' => 'Piranha',    'price' => 80000,  'currency' => 'credits', 'hp' => 64000,  'lasers' => 6,  'gens' => 8,  'extras' => 2],
    7  => ['name' => 'Nostromo',   'price' => 100000,  'currency' => 'credits', 'hp' => 128000, 'lasers' => 7,  'gens' => 10, 'extras' => 2],
    8  => ['name' => 'Vengeance',  'price' => 30000,   'currency' => 'uridium', 'hp' => 180000, 'lasers' => 10, 'gens' => 10, 'extras' => 2],
    9  => ['name' => 'Bigboy',     'price' => 200000,  'currency' => 'credits', 'hp' => 128000, 'lasers' => 7,  'gens' => 15, 'extras' => 3],
    10 => ['name' => 'Goliath',    'price' => 80000,   'currency' => 'uridium', 'hp' => 256000, 'lasers' => 15, 'gens' => 15, 'extras' => 3],
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
    header('Location: view.php?page=shop&tab=ship');
    exit;
};

if (isset($_GET['buy'])) {
    $buyId = (int)str_replace('ship', '', (string)$_GET['buy']);
    if (isset($SHIPS[$buyId])) {
        $redirectWithShopMessage($shopPurchaseService->buyShip($buyId, $SHIPS[$buyId]));
    }
}


$sth = $db->prepare("SELECT credits, uridium, shipId FROM users WHERE id = :id LIMIT 1");
$sth->execute([':id' => $_SESSION['player_id']]);
$u = $sth->fetch(PDO::FETCH_ASSOC);
?>

<style>
    /* Custom Shop Styles matching mainStyles.css */
    .shop-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 1.5rem;
        box-shadow: var(--shadow-lg);
        user-select: none;
    }

    .shop-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-accent);
        margin-bottom: 1.5rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--color-border);
        padding-bottom: 0.75rem;
    }

    .ship-row {
        display: flex;
        align-items: center;
        background: rgba(8, 14, 26, 0.4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 1rem;
        margin-bottom: 0.75rem;
        transition: transform var(--transition-fast), border-color var(--transition-fast);
    }

    .ship-row:hover {
        border-color: var(--color-accent-strong);
        transform: translateY(-2px);
    }

    .ship-img-container {
        width: 100px;
        margin-right: 1.5rem;
        flex-shrink: 0;
    }

    .ship-img-container img {
        width: 100%;
        filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
        pointer-events: none;
        -webkit-user-drag: none;
    }

    .ship-info { flex: 1; }

    .ship-name {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--color-text);
        display: block;
        margin-bottom: 0.25rem;
    }

    .ship-stats {
        font-size: 0.85rem;
        color: var(--color-text-muted);
    }

    .ship-stats b { color: var(--color-text); }

    .ship-action {
        width: 220px;
        text-align: right;
        padding-left: 1rem;
        border-left: 1px solid var(--color-border);
    }

    .price-tag {
        font-size: 0.95rem;
        margin-bottom: 0.5rem;
    }

    /* Buttons inspired by .nav-item.is-active from mainStyles.css */
    .btn-buy {
        display: inline-block;
        padding: 0.5rem 1.5rem;
        background: linear-gradient(135deg, rgba(94, 234, 212, 0.9), rgba(34, 211, 238, 0.78));
        color: #032029;
        font-weight: 700;
        border-radius: var(--radius-sm);
        border: 1px solid rgba(94, 234, 212, 0.7);
        text-transform: uppercase;
        font-size: 0.85rem;
    }

    .btn-buy:hover {
        opacity: 0.9;
        box-shadow: 0 8px 20px rgba(94, 234, 212, 0.3);
        color: #032029;
    }

    .equipped-label {
        color: var(--color-accent);
        font-weight: 700;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .msg-box {
        background: rgba(94, 234, 212, 0.1);
        border: 1px solid var(--color-border-strong);
        color: var(--color-accent);
        padding: 1rem;
        border-radius: var(--radius-sm);
        margin-bottom: 1.5rem;
        font-weight: 600;
    }
</style>

<div class="shop-card">
    <h2 class="shop-title">Hangar • Ship Yard</h2>

    <?php if(!empty($buymessage)): ?>
        <div class="msg-box">
            <?= htmlspecialchars($buymessage) ?>
        </div>
    <?php endif; ?>

    <div class="ship-list">
        <?php foreach ($SHIPS as $id => $s): 
            $isEquipped = ((int)$u['shipId'] === $id);
            $currColor = ($s['currency'] === 'uridium') ? 'var(--color-accent-strong)' : '#7cc8ff';
        ?>
            <div class="ship-row">
                <div class="ship-img-container">
                    <img src="img/shop/<?= $id ?>.png" alt="<?= $s['name'] ?>">
                </div>
                
                <div class="ship-info">
                    <span class="ship-name"><?= $s['name'] ?></span>
                    <div class="ship-stats">
                        HP: <b><?= number_format($s['hp']) ?></b> | 
                        Lasers: <b><?= $s['lasers'] ?></b> | 
                        Gens: <b><?= $s['gens'] ?></b> | 
                        Extras: <b><?= $s['extras'] ?></b>
                    </div>
                </div>

                <div class="ship-action">
                    <div class="price-tag">
                        Price: <span style="color: <?= $currColor ?>; font-weight: 700;"><?= number_format($s['price']) ?></span> <?= ucfirst($s['currency']) ?>
                    </div>
                    <?php if ($isEquipped): ?>
                        <span class="equipped-label">Equipped</span>
                    <?php else: ?>
                        <a href="view.php?page=shop&tab=ship&buy=ship<?= $id ?>" class="btn-buy">Buy Ship</a>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>

<?php

function buy($newId, $db, $data) {
    $pid = (int)($_SESSION['player_id'] ?? 0);
    $service = new ShopPurchaseService($db, $pid);
    return $service->buyShip((int)$newId, $data);
}
?>