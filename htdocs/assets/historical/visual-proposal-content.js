/* Private presentation proposal; original gate validation and handler retained. */
(function () {
  'use strict';
  function boot() {
    const modal=document.querySelector('.gg-page #confirmModal');
    if(!modal||modal.dataset.visualProposalContent)return;
    const box=modal.querySelector('.modal-box'),confirm=modal.querySelector('#btnModalConfirm'),cancel=modal.querySelector('.btn-cancel');
    if(!box||!confirm||!cancel)return;
    modal.dataset.visualProposalContent='native-common-window-adaptation';
    const title=modal.querySelector('.modal-title'),message=modal.querySelector('#modalMessage');
    if(title){title.textContent='Prepare jump';title.id='proposal-gate-confirm-title';modal.setAttribute('aria-labelledby',title.id);}
    if(message)modal.setAttribute('aria-describedby',message.id);
    const close=document.createElement('button');close.type='button';close.className='proposal-gg-close';close.setAttribute('aria-label','Close');
    close.addEventListener('click',()=>cancel.click());box.appendChild(close);
    let previousFocus=null,wasOpen=false;
    function sync(){
      const open=!modal.hidden&&modal.classList.contains('active');
      if(open&&!wasOpen){previousFocus=document.activeElement;cancel.focus();}
      if(!open&&wasOpen&&previousFocus?.isConnected)previousFocus.focus();
      wasOpen=open;
    }
    new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['hidden','class']});sync();
    modal.addEventListener('keydown',event=>{
      if(modal.hidden)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel.click();}
      else if(event.key==='Tab'){
        const controls=Array.from(box.querySelectorAll('button')).filter(button=>!button.disabled);
        const current=controls.indexOf(document.activeElement);
        if(event.shiftKey&&current<=0){event.preventDefault();controls[controls.length-1]?.focus();}
        else if(!event.shiftKey&&(current<0||current===controls.length-1)){event.preventDefault();controls[0]?.focus();}
      }
    });
    window.AndromedaVisualProposalContent={gateWindow:'DoPs MessageWindow geometry; recovered common library artwork; deployment confirmation is an Andromeda adaptation',
      requestsAdded:0,timersAdded:0,originalConfirmNode:confirm,originalCancelNode:cancel,originalActionHandlerPreserved:true,
      businessLogicChanged:false,legacyMessages:'Server-side exact allowlist; no frontend HTML sink'};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
