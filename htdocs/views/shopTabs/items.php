<?php

require_once __DIR__ . '/../../libs/ShopPurchaseService.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}

if (!isset($user)) {
    $sth = $db->prepare("SELECT id, credits, uridium, drones FROM users WHERE id = :id LIMIT 1");
    $sth->execute([':id' => $_SESSION['player_id']]);
    $user = $sth->fetch(PDO::FETCH_ASSOC);
}

$playerId = (int)($user['id'] ?? $_SESSION['player_id'] ?? 0);
$shopPurchaseService = new ShopPurchaseService($db, $playerId);
$buymessage = $buymessage ?? '';

if (!empty($_SESSION['shop_flash'])) {
    $buymessage = $_SESSION['shop_flash'];
    unset($_SESSION['shop_flash']);
}

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

$redirectWithShopMessage = function (string $message, string $cat = 'ammo'): void {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }
    $_SESSION['shop_flash'] = $message;
    $cat = preg_replace('/[^a-z0-9_-]/i', '', $cat) ?: 'ammo';
    header('Location: view.php?page=shop&tab=items&cat=' . urlencode($cat));
    exit;
};

$refreshShopUser = function () use ($db, &$user, $playerId): void {
    $sth = $db->prepare("SELECT id, credits, uridium, drones FROM users WHERE id = :id LIMIT 1");
    $sth->execute([':id' => $playerId]);
    $fresh = $sth->fetch(PDO::FETCH_ASSOC);
    if ($fresh) {
        $user = $fresh;
    }
};

$iris_prices = [15000, 24000, 42000, 60000, 84000, 96000, 126000, 200000];
$flax_prices = [100000, 200000, 400000, 800000, 1600000, 3200000, 6400000, 12800000];

$parseDronesCounts = function(string $dronesStr): array {
    $dronesStr = trim($dronesStr);
    if ($dronesStr === '') {
        return ['total' => 0, 'iris' => 0, 'flax' => 0];
    }

    $entries = preg_split('/-+/', $dronesStr, -1, PREG_SPLIT_NO_EMPTY);
    if (!is_array($entries)) {
        return ['total' => 0, 'iris' => 0, 'flax' => 0];
    }

    $total = 0;
    $iris = 0;
    $flax = 0;

    foreach ($entries as $entry) {
        $entry = trim($entry);
        if ($entry === '') continue;

        $before = explode('/', $entry, 2)[0];
        $before = trim($before);
        if ($before === '' || !ctype_digit($before)) continue;

        $t = (int)$before;
        if ($t === 3 || $t === 25) {
            $iris++;
            $total++;
        } elseif ($t === 2 || $t === 5 || $t === 15) {
            $flax++;
            $total++;
        }

        if ($total > 64) break;
    }

    return ['total' => $total, 'iris' => $iris, 'flax' => $flax];
};

$clampIndex = function(int $n): int {
    if ($n < 0) return 0;
    if ($n > 7) return 7;
    return $n;
};

$category = isset($_GET['cat']) ? preg_replace('/[^a-z0-9_-]/i', '', (string)$_GET['cat']) : 'ammo';
if ($category === '') $category = 'ammo';

