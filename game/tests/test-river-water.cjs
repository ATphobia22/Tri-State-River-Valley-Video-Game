const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const water=require('../src/river-water.js');
const root=path.resolve(__dirname,'..');
const read=path=>fs.readFileSync(require('node:path').join(root,path),'utf8');

test('original river material uses Fresnel, animated normals and output transform',()=>{
 assert.match(water.fragmentShader,/fresnel/);
 assert.match(water.fragmentShader,/uTime/);
 assert.match(water.fragmentShader,/uDetail/);
 assert.match(water.fragmentShader,/<tonemapping_fragment>/);
 assert.match(water.fragmentShader,/<colorspace_fragment>/);
 assert.doesNotMatch(read('src/river-water.js'),/fetch\(|https?:\/\//);
});

test('quality tiers reduce high-frequency river detail for mobile',()=>{
 assert.equal(water.qualityDetail('lite'),0);
 assert.equal(water.qualityDetail('low'),0);
 assert.equal(water.qualityDetail('medium'),.55);
 assert.equal(water.qualityDetail('high'),1);
 assert.equal(water.qualityDetail('auto'),1);
});

test('weather and sun uniforms are deterministic and bounded',()=>{
 assert.deepEqual(water.parameters('rain',6,'lite'),{storm:1,daylight:0,detail:0});
 assert.equal(water.parameters('mist',12,'medium').storm,.45);
 assert.ok(water.parameters('sun',12,'high').daylight<=1);
});

test('river shader constructs and updates without external services',()=>{
 class Color{constructor(value){this.value=value;}}
 class Vector3{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}normalize(){return this;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}}
 class ShaderMaterial{constructor(args){Object.assign(this,args);}}
 class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material;}}
 const three={Color,Vector3,ShaderMaterial,Mesh,DoubleSide:2};
 const {mesh,material}=water.create(three,{mock:true},{quality:'lite'});
 assert.equal(mesh.material,material);
 assert.equal(material.uniforms.uDetail.value,0);
 assert.equal(material.depthWrite,false);
 water.update(material,2000,'rain',18,'medium');
 assert.equal(material.uniforms.uTime.value,2);
 assert.equal(material.uniforms.uStorm.value,1);
 assert.equal(material.uniforms.uDetail.value,.55);
});

test('new scene asset is loaded before game runtime and cached for offline',()=>{
 const html=read('index.html'),sw=read('sw.js'),game=read('src/game.js');
 assert.ok(html.includes('src="src/river-water.js"'));
 assert.ok(html.indexOf('src/river-water.js')<html.indexOf('src/game.js'));
 assert.ok(sw.includes('"./src/river-water.js"'));
 assert.match(game,/RIVER_WATER\.create\(G,geo/);
 assert.match(game,/RIVER_WATER\.update\(waterMesh\.material/);
});
