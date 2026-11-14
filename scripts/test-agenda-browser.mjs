import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { stubCalendar, calendarEmbed } from './calendar-fixture.mjs';

const calendarUrl = 'https://luma.com/thedatapub';
const evidence = process.env.AGENDA_ARTIFACTS || 'artifacts/agenda';
const server = spawn('bun', ['scripts/serve.ts'], { env: { ...process.env, PORT: '0' }, stdio: 'pipe' });
let startup = '', browser;
server.stdout.on('data', chunk => startup += chunk);
server.stderr.on('data', chunk => startup += chunk);
const passed = [], live = [];
async function geometry(page) {
  const frame = page.locator('.agenda-calendar iframe');
  await frame.scrollIntoViewIfNeeded();
  const size = await frame.boundingBox();
  assert.ok(size.width > 150 && size.width <= 600 && size.height === 450, JSON.stringify(size));
  assert.ok(size.x >= 0 && size.x + size.width <= page.viewportSize().width + 1);
  assert.equal(await frame.getAttribute('title'), 'Calendario de eventos de The Data Pub en Luma');
  assert.equal(await frame.getAttribute('src'), calendarEmbed);
  assert.equal(await frame.getAttribute('loading'), 'lazy');
  assert.ok(await frame.evaluate(el => el.allowFullscreen));
  assert.ok(await page.locator('a[href="' + calendarUrl + '"]').count());
  assert.equal(await page.locator('main a[href*="meetup.com"],#panel-content a[href*="meetup.com"]').count(), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  return size;
}
try {
  for (let i = 0; i < 100 && !startup.includes('PREVIEW →'); i++) await new Promise(r => setTimeout(r, 50));
  const url = startup.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0]; assert.ok(url, startup);
  await mkdir(evidence, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });

  // Controlled keyboard/lifecycle regression; the real provider is checked below without routing.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await stubCalendar(context);
  const page = await context.newPage(), requests = [];
  page.on('request', request => { if (request.url() === calendarEmbed) requests.push(request.url()); });
  await page.goto(url); await page.locator('#bar-viewport[data-ready]').waitFor();
  assert.equal(requests.length, 0);
  assert.equal(await page.locator('iframe').count(), 0);
  await page.locator('#spot-events').focus(); await page.keyboard.press('Enter');
  await page.locator('#content-dialog[open]').waitFor(); await geometry(page);
  await page.frameLocator('.agenda-calendar iframe').getByRole('link', { name: 'Abrir Luma' }).waitFor();
  assert.equal(requests.length, 1);
  await page.locator('#content-dialog .close-button').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.tagName), 'IFRAME');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), calendarUrl);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.tagName), 'IFRAME');
  // Cross-origin key events belong to Luma. Tab returns to the host's close control.
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Cerrar panel');
  await page.keyboard.press('Escape');
  await page.locator('#content-dialog[open]').waitFor({ state: 'hidden' });
  await page.locator('#panel-content iframe').waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => document.activeElement.id), 'spot-events');
  await page.keyboard.press('Enter'); await page.locator('#content-dialog[open]').waitFor();
  await geometry(page);
  await page.locator('#content-dialog .close-button').click();
  await page.locator('#panel-content iframe').waitFor({ state: 'detached' });
  passed.push('No request on home; opens on demand; Tab enters/leaves iframe; Escape in host/X disposes it and restores focus; reopens');
  await context.close();

  // Network outage does not remove the visible calendar alternative.
  const failure = await browser.newContext(); await failure.route(calendarEmbed, route => route.abort());
  const offline = await failure.newPage(); await offline.goto(url + 'events/');
  const fallback = offline.getByRole('link', { name: 'Abrir el calendario en Luma' });
  await fallback.scrollIntoViewIfNeeded(); assert.ok(await fallback.isVisible());
  assert.equal(await fallback.getAttribute('href'), calendarUrl);
  await failure.close(); passed.push('Visible Luma fallback survives a blocked provider');

  for (const [width, height] of [[1440, 900], [390, 844], [320, 740]]) {
    const liveContext = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700, reducedMotion: 'reduce' });
    await liveContext.addInitScript(() => {
      window.agendaCspViolations = [];
      document.addEventListener('securitypolicyviolation', e => window.agendaCspViolations.push({ directive: e.effectiveDirective, uri: e.blockedURI }));
    });
    const livePage = await liveContext.newPage();
    for (const surface of ['panel', 'page']) {
      let status;
      const listener = response => { if (response.url() === calendarEmbed) status = response.status(); };
      livePage.on('response', listener);
      await livePage.goto(url + (surface === 'page' ? 'events/' : ''));
      if (surface === 'panel') {
        await livePage.locator('#bar-viewport[data-ready]').waitFor();
        await livePage.locator('#spot-events').focus(); await livePage.keyboard.press('Enter');
        await livePage.locator('#content-dialog[open]').waitFor();
      }
      const size = await geometry(livePage);
      const body = livePage.frameLocator('.agenda-calendar iframe').locator('body');
      await body.waitFor();
      // Luma's initial HTML is only a shell; wait for content from its client application.
      let text = '';
      for (let i = 0; i < 100; i++) {
        text = (await body.innerText()).trim();
        if (text && text !== 'Luma') break;
        await new Promise(r => setTimeout(r, 100));
      }
      assert.equal(status, 200, `${surface}/${width}: provider HTTP`);
      assert.ok(text && text !== 'Luma', `${surface}/${width}: Luma did not render content`);
      assert.deepEqual(await livePage.evaluate(() => window.agendaCspViolations), []);
      live.push({ width, surface, status, size, text, empty: /No Upcoming Events/i.test(text) });
      await livePage.screenshot({ path: `${evidence}/live-${surface}-${width}.png` });
      livePage.off('response', listener);
    }
    await liveContext.close();
  }
  passed.push('Real Luma HTTP/content inside panel and static page at 1440, 390 and 320px; 450px height, no overflow or CSP violation');

  const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const staticPage = await nojs.newPage(); await staticPage.goto(url);
  await staticPage.locator('#spot-events').click();
  assert.equal(new URL(staticPage.url()).pathname, '/events/'); await geometry(staticPage);
  const direct = staticPage.getByRole('link', { name: 'Abrir el calendario en Luma' });
  await direct.scrollIntoViewIfNeeded(); assert.ok(await direct.isVisible());
  await staticPage.screenshot({ path: `${evidence}/nojs-fallback-mobile.png` });
  await direct.click(); assert.equal(new URL(staticPage.url()).origin + new URL(staticPage.url()).pathname, calendarUrl);
  await nojs.close(); passed.push('No-JS scene link, responsive frame and visible fallback navigate to the real Luma calendar');
  await writeFile(`${evidence}/results.json`, JSON.stringify({ browser: await browser.version(), checkedAt: new Date().toISOString(), passed, live }, null, 2));
  console.log(passed.map(s => 'PASS ' + s).join('\n'));
  console.log('Luma live states: ' + live.map(r => `${r.surface}/${r.width}: ${r.empty ? 'No Upcoming Events' : 'content rendered'}`).join('; '));
} finally { await browser?.close(); server.kill(); }
