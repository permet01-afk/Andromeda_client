// Owner-approved map compositions and production renderer. No network/DB/server.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
let checks = 0;
function ok(value, message) { assert(value, message); checks++; }
function equal(a, b, message) { assert.deepEqual(a, b, message); checks++; }
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n');
const c = { console, Math, Number, Map, WeakMap, Uint8Array, performance: { now: () => 0 } };
vm.createContext(c);
vm.runInContext(read('client_map_decor_data.js') + '\n' + read('client_map_decor.js') +
    '\nthis.Renderer=MapDecorRenderer;this.assets=MAP_DECOR_ASSETS;this.maps=MAP_DECOR_DEFINITIONS;', c);
const json = value => JSON.parse(JSON.stringify(value));
equal(Object.keys(c.maps).map(Number), [1,2,3,4,5,6,7,8,9,14,15,23,24,25,26,28,29,51,52,53,83], 'only approved maps');
equal(Object.values(c.maps).reduce((n,m)=>n+m.planets.length,0),34,'31 astres + 3 panels');
equal(Object.values(c.maps).reduce((n,m)=>n+m.flares.length,0),24,'24 separate flares');
equal(Object.values(c.maps).reduce((n,m)=>n+m.flares.filter(f=>f.star).length,0),18,'18 stars');
equal(json(c.maps[1].flares[0]),{xmlId:1,x:310,y:408,pFactor:10,star:true},'1-1 owner Unknown coordinates');
equal([c.assets.planet12.pivotX,c.assets.planet12.pivotY],[490.4,246.95],'3-1 owner pivot');
equal(c.maps[28].flares.length,2,'duplicate XML id preserved');
ok(c.maps[28].flares[0].xmlId===c.maps[28].flares[1].xmlId,'3-8 fixture has duplicate id');
ok(c.maps[29].planets.every(p=>p.asset==='pirateOneway'&&p.pFactor===1),'panels not portals');
ok(!c.maps[17]&&!c.maps[21]&&c.maps[25].flares.length===1,'Invasion x-5 normal compositions');
ok(!c.maps[16]&&!c.maps[13]&&!c.maps[81],'4-4, 4-1, legacy Invasion untouched');
const provenance=JSON.parse(read('graphics/map-decor/provenance.json'));
for(const asset of provenance.assets){
    const bytes=fs.readFileSync(path.join(root,asset.asset));
    equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.asset+' exact bytes');
    ok(bytes.subarray(1,4).toString()==='PNG',asset.asset+' PNG');
}
for(const [key,a]of Object.entries(c.assets)){
    const bytes=fs.readFileSync(path.join(root,a.src));
    equal([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],a.frames?[1600,1600]:[a.width,a.height],key+' native dimensions');
}
const images=new Map();let cold=false,canvasAllocations=0;
function image(src){if(!images.has(src)){const a=Object.values(c.assets).find(a=>a.src===src);images.set(src,{complete:!cold,width:a.width,height:a.height,src});}return images.get(src);}
function canvas(w,h){canvasAllocations++;return{getContext(){return{drawImage(){},getImageData(){const rgba=new Uint8Array(w*h*4);rgba[(10*w+10)*4+3]=255;return{data:rgba}}}}};}
const renderer=()=>new c.Renderer(c.assets,c.maps,image,canvas);
const view={width:1920,height:1080,cameraX:10500,cameraY:6550,mouseX:1200,enabled:true};
const empty=()=>({ships:[],stations:[]});
let draws=[],translates=[],scales=[],rotations=[],stack=[];
const ctx={globalAlpha:1,globalCompositeOperation:'source-over',save(){stack.push([this.globalAlpha,this.globalCompositeOperation]);},restore(){[this.globalAlpha,this.globalCompositeOperation]=stack.pop();},translate(...p){translates.push(p)},rotate(v){rotations.push(v)},scale(...s){scales.push(s)},drawImage(...d){draws.push({args:d,alpha:this.globalAlpha,blend:this.globalCompositeOperation})}};
function reset(){draws=[];translates=[];scales=[];rotations=[];}
let r=renderer();r.setMap(1);
equal(json(r.project(c.maps[1].planets[0],view)),{x:-124,y:114.33333333333326},'Flash truncation occurs before parallax subtraction');
r.drawPlanets(ctx,view,0);equal(draws.length,0,'planet fade begins transparent');
r.drawPlanets(ctx,view,250);equal(draws.length,2,'both 1-1 planets ready');
ok(draws.every(d=>d.alpha===.75&&d.blend==='source-over'),'Quad fade and native blend');
equal(scales.length,0,'no planet rescale');equal(ctx.globalAlpha,1,'caller alpha restored');
reset();r.drawPlanets(ctx,view,500);equal(draws[0].args.slice(1),[-266.55,-266.55],'native registration pivot');
for(let t=0;t<=1000;t+=40)r.drawFlares(ctx,view,t,empty);
ok(r.flares[0].alphaTo===1&&r.flares[0].state===0,'unoccluded flare visible');
const angle=r.flares[0].rotation;
r.drawFlares(ctx,{...view,cameraX:10510},1040,empty);equal(r.flares[0].rotation,angle,'horizontal motion does not rotate star');
r.drawFlares(ctx,{...view,cameraX:10520,cameraY:6560},1080,empty);equal(r.flares[0].rotation,angle+.15,'diagonal motion rotates .15 degrees');
// A planet hides the entire flare. Emerging triggers exactly one LensFlash.
r=renderer();r.setMap(1);const hidden={...view,cameraX:9100,cameraY:4000},emerge={...view,cameraX:9200,cameraY:4000};
for(let t=0;t<=600;t+=40)r.drawFlares(ctx,hidden,t,empty);
equal(r.flares[0].state,4,'planet occlusion');equal(r.alpha(r.flares[0],600),0,'fade reaches zero');
r.drawFlares(ctx,emerge,640,empty);r.drawFlares(ctx,emerge,680,empty);
equal(r.flares[0].flashAt,680,'LensFlash starts on emergence');equal(r.flashAlpha(r.flares[0],930),.75,'LensFlash peak');
equal(r.flashAlpha(r.flares[0],3930),0,'LensFlash ends after 3.25 seconds');
ok(r.flares[0].flashAt===null&&!r.flares[0].useLensFlash,'no recurring flash');
// Ships block in logical space at their runtime clickRadius, without planet flash.
r=renderer();r.setMap(25);const source={...view,cameraX:9820,cameraY:6040};
const ship=()=>({ships:[{x:9820,y:6040,radius:45}],stations:[]});
for(let t=0;t<=600;t+=40)r.drawFlares(ctx,source,t,ship);
equal(r.flares[0].state,4,'hero / NPC square occluder');
r.drawFlares(ctx,source,640,empty);r.drawFlares(ctx,source,680,empty);
equal(r.flares[0].flashAt,null,'ship uncover does not cause LensFlash');
// Station transparent padding must not eclipse a star; alpha is cached once.
const station={x:9820,y:6040,image:{complete:true,width:100,height:100}};
ok(!r.behindStation(960,540,station,source),'transparent station center');
ok(r.behindStation(920.5,500.5,station,source),'opaque station pixel with radius-5 probe');
ok(r.behindStation(924.5,500.5,station,source),'probe overlaps adjacent opaque pixel');
equal(canvasAllocations,1,'station alpha decoded only once');
// XML duplicate ids survive map initialization, quality toggles, and map switches.
r.setMap(28);equal(r.flares.length,2,'3-8 two live instances');
r.drawFlares(ctx,view,0,empty);r.setMap(16);reset();r.drawFlares(ctx,view,1000,empty);r.drawPlanets(ctx,view,1000);equal(draws.length,0,'no leaking decor into 4-4');
r.setMap(1);reset();r.drawPlanets(ctx,{...view,enabled:false},0);r.drawFlares(ctx,{...view,enabled:false},0,empty);equal(draws.length,0,'SHOW_BACKGROUND off');
r.drawPlanets(ctx,view,500);r.drawPlanets(ctx,view,1000);equal(draws.length,2,'ON rebuilds planets');
// Late loads from old map must never repopulate the current map.
images.clear();cold=true;r=renderer();r.setMap(1);reset();r.drawPlanets(ctx,view,0);r.drawFlares(ctx,view,0,empty);equal(draws.length,0,'cold cache no premature draws');
r.setMap(16);for(const image of images.values())image.complete=true;r.drawPlanets(ctx,view,500);r.drawFlares(ctx,view,500,empty);equal(draws.length,0,'late images cannot resurrect previous map');
cold=false;r.setMap(1);r.drawPlanets(ctx,view,1000);r.drawPlanets(ctx,view,1500);equal(draws.length,2,'warm revisit uses cached assets');
const previous=r.planets;r.setMap(1);ok(r.planets===previous,'same-map XML reload preserves state');
// Lens5 retains its last valid scale when far away, as in Flash.
r=renderer();r.setMap(25);r.drawFlares(ctx,source,0,empty);equal(r.flares[0].lens5Scale,.165,'lens5 near source scale');
r.drawFlares(ctx,{...source,cameraX:16820},40,empty);equal(r.flares[0].lens5Scale,.165,'lens5 out-of-range scale is retained');
// Production integration, visual alias and render ordering.
const config=read('client_config.js'),graphics=read('client_graphics.js'),boot=read('client_bootstrap.js'),php=read('spacemap.php');
function fn(src,name){const a=src.indexOf('function '+name+'('),b=src.indexOf('\n}',a);assert(a>=0&&b>a);return src.slice(a,b+2);}
Object.assign(c,{mapBackgroundLayersById:{83:[{typeId:999}],16:[{typeId:16}]},getBackgroundTypeForMap:()=>null,getBackgroundParallaxForMap:()=>10});
vm.runInContext(fn(config,'getBackgroundLayersForMap'),c);
equal(json(c.getBackgroundLayersForMap(83)),[{typeId:82,layer:0,parallax:10,shiftX:0,shiftY:0}],'TDM83 explicit visual82 even after XML load');
equal(json(c.getBackgroundLayersForMap(16)),[{typeId:16}],'4-4 XML remains unchanged');
equal(json(c.getBackgroundLayersForMap(999)),[],'no invented decor for unknown maps');
ok(graphics.indexOf('drawMapPlanets(now)')<graphics.indexOf('    drawStarfield();'),'planets before stars');
ok(boot.indexOf('drawMapBackground(now)')<boot.indexOf('        drawEntities();'),'planets behind gameplay');
ok(boot.indexOf('drawMapFlares(now)')>boot.indexOf('        drawSabShots();')&&boot.indexOf('drawMapFlares(now)')<boot.indexOf('        drawRadiationOverlay();'),'flares above gameplay below HUD');
ok(php.indexOf('src="client_map_decor_data.js')<php.indexOf('src="client_map_decor.js')&&php.indexOf('src="client_map_decor.js')<php.indexOf('src="client_bootstrap.js'),'data/renderer loaded before first render');
equal(c.assets.star.fps,60,'MovieClip animation uses stage 60fps');
// Adapter uses live/interpolated positions, includes hero once, excludes portals/loot.
Object.assign(c,{shipX:100,shipY:200,heroId:7,heroShipId:1,stations:[{x:500,y:600,type:'base'}],stationImages:{base:station.image},
    getShipClickRadius:id=>id===1?30:60,getEntityInterpolatedPosition:entity=>({x:entity.x+5,y:entity.y+10}),
    entities:{7:{kind:'player',shipId:1,x:100,y:200},8:{kind:'npc',shipId:2,x:300,y:400},9:{kind:'box',x:0,y:0}}});
equal(json(c.getMapDecorOccluders().ships),[{x:100,y:200,radius:30},{x:305,y:410,radius:60}],'hero and interpolated NPC adapter');
equal(c.getMapDecorOccluders().stations[0].image,station.image,'station adapter reads the rendered image');
// Caller transform/alpha/blend remain owned by Phase 6 and subsequent gameplay/HUD.
reset();ctx.globalAlpha=.5;ctx.globalCompositeOperation='lighter';r.sprite(ctx,'planet1',960,540,.5);
equal(draws[0].alpha,.25,'sprite multiplies caller alpha');equal(draws[0].blend,'source-over','decor blend overrides only inside save');
equal(ctx.globalAlpha,.5,'alpha restored');equal(ctx.globalCompositeOperation,'lighter','blend restored');equal(stack.length,0,'all context saves balanced');
console.log(JSON.stringify({pass:true,checks,scope:'production JS, native asset hashes, lifecycle/occlusion; offline; no DB'}));
