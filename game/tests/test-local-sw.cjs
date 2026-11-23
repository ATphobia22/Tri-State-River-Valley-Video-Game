const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const root=__dirname+'/../';
const index=fs.readFileSync(root+'index.html','utf8'),sw=fs.readFileSync(root+'sw.js','utf8');
test('retired source worker preserves the local dependency inventory',()=>{
 const scripts=[...index.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(scripts.length>=10);
 for(const script of scripts){assert.match(sw,new RegExp(script.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`Missing asset inventory entry: ${script}`);assert.ok(fs.existsSync(root+script),`Missing file: ${script}`);}
 assert.match(sw,/river-valley-family-1\.13\.4/);
});
