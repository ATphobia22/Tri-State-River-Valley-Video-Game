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
 assert.match(html,/V1\.12\.0/);
});
test('deployed v1.12 app keeps its offline worker and version synchronized',()=>{
 const index=read('index.html'),worker=read('game-sw.js'),build=read('build_hosted.py');
 assert.match(index,/V1\.12\.0/);
 assert.match(worker,/rva-game-1\.12\.0/);
 assert.match(build,/rva-game-1\.12\.0/);
});
test('game uses instanced meadow, terrain re-anchoring and its retained local rig',()=>{
 const source=read('src/game.js');
 assert.match(source,/GRAPHICS\?\.create/);
 assert.match(source,/groundPlacementDirty/);
 assert.match(source,/refreshVegetation\(true,stamp\)/);
 assert.match(source,/HERO\.create\(G\)/);
 assert.match(source,/GRAPHICS\.budget\(visualEffects/);
});
