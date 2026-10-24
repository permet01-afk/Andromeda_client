/* Presentation only. Reimplements the recovered old changeImage/closeAll
   hover behavior; existing Andromeda GET links are the sole company action.
   No account data, storage, Ajax, submission or game launch is added. */
(() => {
  'use strict';
  const surface=document.getElementById('container_main');
  const cards=Array.from(document.querySelectorAll('.historical-company-select .company-card'));
  let hovered=null;
  function show(card){surface.dataset.activeCompany=card?.dataset.factionId||'0';}
  if(surface&&cards.length===3){
    for(const card of cards){
      card.addEventListener('pointerenter',()=>{hovered=card;show(card);});
      card.addEventListener('pointerleave',()=>{hovered=null;show(cards.find(item=>item.contains(document.activeElement))||null);});
      card.addEventListener('focusin',()=>show(card));
      card.addEventListener('focusout',event=>{if(!card.contains(event.relatedTarget))show(hovered);});
    }
    document.body.dataset.companyPresentation='native-ready';
  }
  const legalOpen=document.getElementById('company-terms-open');
  const legalDialog=document.getElementById('company-terms-dialog');
  const legalContent=document.getElementById('company-terms-content');
  const legalClose=document.getElementById('company-terms-close');
  if(legalOpen&&legalDialog&&legalContent&&legalClose){
    // Same unchanged local article as the public portal. Reading, no acceptance.
    legalContent.innerHTML=window.AndromedaPublicLegal||'<p>Terms are available at the entry page.</p>';
    legalOpen.addEventListener('click',event=>{event.preventDefault();legalDialog.showModal();});
    legalClose.addEventListener('click',()=>legalDialog.close());
    legalDialog.addEventListener('close',()=>legalOpen.focus({preventScroll:true}));
  }
})();
