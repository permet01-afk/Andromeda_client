<?php
session_start(); 


if(!isset($_SESSION['terms_of_use']) || $_SESSION['terms_of_use'] != true) {
    header('Location: index.php');
    exit();
}
if(!isset($_SESSION['loggedIn']) || $_SESSION['terms_of_use'] != true) {
    header('Location: login.php');
    exit();
}

include 'libs/database.php';
include 'config/database.php';

$db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);


$sth = $db->prepare("SELECT factionid FROM users WHERE id = :id LIMIT 1");
$sth->execute([':id' => $_SESSION['player_id']]);
$datauser = $sth->fetchAll();

if(isset($datauser[0]['factionid']) && $datauser[0]['factionid'] > 0) {
    header('Location: view.php');
    exit();
}


if(!empty($_GET['factionid'])) {
    $fid = (int)$_GET['factionid'];
    switch($fid) {
        case 1: 
            $req = $db->prepare('UPDATE users SET factionid=1, locx=2000, locy=1100, mapid=1 WHERE id=:id AND factionid=0 AND NOT EXISTS(SELECT 1 FROM player_ship_state s WHERE s.player_id=users.id AND s.status=\'DESTROYED\') AND NOT EXISTS(SELECT 1 FROM player_drone_state d WHERE d.player_id=users.id AND d.gameplay_token IS NOT NULL)');
            break;
        case 2: 
            $req = $db->prepare('UPDATE users SET factionid=2, locx=18500, locy=1100, mapid=5 WHERE id=:id AND factionid=0 AND NOT EXISTS(SELECT 1 FROM player_ship_state s WHERE s.player_id=users.id AND s.status=\'DESTROYED\') AND NOT EXISTS(SELECT 1 FROM player_drone_state d WHERE d.player_id=users.id AND d.gameplay_token IS NOT NULL)');
            break;
        case 3: 
            $req = $db->prepare('UPDATE users SET factionid=3, locx=19200, locy=11300, mapid=9 WHERE id=:id AND factionid=0 AND NOT EXISTS(SELECT 1 FROM player_ship_state s WHERE s.player_id=users.id AND s.status=\'DESTROYED\') AND NOT EXISTS(SELECT 1 FROM player_drone_state d WHERE d.player_id=users.id AND d.gameplay_token IS NOT NULL)');
            break;
        default:
            die('Invalid Company Selection');
    }
    
    if(isset($req)) {
        $req->execute([':id' => $_SESSION['player_id']]);
        header('Location: view.php');
        exit();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Choose Your Company • Andromeda Reborn</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#03111f">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Andromeda">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="manifest" href="manifest.webmanifest">
    <link rel="apple-touch-icon" href="img/apple-touch-icon.png">
    <link rel="stylesheet" href="/assets/historical/last-four-company.css?v=3">
</head>
<body class="historical-company-select">
    <header class="company-global-header">
        <nav aria-label="Public navigation"><a href="login.php">Sign in</a><a href="index.php" id="company-terms-open">Terms of Use</a></nav>
    </header>
    <main class="company-native-viewport" aria-label="Company selection">
        <div id="container_main" class="fliess10px-weiss" data-active-company="0">
            <div class="company-brand-slot"><a class="company-brand" href="login.php" aria-label="Andromeda home"><img src="/assets/historical/public-external/andromeda-reborn-wordmark-v1.png" width="620" height="207" alt="Andromeda Reborn"></a></div>
            <div id="headline">CHOOSE YOUR COMPANY</div>
            <section class="company-entry" aria-label="Mars Mining Operations">
                <div id="company_1" class="company-card" data-faction-id="1">
                    <div id="logo_1" class="company-logo" aria-hidden="true"></div>
                    <div id="text_1" class="faction_info">Mars Mining Operations mines the universe’s energy resources, putting profit first.<br><br>Stay focused and make your name among the pilots who serve Mars.</div>
                    <div id="button_1" class="font_choose"><a class="company-confirm" href="company.php?factionid=1" aria-label="Select Mars Mining Operations"><img src="/assets/historical/dops/global/companyChoose/seleccionar.png" width="100" height="29" alt="Select"></a></div>
                </div>
            </section>
            <section class="company-entry" aria-label="Earth Industries Corporation">
                <div id="company_2" class="company-card" data-faction-id="2">
                    <div id="logo_2" class="company-logo" aria-hidden="true"></div>
                    <div id="text_2" class="faction_info">Fly for Earth Industries Corporation as part of a strong community.<br><br>Your company grants privileges and expects you to fight for its goals. Work together and become a renowned space pilot.</div>
                    <div id="button_2" class="font_choose"><a class="company-confirm" href="company.php?factionid=2" aria-label="Select Earth Industries Corporation"><img src="/assets/historical/dops/global/companyChoose/seleccionar.png" width="100" height="29" alt="Select"></a></div>
                </div>
            </section>
            <section class="company-entry" aria-label="Venus Resources Unlimited">
                <div id="company_3" class="company-card" data-faction-id="3">
                    <div id="logo_3" class="company-logo" aria-hidden="true"></div>
                    <div id="text_3" class="faction_info">Venus Resources Unlimited looks after its people and protects the galaxy.<br><br>Work hard for your company and earn your place among its celebrated pilots.</div>
                    <div id="button_3" class="font_choose"><a class="company-confirm" href="company.php?factionid=3" aria-label="Select Venus Resources Unlimited"><img src="/assets/historical/dops/global/companyChoose/seleccionar.png" width="100" height="29" alt="Select"></a></div>
                </div>
            </section>
        </div>
    </main>
    <footer class="company-footer"><p>Andromeda — independent, non-profit project.</p><p>DarkOrbit is a registered trademark of Bigpoint. Andromeda is not affiliated with Bigpoint.</p></footer>
    <dialog id="company-terms-dialog" aria-label="Terms and policies"><div id="company-terms-content" tabindex="0"></div><button id="company-terms-close" type="button">Close</button></dialog>
    <script src="/assets/historical/public-legal-copy.js?v=1631579bf9549e0f" defer></script>
    <script src="/assets/historical/last-four-company.js?v=2" defer></script>
</body>
</html>
