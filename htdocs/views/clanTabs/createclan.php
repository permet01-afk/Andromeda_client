<?php 
$sth = $db->prepare("SELECT clanid FROM users WHERE id = :id LIMIT 1");
$sth->execute(array(
    ':id' => $_SESSION['player_id']
));
$datauser = $sth->fetchAll();

if($datauser[0]['clanid'] > 0)
{
    $errors = array();    
    $errors[] = "You cannot create a clan while you are in a clan.";    
}
else
{
    $errors = handleCreateClanForm($db);
}
?>

<div class="clan-page">
    <h3 class="clan-section-title">Create a New Clan</h3>
    <div class="clan-section-note">Cost: <span class="text-info">1,000,000</span> Credits</div>

    <div id="clan-create">
        <?php if (sizeof($errors) > 0): ?>
            <div class="error">
                <p class="error">Error(s):<br>
                    <?php foreach ($errors as $err_msg): ?>
                        &nbsp;&nbsp;- <?= htmlspecialchars($err_msg, ENT_QUOTES, 'UTF-8') ?><br>
                    <?php endforeach; ?>
                </p>
            </div>
        <?php endif; ?>

        <form class="clan-form clan-form--stacked" action="view.php?page=clan&amp;tab=createclan" method="post">
            <label class="clan-field" for="clan-create-form-tag">
                <span class="clan-field-label">Clan's Tag <small>(2-4 characters)</small></span>
                <input id="clan-create-form-tag" name="clan-create-form-tag" type="text" maxlength="4" autocomplete="off">
            </label>

            <label class="clan-field" for="clan-create-form-name">
                <span class="clan-field-label">Clan's Name <small>(5-20 characters)</small></span>
                <input id="clan-create-form-name" name="clan-create-form-name" type="text" maxlength="20" autocomplete="off">
            </label>

            <label class="clan-field" for="clan-create-form-description">
                <span class="clan-field-label">Clan's Description <small>(12-120 characters)</small></span>
                <textarea id="clan-create-form-description" name="clan-create-form-description" rows="3" cols="40"></textarea>
            </label>

            <input name="clan-create-form-submit" type="submit" value="Create Clan">
        </form>
    </div>
</div>

<?php 
function convertToNumericEntities($string) 
{
    $convmap = array(0x80, 0x10ffff, 0, 0xffffff);
    return mb_encode_numericentity($string, $convmap, "UTF-8");
}

function hasForbiddenControlChars($value)
{
    return preg_match('/[\x00-\x1F\x7F]/u', (string)$value) === 1;
}

function handleCreateClanForm($db)
{
    $errors = array();    
    if (empty($_POST['clan-create-form-submit']))
    {
        return $errors;
    }
    if (empty($_POST['clan-create-form-tag']))
    {
        $errors[] = "Clan's Tag required.";    
    }
    else if ( !preg_match('/^[A-Za-z0-9]{2,4}$/', $_POST['clan-create-form-tag'])) 
    {
        $errors[] = "Invalid Clan's Tag (2-4 characters, letters and numbers only).";        
    }
    if (empty($_POST['clan-create-form-name']))
    {
        $errors[] = "Clan's Name required.";    
    }
    else if (strlen($_POST['clan-create-form-name']) > 20 || strlen($_POST['clan-create-form-name']) < 5) 
    {
        $errors[] = "Invalid Clan's Name (5-20 characters).";    
    }
    if (empty($_POST['clan-create-form-description']))
    {
        $errors[] = "Clan's Description required.";    
    }
    else if (strlen($_POST['clan-create-form-description']) > 120 || strlen($_POST['clan-create-form-description']) < 12) 
    {
        $errors[] = "Invalid Clan's Description (12-120 characters).";    
    }
    if (hasForbiddenControlChars($_POST['clan-create-form-tag'] ?? '') || hasForbiddenControlChars($_POST['clan-create-form-name'] ?? '') || hasForbiddenControlChars($_POST['clan-create-form-description'] ?? ''))
    {
        $errors[] = "Control characters are not allowed.";
    }
    
    if (sizeof($errors) > 0) 
    {        
        return $errors;
    }
    
    $sth = $db->prepare("SELECT credits FROM users WHERE id = :id LIMIT 1");
    $sth->execute(array(
                    ':id' => $_SESSION['player_id']
                ));
    $datauser = $sth->fetchAll();
    
    
    if($datauser[0]['credits'] < 1000000)
    {
        $errors[] = "Not enough credits.";    
    }    
    
    $tag = trim($_POST['clan-create-form-tag']);
    $name = trim($_POST['clan-create-form-name']);
    $description = trim($_POST['clan-create-form-description']);

    $legacyTag = convertToNumericEntities(htmlentities($_POST['clan-create-form-tag']));
    $legacyName = convertToNumericEntities(htmlentities($_POST['clan-create-form-name']));
    
    $sth = $db->prepare("SELECT clan_tag FROM clan WHERE clan_tag = :clan_tag OR clan_tag = :legacy_clan_tag");
    $sth->execute(array(
        ':clan_tag' => $tag,
        ':legacy_clan_tag' => $legacyTag
    ));
    $count = $sth->rowCount();
    if($count > 0)
    {
        $errors[] = "Clan's Tag already in use.";    
    }
    
    $sth = $db->prepare("SELECT clan_name FROM clan WHERE clan_name = :clan_name OR clan_name = :legacy_clan_name");
    $sth->execute(array(
        ':clan_name' => $name,
        ':legacy_clan_name' => $legacyName
    ));
    $count = $sth->rowCount();
    if($count > 0)
    {
        $errors[] = "Clan's Name already in use.";    
    }
    
    if (sizeof($errors) > 0) 
    {        
        return $errors;
    }
    else
    {
        
        $req = $db->prepare('UPDATE users SET credits = credits - 1000000 WHERE id = :id');
        $req->execute(array(':id' => $_SESSION['player_id']));
        
        $sth = $db->prepare("SELECT factionid FROM users WHERE id = :id LIMIT 1");
        $sth->execute(array(
                        ':id' => $_SESSION['player_id']
                    ));
        $datauser = $sth->fetchAll();

        $company = $datauser[0]['factionid'];
                    
        $db->insert('clan', array(
            'clan_company' => $company,
            'clan_tag' => $tag,
            'clan_name' => $name,
            'clan_description' => $description,
            'admin_id' => $_SESSION['player_id']
            ));
            
        $sth = $db->prepare("DELETE FROM `clan_request` WHERE player_id =:player_id");
        $sth->execute(array(':player_id' => $_SESSION['player_id']));
            
        $returnvalue = $db->select('SELECT id FROM clan WHERE admin_id= :id', array('id' => $_SESSION['player_id']));
        $db->update('users', array(
            'clanid' => $returnvalue[0]['id']
            ),
            'id=' . (int)$_SESSION['player_id']
            );
        
        header("Location: view.php?page=clan&tab=claninfos");
        exit();
    }        
    return $errors;
}
?>
