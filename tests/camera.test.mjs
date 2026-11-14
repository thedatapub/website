import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENE,
  BARMAN,
  sights,
  cameraBounds,
  centeredScroll,
  sceneCenter,
  displayLayout,
} from '../site/assets/js/camera.js';

test('camera clamps both ends at desktop and mobile dimensions', () => {
  for (const [window, world] of [
    [1440, 4125],
    [390, 3868],
    [844, 1788],
  ]) {
    assert.equal(centeredScroll(-500, window, world), 0);
    assert.equal(centeredScroll(SCENE.width + 500, window, world), world - window);
    assert.equal(cameraBounds(window, world), world - window);
  }
  assert.equal(cameraBounds(2400, 2200), 0);
  assert.equal(centeredScroll(1100, 2400, 2200), 0);
});
test('camera reveals each object and preserves arbitrary interior positions across resizing', () => {
  for (const width of [320, 390, 768, 1440])
    for (const x of [SCENE.start, 610.5, 1532.25, ...Object.values(sights).map((s) => s.x)]) {
      const world = 3868,
        scroll = centeredScroll(x, width, world);
      const screenX = ((x - SCENE.crop.x) / SCENE.crop.width) * world - scroll;
      assert.ok(screenX >= 0 && screenX <= width);
      if (scroll > 0 && scroll < world - width)
        assert.ok(Math.abs(sceneCenter(scroll, width, world) - x) < 1e-8);
    }
});
test('camera position is continuous, with no slide quantization', () => {
  const a = centeredScroll(850.25, 390, 3840),
    b = centeredScroll(850.5, 390, 3840);
  assert.ok(b > a && b - a < 2);
  assert.notEqual(a, Math.round(a));
});
test('cropped scroll limits retain native coordinates and center an entirely visible scene', () => {
  const { x, width } = SCENE.crop;
  assert.equal(x, 252);
  assert.equal(x + width, 1718);
  for (const scale of [1, 2, 3]) {
    const world = width * scale;
    assert.equal(centeredScroll(x, 390, world), 0);
    assert.equal(centeredScroll(x + width, 390, world), world - 390);
    assert.equal(sceneCenter(0, world + 500, world), x + width / 2);
    assert.equal(sceneCenter(centeredScroll(SCENE.start, 390, world), 390, world), SCENE.start);
  }
});
test('responsive layout uses one integer zoom and keeps the sign and controls visible', () => {
  for (const height of [320, 390, 480, 500, 600, 640, 740, 844, 900, 1024, 1080, 1440, 1600]) {
    const layout = displayLayout(height);
    assert.ok(Number.isInteger(layout.scale) && layout.scale >= 1);
    assert.equal(layout.width, SCENE.crop.width * layout.scale);
    assert.equal(layout.height, SCENE.height * layout.scale);
    assert.ok(layout.top + SCENE.sign.y * layout.scale >= 0);
    assert.ok(layout.top + (SCENE.sign.y + SCENE.sign.height) * layout.scale <= height);
    assert.ok(layout.controlsTop >= 0 && layout.controlsTop + 46 <= height);
  }
});
