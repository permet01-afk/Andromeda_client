<?php 

require_once __DIR__ . '/../../libs/ShopPurchaseService.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}

$sth = $db->prepare("SELECT uridium, credits, booster_dmg_time,
booster_shd_time, booster_hp_time
 FROM users WHERE id = :id LIMIT 1");
$sth->execute(array(':id' => $_SESSION['player_id']));
$datauser = $sth->fetchAll();


$shopPurchaseService = new ShopPurchaseService($db, (int)$_SESSION['player_id']);
$buymessage = $buymessage ?? '';

if (!empty($_SESSION['shop_flash'])) {
    $buymessage = $_SESSION['shop_flash'];
    unset($_SESSION['shop_flash']);
}

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

$redirectWithBoosterMessage = function (string $message): void {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }
    $_SESSION['shop_flash'] = $message;
    header('Location: view.php?page=shop&tab=boosters');
    exit;
};

if(!empty($_POST['submit-dmgbooster'])) {
    $hours = (!empty($_POST['amount-d'])) ? (int)$_POST['amount-d'] : 1;
    $redirectWithBoosterMessage($shopPurchaseService->buyBooster('damage_booster', 'booster_dmg_time', $hours, 10000, 'Damage Booster'));
}
else if(!empty($_POST['submit-hpbooster'])) {
    $hours = (!empty($_POST['amount-g'])) ? (int)$_POST['amount-g'] : 1;
    $redirectWithBoosterMessage($shopPurchaseService->buyBooster('hp_booster', 'booster_hp_time', $hours, 10000, 'HP Booster'));
}
else if(!empty($_POST['submit-shbooster'])) {
    $hours = (!empty($_POST['amount-e'])) ? (int)$_POST['amount-e'] : 1;
    $redirectWithBoosterMessage($shopPurchaseService->buyBooster('shield_booster', 'booster_shd_time', $hours, 10000, 'Shield Booster'));
}


