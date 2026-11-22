'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const crypto=require('node:crypto'),root=path.resolve(__dirname,'..');
const THREE=require('../vendor/three.js');
const Model=require('../src/model-loader.js'),Pose=require('../src/hero-character.js'),Rig=require('../src/rigged-hero.js');
const bytes=fs.readFileSync(path.join(root,'assets/models/river_explorer_rigged.glb'));
const obj=Model.parseGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),doc=obj.json;
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/models/river_explorer_manifest.json'),'utf8'));
test('original, new character artifact is deterministic, skinned and matches receipt',()=>{
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),manifest.sha256);
 assert.equal(manifest.boneCount,27);
 assert.equal(doc.skins[0].joints.length,27);
 assert.equal(doc.animations.length,13);
 assert.ok(manifest.degenerateTrianglesRemoved>300);
 assert.equal(doc.materials.length,15);
 assert.equal(manifest.usesExternalResources,false);
});
test('reference garment pass includes actual skinned short-sleeve and exposed forearm mesh',()=>{
 const skinMat=doc.materials.findIndex(m=>m.name==='River skin');
 const shirtMat=doc.materials.findIndex(m=>m.name==='River shirt');
 const gloveMat=doc.materials.findIndex(m=>m.name==='River gaiter');
 assert.ok(skinMat>=0&&shirtMat>=0&&gloveMat>=0);
 let exposed=0,shoulder=0,glove=0;
 for(const p of doc.meshes[0].primitives){
  const pos=Model.dataAccessor(obj,p.attributes.POSITION).values;
  const indices=Model.dataAccessor(obj,p.indices).values;
  for(let i=0;i<indices.length;i++){
   const k=indices[i]*3,x=pos[k],y=pos[k+1],z=pos[k+2];
   if(p.material===skinMat&&Math.abs(x)>5.05&&Math.abs(x)<6.52&&y>11.1&&y<12.9)exposed++;
   if(p.material===shirtMat&&Math.abs(x)>2.25&&Math.abs(x)<4.7&&y>11&&y<13)shoulder++;
   if(p.material===gloveMat&&Math.abs(x)>6.5&&Math.abs(x)<7.8&&y>11.0&&y<12.8)glove++;
  }
 }
 assert.ok(exposed>80,'no skinned forearm surface');
 assert.ok(shoulder>80,'short-sleeve ends missing');
 assert.ok(glove>50,'glove pads/cuffs missing');
});
test('eyeglasses use light translucent lenses, with 27 bone finger grip intact',()=>{
 const lens=doc.materials.find(m=>m.name==='River lens');
 assert.equal(lens.alphaMode,'BLEND');
 assert.ok(lens.pbrMetallicRoughness.baseColorFactor[3]>=.07);
 assert.ok(lens.pbrMetallicRoughness.baseColorFactor[3]<=.15);
 const heroModelJs=fs.readFileSync(path.join(root,'data/hero-model.js'),'utf8');
 assert.ok(heroModelJs.includes('window.ValleyRiggedHeroData='));
 const embedded=heroModelJs.match(/window.ValleyRiggedHeroData="([^"]+)"/);
 assert.ok(embedded);
 assert.equal(Buffer.from(embedded[1],'base64').length,bytes.length);
 globalThis.ValleyModelLoader=Model;globalThis.ValleyRiggedHeroData=embedded[1];
 const hero=Rig.create(THREE,{samplePose:Pose.samplePose});
 try{
  for(let i=0;i<45;i++)hero.update({state:'idle',stamp:i*16,dt:.016});
  assert.ok(hero.joints.LeftUpperArm.rotation.z>1.25,'left arm still spread');
  assert.ok(hero.joints.RightUpperArm.rotation.z< -1.25,'right arm still spread');
  assert.ok(hero.joints.RightIndex,'finger grip missing');
  hero.update({state:'fish',stamp:1000,dt:.016});
  assert.equal(hero.props.rod.visible,true);
 }finally{hero.dispose();delete globalThis.ValleyModelLoader;delete globalThis.ValleyRiggedHeroData}
});
test('hero studio exposes face focus and Chromium captures on mobile/desktop',()=>{
 const stage=fs.readFileSync(path.join(root,'src/hero-stage.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const smoke=fs.readFileSync(path.join(root,'tests/browser_hero_smoke.py'),'utf8');
 assert.match(stage,/focus==='face'/);
 assert.match(stage,/\['full','face','right-hand','boots'\]/);
 assert.match(html,/<option value="face">Gaiter and glasses close-up<\/option>/);
 assert.match(smoke,/river-face-covering\.png/);
 assert.match(smoke,/river-face-clean\.png/);
});
