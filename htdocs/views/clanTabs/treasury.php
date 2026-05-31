<?php





$sth = $db->prepare("SELECT clanid FROM users WHERE id = :id LIMIT 1");
$sth->execute([':id' => $_SESSION['player_id']]);
$me = $sth->fetch();
if (!$me || (int)$me['clanid'] === 0) {
    header("Location: view.php?page=clan&tab=joinclan"); exit();
}
$clan_id = (int)$me['clanid'];


$sth = $db->prepare("SELECT id, admin_id, clan_company FROM clan WHERE id = :id LIMIT 1");
$sth->execute([':id'=>$clan_id]);
$clan = $sth->fetch();
if (!$clan) { header("Location: view.php?page=clan&tab=joinclan"); exit(); }
$is_admin = ((int)$clan['admin_id'] === (int)$_SESSION['player_id']);


function set_flash_treasury(string $type, string $msg) { $_SESSION['flash']=['type'=>$type,'msg'=>$msg]; }
function get_flash_treasury(): ?array { if(!empty($_SESSION['flash'])){ $f=$_SESSION['flash']; unset($_SESSION['flash']); return $f; } return null; }


function clan_log_local($db, int $clan_id, ?int $actor_id, string $type, array $details = []) {
    try {
        $db->insert('clan_log', [
            'clan_id'       => $clan_id,
            'actor_user_id' => $actor_id,
            'action_type'   => $type,
            'details'       => json_encode($details, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
        ]);
    } catch (Throwable $e) {  }
}


function clan_get_role($db, int $clan_id, int $user_id) : array {
    
    $q = $db->prepare("
        SELECT
          role,
          can_invite, can_kick, can_edit_desc,
          /* legacy */ can_set_tax, can_spend,
          /* new granular tax permissions */
          can_set_tax_rate, can_toggle_tax_active
        FROM clan_roles
        WHERE clan_id = ? AND user_id = ?
        LIMIT 1
    ");
    $q->execute([$clan_id, $user_id]);
    $r = $q->fetch();
    return $r ?: [];
}

function clan_can_spend($db, int $clan_id, int $user_id, bool $is_admin) : bool {
    if ($is_admin) return true;
    $r = clan_get_role($db, $clan_id, $user_id);
    return !empty($r) && (int)$r['can_spend'] === 1;
}


function clan_can_set_tax_rate_only($db, int $clan_id, int $user_id, bool $is_admin) : bool {
    if ($is_admin) return true;
    $r = clan_get_role($db, $clan_id, $user_id);
    if (empty($r)) return false;
    if (array_key_exists('can_set_tax_rate', $r)) {
        return (int)$r['can_set_tax_rate'] === 1;
    }
    return (int)$r['can_set_tax'] === 1;
}
function clan_can_toggle_tax_active_only($db, int $clan_id, int $user_id, bool $is_admin) : bool {
    if ($is_admin) return true;
    $r = clan_get_role($db, $clan_id, $user_id);
    if (empty($r)) return false;
    if (array_key_exists('can_toggle_tax_active', $r)) {
        return (int)$r['can_toggle_tax_active'] === 1;
    }
    return (int)$r['can_set_tax'] === 1;
}


$can_spend              = clan_can_spend($db, $clan_id, (int)$_SESSION['player_id'], $is_admin);
$can_set_tax_rate       = clan_can_set_tax_rate_only($db, $clan_id, (int)$_SESSION['player_id'], $is_admin);
$can_toggle_tax_active  = clan_can_toggle_tax_active_only($db, $clan_id, (int)$_SESSION['player_id'], $is_admin);


$db->prepare("INSERT IGNORE INTO clan_wallet (clan_id, balance) VALUES (:cid,0)")
   ->execute([':cid'=>$clan_id]);
$db->prepare("INSERT IGNORE INTO clan_tax_settings (clan_id, active, rate_bps) VALUES (:cid,0,0)")
   ->execute([':cid'=>$clan_id]);

$sth = $db->prepare("SELECT balance FROM clan_wallet WHERE clan_id=:c");
$sth->execute([':c'=>$clan_id]);
$wallet_balance = (int)$sth->fetchColumn();

$tax = ['active'=>0,'rate_bps'=>0,'last_run_date'=>null];
$sth = $db->prepare("SELECT active, rate_bps, last_run_date FROM clan_tax_settings WHERE clan_id=:c");
$sth->execute([':c'=>$clan_id]);
if ($row = $sth->fetch()) $tax = $row;


if (!empty($_POST['treasury-tax-save'])) {
    
    $active = !empty($_POST['tax_active']) ? 1 : 0;

    $rate_percent = isset($_POST['rate_percent']) ? (int)$_POST['rate_percent'] : 1;
    if ($rate_percent < 1) $rate_percent = 1;
    if ($rate_percent > 5) $rate_percent = 5;

    
    if (!$can_set_tax_rate) {
        
        $rate_percent = max(1, min(5, (int)round(((int)$tax['rate_bps']) / 100)));
    }
    if (!$can_toggle_tax_active) {
        
        $active = (int)$tax['active'];
    }

    
    $rate_bps = $active ? ($rate_percent * 100) : 0;

    if (!$can_set_tax_rate && !$can_toggle_tax_active && !$is_admin) {
        set_flash_treasury('error', "You don't have permission to change the tax.");
        header("Location: view.php?page=clan&tab=treasury"); exit();
    }

    $db->prepare("UPDATE clan_tax_settings SET active=:a, rate_bps=:r, updated_by=:u WHERE clan_id=:c")
       ->execute([':a'=>$active, ':r'=>$rate_bps, ':u'=>(int)$_SESSION['player_id'], ':c'=>$clan_id]);

    clan_log_local($db, $clan_id, (int)$_SESSION['player_id'], 'tax_change', [
        'active'=>$active, 'rate_bps'=>$rate_bps
    ]);

    set_flash_treasury('success', 'Tax settings saved.');
    header("Location: view.php?page=clan&tab=treasury"); exit();
}


if ($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['to_user_id'], $_POST['amount']) && isset($_POST['treasury-transfer'])) {
    $toUser = (int)($_POST['to_user_id'] ?? 0);
    $amount = (int)preg_replace('~[^\d]~','',(string)($_POST['amount'] ?? '0'));
    $note   = substr(trim($_POST['note'] ?? ''), 0, 255);

    if (!$can_spend) {
        set_flash_treasury('error', "You don't have permission to transfer funds.");
        header("Location: view.php?page=clan&tab=treasury"); exit();
    } elseif ($toUser <= 0) {
        set_flash_treasury('error', "No recipient selected.");
        header("Location: view.php?page=clan&tab=treasury"); exit();
    } elseif ($amount <= 0) {
        set_flash_treasury('error', "Invalid amount.");
        header("Location: view.php?page=clan&tab=treasury"); exit();
    } else {
        $chk = $db->prepare("SELECT COUNT(*) FROM users WHERE id=? AND clanid=?");
        $chk->execute([$toUser, $clan_id]);
        if ((int)$chk->fetchColumn() === 0) {
            set_flash_treasury('error', "Selected user is not in your clan.");
            header("Location: view.php?page=clan&tab=treasury"); exit();
        }

        $qBal = $db->prepare("SELECT balance FROM clan_wallet WHERE clan_id=:cid LIMIT 1");
        $qBal->execute([':cid'=>$clan_id]);
        $current = (int)$qBal->fetchColumn();
        if ($current < $amount) {
            set_flash_treasury('error', "Insufficient funds (available: ".number_format($current,0,'.',' ').").");
            header("Location: view.php?page=clan&tab=treasury"); exit();
        }

        $deb = $db->prepare("UPDATE clan_wallet SET balance = balance - :amt
                             WHERE clan_id = :cid AND balance >= :amt");
        $okDeb = $deb->execute([':amt'=>$amount, ':cid'=>$clan_id]);
        if (!$okDeb || $deb->rowCount() === 0) {
            set_flash_treasury('error', "Wallet debit failed. Try again.");
            header("Location: view.php?page=clan&tab=treasury"); exit();
        }

        $okCred = $db->prepare("UPDATE users SET credits = credits + :amt WHERE id = :uid")
                     ->execute([':amt'=>$amount, ':uid'=>$toUser]);
        if (!$okCred) {
            $db->prepare("UPDATE clan_wallet SET balance = balance + :amt WHERE clan_id = :cid")
               ->execute([':amt'=>$amount, ':cid'=>$clan_id]);
            set_flash_treasury('error', "Player credit failed.");
            header("Location: view.php?page=clan&tab=treasury"); exit();
        }

        $db->prepare("INSERT INTO clan_transfers (clan_id, actor_user_id, to_user_id, amount, note)
                      VALUES (?,?,?,?,?)")
           ->execute([$clan_id, (int)$_SESSION['player_id'], $toUser, $amount, $note !== '' ? $note : null]);

        $details = ['to_user_id'=>$toUser,'amount'=>$amount];
        if ($note !== '') $details['note'] = $note;
        clan_log_local($db, $clan_id, (int)$_SESSION['player_id'], 'wallet_transfer', $details);

        set_flash_treasury('success', "Transferred ".number_format($amount,0,'.',' ')." credits.");
        header("Location: view.php?page=clan&tab=treasury"); exit();
    }
}


$flash = get_flash_treasury();


$current_percent = (int)round(((int)$tax['rate_bps']) / 100);
if ($current_percent < 1) $current_percent = 1;
if ($current_percent > 5) $current_percent = 5;
?>
<div class="clan-page">
  <?php if ($flash): ?>
    <div class="flash <?= $flash['type']==='success'?'flash--success':'flash--error' ?>" role="status" id="flashBox">
      <div><?= htmlspecialchars($flash['msg']) ?></div>
      <button class="flash-close" type="button" aria-label="Close" onclick="(function(){var n=document.getElementById('flashBox'); if(n) n.remove();})();">×</button>
    </div>
    <script>setTimeout(function(){var n=document.getElementById('flashBox'); if(n){n.remove();}}, 4000);</script>
  <?php endif; ?>

  <h3 class="clan-section-title">Treasury</h3>

  <div class="clan-card">
    <dl class="clan-grid">
      <div class="clan-row"><dt>Clan Wallet</dt><dd><?= number_format($wallet_balance, 0, '.', ' ') ?> credits</dd></div>

      <div class="clan-row"><dt>Daily Tax Status</dt><dd><?= ((int)$tax['active'] === 1 ? 'Enabled' : 'Disabled') ?> · Last run: <?= $tax['last_run_date'] ? htmlspecialchars(substr((string)$tax['last_run_date'], 0, 10), ENT_QUOTES, 'UTF-8') : 'Never' ?></dd></div>

      <div class="clan-row clan-row--textarea">
        <dt>Daily Clan Tax</dt>
        <dd>
          <form class="clan-form" action="view.php?page=clan&tab=treasury" method="post">
            <label>
              Rate:
              <select name="rate_percent" <?= $can_set_tax_rate ? '' : 'disabled' ?>>
                <?php for ($p=1;$p<=5;$p++): ?>
                  <option value="<?= $p ?>" <?= ($current_percent===$p ? 'selected' : '') ?>><?= $p ?>%</option>
                <?php endfor; ?>
              </select>
              <small>(1-5%)</small>
            </label><br>
            <label>
              <input type="checkbox" name="tax_active" value="1" <?= ((int)$tax['active']===1?'checked':'') ?> <?= $can_toggle_tax_active ? '' : 'disabled' ?>>
              Enabled
            </label><br>
            <small class="treasury-help">Daily collection is executed only by the clan tax runner script.</small><br>
            <?php if ($can_set_tax_rate || $can_toggle_tax_active || $is_admin) { ?>
              <button class="btn-primary" name="treasury-tax-save" type="submit" value="1">Save Tax Settings</button>
            <?php } ?>
          </form>
        </dd>
      </div>

      <div class="clan-row clan-row--textarea">
        <dt>Transfer from Wallet</dt>
        <dd>
          <form class="clan-form" action="view.php?page=clan&tab=treasury" method="post">
            <fieldset <?= $can_spend ? '' : 'disabled' ?>>
              <label>To member:&nbsp;
                <select name="to_user_id" style="max-width:420px;">
                  <?php
                  $mem = $db->prepare("SELECT id, username FROM users WHERE clanid = :cid ORDER BY username ASC");
                  $mem->execute([':cid'=>$clan_id]);
                  foreach ($mem->fetchAll() as $m) {
                      echo '<option value="'.(int)$m['id'].'">'.htmlspecialchars($m['username']).'</option>';
                  }
                  ?>
                </select>
              </label><br>
              <label>Amount: <input type="number" name="amount" min="1" step="1" value="1000" style="width:140px;"></label>
              &nbsp;&nbsp;<label>Note: <input type="text" name="note" maxlength="255" placeholder="Optional message" style="width:320px;"></label><br>
            </fieldset>
            <?php if ($can_spend) { ?>
              <button class="btn-primary" type="submit" name="treasury-transfer" value="1">Send</button>
            <?php } ?>
          </form>
        </dd>
      </div>
    </dl>
  </div>

  <!-- ==================== Recent Transfers ==================== -->
  <h3 class="clan-section-title">Recent Transfers</h3>
  <div class="clan-card">
    <?php
      $q = $db->prepare("
        SELECT t.id, t.actor_user_id, t.to_user_id, t.amount, t.note, t.created_at,
               ua.username AS actor_name, ub.username AS to_name
        FROM clan_transfers t
        LEFT JOIN users ua ON ua.id = t.actor_user_id
        LEFT JOIN users ub ON ub.id = t.to_user_id
        WHERE t.clan_id = :cid
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT 25
      ");
      $q->execute([':cid'=>$clan_id]);
      $transfers = $q->fetchAll();

      $fmt = fn($n) => number_format((int)$n, 0, '.', ' ');
    ?>
    <?php if (!$transfers): ?>
      <div class="clan-message"><em>No transfer yet.</em></div>
    <?php else: ?>
      <table class="treasury-table">
        <thead>
          <tr>
            <th class="treasury-col-date">Date</th>
            <th class="treasury-col-from">From</th>
            <th class="treasury-col-to">To</th>
            <th class="treasury-col-amount">Amount</th>
            <th class="treasury-col-note">Note</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($transfers as $t): ?>
            <tr class="treasury-row">
              <td class="treasury-col-date"><?= htmlspecialchars($t['created_at'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
              <td class="treasury-col-from"><?= htmlspecialchars($t['actor_name'] ?: ('#'.$t['actor_user_id']), ENT_QUOTES, 'UTF-8') ?></td>
              <td class="treasury-col-to"><?= htmlspecialchars($t['to_name'] ?: ('#'.$t['to_user_id']), ENT_QUOTES, 'UTF-8') ?></td>
              <td class="treasury-col-amount"><?= $fmt($t['amount']) ?></td>
              <td class="treasury-col-note">
                <?php
                  $note = trim((string)$t['note']);
                  echo $note !== '' ? htmlspecialchars($note, ENT_QUOTES, 'UTF-8') : '—';
                ?>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </div>
  <!-- =========================================================== -->

</div>
