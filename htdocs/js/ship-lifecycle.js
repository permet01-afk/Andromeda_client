(() => {
    'use strict';
    const panel = document.getElementById('ship-lifecycle-panel');
    if (!panel) return;
    const byId = id => document.getElementById('ship-panel-' + id);
    let state = JSON.parse(document.getElementById('ship-panel-initial').textContent);
    let busy = false, request = null;
    const api = 'views/userTabs/api/';
    const requestId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    function render(next) {
        if (!next) return;
        if (state && state.shipid !== next.shipid) { window.location.reload(); return; }
        if (state && (state.destruction_id !== next.destruction_id || state.ship_generation !== next.ship_generation)) request = null;
        state = next;
        panel.classList.toggle('is-destroyed', state.status === 'DESTROYED');
        byId('status').textContent = state.status;
        byId('hp').textContent = state.current_hp.toLocaleString('en-US') + ' / ' + state.max_hp.toLocaleString('en-US');
        byId('hp-fill').style.width = Math.min(100, 100 * state.current_hp / Math.max(1, state.max_hp)) + '%';
        byId('repair').hidden = state.status !== 'DESTROYED';
        byId('repair').disabled = busy || !state.can_repair;
        byId('repair').textContent = 'REPAIR · ' + state.repair_cost.toLocaleString('en-US') + ' U.';
        byId('phoenix').hidden = state.status !== 'DESTROYED' || state.shipid === 1 || state.uridium >= state.repair_cost;
        byId('launch').href = state.can_launch ? 'spacemap_html5/spacemap.php' : '#';
        byId('launch').setAttribute('aria-disabled', state.can_launch ? 'false' : 'true');
        const globalLaunch = document.querySelector('[data-ship-global-launch]');
        if (globalLaunch) {
            globalLaunch.textContent = state.can_launch ? 'Play' : 'Hangar / Repair';
            globalLaunch.href = state.can_launch ? 'spacemap_html5/spacemap.php' : 'view.php?page=user&tab=infos';
            if (state.can_launch) { globalLaunch.target='_blank'; globalLaunch.dataset.mobilePlay='1'; }
            else {globalLaunch.removeAttribute('target');delete globalLaunch.dataset.mobilePlay;}
        }
        byId('message').textContent = state.can_launch ? 'Your ship is ready to launch.' : state.can_repair ? 'Repair your ship before you can launch.' : 'Your game session is closing. Please wait.';
    }
    async function refresh() {
        const response = await fetch(api + 'ship_state.php', {credentials:'same-origin', cache:'no-store'});
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'The hangar is temporarily unavailable.');
        render(body);
    }
    byId('launch').addEventListener('click', event => {if (!state || !state.can_launch || busy) event.preventDefault();});
    byId('repair').addEventListener('click', async () => {
        if (busy || !state || !state.can_repair) return;
        busy = true;
        request = request || requestId(); // Same ID is retained after a lost response.
        render(state);
        try {
            const response = await fetch(api + 'ship_repair.php', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:panel.dataset.csrf,request_id:request,destruction_id:state.destruction_id,ship_generation:state.ship_generation})});
            const body = await response.json();
            if (!response.ok) throw new Error(body.error || 'The ship could not be repaired.');
            await refresh();
            byId('message').textContent = body.message;
            window.location.reload(); // Refresh the existing wallet/profile widgets; never launch automatically.
        } catch (error) {byId('message').textContent = error.message || 'Connection lost. Retry to check your repair.';}
        finally {busy = false; byId('repair').disabled = !state.can_repair;}
    });
    render(state);
    // Refresh while cleanup owns the token, on return to this tab, and across tabs.
    setInterval(() => {if (!busy && !document.hidden) refresh().catch(() => {});}, 5000);
    window.addEventListener('pageshow', () => refresh().catch(() => {}));
})();
