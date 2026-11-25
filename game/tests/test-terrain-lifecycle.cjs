const test=require('node:test'),assert=require('node:assert/strict');
const LOD=require('../src/lod-transition.js');
test('immediate request for pending coverage completes the same generation',()=>{
 const committed=[],disposed=[];
 const stage=LOD.create({makeMesh:x=>x,commit:j=>committed.push(j.meshes),dispose:m=>disposed.push(m),batchSize:2});
 const job={signature:'a',leaves:[1,2,3,4,5],index:{}};
 stage.schedule(job);stage.pump();
 assert.equal(stage.schedule(job,true),true);
 assert.deepEqual(committed,[[1,2,3,4,5]]);
 assert.equal(stage.status().pending,false);
 assert.equal(disposed.length,0);
});
test('immediate initialization is complete even above the per-pump limit',()=>{
 const committed=[];
 const stage=LOD.create({makeMesh:x=>x,commit:j=>committed.push(j.meshes),dispose:()=>{}});
 const leaves=Array.from({length:600},(_,i)=>i);
 stage.schedule({signature:'large',leaves,index:{}},true);
 assert.deepEqual(committed,[leaves]);assert.equal(stage.status().pending,false);
});
test('normal staging remains bounded and retains the old generation until commit',()=>{
 const committed=[],disposed=[];
 const stage=LOD.create({makeMesh:x=>x,commit:j=>committed.push(j.meshes),dispose:m=>disposed.push(m.slice()),batchSize:2});
 stage.schedule({signature:'a',leaves:[1,2,3],index:{}});
 assert.equal(stage.pump().built,2);assert.equal(committed.length,0);
 stage.schedule({signature:'b',leaves:[4,5,6],index:{}});
 assert.deepEqual(disposed,[[1,2]]);assert.equal(stage.pump().built,2);
 assert.equal(committed.length,0);stage.pump();assert.deepEqual(committed,[[4,5,6]]);
});
