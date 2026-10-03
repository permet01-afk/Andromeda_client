// Node-only protocol/render-logic tests. No server, account, SQL or browser automation.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const sources = Object.fromEntries(['config','network','combat','graphics'].map(n => [n,fs.readFileSync(path.join(root, `client_${n}.js`),'utf8').replace(/\r\n/g,'\n')]));
function fn(file,name) { const s=sources[file],a=s.indexOf(`function ${name}(`),b=s.indexOf('\n}',a); assert(a>=0&&b>a,name); return s.slice(a,b+2); }
const cases=[];
function test(name,action) { action(); cases.push({name,result:'PASS'}); }
const ctx={console,window:{},entities:{},heroId:1,heroShipId:10,heroAngle:0,heroExpansionTypeId:1,heroLaserSalvoIndex:0,SHIP_SPRITE_DEFS:{},EXPANSION_PATTERNS:{},SHIP_EXPANSION_CLASS:{},SHIP_EXPANSION_CLASS_OVERRIDES:{17:8},performance:{now:()=>1000}};
vm.createContext(ctx);
const run=s=>vm.runInContext(s,ctx);
const use=(f,n)=>run(fn(f,n));
use('config','buildShipExpansionFolderAtlasManifestMap');
const raw=[];
for(const dir of fs.readdirSync(path.join(root,'graphics/expansions'))) {
    const p=path.join(root,'graphics/expansions',dir,'expansion_atlas_v1.json');
    if(fs.existsSync(p))raw.push({...JSON.parse(fs.readFileSync(p,'utf8')),basePath:`graphics/expansions/${dir}/`});
}
ctx.SHIP_EXPANSION_ATLAS_MANIFEST_DEFS=ctx.buildShipExpansionFolderAtlasManifestMap(raw);
run(sources.config.slice(sources.config.indexOf('const SHIP_EXPANSION_ASSETS ='),sources.config.indexOf('const ENGINE_ANIM_FPS')));
ctx.defs=run('SHIP_EXPANSION_DEFS');ctx.assets=run('SHIP_EXPANSION_ASSETS');
for(const n of ['getShipExpansionClass','getMaxExpansionStageForClass','getMaxExpansionStageForShip','getExpansionPattern','getDirectionFrameIndex','getFrameNumbersForDef','getShipExpansionFrameCacheKey'])use('config',n);
for(const n of ['resolveExpansionStage','applyExpansionStage','handlePacket_expansionStage','captureLaserSalvo','resolveLaserSalvoOffsets'])use('network',n);
ctx.shouldForceSingleCenterNpcLaser=()=>false;
const xml=fs.readFileSync(path.resolve(root,'../spacemap/xml/game.xml'),'utf8').replace(/<!--[\s\S]*?-->/g,'');
const patterns={};
for(const [,id,body] of xml.matchAll(/<expansion\s+class="(\d+)"[^>]*>([\s\S]*?)<\/expansion>/g)) {
    const positions={};for(const [,name,data] of body.matchAll(/<positionsList\s+name="([^"]+)"\s+data="([^"]*)"/g)){
        const nums=data.split(',').map(Number);positions[name]=Array.from({length:nums.length/2},(_,i)=>({x:nums[2*i],y:nums[2*i+1]}));
    }
    patterns[id]={};for(const [,stage,text] of body.matchAll(/<stage\s+id="(\d+)"[^>]*>([\s\S]*?)<\/stage>/g)){
        const salvosData=[...text.matchAll(/<salvo\s+laser="([^"]+)"/g)].map(m=>m[1].split(',').map(n=>positions[n.trim()]));
        patterns[id][stage]={salvosData};
    }
}
ctx.EXPANSION_PATTERNS=patterns;
const supported=[1,3,4,5,6,7,8,9,10,17,18,56,59,63,64,65,66,67];
const sequences={1:[[1],[2],[2,1,2,1]],3:[[1],[2],[2,1,2,1]],4:[[1],[2],[2,1,2,1]],5:[[1],[2],[2,1,2,1]],6:[[1],[2],[2,1,2,1]],7:[[1],[2],[2,1,2,1]],8:[[1],[2],[2,1,2,1]],9:[[1],[2],[2,1,2,1]],10:[[1],[2,1,2,1],[2,3,2,3]],18:[[1],[2],[2,1,2,1,2]],56:[[1],[2,1,2,1],[2,3,2,3]],63:[[1],[1,1],[2,1,2,1]],64:[[1],[1,1],[2,1,2,1,2,1,2,1]],65:[[1],[1,1],[2,1,2,1,2,1,2,1]],66:[[1],[1,1],[2,1,2,1,2,1,2,1]],67:[[1],[1,1],[2,1,2,1,2,1,2,1]]};
test('18 ships, invalid/unknown stage fallback and preservation before XML arrives',()=>{
    assert.deepEqual(Object.keys(ctx.defs).map(Number),supported);
    for(const id of supported)for(const stage of [1,2,3])assert.equal(ctx.resolveExpansionStage(stage,id),stage);
    for(const v of [-2,0,null,undefined,NaN,'oops',1.5,'2oops'])assert.equal(ctx.resolveExpansionStage(v,10),1);
    assert.equal(ctx.resolveExpansionStage(4,10),3);
    for(const id of [2,58,999,0]){assert.equal(ctx.resolveExpansionStage(3,id),1);assert.equal(ctx.getShipExpansionDef(id,3),null);}
    const old=ctx.EXPANSION_PATTERNS;ctx.EXPANSION_PATTERNS={};assert.equal(ctx.resolveExpansionStage(2,10),2);ctx.EXPANSION_PATTERNS=old;
});
test('All complete cycles, both repetitions, 18 ships x 3 stages x 32 orientations',()=>{
    for(const shipId of supported)for(let stage=1;stage<=3;stage++)for(let frame=0;frame<32;frame++){
        ctx.heroShipId=shipId;ctx.heroAngle=(frame+.001)*Math.PI/16;
        ctx.entities[1]={id:1,shipId,kind:'player'};ctx.applyExpansionStage(ctx.entities[1],stage);
        const state=ctx.captureLaserSalvo(1,{shipId},{allowOffsets:true},stage);
        const expected=sequences[ctx.defs[shipId].expansionClass][stage-1];
        assert.equal(state.frame,frame);
        for(let pulse=0;pulse<expected.length*2;pulse++){
            const actual=ctx.resolveLaserSalvoOffsets(1,{shipId},{allowOffsets:true},state);
            assert.equal(actual.length,expected[pulse%expected.length],`${shipId}/${stage}/${frame}/${pulse}`);
            const golden=patterns[ctx.defs[shipId].expansionClass][stage].salvosData[pulse%expected.length];
            actual.forEach((p,i)=>{assert.equal(p.x,golden[i][frame].x+state.registration.x);assert.equal(p.y,golden[i][frame].y+state.registration.y);});
        }
    }
});
test('Stage updates preserve entity identity, target, drones, cloak, effects, timers and positions',()=>{
    const e={id:1,shipId:10,x:111,y:222,target:2,drones:{groups:[1,2]},rageEffect:{start:1},invisible:true,shieldUntil:44,ela:{start:3},brb:{end:55},_idleFloating:{offsetY:2}};
    ctx.entities[1]=e;const fields={...e};
    for(const stage of [1,2,3,1,3,2,1]){ctx.handlePacket_expansionStage(['1',String(stage)],0);assert.strictEqual(ctx.entities[1],e);assert.equal(ctx.heroExpansionTypeId,stage);for(const k in fields)assert.strictEqual(e[k],fields[k]);}
    ctx.handlePacket_expansionStage(['999','3'],0);assert.equal(ctx.entities[999],undefined);
});
test('Stage1 removes overlay; asset keys separate stages and share only same source',()=>{
    for(const id of supported){assert.equal(ctx.getShipExpansionDef(id,1),null);for(const st of [2,3])for(let f=0;f<32;f++){
        const def=ctx.getShipExpansionDef(id,st);assert(def);assert.equal(def.frameCount,32);assert.equal(def.nativeOrigins.length,32);
        assert.notEqual(ctx.getShipExpansionFrameCacheKey(id,f,2),ctx.getShipExpansionFrameCacheKey(id,f,3));
        // Cache-busting query parameters belong to the URL, not the disk filename.
        const assetPath = (def.atlasPath || def.basePath+'1.png').split('?')[0];
        assert(fs.existsSync(path.join(root,assetPath)), `Missing expansion asset: ${assetPath}`);
    }}
    assert(ctx.getShipExpansionDef(8,2).source.startsWith('unknown:ship8_'));
    assert.equal(ctx.getShipExpansionDef(17,2),ctx.getShipExpansionDef(8,2));
    assert(ctx.getShipExpansionDef(56,3).source.endsWith('ship10_Ecombat'));assert.equal(ctx.getShipExpansionDef(56,3),ctx.getShipExpansionDef(59,3));
});
test('Delayed burst keeps captured stage and frame after A/B update',()=>{
    ctx.entities[1]={id:1,shipId:10,kind:'player'};ctx.heroAngle=0;ctx.applyExpansionStage(ctx.entities[1],3);
    const captured=ctx.captureLaserSalvo(1,{shipId:10},{allowOffsets:true},3);
    ctx.applyExpansionStage(ctx.entities[1],1);ctx.heroAngle=Math.PI;
    const values=[];for(let n=0;n<5;n++)values.push(ctx.resolveLaserSalvoOffsets(1,{shipId:10},{allowOffsets:true},captured).length);
    assert.deepEqual(values,[2,3,2,3,2]);assert.equal(captured.stage,3);assert.equal(captured.frame,0);
    const next=ctx.captureLaserSalvo(1,{shipId:10},{allowOffsets:true},1);assert.equal(ctx.resolveLaserSalvoOffsets(1,{shipId:10},{allowOffsets:true},next).length,1);
});
// Run the actual packet handler: timers and audio are replaced; salvos and visual type resolution are real.
const metaStart=sources.combat.indexOf('const LASER_PATTERN_META ='),metaEnd=sources.combat.indexOf('\n};',metaStart)+3;
ctx.MAX_LASER_SPRITE_ID=100;ctx.LASER_ATTACK_LENGTH_MS=1350;run(sources.combat.slice(metaStart,metaEnd));
use('combat','resolveLaserVisual');use('network','applyLaserLength');use('network','handlePacket_laserAttack');
const no=()=>{};for(const n of ['updateEntityClaim','setAttackLockTargetForEntity','clearSabLaserVisualJobsForAttacker'])ctx[n]=no;
for(const n of ['shouldUseProtegitLaser','shouldUseDevolariumLaser','shouldUseLordakiumLaser','shouldUseNettelLaser','shouldUseCrystal2Laser','shouldUseCrystalLaser','shouldSuppressVisibleNpcLaser'])ctx[n]=()=>false;
ctx.getLaserSpriteFrame=()=>({width:60});ctx.LASER_SPRITE_INFO={};ctx.DEFAULT_LASER_SPEED_MS=150;ctx.laserBeams=[];
ctx.snapshotEntityById=id=>ctx.entities[id];ctx.RSB_BURST_STATE=new Map();ctx.clearRsbBurstState=k=>ctx.RSB_BURST_STATE.delete(k);
let timers=[];ctx.setTimeout=(fn,delay)=>{timers.push({fn,delay});return timers.length;};ctx.beginRsbBurst=id=>{ctx.RSB_BURST_STATE.set(String(id),{seq:1,timeouts:[]});return 1;};
ctx.getSabLaserVisualJobKey=()=>'';ctx.startOrRefreshSabLaserVisualJob=(key,a,t,skilled,rate,length,duration,callback)=>{callback(1000,false,true);callback(1200,false,false);};
function fire(type,stage,skilled=false){ctx.heroId=999;ctx.entities={2:{id:2,shipId:10,kind:'player',x:0,y:0,angle:0},3:{id:3,shipId:10,kind:'player',x:1000,y:0}};ctx.applyExpansionStage(ctx.entities[2],stage);ctx.laserBeams=[];timers=[];ctx.handlePacket_laserAttack(['2','3',String(type),'0',skilled?'1':'0',String(stage)],0);}
test('Actual RSB handler: exactly five pulses, 2/3/2/3/2, captured stage despite live switch',()=>{
    fire(6,3);const pulses=timers.filter(t=>t.delay<=480);assert.equal(pulses.length,5);ctx.applyExpansionStage(ctx.entities[2],1);
    const counts=[];for(const t of pulses){const old=ctx.laserBeams.length;t.fn();counts.push(ctx.laserBeams.length-old);}
    assert.deepEqual(counts,[2,3,2,3,2]);assert(ctx.laserBeams.every(b=>b.expansionStage===3));
});
test('RSB at every stage and skill state; packet stage wins over a newer entity stage',()=>{
    for(const stage of [1,2,3])for(const skill of [false,true]){
        fire(6,stage,skill);
        const pulses=timers.filter(t=>t.delay<=480);assert.equal(pulses.length,5);
        for(const t of pulses)t.fn();
        assert.equal(ctx.laserBeams.length,[0,5,8,12][stage]);
        assert(ctx.laserBeams.every(b=>b.skilledLaser===skill&&b.expansionStage===stage));
    }
    fire(0,1);ctx.laserBeams=[];
    // ES already set stage1, but the in-flight volley was captured as stage3 by C#.
    ctx.handlePacket_laserAttack(['2','3','0','0','0','3'],0);
    assert.equal(ctx.laserBeams.length,2);assert(ctx.laserBeams.every(b=>b.expansionStage===3));
    ctx.laserBeams=[];
    // A legacy packet without the extension still captures the entity's authoritative stage.
    ctx.handlePacket_laserAttack(['2','3','0','0','0'],0);
    assert.equal(ctx.laserBeams.length,1);assert.equal(ctx.laserBeams[0].expansionStage,1);
});
test('Actual SAB handler: one center-to-center ring per pulse at every stage and skill state',()=>{
    for(const stage of [1,2,3])for(const skill of [false,true]){fire(4,stage,skill);assert.equal(ctx.laserBeams.length,2);for(const b of ctx.laserBeams){assert.equal(b.startX,1000);assert.equal(b.startY,0);assert.equal(b.endX,0);assert.equal(b.endY,0);assert.equal(b.offsetX,0);}}
});
test('Actual regular laser handler: type and skilled flag unchanged, correct stage pattern, no doubled beams',()=>{
    for(const stage of [1,2,3])for(const type of [0,1,2,3])for(const skill of [false,true]){fire(type,stage,skill);assert.equal(ctx.laserBeams.length,stage===1?1:2);assert(ctx.laserBeams.every(b=>b.patternId===type&&b.skilledLaser===skill));}
});
// Replay packets emitted by the compiled C# composers when supplied by the integration runner.
if(process.argv[3]) {
    for(const n of ['handlePacket_RDY','handlePacket_f'])use('network',n);
    Object.assign(ctx,{currentMapId:1,heroClanId:0,heroGrade:0,heroRankId:0,heroGalaxyGatesFinished:0,groupMembers:{},shipX:1000,shipY:1000});
    ctx.ensureEntity=id=>ctx.entities[id]||(ctx.entities[id]={id});
    ctx.resetMapState=id=>{ctx.currentMapId=id;ctx.entities={};};
    ctx.resetEntityInterpolationTo=(e,x,y)=>{e.x=x;e.y=y;};
    ctx.normalizeChatClanTag=s=>s;
    for(const n of ['cacheKnownClanTag','syncChatRoomsToHero','sendLabStatusRequest','removeFlashConnectionInfoWindowSafe','trySendRdyMap','applyPendingAttackLockForEntity'])ctx[n]=no;
    const packets=fs.readFileSync(process.argv[3],'utf8').split(/[\r\n\0]+/);
    test('Actual C# hero I / remote C / initial-list packets replay through the HTML5 handlers',()=>{
        let count=0;
        for(const packet of packets){const p=packet.split('|');
            if(p[0]==='RDY') {ctx.handlePacket_RDY(p,1);assert.equal(ctx.heroExpansionTypeId,Number(p[19]));assert.equal(ctx.entities[ctx.heroId].expansionTypeId,Number(p[19]));count++;}
            else if(p[0]==='f'&&p[1]==='C'){ctx.heroId=900002;ctx.handlePacket_f(p,1);assert.equal(ctx.entities[Number(p[2])].expansionTypeId,Number(p[4]));count++;}
        }
        assert.equal(count,12);
        const initial=packets.find(p=>p.startsWith('RDY|I')).split('|');
        for(const map of [2,1,3,1]){initial[14]=String(map);initial[19]=map===2?'3':'1';ctx.handlePacket_RDY(initial,1);assert.equal(ctx.heroExpansionTypeId,Number(initial[19]));}
    });
}
// Export source-only helpers for the local visual bench. Loading this module runs the tests.
const result={verdict:'PASS',cases,scope:'production functions, source XML, synthetic runtime; no account/DB'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));
console.log(JSON.stringify({verdict:result.verdict,cases:cases.length}));
module.exports={fn,sources,root};
