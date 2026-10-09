const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../client_network.js'), 'utf8');
const start = source.indexOf('let wsReconnectTicketPending = false;');
const end = source.indexOf('window.reconnectToCurrentMap = reconnectToCurrentMap;', start);
assert(start >= 0 && end > start);
function fixture(fetch) {
    const calls = [];
    const context = {
        window: { ANDROMEDA_CONFIG: { sessionID: 'consumed' } }, cfg: { sessionID: 'consumed' },
        wsPageUnloading: false, wsReconnectTimer: null, wsManualClose: false, ws: {}, wsConnecting: false,
        netBuffer: '', wsUsesNullDelimiter: false, heroId: 535, fetch, AbortController, setTimeout, clearTimeout,
        console: { error() {} }, resetWsLoginAttempt() {}, stopPingTimer() {}, clearWsConnectWatchdog() {},
        hardCloseSocketInstance() {}, closeChatConnectionForDisconnect() {}, hideFlashConnectionLostWindowSafe() {},
        showFlashConnectionLostWindowSafe() { calls.push('dialog'); },
        connectToServer() { calls.push('LOGIN:' + context.cfg.sessionID); },
        connectToChat() { calls.push('CHAT:' + context.cfg.sessionID); }, startChatInitMonitor() {}
    };
    vm.createContext(context); vm.runInContext(source.slice(start, end), context);
    return { context, calls, run: () => context.reconnectToCurrentMap() };
}
(async () => {
    let requests = 0, release;
    const pending = new Promise(resolve => { release = resolve; });
    const good = fixture(async (url, options) => {
        requests++; assert.equal(url, 'spacemap.php?issue_ticket=1');
        assert.equal(options.credentials, 'same-origin'); assert.equal(options.cache, 'no-store');
        await pending; return { ok: true, json: async () => ({ ok: true, sessionID: 'fresh' }) };
    });
    const first = good.run(); await good.run(); assert.equal(requests, 1); assert.deepEqual(good.calls, []);
    release(); await first; assert.deepEqual(good.calls, ['LOGIN:fresh', 'CHAT:fresh']);
    assert.equal(good.context.window.ANDROMEDA_CONFIG.sessionID, 'fresh');
    for (const response of [{ ok: false, status: 403 }, { ok: true, json: async () => ({ ok: false }) }]) {
        const bad = fixture(async () => response); await bad.run(); await bad.run();
        assert.deepEqual(bad.calls, ['dialog', 'dialog']); assert.equal(bad.context.wsManualClose, false);
    }
    const terminal = fixture(async () => { throw Error('Must not request a ticket'); });
    terminal.context.window.AndromedaShipDeath = { terminal: true }; await terminal.run(); assert.deepEqual(terminal.calls, []);
    const during = fixture(async () => {
        during.context.window.AndromedaShipDeath = { terminal: true };
        return { ok: true, json: async () => ({ ok: true, sessionID: 'unused' }) };
    });
    await during.run(); assert.deepEqual(during.calls, []);
    console.log('PASS: fresh SSO before LOGIN/chat, concurrent click, HTTP/auth failure retry, terminal death guards');
})().catch(e => { console.error(e); process.exitCode = 1; });
