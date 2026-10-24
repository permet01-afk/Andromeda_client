/* Private presentation adapter. Existing functional nodes keep their Andromeda handlers.
   No purchase/API call is made here. Closing a successful Daily claim reloads the
   current page once to display the authoritative PHP wallet; no polling is added. */
(function(){
  'use strict';
  function boot(){
    if(!document.body.classList.contains('historical-site'))return;
    if(location.pathname.indexOf('/spacemap_html5/')!==-1)return;
    const params=new URLSearchParams(location.search);
    const page=params.get('page')||(/equip_ui\.html$/i.test(location.pathname)?'equipment':'home');
    const tab=params.get('tab')||((page==='user')?'infos':(page==='shop'?'ship':''));
    document.body.classList.add('hist-page-'+page.replace(/[^a-z0-9_-]/gi,''));
    if(tab)document.body.classList.add('hist-tab-'+tab.replace(/[^a-z0-9_-]/gi,''));
    if(/equip_ui\.html$/i.test(location.pathname)){
      document.body.classList.add('hist-equipment');
      const originalActions={};
      const groups=['lasers','speed','shield'];
      const menus=[];
      function closeActions(except,restoreFocus){menus.forEach(entry=>{if(entry!==except){const wasOpen=!entry.menu.hidden;entry.menu.hidden=true;entry.trigger.setAttribute('aria-expanded','false');if(wasOpen&&restoreFocus)entry.trigger.focus();}});}
      groups.forEach(group=>{
        const equip=document.getElementById('inv-equip-'+group);const clear=document.getElementById('inv-remove-'+group);
        const holder=equip?.closest('.actions');if(!equip||!clear||!holder)return;
        originalActions[equip.id]=equip;originalActions[clear.id]=clear;
        holder.classList.add('hist-equipment-actions');
        const trigger=document.createElement('button');trigger.type='button';trigger.className='hist-equipment-action-toggle';trigger.textContent='Actions';trigger.setAttribute('aria-label',group+' actions');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');
        const menu=document.createElement('div');menu.className='hist-equipment-action-menu';menu.id='hist-equipment-actions-'+group;menu.setAttribute('role','menu');menu.hidden=true;trigger.setAttribute('aria-controls',menu.id);
        const entry={trigger,menu};menus.push(entry);
        [equip,clear].forEach((button,index)=>{button.setAttribute('role','menuitem');button.type='button';button.setAttribute('aria-label',(index===0?'Equip all ':'Remove all ')+group);menu.appendChild(button);button.addEventListener('click',()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();});});
        holder.append(trigger,menu);
        trigger.addEventListener('click',()=>{const opening=menu.hidden;closeActions(entry,false);menu.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));});
        trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();closeActions(entry,false);menu.hidden=false;trigger.setAttribute('aria-expanded','true');equip.focus();}});
        menu.addEventListener('keydown',event=>{
          if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeActions(null,true);return;}
          const buttons=[equip,clear];const current=buttons.indexOf(document.activeElement);
          if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:(event.key==='End'?1:(current+(event.key==='ArrowDown'?1:-1)+2)%2);buttons[next].focus();}
        });
      });
      window.addEventListener('pointerdown',event=>{if(!event.target.closest('.hist-equipment-actions'))closeActions(null,false);},true);
      document.addEventListener('click',event=>{if(!event.target.closest('.hist-equipment-actions'))closeActions(null,false);});
      document.addEventListener('keydown',event=>{if(event.key==='Escape')closeActions(null,true);});
      window.AndromedaHistoricalEquipmentActions={sameOriginalButtons:Object.entries(originalActions).every(([id,node])=>document.getElementById(id)===node),movedButtonIds:Object.keys(originalActions),businessRequestsAdded:0};
      return;
    }
    function formShape(){return Array.from(document.forms).map(form=>({action:form.getAttribute('action')||'',method:(form.getAttribute('method')||'get').toLowerCase(),names:Array.from(form.elements).map(e=>e.getAttribute('name')).filter(Boolean).sort()})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}
    const originalForms=JSON.stringify(formShape());
    const originalIds=Array.from(document.querySelectorAll('[id]')).map(e=>e.id).sort();
    // BEGIN VERIFIED ITEM MAP
    const itemImageMap={
    "img/items/lcb10.png": "/assets/historical/dops/global/items/ammo_lcb-10_100x100.png",
    "img/items/mcb25.png": "/assets/historical/dops/global/items/ammo_mcb-25_100x100.png",
    "img/items/mcb50.png": "/assets/historical/dops/global/items/ammo_mcb-50_100x100.png",
    "img/items/ucb100.png": "/assets/historical/dops/global/items/ammo_ucb-100_100x100.png",
    "img/items/sab50.png": "/assets/historical/dops/global/items/ammo_sab-50_100x100.png",
    "img/items/rsb75.png": "/assets/historical/dops/global/items/ammo_rsb-75_100x100.png",
    "img/items/r310.png": "/assets/historical/dops/global/items/rocket_r-310_100x100.png",
    "img/items/plt2026.png": "/assets/historical/dops/global/items/rocket_plt-2026_100x100.png",
    "img/items/plt2021.png": "/assets/historical/dops/global/items/rocket_plt-2021_100x100.png",
    "img/items/dcr250.png": "/assets/historical/dops/global/items/rocket_dcr-250_100x100.png",
    "img/items/eco10.png": "/assets/historical/dops/global/items/rocket_eco-10_100x100.png",
    "img/items/ubr100.png": "/assets/historical/dops/global/items/rocket_ubr-100_100x100.png",
    "img/items/hstrm01.png": "/assets/historical/dops/global/items/rocket_hstrm-01_100x100.png",
    "img/items/smb-01.png": "/assets/historical/dops/global/items/cpu_smb-01_100x100.png",
    "img/items/ish-01.png": "/assets/historical/dops/global/items/cpu_ish-01_100x100.png",
    "img/items/emp-01.png": "/assets/historical/dops/global/items/ammo_emp-01_100x100.png",
    "img/items/lf1.png": "/assets/historical/dops/global/items/weapon_lf1_100x100.png",
    "img/items/mp1.png": "/assets/historical/dops/global/items/weapon_mp1_100x100.png",
    "img/items/lf2.png": "/assets/historical/dops/global/items/weapon_lf2_100x100.png",
    "img/items/lf3.png": "/assets/historical/dops/global/items/weapon_lf3_100x100.png",
    "img/items/sg3na01.png": "/assets/historical/dops/global/items/generator_sg3n-a01_100x100.png",
    "img/items/sg3na02.png": "/assets/historical/dops/global/items/generator_sg3n-a02_100x100.png",
    "img/items/sg3nb01.png": "/assets/historical/dops/global/items/generator_sg3n-b01_100x100.png",
    "img/items/sg3n.png": "/assets/historical/dops/global/items/generator_sg3n-b02_100x100.png",
    "img/items/g3n1010.png": "/assets/historical/dops/global/items/generator_g3n-1010_100x100.png",
    "img/items/g3n2010.png": "/assets/historical/dops/global/items/generator_g3n-2010_100x100.png",
    "img/items/g3n3210.png": "/assets/historical/dops/global/items/generator_g3n-3210_100x100.png",
    "img/items/g3n3310.png": "/assets/historical/dops/global/items/generator_g3n-3310_100x100.png",
    "img/items/g3n6900.png": "/assets/historical/dops/global/items/generator_g3n-6900_100x100.png",
    "img/items/g3n7900.png": "/assets/historical/dops/global/items/generator_g3n-7900_100x100.png",
    "img/items/hst1.png": "/assets/historical/dops/global/items/equipment/weapon/rocketlauncher/hst-1_100x100.png",
    "img/items/hst2.png": "/assets/historical/dops/global/items/equipment/weapon/rocketlauncher/hst-2_100x100.png"
};
    // END VERIFIED ITEM MAP
    const nav=document.querySelector('.app-nav');
    const sourceWalletNodes={credits:document.getElementById('pilot-credits'),uridium:document.getElementById('pilot-uridium')};
    const requestedSection=params.get('historical_section');
    const isProfile=page==='user'&&tab==='infos'&&requestedSection==='profile';
    const isOverview=page==='user'&&tab==='infos'&&!isProfile;
    const isPilotArea=isProfile||(page==='user'&&['upgrades','quests','titles','achievements'].indexOf(tab)!==-1)||page==='company';
    const isHangarArea=isOverview||(page==='user'&&tab==='configurations');
    document.body.classList.toggle('hist-area-pilot',isPilotArea);
    document.body.classList.toggle('hist-area-hangar',isHangarArea);
    if(isProfile)document.body.classList.add('hist-profile-page');
    if(isOverview)document.body.classList.add('hist-overview-page');
    const routeLinks={overview:'view.php?page=user&tab=infos&historical_section=overview',profile:'view.php?page=user&tab=infos&historical_section=profile',equipment:'view.php?page=user&tab=configurations',bio:'view.php?page=user&tab=upgrades',quests:'view.php?page=user&tab=quests',titles:'view.php?page=user&tab=titles'};
    const stateStorage=document.createElement('div');stateStorage.id='hist-pilot-state';stateStorage.hidden=true;
    stateStorage.setAttribute('aria-label','Original update targets; pilot data remains available in Pilot Sheet');
    document.body.appendChild(stateStorage);
    function routeOf(anchor){try{return new URL(anchor.getAttribute('href'),location.href);}catch(_){return null;}}
    function navAnchor(href,label){const anchor=document.createElement('a');anchor.href=href;anchor.className='submenu-link';anchor.textContent=label;return anchor;}
    if(nav){
      const sourceItems=Array.from(nav.querySelectorAll('.nav-item'));
      const userItem=sourceItems.find(item=>{const a=item.querySelector(':scope>.nav-link');return a&&routeOf(a)?.searchParams.get('page')==='user';});
      const homeItem=sourceItems.find(item=>{const a=item.querySelector(':scope>.nav-link');return a&&routeOf(a)?.searchParams.get('page')==='home';});
      if(homeItem){
        const homeLink=homeItem.querySelector(':scope>.nav-link');
        const actions=document.querySelector('.header-actions');
        if(actions){
          actions.querySelectorAll('.header-link').forEach(link=>{if(routeOf(link)?.searchParams.get('page')==='home'){link.hidden=true;stateStorage.appendChild(link);}});
          homeLink.className='header-link hist-home-link';homeLink.textContent='Home';actions.insertBefore(homeLink,actions.firstChild);homeItem.hidden=true;
        }
      }
      if(userItem){
        const hangarLink=userItem.querySelector(':scope>.nav-link');
        const sourceMenu=userItem.querySelector('.submenu');
        const sources=sourceMenu?Array.from(sourceMenu.querySelectorAll('.submenu-link')):[];
        const byTab=name=>sources.find(link=>routeOf(link)?.searchParams.get('tab')===name);
        const originalProfile=byTab('infos');
        const pilotItem=document.createElement('li');pilotItem.className='nav-item has-submenu hist-pilot-sheet';pilotItem.dataset.histAdded='true';pilotItem.dataset.histNavKey='pilot-sheet';
        const pilotLink=originalProfile||navAnchor(routeLinks.profile,'Pilot Sheet');
        pilotLink.className='nav-link';pilotLink.href=routeLinks.profile;pilotLink.textContent='Pilot Sheet';pilotLink.setAttribute('aria-haspopup','true');pilotLink.setAttribute('aria-expanded','false');
        const pilotToggle=document.createElement('button');pilotToggle.className='submenu-toggle';pilotToggle.type='button';pilotToggle.setAttribute('aria-label','Toggle Pilot Sheet menu');pilotToggle.setAttribute('aria-expanded','false');
        const toggleIcon=document.createElement('span');toggleIcon.className='submenu-toggle-icon';toggleIcon.setAttribute('aria-hidden','true');pilotToggle.appendChild(toggleIcon);
        const pilotMenu=document.createElement('ul');pilotMenu.className='submenu';pilotMenu.setAttribute('aria-label','Pilot Sheet sections');
        const addPilot=link=>{if(!link)return;const li=document.createElement('li');li.appendChild(link);pilotMenu.appendChild(li);};
        addPilot(navAnchor(routeLinks.profile,'Profile'));
        const bioLink=byTab('upgrades');if(bioLink)bioLink.textContent='Skilltree';addPilot(bioLink);
        addPilot(byTab('quests'));addPilot(byTab('titles'));
        const companyLink=sources.find(link=>routeOf(link)?.searchParams.get('page')==='company');addPilot(companyLink);
        pilotItem.append(pilotLink,pilotToggle,pilotMenu);nav.querySelector('.nav-list').appendChild(pilotItem);
        hangarLink.textContent='Hangar';hangarLink.href=routeLinks.overview;userItem.dataset.histNavKey='hangar';
        if(sourceMenu){
          const overview=navAnchor(routeLinks.overview,'Overview');const li=document.createElement('li');li.appendChild(overview);sourceMenu.insertBefore(li,sourceMenu.firstChild);
          const equipmentLink=byTab('configurations');if(equipmentLink)equipmentLink.textContent='Equipment';
          sourceMenu.querySelectorAll('li').forEach(item=>{if(!item.children.length)item.hidden=true;});
          sourceMenu.setAttribute('aria-label','Hangar sections');
        }
        userItem.classList.toggle('is-active',isHangarArea);
        pilotItem.classList.toggle('is-active',isPilotArea);
      }
    }
    const navLinks=nav?Array.from(nav.querySelectorAll('.nav-item>.nav-link')):[];
    const slots={
      hangar:{x:42,y:68,side:'left'},
      clan:{x:51,y:98,side:'left'},
      settings:{x:175,y:107,side:'left'},
      rules:{x:60,y:127,side:'left'},
      'pilot-sheet':{x:184,y:136,side:'left',big:true},
      shop:{x:690,y:68,side:'right'},
      auction:{x:681,y:98,side:'right'},
      contact:{x:557,y:108,side:'right'},
      skylab:{x:671,y:128,side:'right'},
      lottery:{x:547,y:138,side:'right',big:true}
    };
    navLinks.forEach(link=>{
      const item=link.parentElement;
      if(item.classList.contains('cta'))return;
      let route;
      try{route=new URL(link.getAttribute('href'),location.href).searchParams.get('page');}catch(_){return;}
      const slot=slots[item.dataset.histNavKey||route];
      if(!slot)return;
      item.style.setProperty('--hist-x',slot.x+'px');
      item.style.setProperty('--hist-y',slot.y+'px');
      item.style.setProperty('--hist-button',"url('/assets/historical/pk/do/header/buttons/"+(slot.big?'big':'small')+'_button_'+slot.side+"_sprite.png')");
      item.classList.toggle('hist-big',!!slot.big);
      if(item.classList.contains('has-submenu')&&(!matchMedia('(hover:none), (pointer:coarse)').matches||item.dataset.histAdded==='true')){
        item.classList.remove('is-expanded');
        const toggle=item.querySelector('.submenu-toggle');
        if(toggle){
          toggle.setAttribute('aria-expanded','false');
          link.setAttribute('aria-expanded','false');
          const toggleMenu=event=>{
            event.preventDefault();
            const expanded=!item.classList.contains('is-expanded');
            nav.querySelectorAll('.has-submenu').forEach(other=>{
              other.classList.remove('is-expanded');
              const button=other.querySelector('.submenu-toggle');
              if(button)button.setAttribute('aria-expanded','false');
              const anchor=other.querySelector('.nav-link');
              if(anchor)anchor.setAttribute('aria-expanded','false');
            });
            item.classList.toggle('is-expanded',expanded);
            toggle.setAttribute('aria-expanded',String(expanded));
            link.setAttribute('aria-expanded',String(expanded));
          };
          toggle.addEventListener('click',toggleMenu);
          if(item.dataset.histAdded==='true'&&matchMedia('(hover:none), (pointer:coarse)').matches){link.addEventListener('click',event=>{if(!item.classList.contains('is-expanded'))toggleMenu(event);});}
        }
      }
    });
    document.addEventListener('keydown',event=>{
      if(event.key!=='Escape'||!nav)return;
      nav.querySelectorAll('.has-submenu').forEach(item=>{
        item.classList.remove('is-expanded');
        item.querySelectorAll('[aria-expanded]').forEach(el=>el.setAttribute('aria-expanded','false'));
      });
    });
    const header=document.querySelector('.app-header');
    const pilotStrip=document.querySelector('.pilot-strip');
    const profileCard=document.querySelector('.user-hub__content .profile-card');
    if(header){
      for(const kind of ['credits','uridium']){
        let liveValue=sourceWalletNodes[kind];
        let walletBlock=liveValue?.closest('.stat-box');
        if(!liveValue&&page==='home'){
          const row=Array.from(document.querySelectorAll('.user-card .stat-row')).find(row=>(row.querySelector('dt')?.textContent||'').trim().toLowerCase()===kind);
          liveValue=row?.querySelector('dd');walletBlock=row;if(liveValue)liveValue.id='pilot-'+kind;
        }
        if(liveValue&&walletBlock){
          walletBlock.classList.add('hist-header-wallet','hist-wallet-'+kind);
          walletBlock.setAttribute('aria-label',kind==='credits'?'Credits':'Uridium');
          header.appendChild(walletBlock);
        }
      }
    }
    if(pilotStrip){
      if(profileCard&&isProfile){
        const fields={Experience:'pilot-xp',Honor:'pilot-honor'};
        profileCard.querySelectorAll('.stats-list .stat-row').forEach(row=>{
          const label=(row.querySelector('.stat-label')?.textContent||'').trim();
          if(fields[label]){
            const live=document.getElementById(fields[label]);const duplicate=row.querySelector('.stat-val');
            if(live){if(duplicate)stateStorage.appendChild(duplicate);live.classList.add('stat-val');row.appendChild(live);}
          }
          if(['Credits','Uridium'].indexOf(label)!==-1){row.hidden=true;stateStorage.appendChild(row);}
        });
        const identity=pilotStrip.querySelector('.pilot-profile');
        const profileHeader=profileCard.querySelector('.pilot-header');
        if(identity&&profileHeader){
          const duplicateName=profileHeader.querySelector('.pilot-name-row');if(duplicateName)stateStorage.appendChild(duplicateName);
          const grade=identity.querySelector('.pilot-grade-icon');const rankRow=profileHeader.querySelector('.pilot-rank-row');
          if(grade&&rankRow){const duplicateGrade=rankRow.querySelector('.rank-icon');if(duplicateGrade)stateStorage.appendChild(duplicateGrade);grade.classList.add('rank-icon');rankRow.insertBefore(grade,rankRow.firstChild);}
          identity.classList.add('hist-profile-identity');profileHeader.insertBefore(identity,profileHeader.firstChild);
        }
      }
      stateStorage.appendChild(pilotStrip);
    }
    if(page==='user'){
      const localMenu=document.querySelector('.user-hub__menu');
      if(localMenu){
        localMenu.querySelectorAll('.user-hub__menu-item').forEach(item=>{
          const anchor=item.querySelector('a');const target=routeOf(anchor)?.searchParams.get('tab');
          const keep=isHangarArea?['infos','configurations'].includes(target):['infos','upgrades','quests','titles'].includes(target);
          if(!keep){stateStorage.appendChild(item);return;}
          const isInfo=target==='infos';
          if(isInfo){anchor.href=isHangarArea?routeLinks.overview:routeLinks.profile;anchor.querySelector('.user-hub__menu-title').textContent=isHangarArea?'Overview':'Profile';}
          if(target==='configurations')anchor.querySelector('.user-hub__menu-title').textContent='Equipment';
          if(target==='upgrades')anchor.querySelector('.user-hub__menu-title').textContent='Skilltree';
          item.classList.toggle('is-active',isInfo?(isOverview||isProfile):target===tab);
        });
        localMenu.setAttribute('aria-label',isHangarArea?'Hangar sections':'Pilot Sheet sections');
      }
      if(tab==='infos'){
        const activeShip=document.getElementById('ship-lifecycle-panel');if(activeShip)activeShip.hidden=isProfile;
        const profileGrid=profileCard?.closest('.dashboard-grid');if(profileGrid)profileGrid.hidden=isOverview;
      }
    }
    const actualPortrait=document.getElementById('ship-panel-portrait');
    const portraitShipId=Number((actualPortrait?.getAttribute('src')||'').match(/ship-lifecycle\/(\d+)\.png/)?.[1]||0);
    if(header&&actualPortrait&&[1,3,4,5,6,7,8,9,10].includes(portraitShipId)){
      const portrait=document.createElement('img');
      portrait.className='hist-header-ship';
      portrait.src='/assets/historical/dops/global/header/model'+portraitShipId+'.png';
      portrait.alt='';
      portrait.setAttribute('aria-hidden','true');
      header.appendChild(portrait);
    }
    if(page==='home'){
      const dashboard=document.querySelector('.dashboard');
      const grid=dashboard&&dashboard.querySelector('.dashboard-grid');
      const main=document.querySelector('.app-main');
      if(grid&&dashboard){
        const nativeSelectors=['.news-card','.user-card','.hof-card','.log-card'];
        const nativeCards=nativeSelectors.map(selector=>grid.querySelector(selector));
        if(nativeCards.every(Boolean)){
          const cards=Array.from(grid.querySelectorAll('.dashboard-column>.dashboard-card'));
          const extra=document.createElement('div');
          extra.className='hist-dashboard-extensions';
          grid.classList.add('hist-dashboard-native');
          nativeCards.forEach(card=>grid.appendChild(card));
          cards.filter(card=>nativeCards.indexOf(card)===-1).forEach(card=>extra.appendChild(card));
          const top100=document.getElementById('open-top100');
          if(top100){top100.classList.add('hist-native-top100');nativeCards[2].appendChild(top100);}
          const discord=dashboard.querySelector('.discord-card');
          if(discord){
            const preserved=document.createElement('section');
            preserved.className='hist-discord-preserved';
            const heading=document.createElement('h3');heading.textContent='Andromeda community';
            preserved.append(heading,discord);extra.appendChild(preserved);
          }
          grid.insertAdjacentElement('afterend',extra);
          grid.querySelectorAll(':scope>.dashboard-column').forEach(column=>{
            if(!column.children.length)column.hidden=true;
          });
        }
      }
      if(main){
        const rail=document.createElement('aside');
        rail.className='hist-home-rail';
        rail.setAttribute('aria-label','Andromeda sections');
        const teaser=document.createElement('div');teaser.className='hist-rail-teaser';teaser.setAttribute('aria-hidden','true');rail.appendChild(teaser);
        main.insertBefore(rail,main.firstChild);
      }
      const claimedCounter=document.querySelector('[data-daily-claimed-count]');
      const dailyModal=document.getElementById('dailyLoginModal');
      if(claimedCounter&&dailyModal){
        const initialClaimed=parseInt(claimedCounter.textContent,10)||0;
        let reloading=false;
        const refreshAfterClaimClose=()=>{
          const currentClaimed=parseInt(claimedCounter.textContent,10)||0;
          if(!reloading&&dailyModal.hidden&&currentClaimed>initialClaimed){
            reloading=true;counterObserver.disconnect();modalObserver.disconnect();location.reload();
          }
        };
        const counterObserver=new MutationObserver(refreshAfterClaimClose);
        const modalObserver=new MutationObserver(refreshAfterClaimClose);
        counterObserver.observe(claimedCounter,{childList:true,subtree:true,characterData:true});
        modalObserver.observe(dailyModal,{attributes:true,attributeFilter:['hidden']});
      }
    }
    if(page==='shop'){
      const shopCards=Array.from(document.querySelectorAll('.shop-card'));
      const historicalCategories=[
        {key:'ship',label:'Ships',tab:'ship'},
        {key:'drones',label:'Drones',tab:'items',cat:'drones'},
        {key:'weapons',label:'Weapons',tab:'items',cat:'weapons'},
        {key:'ammo',label:'Ammo',tab:'items',cat:'ammo'},
        {key:'generators',label:'Generators',tab:'items',cat:'weapons'},
        {key:'extras',label:'Extras',tab:'items',cat:'extras'},
        {key:'boosters',label:'Boosters',tab:'boosters'},
        {key:'designs',label:'Designs',tab:'designs'}
      ];
      const validItemSections=['weapons','ammo','generators','extras','drones'];
      const requestedShopSection=params.get('hist_shop');
      const itemSection=validItemSections.includes(requestedShopSection)?requestedShopSection:(validItemSections.includes(params.get('cat'))?params.get('cat'):'ammo');
      const activeShopSection=tab==='items'?itemSection:tab;
      document.body.dataset.histShopSection=activeShopSection;
      const shopMenu=document.querySelector('.user-hub__menu');
      const oldCategoryMenu=document.querySelector('#shop-items-container>.shop-nav');
      if(shopMenu){
        const sourceShopLinks=Array.from(shopMenu.querySelectorAll('a')).concat(oldCategoryMenu?Array.from(oldCategoryMenu.querySelectorAll('a')):[]);
        shopMenu.querySelectorAll('li').forEach(item=>stateStorage.appendChild(item));
        historicalCategories.forEach(category=>{
          const source=sourceShopLinks.find(link=>{
            const route=routeOf(link);return route&&route.searchParams.get('tab')===category.tab&&(category.tab!=='items'||route.searchParams.get('cat')===category.cat)&&!link.dataset.histShopConsumed;
          });
          const link=source||document.createElement('a');link.dataset.histShopConsumed='true';
          const route=new URL('view.php',location.href);route.searchParams.set('page','shop');route.searchParams.set('tab',category.tab);
          if(category.cat){route.searchParams.set('cat',category.cat);route.searchParams.set('hist_shop',category.key);}
          link.setAttribute('href',route.pathname+route.search);link.className='user-hub__menu-link';link.textContent=category.label;
          const item=document.createElement('li');item.className='user-hub__menu-item';item.classList.toggle('is-active',category.key===activeShopSection);item.appendChild(link);shopMenu.appendChild(item);
        });
        shopMenu.setAttribute('aria-label','Shop categories, historical DoPs order');
        if(oldCategoryMenu){oldCategoryMenu.hidden=true;stateStorage.appendChild(oldCategoryMenu);}
      }
      function itemCode(row){
        const input=row.querySelector('input[name=buy_ammo_type],input[name=buy_equip_type]');if(input)return input.value;
        const buy=row.querySelector('a.btn-buy');if(buy){const route=routeOf(buy);if(route?.searchParams.get('buy'))return route.searchParams.get('buy');}
        return (row.querySelector('img')?.getAttribute('src')||'').split('/').pop().replace(/\.png(?:\?.*)?$/,'').replace(/-/g,'');
      }
      function itemGroup(code){
        if(/^(lf[123]|mp1|hst[12])$/.test(code))return 'weapons';
        if(/^(sg3n|g3n)/.test(code))return 'generators';
        if(['arol','cargo','smb01','ish01','emp01','logfile','bootykey'].includes(code))return 'extras';
        if(['iris','flax'].includes(code))return 'drones';
        return 'ammo';
      }
      function existingRows(card){
        const original=card.querySelector('.ship-list,.design-list,.items-grid');
        return {original:original,rows:original?Array.from(original.children).filter(el=>el.matches('.ship-row,.design-row,.item-tile')):Array.from(card.children).filter(el=>el.matches('.item-row'))};
      }
      const unified=tab==='items'&&shopCards.length>1;
      const bundles=unified?[{card:shopCards[0],parts:shopCards.map(card=>({card:card,...existingRows(card)}))}]:shopCards.map(card=>({card:card,parts:[{card:card,...existingRows(card)}]}));
      bundles.forEach(bundle=>{
        const card=bundle.card;
        const allRows=bundle.parts.flatMap(part=>part.rows);
        const rows=unified?allRows.filter(row=>itemGroup(itemCode(row))===itemSection):allRows;
        if(unified){
          allRows.forEach(row=>{row.dataset.histItemCode=itemCode(row);row.dataset.histItemGroup=itemGroup(itemCode(row));if(!rows.includes(row))stateStorage.appendChild(row);});
          rows.forEach(row=>row.querySelectorAll('a.btn-buy').forEach(link=>{const route=routeOf(link);if(route){route.searchParams.set('hist_shop',itemSection);link.setAttribute('href',route.pathname+route.search);}}));
        }
        if(!rows.length)return;
        const consoleEl=document.createElement('div');consoleEl.className='hist-shop-console';
        const catalogue=document.createElement('div');catalogue.className='hist-shop-catalog';catalogue.setAttribute('role','tablist');catalogue.setAttribute('aria-label',unified?(historicalCategories.find(category=>category.key===itemSection)?.label||'Items'):((card.querySelector('.shop-title')||{}).textContent||'Catalogue'));
        const detail=document.createElement('div');detail.className='hist-shop-detail';
        const buttons=[];
        if(unified){
          card.classList.add('hist-shop-unified');
          const title=document.createElement('h2');title.className='shop-title hist-unified-title';
          title.textContent=historicalCategories.find(category=>category.key===itemSection)?.label||'Items';
          card.appendChild(title);
        }
        rows.forEach((row,index)=>{
          const choice=document.createElement('button');choice.type='button';choice.className='hist-catalog-choice';choice.setAttribute('role','tab');choice.setAttribute('aria-selected',index===0?'true':'false');
          const nameEl=row.querySelector('.ship-name,.design-name,.item-name');
          const name=nameEl?nameEl.textContent.trim():'Item '+(index+1);
          const purchaseAction=row.querySelector('.ship-action,.design-action,.item-action');
          if(purchaseAction){
            const summary=document.createElement('section');summary.className='hist-purchase-summary';
            const summaryTitle=document.createElement('h3');summaryTitle.textContent=name;summary.appendChild(summaryTitle);
            const description=row.querySelector('.ship-stats,.design-bonus,.item-desc');
            if(description){const summaryText=document.createElement('p');summaryText.textContent=description.textContent;summary.appendChild(summaryText);}
            purchaseAction.insertBefore(summary,purchaseAction.firstChild);
          }
          const image=row.querySelector('.ship-img-container img,.design-img img,.item-img-container img');
          if(image&&itemImageMap[image.getAttribute('src')]){
            image.src=itemImageMap[image.getAttribute('src')];image.classList.add('hist-native-item-icon');
          }
          if(image){const thumb=image.cloneNode(false);thumb.removeAttribute('id');thumb.alt='';thumb.setAttribute('aria-hidden','true');choice.appendChild(thumb);}
          if(image&&row.classList.contains('ship-row')){
            const match=(image.getAttribute('src')||'').match(/\/shop\/(\d+)\.png(?:\?|$)/);
            if(match&&[1,3,4,5,6,7,8,9,10].indexOf(Number(match[1]))!==-1){
              image.src='/assets/historical/dops/global/header/model'+Number(match[1])+'.png';
              image.classList.add('hist-native-ship-model');
            }
          }
          const label=document.createElement('span');label.textContent=name;choice.appendChild(label);
          choice.addEventListener('click',()=>{
            rows.forEach((other,i)=>{other.hidden=i!==index;buttons[i].setAttribute('aria-selected',String(i===index));});
          });
          row.hidden=index!==0;
          detail.appendChild(row);catalogue.appendChild(choice);buttons.push(choice);
        });
        consoleEl.append(catalogue,detail);
        bundle.parts.forEach(part=>{
          if(part.original)part.original.classList.add('hist-shop-original-list');
          if(unified&&part.card!==card)part.card.hidden=true;
        });
        card.appendChild(consoleEl);
      });
    }
    if(page==='clan'){
      const host=document.querySelector('.CMSContent');
      const localNav=host?.querySelector('.clan-subnav');
      if(host&&localNav){
        const clanTab=routeOf(localNav.querySelector('a.is-active'))?.searchParams.get('tab')||tab||'joinclan';
        const pageContent=host.querySelector('.clan-page');
        const cards=pageContent?Array.from(pageContent.querySelectorAll(':scope>.clan-card')):[];
        const scene=document.createElement('section');scene.className='hist-clan-scene hist-clan-'+clanTab;scene.setAttribute('aria-label','Clan '+clanTab);
        const extras=document.createElement('div');extras.className='hist-clan-extensions';
        const headingFor=node=>node?.previousElementSibling?.matches('.clan-section-title,.title')?node.previousElementSibling:null;
        function pane(name,nodes){const panel=document.createElement('section');panel.className='hist-clan-pane hist-clan-'+name;nodes.filter(Boolean).forEach(node=>panel.appendChild(node));scene.appendChild(panel);return panel;}
        function extend(nodes){nodes.filter(Boolean).forEach(node=>extras.appendChild(node));}
        if(clanTab==='claninfos'&&cards.length>=3){
          const grid=cards[0].querySelector('.clan-grid');
          const rows=grid?Array.from(grid.children):[];
          const summary=document.createElement('dl');summary.className='clan-grid';
          rows.filter(row=>!row.classList.contains('clan-row--textarea')).slice(1).forEach(row=>summary.appendChild(row));
          pane('summary',[headingFor(cards[0]),summary]);
          pane('emblem',rows.slice(0,1));
          pane('description',rows.filter(row=>row.classList.contains('clan-row--textarea')));
          pane('news',[headingFor(cards[1]),cards[1].querySelector('.clan-messages-box')]);
          extend([cards[1],headingFor(cards[2]),cards[2]]);
          stateStorage.appendChild(cards[0]);
        }else if(clanTab==='clanmembers'){
          const members=host.querySelector('#clan-members')?.closest('.box');
          const requests=host.querySelector('#clan-members-requests')?.closest('.box');
          pane('members',[members]);if(requests)pane('requests',[requests]);
        }else if(clanTab==='diplomacy'){
          const relations=document.createElement('div');relations.className='hist-clan-relations';
          for(const id of ['clan-alliances','clan-wars']){const card=document.getElementById(id);const column=document.createElement('section');if(card){const heading=headingFor(card);if(heading)column.appendChild(heading);column.appendChild(card);relations.appendChild(column);}}
          pane('relations',[relations]);
          const pending=document.getElementById('clan-pending-alliance');if(pending)pane('pending',[headingFor(pending),pending]);
          const action=document.getElementById('clan-new-diplomacy');if(action)extend([headingFor(action),action]);
        }else if(clanTab==='treasury'&&cards.length>=2){
          const rows=Array.from(cards[0].querySelectorAll('.clan-grid>.clan-row'));
          const summary=document.createElement('dl');summary.className='clan-grid';rows.filter(row=>!row.classList.contains('clan-row--textarea')).forEach(row=>summary.appendChild(row));
          pane('balance',[summary]);pane('transfers',[headingFor(cards[1]),cards[1]]);
          extend(rows.filter(row=>row.classList.contains('clan-row--textarea')));
          stateStorage.appendChild(cards[0]);
        }else{
          const content=pageContent||host.querySelector('#clan-logs')?.closest('.box');
          if(content)pane('generic',[content]);
        }
        host.classList.add('hist-clan-organized');
        host.appendChild(scene);if(extras.children.length)host.appendChild(extras);
        if(pageContent&&pageContent!==scene&&pageContent.parentElement===host){
          const leftovers=Array.from(pageContent.children).filter(node=>!node.matches('script,link,style'));
          if(leftovers.length){const extra=extras.parentElement?extras:host.appendChild(extras);leftovers.forEach(node=>extra.appendChild(node));}
          if(!pageContent.children.length)pageContent.hidden=true;
        }
      }
    }
    const feedbackPopup=document.getElementById('popup_box');
    if(feedbackPopup){
      document.body.appendChild(feedbackPopup);
      document.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&getComputedStyle(feedbackPopup).display!=='none'){
          const close=document.getElementById('popupBoxClose');if(close)close.click();
        }
      });
    }
    if(page==='skylab'&&tab!=='tech_factory'){
      const available=new Set(['uplink_prometiumCollector.png','uplink_enduriumCollector.png','uplink_terbiumCollector.png','uplink_prometidRefinery.png','uplink_duraniumRefinery.png','uplink_promeriumRefinery.png','uplink_xenoModule.png','uplink_sepromRefinery.png','prometium_collector_layer.gif','endurium_collector_layer.gif','terbium_collector_layer.gif','prometid_refinery_layer.gif','duranium_refinery_layer.gif','promerium_refinery_layer.gif','xeno_module_layer.gif','seprom_refinery_layer.gif','icon_level.png','power.png','efficiency.png']);
      document.querySelectorAll('.skylab-map img').forEach(image=>{
        const filename=(image.getAttribute('src')||'').split('/').pop();
        if(available.has(filename))image.src='/assets/historical/pk/do/skylab/'+filename;
      });
    }
    const finalIds=new Set(Array.from(document.querySelectorAll('[id]')).map(e=>e.id));
    const missingIds=originalIds.filter(id=>!finalIds.has(id));
    window.AndromedaHistoricalPresentation={
      version:'PK-DOPS-private-20261019',
      organizationRevision:3,
      presentationArea:isProfile?'pilot-profile':(isOverview?'hangar-overview':(isPilotArea?'pilot-sheet':(isHangarArea?'hangar-equipment':page))),
      originalWalletNodeIdentityPreserved:Object.entries(sourceWalletNodes).every(([kind,node])=>!node||document.getElementById('pilot-'+kind)===node),
      dailyWalletRefresh:'one reload after successful claim and modal close; no polling/API/SQL added',
      originalFormStructurePreserved:originalForms===JSON.stringify(formShape()),
      missingOriginalIds:missingIds,
      sources:['PrivateKrypton','DoPs'],
      businessRequestsMadeByAdapter:0,
      assetRequestsMayBeMade:true,
      foreignBackendImported:false
    };
    if(missingIds.length||window.AndromedaHistoricalPresentation.originalFormStructurePreserved===false){console.warn('Historical presentation: inspect original DOM contract preservation.');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
