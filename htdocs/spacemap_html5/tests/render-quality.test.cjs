// Fixed-FOV geometry, resize and allocation tests. No network, DB or browser required.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const config=fs.readFileSync(path.join(root,'client_config.js'),'utf8').replace(/\r\n/g,'\n');
const graphics=fs.readFileSync(path.join(root,'client_graphics.js'),'utf8').replace(/\r\n/g,'\n');
const entities=fs.readFileSync(path.join(root,'client_entities.js'),'utf8').replace(/\r\n/g,'\n');
function fn(s,n){const a=s.indexOf('function '+n+'('),b=s.indexOf('\n}',a);assert(a>=0&&b>a,n);return s.slice(a,b+2);}
let checks=0;function ok(value,message){assert(value,message);checks++;}
let timers=new Map(),timerId=0;
let allocations=0,limit=Infinity,queued=[],draws=[],matrix=[],clears=0;
const ctx={setTransform(...m){matrix=m;},fillRect(){},clearRect(){clears++;},getImageData(){if(canvas.width*canvas.height>limit)throw Error('allocation fixture');return{data:[0,0,0,255]};}};
let cw=1920,ch=1080;
const canvas={get width(){return cw},set width(v){cw=v;allocations++},get height(){return ch},set height(v){ch=v;allocations++},style:{},getBoundingClientRect:()=>({left:13,top:27,width:c.window.innerWidth,height:c.window.innerHeight})};
const c={console,Math,Number,Map,setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id),LOGICAL_WIDTH:1920,LOGICAL_HEIGHT:1080,canvas,ctx,worldScale:1,
 displayScaleX:1,displayScaleY:1,navigator:{userAgent:'Desktop'},window:{innerWidth:1920,innerHeight:1080,devicePixelRatio:1},
 requestAnimationFrame:fn=>{queued.push(fn);return queued.length},ensureHudRoot(w,h){ok(w===1920&&h===1080,'HUD stays logical')},invalidateMinimapLayoutCache(){},getMapViewScaleValue:()=>1};
vm.createContext(c);const run=s=>vm.runInContext(s,c);
run(config.slice(config.indexOf('// Gameplay and HUD stay'),config.indexOf('function getWorldScaleValue()')));
const surfaces=[],points=[[0,0],[960,540],[1920,0],[0,1080],[1920,1080]];
let seed=123456789;for(let i=0;i<60;i++){seed=(1664525*seed+1013904223)>>>0;const x=seed/2**32*1920;seed=(1664525*seed+1013904223)>>>0;points.push([x,seed/2**32*1080]);}
let maxError=0;
for(const [w,h]of [[1280,720],[1920,1080],[2560,1440],[3840,2160],[3440,1440],[800,600],[7680,4320]])for(const d of [1,1.25,1.5,2,3]){
 const s=c.computeRenderSurface(w,h,d);surfaces.push(s);
 ok(s.width*s.height<=8294400,'bounded pixel budget');ok(s.width<=8192&&s.height<=8192,'dimension cap');
 for(const [x,y]of points){const px=x*s.scaleX,py=y*s.scaleY;const cssX=px/s.width*w+13,cssY=py/s.height*h+27;const q=c.clientPointToLogical(cssX,cssY,{left:13,top:27,width:w,height:h});const err=Math.max(Math.abs(q.x-x),Math.abs(q.y-y));maxError=Math.max(maxError,err);ok(err<1e-9,'logical/backing/CSS/input roundtrip');}
}
for(const [w,h]of [[1280,720],[1920,1080],[2560,1440],[3440,1440],[1920,1080]]){
 c.window.innerWidth=w;c.window.innerHeight=h;c.window.devicePixelRatio=2;c.refreshCanvasScale();
 ok(c.worldScale===1,'worldScale unchanged');ok(matrix[0]===canvas.width/1920&&matrix[3]===canvas.height/1080,'logical matrix');
 const before=allocations;c.refreshCanvasScale();ok(allocations===before,'no repeated backing allocation');
 for(let i=0;i<20;i++)c.scheduleRenderSurfaceRefresh();ok(queued.length===1&&timers.size===1,'resize coalesced and debounced');queued.shift()();ok(allocations===before,'live resize updates CSS without allocation');for(const f of timers.values())f();timers.clear();
}
limit=2500000;c.window.innerWidth=3440;c.window.innerHeight=1440;run('renderAllocationPixelLimit=MAX_BACKING_PIXELS');c.refreshCanvasScale();
ok(canvas.width*canvas.height<=limit,'allocation failure downgrades');const allocAfter=allocations;c.refreshCanvasScale();ok(allocations===allocAfter,'failure budget retained, no resize loop');limit=Infinity;
ok(c.computeRenderSurface(1920,1080,3,true).width*c.computeRenderSurface(1920,1080,3,true).height<=2073600,'mobile isolated budget');
ok(c.computeRenderSurface(NaN,0,NaN).width===1920,'invalid size safe fallback');
// Same actual viewport and world projection at every backing and existing zoom.
c.cameraX=5000;c.cameraY=3000;c.getWorldScaleValue=()=>1;c.mapToScreenX=x=>960+x-c.cameraX;c.mapToScreenY=y=>540+y-c.cameraY;
c.getMapViewRenderScale=()=>c.getMapViewScaleValue();
run(fn(entities,'getWorldViewportScale')+'\n'+fn(entities,'mapToViewportScreenX')+'\n'+fn(entities,'mapToViewportScreenY')+'\n'+fn(entities,'screenToMapInto')+'\n'+fn(graphics,'getCurrentLogicalViewportRect'));
for(const zoom of [.7,1,1.4])for(const s of surfaces){c.getMapViewScaleValue=()=>zoom;cw=s.width;ch=s.height;
 const v=c.getCurrentLogicalViewportRect();ok(Math.abs(v.right-v.left-1920/zoom)<1e-9&&Math.abs(v.bottom-v.top-1080/zoom)<1e-9,'same FOV');
 for(const pos of [[5000,3000],[5200,3300],[4700,2900]]){const x=c.mapToViewportScreenX(pos[0]),y=c.mapToViewportScreenY(pos[1]);const out=c.screenToMapInto(x,y,{});ok(Math.abs(out.x-pos[0])<1e-9&&Math.abs(out.y-pos[1])<1e-9,'movement world roundtrip');}}
