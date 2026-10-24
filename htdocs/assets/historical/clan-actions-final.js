/* Existing clan actions: visible validation and a sourced confirmation window. */
(function(){'use strict';
const facts={revision:'clan-actions-final',confirmationRequests:0,cancelRequests:0,inlineTransfer:false,dialogs:0,validationErrors:0};
window.andromedaClanActionFacts=facts;
const bypass=new WeakSet();let pending=null,overlay,panel,title,content,cancel,confirm;
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function close(){if(!overlay)return;overlay.hidden=true;const previous=pending?.opener;pending=null;if(previous?.isConnected)previous.focus();}
function makeDialog(){
 if(overlay)return;
 overlay=node('div','clan-action-overlay');overlay.hidden=true;
 panel=node('section','clan-action-dialog');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','clan-action-title');panel.setAttribute('aria-describedby','clan-action-content');
 title=node('h2','','Confirm action');title.id='clan-action-title';content=node('div','clan-action-content');content.id='clan-action-content';
 const actions=node('div','clan-action-buttons');cancel=node('button','','Cancel');cancel.type='button';cancel.dataset.clanCancel='1';confirm=node('button','','Confirm');confirm.type='button';confirm.dataset.clanAccept='1';
 cancel.addEventListener('click',()=>{facts.cancelRequests++;close();});
 confirm.addEventListener('click',()=>{
  if(!pending)return;const item=pending;
  if(item.signature!==signature(item.form)){open(item.form,item.submitter);return;}
  confirm.disabled=true;bypass.add(item.form);facts.confirmationRequests++;overlay.hidden=true;pending=null;
  item.form.requestSubmit(item.submitter||undefined);
 });
 actions.append(cancel,confirm);panel.append(title,content,actions);overlay.append(panel);document.body.append(overlay);facts.dialogs++;
 overlay.addEventListener('click',e=>{if(e.target===overlay){facts.cancelRequests++;close();}});
 overlay.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();facts.cancelRequests++;close();}
  if(e.key==='Tab'){const list=[cancel,confirm].filter(n=>!n.disabled);if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0]?.focus();}}
 });
}
function signature(form){return Array.from(new FormData(form),([key,value])=>key+'='+String(value)).join('&');}
function open(form,submitter){
 makeDialog();title.textContent=form.dataset.clanConfirmTitle||'Confirm action';content.replaceChildren();
 if(form.hasAttribute('data-clan-transfer')){
  const select=form.querySelector('[name=to_user_id]'),amount=form.querySelector('[name=amount]');
  for(const [label,value]of [['Recipient',select?.selectedOptions[0]?.textContent.trim()||''],['Amount',(amount?.value||'0')+' credits'],['Clan wallet',(form.dataset.clanBalance||'0')+' credits']])content.append(node('p','',label+': '+value));
 }else{
  content.append(node('p','',form.dataset.clanConfirm||'Confirm this action?'));
  const selector=form.dataset.clanConfirmTargetSelector;
  if(selector){const input=form.querySelector(selector);content.append(node('p','',input?.selectedOptions?.[0]?.textContent.trim()||input?.value||''));}
 }
 pending={form,submitter,signature:signature(form),opener:submitter||document.activeElement};confirm.disabled=false;overlay.hidden=false;cancel.focus();
}
function validate(form){
 const field=form.querySelector('textarea'),error=form.querySelector('.clan-inline-error');if(!field||!error)return true;
 // PHP trim's default ASCII character set, preserving the existing byte/Unicode distinction.
 const value=field.value.replace(/^[ \t\n\r\0\v]+|[ \t\n\r\0\v]+$/g,'');
 const bytes=form.dataset.clanLengthMode==='bytes';const length=bytes?new TextEncoder().encode(value).length:Array.from(value).length;
 const valid=length>=12&&length<=120;
 error.hidden=valid;field.setAttribute('aria-invalid',String(!valid));
 if(!valid){error.textContent=(form.dataset.clanValidate==='message'?'The message':'The description')+' must contain 12–120 '+(bytes?'bytes (UTF-8)':'characters')+'. Current length: '+length+'.';facts.validationErrors++;field.focus();}
 return valid;
}
document.addEventListener('submit',e=>{
 const form=e.target;if(!(form instanceof HTMLFormElement))return;
 if(form.hasAttribute('data-clan-validate')&&!validate(form)){e.preventDefault();e.stopImmediatePropagation();return;}
 if(!form.hasAttribute('data-clan-confirm'))return;
 if(bypass.has(form)){bypass.delete(form);return;}
 e.preventDefault();e.stopImmediatePropagation();open(form,e.submitter);
},true);
function arrange(){
 if(!document.body.classList.contains('hist-page-clan'))return;
 const host=document.querySelector('.rev5-clan-console');if(!host)return;
 for(const form of host.querySelectorAll('.clan-kick-form')){const row=form.closest('.stat');if(row){row.append(form);row.classList.add('rev10-clan-member-with-action');}}
 for(const feedback of document.querySelectorAll('.clan-action-feedback')){if(!host.contains(feedback))host.append(feedback);}
 const transfer=document.querySelector('form[data-clan-transfer]'),consoleEl=document.querySelector('.rev5-clan-treasury');
 if(transfer&&consoleEl){
  let region=consoleEl.querySelector('.vp-clan-payout');
  if(!region){region=node('section','vp-clan-payout');region.append(node('h2','','Transfer from wallet'));consoleEl.append(region);}
  region.setAttribute('aria-label','Transfer from clan wallet');region.append(transfer);
  transfer.querySelector('[name=to_user_id]')?.closest('label')?.classList.add('vp-payout-recipient');
  transfer.querySelector('[name=amount]')?.closest('label')?.classList.add('vp-payout-amount');
  transfer.querySelector('[name=note]')?.closest('label')?.classList.add('vp-payout-note');
  const oldOpener=consoleEl.querySelector('.rev10-clan-transfer');if(oldOpener)oldOpener.hidden=true;
  facts.inlineTransfer=true;consoleEl.classList.add('clan-transfer-inline-final');
 }
 for(const form of document.querySelectorAll('form[data-clan-validate]')){
  form.querySelector('textarea')?.addEventListener('input',()=>{const error=form.querySelector('.clan-inline-error');if(error&&!error.hidden)validate(form);});
  if(form.hasAttribute('data-clan-server-invalid')){
   const overlayNode=form.closest('.rev5-social-overlay');
   if(overlayNode){overlayNode.hidden=false;form.querySelector('textarea')?.focus();}
  }
 }
 document.body.classList.add('clan-actions-final-ready');
}
function ready(){requestAnimationFrame(()=>requestAnimationFrame(arrange));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
