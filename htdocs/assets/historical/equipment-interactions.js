/* Private AFTER-only adaptation: Windows-style selection on Andromeda's existing inventory.
   This is not recovered official DoPs ActionScript. No inventory, drop, save or API is replaced. */
(function(){
  'use strict';
  function start(){
    if(!/\/equip_ui\.html$/i.test(location.pathname)||!document.body.classList.contains('historical-site'))return;
    if(window.AndromedaEquipmentSelection)return;
    if(typeof Selection==='undefined'||typeof clearSelection!=='function'||typeof addTokenToSelection!=='function'||typeof addSlotToSelection!=='function')return;
    const anchors=new WeakMap();
    let rectangle=null;
    let suppressClick=null;
    const threshold=4;
    const interactive='button,a,input,select,textarea,label,[role="button"],.tab,.modeTab,.invTab,.sectionHead,.bar,.item-tooltip,.confirm-overlay,#designModal';
    function visible(node){
      if(!(node instanceof HTMLElement)||!node.isConnected)return false;
      const box=node.getBoundingClientRect();
      return box.width>0&&box.height>0&&getComputedStyle(node).visibility!=='hidden';
    }
    function surfaceFor(node,kind){
      if(kind==='inv')return node.closest('#invPanel .invWrap');
      return node.closest('#shipSection,#dronesSection');
    }
    function itemInfo(node,kind){
      if(!visible(node))return null;
      if(kind==='inv'){
        if(!node.matches('#invPanel .token[data-item-id]'))return null;
        const id=Number(node.dataset.itemId);
        if(!Number.isSafeInteger(id)||id<=0||typeof DATA==='undefined'||!DATA.items||!DATA.items[id])return null;
        return DATA.items[id];
      }
      if(!node.matches('#rightPanel .slot.filled[data-item]'))return null;
      try{
        const item=JSON.parse(node.dataset.item||'null');
        return item&&Number.isSafeInteger(Number(item.id))&&Number(item.id)>0?item:null;
      }catch(_){return null;}
    }
    function locate(target){
      if(!(target instanceof Element))return null;
      const token=target.closest('#invPanel .token[data-item-id]');
      if(token&&itemInfo(token,'inv'))return {node:token,kind:'inv',surface:surfaceFor(token,'inv')};
      const slot=target.closest('#rightPanel .slot.filled[data-item]');
      if(slot&&itemInfo(slot,'slot'))return {node:slot,kind:'slot',surface:surfaceFor(slot,'slot')};
      return null;
    }
    function nodesIn(surface,kind){
      const selector=kind==='inv'?'.token[data-item-id]':'.slot.filled[data-item]';
      return Array.from(surface.querySelectorAll(selector)).filter(node=>itemInfo(node,kind));
    }
    function selectedSet(kind){return kind==='inv'?Selection.invTokens:Selection.slotCells;}
    function releaseTooltip(){
      // Native hideTooltip deliberately ignores locked Sell tooltips; modifiers dismiss that lock first.
      if(typeof tooltipLocked!=='undefined')tooltipLocked=false;
      if(typeof hideTooltip==='function')hideTooltip();
    }
    function snapshot(){return {kind:Selection.kind,inv:Array.from(Selection.invTokens),slot:Array.from(Selection.slotCells)};}
    function apply(kind,nodes){
      const next=new Set(nodes.filter(node=>itemInfo(node,kind)));
      const opposite=kind==='inv'?Selection.slotCells:Selection.invTokens;
      if(Selection.kind!==kind||opposite.size)clearSelection();
      const current=selectedSet(kind);
      Array.from(current).forEach(node=>{
        if(!next.has(node)){node.classList.remove('selected');current.delete(node);}
      });
      next.forEach(node=>{
        if(!current.has(node))(kind==='inv'?addTokenToSelection:addSlotToSelection)(node);
      });
      Selection.kind=current.size?kind:null;
    }
    function restore(saved){
      clearSelection();
      if(saved.kind==='inv')apply('inv',saved.inv);
      else if(saved.kind==='slot')apply('slot',saved.slot);
    }
    function stopNativePaint(){
      if(typeof paintSelecting==='undefined'||!paintSelecting)return;
      paintSelecting=false;
      paintKind=null;
      if(typeof paintDisableDrag!=='undefined'&&paintDisableDrag){
        if(typeof setDraggableAllTokens==='function')setDraggableAllTokens(true);
        if(typeof setDraggableAllFilledSlots==='function')setDraggableAllFilledSlots(true);
        paintDisableDrag=false;
      }
    }
    function suppressNextClick(surface){suppressClick={surface,until:performance.now()+900};}
    function finish(cancelled){
      if(!rectangle)return;
      const saved=rectangle;
      rectangle=null;
      saved.box.remove();
      document.body.classList.remove('hist-marquee-active');
      try{if(saved.surface.hasPointerCapture(saved.pointerId))saved.surface.releasePointerCapture(saved.pointerId);}catch(_){}
      if(cancelled)restore(saved.original);
      else suppressNextClick(saved.surface);
    }
    function beginRectangle(e,surface,kind){
      const area=surface.getBoundingClientRect();
      // Leave native scrollbars and controls alone.
      if(e.clientX>=area.left+surface.clientWidth||e.clientY>=area.top+surface.clientHeight)return;
      e.preventDefault();e.stopImmediatePropagation();
      const original=snapshot();
      const additive=!!e.shiftKey;
      const toggle=!!(e.ctrlKey||e.metaKey);
      const base=(toggle||additive)&&Selection.kind===kind?Array.from(selectedSet(kind)):[];
      if(!toggle&&!additive)clearSelection();
      const box=document.createElement('div');box.className='hist-equipment-marquee';box.setAttribute('aria-hidden','true');box.hidden=true;
      document.body.appendChild(box);
      rectangle={surface,kind,original,base,newNodes:nodesIn(surface,kind),pointerId:e.pointerId,x:e.clientX,y:e.clientY,box,toggle,additive,moved:false};
      document.body.classList.add('hist-marquee-active');
      releaseTooltip();
      try{surface.setPointerCapture(e.pointerId);}catch(_){}
    }
    function updateRectangle(e){
      const r=rectangle;if(!r||e.pointerId!==r.pointerId)return;
      e.preventDefault();e.stopImmediatePropagation();
      if(!r.surface.isConnected){finish(true);return;}
      if(!r.moved&&Math.hypot(e.clientX-r.x,e.clientY-r.y)<threshold)return;
      r.moved=true;r.box.hidden=false;
      const area=r.surface.getBoundingClientRect();
      const left=Math.max(area.left,Math.min(r.x,e.clientX)),top=Math.max(area.top,Math.min(r.y,e.clientY));
      const right=Math.min(area.right,Math.max(r.x,e.clientX)),bottom=Math.min(area.bottom,Math.max(r.y,e.clientY));
      Object.assign(r.box.style,{left:left+'px',top:top+'px',width:Math.max(0,right-left)+'px',height:Math.max(0,bottom-top)+'px'});
      const hits=r.newNodes.filter(node=>{
        if(!itemInfo(node,r.kind))return false;
        const b=node.getBoundingClientRect();
        return b.right>left&&b.left<right&&b.bottom>top&&b.top<bottom&&b.right>area.left&&b.left<area.right&&b.bottom>area.top&&b.top<area.bottom;
      });
      const next=new Set(r.base.filter(node=>itemInfo(node,r.kind)));
      hits.forEach(node=>{if(r.toggle&&next.has(node))next.delete(node);else next.add(node);});
      apply(r.kind,Array.from(next));
    }
    window.addEventListener('pointerdown',function(e){
      if(e.button!==0||e.isPrimary===false||(e.pointerType&&e.pointerType!=='mouse'))return;
      if(rectangle)finish(true);
      suppressClick=null;
      const hit=locate(e.target);
      if(hit&&hit.surface){
        const modified=e.ctrlKey||e.metaKey||e.shiftKey;
        if(!modified){anchors.set(hit.surface,hit.node);return;}
        e.preventDefault();e.stopImmediatePropagation();
        releaseTooltip();
        const current=Selection.kind===hit.kind?Array.from(selectedSet(hit.kind)):[];
        if(e.shiftKey){
          const all=nodesIn(hit.surface,hit.kind);const previous=anchors.get(hit.surface);
          const from=all.indexOf(previous),to=all.indexOf(hit.node);
          const range=from>=0&&to>=0?all.slice(Math.min(from,to),Math.max(from,to)+1):[hit.node];
          apply(hit.kind,e.ctrlKey||e.metaKey?Array.from(new Set(current.concat(range))):range);
          if(from<0)anchors.set(hit.surface,hit.node);
        }else{
          const next=new Set(current);
          if(next.has(hit.node))next.delete(hit.node);else next.add(hit.node);
          apply(hit.kind,Array.from(next));anchors.set(hit.surface,hit.node);
        }
        suppressNextClick(hit.surface);
        return;
      }
      if(!(e.target instanceof Element)||e.target.closest(interactive)||e.target.closest('.token,.slot,.drone-heading'))return;
      const surface=e.target.closest('#invPanel .invWrap,#shipSection,#dronesSection');
      if(surface&&visible(surface))beginRectangle(e,surface,surface.closest('#invPanel')?'inv':'slot');
    },true);
    window.addEventListener('pointermove',updateRectangle,{capture:true,passive:false});
    window.addEventListener('pointerup',function(e){
      if(rectangle&&e.pointerId===rectangle.pointerId){updateRectangle(e);finish(false);return;}
      // Existing paint selection can gather multiple nodes; its following click must not collapse it.
      if(typeof paintSelecting!=='undefined'&&paintSelecting&&Selection.kind&&selectedSet(Selection.kind).size>1){
        const first=Array.from(selectedSet(Selection.kind))[0];const surface=surfaceFor(first,Selection.kind);
        if(surface)suppressNextClick(surface);
      }
    },true);
    window.addEventListener('pointercancel',function(){finish(true);stopNativePaint();suppressClick=null;},true);
    window.addEventListener('lostpointercapture',function(e){if(rectangle&&e.pointerId===rectangle.pointerId)finish(true);},true);
    window.addEventListener('blur',function(){finish(true);stopNativePaint();suppressClick=null;});
    window.addEventListener('click',function(e){
      if(!suppressClick)return;
      if(performance.now()>suppressClick.until){suppressClick=null;return;}
      if(e.target instanceof Node&&suppressClick.surface.contains(e.target)){
        e.preventDefault();e.stopImmediatePropagation();suppressClick=null;
      }
    },true);
    window.addEventListener('keydown',function(e){
      if(e.key==='Control'||e.key==='Meta'||e.key==='Shift'){releaseTooltip();return;}
      if(e.key!=='Escape')return;
      finish(false);stopNativePaint();suppressClick=null;
      // Andromeda's existing Escape handler still clears Selection and hides the tooltip.
    },true);
    window.AndromedaEquipmentSelection={
      version:'private-after-selection-20261019',
      features:['empty-area-rectangle','ctrl-meta-toggle','shift-visible-range','native-paint-click-preservation'],
      ownsInventory:false,ownsDrop:false,ownsSave:false,serverRequests:0,
      getCounts:function(){return {kind:Selection.kind,inventory:Selection.invTokens.size,slots:Selection.slotCells.size,rectangleActive:!!rectangle};}
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
