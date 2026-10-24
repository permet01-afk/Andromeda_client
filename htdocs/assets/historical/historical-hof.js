/* DoPs navigation, authenticated Andromeda data. Weekly/GG history is not fabricated. */
(() => {
    'use strict';
    if (!document.getElementById('open-top100')) return;
    const assets = '/assets/historical/dops-hof/';
    const categories = {
        your_rank: 'YOUR RANK', companies: 'COMPANIES', top_user: 'TOP USER', experience: 'EXPERIENCE',
        honor: 'HONOR', ships_destroyed: 'SHIPS DESTROYED', aliens_destroyed: 'ALIENS DESTROYED',
        titles: 'TITLE OVERVIEW', clans: 'TOP CLANS', gates: 'GALAXY GATE RANKINGS', events: 'EVENT RANKINGS'
    };
    const nav = [['your_rank','user'],['experience','experience'],['honor','honor'],['top_user','start'],['clans','clan'],['gates','gate'],['events','event']];
    const overall = ['your_rank','companies','top_user','experience','honor','ships_destroyed','aliens_destroyed','titles'];
    let overlay, content, previousFocus, controller, generation = 0;
    let state = {category: 'top_user', mode: 'total', faction: '0'};
    const el = (tag, cls, text) => {
        const node = document.createElement(tag); if (cls) node.className = cls;
        if (text !== undefined) node.textContent = String(text); return node;
    };
    function format(value) {
        const match = String(value == null ? '0' : value).match(/^(-?\d+)(?:\.(\d+))?$/);
        if (!match) return '—';
        const integer = match[1].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const fraction = (match[2] || '').slice(0, 2).replace(/0+$/, '');
        return integer + (fraction ? '.' + fraction : '');
    }
    function icon(type, id) {
        const image = el('img','hfNativeIcon');
        image.width = image.height = 12;
        image.src = '/img/ranks/' + (type === 'company' ? 'company/' : '') + Number(id) + '.png';
        image.alt = type === 'company' ? ['','MMO','EIC','VRU'][Number(id)] || '' : 'Grade ' + Number(id);
        return image;
    }
    function pilotCell(row) {
        const cell = el('td');
        if (Number(row.factionid) >= 1 && Number(row.factionid) <= 3) cell.appendChild(icon('company',row.factionid));
        if (Number(row.grade) > 0 && Number(row.grade) <= 23) cell.appendChild(icon('grade',row.grade));
        cell.appendChild(document.createTextNode((row.clan_tag ? '[' + row.clan_tag + '] ' : '') + (row.username || '')));
        return cell;
    }
    function note(text) { content.replaceChildren(el('p','hfEmpty',text)); }
    function close() {
        generation++; if (controller) controller.abort();
        if (!overlay) return;
        overlay.remove(); overlay = null;
        document.removeEventListener('keydown',keys,true);
        if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    }
    function keys(event) {
        if (!overlay) return;
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key !== 'Tab') return;
        const fields = [...overlay.querySelectorAll('button,select,summary')].filter(n => n.getClientRects().length && !n.disabled);
        if (!fields.length) return;
        if (event.shiftKey && document.activeElement === fields[0]) { event.preventDefault(); fields[fields.length-1].focus(); }
        else if (!event.shiftKey && document.activeElement === fields[fields.length-1]) { event.preventDefault(); fields[0].focus(); }
    }
    function selectCategory(category) {
        state.category = category; state.mode = 'total';
        if (!['top_user','experience','honor','ships_destroyed'].includes(category)) state.faction = '0';
        const menu = overlay.querySelector('details'); if (menu) menu.open = false;
        render();
    }
    function open(event) {
        if (event) { event.preventDefault(); event.stopImmediatePropagation(); }
        if (overlay) return;
        previousFocus = document.activeElement;
        overlay = el('div','hfOverlay'); overlay.id = 'historicalHallOfFame';
        const frame = el('section','hfWindow'); frame.setAttribute('role','dialog');
        frame.setAttribute('aria-modal','true'); frame.setAttribute('aria-labelledby','hfTitle');
        const navigation = el('nav','hfNav'); navigation.setAttribute('aria-label','Hall of Fame navigation');
        for (const [key, image] of nav) {
            const button = el('button','hfNavButton'); button.type = 'button'; button.dataset.hof = key;
            button.setAttribute('aria-label', categories[key]); button.title = categories[key];
            button.style.backgroundImage = `url('${assets}navigation_icon_${image}_42x49.png')`;
            button.addEventListener('click',() => selectCategory(key)); navigation.appendChild(button);
        }
        const closeButton = el('button','hfClose','×'); closeButton.type = 'button';
        closeButton.setAttribute('aria-label','Close Hall of Fame'); closeButton.addEventListener('click',close);
        const body = el('div','hfInside');
        const top = el('div','hfTop'); const title = el('h2','',categories[state.category]); title.id = 'hfTitle';
        const details = el('details','hfChoice'); const summary = el('summary','','OVERALL RANKINGS');
        const menu = el('div','hfMenu');
        for (const category of overall) {
            const button = el('button','',categories[category]); button.type = 'button';
            button.addEventListener('click',() => selectCategory(category)); menu.appendChild(button);
        }
        details.append(summary,menu); top.append(title,details);
        const modes = el('div','hfModes');
        for (const [key,label] of [['total','TOTAL'],['weekly','LAST WEEK'],['climbers','HIGHEST CLIMBERS']]) {
            const button = el('button','',label); button.type = 'button'; button.dataset.mode = key;
            button.addEventListener('click',() => { state.mode = key; render(); }); modes.appendChild(button);
        }
        const filters = el('div','hfFilters'); const label = el('label','','Company ');
        const filter = el('select'); filter.setAttribute('aria-label','Company');
        for (const [value,text] of [['0','All companies'],['1','MMO'],['2','EIC'],['3','VRU']]) {
            const option = el('option','',text); option.value = value; filter.appendChild(option);
        }
        filter.value = state.faction;
        filter.addEventListener('change',() => { state.faction = filter.value; render(); });
        label.appendChild(filter); filters.appendChild(label);
        content = el('div','hfContent'); content.setAttribute('aria-live','polite');
        const provenance = el('p','hfProvenance');
        body.append(top,modes,filters,content,provenance); frame.append(navigation,closeButton,body);
        overlay.appendChild(frame);
        overlay.addEventListener('click',e => { if (e.target === overlay) close(); });
        document.body.appendChild(overlay); document.addEventListener('keydown',keys,true);
        closeButton.focus(); render();
    }
    function table(headers, rows, build) {
        const wrapper = el('div','hfTableViewport'); const table = el('table'); const head = el('thead');
        const line = el('tr'); headers.forEach(text => line.appendChild(el('th','',text)));
        head.appendChild(line); const body = el('tbody');
        rows.forEach((row,index) => body.appendChild(build(row,index))); table.append(head,body); wrapper.appendChild(table);
        content.replaceChildren(wrapper);
        if (!rows.length) wrapper.appendChild(el('p','hfEmpty','No eligible results.'));
    }
    async function render() {
        if (!overlay) return;
        const request = ++generation;
        if (controller) controller.abort();
        overlay.querySelector('#hfTitle').textContent = categories[state.category];
        overlay.querySelectorAll('[data-hof]').forEach(button => {
            const kind = ['companies','ships_destroyed','aliens_destroyed','titles'].includes(state.category) ? 'top_user' : state.category;
            button.setAttribute('aria-pressed',String(button.dataset.hof === kind));
        });
        overlay.querySelector('.hfModes').hidden = state.category !== 'top_user';
        overlay.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mode === state.mode)));
        overlay.querySelector('.hfFilters').hidden = !['top_user','experience','honor','ships_destroyed'].includes(state.category);
        overlay.querySelector('.hfFilters select').value = state.faction;
        const provenance = overlay.querySelector('.hfProvenance'); provenance.textContent = '';
        if (state.mode !== 'total' && state.category === 'top_user') {
            note('Weekly snapshots have not been recorded. No historical results are reconstructed.'); return;
        }
        const pending = {
            aliens_destroyed:'Exact NPC destructions are not recorded. The existing weighted NPC points are not a destruction count.',
            gates:'Galaxy Gate completion times have not been recorded. No time ranking is available.',
            events:'A durable event ranking is not available. No results have been invented.'
        };
        if (pending[state.category]) { note(pending[state.category]); return; }
        controller = new AbortController(); note('Loading…');
        try {
            const faction = ['top_user','experience','honor','ships_destroyed'].includes(state.category) ? state.faction : '0';
            const params = new URLSearchParams({category:state.category,faction,limit:'100'});
            if (state.category === 'companies') params.set('metric','experience');
            const response = await fetch('views/api/home_top100.php?' + params, {credentials:'same-origin',signal:controller.signal,headers:{Accept:'application/json'}});
            const data = await response.json();
            if (request !== generation || !overlay) return;
            if (!response.ok || !data.success || !Array.isArray(data.rows)) throw new Error(data.message || 'Ranking unavailable.');
            const rows = data.rows;
            if (state.category === 'your_rank') {
                const player = data.meta && data.meta.player;
                if (!player) { note('Your rank is unavailable.'); return; }
                const card = el('div','hfRankCard');
                if (Number(player.grade) > 0) card.appendChild(icon('grade',player.grade));
                const description = el('div');
                description.append(el('strong','',(player.clan_tag?'['+player.clan_tag+'] ':'')+player.username),
                    el('p','','Grade '+Number(player.grade)+' · Level '+Number(player.level)),
                    el('p','','Experience '+format(player.experience)+' · Honor '+format(player.honor)),
                    el('p','',player.beginner ? 'Beginner · levels 1–11' : 'Beginner ends at level 12'));
                card.appendChild(description); content.replaceChildren(card);
                provenance.textContent = 'Existing Andromeda grade: Honor, then Experience. Grade and icon are preserved.';
            } else if (state.category === 'titles') {
                table(['Title','Holder'],rows,row => {
                    const tr=el('tr'); tr.append(el('td','',row.label || row.title_key),el('td','',row.holder_name || (row.holder_type==='npc'?'NPC':'—'))); return tr;
                });
                provenance.textContent='Current Titles holders; existing eligibility and expiry rules.';
            } else if (state.category === 'companies') {
                table(['#','Company','Experience'],rows,row => {
                    const tr=el('tr'),name=el('td'); name.append(icon('company',row.factionid),document.createTextNode(row.name||''));
                    tr.append(el('td','',row.position),name,el('td','hfScore',format(row.experience))); return tr;
                });
                provenance.textContent='Andromeda adaptation: total Experience of eligible players in each company. The DoPs server formula is not preserved.';
            } else if (state.category === 'clans') {
                table(['#','Clan','Experience'],rows,row => {
                    const tr=el('tr');tr.append(el('td','',row.position),el('td','',(row.clan_tag?'['+row.clan_tag+'] ':'')+row.clan_name),el('td','hfScore',format(row.total_experience)));return tr;
                });
                provenance.textContent='Existing Andromeda clan ranking: total Experience of eligible members.';
            } else {
                const metric={top_user:'User score',experience:'Experience',honor:'Honor',ships_destroyed:'Ships destroyed'}[state.category];
                table(['#','Pilot',metric],rows,row => {
                    const tr=el('tr');tr.append(el('td','',row.position),pilotCell(row),el('td','hfScore',format(row.score)));return tr;
                });
                provenance.textContent=state.category==='top_user'?'Experience / 1000 + Honor / 100 · Official FAQ, November 2013; exact 2010 equivalence unconfirmed.':state.category==='ships_destroyed'?'Eligible player victories recorded by Andromeda.': 'Existing Andromeda statistics and eligibility filters.';
            }
        } catch (error) { if (error.name !== 'AbortError' && request === generation && overlay) note(error.message || 'Ranking unavailable. Please try again.'); }
    }
    document.getElementById('open-top100').addEventListener('click',open,true);
})();
