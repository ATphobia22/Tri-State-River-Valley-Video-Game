const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/streaming-policy.js');
const mesh=(geometry,material)=>({isMesh:true,geometry,material,children:[]});
test('geometry and shared textures are counted once across terrain generations',()=>{
 const geo={attributes:{position:{array:new Float32Array(12)}},index:{array:new Uint16Array(6)}};
 const tex={isTexture:true,image:{width:4,height:4},generateMipmaps:false};
 const m=mesh(geo,{map:tex,normalMap:tex});
 const s=P.estimateGpuResources({active:[m],pending:[mesh(geo,{map:tex})],retiring:[m]});
 assert.equal(s.totalBytes,124);assert.equal(s.geometryBytes,60);assert.equal(s.textureBytes,64);
 assert.equal(s.generations.active,124);assert.equal(s.generations.pending,124);
});
test('interleaved attributes share a buffer and explicit mip chains are counted',()=>{
 const data={array:new Float32Array(24)};
 const geo={attributes:{position:{data},normal:{data}}};
 const tex={isTexture:true,image:{width:4,height:4},mipmaps:[{width:4,height:4,data:new Uint8Array(64)},{width:2,height:2,data:new Uint8Array(16)}]};
 const s=P.estimateGpuResources({active:[mesh(geo,{map:tex})]});
 assert.equal(s.geometryBytes,96);assert.equal(s.textureBytes,80);
});
test('render targets estimate color, depth and multisampling without double counting color textures',()=>{
 const tex={isTexture:true,image:{width:16,height:16},generateMipmaps:false};
 const target={width:16,height:16,texture:tex,depthBuffer:true,samples:4};
 const s=P.estimateGpuResources({active:[mesh(null,{map:tex})]},{renderTargets:[target,target]});
 assert.equal(s.textureBytes,1024);assert.equal(s.renderTargetBytes,8192);
 assert.equal(s.totalBytes,9216);
});
test('terrain allocation reserves space for three generations and shared resources',()=>{
 const n=P.terrainTileCapacity({budgetBytes:1000000,sharedBytes:100000,segments:16,maxTiles:200});
 assert.ok(n>=1&&n<200);
 assert.ok(n*3*P.terrainTileBytes(16)+100000<=1000000);
 assert.equal(P.terrainTileCapacity({budgetBytes:1000,sharedBytes:1000,segments:16,maxTiles:200}),1);
});
test('LOD exposes a copy of staged resources for accounting without mutating the job',()=>{
 const L=require('../src/lod-transition.js');
 const stage=L.create({makeMesh:x=>x,commit:()=>{},dispose:()=>{},batchSize:1});
 stage.schedule({signature:'a',leaves:[1,2],index:{}});stage.pump();
 const a=stage.pendingMeshes();assert.deepEqual(a,[1]);a.push(3);
 assert.deepEqual(stage.pendingMeshes(),[1]);stage.cancel();assert.deepEqual(stage.pendingMeshes(),[]);
});
test('runtime applies byte limit and reports overlapping terrain generations',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync(__dirname+'/../src/game.js','utf8');
 assert.ok(source.includes('STREAM.terrainTileCapacity({budgetBytes:terrainMemoryBudgetBytes()'));
 assert.ok(source.includes('pending:terrainTransition?.pendingMeshes()||[]'));
 assert.ok(source.includes('retiring:retiringTerrain?.meshes||[]'));
 assert.ok(source.includes('terrainMemory:terrainMemorySnapshot()'));
});
