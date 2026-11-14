export const PAGE_SIZE = 12;
export const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const dateLabel = date => new Intl.DateTimeFormat('es-MX',{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
export const monthLabel = date => new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
export const editionLabel = date => {
  const month=new Intl.DateTimeFormat('es-MX',{month:'long',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
  return `Data Pub · ${month[0].toUpperCase()+month.slice(1)} ${date.slice(0,4)}`;
};
export const yearsFor = data => [...new Set(data.events.map(e=>e.year))].sort((a,b)=>b-a);
export const videoId = video => new URL(video.url).searchParams.get('v');
export const eventVideos = e => [...e.videos.map(v=>({...v,selectionLabel:'Evento completo'})),...e.talks.flatMap(t=>t.videos.map(v=>({...v,selectionLabel:t.title})))];
export function resolveRoute(data,route={}) {
  const years=yearsFor(data);
  const event=data.events.find(e=>e.id===route.id||e.talks.some(t=>t.id===route.id));
  const year=event?.year||(years.includes(Number(route.year))?Number(route.year):years[0]);
  const events=data.events.filter(e=>e.year===year).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id,'en',{numeric:true}));
  const pages=Math.max(1,Math.ceil(events.length/PAGE_SIZE));
  const page=event?Math.floor(events.indexOf(event)/PAGE_SIZE)+1:Math.max(1,Math.min(pages,Math.trunc(Number(route.page)||1)));
  const video=event&&eventVideos(event).find(v=>videoId(v)===route.video);
  return {kind:'tv',year,page,pages,event,video,events,years};
}
export const routeHash = ({kind='tv',year,page=1,id,video})=>`#${kind}/${year}/${page}${id?`/${id}`:''}${video?`/watch/${video}`:''}`;
export function parseHash(hash) {
  const m=/^#(speakers|tv)(?:\/(\d{4})(?:\/(\d+)(?:\/([a-z0-9-]+)(?:\/watch\/([\w-]{11}))?)?)?)?$/.exec(hash);
  if(!m)return null;
  // Old numeric event/session hashes always open the TV, never a person plaque.
  return {kind:m[1]==='speakers'&&/^\d+(?:-\d+)?$/.test(m[4]||'')?'tv':m[1],year:m[2],page:m[3],id:m[4],video:m[5]};
}
export function destination(route,standalone,prefix='') {
  if(!standalone)return routeHash(route);
  const base=route.kind==='speakers'?'speakers':'tv';
  return `${prefix}${base}/${route.id?(route.video?`watch/${route.id}/${route.video}`:`${base==='speakers'?'person':'event'}/${route.id}`):`${route.year}/${route.page||1}`}/`;
}
export function headerHtml(title,label,closeLabel,closeHref,standalone) {
  const exit=standalone?`<a href="${closeHref}"`:'<button type="button" data-archive-close';
  return `<header class="archive-header"><div><p class="eyebrow">THE DATA PUB · ${label}</p><h1 id="archive-title" tabindex="-1">${title}</h1></div>${exit} class="archive-close" aria-label="${closeLabel}" title="${closeLabel}"><span aria-hidden="true">×</span>${standalone?'</a>':'</button>'}</header>`;
}
export function boardHtml(r,{standalone=false,prefix='',title,intro,cards,total,unit}) {
  const link=(route,label,attrs='')=>`<a href="${destination({...route,kind:r.kind},standalone,prefix)}" ${standalone?'':'data-archive-route'} ${attrs}>${label}</a>`;
  const idx=r.years.indexOf(r.year);
  const arrow=(year,label,glyph)=>year?link({year},`${glyph} ${year}`,`class="year-arrow" aria-label="${label}: ${year}"`):`<span class="year-arrow is-disabled" aria-disabled="true">${glyph}</span>`;
  const picker=standalone?`<nav class="static-years" aria-label="Elegir año">${r.years.map(year=>link({year},year,year===r.year?'aria-current="page"':'')).join('')}</nav>`:`<label class="year-select">Año <select id="archive-year" aria-label="Elegir año">${r.years.map(y=>`<option value="${y}" ${y===r.year?'selected':''}>${y}</option>`).join('')}</select></label>`;
  const slots=Array.from({length:PAGE_SIZE},(_,i)=>cards[i]||'<span class="plaque-slot" aria-hidden="true"></span>').join('');
  return `<section class="archive-board-view ${r.kind}-board-view">${headerHtml(`${title} <span>${r.year}</span>`,r.kind==='tv'?'VIDEOTECA · VHS':'SPEAKERS','Volver a la barra',prefix,standalone)}<p class="archive-intro">${intro}</p><div class="archive-years">${arrow(r.years[idx+1],'Año anterior','←')}${picker}${arrow(r.years[idx-1],'Año siguiente','→')}</div><p class="archive-count" role="status">${total} ${unit} en ${r.year} · Página ${r.page} de ${r.pages}</p><div class="plaques-grid" role="group" aria-label="${title} de ${r.year}" tabindex="0">${slots}</div><nav class="archive-pagination" aria-label="Páginas del año">${r.page>1?link({year:r.year,page:r.page-1},'← Página anterior'):'<span></span>'}<span>${r.page} / ${r.pages}</span>${r.page<r.pages?link({year:r.year,page:r.page+1},'Página siguiente →'):'<span></span>'}</nav><p class="archive-source-note">Programación pública anunciada; no acredita asistencia. Cada ficha conserva sus fuentes.</p></section>`;
}
export function renderArchive(data,requested={},options={}) {
  const {standalone=false,prefix=''}=options;
  const r=resolveRoute(data,requested);
  const href=route=>destination({kind:'tv',...route},standalone,prefix);
  const detailHref=href({year:r.year,page:r.page,id:r.event?.id});
  const back=href({year:r.year,page:r.page})+(standalone&&r.event?`#event-${r.event.id}`:'');
  if(r.video) {
    const v=r.video;
    return `<section class="archive-detail-view tv-watch-view">${headerHtml(escapeHtml(editionLabel(r.event.date)),'TV · REPRODUCCIÓN','Volver a la cinta',detailHref,standalone)}<article class="event-detail"><h2 class="watch-talk-title">${escapeHtml(v.selectionLabel)}</h2><div class="crt-frame"><div class="crt-screen" id="tv-screen"><button type="button" class="primary-link" data-play-video ${standalone?'hidden':''}>Encender y reproducir</button></div><span class="crt-brand" aria-hidden="true">DATA PUB · VIDEO</span></div><p id="player-status" role="status">La TV está apagada. Al reproducir se conecta con YouTube.</p><p class="player-fallback ${standalone?'static-video-fallback':'mobile-video-fallback'}"><a href="${escapeHtml(v.url)}">Ver en YouTube ↗</a></p><p>${escapeHtml(v.title)} · ${escapeHtml(v.publisher)}</p><a href="${detailHref}" class="archive-back" ${standalone?'':'data-archive-back'}>← Volver a la cinta</a></article></section>`;
  }
  if(r.event) {
    const e=r.event, videos=eventVideos(e);
    const selection=videos.length?`<section class="video-selection"><h2>${videos.length>1?'Elige una charla':'Grabación'}</h2><ul>${videos.map(v=>`<li><p>${escapeHtml(v.selectionLabel)}</p><a class="watch-link primary-link" data-video-id="${videoId(v)}" ${standalone?'':'data-archive-route data-watch'} href="${href({year:r.year,page:r.page,id:e.id,video:videoId(v)})}">Ver ahora${videos.length>1?`: ${escapeHtml(v.selectionLabel)}`:''}</a> <a class="youtube-secondary ${standalone?'static-video-fallback':'mobile-video-fallback'}" href="${escapeHtml(v.url)}">Ver en YouTube ↗</a></li>`).join('')}</ul></section>`:'<p class="video-unavailable">No tenemos una grabación confirmada para esta cinta. Puedes consultar la programación y su fuente.</p>';
    const talks=e.talks.map(t=>`<section class="event-talk"><h2>${escapeHtml(t.title)}</h2><p>${t.speakers.map(escapeHtml).join(', ')}</p>${t.speakerScope==='event'?'<p>La fuente anuncia estos nombres para el encuentro, sin asignarlos individualmente a esta charla.</p>':''}</section>`).join('');
    return `<section class="archive-detail-view tv-detail-view">${headerHtml(escapeHtml(e.title),'VIDEOTECA · CINTA','Volver al estante',back,standalone)}<article class="event-detail"><p><time datetime="${e.date}">${dateLabel(e.date)}</time> · ${e.talks.length} ${e.talks.length===1?'charla':'charlas'}</p><p class="event-speakers">Participantes anunciados: ${e.speakers.map(escapeHtml).join(', ')}.</p>${e.summary?`<p>${escapeHtml(e.summary)}</p>`:''}${selection}<a class="${videos.length?'event-source-link':'primary-link'}" href="${escapeHtml(e.sourceUrl)}">Ver el evento en Meetup ↗</a>${talks}<p class="archive-source-note">La programación no confirma asistencia. Los videos conservan su atribución al evento o a la charla.</p><a href="${back}" class="archive-back" ${standalone?'':'data-archive-back'}>← Volver al estante</a></article></section>`;
  }
  const cards=r.events.slice((r.page-1)*PAGE_SIZE,r.page*PAGE_SIZE).map(e=>`<a class="vhs-tape" id="event-${e.id}" data-event-id="${e.id}" ${standalone?'':'data-archive-route'} href="${href({year:r.year,page:r.page,id:e.id})}" aria-label="${escapeHtml(e.title)} · ${dateLabel(e.date)}"><span class="vhs-date">${monthLabel(e.date)}</span><span class="vhs-title">${escapeHtml(e.title)}</span><small>${eventVideos(e).length?'Con video':'Ficha del encuentro'}</small></a>`);
  return boardHtml(r,{...options,title:'Cintas',intro:'Una cinta por encuentro. Elige una para consultar su programa o encender la TV.',cards,total:r.events.length,unit:'eventos'});
}
