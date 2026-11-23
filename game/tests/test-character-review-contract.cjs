'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Model=require('../src/model-loader.js');
const root=path.resolve(__dirname,'..');
function candidate(name,expectedJoints,clips){
 const file=fs.readFileSync(path.join(root,'art/character-review',name+'.glb'));
 const view=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
 const glb=Model.parseGLB(view),doc=glb.json;
 assert.equal(doc.asset.version,'2.0');
 assert.equal(doc.skins.length,1);
 assert.equal(doc.skins[0].joints.length,expectedJoints);
 assert.equal(doc.animations.length,clips.length);
 assert.deepEqual(doc.animations.map(x=>x.name).sort(),[...clips].sort());
 assert.ok(!doc.buffers.some(x=>x.uri));
 assert.ok(!(doc.images||[]).some(x=>x.uri));
 const skinned=doc.nodes.filter(n=>Number.isInteger(n.skin)&&Number.isInteger(n.mesh));
 assert.ok(skinned.length>0,name+' has no skinned mesh nodes');
 for(const node of skinned)for(const prim of doc.meshes[node.mesh].primitives){
  const attrs=prim.attributes;
  for(const field of ['POSITION','NORMAL','JOINTS_0','WEIGHTS_0','TEXCOORD_0'])
   assert.ok(Number.isInteger(attrs[field]),name+' '+field);
  const uv=Model.dataAccessor(glb,attrs.TEXCOORD_0);
  assert.equal(uv.channels,2);
 }
 return crypto.createHash('sha256').update(file).digest('hex');
}
test('art candidates are actual offline articulated GLBs, not procedural placeholders',()=>{
 const river=candidate('river',27,['Idle','Walk','Run','Sprint','Jump','Land','Farm','FishingCast','Cook','Track','Drive','Interact','Wave']);
 const scout=candidate('scout',16,['Idle','Walk','Run']);
 assert.match(river,/^[a-f0-9]{64}$/);
 assert.match(scout,/^[a-f0-9]{64}$/);
});
test('review runtime is opt-in and exports hashes for independently identifiable assets',()=>{
 const src=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(src,/Articulated Scout requires the 16-joint/);
 assert.match(src,/scoutRigReady:/);
 assert.match(src,/report.characterReview=/);
 assert.match(src,/review.scoutHash/);
 assert.match(html,/src="vendor\/gltf-loader\.js"/);
 assert.match(sw,/\.\/vendor\/gltf-loader\.js/);
 assert.doesNotMatch(html,/window\.ValleyCharacterReview\s*=/);
});
