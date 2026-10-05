// Isolated Phase 7 contracts: production JS, simulated DOM/API. No server or DB.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8').replace(/\r\n/g,'\n');
const ui=read('client_ui.js'),graphics=read('client_graphics.js'),quests=read('client_quests.js');
let checks=0;const ok=(v,m)=>{assert(v,m);checks++;};
const fn=(s,n)=>{const a=s.indexOf('function '+n+'('),b=s.indexOf('\n}',a);assert(a>=0&&b>a,n);return s.slice(a,b+2);};
function el(){const classes=new Set();return{dataset:{},classList:{toggle(n,v){v?classes.add(n):classes.delete(n)},remove(n){classes.delete(n)},contains:n=>classes.has(n)},getBoundingClientRect:()=>({left:10,top:20,right:110,bottom:120,width:100,height:100})};}
const storage=new Map(),windows=[],styles=[],listeners={};
const c={window:{ANDROMEDA_CONFIG:{userID:14},addEventListener:(n,f)=>listeners[n]=f},
 localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
 document:{querySelectorAll:s=>s.includes('PointerWithin')?windows.filter(w=>w.classList.contains('flashChromePointerWithin')):windows.filter(w=>w.dataset.flashTransparency==='1'),getElementById:id=>styles.find(s=>s.id===id),createElement:()=>({}),head:{appendChild:s=>styles.push(s)},addEventListener:(n,f)=>listeners[n]=f},
 getFlashWindowMeta:key=>key==='map'?{transparency:true}:key==='settings'?{transparency:false}:null};
vm.createContext(c);const run=s=>vm.runInContext(s,c);
run(ui.slice(ui.indexOf('const WINDOW_BACKGROUNDS_STORAGE_KEY'),ui.indexOf('const SETTINGS_DEFAULTS')));
ok(run('showWindowBackgrounds')===true,'default ON');
const map=el(),settings=el(),unknown=el();windows.push(map,settings,unknown);
c.registerFlashWindowChrome(map,'map');c.registerFlashWindowChrome(settings,'settings');c.registerFlashWindowChrome(unknown,'missing');
ok(map.dataset.flashTransparency==='1','metadata compatible');ok(!settings.dataset.flashTransparency&&!unknown.dataset.flashTransparency,'false/missing metadata excluded');
c.setWindowBackgroundPreference(false);ok(map.classList.contains('flashChromeAutoHide'),'OFF hides eligible chrome');ok(!settings.classList.contains('flashChromeAutoHide'),'ineligible unaffected');
ok(storage.get('andromeda_window_backgrounds_v1:14')==='0','account scoped persistence');
ok(styles[0].textContent.includes('opacity 250ms'),'250ms contract');
ok(!styles[0].textContent.includes('pointer-events')&&!styles[0].textContent.includes('gwContent'),'no content/hitbox mutation');
listeners.pointermove({clientX:60,clientY:60});ok(map.classList.contains('flashChromePointerWithin'),'canvas passthrough hover');
listeners.pointermove({clientX:300,clientY:60});ok(!map.classList.contains('flashChromePointerWithin'),'leave');
listeners.pointerdown({clientX:60,clientY:60});ok(map.classList.contains('flashChromePointerWithin'),'touch recovers chrome');
listeners.blur();ok(!map.classList.contains('flashChromePointerWithin'),'blur clears hover');
c.setWindowBackgroundPreference(true);ok(!map.classList.contains('flashChromeAutoHide'),'ON restores baseline style');
c.localStorage.getItem=()=>{throw Error('blocked')};c.localStorage.setItem=()=>{throw Error('blocked')};c.setWindowBackgroundPreference(false);ok(run('showWindowBackgrounds')===false,'storage unavailable session works');
const fresh={...c,window:{...c.window},document:c.document};vm.createContext(fresh);vm.runInContext(ui.slice(ui.indexOf('const WINDOW_BACKGROUNDS_STORAGE_KEY'),ui.indexOf('const SETTINGS_DEFAULTS')),fresh);ok(vm.runInContext('showWindowBackgrounds',fresh)===true,'blocked storage defaults ON');
const paths=[];const draw={globalAlpha:1,save(){this.old=this.globalAlpha},restore(){this.globalAlpha=this.old},beginPath(){},rect(...p){paths.push(['rect',...p])},moveTo(){},ellipse(...p){paths.push(['ellipse',...p])},fill(){paths.push(['alpha',this.globalAlpha])}};
const p={MAP_MIN_X:0,MAP_MIN_Y:0};vm.createContext(p);vm.runInContext(fn(graphics,'drawMinimapPoiZones'),p);
p.drawMinimapPoiZones(draw,10,20,.01,.01,[{zoneType:'NOA',shape:'REC',points:[100,200,300,400]},{zoneType:'NOA',shape:'CIR',points:[500,500,100]},{zoneType:'HEA',shape:'REC',points:[0,0,500,500]}]);
ok(paths[0].join(',')==='rect,11,22,2,2','POI uses existing world projection');ok(paths[1][0]==='ellipse'&&paths[1][1]===15&&paths[1][3]===1,'circle geometry');ok(Math.abs(paths[2][1]-.4)<1e-8&&draw.globalAlpha===1,'Flash Bitmap alpha .4, context restored');ok(paths.length===3,'non-filled types not invented');

