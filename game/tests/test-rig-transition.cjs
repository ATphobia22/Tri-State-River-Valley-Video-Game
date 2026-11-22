'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const THREE=require('../vendor/three.js'),Model=require('../src/model-loader.js'),Pose=require('../src/hero-character.js'),Rigged=require('../src/rigged-hero.js');
const root=path.resolve(__dirname,'..');
const raw=fs.readFileSync(path.join(root,'assets/models/river_explorer_rigged.glb'));
const parsed=Model.parseGLB(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
function liveHero(){
 const embed=fs.readFileSync(path.join(root,'data/hero-model.js'),'utf8').match(/window.ValleyRiggedHeroData="([^"]+)"/);
 assert.ok(embed,'generated online/offline model reference missing');
 globalThis.ValleyRiggedHeroData=embed[1];globalThis.ValleyModelLoader=Model;
 return Rigged.create(THREE,{samplePose:Pose.samplePose});
}
function dispose(hero){hero.dispose();delete globalThis.ValleyRiggedHeroData;delete globalThis.ValleyModelLoader;}
test('27 real bones: all ten fingers have skinned vertices with positive weights in current GLB',()=>{
 const names=parsed.json.skins[0].joints.map(i=>parsed.json.nodes[i].name);
 assert.equal(names.length,27);
 const counts=new Array(27).fill(0);
 for(const prim of parsed.json.meshes[0].primitives){
  const ids=Model.dataAccessor(parsed,prim.attributes.JOINTS_0).values,weights=Model.dataAccessor(parsed,prim.attributes.WEIGHTS_0).values;
  assert.equal(ids.length,weights.length);
  for(let i=0;i<ids.length;i++)if(weights[i]>.05)counts[ids[i]]++;
 }
 for(const side of ['Left','Right'])for(const digit of ['Thumb','Index','Middle','Ring','Pinky']){
  const index=names.indexOf(side+digit);
  assert.ok(index>=17,index+':'+side+digit);
  assert.ok(counts[index]>=7,'finger bone lacks actual skinned geometry: '+side+digit);
 }
});
test('rapid direction/animation transitions preserve finite bone poses, real grip flexion and planted feet',()=>{
 const hero=liveHero();
 try{
  assert.equal(hero.clipMixerReady,true);
  const states=['walk','run','sprint','walk','idle','walk','sprint','jump','land','walk',
   'fish','cook','hunt','drive','interact','farm','run','idle'];
  let stamp=0,plantedContinuity=0;
  let prev=null;
  const ground=(x,z)=>Math.sin(x*.04)*.28+Math.cos(z*.038)*.21;
  for(let i=0;i<300;i++){
   const state=states[Math.floor(i/8)%states.length],heading=i%16<8?.42:-.9;
   hero.root.position.set(i*.12,ground(i*.12,i*.07),i*.07);
   hero.root.rotation.y=heading;
   stamp+=16;
   const next=hero.update({state,stamp,dt:.016,heading,groundAt:ground});
   assert.equal(next.state,state);
   assert.ok(hero.activeClip,'a baked glTF animation should be crossfading');
   for(const name of ['Hips','LeftHand','RightHand','LeftThumb','LeftPinky','RightThumb','RightPinky',
     'LeftUpperLeg','LeftLowerLeg','LeftFoot','RightUpperLeg','RightLowerLeg','RightFoot']){
    const joint=hero.joints[name];
    for(const v of [joint.position.x,joint.position.y,joint.position.z,joint.rotation.x,joint.rotation.y,joint.rotation.z])
     assert.ok(Number.isFinite(v),name+' invalid after '+state);
   }
   const snap=hero.footContacts;
   for(const side of ['left','right']){
    const foot=snap[side],before=prev?.[side];
    if(foot.planted&&before?.planted&&before.anchor&&foot.anchor){
     assert.ok(Math.hypot(before.anchor.x-foot.anchor.x,before.anchor.z-foot.anchor.z)<.00001,
       'planted stance slid during unchanged contact');
     plantedContinuity++;
    }
   }
   prev=snap;
  }
  assert.ok(plantedContinuity>2,'locomotion did not preserve any continuous stance contacts');
  for(let n=0;n<20;n++)hero.update({state:'fish',stamp:6000+n*16,dt:.016});
  assert.ok(Math.abs(hero.joints.RightIndex.rotation.x)>.1,'index finger did not curl for rod grip');
  assert.ok(Math.abs(hero.joints.RightThumb.rotation.x)>.05,'thumb did not oppose rod grip');
  for(let n=0;n<20;n++)hero.update({state:'idle',stamp:6800+n*16,dt:.016});
  assert.equal(hero.activeClip,'Idle');
  assert.equal(hero.footContacts.left.anchor,null);
  assert.equal(hero.footContacts.right.anchor,null);
 }finally{dispose(hero)}
});
