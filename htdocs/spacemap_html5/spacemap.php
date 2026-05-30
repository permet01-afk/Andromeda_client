<?php
session_start(); header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0"); header("Pragma: no-cache"); header("Expires: 0"); if (!isset($_SESSION['terms_of_use']) || $_SESSION['terms_of_use'] != true) { header('Location: ../index.php'); exit(); } if (!isset($_SESSION['loggedIn']) || $_SESSION['loggedIn'] != true) { header('Location: ../login.php'); exit(); } include '../libs/database.php'; include '../config/database.php'; $db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS); $sth = $db->prepare("SELECT factionid FROM users WHERE id = :id LIMIT 1"); $sth->execute([':id' => $_SESSION['player_id']]); $datauser = $sth->fetchAll(); if ($datauser[0]['factionid'] == 0) { header('Location: ../company.php'); exit(); } $userId = isset($_SESSION['player_id']) ? (int)$_SESSION['player_id'] : 0; if ($userId <= 0) { http_response_code(403); die("Missing player_id in session."); } $issueFreshTicket = static function (Database $db, int $playerId): string { $freshTicket = bin2hex(random_bytes(16)); $req = $db->prepare('UPDATE users SET AuthTicket = :sid WHERE id = :id LIMIT 1'); $req->execute([':sid' => $freshTicket, ':id' => $playerId]); return $freshTicket; }; if (isset($_GET['issue_ticket']) && $_GET['issue_ticket'] === '1') { header('Content-Type: application/json; charset=utf-8'); $freshTicket = $issueFreshTicket($db, $userId); echo json_encode(['ok' => true, 'sessionID' => $freshTicket], JSON_UNESCAPED_SLASHES); exit(); } $sid = ''; $returnvalue = $db->select('SELECT client_resolution FROM users_settings WHERE playerid = :account_id', ['account_id' => $_SESSION['player_id']]); $string = $returnvalue[0]['client_resolution']; $str = substr($string, 0, strlen($string) - 2); $exploded = explode(',', $str); $sth = $db->prepare("SELECT mapid FROM users WHERE id = :id LIMIT 1"); $sth->execute([':id' => $_SESSION['player_id']]); $datauser = $sth->fetchAll(); $mapId = (int)$datauser[0]['mapid']; $PRELOAD_MODE = "all"; function loadImageAtlasManifestFile(string $manifestRelativePath): array { $manifestPath = __DIR__ . '/' . ltrim($manifestRelativePath, '/'); if (!is_file($manifestPath)) { return []; } $rawManifest = @file_get_contents($manifestPath); if ($rawManifest === false || $rawManifest === '') { return []; } $decodedManifest = json_decode($rawManifest, true); if (!is_array($decodedManifest)) { return []; } $atlasPath = isset($decodedManifest['atlasPath']) && is_string($decodedManifest['atlasPath']) ? ltrim($decodedManifest['atlasPath'], '/') : ''; $frames = []; if (!empty($decodedManifest['frames']) && is_array($decodedManifest['frames'])) { foreach ($decodedManifest['frames'] as $framePath => $frameMeta) { if (!is_string($framePath) || !is_array($frameMeta)) { continue; } $x = isset($frameMeta['x']) ? (int)$frameMeta['x'] : null; $y = isset($frameMeta['y']) ? (int)$frameMeta['y'] : null; $w = isset($frameMeta['w']) ? (int)$frameMeta['w'] : null; $h = isset($frameMeta['h']) ? (int)$frameMeta['h'] : null; if ($x === null || $y === null || $w === null || $h === null || $x < 0 || $y < 0 || $w <= 0 || $h <= 0) { continue; } $frames[ltrim($framePath, '/')] = ['x' => $x, 'y' => $y, 'w' => $w, 'h' => $h]; } } if ($atlasPath === '' || empty($frames)) { return []; } return ['version' => isset($decodedManifest['version']) ? (int)$decodedManifest['version'] : 1, 'atlasPath' => $atlasPath, 'frames' => $frames, 'sourcePaths' => array_keys($frames)]; } function loadUiImageAtlasManifest(): array { static $manifestCache = null; if ($manifestCache !== null) { return $manifestCache; } $manifestCache = loadImageAtlasManifestFile('graphics/ui/ui/images/ui_images_atlas_v1.json'); return $manifestCache; } function loadActionMenuImageAtlasManifest(): array { static $manifestCache = null; if ($manifestCache !== null) { return $manifestCache; } $manifestCache = loadImageAtlasManifestFile('graphics/ui/actionMenu/images/actionmenu_images_atlas_v1.json'); return $manifestCache; } function loadSpacemapImageAtlasManifest(): array { static $manifestCache = null; if ($manifestCache !== null) { return $manifestCache; } $manifestCache = loadImageAtlasManifestFile('graphics/ui/spacemap/images/spacemap_images_atlas_v1.json'); return $manifestCache; } function loadIconsImageAtlasManifest(): array { static $manifestCache = null; if ($manifestCache !== null) { return $manifestCache; } $manifestCache = loadImageAtlasManifestFile('graphics/ui/icons/images/icons_images_atlas_v1.json'); return $manifestCache; } function loadMinimapImageAtlasManifest(): array { static $manifestCache = null; if ($manifestCache !== null) { return $manifestCache; } $manifestCache = loadImageAtlasManifestFile('graphics/ui/minimap/minimap_atlas_v1.json'); return $manifestCache; } function loadRefinementImageAtlasManifest(): array { static $manifestCache = null; if ($manifestCache !== null) { return $manifestCache; } $manifestCache = loadImageAtlasManifestFile('graphics/ui/refinement/images/refinement_images_atlas_v1.json'); return $manifestCache; } function loadShipFolderAtlasManifests(): array { static $manifestCache = null; if ($manifestCache !== null) { return $manifestCache; } $manifestPaths = ['graphics/ships/64/ship_atlas_v1.json', 'graphics/ships/65/ship_atlas_v1.json', 'graphics/ships/66/ship_atlas_v1.json', 'graphics/ships/67/ship_atlas_v1.json']; $manifestCache = []; foreach ($manifestPaths as $manifestPath) { $manifest = loadImageAtlasManifestFile($manifestPath); if (empty($manifest)) { continue; } $manifest['basePath'] = rtrim(str_replace('\\', '/', dirname($manifestPath)), '/') . '/'; $manifestCache[] = $manifest; } return $manifestCache; } function loadShipFolderAtlasConfigs(): array { static $configCache = null; if ($configCache !== null) { return $configCache; } $defs = [ [ 'atlasPath' => 'graphics/ships/1/ship_atlas_v1.png', 'basePath' => 'graphics/ships/1/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/3/ship_atlas_v1.png', 'basePath' => 'graphics/ships/3/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/4/ship_atlas_v1.png', 'basePath' => 'graphics/ships/4/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/5/ship_atlas_v1.png', 'basePath' => 'graphics/ships/5/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/6/ship_atlas_v1.png', 'basePath' => 'graphics/ships/6/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/7/ship_atlas_v1.png', 'basePath' => 'graphics/ships/7/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/8/ship_atlas_v1.png', 'basePath' => 'graphics/ships/8/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/9/ship_atlas_v1.png', 'basePath' => 'graphics/ships/9/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/10/ship_atlas_v1.png', 'basePath' => 'graphics/ships/10/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/17/ship_atlas_v1.png', 'basePath' => 'graphics/ships/17/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/56/ship_atlas_v1.png', 'basePath' => 'graphics/ships/56/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/58/ship_atlas_v1.png', 'basePath' => 'graphics/ships/58/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/59/ship_atlas_v1.png', 'basePath' => 'graphics/ships/59/', 'frameCount' => 32 ], [ 'atlasPath' => 'graphics/ships/63/ship_atlas_v1.png', 'basePath' => 'graphics/ships/63/', 'frameCount' => 32 ] ]; $configCache = []; foreach ($defs as $def) { $atlasPath = isset($def['atlasPath']) ? ltrim((string) $def['atlasPath'], '/') : ''; $basePath = isset($def['basePath']) ? rtrim(ltrim((string) $def['basePath'], '/'), '/') . '/' : ''; $frameCount = isset($def['frameCount']) ? (int) $def['frameCount'] : 0; if ($atlasPath === '' || $basePath === '' || $frameCount <= 0) { continue; } $sourcePaths = []; for ($i = 1; $i <= $frameCount; $i++) { $sourcePaths[] = $basePath . $i . '.png'; } $configCache[] = [ 'atlasPath' => $atlasPath, 'sourcePaths' => $sourcePaths ]; } foreach (loadShipFolderAtlasManifests() as $manifest) { if (!empty($manifest['atlasPath']) && !empty($manifest['sourcePaths'])) { $configCache[] = ['atlasPath' => $manifest['atlasPath'], 'sourcePaths' => $manifest['sourcePaths']]; } } return $configCache; } function loadExpansionFolderAtlasManifests(): array { static $manifestCache = null; if ($manifestCache !== null) { return $manifestCache; } $manifestPaths = ['graphics/expansions/ship10_Emax/expansion_atlas_v1.json', 'graphics/expansions/ship63_Emax/expansion_atlas_v1.json', 'graphics/expansions/ship64_Emax/expansion_atlas_v1.json', 'graphics/expansions/ship65_Emax/expansion_atlas_v1.json', 'graphics/expansions/ship66_Emax/expansion_atlas_v1.json', 'graphics/expansions/ship67_Emax/expansion_atlas_v1.json']; $manifestCache = []; foreach ($manifestPaths as $manifestPath) { $manifest = loadImageAtlasManifestFile($manifestPath); if (empty($manifest)) { continue; } $manifest['basePath'] = rtrim(str_replace('\\', '/', dirname($manifestPath)), '/') . '/'; $manifestCache[] = $manifest; } return $manifestCache; } function loadPyroRocketAtlasConfigs(): array { static $configCache = null; if ($configCache !== null) { return $configCache; } $defs = [ [ 'atlasPath' => 'graphics/atlas/pyro_rocketDamage0_v1.png', 'basePath' => 'graphics/pyroEffects/rocketDamage0/', 'frameCount' => 11 ], [ 'atlasPath' => 'graphics/atlas/pyro_rocketDamage1_v1.png', 'basePath' => 'graphics/pyroEffects/rocketDamage1/', 'frameCount' => 31 ], [ 'atlasPath' => 'graphics/atlas/pyro_rocketDamage2_v1.png', 'basePath' => 'graphics/pyroEffects/rocketDamage2/', 'frameCount' => 19 ] ]; $configCache = []; foreach ($defs as $def) { $atlasPath = isset($def['atlasPath']) ? ltrim((string) $def['atlasPath'], '/') : ''; $basePath = isset($def['basePath']) ? rtrim(ltrim((string) $def['basePath'], '/'), '/') . '/' : ''; $frameCount = isset($def['frameCount']) ? (int) $def['frameCount'] : 0; if ($atlasPath === '' || $basePath === '' || $frameCount <= 0) { continue; } $sourcePaths = []; for ($i = 1; $i <= $frameCount; $i++) { $sourcePaths[] = $basePath . $i . '.png'; } $configCache[] = [ 'atlasPath' => $atlasPath, 'sourcePaths' => $sourcePaths ]; } return $configCache; } function loadShieldEffectAtlasManifests(): array { static $manifestCache = null; if ($manifestCache !== null) { return $manifestCache; } $manifestPaths = ['graphics/shields/solace-effect/manifest.json', 'graphics/shields/diminisher-effect/manifest.json', 'graphics/shields/spectrum-effect/manifest.json', 'graphics/shields/sentinel-effect/manifest.json', 'graphics/shields/venom-effect/manifest.json', 'graphics/shields/ela0/manifest.json']; $manifestCache = []; foreach ($manifestPaths as $manifestPath) { $manifest = loadImageAtlasManifestFile($manifestPath); if (empty($manifest)) { continue; } $manifest['basePath'] = rtrim(str_replace('\\', '/', dirname($manifestPath)), '/') . '/'; $manifestCache[] = $manifest; } return $manifestCache; } function ensureAtlasFiles(array $relativePaths): bool { foreach ($relativePaths as $relativePath) { $absolutePath = __DIR__ . '/' . ltrim($relativePath, '/'); if (!is_file($absolutePath) || filesize($absolutePath) <= 0) { return false; } } return true; } function buildImagePreloadList(string $mode = "ui"): array { $allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp']; $directoriesToScan = []; if ($mode === "all") { $directoriesToScan = [ ['path' => __DIR__ . '/graphics', 'prefix' => 'graphics'], ['path' => __DIR__ . '/assets', 'prefix' => 'assets'], ['path' => realpath(__DIR__ . '/../spacemap/graphics'), 'prefix' => '../spacemap/graphics'], ['path' => realpath(__DIR__ . '/../spacemap/assets'), 'prefix' => '../spacemap/assets'] ]; } elseif ($mode === "ui") { $directoriesToScan = [ ['path' => __DIR__ . '/graphics/ui', 'prefix' => 'graphics/ui'], ['path' => __DIR__ . '/graphics/assets', 'prefix' => 'graphics/assets'] ]; } elseif ($mode === "core") { $directoriesToScan = [ ['path' => __DIR__ . '/graphics/ui/actionMenu', 'prefix' => 'graphics/ui/actionMenu'], ['path' => __DIR__ . '/graphics/ui/minimap', 'prefix' => 'graphics/ui/minimap'], ['path' => __DIR__ . '/graphics/ui/window1', 'prefix' => 'graphics/ui/window1'], ['path' => __DIR__ . '/graphics/ui/icons', 'prefix' => 'graphics/ui/icons'], ['path' => __DIR__ . '/graphics/ui/refinement', 'prefix' => 'graphics/ui/refinement'], ['path' => __DIR__ . '/graphics/ui/techs', 'prefix' => 'graphics/ui/techs'], ['path' => __DIR__ . '/graphics/assets', 'prefix' => 'graphics/assets'] ]; } else { $directoriesToScan = []; } $assets = []; $shipFolderAtlasConfigs = loadShipFolderAtlasConfigs(); $expansionFolderAtlasManifests = loadExpansionFolderAtlasManifests(); $pyroRocketAtlasConfigs = loadPyroRocketAtlasConfigs(); $shieldEffectAtlasManifests = loadShieldEffectAtlasManifests(); $atlasSourceConfigs = array_merge([loadUiImageAtlasManifest(), loadActionMenuImageAtlasManifest(), loadSpacemapImageAtlasManifest(), loadIconsImageAtlasManifest(), loadMinimapImageAtlasManifest(), loadRefinementImageAtlasManifest()], $shipFolderAtlasConfigs, $expansionFolderAtlasManifests, $pyroRocketAtlasConfigs, $shieldEffectAtlasManifests); $uiImageAtlasExcluded = []; foreach (['graphics/atlas/insta_shield_v2_light.png', 'graphics/atlas/pyro_smartbomb1_v1_a.png'] as $obsoleteAtlasPath) { $uiImageAtlasExcluded[$obsoleteAtlasPath] = true; } foreach ($atlasSourceConfigs as $atlasManifest) { if (empty($atlasManifest['atlasPath']) || !ensureAtlasFiles([$atlasManifest['atlasPath']])) { continue; } foreach (($atlasManifest['sourcePaths'] ?? []) as $sourcePath) { if (is_string($sourcePath) && $sourcePath !== '') { $uiImageAtlasExcluded[ltrim($sourcePath, '/')] = true; } } } $atlasPreloadGroups = [ ['graphics/atlas/collectables_v1.png'], ['graphics/atlas/portal_jump_v1.png'], ['graphics/atlas/portals_standard_v1.png'], ['graphics/atlas/portals_galaxy1_v1.png'], ['graphics/atlas/portals_galaxy2_v1.png'], ['graphics/atlas/portals_galaxy3_v1.png'], ['graphics/atlas/portals_galaxy4_v1_a.png', 'graphics/atlas/portals_galaxy4_v1_b.png'], ['graphics/atlas/effects_levelup_collectorbeam_v1.png'], ['graphics/atlas/drones_v1.png'], ['graphics/atlas/ship_2_v1.png'], ['graphics/atlas/ship_20_v1.png'], ['graphics/atlas/ship_71_v1.png'], ['graphics/atlas/ship_72_v1.png'], ['graphics/atlas/ship_73_v1.png'], ['graphics/atlas/ship_74_v1.png'], ['graphics/atlas/ship_75_v1.png'], ['graphics/atlas/ship_76_v1.png'], ['graphics/atlas/ship_77_v1.png'], ['graphics/atlas/ship_81_v1.png'], ['graphics/atlas/ship_85_v1.png'], ['graphics/atlas/ship_443_v1.png'], ['graphics/atlas/insta_shield_flash_v1_a.png', 'graphics/atlas/insta_shield_flash_v1_b.png'], ['graphics/atlas/invincibility_shield_v1.png'], ['graphics/atlas/shield0_v1.png'], ['graphics/atlas/shield1_v1.png'], ['graphics/atlas/shield_damage_v1.png'], ['graphics/atlas/repair_robot_v1.png'], ['graphics/atlas/battle_repair_robot_v1.png'], ['graphics/atlas/lasers_static_v1.png'], ['graphics/atlas/lasers_crystal1_v1.png'], ['graphics/atlas/lasers_crystal2_v1.png'], ['graphics/atlas/lasers_devolarium_v1.png'], ['graphics/atlas/lasers_lordakium_v1.png'], ['graphics/atlas/expansion_ship1_emax_v1.png'], ['graphics/atlas/expansion_ship3_emax_v1.png'], ['graphics/atlas/expansion_ship4_emax_v1.png'], ['graphics/atlas/expansion_ship5_emax_v1.png'], ['graphics/atlas/expansion_ship6_emax_v1.png'], ['graphics/atlas/expansion_ship7_emax_v1.png'], ['graphics/atlas/expansion_ship8_emax_v1.png'], ['graphics/atlas/expansion_ship9_emax_v1.png'], ['graphics/atlas/pyro_smartbomb1_flash_v1_a.png', 'graphics/atlas/pyro_smartbomb1_flash_v1_b.png', 'graphics/atlas/pyro_smartbomb1_flash_v1_c.png'], ['graphics/atlas/pyro_explosion0_v1.png'], ['graphics/atlas/pyro_explosion1_v1.png'], ['graphics/atlas/pyro_explosion2_v1.png'], ['graphics/atlas/pyro_explosion3_v1.png'], ['graphics/atlas/pyro_explosion4_v1.png'], ['graphics/atlas/pyro_explosion5_v1.png'], ['graphics/atlas/pyro_laserDamage0_v1.png'], ['graphics/atlas/pyro_laserDamage1_v1.png'], ['graphics/atlas/pyro_laserDamage2_v1.png'], ['graphics/atlas/pyro_rocketDamage0_v1.png'], ['graphics/atlas/pyro_rocketDamage1_v1.png'], ['graphics/atlas/pyro_rocketDamage2_v1.png'], ['graphics/atlas/pyro_shockwaves_v1.png'], ['graphics/ui/minimap/minimap_atlas_v1.png'], ['graphics/ui/refinement/images/refinement_images_atlas_v1.png'], ]; foreach ($shipFolderAtlasConfigs as $shipAtlasConfig) { if (!empty($shipAtlasConfig['atlasPath'])) { $atlasPreloadGroups[] = [$shipAtlasConfig['atlasPath']]; } } foreach ($expansionFolderAtlasManifests as $expansionAtlasManifest) { if (!empty($expansionAtlasManifest['atlasPath'])) { $atlasPreloadGroups[] = [$expansionAtlasManifest['atlasPath']]; } } if ($mode !== 'none') { foreach ($atlasPreloadGroups as $atlasPaths) { if (ensureAtlasFiles($atlasPaths)) { foreach ($atlasPaths as $atlasPath) { $assets[] = $atlasPath; } } } } $sequenceBuckets = []; foreach ($directoriesToScan as $entry) { $directory = $entry['path']; $webPrefix = $entry['prefix']; if (!$directory || !is_dir($directory)) { continue; } $cleanDirectory = rtrim(str_replace('\\', '/', realpath($directory)), '/'); $iterator = new RecursiveIteratorIterator( new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS) ); foreach ($iterator as $fileInfo) { if (!$fileInfo->isFile()) { continue; } $extension = strtolower($fileInfo->getExtension()); if (!in_array($extension, $allowedExtensions, true)) { continue; } $absolutePath = $fileInfo->getRealPath(); if (!$absolutePath) { continue; } $normalizedPath = str_replace('\\', '/', $absolutePath); $relativePathInsideRoot = ltrim(substr($normalizedPath, strlen($cleanDirectory)), '/'); if ($relativePathInsideRoot === '') { continue; } $pathInfo = pathinfo($relativePathInsideRoot); $basename = $pathInfo['filename'] ?? ''; $directoryName = $pathInfo['dirname'] ?? ''; $webDirectory = $directoryName === '.' ? '' : trim($directoryName, '/'); $webBase = rtrim($webPrefix, '/') . ($webDirectory !== '' ? '/' . $webDirectory . '/' : '/'); $webPath = $webBase . $pathInfo['basename']; if (isset($uiImageAtlasExcluded[$webPath])) { continue; } $matches = []; if (preg_match('/^(.*?)(\d+)$/', $basename, $matches)) { $namePrefix = $matches[1]; $numberPart = $matches[2]; $padding = strlen($numberPart); $bucketKey = $webBase . '|' . $namePrefix . '|' . $extension . '|' . $padding; if (!isset($sequenceBuckets[$bucketKey])) { $sequenceBuckets[$bucketKey] = [ 'base' => $webBase . $namePrefix, 'extension' => $extension, 'padding' => $padding, 'numbers' => [] ]; } $sequenceBuckets[$bucketKey]['numbers'][] = (int) $numberPart; } else { $assets[] = $webPath; } } } foreach ($sequenceBuckets as $bucket) { if (empty($bucket['numbers'])) { continue; } $numbers = array_values(array_unique($bucket['numbers'])); sort($numbers, SORT_NUMERIC); foreach ($numbers as $i) { $formatted = str_pad((string) $i, $bucket['padding'], '0', STR_PAD_LEFT); $assets[] = $bucket['base'] . $formatted . '.' . $bucket['extension']; } } $assets[] = '../img/andromeda_spacemap.jpg'; return array_values(array_unique($assets)); } $imagePreloadList = buildImagePreloadList($PRELOAD_MODE);
function buildAudioAssetManifest(string $audioRoot): array {
    $manifest = [
        'sfx' => [],
        'music' => []
    ];
    $soundsRoot = $audioRoot . '/sounds';
    if (is_dir($soundsRoot)) {
        $soundBanks = scandir($soundsRoot);
        foreach ($soundBanks as $bank) {
            if ($bank === '.' || $bank === '..') {
                continue;
            }
            $bankPath = $soundsRoot . '/' . $bank;
            if (!is_dir($bankPath)) {
                continue;
            }
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($bankPath, FilesystemIterator::SKIP_DOTS)
            );
            foreach ($iterator as $fileInfo) {
                if (!$fileInfo->isFile()) {
                    continue;
                }
                if (strtolower($fileInfo->getExtension()) !== 'mp3') {
                    continue;
                }
                $relative = str_replace('\\', '/', substr($fileInfo->getPathname(), strlen($bankPath) + 1));
                $relative = preg_replace('/\.mp3$/i', '', $relative);
                $relative = ltrim((string)$relative, '/');
                if ($relative === '') {
                    continue;
                }
                $manifest['sfx'][] = $bank . '/' . $relative;
            }
        }
    }
    $musicRoot = $audioRoot . '/music';
    if (is_dir($musicRoot)) {
        $tracks = scandir($musicRoot);
        foreach ($tracks as $track) {
            if ($track === '.' || $track === '..') {
                continue;
            }
            $trackPath = $musicRoot . '/' . $track . '/track.mp3';
            if (is_file($trackPath) && filesize($trackPath) > 0) {
                $manifest['music'][] = $track;
            }
        }
    }
    $manifest['sfx'] = array_values(array_unique($manifest['sfx']));
    sort($manifest['sfx'], SORT_STRING);
    $manifest['music'] = array_values(array_unique($manifest['music']));
    sort($manifest['music'], SORT_STRING);
    return $manifest;
}
$audioAssetManifest = buildAudioAssetManifest(__DIR__ . '/audio'); ?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Andromeda HTML5 - Loading...</title>
    <link rel="preload" href="fonts/1_FontClass_10dfaeaf12a1_font1_net.bigpoint.darkorbit.Main_fontEurostileHeaFl_EurostileHeaFl.ttf" as="font" type="font/ttf" crossorigin="anonymous">
    <link rel="preload" href="fonts/2_FontClass_10dfaeaf12a1_font0_net.bigpoint.darkorbit.Main_fontEurostileFl_EurostileFl.ttf" as="font" type="font/ttf" crossorigin="anonymous">
    
    <style>
        @font-face {
            font-family: "EurostileHeaFl";
            src: url("fonts/1_FontClass_10dfaeaf12a1_font1_net.bigpoint.darkorbit.Main_fontEurostileHeaFl_EurostileHeaFl.ttf") format("truetype");
            font-style: normal;
            font-weight: 400;
            font-display: block;
        }

        @font-face {
            font-family: "EurostileFl";
            src: url("fonts/2_FontClass_10dfaeaf12a1_font0_net.bigpoint.darkorbit.Main_fontEurostileFl_EurostileFl.ttf") format("truetype");
            font-style: normal;
            font-weight: 400;
            font-display: block;
        }
        body {
            margin: 0;
            padding: 0;
            background: #000;
            overflow: hidden;
            font-family: Arial, sans-serif;
            user-select: none;
        }

        #gameContainer {
            display: none; 
            margin: 0 auto;
            position: relative;
        }

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

        .progress-box {
            width: 50%;
            max-width: 600px;
            height: 20px;
            border: 2px solid #00aaff;
            background: rgba(0, 0, 0, 0.7);
            padding: 2px;
            margin-bottom: 20px;
            box-shadow: 0 0 15px rgba(0, 170, 255, 0.5);
        }

        #progressBar {
            width: 0%;
            height: 100%;
            background: #00aaff;
            transition: width 0.2s;
        }

        #loadingText {
            margin-bottom: 10px;
            font-size: 14px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        #startBtn {
            display: none;
            padding: 15px 40px;
            font-size: 24px;
            font-weight: bold;
            color: #fff;
            background: #2ecc71;
            border: 2px solid #2ecc71;
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
        window.ANDROMEDA_CONFIG = {
            patchVersion: "v5f",
            lang: "en",
            userID: <?php echo (int)$userId; ?>,
            factionId: "VRU", 
            sessionID: "<?php echo $sid; ?>",
            basePath: "../spacemap/",
            pid: 563,
            resolutionID: <?php echo (int)$exploded[0]; ?>,
            host: window.location.hostname,    
            port: 8082,  
            wsPath: "/ws/",
            mapID: <?php echo $mapId; ?>,
            width: <?php echo (int)$exploded[1]; ?>,
            height: <?php echo (int)$exploded[2]; ?>
        };
    </script>
