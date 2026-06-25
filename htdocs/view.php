<?php
session_start();
if (!isset($_SESSION['terms_of_use']) || $_SESSION['terms_of_use'] !== true) {
    header('Location: index.php');
    exit();
}
if (!isset($_SESSION['loggedIn']) || $_SESSION['loggedIn'] !== true) {
    header('Location: login.php');
    exit();
}



$sessionPlayerId = $_SESSION['player_id'] ?? null;
if (empty($_SESSION['auction_csrf_token'])) {
    $_SESSION['auction_csrf_token'] = bin2hex(random_bytes(32));
}
$auctionCsrfToken = $_SESSION['auction_csrf_token'];
if (empty($_SESSION['quest_csrf_token'])) {
    $_SESSION['quest_csrf_token'] = bin2hex(random_bytes(32));
}
$questCsrfToken = $_SESSION['quest_csrf_token'];
if (empty($_SESSION['title_csrf_token'])) {
    $_SESSION['title_csrf_token'] = bin2hex(random_bytes(32));
}
$titleCsrfToken = $_SESSION['title_csrf_token'];
if (empty($_SESSION['daily_login_csrf_token'])) {
    $_SESSION['daily_login_csrf_token'] = bin2hex(random_bytes(32));
}
$dailyLoginCsrfToken = $_SESSION['daily_login_csrf_token'];
if (empty($_SESSION['skylab_csrf_token'])) {
    $_SESSION['skylab_csrf_token'] = bin2hex(random_bytes(32));
}
$skylabCsrfToken = $_SESSION['skylab_csrf_token'];
session_write_close();

ob_start();

require_once __DIR__ . '/libs/Database.php';
require_once __DIR__ . '/config/database.php';

$db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);

$mobileEmbed = (isset($_GET['mobile_embed']) && (string)$_GET['mobile_embed'] === '1')
    || (isset($_POST['mobile_embed']) && (string)$_POST['mobile_embed'] === '1');

local_entete($mobileEmbed);

$displayPage = 'home';
if (isset($_GET['page'])) {
    $displayPage = $_GET['page'];
}


if ($displayPage === 'top100') {
    header('Location: view.php?page=home');
    exit();
}


$allowed = [
    'clan',
    'company',
    'contact',
    'home',
    'rules',
    'settings',
    'shop',
    'auction',
    'skylab',
    
    'user',
    'lottery',
];

$navActiveClass = function (array $pages) use ($displayPage): string {
    return in_array($displayPage, $pages, true) ? ' is-active' : '';
};


$userNavPages = ['user', 'company']; 
$clanNavPages = ['clan'];
$shopNavPages = ['shop'];

$userExpanded = in_array($displayPage, $userNavPages, true);
$clanExpanded = in_array($displayPage, $clanNavPages, true);
$shopExpanded = in_array($displayPage, $shopNavPages, true);

ob_start();
if (in_array($displayPage, $allowed, true)) {
    include 'views/' . $displayPage . '.php';
} else {
    echo '<div class="app-feedback">Not allowed!</div>';
}
$pageContent = ob_get_clean();

$sth = $db->prepare('SELECT u.username, u.factionid, u.clanid, u.grade, u.experience, u.honor, u.rankpoints, u.credits, u.uridium, c.clan_tag FROM users u LEFT JOIN clan c ON c.id = u.clanid WHERE u.id = :id LIMIT 1');
$sth->execute([
    ':id' => $sessionPlayerId,
]);
$datauser = $sth->fetchAll();
$pilot = $datauser[0] ?? [];

if ((int)($pilot['factionid'] ?? 0) === 0) {
    header('Location: company.php');
    exit();
}

