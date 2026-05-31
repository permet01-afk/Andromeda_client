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
            $req = $db->prepare('UPDATE users SET factionid=1, locx=2000, locy=1100, mapid=1 WHERE id=:id');
            break;
        case 2: 
            $req = $db->prepare('UPDATE users SET factionid=2, locx=18500, locy=1100, mapid=5 WHERE id=:id');
            break;
        case 3: 
            $req = $db->prepare('UPDATE users SET factionid=3, locx=19200, locy=11300, mapid=9 WHERE id=:id');
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
    <title>Select Faction • Andromeda</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#03111f" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Andromeda" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="manifest.webmanifest" />
    <link rel="apple-touch-icon" href="img/apple-touch-icon.png" />
    <style>
        :root {
            --bg-dark: #020407;
            --text-main: #e2e8f0;
            --text-muted: #94a3b8;
            
            /* Couleurs Factions */
            --mmo-color: #ef4444; /* Rouge */
            --eic-color: #3b82f6; /* Bleu */
            --vru-color: #22c55e; /* Vert */
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background-color: var(--bg-dark);
            background-image: radial-gradient(circle at center, #111827 0%, #000 100%);
            color: var(--text-main);
            font-family: "Segoe UI", "Roboto", sans-serif;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        /* Effet de grille en fond */
        body::before {
            content: "";
            position: absolute;
            width: 200%; height: 200%;
            background-image: 
                linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
            transform: perspective(500px) rotateX(60deg);
            z-index: -1;
            top: -50%;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
            z-index: 10;
        }

        .logo {
            /* TAILLE AUGMENTÉE ICI */
            height: 160px;
            margin-bottom: 1rem;
            filter: drop-shadow(0 0 20px rgba(94, 234, 212, 0.6));
        }

        h1 {
            font-size: 2rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 0.5rem;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        p { color: var(--text-muted); font-size: 1.1rem; }

        /* Grille des Factions */
        .faction-container {
            display: flex;
            gap: 2rem;
            padding: 0 2rem;
            z-index: 10;
            flex-wrap: wrap;
            justify-content: center;
        }

        .faction-card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid #1e293b;
            border-radius: 12px;
            width: 280px;
            padding: 2rem;
            text-align: center;
            text-decoration: none;
            color: #fff;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .faction-card img {
            width: 100%;
            height: 160px;
            object-fit: contain;
            margin-bottom: 1.5rem;
            filter: drop-shadow(0 10px 10px rgba(0,0,0,0.5));
            transition: transform 0.3s;
        }

        .faction-card h2 {
            font-size: 1.5rem;
            text-transform: uppercase;
            margin-bottom: 0.5rem;
            letter-spacing: 1px;
        }

        .faction-card span {
            display: block;
            font-size: 0.85rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 1rem;
            padding: 0.5rem;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 4px;
            transition: 0.3s;
        }

        /* --- STYLES SPÉCIFIQUES --- */
        
        /* MMO */
        .faction-card.mmo:hover {
            border-color: var(--mmo-color);
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.3);
            transform: translateY(-10px);
        }
        .faction-card.mmo:hover h2 { color: var(--mmo-color); }
        .faction-card.mmo:hover span { background: var(--mmo-color); color: #000; border-color: var(--mmo-color); }

        /* EIC */
        .faction-card.eic:hover {
            border-color: var(--eic-color);
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.3);
            transform: translateY(-10px);
        }
        .faction-card.eic:hover h2 { color: var(--eic-color); }
        .faction-card.eic:hover span { background: var(--eic-color); color: #fff; border-color: var(--eic-color); }

        /* VRU */
        .faction-card.vru:hover {
            border-color: var(--vru-color);
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.3);
            transform: translateY(-10px);
        }
        .faction-card.vru:hover h2 { color: var(--vru-color); }
        .faction-card.vru:hover span { background: var(--vru-color); color: #000; border-color: var(--vru-color); }

        .faction-card:hover img { transform: scale(1.1); }

    </style>
</head>
<body>

    <div class="header">
        <img src="img/logo.png" alt="Andromeda" class="logo">
        <h1>Welcome Pilot</h1>
        <p>Choose your allegiance to begin your journey.</p>
    </div>

    <div class="faction-container">
        
        <a href="company.php?factionid=1" class="faction-card mmo">
            <img src="img/mmo.jpg" alt="Mars Mining Operations">
            <h2>Mars</h2>
            <p style="font-size:0.8rem; margin-bottom:10px;">Mining Operations</p>
            <span>Select Faction</span>
        </a>

        <a href="company.php?factionid=2" class="faction-card eic">
            <img src="img/eic.jpg" alt="Earth Industries Corporation">
            <h2>Earth</h2>
            <p style="font-size:0.8rem; margin-bottom:10px;">Industries Corp.</p>
            <span>Select Faction</span>
        </a>

        <a href="company.php?factionid=3" class="faction-card vru">
            <img src="img/vru.jpg" alt="Venus Resources Unlimited">
            <h2>Venus</h2>
            <p style="font-size:0.8rem; margin-bottom:10px;">Resources Unlimited</p>
            <span>Select Faction</span>
        </a>

    </div>

</body>
</html>