$equipDB = [
    'lf1'   => ['id'=>10, 'price'=>10000,   'currency'=>'credits', 'name'=>'LF-1 Laser'],
    'mp1'   => ['id'=>11, 'price'=>40000,   'currency'=>'credits', 'name'=>'MP-1 Laser'],
    'lf2'   => ['id'=>12, 'price'=>250000,  'currency'=>'credits', 'name'=>'LF-2 Laser'],
    'lf3'   => ['id'=>1,  'price'=>10000,   'currency'=>'uridium', 'name'=>'LF-3 Laser'],

    'g3n1010' => ['id'=>30, 'price'=>2000,  'currency'=>'credits', 'name'=>'G3N-1010 Speed (+2)'],
    'g3n2010' => ['id'=>31, 'price'=>4000,  'currency'=>'credits', 'name'=>'G3N-2010 Speed (+3)'],
    'g3n3210' => ['id'=>32, 'price'=>8000,  'currency'=>'credits', 'name'=>'G3N-3210 Speed (+4)'],
    'g3n3310' => ['id'=>33, 'price'=>16000, 'currency'=>'credits', 'name'=>'G3N-3310 Speed (+5)'],
    'g3n6900' => ['id'=>34, 'price'=>32000, 'currency'=>'credits', 'name'=>'G3N-6900 Speed (+7)'],
    'g3n7900' => ['id'=>4,  'price'=>2000,  'currency'=>'uridium', 'name'=>'G3N-7900 Speed (+10)'],

    'sg3na01' => ['id'=>35, 'price'=>8000,   'currency'=>'credits', 'name'=>'SG3N-A01 Shield (1k)'],
    'sg3na02' => ['id'=>36, 'price'=>24000,  'currency'=>'credits', 'name'=>'SG3N-A02 Shield (2k)'],
    'sg3nb01' => ['id'=>37, 'price'=>256000, 'currency'=>'credits', 'name'=>'SG3N-B01 Shield (4k)'],
    'sg3nb02' => ['id'=>2,  'price'=>10000,  'currency'=>'uridium', 'name'=>'SG3N-B02 Shield (10k)'],

    'arol'  => ['id'=>20, 'price'=>15000,   'currency'=>'uridium', 'name'=>'Auto-Rocket CPU'],
    'cargo' => ['id'=>21, 'price'=>15000,   'currency'=>'uridium', 'name'=>'Cargo Compressor'],
    'hst1'  => ['id'=>38, 'price'=>500000,  'currency'=>'credits', 'name'=>'HST-1'],
    'hst2'  => ['id'=>39, 'price'=>15000,   'currency'=>'uridium', 'name'=>'HST-2'],

];

$ammoConfig = [
    'lcb10'   => ['col' => 'ammo_lcb10',   'price' => 10,   'currency' => 'credits'],
    'mcb25'   => ['col' => 'ammo_mcb25',   'price' => 200,  'currency' => 'credits'],
    'mcb50'   => ['col' => 'ammo_mcb50',   'price' => 1,    'currency' => 'uridium'],
    'sab50'   => ['col' => 'ammo_sab50',   'price' => 1,    'currency' => 'uridium'],
    'rsb75'   => ['col' => 'ammo_rsb75',   'price' => 5,    'currency' => 'uridium'],
    'r310'    => ['col' => 'ammo_r310',    'price' => 10,   'currency' => 'credits'],
    'plt2026' => ['col' => 'ammo_plt2026', 'price' => 50,   'currency' => 'credits'],
    'plt2021' => ['col' => 'ammo_plt2021', 'price' => 5,    'currency' => 'uridium'],
    'dcr250'  => ['col' => 'ammo_dcr250',  'price' => 5,    'currency' => 'uridium'],
    'eco10'   => ['col' => 'ammo_eco10',   'price' => 1500, 'currency' => 'credits'],
    'ubr100'  => ['col' => 'ammo_ubr100',  'price' => 30,   'currency' => 'uridium'],
    'hstrm01' => ['col' => 'ammo_hstrm01', 'price' => 25,   'currency' => 'uridium'],
    'smb01'   => ['col' => 'ammo_smb01',   'price' => 400,  'currency' => 'uridium'],
    'ish01'   => ['col' => 'ammo_ish01',   'price' => 400,  'currency' => 'uridium'],
    'emp01'   => ['col' => 'ammo_emp01',   'price' => 500,  'currency' => 'uridium'],
    'logfile' => ['col' => 'logfiles',     'price' => 75,   'currency' => 'uridium'],
    'bootykey'=> ['col' => 'booty_keys',   'price' => 7000, 'currency' => 'uridium'],
];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['buy_ammo_type'])) {
    $type = (string)$_POST['buy_ammo_type'];
    $amount = (int)($_POST['amount'] ?? 1);
    if ($amount < 1) $amount = 1;

    if (isset($ammoConfig[$type])) {
        $conf = $ammoConfig[$type];
        $message = $shopPurchaseService->buyUserColumn($type, $conf['col'], $amount, (int)$conf['price'], $conf['currency'], strtoupper($type));
        $redirectWithShopMessage($message, 'ammo');
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['buy_equip_type'])) {
    $itemCode = (string)$_POST['buy_equip_type'];
    $amount = (int)($_POST['amount'] ?? 1);
    if ($amount < 1) $amount = 1;

    if (isset($equipDB[$itemCode])) {
        $data = $equipDB[$itemCode];
        $message = $shopPurchaseService->buyInventoryItem($itemCode, (int)$data['id'], $amount, (int)$data['price'], $data['currency'], $data['name']);
        $redirectWithShopMessage($message, $category);
    }
}

