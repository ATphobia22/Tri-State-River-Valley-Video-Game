const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../src/streaming-policy.js');
test('terrain geometry estimates cover vertex attributes, indices and all four seam skirts',()=>{
 assert.equal(P.terrainTileBytes(16),25004);
 assert.equal(P.terrainTileBytes(1),764);
});
test('three simultaneous terrain generations fit the configured geometry byte ceiling',()=>{
 for(const budgetBytes of [6*1024*1024,12*1024*1024]){
  const cap=P.terrainByteTileCap({budgetBytes,segments:16,generations:3});
  assert.ok(cap>=16);
  assert.ok(cap*3*P.terrainTileBytes(16)<=budgetBytes);
  assert.ok((cap+1)*3*P.terrainTileBytes(16)>budgetBytes);
 }
});
test('terrain budget refuses invalid input instead of silently exceeding the ceiling',()=>{
 assert.throws(()=>P.terrainTileBytes(0),RangeError);
 assert.throws(()=>P.terrainByteTileCap({budgetBytes:NaN}),RangeError);
 assert.equal(P.terrainByteTileCap({budgetBytes:1}),0);
});
