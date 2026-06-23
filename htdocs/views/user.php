<?php
$displayPage = 'infos';
if (isset($_GET['tab'])) {
    $displayPage = $_GET['tab'];
}
if ($displayPage === 'achievements') {
    $displayPage = 'quests';
}

$tabs = [
    'infos' => [
        'label' => 'Informations',
        'description' => 'Overview of your pilot profile and currencies.',
        'href' => 'view.php?page=user&amp;tab=infos',
    ],
    'upgrades' => [
        'label' => 'Pilot Bio',
        'description' => 'Spend Research Points in your pilot skill tree.',
        'href' => 'view.php?page=user&amp;tab=upgrades',
    ],
    'quests' => [
        'label' => 'Quest',
        'description' => 'Complete hunting contracts, basic quests, and PVP missions.',
        'href' => 'view.php?page=user&amp;tab=quests',
    ],
    'titles' => [
        'label' => 'Titles',
        'description' => 'Equip unlocked titles shown under your pilot name.',
        'href' => 'view.php?page=user&amp;tab=titles',
    ],
    'configurations' => [
        'label' => 'Configurations',
        'description' => 'Fine-tune your ship layouts and presets.',
        'href' => 'view.php?page=user&amp;tab=configurations',
    ],
];
?>
<link rel="stylesheet" type="text/css" href="styles/home.css" />
<link rel="stylesheet" type="text/css" href="styles/userStyle.css" />

<div class="CMSContent user-hub-wrapper">
    <section class="user-hub">
        <header class="user-hub__hero">
            <h1>Pilot command hub</h1>
            <p>Manage your identity, upgrades, quests, and ship configurations without leaving the dashboard.</p>
        </header>
        <div class="user-hub__layout">
            <nav class="user-hub__nav" aria-label="User sections">
                <ul class="user-hub__menu">
                    <?php foreach ($tabs as $key => $meta) { ?>
                        <li class="user-hub__menu-item<?php echo $displayPage === $key ? ' is-active' : ''; ?>">
                            <a class="user-hub__menu-link" href="<?php echo $meta['href']; ?>"<?php echo $displayPage === $key ? ' aria-current="page"' : ''; ?>>
                                <span class="user-hub__menu-title"><?php echo $meta['label']; ?></span>
                                <span class="user-hub__menu-subtitle"><?php echo $meta['description']; ?></span>
                            </a>
                        </li>
                    <?php } ?>
                </ul>
            </nav>
            <section class="user-hub__content" aria-live="polite">
                <?php
                $allowed = ['infos', 'upgrades', 'quests', 'titles', 'configurations'];
                if (in_array($displayPage, $allowed, true)) {
                    include 'views/userTabs/' . $displayPage . '.php';
                } else {
                    echo '<div class="user-hub__empty">Not allowed!</div>';
                }
                ?>
            </section>
        </div>
    </section>
</div>

<?php
if (isset($buymessage)) {
    ?>
        <div id="popup_box">
                <div id="popupContent">
                <?=$buymessage?>
                </div>
                <a id="popupBoxClose"  >Close</a>
        </div>

        <script src="http://jqueryjs.googlecode.com/files/jquery-1.2.6.min.js" type="text/javascript"></script>
        <script type="text/javascript">

                $(document).ready( function() {

                        // When site loaded, load the Popupbox First
                        loadPopupBox();

                        $('#popupBoxClose').click( function() {
                                unloadPopupBox();
                        });

                        $('#container').click( function() {
                                unloadPopupBox();
                        });

                        function unloadPopupBox() {    // TO Unload the Popupbox
                                $('#popup_box').fadeOut("slow");
                                $("#container").css({ // this is just for style
                                        "opacity": "1"
                                });
                        }

                        function loadPopupBox() {    // To Load the Popupbox
                                $('#popup_box').fadeIn("slow");
                                $("#container").css({ // this is just for style
                                        "opacity": "0.3"
                                });
                        }
                });
        </script>
<?php
}
?>
