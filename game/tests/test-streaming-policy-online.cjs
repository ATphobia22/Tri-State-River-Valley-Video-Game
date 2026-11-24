const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
function load(online){
  const src = fs.readFileSync(path.join(__dirname, '../src/streaming-policy.js'), 'utf8');
  const sandbox = { module: { exports: {} }, exports: {}, navigator: { onLine: online } };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  return sandbox.module.exports;
}
test('online-first mode when connected', () => {
  const api = load(true);
  const snap = api.createGovernor({ maxTiles: 200, minTiles: 80, targetFPS: 30 }).snapshot();
  assert.equal(snap.mode, 'online-first');
  assert.ok(snap.maxTiles > 200);
});
test('offline-backup mode when disconnected', () => {
  const api = load(false);
  assert.equal(api.createGovernor({ maxTiles: 200, minTiles: 80, targetFPS: 30 }).snapshot().mode, 'offline-backup');
  assert.ok(api.lookAheadDistance(100) <= load(true).lookAheadDistance(100));
});
