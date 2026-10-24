<?php
require_once __DIR__ . '/../../libs/ClanRequestSecurity.php';

// Existing clan permissions and handlers are reused; GET never mutates diplomacy.
clan_request_csrf_token();
$diploPostValid = clan_request_is_post_valid();

function clan_diplo_action(array $fields, string $label, string $title, string $message): void {
    echo '<form class="clan-diplo-action-form" method="post" action="view.php?page=clan&amp;tab=diplomacy" data-clan-confirm="'.htmlspecialchars($message, ENT_QUOTES, 'UTF-8').'" data-clan-confirm-title="'.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'">';
    echo clan_request_csrf_field();
    foreach ($fields as $name=>$value) {
        echo '<input type="hidden" name="'.htmlspecialchars($name, ENT_QUOTES, 'UTF-8').'" value="'.htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8').'">';
    }
    echo '<button class="leftbutton" type="submit">'.htmlspecialchars($label, ENT_QUOTES, 'UTF-8').'</button></form>';
}
function clan_diplo_message(string $value): string {
    return htmlspecialchars(html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'), ENT_QUOTES, 'UTF-8');
}






$sth = $db->prepare("SELECT clanid FROM users WHERE id = :id LIMIT 1");
$sth->execute([':id' => $_SESSION['player_id']]);
$u = $sth->fetch();
if (!$u || (int)$u['clanid'] === 0) {
    header("Location: view.php?page=clan&tab=joinclan");
    exit();
}
$clan_id = (int)$u['clanid'];


$sth = $db->prepare("SELECT id, admin_id, clan_company FROM clan WHERE id = :cid LIMIT 1");
$sth->execute([':cid' => $clan_id]);
$clan = $sth->fetch();
if (!$clan) { header("Location: view.php?page=clan&tab=joinclan"); exit(); }

$marshal_id   = (int)$clan['admin_id'];
$is_marshal   = ($marshal_id === (int)$_SESSION['player_id']);
$clan_company = (int)$clan['clan_company'];




function clan_get_role_min(PDO $db, int $clan_id, int $user_id): array {
    $q = $db->prepare("
        SELECT can_start_alliance, can_cancel_alliance, can_declare_war, can_request_war_cancel
        FROM clan_roles WHERE clan_id = ? AND user_id = ? LIMIT 1
    ");
    $q->execute([$clan_id, $user_id]);
    return $q->fetch() ?: [];
}
function has_perm_diplo(array $r, string $k, bool $is_marshal): bool {
    if ($is_marshal) return true;
    return !empty($r[$k]) && (int)$r[$k] === 1;
}


function clan_label($db, $id) {
    $q = $db->prepare("SELECT clan_tag, clan_name FROM clan WHERE id = :i LIMIT 1");
    $q->execute([':i'=>$id]);
    $r = $q->fetch();
    if (!$r) return 'Clan #'.$id;
    return '['.$r['clan_tag'].'] '.$r['clan_name'];
}


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


$myRole = clan_get_role_min($db, $clan_id, (int)$_SESSION['player_id']);
$can_start_alliance     = has_perm_diplo($myRole, 'can_start_alliance', $is_marshal);
$can_cancel_alliance    = has_perm_diplo($myRole, 'can_cancel_alliance', $is_marshal);
$can_declare_war        = has_perm_diplo($myRole, 'can_declare_war', $is_marshal);
$can_request_war_cancel = has_perm_diplo($myRole, 'can_request_war_cancel', $is_marshal);


$can_any_diplo = ($can_start_alliance || $can_cancel_alliance || $can_declare_war || $can_request_war_cancel);




$form_errors = [];
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && !$diploPostValid) {
    http_response_code(403);
    $form_errors[] = 'Your request could not be verified. Reload the page and try again.';
}


if ($diploPostValid && !empty($_POST['cancel']) && in_array($_POST['type'] ?? '', ['alliance','nap'], true)) {
    $agreementType = $_POST['type'];
    if (!$can_cancel_alliance) { header("Location: view.php?page=clan&tab=diplomacy"); exit(); }

    $id = (int)$_POST['cancel'];

    
    $q = $db->prepare("SELECT clan_id, second_clan_id FROM clan_diplomacy WHERE id=:id AND type=:agreement_type AND (clan_id=:cid OR second_clan_id=:cid) LIMIT 1");
    $q->execute([':id'=>$id, ':cid'=>$clan_id, ':agreement_type'=>$agreementType]);
    $rel = $q->fetch();

    $sth  = $db->prepare("
        DELETE FROM clan_diplomacy
        WHERE id = :id
          AND type = :agreement_type
          AND (clan_id = :cid OR second_clan_id = :cid)
    ");
    $sth->execute([':id'=>$id, ':cid'=>$clan_id, ':agreement_type'=>$agreementType]);

    if ($rel) {
        $other = ($rel['clan_id'] == $clan_id) ? (int)$rel['second_clan_id'] : (int)$rel['clan_id'];
        clan_log_local($db, $clan_id, (int)$_SESSION['player_id'], $agreementType.'_cancel', [
            'other_clan_id' => $other,
            'phase'         => 'direct_cancel'
        ]);
    }

    header("Location: view.php?page=clan&tab=diplomacy"); exit();
}


if ($diploPostValid && !empty($_POST['cancel']) && ($_POST['type'] ?? '') === 'war') {
    if (!$can_request_war_cancel) { header("Location: view.php?page=clan&tab=diplomacy"); exit(); }

    $id = (int)$_POST['cancel'];
    $q = $db->prepare("SELECT clan_id, second_clan_id FROM clan_diplomacy WHERE id=:id AND type='war' AND (clan_id=:cid OR second_clan_id=:cid) LIMIT 1");
    $q->execute([':id'=>$id, ':cid'=>$clan_id]);
    $rel = $q->fetch();
    if ($rel) {
        $other = ($rel['clan_id'] == $clan_id) ? (int)$rel['second_clan_id'] : (int)$rel['clan_id'];

        
        $chk = $db->prepare("
            SELECT 1 FROM clan_diplomacy_request
             WHERE type='war_cancel'
               AND ((clan_id=:a AND second_clan_id=:b) OR (clan_id=:b AND second_clan_id=:a))
             LIMIT 1
        ");
        $chk->execute([':a'=>$clan_id, ':b'=>$other]);
        if (!$chk->fetchColumn()) {
            $db->insert('clan_diplomacy_request', [
                'clan_id'        => $clan_id,
                'second_clan_id' => $other,
                'type'           => 'war_cancel',
                'message'        => 'Cancel war request'
            ]);
            clan_log_local($db, $clan_id, (int)$_SESSION['player_id'], 'war_cancel', [
                'other_clan_id' => $other,
                'phase'         => 'request'
            ]);
        }
    }
    header("Location: view.php?page=clan&tab=diplomacy"); exit();
}


if ($diploPostValid && !empty($_POST['cancelAR'])) {
    $id  = (int)$_POST['cancelAR'];

    
    $qq = $db->prepare("SELECT * FROM clan_diplomacy_request WHERE id=:id AND (clan_id=:cid OR second_clan_id=:cid) LIMIT 1");
    $qq->execute([':id'=>$id, ':cid'=>$clan_id]);
    $req = $qq->fetch();

    if ($req) {
        $type = $req['type'];
        if (!in_array($type, ['alliance','nap','war_cancel'], true)) {
            header("Location: view.php?page=clan&tab=diplomacy"); exit();
        } 
        
        if (in_array($type, ['alliance','nap'], true) && !$can_cancel_alliance && !$is_marshal) {
            header("Location: view.php?page=clan&tab=diplomacy"); exit();
        }
        if ($type === 'war_cancel' && !$can_request_war_cancel && !$is_marshal) {
            header("Location: view.php?page=clan&tab=diplomacy"); exit();
        }

        
        $sth = $db->prepare("
            DELETE FROM clan_diplomacy_request
            WHERE id = :id
              AND (clan_id = :cid OR second_clan_id = :cid)
        ");
        $sth->execute([':id'=>$id, ':cid'=>$clan_id]);

        
        $isRequester = ((int)$req['clan_id'] === $clan_id);
        $other       = $isRequester ? (int)$req['second_clan_id'] : (int)$req['clan_id'];

        if (in_array($type, ['alliance','nap'], true)) {
            $phase = $isRequester ? 'request_cancelled_by_requester' : 'request_refused_by_recipient';
            clan_log_local($db, $clan_id, (int)$_SESSION['player_id'], $type.'_cancel', [
                'other_clan_id' => $other,
                'phase'         => $phase
            ]);
        } elseif ($type === 'war_cancel') {
            clan_log_local($db, $clan_id, (int)$_SESSION['player_id'], 'war_cancel', [
                'other_clan_id' => $other,
                'phase'         => 'request_refused'
            ]);
        }
    }

    header("Location: view.php?page=clan&tab=diplomacy"); exit();
}


if ($diploPostValid && !empty($_POST['acceptAR']) && in_array($_POST['kind'] ?? '', ['alliance','nap'], true)) {
    $agreementType = $_POST['kind'];
    if (!$can_start_alliance) { header("Location: view.php?page=clan&tab=diplomacy"); exit(); }

    $id  = (int)$_POST['acceptAR'];
    $sth = $db->prepare("
        SELECT * FROM clan_diplomacy_request
        WHERE id = :id AND type=:agreement_type AND second_clan_id = :cid
        LIMIT 1
    ");
    $sth->execute([':id'=>$id, ':cid'=>$clan_id, ':agreement_type'=>$agreementType]);
    $req = $sth->fetch();

    if ($req) {
        $other = (int)$req['clan_id'];
        $db->prepare("DELETE FROM clan_diplomacy_request WHERE id=:id")->execute([':id'=>$id]);
        $db->insert('clan_diplomacy', [
            'clan_id'        => $other,
            'second_clan_id' => $clan_id,
            'type'           => $agreementType,
            'message'        => $req['message']
        ]);
        clan_log_local($db, $clan_id, (int)$_SESSION['player_id'], $agreementType.'_accept', [
            'other_clan_id' => $other
        ]);
    }
    header("Location: view.php?page=clan&tab=diplomacy"); exit();
}


if ($diploPostValid && !empty($_POST['acceptAR']) && ($_POST['kind'] ?? '') === 'war_cancel') {
    if (!$can_request_war_cancel) { header("Location: view.php?page=clan&tab=diplomacy"); exit(); }

    $id  = (int)$_POST['acceptAR'];
    $sth = $db->prepare("
        SELECT * FROM clan_diplomacy_request
        WHERE id = :id AND type='war_cancel' AND second_clan_id = :cid
        LIMIT 1
    ");
    $sth->execute([':id'=>$id, ':cid'=>$clan_id]);
    $req = $sth->fetch();

    if ($req) {
        $other = (int)$req['clan_id'];
        
        $db->prepare("DELETE FROM clan_diplomacy_request WHERE id=:id")->execute([':id'=>$id]);
        
        $db->prepare("
            DELETE FROM clan_diplomacy
             WHERE type='war'
               AND ((clan_id=:a AND second_clan_id=:b) OR (clan_id=:b AND second_clan_id=:a))
        ")->execute([':a'=>$clan_id, ':b'=>$other]);

        clan_log_local($db, $clan_id, (int)$_SESSION['player_id'], 'war_cancel', [
            'other_clan_id' => $other,
            'phase'         => 'accepted'
        ]);
    }
    header("Location: view.php?page=clan&tab=diplomacy"); exit();
}


if ($diploPostValid && !empty($_POST['diplo-submit'])) {
    $type = (string)($_POST['diplo_type'] ?? '');
    if (!in_array($type, ['alliance','nap','war'], true)) $form_errors[] = 'Invalid diplomatic relation.';

    
    if (in_array($type, ['alliance','nap'], true) && !$can_start_alliance) { header("Location: view.php?page=clan&tab=diplomacy"); exit(); }
    if ($type === 'war'      && !$can_declare_war)    { header("Location: view.php?page=clan&tab=diplomacy"); exit(); }

    $target  = isset($_POST['target_clan']) ? (int)$_POST['target_clan'] : 0;
    $messageRaw = trim($_POST['diplo_message'] ?? '');
    $message = mb_encode_numericentity($messageRaw, [0x80,0x10ffff,0,0xffffff], "UTF-8");

    
    if ($target <= 0)                                    $form_errors[] = "Clan selection required.";
    if ($messageRaw === '' || strlen($messageRaw) < 12 || strlen($messageRaw) > 120)
                                                        $form_errors[] = "Invalid Message (12-120 characters).";
    if ($target === $clan_id)                            $form_errors[] = "You can't target your own clan.";

    
    $sth = $db->prepare("SELECT id, clan_company FROM clan WHERE id = :id LIMIT 1");
    $sth->execute([':id'=>$target]);
    $t = $sth->fetch();
    if (!$t)                                             $form_errors[] = "Selected clan does not exist.";

    
    if ($type === 'alliance' && $t && (int)$t['clan_company'] !== $clan_company) {
        $form_errors[] = "Alliances are limited to clans from the same company.";
    }

    
    if (in_array($type, ['alliance','nap'], true)) {
        $q = $db->prepare("
            SELECT 1 FROM clan_diplomacy_request
            WHERE type=:agreement_type
              AND ((clan_id=:a AND second_clan_id=:b) OR (clan_id=:b AND second_clan_id=:a))
            LIMIT 1
        ");
        $q->execute([':a'=>$clan_id, ':b'=>$target, ':agreement_type'=>$type]);
        if ($q->fetchColumn()) $form_errors[] = ($type==='nap' ? 'NAP request already pending.' : 'Alliance request already pending.');

        $q = $db->prepare("
            SELECT 1 FROM clan_diplomacy
            WHERE type=:agreement_type
              AND ((clan_id=:a AND second_clan_id=:b) OR (clan_id=:b AND second_clan_id=:a))
            LIMIT 1
        ");
        $q->execute([':a'=>$clan_id, ':b'=>$target, ':agreement_type'=>$type]);
        if ($q->fetchColumn()) $form_errors[] = ($type==='nap' ? 'NAP already active.' : 'Alliance already active.');
    } else {
        $q = $db->prepare("
            SELECT 1 FROM clan_diplomacy
            WHERE type='war'
              AND ((clan_id=:a AND second_clan_id=:b) OR (clan_id=:b AND second_clan_id=:a))
            LIMIT 1
        ");
        $q->execute([':a'=>$clan_id, ':b'=>$target]);
        if ($q->fetchColumn()) $form_errors[] = "You already are at war with this clan.";
    }

    if (empty($form_errors)) {
        if (in_array($type, ['alliance','nap'], true)) {
            $db->insert('clan_diplomacy_request', [
                'clan_id'        => $clan_id,
                'second_clan_id' => $target,
                'type'           => $type,
                'message'        => $message
            ]);
            clan_log_local($db, $clan_id, (int)$_SESSION['player_id'], $type.'_request', [
                'other_clan_id' => $target,
                'message'       => $messageRaw
            ]);
        } else {
            $db->insert('clan_diplomacy', [
                'clan_id'        => $clan_id,
                'second_clan_id' => $target,
                'type'           => 'war',
                'message'        => $message
            ]);
            clan_log_local($db, $clan_id, (int)$_SESSION['player_id'], 'war_declare', [
                'other_clan_id' => $target,
                'message'       => $messageRaw
            ]);
        }
        header("Location: view.php?page=clan&tab=diplomacy"); exit();
    }
}






$sth = $db->prepare("SELECT * FROM clan_diplomacy WHERE clan_id = :cid AND type='alliance'");
$sth->execute([':cid'=>$clan_id]);  $alliancesOut = $sth->fetchAll();

$sth = $db->prepare("SELECT * FROM clan_diplomacy WHERE second_clan_id = :cid AND type='alliance'");
$sth->execute([':cid'=>$clan_id]);  $alliancesIn  = $sth->fetchAll();


$sth = $db->prepare("SELECT * FROM clan_diplomacy WHERE clan_id = :cid AND type='nap'");
$sth->execute([':cid'=>$clan_id]); $napsOut = $sth->fetchAll();
$sth = $db->prepare("SELECT * FROM clan_diplomacy WHERE second_clan_id = :cid AND type='nap'");
$sth->execute([':cid'=>$clan_id]); $napsIn = $sth->fetchAll();

$sth = $db->prepare("SELECT * FROM clan_diplomacy WHERE clan_id = :cid AND type='war'");
$sth->execute([':cid'=>$clan_id]);  $warsOut = $sth->fetchAll();

$sth = $db->prepare("SELECT * FROM clan_diplomacy WHERE second_clan_id = :cid AND type='war'");
$sth->execute([':cid'=>$clan_id]);  $warsIn  = $sth->fetchAll();


$pendingOut = $pendingIn = [];
if ($can_any_diplo) {
    $sth = $db->prepare("SELECT * FROM clan_diplomacy_request WHERE clan_id = :cid");
    $sth->execute([':cid'=>$clan_id]);  $pendingOut = $sth->fetchAll();

    $sth = $db->prepare("SELECT * FROM clan_diplomacy_request WHERE second_clan_id = :cid");
    $sth->execute([':cid'=>$clan_id]);  $pendingIn  = $sth->fetchAll();
}


$clansSameCompany = $allClans = [];
if ($can_start_alliance || $can_declare_war) {
    
    $sth = $db->prepare("SELECT id, clan_tag, clan_name FROM clan WHERE clan_company = :cc ORDER BY clan_tag, clan_name");
    $sth->execute([':cc'=>$clan_company]); $clansSameCompany = $sth->fetchAll();

    
    $sth = $db->prepare("SELECT id, clan_tag, clan_name FROM clan ORDER BY clan_tag, clan_name");
    $sth->execute(); $allClans = $sth->fetchAll();
}
?>
<link rel="stylesheet" type="text/css" href="styles/clan.css?v=2" />

<div class="clan-page">
  <?php if ($form_errors): ?>
    <div class="clan-diplo-notice" role="alert" data-clan-diplomacy-error>
      <?php foreach ($form_errors as $error): ?><p><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p><?php endforeach; ?>
    </div>
  <?php endif; ?>

  <!-- Alliances -->
  <h3 class="clan-section-title">Current Alliances</h3>
  <div class="clan-card" id="clan-alliances">
    <?php
    if (!$alliancesOut && !$alliancesIn) {
        echo '<div class="stat"><div class="stat-right">No alliances.</div></div>';
    }
    foreach ($alliancesOut as $a) {
        $label = clan_label($db, (int)$a['second_clan_id']);
        echo '<div class="stat"><div class="stat-left">Ally</div><div class="stat-right">'
           . htmlspecialchars($label);
        if ($can_cancel_alliance) {
            clan_diplo_action(['cancel'=>(int)$a['id'],'type'=>'alliance'], 'Cancel', 'End alliance', 'End the alliance with '.$label.'?');
        }
        echo '</div></div>';
        if (!empty($a['message'])) {
            echo '<div class="stat" style="margin-top:-4px;"><div class="stat-left">Message</div><div class="stat-rightbis">'
               . clan_diplo_message((string)$a['message']) . '</div></div>';
        }
    }
    foreach ($alliancesIn as $a) {
        $label = clan_label($db, (int)$a['clan_id']);
        echo '<div class="stat"><div class="stat-left">Ally</div><div class="stat-right">'
           . htmlspecialchars($label);
        if ($can_cancel_alliance) {
            clan_diplo_action(['cancel'=>(int)$a['id'],'type'=>'alliance'], 'Cancel', 'End alliance', 'End the alliance with '.$label.'?');
        }
        echo '</div></div>';
        if (!empty($a['message'])) {
            echo '<div class="stat" style="margin-top:-4px;"><div class="stat-left">Message</div><div class="stat-rightbis">'
               . clan_diplo_message((string)$a['message']) . '</div></div>';
        }
    }
    ?>
    <h3 class="clan-diplo-nap-heading">Non-aggression pacts (NAP)</h3>
    <?php
      if (!$napsOut && !$napsIn) echo '<div class="stat"><div class="stat-right">No active non-aggression pacts.</div></div>';
      foreach ([[$napsOut,'second_clan_id'],[$napsIn,'clan_id']] as $direction) {
          foreach ($direction[0] as $nap) {
              $label=clan_label($db,(int)$nap[$direction[1]]);
              echo '<div class="stat"><div class="stat-left">NAP</div><div class="stat-right">'.htmlspecialchars($label,ENT_QUOTES,'UTF-8');
              if ($can_cancel_alliance) clan_diplo_action(['cancel'=>(int)$nap['id'],'type'=>'nap'],'Cancel','End non-aggression pact','End the NAP with '.$label.'?');
              echo '</div></div>';
              if (!empty($nap['message'])) echo '<div class="stat"><div class="stat-left">Message</div><div class="stat-rightbis">'.clan_diplo_message((string)$nap['message']).'</div></div>';
          }
      }
    ?>
  </div>

  <!-- Wars -->
  <h3 class="clan-section-title">Current Wars</h3>
  <div class="clan-card" id="clan-wars">
    <?php
    if (!$warsOut && !$warsIn) {
        echo '<div class="stat"><div class="stat-right">No active wars.</div></div>';
    }
    
    $hasCancelReq = function($a, $b) use ($db) {
        $q=$db->prepare("SELECT 1 FROM clan_diplomacy_request WHERE type='war_cancel' AND ((clan_id=:a AND second_clan_id=:b) OR (clan_id=:b AND second_clan_id=:a)) LIMIT 1");
        $q->execute([':a'=>$a, ':b'=>$b]); return (bool)$q->fetchColumn();
    };

    foreach ($warsOut as $w) {
        $other = (int)$w['second_clan_id'];
        $label = clan_label($db, $other);
        echo '<div class="stat"><div class="stat-left">Enemy</div><div class="stat-right">'
           . htmlspecialchars($label);
        if ($can_request_war_cancel) {
            if ($hasCancelReq($clan_id, $other)) {
                echo ' <span class="leftbutton" style="background:rgba(34,197,94,.25);border-color:rgba(34,197,94,.45);cursor:default;">Cancel requested</span>';
            } else {
                clan_diplo_action(['cancel'=>(int)$w['id'],'type'=>'war'], 'Request peace', 'Request peace', 'Ask '.$label.' to end the war? The war remains active until they accept.');
            }
        }
        echo '</div></div>';
        if (!empty($w['message'])) {
            echo '<div class="stat" style="margin-top:-4px;"><div class="stat-left">Message</div><div class="stat-rightbis">'
               . clan_diplo_message((string)$w['message']) . '</div></div>';
        }
    }
    foreach ($warsIn as $w) {
        $other = (int)$w['clan_id'];
        $label = clan_label($db, $other);
        echo '<div class="stat"><div class="stat-left">Enemy</div><div class="stat-right">'
           . htmlspecialchars($label);
        if ($can_request_war_cancel) {
            if ($hasCancelReq($clan_id, $other)) {
                echo ' <span class="leftbutton" style="background:rgba(34,197,94,.25);border-color:rgba(34,197,94,.45);cursor:default;">Cancel requested</span>';
            } else {
                clan_diplo_action(['cancel'=>(int)$w['id'],'type'=>'war'], 'Request peace', 'Request peace', 'Ask '.$label.' to end the war? The war remains active until they accept.');
            }
        }
        echo '</div></div>';
        if (!empty($w['message'])) {
            echo '<div class="stat" style="margin-top:-4px;"><div class="stat-left">Message</div><div class="stat-rightbis">'
               . clan_diplo_message((string)$w['message']) . '</div></div>';
        }
    }
    ?>
  </div>

  <?php if ($can_any_diplo): ?>
  <!-- Pending requests -->
  <h3 class="clan-section-title">Pending Requests</h3>
  <div class="clan-card" id="clan-pending-alliance">
    <?php
    if (!$pendingOut && !$pendingIn) {
        echo '<div class="stat"><div class="stat-right">No pending requests.</div></div>';
    }
    foreach ($pendingOut as $r) {
        $label = clan_label($db, (int)$r['second_clan_id']);
        $kindTxt = $r['type']==='nap' ? 'NAP' : ($r['type']==='alliance' ? 'Alliance' : 'Peace request');
        $showCancel =
            (in_array($r['type'], ['alliance','nap'], true) && $can_cancel_alliance) ||
            ($r['type']==='war_cancel'&& $can_request_war_cancel);

        echo '<div class="stat"><div class="stat-left">'.htmlspecialchars($kindTxt).'</div><div class="stat-right">'
           . htmlspecialchars($label);
        if ($showCancel) {
            clan_diplo_action(['cancelAR'=>(int)$r['id']], 'Cancel', 'Cancel request', 'Cancel the '.$kindTxt.' request to '.$label.'?');
        }
        echo '</div></div>';
        if (!empty($r['message'])) {
            echo '<div class="stat" style="margin-top:-4px;"><div class="stat-left">Message</div><div class="stat-rightbis">'
               . clan_diplo_message((string)$r['message']) . '</div></div>';
        }
    }
    foreach ($pendingIn as $r) {
        $label = clan_label($db, (int)$r['clan_id']);
        $isAgreement = in_array($r['type'], ['alliance','nap'], true);
        $kindParam = $isAgreement ? $r['type'] : 'war_cancel';
        $kindTxt = $r['type']==='nap' ? 'NAP' : ($r['type']==='alliance' ? 'Alliance' : 'Peace request');

        $canAccept = ($isAgreement && $can_start_alliance) || (!$isAgreement && $can_request_war_cancel);
        $canRefuse = ($isAgreement && $can_cancel_alliance) || (!$isAgreement && $can_request_war_cancel);

        echo '<div class="stat"><div class="stat-left">'.htmlspecialchars($kindTxt, ENT_QUOTES, 'UTF-8').'</div><div class="stat-right">'
           . htmlspecialchars($label);
        if ($canAccept) {
            clan_diplo_action(['acceptAR'=>(int)$r['id'],'kind'=>$kindParam], 'Accept', 'Accept '.$kindTxt, 'Accept the '.$kindTxt.' from '.$label.'?'.($kindParam==='war_cancel' ? ' This ends the war.' : ''));
        }
        if ($canRefuse) {
            clan_diplo_action(['cancelAR'=>(int)$r['id']], 'Refuse', 'Refuse '.$kindTxt, 'Refuse the '.$kindTxt.' from '.$label.'?');
        }
        echo '</div></div>';
        if (!empty($r['message'])) {
            echo '<div class="stat" style="margin-top:-4px;"><div class="stat-left">Message</div><div class="stat-rightbis">'
               . clan_diplo_message((string)$r['message']) . '</div></div>';
        }
    }
    ?>
  </div>

  <!-- New Diplomacy Action -->
  <?php if ($can_start_alliance || $can_declare_war): ?>
  <h3 class="clan-section-title">New Diplomacy Action</h3>
  <div class="clan-card" id="clan-new-diplomacy">
    <?php
    if (!empty($form_errors)) {
        echo '<div class="error"><p class="error">Error(s):<br>';
        foreach ($form_errors as $e) echo '&nbsp;&nbsp;- '.htmlspecialchars($e).'<br>';
        echo '</p></div>';
    }
    ?>
    <form class="clan-form" id="clan-new-diplomacy-form" action="view.php?page=clan&tab=diplomacy" method="post" data-clan-confirm="Send this diplomacy action?" data-clan-confirm-title="Diplomacy" data-clan-confirm-target-selector="select[name=target_clan]">
      <?= clan_request_csrf_field() ?>
      <ul style="list-style:none;padding-left:0;">
        <li>
          <b>Search</b><br>
          <input id="filter-clan" type="text" placeholder="Type to filter the select below…" />
        </li>
        <li style="margin-top:8px;">
          <b>Clan</b><br>
          <select id="target_clan" name="target_clan">
            <?php
            echo '<optgroup label="Same company (for alliances)">';
            foreach ($clansSameCompany as $c) {
                echo '<option value="'.(int)$c['id'].'">['.htmlspecialchars($c['clan_tag']).'] '.htmlspecialchars($c['clan_name']).'</option>';
            }
            echo '</optgroup>';
            echo '<optgroup label="All clans (for NAPs and wars)">';
            foreach ($allClans as $c) {
                echo '<option value="'.(int)$c['id'].'">['.htmlspecialchars($c['clan_tag']).'] '.htmlspecialchars($c['clan_name']).'</option>';
            }
            echo '</optgroup>';
            ?>
          </select>
        </li>
        <li style="margin-top:10px;">
          <b>Type</b><br>
          <label><input type="radio" name="diplo_type" value="alliance" <?= $can_start_alliance ? 'checked' : 'disabled' ?>> Alliance</label>
          &nbsp;&nbsp;
          <label><input type="radio" name="diplo_type" value="nap" <?= $can_start_alliance ? '' : 'disabled' ?>> Non-aggression pact (NAP)</label>
          &nbsp;&nbsp;
          <label><input type="radio" name="diplo_type" value="war" <?= !$can_start_alliance && $can_declare_war ? 'checked' : '' ?> <?= $can_declare_war ? '' : 'disabled' ?>> War</label>
          <p class="clan-diplo-nap-help">A non-aggression pact is a separate agreement. It does not end an active war; use Request peace for that.</p>
        </li>
        <li style="margin-top:10px;">
          <b>Message</b> (12–120 characters):<br>
          <textarea name="diplo_message" rows="3" cols="40"></textarea>
        </li>
        <li style="margin-top:10px;">
          <input type="submit" class="leftbutton" name="diplo-submit" value="Send" />
        </li>
      </ul>
    </form>
  </div>
  <?php endif; ?>
  <?php endif; ?>

</div><!-- /.clan-page -->

<!-- ===================== Filter script ===================== -->
<script src="views/userTabs/jquery.min.js"></script>
<script type="text/javascript">
jQuery.fn.filterByText = function(textbox, selectSingleMatch) {
  return this.each(function() {
    var select = this;
    var options = [];
    $(select).find('option').each(function() {
      options.push({value: $(this).val(), text: $(this).text()});
    });
    $(select).data('options', options);
    $(textbox).bind('change keyup', function() {
      var options = $(select).empty().data('options');
      var search = $(this).val().trim();
      var needle = search.toLowerCase();
      $.each(options, function(i) {
        var option = options[i];
        if(option.text.toLowerCase().indexOf(needle) !== -1) {
          $(select).append($('<option>').text(option.text).val(option.value));
        }
      });
      if (selectSingleMatch === true && $(select).children().length === 1) {
        $(select).children().get(0).selected = true;
      }
    });
  });
};
$(function() {
  $('#target_clan').filterByText($('#filter-clan'), false);
});
</script>