if (isset($_GET['buy'])) {
    $itemCode = (string)$_GET['buy'];

    if (isset($equipDB[$itemCode])) {
        $data = $equipDB[$itemCode];
        $message = $shopPurchaseService->buyInventoryItem($itemCode, (int)$data['id'], 1, (int)$data['price'], $data['currency'], $data['name']);
        $redirectWithShopMessage($message, $category);
    } elseif ($itemCode === 'iris' || $itemCode === 'flax') {
        $message = $shopPurchaseService->buyDrone($itemCode, ($itemCode === 'iris') ? $iris_prices : $flax_prices);
        $redirectWithShopMessage($message, 'drones');
    }
}

$refreshShopUser();

$counts = $parseDronesCounts((string)($user['drones'] ?? ''));
$currentDroneCount = (int)($counts['total'] ?? 0);
$irisCount = (int)($counts['iris'] ?? 0);
$flaxCount = (int)($counts['flax'] ?? 0);

$droneTableCount = 0;
try {
    $sth = $db->prepare("SELECT COUNT(*) FROM drone WHERE player_id = :pid");
    $sth->execute([':pid' => $playerId]);
    $droneTableCount = (int)$sth->fetchColumn();
} catch (Exception $e) {
    $droneTableCount = 0;
}

$currentDroneCountEffective = max($currentDroneCount, $droneTableCount);

if ($currentDroneCountEffective < 8) {
    $priceF = $flax_prices[$clampIndex($flaxCount)] ?? 0;
    $displayPriceFlax = number_format($priceF) . " Credits";

    $priceI = $iris_prices[$clampIndex($irisCount)] ?? 0;
    $displayPriceIris = number_format($priceI) . " Uridium";
} else {
    $displayPriceFlax = "Max Drones (8/8)";
    $displayPriceIris = "Max Drones (8/8)";
}
?>

