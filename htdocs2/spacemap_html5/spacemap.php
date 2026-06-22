<?php
session_start();

// --- SÉCURITÉ & BDD (Identique à ton code) ---
if (!isset($_SESSION['terms_of_use']) || $_SESSION['terms_of_use'] != true) {
    header('Location: ../index.php');
    exit();
}
if (!isset($_SESSION['loggedIn']) || $_SESSION['loggedIn'] != true) {
    header('Location: ../login.php');
    exit();
}

include '../libs/database.php';
include '../config/database.php';

$db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);

$sth = $db->prepare("SELECT factionid FROM users WHERE id = :id LIMIT 1");
$sth->execute([':id' => $_SESSION['player_id']]);
$datauser = $sth->fetchAll();

if ($datauser[0]['factionid'] == 0) {
    header('Location: ../company.php');
    exit();
}

$sid = sha1(rand(1000, 9999));
$req = $db->prepare('UPDATE users SET AuthTicket = :sid WHERE id = :id');
$req->execute(['sid' => $sid, 'id'  => $_SESSION['player_id']]);

$returnvalue = $db->select('SELECT client_resolution FROM users_settings WHERE playerid = :account_id', ['account_id' => $_SESSION['player_id']]);
$string = $returnvalue[0]['client_resolution'];
$str = substr($string, 0, strlen($string) - 2);
$exploded = explode(',', $str);

$sth = $db->prepare("SELECT mapid FROM users WHERE id = :id LIMIT 1");
$sth->execute([':id' => $_SESSION['player_id']]);
$datauser = $sth->fetchAll();
$mapId = (int)$datauser[0]['mapid'];

/**
 * Récupère la liste des assets image à précharger en générant toutes les séquences numériques.
 * On parcourt récursivement les dossiers d'assets front (graphics, assets) et on reconstruit
 * les URLs pour chaque frame (ex : 1.png à N.png) afin de précharger toutes les rotations/animations.
 */
function buildImagePreloadList(): array
{
    $allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

    // Chaque entrée associe un dossier disque à son préfixe web depuis spacemap.php.
    $directoriesToScan = [
        ['path' => __DIR__ . '/graphics',                     'prefix' => 'graphics'],
        ['path' => __DIR__ . '/assets',                       'prefix' => 'assets'],
        ['path' => realpath(__DIR__ . '/../spacemap/graphics'), 'prefix' => '../spacemap/graphics'],
        ['path' => realpath(__DIR__ . '/../spacemap/assets'),   'prefix' => '../spacemap/assets']
    ];

    $assets = [];
    $sequenceBuckets = [];

    foreach ($directoriesToScan as $entry) {
        $directory = $entry['path'];
        $webPrefix = $entry['prefix'];

        if (!$directory || !is_dir($directory)) {
            continue;
        }

        $cleanDirectory = rtrim(str_replace('\\', '/', realpath($directory)), '/');
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $fileInfo) {
            /** @var SplFileInfo $fileInfo */
            if (!$fileInfo->isFile()) {
                continue;
            }

            $extension = strtolower($fileInfo->getExtension());
            if (!in_array($extension, $allowedExtensions, true)) {
                continue;
            }

            $absolutePath = $fileInfo->getRealPath();
            if (!$absolutePath) {
                continue;
            }

            $normalizedPath = str_replace('\\', '/', $absolutePath);
            $relativePathInsideRoot = ltrim(substr($normalizedPath, strlen($cleanDirectory)), '/');
            if ($relativePathInsideRoot === '') {
                continue;
            }

            $pathInfo = pathinfo($relativePathInsideRoot);
            $basename = $pathInfo['filename'] ?? '';
            $directoryName = $pathInfo['dirname'] ?? '';
            $webDirectory = $directoryName === '.' ? '' : trim($directoryName, '/');

            $webBase = rtrim($webPrefix, '/') . ($webDirectory !== '' ? '/' . $webDirectory . '/' : '/');
            $webPath = $webBase . $pathInfo['basename'];

            // Si le fichier suit une nomenclature numérique (1.png, 2.png...)
            // ou prefixée (ship_1.png, portal_02.png), on génère la séquence
            // complète pour charger toutes les frames et rotations.
            $matches = [];
            if (preg_match('/^(.*?)(\d+)$/', $basename, $matches)) {
                $namePrefix = $matches[1]; // "ship_" ou "portal_" ou '' si seulement des chiffres
                $numberPart = $matches[2]; // la partie numérique
                $padding = strlen($numberPart);
                $bucketKey = $webBase . '|' . $namePrefix . '|' . $extension . '|' . $padding;

                if (!isset($sequenceBuckets[$bucketKey])) {
                    $sequenceBuckets[$bucketKey] = [
                        'base'      => $webBase . $namePrefix,
                        'extension' => $extension,
                        'padding'   => $padding,
                        'numbers'   => []
                    ];
                }

                $sequenceBuckets[$bucketKey]['numbers'][] = (int) $numberPart;
            } else {
                $assets[] = $webPath;
            }
        }
    }

    foreach ($sequenceBuckets as $bucket) {
        if (empty($bucket['numbers'])) {
            continue;
        }

        // ⚠️ Important: on ne génère PAS un range min..max,
        // car certains numéros peuvent manquer (ex: 141, 142, 144...),
        // ce qui provoquerait des 404 inutiles dans la console.
        // On précharge uniquement les fichiers qui existent réellement.
        $numbers = array_values(array_unique($bucket['numbers']));
        sort($numbers, SORT_NUMERIC);

        foreach ($numbers as $i) {
            $formatted = str_pad((string) $i, $bucket['padding'], '0', STR_PAD_LEFT);
            $assets[] = $bucket['base'] . $formatted . '.' . $bucket['extension'];
        }
    }

    // Assets additionnels hors du dossier graphics/assets (fond du loader, etc.)
    $assets[] = '../img/andromeda_spacemap.jpg';

    return array_values(array_unique($assets));
}

