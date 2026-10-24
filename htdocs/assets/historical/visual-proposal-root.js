/* Presentation only. Reuses the existing server statistics and native dialog behavior. */
(()=>{'use strict';function run(){
 const rail=document.querySelector('.hist-home-rail');const stats=rail?.querySelector('.hist-home-server-statistics');
 if(!rail||!stats||document.getElementById('vp-server-statistics'))return;
 const trigger=document.createElement('button');trigger.type='button';trigger.className='vp-stats-trigger';trigger.textContent='Server Statistics';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','vp-server-statistics');
 const popup=document.createElement('dialog');popup.className='vp-stats-dialog';popup.id='vp-server-statistics';popup.setAttribute('aria-labelledby','vp-server-statistics-title');
 const title=document.createElement('h2');title.id='vp-server-statistics-title';title.textContent='Server Statistics';
 const close=document.createElement('button');close.type='button';close.className='vp-stats-close';close.setAttribute('aria-label','Close Server Statistics');close.textContent='×';close.addEventListener('click',()=>popup.close());
 stats.replaceWith(trigger);popup.append(title,close,stats);document.body.append(popup);
 trigger.addEventListener('click',()=>{popup.showModal();trigger.setAttribute('aria-expanded','true');});
 popup.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus({preventScroll:true});});
}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();})();
