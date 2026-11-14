import { chromium } from 'playwright';
import { stubCalendar, calendarEmbed } from './calendar-fixture.mjs';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { SCENE, BARMAN, sights } from '../site/assets/js/camera.js';
import { SCENE_OBJECTS, TEAM_BOARD } from '../site/assets/js/scene-objects.js';

const port = process.env.TEST_PORT || '0';
let url;
const server = spawn(process.env.BUN_BIN || 'bun', ['scripts/serve.ts'], {
  env: { ...process.env, PORT: port },
  stdio: 'pipe',
});
let startup = '';
server.stdout.on('data', (chunk) => (startup += chunk));
server.stderr.on('data', (chunk) => (startup += chunk));
server.on('error', (error) => (startup += error.message));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const passed = [],
  errors = [],
  external = [];
let browser, runtime;
async function check(name, fn) {
  await fn();
  passed.push(name);
  console.log(`PASS ${name}`);
}
async function until(fn, message) {
  for (let i = 0; i < 80; i++) {
    if (await fn()) return;
    await delay(50);
  }
  throw new Error(message);
}
const offset = (page) => page.locator('#bar-viewport').evaluate((el) => el.scrollLeft);
async function settled(page) {
  let previous = await offset(page),
    stable = 0;
  await until(async () => {
    const current = await offset(page);
    stable = Math.abs(current - previous) < 1 ? stable + 1 : 0;
    previous = current;
    return stable >= 4;
  }, 'Camera did not settle');
}
async function ready(page) {
  await page.goto(url);
  await page.locator('#bar-viewport[data-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.bar-art').evaluate((el) => el.decode());
  await page.evaluate(async () => {
    const sheet = new Image();
    sheet.src = 'assets/pub/barman-scene-sheet.png';
    await sheet.decode();
  });
}
async function spriteState(page) {
  return page.locator('.barman-sprite').evaluate((el) => ({
    display: getComputedStyle(el).display,
    position: getComputedStyle(el).backgroundPositionX,
    animations: el.getAnimations().length,
    motion: document.body.dataset.motion,
    pointer: getComputedStyle(el).pointerEvents,
  }));
}
async function spriteFrame(page, time) {
  await page.locator('.barman-sprite').evaluate((el, time) => {
    const animation = el.getAnimations()[0];
    if (!animation) throw new Error('Decorative sprite animation missing');
    animation.pause();
    animation.currentTime = time;
  }, time);
}
async function menuOpen(page) {
  if (!(await page.locator('#pub-menu').evaluate((el) => el.open)))
    await page.locator('#pub-menu>summary').click();
}
async function layout(page, width, height) {
  const result = await page.evaluate(() => {
    const b = document.querySelector('#bar-viewport').getBoundingClientRect();
    return {
      x: b.x,
      y: b.y,
      w: b.width,
      h: b.height,
      docW: document.documentElement.scrollWidth,
      docH: document.documentElement.scrollHeight,
    };
  });
  assert.equal(result.x, 0);
  assert.equal(result.y, 0);
  assert.equal(result.w, width);
  assert.equal(result.h, height);
  assert.ok(result.docW <= width);
  assert.ok(result.docH <= height);
  const art = await page.locator('.bar-art').evaluate((el) => ({
    natural: el.naturalWidth,
    naturalH: el.naturalHeight,
    width: el.getBoundingClientRect().width,
    height: el.getBoundingClientRect().height,
    rendering: getComputedStyle(el).imageRendering,
  }));
  assert.equal(art.natural, SCENE.width);
  assert.equal(art.naturalH, SCENE.height);
  assert.ok(Number.isInteger(art.width / art.natural));
  assert.equal(art.width / art.natural, art.height / art.naturalH);
  assert.equal(art.rendering, 'pixelated');
  assert.equal(await page.locator('#bar-viewport').evaluate((el) => el.scrollTop), 0);
  assert.equal(
    await page
      .locator('header,footer,#direct-content,#walk-surface,[data-step],.touch-pad,canvas')
      .count(),
    0,
  );
}
async function audit(page, name) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  assert.deepEqual(
    violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
    `${name}: accessibility violations`,
  );
}
async function swipe(page, from, to, y) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from, y }],
  });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from + ((to - from) * i) / 10, y }],
    });
    await delay(18);
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await cdp.detach();
  await settled(page);
}
try {
  await mkdir('artifacts', { recursive: true });
  await until(async () => {
    try {
      const match = startup.match(/THE DATA PUB PREVIEW → (http:\/\/127\.0\.0\.1:\d+\/)/);
      if (!match) return false;
      url = match[1].replace(/\/$/, '');
      const r = await fetch(url);
      runtime = r.headers.get('x-preview-runtime');
      return r.ok && runtime?.startsWith('Bun/');
    } catch {
      return false;
    }
  }, `Bun preview failed: ${startup}`);
  await check(
    'Bun serves static pages, MIME types, redirects, HEAD and 404 correctly',
    async () => {
      for (const path of ['/', '/events/', '/blog/', '/about/', '/contact/']) {
        const r = await fetch(url + path);
        assert.equal(r.status, 200);
        assert.match(r.headers.get('content-type'), /text\/html/);
      }
      const png = await fetch(url + '/assets/pub/bar-base.png');
      assert.match(png.headers.get('content-type'), /image\/png/);
      const js = await fetch(url + '/assets/js/app.js');
      assert.match(js.headers.get('content-type'), /(javascript|ecmascript)/);
      const head = await fetch(url, { method: 'HEAD' });
      assert.equal(head.status, 200);
      assert.equal((await head.arrayBuffer()).byteLength, 0);
      const redirect = await fetch(url + '/blog?from=pub', {
        redirect: 'manual',
      });
      assert.equal(redirect.status, 301);
      assert.equal(redirect.headers.get('location'), '/blog/?from=pub');
      assert.equal((await fetch(url + '/missing-route/')).status, 404);
      assert.equal((await fetch(url, { method: 'POST' })).status, 405);
    },
  );
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await stubCalendar(context);
  context.on('page', (page) => {
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
  });
  context.on('request', (r) => {
    if (r.url() !== calendarEmbed && !r.url().startsWith(url) && !r.url().startsWith('data:')) external.push(r.url());
  });
  const page = await context.newPage();
  await ready(page);
  await check(
    'home is the full viewport, starts at Barman and contains no avatar controls',
    async () => {
      await layout(page, 1440, 900);
      assert.ok(
        Math.abs(
          Number(await page.locator('#bar-viewport').getAttribute('data-center')) - SCENE.start,
        ) < 2,
      );
      assert.equal(await page.locator('.bar-art').count(), 1);
      const agenda = await page.locator('#spot-events').boundingBox();
      assert.ok(agenda.x >= 0 && agenda.x + agenda.width <= 1440);
      for (const [id, prop] of Object.entries(SCENE_OBJECTS)) {
        const selector =
          id === 'team' ? '#team-board' : id === 'speakers' ? '#speakers-board' : `#spot-${id}`;
        assert.equal(await page.locator(selector).count(), 1);
        const geometry = await page.locator(selector).evaluate((el) => {
          const a = document.querySelector('.bar-art').getBoundingClientRect();
          const b = el.getBoundingClientRect();
          return {
            x: ((b.x - a.x) / a.width) * 1920,
            y: ((b.y - a.y) / a.height) * 480,
            w: (b.width / a.width) * 1920,
            h: (b.height / a.height) * 480,
          };
        });
        for (const [key, expected] of [
          ['x', prop.x],
          ['y', prop.y],
          ['w', prop.width],
          ['h', prop.height],
        ]) {
          assert.ok(Math.abs(geometry[key] - expected) < 0.02, `${id} ${key}`);
        }
      }
      assert.equal(
        await page.locator('#bar-viewport').evaluate((el) => getComputedStyle(el).scrollSnapType),
        'none',
      );
      assert.equal(
        await page.evaluate(
          () =>
            document.fonts.check('600 20px Fraunces') &&
            document.fonts.check('400 14px "Source Sans 3"'),
        ),
        true,
      );
      await page.screenshot({ path: 'artifacts/speakers-update-initial-desktop.png' });
      await audit(page, 'desktop home');
    },
  );
  await check(
    'Barman sprite stays registered, plays approved mouth/blink frames without layout shifts; motion settings restore the exact static first frame',
    async () => {
      await page.evaluate(() => {
        window.spriteShifts = [];
        new PerformanceObserver((list) =>
          window.spriteShifts.push(...list.getEntries().map((e) => e.value)),
        ).observe({ type: 'layout-shift' });
      });
      const art = await page.locator('.bar-art').boundingBox();
      const scale = art.width / SCENE.width;
      const clip = {
        x: art.x + BARMAN.x * scale,
        y: art.y + BARMAN.y * scale,
        width: BARMAN.width * scale,
        height: BARMAN.height * scale,
      };
      const geometry = await page.locator('.barman-sprite').boundingBox();
      for (const key of ['x', 'y', 'width', 'height'])
        assert.ok(Math.abs(geometry[key] - clip[key]) < 0.1, key);
      assert.equal((await spriteState(page)).pointer, 'none');
      assert.equal(await page.locator('.barman-sprite').getAttribute('aria-hidden'), 'true');
      await page.locator('.barman-sprite').evaluate((el) => {
        const animation = el.getAnimations()[0];
        animation.currentTime = 2790;
        animation.play();
      });
      await until(
        async () => (await spriteState(page)).position !== '0%',
        'Live sprite animation did not advance',
      );
      await spriteFrame(page, 0);
      const idle = await page.screenshot({ clip });
      let elapsed = 0;
      for (let i = 0; i < BARMAN.frames; i++) {
        await spriteFrame(page, elapsed + 5);
        assert.ok(
          Math.abs(parseFloat((await spriteState(page)).position) - (i / (BARMAN.frames - 1)) * 100) <
            0.001,
        );
        const frame = await page.screenshot({
          clip,
          path: `artifacts/barman-frame-${i + 1}.png`,
        });
        if (i === 0 || i === 4) assert.ok(frame.equals(idle), 'Rest frame must remain exact');
        else assert.ok(!frame.equals(idle), `Frame ${i + 1} should visibly differ from rest`);
        assert.deepEqual(await page.locator('.barman-sprite').boundingBox(), geometry);
        elapsed += BARMAN.frameDurations[i];
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await until(
        async () => (await spriteState(page)).display === 'none',
        'System motion preference did not hide animation',
      );
      assert.equal((await spriteState(page)).animations, 0);
      assert.ok(
        (await page.screenshot({ clip })).equals(idle),
        'Reduced motion must match first frame pixel for pixel',
      );
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await until(
        async () => (await spriteState(page)).animations === 1,
        'Animation did not resume',
      );
      await spriteFrame(page, 6285);
      await menuOpen(page);
      await page.locator('#motion-toggle').click();
      await page.keyboard.press('Escape');
      assert.equal((await spriteState(page)).display, 'none');
      assert.ok(
        (await page.screenshot({ clip })).equals(idle),
        'Manual motion off must match first frame',
      );
      await menuOpen(page);
      await page.locator('#motion-toggle').click();
      await page.keyboard.press('Escape');
      assert.equal((await spriteState(page)).animations, 1);
      // The OS preference still forbids ambient motion if smooth camera is opted in manually.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await until(
        async () => (await spriteState(page)).display === 'none',
        'System reduction not applied',
      );
      await menuOpen(page);
      await page.locator('#motion-toggle').click();
      await page.keyboard.press('Escape');
      assert.equal((await spriteState(page)).display, 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await until(
        async () => (await spriteState(page)).animations === 1,
        'Ambient animation not restored',
      );
      assert.deepEqual(await page.evaluate(() => window.spriteShifts), []);
    },
  );
  await check(
    'native camera accepts arbitrary offsets and horizontal wheel without slides',
    async () => {
      await page.locator('#bar-viewport').evaluate((el) => (el.scrollLeft = 1234));
      await settled(page);
      const imageX = (await page.locator('.bar-art').boundingBox()).x;
      await page.locator('#bar-viewport').evaluate((el) => (el.scrollLeft = 1271));
      await settled(page);
      assert.equal(await offset(page), 1271);
      assert.ok(Math.abs((await page.locator('.bar-art').boundingBox()).x - imageX + 37) < 1);
      await page.mouse.move(900, 400);
      await page.mouse.wheel(173, 0);
      await until(async () => (await offset(page)) > 1300, 'Horizontal wheel did not pan');
      await settled(page);
      const before = await offset(page);
      await page.mouse.wheel(0, 80);
      await delay(150);
      assert.equal(await offset(page), before);
    },
  );
  await check('mouse drag pans continuously and releases cleanly', async () => {
    await page.locator('#bar-viewport').evaluate((el) => (el.scrollLeft = 1100));
    await settled(page);
    // Drag the empty floor; the wall now contains an interactive team board.
    const dragY = page.viewportSize().height - 20;
    await page.mouse.move(1000, dragY);
    await page.mouse.down();
    await page.mouse.move(790, dragY, { steps: 12 });
    await page.mouse.up();
    await settled(page);
    assert.ok((await offset(page)) >= 1290);
    assert.equal(await page.locator('.is-dragging').count(), 0);
  });
  await check(
    'keyboard pans, clamps both ends and Tab reveals offscreen objects without trapping focus',
    async () => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await until(
        async () => (await page.locator('#motion-toggle').getAttribute('aria-pressed')) === 'true',
        'Reduced motion was not applied',
      );
      await page.locator('#bar-viewport').focus();
      await page.keyboard.press('Home');
      assert.equal(await offset(page), 0);
      assert.equal(await page.locator('#pan-left').isDisabled(), true);
      await page.keyboard.press('ArrowRight');
      assert.ok((await offset(page)) > 250);
      await page.keyboard.press('End');
      const max = await page
        .locator('#bar-viewport')
        .evaluate((el) => el.scrollWidth - el.clientWidth);
      assert.equal(await offset(page), max);
      await until(
        () => page.locator('#pan-right').isDisabled(),
        'Right boundary control not disabled',
      );
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'team-board');
      const boardBounds = await page.locator('#team-board').boundingBox();
      assert.ok(boardBounds.x >= 0 && boardBounds.x + boardBounds.width <= 1440);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'spot-about');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'speakers-board');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'spot-vhs');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'spot-library');
      const b = await page.locator('#spot-library').boundingBox();
      assert.ok(b.x >= 0 && b.x + b.width <= 1440);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'spot-events');
      await page.keyboard.press('Tab');
      assert.notEqual(await page.evaluate(() => document.activeElement.id), 'bar-viewport');
    },
  );
  await check(
    'team board pans with the artwork and supports click, keyboard, dismissal and reopening',
    async () => {
      const board = page.locator('#team-board');
      await board.focus();
      const geometry = await board.evaluate((el) => {
        const art = document.querySelector('.bar-art').getBoundingClientRect();
        const b = el.getBoundingClientRect();
        return { x: (b.x - art.x) / art.width, y: (b.y - art.y) / art.height };
      });
      assert.ok(Math.abs(geometry.x - TEAM_BOARD.x / SCENE.width) < 0.0001);
      assert.ok(Math.abs(geometry.y - TEAM_BOARD.y / SCENE.height) < 0.0001);
      await page.keyboard.press('Enter');
      await page.locator('#content-dialog[open]').waitFor();
      assert.match(await page.locator('#panel-label').textContent(), /El equipo/);
      assert.match(await page.locator('#panel-content').textContent(), /coorganizadores/);
      await audit(page, 'team contact panel');
      await page.screenshot({ path: 'artifacts/speakers-update-team-board-about.png' });
      await page.keyboard.press('Escape');
      assert.equal(await board.evaluate((el) => document.activeElement === el), true);
      assert.notEqual(await board.evaluate((el) => getComputedStyle(el).outlineStyle), 'none');
      await board.click();
      await page.locator('#content-dialog .close-button').click();
      assert.equal(await board.evaluate((el) => document.activeElement === el), true);
      await board.click();
      await page.locator('#content-dialog .panel-foot button').click();
      assert.equal(await board.evaluate((el) => document.activeElement === el), true);
      const before = await board.boundingBox();
      const beforeScroll = await offset(page);
      await page.locator('#bar-viewport').evaluate((el) => {
        el.scrollLeft += 110;
      });
      await settled(page);
      const after = await board.boundingBox();
      assert.ok(Math.abs(before.x - after.x - ((await offset(page)) - beforeScroll)) < 1);
      await board.focus();
      await page.screenshot({ path: 'artifacts/speakers-update-team-board-desktop.png' });
    },
  );
  await check(
    'embedded objects open immediately, repeat safely and restore their own focus',
    async () => {
      for (let round = 0; round < 2; round++)
        for (const id of ['library', 'about', 'events']) {
          const spot = page.locator(`#spot-${id}`);
          await spot.focus();
          await page.keyboard.press('Enter');
          assert.equal(await page.locator('#content-dialog').evaluate((el) => el.open), true);
          assert.equal(await page.locator('#panel-title').count(), 1);
          assert.ok(await page.locator('#panel-title').textContent());
          if (id === 'events' && round === 0) {
            assert.match(await page.locator('#panel-content').textContent(), /Luma/);
            await audit(page, 'agenda panel');
            await page.screenshot({
              path: 'artifacts/barman-agenda-panel.png',
            });
          }
          await page.keyboard.press('Escape');
          assert.equal(await spot.evaluate((el) => document.activeElement === el), true);
        }
      assert.equal(await page.locator('#discovery').textContent(), '3 / 3 rincones descubiertos');
      await page.screenshot({ path: 'artifacts/barman-calendar.png' });
      await page.locator('#spot-library').focus();
      await page.screenshot({ path: 'artifacts/barman-library.png' });
    },
  );
  await check(
    'counter menu provides all shortcuts, help and motion settings with correct focus',
    async () => {
      for (const id of ['events', 'library', 'about', 'contact']) {
        await menuOpen(page);
        await page.locator(`.menu-panel [data-open="${id}"]`).click();
        await page.locator('#content-dialog[open]').waitFor();
        await page.keyboard.press('Escape');
        assert.equal(
          await page.locator('#pub-menu>summary').evaluate((el) => document.activeElement === el),
          true,
        );
        assert.equal(await page.locator('#pub-menu').evaluate((el) => el.open), false);
      }
      await menuOpen(page);
      await audit(page, 'counter menu');
      await page.screenshot({ path: 'artifacts/barman-menu.png' });
      await page.locator('#help-open').click();
      await page.locator('#help-dialog[open]').waitFor();
      await audit(page, 'help');
      await page.locator('#start-exploring').click();
      assert.equal(
        await page.locator('#bar-viewport').evaluate((el) => document.activeElement === el),
        true,
      );
      await menuOpen(page);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#pub-menu').evaluate((el) => el.open), false);
    },
  );
  await check(
    'reduced motion is immediate and changing it stops in-progress camera movement',
    async () => {
      await page.locator('#bar-viewport').focus();
      await page.keyboard.press('Home');
      await page.locator('#pan-right').click();
      assert.ok((await offset(page)) > 850);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await until(
        async () => (await page.locator('#motion-toggle').getAttribute('aria-pressed')) === 'false',
        'Smooth camera preference not restored',
      );
      const before = await offset(page);
      await page.locator('#pan-right').click();
      await until(async () => (await offset(page)) > before, 'Smooth camera did not begin panning');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await until(
        async () => (await page.locator('#motion-toggle').getAttribute('aria-pressed')) === 'true',
        'Reduced camera preference not applied',
      );
      const frozen = await offset(page);
      await delay(500);
      assert.ok(Math.abs((await offset(page)) - frozen) <= 1);
    },
  );
  await check('resizing preserves the camera center and full-viewport composition', async () => {
    await page.locator('#spot-events').focus();
    await settled(page);
    const center = Number(await page.locator('#bar-viewport').getAttribute('data-center'));
    await page.setViewportSize({ width: 390, height: 844 });
    await delay(100);
    await layout(page, 390, 844);
    assert.ok(
      Math.abs(Number(await page.locator('#bar-viewport').getAttribute('data-center')) - center) <
        3,
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await delay(100);
    await layout(page, 1440, 900);
  });
  await check(
    'mobile fills portrait and landscape viewports; real swipes and tap hotspots work',
    async () => {
      for (const [width, height] of [
        [320, 740],
        [390, 844],
        [768, 1024],
        [844, 390],
      ]) {
        const mobileContext = await browser.newContext({
          viewport: { width, height },
          isMobile: true,
          hasTouch: true,
          reducedMotion: 'reduce',
        });
        await stubCalendar(mobileContext);
        const mobile = await mobileContext.newPage();
        mobile.on('pageerror', (e) => errors.push(e.message));
        await ready(mobile);
        await layout(mobile, width, height);
        if (width === 390)
          await mobile.screenshot({ path: 'artifacts/speakers-update-initial-mobile.png' });
        const agenda = mobile.locator('#spot-events');
        assert.ok(
          Math.abs(
            Number(await mobile.locator('#bar-viewport').getAttribute('data-center')) - SCENE.start,
          ) < 2,
        );
        await agenda.focus();
        await agenda.tap();
        await mobile.locator('#content-dialog[open]').waitFor();
        await mobile.locator('#content-dialog .close-button').tap();
        assert.equal(await agenda.evaluate((el) => document.activeElement === el), true);
        assert.equal((await spriteState(mobile)).display, 'none');
        assert.equal((await spriteState(mobile)).animations, 0);
        await mobile.emulateMedia({ reducedMotion: 'no-preference' });
        await until(
          async () => (await spriteState(mobile)).animations === 1,
          'Mobile sprite animation missing',
        );
        const beforeSprite = await mobile.locator('.barman-sprite').boundingBox();
        await spriteFrame(mobile, 6285);
        assert.ok(Math.abs(parseFloat((await spriteState(mobile)).position) - 600 / 7) < 0.001);
        assert.deepEqual(await mobile.locator('.barman-sprite').boundingBox(), beforeSprite);
        await mobile.locator('#pub-menu>summary').tap();
        await mobile.locator('#motion-toggle').tap();
        await mobile.locator('#pub-menu>summary').tap();
        assert.equal((await spriteState(mobile)).display, 'none');
        await mobile.locator('#pub-menu>summary').tap();
        await mobile.locator('#motion-toggle').tap();
        await mobile.locator('#pub-menu>summary').tap();
        assert.equal((await spriteState(mobile)).animations, 1);
        await mobile.emulateMedia({ reducedMotion: 'reduce' });
        await until(
          async () => (await spriteState(mobile)).display === 'none',
          'Mobile reduced motion not restored',
        );
        const start = await offset(mobile);
        await swipe(mobile, width * 0.8, width * 0.2, height * 0.45);
        assert.ok((await offset(mobile)) > start + 50, `Touch swipe did not pan at ${width}`);
        const after = await offset(mobile);
        await swipe(mobile, width * 0.2, width * 0.8, height * 0.45);
        assert.ok((await offset(mobile)) < after - 50);
        const board = mobile.locator('#team-board');
        await board.focus();
        const boardBounds = await board.boundingBox();
        assert.ok(boardBounds.width >= 44 && boardBounds.height >= 44);
        assert.ok(boardBounds.x >= 0 && boardBounds.x + boardBounds.width <= width + 1);
        if (width === 390)
          await mobile.screenshot({ path: 'artifacts/speakers-update-team-board-mobile.png' });
        for (let round = 0; round < 2; round++) {
          await board.tap();
          await mobile.locator('#content-dialog[open]').waitFor();
          await mobile.locator('#content-dialog .close-button').tap();
          assert.equal(await board.evaluate((el) => document.activeElement === el), true);
        }
        for (const id of ['library', 'about', 'events']) {
          const spot = mobile.locator(`#spot-${id}`);
          await spot.focus();
          const b = await spot.boundingBox();
          assert.ok(b.width >= 44 && b.height >= 44 && b.x >= 0 && b.x + b.width <= width + 1);
          await spot.tap();
          await mobile.locator('#content-dialog[open]').waitFor();
          await mobile.locator('#content-dialog .close-button').tap();
          if (width === 390 && id === 'library')
            await mobile.screenshot({ path: 'artifacts/speakers-update-library-mobile.png' });
        }
        if (width === 390) {
          await mobile.screenshot({
            path: 'artifacts/barman-mobile-calendar.png',
          });
          await audit(mobile, 'mobile');
        }
        await mobileContext.close();
      }
    },
  );
  await check(
    'no-JavaScript artwork, native menu and preserved content routes work through Bun',
    async () => {
      const nojs = await browser.newContext({
          javaScriptEnabled: false,
          viewport: { width: 390, height: 844 },
        }),
        text = await nojs.newPage();
      await stubCalendar(nojs);
      await text.goto(url);
      await layout(text, 390, 844);
      assert.equal((await spriteState(text)).display, 'none');
      assert.equal((await spriteState(text)).animations, 0);
      assert.equal(
        await text.locator('.bar-art').evaluate((el) => el.complete && el.naturalWidth === 1920),
        true,
      );
      assert.equal(
        await text.locator('[data-open][aria-haspopup],[data-topic][aria-haspopup]').count(),
        0,
      );
      await text.locator('#team-board').click();
      assert.ok(text.url().endsWith('/contact/'));
      await text.goto(url);
      await text.locator('#pub-menu>summary').click();
      await text.locator('.menu-panel [data-open="events"]').click();
      assert.ok(text.url().endsWith('/events/'));
      for (const route of ['events', 'blog', 'about', 'contact']) {
        const response = await text.goto(`${url}/${route}/`);
        assert.equal(response.status(), 200);
        assert.equal(await text.locator('h1').count(), 1);
        assert.equal(await text.locator('.article-links a').first().isVisible(), true);
      }
      await nojs.close();
    },
  );
  assert.deepEqual(errors, [], 'Runtime/console errors');
  assert.deepEqual(external, [], 'Unexpected external requests');
  await writeFile(
    'artifacts/barman-browser-results.json',
    JSON.stringify(
      {
        browser: await browser.version(),
        runtime,
        passed,
        consoleErrors: errors,
        externalRequests: external,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Verified ${passed.length} scenarios using ${runtime}; evidence in artifacts/barman-*.png.`,
  );
} finally {
  await browser?.close();
  server.kill();
}
