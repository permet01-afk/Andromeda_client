/* Only classify the text already published by the unchanged loader.
   Only real errors leave the progress opening. Ordinary phases and LOADING remain in the bar; no label, percentage or readiness value is rewritten. */
(()=>{'use strict';function run(){
 const text=document.getElementById('loadingText');if(!text)return;
 function classify(){const value=text.textContent.trim();text.classList.toggle('vp-loader-detail',value!==''&&/\b(?:error|failed|failure|unable|missing|timeout|timed\s+out)\b/i.test(value));}
 classify();new MutationObserver(classify).observe(text,{childList:true,characterData:true,subtree:true});
 const media=window.matchMedia('(max-width:600px)');const stage=document.querySelector('.loader-visual-stage');
 function panorama(){if(media.matches&&stage)stage.scrollLeft=500;}
 panorama();media.addEventListener('change',panorama);
}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();})();
