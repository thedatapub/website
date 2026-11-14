import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export function verifyEnvironment(bytes, baseline) {
  assert.equal(baseline.version, 1);
  assert.equal(baseline.algorithm, 'sha256');
  assert.equal(baseline.pixelFormat, 'RGBA8');
  assert.equal(baseline.ordering, 'row-major-y-x');
  assert.equal(baseline.width, 1920);
  assert.equal(baseline.height, 480);
  assert.deepEqual(baseline.excludedRectangle, { x: 899, y: 171, width: 188, height: 144 });
  assert.equal(baseline.pixelCount, 894528);
  assert.equal(bytes.length, 894528 * 4, 'Incomplete environment pixel stream');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), baseline.sha256,
    'Approved scene changes unrelated scenery');
}
