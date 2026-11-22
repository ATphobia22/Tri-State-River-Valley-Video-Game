const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const root=__dirname+'/../';
const index=fs.readFileSync(root+'index.html','utf8'),sw=fs.readFileSync(root+'sw.js','utf8');
test('repository-hosted game caches every required runtime script for offline play',()=>{
 const scripts=[...index.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(scripts.length>=10);
 for(const script of scripts){assert.match(sw,new RegExp(script.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`Missing pre-cache: ${script}`);assert.ok(fs.existsSync(root+script),`Missing file: ${script}`);}
 assert.match(sw,/river-valley-family-1\.13\.0/);
});
