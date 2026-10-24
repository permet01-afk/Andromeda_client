/* Presentation adapter for the existing Andromeda Titles editor.
 * The retained DoPs snapshot proves a Title Overview link, not this panel.
 * No request, submit interception, title rule or disabled-state mutation. */
(function () {
  'use strict';

  function text(node) { return node ? node.textContent.trim() : ''; }
  function make(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value) node.textContent = value;
    return node;
  }
  function run() {
    const route = new URLSearchParams(location.search);
    if (route.get('page') !== 'user' || route.get('tab') !== 'titles' || !document.body.classList.contains('historical-site')) return;
    const panel = document.querySelector('.titles-panel.rev5-titles');
    if (!panel || panel.dataset.sixTitlesReady) return;
    const stage = panel.querySelector('.rev5-title-stage');
    const list = stage && stage.querySelector('.rev5-title-list');
    const detail = stage && stage.querySelector('.rev5-title-details');
    if (!list || !detail) return;

    const controls = Array.from(panel.querySelectorAll('input,select,textarea,button'))
      .map(node => ({node:node, owner:node.form, disabled:node.disabled, checked:node.checked}));
    const forms = Array.from(panel.querySelectorAll('form'))
      .map(node => ({node:node, elements:Array.from(node.elements)}));
    const facts = {
      scope:'Titles presentation only', status:'READY_FOR_ROOT_RENDER_QA',
      historicalExactness:false, requestsAdded:0, timersAdded:0,
      submitHandlersAdded:0, disabledStateMutations:0,
      icons:'Existing Andromeda SVGs; not certified original DoPs title art',
      changes:[]
    };
    const saveForm = panel.querySelector('#titles-save-form');
    const oldPermanentSection = Array.from(panel.children).find(node => node.matches('.titles-section') && node.querySelector('.titles-section__header'));
    if (saveForm && oldPermanentSection) {
      const header = oldPermanentSection.querySelector('.titles-section__header');
      if (header) saveForm.insertBefore(header, saveForm.firstChild);
    }

    // Beginner is rendered by PHP as a non-selectable Starter card. Moving this
    // control-free original card out of the permanent form changes no choice.
    const beginner = list.querySelector('.title-card--beginner');
    if (beginner && !beginner.querySelector('input,select,textarea,button')) {
      const starter = make('section', 'six-title-starter');
      const header = make('div', 'titles-section__header');
      header.appendChild(make('h3', '', 'Starter title'));
      starter.append(header, beginner);
      list.insertBefore(starter, list.firstChild);
      facts.changes.push('Original non-selectable Beginner card grouped as Starter; no radio created.');
    }

    const infos = Array.from(detail.querySelectorAll('.rev5-title-detail'));
    const entries = [];
    for (const card of Array.from(list.querySelectorAll('.title-card'))) {
      const entry = card.closest('.title-card-option') || card;
      const label = text(card.querySelector('h3'));
      const info = infos.find(node => text(node.querySelector('h3')) === label);
      if (!info) continue;
      const heading = info.querySelector('h3');
      const sourceImage = card.querySelector('.title-card__emblem img');
      if (heading && !info.querySelector('.six-title-detail-heading')) {
        const line = make('div', 'six-title-detail-heading');
        if (sourceImage) {
          const image = make('img', '');
          image.src = sourceImage.getAttribute('src');
          image.alt = ''; image.width = 34; image.height = 34;
          image.setAttribute('aria-hidden', 'true');
          line.appendChild(image);
        }
        line.appendChild(heading);
        info.insertBefore(line, info.firstChild);
      }
      if (!info.id) info.id = 'six-title-detail-' + entries.length;
      if (heading && !heading.id) heading.id = info.id + '-heading';
      if (heading) info.setAttribute('aria-labelledby', heading.id);
      entry.setAttribute('aria-controls', info.id);
      entries.push({entry:entry, card:card, info:info, label:label, sourceImage:sourceImage});
    }

    function show(item) {
      for (const current of entries) {
        const active = current === item;
        current.info.hidden = !active;
        current.entry.classList.toggle('six-title-focused', active);
        current.entry.classList.toggle('rev5-title-current-detail', active);
      }
      facts.currentDetail = item.label;
    }
    for (const item of entries) {
      // Existing handlers still run. This only synchronizes their existing
      // detail state and never calls click(), checks a radio, or submits.
      item.entry.addEventListener('click', () => show(item));
      item.entry.addEventListener('focusin', () => show(item));
      item.entry.addEventListener('keydown', event => {
        if (!item.entry.querySelector('input[type=radio]') && (event.key === 'Enter' || event.key === ' ')) show(item);
      });
    }
    const displayed = panel.querySelector('.titles-summary-card strong');
    const actualLabel = text(displayed);
    const actual = entries.find(item => item.label === actualLabel);
    const first = actual || entries.find(item => item.entry.querySelector('input:checked')) || entries[0];
    if (first) show(first);
    const summaryIcon = panel.querySelector('.titles-summary-card__icon img');
    if (actual && actual.sourceImage && summaryIcon) {
      summaryIcon.setAttribute('src', actual.sourceImage.getAttribute('src'));
      facts.changes.push('Displayed-title label remains server-rendered; its decorative icon matches that same actual card.');
    }

    const actionLabel = panel.querySelector('.titles-action-bar>div:first-child');
    const selectedName = actionLabel && actionLabel.querySelector('strong');
    const selectedCaption = actionLabel && actionLabel.querySelector('span');
    if (actionLabel && selectedName && selectedCaption) {
      actionLabel.insertBefore(selectedCaption, selectedName);
      const pending = make('span', 'six-title-selection-note', 'Unsaved selection');
      pending.hidden = true; pending.setAttribute('aria-live', 'polite');
      actionLabel.appendChild(pending);
      const initialRadio = saveForm && saveForm.querySelector('input[name="title_key"]:checked');
      const initialKey = initialRadio ? initialRadio.value : '';
      const initialName = text(selectedName);
      if (saveForm) saveForm.addEventListener('change', event => {
        const radio = event.target;
        if (!radio.matches('input.title-card__radio[name="title_key"]') || !radio.checked) return;
        const item = entries.find(value => value.entry.contains(radio));
        if (!item) return;
        selectedName.textContent = item.label || initialName;
        pending.hidden = radio.value === initialKey;
        show(item);
        // The original inline change listener alone controls Save.disabled.
        // Current Displayed Title stays unchanged until the real Save reload.
      });
    }

    panel.dataset.sixTitlesReady = '1';
    document.body.classList.add('final-six-titles');
    facts.changes.push('Current banner, Starter/Temporary/Permanent groups, detail and original action bar have separate responsive boxes.');
    facts.originalControlsConnected = controls.every(item => item.node.isConnected);
    facts.originalControlOwnersUnchanged = controls.every(item => item.node.form === item.owner);
    facts.disabledStatesUnchangedInitially = controls.every(item => item.node.disabled === item.disabled);
    facts.checkedStatesUnchangedInitially = controls.every(item => item.node.checked === item.checked);
    facts.formElementSetsUnchanged = forms.every(item => item.node.isConnected && item.elements.length === item.node.elements.length && item.elements.every(node => Array.from(item.node.elements).includes(node)));
    facts.cardCount = entries.length;
    window.AndromedaFinalSixTitles = facts;
  }
  function afterExistingAdapters() { Promise.resolve().then(run); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', afterExistingAdapters, {once:true});
  else afterExistingAdapters();
})();
