import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const children = new Set(),
  ownedServers = new Set(),
  passed = [],
  skipped = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function pass(name) {
  passed.push(name);
  console.log('PASS ' + name);
}
async function launch(PORT) {
  const env = { ...process.env };
  delete env.PORT;
  if (PORT !== undefined) env.PORT = String(PORT);
  const child = spawn(process.env.BUN_BIN || 'bun', ['scripts/serve.ts'], { env, stdio: 'pipe' });
  children.add(child);
  let output = '',
    exit = null;
  child.stdout.on('data', (b) => (output += b));
  child.stderr.on('data', (b) => (output += b));
  child.on('exit', (code) => (exit = code));
  child.on('error', (e) => (output += e.message));
  for (let i = 0; i < 100; i++) {
    const match = output.match(/THE DATA PUB PREVIEW → (http:\/\/127\.0\.0\.1:\d+\/)/);
    if (match) return { child, url: match[1], output };
    if (exit !== null) return { child, exit, output };
    await delay(30);
  }
  throw new Error('Preview did not start or fail promptly: ' + output);
}
async function stop(child) {
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
  children.delete(child);
}
async function blocker(port) {
  const server = http.createServer((req, res) => res.end('owned-test-listener'));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  ownedServers.add(server);
  return server;
}
async function close(server) {
  await new Promise((resolve) => server.close(resolve));
  ownedServers.delete(server);
}
async function stillOccupied(port) {
  try {
    const probe = await blocker(port);
    await close(probe);
    return false;
  } catch (e) {
    if (e.code === 'EADDRINUSE') return true;
    throw e;
  }
}
try {
  let reservation,
    externalBusy = false;
  try {
    reservation = await blocker(4173);
  } catch (e) {
    if (e.code !== 'EADDRINUSE') throw e;
    externalBusy = true;
    skipped.push('free default 4173: existing listener left untouched');
    console.log('SKIP ' + skipped[0]);
  }
  if (reservation) {
    await close(reservation);
    const free = await launch();
    assert.ok(free.url?.endsWith(':4173/'));
    assert.equal((await fetch(free.url)).status, 200);
    await stop(free.child);
    pass('free default starts on loopback 4173');
  }
  // When 4173 is already occupied, only attempt our own bind; never send requests
  // to, stop, or otherwise operate the existing listener.
  const busy = externalBusy ? null : await blocker(4173);
  const fallback = await launch();
  assert.ok(fallback.url && !fallback.url.endsWith(':4173/'));
  assert.match(fallback.output, /Default port 4173 is busy/);
  assert.equal((await fetch(fallback.url)).status, 200);
  await stop(fallback.child);
  assert.equal(await stillOccupied(4173), true);
  pass('busy default selects a free loopback port and leaves the listener untouched');
  const collision = await launch(4173);
  assert.equal(collision.exit, 1);
  assert.match(collision.output, /PORT=4173 is already in use/);
  assert.ok(!collision.url);
  assert.equal(await stillOccupied(4173), true);
  pass('explicit occupied default fails clearly without fallback');
  const own = await blocker(0),
    ownPort = own.address().port;
  const ownCollision = await launch(ownPort);
  assert.equal(ownCollision.exit, 1);
  assert.match(ownCollision.output, /is already in use/);
  assert.ok(!ownCollision.url);
  assert.equal(await (await fetch(`http://127.0.0.1:${ownPort}/`)).text(), 'owned-test-listener');
  await close(own);
  pass('explicit occupied owned port preserves its test listener');
  const zero = await launch(0);
  assert.ok(zero.url && !zero.url.endsWith(':4173/'));
  assert.doesNotMatch(zero.output, /Default port/);
  assert.equal((await fetch(zero.url)).status, 200);
  await stop(zero.child);
  pass('PORT=0 selects and prints an actual free loopback URL');
  if (busy) await close(busy);
  const reserved = await blocker(0),
    selected = reserved.address().port;
  await close(reserved);
  const fixed = await launch(selected);
  assert.ok(fixed.url?.endsWith(`:${selected}/`));
  await stop(fixed.child);
  pass('explicit free fixed PORT is honored');
  const invalid = await launch('invalid');
  assert.equal(invalid.exit, 1);
  assert.match(invalid.output, /Invalid PORT/);
  assert.ok(!invalid.url);
  pass('invalid PORT fails without fallback');
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    'artifacts/preview-port-results.json',
    JSON.stringify(
      { passed, skipped, externalDefaultListenerLeftUntouched: externalBusy },
      null,
      2,
    ) + '\n',
  );
} finally {
  for (const child of children) if (child.exitCode === null) await stop(child);
  for (const server of ownedServers) await close(server);
}