$imagePreloadList = buildImagePreloadList();
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8" />
    <title>Andromeda HTML5 - Chargement...</title>
    
    <style>
        /* --- STYLE DU JEU ET DU LOADER --- */
        body {
            margin: 0;
            padding: 0;
            background: #000;
            overflow: hidden;
            font-family: Arial, sans-serif;
            user-select: none;
        }

        /* Conteneur du jeu (Caché au début) */
        #gameContainer {
            display: none; /* On ne le montre pas tant que "Start" n'est pas cliqué */
            margin: 0 auto;
            position: relative;
        }

        /* --- ÉCRAN DE CHARGEMENT (Overlay) --- */
        #loaderOverlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: url("../img/andromeda_spacemap.jpg") no-repeat center center;
            background-size: cover;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
        }

        /* La barre de progression (Conteneur) */
        .progress-box {
            width: 50%;
            max-width: 600px;
            height: 20px;
            border: 2px solid #00aaff;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.7);
            padding: 2px;
            margin-bottom: 20px;
            box-shadow: 0 0 15px rgba(0, 170, 255, 0.5);
        }

        /* La barre qui se remplit */
        #progressBar {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #0055aa, #00aaff);
            transition: width 0.2s;
        }

        #loadingText {
            margin-bottom: 10px;
            font-size: 14px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        /* Bouton DÉMARRER (Caché au début) */
        #startBtn {
            display: none;
            padding: 15px 40px;
            font-size: 24px;
            font-weight: bold;
            color: #fff;
            background: linear-gradient(to bottom, #2ecc71, #27ae60);
            border: 2px solid #2ecc71;
            border-radius: 5px;
            cursor: pointer;
            text-transform: uppercase;
            box-shadow: 0 0 20px rgba(46, 204, 113, 0.6);
            transition: transform 0.1s, box-shadow 0.1s;
        }
        #startBtn:hover {
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(46, 204, 113, 0.9);
        }
        #startBtn:active {
            transform: scale(0.95);
        }
    </style>

    <script>
        // Configuration Andromeda (PHP -> JS)
        window.ANDROMEDA_CONFIG = {
            lang: "es",
            userID: <?php echo (int)$_SESSION['player_id']; ?>,
            factionId: "VRU", 
            sessionID: "<?php echo $sid; ?>",
            basePath: "../spacemap/",
            pid: 563,
            resolutionID: <?php echo (int)$exploded[0]; ?>,
            host: "127.0.0.1",     
            port: 8082,  // Port WebSocket du Proxy
            mapID: <?php echo $mapId; ?>,
            width: <?php echo (int)$exploded[1]; ?>,
            height: <?php echo (int)$exploded[2]; ?>
        };
    </script>
</head>

