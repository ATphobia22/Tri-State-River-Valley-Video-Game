const test=require('node:test');const assert=require('node:assert/strict');
const path=require('node:path');const {pathToFileURL}=require('node:url');
const modulePromise=import(pathToFileURL(path.resolve(__dirname,'../babylon-preview/asset-transport.mjs')));
const sha=async bytes=>Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
const glb=()=>{const b=new Uint8Array(12);b.set([0x67,0x6c,0x54,0x46,2,0,0,0,12,0,0,0]);return b;};
test('validates complete GLB digest, length and header before admission',async()=>{
 const {createAssetTransport}=await modulePromise;const data=glb();
 const get=async()=>new Response(data,{status:200,headers:{'Content-Length':String(data.length)}});
 const t=createAssetTransport({origin:'https://game.example',fetchImpl:get,maxBytes:100});
 const item=await t.fetchVerified('https://game.example/buildings/a.glb',{sha256:await sha(data),expectedBytes:12,kind:'glb'});
 assert.equal(item.byteLength,12);assert.equal(item.verified,true);
 await assert.rejects(()=>t.fetchVerified('/a.glb',{sha256:'a'.repeat(64),expectedBytes:12,kind:'glb'}),/digest/i);
});
test('rejects cross-origin hosts and embedded credentials',async()=>{
 const {createAssetTransport}=await modulePromise;const t=createAssetTransport({origin:'https://game.example',fetchImpl:async()=>{throw Error('network should not run')}});
 await assert.rejects(()=>t.readRange('https://evil.example/file.pmtiles',0,16),/origin/i);
 await assert.rejects(()=>t.readRange('https://user:secret@game.example/file.pmtiles',0,16),/credential/i);
 await assert.rejects(()=>t.readRange('file:///tmp/test.pmtiles',0,16),/origin/i);
});
test('range reader rejects HTTP 200 ignored ranges and mismatched Content-Range',async()=>{
 const {createAssetTransport}=await modulePromise;
 let t=createAssetTransport({origin:'https://game.example',fetchImpl:async()=>new Response(new Uint8Array(4),{status:200})});
 await assert.rejects(()=>t.readRange('/a.pmtiles',0,4),/206/);
 t=createAssetTransport({origin:'https://game.example',fetchImpl:async()=>new Response(new Uint8Array(4),{status:206,headers:{'Content-Range':'bytes 1-4/100'}})});
 await assert.rejects(()=>t.readRange('/a.pmtiles',0,4),/Content-Range/);
});
test('bounded range reader reports unverified slice rather than trusted asset',async()=>{
 const {createAssetTransport}=await modulePromise;
 const t=createAssetTransport({origin:'https://game.example',maxBytes:16,fetchImpl:async()=>new Response(new Uint8Array([80,77,84,105]),{status:206,headers:{'Content-Range':'bytes 0-3/100'}})});
 const item=await t.readRange('/archive.pmtiles',0,4);
 assert.equal(item.verified,false);assert.equal(item.byteLength,4);assert.equal(item.trust,'UNVERIFIED_RANGE');
 await assert.rejects(()=>t.readRange('/archive.pmtiles',0,17),/max/i);
});

test('rejects redirects and impossible archive totals',async()=>{
 const {createAssetTransport}=await modulePromise;
 const t=createAssetTransport({origin:'https://game.example',fetchImpl:async(url,options)=>{
  assert.equal(options.redirect,'error');
  return new Response(new Uint8Array(4),{status:206,headers:{'Content-Range':'bytes 0-3/3'}});
 }});
 await assert.rejects(()=>t.readRange('/a.pmtiles',0,4),/Content-Range/);
});
test('archive session requires a strong validator and rejects version changes',async()=>{
 const {createAssetTransport}=await modulePromise;
 let calls=0;
 const t=createAssetTransport({origin:'https://game.example',fetchImpl:async(url,options)=>{
  calls++;
  if(calls===2)assert.equal(options.headers['If-Match'],'"v1"');
  return new Response(new Uint8Array(4),{status:206,headers:{'Content-Range':'bytes 0-3/100','ETag':calls===1?'"v1"':'"v2"'}});
 }});
 const first=await t.readRange('/a.pmtiles',0,4,{requireVersion:true});
 assert.equal(first.etag,'"v1"');assert.equal(first.totalBytes,100);
 await assert.rejects(()=>t.readRange('/a.pmtiles',0,4,{requireVersion:true,etag:first.etag,totalBytes:first.totalBytes}),/version/i);
});
