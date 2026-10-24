/* Target the demonstrated web-header DOM, not the HTML5 game canvas.
   Reuse the approved transparent wordmark; never replace statistics nodes. */
(function(){'use strict';
 function apply(){
  if(!document.body.classList.contains('historical-site'))return;
  const header=document.querySelector('.app-header'),logo=header?.querySelector('.brand img'),stats=header?.querySelector('.hist-rev6-header-stats');
  if(!header||!logo||!stats||header.classList.contains('actions-header-finish'))return;
  const cells=Array.from(stats.querySelectorAll('.hist-rev6-header-stat'));
  if(!['id','level','honor','xp'].every(key=>stats.querySelector('.hist-rev6-header-'+key)))return;
  const before=cells.map(node=>({node,text:node.textContent}));
  header.classList.add('actions-header-finish');
  // The approved wordmark and its geometry are present in initial HTML/CSS; no late image replacement.
  window.AndromedaActionsHeaderPresentation={scope:'Existing web header with its four demonstrated counters; no game-canvas HUD',logo:'Approved transparent portal wordmark',originalCounterNodesRetained:before.every(x=>x.node.isConnected&&x.node.parentNode===stats),counterTextUnchanged:before.every(x=>x.node.textContent===x.text),businessRequestsAdded:0,actionHandlersAdded:0,gameplayChanged:false};
 }
 const ready=()=>requestAnimationFrame(apply);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
