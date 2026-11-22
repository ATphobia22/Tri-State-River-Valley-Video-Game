'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=p=>fs.readFileSync(path.join(root,p),'utf8');
test('offline PWA smoke validates actual cache version, replays saved county/scout state with network disabled',()=>{
 const script=source('tests/offline_pwa_smoke.py');
 const packageVersion=JSON.parse(source('package.json')).version;
 const cache=source('game-sw.js').match(/const CACHE='([^']+)'/);
 assert.ok(cache,'hosted PWA cache name is configured');
 assert.equal(cache[1],'rva-game-'+packageVersion);
 assert.doesNotMatch(script,/rva-game-1\.4\.0|cached_html.*False/);
 assert.match(script,/game-sw\.js/,'read the worker cache identity dynamically');
 assert.match(script,/set_offline\(True\)/);
 assert.match(script,/countyRegion/);
 assert.match(script,/scoutBond/);
 assert.match(script,/resumeBtn/);
 assert.match(script,/countyVisit/);
 assert.match(script,/scoutPanel/);
 assert.match(script,/--site-dir/);
 assert.match(script,/--entry/);
});
test('both pipelines gate actual offline replay in Chromium rather than only checking packaging',()=>{
 const ci=source('../.github/workflows/game-ci.yml'),pages=source('../.github/workflows/deploy-pages.yml');
 assert.match(ci,/python game\/tests\/offline_pwa_smoke\.py --site-dir game --entry game\.html/);
 assert.match(pages,/python game\/tests\/offline_pwa_smoke\.py --site-dir _site --entry index\.html/);
 assert.ok(ci.indexOf('Install Chromium')<ci.indexOf('offline_pwa_smoke.py'),'Chromium first in CI');
 assert.ok(pages.indexOf('Package playable game')<pages.indexOf('offline_pwa_smoke.py'),'Pages site first');
});
