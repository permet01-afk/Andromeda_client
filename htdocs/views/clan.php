<?php

$sth = $db->prepare("SELECT clanid FROM users WHERE id = :id LIMIT 1");
$sth->execute([':id' => $_SESSION['player_id']]);
$datauser = $sth->fetchAll();
$bHasClan = !empty($datauser) && (int)$datauser[0]['clanid'] !== 0;


$displayTab = $bHasClan ? 'claninfos' : 'joinclan';


if (isset($_GET['tab'])) {
    $displayTab = preg_replace('~[^a-z_]+~', '', $_GET['tab']); 
}



$allowed = [
    'createclan',
    'claninfos',
    'diplomacy',          
    'diplomacy_war',      
    'diplomacy_alliance', 
    'treasury',           
    'joinclan',
    'clanmembers',
    'clanlog',
    'clanroles',
];


if (!in_array($displayTab, $allowed, true)) {
    $displayTab = $bHasClan ? 'claninfos' : 'joinclan';
}


if ($displayTab === 'diplomacy_war' || $displayTab === 'diplomacy_alliance') {
    $displayTab = 'diplomacy';
}


if ($bHasClan) {
    $tabsToShow = [
        'claninfos'   => 'Informations',
        'clanmembers' => 'Members',
        'clanroles'   => 'Roles',
        'diplomacy'   => 'Diplomacy',   
        'treasury'    => 'Treasury',    
        'clanlog'     => 'Clan Log',
    ];
} else {
    $tabsToShow = [
        'joinclan'   => 'Join Clan',
        'createclan' => 'Create Clan',
    ];
}
?>
<link rel="stylesheet" type="text/css" href="styles/home.css" />
<link rel="stylesheet" type="text/css" href="styles/clan.css?v=4" />

<style>
/* --- Popup léger (sans jQuery) --- */
.modal-wrap {
  position: fixed;
  inset: 0;
  background: rgba(2,6,23,.6);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.modal {
  width: min(560px, 92vw);
  background: rgba(15,23,42,.95);
  border: 1px solid rgba(148,163,184,.25);
  border-radius: 14px;
  padding: 1rem;
  box-shadow: var(--shadow-lg);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  margin-bottom: .75rem;
}
.modal-title { margin: 0; font-size: 1.1rem; }
.modal-close {
  border: 1px solid rgba(148,163,184,.35);
  background: rgba(30,41,59,.7);
  color: var(--color-text);
  border-radius: 8px;
  padding: .35rem .6rem;
  cursor: pointer;
}
.modal-body { line-height: 1.55; }
</style>

<div class="CMSContent">
    <!-- Sous-navigation locale (onglets) -->
    <nav class="clan-subnav" aria-label="Clan tabs">
        <?php foreach ($tabsToShow as $tabKey => $tabLabel): ?>
            <?php
            $isActive = $displayTab === $tabKey ? ' is-active' : '';
            $url = 'view.php?page=clan&tab=' . urlencode($tabKey);
            ?>
            <a class="<?php echo $isActive; ?>" href="<?php echo $url; ?>">
                <?php echo htmlspecialchars($tabLabel, ENT_QUOTES, 'UTF-8'); ?>
            </a>
        <?php endforeach; ?>
    </nav>

    <?php
    
    $tabPath = 'views/clanTabs/' . $displayTab . '.php';
    if (is_file($tabPath) && in_array($displayTab, $allowed, true)) {
        include $tabPath;
    } else {
        echo '<div class="app-feedback">Not allowed!</div>';
    }
    ?>
</div>

<?php if (isset($buymessage)): ?>
<!-- Popup / Modal -->
<div class="modal-wrap" id="clanModal" role="dialog" aria-modal="true" aria-labelledby="clanModalTitle">
  <div class="modal">
    <div class="modal-header">
      <h3 class="modal-title" id="clanModalTitle">Information</h3>
      <button class="modal-close" id="clanModalClose" type="button" aria-label="Close">Close</button>
    </div>
    <div class="modal-body">
      <?php echo $buymessage; ?>
    </div>
  </div>
</div>
<script>
  (function() {
    const wrap = document.getElementById('clanModal');
    const btn  = document.getElementById('clanModalClose');
    if (wrap) {
      wrap.style.display = 'flex';
      const close = () => { wrap.style.display = 'none'; };
      if (btn) btn.addEventListener('click', close);
      wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }
  })();
</script>
<?php endif; ?>
