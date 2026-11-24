const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

function load(gpu) {
  const src = fs.readFileSync(path.join(__dirname, '../src/cinema-particles.js'), 'utf8');
  const sandbox = {
    module: { exports: {} },
    exports: {},
    navigator: gpu ? { gpu: {} } : {}
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  return sandbox.module.exports;
}

test('budget zero for clear weather', () => {
  const api = load(false);
  assert.equal(api.budgetFor('cinematic', 'clear'), 0);
  assert.ok(api.budgetFor('cinematic', 'rain') > 0);
  assert.ok(api.budgetFor('cinematic', 'mist') > 0);
});

test('TSL compute graphs defined for mist and rain', () => {
  const api = load(true);
  assert.equal(api.TSL_COMPUTE_GRAPH.mist.workgroupSize, 64);
  assert.equal(api.TSL_COMPUTE_GRAPH.rain.workgroupSize, 64);
  assert.ok(api.hasWebGPU());
});

test('WebGL path without gpu', () => {
  const api = load(false);
  assert.equal(api.hasWebGPU(), false);
});
