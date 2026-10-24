/* Private REV4. Native DoPs form alignment/frame; existing Andromeda account handlers.
   No foreign e-mail confirmation flow, requests, prices or account rules are imported. */
(function () {
  'use strict';
  function start() {
    if (!document.body.classList.contains('historical-site')) return;
    const params = new URLSearchParams(location.search);
    const page = params.get('page');
    function nativeWindow(host, title) {
      const panel = document.createElement('section');
      panel.className = 'rev4-native-window';
      const heading = document.createElement('h1');
      heading.className = 'rev4-native-window-title'; heading.textContent = title;
      const content = document.createElement('div'); content.className = 'rev4-native-window-content';
      panel.append(heading, content); host.appendChild(panel); return content;
    }
    if (page === 'settings') {
      const host = document.querySelector('.settings-wrapper');
      if (!host || host.classList.contains('rev4-account-organized')) return;
      const profile = host.querySelector('.profile-full .profile-stats');
      const cards = Array.from(host.querySelectorAll('.settings-grid > .set-card'));
      if (cards.length !== 3 || cards.some(card => !card.querySelector('form'))) return;
      const content = nativeWindow(host, 'Account');
      const layout = document.createElement('div'); layout.className = 'rev4-account-layout';
      const details = document.createElement('aside'); details.className = 'rev4-account-details';
      const forms = document.createElement('div'); forms.className = 'rev4-account-forms';
      if (profile) details.appendChild(profile);
      const label = document.createElement('label'); label.className = 'rev4-account-choice';
      label.htmlFor = 'rev4-account-section'; label.textContent = 'Change';
      const select = document.createElement('select'); select.id = 'rev4-account-section';
      select.setAttribute('aria-label', 'Account change');
      cards.forEach((card, index) => {
        const option = document.createElement('option'); option.value = String(index);
        option.textContent = card.querySelector('.set-title')?.textContent.trim() || card.querySelector('form').id;
        select.appendChild(option);
        const form = card.querySelector('form');
        for (const input of form.querySelectorAll('input:not([type="submit"]):not([type="hidden"])')) {
          const row = document.createElement('label'); row.className = 'rev4-account-field';
          const caption = document.createElement('span'); caption.textContent = input.placeholder || input.name;
          input.parentNode.insertBefore(row, input); row.append(caption, input);
        }
        card.hidden = index !== 0;
      });
      forms.append(label, select, ...cards); layout.append(details, forms); content.appendChild(layout);
      select.addEventListener('change', () => {
        cards.forEach((card, index) => { card.hidden = String(index) !== select.value; });
      });
      const oldProfile = host.querySelector('.profile-full');
      if (oldProfile) oldProfile.hidden = true;
      const oldGrid = host.querySelector('.settings-grid');
      if (oldGrid) oldGrid.hidden = true;
      host.classList.add('rev4-account-organized');
    }
    if (page === 'contact') {
      const host = document.querySelector('.CMSContent');
      const contact = host?.querySelector('a.contact-item[href^="mailto:"]');
      if (!host || !contact || host.classList.contains('rev4-contact-organized')) return;
      const old = host.querySelector('.contact-wrapper');
      const content = nativeWindow(host, 'Contact');
      const title = contact.querySelector('.contact-label'); if (title) title.textContent = 'Support';
      contact.querySelector('.icon-box')?.remove();
      content.appendChild(contact);
      if (old) old.hidden = true;
      host.classList.add('rev4-contact-organized');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();

/* REV5 social composition. Source: internalClan.css and PilotSheet templates.
   Every business control below is an existing Andromeda node. No request,
   inventory, permission, price, confirmation or automatic Save is introduced. */
(function () {
  'use strict';
  function organize() {
    if (!document.body.classList.contains('historical-site')) return;
    const query = new URLSearchParams(location.search), page = query.get('page'), tab = query.get('tab');
    document.getElementById('top100Modal')?.classList.add('rev5-hof');
    const relevant = ['clan', 'settings', 'contact', 'company', 'rules'].includes(page) || (page === 'user' && ['infos', 'upgrades', 'titles'].includes(tab));
    if (!relevant || document.body.classList.contains('rev5-social')) return;
    if (page === 'user' && tab === 'infos' && !document.body.classList.contains('hist-profile-page')) return;
    document.body.classList.add('rev5-social');
    const originalForms = Array.from(document.forms);
    const originalControls = Array.from(document.querySelectorAll('input,select,textarea,button,fieldset')).map(node => ({node, owner: node.form}));
    const ownership = originalForms.map(form => ({form, elements: Array.from(form.elements)}));
    const facts = {revision: 5, page, tab, businessRequestsAdded: false, moved: [], dialogs: []};
    window.AndromedaHistoricalSocial = facts;
    let uid = 0, activeDialog = null;
    function el(tag, className, text) {const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node;}
    function button(text, callback) {const node = el('button', 'rev5-social-button', text); node.type = 'button'; node.addEventListener('click', callback); return node;}
    function mount(parent, ...nodes) {nodes.filter(Boolean).forEach(node => parent.appendChild(node)); return parent;}
    function region(parent, className, ...nodes) {return mount(parent.appendChild(el('section', className)), ...nodes);}
    function dialog(title, nodes) {
      const overlay = el('div', 'rev5-social-overlay'); overlay.hidden = true;
      const panel = el('section', 'rev4-native-window rev5-social-dialog'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
      const heading = el('h2', 'rev4-native-window-title', title); heading.id = 'rev5-social-dialog-' + (++uid); panel.setAttribute('aria-labelledby', heading.id);
      const content = el('div', 'rev4-native-window-content'); mount(content, ...nodes);
      const close = button('Close', () => hide()); close.classList.add('rev5-social-close');
      mount(panel, heading, close, content); overlay.appendChild(panel); document.body.appendChild(overlay);
      let opener = null;
      function hide() {overlay.hidden = true; if (activeDialog === overlay) activeDialog = null; if (opener?.isConnected) opener.focus();}
      overlay.addEventListener('pointerdown', event => {if (event.target === overlay) hide();});
      overlay.addEventListener('keydown', event => {
        if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); hide();}
        if (event.key === 'Tab') {
          const focusables = Array.from(panel.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')).filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
          const first = focusables[0], last = focusables[focusables.length - 1];
          if (event.shiftKey && document.activeElement === first && last) {event.preventDefault(); last.focus();}
          else if (!event.shiftKey && document.activeElement === last && first) {event.preventDefault(); first.focus();}
        }
      });
      facts.dialogs.push(title);
      return event => {
        if (activeDialog) activeDialog.hidden = true;
        opener = event.currentTarget; overlay.hidden = false; activeDialog = overlay;
        (content.querySelector('textarea:not(:disabled),input:not([type=hidden]):not(:disabled),select:not(:disabled),button:not(:disabled)') || close).focus();
      };
    }
    function formByName(host, name) {return host.querySelector('[name="' + name + '"]')?.closest('form');}
    function footerAction(footer, text, nodes, className) {const list = nodes.filter(Boolean); if (list.length) {const action = button(text, dialog(text, list)); if (className) action.classList.add(className); footer.appendChild(action);}}

    if (page === 'clan') {
      const host = document.querySelector('.CMSContent.hist-clan-organized'), old = host?.querySelector('.hist-clan-scene');
      if (host && old) {
        const actualTab = (old.className.match(/hist-clan-(claninfos|clanmembers|clanroles|diplomacy|treasury|clanlog|joinclan|createclan)/) || [])[1] || tab;
        const titles = {claninfos: 'Clan information', clanmembers: 'Members', clanroles: 'Roles & permissions', diplomacy: 'Diplomacy', treasury: 'Treasury', clanlog: 'Clan log', joinclan: 'Join clan', createclan: 'Found clan'};
        const consoleEl = el('section', 'rev5-clan-console rev5-clan-' + actualTab);
        consoleEl.setAttribute('aria-label', titles[actualTab] || 'Clan');
        consoleEl.appendChild(el('h1', 'rev5-clan-heading', titles[actualTab] || 'Clan'));
        const footer = el('div', 'rev5-clan-footer'); consoleEl.appendChild(footer);
        if (actualTab === 'claninfos') {
          const summary = old.querySelector('.hist-clan-summary'), emblem = old.querySelector('.hist-clan-emblem');
          region(consoleEl, 'rev5-clan-summary', ...Array.from(summary?.childNodes || []));
          const companyPane = region(consoleEl, 'rev5-clan-emblem', ...Array.from(emblem?.childNodes || []));
          const companyImage = companyPane.querySelector('img');
          const companyId = (companyImage?.getAttribute('src')?.match(/(?:^|\/)ranks\/company\/([123])\.png(?:\?|$)/) || [])[1];
          if (companyImage && companyId) {
            companyImage.src = 'assets/historical/dops/global/companyChoose/logo_' + companyId + '_active.gif';
            companyImage.width = 100; companyImage.height = 100;
            companyImage.alt = {1: 'MMO', 2: 'EIC', 3: 'VRU'}[companyId];
            companyImage.classList.add('rev5-company-logo'); companyPane.classList.add('has-company-logo');
          }
          const description = old.querySelector('.hist-clan-description .clan-row');
          const descriptionForm = description?.querySelector('form');
          const preview = el('div', 'rev5-clan-description'); preview.appendChild(el('h2', '', 'Description'));
          if (descriptionForm) {
            preview.appendChild(el('p', '', descriptionForm.querySelector('textarea')?.value || ''));
            footerAction(footer, descriptionForm.querySelector('[name="clan-edit-form-submit"]') ? 'Edit description' : 'View description', [description]);
          } else if (description) mount(preview, description);
          consoleEl.appendChild(preview);
          const news = old.querySelector('.hist-clan-news .clan-messages-box');
          const newsPane = region(consoleEl, 'rev5-clan-news', el('h2', '', 'Clan messages'), news);
          newsPane.setAttribute('aria-label', 'Clan messages');
          footerAction(footer, 'New message', [formByName(host, 'clan-newmessage-submit')]);
          const administration = host.querySelector('[name="clan-delete-form-submit"],[name="clan-transfer-lead-submit"],[name="clan-leave-form-submit"]')?.closest('.clan-card');
          footerAction(footer, 'Administration', [administration]);
        } else if (actualTab === 'clanmembers') {
          const members = host.querySelector('#clan-members');
          if (members) {
            for (const row of Array.from(members.children)) {
              const kick = row.querySelector('.stat-right > .leftbutton');
              if (kick) {row.appendChild(kick); row.classList.add('rev10-clan-member-with-action');}
            }
          }
          const memberList = region(consoleEl, 'rev5-clan-members', members);
          memberList.tabIndex = 0; memberList.setAttribute('aria-label', 'Clan members');
          const requests = host.querySelector('#clan-members-requests');
          if (requests) {consoleEl.appendChild(el('h2', 'rev10-clan-candidates-heading', 'Membership requests')); region(consoleEl, 'rev5-clan-candidates', requests);}
        } else if (actualTab === 'clanroles') {
          const table = host.querySelector('.roles-table');
          const editor = region(consoleEl, 'rev5-clan-role-editor'); const list = region(consoleEl, 'rev5-clan-role-list');
          list.tabIndex = 0; list.setAttribute('aria-label', 'Select clan member');
          const details = [];
          const labels = {can_set_tax_rate: 'Set tax rate', can_toggle_tax_active: 'Enable daily tax', can_spend: 'Transfer credits', can_start_alliance: 'Propose alliance', can_cancel_alliance: 'Cancel alliance', can_declare_war: 'Declare war', can_request_war_cancel: 'Request peace'};
          for (const row of Array.from(table?.querySelectorAll('tbody > tr') || [])) {
            const form = row.querySelector('form'), perms = row.querySelector('fieldset'), save = row.querySelector('[name="save_role"]');
            if (!form) continue;
            const name = row.querySelector('.user-cell')?.textContent.trim() || 'Member';
            const pane = el('div', 'rev5-role-detail'); pane.appendChild(el('h2', '', name));
            const roleLabel = el('label', 'rev5-role-name', 'Role name'); const input = form.querySelector('[name="role_name"]');
            if (input) mount(roleLabel, input);
            mount(form, roleLabel, perms, save); pane.appendChild(form); editor.appendChild(pane);
            const fine = perms?.querySelector('.hidden-perms');
            if (fine) {
              const section = el('details', 'rev5-permission-details'); section.appendChild(el('summary', '', 'Individual permissions'));
              section.open = true;
              for (const field of Array.from(fine.querySelectorAll('input[name]'))) {const label = el('label', '', labels[field.name] || field.name); label.insertBefore(field, label.firstChild); fine.appendChild(label);}
              section.appendChild(fine); perms.appendChild(section);
            }
            const choice = button(name, () => {details.forEach(item => {item.pane.hidden = item.pane !== pane; item.choice.setAttribute('aria-selected', String(item.pane === pane));});});
            choice.classList.add('rev5-list-choice'); list.appendChild(choice); details.push({pane, choice}); pane.hidden = details.length > 1; choice.setAttribute('aria-selected', String(details.length === 1));
          }
          if (!details.length) {const note = old.querySelector('.user-hub__empty'); if (note) editor.appendChild(note);}
          facts.moved.push('Roles: original forms, fieldsets, macro inputs and Save; ownership checked after moving');
        } else if (actualTab === 'diplomacy') {
          const current = region(consoleEl, 'rev5-clan-relations');
          for (const [id, title] of [['clan-alliances', 'Alliances'], ['clan-wars', 'Wars']]) region(current, '', el('h2', '', title), host.querySelector('#' + id));
          region(consoleEl, 'rev5-clan-diplo-requests', el('h2', '', 'Requests'), host.querySelector('#clan-pending-alliance'));
          footerAction(footer, 'New action', [host.querySelector('#clan-new-diplomacy')]);
        } else if (actualTab === 'treasury') {
          region(consoleEl, 'rev5-clan-wallet', ...Array.from(old.querySelector('.hist-clan-balance')?.childNodes || []));
          const cashflow = region(consoleEl, 'rev5-clan-cashflow', ...Array.from(old.querySelector('.hist-clan-transfers')?.childNodes || []));
          const cashflowHeading = cashflow.querySelector('.clan-section-title');
          if (cashflowHeading) {cashflowHeading.classList.add('rev10-clan-cashflow-heading'); consoleEl.appendChild(cashflowHeading);}
          cashflow.tabIndex = 0; cashflow.setAttribute('aria-label', 'Recent transfers');
          const taxForm = formByName(host, 'treasury-tax-save') || host.querySelector('select[name="rate_percent"]')?.closest('form');
          const transferForm = formByName(host, 'treasury-transfer') || host.querySelector('select[name="to_user_id"]')?.closest('form');
          footerAction(footer, 'Tax settings', [taxForm?.closest('.clan-row')], 'rev10-clan-tax-settings');
          footerAction(footer, 'Transfer', [transferForm?.closest('.clan-row')], 'rev10-clan-transfer');
        } else if (actualTab === 'clanlog') {
          consoleEl.classList.add('rev5-clan-log');
          const logs = host.querySelector('#clan-logs'), detail = region(consoleEl, 'rev5-clan-log-detail');
          const entries = [];
          for (const entry of Array.from(logs?.querySelectorAll('.clan-message') || [])) {
            const body = entry.querySelector('.msg-body'); if (!body) continue;
            const date = entry.querySelector('.msg-time')?.textContent.trim() || '';
            const pane = el('section'); mount(pane, el('h2', '', date), body); detail.appendChild(pane);
            const choice = button(date + ' — ' + body.textContent.trim().slice(0, 70), () => {entries.forEach(item => {item.pane.hidden = item.pane !== pane; item.choice.setAttribute('aria-selected', String(item.pane === pane));});});
            choice.classList.add('rev5-list-choice'); entry.appendChild(choice); pane.hidden = entries.length > 0; choice.setAttribute('aria-selected', String(entries.length === 0)); entries.push({pane, choice});
          }
          const logList = region(consoleEl, 'rev5-clan-log-list', logs);
          logList.tabIndex = 0; logList.setAttribute('aria-label', 'Clan activity');
        } else {
          const content = old.querySelector('.clan-page,.box') || old.querySelector('.hist-clan-pane');
          if (content) region(consoleEl, 'rev5-clan-single-list', ...Array.from(content.childNodes));
        }
        const flashes = Array.from(host.querySelectorAll('.flash')).filter(node => !node.closest('.rev5-clan-console'));
        if (flashes.length) region(consoleEl, 'rev5-clan-feedback', ...flashes);
        old.hidden = true; const extras = host.querySelector('.hist-clan-extensions'); if (extras) extras.hidden = true;
        host.appendChild(consoleEl); host.classList.add('rev5-clan-organized');
        facts.moved.push('Clan original nodes into native console; extension forms are accessible in explicit dialogs');
      }
    }

    if (page === 'user') {
      const hub = document.querySelector('.user-hub');
      if (hub) hub.classList.add('rev5-pilot-hub');
      if (tab === 'infos') {
        const card = document.querySelector('.profile-card');
        if (card) {
          const layout = el('div', 'rev5-profile-layout');
          region(layout, 'rev5-profile-identity', card.querySelector('.pilot-header'), card.querySelector('.card-header'));
          region(layout, 'rev5-profile-statistics', el('h2', '', 'Player stats'), card.querySelector('.stats-list'));
          region(layout, 'rev5-profile-company', el('h2', '', 'Company'), card.querySelector('.hist-finish-profile-tools'));
          card.appendChild(layout); card.classList.add('rev5-profile');
        }
      } else if (tab === 'upgrades') {
        const shell = document.querySelector('.pilot-bio-shell'), card = shell?.querySelector('.pilot-bio-card');
        if (shell && card) {
          shell.classList.add('rev5-bio');
          const top = el('div', 'rev5-bio-header'); mount(top, shell.querySelector('.pilot-bio-title'), shell.querySelector('.pilot-bio-resources')); shell.insertBefore(top, shell.firstChild);
          const footer = el('div', 'rev5-bio-footer'); const actions = card.querySelector('.pilot-bio-actions');
          const exchange = actions?.querySelector('.pilot-bio-exchange');
          if (exchange) footer.appendChild(button('Research points', dialog('Research points', [exchange])));
          mount(footer, actions); shell.appendChild(footer);
          for (const node of shell.querySelectorAll('.pilot-bio-node')) {
            const tip = node.querySelector('.pilot-bio-node-tooltip'); if (!tip) continue;
            function place() {const r = node.getBoundingClientRect(); tip.classList.add('rev5-bio-tooltip'); tip.style.left = Math.max(8, Math.min(innerWidth - 300, r.right + 8)) + 'px'; tip.style.top = Math.max(8, Math.min(innerHeight - 340, r.top - 25)) + 'px';}
            node.addEventListener('pointerenter', place); node.addEventListener('focusin', place);
          }
          facts.moved.push('Bio: same resources, exchange form, node tree and action controls; no skill data changed');
        }
      } else if (tab === 'titles') {
        const panel = document.querySelector('.titles-panel');
        if (panel) {
          panel.classList.add('rev5-titles');
          const stage = el('div', 'rev5-title-stage'), list = el('div', 'rev5-title-list'), detail = el('div', 'rev5-title-details');
          const entries = [];
          const cards = Array.from(panel.querySelectorAll('.title-card'));
          for (const card of cards) {
            const entry = card.closest('.title-card-option') || card;
            const content = card.querySelector('.title-card__content'); if (!content) continue;
            const heading = content.querySelector('h3');
            const info = el('section', 'rev5-title-detail'); info.appendChild(el('h3', '', heading?.textContent || 'Title'));
            for (const node of Array.from(content.children)) if (node !== heading && !node.classList.contains('title-card__topline')) info.appendChild(node);
            detail.appendChild(info); info.hidden = true;
            const show = () => {entries.forEach(item => {item.info.hidden = item.info !== info; item.entry.classList.toggle('rev5-title-current-detail', item.info === info);});};
            entry.addEventListener('click', show); entry.addEventListener('focusin', show);
            if (!entry.querySelector('input[type=radio]')) {entry.tabIndex = 0; entry.setAttribute('role', 'button'); entry.addEventListener('keydown', event => {if (['Enter', ' '].includes(event.key)) {event.preventDefault(); show();}});}
            entries.push({entry, info});
          }
          const saveForm = panel.querySelector('#titles-save-form');
          const temporary = panel.querySelector('.titles-section');
          if (temporary && temporary.querySelector('.title-card--temporary')) list.appendChild(temporary);
          if (saveForm) list.appendChild(saveForm);
          mount(stage, list, detail); panel.appendChild(stage);
          const actions = panel.querySelector('.titles-action-bar'); if (actions) panel.appendChild(actions);
          const displayedTitle = panel.querySelector('.titles-summary-card strong')?.textContent.trim();
          const active = entries.find(item => item.entry.querySelector('input:checked')) || entries.find(item => item.entry.classList.contains('is-active')) || entries.find(item => item.entry.querySelector('h3')?.textContent.trim() === displayedTitle) || entries[0];
          if (active) {active.info.hidden = false; active.entry.classList.add('rev5-title-current-detail');}
          facts.moved.push('Titles: same permanent radio controls remain in their original form; detail text moves, temporary priority is untouched');
        }
      }
    }
    if (page === 'rules') {
      const host = document.querySelector('.CMSContent.rules-page'), old = host?.querySelector('.rules-container');
      if (host && old) {old.classList.add('rev5-rules-document'); host.classList.add('rev5-rules');}
    }
    if (page === 'company') {
      const grid = document.querySelector('.plans-grid');
      if (grid) {
        const plans = Array.from(grid.querySelectorAll(':scope > .plan-card')); const menu = el('div', 'rev5-company-plans');
        plans.forEach((plan, index) => {const choice = button(plan.querySelector('.plan-title')?.textContent.trim() || ('Plan ' + (index + 1)), () => {plans.forEach(p => {p.hidden = p !== plan;}); Array.from(menu.children).forEach(b => b.setAttribute('aria-selected', String(b === choice)));}); choice.classList.add('rev5-list-choice'); choice.setAttribute('aria-selected', String(index === 0)); menu.appendChild(choice); plan.hidden = index !== 0;});
        grid.insertBefore(menu, grid.firstChild); grid.classList.add('rev5-company');
      }
    }
    facts.originalFormsConnected = originalForms.every(form => form.isConnected);
    facts.originalControlOwnersPreserved = originalControls.every(item => item.node.isConnected && item.node.form === item.owner);
    facts.originalFormElementSetsPreserved = ownership.every(item => {const now = Array.from(item.form.elements); return item.elements.length === now.length && item.elements.every(node => now.includes(node));});
    facts.originalFormCounts = ownership.map(item => ({id: item.form.id, before: item.elements.length, after: item.form.elements.length}));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', organize, {once: true});
  else organize();
})();

/* REV6 scoped account finish. Source DoPs is primary; generic native windows
   complement missing Rules/Support templates. Andromeda forms/data remain the
   same nodes. No account request, skill/title rule, autosave or timer added. */
(function () {
  'use strict';
  function finish() {
    const body = document.body;
    if (!body.classList.contains('historical-site')) return;
    const q = new URLSearchParams(location.search), page = q.get('page'), tab = q.get('tab');
    const owned = ['settings', 'contact', 'rules'].includes(page) || (page === 'user' && ['infos', 'upgrades', 'titles'].includes(tab) && !body.classList.contains('hist-area-hangar'));
    if (!owned || body.classList.contains('rev6-account')) return;
    body.classList.add('rev6-account');
    const controls = Array.from(document.querySelectorAll('input,select,textarea,button,fieldset')).map(node => ({node, owner:node.form}));
    const originalForms = Array.from(document.forms).map(node => ({node, elements:Array.from(node.elements)}));
    const facts = {revision:6, page, tab, businessRequestsAdded:0, timersAdded:0, changes:[]};
    window.AndromedaHistoricalRev6Account = facts;
    if (page === 'rules') {
      const host = document.querySelector('.CMSContent.rules-page');
      const documentNode = host?.querySelector('.rules-container');
      const content = documentNode?.querySelector('.rules-content');
      if (host && documentNode && content) {
        body.classList.add('rev6-rules-page'); host.classList.add('rev6-rules');
        documentNode.classList.add('rev4-native-window');
        documentNode.querySelector(':scope > .title')?.classList.add('rev4-native-window-title');
        const index = document.createElement('nav'); index.className='rev6-rules-index'; index.setAttribute('aria-label','Rules categories');
        Array.from(content.querySelectorAll(':scope > .rules-section:not(.footer-section)')).forEach((section,i) => {
          const heading=section.querySelector('h3'); if(!heading)return;
          if(!section.id)section.id='rev6-rule-section-'+i;
          const link=document.createElement('a');link.href='#'+section.id;link.textContent=heading.textContent.trim();index.appendChild(link);
        });
        content.prepend(index);
        facts.changes.push('Rules: same full rule text, one native information frame, category anchors and document scrolling; inherited nested border-image fill removed.');
      }
    }
    if (page === 'settings') {
      body.classList.add('rev6-settings-page');
      const authoritativeId = document.querySelector('.app-header[data-pilot-id]')?.getAttribute('data-pilot-id')?.trim();
      const identityRow = Array.from(document.querySelectorAll('.rev4-account-details .p-stat-item')).find(row => row.querySelector('.p-label')?.textContent.trim().toLowerCase() === 'user id');
      const identityValue = identityRow?.querySelector('.p-val');
      if (identityValue && authoritativeId && /^[1-9]\d*$/.test(authoritativeId)) {
        // The source template adds100000 only to this display value. No separate
        // public-ID contract is present; use the same server-rendered game ID.
        identityValue.textContent = authoritativeId;
        facts.settingsIdentity = {source: '.app-header[data-pilot-id]', sameValueNode: true, applied: true};
      }
      facts.changes.push('Settings: compact original identity fields above the three-way native form selector; no new field, submit or credential entry.');
    }
    if (page === 'contact') {
      body.classList.add('rev6-contact-page');
      facts.changes.push('Contacts: same mailto and true support address in a compact native information window; global bitmap black reservation is not a content wrapper.');
    }
    if (page === 'user' && tab === 'infos' && body.classList.contains('hist-profile-page')) {
      const profile=document.querySelector('.rev5-profile');
      if(profile){
        body.classList.add('rev6-profile-page');profile.classList.add('rev6-profile');
        const layout=profile.querySelector('.rev5-profile-layout');
        if(layout){
          const identity=layout.querySelector('.pilot-header'), header=layout.querySelector('.card-header'), stats=layout.querySelector('.stats-list'), tools=layout.querySelector('.hist-finish-profile-tools');
          const sheet=document.createElement('section');sheet.className='rev6-profile-sheet';
          const top=document.createElement('header');top.className='rev6-profile-identity';
          if(identity)top.appendChild(identity);if(header)top.appendChild(header);sheet.appendChild(top);
          if(stats)sheet.appendChild(stats);
          if(tools){const footer=document.createElement('footer');footer.className='rev6-profile-links';footer.appendChild(tools);sheet.appendChild(footer);}
          layout.before(sheet);layout.hidden=true;
          facts.changes.push('Profile: original identity, rank, ID, every actual statistic and Company Change link moved into one compact flat stats sheet; no invented personal-info fields or empty third column.');
        }
      }
    }
    if (page === 'user' && tab === 'upgrades') {
      body.classList.add('rev6-bio-page');
      const tree=document.querySelector('.pilot-bio-tree');
      if(tree){tree.tabIndex=0;tree.setAttribute('aria-label','Pilot Bio skills; horizontal panning within the tree');}
      facts.changes.push('Bio: exact existing skill icons and callbacks retained; point counter anchored inside its74px slot, artificial counter background removed, two full rows visible. Horizontal local panning remains intentional; no artificial vertical clipping.');
    }
    if (page === 'user' && tab === 'titles') {
      body.classList.add('rev6-titles-page');
      facts.changes.push('Titles: flat compact rows, explicit native selection/locked states and original detail/form/action nodes; displayed title preferred for initial detail without changing radio selection or title ownership.');
    }
    facts.originalControlsConnected=controls.every(item=>item.node.isConnected);
    facts.originalControlOwnersPreserved=controls.every(item=>item.node.form===item.owner);
    facts.originalFormElementSetsPreserved=originalForms.every(item=>item.node.isConnected&&item.elements.length===item.node.elements.length&&item.elements.every(node=>Array.from(item.node.elements).includes(node)));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finish,{once:true});else finish();
})();

/* REV7: scoped presentation only. No form, submit, permission, confirmation,
   account setting, title rule, request or timer is added or replaced. */
(function () {
  'use strict';
  function finishRev7() {
    const body=document.body,q=new URLSearchParams(location.search),page=q.get('page'),tab=q.get('tab');
    if(!body.classList.contains('historical-site')||body.classList.contains('rev7-account'))return;
    if(!['clan','settings','contact'].includes(page)&&!(page==='user'&&['infos','titles'].includes(tab)&&body.classList.contains('hist-area-pilot')))return;
    const forms=Array.from(document.forms).map(node=>({node,elements:Array.from(node.elements)}));
    const owners=Array.from(document.querySelectorAll('input,select,textarea,button,fieldset')).map(node=>({node,form:node.form}));
    body.classList.add('rev7-account');
    const facts={revision:7,page,tab,requestsAdded:0,timersAdded:0,changes:[]};
    if(page==='clan'){
      // Style the same existing dialog and console nodes; preserve permission-
      // gated markup and the original POST/GET/confirm handlers verbatim.
      document.querySelectorAll('.rev5-clan-console,.rev5-social-dialog').forEach(region=>region.classList.add('rev7-clan-native'));
      facts.changes.push('Modern blue row boxes, treasury table header and green Save/Accept/Refuse styles replaced with compact native source language; all original actions and permission states retained.');
    }
    if(page==='settings'){
      body.classList.add('rev7-settings');
      // Variant only: the original main Contacts route remains available.
      // DoPs proves Support in Help/imprint, not a Settings sub-category.
      if(q.get('hist_support')==='settings'){
        const host=document.querySelector('.rev4-native-window-content');
        if(host){const line=document.createElement('div');line.className='rev7-support-alternative';const a=document.createElement('a');a.href='view.php?page=contact&hist_support=settings';a.textContent='Contact Support';line.appendChild(a);host.appendChild(line);}
        facts.supportVariant='OWNER REVIEW ONLY: ordinary link to the same existing Contacts route; main navigation unchanged.';
      }
      facts.changes.push('Three original forms remain selected by the same control; native compact fields and popup-button slices replace modern green submit styling.');
    }
    if(page==='contact'){
      body.classList.add('rev7-contact');
      if(q.get('hist_support')==='settings'){
        const host=document.querySelector('.rev4-native-window-content');
        if(host){const a=document.createElement('a');a.className='rev7-contact-return';a.href='view.php?page=settings&hist_support=settings';a.textContent='Back to Account';host.appendChild(a);}
      }
      facts.changes.push('Same true support mailto retained. Compact native generic window; no support form or definitive navigation move invented.');
    }
    if(page==='user'&&tab==='infos'&&body.classList.contains('hist-profile-page')){
      body.classList.add('rev7-profile');
      const header=document.querySelector('.app-header[data-pilot-id]'),sheet=document.querySelector('.rev6-profile-sheet');
      if(header&&sheet){
        const level=header.getAttribute('data-pilot-level');
        if(level&&/^\d+$/.test(level)){
          const line=document.createElement('div');line.className='rev7-profile-facts';
          const label=document.createElement('span');label.append('Level ');const value=document.createElement('b');value.textContent=level;label.appendChild(value);line.appendChild(label);
          const identity=sheet.querySelector('.rev6-profile-identity');if(identity)identity.after(line);else sheet.prepend(line);
        }
        const stats=sheet.querySelector('.stats-list');
        if(stats){
          // These are the original PHP-rendered rows moved offscreen by the
          // older shell, not cloned wallet IDs or a newly calculated balance.
          document.querySelectorAll('#hist-pilot-state>.stat-row').forEach(row=>{
            const label=row.querySelector('.stat-label')?.textContent.trim();
            if(['Credits','Uridium'].includes(label)){row.hidden=false;stats.appendChild(row);}
          });
        }
      }
      facts.changes.push('Real server-rendered level and the same original Credits/Uridium profile rows restored. Header wallet IDs untouched. Actual stats and Company Change retained; no avatar/personal/activity/ranking/station data fabricated.');
    }
    if(page==='user'&&tab==='titles'){
      body.classList.add('rev7-titles');
      facts.changes.push('Current displayed title, temporary/permanent list, detail and actions have separate non-overlapping boxes. Same radio controls, ownership priorities and disabled states.');
    }
    facts.formsConnected=forms.every(item=>item.node.isConnected);
    facts.formControlSetsUnchanged=forms.every(item=>item.elements.length===item.node.elements.length&&item.elements.every(node=>Array.from(item.node.elements).includes(node)));
    facts.originalControlOwnersUnchanged=owners.every(item=>item.node.isConnected&&item.node.form===item.form);
    window.AndromedaHistoricalRev7Account=facts;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finishRev7,{once:true});else finishRev7();
})();

/* REV8 primary contract: header Help -> native480px dialog -> Support;
 * Home User Info Change -> Account. Andromeda keeps its three real forms,
 * real Support route/mailto and security rules. No foreign confirmation flow,
 * request, timer, endpoint or account operation is introduced. */
(function(){
  'use strict';
  function finishRev8AccountHelp(){
    const body=document.body,trigger=document.getElementById('hist-rev8-help');
    if(!body.classList.contains('historical-site')||!trigger||document.getElementById('hist-rev8-help-layer'))return;
    const q=new URLSearchParams(location.search),nav=document.querySelector('.app-nav');
    const findRoute=page=>Array.from(nav?.querySelectorAll('.nav-item>.nav-link')||[]).find(link=>{try{return new URL(link.href).searchParams.get('page')===page;}catch(_){return false;}});
    const oldSupport=findRoute('contact'),supportItem=oldSupport?.closest('.nav-item');
    const accountLink=findRoute('settings'),accountItem=accountLink?.closest('.nav-item');
    const overlay=document.createElement('div');overlay.id='hist-rev8-help-layer';overlay.className='rev8-help-overlay';overlay.hidden=true;
    const dialog=document.createElement('section');dialog.className='rev8-help-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','hist-rev8-help-title');
    const head=document.createElement('header');head.className='rev8-help-head';
    const title=document.createElement('h2');title.id='hist-rev8-help-title';title.textContent='Help';
    const close=document.createElement('button');close.type='button';close.className='rev8-help-close';close.setAttribute('aria-label','Close Help');
    head.append(title,close);
    const content=document.createElement('div');content.className='rev8-help-content';
    const greeting=document.createElement('p');greeting.textContent='Greetings Space Pilot,';
    const info=document.createElement('p');info.textContent='For information about Andromeda, read the game rules. If you need assistance, contact Support.';
    const rules=document.createElement('a');rules.href=findRoute('rules')?.getAttribute('href')||'view.php?page=rules';rules.textContent='Game rules';
    const support=oldSupport||document.createElement('a');
    if(!oldSupport)support.href=trigger.getAttribute('href');
    support.id='hist-rev8-help-support';support.className='rev8-help-support';support.textContent='Support';support.target='_blank';support.rel='noopener noreferrer';
    const links=document.createElement('ul');
    for(const link of [rules,support]){const row=document.createElement('li');row.appendChild(link);links.appendChild(row);}
    content.append(greeting,info,links);
    const foot=document.createElement('footer');foot.className='rev8-help-footer';
    const ok=document.createElement('button');ok.type='button';ok.className='rev8-help-ok';ok.textContent='OK';foot.appendChild(ok);
    dialog.append(head,content,foot);overlay.appendChild(dialog);body.appendChild(overlay);
    let opener=null;
    const closeHelp=()=>{overlay.hidden=true;trigger.setAttribute('aria-expanded','false');if(opener?.isConnected)opener.focus();};
    trigger.setAttribute('aria-controls',overlay.id);
    trigger.addEventListener('click',event=>{event.preventDefault();opener=trigger;overlay.hidden=false;trigger.setAttribute('aria-expanded','true');close.focus();});
    close.addEventListener('click',closeHelp);ok.addEventListener('click',closeHelp);
    document.addEventListener('keydown',event=>{
      if(overlay.hidden)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeHelp();return;}
      if(event.key==='Tab'){
        const controls=Array.from(dialog.querySelectorAll('button,a[href]')).filter(node=>node.offsetParent!==null);
        const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    },true);
    // Remove only the obsolete menu wrappers after the real Support node is
    // connected to Help. Home/Change already targets the same Account route.
    if(support.isConnected&&support.getAttribute('href')){
      supportItem?.remove();accountItem?.remove();body.classList.add('rev8-help-ready');
    }
    document.querySelectorAll('.rev7-support-alternative,.rev7-contact-return').forEach(node=>node.remove());
    if(q.get('page')==='settings'){
      const host=document.querySelector('.rev4-native-window-content');
      if(host&&!host.querySelector('.rev8-account-back')){const back=document.createElement('a');back.className='rev8-account-back';back.href='view.php?page=home';back.textContent='Back';host.appendChild(back);}
    }
    if(q.get('page')==='contact'){
      const heading=document.querySelector('.rev4-native-window-title');if(heading)heading.textContent='Support';
    }
    body.dataset.rev8HelpContract='DoPs header Help ->480px Help ->same Support route; Home Change ->three original Account forms';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finishRev8AccountHelp,{once:true});else finishRev8AccountHelp();
})();

/* REV9 original presentation only. Preserve the five real quest families,
 * their server-rendered counters and every original form/control/handler.
 * Historical function.js demonstrates child-condition disclosure; this adapts
 * that role to Andromeda's flat objective groups, not an invented nested quest.
 * Native icon images are linked only by the authorized private-preview CSS.
 * No third-party code, request, timer, progress or reward logic is imported.
 */
(function(){
  'use strict';
  function compactQuestHeader(root){
    const picker=root.querySelector('.hist-q-family-picker');
    if(!picker||root.querySelector('.rev9-quest-toolbar'))return;
    const toolbar=document.createElement('div');toolbar.className='rev9-quest-toolbar';
    const counts=document.createElement('div');counts.className='rev9-quest-active-counts';counts.setAttribute('aria-live','polite');
    picker.before(toolbar);toolbar.appendChild(picker);toolbar.appendChild(counts);
    const records=[];
    root.querySelectorAll('[data-quest-section]').forEach(panel=>{
      panel.querySelectorAll('.quest-section__intro').forEach(intro=>{
        Array.from(intro.children).forEach(node=>{
          if(node.matches('p')&&/^Active quests:\s*\d+\s*\/\s*\d+$/i.test(node.textContent.trim())){
            records.push({node,family:panel.dataset.questSection});counts.appendChild(node);
          }
        });
        intro.querySelectorAll('.hist-activity-details').forEach(details=>{
          if(details.querySelector('summary')?.textContent.trim()==='Mission reset'&&!details.querySelector('form,input,select,textarea,button'))details.classList.add('rev9-mission-reset');
        });
        const hasOtherText=Array.from(intro.childNodes).some(node=>node.nodeType===3&&node.textContent.trim());
        if(!hasOtherText&&Array.from(intro.children).every(node=>node.matches('h3,.rev9-mission-reset')))intro.classList.add('rev9-quest-empty-intro');
      });
    });
    function sync(){
      // Read the existing PHP text, never calculate or increment a quest count.
      const shown=records.find(record=>record.family===root.dataset.currentSection);
      records.forEach(record=>{record.node.hidden=record!==shown;});
      counts.hidden=!shown;
    }
    sync();
    const observer=new MutationObserver(sync);observer.observe(root,{attributes:true,attributeFilter:['data-current-section']});
    root.dataset.rev9HeaderCounterNodes=String(records.length);
  }
  function addObjectiveDisclosures(){
    const root=document.querySelector('body.historical-site .quest-page.hist-q-ready');
    if(!root||root.classList.contains('rev9-objective-disclosures'))return;
    const forms=Array.from(root.querySelectorAll('form')).map(node=>({node,elements:Array.from(node.elements)}));
    const controls=Array.from(root.querySelectorAll('input,select,textarea,button')).map(node=>({node,form:node.form}));
    let index=0;
    root.querySelectorAll('.rev7-q-tasks').forEach(region=>{
      // The added button is never put in a business form. A target containing
      // an input/action is deliberately ineligible for presentation collapse.
      if(region.closest('form'))return;
      const targets=Array.from(region.children).filter(node=>node.matches('.basic-objectives,.quest-progress'));
      if(!targets.length||targets.some(node=>node.hidden||node.querySelector('form,input,select,textarea,button')))return;
      const button=document.createElement('button');button.type='button';button.className='rev9-objectives-toggle';button.textContent='Objectives';
      const targetIds=targets.map((node,i)=>{if(!node.id)node.id='rev9-objective-group-'+index+'-'+i;node.classList.add('rev9-objective-target');return node.id;});
      button.setAttribute('aria-controls',targetIds.join(' '));
      let expanded=true;
      function describe(){button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',(expanded?'Collapse':'Expand')+' objectives');button.title=(expanded?'Collapse':'Expand')+' objectives';}
      button.addEventListener('click',()=>{expanded=!expanded;targets.forEach(node=>{node.hidden=!expanded;});describe();});
      describe();targets[0].before(button);index++;
    });
    root.querySelectorAll('.rev7-q-view-toggle').forEach(button=>{
      // Keep the original action name authoritative; the CSS marker is only a
      // visual hint and must not become an extra spoken character.
      const syncName=()=>{const name=button.textContent.trim();button.setAttribute('aria-label',name);button.title=name;};
      syncName();button.addEventListener('click',syncName);
    });
    compactQuestHeader(root);
    root.classList.add('rev9-objective-disclosures');
    root.dataset.rev9DisclosureCount=String(index);
    root.dataset.rev9OriginalFormsPreserved=String(forms.every(item=>item.node.isConnected&&item.elements.length===item.node.elements.length&&item.elements.every(node=>Array.from(item.node.elements).includes(node))));
    root.dataset.rev9OriginalControlOwnersPreserved=String(controls.every(item=>item.node.isConnected&&item.node.form===item.form));
  }
  // Existing activities build these exact regions on DOMContentLoaded. Load is
  // an event boundary, not a polling timer, and waits for that adaptation.
  if(document.readyState==='complete')addObjectiveDisclosures();else window.addEventListener('load',addObjectiveDisclosures,{once:true});
})();
