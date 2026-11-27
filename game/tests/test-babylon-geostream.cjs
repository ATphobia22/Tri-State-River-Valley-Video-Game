const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const integration=import(pathToFileURL(path.resolve(__dirname,'../babylon-preview/official-geostream.mjs')).href);
const ORIGIN='https://example.test';
function fixture(){
 const bytes=new Uint8Array(136);
 bytes.set([80,77,84,105,108,101,115,3]);
 const view=new DataView(bytes.buffer);
 for(const [offset,value] of [[8,127],[16,5],[24,132],[32,0],[40,132],[48,0],[56,132],[64,4],[72,1],[80,1],[88,1]])view.setBigUint64(offset,BigInt(value),true);
 bytes[96]=1;bytes[97]=1;bytes[98]=1;bytes[99]=1;bytes[100]=0;bytes[101]=0;
 for(const [offset,value] of [[102,-88],[106,37],[110,-87],[114,38]])view.setInt32(offset,Math.round(value*1e7),true);
 bytes.set([1,0,1,4,1],127);bytes.set([11,12,13,14],132);
 return bytes;
}
test('Protomaps decodes a real PMTiles v3 root directory and tile through bounded HTTP-style ranges',async()=>{
 const {createPmtilesReader}=await integration,archive=fixture(),calls=[];
 const transport={readRange:async(url,start,length,opts)=>{
  calls.push({url,start,length,opts});
  const bytes=archive.slice(start,start+length);
  return {bytes,etag:'"release-v1"',totalBytes:archive.length,byteLength:bytes.length};
 }};
 const {reader,source}=createPmtilesReader('/world.pmtiles',{transport,origin:ORIGIN});
 const header=await reader.getHeader();
 assert.equal(header.specVersion,3);
 const tile=await reader.getZxy(0,0,0);
 assert.deepEqual(Array.from(new Uint8Array(tile.data)),[11,12,13,14]);
 assert.ok(calls.length>=3);
 assert.equal(calls[0].start,0);
 assert.equal(calls[0].length,127);
 assert.ok(calls.slice(1).every(c=>c.opts.etag==='"release-v1"'&&c.opts.totalBytes===136));
 assert.equal(source.getKey(),ORIGIN+'/world.pmtiles');
});
test('a PMTiles archive mutation fails closed without mixing archive versions',async()=>{
 const {createPmtilesRangeSource}=await integration;let count=0;
 const transport={readRange:async(_url,start,length,opts)=>{
  count++;if(count>1)throw Error('archive version changed');
  return {bytes:fixture().slice(0,127),etag:'"v1"',totalBytes:136};
 }};
 const source=createPmtilesRangeSource('/world.pmtiles',{origin:ORIGIN,transport});
 await assert.rejects(source.getBytes(0,16384),/archive version changed/);
});
test('camera traversal and HLOD mount require a right-handed scene and survey admission',async()=>{
 const {mountOfficialTiles}=await integration;
 const scene={useRightHandedSystem:true,onBeforeRenderObservable:{add(fn){this.fn=fn;return fn;},remove(fn){assert.equal(fn,this.fn);this.fn=null;}}};
 let rendered=0,disposed=0;
 class FakeRenderer{
  constructor(url,sceneArg){assert.equal(sceneArg,scene);assert.equal(url,ORIGIN+'/approved/tileset.json');this.lruCache={maxSize:8000,minSize:6000};}
  update(){rendered++;}
  dispose(){disposed++;}
 }
 assert.throws(()=>mountOfficialTiles({scene,url:'/approved/tileset.json',origin:ORIGIN,TilesRendererClass:FakeRenderer}),/registration/);
 assert.throws(()=>mountOfficialTiles({scene:{...scene,useRightHandedSystem:false},url:'/approved/tileset.json',origin:ORIGIN,registration:{surveyApproved:true},TilesRendererClass:FakeRenderer}),/right-handed/);
 const loaded=mountOfficialTiles({scene,url:'/approved/tileset.json',origin:ORIGIN,registration:{surveyApproved:true,assetSha256:'a'.repeat(64),controlPoints:3,coordinateSystem:'EPSG:4978',verticalDatum:'NAVD88',boundsValidated:true,humanApprovalId:'review-1'},maxTiles:60,TilesRendererClass:FakeRenderer});
 assert.equal(loaded.renderer.lruCache.maxSize,60);
 assert.equal(loaded.renderer.lruCache.minSize,60);
 scene.onBeforeRenderObservable.fn();
 assert.equal(rendered,1);
 loaded.dispose();loaded.dispose();assert.equal(disposed,1);
 assert.equal(scene.onBeforeRenderObservable.fn,null);
});
test('H3 cells use pinned official API and reject invalid coordinates',async()=>{
 const {h3Cell}=await integration;
 assert.equal(h3Cell(37.775938728915946,-122.41795063018799,9),'8928308280fffff');
 assert.throws(()=>h3Cell(NaN,-87,9),/coordinate/);
});
