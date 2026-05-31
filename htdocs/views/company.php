<?php 




$buymessage = null;

function handleCompanyChange($db, $factionid, $type)
{
    $transferPlans = [
        1 => ['price' => 35000, 'rankMultiplier' => 0.70, 'honorMultiplier' => 0.70],
        2 => ['price' => 350000, 'rankMultiplier' => 0.85, 'honorMultiplier' => 0.85],
        3 => ['price' => 700000, 'rankMultiplier' => 0.95, 'honorMultiplier' => 0.95],
    ];

    if (!isset($transferPlans[$type])) {
        return "Invalid transfer type.";
    }

    $sth = $db->prepare("SELECT uridium, rankpoints, honor, clanid, factionid FROM users WHERE id = :id LIMIT 1");
    $sth->execute([':id' => $_SESSION['player_id']]);
    $datauser = $sth->fetch();

    if (!$datauser) return "User not found.";

    if ($datauser['factionid'] == $factionid) {
        return "You are already in this company.";
    }

    $plan = $transferPlans[$type];
    $priceUri = $plan['price'];

    if ($datauser['uridium'] < $priceUri) {
        return "Error: Not enough Uridium (Need ".number_format($priceUri)." U).";
    }

    $newRankpoints = floor($datauser['rankpoints'] * $plan['rankMultiplier']);
    $newHonor      = floor($datauser['honor'] * $plan['honorMultiplier']);

    switch ($factionid) {
        case 1: $newMap = 1; $newX = 2000; $newY = 1100; break;
        case 2: $newMap = 5; $newX = 18500; $newY = 1100; break;
        case 3: $newMap = 9; $newX = 19200; $newY = 11300; break;
        default: return "Invalid Company ID.";
    }

    $req = $db->prepare('UPDATE users SET factionid=:fid, uridium=uridium-:cost, rankpoints=:rp, honor=:hn, locx=:x, locy=:y, mapid=:m WHERE id=:id AND uridium >= :cost_check');
    $req->execute([
        ':fid' => $factionid,
        ':cost' => $priceUri,
        ':cost_check' => $priceUri,
        ':rp' => $newRankpoints,
        ':hn' => $newHonor,
        ':x' => $newX,
        ':y' => $newY,
        ':m' => $newMap,
        ':id' => $_SESSION['player_id']
    ]);

    if ($req->rowCount() <= 0) {
        return "Error: Not enough Uridium (Need ".number_format($priceUri)." U).";
    }
    
    if ($datauser['clanid'] > 0) {
        $clan_id = $datauser['clanid'];
        $db->prepare('UPDATE users SET clanid=0 WHERE id=:id')->execute([':id' => $_SESSION['player_id']]);

        $sth = $db->prepare("SELECT admin_id FROM clan WHERE id = :cid");
        $sth->execute([':cid' => $clan_id]);
        $clanInfo = $sth->fetch();

        if ($clanInfo && $clanInfo['admin_id'] == $_SESSION['player_id']) {
            $db->prepare("UPDATE users SET clanid=0 WHERE clanid=:cid")->execute([':cid' => $clan_id]);
            $db->prepare("DELETE FROM clan WHERE id=:cid")->execute([':cid' => $clan_id]);
            $db->prepare("DELETE FROM clan_messages WHERE clanid=:cid")->execute([':cid' => $clan_id]);
            $db->prepare("DELETE FROM clan_request WHERE clan_id=:cid")->execute([':cid' => $clan_id]);
        }
    }

    return "SUCCESS";
}

if(!empty($_GET['factionid']) && !empty($_GET['type'])) {
    $res = handleCompanyChange($db,(int)$_GET['factionid'],(int)$_GET['type']);
    if($res === "SUCCESS") {
        echo "<script>window.location.href='view.php?page=company&success=1';</script>";
        exit;
    } else {
        $buymessage = $res;
    }
}

if(isset($_GET['success'])) {
    $buymessage = "Company transfer successful! Welcome to your new faction.";
}
?>

