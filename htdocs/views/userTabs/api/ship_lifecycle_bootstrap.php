<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
session_start();
if(($_SESSION['loggedIn']??false)!==true || (int)($_SESSION['player_id']??0)<1){http_response_code(401);echo json_encode(['error'=>'Authentication required.']);exit;}
$shipPlayerId=(int)$_SESSION['player_id'];
$shipCsrf=(string)($_SESSION['ship_repair_csrf']??'');
session_write_close();
require_once __DIR__.'/../../../config/database.php';
require_once __DIR__.'/../../../libs/ShipRepairService.php';
try {
    $db=new PDO(DB_TYPE.':host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',DB_USER,DB_PASS,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
} catch(Throwable $e){http_response_code(503);echo json_encode(['error'=>'The hangar is temporarily unavailable.']);exit;}

function shipLifecycleError(Throwable $e): void
{
    $safe=['Invalid repair request.','Your ship is already ready.','This repair request belongs to another ship. Refresh the hangar.',
        'Your game session is closing. Please try again shortly.','Not enough Uridium.'];
    $message=in_array($e->getMessage(),$safe,true)?$e->getMessage():'The hangar is temporarily unavailable. Please try again later.';
    if($message!==$e->getMessage())error_log('[Ship lifecycle] '.$e->getMessage());
    http_response_code(in_array($e->getMessage(),$safe,true)?409:503);echo json_encode(['error'=>$message]);
}
