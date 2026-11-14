import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { SCENE, BARMAN, displayLayout } from '../site/assets/js/camera.js';
import { TEAM_BOARD } from '../site/assets/js/scene-objects.js';

const evidence = process.env.FRAMING_ARTIFACTS || 'artifacts/framing';
const server = spawn('bun', ['scripts/serve.ts'], { env: { ...process.env, PORT: '0' }, stdio: 'pipe' });
let startup = '', browser;
server.stdout.on('data', c => startup += c); server.stderr.on('data', c => startup += c);
const passed = [], errors = [];
try {
  for (let i = 0; i < 100 && !startup.includes('PREVIEW →'); i++) await new Promise(r => setTimeout(r, 50));
  const url = startup.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0]; assert.ok(url, startup);
  await mkdir(evidence, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  for (const [width, height] of [[1440, 900], [390, 844], [320, 740], [844, 390], [1920, 480]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 900, isMobile: width < 900, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.locator('#bar-viewport[data-ready]').waitFor();
    const layout = displayLayout(height), viewport = page.locator('#bar-viewport');
    const metrics = () => page.evaluate(() => {
      const v = document.querySelector('#bar-viewport'), r = document.querySelector('#bar-range'), a = document.querySelector('.bar-art');
      return { scroll: v.scrollLeft, max: v.scrollWidth - v.clientWidth, range: r.getBoundingClientRect().width, artX: a.getBoundingClientRect().x, rangeX: r.getBoundingClientRect().x, artWidth: a.getBoundingClientRect().width, center: Number(v.dataset.center) };
    });
    let m = await metrics();
    assert.equal(m.range, layout.width);
    assert.equal(m.max, Math.max(0, layout.width - width), 'Only the cropped span can scroll');
    assert.equal(m.artWidth, SCENE.width * layout.scale, 'Native art remains unscaled fractionally');
    assert.ok(Math.abs(m.center - (width >= layout.width ? SCENE.crop.x + SCENE.crop.width / 2 : SCENE.start)) < 1);
    const tv = page.locator('#spot-tv');
    assert.equal(await tv.evaluate(el => el.tagName), 'SPAN');
    assert.equal(await tv.getAttribute('role'), 'img');
    assert.equal(await tv.getAttribute('tabindex'), null);
    assert.equal(await tv.getAttribute('href'), null);
    assert.equal(await tv.locator('img').count(), 1);
    assert.equal(await page.locator('img[src="assets/pub/tv-crt.svg"]').count(), 1);
    assert.equal(await page.locator('img[src="assets/pub/vhs-shelf.svg"]').count(), 1);
    assert.equal(await page.locator('#spot-vhs').getAttribute('aria-label'), 'Eventos pasados');
    assert.equal(await page.locator('#spot-vhs .scene-hint').innerText(), 'Eventos pasados ↗');
    await page.screenshot({ path: `${evidence}/initial-${width}.png` });
    for (const edge of ['Home', 'End']) {
      await viewport.focus(); await page.keyboard.press(edge);
      await page.waitForFunction(edge => { const v=document.querySelector('#bar-viewport');return edge==='Home'?v.scrollLeft===0:Math.abs(v.scrollLeft-(v.scrollWidth-v.clientWidth))<1; }, edge);
      m = await metrics();
      assert.ok(Math.abs((m.rangeX - m.artX) / layout.scale - SCENE.crop.x) < 0.01);
      assert.equal(await page.locator(edge === 'Home' ? '#pan-left' : '#pan-right').isDisabled(), true);
      await page.screenshot({ path: `${evidence}/${edge.toLowerCase()}-${width}.png` });
    }
    for (const id of ['team-board','spot-about','speakers-board','spot-vhs','spot-library','spot-events']) {
      const link = page.locator('#' + id); await link.focus();
      const box = await link.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1, `${id} focus reveals full object`);
    }
    await page.locator('#spot-vhs').focus();
    await tv.evaluate(el => el.focus());
    assert.equal(await page.evaluate(() => document.activeElement.id), 'spot-vhs', 'Decorative TV cannot take keyboard focus');
    const b = await tv.boundingBox();
    if (width < 900) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(new URL(page.url()).hash, '');
    await page.goto(url + '#tv');
    await page.locator('#speakers-dialog[open] .vhs-tape').first().waitFor();
    await page.keyboard.press('Escape');
    await page.locator('#speakers-dialog[open]').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.activeElement.id), 'spot-vhs', 'Direct TV hash returns focus to active tapes');
    const art = await page.locator('.bar-art').boundingBox(), team = await page.locator('#team-board').boundingBox();
    assert.ok(Math.abs((team.x - art.x) / layout.scale - TEAM_BOARD.x) < 0.01);
    assert.equal(TEAM_BOARD.x - 1384, 22, 'Team clears the window by 22 native pixels');
    assert.equal(BARMAN.x, 899); assert.equal(BARMAN.y, 171);
    await context.close(); passed.push(`${width}×${height}: cropped edges/clamping, initial center, integer art scale, all focus targets, inert TV, tape label and direct-route return`);
  }
  assert.deepEqual(errors, []);
  await writeFile(`${evidence}/results.json`, JSON.stringify({ passed, errors, crop: SCENE.crop, team: TEAM_BOARD, artworkChanged: false }, null, 2));
  console.log(passed.map(p => 'PASS ' + p).join('\n'));
} finally { await browser?.close(); server.kill(); }
