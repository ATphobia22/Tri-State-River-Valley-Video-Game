const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const get=f=>fs.readFileSync(path.join(root,f),'utf8');
test('offline release uses a v1.8 service-worker cache and generated host tracks that cache',()=>{
 const worker=get('game-sw.js');
 const version=worker.match(/const CACHE='([^']+)'/)[1];
 assert.equal(version,'rva-game-1.9.7');
 assert.match(get('game.html'),new RegExp(version.replaceAll('.','\\.')));
});
test('hosted PWA uses relative URLs compatible with GitHub Pages subpaths',()=>{
 const html=get('game.html');
 const worker=get('game-sw.js');
 assert.match(html,/href="\.\/game\.webmanifest"/);
 assert.match(html,/register\('\.\/game-sw\.js'/);
 assert.match(worker,/new URL\('\.\/',\s*self\.location\.href\)/);
});
