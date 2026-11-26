const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
test('Babylon opt-in entrypoint uses a WebGL2-only renderer', () => {
  const html = read('babylon-preview.html');
  const app = read('babylon-preview/main.js');
  assert.match(html, /id="babylon-world"/);
  assert.match(html, /type="module"/);
  assert.match(app, /getContext\('webgl2'/);
  assert.match(app, /disableWebGL2Support:\s*false/);
  assert.match(app, /@babylonjs\/core/);
});
test('quality presets have explicit bounded graphics costs', () => {
  const presets = require('../babylon-preview/quality.cjs');
  for (const key of ['low', 'medium', 'high', 'ultra', 'cinematic']) {
    const p = presets.resolve(key);
    assert.ok(p.scale >= .5 && p.scale <= 1.5);
    assert.ok(p.shadowMap >= 512 && p.shadowMap <= 4096);
    assert.ok(p.maxTiles >= 30 && p.maxTiles <= 250);
  }
  assert.equal(presets.resolve('unrecognized').name, 'medium');
});
test('unregistered tiles never advertise surveyed terrain', () => {
  const geo = require('../babylon-preview/georegistration.cjs');
  assert.equal(geo.admit({status:'preview',epsg:4978,sha256:'a'.repeat(64)}).admitted,false);
  const accepted = geo.admit({status:'verified',epsg:4978,sha256:'a'.repeat(64),
    controlPoints:3, horizontalRMSE:1.5,verticalRMSE:1.8,approved:true});
  assert.equal(accepted.admitted,true);
  assert.equal(geo.admit({...accepted.manifest,approved:false}).admitted,false);
});
test('hosted and offline legacy output remains isolated during migration', () => {
  assert.doesNotMatch(read('index.html'),/babylon-preview\/main\.js/);
  assert.match(read('build_common.py'),/compile_source/);
});
