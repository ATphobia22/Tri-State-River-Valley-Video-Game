'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const get=file=>fs.readFileSync(path.join(root,file),'utf8');
test('both legacy workers retire and never handle network requests',()=>{
 for(const name of ['sw.js','game-sw.js']){
  const source=get(name);
  assert.match(source,/registration\.unregister\(\)/);
  assert.match(source,/skipWaiting\(\)/);
  assert.doesNotMatch(source,/addEventListener\(['"]fetch['"]/);
  assert.doesNotMatch(source,/caches\.open\(/);
 }
});
test('hosted and source games do not install service workers',()=>{
 for(const html of [get('game.html'),get('index.html')]){
  assert.doesNotMatch(html,/serviceWorker\.register\(/);
  assert.match(html,/serviceWorker\.getRegistrations\(\)/);
 }
 assert.doesNotMatch(get('build_hosted.py'),/serviceWorker\.register\(/);
 assert.match(get('game.html'),/href="\.\/game\.webmanifest"/);
});
