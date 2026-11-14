// Full source edits are exercised only in a disposable copy. The working source stays read-only.
import {mkdtemp,cp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const dir=await mkdtemp(join(tmpdir(),'tdp-normalized-edit-'));let server,browser;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
try {
 for(const name of ['scripts','src','data','site'])await cp(name,join(dir,name),{recursive:true});
 await mkdir(join(dir,'art'));await cp('art/export-manifest.json',join(dir,'art/export-manifest.json'));await cp('package.json',join(dir,'package.json'));
 const sources=Object.fromEntries(await Promise.all(['people','talks','articles','events'].map(async k=>[k,JSON.parse(await readFile(join(dir,`data/${k}.json`),'utf8'))])));
 const originalCount=sources.people.people.length;
 const p=sources.people.people.find(p=>p.id==='carlos-alberto-haro');
 p.name='Nombre de prueba temporal';p.bio.text='Semblanza editada solo en people.json.';
 const newPerson={id:'persona-temporal',name:'Persona nueva temporal',identityBasis:'Fixture de prueba, no dato publicado',identityReview:'single_source',aliases:[],previousIds:[],bio:null,links:[]};sources.people.people.push(newPerson);
 const talk=sources.talks.talks.find(t=>t.id==='316979242-1');talk.title='Charla editada solo en talks.json';talk.speakerIds.push(newPerson.id);
 sources.talks.talks.push({id:'charla-temporal-dos',eventId:'316979242',title:'Segunda charla temporal',kind:'Charla',speakerScope:'session',speakerIds:[newPerson.id],moderatorIds:[],otherSpeakers:[],videos:[]});
 const article=sources.articles.articles[0];article.title='Artículo editado solo en articles.json';article.authorIds=[p.id,newPerson.id];article.authorEvidenceUrl='https://example.org/test-attribution';delete article.authorLabel;
 sources.events.events.push({id:'edicion-temporal',title:'Edición nueva temporal',date:'2026-11-02',timezone:'America/Mexico_City',sourceUrl:'https://example.org/event',sourceRetrievedAt:'2026-11-14T00:00:00Z',evidenceStatus:'past_public_listing_not_attendance_verified',participants:[],videos:[]});
 sources.talks.talks.push({id:'charla-edicion-temporal',eventId:'edicion-temporal',title:'Charla de edición nueva',kind:'Charla',speakerScope:'session',speakerIds:[],moderatorIds:[],otherSpeakers:[],videos:[]});
 const event=sources.events.events.find(e=>e.id==='316979242');event.title='Edición editada solo en events.json';event.date='2026-11-01';
 for(const [k,v] of Object.entries(sources))await writeFile(join(dir,`data/${k}.json`),JSON.stringify(v,null,2)+'\n');
 const sourceHashes=Object.fromEntries(await Promise.all(Object.keys(sources).map(async k=>[k,hash(await readFile(join(dir,`data/${k}.json`)))])));
 // A normal build must rebuild joins without a preceding data command.
 for(let pass=0;pass<2;pass++)execFileSync(process.execPath,['scripts/build.mjs'],{cwd:dir,stdio:'pipe'});
 for(const script of ['scripts/import-people.mjs','scripts/import-talks.mjs'])execFileSync(process.execPath,[script],{cwd:dir,stdio:'pipe'});
 for(const k of Object.keys(sources))assert.equal(hash(await readFile(join(dir,`data/${k}.json`))),sourceHashes[k],`${k} source was overwritten`);
 const generated=JSON.parse(await readFile(join(dir,'site/assets/data/people.json'),'utf8'));assert.equal(generated.people.length,originalCount+1);
 const added=generated.people.find(p=>p.id===newPerson.id);assert.deepEqual(added.appearances[0].talkIds,['316979242-1','charla-temporal-dos']);assert.equal(added.articles.length,1);
 server=spawn('bun',['scripts/serve.ts'],{cwd:dir,env:{...process.env,PORT:'0'},stdio:'pipe'});let startup='';server.stdout.on('data',d=>startup+=d);server.stderr.on('data',d=>startup+=d);
 for(let i=0;i<100&&!startup.includes('PREVIEW →');i++)await new Promise(r=>setTimeout(r,50));
 const url=startup.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];assert(url,startup);
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 for(const javaScriptEnabled of [true,false]) {
  const context=await browser.newContext({javaScriptEnabled}),page=await context.newPage();
  for(const route of ['speakers/person/carlos-alberto-haro/',...(javaScriptEnabled?['#speakers/2026/1/carlos-alberto-haro']:[])]) {
   await page.goto(url+route);await page.locator('.person-detail').waitFor();assert.equal(await page.locator('#archive-title').innerText(),p.name);
   const body=await page.locator('.person-detail').innerText();for(const value of [p.bio.text,talk.title,event.title,article.title,'1 de noviembre de 2026'])assert(body.includes(value),value);
  }
  await page.goto(url+'speakers/person/persona-temporal/');assert.equal(await page.locator('.person-contribution').count(),1);assert((await page.locator('.person-detail').innerText()).includes('Segunda charla temporal'));
  await page.goto(url+'tv/event/316979242/');const tape=await page.locator('.event-detail').innerText();for(const value of [p.name,newPerson.name,talk.title])assert(tape.includes(value),value);
  await page.goto(url+'tv/watch/316979242/f2RtD9soINs/');assert.equal(await page.title(),'Data Pub · Noviembre 2026');
  await page.goto(url+'tv/event/edicion-temporal/');assert((await page.locator('.event-detail').innerText()).includes('Charla de edición nueva'));
  await page.goto(url+'blog/');assert((await page.locator('main').innerText()).includes(article.title));
  await page.goto(url+`blog/${article.slug}/`);const body=await page.locator('main').innerText();for(const value of [p.name,newPerson.name,article.title])assert(body.includes(value),value);
  for(const id of ['hermilo-cortes-gonzalez','hermilo-cortes-gonzalez-301041360','hermilio-cortes-311027455']){await page.goto(url+`speakers/person/${id}/`);assert.equal(await page.locator('.person-contribution').count(),2);}
  await context.close();
 }
 console.log('PASS independent people/talks/articles/events edits → normal build → profile, VHS, local month, Librero and authors; JS/no-JS, new co-speaker with two talks, Hermilio aliases; source hashes unchanged');
} finally {await browser?.close();server?.kill();await rm(dir,{recursive:true,force:true});}
