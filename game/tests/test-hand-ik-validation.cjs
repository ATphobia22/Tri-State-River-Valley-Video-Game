const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
test('hand IK suite covers grips and rejects hyperextension', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/hand-ik-validation.js'), 'utf8');
  const sandbox = { module: { exports: {} }, exports: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  const api = sandbox.module.exports;
  assert.ok(api.expectedJoints().length >= 16);
  assert.equal(api.suite().allOk, true);
  const bad = api.validateGrip('drive', { LeftIndex: 2.5, RightIndex: 2.5 });
  assert.equal(bad.ok, false);
});
