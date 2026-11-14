import {
  SCENE,
  sights,
  cameraBounds,
  centeredScroll,
  sceneCenter,
  displayLayout,
} from './camera.js';
import { initArchive } from './archive.js';

const viewport = document.querySelector('#bar-viewport');
const world = document.querySelector('#bar-range');
const menu = document.querySelector('#pub-menu');
const menuTrigger = menu.querySelector('summary');
const dialog = document.querySelector('#content-dialog');
const help = document.querySelector('#help-dialog');
const motion = document.querySelector('#motion-toggle');
const left = document.querySelector('#pan-left'),
  right = document.querySelector('#pan-right');
const status = document.querySelector('#room-status');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const seen = new Set();
// Restored focus after a tap/click must not impersonate keyboard focus.
// CSS owns the transient highlight; no visited/active class can leave it stuck.
document.addEventListener('pointerdown', () => {
  document.body.dataset.sceneInput = 'pointer';
}, true);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' || event.key.startsWith('Arrow'))
    document.body.dataset.sceneInput = 'keyboard';
}, true);
let reduced = preference.matches,
  logicalCenter = SCENE.start,
  frame = 0,
  drag = null;

function syncCamera() {
  logicalCenter = sceneCenter(viewport.scrollLeft, viewport.clientWidth, world.offsetWidth);
  const max = cameraBounds(viewport.clientWidth, world.offsetWidth);
  left.disabled = viewport.scrollLeft <= 1;
  right.disabled = viewport.scrollLeft >= max - 1;
  viewport.dataset.center = logicalCenter.toFixed(2);
}
function cancelPan() {
  viewport.scrollTo({ left: viewport.scrollLeft, behavior: 'auto' });
}
function panTo(logicalX, instant = false) {
  viewport.scrollTo({
    left: centeredScroll(logicalX, viewport.clientWidth, world.offsetWidth),
    behavior: instant || reduced ? 'auto' : 'smooth',
  });
  if (instant || reduced) syncCamera();
}
function panBy(amount) {
  viewport.scrollBy({ left: amount, behavior: reduced ? 'auto' : 'smooth' });
  if (reduced) syncCamera();
}
function updateMotion() {
  motion.setAttribute('aria-pressed', String(reduced));
  motion.textContent = reduced ? 'Movimiento: desactivado' : 'Movimiento: activado';
  // OS reduction always wins for ambient sprite motion, even if smooth pan is opted in.
  document.body.dataset.motion = reduced || preference.matches ? 'reduced' : 'full';
}
function openTopic(id, origin) {
  const source = document
    .querySelector('#pub-content')
    .content.querySelector(`[data-content="${id}"]`);
  if (!source) return;
  cancelPan();
  const trigger = menu.contains(origin) ? menuTrigger : origin;
  menu.open = false;
  if (help.open) help.close();
  if (dialog.open) dialog.close();
  const clone = source.cloneNode(true);
  clone.removeAttribute('data-content');
  const oldHeading = clone.querySelector('h3'),
    heading = document.createElement('h2');
  heading.id = 'panel-title';
  heading.textContent = oldHeading.textContent;
  oldHeading.replaceWith(heading);
  document.querySelector('#panel-content').replaceChildren(clone);
  document.querySelector('#panel-label').textContent = sights[id]?.label || 'El equipo';
  if (id in sights) seen.add(id);
  document.querySelector('#discovery').textContent = `${seen.size} / 3 rincones descubiertos`;
  status.textContent = `${sights[id]?.label || 'Contacto'}. ${seen.size} de 3 rincones descubiertos.`;
  trigger?.focus({ preventScroll: true });
  dialog.showModal();
  dialog.querySelector('[data-close]').focus({ preventScroll: true });
}

for (const link of document.querySelectorAll('[data-topic],[data-open]')) {
  link.setAttribute('aria-haspopup', 'dialog');
  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)
      return;
    event.preventDefault();
    openTopic(link.dataset.topic || link.dataset.open, link);
  });
}
for (const link of document.querySelectorAll('[data-topic],[data-scene-x]'))
  link.addEventListener('focus', () => {
    const bounds = link.getBoundingClientRect(),
      windowBounds = viewport.getBoundingClientRect();
    if (bounds.left < windowBounds.left + 12 || bounds.right > windowBounds.right - 12)
      panTo(Number(link.dataset.sceneX) || sights[link.dataset.topic].x, true);
  });
