<?php
// CLI-only deterministic tests. No session, bootstrap or database connection.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__).'/libs/DroneLevelService.php';
$ref=json_decode(file_get_contents(dirname(__DIR__,2).'/Andromeda-emu source/Tests/DroneLevels.reference.json'),true,512,JSON_THROW_ON_ERROR);
$checks=0;
function verify($actual,$expected,string $label): void { global $checks; if($actual!==$expected)throw new RuntimeException($label.': '.json_encode([$actual,$expected]));$checks++; }
foreach($ref['bonus_vectors'] as $v){
 $iris=['id'=>1,'item_id'=>3,'level'=>$v['level'],'havok'=>false];$flax=['id'=>2,'item_id'=>5,'level'=>$v['level'],'havok'=>true];
 verify(DroneLevelService::roundUnits(DroneLevelService::laserUnits(300,$iris,false)),$v['iris_2lf3'],'Iris level vector');
 verify(DroneLevelService::roundUnits(DroneLevelService::laserUnits(150,$flax,true)),$v['flax_lf3'],'Flax level vector / no Havok');
 verify(DroneLevelService::roundUnits(DroneLevelService::shieldUnits(10000,$iris)),$v['drone_bo2'],'shield level vector');
}
foreach($ref['configuration_vectors'] as $v){
 $iris=['item_id'=>3,'level'=>$v['level']];
 $units=$v['ship_lf3']*150*10000+DroneLevelService::laserUnits($v['drone_lf3']*150,$iris,$v['full_havok']);
 verify(DroneLevelService::roundUnits($units),$v['damage'],'shared total');
 verify($v['ship_lf3']+$v['drone_lf3'],$v['N'],'unchanged N');
}
for($n=0;$n<=8;$n++)for($h=0;$h<=$n;$h++){
 $fleet=[];for($i=1;$i<=$n;$i++)$fleet[]=['id'=>$i,'item_id'=>3,'level'=>1,'havok'=>$i<=$h];
 $fleet[]=['id'=>99,'item_id'=>5,'level'=>6,'havok'=>true];
 verify(DroneLevelService::fullHavok($fleet),$n>0&&$h===$n,'full set based on real owned Iris');
}
verify(DroneLevelService::roundUnits(1815000),182,'half up');
echo "PASS: $checks assertions; shared C#/PHP vectors, no DB.\n";
