const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core.js'),LOD=require('../src/lod-transition.js'),H=require('../vendor/h3-js.umd.js');
const a=H.latLngToCell(37.9325,-87.895,9),b=H.latLngToCell(37.94,-87.90,9);
const record=(w,cell,weather='rain')=>C.recordEnvironment(w,{cell,weather,season:'winter',region:'mount-vernon'});
test('cell state survives global journal rollover and save reload',()=>{
 let s=C.freshSave('Cell history');let w=record(s.worldSimulation,a);
 for(let i=0;i<140;i++)w=record(w,b,i%2?'rain':'clear');
 assert.ok(!w.events.some(e=>e.cell===a));assert.equal(C.getWorldCell(w,a).weather,'rain');
 s.worldSimulation=w;s.weather=w.weather;s.season=w.season;
 const restored=C.validateSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(C.getWorldCell(restored.worldSimulation,a),C.getWorldCell(w,a));
 assert.deepEqual(restored.worldSimulation.cells,w.cells);
 assert.equal(C.getWorldCell(restored.worldSimulation,b).observations,140);
});
test('older journals migrate cell snapshots and repeated validation does not replay events twice',()=>{
 let s=C.freshSave('Old history');s.worldSimulation=record(record(s.worldSimulation,a),b);
 delete s.worldSimulation.cells;
 const restored=C.validateSave(s);
 assert.equal(C.getWorldCell(restored.worldSimulation,a).observations,1);
 assert.deepEqual(C.validateSave(restored).worldSimulation,restored.worldSimulation);
});
test('cell queries return detached state and invalid cells never create records',()=>{
 let w=record(C.freshSave('Test').worldSimulation,a);
 const cell=C.getWorldCell(w,a);cell.weather='mist';
 assert.equal(C.getWorldCell(w,a).weather,'rain');assert.equal(C.getWorldCell(w,'invalid'),null);
 w=record(w,'invalid');assert.equal(w.cells.length,1);
});
test('frame deadline yields between mesh jobs, preserves coverage and never starves',()=>{
 let now=0,commits=[];
 const lod=LOD.create({batchSize:10,budgetMs:3,now:()=>now,makeMesh:x=>{now+=2;return x},commit:j=>commits.push(j.meshes),dispose:()=>{}});
 lod.schedule({signature:'a',leaves:[1,2,3,4,5],index:{}});
 assert.equal(lod.pump().built,2);assert.deepEqual(commits,[]);
 assert.equal(lod.pump().built,2);assert.equal(lod.pump().complete,true);
 assert.deepEqual(commits,[[1,2,3,4,5]]);
 assert.equal(lod.status().deadlineYields,2);
});
test('immediate initialization bypasses frame deadline and count remains bounded during normal pumping',()=>{
 let now=0,commits=[];
 const lod=LOD.create({batchSize:2,budgetMs:1,now:()=>now,makeMesh:x=>{now+=10;return x},commit:j=>commits.push(j.meshes),dispose:()=>{}});
 lod.schedule({signature:'a',leaves:[1,2,3],index:{}},true);
 assert.deepEqual(commits,[[1,2,3]]);
 lod.schedule({signature:'b',leaves:[4,5,6],index:{}});
 assert.equal(lod.pump().built,1);assert.equal(lod.status().pending,true);
});