if(!empty($buymessage)) {
	$sth = $db->prepare("SELECT uridium, credits, booster_dmg_time,
booster_shd_time, booster_hp_time
	 FROM users WHERE id = :id LIMIT 1");
	$sth->execute(array(':id' => $_SESSION['player_id']));
	$datauser = $sth->fetchAll();
}


function calculateBoosterTime($endTime) {
    if($endTime > time()) {
        $diff = $endTime - time();
        $days = intval($diff / 86400);
        $remain = $diff % 86400;
        $hours = intval($remain / 3600);
        $remain = $remain % 3600;
        $minutes = intval($remain / 60);
        
        $str = "";
        if ($days > 0) $str .= $days . 'd ';
        $str .= $hours . 'h ' . $minutes . 'm';
        return $str;
    }
    return "Expired"; 
}

$booster_dmg_display = calculateBoosterTime($datauser[0]['booster_dmg_time']);
$booster_hp_display = calculateBoosterTime($datauser[0]['booster_hp_time']);
$booster_shd_display = calculateBoosterTime($datauser[0]['booster_shd_time']);

?>

<style>
    .shop-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 1.5rem;
        box-shadow: var(--shadow-lg);
        margin-bottom: 2rem;
    }

    .shop-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-accent);
        margin-bottom: 1rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--color-border);
        padding-bottom: 0.75rem;
    }

    .item-row {
        display: flex;
        align-items: center;
        background: rgba(8, 14, 26, 0.4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 0.85rem 1rem;
        margin-bottom: 0.75rem;
        transition: transform var(--transition-fast), border-color var(--transition-fast);
    }

    .item-row:hover {
        border-color: var(--color-accent-strong);
        transform: translateY(-2px);
    }

    .item-img-container {
        width: 60px;
        margin-right: 1.5rem;
        flex-shrink: 0;
        display: flex;
        justify-content: center;
    }

    .item-img-container img {
        max-width: 100%;
        max-height: 50px;
        filter: drop-shadow(0 0 5px rgba(94, 234, 212, 0.2));
    }

    .item-info { flex: 1; }

    .item-name {
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--color-text);
        display: block;
        margin-bottom: 0.2rem;
    }

    .item-desc {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        display: block;
    }

    .item-action {
        text-align: right;
        padding-left: 1rem;
        border-left: 1px solid var(--color-border);
        min-width: 180px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;
        gap: 0.5rem;
    }

    .price-tag {
        font-size: 0.9rem;
        font-weight: 700;
    }

    .btn-buy {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.4rem 1.2rem;
        background: linear-gradient(135deg, rgba(94, 234, 212, 0.9), rgba(34, 211, 238, 0.78));
        color: #032029;
        font-weight: 700;
        border-radius: var(--radius-sm);
        border: 1px solid rgba(94, 234, 212, 0.7);
        text-transform: uppercase;
        font-size: 0.8rem;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s;
        border: none;
    }

    .btn-buy:hover {
        opacity: 0.9;
        box-shadow: 0 4px 12px rgba(94, 234, 212, 0.3);
        transform: translateY(-1px);
    }

    .qty-form {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .qty-input {
        width: 60px;
        padding: 0.4rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border-strong);
        background: rgba(0, 0, 0, 0.3);
        color: white;
        text-align: center;
        font-weight: 600;
    }

    .timer-display {
        font-family: monospace;
        color: #666;
        font-size: 0.85em;
        margin-top: 4px;
    }
    .timer-display.active {
        color: var(--color-accent, #5eead4);
        font-weight: bold;
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

<div id="shop-items-container">

    <?php if(!empty($buymessage)): ?>
        <div class="msg-box"><?= htmlspecialchars($buymessage) ?></div>
    <?php endif; ?>

    <div class="shop-card">
        <h2 class="shop-title">Ship Boosters</h2>

        <div class="item-row">
            <div class="item-img-container"><img src="img/dmg.png" alt="Damage"></div>
            <div class="item-info">
                <span class="item-name">Damage Booster</span>
                <span class="item-desc">+10% Damage</span>
                <span class="item-desc timer-display <?= ($booster_dmg_display !== 'Expired') ? 'active' : '' ?>">
                    Time left: <?= $booster_dmg_display ?>
                </span>
            </div>
            <div class="item-action">
                <div class="price-tag" style="color: var(--color-accent-strong);">10,000 U / Hour</div>
                <form action="view.php?page=shop&tab=boosters" method="post" class="qty-form">
                    <input type="number" name="amount-d" value="1" min="1" class="qty-input" title="Hours">
                    <button name="submit-dmgbooster" type="submit" class="btn-buy" value="Buy">Buy</button>
                </form>
            </div>
        </div>

        <div class="item-row">
            <div class="item-img-container"><img src="img/hp.png" alt="HP"></div>
            <div class="item-info">
                <span class="item-name">HP Booster</span>
                <span class="item-desc">+10% Hitpoints</span>
                <span class="item-desc timer-display <?= ($booster_hp_display !== 'Expired') ? 'active' : '' ?>">
                    Time left: <?= $booster_hp_display ?>
                </span>
            </div>
            <div class="item-action">
                <div class="price-tag" style="color: var(--color-accent-strong);">10,000 U / Hour</div>
                <form action="view.php?page=shop&tab=boosters" method="post" class="qty-form">
                    <input type="number" name="amount-g" value="1" min="1" class="qty-input" title="Hours">
                    <button name="submit-hpbooster" type="submit" class="btn-buy" value="Buy">Buy</button>
                </form>
            </div>
        </div>

        <div class="item-row">
            <div class="item-img-container"><img src="img/sh.png" alt="Shield"></div>
            <div class="item-info">
                <span class="item-name">Shield Booster</span>
                <span class="item-desc">+25% Shield</span>
                <span class="item-desc timer-display <?= ($booster_shd_display !== 'Expired') ? 'active' : '' ?>">
                    Time left: <?= $booster_shd_display ?>
                </span>
            </div>
            <div class="item-action">
                <div class="price-tag" style="color: var(--color-accent-strong);">10,000 U / Hour</div>
                <form action="view.php?page=shop&tab=boosters" method="post" class="qty-form">
                    <input type="number" name="amount-e" value="1" min="1" class="qty-input" title="Hours">
                    <button name="submit-shbooster" type="submit" class="btn-buy" value="Buy">Buy</button>
                </form>
            </div>
        </div>

    </div>
</div>