// Actual selection and minimap action functions, with synthetic entities/transport only.
Object.assign(c,{heroId:1,performance:{now:()=>1000},getEntityInterpolatedPosition:e=>e,
 entities:{2:{id:2,kind:'npc',x:5250,y:3200},3:{id:3,kind:'player',x:4780,y:2840},4:{id:4,kind:'box',x:5100,y:2650},5:{id:5,kind:'portal',x:5500,y:2900}},
 getEntityDrawScale:()=>1,getMinimapMapRect:()=>({x:1650,y:900,w:211,h:132}),
 MAP_MIN_X:0,MAP_MIN_Y:0,MAP_MAX_X:21000,MAP_MAX_Y:13000,MAP_WIDTH:21000,MAP_HEIGHT:13000,MINIMAP_WIDTH:211,MINIMAP_HEIGHT:132,groupPingMode:false,
 sendMoveToServer(x,y){c.sentMove=[x,y]},shipX:5000,shipY:3000});
for(const name of ['pointInRect','isPointInRect','resolveEntityVisualShipId','getFlashShipCircleHitProfile','getEntityHitTestProfile','findEntityAtScreenPos','handleMinimapMapClick'])run(fn(entities,name));
for(const s of surfaces){cw=s.width;ch=s.height;for(const zoom of [.7,1,1.4]){c.getMapViewScaleValue=()=>zoom;
 for(const e of Object.values(c.entities)){const x=c.mapToViewportScreenX(e.x),y=c.mapToViewportScreenY(e.y);const pointer=c.clientPointToLogical(x/1920*s.cssWidth+13,y/1080*s.cssHeight+27,{left:13,top:27,width:s.cssWidth,height:s.cssHeight});ok(c.findEntityAtScreenPos(pointer.x,pointer.y,null,60)?.id===e.id,'same NPC/ship/box/portal selection');}}
 for(const [fx,fy]of [[0,0],[.5,.5],[1,1]]){const x=1650+211*fx,y=900+132*fy;const p=c.clientPointToLogical(x/1920*s.cssWidth,y/1080*s.cssHeight,{left:0,top:0,width:s.cssWidth,height:s.cssHeight});ok(c.handleMinimapMapClick(p.x,p.y),'minimap click accepted');ok(Math.abs(c.sentMove[0]-fx*21000)<1e-8&&Math.abs(c.sentMove[1]-fy*13000)<1e-8,'same minimap destination');}}

