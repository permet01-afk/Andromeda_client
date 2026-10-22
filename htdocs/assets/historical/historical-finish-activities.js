/* Private presentation from the inspected DoPs Gatebuilder / QuestTree AS.
   REV8 recovered media remain separate research references pending rights;
   no recovered SWF/script is loaded here. Same Andromeda business nodes,
   callbacks, costs and transactions; no new request or timer. */
(function () {
  'use strict';
  const report = { version: 'REV8', businessRequestsAdded: 0, timersAdded: 0, gates: null, quests: null, skylab: null, factory: null };

  function disclosure(parent, title, nodes) {
    const useful = nodes.filter(Boolean);
    if (!useful.length) return null;
    const details = document.createElement('details');
    details.className = 'hist-activity-details';
    const summary = document.createElement('summary');
    summary.textContent = title;
    details.appendChild(summary);
    useful.forEach(node => details.appendChild(node));
    parent.appendChild(details);
    return details;
  }

  function finishGates(root) {
    if (!root || root.dataset.historicalActivities === 'rev5') return;
    const card = root.querySelector('.lottery-card');
    const controls = root.querySelector('.controls-zone');
    if (!card || !controls) return;
    const buttons = Array.from(root.querySelectorAll('button'));
    const identities = new Map(buttons.filter(node => node.id).map(node => [node.id, node]));
    // Native button centring otherwise puts the text below its35px bitmap
    // while the status has its own absolute position. Position the same label
    // text nodes inside that bitmap, independently of the status below it.
    root.querySelectorAll('.gate-tab').forEach(button => {
      const textNodes = Array.from(button.childNodes).filter(node => node.nodeType === 3 && node.textContent.trim());
      if (!textNodes.length) return;
      const label = document.createElement('span');
      label.className = 'hist-gate-label';
      button.prepend(label);
      textNodes.forEach(node => label.appendChild(node));
    });
    const tabs = root.querySelector('.gate-tabs');
    const gateButtons = Array.from(tabs.querySelectorAll('.gate-tab'));
    const shared = document.createElement('div');
    shared.className = 'hist-gate-shared';
    shared.setAttribute('role', 'group');
    shared.setAttribute('aria-label', 'Alpha Beta Gamma shared generator');
    const sharedLabel = document.createElement('span');
    sharedLabel.className = 'hist-gate-group-name';
    sharedLabel.textContent = 'Alpha / Beta / Gamma';
    shared.appendChild(sharedLabel);
    tabs.prepend(shared);
    gateButtons.slice(0, 3).forEach(button => shared.appendChild(button));
    const footer = document.createElement('div');
    footer.className = 'hist-activity-notes';
    const wrapper = root.querySelector('.lottery-wrapper') || root;
    const runActions = root.querySelector('#gateLifeActions');
    if (runActions) {
      root.querySelector('.left-zone').appendChild(runActions);
    }
    wrapper.appendChild(footer);
    const walletRow = root.querySelector('#ggUridium')?.closest('.gg-row');
    const unitCostRow = Array.from(controls.children).find(node => node.classList.contains('gg-row') && !node.id && !node.classList.contains('cost-box') && node !== walletRow && !node.querySelector('#multBadge'));
    // The same live Uridium span belongs in the native Stats area (x524,y0).
    if (walletRow) walletRow.classList.add('hist-gate-wallet');
    const multRow = root.querySelector('#multBadge')?.closest('.gg-row');
    if (multRow) multRow.classList.add('hist-gate-multiplier');
    disclosure(footer, 'Gate information', [root.querySelector('#gatePoolNote'), unitCostRow]);
    disclosure(footer, 'Probabilities', [root.querySelector('.drop-overview')]);
    const amountButtons = Array.from(root.querySelectorAll('.amt-btn'));
    const amountSelector = root.querySelector('.amount-selector');
    const amountChoice = document.createElement('select');
    amountChoice.id = 'hist-gate-energy-amount';
    amountChoice.setAttribute('aria-label', 'Materialization energy amount');
    amountButtons.forEach(button => {
      const option = document.createElement('option');
      option.value = button.textContent.trim();
      option.textContent = option.value + (option.value === '1' ? ' energy' : ' energies');
      option.selected = button.classList.contains('active');
      amountChoice.appendChild(option);
    });
    amountChoice.addEventListener('change', () => amountButtons.find(button => button.textContent.trim() === amountChoice.value)?.click());
    amountSelector.prepend(amountChoice);
    const amountObserver = new MutationObserver(() => {
      const active = amountButtons.find(button => button.classList.contains('active'));
      if (active) amountChoice.value = active.textContent.trim();
      amountChoice.disabled = root.querySelector('#btnSpin').disabled;
    });
    amountButtons.forEach(button => amountObserver.observe(button, { attributes: true, attributeFilter: ['class', 'disabled'] }));
    amountObserver.observe(root.querySelector('#btnSpin'), { attributes: true, attributeFilter: ['disabled'] });
    const logHeading = document.createElement('h3');
    logHeading.className = 'hist-gate-log-heading';
    logHeading.textContent = 'Log';
    controls.insertBefore(logHeading, root.querySelector('#resultPanel'));
    // Same live summaries leave the selector buttons. The chosen portal's
    // original count/state remains in the construction region, never lost.
    const leftZone=root.querySelector('#leftZone');
    const context=document.createElement('div');context.className='rev6-gate-context-summary';
    const summaries=gateButtons.map(button=>button.querySelector('small')).filter(Boolean);
    summaries.forEach(node=>context.appendChild(node));leftZone.appendChild(context);
    function syncGateContext(){
      const selected=Number(leftZone.dataset.gate||1);
      summaries.forEach((node,index)=>{node.hidden=index+1!==selected;});
    }
    syncGateContext();new MutationObserver(syncGateContext).observe(leftZone,{attributes:true,attributeFilter:['data-gate']});
    const gateFacts=root.querySelector('#gateFacts');
    if(gateFacts){
      // The source only updates style.display. Its initial hidden attribute
      // otherwise overrode that live state with the skin's [hidden] rule.
      if(!gateFacts.style.display)gateFacts.style.display='none';
      gateFacts.hidden=false;leftZone.appendChild(gateFacts);
    }
    // Complement REV9: retain information/probabilities below the stage, without the removed i control.
    root.classList.add('rev6-gates');
    root.classList.add('hist-gg-ready');
    root.dataset.historicalActivities = 'rev5';
    report.gates = {
      layout: 'Gatebuilder Main.as native 786x395: selector x0, gate x180, stats/multiplier/machine/log x524; ABG shared group; amount combobox',
      graphicsLimit: 'REV8 recovered candidate libraries remain separate research references, without an established graphics reuse grant. Existing portal art and documented CSS fallback retained; no native beam claimed',
      originalAmountButtons: amountButtons.length,
      sameOriginalAmountCallbacks: true,
      rev6: {selectorSummariesMovedToConstruction:summaries.length,sameLiveSummaryIds:true,sourceStyleControlsFactsVisibility:true,livesBesideLifePurchase:true,informationBelowStage:true,noLifeRuleOrRequestChanged:true},
      originalButtonCount: buttons.length,
      allOriginalButtonsConnected: buttons.every(node => node.isConnected && root.contains(node)),
      sameIdNodes: Array.from(identities).every(([id, node]) => document.getElementById(id) === node),
      retainedIds: Array.from(identities.keys()),
      disclosures: ['Gate information', 'Probabilities'],
      resultsRemainLive: root.querySelector('#resultPanel')?.isConnected === true,
      endpointsOrHandlersReplaced: false
    };
  }

  function finishQuestSection(panel) {
    const section = panel.querySelector('.quest-section');
    const list = section?.querySelector('.quest-basic-list, .quest-card-grid--contracts');
    if (!section || !list) return null;
    const cards = Array.from(list.children).filter(node => node.matches('.basic-quest-card, .quest-card'));
    if (!cards.length) return { section: panel.dataset.questSection, cards: 0, unchanged: true };
    const console = document.createElement('div');
    console.className = 'hist-q-console';
    const nav = document.createElement('div');
    nav.className = 'hist-q-list';
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', 'Mission selection');
    const detail = document.createElement('div');
    detail.className = 'hist-q-detail';
    const heading = document.createElement('h3');
    heading.className = 'hist-q-detail-heading';
    detail.appendChild(heading);
    section.insertBefore(console, list);
    console.appendChild(nav);
    console.appendChild(detail);
    nav.appendChild(list);
    const pairs = [];

    cards.forEach((card, index) => {
      const content = card.querySelector('.basic-quest-card__content, .quest-card__body');
      const header = card.querySelector('.basic-quest-card__header, .quest-card__header');
      if (!content || !header) return;
      let button = card.querySelector('[data-quest-toggle]');
      const nativeToggle = Boolean(button);
      if (!button) {
        const label = header.querySelector(':scope > div');
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'hist-q-contract-choice';
        button.dataset.histQuestChoice = '1';
        if (label) {
          header.insertBefore(button, label);
          button.appendChild(label);
        } else {
          button.textContent = card.querySelector('h4')?.textContent || 'Contract';
          header.prepend(button);
        }
      }
      if (!content.id) content.id = 'hist-quest-detail-' + panel.dataset.questSection + '-' + index;
      button.setAttribute('aria-controls', content.id);
      button.setAttribute('aria-expanded', 'false');
      const title = card.querySelector('.quest-card-title, h4')?.textContent || 'Mission';
      const category = card.querySelector('.basic-quest-card__category');
      if (category) content.prepend(category); // Keep the original category visible in the selected detail.
      detail.appendChild(content); // Same content/form nodes; original toggle uses its global content ID.
      content.classList.add('hist-q-content');
      pairs.push({ card, content, button, title, nativeToggle });
    });

    function select(pair) {
      pairs.forEach(current => {
        const active = current === pair;
        current.card.classList.toggle('hist-q-selected', active);
        current.card.classList.toggle('is-open', active);
        current.content.hidden = !active;
        current.button.setAttribute('aria-expanded', String(active));
      });
      heading.textContent = pair.title;
    }

    // Native quest listeners run on their original button first. This listener
    // changes only which detail is visible; it never submits a business form.
    nav.addEventListener('click', event => {
      const button = event.target.closest('[data-quest-toggle], [data-hist-quest-choice]');
      const pair = pairs.find(current => current.button === button);
      if (pair) select(pair);
    });
    nav.addEventListener('keydown', event => {
      const index = pairs.findIndex(pair => pair.button === event.target);
      if (index < 0 || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = event.key === 'Home' ? 0 : event.key === 'End' ? pairs.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1);
      next = Math.max(0, Math.min(pairs.length - 1, next));
      select(pairs[next]);
      pairs[next].button.focus();
    });
    const initial = pairs.find(pair => pair.card.classList.contains('is-ready')) || pairs.find(pair => pair.card.classList.contains('is-open')) || pairs.find(pair => !pair.card.classList.contains('is-completed')) || pairs[0];
    if (initial) select(initial);
    return { section: panel.dataset.questSection, cards: pairs.length, nativeToggles: pairs.filter(pair => pair.nativeToggle).length, allNativeContentIdsResolve: pairs.every(pair => document.getElementById(pair.content.id) === pair.content), originalToggleAncestorPreserved: pairs.every(pair => !pair.nativeToggle || pair.button.closest('[data-quest-card]') === pair.card) };
  }

  function finishQuests(root) {
    if (!root || root.dataset.historicalActivities === 'rev5') return;
    const forms = Array.from(root.querySelectorAll('form'));
    const formControls = forms.map(form => ({ form, controls: Array.from(form.elements) }));
    const nativeButtons = Array.from(root.querySelectorAll('[data-quest-toggle]'));
    const panels = Array.from(root.querySelectorAll('[data-quest-section]'));
    const sections = panels.map(finishQuestSection).filter(Boolean);
    const hub=root.closest('.user-hub');
    if(hub)hub.classList.add('rev5-pilot-hub','rev6-quest-hub');
    root.querySelectorAll('[data-quest-section="contracts"] .hist-q-content').forEach(content=>{
      const progress=content.querySelector('.quest-progress'),rewards=content.querySelector('.quest-rewards');
      if(progress&&rewards&&progress.parentNode===rewards.parentNode)rewards.before(progress);
    });
    const weeklyIntro = root.querySelector('.quest-section__intro--weekly');
    const weeklyText = weeklyIntro?.querySelector('p');
    if (weeklyIntro && weeklyText) disclosure(weeklyIntro, 'Mission reset', [weeklyText]);
    const familyNav = root.querySelector('.quest-tabs');
    const familyLinks = Array.from(familyNav.querySelectorAll('[data-quest-tab]'));
    const familyPicker = document.createElement('details');
    familyPicker.className = 'hist-q-family-picker';
    const summary = document.createElement('summary');
    familyPicker.appendChild(summary);
    familyNav.before(familyPicker);
    familyPicker.appendChild(familyNav);
    const syncFamily = () => { summary.textContent = familyLinks.find(link => link.classList.contains('is-active'))?.textContent || 'Missions'; };
    syncFamily();
    familyNav.addEventListener('click', event => {
      if (!event.target.closest('[data-quest-tab]')) return;
      syncFamily();
      familyPicker.open = false;
      summary.focus();
    });
    document.addEventListener('pointerdown', event => { if (!familyPicker.contains(event.target)) familyPicker.open = false; }, true);
    familyPicker.addEventListener('keydown', event => { if (event.key === 'Escape') { familyPicker.open = false; summary.focus(); } });
    const familyObserver = new MutationObserver(syncFamily);
    familyLinks.forEach(link => familyObserver.observe(link, { attributes: true, attributeFilter: ['class'] }));
    root.querySelectorAll('.basic-quest-card, .quest-card').forEach(card => {
      const state = card.querySelector('.quest-status--completed') ? 'completed' : card.querySelector('.quest-status--progress, .quest-status--ready') ? 'running' : 'upcoming';
      card.dataset.histQuestState = state;
      const contentId = card.querySelector('[aria-controls]')?.getAttribute('aria-controls');
      const content = contentId ? document.getElementById(contentId) : null;
      if (content) content.dataset.histQuestState = state;
    });
    root.classList.add('hist-q-ready');
    root.dataset.historicalActivities = 'rev5';
    report.quests = {
      layout: 'Five original families; compact mission list and original detail forms',
      historicalClaim: 'QuestTree / QuestManager AS and native state icons recovered from main.swf / questSystem.swf; complete web internalQuests template absent. Five-family catalogue and selector remain an explicit Andromeda adaptation.',
      sections,
      originalFormCount: forms.length,
      sameOriginalFormsConnected: forms.every(form => form.isConnected && root.contains(form)),
      sameOriginalFormControls: formControls.every(({ form, controls }) => controls.length === form.elements.length && controls.every((node, index) => form.elements[index] === node)),
      originalToggleCount: nativeButtons.length,
      originalTogglesConnected: nativeButtons.every(button => button.isConnected && root.contains(button)),
      familyRoutesRetained: Array.from(root.querySelectorAll('[data-quest-tab]')).map(tab => tab.getAttribute('href')),
      endpointsOrBusinessListenersReplaced: false
    };
  }

  function suppressRoutineLine(node, routine) {
    if (!node) return;
    const update = () => node.classList.toggle('hist-routine-status', routine.includes(node.textContent.trim()));
    update();
    new MutationObserver(update).observe(node, { childList: true, subtree: true, characterData: true });
  }

  function finishSkylab(root) {
    if (!root) return;
    root.classList.add('hist-skylab-ready');
    const intro = root.querySelector('.skylab-subtitle');
    if (intro?.textContent.trim() === 'Click a module to manage upgrades, activation and transports.') intro.classList.add('hist-routine-status');
    suppressRoutineLine(root.querySelector('#skylab-status-line'), ['Skylab is online.', 'Skylab state refreshed.']);
    const infoTab = root.querySelector('[data-skylab-tab="overview"]');
    if (infoTab) infoTab.textContent = 'Info';
    // Overview -> Upgrade duplicates the existing Upgrade tab exactly; retain
    // its original callback/node offscreen, with the native tab as sole path.
    root.querySelector('#skylab-upgrade-action')?.classList.add('hist-equivalent-control');
    report.skylab = {
      moduleButtons: root.querySelectorAll('[data-skylab-module]').length,
      modulePopupTabs: ['Info', 'Upgrade'],
      retainedControls: Array.from(root.querySelectorAll('button[id], input[id]')).map(node => node.id),
      removedPresentationOnly: ['healthy instructional subtitle', 'routine online/refreshed status', 'duplicate Overview Upgrade button (same Upgrade tab retained)'],
      meaningfulMessagesRemainVisible: true,
      sourceContract: 'internalSkylab_Body module_small + module_large Info/Upgrade and closeAllModules; PK popup capture. Andromeda normal upgrade/transport rules unchanged.',
      popupArtworkLimit: 'Full native Skylab module_large image set absent; existing documented DoPs popup-frame fallback retained.'
    };
  }

  function finishFactory(root) {
    if (!root) return;
    root.classList.add('hist-factory-ready');
    suppressRoutineLine(root.querySelector('#tf-status'), ['Tech Factory ready. Select a tech to start production.']);
    const resources = root.querySelector('#tf-resources');
    const scene = root.querySelector('.tf-scene');
    if (resources && scene) scene.appendChild(resources);
    const table = root.querySelector('.tf-table-wrap');
    if (table) { table.hidden = true; table.setAttribute('aria-hidden', 'true'); }
    root.querySelector('.tf-note')?.classList.add('hist-routine-status');
    report.factory = {
      historicalStructure: 'DoPs internalNanoTechFactory_Body: five technology choices in left catalogue, selected detail centre, three production halls right; PK native 804x434 scene.',
      removedDuplicate: 'TECH CATALOGUE table only. Same #tf-recipes remains connected for original renderer; name/stock in catalogue, costs/time/owned in selected detail.',
      retainedControls: ['data-tech 1..5', 'tf-hall-select', 'tf-build', 'data-hall', 'data-unlock', 'tf-resources', 'tf-halls'],
      retainedOriginalRenderer: true,
      excludedForeignFeatures: ['Apis/Zeus construction', 'instant Uridium production'],
      timersOrRequestsAdded: 0
    };
  }

  function boot() {
    finishGates(document.querySelector('.gg-page'));
    finishQuests(document.querySelector('[data-quest-root]'));
    finishSkylab(document.querySelector('.skylab-page'));
    finishFactory(document.querySelector('#tech-factory'));
    window.AndromedaHistoricalActivities = report;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

/* REV9: authorized PRIVATE GG library art, not a distributable media grant.
   The original Andromeda actions/data are retained. No SWF/AS is executed. */
(function () {
  'use strict';
  function nativeGates() {
    const root=document.querySelector('.gg-page.hist-gg-ready');
    if(!root||root.classList.contains('rev9-gates'))return;
    const originals=Array.from(root.querySelectorAll('[id]')).map(node=>({id:node.id,node}));
    const left=root.querySelector('#leftZone');
    const stage=root.querySelector('#gateArtStage');
    if(!left||!stage)return;
    const effect=document.createElement('img');effect.className='rev9-native-gate-effect';effect.alt='';effect.draggable=false;effect.setAttribute('aria-hidden','true');
    stage.appendChild(effect);
    function syncGate(){
      const gate=Number(left.dataset.gate||1);
      if(![1,2,3,4].includes(gate))return;
      const source='/assets/historical/rev9-gg/effect-'+gate+'.webp';
      if(effect.getAttribute('src')!==source)effect.src=source;
    }
    syncGate();new MutationObserver(syncGate).observe(left,{attributes:true,attributeFilter:['data-gate']});
    const select=root.querySelector('#hist-gate-energy-amount');
    const amount=root.querySelector('.amount-selector');
    let picker=null;
    if(select&&amount){
      picker=document.createElement('details');picker.className='rev9-energy-picker';
      const summary=document.createElement('summary');summary.setAttribute('aria-label','Materialization energy amount');
      const list=document.createElement('div');list.className='rev9-energy-list';list.setAttribute('role','group');list.setAttribute('aria-label','Energy choices');
      picker.append(summary,list);
      const buttons=Array.from(select.options).map(option=>{
        const button=document.createElement('button');button.type='button';button.textContent=option.textContent;button.dataset.amount=option.value;
        button.addEventListener('click',()=>{
          if(select.disabled)return;
          select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));picker.open=false;syncAmount();summary.focus();
        });list.appendChild(button);return button;
      });
      function syncAmount(){
        summary.textContent=select.selectedOptions[0]?.textContent||'';
        summary.setAttribute('aria-disabled',String(select.disabled));
        buttons.forEach(button=>{button.disabled=select.disabled;button.setAttribute('aria-pressed',String(button.dataset.amount===select.value));});
        if(select.disabled)picker.open=false;
      }
      select.hidden=true;select.setAttribute('aria-hidden','true');select.tabIndex=-1;amount.appendChild(picker);
      select.addEventListener('change',syncAmount);
      new MutationObserver(syncAmount).observe(select,{attributes:true,attributeFilter:['disabled']});
      root.querySelectorAll('.amt-btn').forEach(button=>new MutationObserver(syncAmount).observe(button,{attributes:true,attributeFilter:['class','disabled']}));
      summary.addEventListener('click',event=>{if(select.disabled)event.preventDefault();});
      picker.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();picker.open=false;summary.focus();}
        else if((event.key==='ArrowDown'||event.key==='ArrowUp')&&!select.disabled){
          event.preventDefault();picker.open=true;const current=buttons.indexOf(document.activeElement);const next=current<0?(event.key==='ArrowDown'?0:buttons.length-1):(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();
        }
      });
      document.addEventListener('pointerdown',event=>{if(!picker.contains(event.target))picker.open=false;},true);
      syncAmount();
    }
    const materialize=root.querySelector('#btnSpin');
    const totalCost=root.querySelector('#uiTotalCost');
    function syncMaterializeLabel(){
      if(!materialize||!totalCost||/MATERIALIZING/i.test(materialize.textContent))return;
      const cost=totalCost.textContent.trim();
      const label='Materialize ('+cost+')';
      if(materialize.textContent!==label)materialize.textContent=label;
      materialize.title=label;materialize.setAttribute('aria-label',label);
    }
    if(materialize&&totalCost){
      const observer=new MutationObserver(syncMaterializeLabel);
      observer.observe(totalCost,{childList:true,characterData:true,subtree:true});
      observer.observe(materialize,{childList:true,characterData:true,subtree:true});
      syncMaterializeLabel();
    }
    const life=root.querySelector('#btnBuyLife');
    function syncLifeLabel(){
      if(!life)return;
      const text=life.textContent;
      const wrapped=text.replace(/\s*\(/,'\n(');
      if(text!==wrapped)life.textContent=wrapped;
      life.title=life.textContent.replace(/\s+/g,' ').trim();
    }
    if(life){new MutationObserver(syncLifeLabel).observe(life,{childList:true,characterData:true,subtree:true});syncLifeLabel();}
    const log=root.querySelector('#resultPanel');
    function syncLogLabels(){
      log?.querySelectorAll('.result-card').forEach(card=>{card.title=Array.from(card.querySelectorAll('.result-name,.result-desc,.result-qty')).map(node=>node.textContent.trim()).filter(Boolean).join(' - ');});
    }
    if(log){new MutationObserver(syncLogLabels).observe(log,{childList:true,subtree:true});syncLogLabels();}
    root.classList.add('rev9-gates');
    window.AndromedaHistoricalRev9Gates={
      scope:'PRIVATE_USER_AUTHORIZED_PROTOTYPE_ONLY',requestsAdded:0,timersAdded:0,
      source:'Pinned DoPs gatebuilder AS; recovered common21/gates10 media only, no CMS app substituted',
      graphics:'Native 786x395 main_bg; native selector/stats/machine/multiplier/button bitmaps; gate effect VP6Alpha21frames statically converted to lossless animated WebP236x290. Existing34/48/82/128 piece layers retained.',
      activeNativeEffect:effect,amountPicker:picker,
      allOriginalIdNodesRetained:originals.every(({id,node})=>node.isConnected&&document.getElementById(id)===node),
      sameOriginalAmountHandler:true,materializeCostSource:'Original live #uiTotalCost text, no duplicated price calculation; pending MATERIALIZING label retained.',lifeLabel:'Same original price/text and callback, native two-line wrapping only.',gateBody:'Existing Andromeda static pieces at native235x290; no generated DoPs full-image endpoint or exact byte identity claimed.',
      limits:['Original historical common cachekey differs.','24fps source export is not a verified Flash runtime playback comparison.','No materialization success beam is played before backend confirmation.','Rights for public redistribution are not established.']
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',nativeGates,{once:true});else nativeGates();
})();

/* REV7. Same business nodes; no request, timer, economics or quest rule. */
(function () {
  'use strict';
  function finishRev7() {
    if(!document.body.classList.contains('historical-site'))return;
    const facts={revision:8,requestsAdded:0,timersAdded:0};
    const gates=document.querySelector('.gg-page.hist-gg-ready');
    if(gates&&!gates.classList.contains('rev7-gates')){
      const identities=Array.from(gates.querySelectorAll('[id]')).map(node=>({node,id:node.id}));
      const left=gates.querySelector('#leftZone');
      const nodes=[gates.querySelector('.progress-text'),gates.querySelector('.progress-bar-bg'),gates.querySelector('#uiGateMsg'),gates.querySelector('#btnPrepare')];
      if(left)nodes.filter(Boolean).forEach(node=>left.appendChild(node));
      // REV8 owner decision: only the source ActionScript layout is active.
      // Old comparison URLs retain their route without overriding this choice.
      gates.dataset.rev7GateLayout='source';
      gates.classList.add('rev7-gates','rev8-gates');
      facts.gates={layout:'source',allIdNodesRetained:identities.every(item=>item.node.isConnected&&document.getElementById(item.id)===item.node),materializeAnchor:'Machine524/119 plus37/9 =561/128; current bitmap remains an explicitly documented fallback',prepareAnchor:'Gate180/0 plus220/328; current generic popup slices are an explicit fallback',group:'ABG grouped; Delta separate by Model.MODE_GATES. No new pool, action or cost.',variants:'REV8 selects the source layout exclusively. Prior top/progress query options no longer change its presentation. Same original count, status, lives and actions.'};
    }
    const quests=document.querySelector('.quest-page.hist-q-ready');
    if(quests&&!quests.classList.contains('rev7-quests')){
      const forms=Array.from(quests.querySelectorAll('form')).map(node=>({node,elements:Array.from(node.elements)}));
      const originalControls=Array.from(quests.querySelectorAll('input,select,textarea,button')).map(node=>({node,form:node.form}));
      let index=0;
      quests.querySelectorAll('.hist-q-content').forEach(content=>{
        const description=content.querySelector('.quest-description');
        const tasks=Array.from(content.querySelectorAll('.basic-objectives,.quest-progress')).filter(node=>!node.parentElement.closest('.basic-objectives'));
        if(!description||!tasks.length)return;
        const descriptionRegion=document.createElement('section');descriptionRegion.className='rev7-q-description';descriptionRegion.id='rev7-q-description-'+index;
        const taskRegion=document.createElement('section');taskRegion.className='rev7-q-tasks';taskRegion.id='rev7-q-tasks-'+index;
        const toggle=document.createElement('button');toggle.type='button';toggle.className='rev7-q-view-toggle';toggle.setAttribute('aria-controls',descriptionRegion.id+' '+taskRegion.id);
        descriptionRegion.appendChild(description);tasks.forEach(node=>taskRegion.appendChild(node));
        let showTasks=true;
        function render(){descriptionRegion.hidden=showTasks;taskRegion.hidden=!showTasks;toggle.textContent=showTasks?'Show description':'Show objectives';toggle.setAttribute('aria-pressed',String(showTasks));}
        toggle.addEventListener('click',()=>{showTasks=!showTasks;render();});
        content.prepend(toggle,descriptionRegion,taskRegion);render();index++;
      });
      quests.classList.add('rev7-quests');
      facts.quests={descriptionTaskSwitches:index,source:'DoPs htdocs/js/function.js748–790; same description/task regions, immediate toggle. Missing web bitmaps use text fallback.',sameOriginalForms:forms.every(item=>item.node.isConnected&&item.elements.length===item.node.elements.length&&item.elements.every(node=>Array.from(item.node.elements).includes(node))),sameControlOwners:originalControls.every(item=>item.node.isConnected&&item.node.form===item.form),families:Array.from(quests.querySelectorAll('[data-quest-section]')).map(node=>node.dataset.questSection),noRewardOrProgressMutation:true};
    }
    window.AndromedaHistoricalRev7Activities=facts;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finishRev7,{once:true});else finishRev7();
})();
