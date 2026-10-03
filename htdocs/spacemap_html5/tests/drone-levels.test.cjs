// Production parser and renderer in a Node canvas/transport harness. No DB or real account.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const graphics=fs.readFileSync(path.join(root,'client_graphics.js'),'utf8').replace(/\r\n/g,'\n');
const network=fs.readFileSync(path.join(root,'client_network.js'),'utf8').replace(/\r\n/g,'\n');
function fn(source,name){const a=source.indexOf('function '+name+'('),b=source.indexOf('\n}',a);assert(a>=0&&b>a,name);return source.slice(a,b+2);}
const calls=[],images=[],imageObjects=[];let now=1000,decoded=false;
const c={console,Math,performance:{now:()=>now},window:{},entities:{},heroId:1,getEntityDrawScale:()=>1,mapToScreenX:x=>x,mapToScreenY:y=>y,
 andromedaCreateImage(p){images.push(p);const image={complete:decoded,width:p.includes('havok')?1632:2688,height:p.includes('havok')?51:816,addEventListener(){}};imageObjects.push(image);return image;},
 ctx:{save(){},restore(){},drawImage(...a){calls.push(a);}},getDirectionFrameIndex:a=>Math.floor(a*16/Math.PI)%32};
vm.createContext(c);const run=s=>vm.runInContext(s,c);
run(network.slice(network.indexOf('var DRONE_GROUP_RADIUS'),network.indexOf('function playSfxOnce')));
run(graphics.slice(graphics.indexOf('const DRONE_DIRECTION_FRAME_COUNT'),graphics.indexOf('function isSameMapGroupMemberEntity')));
let checks=0;function ok(v,msg){assert(v,msg);checks++;}
ok(c.getDroneSpriteFrame('iris',0,5).pendingAtlas,'cold atlas remains pending');
c.drawDrones(500,500,c.parseDrones('3/1-25/0/0'),0,0);ok(calls.length===0,'cold atlas never renders invalid geometry');
decoded=true;imageObjects[0].complete=true;
for(const kind of ['iris','flax'])for(let level=0;level<6;level++)for(let frame=0;frame<32;frame++){
 const d=c.getDroneSpriteFrame(kind,frame,level);ok(d&&d.sw>0&&d.sh>0,'native frame exists');
 ok(d.sy===((kind==='iris'?0:6)+level)*68+1&&d.sx===frame*84+1,'correct level/orientation cell');
 ok(d===c.getDroneSpriteFrame(kind,frame,level),'cache identity by type/level/frame');
 ok(Number.isFinite(d.pivotX)&&Number.isFinite(d.pivotY),'native pivot');
 const packet=`3/1-${kind==='iris'?2:1}${level}/0/0`;const connector=c.parseDrones(packet);
 ok(connector.groups[0].drones[0].level===level,'zero-based packet level');
 c.drawDrones(500,500,connector,frame*Math.PI/16,frame);ok(calls.at(-1)[1]===d.sx&&calls.at(-1)[2]===d.sy,'actual draw uses selected model');
}
for(let frame=0;frame<32;frame++)ok(c.getDroneSpriteFrame('havok',frame,0)===c.getDroneSpriteFrame('havok',frame,5),'Havok unchanged across levels');
ok(images.length===2,'one standard atlas and one Havok atlas only');
const old=c.parseDrones('3/1-20/0/0');old.groups[0]._anim.currentRotationDeg=123;const fresh=c.parseDrones('3/1-25,H/0/0');c.transferDroneAnimState(old,fresh);ok(fresh.groups[0]._anim===old.groups[0]._anim,'rotation continuity');
for(const name of ['normalizeDroneDisplayCounts','deriveDroneDisplayCountsFromConnector','handlePacket_n'])run(fn(network,name));
c.getExistingVisualEntity=id=>c.entities[id];
const remote={id:2,x:50,y:80,invisible:true,rage:{active:true},target:99,drones:old};c.entities[2]=remote;c.window.heroDrones=old;
c.handlePacket_n(['n','d','1','3/1-23/0/0'],1);c.handlePacket_n(['n','d','2','3/1-24,H/0/0'],1);
ok(c.window.heroDrones.groups[0].drones[0].level===3,'hero immediate level update');
ok(c.entities[2]===remote&&remote.drones.groups[0].drones[0].level===4,'remote entity retained');
ok(remote.invisible&&remote.rage.active&&remote.target===99&&remote.x===50,'cloak RAGE target movement retained');
ok(remote.drones.groups[0]._anim===old.groups[0]._anim,'remote animation retained');
const result={checks,pass:true,orientations:384,images,transport:'production n|d handler, synthetic entities'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result));
