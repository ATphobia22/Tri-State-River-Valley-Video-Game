const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

test('streaming policy exposes online-enhanced governor', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/streaming-policy.js'), 'utf8');
  const sandbox = { module: { exports: {} }, exports: {}, navigator: { onLine: true } };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  const api = sandbox.module.exports;
  assert.equal(typeof api.createGovernor, 'function');
  assert.equal(api.isOnline(), true);
  const gov = api.createGovernor({ maxTiles: 200, minTiles: 80, targetFPS: 30, preferOnline: true });
  const snap = gov.snapshot();
  assert.ok(snap.maxTiles >= 200);
  assert.equal(snap.mode, 'online-enhanced');
  assert.equal(snap.onlineStreaming, true);
});

test('look-ahead grows when online', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/streaming-policy.js'), 'utf8');
  const online = { module: { exports: {} }, exports: {}, navigator: { onLine: true } };
  online.globalThis = online;
  vm.runInNewContext(src, online);
  const a = online.module.exports.lookAheadDistance(100);
  const offline = { module: { exports: {} }, exports: {}, navigator: { onLine: false } };
  offline.globalThis = offline;
  vm.runInNewContext(src, offline);
  const b = offline.module.exports.lookAheadDistance(100);
  assert.ok(a >= b);
});
