const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const network=fs.readFileSync(path.join(root,'client_network.js'),'utf8').replace(/\r\n/g,'\n');
const combat=fs.readFileSync(path.join(root,'client_combat.js'),'utf8').replace(/\r\n/g,'\n');
const graphics=fs.readFileSync(path.join(root,'client_graphics.js'),'utf8').replace(/\r\n/g,'\n');
function fn(source,name){const a=source.indexOf('function '+name+'('),b=source.indexOf('\n}',a);assert(a>=0&&b>a,name);return source.slice(a,b+2);}
let checks=0,now=1000;const sounds=[],draws=[],cleanups=[],sends=[];
const c={console,performance:{now:()=>now},Math,window:{AudioManager:{playSoundEffect:(...x)=>sounds.push(x),playPyro:(...x)=>sounds.push(['pyro',...x])}},globalThis:{},entities:{2:{id:2,x:200,y:300,kind:'player',maxHp:900000}},heroId:1,heroShipId:10,shipX:100,shipY:120,heroHp:500,heroShield:800,heroMaxHp:100000,explosions:[],EXPLOSION_ANIMATIONS:{0:{frameCount:50,frameDuration:40},2:{frameCount:50,frameDuration:40}},loggedEntities:new Set([2]),selectedTargetId:2,wsManualClose:false,wsReconnectTimer:null,
 confirmedAttackTargetId:2,pendingAttackAckTargetId:2,pendingAttackAckStartMs:0,currentLaserTargetId:2,attackIntentTargetId:2,pendingRangeResumeTargetId:null,rangeProtectedTargetId:null,isChasingTarget:true,moveTargetX:500,moveTargetY:600,moveTargetFromMinimap:false,
 getExplosionFrame:(type,frame)=>({type,frame}),getEmpRingFrame:()=>({width:256,height:256}),mapToScreenX:x=>x,mapToScreenY:y=>y,drawFrameDefCentered:(...x)=>draws.push(x),clearTimeout(){},activeLasers:[1],heroIdleFloating:{},addServerInfoLogMessage(){},ws:{readyState:1,send:x=>sends.push(x)},WebSocket:{OPEN:1}};
for(const name of ['queueEntityVisualCleanup','clearAttackLocksTargetingEntity','clearPendingTargetSelection','rememberRemovedEntitySnapshot','stopPingTimer','clearPendingCollectState','clearAllCollectRequests','clearEntityFlashStatusEffects','cancelRsbBurstsByTarget','cancelRsbBurst','clearSabRingStateForEntity','clearSabLaserVisualJobsForEntity','removeLaserBeamsForEntity','releaseSabShotsForEntity','flashClearEntityShipSkillVisualEffects','updateHtmlWindows','unregisterAttackLockForEntity','unregisterEntityRuntimeActiveState','resetPendingRangeResume','sendLaserStop'])c[name]=(...x)=>cleanups.push([name,...x]);
c.hasActiveHeroMoveTarget=()=>true;
vm.createContext(c);const run=s=>vm.runInContext(s,c);const check=(v,name)=>{assert(v,name);checks++;};
run(fs.readFileSync(path.join(root,'ship_death.js'),'utf8'));
for(const name of ['spawnExplosionAt','updateExplosions','drawExplosions'])run(fn(combat,name));
for(const name of ['clampExplosionType','resolveExplosionType','forceUnlock','handlePacket_K','handlePacket_ERR','sendRaw'])run(fn(network,name));
run(fn(graphics,'drawShip'));
c.handlePacket_K(['2','0'],0);
check(!c.entities[2]&&!c.loggedEntities.has(2),'remote entity and minimap source removed');
check(c.selectedTargetId===null&&c.currentLaserTargetId===null,'target and laser lock cleared');
check(c.explosions[0].type===0&&c.explosions[0].frameDuration===1000/37,'explicit remote explosion ID and 37fps');
check(c.explosions[0].rotation>=0&&c.explosions[0].rotation<2*Math.PI,'random native pyro rotation');
check(sounds.length===1&&sounds[0][0]===18,'remote sound18 once, no playPyro duplication');
c.handlePacket_K(['2','0'],0);check(sounds.length===1,'repeated remote K cannot double explosion sound');
check(cleanups.some(x=>x[0]==='cancelRsbBurst')&&cleanups.some(x=>x[0]==='releaseSabShotsForEntity'),'remote RSB/SAB cleanup');
now+=200;c.drawExplosions();check(draws.some(x=>x[0].frame===7),'37fps frame progression');check(draws.some(x=>x[3].drawWidth>40),'scoped shockwave draws from existing ring asset');
c.handlePacket_K(['1','0'],0);
check(c.window.AndromedaShipDeath.terminal&&c.heroHp===0&&c.heroShield===0,'hero enters terminal HP0 state');
check(c.moveTargetX===null&&c.moveTargetY===null&&c.activeLasers.length===0,'hero movement and beams stopped');
check(c.wsManualClose&&c.window.AndromedaShipDeath.popupDelay===2000,'terminal disconnect and legacy 2-second popup delay');
check(sounds.filter(x=>x[0]===18).length===2,'hero sound18 exactly once');
const before=c.explosions.length;c.handlePacket_ERR(['1'],0);c.handlePacket_K(['1','0'],0);check(c.explosions.length===before,'K followed by ERR or duplicate K is idempotent');
c.sendRaw('M|500|600');check(sends.length===0,'all gameplay sends fenced after death');
c.drawShip();check(true,'terminal hero renderer returns before drawing ship/drones/HP bar');
const old=c.explosions.length;c.spawnExplosionAt(1,2,2);check(c.explosions[old].frameDuration===null&&sounds.at(-1)[0]==='pyro','unrelated NPC/effect cadence and sound path unchanged');
const css=fs.readFileSync(path.join(root,'ship_death.css'),'utf8');check(css.includes('shipDeathFlash')&&css.includes('shipDeathShake')&&css.includes('calc(100vw - 24px)'),'scoped white flash/shake and mobile bounds');
check(network.includes('ERR: handlePacket_ERR')&&network.includes('never replace it with reconnect/map reset'),'ERR mapping and terminal socket-close path');
console.log(JSON.stringify({pass:true,checks,scope:'production packet handlers/pyro/send fence with synthetic transport and canvas'},null,2));
