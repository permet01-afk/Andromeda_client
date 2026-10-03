<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST'); http_response_code(405); echo json_encode(['error'=>'Method not allowed.']); exit;
}
require_once __DIR__.'/bootstrap.php';
require_once __DIR__.'/../../../libs/DroneWearService.php';
$payload=json_decode(file_get_contents('php://input'),true);
if (!is_array($payload) || empty($_SESSION['drone_repair_csrf']) || !is_string($payload['csrf'] ?? null)
    || !hash_equals($_SESSION['drone_repair_csrf'],$payload['csrf'])) {
    http_response_code(403); echo json_encode(['error'=>'Please reload the equipment page.']); exit;
}
if (!is_int($payload['drone_id'] ?? null) || !is_int($payload['equipment_version'] ?? null) || !is_string($payload['request_key'] ?? null)) {
    http_response_code(400); echo json_encode(['error'=>'Invalid repair request.']); exit;
}
try {
    echo json_encode(DroneWearService::repair($db,(int)$_SESSION['player_id'],$payload['drone_id'],$payload['request_key'],$payload['equipment_version']),JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    $safe=['Invalid repair request.','Disconnect from the spacemap before repairing a drone.','Equipment changed. Refresh before repairing.',
        'Drone not found.','Drone is already fully repaired.','This drone cannot be repaired.','Not enough Uridium.','Not enough Credits.'];
    $message=in_array($e->getMessage(),$safe,true)?$e->getMessage():'Drone repair is unavailable. Please try again later.';
    if ($message!==$e->getMessage()) error_log('[Drone repair] '.$e->getMessage());
    http_response_code(in_array($e->getMessage(),$safe,true)?409:503);
    echo json_encode(['error'=>$message]);
}
