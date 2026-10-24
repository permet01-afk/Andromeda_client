/* Existing diplomacy forms only: three supported relation types, no requests or gameplay. */
(()=>{'use strict';
 function decorate(){
  const query=new URLSearchParams(location.search);
  if(query.get('page')!=='clan')return;
  // NAP reuses the existing agreement rights; keep their visible labels explicit.
  if(query.get('tab')==='clanroles'){
   for(const [name,text] of [['can_start_alliance','Propose / accept alliance or NAP'],['can_cancel_alliance','End / refuse alliance or NAP']]){
    for(const input of document.querySelectorAll('input[name="'+name+'"]')){
     const label=input.closest('label');
     if(!label)continue;
     for(const node of Array.from(label.childNodes))if(node.nodeType===Node.TEXT_NODE)node.remove();
     label.appendChild(document.createTextNode(' '+text));
    }
   }
   return;
  }
  if(query.get('tab')!=='diplomacy')return;
  const list=document.getElementById('clan-alliances');
  const heading=list?.parentElement?.querySelector(':scope > h2');
  if(heading&&heading.textContent.trim()==='Alliances')heading.textContent='Alliances / NAP';
  const host=document.querySelector('.CMSContent.hist-clan-organized');
  const error=document.querySelector('[data-clan-diplomacy-error]');
  if(host&&error&&error.parentElement!==host.parentElement)host.before(error);
  const form=document.getElementById('clan-new-diplomacy-form');
  if(!form)return;
  function describe(){
   const type=form.querySelector('input[name="diplo_type"]:checked')?.value;
   const definitions={
    alliance:['Request alliance','Send an alliance request? It becomes active only after acceptance.'],
    nap:['Request non-aggression pact','Send a non-aggression pact request? A NAP does not end an active war.'],
    war:['Declare war','Declare war immediately? The other clan does not need to accept.']
   };
   const definition=definitions[type];
   if(definition){form.dataset.clanConfirmTitle=definition[0];form.dataset.clanConfirm=definition[1];}
  }
  if(!form.dataset.clanDiploDescribed){form.addEventListener('change',describe);form.dataset.clanDiploDescribed='true';}
  describe();
 }
 document.addEventListener('andromeda-clan-visual-proposal-ready',decorate);
 const ready=()=>requestAnimationFrame(decorate);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
