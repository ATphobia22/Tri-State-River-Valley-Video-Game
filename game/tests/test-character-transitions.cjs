'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const THREE=require('../vendor/three.js');
const Model=require('../src/model-loader.js'),Pose=require('../src/hero-character.js'),Rig=require('../src/rigged-hero.js');
const root=path.resolve(__dirname,'..');
test('27-joint character endures rapid pose and grip changes without NaN, teleporting hands or animation-state loss',()=>{
 const glb=fs.readFileSync(path.join(root,'assets/models/river_explorer_rigged.glb'));
 globalThis.ValleyModelLoader=Model;
 globalThis.ValleyRiggedHeroData=glb.toString('base64');
 const model=Rig.create(THREE,{samplePose:Pose.samplePose});
 try{
  const states=['idle','walk','sprint','run','walk','fish','hunt','interact','drive','cook','farm','jump','land','idle','walk'];
  let frame=0;
  for(const state of states)for(let i=0;i<6;i++){
   frame++;model.update({state,stamp:frame*16.7,dt:.0167,
    heading:Math.sin(frame*.11)*.4,groundAt:(x,z)=>Math.sin(x*.19+z*.14)*.12});
   for(const joint of Object.values(model.joints)){
    for(const v of [...joint.position.toArray(),...joint.quaternion.toArray()])assert.ok(Number.isFinite(v),state);
   }
   assert.ok(model.meshes.every(m=>m.skeleton.bones.length===27));
  }
  assert.ok(model.joints.LeftIndex&&model.joints.RightThumb);
  assert.ok(model.clipMixerReady);
  assert.ok(model.footContacts);
  assert.ok(model.activeClip,'animation graph lost the active clip');
 }finally{model.dispose();delete globalThis.ValleyModelLoader;delete globalThis.ValleyRiggedHeroData;}
});
test('character inspector lets phone users collapse controls for unobstructed full-body evidence',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const source=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
 const stage=fs.readFileSync(path.join(root,'src/hero-stage.js'),'utf8');
 assert.match(html,/id="heroStudioToggle"/);
 assert.match(html,/#heroStudio\.is-minimized/);
 assert.match(source,/classList\.toggle\('is-minimized'\)/);
 assert.match(stage,/camera\.position\.set\(phone\?2\.3/);
});
