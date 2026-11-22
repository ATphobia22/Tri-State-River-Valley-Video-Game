const test=require('node:test'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const A=require('../src/compressed-assets.js');
const raw={url:'assets/models/river_explorer_rigged.glb',encoding:'raw'};
const variants={raw,variants:{
 lite:{url:'assets/models/river-low.glb.gz',encoding:'gzip'},
 cinematic:{url:'assets/models/river-high.glb.gz',encoding:'gzip'}
}};
test('graphics tier selects optional local compressed variant and safe raw fallback',()=>{
 assert.equal(A.select(variants,'lite',{gzipSupported:true}).encoding,'gzip');
 assert.equal(A.select(variants,'cinematic',{gzipSupported:false}).url,raw.url);
 assert.equal(A.select(variants,'full',{gzipSupported:true}).url,raw.url);
});
test('reject remote, escaping, and unsupported asset paths',()=>{
 for(const url of ['https://example.com/model.glb','../secret.glb','assets/../test.glb','//evil/a.glb','data:text/html,evil']){
  assert.equal(A.localPath(url),false);
 }
 assert.throws(()=>A.select({raw:{url:'../bad.glb',encoding:'raw'}}),/fallback/);
});
test('optional gzip variant decodes exactly to original GLB bytes with no remote fetch',async()=>{
 const source=Buffer.concat([Buffer.from('glTF'),Buffer.from([2,0,0,0,20,0,0,0]),Buffer.alloc(8)]);
 const gz=zlib.gzipSync(source,{mtime:0});
 const loaded=await A.loadLocal(variants,'lite',{gzipSupported:true,fetcher:async(url)=>({
   ok:url==='assets/models/river-low.glb.gz',arrayBuffer:async()=>gz
 })});
 assert.deepEqual(Buffer.from(loaded.bytes),source);
});
test('invalid binary is not interpreted as a GLB',()=>assert.throws(()=>A.check(new Uint8Array(20)),/Invalid GLB/));
