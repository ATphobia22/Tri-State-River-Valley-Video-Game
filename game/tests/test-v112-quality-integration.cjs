'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('v1.12 site loads the offline graphics modules before its game runtime',()=>{
 const html=read('index.html');
 for(const src of ['src/graphics-quality.js','src/compressed-assets.js']){
   assert.match(html,new RegExp('src="'+src.replaceAll('.','\\.')+'"'));
   assert.ok(html.indexOf(src)<html.indexOf('src/game.js'));
   assert.match(read('sw.js'),new RegExp(src.replaceAll('.','\\.')));
 }
 assert.match(html,/value="cinematic"/);
 assert.match(html,/id="graphicsQualityStatus"/);
 assert.match(html,/V1\.13\.0/);
});
test('retired hosted worker does not intercept requests or re-register',()=>{
 const index=read('index.html'),worker=read('game-sw.js'),build=read('build_hosted.py');
 assert.match(index,/V1\.13\.0/);
 assert.match(worker,/registration\.unregister\(\)/);
 assert.doesNotMatch(worker,/addEventListener\(['"]fetch['"]/);
 assert.doesNotMatch(build,/serviceWorker\.register\(/);
});
test('game uses instanced meadow, terrain re-anchoring and its retained local rig',()=>{
 const source=read('src/game.js');
 assert.match(source,/GRAPHICS\?\.create/);
 assert.match(source,/groundPlacementDirty/);
 assert.match(source,/refreshVegetation\(true,stamp\)/);
 assert.match(source,/HERO\.create\(G/);
 assert.match(source,/GRAPHICS\.budget\(visualEffects/);
});
