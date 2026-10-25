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
    let layoutFrame=0, settleTimer=0, contentObserver=null, tablePointerActive=false;
    let state = {category: 'top_user', mode: 'total', faction: '0', gate: '1', event: 'spaceball', scope: 'companies', period: 'latest', occurrence: ''};
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
    function clearTableSchedule() {
        if(layoutFrame)cancelAnimationFrame(layoutFrame);
        if(settleTimer)clearTimeout(settleTimer);
        layoutFrame=settleTimer=0;
    }
    function replaceContent(...nodes) {
        clearTableSchedule();tablePointerActive=false;
        content.classList.remove('hfHasTable');content.scrollTop=0;content.replaceChildren(...nodes);
    }
    function note(text) { replaceContent(el('p','hfEmpty',text)); }
    /** Measured natural rows; a long list may share at most 3px of spare space per row. */
    function wholeRowsLayout(heights, available, header, scrollbar, requestedTop) {
        const safeHeight=Math.max(0,available),capacity=safeHeight-header-scrollbar;
        if(!heights.length||capacity<=0||heights.some(height=>!Number.isFinite(height)||height<=0)){
            return {height:safeHeight,top:Math.max(0,requestedTop),start:0,end:0,snapped:false,adjustment:0};
        }
        const prefix=[0];for(const height of heights)prefix.push(prefix[prefix.length-1]+height);
        let start=0;
        for(let index=1;index<heights.length;index++){
            if(Math.abs(prefix[index]-requestedTop)<Math.abs(prefix[start]-requestedTop))start=index;
        }
        let end=start;
        while(end<heights.length&&prefix[end+1]-prefix[start]<=capacity+.01)end++;
        // An intrinsically taller row remains freely scrollable, never clipped or shortened.
        if(end===start)return {height:safeHeight,top:Math.max(0,requestedTop),start,end,snapped:false,adjustment:0};
        if(end===heights.length){
            while(start>0&&prefix[end]-prefix[start-1]<=capacity+.01)start--;
        }
        const count=end-start,natural=prefix[end]-prefix[start],spare=Math.max(0,capacity-natural);
        const adjustment=heights.length>count&&spare/count<=3?spare/count:0;
        return {height:header+scrollbar+natural+adjustment*count,top:prefix[start],start,end,snapped:true,adjustment,natural};
    }
    function fitTableViewport() {
        if(!overlay||tablePointerActive||!content)return;
        const wrapper=content.querySelector('.hfTableViewport');
        if(!wrapper||!wrapper.isConnected)return;
        const head=wrapper.querySelector('thead'),rows=[...wrapper.querySelectorAll('tbody tr')];
        if(!head)return;
        // Preserve the real row index across width changes and remove our previous minimum heights.
        const previous=wrapper._hfRowHeights;
        let anchor=0,prefix=0,nearest=Math.abs(wrapper.scrollTop);
        if(previous)for(let index=1;index<previous.length;index++){
            prefix+=previous[index-1];const distance=Math.abs(prefix-wrapper.scrollTop);
            if(distance<nearest){anchor=index;nearest=distance;}
        }
        rows.forEach(row=>{row.style.height='';});
        const available=Math.max(0,content.getBoundingClientRect().bottom-wrapper.getBoundingClientRect().top);
        if(!available)return;
        wrapper.style.height=available+'px';
        const scrollbar=Math.max(0,wrapper.offsetHeight-wrapper.clientHeight);
        const heights=rows.map(row=>row.getBoundingClientRect().height);
        const requestedTop=previous?heights.slice(0,anchor).reduce((sum,height)=>sum+height,0):wrapper.scrollTop;
        const layout=wholeRowsLayout(heights,available,head.getBoundingClientRect().height,scrollbar,requestedTop);
        if(layout.adjustment)rows.forEach((row,index)=>{row.style.height=(heights[index]+layout.adjustment)+'px';});
        wrapper.style.height=layout.height+'px';
        const measured=rows.map(row=>row.getBoundingClientRect().height);
        // Table layout rounds fractional CSS pixels. Reconcile only that tiny remainder at the last visible row.
        if(layout.snapped&&layout.adjustment){
            const bodyHeight=measured.slice(layout.start,layout.end).reduce((sum,height)=>sum+height,0);
            const correction=available-head.getBoundingClientRect().height-scrollbar-bodyHeight;
            if(Math.abs(correction)<1){
                const last=layout.end-1;rows[last].style.height=(measured[last]+correction)+'px';
                measured[last]=rows[last].getBoundingClientRect().height;
            }
        }
        const top=measured.slice(0,layout.start).reduce((sum,height)=>sum+height,0);
        if(layout.snapped&&Math.abs(wrapper.scrollTop-top)>.5)wrapper.scrollTop=top;
        wrapper._hfRowHeights=measured;
        wrapper.dataset.wholeRows=String(layout.end-layout.start);
        wrapper.dataset.naturalBodyHeight=String(layout.natural||0);
        wrapper.dataset.rowAdjustment=String(layout.adjustment);
    }
    function scheduleTableLayout() {
        if(!overlay||layoutFrame||tablePointerActive)return;
        layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;fitTableViewport();});
    }
    function scheduleTableSettlement() {
        if(settleTimer)clearTimeout(settleTimer);
        settleTimer=setTimeout(()=>{settleTimer=0;scheduleTableLayout();},120);
    }
    function releaseTablePointer() {
        if(!tablePointerActive)return;
        tablePointerActive=false;scheduleTableSettlement();
    }
    function close() {
        generation++; if (controller) controller.abort();
        if (!overlay) return;
        clearTableSchedule();tablePointerActive=false;
        if(contentObserver)contentObserver.disconnect();contentObserver=null;
        window.removeEventListener('resize',scheduleTableLayout);
        window.removeEventListener('pointerup',releaseTablePointer,true);
        window.removeEventListener('pointercancel',releaseTablePointer,true);
        overlay.remove(); overlay = null;
        document.removeEventListener('keydown',keys,true);
        if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    }
    function keys(event) {
        if (!overlay) return;
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key !== 'Tab') return;
        const fields = [...overlay.querySelectorAll('button,select,summary,[tabindex="0"]')].filter(n => n.getClientRects().length && !n.disabled);
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
    function choice(labelText, name, values, change) {
        const label = el('label','',labelText+' '), select = el('select');
        select.name=name; select.setAttribute('aria-label',labelText);
        for(const [value,text] of values){const option=el('option','',text);option.value=value;select.appendChild(option);}
        select.addEventListener('change',()=>change(select.value));label.appendChild(select);return label;
    }
    function duration(value) {
        const milliseconds=Number(value);
        if(!Number.isSafeInteger(milliseconds)||milliseconds<0)return '—';
        const hours=Math.floor(milliseconds/3600000), minutes=Math.floor(milliseconds/60000)%60, seconds=Math.floor(milliseconds/1000)%60;
        return (hours?String(hours).padStart(2,'0')+':':'')+String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0')+'.'+String(milliseconds%1000).padStart(3,'0');
    }
    function companyCell(row) {
        const name=el('td');name.append(icon('company',row.factionid),document.createTextNode(row.name||''));return name;
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
        const gateTabs=el('div','hfResultTabs');gateTabs.setAttribute('aria-label','Galaxy Gate');
        for(const [id,text] of [['1','ALPHA'],['2','BETA'],['3','GAMMA'],['4','DELTA']]){
            const button=el('button','',text);button.type='button';button.dataset.gate=id;
            button.addEventListener('click',()=>{state.gate=id;render();});gateTabs.appendChild(button);
        }
        const eventFilters=el('div','hfEventFilters');
        eventFilters.append(
            choice('Event','event',[['spaceball','Spaceball'],['tdm','Team Deathmatch'],['invasion','Invasion']],value=>{state.event=value;state.scope='companies';state.period='latest';state.occurrence='';render();}),
            choice('Ranking','scope',[['companies','Companies'],['players','Players']],value=>{state.scope=value;render();}),
            choice('Results','period',[['latest','Latest occurrence'],['total','Totals']],value=>{
                state.period=value==='latest'||value==='total'?value:'occurrence';state.occurrence=state.period==='occurrence'?value:'';render();
            })
        );
        content = el('div','hfContent'); content.setAttribute('aria-live','polite');
        body.append(top,modes,filters,gateTabs,eventFilters,content); frame.append(navigation,closeButton,body);
        overlay.appendChild(frame);
        overlay.addEventListener('click',e => { if (e.target === overlay) close(); });
        document.body.appendChild(overlay); document.addEventListener('keydown',keys,true);
        window.addEventListener('resize',scheduleTableLayout);
        window.addEventListener('pointerup',releaseTablePointer,true);
        window.addEventListener('pointercancel',releaseTablePointer,true);
        if(typeof ResizeObserver==='function'){contentObserver=new ResizeObserver(scheduleTableLayout);contentObserver.observe(content);}
        closeButton.focus(); render();
    }
    function table(headers, rows, build) {
        const wrapper = el('div','hfTableViewport'); const table = el('table'); const head = el('thead');
        wrapper.tabIndex=0;wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','Ranking results');
        const line = el('tr'); headers.forEach(text => line.appendChild(el('th','',text)));
        head.appendChild(line); const body = el('tbody');
        rows.forEach((row,index) => body.appendChild(build(row,index))); table.append(head,body); wrapper.appendChild(table);
        replaceContent(wrapper);content.classList.add('hfHasTable');
        if (!rows.length) wrapper.appendChild(el('p','hfEmpty','No eligible results.'));
        wrapper.addEventListener('pointerdown',()=>{tablePointerActive=true;if(settleTimer)clearTimeout(settleTimer);settleTimer=0;});
        wrapper.addEventListener('scroll',scheduleTableSettlement,{passive:true});
        scheduleTableLayout();
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
        overlay.querySelector('.hfResultTabs').hidden=state.category!=='gates';
        overlay.querySelectorAll('[data-gate]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.gate===state.gate)));
        const eventFilters=overlay.querySelector('.hfEventFilters');eventFilters.hidden=state.category!=='events';
        eventFilters.querySelector('[name=event]').value=state.event;
        eventFilters.querySelector('[name=scope]').parentElement.hidden=state.event!=='tdm';
        eventFilters.querySelector('[name=scope]').value=state.scope;
        eventFilters.querySelector('[name=period]').value=state.period==='occurrence'?state.occurrence:state.period;
        if (state.mode !== 'total' && state.category === 'top_user') {
            note('No ranking available for this period.'); return;
        }
        const pending = {
            aliens_destroyed:'No alien rankings available yet.'
        };
        if (pending[state.category]) { note(pending[state.category]); return; }
        controller = new AbortController(); note('Loading…');
        try {
            const faction = ['top_user','experience','honor','ships_destroyed'].includes(state.category) ? state.faction : '0';
            const params = new URLSearchParams({category:state.category,faction,limit:'100'});
            if (state.category === 'companies') params.set('metric','experience');
            if(state.category==='gates')params.set('gate',state.gate);
            if(state.category==='events'){
                for(const key of ['event','scope','period'])params.set(key,state[key]);
                if(state.period==='occurrence')params.set('occurrence',state.occurrence);
            }
            const response = await fetch('views/api/home_top100.php?' + params, {credentials:'same-origin',signal:controller.signal,headers:{Accept:'application/json'}});
            const data = await response.json();
            if (request !== generation || !overlay) return;
            if (!response.ok || !data.success || !Array.isArray(data.rows)) throw new Error(data.message || 'Ranking unavailable.');
            const rows = data.rows;
            if(state.category==='events'){
                const period=eventFilters.querySelector('[name=period]');
                const occurrences=Array.isArray(data.meta?.occurrences)?data.meta.occurrences:[];
                const values=[['latest','Latest occurrence'],['total','Totals'],...occurrences.map(run=>[run.run_key,(run.started_at||'Unknown date')+' UTC · '+run.status])];
                if(state.period==='occurrence'&&!values.some(item=>item[0]===state.occurrence))values.push([state.occurrence,'Selected occurrence']);
                period.replaceChildren(...values.map(([value,text])=>{const option=el('option','',text);option.value=value;return option;}));
                period.value=state.period==='occurrence'?state.occurrence:state.period;
            }
            if(data.meta?.available===false){note(data.meta.message||'These rankings are not available yet.');return;}
            if (state.category === 'your_rank') {
                const player = data.meta && data.meta.player;
                if (!player) { note('Your rank is unavailable.'); return; }
                const card=el('section','hfYourRank');
                const header=el('h3','hfDailyHeader','YOUR RANK TODAY'),stats=el('dl','hfRankStatistics');
                for(const [label,value] of [['Current grade',player.grade_name||'Unranked'],['Level',format(player.level)],['Experience',format(player.experience)],['Honor',format(player.honor)],['Top User position',player.position==null?'—':format(player.position)]]){
                    const row=el('div'),description=el('dd','',value);
                    if(label==='Current grade'&&Number(player.grade)>0)description.prepend(icon('grade',player.grade));
                    row.append(el('dt','',label),description);stats.appendChild(row);
                }
                const thresholds=player.grade_progression?.thresholds;
                const thresholdValue=threshold=>threshold?.status==='estimate'&&typeof threshold.honor==='string'&&/^-?\d+$/.test(threshold.honor)?format(threshold.honor)+' Honor':'—';
                for(const [label,threshold,cls] of [['Current rank',thresholds?.current,'hfProgression'],['Next grade',thresholds?.next,'hfNextGrade']]){
                    const row=el('div',cls),value=el('dd','',thresholdValue(threshold));
                    row.append(el('dt','',label),value);stats.appendChild(row);
                }
                card.append(header,stats);replaceContent(card);
            } else if(state.category==='gates'){
                table(['#','Pilot','Best time'],rows,row=>{const tr=el('tr');tr.append(el('td','',row.position),pilotCell(row),el('td','hfScore',duration(row.elapsed_ms)));return tr;});
            } else if(state.category==='events'){
                const meta=data.meta||{},selected=meta.selected_occurrence;
                if(state.event==='tdm'&&state.scope==='players'){
                    table(['#','Pilot','Damage','Kills','Deaths'],rows,row=>{const tr=el('tr');tr.append(el('td','',row.position),pilotCell(row),...['damage','kills','deaths'].map(key=>el('td','hfScore',format(row[key]))));return tr;});
                }else{
                    const columns=state.event==='spaceball'?[['goals','Goals']]:state.event==='tdm'?[['match_wins','Wins']]:[['progress','NPCs destroyed'],['damage','Damage']];
                    const showOutcome=state.event==='invasion'&&state.period!=='total';
                    table(['#','Company',...columns.map(item=>item[1]),...(showOutcome?['Result']:[])],rows,row=>{
                        const tr=el('tr');tr.append(el('td','',row.position),companyCell(row),...columns.map(([key])=>el('td','hfScore',format(row[key]))));
                        if(showOutcome)tr.appendChild(el('td','',({COMPLETE:'Completed',INCOMPLETE:'Incomplete',CANCELLED:'Cancelled',WIN:'Won',LOSS:'Lost',DRAW:'Draw',NONE:'—'})[String(row.outcome||'').toUpperCase()]||'—'));return tr;
                    });
                }
                if(selected&&selected.status!=='finished')content.prepend(el('p','hfResultStatus',selected.status==='cancelled'?'This occurrence was cancelled.':selected.status==='interrupted'?'This occurrence was interrupted.':'This occurrence is not complete.'));
            } else if (state.category === 'titles') {
                table(['Title','Holder'],rows,row => {
                    const tr=el('tr'); tr.append(el('td','',row.label || row.title_key),el('td','',row.holder_name || (row.holder_type==='npc'?'NPC':'—'))); return tr;
                });
            } else if (state.category === 'companies') {
                table(['#','Company','Experience'],rows,row => {
                    const tr=el('tr'),name=el('td'); name.append(icon('company',row.factionid),document.createTextNode(row.name||''));
                    tr.append(el('td','',row.position),name,el('td','hfScore',format(row.experience))); return tr;
                });
            } else if (state.category === 'clans') {
                table(['#','Clan','Experience'],rows,row => {
                    const tr=el('tr');tr.append(el('td','',row.position),el('td','',(row.clan_tag?'['+row.clan_tag+'] ':'')+row.clan_name),el('td','hfScore',format(row.total_experience)));return tr;
                });
            } else {
                const metric={top_user:'User score',experience:'Experience',honor:'Honor',ships_destroyed:'Ships destroyed'}[state.category];
                table(['#','Pilot',metric],rows,row => {
                    const tr=el('tr');tr.append(el('td','',row.position),pilotCell(row),el('td','hfScore',format(row.score)));return tr;
                });
            }
        } catch (error) { if (error.name !== 'AbortError' && request === generation && overlay) note(error.message || 'Ranking unavailable. Please try again.'); }
    }
    document.getElementById('open-top100').addEventListener('click',open,true);
})();
