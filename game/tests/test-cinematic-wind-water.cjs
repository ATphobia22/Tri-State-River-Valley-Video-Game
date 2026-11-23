'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const water=require('../src/river-water.js');
const grass=require('../src/graphics-quality.js');
const root=path.resolve(__dirname,'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const shoreline=x=>1200+125*Math.sin(x/550)+65*Math.cos(x/175);

test('physically inspired shore foam tracks the actual sinuous game bank, not a straight strip',()=>{
 for(const x of [-2300,-1100,-350,0,350,1150,2300]){
  const bank=shoreline(x);
  assert.ok(Math.abs(water.shorelineZ(x)-bank)<1e-8);
  assert.ok(water.foamMask(x,bank+1,'cinematic')>water.foamMask(x,bank+40,'cinematic'));
  assert.equal(water.foamMask(x,bank+40,'cinematic'),0);
  assert.equal(water.foamMask(x,bank+1,'lite'),0);
 }
 assert.match(water.vertexShader,/125\.0\s*\*\s*sin\(world\.x\s*\/\s*550\.0\)/);
 assert.match(water.vertexShader,/65\.0\s*\*\s*cos\(world\.x\s*\/\s*175\.0\)/);
});
test('water wind effect follows weather and quality without new web requests',()=>{
 const calm=water.parameters('clear',15,'high');
 const storm=water.parameters('rain',15,'high');
 const mobile=water.parameters('rain',15,'lite');
 assert.ok(storm.wind>calm.wind);
 assert.equal(mobile.wind,0);
 assert.equal(mobile.detail,0);
 assert.match(water.fragmentShader,/uniform float uWind;/);
 assert.match(water.fragmentShader,/foam/);
 assert.match(water.fragmentShader,/varying float vShoreDistance;/);
 assert.doesNotMatch(water.fragmentShader,/125\.0\s*\*\s*sin/);
 assert.doesNotMatch(water.fragmentShader,/float windWave=wave/);
 assert.doesNotMatch(read('src/river-water.js'),/fetch\(|https?:\/\//);
});
test('grass wind shader moves foliage vertices but not instance anchors',()=>{
 const material={userData:{}};
 const added=grass.attachWindSway(material);
 assert.equal(added,material);
 const shader={uniforms:{},vertexShader:'#include <common>\nvoid main(){\n#include <begin_vertex>\n}'};
 material.onBeforeCompile(shader);
 assert.ok(shader.uniforms.uWindTime);
 assert.ok(shader.uniforms.uWindStrength);
 assert.match(shader.vertexShader,/uWindStrength/);
 assert.match(shader.vertexShader,/transformed\.x/);
 assert.match(shader.vertexShader,/instanceMatrix/);
 assert.ok(!shader.vertexShader.includes('instanceMatrix[3].y +='));
 assert.equal(grass.attachWindSway(material),material);
});
test('visual wind state respects rain and phone power budgets',()=>{
 assert.equal(grass.windStrength('lite','rain'),0);
 assert.ok(grass.windStrength('cinematic','rain')>grass.windStrength('full','clear'));
 assert.ok(grass.windStrength('full','mist')<grass.windStrength('full','clear'));
 assert.ok(Number.isFinite(grass.windStrength('cinematic','storm')));
 const html=read('index.html'),game=read('src/game.js');
 assert.match(html,/src="src\/graphics-quality.js"/);
 assert.match(game,/grassLayer\.tick\(stamp,visualEffects,weather\)/);
});
test('GPU effect updates do not require rescaterring terrain instances',()=>{
 const material={userData:{}};
 grass.attachWindSway(material);
 grass.animateWind(material,1240,'cinematic','rain');
 assert.equal(material.userData.uWindTime.value,1.24);
 const first=material.userData.uWindStrength.value;
 grass.animateWind(material,1270,'lite','rain');
 assert.equal(material.userData.uWindStrength.value,0);
 assert.ok(first>0);
});

test('real road material clone becomes rain-wet and dries without new maps',()=>{
 const polish=require('../src/visual-polish.js');
 class Material{
  constructor(config){Object.assign(this,config);}
  dispose(){}
 }
 const THREE={MeshStandardMaterial:Material,MeshLambertMaterial:Material,DoubleSide:2};
 const palette=polish.make(THREE);
 const actualRoad={roughness:palette.road.roughness,metalness:palette.road.metalness};
 palette.setWeather('rain',actualRoad);
 assert.equal(actualRoad.roughness,.42);
 assert.equal(actualRoad.metalness,.06);
 palette.setWeather('clear',actualRoad);
 assert.equal(actualRoad.roughness,.94);
 assert.equal(actualRoad.metalness,.02);
 const game=read('src/game.js');
 assert.ok(game.includes('facadePalette.setWeather(weather,roadMesh?.material)'));
 palette.dispose();
});
