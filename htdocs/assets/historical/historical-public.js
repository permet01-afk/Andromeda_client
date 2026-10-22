/* Local public-page adaptation. Own code; original Andromeda forms are moved,
   never recreated or submitted here. No credentials, tokens or account state
   are read by this module. DoPs INDEX remains the layout reference. */
(() => {
  'use strict';
  const body=document.body;
  const path=location.pathname;
  const isAuth=body.classList.contains('auth-body');
  const isTerms=body.classList.contains('landing-body');
  const verification=document.querySelector('.verify-card');
  const companies=path.endsWith('/company.php')&&document.querySelector('.faction-container');
  if(!isAuth&&!isTerms&&!verification&&!companies)return;
  body.classList.add('historical-public');
  const A='/assets/historical/public-external/';
  const element=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  const canvas=element('main','public-canvas');
  canvas.id='public-canvas';
  const viewport=element('div','public-viewport');viewport.append(canvas);
  const brand=element('a','public-brand');brand.href='login.php';brand.setAttribute('aria-label','Andromeda home');
  const logo=document.querySelector('img[src="img/logo.png"]')||element('img');
  logo.src=A+'andromeda-reborn-wordmark-v1.png';logo.alt='Andromeda Reborn';logo.className='public-andromeda-logo';brand.append(logo);canvas.append(brand);
  const footer=element('footer','public-footer');
  footer.append(element('p','',`Andromeda — independent, non-profit project © ${new Date().getFullYear()}.`));
  footer.append(element('p','','DarkOrbit is a registered trademark of Bigpoint. Andromeda is not affiliated with Bigpoint.'));
  const legalLink=()=>{const b=element('button','public-text-button','Terms of Use');b.type='button';b.addEventListener('click',()=>openLegal(b));return b;};
  let legalDialog;
  function openLegal(opener){
    if(!legalDialog){
      legalDialog=element('dialog','public-legal-dialog');
      const content=element('div','public-legal-content');
      // The only HTML here is the static legal article from the same index.php.
      content.innerHTML=window.AndromedaPublicLegal||'<p>Terms are available at the entry page.</p>';
      const close=element('button','public-small-button','Close');close.type='button';
      close.addEventListener('click',()=>legalDialog.close());
      legalDialog.append(content,close);body.append(legalDialog);
    }
    legalDialog.addEventListener('close',()=>opener.focus(),{once:true});
    legalDialog.showModal();
  }
  function auxNavigation(){
    const nav=element('nav','public-navigation');nav.setAttribute('aria-label','Public navigation');
    if(isAuth){
      const signIn=element('a','','Sign in');signIn.href='#login_form';
      signIn.addEventListener('click',()=>document.querySelector('#login-username')?.focus());
      const register=element('a','','Create account');register.href='#signup';
      register.addEventListener('click',()=>document.querySelector('#signup-login')?.focus());
      nav.append(signIn,register);
    }else{const back=element('a','','Sign in');back.href='login.php';nav.append(back);}
    nav.append(legalLink());canvas.append(nav);
  }
  if(isAuth){
    body.classList.add('public-home');
    const previous=document.querySelector('.auth-container');
    const login=document.querySelector('#login_form');const signup=document.querySelector('#signup');
    if(!previous||!login||!signup)return;
    const loginSlot=element('section','public-login');loginSlot.setAttribute('aria-label','Sign in');
    loginSlot.append(login);canvas.append(loginSlot);
    const signupSlot=element('section','public-registration');signupSlot.setAttribute('aria-label','Create an account');
    const title=element('img','public-register-title');title.src=A+'en/txt_form.png';title.alt='The fight for essential resources has begun';
    signupSlot.append(title,signup);canvas.append(signupSlot);
    const character=element('img','public-nyx');character.src=A+'global/nyx.png';character.alt='';character.setAttribute('aria-hidden','true');canvas.append(character);
    const trailer=element('img','public-historical-scene');trailer.src=A+'global/trailer_FALLBACK.png';trailer.alt='Historical DarkOrbit space battle illustration';canvas.append(trailer);
    const intro=element('section','public-introduction');intro.setAttribute('aria-label','Andromeda');
    intro.append(element('h1','','Andromeda'),element('p','','Enter your account details to access your hangar, clan and the Andromeda universe.'));
    canvas.append(intro);
    const alert=document.querySelector('.auth-alert');
    if(alert){
      alert.classList.add('public-error');
      const title=alert.querySelector('h2');if(title)title.textContent='Please check your entries';
      const close=element('button','public-error-close','×');close.type='button';close.setAttribute('aria-label','Close error message');
      close.addEventListener('click',()=>{alert.hidden=true;login.querySelector('input[type="text"]')?.focus();});
      alert.prepend(close);canvas.append(alert);
    }
    login.querySelector('button[type="submit"]').textContent='Login';
    login.querySelector('#login-username').placeholder='Username';
    login.querySelector('#login-password').placeholder='Password';
    const signupButton=signup.querySelector('button[type="submit"]');signupButton.setAttribute('aria-label','Create account');
    auxNavigation();previous.replaceWith(viewport);
  }else if(isTerms){
    body.classList.add('public-terms');
    const previous=document.querySelector('.landing');const panel=element('section','public-flow-panel');
    const article=document.querySelector('.terms-card');const consent=document.querySelector('.terms-consent');
    panel.append(article,consent);canvas.append(panel);
    const originalFooter=document.querySelector('.landing-footer');
    if(originalFooter){originalFooter.className='public-footer';canvas.append(originalFooter);}else canvas.append(footer);
    previous.replaceWith(viewport);
  }else if(verification){
    body.classList.add('public-verification');verification.classList.add('public-flow-panel');
    canvas.append(verification);auxNavigation();body.append(viewport);
  }else if(companies){
    body.classList.add('public-company');
    const heading=document.querySelector('.header');const panel=element('section','public-flow-panel');
    if(heading){heading.querySelector('img')?.remove();panel.append(heading);}
    panel.append(companies);canvas.append(panel);auxNavigation();body.append(viewport);
    // COMPANY_B_START: presentation only. Original GET links remain the confirmations.
    const originalChoices=Array.from(companies.children).filter(node=>node.matches('a.faction-card'));
    const choiceData=originalChoices.map(link=>{
      const match=/^company\.php\?factionid=([123])$/.exec(link.getAttribute('href')||'');
      return {link,id:match?Number(match[1]):0,image:link.querySelector('img'),name:link.querySelector('h2'),description:link.querySelector('p'),label:link.querySelector('span')};
    });
    if(choiceData.length===3&&new Set(choiceData.map(row=>row.id)).size===3&&choiceData.every(row=>row.id&&row.image&&row.name&&row.description&&row.label&&!document.getElementById('company_'+row.id))){
      const fragment=document.createDocumentFragment();
      const status=element('p','company-b-status','Select a company, then confirm your choice.');
      status.setAttribute('aria-live','polite');status.id='company-b-selection-status';
      let selected=0;
      const rows=choiceData.map(row=>{
        const fullName=(row.image.alt||[row.name.textContent,row.description.textContent].join(' ')).trim();
        const card=element('article','company-b-card');card.id='company_'+row.id;card.dataset.factionId=String(row.id);
        row.image.src='/assets/historical/company-b/bg_'+row.id+'_over.jpg';
        row.image.className='company-b-art';row.image.width=202;row.image.height=385;
        const choice=element('button','company-b-choice');choice.type='button';choice.dataset.factionId=String(row.id);
        choice.setAttribute('aria-label','Select '+fullName);choice.setAttribute('aria-pressed','false');
        choice.setAttribute('aria-describedby',status.id);choice.setAttribute('aria-controls','company-b-confirm-'+row.id);
        row.link.className='company-b-confirm';row.link.id='company-b-confirm-'+row.id;row.link.hidden=true;
        row.link.setAttribute('aria-label','Confirm '+fullName);row.label.textContent='Confirm';
        row.link.addEventListener('click',event=>{if(selected!==row.id)event.preventDefault();});
        card.append(row.image,row.name,row.description,choice,row.link);fragment.append(card);
        return {...row,card,choice,fullName};
      });
      function selectCompany(id){
        selected=id;companies.dataset.selectedCompany=String(id);
        for(const row of rows){
          const active=row.id===id;row.card.classList.toggle('is-selected',active);
          row.choice.setAttribute('aria-pressed',String(active));row.link.hidden=!active;
          if(active)status.textContent=row.fullName+' selected. Use Confirm to join.';
        }
      }
      for(const row of rows)row.choice.addEventListener('click',()=>selectCompany(row.id));
      companies.append(fragment,status);companies.dataset.companyState='ready';
      body.classList.add('company-native-b');panel.classList.add('company-b-panel');
    }
    // COMPANY_B_END. Unexpected/incomplete markup retains the original direct-link fallback.
  }
  if(!canvas.querySelector('.public-footer'))canvas.append(footer);
})();
