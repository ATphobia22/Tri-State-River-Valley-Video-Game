const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../src/streaming-policy.js');
test('terrain geometry estimate includes attributes, indices and worst-case skirts',()=>{
 assert.equal(S.terrainTileBytes(16),25004);
 assert.ok(S.terrainTileBytes(32)>S.terrainTileBytes(16));
});
test('three terrain generations fit within the configured geometry budget',()=>{
 const per=S.terrainTileBytes(16),budget=8*1024*1024;
 const cap=S.terrainByteCap({segments:16,maxBytes:budget,generations:3});
 assert.ok(cap*per*3<=budget);
 assert.ok((cap+1)*per*3>budget);
});
test('too-small and invalid budgets fail explicitly',()=>{
 assert.equal(S.terrainByteCap({segments:16,maxBytes:1,generations:3}),0);
 assert.throws(()=>S.terrainByteCap({segments:16,maxBytes:NaN}),RangeError);
 assert.throws(()=>S.terrainTileBytes(0),RangeError);
});
test('byte cap applies to manual and automatic quality without exceeding frame cap',()=>{
 assert.equal(S.terrainBudget({userCap:200,frameCap:80,maxBytes:8*1024*1024,segments:16}),80);
 assert.equal(S.terrainBudget({userCap:200,maxBytes:8*1024*1024,segments:16}),111);
});
