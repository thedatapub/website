import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { peopleForYear,peopleYears,resolvePeople,renderPeople } from '../site/assets/js/people-view.js';
import { parseHash,renderArchive } from '../site/assets/js/archive-view.js';
const people=JSON.parse(await readFile('site/assets/data/people.json','utf8'));
const events=JSON.parse(await readFile('site/assets/data/talks.json','utf8'));
test('canonical identities join evidenced aliases but keep unresolved names separate',()=>{
  const jesus=people.people.find(p=>p.id==='jesus-ramos');
  assert(jesus.appearances.length>5);
  assert(jesus.appearances.some(a=>a.nameInSource==='Chucho Ramos'));
  assert.equal(peopleForYear(people,2016).filter(p=>p.id===jesus.id).length,1);
  const carlos=people.people.find(p=>p.id==='carlos-alberto-haro');
  assert.deepEqual(carlos.years,[2026,2023]);
  for(const year of carlos.years)assert.equal(resolvePeople(people,{year,id:carlos.id}).person,carlos);
  assert.equal(people.people.filter(p=>p.name==='Jorge Rotter').length,2);
  const hermilio=people.people.find(p=>p.id==='hermilo-cortes-gonzalez');
  assert.deepEqual(hermilio.years,[2025,2024]);
  assert.deepEqual(hermilio.appearances.map(a=>[a.eventId,a.nameInSource,a.talkIds]),[
    ['301041360','Hermilo Cortés González',['301041360-1']],
    ['311027455','Hermilio Cortés',['311027455-1']],
  ]);
  for(const year of hermilio.years)assert.equal(peopleForYear(people,year).filter(p=>p.id===hermilio.id).length,1);
  assert(!people.unresolvedVariants.flat().includes(hermilio.id));
  assert(!people.people.some(p=>p.name.includes('Data Management Association')));
  assert.equal(people.excluded.length,1);
});
test('all people-year editions are deduplicated, chronological and paginated without truncation',()=>{
  assert.equal(resolvePeople(people).year,2026);
  for(const year of peopleYears(people)) {
    const ordered=peopleForYear(people,year);
    assert.equal(new Set(ordered.map(p=>p.id)).size,ordered.length);
    const dates=ordered.map(p=>p.appearances.filter(a=>a.year===year).map(a=>a.date).sort()[0]);
    assert.deepEqual(dates,[...dates].sort());
    const ids=[];
    for(let page=1;page<=Math.ceil(ordered.length/12);page++) {
      const html=renderPeople(people,events,{year,page});
      assert.equal((html.match(/class="(?:person-plaque|plaque-slot)"/g)||[]).length,12);
      ids.push(...[...html.matchAll(/data-person-id="([^"]+)"/g)].map(m=>m[1]));
    }
    assert.deepEqual(ids,ordered.map(p=>p.id));
  }
  assert(peopleForYear(people,2016).length>12);
});
test('participations preserve sourced roles and never infer attendance or individual articles',()=>{
  for(const p of people.people)for(const a of p.appearances) {
    const e=events.events.find(e=>e.id===a.eventId);
    assert(e.provenance.speakerNames.includes(a.nameInSource));
    assert.equal(a.status,'announced_not_attendance_verified');
    assert.equal(a.evidenceUrl,e.sourceUrl);
  }
  const uncertain=people.people.filter(p=>p.appearances.some(a=>a.eventId==='287873923'));
  assert.equal(uncertain.length,2);
  assert(uncertain.every(p=>p.appearances.find(a=>a.eventId==='287873923').talkIds.length===0));
  assert(people.people.every(p=>p.articles.length===0));
  const html=renderPeople(people,events,{id:'javier-luraschi'});
  assert.match(html,/Fuente de atribución/);
  assert.doesNotMatch(html,/Barman|iframe/);
});
test('numeric legacy hashes use TV while person hashes stay in Speakers; only valid video selections render a player stage',()=>{
  assert.equal(parseHash('#speakers/2018/1/249335412-1').kind,'tv');
  assert.equal(parseHash('#speakers/2026/1/carlos-alberto-haro').kind,'speakers');
  assert.doesNotMatch(renderArchive(events,{id:'249335412'}),/<iframe/);
  assert.match(renderArchive(events,{id:'249335412',video:'lBho-kM71D0'}),/data-play-video/);
  assert.doesNotMatch(renderArchive(events,{id:'249335412',video:'AAAAAAAAAAA'}),/data-play-video/);
  assert.doesNotMatch(renderArchive(events,{id:'227040566'}),/Ver ahora/);
});
