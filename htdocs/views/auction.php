<?php
require_once __DIR__ . '/../libs/AuctionService.php';

if (!function_exists('auction_e')) {
    function auction_e($value): string
    {
        return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('auction_number')) {
    function auction_number($value): string
    {
        return number_format((int)$value, 0, '.', ',');
    }
}

if (!function_exists('auction_qty')) {
    function auction_qty($value): string
    {
        $qty = (int)$value;
        return $qty > 1 ? auction_number($qty) . 'x' : '1x';
    }
}

$auctionPlayerId = (int)($sessionPlayerId ?? ($_SESSION['player_id'] ?? 0));
$csrfToken = (string)($auctionCsrfToken ?? ($_SESSION['auction_csrf_token'] ?? ''));
$auctionService = new AuctionService($db, $auctionPlayerId);
$auctionMessage = '';
$auctionError = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['auction_action'] ?? '') === 'bid') {
    try {
        $postedToken = (string)($_POST['csrf_token'] ?? '');
        if ($csrfToken === '' || !hash_equals($csrfToken, $postedToken)) {
            throw new Exception('Security token expired. Please refresh the page and try again.');
        }

        $lotId = (int)($_POST['lot_id'] ?? 0);
        $rawBid = (string)($_POST['bid_credits'] ?? '0');
        $bidCredits = (int)preg_replace('/[^0-9]/', '', $rawBid);

        $auctionMessage = $auctionService->placeBid($lotId, $bidCredits);
    } catch (Exception $e) {
        $auctionError = $e->getMessage();
    }
}

try {
    $auctionState = $auctionService->preparePage();
} catch (Exception $e) {
    $auctionState = [
        'schedule' => [
            'is_open' => false,
            'round_number' => null,
            'next_round_number' => 1,
            'target_timestamp' => time(),
            'now_timestamp' => time(),
            'now_label' => date('Y-m-d H:i:s'),
            'timezone' => AuctionService::TIMEZONE,
            'next_starts_at' => null,
            'next_ends_at' => null,
            'ends_at' => null,
        ],
        'round' => null,
        'lots' => [],
        'daily_windows' => [],
    ];
    $auctionError = $auctionError !== '' ? $auctionError : 'Auction system error: ' . $e->getMessage();
}

$schedule = $auctionState['schedule'];
$isOpen = !empty($schedule['is_open']);
$lots = $auctionState['lots'];
$dailyWindows = $auctionState['daily_windows'];
$targetTimestamp = (int)($schedule['target_timestamp'] ?? time());
$roundLabel = $isOpen ? (int)($schedule['round_number'] ?? 0) : (int)($schedule['next_round_number'] ?? 1);
$timerSuffix = $isOpen ? 'left' : 'until next round';
$serverTime = (string)($schedule['now_label'] ?? '');

$auctionCategoryTabs = [
    'ammo' => [
        'label' => 'Munitions & Rockets',
        'title' => 'Munitions & Rockets',
        'description' => 'Laser ammunition and rockets available in fixed auction lots.',
        'categories' => ['Laser Ammunition', 'Rockets'],
    ],
    'ships' => [
        'label' => 'Ships',
        'title' => 'Ships',
        'description' => 'Ships won here are equipped directly on your account.',
        'categories' => ['Ships'],
    ],
    'designs' => [
        'label' => 'Designs',
        'title' => 'Ship Designs',
        'description' => 'Elite ship designs. Designs already owned cannot be won again.',
        'categories' => ['Ship Designs'],
    ],
    'equipment' => [
        'label' => 'Equipment',
        'title' => 'Equipment',
        'description' => 'Lasers, shields, generators, extras and Iris drone rewards.',
        'categories' => ['Equipment', 'Drones'],
    ],
    'special' => [
        'label' => 'Special & Resources',
        'title' => 'Special Items & Resources',
        'description' => 'Special consumables, Logfiles and Booty Keys.',
        'categories' => ['Special Items', 'Resources'],
    ],
    'boosters' => [
        'label' => 'Boosters',
        'title' => 'Boosters',
        'description' => 'Five-hour boosters added to your existing booster time.',
        'categories' => ['Boosters'],
    ],
];

