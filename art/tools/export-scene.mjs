import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { verifyEnvironment } from './verify-environment.mjs';

const scene = 'art/source/bar-scene.aseprite';
const baselinePath = 'art/environment-baseline.json';
const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
const inputs = [scene, 'art/source/barman.aseprite', 'art/source/bar-environment.aseprite',
  'art/source/beer-mug.aseprite', 'art/source/apron-emblem.aseprite', baselinePath];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sources = Object.fromEntries(await Promise.all(inputs.map(async (path) => [path, sha(await readFile(path))])));
const staging = await mkdtemp(resolve(tmpdir(), 'pub-art-export-'));
try {
  const result = spawnSync(process.env.ASEPRITE_BIN || '/Applications/Aseprite.app/Contents/MacOS/aseprite', [
    '--noinapp', '--batch', '--script-param', `scene=${resolve(scene)}`,
    '--script-param', `out=${staging}`, '--script', resolve('art/tools/export-scene.lua'),
  ], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0 || !result.stdout.includes('SCENE_COMPONENTS_VERIFIED'))
    throw new Error(result.stdout + result.stderr);
  for (const [path, hash] of Object.entries(sources))
    if (sha(await readFile(path)) !== hash) throw new Error(`Source changed: ${path}`);
  verifyEnvironment(await readFile(`${staging}/environment.rgba`), baseline);
  const metadata = JSON.parse(await readFile(`${staging}/scene-components-export.json`, 'utf8'));
  let time = 0;
  const duration = metadata.durations.reduce((a, b) => a + b, 0);
  const frames = metadata.durations.map((ms, i) => {
    const rule = `  ${(time / duration) * 100}% { background-position-x: ${(i / (metadata.durations.length - 1)) * 100}%; }`;
    time += ms;
    return rule;
  });
  await writeFile(`${staging}/barman-animation.css`,
    `/* Generated from the approved Aseprite frame durations; run bun run art:components. */\n@keyframes barman-mouth-blink {\n${frames.join('\n')}\n  100% { background-position-x: 0%; }\n}\n`);
  const assets = {};
  for (const name of ['bar-base.png', 'library-prop.png', 'events-prop.png', 'barman-scene-sheet.png', 'ceiling-edge.png', 'floor-edge.png']) {
    const bytes = await readFile(`${staging}/${name}`);
    assets[name] = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: sha(bytes) };
  }
  for (const name of [...Object.keys(assets), 'barman-animation.css'])
    await writeFile(`site/assets/pub/${name}`, await readFile(`${staging}/${name}`));
  await writeFile('art/export-manifest.json', JSON.stringify({ sourceScale: 1, sources, ...metadata, assets }, null, 2) + '\n');
  console.log(result.stdout.trim());
} finally {
  await rm(staging, { recursive: true, force: true });
}
