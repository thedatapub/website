import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PORT, previewPort, canUseFreePort } from '../scripts/preview-port.mjs';

test('preview uses the default only when PORT is absent and validates overrides',()=>{
  assert.deepEqual(previewPort({}),{port:DEFAULT_PORT,explicit:false});
  assert.deepEqual(previewPort({PORT:'4280'}),{port:4280,explicit:true});
  assert.deepEqual(previewPort({PORT:'0'}),{port:0,explicit:true});
  for(const PORT of ['','-1','65536','4173x','1.5'])assert.throws(()=>previewPort({PORT}),/Invalid PORT/);
});
test('only default EADDRINUSE is eligible for a free-port retry',()=>{
  assert.equal(canUseFreePort({code:'EADDRINUSE'},false),true);
  assert.equal(canUseFreePort({code:'EADDRINUSE'},true),false);
  for(const code of ['EACCES','EPERM','EINVAL',undefined])assert.equal(canUseFreePort({code},false),false);
});
