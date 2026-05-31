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
    <div id="popup_box">
        <div id="popupContent"><?= htmlspecialchars($buymessage) ?></div>
        <a id="popupBoxClose">Close</a>    
    </div>

    <script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>
    <script type="text/javascript">
        $(document).ready(function() {
            loadPopupBox();

            $('#popupBoxClose').click(function() { unloadPopupBox(); });
            
            // On ferme aussi si on clique en dehors (sur l'app-shell par exemple)
            $(document).on('click', function(e) {
                if($(e.target).closest('#popup_box').length === 0 && $(e.target).attr('id') != 'popup_box') {
                     // Logique optionnelle pour fermer au clic extérieur
                }
            });

            function unloadPopupBox() {
                $('#popup_box').fadeOut("slow");
                $(".app-shell").css({ "opacity": "1" }); 
            }

            function loadPopupBox() {
                $('#popup_box').fadeIn("slow");
                $(".app-shell").css({ "opacity": "0.3" });          
            }
        });
    </script>
<?php
}
?>