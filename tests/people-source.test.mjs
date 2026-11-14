import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileArchive} from '../scripts/archive-model.mjs';
import {renderPeople,resolvePeople} from '../site/assets/js/people-view.js';
import {editionLabel,renderArchive} from '../site/assets/js/archive-view.js';
const sources=Object.fromEntries(['people','events','talks','articles'].map(k=>[k,JSON.parse(readFileSync(`data/${k}.json`))]));
const profile=id=>({id,name:`Persona ${id}`,bio:null,links:[],aliases:[],previousIds:[],identityBasis:'Fixture',identityReview:'single_source'});
test('normalized profile, talk and article edits flow through canonical joins without reverse links',()=>{
 const s=structuredClone(sources),p=s.people.people.find(p=>p.id==='carlos-alberto-haro');
 p.name='Nombre editado';p.bio.text='Semblanza editada';
 s.talks.talks.find(t=>t.id==='316979242-1').title='Título editado desde charlas';
 Object.assign(s.articles.articles[0],{title:'Artículo editado',authorIds:[p.id],authorEvidenceUrl:'https://example.org/attribution'});delete s.articles.articles[0].authorLabel;
 const r=compileArchive(s),html=renderPeople(r.peopleData,r.eventsData,{id:p.id});
 for(const text of [p.name,p.bio.text,'Título editado desde charlas','Artículo editado'])assert(html.includes(text),text);
 assert.deepEqual(r.peopleData.people.find(x=>x.id===p.id).appearances.map(a=>a.nameInSource),compileArchive(sources).peopleData.people.find(x=>x.id===p.id).appearances.map(a=>a.nameInSource));
 assert.equal(r.posts[0].author,p.name);assert(renderArchive(r.eventsData,{id:'316979242'}).includes(p.name));
 assert(!('participations' in p)&&!('articles' in p));
});
test('new profiles and talks accept canonical IDs without a source participant ID, supporting multiple people and talks',()=>{
 const s=structuredClone(sources),a=profile('test-a'),b=profile('test-b'),empty=profile('test-empty');s.people.people.push(a,b,empty);
 const base={eventId:'316979242',kind:'Charla',speakerScope:'session',speakerIds:[a.id,b.id],moderatorIds:[],otherSpeakers:[],videos:[]};
 s.talks.talks.push({...base,id:'test-talk-one',title:'Primera charla'},{...base,id:'test-talk-two',title:'Segunda charla'});
 const r=compileArchive(s),person=r.peopleData.people.find(p=>p.id===a.id);
 assert.deepEqual(person.appearances[0].talkIds,['test-talk-one','test-talk-two']);
 assert.equal(r.eventsData.events.find(e=>e.id==='316979242').talks.length,3);
 assert.equal(r.peopleData.people.find(p=>p.id===b.id).appearances.length,1);
 assert.equal(resolvePeople(r.peopleData,{id:empty.id}).page,1);
 assert(renderPeople(r.peopleData,r.eventsData,{id:empty.id}).includes('Sin participaciones registradas'));
});
test('merging a profile changes referencing entities, retaining histories, authored articles and previous profile routes',()=>{
 const s=structuredClone(sources),target=s.people.people.find(p=>p.id==='carlos-alberto-haro'),from=profile('test-merge-source');s.people.people.push(from);
 s.talks.talks.push({id:'test-merge-talk',title:'Merge fixture',eventId:'311027455',kind:'Charla',speakerScope:'session',speakerIds:[from.id],moderatorIds:[],otherSpeakers:[],videos:[]});
 s.articles.articles.push({id:'test-merge-article',kind:'external',title:'Merge article',url:'https://example.org/article',authorIds:[from.id],authorEvidenceUrl:'https://example.org/author'});
 const total=r=>r.peopleData.people.reduce((n,p)=>n+p.appearances.length,0),before=compileArchive(s);
 for(const t of s.talks.talks){t.speakerIds=t.speakerIds.map(id=>id===from.id?target.id:id);t.moderatorIds=t.moderatorIds.map(id=>id===from.id?target.id:id);}
 for(const a of s.articles.articles)a.authorIds=a.authorIds.map(id=>id===from.id?target.id:id);
 s.people.people=s.people.people.filter(p=>p.id!==from.id);target.previousIds.push(from.id);target.aliases.push(from.name);
 const after=compileArchive(s);assert.equal(total(after),total(before));
 assert.equal(resolvePeople(after.peopleData,{id:from.id}).person.id,target.id);
 assert(after.peopleData.people.find(p=>p.id===target.id).articles.some(a=>a.id==='test-merge-article'));
});
test('references, duplicates, scope, URLs and duplicate authority are validated before generation',()=>{
 const cases=[
  s=>s.people.people[1].id=s.people.people[0].id,
  s=>s.talks.talks[0].eventId='missing',
  s=>s.talks.talks[0].speakerIds=['missing'],
  s=>s.talks.talks[0].speakerIds=[s.people.people[0].id,s.people.people[0].id],
  s=>s.articles.articles[0].authorIds=['missing'],
  s=>{s.articles.articles[0].authorIds=[s.people.people[0].id];delete s.articles.articles[0].authorLabel;},
  s=>s.people.people[0].links.push({label:'Bad',url:'javascript:alert(1)',evidenceUrl:'https://example.org'}),
  s=>s.people.people[0].links.push({label:'Bad',url:'https://name:secret@example.org',evidenceUrl:'https://example.org'}),
  s=>s.people.people[0].participations=[],
  s=>s.people.people[0].articles=[],
  s=>s.talks.talks[0].date='2026-11-14',
  s=>s.talks.talks[0].speakerScope='event',
  s=>s.people.people[0].previousIds.push(s.people.people[1].id),
  s=>s.events.events[0].date='2026-02-30',
  s=>s.talks.talks.push(structuredClone(s.talks.talks[0])),
 ];
 for(const mutate of cases){const s=structuredClone(sources);mutate(s);assert.throws(()=>compileArchive(s));}
});
test('Hermilio is joined solely by canonical speakerIds and ambiguous event-only participation stays unassigned to talks',()=>{
 const s=structuredClone(sources),r=compileArchive(s),p=r.peopleData.people.find(p=>p.id==='hermilo-cortes-gonzalez');
 assert.deepEqual(p.appearances.map(a=>[a.eventId,a.nameInSource]),[['301041360','Hermilo Cortés González'],['311027455','Hermilio Cortés']]);
 for(const id of ['301041360-1','311027455-1'])assert(s.talks.talks.find(t=>t.id===id).speakerIds.includes(p.id));
 const ambiguous=r.peopleData.people.flatMap(p=>p.appearances.filter(a=>a.eventId==='287873923'));assert.equal(ambiguous.length,2);assert(ambiguous.every(a=>a.scope==='event'&&a.talkIds.length===0));
 assert.equal(editionLabel('2026-09-30'),'Data Pub · Septiembre 2026');assert.equal(editionLabel('2026-11-01'),'Data Pub · Noviembre 2026');
 assert(r.posts.every(p=>p.authorIds.length===0));
});

test('templates are valid replacement records, never an extra source',()=>{
 const s=structuredClone(sources);
 for(const [file,key] of [['person','people'],['talk','talks'],['article','articles']]){const record=JSON.parse(readFileSync(`data/templates/${file}.json`));const list=s[key][key];list[list.findIndex(x=>x.id===record.id)]=record;}
 assert.equal(compileArchive(s).peopleData.people.length,sources.people.people.length);
});
