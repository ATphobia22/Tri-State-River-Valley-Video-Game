const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('../src/graphics-quality.js');
const river=(x,z)=>z>1200+125*Math.sin(x/550)+65*Math.cos(x/175)-22;
test('quality tiers cap both mobile and desktop grass while preserving tree limits',()=>{
 assert.equal(Q.budget('lite',true).grass,0);
 assert.equal(Q.budget('full',true).grass,180);
 assert.equal(Q.budget('cinematic',false).grass,720);
 assert.ok(Q.budget('cinematic',true).grass<Q.budget('cinematic',false).grass);
 assert.equal(Q.budget('unsupported',false).name,'full');
});
test('grass descriptors are deterministic bounded world-space and game-water safe',()=>{
 const args={quality:'cinematic',mobile:false,limit:2200,inRiver:river,stops:[{x:92,z:465}]};
 const a=Q.grassDescriptors(80,490,args),b=Q.grassDescriptors(80,490,args);
 assert.deepEqual(a,b);assert.ok(a.length>0&&a.length<=720);
 assert.ok(a.every(v=>Math.abs(v.x)<=2200&&Math.abs(v.z)<=2200&&!river(v.x,v.z)));
 assert.ok(a.every(v=>Math.hypot(v.x-92,v.z-465)>=38));
 assert.equal(new Set(a.map(v=>v.key)).size,a.length);
});
test('same region honors density profile and mobility budget',()=>{
 const lo=Q.grassDescriptors(-720,-300,{quality:'lite'});
 const hi=Q.grassDescriptors(-720,-300,{quality:'cinematic',mobile:true});
 assert.equal(lo.length,0);assert.ok(hi.length>10&&hi.length<=300);
});
test('bad locations and invalid limits return empty without allocating geometry',()=>{
 assert.deepEqual(Q.grassDescriptors(NaN,0),[]);
 assert.deepEqual(Q.grassDescriptors(0,0,{limit:0}),[]);
});
