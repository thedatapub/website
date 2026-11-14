import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { BARMAN, SCENE, sights } from '../site/assets/js/camera.js';
import { SCENE_OBJECTS } from '../site/assets/js/scene-objects.js';

test('the consolidated art inventory resolves all five current masters and authored artwork', async () => {
  const inventory = JSON.parse(await readFile('art/inventory.json', 'utf8'));
  assert.equal(inventory.character, 'Barman');
  assert.equal(inventory.masters.length, 5);
  for (const master of inventory.masters) {
    const bytes = await readFile(master.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), master.sha256);
    assert.equal(bytes.length, master.bytes);
  }
  for (const path of [...inventory.supportingSources, ...inventory.authoredRuntimeArtwork, ...inventory.tools])
    assert.ok((await readFile(path)).length > 0, path);
});

test('modular assets retain approved sources, native sizes and eight-frame timing', async () => {
  const metadata = JSON.parse(await readFile('art/export-manifest.json', 'utf8'));
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  for (const [path, hash] of Object.entries(metadata.sources)) {
    assert.equal(sha(await readFile(path)), hash);
  }
  for (const [name, asset] of Object.entries(metadata.assets)) {
    const bytes = await readFile(`site/assets/pub/${name}`);
    assert.equal(sha(bytes), asset.sha256);
    assert.equal(bytes.readUInt32BE(16), asset.width);
    assert.equal(bytes.readUInt32BE(20), asset.height);
  }
  assert.deepEqual(metadata.durations, BARMAN.frameDurations);
  assert.equal(metadata.durations.length, BARMAN.frames);
  assert.equal(
    metadata.durations.reduce((a, b) => a + b),
    BARMAN.duration * 1000,
  );
  assert.equal(metadata.assets['barman-scene-sheet.png'].width, BARMAN.width * BARMAN.frames);
  for (const id of ['library', 'events']) {
    assert.equal(SCENE_OBJECTS[id].width, metadata.props[id].width);
    assert.equal(SCENE_OBJECTS[id].height, metadata.props[id].height);
  }
  assert.equal(SCENE_OBJECTS.library.x, metadata.props.library.x);
  assert.equal(SCENE_OBJECTS.library.y, metadata.props.library.y);
  assert.equal(SCENE.start, sights.about.x);
  for (const p of Object.values(SCENE_OBJECTS)) {
    assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y));
    assert.ok(p.y + p.height <= 278, 'Wall props must clear the counter');
  }
});
