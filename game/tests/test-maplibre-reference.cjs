const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
test('maplibre reference reports offline backup without libs', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/maplibre-reference.js'), 'utf8');
  const sandbox = { module: { exports: {} }, exports: {}, navigator: { onLine: false } };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  const api = sandbox.module.exports;
  assert.equal(api.describe().onlineFirst, true);
  assert.equal(api.mount({ appendChild(){} }).status, 'OFFLINE_BACKUP');
});