<body>

    <div id="loaderOverlay">
        <div id="loadingText">Initialisation des systèmes...</div>
        
        <div class="progress-box">
            <div id="progressBar"></div>
        </div>

        <button id="startBtn">DÉMARRER</button>
    </div>

    <div id="gameContainer">
        <canvas id="gameCanvas" 
                width="<?php echo (int)$exploded[1]; ?>" 
                height="<?php echo (int)$exploded[2]; ?>"
                style="background: #000;">
        </canvas>
    </div>

    <script>
        (function() {
            // Liste brute fournie par PHP
            const rawAssets = <?php echo json_encode($imagePreloadList); ?> || [];

            // Normalise en URL absolue (pour éviter les doublons et être sûr de viser la même ressource)
            const toAbsolute = (src) => {
                try { return new URL(src, window.location.href).href; } catch (e) { return src; }
            };

            // Dédupliquer par URL absolue
            const seen = new Set();
            const assetsToLoad = [];
            for (const src of rawAssets) {
                const abs = toAbsolute(src);
                if (!seen.has(abs)) {
                    seen.add(abs);
                    assetsToLoad.push({ src, abs });
                }
            }

            // On garde des références fortes aux images préchargées pour éviter qu'elles
            // soient libérées et pour limiter les clignotements au moment du 1er rendu.
            window.__ANDROMEDA_PRELOADED_IMAGES = window.__ANDROMEDA_PRELOADED_IMAGES || {};

            let loadedCount = 0;
            const totalAssets = assetsToLoad.length;
            const bar = document.getElementById('progressBar');
            const txt = document.getElementById('loadingText');
            const btn = document.getElementById('startBtn');
            const box = document.querySelector('.progress-box');

            btn.disabled = true;

            function renderProgress() {
                const percent = totalAssets > 0 ? Math.floor((loadedCount / totalAssets) * 100) : 100;
                bar.style.width = percent + "%";
                txt.innerText = `Chargement des assets : ${loadedCount}/${totalAssets} (${percent}%)`;
            }

            function markLoaded() {
                loadedCount++;
                renderProgress();

                if (loadedCount >= totalAssets) {
                    onLoadComplete();
                }
            }

            function onLoadComplete() {
                txt.innerText = "CONNEXION ÉTABLIE. PRÊT AU DÉCOLLAGE.";
                bar.style.width = "100%";

                // On cache la barre et on montre le bouton
                setTimeout(() => {
                    box.style.display = "none";
                    txt.style.display = "none"; // Optionnel
                    btn.style.display = "block";
                    btn.disabled = false;
                }, 500);
            }

            // Charge 1 image et attend aussi le decode() quand dispo (réduit les clignotements)
            function loadOne(item) {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.decoding = "async";

                    img.onload = () => {
                        const decodePromise = (img.decode ? img.decode().catch(() => {}) : Promise.resolve());
                        decodePromise.then(() => {
                            // Stockage sous clé absolue ET sous la clé d'origine
                            window.__ANDROMEDA_PRELOADED_IMAGES[item.abs] = img;
                            window.__ANDROMEDA_PRELOADED_IMAGES[item.src] = img;
                            resolve();
                        });
                    };

                    img.onerror = () => {
                        // On continue même si une image plante
                        resolve();
                    };

                    // On charge via URL absolue (cache + cohérence)
                    img.src = item.abs;
                });
            }

            // File d'attente avec limite de concurrence (plus stable que lancer 10'000 requêtes d'un coup)
            async function runQueue() {
                const MAX_CONCURRENT = 24;
                let index = 0;

                const worker = async () => {
                    while (true) {
                        const i = index++;
                        if (i >= assetsToLoad.length) break;
                        await loadOne(assetsToLoad[i]);
                        markLoaded();
                    }
                };

                const workerCount = Math.max(1, Math.min(MAX_CONCURRENT, assetsToLoad.length));
                const workers = [];
                for (let w = 0; w < workerCount; w++) {
                    workers.push(worker());
                }
                await Promise.all(workers);
            }

            renderProgress();

            // Lancer le chargement des images
            if (totalAssets === 0) {
                onLoadComplete(); // Rien à charger
            } else {
                runQueue();
            }

            // Gestion du clic sur DÉMARRER
            btn.addEventListener('click', function() {
                if (btn.disabled) return;

                // 1. Cacher l'écran de chargement
                document.getElementById('loaderOverlay').style.display = 'none';

                // 2. Afficher le jeu
                document.getElementById('gameContainer').style.display = 'block';

                // 3. Lancer le VRAI démarrage du jeu
                // C'est ici qu'on appelle la fonction qui est dans client_bootstrap.js
                if (typeof initGame === 'function') {
                    initGame();
                } else {
                    console.log("Le jeu démarre...");
                    // Si tes scripts se lancent tout seuls, c'est bon.
                    // Sinon, il faudra envelopper ton bootstrap dans une fonction initGame().
                }
            });

        })();
    </script>

    <script src="client_config.js"></script>
    <script src="client_network.js"></script>
    <script src="client_entities.js"></script>
    <script src="client_combat.js"></script>
    <script src="client_graphics.js"></script>
    <script src="client_ui.js"></script>
    
    <script src="client_bootstrap.js"></script>

</body>
</html>