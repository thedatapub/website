import { parseHash,routeHash,renderArchive,resolveRoute,editionLabel } from './archive-view.js';
import { renderPeople,resolvePeople } from './people-view.js';
import { attachPlayer } from './video-player.js';
export function initArchive({cancelPan,menu,menuTrigger,contentDialog,help,reduced}) {
  const modal=document.querySelector('#speakers-dialog'),content=document.querySelector('#archive-content');
  const originalTitle=document.title;
  let dataPromise,last=null,origin=null,token=0,activeHash=null,closing=false,stopPlayer=()=>{};
  const load=()=>dataPromise||=(Promise.all(['talks','people'].map(name=>fetch(`assets/data/${name}.json`).then(r=>{if(!r.ok)throw Error('Unavailable');return r.json();}))).catch(e=>{dataPromise=null;throw e;}));
  const normalized=r=>({kind:r.kind,year:r.year,page:r.page,id:r.person?.id||r.event?.id,video:r.video?new URL(r.video.url).searchParams.get('v'):undefined});
  const parent=r=>r.video?{kind:'tv',year:r.year,page:r.page,id:r.event.id}:(r.person||r.event)?{kind:r.kind,year:r.year,page:r.page}:null;
  function push(hash,parentHash=null,replace=false) {
    history[replace?'replaceState':'pushState']({...history.state,tdpCollection:{parentHash}},'',hash||location.pathname+location.search);
  }
  async function navigate(requested,{replace=false,play=false}={}) {
    if(!requested){push('');sync();return;}
    const [events,people]=await load();
    const r=requested.kind==='speakers'?resolvePeople(people,requested):resolveRoute(events,requested);
    const hash=routeHash(normalized(r));if(hash===location.hash)return;
    const up=parent(r),parentHash=up?routeHash(up):null;
    // Cross-collection links still open an owned shelf before the tape detail.
    if(!replace&&parentHash&&location.hash!==parentHash)push(parentHash);
    push(hash,replace?null:parentHash,replace);sync({play});
  }
  function closeLevel() {
    if(closing)return;
    const up=last&&parent(last);
    if(up) {
      if(history.state?.tdpCollection?.parentHash===routeHash(up)){closing=true;history.back();}
      else navigate(up,{replace:true});
    } else navigate(null);
  }
  async function sync({play=false}={}) {
    if(location.hash===activeHash)return;
    activeHash=location.hash;closing=false;stopPlayer();stopPlayer=()=>{};
    document.title=originalTitle;
    const current=++token,requested=parseHash(location.hash);
    if(!requested){if(modal.open){modal.close();origin?.focus({preventScroll:true});}last=null;return;}
    const opening=!modal.open;
    if(opening){
      cancelPan();menu.open=false;if(contentDialog.open)contentDialog.close();if(help.open)help.close();
      origin ||= document.querySelector(requested.kind==='tv'?'#spot-vhs':'#speakers-board');
      content.innerHTML='<h1 id="archive-title" tabindex="-1">Abriendo el archivo…</h1><button data-archive-close>Volver a la barra</button>';
      modal.showModal();content.querySelector('h1').focus();
    }
    try {
      const [events,people]=await load();if(current!==token)return;
      const r=requested.kind==='speakers'?resolvePeople(people,requested):resolveRoute(events,requested);
      const hash=routeHash(normalized(r));
      if(location.hash!==hash){history.replaceState(history.state,'',hash);activeHash=hash;}
      modal.dataset.collection=r.kind;modal.dataset.view=(r.person||r.event)?'detail':'board';
      content.innerHTML=r.kind==='speakers'?renderPeople(people,events,requested):renderArchive(events,requested);
      if(r.video)document.title=editionLabel(r.event.date);
      let focus;
      if(last?.video&&!r.video&&r.event?.id===last.event?.id)focus=content.querySelector(`[data-video-id="${new URL(last.video.url).searchParams.get('v')}"]`);
      else if(last?.person&&!r.person&&r.kind==='speakers'&&last.year===r.year)focus=content.querySelector(`[data-person-id="${last.person.id}"]`);
      else if(last?.event&&!r.event&&r.kind==='tv'&&last.year===r.year)focus=content.querySelector(`[data-event-id="${last.event.id}"]`);
      if(!focus&&r.event&&!r.video)focus=content.querySelector('.watch-link');
      (focus||content.querySelector('#archive-title')).focus({preventScroll:true});
      if(r.video)stopPlayer=attachPlayer(content,r.video,{autoplay:play,reduced:reduced()});
      if(opening&&!reduced())modal.animate([{opacity:.3,transform:'scale(.94)'},{opacity:1,transform:'none'}],{duration:280,easing:'ease-out'});
      last=r;
    } catch {
      if(current!==token)return;last=null;
      content.innerHTML=`<h1 id="archive-title" tabindex="-1">El archivo sigue disponible.</h1><p>No se pudo cargar esta vista.</p><a class="archive-back" href="${requested.kind==='tv'?'tv':'speakers'}/">Abrir la versión por páginas</a><button class="archive-close" data-archive-close aria-label="Volver a la barra">×</button>`;
      content.querySelector('h1').focus();
    }
  }
  for(const link of document.querySelectorAll('[data-archive-open]')) {
    link.setAttribute('aria-haspopup','dialog');
    link.addEventListener('click',event=>{
      if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
      event.preventDefault();origin=menu.contains(link)?menuTrigger:link;
      // Opening the menu should preserve that trigger when the TV modal appears.
      push(`#${link.dataset.archiveOpen||'speakers'}`);sync();
    });
  }
  content.addEventListener('click',event=>{
    if(event.target.closest('[data-archive-close],[data-archive-back]')){event.preventDefault();closeLevel();return;}
    const link=event.target.closest('[data-archive-route]');
    if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    event.preventDefault();navigate(parseHash(link.hash),{play:link.hasAttribute('data-watch')});
  });
  content.addEventListener('change',event=>{if(event.target.id==='archive-year')navigate({kind:last.kind,year:Number(event.target.value)});});
  content.addEventListener('keydown',event=>{
    if(!last||last.person||last.event||event.target.matches('input,textarea,select,[contenteditable]')||event.altKey||event.ctrlKey||event.metaKey)return;
    const delta=event.key==='ArrowLeft'?1:event.key==='ArrowRight'?-1:0;if(!delta)return;
    event.preventDefault();const year=last.years[last.years.indexOf(last.year)+delta];if(year)navigate({kind:last.kind,year});
  });
  // Handle Escape before the browser close watcher so one key closes exactly one stage.
  modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeLevel();}},true);
  modal.addEventListener('cancel',event=>{event.preventDefault();closeLevel();});
  modal.addEventListener('click',event=>{if(event.target!==modal)return;const b=modal.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)closeLevel();});
  // A queued close from an earlier view can arrive after the dialog has reopened.
  modal.addEventListener('close',()=>{if(!modal.open){stopPlayer();stopPlayer=()=>{};}});
  addEventListener('popstate',()=>sync());addEventListener('hashchange',()=>sync());sync();
}
