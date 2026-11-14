import { SCENE_OBJECTS } from './scene-objects.js';

// One continuous scene. Values are logical artwork coordinates, not slides.
export const SCENE = {
  width: 1920,
  height: 480,
  // Keep the native artwork coordinates. Only the scrollable window is cropped,
  // just outside the columns at x=253–259 and x=1709–1715 (including shadows).
  crop: { x: 252, width: 1466 },
  start: 982,
  sign: { x: 913, y: 90, width: 146, height: 58 },
  controlsY: 369,
  noteY: 346,
};
// One decorative sprite patch, registered to the baked static first frame.
export const BARMAN = {
  x: 899,
  y: 171,
  width: 136,
  height: 144,
  frames: 8,
  duration: 6.5,
  frameDurations: [2800, 140, 160, 120, 2980, 80, 120, 100],
};
export const sights = {
  library: {
    x: SCENE_OBJECTS.library.x + SCENE_OBJECTS.library.width / 2,
    y: SCENE_OBJECTS.library.y + SCENE_OBJECTS.library.height - 3,
    label: 'Biblioteca',
    route: 'blog',
  },
  about: { x: 982, y: 320, label: 'La barra', route: 'about' },
  events: {
    x: SCENE_OBJECTS.events.x + SCENE_OBJECTS.events.width / 2,
    y: SCENE_OBJECTS.events.y + SCENE_OBJECTS.events.height - 17,
    label: 'Cartelera',
    route: 'events',
  },
};

export function displayLayout(height) {
  let scale = Math.max(1, Math.ceil(height / SCENE.height));
  if (scale > 1 && height / scale < 320) scale--;
  const worldHeight = SCENE.height * scale;
  const top = (height - worldHeight) / 2;
  return {
    scale,
    top,
    width: SCENE.crop.width * scale,
    height: worldHeight,
    controlsTop: Math.max(10, Math.min(height - 56, top + SCENE.controlsY * scale - 23)),
  };
}

export function cameraBounds(viewportWidth, worldWidth) {
  return Math.max(0, worldWidth - viewportWidth);
}
export function centeredScroll(logicalX, viewportWidth, worldWidth) {
  const requested = ((logicalX - SCENE.crop.x) / SCENE.crop.width) * worldWidth - viewportWidth / 2;
  return Math.max(0, Math.min(cameraBounds(viewportWidth, worldWidth), requested));
}
export function sceneCenter(scrollLeft, viewportWidth, worldWidth) {
  if (worldWidth <= 0) return SCENE.start;
  return SCENE.crop.x + ((scrollLeft + Math.min(viewportWidth, worldWidth) / 2) / worldWidth) * SCENE.crop.width;
}