$postedAuctionCategory = strtolower((string)($_POST['auction_return_cat'] ?? ''));
$currentAuctionCategory = $postedAuctionCategory !== '' ? $postedAuctionCategory : strtolower((string)($_GET['cat'] ?? 'ammo'));
if (!isset($auctionCategoryTabs[$currentAuctionCategory])) {
    $currentAuctionCategory = 'ammo';
}

$auctionTabCounts = [];
foreach ($auctionCategoryTabs as $tabKey => $tabData) {
    $auctionTabCounts[$tabKey] = 0;
}

$auctionLotTabs = [];
foreach ($lots as $lotIndex => $lot) {
    $lotCategory = (string)($lot['category'] ?? '');
    $matchedTab = 'ammo';

    foreach ($auctionCategoryTabs as $tabKey => $tabData) {
        if (in_array($lotCategory, $tabData['categories'], true)) {
            $matchedTab = $tabKey;
            break;
        }
    }

    $auctionLotTabs[$lotIndex] = $matchedTab;
    $auctionTabCounts[$matchedTab]++;
}

$visibleLots = $lots;
$currentTab = $auctionCategoryTabs[$currentAuctionCategory];
$currentTabCount = (int)($auctionTabCounts[$currentAuctionCategory] ?? 0);
?>

<div class="auction-page <?php echo $isOpen ? 'is-open' : 'is-closed'; ?>" data-auction-target="<?php echo $targetTimestamp; ?>" data-auction-open="<?php echo $isOpen ? '1' : '0'; ?>">
    <section class="auction-hero" aria-label="Auction status">
        <div class="auction-hero-copy">
            <h1>Auction</h1>
            <p>Bid with Credits. The highest bidder wins when the 60 minute round reaches zero.</p>
        </div>

        <div class="auction-hero-status">
            <span class="auction-countline"><strong id="auction-countdown">--:--:--</strong> <em><?php echo auction_e($timerSuffix); ?></em></span>
        </div>
    </section>

    <?php if ($auctionMessage !== ''): ?>
        <div class="auction-alert is-success"><?php echo auction_e($auctionMessage); ?></div>
    <?php endif; ?>

    <?php if ($auctionError !== ''): ?>
        <div class="auction-alert is-error"><?php echo auction_e($auctionError); ?></div>
    <?php endif; ?>

    <nav class="auction-category-tabs" aria-label="Auction categories" data-auction-category-tabs>
        <?php foreach ($auctionCategoryTabs as $tabKey => $tabData):
            $isActiveTab = ($tabKey === $currentAuctionCategory);
            $tabCount = (int)($auctionTabCounts[$tabKey] ?? 0);
        ?>
            <a class="auction-category-tab <?php echo $isActiveTab ? 'is-active' : ''; ?>"
               href="view.php?page=auction&amp;cat=<?php echo auction_e($tabKey); ?>"
               data-auction-category-button="1"
               data-auction-category="<?php echo auction_e($tabKey); ?>"
               data-auction-title="<?php echo auction_e($tabData['title']); ?>"
               aria-selected="<?php echo $isActiveTab ? 'true' : 'false'; ?>">
                <span><?php echo auction_e($tabData['label']); ?></span>
                <b><?php echo $tabCount; ?></b>
            </a>
        <?php endforeach; ?>
    </nav>

    <div class="auction-layout">
        <main class="auction-board" aria-label="Auction lots">
            <header class="auction-board-head">
                <h2 id="auction-category-title"><?php echo auction_e($currentTab['title']); ?></h2>
            </header>

            <div class="auction-table-wrap">
                <?php if (!$isOpen): ?>
                    <div class="auction-closed-overlay" role="status">
                        <strong>Auction is closed</strong>
                        <span>Next round starts in <b id="auction-overlay-countdown">--:--:--</b>. Bidding controls are disabled.</span>
                    </div>
                <?php endif; ?>

                <table class="auction-table">
                    <colgroup>
                        <col class="auction-col-item" />
                        <col class="auction-col-qty" />
                        <col class="auction-col-starting" />
                        <col class="auction-col-owner" />
                        <col class="auction-col-current" />
                        <col class="auction-col-bid" />
                    </colgroup>
                    <tbody>
                        <tr id="auction-empty-row" class="auction-empty-row" <?php echo $currentTabCount > 0 ? 'style="display:none"' : ''; ?>>
                            <td colspan="6" class="auction-empty" data-label="Auction">No auction items are available in this category.</td>
                        </tr>

                        <?php foreach ($visibleLots as $lotIndex => $lot):
                            $lotId = isset($lot['lot_id']) ? (int)$lot['lot_id'] : 0;
                            $currentBidderId = $lot['current_bidder_id'] !== null ? (int)$lot['current_bidder_id'] : 0;
                            $isCurrentLeader = ($auctionPlayerId > 0 && $currentBidderId === $auctionPlayerId);
                            $hasOwner = $currentBidderId > 0;
                            $minimumBid = (int)($lot['minimum_required_bid'] ?? 0);
                            $startingBid = (int)($lot['starting_bid_credits'] ?? 0);
                            $displayCurrentBid = $hasOwner ? (int)$lot['current_bid_credits'] : $startingBid;
                            $eligibilityReason = (string)($lot['eligibility_reason'] ?? '');
                            $disabled = (!$isOpen || $lotId <= 0 || $eligibilityReason !== '');
                            $itemName = (string)($lot['name'] ?? 'Auction item');
                            $category = (string)($lot['category'] ?? 'Auction');
                            $description = (string)($lot['description'] ?? '');
                            $imagePath = (string)($lot['image_path'] ?? '');
                            $quantity = (int)($lot['qty'] ?? 1);
                            $quantityLabel = ((string)($lot['grant_type'] ?? '') === 'booster') ? auction_number($quantity) . 'h' : auction_qty($quantity);
                            $rowAuctionCategory = (string)($auctionLotTabs[$lotIndex] ?? 'ammo');
                            $isVisibleCategory = ($rowAuctionCategory === $currentAuctionCategory);
                        ?>
                            <tr class="auction-row <?php echo $isCurrentLeader ? 'is-leading' : ''; ?> <?php echo $eligibilityReason !== '' ? 'is-locked' : ''; ?> <?php echo $isVisibleCategory ? '' : 'is-category-hidden'; ?>" data-auction-row="1" data-auction-category="<?php echo auction_e($rowAuctionCategory); ?>">
                                <td class="auction-item-cell" data-label="Item">
                                    <div class="auction-item">
                                        <div class="auction-item-image">
                                            <img src="<?php echo auction_e($imagePath); ?>" alt="<?php echo auction_e($itemName); ?>" loading="lazy" />
                                        </div>
                                        <div class="auction-item-text">
                                            <strong><?php echo auction_e($itemName); ?></strong>
                                            <span><?php echo auction_e($description); ?></span>
                                            <small><?php echo auction_e($category); ?></small>
                                            <?php if ($eligibilityReason !== ''): ?>
                                                <small class="auction-row-warning"><?php echo auction_e($eligibilityReason); ?></small>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </td>
                                <td class="auction-qty" data-label="Qty"><?php echo auction_e($quantityLabel); ?></td>
                                <td data-label="Starting bid"><?php echo auction_number($startingBid); ?> C.</td>
                                <td class="auction-owner" data-label="Owner">
                                    <?php if ($hasOwner): ?>
                                        <span><?php echo auction_e($lot['current_bidder_name'] ?? 'Unknown'); ?></span>
                                        <?php if ($isCurrentLeader): ?><b>You</b><?php endif; ?>
                                    <?php else: ?>
                                        <em>No owner</em>
                                    <?php endif; ?>
                                </td>
                                <td class="auction-current-bid" data-label="Current bid"><?php echo auction_number($displayCurrentBid); ?> C.</td>
                                <td class="auction-bid-cell" data-label="Bid">
                                    <form method="post" action="view.php?page=auction&amp;cat=<?php echo auction_e($rowAuctionCategory); ?>" class="auction-bid-form">
                                        <input type="hidden" name="auction_action" value="bid" />
                                        <input type="hidden" name="auction_return_cat" value="<?php echo auction_e($rowAuctionCategory); ?>" />
                                        <input type="hidden" name="csrf_token" value="<?php echo auction_e($csrfToken); ?>" />
                                        <input type="hidden" name="lot_id" value="<?php echo $lotId; ?>" />
                                        <input type="number" name="bid_credits" min="<?php echo $minimumBid; ?>" step="1" value="<?php echo $minimumBid; ?>" <?php echo $disabled ? 'disabled' : ''; ?> />
                                        <button type="submit" <?php echo $disabled ? 'disabled' : ''; ?>><?php echo $isOpen ? 'Bid' : 'Off'; ?></button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </main>

        <aside class="auction-sidebar" aria-label="Auction information">
            <section class="auction-side-card">
                <h3>Daily schedule</h3>
                <div class="auction-schedule-list">
                    <?php foreach ($dailyWindows as $index => $window):
                        $roundNumber = $index + 1;
                        $isCurrentRound = $isOpen && ((int)($schedule['round_number'] ?? 0) === $roundNumber);
                        $isNextRound = !$isOpen && ((int)($schedule['next_round_number'] ?? 0) === $roundNumber);
                    ?>
                        <div class="auction-schedule-row <?php echo $isCurrentRound ? 'is-current' : ''; ?> <?php echo $isNextRound ? 'is-next' : ''; ?>">
                            <span>Round <?php echo $roundNumber; ?></span>
                            <strong><?php echo auction_e($window[0]); ?> - <?php echo auction_e($window[1]); ?></strong>
                        </div>
                    <?php endforeach; ?>
                </div>
            </section>

            <section class="auction-side-card">
                <h3>Rules</h3>
                <dl class="auction-rules">
                    <div><dt>Currency</dt><dd>Credits</dd></div>
                    <div><dt>Duration</dt><dd>60 minutes</dd></div>
                    <div><dt>Refund</dt><dd>Outbid players</dd></div>
                    <div><dt>No owner</dt><dd>No winner</dd></div>
                    <div><dt>First bid</dt><dd>Starting bid + 1 C.</dd></div>
                </dl>
            </section>
        </aside>
    </div>
