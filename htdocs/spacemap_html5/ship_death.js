/* Old local Flash flow: end sequence now, Note after 2s, then same-tab hangar.
 * No map reset and no new playable life in this document. */
(function (root) {
    'use strict';
    const death = {terminal:false, startedAt:0, popupDelay:2000, popupShown:false};
    death.begin = function () {
        if (death.terminal) return false;
        death.terminal = true;
        death.startedAt = performance.now();
        if (typeof document === 'undefined') return true;
        const overlay = document.createElement('div');
        overlay.id = 'ship-death-overlay';
        overlay.innerHTML = '<div class="ship-death-flash"></div><section class="ship-death-note" role="alertdialog" aria-modal="true" aria-labelledby="ship-death-title" aria-describedby="ship-death-message" hidden><h2 id="ship-death-title">Note</h2><p id="ship-death-message">Your ship has been destroyed. Repair your ship before you can continue playing.</p><button type="button">OK</button></section>';
        document.body.appendChild(overlay);
        document.body.classList.add('ship-death-terminal');
        const button = overlay.querySelector('button');
        const redirect = () => root.location.replace('/view.php?page=user&tab=infos');
        button.addEventListener('click', redirect);
        // Capture handlers also block existing window/document keyboard shortcuts.
        function block(event) {
            if (death.popupShown && event.target === button && (event.type === 'click' || event.type === 'pointerup' || event.type === 'pointerdown' || event.type === 'mousedown' || event.type === 'mouseup' || event.type === 'touchstart' || event.type === 'touchend')) return;
            if (death.popupShown && event.type === 'keydown' && (event.key === 'Enter' || event.key === ' ')) {event.preventDefault();event.stopImmediatePropagation();redirect();return;}
            event.preventDefault(); event.stopImmediatePropagation();
            if (death.popupShown) button.focus();
        }
        ['keydown','keyup','pointerdown','pointerup','pointermove','mousedown','mouseup','mousemove','click','dblclick','wheel','touchstart','touchend','touchmove'].forEach(type => root.addEventListener(type,block,{capture:true,passive:false}));
        setTimeout(() => {
            death.popupShown = true;
            overlay.querySelector('section').hidden = false;
            if (root.AudioManager) root.AudioManager.playSoundEffect(41,false,false,-1,-1,true);
            button.focus();
        }, death.popupDelay);
        return true;
    };
    root.AndromedaShipDeath = death;
    if (typeof module !== 'undefined') module.exports = death;
})(typeof window !== 'undefined' ? window : globalThis);
