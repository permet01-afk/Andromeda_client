/* REV4 private shell finishing. Native references: DoPs / PK only.
   Presentation only: no new business request, submit, inventory mutation, or
   saved state. The existing Andromeda callbacks remain authoritative. */
(function(){
  'use strict';
  function start(){
    if(!document.body.classList.contains('historical-site')||window.AndromedaHistoricalFinishShell)return;
    document.body.classList.add('hist-finish-shell');
    const originalIds=Array.from(document.querySelectorAll('[id]')).map(node=>node.id);
    const params=new URLSearchParams(location.search);
    const page=params.get('page')||'home';
    const equipment=/\/equip_ui\.html$/i.test(location.pathname);
    const moved=[];
    const storage=document.createElement('div');storage.id='hist-finish-shell-state';storage.hidden=true;document.body.appendChild(storage);
    const record={revision:5,businessRequests:0,inventoryOrSaveReplaced:false,moved,source:'DoPs direct header links, actual internalDock overview composition, native PK sprites and statically decompiled DoPs inventory ActionScript'};
    if(equipment){
      const originalDesign=document.getElementById('btnDesign');
      const originalSave=document.getElementById('saveAll');
      const configurationTabs=document.querySelector('.doTabs');
      if(configurationTabs){
        configurationTabs.querySelectorAll('.tab').forEach((tab,index)=>{
          tab.textContent=String(index+1);tab.title='Configuration '+(index+1);tab.setAttribute('aria-label','Configuration '+(index+1));
        });
        const label=document.createElement('span');label.className='hist-finish-configuration-label';label.textContent='Configuration';configurationTabs.appendChild(label);
        moved.push({from:'wide Config1/Config2 tabs',to:'native numbered Configuration1/2 controls',preserved:'same original .tab nodes, dataset A/B and existing delegated selection handler'});
      }
      const exactEquipmentIcons={
        'lf1.png':'weapon/laser/lf-1','mp1.png':'weapon/laser/mp-1','lf2.png':'weapon/laser/lf-2','lf3.png':'weapon/laser/lf-3',
        'g3n1010.png':'generator/speed/g3n-1010','g3n2010.png':'generator/speed/g3n-2010','g3n3210.png':'generator/speed/g3n-3210',
        'g3n3310.png':'generator/speed/g3n-3310','g3n6900.png':'generator/speed/g3n-6900','g3n7900.png':'generator/speed/g3n-7900',
        'sg3na01.png':'generator/shield/sg3n-a01','sg3na02.png':'generator/shield/sg3n-a02','sg3nb01.png':'generator/shield/sg3n-b01','sg3nb02.png':'generator/shield/sg3n-b02',
        'hst1.png':'weapon/rocketlauncher/hst-1','hst2.png':'weapon/rocketlauncher/hst-2'
      };
      function replaceEquipmentImage(image){
        if(!(image instanceof HTMLImageElement))return;
        let path;try{path=new URL(image.getAttribute('src')||'',location.href).pathname;}catch(_){return;}
        const match=/^\/views\/userTabs\/icons\/items\/([^/]+)$/.exec(path);
        const mapped=match&&exactEquipmentIcons[match[1]];if(!mapped)return;
        image.src='/assets/historical/dops/global/items/equipment/'+mapped+'_63x63.png';
      }
      const imageRoots=Array.from(document.querySelectorAll('#invPanel,#cfgA,#cfgB,#dronesWrap'));
      const iconObserver=new MutationObserver(changes=>{
        const images=new Set();
        changes.forEach(change=>{
          if(change.type==='attributes')images.add(change.target);
          else change.addedNodes.forEach(node=>{if(!(node instanceof Element))return;if(node.matches('img'))images.add(node);node.querySelectorAll('img').forEach(image=>images.add(image));});
        });
        images.forEach(replaceEquipmentImage);
      });
      imageRoots.forEach(root=>{root.querySelectorAll('img').forEach(replaceEquipmentImage);iconObserver.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});});
      record.equipmentImageMappingCount=Object.keys(exactEquipmentIcons).length;
      record.equipmentImageObserverRoots=imageRoots.map(node=>node.id);
      moved.push({from:'16 canonical equipment30px icons stretched by original slot CSS',to:'exact DoPs63px image per canonical item in inventory and slots',preserved:'only img.src changes; item IDs/data/classes/nodes, selection, drop, quantities and callbacks untouched; drone portraits/levels/Havok strictly excluded'});
      const filters=document.querySelector('.invTabs');
      const inventory=document.getElementById('invPanel');
      if(filters&&inventory){
        const originalTabs=Array.from(filters.querySelectorAll('.invTab'));
        const bar=document.createElement('div');bar.className='hist-finish-inventory-selector';
        const label=document.createElement('label');label.htmlFor='hist-finish-inventory-filter';label.textContent='Inventory';
        const select=document.createElement('select');select.id='hist-finish-inventory-filter';select.setAttribute('aria-label','Inventory category');
        const names={all:'User',lasers:'Weapons',generators:'Generators',extras:'Extras',drone_designs:'Drone designs'};
        // DoPs sorts filter keys before translating; retain only Andromeda's real five categories.
        const filterOrder=['drone_designs','extras','generators','all','lasers'];
        originalTabs.slice().sort((a,b)=>filterOrder.indexOf(a.dataset.cat)-filterOrder.indexOf(b.dataset.cat)).forEach(tab=>{const option=document.createElement('option');option.value=tab.dataset.cat;option.textContent=names[tab.dataset.cat]||tab.textContent;option.selected=tab.classList.contains('active');select.appendChild(option);});
        select.addEventListener('change',()=>{const tab=originalTabs.find(tab=>tab.dataset.cat===select.value);if(tab)tab.click();});
        bar.append(label,select);inventory.insertBefore(bar,inventory.firstChild);
        filters.hidden=true; // Same delegated .invTab handlers and category nodes remain in place.
        moved.push({from:'5 visible inventory tabs',to:'one compact category selector',preserved:'Original .invTab nodes and their existing click handler invoked; same five filters'});
      }
      const designModal=document.getElementById('designModal');
      const designList=document.getElementById('designList');
      const designClose=document.getElementById('designModalClose');
      const topBar=document.querySelector('.doTopBar');
      if(topBar&&originalDesign&&designModal&&designList&&designClose){
        const selector=document.createElement('div');selector.className='hist-finish-design-selector';
        topBar.appendChild(selector);selector.appendChild(originalDesign);
        originalDesign.classList.add('hist-finish-design-control');
        originalDesign.setAttribute('aria-haspopup','listbox');originalDesign.setAttribute('aria-controls','designList');originalDesign.setAttribute('aria-expanded','false');
        originalDesign.title='Choose a ship design. Save confirms the Andromeda equipment draft.';
        designModal.classList.add('hist-finish-design-menu');
        designList.setAttribute('role','listbox');designList.setAttribute('aria-label','Owned ship designs');
        const preview=document.createElement('div');preview.className='hist-finish-design-preview';preview.setAttribute('aria-hidden','true');
        const previewImage=document.createElement('img');previewImage.width=63;previewImage.height=63;previewImage.alt='';
        const previewBonus=document.createElement('div');previewBonus.className='hist-finish-design-preview-bonus';
        preview.append(previewImage,previewBonus);designModal.appendChild(preview);
        const nativeImages={10:'goliath',56:'goliath/design/enforcer',59:'goliath/design/bastion',63:'goliath/design/solace',64:'goliath/design/diminisher',65:'goliath/design/spectrum',66:'goliath/design/sentinel',67:'goliath/design/venom',8:'vengeance',17:'vengeance/design/corsair',18:'vengeance/design/lightning'};
        let menuWasOpen=false;
        const visibleRows=()=>Array.from(designList.querySelectorAll('.designItem')).filter(row=>!row.classList.contains('hist-current-design-option'));
        const skins=()=>typeof AVAILABLE_SKINS!=='undefined'&&Array.isArray(AVAILABLE_SKINS)?AVAILABLE_SKINS:[];
        const currentId=()=>typeof SELECTED_DESIGN_ID!=='undefined'?Number(SELECTED_DESIGN_ID):0;
        function updateDesignName(){
          const available=skins();const current=available.find(s=>Number(s.design_id)===currentId());
          if(current)originalDesign.textContent=current.name||('Design #'+currentId());
          else originalDesign.textContent='Ship design';
          // DoPs omits the selector when no other free design exists. Andromeda
          // has one hull rather than the foreign multihangar ownership system.
          selector.hidden=available.length<2;
          record.designAvailableCount=available.length;record.designCurrentId=currentId();
        }
        function closeDesignMenu(returnFocus){
          if(designModal.classList.contains('open'))designClose.click();
          originalDesign.setAttribute('aria-expanded','false');preview.classList.remove('is-visible');
          if(returnFocus)originalDesign.focus();
        }
        function positionDesignMenu(){
          const bounds=originalDesign.getBoundingClientRect();
          designModal.style.left=Math.round(bounds.left)+'px';designModal.style.top=Math.round(bounds.bottom)+'px';
        }
        function previewDesign(row){
          const img=row.querySelector('img');if(!img)return;
          const datum=skins().find(s=>Number(s.design_id)===Number(row.dataset.histDesignId));
          const id=Number(datum?.design_id||0);
          previewImage.src=nativeImages[id]?'/assets/historical/dops/global/items/ship/'+nativeImages[id]+'_63x63.png':img.src;
          record.lastDesignPreview={id,src:previewImage.getAttribute('src'),source:nativeImages[id]?'EXACT_DOPS_63PX':'UNMAPPED_ORIGINAL_RETAINED'};
          previewBonus.textContent=datum?.bonus||'';
          // Native popup bounds are y=-36..44; its63px graphic is x20/y-31.
          preview.style.top=(row.offsetTop-designList.scrollTop+row.offsetHeight/2-36)+'px';
          preview.classList.add('is-visible');
        }
        function prepareDesignRows(){
          if(menuWasOpen){closeDesignMenu(false);return;}
          const available=skins();
          const rows=Array.from(designList.querySelectorAll('.designItem'));
          record.designImageMappings=[];
          rows.forEach((row,index)=>{
            const datum=available[index];if(!datum)return;
            row.dataset.histDesignId=String(datum.design_id);row.setAttribute('role','option');row.tabIndex=-1;
            const rowImage=row.querySelector('img');const nativeImage=nativeImages[Number(datum.design_id)];
            if(rowImage&&nativeImage){const before=rowImage.getAttribute('src');rowImage.src='/assets/historical/dops/global/items/ship/'+nativeImage+'_63x63.png';rowImage.alt=datum.name||'Owned ship design';record.designImageMappings.push({id:Number(datum.design_id),before,after:rowImage.getAttribute('src'),visibleRolloverSameMedia:true});}
            const selected=Number(datum.design_id)===currentId();
            row.classList.toggle('hist-current-design-option',selected);row.setAttribute('aria-selected',String(selected));
            row.setAttribute('aria-label',(datum.name||'')+(datum.bonus?' — '+datum.bonus:''));
            row.title=(datum.name||'')+(datum.bonus?' — '+datum.bonus:'');
            row.addEventListener('pointerenter',()=>previewDesign(row));row.addEventListener('focus',()=>previewDesign(row));
            // This listener runs after the original row callback has updated
            // SELECTED_DESIGN_ID and the preview, then closed the original modal.
            row.addEventListener('click',()=>{updateDesignName();closeDesignMenu(false);});
            row.addEventListener('keydown',event=>{
              if(event.key==='Enter'||event.key===' '){event.preventDefault();row.click();originalDesign.focus();}
              else if(event.key==='ArrowDown'||event.key==='ArrowUp'){
                event.preventDefault();const options=visibleRows();const step=event.key==='ArrowDown'?1:-1;
                options[(options.indexOf(row)+step+options.length)%options.length]?.focus();
              }
            });
          });
          rows.sort((a,b)=>a.querySelector('.meta>div')?.textContent.localeCompare(b.querySelector('.meta>div')?.textContent||'',undefined,{sensitivity:'base'})||0).forEach(row=>designList.appendChild(row));
          positionDesignMenu();originalDesign.setAttribute('aria-expanded','true');
          record.designRowsReuseOriginalCallbacks=true;
        }
        // The original listener opens the modal and creates the real designItem
        // nodes first. No business item is cloned or reconstructed by this layer.
        originalDesign.addEventListener('click',()=>{menuWasOpen=designModal.classList.contains('open');},true);
        originalDesign.addEventListener('click',prepareDesignRows);
        originalDesign.addEventListener('keydown',event=>{
          if(event.key==='ArrowDown'||event.key==='ArrowUp'){
            event.preventDefault();if(!designModal.classList.contains('open'))originalDesign.click();
            const rows=visibleRows();(event.key==='ArrowUp'?rows[rows.length-1]:rows[0])?.focus();
          }
        });
        window.addEventListener('pointerdown',event=>{
          if(!selector.contains(event.target)&&!designModal.contains(event.target))closeDesignMenu(false);
        },true);
        window.addEventListener('keydown',event=>{if(event.key==='Escape'&&designModal.classList.contains('open'))closeDesignMenu(true);},true);
        document.addEventListener('click',event=>{if(event.target.closest('.modeTab'))closeDesignMenu(false);});
        window.addEventListener('resize',()=>{if(designModal.classList.contains('open'))positionDesignMenu();});
        designList.addEventListener('scroll',()=>{const active=document.activeElement;if(designList.contains(active))previewDesign(active);else preview.classList.remove('is-visible');});
        const shipImage=document.getElementById('shipPreviewImg');
        if(shipImage)new MutationObserver(updateDesignName).observe(shipImage,{attributes:true,attributeFilter:['src']});
        new MutationObserver(()=>{
          const open=designModal.classList.contains('open');originalDesign.setAttribute('aria-expanded',String(open));
          if(!open)preview.classList.remove('is-visible');
        }).observe(designModal,{attributes:true,attributeFilter:['class']});
        updateDesignName();
        moved.push({from:'generic Designs button and centred design modal',to:'current-design name dropdown, alphabetical owned alternatives and native63px rollover preview',preserved:'same #btnDesign, #designModal, #designList and original designItem callbacks; same explicit Save; no new API or autosave'});
      }
      const instruction=document.querySelector('.configHelp');if(instruction){instruction.hidden=true;moved.push({from:'Save instruction sentence',to:'hidden descriptive text only',preserved:'No action in this sentence; actual Save remains visible'});}
      if(originalSave){originalSave.textContent='Save';originalSave.title='Save both configurations';}
      record.sameDesignNode=document.getElementById('btnDesign')===originalDesign;
      record.sameSaveNode=document.getElementById('saveAll')===originalSave;
      record.saveContract='Explicit existing transactional Save retained; DoPs ActionScript does not prove autosave';
    }else{
      const nav=document.querySelector('.app-nav');
      const companyLink=nav&&Array.from(nav.querySelectorAll('.submenu-link')).find(link=>{try{return new URL(link.href).searchParams.get('page')==='company';}catch(_){return false;}});
      if(nav){
        nav.querySelectorAll('.nav-item.has-submenu').forEach(item=>{
          const link=item.querySelector(':scope>.nav-link');
          if(link){
            // Only old presentation disclosure listeners existed on these anchors.
            // A direct equivalent link avoids the old touch-toggle intercept too.
            const direct=link.cloneNode(true);direct.removeAttribute('id');direct.removeAttribute('aria-haspopup');direct.removeAttribute('aria-expanded');
            item.insertBefore(direct,link);storage.appendChild(link);
          }
          const menu=item.querySelector(':scope>.submenu');if(menu)storage.appendChild(menu);
          const toggle=item.querySelector(':scope>.submenu-toggle');if(toggle)storage.appendChild(toggle);
          item.classList.remove('has-submenu','is-expanded');
        });
        moved.push({from:'global hover dropdowns and disclosure arrows',to:'DoPs direct header links plus local section navigation',preserved:'Hangar→Overview/Equipment; Pilot Sheet→Profile/Skilltree/Quests/Titles; Clan/Shop local categories; Company Change in Profile'});
      }
      const logout=document.querySelector('.header-actions a[href="logout.php"]');if(logout)logout.classList.add('hist-finish-logout-link');
      const profile=document.querySelector('body.hist-profile-page .profile-card');
      if(profile&&companyLink){
        const tools=document.createElement('div');tools.className='hist-finish-profile-tools';companyLink.className='hist-finish-profile-link';tools.appendChild(companyLink);profile.appendChild(tools);
        moved.push({from:'Company Change in global Pilot Sheet dropdown',to:'Pilot Sheet / Profile footer',preserved:'same existing company route anchor, no purchase or form replaced'});
      }
      const activeMessage=document.getElementById('ship-panel-message');
      if(activeMessage&&!document.getElementById('ship-lifecycle-panel')?.classList.contains('is-destroyed')&&/^Last saved state/.test(activeMessage.textContent.trim()))activeMessage.classList.add('hist-finish-explanatory-copy');
      const shipPanel=document.querySelector('body.hist-overview-page #ship-lifecycle-panel');
      if(shipPanel){
        shipPanel.classList.add('hist-rev5-overview');
        const heading=shipPanel.querySelector('.ship-lifecycle-heading');
        const headingTitle=document.getElementById('ship-panel-title');
        if(headingTitle)headingTitle.textContent='Ship';
        // DoPs Overview had its own drone statistics scene. Linking this tab
        // to Equipment duplicated that page without implementing its scene.
        // The original Equipment > Drones control remains the single path.
        const details=shipPanel.querySelector('.ship-lifecycle-details');
        const name=shipPanel.querySelector('.ship-lifecycle-name');
        if(name)shipPanel.appendChild(name);
        const status=document.getElementById('ship-panel-status');if(status)shipPanel.appendChild(status);
        const loadout=shipPanel.querySelector('.ship-lifecycle-loadout');if(loadout)storage.appendChild(loadout);
        const repair=document.getElementById('ship-panel-repair');if(repair)shipPanel.appendChild(repair);
        const stats=document.getElementById('ship-panel-stats');
        if(stats){
          const table=document.createElement('table');table.className='hist-overview-stat-table';const tbody=document.createElement('tbody');
          Array.from(stats.querySelectorAll(':scope>.ship-lifecycle-stat')).forEach(stat=>{
            const label=stat.querySelector(':scope>span');const value=stat.querySelector(':scope>strong');
            const tr=document.createElement('tr');const key=document.createElement('td');const data=document.createElement('td');
            if(label)key.appendChild(label);if(value)data.appendChild(value);data.appendChild(stat);tr.append(key,data);tbody.appendChild(tr);
          });table.appendChild(tbody);stats.appendChild(table);
        }
        const originalTabs=shipPanel.querySelector('.ship-lifecycle-tabs');
        if(originalTabs&&details){
          const field=document.createElement('label');field.className='hist-overview-config-field';
          const caption=document.createElement('span');caption.textContent='View configuration';const select=document.createElement('select');select.setAttribute('aria-label','View ship configuration');
          const tabs=Array.from(originalTabs.querySelectorAll('button[data-config]'));
          tabs.forEach(tab=>{const option=document.createElement('option');option.value=tab.dataset.config;select.appendChild(option);});
          const syncConfigurationLabels=()=>{tabs.forEach((tab,index)=>{const active=tab.querySelector('small');select.options[index].textContent='Configuration '+tab.dataset.config+(active&&!active.hidden?' — ACTIVE':'');select.options[index].selected=tab.getAttribute('aria-selected')==='true';});};
          select.addEventListener('change',()=>{const tab=tabs.find(tab=>tab.dataset.config===select.value);if(tab)tab.click();syncConfigurationLabels();});
          new MutationObserver(syncConfigurationLabels).observe(originalTabs,{subtree:true,attributes:true,attributeFilter:['hidden','aria-selected']});
          syncConfigurationLabels();field.append(caption,select);details.appendChild(field);originalTabs.hidden=true;
        }
        record.overviewContract={sameRepairNode:document.getElementById('ship-panel-repair')===repair,sameStatsUpdateTargets:true,configurationControls:'original tabs invoked, no change to active configuration',drones:'Redundant Overview shortcut removed; original Equipment > Drones route and controls retained, not a fabricated historical Overview drone scene',originalRepairApi:'unchanged'};
        moved.push({from:'Active Ship card: portrait left, modern stat blocks right, duplicate Loadout',to:'DoPs Overview: native stat panel left, same hull media right, original repair at source x286/y25',preserved:'all original IDs, update targets, repair/CSRF/generation/lease handlers and view-A/B controls'});
      }
      if(page==='user'&&params.get('tab')==='configurations'&&params.get('historical_mode')==='drones'){
        const frame=document.getElementById('andromedaEquipFrame');
        if(frame){
          const openDrones=()=>{try{const tab=frame.contentDocument.querySelector('.modeTab[data-mode="drones"]');if(tab&&!tab.classList.contains('active'))tab.click();}catch(_){/* Existing Equipment remains available if frame is unavailable. */}};
          frame.addEventListener('load',openDrones,{once:true});
          try{if(frame.contentDocument?.readyState==='complete'&&frame.contentDocument.querySelector('.modeTab'))openDrones();}catch(_){}
        }
      }
      if(page==='home'){
        const home=document.querySelector('.dashboard');
        const more=document.querySelector('.hist-dashboard-extensions');
        if(more){
          const disclosure=document.createElement('details');disclosure.className='hist-finish-home-more';
          const title=document.createElement('summary');title.textContent='Server & events';
          const content=document.createElement('div');content.className='hist-finish-home-more-content';
          while(more.firstChild)content.appendChild(more.firstChild);
          disclosure.append(title,content);more.appendChild(disclosure);
          moved.push({from:'large always-open Status/Events/Community widgets',to:'compact Server & events disclosure below native four-panel Home',preserved:'all original status, counts, event state/schedules, Discord anchors and nodes retained'});
        }
        const clock=Array.from(document.querySelectorAll('.system-card .stat-summary li')).find(row=>row.querySelector('.summary-label')?.textContent.trim()==='Server time');
        const rail=document.querySelector('.hist-home-rail');if(clock&&rail){clock.classList.add('hist-finish-server-time');rail.appendChild(clock);}
        const hof=home?.querySelector('.hof-card');
        if(hof){
          const currentTabs=hof.querySelector('.tab-controls');if(currentTabs)currentTabs.hidden=true;
          const full=document.getElementById('open-top100');if(full)full.textContent='All Hall of Fame records';
          moved.push({from:'Rankpoints / Experience / Honor / Clan mini-tabs on Home',to:'single native Home ranking; all four categories in existing full Hall of Fame dialog',preserved:'original #open-top100 handler; original four Top100 category controls and real rankings; Home tab nodes retained hidden, not rebuilt'});
        }
        const userCard=home?.querySelector('.user-card');
        if(userCard){
          const tools=document.createElement('div');tools.className='hist-finish-home-profile-tools';
          for(const [label,href] of [['Profile','view.php?page=user&tab=infos&historical_section=profile'],['Change','view.php?page=settings']]){const link=document.createElement('a');link.href=href;link.textContent=label;tools.appendChild(link);}
          const daily=document.getElementById('dailyLoginModal');
          if(daily){const open=document.createElement('button');open.type='button';open.id='hist-finish-open-daily';open.textContent='Login bonus';open.addEventListener('click',()=>{daily.hidden=false;document.body.classList.add('modal-open');});tools.appendChild(open);}
          userCard.appendChild(tools);
          moved.push({from:'no permanent manual Daily reopen control',to:'Login bonus link beside native Profile / Change actions',preserved:'opens same original modal; existing claim/close/CSRF/wallet-refresh handlers untouched'});
        }
      }
    }
    const ids=new Set(Array.from(document.querySelectorAll('[id]')).map(node=>node.id));
    record.missingOriginalIds=originalIds.filter(id=>!ids.has(id));
    window.AndromedaHistoricalFinishShell=record;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* REV8: DoPs header_second_bar exposes Home / Logout / Help. The existing
 * PK question-mark cell is complementary artwork, not a recovered DoPs label.
 * The normal Support href remains a safe fallback until account.js connects
 * the local Help dialog. No network call or account handler is added here. */
(function(){
  'use strict';
  function finishRev8HeaderHelp(){
    if(!document.body.classList.contains('historical-site'))return;
    const actions=document.querySelector('.app-header .header-actions');
    if(!actions||document.getElementById('hist-rev8-help'))return;
    const originalSupport=Array.from(document.querySelectorAll('.app-nav .nav-item>.nav-link')).find(link=>{try{return new URL(link.href).searchParams.get('page')==='contact';}catch(_){return false;}});
    const help=document.createElement('a');
    help.id='hist-rev8-help';help.className='hist-rev6-icon-action hist-rev8-help';
    help.href=originalSupport?.getAttribute('href')||'view.php?page=contact';
    help.textContent='Help';help.title='Help';help.setAttribute('aria-label','Help');
    help.setAttribute('aria-haspopup','dialog');help.setAttribute('aria-expanded','false');
    actions.appendChild(help);document.body.classList.add('rev8-header-help');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finishRev8HeaderHelp,{once:true});else finishRev8HeaderHelp();
})();

/* REV6: recovered DoPs window geometry and existing Andromeda data/controls.
 * No network, polling, timer, submit, inventory or save implementation here. */
(function(){
  'use strict';
  const shipIds=new Set([1,3,4,5,6,7,8,9,10,17,18,56,59,63,64,65,66,67]);
  const topImage=id=>shipIds.has(Number(id))?'/assets/historical/dops-rev6/ships/'+Number(id)+'-top.png':null;
  function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function run(){
    const body=document.body;if(!body.classList.contains('historical-site')||window.AndromedaRev6Shell)return;
    body.classList.add('hist-rev6-shell','hist-rev7-shell');
    const report={revision:6,businessRequestsAdded:0,timersAdded:0,sourcePriority:'DoPs first; PK missing header artwork complement',sameOriginalControlNodes:true};
    window.AndromedaRev6Shell=report;
    const storage=el('div');storage.hidden=true;storage.id='hist-rev6-shell-storage';body.appendChild(storage);
    function mirror(source,target){
      if(!source||!target)return;
      const update=()=>{if(target.textContent!==source.textContent)target.textContent=source.textContent;target.title=target.textContent.trim();target.setAttribute('aria-label',target.textContent.trim());};
      update();new MutationObserver(update).observe(source,{subtree:true,childList:true,characterData:true});
    }
    function dialog(title,content){
      const overlay=el('div','hist-rev6-dialog');overlay.hidden=true;
      const box=el('section','hist-rev6-dialog-box');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',title);
      const head=el('header','hist-rev6-dialog-head');head.appendChild(el('h2','',title));
      const close=el('button','hist-rev6-dialog-close','Close');close.type='button';close.setAttribute('aria-label','Close '+title);head.appendChild(close);
      const inner=el('div','hist-rev6-dialog-content');inner.appendChild(content);const foot=el('footer','hist-rev7-dialog-foot');const closeBottom=el('button','hist-rev7-dialog-close-bottom','Close');closeBottom.type='button';foot.appendChild(closeBottom);box.append(head,inner,foot);overlay.appendChild(box);body.appendChild(overlay);
      let opener=null;let beforeOpen=null;let afterClose=null;
      function hide(){if(overlay.hidden)return;overlay.hidden=true;if(afterClose)afterClose();opener?.focus();}
      close.addEventListener('click',hide);closeBottom.addEventListener('click',hide);overlay.addEventListener('click',e=>{if(e.target===overlay)hide();});
      document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden){e.preventDefault();hide();}});
      return {open(from){opener=from||document.activeElement;if(beforeOpen)beforeOpen();overlay.hidden=false;close.focus();},setHooks(before,after){beforeOpen=before;afterClose=after;},element:overlay,content:inner};
    }
    if(/\/equip_ui\.html$/i.test(location.pathname)){
      body.classList.add('hist-rev6-inventory');
      const panel=document.getElementById('rightPanel');const preview=document.getElementById('shipPreview');
      const previewImage=document.getElementById('shipPreviewImg');
      if(panel&&preview)panel.appendChild(preview); // same image and original update target
      // DoPs AccordionView uses two distinct roles: the original selectable
      // RES_63 token at x5/y26, and RES_TOP centred in the left entity region.
      // Do not clone the token or its callbacks into the presentation image.
      const droneEntity=el('div','hist-rev6-drone-entity');droneEntity.hidden=true;
      const droneTop=el('span','hist-complement-drone-top');droneTop.setAttribute('role','img');droneEntity.appendChild(droneTop);
      if(panel)panel.appendChild(droneEntity);
      const inventorySelector=document.querySelector('.hist-finish-inventory-selector');
      if(panel&&inventorySelector)panel.appendChild(inventorySelector);
      let closeHistoricalFilter=()=>{},syncHistoricalFilter=()=>{};
      const originalFilter=document.getElementById('hist-finish-inventory-filter');
      if(inventorySelector&&originalFilter){
        originalFilter.hidden=true;
        const button=el('button','hist-rev6-filter-button');button.type='button';button.id='hist-rev6-filter-button';button.setAttribute('aria-label','Inventory category');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
        const menu=el('div','hist-rev6-filter-menu');menu.id='hist-rev6-filter-menu';menu.hidden=true;menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Inventory categories');button.setAttribute('aria-controls',menu.id);body.appendChild(menu);inventorySelector.appendChild(button);
        const options=[];
        closeHistoricalFilter=returnFocus=>{const open=!menu.hidden;menu.hidden=true;button.setAttribute('aria-expanded','false');if(open&&returnFocus)button.focus();};
        syncHistoricalFilter=()=>{button.textContent=originalFilter.selectedOptions[0]?.textContent||'User';options.forEach(option=>option.setAttribute('aria-selected',String(option.dataset.value===originalFilter.value)));};
        Array.from(originalFilter.options).forEach(option=>{
          const row=el('button','',option.textContent);row.type='button';row.setAttribute('role','option');row.dataset.value=option.value;row.tabIndex=-1;
          row.addEventListener('click',()=>{originalFilter.value=option.value;originalFilter.dispatchEvent(new Event('change',{bubbles:true}));syncHistoricalFilter();closeHistoricalFilter(true);});menu.appendChild(row);options.push(row);
        });
        function openFilter(){const bounds=button.getBoundingClientRect();menu.style.left=Math.min(bounds.left,innerWidth-198)+'px';menu.style.top=bounds.bottom+'px';menu.hidden=false;button.setAttribute('aria-expanded','true');(options.find(option=>option.dataset.value===originalFilter.value)||options[0])?.focus();}
        button.addEventListener('click',()=>{if(menu.hidden)openFilter();else closeHistoricalFilter(false);});
        button.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();openFilter();}});
        menu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeHistoricalFilter(true);}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const current=options.indexOf(document.activeElement);const next=event.key==='Home'?0:event.key==='End'?options.length-1:(current+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next]?.focus();}else if(event.key==='Tab')closeHistoricalFilter(false);});
        window.addEventListener('pointerdown',event=>{if(!inventorySelector.contains(event.target)&&!menu.contains(event.target))closeHistoricalFilter(false);},true);
        window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){event.preventDefault();closeHistoricalFilter(true);}},true);
        originalFilter.addEventListener('change',syncHistoricalFilter);syncHistoricalFilter();
        report.inventoryFilter={nativeListbox:true,originalSelectRetainedHidden:true,sameOriginalChangeCallback:true,optionValues:options.map(option=>option.dataset.value)};
      }
      const inventoryPanel=document.getElementById('invPanel');
      if(inventoryPanel){
        const surface=inventoryPanel.querySelector('.invWrap');
        const context=el('div','hist-equipment-actions hist-rev6-inventory-context');context.id='hist-rev6-inventory-context';context.hidden=true;context.setAttribute('role','menu');context.setAttribute('aria-label','Andromeda equipment commands');
        const commands=[];
        [['lasers','Lasers'],['speed','Speed generators'],['shield','Shield generators']].forEach(([group,label])=>{
          const original=document.getElementById('inv-equip-'+group)?.closest('.hist-equipment-actions');if(!original)return;
          [['equip','Equip all '],['remove','Clear ']].forEach(([verb,prefix])=>{
            const button=document.getElementById('inv-'+verb+'-'+group);if(!button)return;
            button.textContent=prefix+label.toLowerCase();button.setAttribute('aria-label',button.textContent);button.tabIndex=-1;
            context.appendChild(button);commands.push(button); // same six original button nodes and business listeners
          });
          storage.appendChild(original); // old visual triggers/empty menus remain hidden, never duplicated
        });
        body.appendChild(context);
        let contextOpener=surface;
        function closeContext(returnFocus){if(context.hidden)return;context.hidden=true;surface?.setAttribute('aria-expanded','false');if(returnFocus)contextOpener?.focus();}
        function openContext(x,y,opener){
          contextOpener=opener||surface;context.hidden=false;
          context.style.left=Math.max(2,Math.min(x,innerWidth-context.offsetWidth-3))+'px';
          context.style.top=Math.max(2,Math.min(y,innerHeight-context.offsetHeight-3))+'px';
          surface?.setAttribute('aria-expanded','true');commands[0]?.focus();
        }
        if(surface){
          surface.tabIndex=0;surface.setAttribute('aria-label','Inventory. Right-click or Shift+F10 for equipment commands.');surface.setAttribute('aria-haspopup','menu');surface.setAttribute('aria-controls',context.id);surface.setAttribute('aria-expanded','false');
          surface.addEventListener('contextmenu',event=>{event.preventDefault();openContext(event.clientX,event.clientY,surface);});
          surface.addEventListener('keydown',event=>{if((event.key==='F10'&&event.shiftKey)||event.key==='ContextMenu'){event.preventDefault();const box=surface.getBoundingClientRect();openContext(box.left+8,box.top+8,surface);}});
        }
        context.addEventListener('keydown',event=>{
          if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();const current=commands.indexOf(document.activeElement);const next=event.key==='Home'?0:event.key==='End'?commands.length-1:(current+(event.key==='ArrowDown'?1:-1)+commands.length)%commands.length;commands[next]?.focus();}
          else if(event.key==='Tab')closeContext(false);
        });
        context.addEventListener('click',event=>{if(event.target.closest('button'))closeContext(true);});
        window.addEventListener('pointerdown',event=>{if(!context.contains(event.target))closeContext(false);},true);
        window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!context.hidden){event.preventDefault();event.stopPropagation();closeContext(true);}},true);
        window.addEventListener('blur',()=>closeContext(false));
        const inventoryTab=el('button','hist-rev6-inventory-tab','Inventory');inventoryTab.type='button';inventoryTab.id='hist-rev6-inventory-toggle';inventoryTab.setAttribute('aria-controls','invPanel');inventoryTab.setAttribute('aria-expanded','false');inventoryTab.title='Open inventory';inventoryPanel.appendChild(inventoryTab);
        const mask=el('div','hist-rev6-inventory-mask');inventoryPanel.appendChild(mask);if(surface)mask.appendChild(surface);
        let fullInventory=false;
        const filterSelect=document.getElementById('hist-finish-inventory-filter');
        const viewRecord={mode:'mini',sourceDesignAnchor:[386,9],sourceFilterAnchor:[550,9],sourceTweenSeconds:.5,fullBlocksAcross:4,originalSaveVisibleInBoth:true};
        report.inventoryView=viewRecord;
        function arrangeInventory(){
          if(!surface)return;
          const tokens=Array.from(surface.querySelectorAll('.token[data-item-id]')).filter(token=>token.closest('.invCat')?.style.display!=='none');
          const across=fullInventory?4:1;
          const blockRows=Math.max(1,Math.ceil(tokens.length/(24*across)));
          surface.style.gridTemplateRows=Array.from({length:blockRows},()=> 'repeat(6,34px)').join(' 6px ');
          tokens.forEach((token,index)=>{
            const block=Math.floor(index/24),inside=index%24;
            token.style.gridColumn=String((block%across)*5+(inside%4)+1);
            token.style.gridRow=String(Math.floor(block/across)*7+Math.floor(inside/4)+1);
          });
          viewRecord.visibleTokenCount=tokens.length;viewRecord.originalTokenNodes=true;
        }
        function switchInventory(){
          fullInventory=!fullInventory;closeContext(false);closeHistoricalFilter(false);
          document.getElementById('designModalClose')?.click();
          body.classList.toggle('hist-rev6-full-inventory',fullInventory);
          inventoryTab.setAttribute('aria-expanded',String(fullInventory));inventoryTab.title=fullInventory?'Close inventory':'Open inventory';
          const originalAll=document.querySelector('.invTab[data-cat="all"]');if(originalAll)originalAll.click();if(filterSelect)filterSelect.value='all';syncHistoricalFilter();
          if(surface)surface.scrollTop=0;arrangeInventory();viewRecord.mode=fullInventory?'full':'mini';
        }
        inventoryTab.addEventListener('click',switchInventory);
        const openInventory=el('button','hist-rev7-inventory-arrow hist-rev7-inventory-open');openInventory.id='hist-rev7-inventory-open';openInventory.type='button';openInventory.setAttribute('aria-label','Open inventory');openInventory.title='Open inventory';
        const closeInventory=el('button','hist-rev7-inventory-arrow hist-rev7-inventory-close');closeInventory.id='hist-rev7-inventory-close';closeInventory.type='button';closeInventory.setAttribute('aria-label','Close inventory');closeInventory.title='Close inventory';
        function syncArrowState(){openInventory.disabled=fullInventory;closeInventory.disabled=!fullInventory;}
        openInventory.addEventListener('click',()=>{if(!fullInventory)switchInventory();});closeInventory.addEventListener('click',()=>{if(fullInventory)switchInventory();});
        inventoryTab.addEventListener('click',syncArrowState);openInventory.addEventListener('click',syncArrowState);closeInventory.addEventListener('click',syncArrowState);inventoryPanel.append(openInventory,closeInventory);syncArrowState();
        viewRecord.nativeArrowControls={open:'hist-rev7-inventory-open',close:'hist-rev7-inventory-close',sourceSymbols:[71,163],samePresentationModeHandler:true};
        filterSelect?.addEventListener('change',()=>{closeContext(false);if(surface)surface.scrollTop=0;arrangeInventory();});
        if(surface)new MutationObserver(arrangeInventory).observe(surface,{childList:true,subtree:true});
        arrangeInventory();
        report.continuousInventory={originalCategoryParentsRetained:true,originalTokenNodesRetained:true,columns:4,oldSectionLabelsHidden:true,permanentActionButtons:0,actionAccess:'Andromeda extension: right-click or Shift+F10 context menu; six original nodes',actionButtonIds:commands.map(button=>button.id),filterUsesOriginalCategoryDisplay:true};
      }
      const tooltip=document.getElementById('customTooltip');
      if(tooltip){
        const selectedIcon=el('div','hist-rev6-selected-icon');const selectedFields=el('div','hist-rev6-selected-fields');const selectedDescription=el('div','hist-rev6-selected-description');
        ['ttName','ttType','ttPrice'].forEach(id=>{const node=document.getElementById(id);if(node)selectedFields.appendChild(node);});
        const originalBonus=document.getElementById('ttBonus');if(originalBonus)selectedDescription.appendChild(originalBonus);
        tooltip.insertBefore(selectedDescription,tooltip.firstChild);tooltip.insertBefore(selectedFields,tooltip.firstChild);tooltip.insertBefore(selectedIcon,tooltip.firstChild);
        let mouse=null;
        function fitTooltip(){
          if(!tooltip.classList.contains('visible'))return;
          if(body.classList.contains('hist-rev6-full-inventory')&&tooltip.classList.contains('locked')){
            const item=typeof activeTooltipItem!=='undefined'?activeTooltipItem:null;
            const token=item&&Array.from(document.querySelectorAll('#invPanel .token[data-item-id]')).find(node=>Number(node.dataset.itemId)===Number(item.id));
            const actualImage=token?.querySelector('img');const source=actualImage?.getAttribute('src')||item?.icon;
            if(source&&selectedIcon.dataset.source!==source){const image=el('img');image.src=source;image.alt=item?.name||'Selected item';selectedIcon.replaceChildren(image);selectedIcon.dataset.source=source;}
            else if(!source&&selectedIcon.firstChild){selectedIcon.replaceChildren();delete selectedIcon.dataset.source;}
            return; // native selected-item footer, never a second floating pin
          }
          const bounds=tooltip.getBoundingClientRect();let x=parseFloat(tooltip.style.left)||0;let y=parseFloat(tooltip.style.top)||0;
          if(!tooltip.classList.contains('locked')&&mouse){
            x=mouse.x+10;y=mouse.y+10;
            if(x+bounds.width>innerWidth-2)x=mouse.x-bounds.width-10;
            if(y+bounds.height>innerHeight-2)y=mouse.y-bounds.height-10;
          }
          x=Math.round(Math.max(2,Math.min(x,innerWidth-bounds.width-2)));y=Math.round(Math.max(2,Math.min(y,innerHeight-bounds.height-2)));
          if(tooltip.style.left!==x+'px')tooltip.style.left=x+'px';if(tooltip.style.top!==y+'px')tooltip.style.top=y+'px';
        }
        window.addEventListener('mousemove',event=>{mouse={x:event.clientX,y:event.clientY};if(!tooltip.classList.contains('locked'))fitTooltip();});
        new MutationObserver(fitTooltip).observe(tooltip,{attributes:true,attributeFilter:['class','style'],childList:true,subtree:true,characterData:true});
        report.tooltip={source:'ToolTipHook / Styles: black,Tahoma12,#CCC,border#1C95BD,max300,mouse+10',showDelayCssMs:250,hideDelayCssMs:100,newJsTimer:false,originalContentAndPinSellRepair:true,fullPinnedFields:{icon:[20,319],details:[90,317],description:[286,319],actions:[614,311]},pinnedActions:'Same original fields and Sell/Repair: native lower selected-item region in FULL, retained floating adaptation in MINI'};
      }
      let selectedDrone=null;
      const droneTopSizes={iris:[[39,46],[39,58],[39,58],[39,113],[39,113],[81,113]],flax:[[41,77],[47,77],[47,91],[76,91],[76,91],[93,98]]};
      // Existing Andromeda atlas: same first-angle crop and level rows as dronePortrait().
      // The larger entity uses the same aspect ratio, not a stretched TOP image.
      function havokAtlasPresentation(drone,scale){
        const level=Math.max(1,Math.min(6,Number(drone.level)||1))-1;
        const size=[[36,27],[36,30],[36,30],[81,58],[81,65],[81,65]][level];
        return {level,size:[size[0]*scale,size[1]*scale],path:'/spacemap_html5/graphics/havoks/havok_atlas.png?v=unknown-havok-levels',
          backgroundSize:[2688*scale,408*scale],backgroundPosition:[-scale,-(level*68+1)*scale]};
      }
      function applyDroneAtlas(node,view){
        node.style.width=view.size[0]+'px';node.style.height=view.size[1]+'px';
        node.style.backgroundImage='url("'+view.path+'")';
        node.style.backgroundSize=view.backgroundSize[0]+'px '+view.backgroundSize[1]+'px';
        node.style.backgroundPosition=view.backgroundPosition[0]+'px '+view.backgroundPosition[1]+'px';
      }
      function dronePresentation(drone){
        const level=Math.max(1,Math.min(6,Number(drone.level)||1))-1;
        const flax=Number(drone.drone_item_id||drone.item_id)===5;
        const meta=typeof getDroneDesignMeta==='function'?getDroneDesignMeta(drone):null;
        const havok=!!(!flax&&meta&&typeof isHavokDesignItem==='function'&&isHavokDesignItem(meta));
        if(havok)return {...havokAtlasPresentation(drone,1.5),flax,havok,family:'havok-atlas'};
        const family=flax?'flax':'iris';
        const size=droneTopSizes[family][level];
        return {level,flax,havok,family,size,path:'/assets/historical/rev9-complement-shell/drones/'+family+'-'+level+'_top.png'};
      }
      function updateDroneEntity(block){
        const state=typeof DRONES_STATE!=='undefined'?(DRONES_STATE[typeof activeTab==='function'?activeTab():'A']||[]):[];
        const drone=block&&state.find(d=>Number(d.id)===Number(block.dataset.droneId));
        if(!drone){droneEntity.hidden=true;droneTop.style.backgroundImage='none';return;}
        const view=dronePresentation(drone);
        if(view.havok)applyDroneAtlas(droneTop,view);
        else{
          droneTop.style.width=view.size[0]+'px';droneTop.style.height=view.size[1]+'px';
          droneTop.style.backgroundImage='url("'+view.path+'")';
          droneTop.style.backgroundSize=view.size[0]+'px '+view.size[1]+'px';droneTop.style.backgroundPosition='0 0';
        }
        // Exact placeGraphicCentrally formula, not a new estimated position.
        droneTop.style.left=Math.round(221/2-view.size[0]/2)+'px';
        droneTop.style.top=Math.round(399/2-view.size[1]/2+35)+'px';
        droneTop.setAttribute('aria-label',(view.flax?'Flax':'Iris')+' level '+(view.level+1)+(view.havok?' - Havok equipped':' - no design'));
        droneEntity.dataset.droneId=String(drone.id);droneEntity.dataset.designState=view.havok?'havok':'none';
        droneEntity.dataset.portraitSource=view.havok?'andromeda-havok-atlas':'dops-top';
        droneEntity.hidden=false;
      }
      function fixPreview(){
        if(!previewImage)return;
        const id=typeof SHIP_DESIGN_ID!=='undefined'?SHIP_DESIGN_ID:0;const path=topImage(id);
        if(path&&previewImage.getAttribute('src')!==path){previewImage.onerror=null;previewImage.src=path;previewImage.alt='Active ship design '+id+' — DoPs semantic TOP image';}
      }
      function mode(){body.classList.toggle('hist-rev6-drones-open',!!document.querySelector('.modeTab[data-mode="drones"].active'));}
      function showDrone(block){
        if(!block)return;
        selectedDrone=block.dataset.droneId;
        document.querySelectorAll('#droneList .droneBlock').forEach(other=>{
          const open=other===block;other.classList.toggle('hist-rev6-drone-open',open);
          other.querySelector(':scope>.hist-rev6-drone-toggle')?.setAttribute('aria-expanded',String(open));
        });
        // Selection state belongs to this original block/token; no copied portrait or copied callbacks.
        report.selectedDroneId=selectedDrone;
        updateDroneEntity(block);
      }
      function sync(){
        fixPreview();mode();
        const blocks=Array.from(document.querySelectorAll('#droneList .droneBlock'));
        blocks.forEach(block=>{
          const token=block.querySelector('.drone-token');
          const state=typeof DRONES_STATE!=='undefined'?(DRONES_STATE[typeof activeTab==='function'?activeTab():'A']||[]):[];
          const drone=state.find(d=>Number(d.id)===Number(block.dataset.droneId));
          if(token&&drone){
            const level=Math.max(1,Math.min(6,Number(drone.level)||1))-1;
            const flax=Number(drone.drone_item_id||drone.item_id)===5;
            const meta=typeof getDroneDesignMeta==='function'?getDroneDesignMeta(drone):null;
            const havok=!flax&&meta&&typeof isHavokDesignItem==='function'&&isHavokDesignItem(meta);
            // Normal portraits retain the native 63px icons. Equipped Havok uses
            // its original atlas; the supplied DoPs Havoc63/APIS files stay unused.
            const family=flax?'flax':'iris';
            delete token.dataset.histDesignPortraitFallback;
            const portrait=token.querySelector('.drone-portrait');
            if(portrait){
              portrait.dataset.histPortraitKind=havok?'havok-atlas':'native-63';
              if(havok)applyDroneAtlas(portrait,havokAtlasPresentation(drone,0.72));
              else{portrait.style.backgroundImage='url(/assets/historical/dops-rev7/shell/drones/'+family+'-'+level+'_63x63.png)';portrait.style.backgroundSize='63px 63px';portrait.style.backgroundPosition='0 0';portrait.style.width='63px';portrait.style.height='63px';}
            }
            const identity=block.querySelector('.drone-identity');
            if(identity){
              let label=identity.querySelector('.drone-design-label');
              if(!label){label=el('span','drone-design-label');identity.appendChild(label);}
              const text=havok?'Design: HAVOK':'Design: None';
              if(label.textContent!==text)label.textContent=text;
            }
            block.dataset.histDesignState=havok?'havok':'none';
          }
          if(block.dataset.rev6Accordion)return;block.dataset.rev6Accordion='true';
          if(token){
            token.tabIndex=0;token.setAttribute('role','button');token.setAttribute('aria-label',(block.querySelector('.drone-name')?.textContent||'Drone')+' — select, repair or manage its equipped design');
            token.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();token.click();}});
            block.addEventListener('click',event=>{if(event.target.closest('.drone-token'))showDrone(block);},true);
          }
          const button=el('button','hist-rev6-drone-toggle',block.querySelector('.drone-name')?.textContent||'Drone');button.type='button';button.setAttribute('aria-expanded','false');
          button.addEventListener('click',()=>showDrone(block));block.insertBefore(button,block.firstChild);
        });
        const selected=blocks.find(block=>block.dataset.droneId===selectedDrone)||blocks[0];
        if(selected&&!selected.classList.contains('hist-rev6-drone-open'))showDrone(selected);
        else updateDroneEntity(selected);
      }
      // Existing renderer replaces only the contents of these original mounts.
      // Observe those replacements; retain all original slots, token listeners and collect().
      const observer=new MutationObserver(sync);
      ['cfgA','cfgB','dronesWrap'].forEach(id=>{const node=document.getElementById(id);if(node)observer.observe(node,{childList:true,subtree:id==='dronesWrap'});});
      if(previewImage)observer.observe(previewImage,{attributes:true,attributeFilter:['src']});
      document.addEventListener('click',e=>{if(e.target.closest('.modeTab'))mode();});
      sync();report.equipment={sourceWindow:[770,395],entityRight:221,equipmentX:221,inventoryWidth:150,slotSize:34,semanticTopImage:true,originalSaveAndDrop:true,droneAccordion:'same original drone blocks/slots/portrait/progress/damage; one open at a time',droneEntity:'Native normal RES_TOP; equipped Havok atlas at the same central formula, with original action tokens retained',havokPortraits:'Andromeda red atlas rows0..5, token scale0.72/entity scale1.5; same aspect ratios, no native Havoc0 TOP invented'};
      return;
    }
    const header=document.querySelector('.app-header');
    if(header){
      const stats=el('div','hist-rev6-header-stats');stats.setAttribute('aria-label','Pilot statistics');
      const formatted=n=>Number(n||0).toLocaleString('en-US');
      for(const [key,label,icon,val,sourceId] of [
        ['id','ID','ID',header.dataset.pilotId,null],['level','Level','lvl',header.dataset.pilotLevel,null],
        ['honor','Honor','hon',header.dataset.pilotHonor,'pilot-honor'],['xp','Experience','exp',header.dataset.pilotXp,'pilot-xp']]){
        const cell=el('span','hist-rev6-header-stat hist-rev6-header-'+key);cell.title=label;
        const img=el('img');img.src='/assets/historical/pk/do/header/buttons/icon_stats_'+icon+'.png';img.alt=label;img.width=16;img.height=13;
        const value=el('span','',formatted(val));cell.append(img,value);stats.appendChild(cell);if(sourceId)mirror(document.getElementById(sourceId),value);
      }
      header.appendChild(stats);
      stats.querySelectorAll('.hist-rev6-header-stat').forEach(cell=>{const text=cell.querySelector('span');if(text){const label=cell.title;const full=()=>{cell.title=label+': '+text.textContent.trim();text.title=cell.title;text.setAttribute('aria-label',cell.title);};full();new MutationObserver(full).observe(text,{childList:true,subtree:true,characterData:true});}});
      for(const [id,label] of [['pilot-credits','Credits'],['pilot-uridium','Uridium']]){const node=document.getElementById(id);if(node){const full=()=>{node.title=label+': '+node.textContent.trim();node.setAttribute('aria-label',node.title);};full();new MutationObserver(full).observe(node,{childList:true,subtree:true,characterData:true});}}
      const home=header.querySelector('.header-actions a[href="view.php?page=home"]');
      const logout=header.querySelector('.header-actions a[href="logout.php"]');
      [[home,'Home','home'],[logout,'Logout','logout']].forEach(([link,label,kind])=>{if(!link)return;link.classList.add('hist-rev6-icon-action','hist-rev6-'+kind);link.textContent=label;link.setAttribute('aria-label',label);link.title=label;});
      const originalDiscord=document.querySelector('.discord-cta');
      let discord=originalDiscord;
      if(!discord){discord=el('a','','Discord');discord.href='https://discord.gg/A8nQyxTfWU';discord.target='_blank';discord.rel='noopener noreferrer';}
      discord.classList.add('hist-rev6-header-discord');discord.textContent='Discord';discord.title='Andromeda Discord';discord.setAttribute('aria-label','Andromeda Discord — opens in a new tab');
      // Discord did not exist in this DoPs generation. Retain the real destination, use the recovered PK community/globe header icon as an explicitly documented adaptation rather than a fictitious historical Discord logo.
      header.appendChild(discord);
      const oldDiscord=document.querySelector('.hist-discord-preserved');if(oldDiscord)storage.appendChild(oldDiscord);
      let ship=header.querySelector('.hist-header-ship');if(!ship){ship=el('img','hist-header-ship');header.appendChild(ship);}
      const path=shipIds.has(Number(header.dataset.pilotShip))?'/assets/historical/dops-rev7/shell/header/model'+Number(header.dataset.pilotShip)+'.png':null;if(path){ship.src=path;ship.alt='Current ship — native DoPs header artwork';}
      report.header={actualPlayerId:header.dataset.pilotId,actualLevel:header.dataset.pilotLevel,shipId:header.dataset.pilotShip,projectionOnly:true,originalDiscordMoved:!!originalDiscord,semanticTopMedia:!!path};
    }
    const params=new URLSearchParams(location.search);
    if((params.get('page')||'home')==='home'){
      document.querySelectorAll('#top100Modal .tab-control').forEach(button=>{const label=button.textContent.trim();button.title=label;button.setAttribute('aria-label',label);});
      const card=document.querySelector('.user-card');const list=card?.querySelector('.stat-list');
      if(list){
        Array.from(list.querySelectorAll(':scope>.stat-row')).forEach(row=>{
          const label=row.querySelector('dt');if(label?.textContent.trim()==='Rank points')storage.appendChild(row);
          if(label?.textContent.trim()==='Experience')label.textContent='XP';
        });
        for(const [label,id] of [['Credits','pilot-credits'],['Uridium','pilot-uridium']]){
          const row=el('div','stat-row hist-rev6-wallet-alias');const value=el('dd');row.append(el('dt','',label),value);list.appendChild(row);mirror(document.getElementById(id),value);
        }
      }
      list?.querySelectorAll('.stat-row dd').forEach(node=>{const full=node.textContent.trim();if(full){node.title=full;node.setAttribute('aria-label',full);}});
      document.querySelectorAll('.hist-dashboard-native .hof-card .leaderboard-name,.hist-dashboard-native .hof-card .leaderboard-score').forEach(node=>{const full=node.textContent.trim();node.title=full;node.setAttribute('aria-label',full);});
      const more=document.querySelector('.hist-finish-home-more');const serverStats=more?.querySelector('.system-card');if(more)storage.appendChild(more);
      const events=document.querySelector('.events-card');const news=document.querySelector('.news-card .news-stream');
      if(events&&news){
        const panels=Array.from(events.querySelectorAll('.event-panel')).sort((a,b)=>{
          const active=Number(b.classList.contains('is-active'))-Number(a.classList.contains('is-active'));
          return active||Number(a.dataset.nextStart)-Number(b.dataset.nextStart);
        });
        const modal=dialog('Server events',events);if(serverStats){const extra=el('details','hist-rev7-server-statistics');extra.appendChild(el('summary','','Server statistics'));extra.appendChild(serverStats);modal.content.appendChild(extra);}
        while(news.firstChild)storage.appendChild(news.firstChild);
        const choices=el('div','hist-rev6-news-choices');const display=el('div','hist-rev6-news-current');
        function field(panel,label){return Array.from(panel.querySelectorAll('.event-details>div')).find(row=>row.querySelector('dt')?.textContent.trim()===label)?.querySelector('dd')?.textContent.trim()||'';}
        function show(panel){
          display.replaceChildren();const name=panel.querySelector('.event-name')?.textContent.trim()||'Server event';
          display.append(el('strong','hist-rev6-news-title',name),el('span','',panel.classList.contains('is-active')?'Active now':field(panel,'Next start')),el('small','',field(panel,'Countdown')));
          Array.from(choices.children).forEach((button,index)=>button.setAttribute('aria-pressed',String(panels[index]===panel)));
        }
        panels.forEach((panel,index)=>{const b=el('button','',/Team Deathmatch/i.test(panel.querySelector('.event-name')?.textContent||'')?'TDM':panel.querySelector('.event-name')?.textContent.trim()||('Event '+(index+1)));b.type='button';b.title=panel.querySelector('.event-name')?.textContent||'Event';b.setAttribute('aria-label',b.title);b.addEventListener('click',()=>show(panel));b.addEventListener('mouseenter',()=>show(panel));choices.appendChild(b);});
        const details=el('button','hist-rev6-news-details','Event details');details.type='button';details.addEventListener('click',()=>modal.open(details));
        news.append(display,choices,details);if(panels.length)show(panels[0]);else display.textContent='No event scheduled.';
        report.events={sameOriginalDetails:true,events:panels.map(n=>({name:n.querySelector('.event-name')?.textContent,unix:Number(n.dataset.nextStart)})),timezone:'Europe/Zurich',countdown:'Existing PHP-rendered countdown; refreshed by normal page navigation only',automaticCarousel:false};
      }
      const logCard=document.querySelector('.log-card');const logs=logCard?.querySelector('.log-list');
      if(logs){
        if(!logs.querySelector('.hist-rev6-welcome')){const welcome=el('li','log-entry hist-rev6-welcome');welcome.appendChild(el('div','log-message','Welcome to Andromeda'));logs.insertBefore(welcome,logs.firstChild);}
        const holder=el('div','hist-rev6-log-home');logs.parentNode.insertBefore(holder,logs);holder.appendChild(logs);
        const open=el('button','hist-rev6-log-history','Logbook history');open.type='button';logCard.appendChild(open);
        const content=el('div','hist-rev6-log-full');const modal=dialog('Recent logbook history',content);
        modal.setHooks(()=>content.appendChild(logs),()=>holder.appendChild(logs));open.addEventListener('click',()=>modal.open(open));
        report.logbook={welcomePresentationOnly:true,originalLoadedRecordsPreserved:logs.children.length-1,fullDatabaseHistoryNotClaimed:true,sourceLink:'DoPs Entire logbook history is a route, not this modal; adapted label Logbook history honestly opens only already-loaded records in native news-popup artwork'};
      }
      report.userInfo='Username, Company, Grade, XP, Honor, Credits, Uridium; same wallet sources observed without new requests; Profile/Change/bonus original paths';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();

/* Daily five-day cycle: reuse the original Home dialog and its claim/close
 * handlers. DoPs proves five states and the PilotSheet Bonus entry, but the
 * matching calendar artwork is missing. Existing PilotSheet art is a declared
 * visual complement; automatic modal opening is the owner's explicit rule.
 * No new reward endpoint, request, polling or timer. */
(function(){
  'use strict';
  function dailyView(){
    const body=document.body;
    if(!body.classList.contains('historical-site')||window.AndromedaHistoricalDailyView)return;
    const query=new URLSearchParams(location.search);
    const bonusHref='view.php?page=home&hist_bonus=1';
    const facts={source:'DoPs internalDockBooster_Body145-202 / darkorbit.css306-311; native standard News window',calendarGeometry:'ANDROMEDA_FIVE_DAY_ADAPTATION; exact original Daily calendar not recovered',cycleDays:5,firstFiveRewardsUnchanged:true,businessRequestsAdded:0,timersAdded:0,nativeMediaLoadsExpected:true,uridium:'Exact reward text; no unverified currency icon'};
    window.AndromedaHistoricalDailyView=facts;
    function make(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
    function bonusItem(menu,active){
      const item=make('li','user-hub__menu-item hist-rev7-bonus-item'+(active?' is-active':''));
      const link=make('a','user-hub__menu-link');link.href=bonusHref;
      link.appendChild(make('span','user-hub__menu-title','Bonus'));
      if(active)link.setAttribute('aria-current','page');
      item.appendChild(link);menu.appendChild(item);return link;
    }
    // This is a link to the existing Home renderer, not a new PHP route/API.
    if(body.classList.contains('hist-area-pilot')){
      const menu=document.querySelector('.user-hub__menu');
      if(menu&&!menu.querySelector('.hist-rev7-bonus-item')){
        menu.classList.add('hist-rev7-bonus-menu');bonusItem(menu,false);
      }
    }
    const modal=document.getElementById('dailyLoginModal');
    const card=modal?.querySelector('.daily-login-card');
    const claim=document.getElementById('dailyLoginClaim');
    const close=document.getElementById('dailyLoginClose');
    const content=card?.querySelector('.daily-login-body');
    const footer=card?.querySelector('.daily-login-footer');
    if(!modal||!card||!claim||!close||!content||!footer)return;
    const cards=Array.from(card.querySelectorAll('[data-daily-day]'));
    if(cards.length!==5)return; // no invented or incomplete reward calendar
    // Same original dialog, cards, labels and claim handlers. Only composition changes.
    const hero=card.querySelector('.daily-login-hero');
    const intro=hero?.querySelector('.daily-login-copy p');
    const reset=hero?.querySelector('.daily-login-reset');
    const status=content.querySelector('.daily-login-status');
    if(hero&&status){
      if(intro)content.insertBefore(intro,status);
      if(reset)content.insertBefore(reset,status);
      const note=footer.querySelector('.daily-login-note');
      if(note)content.insertBefore(note,footer);
      const topClose=make('button','hist-daily-native-close');
      topClose.type='button';topClose.setAttribute('aria-label','Close Daily Login Bonus');
      // Forward to the original Close node: no second close/claim business path.
      topClose.addEventListener('click',()=>close.click());
      hero.appendChild(topClose);
    }
    const nativeIcons={
      'MCB-25':'mcb-25_30x30.png','MCB-50':'mcb-50_30x30.png',
      'UCB-100':'ucb-100_30x30.png','RSB-75':'rsb-75_30x30.png',
      'Promerium':'promerium_30x30.png'
    };
    cards.forEach(article=>article.querySelectorAll('.daily-reward-line').forEach(line=>{
      const label=(line.textContent||'').trim();
      const name=Object.keys(nativeIcons).find(name=>label.endsWith(' '+name));
      if(!name)return; // Uridium stays actual text; never substitute Endurium ore.
      const value=line.lastElementChild;
      const rewardText=value?.textContent||'';
      if(value&&rewardText.endsWith(name)){
        // Preserve exact text; allow wrapping only between quantity and code.
        value.textContent='';
        value.appendChild(document.createTextNode(rewardText.slice(0,-name.length)));
        value.appendChild(make('span','daily-reward-unit',name));
      }
      const icon=make('img','daily-reward-native-icon');
      icon.src='/assets/historical/daily-native/'+nativeIcons[name];
      icon.alt='';icon.setAttribute('aria-hidden','true');icon.width=30;icon.height=30;icon.draggable=false;
      line.insertBefore(icon,line.firstChild);line.dataset.nativeReward=name;
    }));
    modal.classList.add('hist-daily-five-modal');
    card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.tabIndex=-1;
    facts.nodeIdentity={modalSame:document.getElementById('dailyLoginModal')===modal,claimSame:document.getElementById('dailyLoginClaim')===claim,closeSame:document.getElementById('dailyLoginClose')===close,articlesSame:cards.every(node=>modal.contains(node)),days:cards.map(node=>node.dataset.dailyDay)};
    facts.dialog={role:card.getAttribute('role'),modal:card.getAttribute('aria-modal'),sameOriginalButtons:true};
    let wasOpen=false,returnFocus=null;
    function sync(){
      const open=!modal.hidden;
      if(open&&!wasOpen){returnFocus=document.activeElement;(claim.disabled?close:claim).focus();}
      if(wasOpen&&!open){
        if(returnFocus&&returnFocus!==body&&returnFocus.isConnected&&typeof returnFocus.focus==='function')returnFocus.focus();
        else document.getElementById('hist-finish-open-daily')?.focus();
      }
      wasOpen=open;facts.visible=open;
    }
    card.addEventListener('keydown',event=>{
      if(event.key!=='Tab'||modal.hidden)return;
      const controls=Array.from(card.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')).filter(node=>node.getClientRects().length>0);
      if(!controls.length){event.preventDefault();card.focus();return;}
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===card)){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['hidden']});
    if(query.get('hist_bonus')==='1'){
      modal.hidden=false;body.classList.add('modal-open');
    }
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',dailyView,{once:true});else dailyView();
})();
