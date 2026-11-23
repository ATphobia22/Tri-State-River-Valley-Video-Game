'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Rig=require('../src/rigged-hero.js'),Loader=require('../src/model-loader.js');
const THREE=require('../vendor/three.js'),Pose=require('../src/hero-character.js');
const root=path.join(__dirname,'..');
test('glTF 2.0 material plan shares linear ORM for AO, metalness and roughness, not sRGB',()=>{
 const specs=Rig.planMaterialTextureSlots({
  pbrMetallicRoughness:{baseColorTexture:{index:0},metallicRoughnessTexture:{index:2}},
  normalTexture:{index:1,scale:.7},
  occlusionTexture:{index:2,strength:.65}
 });
 assert.deepEqual(specs.map(s=>[s.property,s.index,s.colorSpace]),[
   ['map',0,'srgb'],['roughnessMap',2,'linear'],['metalnessMap',2,'linear'],
   ['normalMap',1,'linear'],['aoMap',2,'linear']]);
 assert.equal(specs.find(s=>s.property==='normalMap').scale,.7);
 assert.equal(specs.find(s=>s.property==='aoMap').scale,.65);
});
test('unknown or multi-UV textures are fail-closed, no approximate PBR mapping',()=>{
 assert.throws(()=>Rig.planMaterialTextureSlots({normalTexture:{index:4,texCoord:1}}),/TEXCOORD_1/);
 assert.throws(()=>Rig.planMaterialTextureSlots({pbrMetallicRoughness:{baseColorTexture:{index:-1}}}),/index/);
 assert.deepEqual(Rig.planMaterialTextureSlots({}),[]);
});
test('embedded binary hero can receive validated external prop and releases bone attachment on dispose',()=>{
 const code=fs.readFileSync(path.join(root,'data/hero-model.js'),'utf8');
 const b64=code.match(/window.ValleyRiggedHeroData="([^"]+)"/)?.[1];
 assert.ok(b64);
 globalThis.ValleyRiggedHeroData=b64;
 globalThis.ValleyModelLoader=Loader;
 try{
  const hero=Rig.create(THREE,{samplePose:Pose.samplePose});
  const tool=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
  assert.throws(()=>hero.attachPropToBone('NotABone',tool),/bone/i);
  assert.throws(()=>hero.attachPropToBone('RightHand',tool,{position:[Infinity,0,0]}),/finite/i);
  assert.equal(hero.attachPropToBone('RightHand',tool,{position:[.2,-.1,-.3]}),tool);
  assert.equal(tool.parent,hero.joints.RightHand);
  assert.equal(tool.position.x,.2);
  hero.update({state:'fish',stamp:200,dt:.05});
  assert.equal(tool.parent,hero.joints.RightHand);
  hero.dispose();
  assert.equal(tool.parent,null);
  tool.geometry.dispose();tool.material.dispose();
 } finally {delete globalThis.ValleyRiggedHeroData;delete globalThis.ValleyModelLoader;}
});
test('large embedded GLB is decoded in bounded chunks with byte-exact copy',()=>{
 const bytes=Buffer.alloc(310071);
 for(let i=0;i<bytes.length;i++)bytes[i]=(i*17+i*i)%256;
 const source=bytes.toString('base64');
 const old=globalThis.atob;let biggest=0;
 globalThis.atob=(part)=>{biggest=Math.max(biggest,part.length);return old(part);};
 try{
  const out=Buffer.from(Loader.decodeBase64(source));
  assert.deepEqual(out,bytes);
  assert.ok(biggest<=32768,'avoids transient full-size ASCII buffer');
 }finally{globalThis.atob=old;}
 assert.throws(()=>Loader.decodeBase64('bad'),/base64/i);
});
