// Execute the unchanged HTML5 laser handler against packets captured by EquipmentPhase1Tests.
// Rendering/audio/entity fixtures are isolated; this is not a browser end-to-end test.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '../..');
const combat = fs.readFileSync(path.join(repo, 'htdocs/spacemap_html5/client_combat.js'), 'utf8');
const network = fs.readFileSync(path.join(repo, 'htdocs/spacemap_html5/client_network.js'), 'utf8');
const packetPath = process.argv[2];
if (!packetPath) throw new Error('Usage: node equipment-client-packets.js observer-packets.txt [result.json]');

function functionSource(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `Missing production function ${name}`);
    const end = source.indexOf('\nfunction ', start + 1);
    return source.slice(start, end < 0 ? undefined : end);
}
function objectSource(source, name) {
    const start = source.indexOf(`const ${name} = {`);
    assert.ok(start >= 0, `Missing production constant ${name}`);
    return source.slice(start, source.indexOf('\n};', start) + 3);
}
const context = {
    window: {}, performance: {now: () => 1000}, heroId: 900002,
    entities: {900001: {x:100, y:100, kind:'player'}, 900100:{x:400,y:100,kind:'npc'}},
    laserBeams: [], MAX_LASER_SPRITE_ID: 20, LASER_ATTACK_LENGTH_MS: 1350,
    LASER_SPRITE_INFO: {}, DEFAULT_LASER_SPEED_MS: 150,
    updateEntityClaim() {}, setAttackLockTargetForEntity() {},
    snapshotEntityById(id) {return context.entities[id];},
    getLaserSpriteFrame() {return {width:80};},
    resolveLaserSalvoOffsets() {return [{x:0,y:0}, {x:8,y:0}];},
    applyLaserLength(x,y,endX,endY) {return {endX,endY};},
    clearSabLaserVisualJobsForAttacker() {},
    getSabLaserVisualJobKey: (...args) => args.join('|'),
    startOrRefreshSabLaserVisualJob(key,a,t,s,f,l,d,spawn) {spawn(1000,false,true);},
    RSB_BURST_STATE: new Map(),
    beginRsbBurst(a) {context.RSB_BURST_STATE.set(String(a),{seq:1,timeouts:[]});return 1;},
    clearRsbBurstState(key) {context.RSB_BURST_STATE.delete(key);},
    setTimeout(callback) {callback();return 1;}
};
for (const name of ['shouldUseProtegitLaser','shouldUseDevolariumLaser','shouldUseLordakiumLaser',
    'shouldUseNettelLaser','shouldUseCrystal2Laser','shouldUseCrystalLaser','shouldSuppressVisibleNpcLaser'])
    context[name] = () => false;
vm.createContext(context);
vm.runInContext(objectSource(combat, 'LASER_PATTERN_META') + '\n' +
    functionSource(combat, 'resolveLaserVisual') + '\n' +
    functionSource(network, 'handlePacket_laserAttack'), context);
const results = [];
for (const packet of fs.readFileSync(packetPath, 'utf8').trim().split(/\r?\n/)) {
    const parts = packet.split('|');
    const offset = parts.indexOf('a') + 1;
    assert.ok(offset > 0);
    const type = Number(parts[offset+2]);
    const skilled = parts[offset+4] === '1';
    context.laserBeams.length = 0;
    context.handlePacket_laserAttack(parts, offset);
    assert.ok(context.laserBeams.length > 0, `No beams for ${packet}`);
    for (const beam of context.laserBeams) {
        assert.equal(beam.patternId,type);
        assert.equal(beam.spriteId,type);
        assert.equal(beam.skilledLaser,skilled);
        assert.equal(beam.absorber,type === 4);
        assert.equal(beam.attackerId,900001);
        assert.equal(beam.targetId,900100);
        if (type === 4) assert.equal(beam.startX,400,'SAB starts at target');
    }
    results.push({packet,type,skilled,beams:context.laserBeams.length});
}
assert.equal(results.length,24);
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(results,null,2));
console.log(`PASS: ${results.length} captured packets parsed by the unchanged HTML5 handler; type, sprite, skilledLaser and SAB direction verified.`);
