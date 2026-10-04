<?php
require_once __DIR__.'/ShipRepairService.php';

// Both wrappers call this before issuing any authentication ticket. The emulator
// independently takes the same lifecycle lock before loading a playable character.
function requireReadyShipForLaunch(PDO $db,int $playerId): void
{
    try{ShipRepairService::requireReady($db,$playerId);}
    catch(Throwable $e){
        if(isset($_GET['issue_ticket'])){http_response_code(409);header('Content-Type: application/json');header('Cache-Control: no-store');echo json_encode(['error'=>'Return to the hangar before launching.','redirect'=>'/view.php?page=user&tab=infos']);}
        else{header('Location: /view.php?page=user&tab=infos');}
        exit;
    }
}
