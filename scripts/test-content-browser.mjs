import { chromium } from 'playwright';
import { stubCalendar } from './calendar-fixture.mjs';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn('bun',['scripts/serve.ts'],{env:{...process.env,PORT:'0'},stdio:'pipe'});
let startup='',browser;
server.stdout.on('data',c=>startup+=c);server.stderr.on('data',c=>startup+=c);
const passed=[];
try {
  for(let i=0;i<100&&!startup.includes('PREVIEW →');i++) await new Promise(r=>setTimeout(r,50));
  const url=startup.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0]; assert.ok(url,startup);
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  await mkdir('artifacts',{recursive:true});
  for(const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    await stubCalendar(context);
    const page=await context.newPage(); const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    for(const [id,text] of [['spot-about','Rigor sin barreras'],['spot-events','Cómo funcionan nuestros eventos'],['spot-library','11 de mayo de 2026'],['team-board','Propón una charla']]) {
      await page.goto(url); await page.locator('#bar-viewport[data-ready="true"]').waitFor();
      await page.locator('#'+id).focus(); await page.keyboard.press('Enter');
      await page.locator('#content-dialog[open]').waitFor();
      assert.ok((await page.locator('#panel-content').innerText()).includes(text));
      assert.equal(await page.locator('#panel-content a[href^="https://thedata.pub"]').count(),0);
      const {violations}=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],id);
      await page.screenshot({path:`artifacts/content-${id}-${width}.png`});
      if(id==='spot-library') {
        await page.getByRole('link',{name:'Leer publicación →'}).click();
        assert.ok(page.url().endsWith('/blog/primer-post/'));
        assert.match(await page.locator('main').innerText(),/Publicación histórica/);
        await page.getByRole('link',{name:'← Volver al librero'}).click();
        assert.ok(page.url().endsWith('/blog/'));
      } else {
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(()=>document.activeElement.id),id);
      }
    }
    assert.deepEqual(errors,[]);await context.close();
    passed.push(`Four content panels, local post, focus and axe at ${width}px`);
  }
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  await stubCalendar(nojs);
  const page=await nojs.newPage();
  for(const path of ['about/','events/','blog/','contact/','blog/primer-post/']) {
    const response=await page.goto(url+path);assert.equal(response.status(),200);
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.locator('iframe').count(),path==='events/'?1:0);
    assert.equal(await page.locator('a[href^="https://thedata.pub"]').count(),0);
  }
  await page.goto(url+'blog/');await page.getByRole('link',{name:'Leer publicación →'}).click();
  assert.ok(page.url().endsWith('/blog/primer-post/'));
  await nojs.close();passed.push('Five local routes and article navigation without JavaScript');
  await writeFile('artifacts/content-browser-results.json',JSON.stringify({passed},null,2));
  console.log(passed.map(p=>'PASS '+p).join('\n'));
} finally {await browser?.close();server.kill();}
