<?php
if(($_SERVER['REQUEST_METHOD']??'')!=='POST'){header('Allow: POST');http_response_code(405);header('Content-Type: application/json');echo json_encode(['error'=>'Method not allowed.']);exit;}
require_once __DIR__.'/ship_lifecycle_bootstrap.php';
$payload=json_decode(file_get_contents('php://input'),true);
if(!is_array($payload) || $shipCsrf==='' || !is_string($payload['csrf']??null) || !hash_equals($shipCsrf,$payload['csrf'])){http_response_code(403);echo json_encode(['error'=>'Please reload the hangar.']);exit;}
if(!is_string($payload['request_id']??null) || !is_string($payload['destruction_id']??null) || !is_int($payload['ship_generation']??null)){http_response_code(400);echo json_encode(['error'=>'Invalid repair request.']);exit;}
try{echo json_encode(ShipRepairService::repair($db,$shipPlayerId,$payload['request_id'],$payload['destruction_id'],$payload['ship_generation']),JSON_THROW_ON_ERROR);}catch(Throwable $e){shipLifecycleError($e);}