$bHasClan = (int)($pilot['clanid'] ?? 0) > 0;
$pilotUsername = htmlspecialchars((string)($pilot['username'] ?? ''), ENT_QUOTES, 'UTF-8');
$pilotClanLabel = $bHasClan && !empty($pilot['clan_tag']) ? '[' . htmlspecialchars((string)$pilot['clan_tag'], ENT_QUOTES, 'UTF-8') . ']' : '';
$pilotFactionId = (int)($pilot['factionid'] ?? 0);
$pilotGrade = (int)($pilot['grade'] ?? 0);
$pilotExperience = number_format((int)($pilot['experience'] ?? 0));
$pilotHonor = number_format((int)($pilot['honor'] ?? 0));
$pilotRankpoints = number_format((int)($pilot['rankpoints'] ?? 0));
$pilotCredits = number_format((int)($pilot['credits'] ?? 0));
$pilotUridium = number_format((int)($pilot['uridium'] ?? 0));
?>
<?php if ($mobileEmbed) { ?>
<div class="mobile-embed-shell">
    <main class="app-main mobile-embed-main" id="main-content">
        <div class="app-content mobile-embed-content">
            <?php echo $pageContent; ?>
        </div>
    </main>
</div>
<?php } else { ?>
<div class="app-shell">
    <header class="app-header">
        <div class="header-primary">
            <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="app-navigation">
                <span class="sr-only">Toggle navigation</span>
                <span class="nav-toggle-bar"></span>
                <span class="nav-toggle-bar"></span>
                <span class="nav-toggle-bar"></span>
            </button>
            <a class="brand" href="view.php?page=home">
                <img src="img/logo.png" alt="Andromeda" width="160" height="56" />
                <span class="brand-text">Command Center</span>
            </a>
        </div>
        <div class="header-actions">
            <a class="header-link" href="view.php?page=home">Dashboard</a>
            <a class="header-link" href="logout.php">Logout</a>
        </div>
    </header>

    <nav class="app-nav" id="app-navigation">
        <ul class="nav-list">
            <li class="nav-item<?php echo $navActiveClass(['home']); ?>">
                <a class="nav-link" href="view.php?page=home">Home</a>
            </li>

            <li class="nav-item has-submenu<?php echo $navActiveClass($userNavPages); ?><?php echo $userExpanded ? ' is-expanded' : ''; ?>">
                <a class="nav-link" href="view.php?page=user" aria-haspopup="true" aria-expanded="<?php echo $userExpanded ? 'true' : 'false'; ?>">User</a>
                <button class="submenu-toggle" type="button" aria-expanded="<?php echo $userExpanded ? 'true' : 'false'; ?>" aria-label="Toggle user menu"><span class="submenu-toggle-icon" aria-hidden="true"></span></button>
                <ul class="submenu" aria-label="User menu">
                    <li><a class="submenu-link" href="view.php?page=user&amp;tab=infos">Informations</a></li>
                    <li><a class="submenu-link" href="view.php?page=company">Company Change</a></li>
                    <li><a class="submenu-link" href="view.php?page=user&amp;tab=upgrades">Pilot Bio</a></li>
                    <li><a class="submenu-link" href="view.php?page=user&amp;tab=configurations">Configurations</a></li>
                    <li><a class="submenu-link" href="view.php?page=user&amp;tab=quests">Quest</a></li>
                    <li><a class="submenu-link" href="view.php?page=user&amp;tab=titles">Titles</a></li>
                </ul>
            </li>

            <li class="nav-item has-submenu<?php echo $navActiveClass($clanNavPages); ?><?php echo $clanExpanded ? ' is-expanded' : ''; ?>">
                <a class="nav-link" href="view.php?page=clan" aria-haspopup="true" aria-expanded="<?php echo $clanExpanded ? 'true' : 'false'; ?>">Clan</a>
                <button class="submenu-toggle" type="button" aria-expanded="<?php echo $clanExpanded ? 'true' : 'false'; ?>" aria-label="Toggle clan menu"><span class="submenu-toggle-icon" aria-hidden="true"></span></button>
                <ul class="submenu" aria-label="Clan menu">
                    <?php if ($bHasClan) { ?>
                        <li><a class="submenu-link" href="view.php?page=clan&amp;tab=claninfos">Informations</a></li>
                        <li><a class="submenu-link" href="view.php?page=clan&amp;tab=clanmembers">Members</a></li>
                        <li><a class="submenu-link" href="view.php?page=clan&amp;tab=diplomacy_alliance">Clan Alliances</a></li>
                        <li><a class="submenu-link" href="view.php?page=clan&amp;tab=diplomacy_war">Clan Wars</a></li>
                    <?php } else { ?>
                        <li><a class="submenu-link" href="view.php?page=clan&amp;tab=joinclan">Join Clan</a></li>
                        <li><a class="submenu-link" href="view.php?page=clan&amp;tab=createclan">Create Clan</a></li>
                    <?php } ?>
                </ul>
            </li>

            <li class="nav-item has-submenu<?php echo $navActiveClass($shopNavPages); ?><?php echo $shopExpanded ? ' is-expanded' : ''; ?>">
                <a class="nav-link" href="view.php?page=shop" aria-haspopup="true" aria-expanded="<?php echo $shopExpanded ? 'true' : 'false'; ?>">Shop</a>
                <button class="submenu-toggle" type="button" aria-expanded="<?php echo $shopExpanded ? 'true' : 'false'; ?>" aria-label="Toggle shop menu"><span class="submenu-toggle-icon" aria-hidden="true"></span></button>
                <ul class="submenu" aria-label="Shop menu">
                    <li><a class="submenu-link" href="view.php?page=shop&amp;tab=ship">Ships</a></li>
                    <li><a class="submenu-link" href="view.php?page=shop&amp;tab=designs">Ship Designs</a></li>
                    <li><a class="submenu-link" href="view.php?page=shop&amp;tab=items">Items</a></li>
                    <li><a class="submenu-link" href="view.php?page=shop&amp;tab=boosters">Boosters</a></li>
                </ul>
            </li>

            <li class="nav-item<?php echo $navActiveClass(['auction']); ?>">
                <a class="nav-link" href="view.php?page=auction">Auction</a>
            </li>

            <li class="nav-item<?php echo $navActiveClass(['lottery']); ?>">
                <a class="nav-link" href="view.php?page=lottery">Galaxy Gates</a>
            </li>

            <li class="nav-item cta">
                <a class="nav-link" href="spacemap_html5/spacemap.php" target="_blank" rel="noopener" data-mobile-play="1">Play</a>
            </li>

            <li class="nav-item<?php echo $navActiveClass(['skylab']); ?>">
                <a class="nav-link" href="view.php?page=skylab">Skylab</a>
            </li>

            <li class="nav-item<?php echo $navActiveClass(['rules']); ?>">
                <a class="nav-link" href="view.php?page=rules">Rules</a>
            </li>

            <li class="nav-item<?php echo $navActiveClass(['contact']); ?>">
                <a class="nav-link" href="view.php?page=contact">Contacts</a>
            </li>

            <li class="nav-item<?php echo $navActiveClass(['settings']); ?>">
                <a class="nav-link" href="view.php?page=settings">Settings</a>
            </li>

        </ul>
    </nav>

    <main class="app-main" id="main-content">
        <?php if ($displayPage !== 'home') { ?>
        <section class="pilot-strip" aria-label="Pilot summary">
            <div class="pilot-strip-shell">
                
                <div class="pilot-profile">
                    <img src="img/ranks/<?php echo $pilotGrade; ?>.png" alt="Grade" class="pilot-grade-icon" />
                    
                    <div class="pilot-name">
                        <?php if ($pilotClanLabel !== '') { ?>
                            <span class="pilot-clan"><?php echo $pilotClanLabel; ?></span>
                        <?php } ?>
                        <span><?php echo $pilotUsername; ?></span>
                    </div>

                    <img src="img/ranks/company/<?php echo $pilotFactionId; ?>.png" alt="Company" class="company-icon" />
                </div>

                <div class="pilot-stats">
                    <div class="stat-box">
                        <span class="stat-label">Credits</span>
                        <span class="stat-value credits" id="pilot-credits"><?php echo $pilotCredits; ?></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Uridium</span>
                        <span class="stat-value uridium" id="pilot-uridium"><?php echo $pilotUridium; ?></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Experience</span>
                        <span class="stat-value" id="pilot-xp"><?php echo $pilotExperience; ?></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Honor</span>
                        <span class="stat-value" id="pilot-honor"><?php echo $pilotHonor; ?></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Rank points</span>
                        <span class="stat-value" id="pilot-rankpoints"><?php echo $pilotRankpoints; ?></span>
                    </div>
                </div>

            </div>
        </section>
        <?php } ?>

        <div class="app-content">
            <?php echo $pageContent; ?>
        </div>
    </main>

    <footer class="app-footer">
        <p>&copy; <?php echo date('Y'); ?> Andromeda. All rights reserved.</p>
    </footer>
</div>
<?php } ?>

