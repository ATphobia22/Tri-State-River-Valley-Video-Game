const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const THREE=require('../vendor/three.js');
const Model=require('../src/model-loader.js');
const Pose=require('../src/hero-character.js');
const Rigged=require('../src/rigged-hero.js');
const root=path.resolve(__dirname,'..');
const raw=fs.readFileSync(path.join(root,'assets/models/river_explorer_rigged.glb'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/models/river_explorer_manifest.json'),'utf8'));
const bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
const parsed=Model.parseGLB(bytes),doc=parsed.json;

test('original self-contained GLB is independently reproducible with real skin, normal maps and clips',()=>{
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),manifest.sha256);
 assert.equal(manifest.usesExternalResources,false);
 assert.equal(doc.asset.version,'2.0');
 assert.equal(doc.skins.length,1);
 assert.equal(doc.skins[0].joints.length,17);
 assert.equal(doc.animations.length,9);
 assert.ok(doc.materials.length>=14);
 assert.ok(doc.meshes[0].primitives.length>=12);
 assert.equal(doc.buffers.length,1);
 assert.equal(doc.buffers[0].uri,undefined);
 for(const p of doc.meshes[0].primitives){
  const attr=p.attributes;
  for(const field of ['POSITION','NORMAL','JOINTS_0','WEIGHTS_0'])assert.ok(Number.isInteger(attr[field]),field);
  assert.ok(Number.isInteger(attr.TEXCOORD_0),'GLB texture coordinates missing');
  const uv=Model.dataAccessor(parsed,attr.TEXCOORD_0);
  assert.equal(uv.channels,2);
  const positions=Model.dataAccessor(parsed,attr.POSITION);
  const weights=Model.dataAccessor(parsed,attr.WEIGHTS_0);
  const joints=Model.dataAccessor(parsed,attr.JOINTS_0);
  assert.equal(positions.channels,3);
  assert.equal(weights.channels,4);
  assert.equal(weights.count,positions.count);
  assert.equal(uv.count,positions.count);
  assert.equal(joints.count,positions.count);
  for(let i=0;i<weights.count;i++){
   let total=0;
   for(let j=0;j<4;j++){
    const w=weights.values[i*4+j];total+=w;
    if(w>0)assert.ok(joints.values[i*4+j]<17);
   }
   assert.ok(Math.abs(total-1)<.00002,'invalid vertex weight '+i+': '+total);
  }
 }
 for(const n of ['Hips','Chest','Head','LeftFoot','RightFoot','LeftHand','RightHand'])
  assert.ok(doc.nodes.some(node=>node.name===n),n);
});
test('runtime decodes SkinnedMeshes and drives actual shoulder, knee and hand attachments',()=>{
 const js=fs.readFileSync(path.join(root,'data/hero-model.js'),'utf8');
 const match=js.match(/window.ValleyRiggedHeroData="([^"]+)"/);
 assert.ok(match,'generated offline embedding missing');
 globalThis.ValleyRiggedHeroData=match[1];
 globalThis.ValleyModelLoader=Model;
 try{
  const hero=Rigged.create(THREE,{samplePose:Pose.samplePose});
  assert.equal(hero.skinned,true);
  assert.equal(hero.meshes.length,doc.meshes[0].primitives.length);
  assert.ok(hero.meshes.every(mesh=>mesh.isSkinnedMesh&&mesh.skeleton.bones.length===17));
  assert.ok(hero.clips.includes('FishingCast'));
  assert.ok('left' in hero.footContacts && 'right' in hero.footContacts);
  assert.ok(hero.meshes.every(mesh=>mesh.geometry.attributes.uv?.count===mesh.geometry.attributes.position.count));
  const s=hero.update({state:'walk',stamp:950,dt:.065,groundAt:(x,z)=>.25*Math.sin(x/10)+.1*Math.cos(z/10),heading:.33});
  assert.equal(s.state,'walk');
  for(const name of ['LeftUpperLeg','RightUpperLeg','LeftLowerLeg','RightLowerLeg']){
   assert.ok(Number.isFinite(hero.joints[name].rotation.x),name);
  }
  for(const [state,prop] of [['fish','rod'],['cook','spoon'],['hunt','binoculars']]){
   hero.update({state,stamp:1500,dt:.045});
   assert.ok(hero.props[prop].visible,state);
   assert.equal(hero.props[prop].parent,hero.joints.RightHand);
  }
  hero.dispose();
 }finally{delete globalThis.ValleyRiggedHeroData;delete globalThis.ValleyModelLoader;}
});
test('game boot, cache and headless ground sampler all point to the real rig',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const game=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
 assert.ok(html.indexOf('data/hero-model.js')<html.indexOf('src/rigged-hero.js'));
 assert.ok(html.indexOf('src/rigged-hero.js')<html.indexOf('src/hero-character.js'));
 for(const file of ['./data/hero-model.js','./src/rigged-hero.js'])assert.ok(sw.includes(file));
 assert.match(game,/groundAt:height,heading:playerHeading/);
 assert.match(game,/heroSkinned:!!heroController\?\.skinned/);
});