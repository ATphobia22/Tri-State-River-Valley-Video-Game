const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

test('Protomaps style exposes water roads buildings layers', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/maplibre-reference.js'), 'utf8');
  const sandbox = { module: { exports: {} }, exports: {}, navigator: { onLine: true } };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  const api = sandbox.module.exports;
  const style = api.protomapsStyle(api.DEMO_PMTILES_URL);
  assert.equal(style.sources.protomaps.type, 'vector');
  assert.match(style.sources.protomaps.url, /^pmtiles:\/\//);
  const layers = style.layers.map(l => l.id);
  assert.ok(layers.includes('water'));
  assert.ok(layers.includes('roads-major') || layers.includes('roads-minor'));
  assert.ok(layers.includes('buildings'));
  assert.equal(api.PROTOMAPS_LAYERS.water, 'water');
  assert.equal(api.PROTOMAPS_LAYERS.roads, 'roads');
  assert.equal(api.PROTOMAPS_LAYERS.buildings, 'buildings');
});
