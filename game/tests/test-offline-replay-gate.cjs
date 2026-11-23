'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=p=>fs.readFileSync(path.join(root,p),'utf8');
test('browser smoke explicitly rejects worker registrations while verifying local saves',()=>{
 const script=source('tests/service_worker_disabled_smoke.py');
 assert.match(script,/serviceWorker\.register/);
 assert.match(script,/serviceWorker\.getRegistrations/);
 assert.match(script,/serviceWorker\.controller/);
 assert.match(script,/caches\.keys/);
 assert.match(script,/page\.reload/);
 assert.match(script,/countyRegion/);
 assert.match(script,/scoutBond/);
 assert.match(script,/resumeBtn/);
 assert.match(script,/--site-dir/);
 assert.match(script,/--entry/);
 assert.doesNotMatch(script,/set_offline\(True\)/);
});
test('CI and Pages gate registration-free hosted gameplay in Chromium',()=>{
 const ci=source('../.github/workflows/game-ci.yml');
 const pages=source('../.github/workflows/deploy-pages.yml');
 assert.match(ci,/python game\/tests\/service_worker_disabled_smoke\.py --site-dir game --entry game\.html/);
 assert.match(pages,/python game\/tests\/service_worker_disabled_smoke\.py --site-dir _site --entry index\.html/);
 assert.ok(ci.indexOf('Install Chromium')<ci.indexOf('service_worker_disabled_smoke.py'));
 assert.ok(pages.indexOf('Package playable game')<pages.indexOf('service_worker_disabled_smoke.py'));
});
