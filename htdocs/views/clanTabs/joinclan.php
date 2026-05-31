<?php
$sth = $db->prepare("SELECT clanid, factionid FROM users WHERE id = :id LIMIT 1");
$sth->execute([
    ':id' => $_SESSION['player_id'],
]);
$datauser = $sth->fetchAll();

if ((int)$datauser[0]['clanid'] !== 0) {
    header("Location: view.php?page=clan&tab=claninfos");
    exit();
}

$company_id = (int)$datauser[0]['factionid'];

$sth = $db->prepare("SELECT * FROM clan WHERE clan_company = :company_id ORDER BY clan_tag ASC, clan_name ASC");
$sth->execute([
    ':company_id' => $company_id,
]);
$clansdata = $sth->fetchAll();

$errors = handleJoinClanForm($db);

if (!empty($_GET['cancel'])) {
    handleCancel($db);
}

$sth = $db->prepare("SELECT * FROM clan_request WHERE player_id = :player_id");
$sth->execute([
    ':player_id' => $_SESSION['player_id'],
]);
$user_requests = $sth->fetchAll();
?>
<div class="clan-page">
    <h3 class="clan-section-title">New Membership Request</h3>
    <div id="clan-request">
        <?php if (sizeof($errors) > 0): ?>
            <div class="error">
                <p class="error">Error(s): <br>
                    <?php foreach ($errors as $err_msg): ?>
                        &nbsp; &nbsp; - <?= htmlspecialchars($err_msg, ENT_QUOTES, 'UTF-8') ?> <br>
                    <?php endforeach; ?>
                </p>
            </div>
        <?php endif; ?>

        <form class="clan-form clan-form--stacked" action="view.php?page=clan&amp;tab=joinclan" method="post">
            <label class="clan-field" for="filter-clan">
                <span class="clan-field-label">Clan</span>
                <input id="filter-clan" type="text" placeholder="Filter clans" autocomplete="off" />
            </label>

            <select id="clan-join-form-clan" name="clan-join-form-clan">
                <?php foreach ($clansdata as $clan): ?>
                    <option value="<?= (int)$clan['id'] ?>">[<?= htmlspecialchars($clan['clan_tag'], ENT_QUOTES, 'UTF-8') ?>] <?= htmlspecialchars($clan['clan_name'], ENT_QUOTES, 'UTF-8') ?></option>
                <?php endforeach; ?>
            </select>

            <label class="clan-field" for="clan-join-form-message">
                <span class="clan-field-label">Request Message <small>(12-120 characters)</small></span>
                <textarea id="clan-join-form-message" name="clan-join-form-message" rows="3" cols="40"></textarea>
            </label>

            <input name="clan-join-form-submit" type="submit" value="Request Membership" />
        </form>
    </div>

    <h3 class="clan-section-title">Pending Requests</h3>
    <div id="clan-pending-request">
        <?php displayClanRequest($db, $user_requests); ?>
    </div>
</div>

<script type="text/javascript">
(function() {
    var input = document.getElementById('filter-clan');
    var select = document.getElementById('clan-join-form-clan');
    if (!input || !select) return;

    var options = Array.prototype.map.call(select.options, function(option) {
        return { value: option.value, text: option.text };
    });

    input.addEventListener('input', function() {
        var query = input.value.trim().toLowerCase();
        select.innerHTML = '';

        options.forEach(function(optionData) {
            if (query && optionData.text.toLowerCase().indexOf(query) === -1) {
                return;
            }
            var option = document.createElement('option');
            option.value = optionData.value;
            option.textContent = optionData.text;
            select.appendChild(option);
        });
    });
})();
</script>

<?php
function convertToNumericEntities($string)
{
    $convmap = [0x80, 0x10ffff, 0, 0xffffff];
    return mb_encode_numericentity($string, $convmap, "UTF-8");
}

function handleJoinClanForm($db)
{
    $errors = [];
    if (empty($_POST['clan-join-form-submit'])) {
        return $errors;
    }

    if (empty($_POST['clan-join-form-clan'])) {
        $errors[] = "Clan selection required.";
    }

    if (empty($_POST['clan-join-form-message'])) {
        $errors[] = "Message required.";
    } elseif (strlen($_POST['clan-join-form-message']) > 120 || strlen($_POST['clan-join-form-message']) < 12) {
        $errors[] = "Invalid Message (12-120 characters).";
    }

    if (sizeof($errors) > 0) {
        return $errors;
    }

    $select = (int)$_POST['clan-join-form-clan'];
    $message = convertToNumericEntities(htmlentities($_POST['clan-join-form-message']));

    $sth = $db->prepare("SELECT * FROM clan WHERE id = :id");
    $sth->execute([
        ':id' => $select,
    ]);
    if ($sth->rowCount() === 0) {
        $errors[] = "Selected clan does not exist.";
    }

    $sth = $db->prepare("SELECT * FROM clan_request WHERE player_id = :player_id AND clan_id = :clan_id");
    $sth->execute([
        ':player_id' => $_SESSION['player_id'],
        ':clan_id' => $select,
    ]);
    if ($sth->rowCount() > 0) {
        $errors[] = "You already made a request for this clan.";
    }

    if (sizeof($errors) > 0) {
        return $errors;
    }

    $db->insert('clan_request', [
        'player_id' => $_SESSION['player_id'],
        'clan_id' => $select,
        'message' => $message,
    ]);

    header("Location: view.php?page=clan&tab=joinclan");
    exit();
}

function displayClanRequest($db, $user_requests)
{
    if (empty($user_requests)) {
        echo '<div class="clan-message"><em>No pending request.</em></div>';
        return;
    }

    foreach ($user_requests as $request) {
        $id = (int)$request['id'];
        $sth = $db->prepare("SELECT clan_tag, clan_name FROM clan WHERE id = :clan_id");
        $sth->execute([
            ':clan_id' => $request['clan_id'],
        ]);
        $clan_data = $sth->fetchAll();
        if (empty($clan_data)) {
            continue;
        }
        $clan_tag = $clan_data[0]['clan_tag'];
        $clan_name = $clan_data[0]['clan_name'];
        ?>
        <div class="stat">
            <div class="stat-left">
                [<?= htmlspecialchars($clan_tag, ENT_QUOTES, 'UTF-8') ?>]
            </div>
            <div class="stat-right">
                <?= htmlspecialchars($clan_name, ENT_QUOTES, 'UTF-8') ?>
                <a class="leftbutton" href="view.php?page=clan&amp;tab=joinclan&amp;cancel=<?= $id ?>">
                    Cancel
                </a>
            </div>
        </div>
        <?php
    }
}

function handleCancel($db)
{
    $id = (int)$_GET['cancel'];
    $sth = $db->prepare("DELETE FROM clan_request WHERE id = :id AND player_id = :player_id");
    $sth->execute([
        ':id' => $id,
        ':player_id' => $_SESSION['player_id'],
    ]);

    header("Location: view.php?page=clan&tab=joinclan");
    exit();
}
?>
