import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const required=(v,label)=>assert(typeof v==='string'&&v.trim(),`${label}: nonempty string required`);
const fields=(v,allowed,label)=>{assert(v&&typeof v==='object'&&!Array.isArray(v),`${label}: object required`);for(const key of Object.keys(v))assert(allowed.includes(key),`${label}: unknown field ${key}`);};
const list=(v,label)=>assert(Array.isArray(v),`${label}: array required`);
const unique=(v,label)=>{list(v,label);assert.equal(new Set(v).size,v.length,`${label}: duplicates`);};
const strings=(v,label)=>{unique(v,label);for(const s of v)required(s,label);};
const id=(v,label)=>assert(typeof v==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v),`${label}: invalid ID`);
const url=(v,label)=>{required(v,label);let u;try{u=new URL(v);}catch{assert.fail(`${label}: invalid URL`);}assert(['https:','http:'].includes(u.protocol)&&u.hostname&&!u.username&&!u.password,`${label}: HTTP(S) URL without credentials required`);};
const date=(v,label)=>assert(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,`${label}: invalid ISO date`);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const years=values=>[...new Set(values)].sort((a,b)=>b-a);
const monthDate=v=>new Intl.DateTimeFormat('es-MX',{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${v}T12:00:00Z`));
const roles=['Ponencia','Moderación'];
function index(records,label){list(records,label);const map=new Map();for(const r of records){id(r.id,label);assert(!map.has(r.id),`${label}: duplicate ID ${r.id}`);map.set(r.id,r);}return map;}
function provenance(p,label){if(p===undefined)return;fields(p,['speakerNames','moderatorNames','nameInSource'],label);for(const k of ['speakerNames','moderatorNames'])if(p[k]!==undefined)strings(p[k],label);if(p.nameInSource!==undefined)required(p.nameInSource,label);}
function videos(vs,label){list(vs,label);unique(vs.map(v=>v.url),label);for(const v of vs){fields(v,['url','title','publisher','publisherUrl','evidenceUrl','checkedAt','matchBasis','playbackVerified'],label);assert(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(v.url),`${label}: specific YouTube URL required`);for(const k of ['title','publisher','matchBasis'])required(v[k],`${label}.${k}`);url(v.evidenceUrl,label);if(v.publisherUrl!==undefined)url(v.publisherUrl,label);date(v.checkedAt,label);assert(typeof v.playbackVerified==='boolean',`${label}: playbackVerified required`);}}
export function compileArchive(sources) {
 const {people:ps,events:es,talks:ts,articles:ars}=sources;
 fields(ps,['schemaVersion','checkedAt','source','people','unresolvedVariants'],'people source');
 fields(es,['schemaVersion','snapshotDate','events'],'events source');fields(ts,['schemaVersion','talks'],'talks source');fields(ars,['schemaVersion','articles'],'articles source');
 for(const source of [ps,es,ts,ars])assert.equal(source.schemaVersion,1,'Normalized source schemaVersion must be 1');
 date(ps.checkedAt,'people.checkedAt');required(ps.source,'people.source');date(es.snapshotDate,'events.snapshotDate');
 const people=index(ps.people,'people'),events=index(es.events,'events'),talks=index(ts.talks,'talks'),articles=index(ars.articles,'articles'),oldIds=new Set();
 const refs=(ids,label)=>{unique(ids,label);for(const ref of ids)assert(people.has(ref),`${label}: unknown canonical person ID ${ref}`);};
 for(const p of people.values()){
  fields(p,['id','name','aliases','previousIds','identityBasis','identityReview','bio','links'],'person');required(p.name,'person.name');required(p.identityBasis,'person.identityBasis');
  assert(['single_source','reviewed_join','unresolved_same_name'].includes(p.identityReview),'Invalid identityReview');
  strings(p.aliases,'person.aliases');strings(p.previousIds,'person.previousIds');
  for(const previous of p.previousIds){id(previous,'previousId');assert(!people.has(previous)&&!oldIds.has(previous),`Conflicting previous profile ID ${previous}`);oldIds.add(previous);}
  if(p.bio!==null){fields(p.bio,['text','asOf','evidenceUrl'],'bio');required(p.bio.text,'bio.text');date(p.bio.asOf,'bio.asOf');url(p.bio.evidenceUrl,'bio.evidenceUrl');}
  list(p.links,'person.links');unique(p.links.map(l=>l.url),'person.links');for(const l of p.links){fields(l,['label','url','evidenceUrl'],'link');required(l.label,'link.label');url(l.url,'link.url');url(l.evidenceUrl,'link.evidenceUrl');}
 }
 list(ps.unresolvedVariants,'unresolvedVariants');for(const group of ps.unresolvedVariants){refs(group,'unresolvedVariants');assert(group.length>1,'Unresolved group needs two identities');}
 for(const e of events.values()){
  fields(e,['id','title','date','timezone','sourceUrl','sourceRetrievedAt','evidenceStatus','summary','evidenceUrl','participants','provenance','videos'],'event');
  required(e.title,'event.title');date(e.date,'event.date');required(e.timezone,'event.timezone');new Intl.DateTimeFormat('en',{timeZone:e.timezone});url(e.sourceUrl,'event.sourceUrl');required(e.sourceRetrievedAt,'event.sourceRetrievedAt');assert(!Number.isNaN(Date.parse(e.sourceRetrievedAt)),'Invalid retrieval timestamp');
  assert.equal(e.evidenceStatus,'past_public_listing_not_attendance_verified');if(e.summary!==undefined){required(e.summary,'event.summary');url(e.evidenceUrl,'event summary evidence');}
  list(e.participants,'event.participants');refs(e.participants.map(p=>p.personId),'event.participants');
  for(const p of e.participants){fields(p,['personId','roles','provenance','evidenceUrl','note'],'event participation');strings(p.roles,'participation roles');assert(p.roles.every(r=>roles.includes(r)),'Invalid participation role');provenance(p.provenance,'participation provenance');if(p.evidenceUrl!==undefined)url(p.evidenceUrl,'participation evidence');if(p.note!==undefined)required(p.note,'participation note');}
  provenance(e.provenance,'event provenance');videos(e.videos,`event ${e.id} videos`);
 }
 for(const t of talks.values()){
  fields(t,['id','eventId','title','kind','speakerScope','speakerIds','moderatorIds','otherSpeakers','provenance','videos','evidenceUrl','note'],'talk');
  assert(events.has(t.eventId),`Talk ${t.id}: unknown event ${t.eventId}`);required(t.title,'talk.title');required(t.kind,'talk.kind');assert(['session','event'].includes(t.speakerScope),'Invalid talk speakerScope');
  refs(t.speakerIds,`talk ${t.id} speakerIds`);refs(t.moderatorIds,`talk ${t.id} moderatorIds`);
  assert(!t.speakerIds.some(id=>t.moderatorIds.includes(id)),`Talk ${t.id}: choose one role per person`);
  if(t.speakerScope==='event')assert(t.speakerIds.length+t.moderatorIds.length===0,'Event-scope talks must not assign individual speakers');
  for(const id of [...t.speakerIds,...t.moderatorIds])assert(!events.get(t.eventId).participants.some(p=>p.personId===id),`Duplicate event/talk assignment for ${id}; remove event-only participation`);
  list(t.otherSpeakers,'otherSpeakers');unique(t.otherSpeakers.map(o=>o.name),'otherSpeakers');for(const o of t.otherSpeakers){fields(o,['name','reason'],'otherSpeaker');required(o.name,'otherSpeaker.name');required(o.reason,'otherSpeaker.reason');}
  provenance(t.provenance,'talk provenance');videos(t.videos,`talk ${t.id} videos`);if(t.evidenceUrl!==undefined)url(t.evidenceUrl,'talk evidence');if(t.note!==undefined)required(t.note,'talk note');
 }
 const slugs=new Set();
 for(const a of articles.values()){
  fields(a,['id','kind','slug','title','date','summary','note','blocks','url','authorIds','authorLabel','authorEvidenceUrl'],'article');
  assert(['local','external'].includes(a.kind),'Invalid article kind');required(a.title,'article.title');refs(a.authorIds,`article ${a.id} authorIds`);
  if(a.authorIds.length){url(a.authorEvidenceUrl,'article author evidence');assert(!a.authorLabel,'Do not duplicate named authors in authorLabel');}else required(a.authorLabel,'Unattributed article needs collective/unknown author label');
  if(a.authorEvidenceUrl!==undefined)url(a.authorEvidenceUrl,'article author evidence');
  if(a.kind==='local'){
   id(a.slug,'article.slug');assert(!slugs.has(a.slug),'Duplicate article slug');slugs.add(a.slug);assert(a.url===undefined,'Local article URL is derived');date(a.date,'article.date');required(a.summary,'article.summary');required(a.note,'article.note');list(a.blocks,'article.blocks');
   for(const b of a.blocks){fields(b,['title','paragraphs','steps'],'article block');required(b.title,'block title');list(b.paragraphs,'block paragraphs');for(const p of b.paragraphs)required(p,'paragraph');if(b.steps!==undefined){list(b.steps,'block steps');for(const step of b.steps)required(step,'step');}}
  }else {url(a.url,'article.url');assert(a.slug===undefined&&a.blocks===undefined,'External articles have no local slug/blocks');if(a.date!==undefined)date(a.date,'article.date');}
 }
 const allMedia=[];
 const withVideos=(vs,eventId,talkId)=>vs.map(v=>{const result={...v,eventId,scope:talkId?'talk':'event',...(talkId?{talkId}:{})};allMedia.push(result);return result;});
 const originalName=(p,e)=>e.provenance?.speakerNames?.find(n=>[p.name,...p.aliases].includes(n))||p.name;
 const grouped=es.events.map(e=>{
  const selected=ts.talks.filter(t=>t.eventId===e.id),allIds=[...new Set([...selected.flatMap(t=>[...t.speakerIds,...t.moderatorIds]),...e.participants.map(p=>p.personId)])];
  const names=allIds.map(id=>people.get(id).name),others=[...new Set(selected.flatMap(t=>t.otherSpeakers.map(o=>o.name)))];
  const materialized=selected.map(t=>({...t,date:e.date,year:Number(e.date.slice(0,4)),speakers:t.speakerScope==='event'?e.participants.map(p=>people.get(p.personId).name):[...t.speakerIds,...t.moderatorIds].map(id=>people.get(id).name).concat(t.otherSpeakers.map(o=>o.name)),moderators:t.moderatorIds.map(id=>people.get(id).name),sourceEventId:e.id,sourceTitle:e.title,sourceUrl:t.evidenceUrl||e.sourceUrl,sourceRetrievedAt:e.sourceRetrievedAt,evidenceStatus:e.evidenceStatus,videos:withVideos(t.videos,e.id,t.id)}));
  return {...e,year:Number(e.date.slice(0,4)),speakers:[...names,...others],participants:allIds.map(id=>({id,name:people.get(id).name})),talks:materialized,videos:withVideos(e.videos,e.id)};
 }).sort((a,b)=>b.year-a.year||a.date.localeCompare(b.date)||a.id.localeCompare(b.id,'en',{numeric:true}));
 for(const e of grouped){const urls=[...e.videos,...e.talks.flatMap(t=>t.videos)].map(v=>v.url);unique(urls,`Duplicate video association in event ${e.id}`);}
 const profiles=ps.people.map(p=>{
  const appearances=grouped.flatMap(e=>{
   const assigned=e.talks.filter(t=>t.speakerIds.includes(p.id)||t.moderatorIds.includes(p.id));
   // Derived event participants use {id,name}; canonical event-only references are in events.
   const reference=events.get(e.id).participants.find(x=>x.personId===p.id);
   if(!assigned.length&&!reference)return [];
   const evidenceUrls=[...new Set(reference?[reference.evidenceUrl||e.sourceUrl]:assigned.map(t=>t.sourceUrl))];
   return [{eventId:e.id,nameInSource:reference?.provenance?.nameInSource||originalName(p,e),date:e.date,year:e.year,evidenceUrl:evidenceUrls[0],...(evidenceUrls.length>1?{evidenceUrls}:{}),status:'announced_not_attendance_verified',talkIds:assigned.map(t=>t.id),scope:reference?'event':'talk',roles:reference?reference.roles:[...new Set(assigned.map(t=>t.moderatorIds.includes(p.id)?'Moderación':'Ponencia'))],...(reference?.note?{note:reference.note}:{})}];
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.eventId.localeCompare(b.eventId));
  const contributions=ars.articles.filter(a=>a.authorIds.includes(p.id)).map(a=>({id:a.id,title:a.title,url:a.kind==='local'?`blog/${a.slug}/`:a.url,...(a.date?{date:a.date}:{}),evidenceUrl:a.authorEvidenceUrl}));
  return {...p,appearances,years:years(appearances.map(a=>a.year)),articles:contributions};
 });
 const excluded=grouped.flatMap(e=>e.talks.flatMap(t=>t.otherSpeakers.map(o=>({eventId:e.id,...o}))));
 const posts=ars.articles.filter(a=>a.kind==='local').map(a=>({...a,dateLabel:monthDate(a.date),author:a.authorIds.length?a.authorIds.map(id=>people.get(id).name).join(', '):a.authorLabel}));
 const sourceHashes=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,hash(v)]));
 return {eventsData:{schemaVersion:3,snapshotDate:es.snapshotDate,sourceCount:grouped.length,talkCount:talks.size,sourceHashes,mediaCoverage:{videos:allMedia.length,events:new Set(allMedia.map(v=>v.eventId)).size,playbackVerified:false},events:grouped},peopleData:{schemaVersion:3,checkedAt:ps.checkedAt,sourceHashes,people:profiles,excluded,unresolvedVariants:ps.unresolvedVariants},posts};
}
