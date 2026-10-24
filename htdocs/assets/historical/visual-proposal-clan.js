/* Isolated presentation proposal. Existing form nodes, actions and permissions only. */
(function(){'use strict';
function apply(){
 if(!document.body.classList.contains('hist-page-clan')||document.body.classList.contains('vp-clan-sources'))return;
 const host=document.querySelector('.CMSContent.hist-clan-organized.rev5-clan-organized');
 if(!host)return;
 const owners=Array.from(document.querySelectorAll('input,select,textarea,button')).map(n=>({node:n,form:n.form}));
 const forms=Array.from(document.forms).map(n=>({node:n,method:n.method,action:n.action,elements:Array.from(n.elements)}));
 const facts={revision:'isolated-clan-visual-proposal',backendRequestsAdded:0,permissionsChanged:0,kickChanged:false,dialogs:[],inlinePayout:false,descriptionEditors:0,roleCommandRows:0};
 document.body.classList.add('vp-clan-sources');
 const hint=document.createElement('p');hint.className='vp-clan-scroll-hint';hint.textContent='Historical window — scroll this panel horizontally to view all controls.';
 host.before(hint);host.tabIndex=0;host.setAttribute('aria-label','Clan — native window with local horizontal scrolling on small screens');
 for(const panel of document.querySelectorAll('.rev5-social-dialog')){
  const title=panel.querySelector('.rev4-native-window-title')?.textContent.trim();
  if(title==='Tax settings'){panel.classList.add('vp-clan-tax-dialog');facts.dialogs.push('Tax settings: original352×186background, same form');}
  if(title==='Edit description'||title==='View description'){
   panel.classList.add('vp-clan-description-dialog');
   const editor=panel.querySelector('textarea[name="clan-edit-form-description"]');
   editor?.closest('.clan-row')?.classList.add('vp-description-row');
   editor?.form?.classList.add('vp-description-form');
   if(editor)facts.descriptionEditors++;
   facts.dialogs.push('Description: editClanText352x186 background, same form; Save placement adapted');
  }
 }
 /* Visual command grouping only. Keep every original permission, macro,
    disabled fieldset and submit node inside its original form. */
 for(const pane of host.querySelectorAll('.rev5-clan-role-editor .rev5-role-detail')){
  const form=pane.querySelector('form'),save=form?.querySelector('[name="save_role"]');
  if(!form||!save)continue;
  form.classList.add('vp-role-form');
  const fields=document.createElement('div');fields.className='vp-role-fields';
  for(const node of Array.from(form.childNodes))if(node!==save)fields.appendChild(node);
  const commands=document.createElement('div');commands.className='vp-role-actions';
  commands.appendChild(save);form.append(fields,commands);facts.roleCommandRows++;
 }
 /* Deliberately opt-in: original source proves the two fields, but the exact
    submit-button template is absent. ROOT will show this as an adaptation. */
 if(new URLSearchParams(location.search).get('clan_payout_preview')==='inline'){
  const consoleEl=host.querySelector('.rev5-clan-treasury');
  const form=Array.from(document.forms).find(f=>f.querySelector('select[name=to_user_id]')&&f.querySelector('input[name=amount]')&&f.querySelector('input[name=note]'));
  const opener=consoleEl?.querySelector('.rev10-clan-transfer');
  if(consoleEl&&form&&opener){
   const region=document.createElement('section');region.className='vp-clan-payout';region.setAttribute('aria-label','Payout layout proposal');
   const title=document.createElement('h2');title.textContent='Transfer from wallet';region.append(title,form);consoleEl.appendChild(region);
   form.querySelector('[name=to_user_id]')?.closest('label')?.classList.add('vp-payout-recipient');
   form.querySelector('[name=amount]')?.closest('label')?.classList.add('vp-payout-amount');
   form.querySelector('[name=note]')?.closest('label')?.classList.add('vp-payout-note');
   opener.hidden=true;facts.inlinePayout=true;
  }
 }
 facts.formOwnersUnchanged=owners.every(x=>x.node.isConnected&&x.node.form===x.form);
 facts.formDefinitionsUnchanged=forms.every(x=>x.node.isConnected&&x.node.action===x.action&&x.node.method===x.method&&x.elements.length===x.node.elements.length&&x.elements.every(n=>n.form===x.node));
 document.dispatchEvent(new CustomEvent('andromeda-clan-visual-proposal-ready',{detail:facts}));
 window.andromedaClanVisualProposalFacts=facts;
}
function ready(){requestAnimationFrame(apply);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
