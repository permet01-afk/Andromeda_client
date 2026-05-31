<?php 

echo 'Updated <b>';

ini_set('max_execution_time', 300000);
$timestart=microtime(true);
$debug = false; 

$last_active_limit = time() - (3600*14*24);

class Connexion 
{
     
    public static function bdd() {     
        try 
        {
            $bdd = new PDO('mysql:host=127.0.0.1;dbname=andromeda', 'root', '');
            $bdd->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } 
        catch (Exception $e) 
        {
        die('Erreur : '. $e->getMessage());
        }
            return $bdd;
        }
}


$req = Connexion::bdd()->prepare("UPDATE users SET grade=1 WHERE COALESCE(is_admin, 0)=0 AND COALESCE(is_mod, 0)=0 AND (lastlogin < $last_active_limit OR (SELECT count(id) AS is_ban FROM bans WHERE bans.user_id = users.id AND bans.timestamp_expire > UNIX_TIMESTAMP() ) <> 0)");
$req->execute();

// Reset the previous special rank before recalculating all active faction ranks.
// The current best-of-the-three faction generals will receive it again below.
$req = Connexion::bdd()->prepare("UPDATE users SET grade=1 WHERE grade=23 AND COALESCE(is_admin, 0)=0 AND COALESCE(is_mod, 0)=0");
$req->execute();


function edit_rank($id, $rank)
{
	$req = Connexion::bdd()->prepare('UPDATE `users` SET `grade`=:rank WHERE id=:id');
	$req->execute(array('rank' => $rank, 'id' => $id));
}

$rank = array(1 => 10,
				2 => 10,
				3 => 10,
				4 => 10,
				5 => 10,
				6 => 9,
				7 => 8,
				8 => 7,
				9 => 5,
				10 => 4,
				11 => 3,
				12 => 3,
				13 => 2,
				14 => 2,
				15 => 2,
				16 => 2,
				17 => 1.75,
				18 => 1,
				19 => 0.25
			);

function count_users_from_faction($faction_id)
{
	$last_active_limit = time() - (3600*14*24);
	$req = Connexion::bdd()->prepare("SELECT count(id) FROM `users` WHERE lastlogin > $last_active_limit AND (SELECT count(id) AS is_ban FROM bans WHERE bans.user_id = users.id AND bans.timestamp_expire > UNIX_TIMESTAMP() ) = 0 AND COALESCE(is_admin, 0)=0 AND COALESCE(is_mod, 0)=0 AND factionid=:faction_id");
	$req->execute(array('faction_id' => $faction_id));

	$data = $req->fetch();

	return (int)$data[0];
}

function get_users_from_faction($faction_id)
{
	$last_active_limit = time() - (3600*14*24);
	$req = Connexion::bdd()->prepare("SELECT id, username, honor, experience FROM `users` WHERE lastlogin > $last_active_limit AND (SELECT count(id) AS is_ban FROM bans WHERE bans.user_id = users.id AND bans.timestamp_expire > UNIX_TIMESTAMP() ) = 0 AND COALESCE(is_admin, 0)=0 AND COALESCE(is_mod, 0)=0 AND factionid=:faction_id ORDER BY honor DESC, experience DESC, id ASC");
	$req->execute(array('faction_id' => $faction_id));

	$data = $req->fetchAll();

	return $data;
}

function compare_rank_candidates($a, $b)
{
	$honorA = (float)$a['honor'];
	$honorB = (float)$b['honor'];
	if ($honorA != $honorB)
	{
		return ($honorA > $honorB) ? -1 : 1;
	}

	$experienceA = (float)$a['experience'];
	$experienceB = (float)$b['experience'];
	if ($experienceA != $experienceB)
	{
		return ($experienceA > $experienceB) ? -1 : 1;
	}

	$idA = (int)$a['id'];
	$idB = (int)$b['id'];
	if ($idA == $idB)
	{
		return 0;
	}

	return ($idA < $idB) ? -1 : 1;
}

function update_faction_ranks($faction_id, $label, $color, $stats_key, $rank_percentages, $debug = false)
{
	$userslist = array_values(get_users_from_faction($faction_id));
	$activeCount = count($userslist);

	echo "<br/>$label player : $activeCount";
	$req = Connexion::bdd()->prepare("UPDATE server_statistics SET sval=$activeCount WHERE skey='$stats_key'");
	$req->execute();

	if ($activeCount <= 0)
	{
		return null;
	}

	$topFactionUser = $userslist[0];
	$topFactionUser['faction_id'] = $faction_id;
	$topFactionUser['faction_label'] = $label;
	$topFactionUser['faction_color'] = $color;

	echo '<br/><font color="' . $color . '">- ' . $userslist[0]['username']. '</font> set rank 20';
	edit_rank($userslist[0]['id'], 20);
	array_shift($userslist);

	$remainingCount = count($userslist);
	if ($remainingCount <= 0)
	{
		return $topFactionUser;
	}

	$predictcount = 0;
	$rank_percentages = array_reverse($rank_percentages, true);

	foreach ($rank_percentages as $key => $value)
	{
		$predict = $remainingCount / 100 * $value;
		if ($predictcount < $remainingCount)
		{
			$predictcount += ceil($predict);
			$tmp = 0;
			foreach ($userslist as $key2 => $value2)
			{
				if ($tmp < $predict)
				{
					if($debug)
					{
						echo '<br/>- '.$userslist[$key2]['username'].' set rank '.$key;
					}
					edit_rank($userslist[$key2]['id'], $key);
					unset($userslist[$key2]);
					$tmp += 1;
				}
			}
		}
	}

	return $topFactionUser;
}

$topFactionUsers = array();

$topUser = update_faction_ranks(1, 'MMO', 'brown', 'active_MMO', $rank, $debug);
if ($topUser !== null) { $topFactionUsers[] = $topUser; }

$topUser = update_faction_ranks(2, 'EIC', 'blue', 'active_EIC', $rank, $debug);
if ($topUser !== null) { $topFactionUsers[] = $topUser; }

$topUser = update_faction_ranks(3, 'VRU', 'green', 'active_VRU', $rank, $debug);
if ($topUser !== null) { $topFactionUsers[] = $topUser; }

if (count($topFactionUsers) > 0)
{
	usort($topFactionUsers, 'compare_rank_candidates');
	$specialRankUser = $topFactionUsers[0];
	$specialColor = isset($specialRankUser['faction_color']) ? $specialRankUser['faction_color'] : 'gold';
	$specialFaction = isset($specialRankUser['faction_label']) ? $specialRankUser['faction_label'] : 'UNKNOWN';

	echo '<br/><font color="' . $specialColor . '">- ' . $specialRankUser['username']. '</font> set rank 23 (best of faction generals - ' . $specialFaction . ')';
	edit_rank($specialRankUser['id'], 23);
}

echo '<h1 style="color:silver;">Script executed in '.number_format((microtime(true) - $timestart), 3).' seconds</h1>';

?>
