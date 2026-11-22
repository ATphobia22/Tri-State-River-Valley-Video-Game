'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Model=require('../src/model-loader.js'),Rigged=require('../src/rigged-hero.js');
const file=fs.readFileSync(path.resolve(__dirname,'../assets/models/river_explorer_rigged.glb'));
const parsed=Model.parseGLB(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
test('all eight GLB-embedded texture images are extracted from the source binary without external URLs',()=>{
 const doc=parsed.json;assert.equal(doc.images.length,8);
 assert.equal(typeof Rigged.extractEmbeddedImage,'function','rigged runtime must decode source GLB image payloads');
 const used=new Set();
 for(const material of doc.materials){
  const id=material.pbrMetallicRoughness?.baseColorTexture?.index;
  if(id===undefined)continue;
  used.add(id);const im=Rigged.extractEmbeddedImage(parsed,id);
  assert.equal(im.mimeType,'image/png');
  assert.ok(im.bytes.length>100);
  assert.deepEqual([...im.bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(im.source,'GLB_BIN');
 }
 assert.equal(used.size,8);
});
test('rejects invalid embedded image indices instead of silently loading a remote texture',()=>{
 assert.throws(()=>Rigged.extractEmbeddedImage(parsed,999),/texture|index|image/i);
});

test('the real stage skeleton is animated, has 27 observed bones and can be overlaid without affecting gameplay',()=>{
 const THREE=require('../vendor/three.js'),Pose=require('../src/hero-character.js'),Stage=require('../src/hero-stage.js');
 const embedded=fs.readFileSync(path.resolve(__dirname,'../data/hero-model.js'),'utf8');
 const match=embedded.match(/window.ValleyRiggedHeroData="([^"]+)"/);
 assert.ok(match,'offline rig embedding required');
 globalThis.ValleyRiggedHeroData=match[1];globalThis.ValleyModelLoader=Model;
 try{
  const Hero={STATES:Pose.STATES,create:()=>Rigged.create(THREE,{samplePose:Pose.samplePose})};
  const stage=Stage.create(THREE,Hero);
  assert.equal(stage.hero.skinned,true);
  assert.equal(stage.skeletonBoneCount,27,'overlay must follow actual SkinnedMesh bones');
  assert.equal(stage.skeletonVisible,false);
  assert.equal(stage.setSkeletonVisible(true),true);
  assert.equal(stage.skeletonVisible,true);
  const before=stage.hero.joints.LeftUpperLeg.rotation.x;
  stage.update({state:'walk',stamp:760,dt:.06});
  assert.notEqual(stage.hero.joints.LeftUpperLeg.rotation.x,before,'actual bones must animate');
  assert.equal(stage.setSkeletonVisible(false),false);
  stage.dispose();
 }finally{delete globalThis.ValleyRiggedHeroData;delete globalThis.ValleyModelLoader;}
});