</head>

<body>

    <div id="loaderOverlay">
        <div id="loadingText">Initializing systems...</div>
        
        <div class="progress-box">
            <div id="progressBar"></div>
        </div>

        <button id="startBtn">START</button>
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
            const rawAssets = <?php echo json_encode($imagePreloadList); ?> || [];

            const toAbsolute = (src) => {
                try { return new URL(src, window.location.href).href; } catch (e) { return src; }
            };

            const seen = new Set();
            const assetsToLoad = [];
            for (const src of rawAssets) {
                const abs = toAbsolute(src);
                if (!seen.has(abs)) {
                    seen.add(abs);
                    assetsToLoad.push({ src, abs });
                }
            }

            window.__ANDROMEDA_PRELOADED_IMAGES = window.__ANDROMEDA_PRELOADED_IMAGES || {};

            let loadedCount = 0;
            const totalAssets = assetsToLoad.length;
            const bar = document.getElementById('progressBar');
            const txt = document.getElementById('loadingText');
            const btn = document.getElementById('startBtn');
            const box = document.querySelector('.progress-box');

            let assetsReady = false;
            let finalizeStarted = false;
            let bootXmlReady = false;
            let bootXmlStarted = false;
            let bootXmlPromise = null;
            let audioReady = !!window.__ANDRO_AUDIO_BOOT_READY;
            let portalVisualReady = !!window.__ANDRO_PORTAL_RUNTIME_WARMUP_READY;
            let portalVisualStarted = false;
            let portalVisualStatus = window.__ANDRO_PORTAL_RUNTIME_WARMUP_STATUS || null;
            let visualRuntimeReady = !!window.__ANDRO_VISUAL_RUNTIME_WARMUP_READY;
            let visualRuntimeStarted = false;
            let visualRuntimeStatus = window.__ANDRO_VISUAL_RUNTIME_WARMUP_STATUS || null;

            let startClicked = false;

            window.__ANDRO_BOOT_XML_READY = false;
            window.__ANDRO_BOOT_XML_PROMISE = null;
            if (typeof window.__ANDRO_AUDIO_BOOT_READY !== 'boolean') {
                window.__ANDRO_AUDIO_BOOT_READY = false;
            }
            if (typeof window.__ANDRO_PORTAL_RUNTIME_WARMUP_READY !== 'boolean') {
                window.__ANDRO_PORTAL_RUNTIME_WARMUP_READY = false;
            }
            if (typeof window.__ANDRO_VISUAL_RUNTIME_WARMUP_READY !== 'boolean') {
                window.__ANDRO_VISUAL_RUNTIME_WARMUP_READY = false;
            }

            function getBootAudioStatus() {
                const status = window.__ANDRO_AUDIO_BOOT_STATUS;
                return status && typeof status === 'object' ? status : null;
            }

            function getPortalVisualStatus() {
                const status = portalVisualStatus || window.__ANDRO_PORTAL_RUNTIME_WARMUP_STATUS;
                return status && typeof status === 'object' ? status : null;
            }

            function getVisualRuntimeStatus() {
                const status = visualRuntimeStatus || window.__ANDRO_VISUAL_RUNTIME_WARMUP_STATUS;
                return status && typeof status === 'object' ? status : null;
            }

            function updatePortalVisualMessage() {
                const status = getPortalVisualStatus();
                if (status && status.total > 0) {
                    const completed = Math.max(0, Number(status.completed) || 0);
                    const total = Math.max(1, Number(status.total) || 1);
                    const percent = Math.max(0, Math.min(100, Math.floor((completed / total) * 100)));
                    bar.style.width = percent + "%";
                    const phase = status.phase === 'atlases' ? 'portal atlases' : 'portal frames';
                    txt.innerText = `Preparing ${phase}: ${completed}/${total} (${percent}%)`;
                    return;
                }
                bar.style.width = "100%";
                txt.innerText = portalVisualStarted ? "Preparing portal visuals..." : "Waiting for portal visual warmup...";
            }

            function updateVisualRuntimeMessage() {
                const status = getVisualRuntimeStatus();
                if (status && status.total > 0) {
                    const completed = Math.max(0, Number(status.completed) || 0);
                    const total = Math.max(1, Number(status.total) || 1);
                    const percent = Math.max(0, Math.min(100, Math.floor((completed / total) * 100)));
                    const shipTotal = Math.max(0, Number(status.shipFramesTotal) || 0);
                    const shipCompleted = Math.max(0, Math.min(shipTotal, Number(status.shipFramesCompleted) || 0));
                    const expansionTotal = Math.max(0, Number(status.shipExpansionFramesTotal) || 0);
                    const expansionCompleted = Math.max(0, Math.min(expansionTotal, Number(status.shipExpansionFramesCompleted) || 0));
                    bar.style.width = percent + "%";
                    if (shipTotal > 0 && shipCompleted < shipTotal) {
                        txt.innerText = `Preparing ship visuals: ${shipCompleted}/${shipTotal} (${percent}%)`;
                    } else if (expansionTotal > 0 && expansionCompleted < expansionTotal) {
                        txt.innerText = `Preparing ship expansions: ${expansionCompleted}/${expansionTotal} (${percent}%)`;
                    } else {
                        txt.innerText = `Preparing game visuals: ${completed}/${total} (${percent}%)`;
                    }
                    return;
                }
                bar.style.width = "100%";
                txt.innerText = visualRuntimeStarted ? "Preparing game visuals..." : "Waiting for game visual warmup...";
            }

            function updateStartState() {
                const ready = assetsReady && bootXmlReady && audioReady && portalVisualReady && visualRuntimeReady;
                const ok = ready && !startClicked;
                btn.disabled = !ok;
                btn.style.opacity = ok ? "1" : "0.6";
                btn.style.cursor = ok ? "pointer" : "not-allowed";
                if (!startClicked) {
                    box.style.display = ready ? "none" : "block";
                    btn.style.display = ready ? "block" : "none";
                }
            }

            function refreshStartMessage() {
                if (startClicked || !assetsReady) return;
                if (!portalVisualReady) {
                    updatePortalVisualMessage();
                    return;
                }
                if (!visualRuntimeReady) {
                    updateVisualRuntimeMessage();
                    return;
                }
                const audioStatus = getBootAudioStatus();
                if (!bootXmlReady || !audioReady) {
                    if (audioStatus && audioStatus.state === 'loading' && audioStatus.total > 0) {
                        const percent = Math.max(0, Math.min(100, Math.floor((audioStatus.completed / audioStatus.total) * 100)));
                        bar.style.width = percent + "%";
                        txt.innerText = `Preloading audio: ${audioStatus.completed}/${audioStatus.total} (${percent}%)`;
                        return;
                    }
                    bar.style.width = "100%";
                    txt.innerText = !bootXmlReady ? "Loading game data..." : "Preparing audio...";
                    return;
                }
                bar.style.width = "100%";
                txt.innerText = "Assets, audio and visuals ready. Click Start.";
            }

            function startBootXmlPreload() {
                if (bootXmlStarted) return bootXmlPromise;
                bootXmlStarted = true;

                bootXmlPromise = new Promise((resolve) => {
                    const tryStart = () => {
                        if (typeof window.bootLoadXmlConfigs !== "function") {
                            setTimeout(tryStart, 50);
                            return;
                        }

                        Promise.resolve(window.bootLoadXmlConfigs(window.ANDROMEDA_CONFIG || {})).then(
                            (result) => resolve(result === true),
                            (err) => {
                                console.warn('[BOOT] XML preload failed during loader:', err);
                                resolve(false);
                            }
                        );
                    };

                    tryStart();
                }).then((ok) => {
                    bootXmlReady = ok === true;
                    window.__ANDRO_BOOT_XML_READY = bootXmlReady;
                    audioReady = !!window.__ANDRO_AUDIO_BOOT_READY;
                    if (!bootXmlReady) {
                        bar.style.width = "100%";
                        txt.innerText = "Unable to load game data.";
                    } else {
                        refreshStartMessage();
                    }
                    updateStartState();
                    return bootXmlReady;
                });

                window.__ANDRO_BOOT_XML_PROMISE = bootXmlPromise;
                return bootXmlPromise;
            }

            window.addEventListener('andromeda:ws-startup-failed', function() {
                window.__ANDRO_NETWORK_STARTED = false;
            });

            btn.disabled = true;
            btn.style.display = 'none';

            window.addEventListener('andromeda:boot-audio-status', function(event) {
                const status = event && event.detail ? event.detail : getBootAudioStatus();
                audioReady = !!(status && status.ready);
                refreshStartMessage();
                updateStartState();
            });

            window.addEventListener('andromeda:portal-runtime-warmup-status', function(event) {
                portalVisualStatus = event && event.detail ? event.detail : getPortalVisualStatus();
                portalVisualReady = !!(portalVisualStatus && portalVisualStatus.ready);
                refreshStartMessage();
                updateStartState();
            });

            window.addEventListener('andromeda:visual-runtime-warmup-status', function(event) {
                visualRuntimeStatus = event && event.detail ? event.detail : getVisualRuntimeStatus();
                visualRuntimeReady = !!(visualRuntimeStatus && visualRuntimeStatus.ready);
                refreshStartMessage();
                updateStartState();
            });

            updateStartState();
            startBootXmlPreload();

            function renderProgress() {
                const percent = totalAssets > 0 ? Math.floor((loadedCount / totalAssets) * 100) : 100;
                bar.style.width = percent + "%";
                txt.innerText = `Loading assets: ${loadedCount}/${totalAssets} (${percent}%)`;
            }

            function markLoaded() {
                loadedCount++;
                renderProgress();

                if (loadedCount >= totalAssets) {
                    startFinalize();
                }
            }

            function startFinalize() {
                if (finalizeStarted) return;
                finalizeStarted = true;
                finalizeLoad();
            }

            function warmupTextures() {
                if (typeof requestAnimationFrame !== "function") return Promise.resolve();

                const c = document.createElement("canvas");
                c.width = 1;
                c.height = 1;
                const cctx = c.getContext("2d");
                if (!cctx) return Promise.resolve();

                const list = assetsToLoad; 
                let i = 0;

                return new Promise((resolve) => {
                    const step = () => {
                        const t0 = performance.now();
                        while (i < list.length && (performance.now() - t0) < 12) {
                            const it = list[i];
                            const img = window.__ANDROMEDA_PRELOADED_IMAGES[it.abs] || window.__ANDROMEDA_PRELOADED_IMAGES[it.src];
                            if (img && img.complete && img.width > 0 && img.height > 0) {
                                try { cctx.drawImage(img, 0, 0, 1, 1); } catch (e) {}
                            }
                            i++;
                        }

                        const percent = list.length > 0 ? Math.floor((i / list.length) * 100) : 100;
                        bar.style.width = percent + "%";
                        txt.innerText = `Finalizing textures: ${i}/${list.length} (${percent}%)`;

                        if (i < list.length) {
                            requestAnimationFrame(step);
                        } else {
                            resolve();
                        }
                    };
                    step();
                });
            }

            function waitForPortalWarmupFunction() {
                return new Promise((resolve) => {
                    const tryResolve = () => {
                        if (typeof window.warmPortalRuntimeVisualsBeforeStart === 'function') {
                            resolve(window.warmPortalRuntimeVisualsBeforeStart);
                            return;
                        }
                        setTimeout(tryResolve, 50);
                    };
                    tryResolve();
                });
            }

            function waitForVisualRuntimeWarmupFunction() {
                return new Promise((resolve) => {
                    const tryResolve = () => {
                        if (typeof window.warmCriticalBootRuntimeVisuals === 'function' && typeof window.warmShipSpriteVisualMetrics === 'function') {
                            resolve(window.warmCriticalBootRuntimeVisuals);
                            return;
                        }
                        setTimeout(tryResolve, 50);
                    };
                    tryResolve();
                });
            }

            async function warmupPortalRuntimeVisuals() {
                portalVisualStarted = true;
                portalVisualReady = !!window.__ANDRO_PORTAL_RUNTIME_WARMUP_READY;
                if (portalVisualReady) return true;

                bar.style.width = "0%";
                txt.innerText = "Preparing portal visuals...";
                updateStartState();

                const warmFn = await waitForPortalWarmupFunction();
                const status = await Promise.resolve(warmFn('loader-before-start-portals'));
                portalVisualStatus = status || getPortalVisualStatus();
                portalVisualReady = !!(portalVisualStatus && portalVisualStatus.ready);
                window.__ANDRO_PORTAL_RUNTIME_WARMUP_READY = portalVisualReady;

                if (!portalVisualReady) {
                    const failed = portalVisualStatus && Number.isFinite(Number(portalVisualStatus.failed)) ? Number(portalVisualStatus.failed) : 0;
                    bar.style.width = "100%";
                    txt.innerText = failed > 0 ? `Portal visual warmup failed: ${failed} item(s).` : "Portal visual warmup failed.";
                    return false;
                }
                return true;
            }

            async function warmupVisualRuntimeVisuals() {
                visualRuntimeStarted = true;
                visualRuntimeReady = !!window.__ANDRO_VISUAL_RUNTIME_WARMUP_READY;
                if (visualRuntimeReady) return true;

                bar.style.width = "0%";
                txt.innerText = "Preparing game visuals...";
                updateStartState();

                const warmFn = await waitForVisualRuntimeWarmupFunction();
                const status = await Promise.resolve(warmFn('loader-before-start'));
                visualRuntimeStatus = status || getVisualRuntimeStatus();
                visualRuntimeReady = !!(visualRuntimeStatus && visualRuntimeStatus.ready);
                window.__ANDRO_VISUAL_RUNTIME_WARMUP_READY = visualRuntimeReady;

                if (!visualRuntimeReady) {
                    const failed = visualRuntimeStatus && Number.isFinite(Number(visualRuntimeStatus.failed)) ? Number(visualRuntimeStatus.failed) : 0;
                    bar.style.width = "100%";
                    txt.innerText = failed > 0 ? `Game visual warmup failed: ${failed} item(s).` : "Game visual warmup failed.";
                    return false;
                }
                return true;
            }

            async function finalizeLoad() {
                try {
                    bar.style.width = "0%";
                    txt.innerText = "Finalizing textures...";
                    await warmupTextures();
                } catch (e) {
                }

                assetsReady = true;
                audioReady = !!window.__ANDRO_AUDIO_BOOT_READY;

                refreshStartMessage();
                updateStartState();

                try {
                    await warmupPortalRuntimeVisuals();
                } catch (e) {
                    portalVisualReady = false;
                    bar.style.width = "100%";
                    txt.innerText = "Portal visual warmup failed.";
                }

                if (portalVisualReady) {
                    try {
                        await warmupVisualRuntimeVisuals();
                    } catch (e) {
                        visualRuntimeReady = false;
                        bar.style.width = "100%";
                        txt.innerText = "Game visual warmup failed.";
                    }
                }

                refreshStartMessage();
                updateStartState();
            }

            function loadOne(item, attempt = 0) {
                const MAX_RETRIES = 1;      
                const RETRY_DELAY = 600;    

                return new Promise((resolve) => {
                    const img = new Image();
                    try { img.decoding = "async"; } catch (_) {}

                    img.onload = () => {
                        const decodePromise = (img.decode ? img.decode().catch(() => {}) : Promise.resolve());
                        decodePromise.then(() => {
                            window.__ANDROMEDA_PRELOADED_IMAGES[item.abs] = img;
                            window.__ANDROMEDA_PRELOADED_IMAGES[item.src] = img;
                            resolve();
                        });
                    };

                    img.onerror = () => {
                        if (attempt < MAX_RETRIES) {
                            const delay = RETRY_DELAY * (attempt + 1);
                            setTimeout(() => {
                                loadOne(item, attempt + 1).then(resolve);
                            }, delay);
                            return;
                        }
                        resolve();
                    };

                    img.src = item.abs;
                });
            }

            async function runQueue() {
                const MAX_CONCURRENT = 6; 
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

            if (totalAssets === 0) {
                startFinalize(); 
            } else {
                runQueue();
            }

            btn.addEventListener('click', async function() {
                if (btn.disabled || startClicked) return;
                if (!bootXmlReady || window.__ANDRO_BOOT_XML_READY !== true) {
                    txt.innerText = 'Unable to start: game data is not ready.';
                    updateStartState();
                    return;
                }
                if (!portalVisualReady || window.__ANDRO_PORTAL_RUNTIME_WARMUP_READY !== true) {
                    txt.innerText = 'Unable to start: portal visuals are not ready.';
                    updateStartState();
                    return;
                }
                if (!visualRuntimeReady || window.__ANDRO_VISUAL_RUNTIME_WARMUP_READY !== true) {
                    txt.innerText = 'Unable to start: game visuals are not ready.';
                    updateStartState();
                    return;
                }

                startClicked = true;
                updateStartState();
                btn.style.display = 'none';
                box.style.display = 'block';
                bar.style.width = "100%";
                txt.innerText = 'Issuing secure ticket...';

                try {
                    const ticketResponse = await fetch('spacemap.php?issue_ticket=1', {
                        method: 'GET',
                        credentials: 'same-origin',
                        cache: 'no-store',
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                    if (!ticketResponse.ok) {
                        throw new Error('Ticket endpoint failed: HTTP ' + ticketResponse.status);
                    }
                    const ticketPayload = await ticketResponse.json();
                    if (!ticketPayload || !ticketPayload.ok || !ticketPayload.sessionID) {
                        throw new Error('Ticket endpoint returned invalid payload');
                    }
                    window.ANDROMEDA_CONFIG = window.ANDROMEDA_CONFIG || {};
                    window.ANDROMEDA_CONFIG.sessionID = String(ticketPayload.sessionID);
                    if (typeof cfg === 'object' && cfg) {
                        cfg.sessionID = window.ANDROMEDA_CONFIG.sessionID;
                    }
                } catch (err) {
                    console.error('[START] Failed to issue fresh SSO ticket:', err);
                    startClicked = false;
                    updateStartState();
                    txt.innerText = 'Unable to start (ticket issue failed). Retry.';
                    return;
                }

                txt.innerText = 'Starting connection...';

                try {
                    if (typeof window.hideConnectionLostWindow === "function") {
                        window.hideConnectionLostWindow();
                    }
                } catch (e) {}

                document.getElementById('gameContainer').style.display = 'block';

                try {
                    if (typeof window.showConnectionInfoWindow === "function") {
                        window.showConnectionInfoWindow();
                    }
                } catch (e) {}

                if (typeof initGame !== 'function') {
                    console.error('[START] initGame is missing.');
                    startClicked = false;
                    txt.innerText = 'Unable to start: game initialization failed.';
                    document.getElementById('gameContainer').style.display = 'none';
                    updateStartState();
                    return;
                }

                try {
                    await Promise.resolve(initGame());
                    document.getElementById('loaderOverlay').style.display = 'none';
                } catch (err) {
                    console.error('[START] initGame failed:', err);
                    startClicked = false;
                    txt.innerText = 'Unable to start: game initialization failed.';
                    document.getElementById('gameContainer').style.display = 'none';
                    updateStartState();
                }
            });

        })();
    </script>
<script>window.__ANDROMEDA_UI_IMAGE_ATLAS_MANIFEST = <?php echo json_encode(loadUiImageAtlasManifest(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;</script>
<script>window.__ANDROMEDA_ACTION_MENU_IMAGE_ATLAS_MANIFEST = <?php echo json_encode(loadActionMenuImageAtlasManifest(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;</script>
<script>window.__ANDROMEDA_SPACEMAP_IMAGE_ATLAS_MANIFEST = <?php echo json_encode(loadSpacemapImageAtlasManifest(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;</script>
<script>window.__ANDROMEDA_ICONS_IMAGE_ATLAS_MANIFEST = <?php echo json_encode(loadIconsImageAtlasManifest(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;</script>
<script>window.__ANDROMEDA_MINIMAP_IMAGE_ATLAS_MANIFEST = <?php echo json_encode(loadMinimapImageAtlasManifest(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;</script>
<script>window.__ANDROMEDA_REFINEMENT_IMAGE_ATLAS_MANIFEST = <?php echo json_encode(loadRefinementImageAtlasManifest(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;</script>
<script>window.__ANDROMEDA_SHIP_FOLDER_ATLAS_MANIFESTS = <?php echo json_encode(loadShipFolderAtlasManifests(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;</script>
<script>window.__ANDROMEDA_EXPANSION_FOLDER_ATLAS_MANIFESTS = <?php echo json_encode(loadExpansionFolderAtlasManifests(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;</script>
<script>window.__ANDROMEDA_SHIELD_EFFECT_ATLAS_MANIFESTS = <?php echo json_encode(loadShieldEffectAtlasManifests(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;</script>
<script>window.__ANDRO_AUDIO_ASSET_MANIFEST = <?php echo json_encode($audioAssetManifest, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;</script>
<script src="client_audio.js?v=1016"></script>
<script src="client_config.js?v=1039"></script>
<script src="client_network.js?v=1106"></script>
<script src="client_entities.js?v=1016"></script>
<script src="client_combat.js?v=1021"></script>
<script src="client_graphics.js?v=1104"></script>
<script src="client_ui.js?v=1015"></script>
<script src="client_quests.js?v=1008"></script>
<script src="client_bootstrap.js?v=1017"></script>


</body>
</html>
