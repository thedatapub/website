import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveRoute, yearsFor, PAGE_SIZE, parseHash, renderArchive } from '../site/assets/js/archive-view.js';
const data = JSON.parse(await readFile('site/assets/data/talks.json', 'utf8'));
const curation = JSON.parse(await readFile('data/talks.json', 'utf8')).talks;
const source = JSON.parse(await readFile('data/provenance/meetup-public-2026-11-12.json', 'utf8'));
const counts = {2015:1,2016:11,2017:7,2018:2,2019:7,2020:3,2021:11,2022:11,2023:6,2024:10,2025:10,2026:7};

test('86 event tapes preserve all 137 curated talks, speakers, sources and local dates', () => {
  assert.equal(data.events.length, 86);
  assert.equal(new Set(data.events.map(e => e.id)).size, 86);
  const talks = data.events.flatMap(e => e.talks);
  assert.equal(talks.length, 137);
  assert.equal(new Set(talks.map(t => t.id)).size, 137);
  for (const event of data.events) {
    assert.deepEqual(event.provenance.speakerNames, source.events.find(e => e.event_id === event.id).speakers);
    assert.equal(event.talks.length, curation.filter(t=>t.eventId===event.id).length);
    assert.ok(event.date < data.snapshotDate);
    assert.match(event.sourceUrl, /^https:\/\/www\.meetup\.com\/thedatapub\/events\/\d+\/$/);
    event.talks.forEach((t, i) => {
      assert.equal(t.id, `${event.id}-${i + 1}`);
      assert.equal(t.title, curation.find(x=>x.id===t.id).title);
      assert.equal(t.sourceEventId, event.id);
    });
  }
  assert.equal(data.events.find(e => e.id === '316589287').date, '2026-09-30');
  assert.ok(data.events.find(e => e.id === '287873923').talks.every(t => t.speakerScope === 'event'));
});
test('latest year remains default; all years run oldest to newest and reserve twelve slots', () => {
  assert.equal(resolveRoute(data).year, 2026);
  assert.deepEqual(yearsFor(data), Object.keys(counts).map(Number).reverse());
  for (const year of yearsFor(data)) {
    const route = resolveRoute(data, {year});
    assert.equal(route.events.length, counts[year]);
    assert.deepEqual(route.events.map(e => e.date), route.events.map(e => e.date).sort());
    assert.deepEqual(data.events.filter(e => e.year === year).map(e => e.id), route.events.map(e => e.id));
    const html = renderArchive(data, {year});
    assert.equal((html.match(/class="(?:vhs-tape|plaque-slot)"/g) || []).length, PAGE_SIZE);
    assert.equal((html.match(/class="vhs-tape"/g) || []).length, counts[year]);
  }
});
test('synthetic years over 12 paginate in local chronological order without loss', () => {
  const fixture = {...data, events: Array.from({length:25}, (_,i) => ({...data.events[0], id:String(900000000+i), date:`2026-01-${String(i+1).padStart(2,'0')}`, talks:[]})).reverse()};
  const seen=[];
  for (let page=1;page<=3;page++) {
    const r=resolveRoute(fixture,{year:2026,page});
    assert.equal(r.pages,3);
    seen.push(...r.events.slice((page-1)*12,page*12).map(e=>e.id));
    assert.equal((renderArchive(fixture,{year:2026,page}).match(/class="(?:vhs-tape|plaque-slot)"/g)||[]).length,12);
  }
  assert.equal(new Set(seen).size,25);
  assert.equal(seen[0],'900000000');
  assert.equal(resolveRoute(fixture,{id:'900000024'}).page,3);
  assert.equal(resolveRoute(fixture,{page:999}).page,3);
});
test('April 2018 is one event with two talks and two specifically scoped recordings', () => {
  const event=data.events.find(e=>e.id==='249335412');
  assert.equal(event.talks.length,2);
  assert.equal(event.videos.length,0);
  assert.deepEqual(event.talks.map(t=>t.videos.length),[1,1]);
  const html=renderArchive(data,{id:event.id});
  for(const value of ['Will Wolf','Paco Mekler','lBho-kM71D0','kYzCRUdlOmE',event.sourceUrl]) assert.ok(html.includes(value));
  assert.equal((renderArchive(data,{year:2018}).match(/data-event-id="249335412"/g)||[]).length,1);
  const videos=data.events.flatMap(e=>[...e.videos,...e.talks.flatMap(t=>t.videos)]);
  assert.equal(videos.length,18);
  assert.equal(new Set(videos.map(v=>v.eventId)).size,17);
  assert.ok(videos.every(v=>/^https:\/\/www.youtube.com\/watch\?v=[\w-]{11}$/.test(v.url) && !v.playbackVerified));
});
test('legacy links resolve to whole events, static exits target board and public content is escaped', () => {
  const legacy=parseHash('#speakers/2018/1/249335412-2');
  assert.equal(resolveRoute(data,legacy).event.id,'249335412');
  assert.equal(parseHash('#other'),null);
  const html=renderArchive(data,legacy,{standalone:true,prefix:'../../../'});
  assert.match(html,/href="\.\.\/\.\.\/\.\.\/tv\/2018\/1\/#event-249335412"/);
  const malicious={...data,events:[{...data.events[0],title:'<img src=x onerror=alert(1)>'}]};
  const escaped=renderArchive(malicious,{id:malicious.events[0].id});
  assert.ok(escaped.includes('&lt;img'));
  assert.ok(!escaped.includes('<img src=x'));
});
