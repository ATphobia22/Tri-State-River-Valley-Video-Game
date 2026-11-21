'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');

test('world coordinates are clamped to real preview coverage',()=>{
 assert.deepEqual(C.clampPosition({x:3100,z:-4000},2450),{x:2450,z:-2450});
 assert.deepEqual(C.clampPosition({x:120,z:-60},2450),{x:120,z:-60});
});

test('rewards are idempotent and completion tracked',()=>{
 let s=C.freshSave('River Family');
 s=C.completeStop(s,'courthouse',150);
 assert.equal(s.coins,150);
 assert.deepEqual(s.completed,['courthouse']);
 const repeat=C.completeStop(s,'courthouse',150);
 assert.equal(repeat.coins,150);
 assert.equal(repeat.completed.length,1);
});

test('save validation handles corrupt, malicious or legacy fields',()=>{
 const s=C.validateSave({name:'<script>alert(1)</script>',coins:Infinity,completed:['courthouse','courthouse','bad'],position:{x:999999,z:Infinity},mode:'rocket'});
 assert.equal(s.coins,0);
 assert.deepEqual(s.completed,['courthouse']);
 assert.equal(s.position.x,2450);
 assert.equal(s.mode,'walk');
 assert.ok(s.name.length<=24);
});

test('terrain grid bilinear interpolation returns original samples at nodes',()=>{
 const vals=new Uint16Array([100,200,300,400]);
 const grid={cols:2,rows:2,minFt:340,stepFt:0.01};
 assert.equal(C.sampleGrid(grid, vals, 0, 0),341);
 assert.equal(C.sampleGrid(grid, vals, 1, 1),344);
 assert.equal(C.sampleGrid(grid, vals, .5, .5),342.5);
});

test('event progression builds level and preserves nonnegative currencies',()=>{
 const start=C.freshSave('Scout');
 const next=C.gainReward(start,24,120);
 assert.equal(next.coins,24);
 assert.equal(next.xp,120);
 assert.equal(next.level,2);
 assert.equal(C.gainReward(start,-30,-10).coins,0);
});

test('all mission locations are within playable preview bounding box',()=>{
 for(const st of C.STOPS){
   assert.ok(Math.abs(st.x)<=2450, st.id+' x');
   assert.ok(Math.abs(st.z)<=2450, st.id+' z');
   assert.ok(st.title.length>0);
 }
});

test('farm minigame plants, grows and harvests crops with persistence',()=>{
 let s=C.gainReward(C.freshSave('Farm Family'),100,0);
 let a=C.farmAction(s,0,1000);
 assert.equal(a.result,'planted');
 assert.equal(a.save.coins,85);
 assert.equal(a.save.farmPlots[0],9000);
 a=C.farmAction(a.save,0,3000);
 assert.equal(a.result,'growing');
 assert.equal(a.save.coins,85);
 a=C.farmAction(a.save,0,9000);
 assert.equal(a.result,'harvested');
 assert.equal(a.save.coins,130);
 assert.equal(a.save.farmPlots[0],0);
 assert.equal(a.save.xp,45);
});

test('farm action rejects out-of-bounds plots and insufficient funds',()=>{
 const s=C.freshSave('Garden');
 const bad=C.farmAction(s,99,50);
 assert.equal(bad.result,'invalid');
 const poor=C.farmAction(s,2,50);
 assert.equal(poor.result,'needs-coins');
});

test('homestead building spends earned coins once and persists',()=>{
 let s=C.gainReward(C.freshSave('The Family'),300,0);
 const a=C.buildHomestead(s);
 assert.equal(a.result,'built');
 assert.equal(a.save.coins,50);
 assert.equal(a.save.homestead,true);
 const b=C.buildHomestead(a.save);
 assert.equal(b.result,'existing');
 assert.equal(b.save.coins,50);
 assert.equal(C.validateSave(b.save).homestead,true);
});

test('homestead cannot be constructed without coins',()=>{
 const b=C.buildHomestead(C.freshSave('The Family'));
 assert.equal(b.result,'needs-coins');
 assert.equal(b.save.homestead,false);
});

test('legacy saves migrate to a safe and persistent pantry',()=>{
 const s=C.validateSave({version:1,name:'Old Explorer',coins:70,completed:['riverfront']});
 assert.deepEqual(s.inventory,{corn:0,fish:0,game:0,meals:0});
 assert.equal(s.coins,70);assert.deepEqual(s.completed,['riverfront']);
 const corrupt=C.validateSave({inventory:{corn:-2,fish:'bad',game:Infinity,meals:9999999}});
 assert.deepEqual(corrupt.inventory,{corn:0,fish:0,game:0,meals:9999});
});

test('harvest adds corn to pantry and a missed harvest does not',()=>{
 let s=C.gainReward(C.freshSave('Grower'),30,0);
 let a=C.farmAction(s,0,100);assert.equal(a.save.inventory.corn,0);
 a=C.farmAction(a.save,0,8100);
 assert.equal(a.result,'harvested');assert.equal(a.save.inventory.corn,1);
});

test('hunting minigame awards virtual game only for timely accurate shots',()=>{
 let s=C.freshSave('Hunter');
 let miss=C.huntShot(s,0.9,0.2,3500,4000);
 assert.equal(miss.result,'missed');assert.equal(miss.save.inventory.game,0);
 let expired=C.huntShot(s,0.2,0.2,7000,4000);
 assert.equal(expired.result,'expired');
 let hit=C.huntShot(s,0.2,0.2,3500,4000);
 assert.equal(hit.result,'hit');assert.equal(hit.save.inventory.game,1);
 assert.ok(hit.save.xp>0);
});

test('fishing bite is caught only in reaction time window',()=>{
 const s=C.freshSave('Angler');
 const early=C.fishReel(s,2000,1400,'channelCatfish');assert.equal(early.result,'early');
 const late=C.fishReel(s,2000,3200,'channelCatfish');assert.equal(late.result,'late');
 const caught=C.fishReel(s,2000,2200,'channelCatfish');
 assert.equal(caught.result,'caught');assert.equal(caught.save.inventory.fish,1);
});

test('cooking recipes consume ingredients once and produce meals and rewards',()=>{
 let s=C.freshSave('Cook');
 assert.equal(C.cookRecipe(s,'fishFry').result,'ingredients');
 s.inventory.fish=1;s.inventory.corn=1;
 const cooked=C.cookRecipe(s,'fishFry');assert.equal(cooked.result,'cooked');
 assert.equal(cooked.save.inventory.fish,0);assert.equal(cooked.save.inventory.corn,0);
 assert.equal(cooked.save.inventory.meals,1);assert.ok(cooked.save.coins>0);
 assert.equal(C.cookRecipe(cooked.save,'fishFry').result,'ingredients');
 assert.equal(C.cookRecipe(s,'unlisted').result,'invalid');
});
