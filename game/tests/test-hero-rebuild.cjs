const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

function loadHero() {
  const src = fs.readFileSync(path.join(__dirname, '../src/hero-character.js'), 'utf8');
  const sandbox = { module: { exports: {} }, exports: {}, console };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  return sandbox.module.exports;
}

test('hero profile is cinematic v2 with photogrammetry metadata', () => {
  const H = loadHero();
  assert.equal(H.PROFILE.version, '2.0-cinematic');
  assert.ok(H.PROFILE.photogrammetry.pipeline.includes('colmap-sparse'));
  assert.ok(H.PROFILE.features.includes('articulated-fingers'));
  assert.ok(H.STATES.includes('drive'));
  assert.equal(H.FINGERS.length, 5);
});

test('samplePose grip matches activity intensity', () => {
  const H = loadHero();
  assert.ok(H.samplePose('fish', 0).grip > H.samplePose('idle', 0).grip);
  assert.ok(H.samplePose('hunt', 0).grip > 0.5);
  assert.equal(H.samplePose('walk', 0.5).state, 'walk');
});
