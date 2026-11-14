import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { resolveRoute,yearsFor } from '../site/assets/js/archive-view.js';
import { peopleForYear,peopleYears } from '../site/assets/js/people-view.js';
const events=JSON.parse(await readFile('site/assets/data/talks.json','utf8'));
const people=JSON.parse(await readFile('site/assets/data/people.json','utf8'));
const server=spawn('bun',['scripts/serve.ts'],{env:{...process.env,PORT:'0'},stdio:'pipe'});
let startup='',browser;server.stdout.on('data',c=>startup+=c);server.stderr.on('data',c=>startup+=c);
const passed=[],errors=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(page,kind,year=2026){await page.waitForFunction(({kind,year})=>document.querySelector('#speakers-dialog')?.dataset.collection===kind&&document.querySelector('#archive-year')?.value===String(year),{kind,year});}
async function choose(page,kind,year){await page.locator('#archive-year').selectOption(String(year));await ready(page,kind,year);}
async function audit(page,label){const {violations}=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],label);}
async function focusIs(page,key,id){await page.waitForFunction(({key,id})=>document.activeElement.dataset[key]===id,{key,id});}
async function open(page,selector){await page.locator(selector).focus();await page.keyboard.press('Enter');}
try {
 await mkdir('artifacts',{recursive:true});
 for(let i=0;i<100&&!startup.includes('PREVIEW →');i++)await delay(50);
 const url=startup.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];assert.ok(url,startup);
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 for(const [width,height,mobile] of [[1440,900,false],[390,844,true],[320,740,true],[844,390,true]]) {
  console.log(`CHECK collections ${width}×${height}`);
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
  const youtube=[];
  // Deterministic lifecycle tests only; the separate live check never intercepts YouTube.
  await context.route('https://www.youtube-nocookie.com/**',r=>{youtube.push(r.request().url());return r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="es"><title>Prueba del marco</title><body>Marco de prueba</body></html>'});});
  await context.route('https://www.youtube.com/**',r=>{youtube.push(r.request().url());return r.fulfill({contentType:'text/javascript',body:'/* API omitted in lifecycle fixture */'});});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('#bar-viewport[data-ready="true"]').waitFor();
  await page.locator('#spot-vhs').focus();await page.screenshot({path:`artifacts/tv-props-${width}.png`});
  await open(page,'#speakers-board');await ready(page,'speakers');await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.vhs-tape').count(),0);
  const measure=()=>page.locator('.plaques-grid').evaluate(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,cells:[...el.children].map(c=>{const r=c.getBoundingClientRect();return [r.width,r.height];})};});
  const baseline=await measure();
  for(const year of peopleYears(people)) {
   await choose(page,'speakers',year);const seen=[];
   for(let p=1;p<=Math.ceil(peopleForYear(people,year).length/12);p++) {
    const g=await measure();assert.equal(g.cells.length,12);
    for(const key of ['x','y','w','h'])assert.ok(Math.abs(g[key]-baseline[key])<1,`person grid ${width}/${year} ${key}: ${g[key]} vs ${baseline[key]}`);
    const ids=await page.locator('.person-plaque').evaluateAll(es=>es.map(e=>e.dataset.personId));seen.push(...ids);
    if(p<Math.ceil(peopleForYear(people,year).length/12)){await page.getByRole('link',{name:'Página siguiente →',exact:true}).click();await page.waitForFunction(p=>location.hash.endsWith('/'+p),p+1);}
   }
   assert.deepEqual(seen,peopleForYear(people,year).map(p=>p.id));
  }
  await choose(page,'speakers',2026);await audit(page,'person board');
  await page.screenshot({path:`artifacts/people-board-${width}.png`});
  await page.locator('[data-person-id="carlos-alberto-haro"]').click();await page.locator('.person-detail').waitFor();
  assert.equal(await page.locator('.person-contribution').count(),2);assert.match(await page.locator('.person-detail').innerText(),/2023/);
  assert.match(await page.locator('.person-detail').innerText(),/2026/);await audit(page,'canonical person');
  await page.goBack();await ready(page,'speakers');await focusIs(page,'personId','carlos-alberto-haro');
  await page.goForward();await page.locator('.person-detail').waitFor();await page.reload();await page.locator('.person-detail').waitFor();
  await page.keyboard.press('Escape');await ready(page,'speakers');await focusIs(page,'personId','carlos-alberto-haro');
  await page.keyboard.press('ArrowLeft');await ready(page,'speakers',2025);
  await page.keyboard.press('ArrowRight');await ready(page,'speakers',2026);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'speakers-board');
  await open(page,'#spot-vhs');await ready(page,'tv');
  assert.equal(await page.locator('.person-plaque').count(),0);
  const tvBase=await measure();
  for(const year of yearsFor(events)) {
   await choose(page,'tv',year);const g=await measure();assert.equal(g.cells.length,12);
   for(const key of ['x','y','w','h'])assert.ok(Math.abs(g[key]-tvBase[key])<1,`TV geometry ${width}/${year}`);
   assert.deepEqual(await page.locator('.vhs-tape').evaluateAll(es=>es.map(e=>e.dataset.eventId)),resolveRoute(events,{year}).events.map(e=>e.id));
  }
  await choose(page,'tv',2018);await audit(page,'VHS board');await page.screenshot({path:`artifacts/vhs-board-${width}.png`});
  await page.locator('[data-event-id="249335412"]').click();await page.locator('.tv-detail-view').waitFor();
  assert.equal(await page.locator('.event-talk').count(),2);assert.equal(await page.locator('.watch-link').count(),2);
  assert.match(await page.locator('.event-detail').innerText(),/Will Wolf/);assert.match(await page.locator('.event-detail').innerText(),/Paco Mekler/);
  assert.equal(youtube.length,0,'YouTube must not be contacted before playback click');
  assert.equal(await page.locator('iframe').count(),0);await audit(page,'tape detail');
  await focusIs(page,'videoId','lBho-kM71D0');
  assert.equal(await page.locator('.youtube-secondary:visible').count(),mobile?2:0);
  for(const li of await page.locator('.video-selection li').all()) {
   const id=await li.locator('.watch-link').getAttribute('data-video-id');
   assert.equal(await li.locator('.youtube-secondary').getAttribute('href'),`https://www.youtube.com/watch?v=${id}`);
  }
  const watch=page.locator('[data-video-id="lBho-kM71D0"]');await watch.click();await page.locator('#tv-youtube-player').waitFor();
  assert.equal(await page.locator('#archive-title').innerText(),'Data Pub · Abril 2018');
  assert.equal(await page.title(),'Data Pub · Abril 2018');
  assert.equal(await page.locator('.player-fallback a:visible').count(),mobile?1:0);
  const src=await page.locator('#tv-youtube-player').getAttribute('src');assert.match(src,/^https:\/\/www.youtube-nocookie.com\/embed\/lBho-kM71D0\?/);assert.match(src,/autoplay=1/);assert.match(src,/origin=/);
  const frameBox=await page.locator('#tv-youtube-player').boundingBox();assert.ok(frameBox.width>=200&&frameBox.height>=200);
  const screenBox=await page.locator('#tv-screen').boundingBox();
  assert.ok(frameBox.x>=screenBox.x+3 && frameBox.x+frameBox.width<=screenBox.x+screenBox.width-2.5,'frame fits inside CRT border');
  assert.ok(frameBox.y>=screenBox.y+3 && frameBox.y+frameBox.height<=screenBox.y+screenBox.height-2.5,'controls are not clipped by CRT border');
  await page.screenshot({path:`artifacts/tv-player-fixture-${width}.png`});
  await page.keyboard.press('Escape');await page.locator('.tv-detail-view').waitFor();assert.equal(await page.locator('iframe').count(),0);await focusIs(page,'videoId','lBho-kM71D0');assert.notEqual(await page.title(),'Data Pub · Abril 2018');
  await page.goForward();await page.locator('.tv-watch-view').waitFor();assert.equal(await page.locator('iframe').count(),0,'Forward requires a new play action');
  await page.locator('[data-play-video]').click();await page.locator('iframe').waitFor();await page.locator('[data-archive-close]').click();await page.locator('.tv-detail-view').waitFor();
  for(const action of ['Escape','X','backdrop']) {
   if(!await page.locator('.tv-detail-view').count()){await page.locator('[data-event-id="249335412"]').click();await page.locator('.tv-detail-view').waitFor();}
   if(action==='Escape')await page.keyboard.press('Escape');if(action==='X')await page.locator('[data-archive-close]').click();if(action==='backdrop')await page.mouse.click(1,1);
   await ready(page,'tv',2018);await focusIs(page,'eventId','249335412');
  }
  await choose(page,'tv',2015);await page.locator('.vhs-tape').click();await page.locator('.tv-detail-view').waitFor();assert.equal(await page.locator('.watch-link').count(),0);assert.equal(await page.getByRole('link',{name:/YouTube/}).count(),0);
  await page.keyboard.press('Escape');await ready(page,'tv',2015);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'spot-vhs');
  await page.goto(url+'#speakers/2018/1/249335412-2');await page.locator('.tv-detail-view').waitFor();assert.ok(page.url().includes('#tv/2018/1/249335412'));
  await page.keyboard.press('Escape');await ready(page,'tv',2018);
  await page.goto(url+'#tv/2018/1/249335412/watch/kYzCRUdlOmE');await page.locator('.tv-watch-view').waitFor();assert.equal(await page.locator('iframe').count(),0);
  await page.locator('[data-play-video]').click();await page.locator('#tv-youtube-player').waitFor();
  assert.match(await page.locator('#tv-youtube-player').getAttribute('src'),/embed\/kYzCRUdlOmE\?/);
  assert.equal(await page.locator('.player-fallback a').getAttribute('href'),'https://www.youtube.com/watch?v=kYzCRUdlOmE');
  await page.keyboard.press('Escape');await page.locator('.tv-detail-view').waitFor();
  await page.goto(url+'#tv/2026/1/316589287/watch/w6pAOe0ZL7I');await page.locator('.tv-watch-view').waitFor();
  assert.equal(await page.locator('#archive-title').innerText(),'Data Pub · Septiembre 2026');assert.equal(await page.title(),'Data Pub · Septiembre 2026');
  passed.push(`People and TV: chronology, all pages, 12 stable slots, multi-year profile, April 2018, video gate/disposal, focus and history at ${width}×${height}`);
  await context.close();
 }
 // Simulated provider restriction: the visible fallback and disposal must remain usable.
 for(const width of [1440,390]) {
 const denied=await browser.newContext({viewport:{width,height:900}}),blocked=await denied.newPage();
 await denied.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="es"><title>Embed bloqueado</title><body>Video no disponible</body></html>'}));
 await denied.route('https://www.youtube.com/iframe_api',r=>r.fulfill({contentType:'text/javascript',body:`window.YT={Player:class {constructor(frame,options){this.frame=frame;queueMicrotask(()=>options.events.onError({data:150}));} destroy(){this.frame.remove();} playVideo(){}}};window.onYouTubeIframeAPIReady();`}));
 await blocked.goto(url+'#tv/2018/1/249335412');await blocked.locator('[data-video-id="lBho-kM71D0"]').click();
 await blocked.waitForFunction(()=>document.querySelector('#tv-screen')?.dataset.playerState==='error');
 assert.match(await blocked.locator('#player-status').innerText(),/150/);
 assert.equal(await blocked.locator('.player-fallback a:visible').count(),width===390?1:0);
 assert.equal(await blocked.locator('.player-fallback a').getAttribute('href'),'https://www.youtube.com/watch?v=lBho-kM71D0');
 await blocked.locator('[data-archive-close]').click();await blocked.locator('.tv-detail-view').waitFor();assert.equal(await blocked.locator('iframe').count(),0);
 await denied.close();}
 passed.push('Provider error 150 is reported on desktop/mobile; external CTA stays mobile-only; frame disposed');
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await nojs.newPage();
 for(const route of ['speakers/2016/2/','speakers/person/carlos-alberto-haro/','tv/2018/1/','tv/event/249335412/','speakers/talk/249335412-2/','tv/watch/249335412/lBho-kM71D0/']) {
  assert.equal((await page.goto(url+route)).status(),200);assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('iframe').count(),0);
 }
 await page.getByRole('link',{name:'Ver en YouTube ↗',exact:true}).waitFor();
 await page.goto(url+'speakers/talk/249335412-2/');await page.locator('.archive-close').click();assert.ok(page.url().endsWith('/tv/2018/1/#event-249335412'));
 await page.setViewportSize({width:1440,height:900});
 await page.goto(url+'tv/event/249335412/');assert.equal(await page.getByRole('link',{name:'Ver en YouTube ↗',exact:true}).count(),2);
 for(const id of ['lBho-kM71D0','kYzCRUdlOmE']) {
  await page.goto(url+`tv/watch/249335412/${id}/`);
  assert.equal(await page.title(),'Data Pub · Abril 2018');
  const fallback=page.getByRole('link',{name:'Ver en YouTube ↗',exact:true});assert(await fallback.isVisible());assert.equal(await fallback.getAttribute('href'),`https://www.youtube.com/watch?v=${id}`);
 }
 await nojs.close();passed.push('Static people, VHS, historical routes and direct YouTube fallback without JS');
 const staticContext=await browser.newContext({viewport:{width:1440,height:900}}),staticPage=await staticContext.newPage();
 await staticPage.goto(url+'tv/watch/316589287/w6pAOe0ZL7I/');await staticPage.locator('.player-enhanced').waitFor();
 assert.equal(await staticPage.title(),'Data Pub · Septiembre 2026');assert.equal(await staticPage.locator('.player-fallback a:visible').count(),0);
 assert(await staticPage.locator('[data-play-video]').isVisible());
 await staticPage.setViewportSize({width:390,height:844});assert.equal(await staticPage.locator('.player-fallback a:visible').count(),1);await staticContext.close();
 const failureContext=await browser.newContext(),failure=await failureContext.newPage();await failure.route('**/assets/data/people.json',r=>r.abort());await failure.goto(url+'#speakers');await failure.getByRole('link',{name:'Abrir la versión por páginas',exact:true}).click();assert.ok(failure.url().endsWith('/speakers/'));await failureContext.close();
 passed.push('Data-load failure keeps a working HTML fallback');assert.deepEqual(errors,[]);
 await writeFile('artifacts/collections-browser-results.json',JSON.stringify({passed,errors,browser:await browser.version()},null,2));console.log(passed.map(p=>'PASS '+p).join('\n'));
} finally {await browser?.close();server.kill();}
