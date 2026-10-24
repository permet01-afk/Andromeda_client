/* Presentation-only Havok crop selection. No state, handlers or requests.
 * Reads the existing renderer's own level and equipped-state annotations.
 * Normal Iris/Flax, original DnD, Save, A/B and inventory nodes stay intact.
 */
(function () {
  'use strict';
  function levelFromExistingLabel(node) {
    const match = (node.getAttribute('aria-label') || '').match(/^Iris level ([1-6])(?:\b|$)/);
    return match ? match[1] : null;
  }
  function mark(node, equipped) {
    const level = equipped ? levelFromExistingLabel(node) : null;
    if (level) {
      if (node.dataset.finalSixHavokLevel !== level) node.dataset.finalSixHavokLevel = level;
    } else if (node.hasAttribute('data-final-six-havok-level')) {
      node.removeAttribute('data-final-six-havok-level');
    }
  }
  function start() {
    const body = document.body;
    if (!body || !body.classList.contains('historical-site') || window.AndromedaFinalSixMedia) return;
    body.classList.add('final-six-media');
    const proof = window.AndromedaFinalSixMedia = {
      redArtwork: 'approved Andromeda atlas, not certified native DoPs red L1–L6',
      topPolicy: 'lossless first-angle crop displayed at native size',
      tokenPolicy: 'native size, proportionally reduced only when wider than 63px',
      profileAvatar: 'unchanged complementary PrivateKrypton silhouette, native 110×120',
      originalNodesReplaced: 0, businessRequests: 0, savedStateWrites: 0
    };
    if (!body.classList.contains('hist-equipment')) return;
    const wrap = document.getElementById('dronesWrap');
    const entity = document.querySelector('.hist-rev6-drone-entity');
    function sync() {
      const portraits = wrap ? wrap.querySelectorAll('.drone-token .drone-portrait') : [];
      portraits.forEach(node => mark(node, node.dataset.histPortraitKind === 'havok-atlas'));
      const top = entity && entity.querySelector('.hist-complement-drone-top');
      if (top) mark(top, entity.dataset.designState === 'havok');
      proof.currentRedTokens = Array.from(portraits).filter(node => node.hasAttribute('data-final-six-havok-level')).length;
      proof.currentTopLevel = top ? top.dataset.finalSixHavokLevel || null : null;
    }
    const observer = new MutationObserver(sync);
    if (wrap) observer.observe(wrap, {childList:true, subtree:true, attributes:true, attributeFilter:['aria-label','data-hist-portrait-kind']});
    if (entity) observer.observe(entity, {attributes:true, subtree:true, attributeFilter:['aria-label','data-design-state']});
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
