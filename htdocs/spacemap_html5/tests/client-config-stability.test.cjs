// Actual config helpers in Node VM; no browser, gameplay, SQL, image loads or permanent timers.
// Optional baseline path enables differential checks against the unmodified candidate source.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict'), { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'client_config.js'), 'utf8').replace(/\r\n/g, '\n');
const baseline = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n') : null;
let assertions = 0;
function ok(value, label) { assert(value, label); assertions++; }
function equal(a, b, label) { assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), label); assertions++; }
function fn(src, name) { const a=src.indexOf('function '+name+'('), b=src.indexOf('\n}',a); assert(a>=0&&b>a,name); return src.slice(a,b+2); }
function decl(src, name) { const a=src.indexOf('const '+name+' ='), b=src.indexOf('\n;',a); const end=src.indexOf('\n});',a), plain=src.indexOf('\n};',a); assert(a>=0,name); return src.slice(a,Math.min(...[end>=0?end+4:Infinity,plain>=0?plain+3:Infinity,b>=0?b+2:Infinity])); }
function assigned(src,name) { const a=src.indexOf(name+' = function('),b=src.indexOf('\n};',a);assert(a>=0&&b>a,name);return src.slice(a,b+3); }
function noa(src, detectBaselineStall=false) {
 const c={window:{},MAP_WIDTH:21000,MAP_HEIGHT:13100,MAP_MIN_X:0,MAP_MIN_Y:0,STD_MAP_WIDTH:21000};vm.createContext(c);
 let code=src.slice(src.indexOf('const FLASH_NOA_BMP_WIDTH'),src.indexOf('window.getFlashPoiZonesRevision'));
 if(detectBaselineStall)code=code.replace('if (isCollidingWithNoaScaledCoords(p1x, p1y, midX, midY)) {','if ((midX===p1x&&midY===p1y)||(midX===p2x&&midY===p2y)) throw Error("BASELINE_STALL");\n        if (isCollidingWithNoaScaledCoords(p1x, p1y, midX, midY)) {');
 vm.runInContext(code,c);c.run=expression=>vm.runInContext(expression,c,{timeout:200});return c;
}
function setup(c,shape='REC') { c.clearFlashPoiZones(); if(shape==='REC')c.addFlashPoiZone('NOA',1,'REC',0,[4000,4000,8000,8000]);else c.addFlashPoiZone('NOA',2,'CIR',0,[6000,6000,1800]); }
const n=noa(source);
const report={kind:'actual-source Node component tests, not real client gameplay',noa:{},icons:{},performance:{qualification:'Node VM CPU wall time only; not browser FPS/CPU/RAM'}};
// The real raster creates a blocked central cell and four axial neighbors, leaving its diagonals free.
n.addFlashPoiZone('NOA',1,'CIR',0,[400,400,0]);
for(const dx of [-1,0,1])for(const dy of [-1,0,1])if(dx||dy){
 n.run('clearFlashPoiZones(); ensureFlashNoaGrid(); setNoaCell(10,10);');
 const p={x:10+dx,y:10+dy},hit=n.getCollisionPointScaled(p,{x:10,y:10});
 ok(hit&&Number.isFinite(hit.x)&&Number.isFinite(hit.y)&&!n.isNoaCell(hit.x,hit.y),'all eight adjacent approaches return a free cell');
 ok(Math.abs(hit.x-p.x)<=1&&Math.abs(hit.y-p.y)<=1,'adjacent result remains local');
}
for(const val of [NaN,Infinity,-Infinity,Number.MAX_VALUE,Number.MAX_SAFE_INTEGER+1]){
 equal(n.isCollidingWithNoaScaledCoords(0,0,val,0),false,'invalid/unsafe raster coordinate does not enter traversal');
 if(!Number.isFinite(val))equal(n.getCollisionPointScaled({x:1,y:1},{x:val,y:0}),null,'nonfinite bisection rejected');
 equal(n.checkFlashPoiZoneCollisionsValues(0,0,NaN,0),null,'invalid public coordinates rejected');
}
equal(n.getCollisionPointScaled(null,{x:1,y:1}),null,'missing bisection endpoint');
for(const p of [[10,10],[11,11],[0,0]])equal(n.isCollidingWithNoaScaledCoords(...p,...p),p[0]===10,'identical endpoints terminate');
for(const [shape,points]of [['REC',[0,0,NaN,2]],['REC',[0,0,Infinity,2]],['REC',[0,0]],['CIR',[1,1,-1]],['CIR',[1,1,Infinity]],['CIR',null]]){
 n.clearFlashPoiZones();n.addFlashPoiZone('NOA',1,shape,0,points);equal(n.run('flashNoaZones.length'),0,'malformed NOA definition rejected');
}
// No raster clipping: valid out-of-map requests continue through the original Flash line-intersection branch.
setup(n);for(const segment of [[-1e12,6000,1e12,6000],[6000,-1e12,6000,1e12],[-1e12,-1e12,1e12,1e12],[-4000,4000,8000,4000],[0,0,21000,13100]]){
 const q=n.run(`checkFlashPoiZoneCollisionsValues(${segment.join(',')})`);ok(q===null||(Number.isFinite(q.x)&&Number.isFinite(q.y)),'long and boundary request terminates with finite geometry');
}
// Cache result ownership, zone replacement and map reconstruction are exercised through the actual public entry.
setup(n);const first=n.checkFlashPoiZoneCollisionsValues(0,6000,10000,6000),out={};
equal(n.checkFlashPoiZoneCollisionsValues(0,6000,10000,6000,out),first,'cached collision');ok(out===n.checkFlashPoiZoneCollisionsValues(0,6000,10000,6000,out),'scratch object remains caller-owned');
n.clearFlashPoiZones();equal(n.checkFlashPoiZoneCollisionsValues(0,6000,10000,6000),null,'reset removes old geometry');
n.addFlashPoiZone('NOA',2,'REC',0,[12000,4000,14000,8000]);equal(n.checkFlashPoiZoneCollisionsValues(0,6000,10000,6000),null,'rebuild invalidates previous cached collision');
n.addFlashPoiZone('NOA',3,'REC',0,[4000,4000,8000,8000]);equal(n.checkFlashPoiZoneCollisionsValues(0,6000,10000,6000),first,'second rebuild restores geometry');
n.MAP_MIN_X=1000;n.MAP_MIN_Y=-500;equal(n.checkFlashPoiZoneCollisionsValues(1000,5500,11000,5500),{x:first.x+1000,y:first.y-500},'map origin participates in cache');
n.MAP_MIN_X=n.MAP_MIN_Y=0;
let seed=1234567;function random(max){seed=(1664525*seed+1013904223)>>>0;return seed/2**32*max;}
const vectors=[];
for(let i=0;i<2500;i++)vectors.push([random(30000)-4500,random(20000)-3500,random(30000)-4500,random(20000)-3500]);
for(const y of [3999,4000,4001,7999,8000,8001])vectors.push([0,y,21000,y],[21000,y,0,y]);
for(const x of [3999,4000,4001,7999,8000,8001])vectors.push([x,0,x,13100],[x,13100,x,0]);
let equivalent=0,formerlyStalled=0,stalledFlashEquivalent=0;
if(baseline){
 const before=noa(baseline,true);
 const flashIntegerDistance=noa(baseline.replace(/Math\.hypot\(p1x - p2x, p1y - p2y\)/g,'Math.trunc(Math.hypot(p1x - p2x, p1y - p2y))'));
 for(const shape of ['REC','CIR']){
  setup(n,shape);setup(before,shape);setup(flashIntegerDistance,shape);
  equal(n.run('Array.from(flashNoaGrid)'),before.run('Array.from(flashNoaGrid)'),shape+' raster exactly unchanged');
  for(const v of vectors){let expected;try{expected=before.checkFlashPoiZoneCollisionsValues(...v);}catch(e){if(e.message!=='BASELINE_STALL')throw e;formerlyStalled++;const after=n.checkFlashPoiZoneCollisionsValues(...v);ok(after===null||Number.isFinite(after.x)&&Number.isFinite(after.y),'stalled source path now returns');equal(after,flashIntegerDistance.checkFlashPoiZoneCollisionsValues(...v),'repaired stall agrees with Flash integer-distance termination');stalledFlashEquivalent++;continue;}
   equal(n.checkFlashPoiZoneCollisionsValues(...v),expected,'terminating baseline geometry preserved');equivalent++;
  }
 }
}
report.noa={eightDirections:true,invalidAndUnsafe:true,shapeRasterUnchanged:!!baseline,publicVectors:baseline?vectors.length*2:0,baselineTerminatingEquivalent:equivalent,baselineStalledRepaired:formerlyStalled,stalledFlashIntegerDistanceEquivalent:stalledFlashEquivalent,resetCacheAndOrigin:true};
// Exact long-segment formula versus the original raster, including tie slopes and all octants.
let rasterParityCases=0,maxLongRasterProbes=0;
if(baseline){
 const a=noa(baseline),b=noa(source);a.run('ensureFlashNoaGrid()');b.run('ensureFlashNoaGrid()');
 let expected=[],actual=[];
 const record=target=>(x,y)=>{if(x>=0&&y>=0&&x<525&&y<328)target.push([x,y]);return false;};
 function compare(x0,y0,x1,y1){
  expected=[];actual=[];a.isNoaCell=record(expected);b.isNoaCell=record(actual);
  a.isCollidingWithNoaScaledCoords(x0,y0,x1,y1);
  const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
  if(dx||dy)b.isCollidingWithNoaLongScaledCoords(x0,y0,dx,dy,sx,sy);else b.isCollidingWithNoaScaledCoords(x0,y0,x1,y1);
  equal(actual,expected,'exact indexed Bresenham visits identical grid pixels');rasterParityCases++;
 }
 for(const [x,y]of [[10,10],[520,325],[-5,-5],[530,333]])for(let dx=0;dx<=24;dx++)for(let dy=0;dy<=24;dy++)for(const sx of [-1,1])for(const sy of [-1,1])compare(x,y,x+dx*sx,y+dy*sy);
 for(let i=0;i<1000;i++)compare(Math.floor(random(10000)-5000),Math.floor(random(10000)-5000),Math.floor(random(10000)-5000),Math.floor(random(10000)-5000));
}
const long=noa(source);long.run('ensureFlashNoaGrid()');let probes=0;long.isNoaCell=()=>{probes++;return false;};
for(const v of [[-1e9,0,1e9,0],[0,-1e9,0,1e9],[-1e9,-1e9,1e9,1e9],[1e9,1e9,-1e9,-1e9],[-1e12,1e12,1e12,-1e12],[-1e12,-1e12,-1e12+1,-1e12+2]]){
 probes=0;equal(long.isCollidingWithNoaScaledCoords(...v),false,'long direct raster terminates');ok(probes<=526,'work bounded by grid dimensions, not segment length');maxLongRasterProbes=Math.max(maxLongRasterProbes,probes);
}
report.noa.exactRasterParityCases=rasterParityCases;report.noa.maxLongRasterProbes=maxLongRasterProbes;
function icons(src){
 const c={window:{},currentRocketId:1,cpu:{},quickSlots:{},document:{getElementById:()=>null},localStorage:{setItem(){},getItem:()=>null},flashGetActionCpuInfo:code=>c.cpu[code]||null};vm.createContext(c);
 for(const name of ['QUICKBAR_ICON_LOOKUP','FLASH_ACTION_MENU_BUTTON_BINDINGS','FLASH_QUICKBAR_BUTTON_ID_BY_ITEM','FLASH_ACTION_MENU_V2_ALLOWED_IDS'])vm.runInContext(decl(src,name),c);
 vm.runInContext('const FLASH_ACTION_MENU_IMAGE_BASE="graphics/ui/actionMenu/images/"; const FLASH_ACTION_MENU_ITEM_BG_DEFAULT="default"; const FLASH_ACTION_MENU_ITEM_BG_SELECTED="selected";',c);
 for(const name of ['flashResolveActionMenuImagePath','flashActionMenuImage','flashSplitResKey','flashPrimaryResKey','flashLabelFromResKey','flashResolveRocketBuyRocketId','flashResolveActionItemIconPath','flashActionMenuNormalizeAbilityItem','flashActionMenuNormalizeSpecialItem','flashBuildActionMenuItem','flashBuildFallbackQuickbarItem','flashGetQuickbarDisplayItemByButtonId','flashResolveQuickbarButtonId','flashResolveQuickbarItem','flashSerializeQuickbarSlots','flashApplyQuickbarSlotSettingValue'])vm.runInContext(fn(src,name),c);
 if(src.includes('function getQuickbarFallbackIconPath('))vm.runInContext(fn(src,'getQuickbarFallbackIconPath'),c);
 vm.runInContext(decl(src,'FLASH_ACTION_MENU_ROCKET_ICON_BY_ID')+'\nconst FLASH_ACTION_MENU_LAUNCHER_UNLOADED_SYMBOL_EXACT=flashActionMenuImage("rocketlauncher_unloaded_symbol_exact.png");',c);
 // Fastbuy variant choice is an existing separate function; the icon test supplies either selection outcome.
 c.flashResolveFastbuySelectionMeta=()=>({currencyFrame:c.currencyFrame||0});
 vm.runInContext(assigned(src,'getQuickbarIconPath'),c);
 c.def={categories:[]};c.flashGetActionMenuDefinition=()=>c.def;
 c.run=expression=>vm.runInContext(expression,c,{timeout:200});
 const xml=fs.readFileSync(path.join(root,'../spacemap/xml/game.xml'),'utf8').replace(/<!--[\s\S]*?-->/g,'');
 c.xmlItems=[];
 for(const m of xml.matchAll(/<(actionButton|activateButton)\b([^>]+)>/g)){
  const attributes=Object.fromEntries([...m[2].matchAll(/(\w+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
  const node={tagName:m[1],getAttribute:k=>attributes[k]||null};
  c.xmlItems.push(c.flashActionMenuNormalizeSpecialItem(c.flashBuildActionMenuItem(node,'fixture',null,'')));
 }
 c.loadXml=()=>{const allowed=c.run('new Set(Object.values(FLASH_ACTION_MENU_V2_ALLOWED_IDS).flat())');c.def={categories:[{items:c.xmlItems.filter(x=>allowed.has(x.buttonId)),activateButtons:c.xmlItems.filter(x=>x.tagName==='activateButton')}]};};
 return c;
}
const icon=icons(source),oldIcon=baseline?icons(baseline):null;
let validIconComparisons=0,legacyRecursions=0,allBindings=icon.run('Object.keys(FLASH_ACTION_MENU_BUTTON_BINDINGS).map(Number)');
for(const xmlLoaded of [false,true]){
 if(xmlLoaded){icon.loadXml();if(oldIcon)oldIcon.loadXml();}
 for(const id of allBindings){
  const item=icon.flashResolveQuickbarItem(id),result=icon.getQuickbarIconPath(id);
  ok(result===null||typeof result==='string','each binding has terminal icon resolution');
  if(oldIcon){let previous;try{previous=oldIcon.getQuickbarIconPath(id);}catch(e){if(!String(e).includes('Maximum call stack size exceeded'))throw e;legacyRecursions++;continue;}equal(result,previous,'previous working icon unchanged');validIconComparisons++;}
  ok(item.buttonId===id,'button ID never altered');
 }
}
icon.loadXml();if(oldIcon)oldIcon.loadXml();
for(const entry of icon.xmlItems){
 const actual=icon.flashResolveActionItemIconPath(entry,entry);
 if(oldIcon){const other=oldIcon.xmlItems.find(x=>x.buttonId===entry.buttonId);try{equal(actual,oldIcon.flashResolveActionItemIconPath(other,other),'native XML icon unaffected');validIconComparisons++;}catch(e){if(!String(e).includes('Maximum call stack size exceeded'))throw e;}}
}
for(const id of [57,44,43])ok(/plt3030|pld8|wiz/.test(icon.getQuickbarIconPath(id)),'legacy rocket retains its existing native fallback asset');
equal(icon.getQuickbarIconPath(35),null,'missing HM7 fallback remains blank, no unrelated icon invented');
for(const item of [null,{},false,999,{type:'unknown'},{type:'unknown',iconFrames:[]},{type:'unknown',iconPath:''}])equal(icon.getQuickbarIconPath(item),null,'invalid/missing icon safely blank');
equal(icon.flashResolveActionItemIconPath({iconPath:'native/path'},null),'native/path','explicit valid path takes precedence');
equal(icon.flashResolveActionItemIconPath({iconFrames:['native/frame'],iconPath:'fallback'},null),'native/frame','native frame precedence');
for(const buttonId of [23,42])for(const level of [1,2,4,6,99])for(const state of [false,true]){
 icon.cpu[buttonId===23?'ROB':'AMB']={level,state};if(oldIcon)oldIcon.cpu[buttonId===23?'ROB':'AMB']={level,state};
 equal(icon.getQuickbarIconPath(buttonId),oldIcon?oldIcon.getQuickbarIconPath(buttonId):icon.getQuickbarIconPath(buttonId),'CPU frame variants retained');
}
for(const currencyFrame of [0,1]){icon.currencyFrame=currencyFrame;if(oldIcon)oldIcon.currencyFrame=currencyFrame;const item={buttonId:25,iconFrames:['credits','uridium']};equal(icon.flashResolveActionItemIconPath(item,item),currencyFrame?'uridium':'credits','FastBuy currency frame');}
// Settings/drag normalization uses the same real resolver; UI gesture dispatch is not simulated as gameplay.
icon.flashApplyQuickbarSlotSettingValue('57,44,43,35,3,54,63,26,46,48');
equal(icon.flashSerializeQuickbarSlots(),'57,44,43,35,3,54,63,26,46,48','legacy settings and serialized slot order preserved');
for(let slot=1;slot<=10;slot++){const normalized=icon.flashResolveQuickbarItem(icon.quickSlots[slot]);equal(normalized.buttonId,icon.quickSlots[slot].buttonId,'drag/config re-normalization preserves identity');icon.getQuickbarIconPath(normalized);}
icon.flashApplyQuickbarSlotSettingValue('39,7,11,23,42,56,53,67,31,50');
equal(icon.flashSerializeQuickbarSlots(),'39,7,11,23,42,56,53,67,31,50','second layout/config uses current icons');
report.icons={allBindings:allBindings.length,xmlItems:icon.xmlItems.length,previousWorkingPathsEquivalent:validIconComparisons,baselineRecursionCases:legacyRecursions,legacyRocketNativeFallback:true,missingHm7:'null / no invented asset',settingsAndNormalization:true};
// Warm timings, medians only. There are no production timers in these helper slices.
function sample(f,iterations){const times=[];for(let round=0;round<7;round++){const t=performance.now();for(let i=0;i<iterations;i++)f(i);times.push(performance.now()-t);}return times.sort((a,b)=>a-b)[3];}
const perfNoa=noa(source),perfOld=baseline?noa(baseline):null;setup(perfNoa);if(perfOld)setup(perfOld);
report.performance.raster20000Ms={before:perfOld?sample(()=>perfOld.isCollidingWithNoaScaledCoords(0,0,525,0),20000):null,after:sample(()=>perfNoa.isCollidingWithNoaScaledCoords(0,0,525,0),20000)};
report.performance.cachedCollision50000Ms={before:perfOld?sample(()=>perfOld.checkFlashPoiZoneCollisionsValues(0,6000,10000,6000),50000):null,after:sample(()=>perfNoa.checkFlashPoiZoneCollisionsValues(0,6000,10000,6000),50000)};
report.performance.icon20000Ms={before:oldIcon?sample(()=>oldIcon.getQuickbarIconPath(3),20000):null,after:sample(()=>icon.getQuickbarIconPath(3),20000)};
report.assertions=assertions;report.result='PASS';console.log(JSON.stringify(report,null,2));