{ // Window10: real metadata parsing and size resolution, including old user geometry.
const xml=fs.readFileSync(path.join(root,'..','spacemap/xml/game.xml'),'utf8');
const attrs=Object.fromEntries([...xml.match(/<window\b[^>]*\bid="10"[^>]*\/>/)[0].matchAll(/(\w+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const geomStore=new Map([['andromeda_window_geometry_v1',JSON.stringify({quest:{w:580,h:450},log:{w:410,h:230}})]]);
const g={window:{},localStorage:{getItem:k=>geomStore.get(k)},
 _getFlashWindowDefById:id=>id===10?{getAttribute:n=>attrs[n]??null}:null};
vm.createContext(g);
for(const name of ['_flashParseBool','_flashParseInt','getFlashWindowMeta','getFlashWindowRuntimeConfig','resolveWindowContainerSymbol','resolveWindowOffsetProfile','shouldApplyResizerExtentForWindow','getPersistedWindowGeometry','readPersistedWindowGeometryStore','resolveFlashWindowOuterSize','enforceFlashWindowBaseSize'])vm.runInContext(fn(graphics,name),g);
vm.runInContext('const FLASH_WINDOW_ID_BY_KEY={quest:10}; const WINDOW_GEOMETRY_STORAGE_KEY="andromeda_window_geometry_v1";'+graphics.slice(graphics.indexOf('const FLASH_WINDOW_OFFSET_PROFILES ='),graphics.indexOf('\nfunction resolveWindowContainerSymbol')),g);
const fallbackText=graphics.slice(graphics.indexOf('    quest: {'),graphics.indexOf('    booster: {'));
const fallback=vm.runInContext('({'+fallbackText+'})',g).quest;
const cfg=g.getFlashWindowRuntimeConfig('quest',fallback);
ok(cfg.w===200&&cfg.h===200&&fallback.w===200&&fallback.h===200,'XML and no-XML fallback 200x200 logical');
ok(!cfg.resizable&&!cfg.closeable&&cfg.startMinimized&&cfg.hudToggle&&cfg.transparency,'Quest XML flags retained, no forced resize');
ok(!cfg.flashUseRuntimeOuterSize,'old Quest runtime size override removed');
ok(g.resolveWindowContainerSymbol(cfg)==='windowContainer1','same non-resizable container as local Flash');
const el={style:{left:'123px',top:'234px'},dataset:{flashUserWidth:'580',flashUserHeight:'450'}};
const storedBefore=geomStore.get('andromeda_window_geometry_v1');
for(const old of [[560,430],[580,450],[940,780]]){
 geomStore.set('andromeda_window_geometry_v1',JSON.stringify({quest:{w:old[0],h:old[1]},log:{w:410,h:230}}));
 const before=geomStore.get('andromeda_window_geometry_v1');
 g.enforceFlashWindowBaseSize('quest',el,cfg);
 ok(el.style.width==='220px'&&el.style.height==='220px','old persisted/live Quest size ignored '+old.join('x'));
 ok(el.style.left==='123px'&&el.style.top==='234px','Quest position preserved '+old.join('x'));
 ok(geomStore.get('andromeda_window_geometry_v1')===before,'no window storage erased '+old.join('x'));
}
const reloaded={style:{},dataset:{}};g.enforceFlashWindowBaseSize('quest',reloaded,cfg);
ok(reloaded.style.width==='220px'&&reloaded.dataset.flashResizable==='0','fresh DOM after reload also ignores old size');
const log=g.resolveFlashWindowOuterSize('log',{w:300,h:200,resizable:true},{dataset:{}});
ok(log.outerW===410&&log.outerH===230,'other resizable window restores its stored geometry');
g._getFlashWindowDefById=()=>null;
const offlineCfg=g.getFlashWindowRuntimeConfig('quest',fallback),offlineSize=g.resolveFlashWindowOuterSize('quest',offlineCfg,{dataset:{}});
ok(offlineSize.outerW===220&&offlineSize.outerH===220&&!offlineCfg.resizable,'missing XML stays compact with same outer semantics');

}
let timers=[],calls=[],data,resolvePending=null;
const rootEl={innerHTML:'',classList:{add(){}},style:{setProperty(){}},querySelector:()=>null,querySelectorAll:()=>[],contains:()=>false};
const store=new Map(),win={style:{display:'block'},querySelector:()=>null,classList:{add(){}}};
const q={console,URLSearchParams,Number,Math,Date,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
 document:{getElementById:id=>id==='content_quest'?rootEl:id==='win_quest'?win:null,activeElement:null,createElement:()=>({}),head:{appendChild(){}}},
 window:{ANDROMEDA_CONFIG:{userID:14},setInterval:()=>1,setTimeout:f=>{timers.push(f);return timers.length},clearTimeout:id=>{timers[id-1]=null}},
 fetch:async(url,options)=>{calls.push({url,options});if(resolvePending===true)await new Promise(r=>resolvePending=r);return{ok:true,json:async()=>JSON.parse(JSON.stringify(data))}}};
vm.createContext(q);
vm.runInContext(quests.replace(/\}\)\(\);\s*$/,'window.testQuest={state,render,loadQuests,performQuestAction,objectiveComplete};})();'),q);
const t=q.window.testQuest;
const quest=(code,extra={})=>({code,title:code,group:'basic',status:'in_progress',objectives:[{label:'Kill',current:1,required:2}],...extra});
const payload=list=>({ok:true,csrfToken:'csrf-fixture',maxActive:5,activeQuests:list,weekly:{meta:{},missions:[]}});
async function tests(){
 data=payload([]);await t.loadQuests(true);ok(rootEl.innerHTML.includes('Quest page'),'empty acceptance help');
 data=payload([quest('a')]);await t.loadQuests(false);ok((rootEl.innerHTML.match(/data-quest-select=/g)||[]).length===1,'one dot');ok(rootEl.innerHTML.includes('is-running')&&!rootEl.innerHTML.includes('is-completed'),'running state');
 data=payload([quest('a'),quest('b',{is_complete:true,objectives:[{label:'Kill',current:2,required:2}]})]);await t.loadQuests(false);t.state.selectedKey='basic:b';t.render();ok(rootEl.innerHTML.includes('Claim Reward')&&rootEl.innerHTML.includes('is-completed'),'completed selected quest');ok(!rootEl.innerHTML.includes('Abort Quest'),'only selected quest rendered');ok(store.get('andromeda_quest_selection_v1:14')==='basic:b','selection persisted');
 data=payload([quest('a')]);await t.performQuestAction('claim','b','basic');ok(t.state.selectedKey==='basic:a','claim removal fallback');let post=calls.at(-1);ok(post.options.method==='POST'&&post.options.body.includes('csrf_token=csrf-fixture')&&post.options.body.includes('quest_code=b'),'claim API/CSRF unchanged');
 data=payload([]);await t.performQuestAction('abort','a','basic');ok(t.state.selectedKey===''&&rootEl.innerHTML.includes('No active quests'),'abort last quest fallback');ok(calls.at(-1).options.body.includes('action=abort'),'abort POST');
 data=payload([quest('a'),quest('b'),quest('c')]);await t.loadQuests(false);t.state.selectedKey='basic:b';t.render();data=payload([quest('a'),quest('c')]);await t.loadQuests(false);ok(t.state.selectedKey==='basic:c','removed selection chooses next index');
 t.state.selectedKey='basic:a';t.render();data.activeQuests[0].objectives[0].current=2;await t.loadQuests(false);ok(rootEl.innerHTML.includes('is-completed'),'live progress becomes completed');
 const before=calls.length;q.window.scheduleQuestRefreshFromServer();q.window.scheduleQuestRefreshFromServer();q.window.scheduleQuestRefreshFromServer();for(const cb of timers.splice(0)){if(cb)cb()}await new Promise(r=>setImmediate(r));ok(calls.length===before+1,'QST debounce coalesces refresh');
 resolvePending=true;const pending=t.loadQuests(false);await new Promise(r=>setImmediate(r));ok(t.state.loading,'background GET holds in-flight lock');const count=calls.length;await t.performQuestAction('abort','a','basic');ok(calls.length===count,'no action racing older GET');await t.loadQuests(false);ok(calls.length===count&&t.state.needsRefresh,'overlapping GET queued');resolvePending();resolvePending=null;await pending;
 data=payload([quest('a',{title:'<img onerror=x>',objectives:Array.from({length:40},()=>({label:'<script>x</script>',current:0,required:10}))})]);await t.loadQuests(false);ok(!rootEl.innerHTML.includes('<script>')&&rootEl.innerHTML.includes('&lt;script&gt;'),'escaped API text');ok((rootEl.innerHTML.match(/html5QuestObjectiveLine/g)||[]).length===40,'all real objectives retained');
 data=payload([]);data.weekly.missions=[quest('w',{group:'weekly',status:'in_progress'})];await t.loadQuests(false);ok(!rootEl.innerHTML.includes('Abort Quest')&&rootEl.innerHTML.includes('Weekly'),'weekly no abort preserved');data.weekly.missions[0].is_complete=true;await t.loadQuests(false);ok(rootEl.innerHTML.includes('Claim Reward'),'weekly claim preserved');data.weekly.missions[0].status='claimed';await t.loadQuests(false);ok(!rootEl.innerHTML.includes('Claim Reward')&&rootEl.innerHTML.includes('Claimed'),'weekly claimed preserved');
 ok(!quests.includes('requestAnimationFrame'),'no RAF added');ok(!quests.includes('9|'),'no legacy9');ok(!quests.includes('is-upcoming'),'no invented sequence');
 console.log(JSON.stringify({pass:true,checks,scope:'production JS; simulated DOM/API; no DB'}));
}
tests().catch(e=>{console.error(e);process.exitCode=1});
