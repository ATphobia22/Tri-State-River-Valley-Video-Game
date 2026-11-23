'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const THREE=require('../vendor/three.js');
const Model=require('../src/model-loader.js');
const Pose=require('../src/hero-character.js');
const Rigged=require('../src/rigged-hero.js');
const root=path.resolve(__dirname,'..');

test('all shipped Blender deformation review samples are finite and cover every named clip',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(root,'art/character-review/deformation.json'),'utf8'));
 const expected={
  river:['Idle','Walk','Run','Sprint','Jump','Land','Farm','FishingCast','Cook','Track','Drive','Interact','Wave'],
  scout:['Idle','Walk','Run']
 };
 for(const [name,clips] of Object.entries(expected)){
  assert.deepEqual(Object.keys(data[name]).sort(),clips.slice().sort());
  for(const clip of clips){
   const values=data[name][clip];
   assert.equal(values.samples,17,name+'/'+clip+' sample count');
   for(const key of ['peak_displacement','edge_ratio_p01','edge_ratio_p99','max_edge_ratio'])
    assert.ok(Number.isFinite(values[key]),name+'/'+clip+'/'+key);
   assert.ok(values.peak_displacement>.01,'rig did not move: '+name+'/'+clip);
   assert.ok(values.edge_ratio_p01>.75&&values.edge_ratio_p99<1.5,'extreme strain: '+name+'/'+clip);
  }
 }
});
test('actual candidate River SkinnedMesh vertices deform and stay finite across gameplay poses',()=>{
 const raw=fs.readFileSync(path.join(root,'art/character-review/river.glb'));
 globalThis.ValleyRiggedHeroOverrideData=raw.toString('base64');
 globalThis.ValleyModelLoader=Model;
 let hero;
 try{
  hero=Rigged.create(THREE,{samplePose:Pose.samplePose,lod:'LOD0'});
  assert.equal(hero.skinned,true);
  assert.equal(hero.lod,'CUSTOM');
  assert.equal(hero.clips.length,13);
  const meshes=hero.meshes.filter(mesh=>mesh.isSkinnedMesh);
  assert.ok(meshes.length>0);
  let maxChange=0,baseline=null;
  const states=['idle','walk','run','sprint','jump','land','farm','fish','cook','hunt','drive','interact'];
  for(let i=0;i<states.length;i++){
   hero.update({state:states[i],stamp:1000+i*220,dt:.065,groundAt:(x,z)=>Math.sin(x*.1)*.1,heading:.2});
   hero.root.updateMatrixWorld(true);
   const coords=[];
   for(const mesh of meshes){
    const count=mesh.geometry.attributes.position.count;
    for(let j=0;j<Math.min(9,count);j++){
     const v=mesh.getVertexPosition(Math.floor(j*(count-1)/Math.max(1,Math.min(9,count)-1)),new THREE.Vector3());
     assert.ok(Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z),states[i]+' invalid skin vertex');
     coords.push(v.x,v.y,v.z);
    }
   }
   if(baseline)for(let k=0;k<coords.length;k++)maxChange=Math.max(maxChange,Math.abs(coords[k]-baseline[k]));
   else baseline=coords;
  }
  assert.ok(maxChange>.00001,'animation produces no skinned vertex movement');
 }finally{
  hero?.dispose?.();
  delete globalThis.ValleyRiggedHeroOverrideData;
  delete globalThis.ValleyModelLoader;
 }
});
