import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { content } from '../src/content.mjs';
import { generateArchive } from './archive-data.mjs';
const {posts}=await generateArchive();
import { renderHome } from '../src/home.mjs';
import { buildSpeakers } from '../src/speakers.mjs';
const agenda = content.sections.find(section => section.id === 'events');

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
const mark = (prefix) =>
  `<img src="${prefix}assets/mark.svg" width="54" height="54" alt="" class="brand-mark">`;
const header = (prefix, active = '') => `<a class="skip-link" href="#main">Saltar al contenido</a>
<header class="masthead"><a class="brand" href="${prefix}">${mark(prefix)}<span>The Data Pub<small>EST. 2015 <b>◆</b> RIGOR SIN POSE</small></span></a>
<nav aria-label="Principal">${content.sections
  .map(
    (s) =>
      `<a href="${prefix}${s.route}/" ${active === s.id ? 'aria-current="page"' : ''}>${s.label}</a>`,
  )
  .join(
    '',
  )}<a class="nav-meetup" href="${active === 'events' ? agenda.calendar.url : content.meetup}">${active === 'events' ? 'Calendario en Luma' : 'Nos vemos en Meetup'} <span aria-hidden="true">↗</span></a></nav></header>`;
const head = (title, prefix, description, withCalendar = false) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com${withCalendar ? ' https://luma.com' : ''}; object-src 'none'; base-uri 'self'; form-action 'self'"><meta name="referrer" content="strict-origin-when-cross-origin"><meta name="theme-color" content="#24343B"><meta name="description" content="${escape(description)}"><title>${title}</title><link rel="icon" href="${prefix}assets/mark.svg" type="image/svg+xml"><link rel="preload" href="${prefix}assets/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="${prefix}assets/styles.css"></head>`;
const footer = (prefix) =>
  `<footer class="site-footer"><span>The Data Pub <b>◆</b> No Bullshit AI</span><span><a href="${prefix}about/">Acerca del pub</a><a href="${prefix}contact/">Contacto</a><span>Una mesa abierta desde 2015.</span></span></footer>`;
function blocksHtml(blocks, heading) {
  return (blocks || []).map((block) => `<section class="article-section"><${heading}>${escape(block.title)}</${heading}>${(block.paragraphs || []).map((p) => `<p>${escape(p)}</p>`).join('')}${block.steps ? `<ol>${block.steps.map((step) => `<li>${escape(step)}</li>`).join('')}</ol>` : ''}</section>`).join('');
}
function article(section, heading = 'h2', prefix = '') {
  const subheading = heading === 'h1' ? 'h2' : 'h3';
  const body = blocksHtml(section.blocks, subheading);
  // Templates are inert: the home does not load Luma until Agenda is opened.
  // The same markup works on /events/ with no JavaScript.
  const calendar = section.calendar ? `<div class="agenda-calendar"><iframe src="${escape(section.calendar.embedUrl)}" title="${escape(section.calendar.title)}" width="600" height="450" loading="lazy" allowfullscreen></iframe></div>` : '';
  const readings = section.id === 'library' ? `<div class="post-list">${posts.map((post) => `<article><p class="post-date"><time datetime="${post.date}">${escape(post.dateLabel)}</time> · ${escape(post.author)}</p><${subheading}><a href="${prefix}blog/${post.slug}/">${escape(post.title)}</a></${subheading}><p>${escape(post.summary)}</p><a class="text-link" href="${prefix}blog/${post.slug}/">Leer publicación →</a></article>`).join('')}</div>` : '';
  const events =
    section.id === 'events' && content.events.length
      ? `<ul class="event-list">${content.events.map((e) => `<li><time datetime="${escape(e.datetime)}">${escape(e.dateLabel)}</time><h3>${escape(e.title)}</h3><p>${escape(e.venue)}</p><a href="${escape(e.url)}">Ver encuentro ↗</a></li>`).join('')}</ul>`
      : '';
  return `<article class="content-article" data-content="${section.id}"><p class="eyebrow">${escape(section.kicker)}</p><${heading}>${escape(section.title)}</${heading}><p class="article-lead">${escape(section.description)}</p>${events}${calendar}${body}${readings}<div class="content-note"><p>${escape(section.note)}</p></div><div class="article-links">${section.links.map((link, i) => `<a class="${i === 0 ? 'primary-link' : 'text-link'}" href="${escape(link.internal ? prefix + link.href : link.href)}">${escape(link.label)} <span aria-hidden="true">↗</span></a>`).join('')}</div></article>`;
}

const home = renderHome({ head: (...args) => head(...args, true), article, content });

// Committed static exports keep ordinary builds independent of Aseprite.
const art = JSON.parse(await readFile('art/export-manifest.json', 'utf8'));
if (art.sourceScale !== 1) throw new Error('Expected native approved art. Run bun run art:export.');
await mkdir('site', { recursive: true });
await writeFile('site/index.html', home);
for (const section of content.sections) {
  await mkdir(`site/${section.route}`, { recursive: true });
  await writeFile(
    `site/${section.route}/index.html`,
    `${head(`${section.label} · The Data Pub`, '../', section.description, Boolean(section.calendar))}<body>${header('../', section.id)}<main id="main" class="text-page"><a class="back-link" href="../">← Volver a la barra</a>${article(section, 'h1', '../')}<aside class="page-aside"><img src="../assets/mark.svg" width="72" height="72" alt=""><p>Una buena conversación<br>empieza con una pregunta.</p><a href="../">Entrar al pub <span aria-hidden="true">→</span></a></aside></main>${footer('../')}</body></html>`,
  );
}
await writeFile(
  'site/404.html',
  `${head('Esta mesa está libre · The Data Pub', '/', 'Vuelve a la barra de The Data Pub.')}<body>${header('/')}<main id="main" class="not-found"><p class="eyebrow">404 · POR AQUÍ NO HAY MESA</p><h1>Volvamos a la barra.</h1><p>Ese rincón todavía no existe.</p><a class="primary-link" href="/">Entrar al pub →</a></main>${footer('/')}</body></html>`,
);
for (const post of posts) {
  await mkdir(`site/blog/${post.slug}`, { recursive: true });
  await writeFile(`site/blog/${post.slug}/index.html`,
    `${head(`${escape(post.title)} · The Data Pub`, '../../', post.summary)}<body>${header('../../', 'library')}<main id="main" class="text-page post-page"><a class="back-link" href="../">← Volver al librero</a><article class="content-article"><p class="eyebrow">Publicaciones · Comunidad · Anuncios</p><h1>${escape(post.title)}</h1><p class="post-date"><time datetime="${post.date}">${escape(post.dateLabel)}</time> · ${escape(post.author)}</p><p class="article-lead">${escape(post.summary)}</p><div class="content-note"><p>${escape(post.note)}</p></div>${blocksHtml(post.blocks, 'h2')}<div class="article-links"><a class="primary-link" href="../../contact/">Encontrar a la comunidad →</a></div></article></main>${footer('../../')}</body></html>`);
}
console.log(`Built ${6 + posts.length} static HTML pages in site/; no runtime dependencies.`);
await buildSpeakers(head);
