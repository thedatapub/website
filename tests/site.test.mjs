import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { content } from '../src/content.mjs';

test('generated routes preserve the public content areas with local static navigation', async () => {
  for (const route of ['', 'events/', 'blog/', 'about/', 'contact/']) {
    const path = resolve('site', route, 'index.html');
    const html = await readFile(path, 'utf8');
    assert.match(html, /<html lang="es">/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      const href = match[1];
      if (/^[a-z]+:/.test(href)) continue;
      const target = resolve(dirname(path), href);
      const info = await stat(target);
      assert.ok(info.isFile() || info.isDirectory(), href);
    }
    assert.doesNotMatch(html, /jquery|semantic|google-analytics/i);
    if (!['', 'events/'].includes(route)) assert.doesNotMatch(html, /iframe|luma\.com/);
  }
});
test('brand fonts are real WOFF2 files with included open-source licenses', async () => {
  for (const name of ['fraunces', 'source-sans-3']) {
    const font = await readFile(`site/assets/fonts/${name}-latin.woff2`);
    assert.equal(font.subarray(0, 4).toString(), 'wOF2');
    assert.ok(font.length < 150000);
  }
  for (const name of ['fraunces', 'sourcesans3'])
    assert.match(
      await readFile(`site/assets/fonts/${name}-OFL.txt`, 'utf8'),
      /SIL OPEN FONT LICENSE/,
    );
});
test('no unconfirmed event is presented as upcoming', () => {
  assert.equal(content.checked, '2026-11-13');
  for (const event of content.events) {
    assert.ok(!Number.isNaN(Date.parse(event.datetime)));
    assert.match(event.datetime, /(Z|[+-]\d{2}:\d{2})$/);
    assert.equal(new URL(event.url).origin, 'https://luma.com');
    assert.ok(event.venue && event.dateLabel && event.title);
  }
  assert.equal(content.sections[0].links[0].href, content.sections[0].calendar.url);
});
test('full-screen home has a native menu, static shortcuts and content templates', async () => {
  const html = await readFile('site/index.html', 'utf8');
  for (const section of content.sections) {
    assert.ok(html.includes(`data-content="${section.id}"`));
    assert.ok(html.includes(section.title));
  }
  assert.match(html, /<h1 id="site-title" class="sr-only">No Bullshit AI\.<\/h1>/);
  assert.match(html, /assets\/pub\/bar-base\.png/);
  assert.match(html, /<details class="pub-menu"/);
  assert.match(html, /<template id="pub-content">/);
  for (const route of ['events', 'blog', 'about', 'contact'])
    assert.ok(html.includes(`href="${route}/"`));
  assert.doesNotMatch(
    html,
    /<header|<footer|id="direct-content"|walk-surface|data-step|touch-pad|<canvas/,
  );
});

test('migrated content stays local, dated and separate from the decorative host', async () => {
  const { posts } = await import('../src/posts.mjs');
  assert.equal(posts.length, 1);
  assert.equal(posts[0].date, '2026-05-11');
  for (const [route, phrases] of Object.entries({
    'about/': ['Rigor sin barreras', 'Lo que conversamos', 'desde 2015', 'Av. Revolución 756'],
    'events/': ['Cómo funcionan nuestros eventos', 'Revisa el calendario', 'Confirma tu asistencia', 'Ven y disfruta'],
    'contact/': ['Jesús Ramos', 'Propón una charla', 'LinkedIn', 'Facebook'],
    'blog/': ['2026-05-11', 'blog/primer-post/'],
    'blog/primer-post/': ['2026-05-11', 'Publicación histórica', 'newsletter', 'mayo de 2026'],
  })) {
    const html=await readFile(`site/${route}index.html`, 'utf8');
    for (const phrase of phrases) assert.ok(html.includes(phrase), `${route}: ${phrase}`);
    assert.doesNotMatch(html, /href="https?:\/\/(?:www\.)?thedata\.pub(?:\/|")/);
    assert.doesNotMatch(html, /http-equiv="refresh"|Barman/);
    if (route !== 'events/') assert.doesNotMatch(html, /iframe/);
  }
  const home=await readFile('site/index.html','utf8');
  assert.match(home,/id="team-board"[^>]+href="contact\/"[^>]+data-open="contact"/);
  assert.match(home,/class="pub-sign scene-hotspot"[^>]+href="about\/"[^>]+data-open="about"/);
  assert.doesNotMatch(await readFile('site/events/index.html','utf8'), /<table|Eventos Recientes/);
});

test('Agenda shares the exact accessible Luma embed and limits CSP to its two surfaces', async () => {
  const agenda = content.sections.find(s => s.id === 'events');
  assert.equal(agenda.calendar.embedUrl, 'https://luma.com/embed/calendar/cal-fH2RJsxbE5e0vtS/events');
  assert.equal(agenda.calendar.url, 'https://luma.com/thedatapub');
  for (const route of ['', 'events/', 'about/', 'contact/', 'blog/', 'tv/', 'speakers/']) {
    const html = await readFile(`site/${route}index.html`, 'utf8');
    const frames = html.match(/frame-src ([^;]+)/)[1].split(' ');
    assert.deepEqual(frames, ['https://www.youtube-nocookie.com', ...(['', 'events/'].includes(route) ? ['https://luma.com'] : [])]);
    if (['', 'events/'].includes(route)) {
      assert.ok(html.includes(`src="${agenda.calendar.embedUrl}"`));
      assert.match(html, /<iframe[^>]+title="Calendario de eventos de The Data Pub en Luma"[^>]+width="600" height="450" loading="lazy" allowfullscreen>/);
      const article = html.match(/<article class="content-article" data-content="events">([\s\S]*?)<\/article>/)[1];
      assert.doesNotMatch(article, /meetup/i);
      assert.ok(article.includes(`href="${agenda.calendar.url}"`));
      assert.match(article, /vacío o no carga/);
    }
    if (route === 'events/') assert.doesNotMatch(html, /meetup\.com/);
    if (route === 'about/' || route === 'contact/') assert.ok(html.includes(content.meetup));
  }
});
