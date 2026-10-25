<?php

$displayTab = isset($_GET['tab']) ? htmlspecialchars($_GET['tab']) : 'ship';


$tabs = [
    'ship'     => 'Ships',
    'designs'  => 'Designs',      
    'items'    => 'Items',        
    'boosters' => 'Boosters'      
];


$allowed = array_keys($tabs);
?>

<link rel="stylesheet" type="text/css" href="styles/userStyle.css" />

<div class="user-hub-wrapper">
    <div class="user-hub">
        
        <div class="user-hub__hero">
            <h1>Intergalactic Shop</h1>
            <p>Upgrade your ship and dominate the galaxy.</p>
        </div>

        <div class="user-hub__layout">
            
            <aside class="user-hub__nav">
                <ul class="user-hub__menu">
                    <?php foreach ($tabs as $urlKey => $label): ?>
                        <li class="user-hub__menu-item <?php echo ($displayTab === $urlKey) ? 'is-active' : ''; ?>">
                            <a href="view.php?page=shop&tab=<?php echo $urlKey; ?>" class="user-hub__menu-link">
                                <span class="user-hub__menu-title"><?php echo $label; ?></span>
                                <span class="user-hub__menu-subtitle">Category</span>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </aside>

            <div class="user-hub__content">
                <?php 
                if (in_array($displayTab, $allowed)) {
                    $filePath = __DIR__ . '/shopTabs/' . $displayTab . '.php';

if (file_exists($filePath)) {
    include $filePath;
} else {
                        
                        echo '<div class="user-hub__empty">⚠️ File missing: ' . $filePath . '</div>';
                    }
                } else {
                    echo '<div class="user-hub__empty">🚫 This tab does not exist.</div>';
                }
                ?>
            </div>

        </div> </div> </div> <?php

if (!empty($buymessage)) {
?>
    <dialog id="popup_box" aria-label="Shop transaction" aria-describedby="popupContent">
        <div id="popupContent"><?= htmlspecialchars($buymessage, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></div>
        <button id="popupBoxClose" type="button">Close</button>
    </dialog>
<?php
}
?>
