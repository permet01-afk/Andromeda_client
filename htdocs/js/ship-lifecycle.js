(() => {
    'use strict';
    const panel = document.getElementById('ship-lifecycle-panel');
    if (!panel) return;
    const byId = id => document.getElementById('ship-panel-' + id);
    let state = JSON.parse(document.getElementById('ship-panel-initial').textContent);
    let selectedConfig = state && state.active_config === 2 ? 2 : 1;
    let busy = false, request = null;
    const api = 'views/userTabs/api/';
    const format = value => value == null ? '—' : Number(value).toLocaleString('en-US');
    const fill = (id, current, max) => { byId(id).style.width = (current == null ? 0 : Math.max(0, Math.min(100, 100 * current / Math.max(1, max)))) + '%'; };
    const requestId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    function render(next) {
        if (!next) return;
        if (state && state.shipid !== next.shipid) { window.location.reload(); return; }
        if (state && (state.destruction_id !== next.destruction_id || state.ship_generation !== next.ship_generation)) request = null;
        state = next;
        const destroyed = state.status === 'DESTROYED';
        const active = selectedConfig === state.active_config;
        const stats = state.configurations && state.configurations[selectedConfig] || {};
        panel.classList.toggle('is-destroyed', destroyed);
        byId('status').textContent = state.status;
        byId('status').hidden = state.status === 'READY';
        for (const config of [1, 2]) {
            const tab = byId('tab-' + config);
            tab.setAttribute('aria-selected', String(config === selectedConfig));
            tab.tabIndex = config === selectedConfig ? 0 : -1;
            byId('active-' + config).hidden = config !== state.active_config;
        }
        byId('stats').setAttribute('aria-labelledby', 'ship-panel-tab-' + selectedConfig);
        byId('hp-current').textContent = format(state.current_hp);
        byId('hp-max').textContent = format(state.max_hp);
        fill('hp-fill', state.current_hp, state.max_hp);
        byId('shield-label').textContent = active ? 'SHIELD' : 'MAX SHIELD';
        byId('shield-current').textContent = format(active ? stats.current_shield : stats.max_shield);
        byId('shield-max').textContent = format(stats.max_shield);
        byId('shield-fraction').hidden = !active;
        fill('shield-fill', active ? stats.current_shield : stats.max_shield, stats.max_shield);
        byId('damage').textContent = format(stats.damage);
        byId('speed').textContent = format(stats.speed);
        byId('repair').hidden = !destroyed;
        byId('repair').disabled = busy || !state.can_repair;
        byId('repair').textContent = 'REPAIR — ' + (state.repair_cost === 0 ? 'FREE' : format(state.repair_cost) + ' U.');
        byId('phoenix').hidden = !destroyed || state.shipid === 1 || state.uridium >= state.repair_cost;
        const globalLaunch = document.querySelector('[data-ship-global-launch]');
        if (globalLaunch) {
            globalLaunch.textContent = state.can_launch ? 'Play' : 'Hangar / Repair';
            globalLaunch.href = state.can_launch ? 'spacemap_html5/spacemap.php' : 'view.php?page=user&tab=infos';
            if (state.can_launch) { globalLaunch.target = '_blank'; globalLaunch.dataset.mobilePlay = '1'; }
            else { globalLaunch.removeAttribute('target'); delete globalLaunch.dataset.mobilePlay; }
        }
        byId('message').textContent = destroyed
            ? (state.can_repair ? 'Repair your ship before you can play.' : 'Your game session is closing. Please wait.')
            : (active ? 'Last saved state · Current hit points are shared by both configurations.'
                : 'Viewing configuration ' + selectedConfig + ' · Configuration ' + state.active_config + ' is active. Hit points are shared; shield shown is capacity.');
    }
    async function refresh() {
        const response = await fetch(api + 'ship_state.php', {credentials:'same-origin', cache:'no-store'});
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'The hangar is temporarily unavailable.');
        render(body);
    }
    for (const config of [1, 2]) {
        byId('tab-' + config).addEventListener('click', () => {selectedConfig = config; render(state);});
        byId('tab-' + config).addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            selectedConfig = event.key === 'Home' ? 1 : event.key === 'End' ? 2 : (selectedConfig === 1 ? 2 : 1);
            render(state); byId('tab-' + selectedConfig).focus();
        });
    }
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
            window.location.reload(); // Refresh wallet/profile; never launch automatically.
        } catch (error) {byId('message').textContent = error.message || 'Connection lost. Retry to check your repair.';}
        finally {busy = false; byId('repair').disabled = !state.can_repair;}
    });
    render(state);
    setInterval(() => {if (!busy && !document.hidden) refresh().catch(() => {});}, 5000);
    window.addEventListener('pageshow', () => refresh().catch(() => {}));
})();