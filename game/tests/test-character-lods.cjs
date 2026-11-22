const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const P=path.resolve(__dirname,'..'),Model=require('../src/model-loader.js'),Pose=require('../src/hero-character.js'),Rig=require('../src/rigged-hero.js'),THREE=require('../vendor/three.js');
const docs={};
for(const lod of ['LOD0','LOD1','LOD2']){
 const filename=lod==='LOD0'?'river_explorer_rigged':'river_explorer_'+lod.toLowerCase();
 const bytes=fs.readFileSync(path.join(P,'assets/models/'+filename+'.glb'));
 const receipt=JSON.parse(fs.readFileSync(path.join(P,'assets/models/'+(lod==='LOD0'?'river_explorer':'river_explorer_'+lod.toLowerCase())+'_manifest.json'),'utf8'));
 const parsed=Model.parseGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 docs[lod]={receipt,parsed};
 test('27-joint 13-clip embedded self-contained '+lod,()=>{
  assert.equal(receipt.lod,lod);assert.equal(receipt.boneCount,27);
  assert.equal(receipt.clips.length,13);assert.equal(parsed.json.skins[0].joints.length,27);
  assert.equal(parsed.json.animations.length,13);assert.equal(receipt.usesExternalResources,false);
  assert.equal(receipt.embeddedTextureImages,8);assert.equal(parsed.json.images.length,8);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),receipt.sha256);
 });
}
test('LOD1 and LOD2 reduce real mesh topology without deleting animations or fingers',()=>{
 assert.ok(docs.LOD0.receipt.triangleCount>docs.LOD1.receipt.triangleCount);
 assert.ok(docs.LOD1.receipt.triangleCount>docs.LOD2.receipt.triangleCount);
 assert.ok(docs.LOD0.receipt.vertexCount>docs.LOD1.receipt.vertexCount);
 assert.ok(docs.LOD1.receipt.vertexCount>docs.LOD2.receipt.vertexCount);
});
test('browser source selects the requested LOD but defaults to the LOD0 benchmark',()=>{
 const original=fs.readFileSync(path.join(P,'data/hero-model.js'),'utf8');
 const lod1=fs.readFileSync(path.join(P,'data/hero-model-lod1.js'),'utf8');
 const lod2=fs.readFileSync(path.join(P,'data/hero-model-lod2.js'),'utf8');
 const source=(str,label)=>{const match=str.match(new RegExp('window\\.'+label+'="([^"]+)"'));assert.ok(match,label+' missing');return match[1];};
 globalThis.ValleyRiggedHeroData=source(original,'ValleyRiggedHeroData');
 globalThis.ValleyRiggedHeroLOD1Data=source(lod1,'ValleyRiggedHeroLOD1Data');
 globalThis.ValleyRiggedHeroLOD2Data=source(lod2,'ValleyRiggedHeroLOD2Data');
 globalThis.ValleyModelLoader=Model;
 try{
  for(const lod of ['LOD0','LOD1','LOD2']){
   const rig=Rig.create(THREE,{samplePose:Pose.samplePose,lod});
   assert.equal(rig.lod,lod);assert.equal(rig.skinned,true);
   assert.equal(rig.clips.length,13);assert.equal(rig.meshes.length,docs[lod].parsed.json.meshes[0].primitives.length);
   rig.dispose();
  }
 }finally{
  for(const key of ['ValleyRiggedHeroData','ValleyRiggedHeroLOD1Data','ValleyRiggedHeroLOD2Data','ValleyModelLoader'])delete globalThis[key];
 }
});