<style>
    /* Navigation */
    .shop-nav {
        display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--color-border); padding-bottom: 15px;
        flex-wrap: wrap; /* Allow wrapping on mobile */
    }
    .shop-nav a {
        padding: 10px 20px; background: rgba(11, 18, 33, 0.5); border: 1px solid var(--color-border);
        color: #94a3b8; text-decoration: none; border-radius: 4px; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; transition: all 0.2s;
        flex: 1; text-align: center;
    }
    .shop-nav a:hover, .shop-nav a.active {
        background: var(--color-accent, #5eead4); color: #0b1221; border-color: var(--color-accent, #5eead4);
    }

    /* Cards & Layout */
    .shop-card {
        background: var(--color-surface, #0b1221); border: 1px solid var(--color-border, #1e293b);
        border-radius: 8px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 2rem;
    }
    .shop-title {
        font-size: 1.25rem; font-weight: 700; color: var(--color-accent, #5eead4);
        margin-bottom: 1.5rem; text-transform: uppercase; border-bottom: 1px solid var(--color-border, #1e293b); padding-bottom: 0.75rem;
    }

    /* GRID SYSTEM (3 items per line) */
    .items-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr); /* 3 columns */
        gap: 20px;
    }

    /* Responsive: 2 cols on tablets, 1 col on mobile */
    @media (max-width: 900px) { .items-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .items-grid { grid-template-columns: 1fr; } }

    /* Item Tile (Vertical Card) */
    .item-tile {
        background: rgba(8, 14, 26, 0.4);
        border: 1px solid var(--color-border, #1e293b);
        border-radius: 6px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transition: transform 0.2s, border-color 0.2s;
        height: 100%; /* Uniform height */
    }
    .item-tile:hover {
        transform: translateY(-5px);
        border-color: var(--color-accent, #5eead4);
    }
    
    .item-img-container { 
        height: 80px; width: 100%; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;
    }
    .item-img-container img { max-width: 100%; max-height: 70px; }
    
    .item-info { flex: 1; margin-bottom: 1rem; width: 100%; }
    .item-name { font-size: 1.1rem; font-weight: 700; color: #e2e8f0; display: block; margin-bottom: 5px; }
    .item-desc { font-size: 0.85rem; color: #94a3b8; line-height: 1.4; }
    
    .item-action { width: 100%; margin-top: auto; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; }
    
    .price-tag { font-weight: 700; font-size: 0.95rem; margin-bottom: 8px; display: block;}
    .price-cr { color: #93c5fd; } 
    .price-uri { color: #5eead4; }

    .action-form { display: flex; justify-content: center; gap: 5px; }

    .btn-buy {
        padding: 6px 20px; background: var(--color-accent, #5eead4); color: #0b1221;
        font-weight: 700; text-transform: uppercase; border: none; border-radius: 3px; cursor: pointer; text-decoration: none; font-size: 0.85rem;
    }
    .btn-buy:hover { opacity: 0.9; }

    .btn-disabled {
        padding: 6px 20px; background: #334155; color: #94a3b8;
        font-weight: 700; text-transform: uppercase; border: none; border-radius: 3px; 
        cursor: not-allowed; text-decoration: none; font-size: 0.85rem; opacity: 0.7;
    }

    .qty-input { background: #0f172a; border: 1px solid #334155; color: white; padding: 5px; width: 80px; text-align: center; border-radius: 3px; }

    .rocket-tooltip-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }
    .rocket-tooltip-wrap::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 50%;
        bottom: calc(100% + 10px);
        transform: translateX(-50%) translateY(4px);
        background: rgba(6, 12, 22, 0.96);
        border: 1px solid var(--color-border, #1e293b);
        color: #e2e8f0;
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        line-height: 1.35;
        width: max-content;
        max-width: 220px;
        text-align: center;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
        z-index: 50;
        box-shadow: 0 8px 18px rgba(0,0,0,0.28);
    }
    .rocket-tooltip-wrap::before {
        content: '';
        position: absolute;
        left: 50%;
        bottom: calc(100% + 4px);
        transform: translateX(-50%);
        border: 6px solid transparent;
        border-top-color: var(--color-border, #1e293b);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease, visibility 0.15s ease;
        z-index: 49;
        pointer-events: none;
    }
    .rocket-tooltip-wrap:hover::after,
    .rocket-tooltip-wrap:hover::before {
        opacity: 1;
        visibility: visible;
    }
    .rocket-tooltip-wrap:hover::after { transform: translateX(-50%) translateY(0); }
    .msg-box { background: rgba(94, 234, 212, 0.1); border: 1px solid #5eead4; color: #5eead4; padding: 10px; margin-bottom: 20px; text-align: center; border-radius: 4px; }
</style>

<div id="shop-items-container">

    <?php if(!empty($buymessage)): ?>
        <div class="msg-box"><?= htmlspecialchars($buymessage) ?></div>
    <?php endif; ?>

    <div class="shop-nav">
        <a href="view.php?page=shop&tab=items&cat=ammo" class="<?= $category == 'ammo' ? 'active' : '' ?>">Ammo</a>
        <a href="view.php?page=shop&tab=items&cat=weapons" class="<?= $category == 'weapons' ? 'active' : '' ?>">Weapons & Gens</a>
        <a href="view.php?page=shop&tab=items&cat=extras" class="<?= $category == 'extras' ? 'active' : '' ?>">Extras</a>
        <a href="view.php?page=shop&tab=items&cat=drones" class="<?= $category == 'drones' ? 'active' : '' ?>">Drones</a>
    </div>

    <?php if($category == 'ammo'): ?>
    <div class="shop-card">
        <h2 class="shop-title">Laser Ammo</h2>
        <div class="items-grid">
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/lcb10.png" alt="LCB-10"></div>
                <div class="item-info"><span class="item-name">LCB-10</span><span class="item-desc">Damage x1.</span></div>
                <div class="item-action">
                    <span class="price-tag price-cr">10 Credits / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="lcb10"><input type="number" name="amount" value="1000" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/mcb25.png" alt="MCB-25"></div>
                <div class="item-info"><span class="item-name">MCB-25</span><span class="item-desc">Damage x2.</span></div>
                <div class="item-action">
                    <span class="price-tag price-cr">200,000 Credits (1k)</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="mcb25"><input type="number" name="amount" value="1000" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/mcb50.png" alt="MCB-50"></div>
                <div class="item-info"><span class="item-name">MCB-50</span><span class="item-desc">Damage x3.</span></div>
                <div class="item-action">
                    <span class="price-tag price-uri">1 Uri / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="mcb50"><input type="number" name="amount" value="1000" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/sab50.png" alt="SAB"></div>
                <div class="item-info"><span class="item-name">SAB-50</span><span class="item-desc">Shield Absorb.</span></div>
                <div class="item-action">
                    <span class="price-tag price-uri">1 Uri / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="sab50"><input type="number" name="amount" value="1000" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/rsb75.png" alt="RSB"></div>
                <div class="item-info"><span class="item-name">RSB-75</span><span class="item-desc">Damage x5.</span></div>
                <div class="item-action">
                    <span class="price-tag price-uri">5 Uri / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="rsb75"><input type="number" name="amount" value="1000" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
        </div>
    </div>
    
    <div class="shop-card">
        <h2 class="shop-title">Rockets</h2>
        <div class="items-grid">
            <div class="item-tile">
                <div class="item-img-container"><span class="rocket-tooltip-wrap" data-tooltip="Deals up to 1,000 damage."><img src="img/items/r310.png" alt="R310"></span></div>
                <div class="item-info"><span class="item-name">R-310</span><span class="item-desc">Short range.</span></div>
                <div class="item-action">
                    <span class="price-tag price-cr">10 Credits / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="r310"><input type="number" name="amount" value="100" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><span class="rocket-tooltip-wrap" data-tooltip="Deals up to 2,000 damage."><img src="img/items/plt2026.png" alt="PLT-2026"></span></div>
                <div class="item-info"><span class="item-name">PLT-2026</span><span class="item-desc">Medium range.</span></div>
                <div class="item-action">
                    <span class="price-tag price-cr">50 Credits / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="plt2026"><input type="number" name="amount" value="100" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><span class="rocket-tooltip-wrap" data-tooltip="Deals up to 4,000 damage."><img src="img/items/plt2021.png" alt="PLT-2021"></span></div>
                <div class="item-info"><span class="item-name">PLT-2021</span><span class="item-desc">Heavy damage.</span></div>
                <div class="item-action">
                    <span class="price-tag price-uri">5 Uri / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="plt2021"><input type="number" name="amount" value="100" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><span class="rocket-tooltip-wrap" data-tooltip="Deals no direct damage. Slows the target by 30% for 5 seconds."><img src="img/items/dcr250.png" alt="DCR-250"></span></div>
                <div class="item-info"><span class="item-name">DCR-250</span><span class="item-desc">Slowdown.</span></div>
                <div class="item-action">
                    <span class="price-tag price-uri">5 Uri / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="dcr250"><input type="number" name="amount" value="10" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><span class="rocket-tooltip-wrap" data-tooltip="Deals up to 2,000 damage per rocket."><img src="img/items/eco10.png" alt="ECO-10"></span></div>
                <div class="item-info"><span class="item-name">ECO-10</span><span class="item-desc">Multi-angle damage.</span></div>
                <div class="item-action">
                    <span class="price-tag price-cr">1,500 Credits / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="eco10"><input type="number" name="amount" value="10" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><span class="rocket-tooltip-wrap" data-tooltip="Deals up to 4,000 damage per rocket. Up to 7,200 vs aliens."><img src="img/items/ubr100.png" alt="UBR-100"></span></div>
                <div class="item-info"><span class="item-name">UBR-100</span><span class="item-desc">Heavy damage. Up to 7,200 vs aliens.</span></div>
                <div class="item-action">
                    <span class="price-tag price-uri">30 Uri / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="ubr100"><input type="number" name="amount" value="10" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><span class="rocket-tooltip-wrap" data-tooltip="Deals up to 4,000 damage per rocket."><img src="img/items/hstrm01.png" alt="HSTRM-01"></span></div>
                <div class="item-info"><span class="item-name">HSTRM-01</span><span class="item-desc">Heavy multi-angle damage.</span></div>
                <div class="item-action">
                    <span class="price-tag price-uri">25 Uri / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="hstrm01"><input type="number" name="amount" value="10" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
        </div>
    </div>

    <div class="shop-card">
        <h2 class="shop-title">Special Items</h2>
        <div class="items-grid">
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/smb-01.png" alt="SMB-01"></div>
                <div class="item-info"><span class="item-name">SMB-01</span><span class="item-desc">Smart Bomb.</span></div>
                <div class="item-action">
                    <span class="price-tag price-uri">400 Uri / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="smb01"><input type="number" name="amount" value="10" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/ish-01.png" alt="ISH-01"></div>
                <div class="item-info"><span class="item-name">ISH-01</span><span class="item-desc">Instant Shield.</span></div>
                <div class="item-action">
                    <span class="price-tag price-uri">400 Uri / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="ish01"><input type="number" name="amount" value="10" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/emp-01.png" alt="EMP-01"></div>
                <div class="item-info"><span class="item-name">EMP-01</span><span class="item-desc">EMP Burst.</span></div>
                <div class="item-action">
                    <span class="price-tag price-uri">500 Uri / unit</span>
                    <form method="post" class="action-form"><input type="hidden" name="buy_ammo_type" value="emp01"><input type="number" name="amount" value="10" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form>
                </div>
            </div>

            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/logfile.png" alt="Logfile"></div>
                <div class="item-info">
                    <span class="item-name">Logfile</span>
                    <span class="item-desc">Data for Pilot Bio.</span>
                </div>
                <div class="item-action">
                    <span class="price-tag price-uri">75 Uri / unit</span>
                    <form method="post" class="action-form">
                        <input type="hidden" name="buy_ammo_type" value="logfile">
                        <input type="number" name="amount" value="1" class="qty-input">
                        <button type="submit" class="btn-buy">Buy</button>
                    </form>
                </div>
            </div>
            
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/booty-key.png" alt="Booty Key"></div>
                <div class="item-info">
                    <span class="item-name">Booty Key</span>
                    <span class="item-desc">Opens pirate booty boxes.</span>
                </div>
                <div class="item-action">
                    <span class="price-tag price-uri">7,000 Uri / unit</span>
                    <form method="post" class="action-form">
                        <input type="hidden" name="buy_ammo_type" value="bootykey">
                        <input type="number" name="amount" value="1" class="qty-input">
                        <button type="submit" class="btn-buy">Buy</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <?php if($category == 'weapons'): ?>
    <div class="shop-card">
        <h2 class="shop-title">Lasers</h2>
        <div class="items-grid">
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/lf1.png" alt="LF-1"></div>
                <div class="item-info"><span class="item-name">LF-1</span><span class="item-desc">Damage: 40.</span></div>
                <div class="item-action"><span class="price-tag price-cr">10,000 Credits / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="lf1"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/mp1.png" alt="MP-1"></div>
                <div class="item-info"><span class="item-name">MP-1</span><span class="item-desc">Damage: 60.</span></div>
                <div class="item-action"><span class="price-tag price-cr">40,000 Credits / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="mp1"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/lf2.png" alt="LF-2"></div>
                <div class="item-info"><span class="item-name">LF-2</span><span class="item-desc">Damage: 100.</span></div>
                <div class="item-action"><span class="price-tag price-cr">250,000 Credits / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="lf2"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/lf3.png" alt="LF-3"></div>
                <div class="item-info"><span class="item-name">LF-3</span><span class="item-desc">Damage: 150.</span></div>
                <div class="item-action"><span class="price-tag price-uri">10,000 Uridium / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="lf3"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
        </div>
    </div>
    
    <div class="shop-card">
        <h2 class="shop-title">Shield Generators</h2>
        <div class="items-grid">
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/sg3na01.png" alt="A01"></div>
                <div class="item-info"><span class="item-name">SG3N-A01</span><span class="item-desc">1,000 Shield</span></div>
                <div class="item-action"><span class="price-tag price-cr">8,000 Credits / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="sg3na01"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/sg3na02.png" alt="A02"></div>
                <div class="item-info"><span class="item-name">SG3N-A02</span><span class="item-desc">2,000 Shield</span></div>
                <div class="item-action"><span class="price-tag price-cr">24,000 Credits / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="sg3na02"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/sg3nb01.png" alt="B01"></div>
                <div class="item-info"><span class="item-name">SG3N-B01</span><span class="item-desc">4,000 Shield</span></div>
                <div class="item-action"><span class="price-tag price-cr">256,000 Credits / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="sg3nb01"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/sg3n.png" alt="B02"></div>
                <div class="item-info"><span class="item-name">SG3N-B02</span><span class="item-desc">10,000 Shield</span></div>
                <div class="item-action"><span class="price-tag price-uri">10,000 Uridium / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="sg3nb02"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
        </div>
    </div>

    <div class="shop-card">
        <h2 class="shop-title">Speed Generators</h2>
        <div class="items-grid">
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/g3n1010.png" alt="1010"></div>
                <div class="item-info"><span class="item-name">G3N-1010</span><span class="item-desc">+2 Speed.</span></div>
                <div class="item-action"><span class="price-tag price-cr">2,000 Credits / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="g3n1010"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/g3n2010.png" alt="2010"></div>
                <div class="item-info"><span class="item-name">G3N-2010</span><span class="item-desc">+3 Speed.</span></div>
                <div class="item-action"><span class="price-tag price-cr">4,000 Credits / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="g3n2010"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/g3n3210.png" alt="3210"></div>
                <div class="item-info"><span class="item-name">G3N-3210</span><span class="item-desc">+4 Speed.</span></div>
                <div class="item-action"><span class="price-tag price-cr">8,000 Credits / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="g3n3210"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/g3n3310.png" alt="3310"></div>
                <div class="item-info"><span class="item-name">G3N-3310</span><span class="item-desc">+5 Speed.</span></div>
                <div class="item-action"><span class="price-tag price-cr">16,000 Credits / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="g3n3310"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/g3n6900.png" alt="6900"></div>
                <div class="item-info"><span class="item-name">G3N-6900</span><span class="item-desc">+7 Speed.</span></div>
                <div class="item-action"><span class="price-tag price-cr">32,000 Credits / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="g3n6900"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/g3n7900.png" alt="7900"></div>
                <div class="item-info"><span class="item-name">G3N-7900</span><span class="item-desc">+10 Speed.</span></div>
                <div class="item-action"><span class="price-tag price-uri">2,000 Uridium / unit</span><form method="post" class="action-form"><input type="hidden" name="buy_equip_type" value="g3n7900"><input type="number" name="amount" value="1" min="1" class="qty-input"><button type="submit" class="btn-buy">Buy</button></form></div>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <?php if($category == 'extras'): ?>
    <div class="shop-card">
        <h2 class="shop-title">CPUs & Extras</h2>
        <div class="items-grid">
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/arol.png" alt="AutoRocket"></div>
                <div class="item-info"><span class="item-name">Auto-Rocket CPU</span><span class="item-desc">Fires rockets automatically.</span></div>
                <div class="item-action"><span class="price-tag price-uri">15,000 Uridium</span><br><a href="view.php?page=shop&tab=items&cat=extras&buy=arol" class="btn-buy">Buy</a></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/cargo.png" alt="Cargo"></div>
                <div class="item-info"><span class="item-name">Cargo Compressor</span><span class="item-desc">Doubles cargo space.</span></div>
                <div class="item-action"><span class="price-tag price-uri">15,000 Uridium</span><br><a href="view.php?page=shop&tab=items&cat=extras&buy=cargo" class="btn-buy">Buy</a></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/hst1.png" alt="HST-1"></div>
                <div class="item-info"><span class="item-name">HST-1</span><span class="item-desc">HST-1 is a sub-elite rocket launcher that fires up to 3 rockets.</span></div>
                <div class="item-action"><span class="price-tag price-cr">500,000 Credits</span><br><a href="view.php?page=shop&tab=items&cat=extras&buy=hst1" class="btn-buy">Buy</a></div>
            </div>
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/hst2.png" alt="HST-2"></div>
                <div class="item-info"><span class="item-name">HST-2</span><span class="item-desc">HST-2 is an elite rocket launcher that fires up to 5 rockets.</span></div>
                <div class="item-action"><span class="price-tag price-uri">15,000 Uridium</span><br><a href="view.php?page=shop&tab=items&cat=extras&buy=hst2" class="btn-buy">Buy</a></div>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <?php if($category == 'drones'): ?>
    <div class="shop-card">
        <h2 class="shop-title">Drones (<?= $currentDroneCount ?> / 8)</h2>
        <div class="items-grid">
            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/flax.png" alt="Flax"></div>
                <div class="item-info">
                    <span class="item-name">Flax Drone</span>
                    <span class="item-desc">Standard drone. 1 Slot.</span>
                </div>
                <div class="item-action">
                    <span class="price-tag price-cr"><?= $displayPriceFlax ?></span><br>
                    <?php if($currentDroneCount < 8): ?>
                        <a href="view.php?page=shop&tab=items&cat=drones&buy=flax" class="btn-buy">Buy</a>
                    <?php else: ?>
                        <button class="btn-disabled" disabled>Max</button>
                    <?php endif; ?>
                </div>
            </div>

            <div class="item-tile">
                <div class="item-img-container"><img src="img/items/iris.png" alt="Iris"></div>
                <div class="item-info">
                    <span class="item-name">Iris Drone</span>
                    <span class="item-desc">Elite drone. 2 Slots.</span>
                </div>
                <div class="item-action">
                    <span class="price-tag price-uri"><?= $displayPriceIris ?></span><br>
                    <?php if($currentDroneCount < 8): ?>
                        <a href="view.php?page=shop&tab=items&cat=drones&buy=iris" class="btn-buy">Buy</a>
                    <?php else: ?>
                        <button class="btn-disabled" disabled>Max</button>
                    <?php endif; ?>
                </div>
            </div>


        </div>
    </div>
    <?php endif; ?>

</div>