left.hidden = false;
right.hidden = false;
motion.hidden = false;
document.querySelector('#help-open').hidden = false;
left.addEventListener('click', () => panBy(-viewport.clientWidth * 0.62));
right.addEventListener('click', () => panBy(viewport.clientWidth * 0.62));
viewport.addEventListener('keydown', (event) => {
  if (event.target !== viewport || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    panBy(viewport.clientWidth * 0.22 * (event.key === 'ArrowLeft' ? -1 : 1));
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    panTo(event.key === 'Home' ? 0 : SCENE.width);
  } else if (event.key === 'Escape') cancelPan();
});
viewport.addEventListener(
  'scroll',
  () => {
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        syncCamera();
      });
  },
  { passive: true },
);

// Touch/trackpads use native scrolling. Only mouse dragging needs an adapter.
viewport.addEventListener('pointerdown', (event) => {
  if (
    event.pointerType !== 'mouse' ||
    event.button !== 0 ||
    event.target.closest('a,button,summary')
  )
    return;
  cancelPan();
  drag = {
    id: event.pointerId,
    x: event.clientX,
    scroll: viewport.scrollLeft,
    active: false,
  };
});
viewport.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const delta = event.clientX - drag.x;
  if (!drag.active && Math.abs(delta) > 5) {
    drag.active = true;
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
    viewport.focus({ preventScroll: true });
  }
  if (drag.active) {
    event.preventDefault();
    viewport.scrollLeft = drag.scroll - delta;
  }
});
function endDrag() {
  drag = null;
  viewport.classList.remove('is-dragging');
}
viewport.addEventListener('pointerup', endDrag);
viewport.addEventListener('pointercancel', endDrag);
viewport.addEventListener('lostpointercapture', endDrag);

const resize = new ResizeObserver(() => {
  const center = logicalCenter;
  cancelPan();
  fitArt();
  panTo(center, true);
});
resize.observe(viewport);
function fitArt() {
  const layout = displayLayout(viewport.clientHeight);
  const stage = viewport.closest('.stage');
  stage.style.setProperty('--pixel-scale', layout.scale);
  stage.style.setProperty('--world-width', `${layout.width}px`);
  stage.style.setProperty('--world-height', `${layout.height}px`);
  stage.style.setProperty('--world-top', `${layout.top}px`);
  stage.style.setProperty('--control-top', `${layout.controlsTop}px`);
  viewport.dataset.scale = String(layout.scale);
}
fitArt();
panTo(SCENE.start, true);
viewport.dataset.ready = 'true';
updateMotion();

document.querySelector('#help-open').addEventListener('click', () => {
  cancelPan();
  menu.open = false;
  menuTrigger.focus({ preventScroll: true });
  help.showModal();
});
menu.addEventListener('toggle', () => {
  if (menu.open) cancelPan();
});
document.querySelector('.stage').addEventListener('pointerdown', (event) => {
  if (menu.open && !menu.contains(event.target)) menu.open = false;
});
document.querySelector('#start-exploring').addEventListener('click', () => {
  help.close();
  viewport.focus({ preventScroll: true });
});
// Dispose the external calendar on close; reopening clones a fresh inert template.
dialog.addEventListener('close', () => {
  if (!dialog.open) dialog.querySelector('.agenda-calendar iframe')?.remove();
});
for (const modal of [dialog, help]) {
  modal
    .querySelectorAll('[data-close]')
    .forEach((button) => button.addEventListener('click', () => modal.close()));
  modal.addEventListener('click', (event) => {
    if (event.target !== modal) return;
    const b = modal.getBoundingClientRect();
    if (
      event.clientX < b.left ||
      event.clientX > b.right ||
      event.clientY < b.top ||
      event.clientY > b.bottom
    )
      modal.close();
  });
}
motion.addEventListener('click', () => {
  reduced = !reduced;
  cancelPan();
  updateMotion();
});
preference.addEventListener('change', (event) => {
  reduced = event.matches;
  cancelPan();
  updateMotion();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelPan();
    endDrag();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.open) {
    menu.open = false;
    menuTrigger.focus({ preventScroll: true });
  }
});
document.querySelector('.skip-link').addEventListener('click', () => {
  menu.open = true;
  menu.querySelector('nav a').focus({ preventScroll: true });
});
initArchive({
  cancelPan,
  menu,
  menuTrigger,
  contentDialog: dialog,
  help,
  reduced: () => reduced || preference.matches,
});
