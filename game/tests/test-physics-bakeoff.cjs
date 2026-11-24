const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
test('physics bake-off recommends hybrid BVH locomotion + optional Rapier', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/physics-bakeoff.js'), 'utf8');
  const sandbox = { module: { exports: {} }, exports: {}, performance: { now: () => Date.now() } };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  const report = sandbox.module.exports.report();
  assert.equal(report.decision.locomotion, 'three-mesh-bvh-or-capsule');
  assert.equal(report.decision.vehicles, 'rapier-optional');
  assert.ok(report.benchmark.spatialHashMs >= 0);
});
