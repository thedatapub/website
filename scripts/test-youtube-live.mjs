// Optional network check. Reports observed playback separately from iframe/API loading.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn('bun',['scripts/serve.ts'],{env:{...process.env,PORT:'0'},stdio:'pipe'});
let startup='',browser;server.stdout.on('data',c=>startup+=c);server.stderr.on('data',c=>startup+=c);
const delay=ms=>new Promise(r=>setTimeout(r,ms)),results=[];
try {
 for(let i=0;i<100&&!startup.includes('PREVIEW →');i++)await delay(50);
 const url=startup.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];assert.ok(url,startup);
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 await mkdir('artifacts',{recursive:true});
 for(const [eventId,year,id,width] of [['316979242',2026,'f2RtD9soINs',1280],['249335412',2018,'lBho-kM71D0',320]]) {
  console.log(`LIVE YouTube ${id}`);
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'}),page=await context.newPage();
  const requests=[],failures=[],violations=[];
  page.on('response',r=>{if(r.url().includes('youtube-nocookie.com/embed/'))requests.push({url:r.url(),status:r.status()});});
  page.on('requestfailed',r=>{if(/youtube|ytimg|googlevideo/.test(r.url()))failures.push({url:r.url().split('?')[0],error:r.failure()?.errorText});});
  await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>{window.cspViolations||=[];window.cspViolations.push({directive:e.violatedDirective,uri:e.blockedURI});}));
  await page.goto(url+`#tv/${year}/1/${eventId}`);
  await page.locator(`[data-video-id="${id}"]`).click();await page.locator('#tv-youtube-player').waitFor();
  let observedPlaying=false,advancing=false,lastTime=null,media=null;
  for(let i=0;i<30;i++) {
   await delay(500);
   const state=await page.locator('#tv-screen').getAttribute('data-player-state');
   if(state==='playing')observedPlaying=true;
   const frame=page.frames().find(f=>f.url().includes('youtube-nocookie.com/embed/'));
   if(frame)try{media=await frame.evaluate(()=>{const v=document.querySelector('video');return v?{time:v.currentTime,paused:v.paused,readyState:v.readyState}:null;});}catch{}
   if(media&&!media.paused&&lastTime!==null&&media.time>lastTime+.1)advancing=true;
   if(media)lastTime=media.time;
   if(state==='error'||advancing)break;
  }
  const result={videoId:id,eventId,viewportWidth:width,iframeResponses:requests,frameLoaded:await page.locator('#tv-screen').getAttribute('data-frame-loaded'),apiReady:await page.locator('#tv-screen').getAttribute('data-api-ready'),playerState:await page.locator('#tv-screen').getAttribute('data-player-state'),status:await page.locator('#player-status').innerText(),observedPlaying,mediaTimeAdvanced:advancing,media,failures,cspViolations:await page.evaluate(()=>window.cspViolations||[])};
  await page.screenshot({path:`artifacts/youtube-live-${id}.png`});
  await page.locator('[data-archive-close]').click();await page.locator('.tv-detail-view').waitFor();
  result.iframeRemovedOnClose=await page.locator('iframe').count()===0;
  results.push(result);console.log(JSON.stringify(result));await context.close();
 }
 await writeFile('artifacts/youtube-live-results.json',JSON.stringify({checkedAt:new Date().toISOString(),browser:await browser.version(),results},null,2));
}finally{await browser?.close();server.kill();}