<style>
    .shop-card {
        background: var(--color-surface, #0b1221);
        border: 1px solid var(--color-border, #1e293b);
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        color: #fff;
        -webkit-user-select: none; -moz-user-select: none; user-select: none; cursor: default;
    }

    .shop-title {
        font-size: 1.5rem; font-weight: 700; color: var(--color-accent, #5eead4);
        margin-bottom: 1.5rem; text-transform: uppercase;
        border-bottom: 1px solid var(--color-border, #1e293b); padding-bottom: 1rem;
    }

    .msg-box {
        background: rgba(94, 234, 212, 0.1); border: 1px solid var(--color-accent, #5eead4);
        color: var(--color-accent, #5eead4); padding: 1rem; border-radius: 4px;
        margin-bottom: 1.5rem; text-align: center; font-weight: bold;
    }
    .msg-error { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; color: #ef4444; }

    .plans-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;
    }

    .plan-card {
        background: rgba(8, 14, 26, 0.6); border: 1px solid var(--color-border, #1e293b);
        border-radius: 6px; padding: 1.5rem; display: flex; flex-direction: column;
        transition: transform 0.2s, border-color 0.2s; position: relative; overflow: hidden;
    }
    .plan-card:hover {
        transform: translateY(-5px); border-color: var(--color-accent-strong, #22d3ee);
        background: rgba(15, 23, 42, 0.8);
    }

    .plan-header { text-align: center; margin-bottom: 1rem; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 1rem; }
    .plan-title { font-size: 1.2rem; font-weight: bold; color: #fff; text-transform: uppercase; margin-bottom: 0.5rem; }
    .plan-cost { font-size: 0.9rem; color: var(--color-accent, #5eead4); }

    .plan-body { flex: 1; margin-bottom: 1.5rem; text-align: center; }
    .stat-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; color: #94a3b8; }
    .stat-val { color: #fff; font-weight: 600; }
    .stat-val.neg { color: #ef4444; }

    .company-selector { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    
    .btn-company {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px; text-decoration: none; transition: all 0.2s; cursor: pointer;
    }
    .btn-company img { width: 32px; height: 32px; object-fit: contain; margin-bottom: 4px; }
    .btn-company span { font-size: 0.7rem; color: #aaa; font-weight: bold; }

    .btn-company.mmo:hover { border-color: #fca5a5; background: rgba(185, 28, 28, 0.2); }
    .btn-company.eic:hover { border-color: #93c5fd; background: rgba(29, 78, 216, 0.2); }
    .btn-company.vru:hover { border-color: #86efac; background: rgba(21, 128, 61, 0.2); }
    
    .warning-note {
        margin-top: 2rem; padding: 1rem; background: rgba(234, 179, 8, 0.1);
        border-left: 3px solid #eab308; color: #eab308; font-size: 0.85rem;
    }

    /* === STYLES POUR LA POPUP (MODAL) === */
    .modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); z-index: 9999;
        display: none; align-items: center; justify-content: center;
        backdrop-filter: blur(4px);
    }
    .modal-overlay.active { display: flex; }

    .modal-box {
        background: #0f172a; border: 1px solid var(--color-border, #1e293b);
        border-radius: 8px; padding: 2rem; width: 400px; max-width: 90%;
        text-align: center; box-shadow: 0 0 30px rgba(0,0,0,0.8);
        animation: popIn 0.3s ease-out;
    }
    @keyframes popIn { from {transform: scale(0.9); opacity:0;} to {transform: scale(1); opacity:1;} }

    .modal-title { font-size: 1.3rem; color: #fff; margin-bottom: 1rem; text-transform: uppercase; }
    .modal-msg { color: #cbd5e1; margin-bottom: 2rem; line-height: 1.5; font-size: 1rem; }
    .faction-name { font-weight: bold; font-size: 1.1em; }

    .modal-actions { display: flex; gap: 1rem; justify-content: center; }
    
    .btn-modal {
        padding: 0.6rem 1.5rem; border: none; border-radius: 4px;
        font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 0.9rem;
    }
    .btn-cancel { background: #334155; color: #fff; border: 1px solid #475569; }
    .btn-cancel:hover { background: #475569; }

    .btn-confirm { background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
    .btn-confirm:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.4); }

</style>

<div class="CMSContent">
    
    <?php if(isset($buymessage)): ?>
        <div class="msg-box <?= (strpos($buymessage, 'Error') !== false) ? 'msg-error' : '' ?>">
            <?= htmlspecialchars($buymessage) ?>
        </div>
    <?php endif; ?>

    <div class="shop-card">
        <h2 class="shop-title">Company Relocation System</h2>

        <div class="plans-grid">
            
            <div class="plan-card">
                <div class="plan-header">
                    <div class="plan-title">Standard Transfer</div>
                    <div class="plan-cost">35,000 Uridium</div>
                </div>
                <div class="plan-body">
                    <div class="stat-row">
                        <span>Rank & Honor</span>
                        <span class="stat-val neg">-30%</span>
                    </div>
                    <div class="stat-row">
                        <span>Uridium Cost</span>
                        <span class="stat-val">35,000 U.</span>
                    </div>
                </div>
                <div class="company-selector">
                    <a href="view.php?page=company&factionid=1&type=1" class="btn-company mmo" onclick="confirmChange(event, 'MMO', '#f87171', this.href)">
                        <img src="img/mmo.jpg" alt="MMO"><span>MMO</span>
                    </a>
                    <a href="view.php?page=company&factionid=2&type=1" class="btn-company eic" onclick="confirmChange(event, 'EIC', '#60a5fa', this.href)">
                        <img src="img/eic.jpg" alt="EIC"><span>EIC</span>
                    </a>
                    <a href="view.php?page=company&factionid=3&type=1" class="btn-company vru" onclick="confirmChange(event, 'VRU', '#4ade80', this.href)">
                        <img src="img/vru.jpg" alt="VRU"><span>VRU</span>
                    </a>
                </div>
            </div>

            <div class="plan-card" style="border-color: rgba(94, 234, 212, 0.3);">
                <div class="plan-header">
                    <div class="plan-title" style="color:#5eead4;">Advanced Transfer</div>
                    <div class="plan-cost">350,000 Uridium</div>
                </div>
                <div class="plan-body">
                    <div class="stat-row">
                        <span>Rank & Honor</span>
                        <span class="stat-val neg" style="color:#fbbf24;">-15%</span>
                    </div>
                    <div class="stat-row">
                        <span>Uridium Cost</span>
                        <span class="stat-val">350,000 U.</span>
                    </div>
                </div>
                <div class="company-selector">
                    <a href="view.php?page=company&factionid=1&type=2" class="btn-company mmo" onclick="confirmChange(event, 'MMO', '#f87171', this.href)">
                        <img src="img/mmo.jpg" alt="MMO"><span>MMO</span>
                    </a>
                    <a href="view.php?page=company&factionid=2&type=2" class="btn-company eic" onclick="confirmChange(event, 'EIC', '#60a5fa', this.href)">
                        <img src="img/eic.jpg" alt="EIC"><span>EIC</span>
                    </a>
                    <a href="view.php?page=company&factionid=3&type=2" class="btn-company vru" onclick="confirmChange(event, 'VRU', '#4ade80', this.href)">
                        <img src="img/vru.jpg" alt="VRU"><span>VRU</span>
                    </a>
                </div>
            </div>

            <div class="plan-card" style="border-color: rgba(167, 139, 250, 0.4);">
                <div class="plan-header">
                    <div class="plan-title" style="color:#a78bfa;">Elite Transfer</div>
                    <div class="plan-cost">700,000 Uridium</div>
                </div>
                <div class="plan-body">
                    <div class="stat-row">
                        <span>Rank & Honor</span>
                        <span class="stat-val neg" style="color:#4ade80;">-5%</span>
                    </div>
                    <div class="stat-row">
                        <span>Uridium Cost</span>
                        <span class="stat-val">700,000 U.</span>
                    </div>
                </div>
                <div class="company-selector">
                    <a href="view.php?page=company&factionid=1&type=3" class="btn-company mmo" onclick="confirmChange(event, 'MMO', '#f87171', this.href)">
                        <img src="img/mmo.jpg" alt="MMO"><span>MMO</span>
                    </a>
                    <a href="view.php?page=company&factionid=2&type=3" class="btn-company eic" onclick="confirmChange(event, 'EIC', '#60a5fa', this.href)">
                        <img src="img/eic.jpg" alt="EIC"><span>EIC</span>
                    </a>
                    <a href="view.php?page=company&factionid=3&type=3" class="btn-company vru" onclick="confirmChange(event, 'VRU', '#4ade80', this.href)">
                        <img src="img/vru.jpg" alt="VRU"><span>VRU</span>
                    </a>
                </div>
            </div>

        </div>

        <div class="warning-note">
            <strong>Warning:</strong> Changing your company will automatically remove you from your current clan. 
            If you are the clan leader, the clan will be dissolved permanently.
        </div>

    </div>
</div>

<div id="confirmModal" class="modal-overlay">
    <div class="modal-box">
        <h3 class="modal-title">Confirmation</h3>
        <p class="modal-msg">
            Are you sure you really want to change your company to 
            <br>
            <span id="targetFaction" class="faction-name">FACTION</span>?
        </p>
        <div class="modal-actions">
            <button class="btn-modal btn-cancel" onclick="closeModal()">Cancel</button>
            <button id="btnConfirm" class="btn-modal btn-confirm">Confirm</button>
        </div>
    </div>
</div>

<script>
    let targetUrl = "";

    function confirmChange(e, factionName, color, url) {
        e.preventDefault(); // Empêche le lien de s'ouvrir tout de suite
        targetUrl = url;

        // Mise à jour du texte et de la couleur
        const factionSpan = document.getElementById('targetFaction');
        factionSpan.innerText = factionName;
        factionSpan.style.color = color;

        // Afficher la popup
        document.getElementById('confirmModal').classList.add('active');
    }

    function closeModal() {
        document.getElementById('confirmModal').classList.remove('active');
    }

    // Au clic sur Confirm, on redirige
    document.getElementById('btnConfirm').addEventListener('click', function() {
        if(targetUrl) {
            window.location.href = targetUrl;
        }
    });
</script>