// A DPR media-query change removes the old watcher and schedules exactly one refresh.
const watched=[];let removed=0;
c.window.matchMedia=query=>{const media={query,addEventListener(type,cb){this.callback=cb},removeEventListener(){removed++}};watched.push(media);return media};
c.window.devicePixelRatio=1;c.watchRenderDevicePixelRatio();c.window.devicePixelRatio=1.5;watched[0].callback();
ok(watched[1].query.includes('1.5dppx')&&removed===1,'DPR watcher rearmed without polling');ok(queued.length===1,'DPR update coalesced');queued.shift()();for(const f of timers.values())f();timers.clear();
// Real HUD CSS inverse and real minimap DOM bounds, independent from backing pixels.
c.hudRoot={style:{},getBoundingClientRect:()=>({left:13,top:27})};
c.window.getHudRoot=()=>c.hudRoot;
run(fn(config,'ensureHudRoot'));
run(config.slice(config.indexOf('window.getHudScaleX ='),config.indexOf('window.getHudRoot =')));
run(config.slice(config.indexOf('window.clientToHudCoords ='),config.indexOf('window.getHudElementPos =')));
c.MINIMAP_INFO_HEIGHT=26;c.MINIMAP_WINDOW_DIMENSION_PADDING=10;c.MINIMAP_HEADER_HEIGHT=20;c.minimapScaleFactor=1;c.minimapLayoutCache={};
let cssRect=(x,y,w,h)=>({left:13+x*c.displayScaleX,top:27+y*c.displayScaleY,width:w*c.displayScaleX,height:h*c.displayScaleY});
const domPart=(x,y,w,h)=>({getBoundingClientRect:()=>cssRect(x,y,w,h)});
const zoom=Object.assign(domPart(1820,850,20,20),{classList:{contains:()=>false,toggle(){}}});
const mapWindow={style:{},dataset:{},getBoundingClientRect:()=>cssRect(1650,850,231,178),querySelector:selector=>({'.gwHeader':domPart(1650,850,231,20),'.gwContent':domPart(1660,870,211,158),'.zoomInBtn':zoom})[selector]||null};
c.document={getElementById:id=>id==='win_map'?mapWindow:null};c.window.getComputedStyle=()=>({getPropertyValue:()=>0});run(fn(config,'getMinimapLayout'));
for(const surf of surfaces){c.window.innerWidth=surf.cssWidth;c.window.innerHeight=surf.cssHeight;c.displayScaleX=surf.cssWidth/1920;c.displayScaleY=surf.cssHeight/1080;cw=surf.width;ch=surf.height;c.minimapLayoutCache={};
 c.ensureHudRoot(1920,1080);ok(c.hudRoot.style.transform===`scale(${surf.cssWidth/1920}, ${surf.cssHeight/1080})`,'DOM scale excludes DPR');
 for(const [x,y]of [[960,540],[680,1015],[1820,850],[20,20]]){const v=c.window.clientToHudCoords(13+x*c.displayScaleX,27+y*c.displayScaleY);ok(Math.abs(v.x-x)<1e-9&&Math.abs(v.y-y)<1e-9,'HUD/quickbar/window hotzone inverse');}
 const layout=c.getMinimapLayout();ok(Math.abs(layout.contentX-1660)<1e-9&&Math.abs(layout.mapY-896)<1e-9,'minimap DOM overlay aligns at any DPR');ok(Math.abs(layout.zoomInHitbox.x-1820)<1e-9&&Math.abs(layout.zoomInHitbox.w-20)<1e-9,'minimap zoom button hitbox');
}
// A resize burst leaves the logical world unchanged while CSS immediately fills the window.
c.window.innerWidth=1920;c.window.innerHeight=1080;run('renderAllocationPixelLimit=MAX_BACKING_PIXELS');c.refreshCanvasScale();
const rasterBefore=[cw,ch],assignBefore=allocations;
for(let i=0;i<20;i++){c.window.innerWidth=2000+i*10;c.window.innerHeight=1200+i*5;c.scheduleRenderSurfaceRefresh();}
queued.shift()();ok(allocations===assignBefore&&cw===rasterBefore[0]&&ch===rasterBefore[1],'burst has no raster churn');
ok(canvas.style.width==='2190px'&&canvas.style.height==='1295px','CSS follows the newest viewport before allocation');
const mid=c.clientPointToLogical(13+2190/2,27+1295/2,canvas.getBoundingClientRect());ok(mid.x===960&&mid.y===540,'input stays logical during debounce');
ok(timers.size===1,'one settled resize timer');for(const f of timers.values())f();timers.clear();ok(allocations===assignBefore+2,'one width/height allocation after settle');
// Cache allocation fallback preserves logical dimensions and rejects oversized entries before allocation.
run('const NAMEPLATE_TEXT_CACHE_BYTES=8*1024*1024;');run(fn(graphics,'createNameplateBitmap'));
let cacheAssignments=0;c.document.createElement=()=>{let w=0,h=0;const b={get width(){return w},set width(v){w=v;cacheAssignments++},get height(){return h},set height(v){h=v;cacheAssignments++},getContext(){return{isContextLost:()=>w>1100,setTransform(){}}}};return b};
const fallbackBitmap=c.createNameplateBitmap(1000,50,3);ok(fallbackBitmap.width===1000&&fallbackBitmap.logicalWidth===1000&&fallbackBitmap.logicalHeight===50,'text fallback retains logical geometry');
const assignmentsBefore=cacheAssignments;ok(c.createNameplateBitmap(1000000,1000000,3)===null&&cacheAssignments===assignmentsBefore,'oversized text refused before canvas allocation');
// Quickbar positions and the historical anchor margins are logical, including without XML.
run(config.match(/^const FLASH_QUICKBAR_(SLOT_WIDTH|SLOT_HEIGHT|GAP) = .*;$/gm).join('\n'));
for(const name of ['flashGetQuickbarResolutionId','flashGetQuickbarDefaultPositionFromXml','flashQuickbarAnchorIsValid','flashEnsureQuickbarPositionInitialized','flashApplyQuickbarPositionSettingValue','flashSendQuickbarPositionToServer','finishQuickbarInteraction'])run(fn(config,name));
const settings=[];
Object.assign(c,{quickbarPosition:{x:700,y:900},quickbarLastValidPosition:{x:700,y:900},quickbarInitialized:true,quickbarSlotDragState:null,isDraggingQuickbar:false,sendSetting:(key,value)=>settings.push({key,value})});
c.window.ANDROMEDA_CONFIG={resolutionID:'0'};
const getElementById=c.document.getElementById;
c.document.getElementById=id=>id==='gameCanvas'?canvas:getElementById(id);
const quickbarCases=[];
for(const [w,h,dpr]of [[1280,720,1],[1280,720,2],[1920,1080,1],[1920,1080,2],[3840,2160,1]]){
 c.window.innerWidth=w;c.window.innerHeight=h;c.window.devicePixelRatio=dpr;c.refreshCanvasScale();
 ok(c.flashQuickbarAnchorIsValid(1000,800),'visible logical anchor accepted at every backing');
 ok(c.flashQuickbarAnchorIsValid(1888,1060),'historical right/bottom anchor margins inclusive');
 ok(!c.flashQuickbarAnchorIsValid(1889,1060)&&!c.flashQuickbarAnchorIsValid(1888,1061),'one logical pixel outside anchor margins rejected');
 ok(!c.flashQuickbarAnchorIsValid(1900,1070)&&!c.flashQuickbarAnchorIsValid(-1,0),'overflow and negative anchors rejected');
 c.window._gameXmlDoc=null;
 const fallback=c.flashGetQuickbarDefaultPositionFromXml();
 ok(fallback.x===787&&fallback.y===1005,'fallback retains historical 1920x1080 placement independent of DPR');
 c.window._gameXmlDoc={querySelector:()=>({getAttribute:key=>key==='slotMenuXPos'?'812':'943'})};
 const xmlPosition=c.flashGetQuickbarDefaultPositionFromXml();
 ok(xmlPosition.x===812&&xmlPosition.y===943,'explicit XML placement unchanged');
 c.window._gameXmlDoc=null;
 c.quickbarPosition={x:1000,y:800};c.quickbarLastValidPosition={x:700,y:900};c.isDraggingQuickbar=true;
 const sentBefore=settings.length;c.finishQuickbarInteraction(null);c.isDraggingQuickbar=false;
 ok(settings.length===sentBefore+1&&settings.at(-1).key==='SLOTMENU_POSITION,0'&&settings.at(-1).value==='1000,800','release saves same logical SLOTMENU_POSITION');
 c.quickbarPosition={x:1900,y:1070};c.isDraggingQuickbar=true;c.finishQuickbarInteraction(null);c.isDraggingQuickbar=false;
 ok(settings.length===sentBefore+1&&c.quickbarPosition.x===1000&&c.quickbarPosition.y===800,'invalid release restores last valid position without saving');
 // Resize/DPR changes the backing, never the initialized logical position or saved preference.
 c.window.devicePixelRatio=dpr===1?2:1;c.window.innerWidth=w===1280?1920:1280;c.window.innerHeight=w===1280?1080:720;
 c.scheduleRenderSurfaceRefresh();queued.shift()();for(const f of timers.values())f();timers.clear();
 c.flashEnsureQuickbarPositionInitialized();
 ok(c.quickbarPosition.x===1000&&c.quickbarPosition.y===800&&settings.length===sentBefore+1,'resize/DPR change leaves logical quickbar and preference stable');
 c.quickbarPosition={x:0,y:0};c.quickbarInitialized=false;c.flashApplyQuickbarPositionSettingValue(settings.at(-1).value);
 ok(c.quickbarPosition.x===1000&&c.quickbarPosition.y===800&&c.quickbarInitialized&&c.quickbarLastValidPosition.x===1000,'saved position reloads unchanged');
 quickbarCases.push({css:[w,h],dpr,fallback:[fallback.x,fallback.y],saved:settings.at(-1).value});
}
const result={pass:true,checks,maxError,allocations,clears,surfaces};
result.quickbarCases=quickbarCases;
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify({pass:true,checks,maxError}));
