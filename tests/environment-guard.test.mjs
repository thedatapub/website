import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { verifyEnvironment } from '../art/tools/verify-environment.mjs';

const spec = JSON.parse(await readFile('art/environment-baseline.json', 'utf8'));
test('environment guard checks every RGBA channel and both ends of its complete stream', () => {
  const bytes = Buffer.alloc(894528 * 4, 128);
  const baseline = { ...spec, sha256: createHash('sha256').update(bytes).digest('hex') };
  verifyEnvironment(bytes, baseline);
  for (const offset of [0, 1, 2, 3, 171 * 1920 * 4 - 1, 171 * 1920 * 4 + 899 * 4, bytes.length - 1]) {
    bytes[offset] ^= 1;
    assert.throws(() => verifyEnvironment(bytes, baseline), /changes unrelated scenery/);
    bytes[offset] ^= 1;
  }
  assert.throws(() => verifyEnvironment(bytes.subarray(4), baseline), /Incomplete environment/);
  assert.throws(() => verifyEnvironment(bytes, { ...baseline, excludedRectangle: { x: 898, y: 171, width: 189, height: 144 } }));
});
