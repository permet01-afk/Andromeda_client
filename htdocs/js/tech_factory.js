(function () {
    'use strict';
    const root = document.getElementById('tech-factory');
    const configNode = document.getElementById('tf-config');
    if (!root || !configNode) return;
    const config = JSON.parse(configNode.textContent);
    const descriptions = {
        1: ['10% of eligible laser damage returned as hitpoints.', 'Active 15 min · Cooldown 30 min from activation'],
        2: ['Shield damage to up to 7 nearby targets.', 'Instant effect · Cooldown 1 min'],
        3: ['100% hit chance for eligible normal rockets.', 'Active 10 min · Cooldown 6 min after the effect'],
        4: ['Restores up to 75,000 shield points.', 'Instant restoration · Cooldown 45 sec'],
        5: ['Repairs up to 80,000 hitpoints over 8 pulses.', 'Stops at maximum HP · Cooldown 45 sec']
    };
    const smallX = {1:168,2:112,3:280,4:224,5:336};
    const bigX = {1:304,2:228,3:456,4:380,5:532};
    let selected = 1, selectedHall = 1, state = null, busy = false, inFlight = false;
    let anchor = performance.now(), nextPoll = 0, failures = 0;
    const pending = new Map();
    const el = id => document.getElementById('tf-' + id);
    const text = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt = value => Number(value || 0).toLocaleString('en-US');
    const catalog = () => state ? state.catalog : (config.catalog || []);
    const amount = id => state ? Number((state.stocks.find(x => x.tech_id === id) || {}).amount || 0) : 0;
    const now = () => state ? state.server_now + (performance.now() - anchor) / 1000 : 0;
    const duration = seconds => { const s=Math.max(0,Math.ceil(seconds)); return s>=3600?`${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m`:s>=60?`${Math.floor(s/60)}m ${s%60}s`:`${s}s`; };
    const icon = (id, large, count = null) => `<span class="tf-icon${large?' large':''}" style="background-position:-${(large?bigX:smallX)[id]}px 0">${count===null?'':`<span class="tf-count" title="${fmt(count)}">${count>0?fmt(count):''}</span>`}</span>`;
    function message(value, kind = '') { el('status').textContent=value;el('status').className='tf-status '+kind; }
    function validState(value) {
        return value && value.available === true && Number.isFinite(value.server_now)
            && Array.isArray(value.catalog) && value.catalog.length === 5
            && value.catalog.every((x,i)=>x.tech_id===i+1 && typeof x.displayName==='string' && ['buildCredits','buildSeprom','buildLogfiles','buildSeconds'].every(k=>Number.isSafeInteger(x[k])&&x[k]>=0))
            && Array.isArray(value.stocks) && value.stocks.length===5 && value.stocks.every((x,i)=>x.tech_id===i+1&&Number.isInteger(x.amount)&&x.amount>=0&&x.amount<=2147483647)
            && Array.isArray(value.halls) && value.halls.length===3 && value.halls.every((x,i)=>x.slot_no===i+1&&typeof x.unlocked==='boolean')
            && Array.isArray(value.builds) && value.builds.every(x=>Number.isInteger(x.tech_id)&&x.tech_id>=1&&x.tech_id<=5&&Number.isInteger(x.slot_no)&&x.slot_no>=1&&x.slot_no<=3&&Number.isFinite(x.started_at)&&Number.isFinite(x.ends_at))
            && value.resources && ['credits','uridium','logfiles','seprom'].every(k=>Number.isFinite(value.resources[k])&&value.resources[k]>=0);
    }
    function render() {
        const list=catalog(), tech=list.find(x=>x.tech_id===selected);
        if (!tech) { message('Tech Factory catalogue is unavailable.','error'); return; }
        const stock=amount(selected), resources=state?state.resources:{}, builds=state?state.builds:[];
        const halls=state?state.halls:[1,2,3].map(n=>({slot_no:n,unlocked:n===1,unlockCost:n===2?50000:n===3?100000:0}));
        el('catalog').innerHTML=list.map(t=>`<button type="button" data-tech="${t.tech_id}" class="${selected===t.tech_id?'picked':''}" aria-label="${text(t.displayName)}, owned ${amount(t.tech_id)}">${icon(t.tech_id,false,amount(t.tech_id))}<span>${text(t.displayName)}</span></button>`).join('');
        const free=halls.filter(h=>h.unlocked&&!builds.some(b=>b.slot_no===h.slot_no));
        if (!free.some(h=>h.slot_no===selectedHall) && free.length) selectedHall=free[0].slot_no;
        const failure=!state?'Loading...':!state.skylab_available?'Skylab unavailable':resources.credits<tech.buildCredits?'Not enough Credits.':resources.seprom<tech.buildSeprom?'Not enough Seprom.':resources.logfiles<tech.buildLogfiles?'Not enough Log Files.':!free.length?'No free hall':stock>=2147483647?'Technical stock limit reached.':'';
        el('detail').innerHTML=`<h2>${text(tech.displayName)}</h2><div class="tf-detail-top">${icon(selected,true,stock)}<div class="tf-effect">${descriptions[selected][0]}<small>${descriptions[selected][1]}</small></div></div>${[['Credits','credits','buildCredits'],['Seprom','seprom','buildSeprom'],['Log Files','logfiles','buildLogfiles']].map(([name,key,cost])=>`<div class="tf-cost"><span>${name}</span><b class="${state&&resources[key]<tech[cost]?'missing':''}">${fmt(tech[cost])}</b></div>`).join('')}<div class="tf-cost"><span>Build time</span><strong>${duration(tech.buildSeconds)}</strong></div><label class="tf-choice">Production hall <select id="tf-hall-select" ${busy||!free.length?'disabled':''}>${free.length?free.map(h=>`<option value="${h.slot_no}" ${h.slot_no===selectedHall?'selected':''}>Hall ${h.slot_no} · Available</option>`).join(''):'<option>No free hall</option>'}</select></label><button type="button" id="tf-build" class="tf-build" ${busy||failure?'disabled':''} title="${text(failure)}">${busy?'Please wait...':failure||'Build'}</button><div class="tf-foot">Owned: ${fmt(stock)} · 1 tech per build</div>`;
        el('halls').innerHTML=halls.map(h=>{
            const build=builds.find(b=>b.slot_no===h.slot_no), t=build?list.find(x=>x.tech_id===build.tech_id):null;
            if (!h.unlocked) return `<div class="tf-hall"><span class="tf-icon large" style="background-position:-76px 0"></span><button class="tf-unlock" data-unlock="${h.slot_no}" ${busy||!state||resources.uridium<h.unlockCost?'disabled':''}>Unlock - ${fmt(h.unlockCost)} U.</button></div>`;
            if (build) return `<div class="tf-hall" title="Paid: ${fmt(build.paid_credits)} Credits / ${fmt(build.paid_seprom)} Seprom / ${fmt(build.paid_logfiles)} Log Files"><span class="tf-icon large" style="background-position:-${bigX[build.tech_id]}px 0"><span class="tf-remaining" data-ends="${build.ends_at}"></span></span><div class="tf-meter"><span data-progress="${build.id}" data-start="${build.started_at}" data-end="${build.ends_at}"></span></div><div class="tf-hall-info">Hall ${h.slot_no} · ${text(t.displayName)}</div></div>`;
            return `<div class="tf-hall ${h.slot_no===selectedHall?'selected':''}"><button type="button" class="tf-icon large tf-hall-icon" style="background-position:0 0" data-hall="${h.slot_no}" aria-label="Select hall ${h.slot_no}" ${busy?'disabled':''}></button><div class="tf-hall-info good">Hall ${h.slot_no} · Available</div></div>`;
        }).join('');
        el('recipes').innerHTML=list.map(t=>`<tr class="${t.tech_id===selected?'active':''}"><td>${text(t.displayName)}</td><td class="owned">${fmt(amount(t.tech_id))}</td><td>${fmt(t.buildCredits)}</td><td>${fmt(t.buildSeprom)}</td><td>${fmt(t.buildLogfiles)}</td><td>${duration(t.buildSeconds)}</td></tr>`).join('');
        el('resources').innerHTML=state?`<span>Credits <b>${fmt(resources.credits)}</b></span><span>Uridium <b>${fmt(resources.uridium)}</b></span><span>Seprom · Skylab <b>${fmt(resources.seprom)}</b></span><span>Log Files <b>${fmt(resources.logfiles)}</b></span><span>Halls <b>${halls.filter(h=>h.unlocked).length} / 3</b></span>`:'Checking resources...';
        root.querySelectorAll('[data-tech]').forEach(button=>button.onclick=()=>{if(!busy){selected=Number(button.dataset.tech);render();}});
        root.querySelectorAll('[data-hall]').forEach(button=>button.onclick=()=>{selectedHall=Number(button.dataset.hall);render();});
        root.querySelectorAll('[data-unlock]').forEach(button=>button.onclick=()=>action('unlock',{slot_no:Number(button.dataset.unlock)}));
        el('hall-select').onchange=event=>{selectedHall=Number(event.target.value);render();};
        el('build').onclick=()=>action('build',{tech_id:selected,slot_no:selectedHall});
        tick();
    }
    function tick() {
        root.querySelectorAll('[data-ends]').forEach(node=>{const left=Number(node.dataset.ends)-now();node.textContent=left>0?duration(left)+' remaining':'Completing...';});
        root.querySelectorAll('[data-progress]').forEach(node=>{const start=Number(node.dataset.start),end=Number(node.dataset.end);node.style.width=(Math.min(1,Math.max(0,(now()-start)/Math.max(1,end-start)))*100)+'%';});
    }
    function requestKey(operation,args) {
        const key=`tf:${config.playerKey}:${operation}:${JSON.stringify(args)}`;
        let value=pending.get(key);
        try { value=value||sessionStorage.getItem(key); } catch (_) {}
        if (!value) {
            const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
            const hex=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
            value=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
            pending.set(key,value);try{sessionStorage.setItem(key,value);}catch(_){}
        }
        return {key,value};
    }
    async function request(operation,args={}) {
        const body=new URLSearchParams({action:operation,csrf_token:config.csrf,...args});
        const response=await fetch(config.endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body});
        const result=await response.json();
        if (!result.success) { const error=new Error(result.message||'Tech Factory is temporarily unavailable.');error.status=response.status;throw error; }
        if (!validState(result.state)) throw new Error('Invalid Tech Factory response.');
        state=result.state;anchor=performance.now();failures=0;
        const credits=document.getElementById('pilot-credits'), uridium=document.getElementById('pilot-uridium');
        if(credits)credits.textContent=fmt(state.resources.credits);if(uridium)uridium.textContent=fmt(state.resources.uridium);
        return result;
    }
    async function action(operation,args) {
        if (busy||inFlight||!state) return;
        const key=requestKey(operation,args);busy=true;inFlight=true;render();
        try {
            const result=await request(operation,{...args,request_key:key.value});
            pending.delete(key.key);try{sessionStorage.removeItem(key.key);}catch(_){}
            message(result.message||'Tech Factory updated.','good');
        } catch(error) {
            if(error.status===409){pending.delete(key.key);try{sessionStorage.removeItem(key.key);}catch(_){}}
            message(error.message,'error');
            // An uncertain response keeps the SAME request key for a safe retry.
        } finally {busy=false;inFlight=false;nextPoll=performance.now()+5000;render();}
    }
    async function refresh() {
        if(inFlight||busy||document.hidden)return;
        inFlight=true;
        try{
            const result=await request('settle');
            if(result.completed&&result.completed.length)message(result.completed.map(x=>'Tech completed: '+x.displayName+' +1').join(' · '),'good');
            else if(el('status').classList.contains('error')||!nextPoll)message('Tech Factory ready. Select a tech to start production.');
        }catch(error){state=null;failures++;message(error.message,'error');}
        finally{inFlight=false;nextPoll=performance.now()+Math.min(30000,5000*Math.max(1,failures));render();}
    }
    render();refresh();
    setInterval(()=>{tick();if(performance.now()>=nextPoll)refresh();},1000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){nextPoll=0;refresh();}});
})();
