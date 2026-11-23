'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../src/cinematic-dressing.js');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('riverfront and courthouse decorative props are bounded local authored art',()=>{
 assert.equal(D.BENCHES.length,9);
 assert.equal(D.LAMPS.length,9);
 assert.equal(D.PLANTERS.length,12);
 for(const [x,z] of [...D.BENCHES,...D.LAMPS,...D.PLANTERS]){
  assert.ok(Number.isFinite(x)&&Number.isFinite(z));
  assert.ok(Math.abs(x)<2450&&Math.abs(z)<2450);
 }
 assert.ok(!/fetch\s*\(/.test(read('src/cinematic-dressing.js')));
 assert.ok(!/https?:\/\//.test(read('src/cinematic-dressing.js')));
});
test('decorative instancing and two budgeted lights do not add collision or network state',()=>{
 class Object3D{
  constructor(){this.position={set(){return this;}};this.rotation={set(){return this;}};
   this.scale={set(){return this;}};this.matrix={};}
  updateMatrix(){}
 }
 class Geometry{dispose(){}}
 class Material{constructor(v){Object.assign(this,v);}dispose(){}}
 class Color{setHex(v){this.value=v;return this;}}
 class InstancedMesh{
  constructor(geometry,material,count){this.geometry=geometry;this.material=material;this.count=count;this.instanceMatrix={};
   this.instanceColor={};}
  setMatrixAt(){}
  setColorAt(){}
  computeBoundingSphere(){}
 }
 class PointLight{
  constructor(color,intensity){this.color=color;this.intensity=intensity;this.position={set(){}};}
 }
 const THREE={InstancedMesh,BoxGeometry:Geometry,CylinderGeometry:Geometry,
  SphereGeometry:Geometry,IcosahedronGeometry:Geometry,
  MeshStandardMaterial:Material,Object3D,Color,PointLight};
 const inScene=new Set(),scene={add(v){inScene.add(v);},remove(v){inScene.delete(v);}};
 const art=D.create(THREE,scene,()=>8,{mobile:false});
 assert.equal(art.result.classification,'GAME_ART_NOT_SURVEYED');
 assert.equal(art.result.localPointLights,2);
 assert.equal(art.result.drawCalls,7);
 assert.equal(art.result.benches,9);
 assert.equal(art.result.lamps,9);
 assert.equal(art.result.planters,12);
 assert.equal(inScene.size,9);
 art.update(21,'clear','cinematic');
 art.dispose();
 assert.equal(inScene.size,0);
 const phone=D.create(THREE,scene,()=>8,{mobile:true});
 assert.equal(phone.result.localPointLights,0);
 phone.dispose();
});
test('game bundles original 3D dressing before it creates the playable world',()=>{
 const html=read('index.html'),game=read('src/game.js'),camera=read('src/cinematic-lighting.js');
 assert.ok(html.includes('src="src/cinematic-dressing.js"'));
 assert.ok(html.indexOf('src/cinematic-dressing.js')<html.indexOf('src/game.js'));
 assert.ok(game.includes('DRESS.create(G,scene,height'));
 assert.ok(game.includes('cinematicDressing.update(time,weather,cinemaPrefs.quality)'));
 assert.ok(game.includes('facadePalette.setWeather(weather)'));
 assert.ok(read('src/visual-polish.js').includes('roughness=wet'));
 assert.ok(camera.includes('allowShadows'));
});
