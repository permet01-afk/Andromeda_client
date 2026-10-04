<?php
if(($_SERVER['REQUEST_METHOD']??'')!=='GET'){header('Allow: GET');http_response_code(405);header('Content-Type: application/json');echo json_encode(['error'=>'Method not allowed.']);exit;}
require_once __DIR__.'/ship_lifecycle_bootstrap.php';
try{echo json_encode(ShipRepairService::state($db,$shipPlayerId,true),JSON_THROW_ON_ERROR);}catch(Throwable $e){shipLifecycleError($e);}
