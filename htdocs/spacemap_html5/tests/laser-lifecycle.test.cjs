// Real production functions with a deterministic clock; no browser/gameplay/SQL claims.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const cp = require('child_process'), { performance: wallClock } = require('perf_hooks');
const root = path.resolve(__dirname, '..');
const baseline = process.argv.includes('--baseline');
const revision = '30d6e42f21d784cc63a0eab4df0a6863eef7a83c';
const sources = {};
for (const name of ['network', 'combat']) sources[name] = (baseline
    ? cp.execFileSync('git', ['show', `${revision}:htdocs/spacemap_html5/client_${name}.js`], { cwd: root, encoding: 'utf8', maxBuffer: 4000000 })
    : fs.readFileSync(path.join(root, `client_${name}.js`), 'utf8')).replace(/\r\n/g, '\n');
function fn(file, name) {
    const s = sources[file], a = s.indexOf(`function ${name}(`), b = s.indexOf('\n}', a);
    assert(a >= 0 && b > a, name); return s.slice(a, b + 2);
}
function fixture() {
    let now = 1000, serial = 0, life = 10, peakTimers = 0;
    const timers = new Map(), fired = [], cancelled = [], impacts = [], sounds = [], cleanups = [];
    const ctx = { console, Map, Set, Math, Number, Date, Array, Uint8Array,
        window: { RSB_VISUAL_BURST: { count: 5, spacingMs: 120 }, AudioManager: { playLaserShot: (...a) => sounds.push({ at: now, id: a[0] }) } },
        performance: { now: () => now }, __rxNowMs: () => now, heroId: 1, heroHp: 10000, currentMapId: 1,
        entities: {}, shipX: 0, shipY: 0, heroShipId: 10, heroAngle: 0, heroExpansionTypeId: 1, heroShield: 1000, heroMaxShield: 1000,
        selectedTargetId: 3, attackIntentTargetId: 3, confirmedAttackTargetId: 3, pendingAttackAckTargetId: null,
        heroCombatLogActiveTargetId: 3, currentLaserTargetId: 3, pendingRangeResumeTargetId: null,
        laserBeams: [], LASER_ATTACK_LENGTH_MS: 1350, DEFAULT_LASER_SPEED_MS: 150, LASER_SPRITE_INFO: {}, MAX_LASER_SPRITE_ID: 100,
        setTimeout(callback, delay) { const id = ++serial; timers.set(id, { id, callback, at: now + Math.max(0, delay) }); peakTimers = Math.max(peakTimers, timers.size); return id; },
        clearTimeout(id) { const t = timers.get(id); if (t) cancelled.push(t); timers.delete(id); },
        ensureEntityVisualLife(e) { if (!e.visualLifeId) e.visualLifeId = ++life; return e.visualLifeId; },
        getLaserSpriteFrame: () => ({ width: 60 }), getLaserSpriteSource: () => null, isLaserSpriteFrameReady: () => false,
        computeShieldImpactRadius: () => 30, normalizeShieldImpactVisualAngle: a => a,
        spawnShieldBurstAt: (x, y, kind, options) => impacts.push({ x, y, kind, ...options }),
        captureLaserSalvo: () => ({ stage: 1 }), resolveLaserSalvoOffsets: () => [{ x: 0, y: 0 }],
        updateEntityClaim() {}, setAttackLockTargetForEntity() {}, logFlashCombatLocaleMessage() {},
        releaseSabShotsForEntity: id => cleanups.push(['sab',id]), detachRocketAttacksForEntity: id => cleanups.push(['rocket',id]), flashClearEntityShipSkillVisualEffects: id => cleanups.push(['skill',id]),
        sendRaw() {}, clearHeroMissingCombatTarget() {}, drawEnergyLeechLaserEchoBeams() {}, flashIsEnergyLeechLaserEchoActiveForEntity: () => false
    };
    for (const name of ['Protegit', 'Devolarium', 'Lordakium', 'Nettel', 'Crystal2', 'Crystal']) ctx[`shouldUse${name}Laser`] = () => false;
    ctx.shouldSuppressVisibleNpcLaser = () => false;
    ctx.snapshotEntityById = id => id === ctx.heroId
        ? { id, kind: 'player', shipId: 10, x: ctx.shipX, y: ctx.shipY, visualLifeId: -1 }
        : ctx.entities[id] ? { ...ctx.entities[id] } : null;
    const run = code => vm.runInContext(code, ctx);
    vm.createContext(ctx);
    const cacheStart=sources.combat.indexOf('const __entitySnapshotFrameCache ='), cacheEnd=sources.combat.indexOf('function computeShieldImpactRadius(',cacheStart);
    run(sources.combat.slice(cacheStart,cacheEnd));
    const start = sources.network.indexOf('const RSB_BURST_STATE ='), end = sources.network.indexOf('function freezeLaserBeamTrajectory(', start);
    run(sources.network.slice(start, end));
    run(sources.network.slice(sources.network.indexOf('const ENTITY_VISUAL_CLEANUP_MAX_PER_FRAME ='), sources.network.indexOf('function handlePacket_laserAttack(')));
    const meta = sources.combat.indexOf('const LASER_PATTERN_META =');
    run(sources.combat.slice(meta, sources.combat.indexOf('\n};', meta) + 3));
    for (const name of ['resolveLaserVisual', 'triggerLaserImpactEffect', 'handleLaserImpact', 'updateLaserBeams', 'drawLaserBeams']) run(fn('combat', name));
    for (const name of ['applyLaserLength', 'handlePacket_laserAttack','freezeLaserBeamTrajectory','removeLaserBeamsForEntity']) run(fn('network', name));
    function entity(id, kind = 'player', x = 500) { return ctx.entities[id] = { id, kind, shipId: 10, x, y: 0, hp: 10000, visualLifeId: ++life }; }
    entity(2); entity(3, 'npc', 1000); entity(4, 'player', 1200);
    function advance(ms) {
        const end = now + ms; let iterations = 0;
        while (true) {
            const t = [...timers.values()].filter(t => t.at <= end).sort((a,b) => a.at-b.at || a.id-b.id)[0];
            if (!t) break;
            assert(++iterations < 100000, 'deterministic timer watchdog');
            now = t.at; timers.delete(t.id); fired.push(t); t.callback();
        }
        now = end;
    }
    function fire(attacker = 2, target = 3, pattern = 6, shield = false) { ctx.handlePacket_laserAttack([String(attacker), String(target), String(pattern), shield ? '1' : '0', '0', '1'], 0); }
    function stats() { return run('({jobs: PRIMARY_LASER_VISUAL_JOBS.size, bursts: RSB_BURST_STATE.size, handles: Array.from(RSB_BURST_STATE.values()).reduce((n,s)=>n+(s.timeouts.size ?? s.timeouts.length),0)})'); }
    function ready() {
        run("incomingLaserVisualReadyPending=true;incomingLaserVisualPendingNonce='1234567890abcdef';incomingLaserVisualPendingMapId=1;");
        ctx.handlePacket_LVS(['READY', '1', 'scope_1', '1', 'instance_1', 'hero_1', '1234567890abcdef'], 0);
        for (const id of [2,3,4]) ctx.handlePacket_LVS(['LIFE','1','scope_1',String(id),'1','instance_1',`life_${id}`],0);
    }
    function lvs({ kind = 'SHOT', a = 2, t = 3, generation = 1, sequence = 1, state = 'ATTACKING', channel = 'P', pattern = 0, scope = 'scope_1', instance = 'instance_1', targetLife = `life_${t}` } = {}) {
        ctx.handlePacket_LVS(['1',kind,scope,String(a),String(t),'1',instance,`life_${a}`,targetLife,String(generation),String(sequence),state,channel,String(pattern),'0','0','1'],0);
    }
    return { ctx, run, entity, advance, fire, stats, timers, cancelled, fired, impacts, sounds, cleanups, ready, lvs, now: () => now, peak: () => peakTimers };
}
const cases = [];
function test(name, action) { const t = wallClock.now(); try { action(); cases.push({ name, result: 'PASS', elapsedMs: wallClock.now()-t }); } catch(e) { cases.push({ name, result:'FAIL', error:e.message, elapsedMs:wallClock.now()-t }); } }
test('Existing guard: old primary tick cannot emit on a replaced remote target', () => {
    const f=fixture(); f.fire(2,3,0); const n=f.sounds.length; f.entity(3); f.advance(500);
    assert.equal(f.sounds.length,n); assert.equal(f.stats().jobs,0);
});
test('Fresh admission after ID replacement gets a new primary job and initial pulse', () => {
    const f=fixture(); f.fire(2,3,0); const old=f.run('PRIMARY_LASER_VISUAL_JOBS.get(2)'); f.entity(3); f.fire(2,3,0);
    assert.notStrictEqual(f.run('PRIMARY_LASER_VISUAL_JOBS.get(2)'),old); assert.equal(f.sounds.length,2);
});
test('Delayed shield impact cannot attach to a recycled target ID', () => {
    const f=fixture(); f.fire(2,3,0,true); f.entity(3,'npc',777); f.advance(150); assert.equal(f.impacts.length,0);
});
test('Emitted beams freeze their old geometry instead of following a recycled target', () => {
    const f=fixture(); f.fire(2,3,0); const beam=f.ctx.laserBeams[0], x=beam.endX;
    f.entity(3,'npc',777); f.ctx.drawLaserBeams(); assert.equal(beam.endX,x);
});
test('SAB emitted ring cannot attach to either recycled endpoint', () => {
    const f=fixture(); f.fire(2,3,4); const b=f.ctx.laserBeams[0], old=[b.startX,b.endX];
    f.entity(2,'player',222); f.entity(3,'npc',777); f.ctx.drawLaserBeams(); assert.deepEqual([b.startX,b.endX],old);
});
test('A living target can receive an admitted impact after its shooter disappears', () => {
    const f=fixture(); f.fire(2,3,0,true); delete f.ctx.entities[2]; f.advance(150); assert.equal(f.impacts.length,1);
});
test('Dead hero cannot emit future primary pulses before repair', () => {
    const f=fixture(); f.fire(1,3,0); const n=f.sounds.length; f.ctx.heroHp=0; f.advance(500); assert.equal(f.sounds.length,n);
});
test('Map/transport reset invalidates pending impacts even for the same hero ID', () => {
    const f=fixture(); f.fire(2,1,0,true); f.ctx.clearPrimaryLaserVisualJobs(); f.advance(150); assert.equal(f.impacts.length,0);
});
test('Source lifecycle: real hero init renews scene, ordinary RDY refresh does not', () => {
    // The extracted RDY handler keeps its actual parsing/branching; unrelated UI hooks are no-ops.
    const f=fixture(), c=f.ctx; vm.runInContext(fn('network','handlePacket_RDY'),c);
    Object.assign(c,{heroClanId:0,heroGrade:0,heroRankId:0,heroGalaxyGatesFinished:0,heroExpansionTypeId:1,cfg:{},window:{...c.window,__ANDRO_HAS_INITIAL_RDY_I:true}});
    c.ensureEntity=id=>c.entities[id]||(c.entities[id]={id,kind:'player',visualLifeId:99}); c.applyExpansionStage=()=>{};
    for(const name of ['cacheKnownClanTag','syncChatRoomsToHero','trySendRdyMap','sendLabStatusRequest','removeFlashConnectionInfoWindowSafe'])c[name]=()=>{};
    c.resetMapState=map=>{c.currentMapId=map;c.clearPrimaryLaserVisualJobs();};
    const packet=['I','1','Pilot','10','300','1000','1000','10000','10000','0','100','0','0','1','1','0','0','0','1','0','0','0','10','0','0','0','1','','0','0','0'];
    f.fire(1,3,0); const old=f.run('PRIMARY_LASER_VISUAL_JOBS.get(1)'); c.handlePacket_RDY(packet,0);
    assert.strictEqual(f.run('PRIMARY_LASER_VISUAL_JOBS.get(1)'),old,'ordinary alive refresh preserves outgoing phase');
    c.heroHp=0; c.handlePacket_RDY(packet,0); f.advance(500); assert.equal(f.stats().jobs,0,'respawn cancels old hero generator');
});
test('RSB keeps the existing five pulses at 0/120/240/360/480ms', () => {
    const f=fixture(), start=f.now(); f.fire(); f.advance(500);
    assert.deepEqual(f.sounds.map(s=>s.at-start),[0,120,240,360,480]); f.advance(2000); assert.deepEqual({...f.stats()},{jobs:0,bursts:0,handles:0}); assert.equal(f.timers.size,0);
});
test('Completed RSB pulse handles leave only truly pending callbacks', () => {
    const f=fixture(); f.fire(); f.advance(1); assert.equal(f.stats().handles,5); f.advance(480); assert.equal(f.stats().handles,1);
});
test('RSB future pulses stop when either endpoint is replaced without an R packet', () => {
    for(const id of [2,3]) { const f=fixture(); f.fire(); f.advance(1); f.entity(id); f.advance(1000); assert.equal(f.sounds.length,1); assert.equal(f.stats().bursts,0); assert.equal(f.timers.size,0); }
});
test('Disconnect/reset clears RSB pending timers, not just primary jobs', () => {
    const f=fixture(); f.fire(); f.advance(1); f.ctx.clearPrimaryLaserVisualJobs(); f.advance(1000); assert.equal(f.sounds.length,1); assert.equal(f.stats().bursts,0); assert.equal(f.timers.size,0);
});
test('Cancelling future RSB pulses preserves already emitted projectiles', () => {
    const f=fixture(); f.fire(); f.advance(1); const b=f.ctx.laserBeams[0]; f.ctx.cancelRsbBurst(2); assert(f.ctx.laserBeams.includes(b)); f.advance(1000); assert.equal(f.sounds.length,1);
});
test('Stale RSB pulse and cleanup callbacks cannot cancel or emit into a newer burst', () => {
    const f=fixture(); f.fire(); const old=[...f.timers.values()]; f.fire(); const state=f.run("RSB_BURST_STATE.get('2')");
    for(const t of old)t.callback(); assert.strictEqual(f.run("RSB_BURST_STATE.get('2')"),state); assert.equal(f.sounds.length,0);
    f.advance(500); assert.equal(f.sounds.length,5);
});
test('A cancelled primary timer callback cannot orphan the new timer', () => {
    const f=fixture(); f.fire(2,3,0); const old=[...f.timers.values()][0]; f.ctx.cancelPrimaryLaserVisualJob(2); f.fire(2,4,0);
    const timer=f.run('primaryLaserVisualTimerId'); old.callback(); assert.equal(f.run('primaryLaserVisualTimerId'),timer); assert.equal(f.timers.size,1);
});
test('Deferred removal cannot clear the new life effects of a recycled ID', () => {
    const f=fixture(); f.ctx.queueEntityVisualCleanup(3,{releaseSabShots:true,detachRocketAttacks:true,clearShipSkillVisuals:true}); f.entity(3); f.advance(0); assert.equal(f.cleanups.length,0);
});
test('Deferred removal still cleans a removed entity or the same surviving life', () => {
    for(const remove of [false,true]) { const f=fixture(); f.ctx.queueEntityVisualCleanup(3,{releaseSabShots:true,detachRocketAttacks:true,clearShipSkillVisuals:true}); if(remove)delete f.ctx.entities[3]; f.advance(0); assert.equal(f.cleanups.length,3); }
});
test('Deferred removal is discarded on map/session reset, even with equal IDs', () => {
    const f=fixture(); f.ctx.queueEntityVisualCleanup(3,{releaseSabShots:true}); f.ctx.clearPrimaryLaserVisualJobs(); f.advance(0); assert.equal(f.cleanups.length,0);
});
test('A new cleanup replaces an old same-ID generation without losing its own work', () => {
    const f=fixture(); f.ctx.queueEntityVisualCleanup(3,{releaseSabShots:true}); f.entity(3); f.ctx.queueEntityVisualCleanup(3,{detachRocketAttacks:true}); f.advance(0); assert.deepEqual(f.cleanups,[['rocket',3]]);
});
test('Late beam detachment cannot snap its trajectory to a replacement life', () => {
    const f=fixture(); f.fire(2,3,0); const beam=f.ctx.laserBeams[0], x=beam.endX; f.entity(3,'npc',777); f.ctx.removeLaserBeamsForEntity(3);
    assert.equal(beam.endX,x); assert.equal(beam.followTargets,false);
});
test('New-life looping NPC laser gets a distinct beam; old impact cannot hit replacement', () => {
    const f=fixture(); f.ctx.shouldUseDevolariumLaser=()=>true; f.ctx.DEVOLARIUM_LASER_SPRITE_ID_LOCAL=20; f.ctx.DEVOLARIUM_LASER_SPEED_MS=500;
    f.fire(2,3,0,true); const old=f.ctx.laserBeams[0]; f.advance(50); f.entity(3,'npc',777); f.ctx.cancelPrimaryLaserVisualJob(2); f.fire(2,3,0,true);
    assert.equal(f.ctx.laserBeams.length,2); assert.notStrictEqual(f.ctx.laserBeams[1],old);
    f.advance(450); assert.equal(f.impacts.length,0); f.advance(50); assert.equal(f.impacts.length,1);
});
test('Existing LVS guards reject old sequence, generation, life, instance and scope', () => {
    const f=fixture(); f.ready(); f.lvs({generation:2,sequence:2}); const n=f.sounds.length;
    for(const p of [{generation:2,sequence:2},{generation:1,sequence:3},{generation:2,sequence:3,targetLife:'retired'},{generation:2,sequence:3,instance:'old'},{generation:2,sequence:3,scope:'old'}])f.lvs(p);
    assert.equal(f.sounds.length,n); assert.equal(f.stats().jobs,1);
});
test('LVS STATE/SNAPSHOT do not replay; PAUSED_RANGE freezes future pulses until new SHOT', () => {
    const f=fixture(); f.ready(); f.lvs(); const n=f.sounds.length;
    f.lvs({kind:'STATE',sequence:2,state:'PAUSED_RANGE'}); f.advance(500); assert.equal(f.sounds.length,n);
    f.lvs({kind:'SNAPSHOT',sequence:3}); f.lvs({kind:'STATE',sequence:4}); f.advance(500); assert.equal(f.sounds.length,n);
    f.lvs({sequence:5}); f.advance(500); assert(f.sounds.length>n);
    f.lvs({kind:'STATE',sequence:6,state:'STOPPED'}); const stopped=f.sounds.length; f.advance(1000); assert.equal(f.sounds.length,stopped); assert.equal(f.stats().jobs,0);
});
test('LVS RSB STOPPED cancels future pulses but retains admitted beam', () => {
    const f=fixture(); f.ready(); f.lvs({channel:'R',pattern:6}); f.advance(1); const b=f.ctx.laserBeams[0];
    f.lvs({kind:'STATE',channel:'R',pattern:6,sequence:2,state:'STOPPED'}); assert(f.ctx.laserBeams.includes(b)); f.advance(1000); assert.equal(f.sounds.length,1);
});
test('LVS LIFE rebind detaches old callbacks, while fresh generation can attack', () => {
    const f=fixture(); f.ready(); f.lvs({channel:'R',pattern:6}); f.advance(1); f.entity(3);
    f.ctx.handlePacket_LVS(['LIFE','1','scope_1','3','1','instance_1','new_life_3'],0); f.advance(1000); assert.equal(f.sounds.length,1);
    f.lvs({channel:'R',pattern:6,generation:2,sequence:2,targetLife:'new_life_3'}); f.advance(500); assert.equal(f.sounds.length,6);
});
test('Two reciprocal attackers keep independent jobs and stopping A does not stop B', () => {
    const f=fixture(); f.fire(2,3,0); f.fire(3,2,0); assert.equal(f.stats().jobs,2); f.ctx.cancelPrimaryLaserVisualJob(2); f.advance(500);
    assert.equal(f.sounds.filter(s=>s.id===2).length,1); assert(f.sounds.filter(s=>s.id===3).length>1);
});
test('Outgoing O/X semantics retain phase and do not delete emitted beams', () => {
    const f=fixture(); f.fire(1,3,0); const b=f.ctx.laserBeams[0]; f.ctx.suspendPrimaryLaserVisualJobsForLocalHero(); f.advance(600);
    assert.equal(f.sounds.length,1); assert(f.ctx.laserBeams.includes(b)); f.ctx.resumePrimaryLaserVisualJobsForLocalHero(); f.advance(500); assert(f.sounds.length>1);
});
test('Target change cancels the old generator without starting an unadmitted target', () => {
    const f=fixture(); f.fire(2,3,0); f.fire(2,4,0); f.advance(400); assert.equal(f.run('PRIMARY_LASER_VISUAL_JOBS.get(2).targetId'),4);
    f.fire(1,4,0); assert.equal(f.run('PRIMARY_LASER_VISUAL_JOBS.has(1)'),false,'hero target not selected');
});
let soak;
test('Six virtual minutes of repeated RSB return all states and timers to zero', () => {
    const f=fixture(); let peakStates=0,peakHandles=0; const start=wallClock.now();
    for(let n=0;n<120;n++) {
        f.fire(2,3,6,n%2===0); peakStates=Math.max(peakStates,f.stats().bursts); peakHandles=Math.max(peakHandles,f.stats().handles);
        f.advance(3000); f.ctx.updateLaserBeams(f.now()); assert.deepEqual({...f.stats()},{jobs:0,bursts:0,handles:0}); assert.equal(f.timers.size,0);
    }
    assert.equal(f.sounds.length,600); assert.equal(f.ctx.laserBeams.length,0);
    soak={virtualDurationMs:360000,bursts:120,pulses:f.sounds.length,peakStates,peakHandles,peakScheduledTimers:f.peak(),finalStates:{...f.stats()},finalTimers:f.timers.size,componentElapsedMs:wallClock.now()-start};
});
test('Concurrent finite RSB state drains naturally without a pruning interval', () => {
    const f=fixture();
    for(let id=100;id<132;id++){f.entity(id,'player',250);f.fire(id,3,6);}
    assert.equal(f.stats().bursts,32); assert.equal(f.stats().handles,192); f.advance(1500);
    assert.equal(f.sounds.length,160); assert.deepEqual({...f.stats()},{jobs:0,bursts:0,handles:0}); assert.equal(f.timers.size,0);
});
let benchmark;
if(process.argv.includes('--benchmark')) {
    const ticks=[],frames=[];
    for(let sample=0;sample<8;sample++) {
        const f=fixture(); f.fire(2,3,0); const job=f.run('PRIMARY_LASER_VISUAL_JOBS.get(2)'); job.spawnTick=()=>{};
        let start=wallClock.now();
        for(let n=0;n<50000;n++){job.cnt=0;job.active=true;f.ctx.tickPrimaryLaserVisualJob(job);}
        const tickMs=wallClock.now()-start;
        f.ctx.laserBeams=Array.from({length:100},()=>({...f.ctx.laserBeams[0]})); start=wallClock.now();
        for(let n=0;n<1000;n++){f.ctx.beginEntitySnapshotFrame();f.ctx.drawLaserBeams();f.ctx.endEntitySnapshotFrame();}
        if(sample>0){ticks.push(tickMs);frames.push(wallClock.now()-start);}
    }
    const summarize=(samples,operations)=>({samplesMs:samples,medianMs:[...samples].sort((a,b)=>a-b)[3],operations});
    benchmark={qualification:'Node component microbench, 1 warmup + 7 samples. Actual snapshot builder and P0-A per-frame cache; stub sprites stop before canvas drawing. No browser FPS, GPU, RAM or gameplay throughput claim.',primaryTicks:summarize(ticks,50000),drawLogic100Beams:summarize(frames,1000)};
}
const result={baseline,revision,scope:'Actual extracted production functions with deterministic synthetic entities/timers. Not a real browser, network or gameplay validation.',cases,soak,benchmark,passed:cases.filter(c=>c.result==='PASS').length,failed:cases.filter(c=>c.result==='FAIL').length};
const output=process.argv.find(a=>a.startsWith('--output=')); if(output)fs.writeFileSync(output.slice(9),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2)); if(result.failed)process.exitCode=1;
