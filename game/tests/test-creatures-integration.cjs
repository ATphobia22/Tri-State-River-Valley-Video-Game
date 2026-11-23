'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const T=require('../vendor/three.js');
const creatures=require('../src/creatures.js');
const world=require('../src/open-world.js');

test('deer, turkey, rabbit and Scout create without reliance on a global THREE',()=>{
 const before=global.THREE;
 delete global.THREE;
 try{
  for(const kind of ['scout','deer','turkey','rabbit']){
   const model=creatures.create(T,kind);
   assert.ok(model.isGroup);
   assert.equal(model.userData.kind,kind);
   let count=0;
   model.traverse(object=>{if(object.isMesh)count++;});
   assert.ok(count>=5,kind+' was not built from 3D meshes');
   assert.equal(typeof model.userData.animate,'function');
   model.userData.animate(.016,{moving:true,phase:1.2,action:'run'});
  }
 }finally{if(before!==undefined)global.THREE=before;}
});
test('enhanced woodland animals are anchored to existing game height sample without duplicating visible base meshes',()=>{
 const scene=new T.Scene();
 const ground=(x,z)=>12+.002*x+.003*z;
 const game=world.sceneWorld(T,scene,ground,{enhancedCreatures:true});
 try{
  assert.equal(game.counts.animalModels,3);
  assert.ok(game.creatureVisuals?.deer?.isGroup);
  assert.ok(game.creatureVisuals?.turkey?.isGroup);
  assert.ok(game.creatureVisuals?.rabbit?.isGroup);
  for(const [kind,animal] of Object.entries(game.wildlife)){
   assert.ok(animal.children.some(child=>child===game.creatureVisuals[kind]));
   assert.equal(animal.children.filter(child=>child.visible).length,1,
    'only the enhanced creature should be initially visible');
  }
  game.update({stamp:1750,save:{farmPlots:new Array(9).fill(0),inventory:{meals:0}},
    activity:null,player:{x:-200,z:-900},now:15000});
  const deer=game.wildlife.deer,state=deer.userData.state;
  assert.ok(['flee','tracked','forage','wander'].includes(state));
  const baseline=ground(world.SITES.hunt.x,world.SITES.hunt.z);
  assert.ok(Number.isFinite(deer.position.y));
  assert.ok(Math.abs(deer.position.y-(ground(world.SITES.hunt.x+deer.position.x,world.SITES.hunt.z+deer.position.z)-baseline))<3);
 }finally{game.dispose();}
});
test('the shipped HTML loads creatures before game and the retired worker does not intercept fetch',()=>{
 const root=path.join(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.ok(html.includes('<script src="src/creatures.js"></script>'));
 assert.ok(html.indexOf('src/creatures.js')<html.indexOf('src/open-world.js'));
 assert.ok(html.indexOf('src/creatures.js')<html.indexOf('src/game.js'));
 assert.ok(sw.includes('./src/creatures.js'));
 assert.ok(sw.includes('river-valley-family-1.13.4'));
 assert.ok(!/serviceWorker\.register\(/.test(html));
 assert.ok(!/addEventListener\(['"]fetch['"]/.test(sw));
});
test('optional Scout upgrade does not supersede a user-provided verified GLB',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');
 assert.ok(source.includes('dog.userData.cinematicScout'));
 assert.ok(source.includes('!dog.userData.customScout'));
 assert.ok(source.includes('enhanced.userData.animate'));
});
