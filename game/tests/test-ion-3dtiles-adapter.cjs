const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');const {pathToFileURL}=require('node:url');
const loader=import(pathToFileURL(path.resolve(__dirname,'../babylon-preview/ion-3dtiles-adapter.mjs')).href);
test('ion metadata is never production authority',async()=>{
 const {validateCandidate}=await loader;
 const c={assetId:6204792,type:'3DTILES',status:'ION_COMPLETE_METADATA_ONLY'};
 assert.equal(validateCandidate(c).productionEligible,false);
 assert.throws(()=>validateCandidate({...c,productionApproved:true}),/approval/);
 assert.throws(()=>validateCandidate({...c,assetId:6204790}),/inventory/);
 assert.throws(()=>validateCandidate({...c,type:'TERRAIN'}),/mismatch/);
});
test('tile lifecycle requires registration, aborts, and disposes',async()=>{
 const {createTileController}=await loader;
 let disposed=0,loaded=0;
 const ctl=createTileController({maxTiles:30,loader:async (_,opts)=>{loaded++;assert.equal(opts.maxTiles,30);return {dispose:async()=>{disposed++;}};}});
 const c={assetId:6204792,type:'3DTILES',status:'ION_COMPLETE_METADATA_ONLY'};
 await assert.rejects(ctl.load(c),/registration/);
 assert.equal(loaded,0);
 await ctl.load(c,{registration:{admitted:true}});
 assert.equal(ctl.isLoaded,true);
 await ctl.unload();
 assert.equal(disposed,1);assert.equal(ctl.isLoaded,false);
 const a=new AbortController();a.abort();
 await assert.rejects(ctl.load(c,{registration:{admitted:true},signal:a.signal}),/aborted/);
 assert.equal(loaded,1);
});
