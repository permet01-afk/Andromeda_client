<?php 
	session_start();
	
	
	if(isset($_SESSION['loggedIn']) and $_SESSION['loggedIn'] == "true") 
	{
		header('Location: view.php?page=home');
		exit();
	}
	
	if(!isset($_SESSION['terms_of_use']) || $_SESSION['terms_of_use'] != true)
	{
		header('Location: index.php');
		exit();
	}

	ob_start();

	include 'libs/database.php';
	include 'config/database.php';

	$db = new Database(DB_TYPE, DB_HOST, DB_NAME, DB_USER, DB_PASS);
	
	
	$sth = $db->prepare("SELECT * FROM users_infos WHERE id=:id");
	$sth->execute(array(':id' => $_SESSION['player_id']));
	$user_infos = $sth->fetchAll();
	
	
	if(isset($user_infos[0]['is_verified']) && $user_infos[0]['is_verified'] >= 1)
	{
		$_SESSION['loggedIn'] = true; 
		header('Location: view.php?page=home');
		exit();
	}
	
	$errors = array();
	$success_key = ""; 
		
	function generateRandomString($length = 16) 
	{
		$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
		$charactersLength = strlen($characters);
		$randomString = '';
		for ($i = 0; $i < $length; $i++) {
			$randomString .= $characters[rand(0, $charactersLength - 1)];
		}
		return $randomString;
	}
	
	
	if((isset($_GET['action']) && $_GET['action'] == 'send') || !empty($_POST['resend_submit']))
	{
		$key = generateRandomString();			
		
		$db->update('users_infos', array(
			'key' => $key
			),
			'id='.$_SESSION['player_id']
			);	
		
		
		$success_key = $key;
	}
	
	
	if(!empty($_POST['verify_submit']) && !empty($_POST['verify_key']))
	{
		
		
		if(!empty($_POST['robot_check'])) {
			die("Security Alert: Bot detected.");
		}

		
		if($_POST['verify_key'] == $user_infos[0]['key'])	
		{
			$db->update('users_infos', array(
			'is_verified' => 1
			),
			'id='.$_SESSION['player_id']
			);
			$_SESSION['loggedIn'] = true; 
			header('Location: view.php?page=home');
			exit();
		}
		else
		{
			$errors[] = 'Invalid key. Please verify and try again.';	
		}		
	}	
 ?>	
 <!DOCTYPE html>
 <html lang="en">
 <head>
	 <meta charset="utf-8">
	 <title>Security Check • Andromeda</title>
	 <style>
		:root {
			--color-bg: #020407;
			--color-surface: #0b1221;
			--color-border: #1e293b;
			--color-accent: #5eead4;
			--color-accent-dim: rgba(94, 234, 212, 0.1);
			--color-text: #e2e8f0;
			--color-text-muted: #64748b;
			--color-error: #ef4444;
			--color-success: #10b981;
		}

		body {
			background: radial-gradient(circle at center, #111827 0%, var(--color-bg) 100%);
			color: var(--color-text);
			font-family: "Segoe UI", sans-serif;
			margin: 0;
			height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.verify-card {
			background: var(--color-surface);
			border: 1px solid var(--color-border);
			border-radius: 8px;
			padding: 2rem;
			width: 100%;
			max-width: 450px;
			box-shadow: 0 20px 50px rgba(0,0,0,0.5);
			text-align: center;
			position: relative;
			overflow: hidden;
		}

		.verify-card::before {
			content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 4px;
			background: linear-gradient(90deg, var(--color-accent), #3b82f6);
		}

		h1 {
			color: var(--color-accent);
			font-size: 1.5rem;
			margin-bottom: 0.5rem;
			text-transform: uppercase;
			letter-spacing: 1px;
		}

		p { color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 2rem; line-height: 1.5; }

		.input-group { margin-bottom: 1.5rem; text-align: left; }
		
		input[type="text"] {
			width: 100%;
			background: rgba(0,0,0,0.3);
			border: 1px solid var(--color-border);
			padding: 12px;
			color: #fff;
			border-radius: 4px;
			font-family: monospace;
			font-size: 1.1rem;
			text-align: center;
			letter-spacing: 2px;
			transition: all 0.2s;
			box-sizing: border-box; 
		}
		input[type="text"]:focus {
			border-color: var(--color-accent);
			outline: none;
			box-shadow: 0 0 10px var(--color-accent-dim);
		}

		/* Style pour le Honeypot (Invisible) */
		.security-field {
			display: none; 
			visibility: hidden;
			opacity: 0;
			position: absolute;
			left: -9999px;
		}

		.btn {
			width: 100%;
			padding: 12px;
			border: none;
			border-radius: 4px;
			font-weight: bold;
			text-transform: uppercase;
			cursor: pointer;
			transition: all 0.2s;
			font-size: 0.9rem;
		}

		.btn-primary {
			background: linear-gradient(135deg, var(--color-accent), #2dd4bf);
			color: #020407;
			box-shadow: 0 4px 15px rgba(94, 234, 212, 0.3);
		}
		.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(94, 234, 212, 0.4); }

		.btn-secondary {
			background: transparent;
			border: 1px solid var(--color-border);
			color: var(--color-text-muted);
			margin-top: 1rem;
		}
		.btn-secondary:hover { border-color: var(--color-text); color: var(--color-text); }

		.msg-box {
			padding: 10px;
			border-radius: 4px;
			margin-bottom: 1.5rem;
			font-size: 0.9rem;
		}
		.msg-error { background: rgba(239, 68, 68, 0.1); color: var(--color-error); border: 1px solid var(--color-error); }
		
		/* Boite spéciale pour afficher la clé */
		.msg-success-key { 
			background: rgba(16, 185, 129, 0.1); 
			color: var(--color-success); 
			border: 1px dashed var(--color-success);
			padding: 15px;
			word-break: break-all;
		}
		.key-display {
			display: block;
			font-size: 1.4rem;
			font-weight: bold;
			margin-top: 5px;
			font-family: monospace;
			color: #fff;
			user-select: all; /* Facilite la copie */
		}

	 </style>
 </head>
 <body>
	
	<div class="verify-card">
		<h1>Account Verification</h1>
		<p>Security protocol initiated. Please authenticate manually.</p>

		<?php if (sizeof($errors) > 0): ?>
			<div class="msg-box msg-error">
				<?php foreach ($errors as $err_msg) { echo $err_msg . "<br>"; } ?>
			</div>
		<?php endif; ?>

		<?php if (!empty($success_key)): ?>
			<div class="msg-box msg-success-key">
				GENERATED KEY:<br>
				<span class="key-display"><?= $success_key ?></span>
				<br><span style="font-size:0.8em; opacity:0.7;">(Please copy this code manually)</span>
			</div>
		<?php endif; ?>

		<form id="verification" action="verify.php" method="post">
			
			<input type="text" name="robot_check" class="security-field" tabindex="-1" autocomplete="off">

			<div class="input-group">
				<input name="verify_key" type="text" placeholder="PASTE KEY HERE" maxlength="32" required autocomplete="off" />
			</div>
			
			<button name="verify_submit" type="submit" class="btn btn-primary" value="Verify">Activate Account</button>
		</form>

		<form id="resend" action="verify.php?action=send" method="post">
			<button type="submit" class="btn btn-secondary">Generate Authentication Key</button>
		</form>
		
		<div style="margin-top: 1.5rem; font-size: 0.8rem; color: var(--color-text-muted);">
			ID: <?= $_SESSION['player_id'] ?> &bull; Email: <?= htmlspecialchars($user_infos[0]['email']) ?>
		</div>
	</div>

 </body>
 </html>
 <?php 
	ob_end_flush();
 ?>