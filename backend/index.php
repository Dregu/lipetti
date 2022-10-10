<?php
error_reporting(0);
ini_set('session.gc_maxlifetime', 30*24*60*60);
ini_set('session.gc_probability', 1);
ini_set('session.gc_divisor', 100);
ini_set('session.cookie_secure', FALSE);
ini_set('session.use_only_cookies', TRUE);
header('Access-Control-Allow-Origin: *');
session_start();

$db_host = 'localhost';
$db_user = 'root';
$db_pass = '';
$db_db = 'kassa';
$db_opts = array(PDO::MYSQL_ATTR_FOUND_ROWS => true, PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8");
$m = new PDO("mysql:host=$db_host;dbname=$db_db", $db_user, $db_pass, $db_opts);

if(isset($_POST['logout'])) {
	session_unset();
	session_destroy();
	exit;
}

if(isset($_POST['user']) && isset($_POST['pass'])) {
	session_unset();
	session_destroy();
	session_start();
	$s = $m->prepare('SELECT tunnus FROM Henkilo WHERE tunnus=? AND passu=PASSWORD(?) AND (hallitus=1 OR admin=1) LIMIT 1');
	$s->execute(array($_POST['user'], $_POST['pass']));
	if($s->rowCount() == 1) {
		$user = $s->fetch(PDO::FETCH_ASSOC);
		$_SESSION['user'] = $user['tunnus'];
		$_SESSION['admin'] = ($_POST['mode']=='1'?true:false);
		$_SESSION['event'] = $_POST['event'];
		$s = $m->prepare('SELECT id,nimi,hinta FROM Tuote ORDER BY id');
		$s->execute(array($uid));
		$items = array();
		while($item = $s->fetch(PDO::FETCH_ASSOC)) {
			$items[] = array('name' => $item['nimi'], 'price' => $item['hinta']);
		}
		header("HTTP/1.0 200 OK");
		header('Content-type: application/json');
		print json_encode($items);
	} else {
		header("HTTP/1.0 401 Unauthorized");
		print 'Sä oot liian kännissä.';
	}
	exit;
}

/*if(!$_SESSION['user']) {
		header("HTTP/1.0 403 Forbidden");
		exit;
}*/

if(isset($_POST['sum']) && isset($_POST['uid'])) {
	$uid = str_pad(@$_POST['uid'], 14, '0');
	$sum = intval($_POST['sum']);
	if(!$_SESSION['admin'] && $sum > 0) {
		header("HTTP/1.0 401 Unauthorized");
		print 'Ei oikeutta ladata.';
		exit;
	}
	$s = $m->prepare('UPDATE Henkilo SET raha=raha+(?) WHERE korttiID=?');
	$s->execute(array($sum, $uid));
	if($s->rowCount() == 1) {
		$s = $m->prepare('INSERT INTO Logi(kortti, summa, viesti) VALUES(?, ?, ?)');
		$s->execute(array($uid, $sum, $_SESSION['event']));
		$s = $m->prepare('SELECT korttiID,nimi,tunnus,raha,hallitus FROM Henkilo WHERE korttiID=? LIMIT 1');
		$s->execute(array($uid));  
		$card = $s->fetch(PDO::FETCH_ASSOC);
		header('Content-type: application/json');
		print json_encode($card);
	} else {
		header("HTTP/1.0 400 Bad Request");
		print 'Transaktio epäonnistui.';
	}
}

else if(isset($_POST['newUser']) && isset($_POST['newPass']) && isset($_POST['newName']) && isset($_POST['newUid'])) {
	if(strlen($_POST['newUid']) == 0) {
		header('HTTP/1.0 400 Bad Request');
		print 'En ymmärrä.';
		exit;
	}
	$uid = str_pad(@$_POST['newUid'], 14, '0');
	$s = $m->prepare('INSERT INTO Henkilo(korttiID, nimi, tunnus, passu, raha, hallitus, admin) VALUES(?,?,?,PASSWORD(?),0,0,0)');
	$s->execute(array($uid, $_POST['newName'], $_POST['newUser'], $_POST['newPass']));
	if($s->rowCount() == 1) {
		header('HTTP/1.0 200 OK');
		print 'Käyttäjä luotu.';
	} else {
		header('HTTP/1.0 409 Conflict');
		print 'Käyttäjä on jo olemassa.';
	}
}

else if(isset($_GET['info'])) {
	$uid = str_pad(@$_GET['info'], 14, '0');
	$s = $m->prepare('SELECT korttiID,nimi,tunnus,raha,hallitus FROM Henkilo WHERE korttiID=? LIMIT 1');
	$s->execute(array($uid));  
	if($s->rowCount() != 1) {
		header("HTTP/1.0 404 Not Found");
		print 'En tunne.';
		exit;
	}
	$card = $s->fetch(PDO::FETCH_ASSOC);
	header('Content-type: application/json');
	print json_encode($card);
}

else if(isset($_GET['log'])) {
	$uid = str_pad(@$_GET['log'], 14, '0');
	$s = $m->prepare('SELECT aika,summa,viesti FROM Logi WHERE kortti=? ORDER BY aika DESC LIMIT 20');
	$s->execute(array($uid));  
	if($s->rowCount() < 1) {
		header("HTTP/1.0 404 Not Found");
		exit;
	}
	$log = '';
	while($row = $s->fetch(PDO::FETCH_ASSOC)) {
		$log .= date('j.n. H:i:s', strtotime($row['aika'])).' '.($row['summa']>0?'+':'').($row['summa']/100)."€\n";
	}
	print $log;
}
