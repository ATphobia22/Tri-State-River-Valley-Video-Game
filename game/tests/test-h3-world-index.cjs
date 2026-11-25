const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const H=require('../vendor/h3-js.umd.js'),G=require('../src/reference-map.js'),C=require('../src/core.js');
test('pinned H3 bundle matches published integrity and known upstream coordinate example',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../vendor/h3-js.umd.js'));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('base64'),'FnMRwvDH7RBXQmKwLT4h/hYIKeF6K6oI13SRI0r0cS8=');
 assert.equal(H.latLngToCell(37.775938728915946,-122.41795063018799,9),'8928308280fffff');
});
test('game coordinates map to real H3 cells using the existing horizontal reference',()=>{
 const [lon,lat]=G.worldToLonLat(16,504);
 const cell=G.worldToH3(16,504);
 assert.equal(cell,H.latLngToCell(lat,lon,9));assert.equal(H.getResolution(cell),9);
 assert.equal(G.worldToH3(NaN,0),null);
 assert.equal(G.worldToH3(1e9,0),null);
});
test('H3 spatial index updates, queries and removes stable feature identities',()=>{
 const i=G.createH3Index();
 i.upsert({id:'building:1',kind:'building',x:16,z:504});
 i.upsert({id:'activity:1',kind:'activity',x:16,z:504});
 const cell=G.worldToH3(16,504);
 assert.deepEqual(i.inCell(cell).map(x=>x.id),['activity:1','building:1']);
 assert.deepEqual(i.inGrid(cell,1,'building').map(x=>x.id),['building:1']);
 i.upsert({id:'building:1',kind:'building',x:2000,z:2000});
 assert.equal(i.inCell(cell).length,1);assert.equal(i.size(),2);
 assert.equal(i.remove('building:1'),true);assert.equal(i.size(),1);
 assert.equal(i.upsert({id:'bad',kind:'building',x:NaN,z:0}),false);
});
test('environment journal persists H3 region transitions independently of rendering',()=>{
 const cell=G.worldToH3(16,504),other=G.worldToH3(2000,2000);
 let s=C.freshSave('H3 test');
 s.worldSimulation=C.recordEnvironment(s.worldSimulation,{weather:s.weather,season:s.season,region:s.countyRegion,cell});
 s.worldSimulation=C.recordEnvironment(s.worldSimulation,{weather:s.weather,season:s.season,region:s.countyRegion,cell:other});
 const restored=C.validateSave(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.worldSimulation.cell,other);
 assert.deepEqual(restored.worldSimulation.events.map(e=>e.cell),[cell,other]);
});
