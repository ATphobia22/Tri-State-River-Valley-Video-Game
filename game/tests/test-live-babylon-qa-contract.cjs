'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, 'browser_live_babylon_qa.py'), 'utf8');

test('live QA waits for source-grounded geography before inspecting the rendered scene', () => {
  assert.match(script, /geography\?\.state === 'source-plotted'/);
  assert.match(script, /roadSegments/);
  assert.match(script, /buildingOutlines/);
  assert.match(script, /registered3DTiles/);
});

test('live QA does not require fictional downtown building mesh count', () => {
  assert.doesNotMatch(script, /meshCount"\]\s*>=\s*25/);
  assert.match(script, /meshCount"\]\s*>=\s*3/);
});
