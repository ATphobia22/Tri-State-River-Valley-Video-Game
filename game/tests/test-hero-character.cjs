const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const THREE=require('../vendor/three.js');
const H=require('../src/hero-character.js');

test('production hero identity includes the supplied concept details',()=>{
 const p=H.PROFILE;
 assert.equal(p.id,'river-explorer');
 for(const part of ['curly-hair','glasses','skull-gaiter','black-shirt','gold-chain','cargo-pants','adventure-boots','backpack']){
  assert.ok(p.features.includes(part),part);
 }
});

test('state machine exposes every locomotion and in-world activity pose',()=>{
 const modes=['idle','walk','run','sprint','jump','land','interact','fish','hunt','cook','farm','drive'];
 for(const state of modes){
  const pose=H.samplePose(state,.48);
  assert.equal(pose.state,state);
  for(const key of ['torso','head','leftArm','rightArm','leftLeg','rightLeg','leftElbow','rightElbow','pack'])
   assert.ok(Number.isFinite(pose[key]),state+':'+key);
 }
 assert.equal(H.samplePose('invalid',0).state,'idle');
});

test('walking and running alternate leg stride and show different arm motion',()=>{
 const walkA=H.samplePose('walk',.1),walkB=H.samplePose('walk',.6);
 assert.notEqual(walkA.leftLeg,walkB.leftLeg);
 assert.ok(Math.abs(walkA.leftLeg+walkA.rightLeg)<.1);
 const run=H.samplePose('run',.1),sprint=H.samplePose('sprint',.1);
 assert.ok(Math.abs(sprint.leftArm)>Math.abs(run.leftArm)*.8);
 assert.notEqual(run.torso,sprint.torso);
});

test('fishing and cooking use recognizable separate upper-body poses',()=>{
 const fish=H.samplePose('fish',.4),cook=H.samplePose('cook',.4),hunt=H.samplePose('hunt',.4);
 assert.notEqual(fish.rightArm,cook.rightArm);
 assert.notEqual(fish.rightElbow,cook.rightElbow);
 assert.notEqual(hunt.torso,fish.torso);
});

test('hero can instantiate a detailed, articulated 3D group with no remote assets',()=>{
 const h=H.create(THREE);
 assert.ok(h.root.isGroup);
 for(const joint of ['leftArm','rightArm','leftLeg','rightLeg','head','torso','pack'])
  assert.ok(h.joints[joint].isGroup,joint);
 const tags=new Set();
 h.root.traverse(child=>{if(child.userData?.heroFeature)tags.add(child.userData.heroFeature)});
 for(const tag of ['hair','glasses','gaiter','chain','boots','backpack'])assert.ok(tags.has(tag),tag);
 h.dispose();
});

test('changing animation states blends pose and preserves player scale',()=>{
 const h=H.create(THREE);
 const start=h.update({state:'idle',stamp:100,dt:.016});
 const walk=h.update({state:'walk',stamp:160,dt:.016});
 assert.equal(start.state,'idle');assert.equal(walk.state,'walk');
 assert.ok(Number.isFinite(h.joints.leftLeg.rotation.x));
 const run=h.update({state:'sprint',stamp:240,dt:.05});
 assert.equal(run.state,'sprint');
 h.dispose();
});

test('a seated driver uses the same outfit with driving arm pose',()=>{
 const h=H.create(THREE,{seated:true});
 assert.ok(h.root.isGroup);
 const v=h.update({state:'drive',stamp:10,dt:.016});
 assert.equal(v.state,'drive');
 assert.ok(Math.abs(h.joints.leftArm.rotation.x)>.15);
 h.dispose();
});

test('game hooks the hero and its animations into the live world and offline cache',()=>{
 const root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const game=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
 assert.ok(html.includes('src/hero-character.js'));
 assert.ok(html.indexOf('src/hero-character.js')<html.indexOf('src/game.js'));
 assert.ok(sw.includes('./src/hero-character.js'));
 assert.match(game,/HERO\.create\(G\)/);
 assert.match(game,/heroController\.update\(/);
 assert.match(game,/heroState/);
});

test('activity gear switches on exactly at the corresponding pose',()=>{
 const h=H.create(THREE);
 for(const [mode,visible] of [['idle',[]],['fish',['rod']],['hunt',['binoculars']],['cook',['spoon']],['walk',[]]]){
  h.update({state:mode,stamp:2000,dt:.05});
  for(const [name,prop] of Object.entries(h.props))
   assert.equal(prop.visible,visible.includes(name),mode+':'+name);
 }
 h.dispose();
});
test('walking hero and car driver have independent pose state',()=>{
 const walker=H.create(THREE),driver=H.create(THREE,{seated:true});
 assert.notEqual(walker.root,driver.root);
 assert.equal(driver.state,'drive');
 walker.update({state:'walk',stamp:500,dt:.04});
 assert.equal(walker.state,'walk');assert.equal(driver.state,'drive');
 walker.dispose();driver.dispose();
});