<?php
local_pied($mobileEmbed);
ob_end_flush();

function local_entete(bool $mobileEmbed = false)
{
    echo '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="utf-8" />',
        '<meta name="viewport" content="width=device-width, initial-scale=1" />',
        '<meta name="theme-color" content="#03111f" />',
        '<meta name="mobile-web-app-capable" content="yes" />',
        '<meta name="apple-mobile-web-app-capable" content="yes" />',
        '<meta name="apple-mobile-web-app-title" content="Andromeda" />',
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
        '<link rel="manifest" href="manifest.webmanifest" />',
        '<link rel="apple-touch-icon" href="img/apple-touch-icon.png" />',
        '<title>Andromeda</title>',
        '<link rel="stylesheet" type="text/css" href="styles/default.css" />',
        '<link rel="stylesheet" type="text/css" href="styles/mainStyles.css" />',
        '<link rel="stylesheet" type="text/css" href="styles/pilotBar.css?v=3" />',
        '<link rel="stylesheet" type="text/css" href="styles/auction.css?v=6" />',
        '<link rel="stylesheet" type="text/css" href="styles/quests.css?v=6" />',
        $mobileEmbed ? '<link rel="stylesheet" type="text/css" href="styles/mobile_embed.css?v=1" />' : '',
        '<style>',
        '@media (hover: hover) and (pointer: fine){',
        '  .nav-item.has-submenu{position:relative;}',
        '  .nav-item.has-submenu .submenu{display:none; position:absolute; top:100%; left:0; z-index:50;}',
        '  .nav-item.has-submenu:hover .submenu{display:block;}',
        '}',
        '</style>',
        '</head>',
        $mobileEmbed ? '<body class="mobile-embed">' : '<body>';
}

