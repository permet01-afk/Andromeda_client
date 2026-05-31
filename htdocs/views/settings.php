<?php 



$sth = $db->prepare("SELECT login, email, registerdate FROM users_infos WHERE id = :id LIMIT 1");
$sth->execute(array(':id' => $_SESSION['player_id']));
$datauser = $sth->fetchAll();

$errors = array();

if (!empty($_POST['newign_submit'])) {
    $errors = handleNewIgn($db);
} else if (!empty($_POST['newpw_submit'])) {
    $errors = handleNewPw($db);
} else if (!empty($_POST['newemail_submit'])) {
    $errors = handleNewEmail($db);
}
?>

<style>
    :root {
        --color-surface: #0b1221;
        --color-border: #1e293b;
        --color-accent: #5eead4;
        --color-accent-dim: rgba(94, 234, 212, 0.1);
    }

    .settings-wrapper {
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 1200px;
        margin: 0 auto;
    }

    /* --- GRILLE DES CARTES --- */
    .settings-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); /* Responsive auto */
        gap: 20px;
    }

    /* --- CARTE DE BASE --- */
    .set-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: transform 0.2s, border-color 0.2s;
    }
    
    .set-card:hover {
        border-color: #334155;
    }

    /* Header de carte */
    .set-header {
        background: rgba(15, 23, 42, 0.6);
        padding: 15px 20px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .set-title {
        color: #fff;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    /* Corps de carte */
    .set-body {
        padding: 20px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    /* --- PROFIL (Carte large) --- */
    .profile-full {
        grid-column: 1 / -1; /* Prend toute la largeur */
        background: linear-gradient(90deg, #0b1221 0%, #111827 100%);
    }
    
    .profile-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
    }

    .p-stat-item {
        display: flex;
        flex-direction: column;
        gap: 5px;
        border-left: 2px solid var(--color-accent);
        padding-left: 15px;
    }
    .p-label { color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; }
    .p-val { color: #fff; font-size: 1.1rem; font-weight: 600; font-family: monospace; }

    /* --- FORMULAIRES --- */
    .set-form {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    input[type="text"], input[type="email"], input[type="password"] {
        background: rgba(0,0,0,0.3);
        border: 1px solid var(--color-border);
        padding: 12px;
        color: #fff;
        border-radius: 4px;
        width: 100%;
        box-sizing: border-box;
        transition: 0.2s;
    }
    input[type="text"]:focus, input[type="email"]:focus, input[type="password"]:focus {
        border-color: var(--color-accent);
        outline: none;
        box-shadow: 0 0 10px var(--color-accent-dim);
    }

    input[type="submit"] {
        background: linear-gradient(135deg, #1e293b, #0f172a);
        color: var(--color-accent);
        border: 1px solid var(--color-border);
        padding: 12px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        text-transform: uppercase;
        transition: 0.2s;
    }
    input[type="submit"]:hover {
        background: var(--color-accent);
        color: #000;
        box-shadow: 0 0 15px var(--color-accent-dim);
    }

    /* --- BADGES --- */
    .badge {
        font-size: 0.75rem;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: bold;
        text-transform: uppercase;
    }
    .badge-status { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

    /* --- ERROR BOX --- */
    .error-box {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid #ef4444;
        color: #fca5a5;
        padding: 15px;
        border-radius: 6px;
        margin-bottom: 20px;
    }
    .error-list { margin: 0; padding-left: 20px; }
</style>

<div class="CMSContent settings-wrapper">

    <?php if (sizeof($errors) > 0) : ?>
        <div class="error-box">
            <h4 style="margin:0 0 10px 0; text-transform:uppercase;">System Alert</h4>
            <ul class="error-list">
                <?php foreach ($errors as $err_msg) : ?>
                    <li><?= htmlspecialchars($err_msg, ENT_QUOTES, 'UTF-8') ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>


    <div class="set-card profile-full">
        <div class="set-header">
            <div class="set-title">
                <span style="font-size:1.2em;">👤</span> My Pilot Profile
            </div>
            <div class="badge badge-status">Active</div>
        </div>
        <div class="set-body">
            <div class="profile-stats">
                <div class="p-stat-item">
                    <span class="p-label">Login Name</span>
                    <span class="p-val"><?= htmlspecialchars($datauser[0]['login'] ?? '', ENT_QUOTES, 'UTF-8') ?></span>
                </div>
                <div class="p-stat-item">
                    <span class="p-label">Email Address</span>
                    <span class="p-val"><?= htmlspecialchars($datauser[0]['email'] ?? '', ENT_QUOTES, 'UTF-8') ?></span>
                </div>
                <div class="p-stat-item">
                    <span class="p-label">User ID</span>
                    <span class="p-val"><?= ($_SESSION['player_id'] + 100000) ?></span>
                </div>
                <div class="p-stat-item">
                    <span class="p-label">Registration Date</span>
                    <span class="p-val"><?= htmlspecialchars($datauser[0]['registerdate'] ?? '', ENT_QUOTES, 'UTF-8') ?></span>
                </div>
            </div>
        </div>
    </div>


    <div class="settings-grid">

        <div class="set-card">
            <div class="set-header">
                <div class="set-title">Change Pilot Name</div>
            </div>
            <div class="set-body">
                <form id="newign" action="view.php?page=settings" method="post" class="set-form">
                    <input name="newign_pseudo" type="text" placeholder="New Pilot Name" maxlength="32" required />
                    <input name="newign_repeatpseudo" type="text" placeholder="Confirm Name" maxlength="32" required />
                    <input name="newign_submit" type="submit" value="Update Name" />
                </form>
            </div>
        </div>

        <div class="set-card">
            <div class="set-header">
                <div class="set-title">Change Password</div>
            </div>
            <div class="set-body">
                <form id="newpw" action="view.php?page=settings" method="post" class="set-form">
                    <input name="newpw_oldpassword" type="password" placeholder="Current Password" maxlength="128" required />
                    <input name="newpw_password" type="password" placeholder="New Password" maxlength="128" required />
                    <input name="newpw_passwordRepeat" type="password" placeholder="Confirm New Password" maxlength="128" required />
                    <input name="newpw_submit" type="submit" value="Update Password" />
                </form>
            </div>
        </div>

        <div class="set-card">
            <div class="set-header">
                <div class="set-title">Change Email</div>
            </div>
            <div class="set-body">
                <form id="newemail" action="view.php?page=settings" method="post" class="set-form">
                    <input name="newemail_password" type="password" placeholder="Current Password" maxlength="128" required />
                    <input name="newemail_email" type="email" placeholder="New Email Address" maxlength="128" required />
                    <input name="newemail_repeatemail" type="email" placeholder="Confirm Email" maxlength="128" required />
                    <input name="newemail_submit" type="submit" value="Update Email" />
                </form>
            </div>
        </div>

    </div>

</div>

<?php	



function convertToNumericEntities($string) {
	$convmap = array(0x80, 0x10ffff, 0, 0xffffff);
	return mb_encode_numericentity($string, $convmap, "UTF-8");
}

function hasForbiddenControlChars($value) {
	return preg_match('/[\x00-\x1F\x7F]/u', (string)$value) === 1;
}

function getCurrentPasswordHash($db) {
	$sth = $db->prepare('SELECT password FROM users_infos WHERE id = :id LIMIT 1');
	$sth->execute(array(':id' => (int)$_SESSION['player_id']));
	$row = $sth->fetch(PDO::FETCH_ASSOC);
	return $row && isset($row['password']) ? (string)$row['password'] : '';
}

function verifyCurrentPassword($db, $plainPassword) {
	$storedHash = getCurrentPasswordHash($db);
	if ($storedHash === '' || $plainPassword === '') {
		return false;
	}

	if (password_verify($plainPassword, $storedHash)) {
		return true;
	}

	if (strlen($storedHash) === 32 && ctype_xdigit($storedHash) && hash_equals($storedHash, md5($plainPassword))) {
		$newHash = password_hash($plainPassword, PASSWORD_DEFAULT);
		$update = $db->prepare('UPDATE users_infos SET password = :password WHERE id = :id');
		$update->execute(array(
			':password' => $newHash,
			':id' => (int)$_SESSION['player_id']
		));
		return true;
	}

	return false;
}

function handleNewEmail($db) {
	$errors = array();
	$currentPassword = isset($_POST['newemail_password']) ? (string)$_POST['newemail_password'] : '';
	$email = isset($_POST['newemail_email']) ? trim((string)$_POST['newemail_email']) : '';
	$repeatEmail = isset($_POST['newemail_repeatemail']) ? trim((string)$_POST['newemail_repeatemail']) : '';

	if ($currentPassword === '') { $errors[] = 'Current Password required.'; return $errors; }
	if (!verifyCurrentPassword($db, $currentPassword)) { $errors[] = 'Invalid Current Password.'; return $errors; }
	if ($email === '') { $errors[] = 'Email required.'; return $errors; }
	if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors[] = 'Invalid email.'; return $errors; }
	if ($email !== $repeatEmail) { $errors[] = 'Invalid Email repeat.'; return $errors; }

	$dbEmail = htmlentities(strtolower($email), ENT_QUOTES, 'UTF-8');
	$sth = $db->prepare('SELECT id FROM users_infos WHERE email = :email AND id <> :id LIMIT 1');
	$sth->execute(array(
		':email' => $dbEmail,
		':id' => (int)$_SESSION['player_id']
	));
	if ($sth->fetch(PDO::FETCH_ASSOC)) { $errors[] = 'Email already used.'; return $errors; }

	$update = $db->prepare('UPDATE users_infos SET email = :email WHERE id = :id');
	$update->execute(array(
		':email' => $dbEmail,
		':id' => (int)$_SESSION['player_id']
	));
	header('Location: logout.php'); exit();
}

function handleNewPw($db) {
	$errors = array();
	$oldPassword = isset($_POST['newpw_oldpassword']) ? (string)$_POST['newpw_oldpassword'] : '';
	$newPassword = isset($_POST['newpw_password']) ? (string)$_POST['newpw_password'] : '';
	$newPasswordRepeat = isset($_POST['newpw_passwordRepeat']) ? (string)$_POST['newpw_passwordRepeat'] : '';

	if ($oldPassword === '') { $errors[] = 'Old Password required.'; return $errors; }
	if ($newPassword === '') { $errors[] = 'Password required.'; return $errors; }
	if (strlen($newPassword) < 8) { $errors[] = 'Invalid password (8 characters minimum).'; return $errors; }
	if ($newPassword !== $newPasswordRepeat) { $errors[] = 'Invalid Password repeat.'; return $errors; }
	if (!verifyCurrentPassword($db, $oldPassword)) { $errors[] = 'Invalid Old Password.'; return $errors; }

	$newHash = password_hash($newPassword, PASSWORD_DEFAULT);
	$update = $db->prepare('UPDATE users_infos SET password = :password WHERE id = :id');
	$update->execute(array(
		':password' => $newHash,
		':id' => (int)$_SESSION['player_id']
	));
	header('Location: logout.php'); exit();
}

function handleNewIgn($db) {
	$errors = array();
	if (empty($_POST['newign_pseudo'])) { $errors[] = 'In-Game Name required.'; return $errors; }
	if ($_POST['newign_pseudo'] != $_POST['newign_repeatpseudo']) { $errors[] = 'Invalid In-Game Name repeat.'; return $errors; }
	if (strlen($_POST['newign_pseudo']) > 32 || strlen($_POST['newign_pseudo']) < 3) { $errors[] = 'Invalid In-Game Name (3-32 characters).'; return $errors; }
	if (hasForbiddenControlChars($_POST['newign_pseudo'])) { $errors[] = 'Invalid In-Game Name (control characters are not allowed).'; return $errors; }
	$username = trim($_POST['newign_pseudo']);
	$legacyUsername = convertToNumericEntities(htmlentities($_POST['newign_pseudo'], ENT_QUOTES, 'UTF-8'));
	$sth = $db->prepare('SELECT id FROM users WHERE (username = :username OR username = :legacy_username) AND id <> :id LIMIT 1');
	$sth->execute(array(
		':username' => $username,
		':legacy_username' => $legacyUsername,
		':id' => (int)$_SESSION['player_id']
	));
	if($sth->rowCount() > 0) { $errors[] = 'In-Game Name already used'; return $errors; }

	$update = $db->prepare('UPDATE users SET username = :username WHERE id = :id');
	$update->execute(array(
		':username' => $username,
		':id' => (int)$_SESSION['player_id']
	));
	header('Location: view.php?page=user&tab=infos&'.$_SESSION['player_id']); exit();
}
?>
