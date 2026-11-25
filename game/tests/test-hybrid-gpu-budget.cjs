const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/streaming-policy.js');
test('quantized model budgets include group metadata, asymmetric KV and scratch',()=>{
 const m=P.estimateLocalModel({parameters:4000,weightBits:2,groupSize:100,groupMetadataBytes:4,layers:2,kvHeads:2,headDim:8,contextTokens:100,keyBits:8,valueBits:4,scratchBytes:1024});
 assert.equal(m.weightBytes,1160);assert.equal(m.kvBytes,4800);assert.equal(m.totalBytes,6984);
});
test('compute admission preserves graphics reserve and rejects duplicate or oversized jobs',()=>{
 const b=P.createWorkloadBudget({capacityBytes:1000,graphicsReserveBytes:400});
 b.setGraphicsBytes(500);
 assert.equal(b.reserve('ai',400),true);assert.equal(b.reserve('ai',1),false);
 assert.equal(b.reserve('second',101),false);assert.equal(b.snapshot().availableBytes,100);
 b.release('ai');assert.equal(b.reserve('second',500),true);
 b.setGraphicsBytes(700);assert.equal(b.snapshot().overBudget,true);
});
test('render scale drops under sustained pressure and recovers gradually',()=>{
 const g=P.createResolutionGovernor({targetFPS:30,minScale:.5,maxScale:1});
 for(let i=0;i<3;i++)g.observe({fps:18});
 assert.equal(g.snapshot().scale,.9);
 for(let i=0;i<8;i++)g.observe({fps:45});
 assert.equal(g.snapshot().scale,.95);
 for(let i=0;i<20;i++)g.observe({fps:60,computeBusy:true});
 assert.equal(g.snapshot().scale,.5);
});
test('invalid measurements and hidden frames do not change render scale',()=>{
 const g=P.createResolutionGovernor();
 for(let i=0;i<12;i++)g.observe({fps:0,hidden:true});
 for(let i=0;i<12;i++)g.observe({fps:NaN});
 assert.equal(g.snapshot().scale,1);
});
test('compressed cube textures include every face and deduplicate shared references',()=>{
 const face=()=>({mipmaps:[{data:new Uint8Array(32)},{data:new Uint8Array(8)}]});
 const t={isTexture:true,isCompressedTexture:true,image:Array.from({length:6},face),generateMipmaps:false};
 const o={material:{map:t,normalMap:t}};
 assert.equal(P.estimateGpuResources({active:[o],pending:[o]}).textureBytes,240);
});
test('explicit raw mip payload cannot undercount known float RGBA dimensions',()=>{
 const t={isTexture:true,type:1015,mipmaps:[{width:4,height:4,data:new Uint8Array(16)}]};
 assert.equal(P.estimateGpuResources({active:[{material:{map:t}}]}).textureBytes,256);
});
