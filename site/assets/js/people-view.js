import { PAGE_SIZE, escapeHtml as esc, dateLabel, destination, headerHtml, boardHtml } from './archive-view.js';
export const peopleYears=data=>[...new Set(data.people.flatMap(p=>p.years))].sort((a,b)=>b-a);
export function peopleForYear(data,year) {
  const first=p=>p.appearances.filter(a=>a.year===year).map(a=>a.date).sort()[0];
  return data.people.filter(p=>p.years.includes(year)).sort((a,b)=>first(a).localeCompare(first(b))||a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
}
export function resolvePeople(data,route={}) {
  const years=peopleYears(data),person=data.people.find(p=>p.id===route.id||p.previousIds?.includes(route.id));
  const requested=Number(route.year);
  const year=person?(person.years.includes(requested)?requested:(person.years[0]??years[0])):(years.includes(requested)?requested:years[0]);
  const people=peopleForYear(data,year),pages=Math.max(1,Math.ceil(people.length/PAGE_SIZE));
  const page=person?Math.max(1,Math.floor(people.indexOf(person)/PAGE_SIZE)+1):Math.max(1,Math.min(pages,Math.trunc(Number(route.page)||1)));
  return {kind:'speakers',year,page,pages,person,people,years};
}
export function renderPeople(data,events,route={},options={}) {
  const {standalone=false,prefix=''}=options,r=resolvePeople(data,route);
  const href=route=>destination({kind:'speakers',...route},standalone,prefix);
  const board=href({year:r.year,page:r.page})+(standalone&&r.person?`#person-${r.person.id}`:'');
  if(r.person) {
    const p=r.person;
    const appearances=p.appearances.map(a=>{
      const e=events.events.find(e=>e.id===a.eventId);
      const talks=e.talks.filter(t=>a.talkIds.includes(t.id));
      const eventHref=destination({kind:'tv',year:e.year,id:e.id},standalone,prefix);
      return `<section class="person-contribution"><h2>${dateLabel(a.date)}</h2><p>${esc(e.title)} · ${a.roles.map(esc).join(', ')||'Participación anunciada'}</p>${a.nameInSource!==p.name?`<p class="archive-source-note">Nombre en la fuente: ${esc(a.nameInSource)}.</p>`:''}${a.scope==='event'?'<p>Participación anunciada en el encuentro; sin atribución individual de charla en esta ficha.</p>':''}${a.note?`<p class="participation-note">${esc(a.note)}</p>`:''}<ul>${talks.map(t=>`<li>${esc(t.title)}${t.videos.map(v=>` · <a href="${esc(v.url)}">Video de la charla ↗</a>`).join('')}</li>`).join('')}</ul><a href="${eventHref}" ${standalone?'':'data-archive-route'}>Abrir la cinta del encuentro →</a> · <a href="${esc(a.evidenceUrl)}">Fuente de participación ↗</a>${(a.evidenceUrls||[]).slice(1).map(url=>` · <a href="${esc(url)}">Fuente adicional ↗</a>`).join('')}</section>`;
    }).join('');
    const bio=p.bio?`<p class="person-bio">${esc(p.bio.text)}</p><p class="archive-source-note">Semblanza según la <a href="${esc(p.bio.evidenceUrl)}">fuente del ${dateLabel(p.bio.asOf)}</a>.</p>`:`<p class="person-bio">${p.appearances.length?'Sus aportaciones a la comunidad están documentadas en las fichas de estos encuentros.':'Perfil de la comunidad.'}</p>`;
    const links=p.links.length?`<section><h2>Perfiles profesionales</h2><ul>${p.links.map(l=>`<li><a href="${esc(l.url)}">${esc(l.label)} ↗</a> · <a href="${esc(l.evidenceUrl)}">Fuente de atribución</a></li>`).join('')}</ul></section>`:'';
    const articles=p.articles.length?`<section><h2>Artículos</h2><ul>${p.articles.map(a=>`<li><a href="${esc(a.url.startsWith('blog/')?prefix+a.url:a.url)}">${esc(a.title)}</a> · <a href="${esc(a.evidenceUrl)}">Atribución</a></li>`).join('')}</ul></section>`:'';
    const years=standalone?`<nav class="profile-years" aria-label="Volver a una edición">${p.years.map(year=>{const pr=resolvePeople(data,{id:p.id,year});return `<a href="${href({year,page:pr.page})}#person-${p.id}">Edición ${year}</a>`;}).join(' · ')}</nav>`:'';
    return `<section class="archive-detail-view person-detail-view">${headerHtml(esc(p.name),'SPEAKERS · RECONOCIMIENTO','Volver al tablero',board,standalone)}<article class="event-detail person-detail">${bio}${p.identityReview==='unresolved_same_name'?'<p class="identity-note">Este registro conserva la identidad anunciada en esta edición; no se ha unido a otros registros del mismo nombre.</p>':''}${p.years.length?`<p>Ediciones: ${p.years.join(', ')}. Participaciones anunciadas; asistencia no verificada.</p>`:'<p>Sin participaciones registradas todavía.</p>'}${appearances}${links}${articles}${years}<a class="archive-back" href="${board}" ${standalone?'':'data-archive-back'}>← Volver al tablero</a></article></section>`;
  }
  const cards=r.people.slice((r.page-1)*PAGE_SIZE,r.page*PAGE_SIZE).map(p=>`<a class="person-plaque" id="person-${p.id}" data-person-id="${p.id}" ${standalone?'':'data-archive-route'} href="${href({year:r.year,page:r.page,id:p.id})}" aria-label="${esc(p.name)} · Edición ${r.year}"><span class="plaque-star" aria-hidden="true">✦</span><span>${esc(p.name)}</span></a>`);
  return boardHtml(r,{...options,title:'Speakers',intro:'Personas que han compartido su conocimiento. Una placa por persona en cada edición.',cards,total:r.people.length,unit:'participantes'});
}
