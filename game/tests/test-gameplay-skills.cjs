'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const S=require('../src/gameplay-skills.js'),C=require('../src/core.js');
test('three independent wildlife species roam on deterministic, bounded trails',()=>{
 const site={x:1260,z:-900},player={x:-30,z:500};
 const a=S.sampleWildlife(6300,player,site);
 assert.deepEqual(a,S.sampleWildlife(6300,player,site));
 assert.equal(Object.keys(a).length,3);
 assert.notEqual(a.deer.x,a.turkey.x);
 for(const v of Object.values(a)){
  assert.ok(v.x>=-47&&v.x<=47&&v.z>=-24&&v.z<=24);
  assert.ok(Number.isFinite(v.rotationY)&&Number.isFinite(v.bob)&&v.visible);
 }
 const active=S.sampleWildlife(6300,player,site,{kind:'turkey',target:.54});
 assert.equal(active.turkey.visible,true);assert.equal(active.deer.visible,false);
 assert.ok(Math.abs(active.turkey.x-(.54-.5)*67)<1e-8);
});
test('wildlife reacts to nearby player while retaining terrain clearing bounds',()=>{
 const site={x:1260,z:-900},far=S.sampleWildlife(7100,{x:0,z:0},site);
 const near=S.sampleWildlife(7100,{x:site.x+far.deer.x+3,z:site.z+far.deer.z+3},site);
 assert.notEqual(near.deer.x,far.deer.x);
 assert.ok(near.deer.x>=-47&&near.deer.x<=47);
});
test('reel requires bite hook and three successful tension matches',()=>{
 let start=S.newFishingRound(1000,'bass');
 assert.equal(S.fishCue(start,800).phase,'waiting');
 assert.equal(S.fishCue(start,1050).phase,'bite');
 assert.equal(S.reel(start,800,.5).result,'early');
 assert.equal(S.reel(start,2200,.5).result,'escaped');
 const hook=S.reel(start,1100,.5);assert.equal(hook.result,'hooked');
 let round=hook.round;
 assert.equal(S.reel(round,1150,.5).result,'cooldown');
 for(let i=1;i<=3;i++){
  const now=1100+i*310,aim=S.fishCue(round,now).target;
  const out=S.reel(round,now,aim);round=out.round;
  assert.equal(out.result,i===3?'landed':'good-reel');
 }
 assert.equal(round.progress,3);
 assert.equal(C.landFish(C.freshSave('Fisher'),'bass').save.inventory.fish,1);
});
test('bad aim breaks line; invalid species or plot never creates reward',()=>{
 let round=S.reel(S.newFishingRound(1000,'bluegill'),1100,.5).round;
 for(let i=1;i<=3;i++){
  const now=1100+i*350,wrong=S.fishCue(round,now).target<.5?1:0;
  round=S.reel(round,now,wrong).round;
 }
 assert.equal(round.phase,'escaped');assert.equal(round.progress,0);
 assert.equal(C.landFish(C.freshSave('Fisher'),'unknown').result,'invalid');
 assert.equal(S.farmPlotIndex(8),8);assert.equal(S.farmPlotIndex(9),null);
});
test('new minigame, wildlife and controls are actually embedded in offline runtime',()=>{
 const read=x=>fs.readFileSync(__dirname+'/../'+x,'utf8');
 const html=read('index.html'),game=read('src/game.js');
 assert.ok(html.includes('src="src/gameplay-skills.js"'));
 assert.ok(html.indexOf('src/gameplay-skills.js')<html.indexOf('src/open-world.js'));
 assert.ok(game.includes('SKILLS.reel(worldFishRound,now,worldAim)'));
 assert.ok(game.includes('gamepadInput.lookX'));
 assert.ok(read('src/open-world.js').includes('SKILLS?.sampleWildlife'));
 assert.ok(read('sw.js').includes('./src/gameplay-skills.js'));
 assert.ok(!html.includes('serviceWorker.register('));
});


const WORLD=require('../src/open-world.js');
test('in-world activity module initializes without a browser root crash',()=>{
 assert.equal(WORLD.closestSite(WORLD.SITES.fish),'fish');
 assert.equal(WORLD.closestSite({x:0,z:0}),null);
});
test('animal foraging, flight and targeting expose finite pose signals',()=>{
 const site={x:0,z:0},stamp=15622,far={x:-9999,z:-9999};
 const a=S.sampleWildlife(stamp,far,site);
 for(const [kind,state] of Object.entries(a)){
  assert.ok(['wander','forage','flee'].includes(state.behavior),kind);
  for(const key of ['gait','headDip','earFlick','tailSwish','bob'])
   assert.ok(Number.isFinite(state[key]),kind+' '+key);
  const near=S.sampleWildlife(stamp,{x:state.x,z:state.z},site)[kind];
  assert.equal(near.fleeing,true);
 }
 const tracked=S.sampleWildlife(stamp,far,site,{kind:'deer',target:.45});
 assert.equal(tracked.deer.behavior,'tracked');
 assert.equal(tracked.turkey.visible,false);
});
test('physical-looking animal parts, a visible fishing line and terrain-clock crop timing exist in 3D',()=>{
 const text=fs.readFileSync(__dirname+'/../src/open-world.js','utf8');
 for(const marker of ['deerHead','turkeyHead','rabbitHead','deerTail','fishingLineGeometry','state.behavior','t-now','mats.hoof','mats.eye'])
  assert.ok(text.includes(marker),marker);
});
