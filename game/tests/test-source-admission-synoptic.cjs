const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('Synoptic SVG binds the exact geographic candidate registry keys',()=>{
 const registry=JSON.parse(fs.readFileSync(path.join(root,'data/geographic/source-registry.json'),'utf8'));
 const svg=fs.readFileSync(path.join(root,'ops/source-admission-synoptic.svg'),'utf8');
 const csv=fs.readFileSync(path.join(root,'ops/source-admission.csv'),'utf8');
 const ids=[...svg.matchAll(/<rect id="([^"]+)"/g)].map(m=>m[1]);
 const rows=csv.trim().split(/\r?\n/);
 assert.deepEqual(ids,registry.sources.map(s=>s.id));
 assert.deepEqual(rows.slice(1).map(s=>s.split(',')[0]),ids);
 for(const row of rows.slice(1))assert.match(row,/,candidate_unverified,0,0$/);
 assert.match(svg,/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
 assert.match(svg,/viewBox="0 0 920 365"/);
 assert.equal((svg.match(/data-okviz-area-type="area"/g)||[]).length,3);
 assert.doesNotMatch(svg,/<script|<foreignObject|\son(?:click|load|error)\s*=/i);
});