function local_pied(bool $mobileEmbed = false)
{
    if ($mobileEmbed) {
        echo '<script>',
        'document.addEventListener("click",function(e){',
        'const a=e.target.closest&&e.target.closest("a[href]");',
        'if(!a)return;',
        'try{const u=new URL(a.getAttribute("href"),window.location.href);',
        'if(u.pathname.endsWith("view.php")){u.searchParams.set("mobile_embed","1");a.setAttribute("href",u.pathname+u.search+u.hash);}}catch(_){}});',
        'document.querySelectorAll("form").forEach(function(f){',
        'if(!f.querySelector("input[name=mobile_embed]")){const i=document.createElement("input");i.type="hidden";i.name="mobile_embed";i.value="1";f.appendChild(i);}',
        '});',
        '</script>',
        '</body>',
        '</html>';
        return;
    }
    echo '<script>',
        'document.addEventListener("DOMContentLoaded",function(){',
        'const toggle=document.querySelector(".nav-toggle");',
        'const nav=document.getElementById("app-navigation");',
        'if(toggle&&nav){',
        'toggle.addEventListener("click",function(){',
        'const expanded=toggle.getAttribute("aria-expanded")==="true";',
        'toggle.setAttribute("aria-expanded",(!expanded).toString());',
        'nav.classList.toggle("is-open",!expanded);',
        '});',
        '}',

        'const items=[...document.querySelectorAll(".nav-item.has-submenu")];',
        'const isTouch=window.matchMedia("(hover: none), (pointer: coarse)").matches;',

        'if(isTouch){',
        'items.forEach(item=>{',
        'const btn=item.querySelector(".submenu-toggle");',
        'const link=item.querySelector(".nav-link");',

        'const doToggle=(e)=>{',
        'e.preventDefault();',
        'items.forEach(i=>{if(i!==item){i.classList.remove("is-expanded");}});',
        'item.classList.toggle("is-expanded");',
        'const expanded=item.classList.contains("is-expanded");',
        'if(btn) btn.setAttribute("aria-expanded",expanded.toString());',
        'if(link) link.setAttribute("aria-expanded",expanded.toString());',
        '};',

        'if(btn) btn.addEventListener("click",doToggle);',
        'if(link) link.addEventListener("click",function(e){',
        'if(!item.classList.contains("is-expanded")) doToggle(e);',
        '});',
        '});',

        'document.addEventListener("click",function(e){',
        'if(!e.target.closest(".nav-item.has-submenu")){',
        'items.forEach(i=>i.classList.remove("is-expanded"));',
        '}',
        '});',
        '}',
        'const play=document.querySelector("[data-mobile-play]");',
        'const standalone=!!(navigator.standalone||(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches));',
        'const mobile=standalone||(navigator.maxTouchPoints>0&&window.matchMedia&&window.matchMedia("(pointer: coarse)").matches);',
        'if(play&&mobile){',
        'play.addEventListener("click",function(e){',
        'e.preventDefault();',
        'window.location.href="spacemap_html5/spacemap.php?mobile=1";',
        '});',
        '}',
        '});',
        '</script>',
        '</body>',
        '</html>';
}
?>