</div>

<script>
(function () {
    var root = document.querySelector('.auction-page');
    var timer = document.getElementById('auction-countdown');
    var overlayTimer = document.getElementById('auction-overlay-countdown');
    if (!root || !timer) return;

    var target = parseInt(root.getAttribute('data-auction-target'), 10) * 1000;
    var reloaded = false;

    function pad(value) {
        value = Math.max(0, Math.floor(value));
        return value < 10 ? '0' + value : String(value);
    }

    function renderTime() {
        var diff = Math.max(0, target - Date.now());
        var total = Math.floor(diff / 1000);
        var hours = Math.floor(total / 3600);
        var minutes = Math.floor((total % 3600) / 60);
        var seconds = total % 60;
        var value = pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);

        timer.textContent = value;
        if (overlayTimer) overlayTimer.textContent = value;

        if (diff <= 0 && !reloaded) {
            reloaded = true;
            window.setTimeout(function () { window.location.reload(); }, 1200);
        }
    }

    function setupCategoryTabs() {
        var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-auction-category-button]'));
        var rows = Array.prototype.slice.call(root.querySelectorAll('[data-auction-row]'));
        var title = document.getElementById('auction-category-title');
        var emptyRow = document.getElementById('auction-empty-row');

        if (!tabs.length || !rows.length) return;

        function activateCategory(category, updateUrl) {
            var activeTab = null;

            tabs.forEach(function (tab) {
                var isActive = tab.getAttribute('data-auction-category') === category;
                tab.classList.toggle('is-active', isActive);
                tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                if (isActive) activeTab = tab;
            });

            if (!activeTab) {
                activeTab = tabs[0];
                category = activeTab.getAttribute('data-auction-category');
            }

            var visibleCount = 0;
            rows.forEach(function (row) {
                var isVisible = row.getAttribute('data-auction-category') === category;
                row.classList.toggle('is-category-hidden', !isVisible);
                if (isVisible) visibleCount++;
            });

            if (title) title.textContent = activeTab.getAttribute('data-auction-title') || '';
            if (emptyRow) emptyRow.style.display = visibleCount > 0 ? 'none' : '';

            if (updateUrl && window.history && window.history.replaceState) {
                window.history.replaceState(null, '', 'view.php?page=auction&cat=' + encodeURIComponent(category));
            }
        }

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function (event) {
                event.preventDefault();
                activateCategory(tab.getAttribute('data-auction-category'), true);
            });
        });

        var initiallyActive = tabs.filter(function (tab) {
            return tab.classList.contains('is-active');
        })[0] || tabs[0];

        activateCategory(initiallyActive.getAttribute('data-auction-category'), false);
    }

    setupCategoryTabs();
    renderTime();
    window.setInterval(renderTime, 1000);
})();
</script>
