import { chromium } from 'playwright';
import { stubCalendar } from './calendar-fixture.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const targets = [
  ['team-board', 'contact/'], ['spot-about', 'about/'],
  ['speakers-board', 'speakers/'], ['spot-vhs', 'tv/'],
  ['spot-library', 'blog/'], ['spot-events', 'events/'],
];
const evidence = process.env.HOTSPOT_ARTIFACTS || 'artifacts/hotspots';
const server = spawn('bun', ['scripts/serve.ts'], { env: { ...process.env, PORT: '0' }, stdio: 'pipe' });
let startup = '', browser;
server.stdout.on('data', c => startup += c);
server.stderr.on('data', c => startup += c);
const passed = [], errors = [];
const state = spot => spot.evaluate(el => ({
  hint: Number(getComputedStyle(el.querySelector('.scene-hint')).opacity),
  outline: getComputedStyle(el).outlineColor,
  focused: document.activeElement === el,
}));
async function highlight(spot, active) {
  const s = await state(spot);
  assert.equal(s.hint, active ? 1 : 0, `${await spot.getAttribute('id')}: label`);
  assert.equal(s.outline === 'rgba(0, 0, 0, 0)', !active, 'Object outline and label must agree');
}
async function idle(page) {
  for (const [id] of targets) await highlight(page.locator('#' + id), false);
}
async function openPanel(page) {
  await page.locator('dialog[open]').waitFor();
  await page.waitForFunction(() => !document.querySelector('#archive-title')?.textContent.includes('Abriendo'));
  await idle(page);
  assert.doesNotMatch(await page.locator('#panel-label').textContent(), /^\d+\s*·/);
}
async function closed(page) { await page.locator('dialog[open]').waitFor({ state: 'hidden' }); }
try {
  for (let i = 0; i < 100 && !startup.includes('PREVIEW →'); i++) await new Promise(r => setTimeout(r, 50));
  const url = startup.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
  assert.ok(url, startup);
  await mkdir(evidence, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await stubCalendar(context);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.locator('#bar-viewport[data-ready]').waitFor();
  assert.equal(await page.locator('.scene-hotspot').count(), 6);
  assert.equal(await page.locator('.spot-number,.hotspot,.spot-label,.content-note > span').count(), 0);
  assert.equal(await page.locator('#bar-world a[href="about/"]').count(), 1);
  assert.equal(await page.locator('#spot-about.pub-sign').count(), 1);
  assert.doesNotMatch(await page.locator('.menu-panel nav').innerText(), /(?:^|\n)0[1-6]/);
  await idle(page);
  await page.screenshot({ path: `${evidence}/desktop-idle.png` });
  for (const [id] of targets) {
    const spot = page.locator('#' + id);
    await spot.focus(); // Reveal distant objects through the real focus camera.
    await spot.evaluate(el => el.blur());
    await page.mouse.move(1, 1);
    await highlight(spot, false);
    const bounds = await spot.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await highlight(spot, true);
    await page.screenshot({ path: `${evidence}/desktop-${id}-hover.png` });
    await page.mouse.move(bounds.x + bounds.width + 8, bounds.y + bounds.height / 2);
    await highlight(spot, false);
    // Enter again, open and close with the pointer. Returning focus cannot stick a highlight.
    await spot.click();
    await openPanel(page);
    await page.locator('dialog[open] .close-button, dialog[open] .archive-close').click();
    await closed(page);
    assert.equal((await state(spot)).focused, true);
    await page.mouse.move(1, 1);
    await idle(page);
  }
  passed.push('All six objects: real mouse entry/exit, matching label and outline, modal suppression, X and pointer return');

  await page.mouse.move(1, 1);
  await page.locator('#bar-viewport').focus();
  for (const [id] of targets) {
    await page.keyboard.press('Tab');
    const spot = page.locator('#' + id);
    assert.equal((await state(spot)).focused, true, `Tab order: ${id}`);
    await highlight(spot, true);
    await page.keyboard.press('Enter');
    await openPanel(page);
    await page.keyboard.press('Escape');
    await closed(page);
    assert.equal((await state(spot)).focused, true);
    await highlight(spot, true);
  }
  await page.keyboard.press('Tab');
  await idle(page);
  passed.push('Real Tab/Enter/Escape for all six objects, visible returned keyboard focus and clearing on blur');

  await page.goto(url);
  await page.locator('#spot-vhs').focus();
  await page.locator('#spot-vhs').click();
  await openPanel(page);
  await page.goBack(); await closed(page);
  await page.mouse.move(1, 1); await idle(page);
  await page.goForward(); await openPanel(page);
  await page.goBack(); await closed(page);
  passed.push('TV browser Back/Forward preserves modal navigation and clears pointer highlight');
  await context.close();

  for (const [width, height] of [[390, 844], [320, 740], [844, 390]]) {
    const touch = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await stubCalendar(touch);
    const mobile = await touch.newPage();
    mobile.on('pageerror', e => errors.push(e.message));
    await mobile.goto(url); await mobile.locator('#bar-viewport[data-ready]').waitFor();
    await idle(mobile);
    await mobile.screenshot({ path: `${evidence}/mobile-${width}-idle.png` });
    for (const [id] of targets) {
      const spot = mobile.locator('#' + id);
      await spot.focus();
      const box = await spot.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= width + 1, `${id} accessible at ${width}`);
      await spot.tap(); await openPanel(mobile);
      await mobile.locator('dialog[open] .close-button, dialog[open] .archive-close').tap();
      await closed(mobile);
      assert.equal((await state(spot)).focused, true);
      await idle(mobile); // Includes Safari/Chromium-style emulated hover after a tap.
      if (width === 390) await mobile.screenshot({ path: `${evidence}/mobile-${id}-returned.png` });
    }
    // Hardware keyboard remains usable on a touch device after pointer interaction.
    await mobile.locator('#bar-viewport').focus();
    await mobile.keyboard.press('Tab');
    await highlight(mobile.locator('#team-board'), true);
    await mobile.keyboard.press('Tab');
    await highlight(mobile.locator('#team-board'), false);
    await highlight(mobile.locator('#spot-about'), true);
    await touch.close();
    passed.push(`Touch ${width}×${height}: six accessible hit areas, taps, X, focus return, no sticky labels, hardware keyboard`);
  }
  const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  await stubCalendar(nojs);
  const staticPage = await nojs.newPage();
  for (const [id, route] of targets) {
    await staticPage.goto(url);
    await staticPage.locator('#' + id).click();
    assert.equal(new URL(staticPage.url()).pathname, '/' + route);
    assert.equal(await staticPage.locator('h1').count(), 1);
    assert.equal(await staticPage.locator('.content-note > span').count(), 0);
  }
  await nojs.close();
  passed.push('All six direct links work without JavaScript; content pages have no decorative section numbers');
  assert.deepEqual(errors, []);
  await writeFile(`${evidence}/results.json`, JSON.stringify({ browser: await browser.version(), passed, errors }, null, 2));
  console.log(passed.map(p => 'PASS ' + p).join('\n'));
} finally { await browser?.close(); server.kill(); }
