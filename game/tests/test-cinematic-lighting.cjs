'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../src/cinematic-lighting.js');
const read=(name)=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const rgb=x=>/^#[0-9a-f]{6}$/i.test(x);

test('cinematic palette spans daylight, sunset, blue hour and night without invalid values',()=>{
 for(const hour of [0,5.8,6,7,12,15.5,18.4,20,23.95,24,NaN,-1]){
  const p=C.sample({time:hour});
  assert.ok(Number.isFinite(p.sunIntensity)&&p.sunIntensity>=0);
  assert.ok(Number.isFinite(p.hemiIntensity)&&p.hemiIntensity>0);
  assert.ok(p.fogDensity>=0&&p.fogDensity<.002);
  assert.ok(p.exposure>=.65&&p.exposure<=1.3);
  for(const key of ['sky','horizon','zenith','fog','sun','hemi','ground'])
   assert.ok(rgb(p[key]),'invalid color '+key);
  const d=p.sunDirection;
  assert.ok(Math.abs(Math.hypot(d.x,d.y,d.z)-1)<1e-8);
 }
 assert.ok(C.sample({time:12}).sunIntensity>C.sample({time:22}).sunIntensity);
 assert.notEqual(C.sample({time:18.4,look:'golden'}).horizon,
                 C.sample({time:22,look:'lantern'}).horizon);
});
test('sunlight shifts warm at golden hour and blue at twilight',()=>{
 const day=C.sample({time:12,look:'natural'});
 const golden=C.sample({time:18.4,look:'golden'});
 const blue=C.sample({time:20.1,look:'blue'});
 assert.notEqual(golden.horizon,day.horizon);
 assert.notEqual(blue.zenith,day.zenith);
 assert.equal(golden.look,'golden');
});
test('storm and mist produce more aerial perspective without infinitely flattening scene',()=>{
 const clear=C.sample({time:12});
 const fog=C.sample({time:12,weather:'mist'});
 const rain=C.sample({time:12,weather:'rain'});
 assert.ok(fog.fogDensity>clear.fogDensity);
 assert.ok(rain.fogDensity>clear.fogDensity);
 assert.ok(rain.sunIntensity<clear.sunIntensity);
 assert.ok(C.sample({time:12,weather:'rain',effects:'lite'}).fogDensity<=.0001);
});
test('shadow caster disabled on phones, lite mode, storm and balanced quality',()=>{
 assert.equal(C.sample({quality:'cinematic',mobile:true}).allowShadows,false);
 assert.equal(C.sample({quality:'cinematic',effects:'lite'}).allowShadows,false);
 assert.equal(C.sample({quality:'cinematic',weather:'rain'}).allowShadows,false);
 assert.equal(C.sample({quality:'balanced',mobile:false}).allowShadows,false);
 assert.equal(C.sample({quality:'cinematic',mobile:false}).allowShadows,true);
});
test('applying cinematic light updates actual scene and camera-relative sun target',()=>{
 class FakeColor{
  constructor(v){this.value=v;}
  set(v){this.value=v;return this;}
 }
 const pos=()=>({set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}});
 const target={position:pos(),updateMatrixWorld(){}};
 const sun={color:new FakeColor('#fff'),intensity:0,position:pos(),target,
    shadow:{camera:{updateProjectionMatrix(){}},mapSize:{set(w,h){this.w=w;this.h=h;}}}};
 const scene={background:new FakeColor('#fff'),fog:{color:new FakeColor('#000'),density:0}};
 const ambient={color:new FakeColor('#fff'),groundColor:new FakeColor('#fff')};
 const renderer={toneMappingExposure:0,shadowMap:{enabled:false}};
 const p=C.sample({time:18.4,look:'golden',quality:'cinematic',mobile:false});
 assert.equal(C.apply({}, {scene,renderer,sunLight:sun,ambient,
      preset:p,playerX:140,playerY:4,playerZ:520}),true);
 assert.equal(target.position.x,140);
 assert.equal(target.position.z,520);
 assert.equal(scene.fog.color.value,p.fog);
 assert.equal(renderer.toneMappingExposure,p.exposure);
 assert.equal(renderer.shadowMap.enabled,true);
 assert.equal(sun.castShadow,true);
 assert.equal(sun.shadow.mapSize.w,1024);
 const low=C.sample({quality:'lite',mobile:true});
 C.apply({}, {scene,renderer,sunLight:sun,ambient,preset:low});
 assert.equal(renderer.shadowMap.enabled,false);
});
test('cinematic lighting and sky are wired to the playable source (not a static photo backdrop)',()=>{
 const html=read('index.html'),game=read('src/game.js'),sky=read('src/atmosphere.js');
 assert.ok(html.includes('src="src/cinematic-lighting.js"'));
 assert.ok(html.indexOf('src/cinematic-lighting.js')<html.indexOf('src/game.js'));
 assert.ok(game.includes('CINEMATIC.apply(G,'));
 assert.ok(game.includes('atmosphere.update(camera,time,weather,season,stamp,cinematicFrame)'));
 assert.ok(sky.includes('film?.horizon'));
 assert.ok(read('src/cinematic-lighting.js').includes('allowShadows'));
 assert.ok(!read('src/cinematic-lighting.js').includes('fetch('));
 assert.ok(!html.includes('serviceWorker.register('));
});
