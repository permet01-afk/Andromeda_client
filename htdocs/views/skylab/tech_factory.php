<?php
// Included only by the authenticated Skylab route. Rendering does not contact DB.
require_once __DIR__ . '/../../libs/TechFactoryService.php';
$techFactoryCatalog = [];
try { $techFactoryCatalog = array_values(TechFactoryService::loadCatalog()); }
catch (Throwable $error) { error_log('[Tech Factory view] ' . $error->getMessage()); }
$techFactoryConfig = ['endpoint'=>'views/skylab/tech_factory_api.php', 'csrf'=>(string)($skylabCsrfToken ?? ''),
    'playerKey'=>(string)($sessionPlayerId ?? ''), 'catalog'=>$techFactoryCatalog];
?>
<link rel="stylesheet" href="styles/tech_factory.css?v=1">
<section class="tf-shell" id="tech-factory" aria-label="Tech Factory">
    <header class="tf-head"><h1>Skylab</h1><span>Production &amp; technology</span></header>
    <nav class="tf-tabs" aria-label="Skylab sections">
        <a href="view.php?page=skylab">Skylab</a>
        <a class="selected" aria-current="page" href="view.php?page=skylab&amp;tab=tech_factory">Tech Factory</a>
    </nav>
    <div id="tf-status" class="tf-status" role="status" aria-live="polite">Loading Tech Factory...</div>
    <div class="tf-resources" id="tf-resources">Checking resources...</div>
    <div class="tf-scene-wrap"><div class="tf-scene">
        <section class="tf-left" aria-label="Technologies"><h2>TECH ITEMS</h2><p>Select a technology</p><div class="tf-catalog" id="tf-catalog"></div></section>
        <section class="tf-detail" id="tf-detail" aria-label="Selected technology"></section>
        <section class="tf-right" aria-label="Production halls"><h2>PRODUCTION</h2><div id="tf-halls"></div></section>
    </div></div>
    <div class="tf-table-wrap"><h2>TECH CATALOGUE</h2><table class="tf-table"><thead><tr><th>Technology</th><th>Owned</th><th>Credits</th><th>Seprom</th><th>Log Files</th><th>Build time</th></tr></thead><tbody id="tf-recipes"></tbody></table></div>
    <p class="tf-note">Production continues while you are away. Completed techs are delivered automatically. Each build produces one tech.</p>
    <noscript><p class="tf-status error">JavaScript is required to use Tech Factory.</p></noscript>
</section>
<script type="application/json" id="tf-config"><?php echo json_encode($techFactoryConfig, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_INVALID_UTF8_SUBSTITUTE); ?></script>
<script src="js/tech_factory.js?v=1" defer></script>
