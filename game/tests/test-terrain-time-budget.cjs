const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/lod-transition.js');
test('terrain preparation obeys a measured slice rather than only a mesh count',()=>{
 let clock=0,commits=[],disposed=[];
 const s=L.create({makeMesh:x=>{clock+=2;return x},commit:j=>commits.push(j.meshes),dispose:m=>disposed.push(m),now:()=>clock,batchSize:10});
 s.schedule({signature:'a',leaves:[1,2,3,4,5],index:{}});
 assert.deepEqual(s.pump(10,3),{built:2,complete:false});
 assert.equal(s.status().lastSliceMs,4);assert.equal(s.status().budgetYields,1);assert.equal(commits.length,0);
 assert.deepEqual(s.pump(10,3),{built:2,complete:false});
 assert.deepEqual(s.pump(10,3),{built:1,complete:true});assert.deepEqual(commits,[[1,2,3,4,5]]);
});
test('slow indivisible tile still makes progress; cancellation retains old generation',()=>{
 let clock=0,disposed=[],commits=[];
 const s=L.create({makeMesh:x=>{clock+=20;return x},commit:j=>commits.push(j.meshes),dispose:m=>disposed.push(m.slice()),now:()=>clock});
 s.schedule({signature:'base',leaves:[0],index:{}},true);
 s.schedule({signature:'next',leaves:[1,2,3],index:{}});
 assert.equal(s.pump(12,2).built,1);assert.equal(s.status().signature,'base');
 s.schedule({signature:'new',leaves:[4,5],index:{}});
 assert.deepEqual(disposed,[[1]]);assert.deepEqual(commits,[[0]]);
 s.pump(12,2);s.pump(12,2);assert.deepEqual(commits,[[0],[4,5]]);
});
test('immediate bootstrap remains complete even when tiles cost more than a frame',()=>{
 let clock=0,commits=[];
 const s=L.create({makeMesh:x=>{clock+=20;return x},commit:j=>commits.push(j.meshes.length),dispose:()=>{},now:()=>clock});
 s.schedule({signature:'boot',leaves:Array.from({length:600},(_,i)=>i),index:{}},true);
 assert.deepEqual(commits,[600]);assert.equal(s.status().pending,false);
});
