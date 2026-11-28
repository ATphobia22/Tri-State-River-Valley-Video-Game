'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../src/core.js');
const Skills=require('../src/gameplay-skills.js');
const World=require('../src/open-world.js');
const load=import('../babylon-preview/shared-activities.mjs');

const memory=()=>{
 const map=new Map();
 return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),map};
};
function setup(storage=memory(),clock=()=>1000){
 return load.then(({createActivitySession})=>({session:createActivitySession({core:C,skills:Skills,world:World,storage,clock}),storage}));
}

test('Babylon reads the original three-slot save schema and never rewrites legacy player coordinates',async()=>{
 const storage=memory(),old=C.gainReward(C.freshSave('Existing'),300,0);
 old.position={x:15,z:777};old.completed=['courthouse'];
 storage.setItem('river-family-adventure-v1-slot-0',JSON.stringify(old));
 const {session}=await setup(storage);
 assert.equal(session.snapshot().save.coins,300);
 assert.deepEqual(session.snapshot().save.position,{x:15,z:777});
 assert.equal(session.farm(0,1000).result,'planted');
 const persisted=JSON.parse(storage.getItem('river-family-adventure-v1-slot-0'));
 assert.deepEqual(persisted.position,{x:15,z:777});
 assert.equal(persisted.farmPlots[0],9000);
});

test('game waypoint discovery grants real original mission rewards at most once',async()=>{
 const {session}=await setup();
 assert.equal(session.discover('pier').result,'completed');
 assert.equal(session.snapshot().save.coins,C.STOPS.find(s=>s.id==='riverfront').reward);
 assert.deepEqual(session.snapshot().save.completed,['riverfront']);
 assert.equal(session.discover('pier').result,'already');
 assert.equal(session.snapshot().save.completed.length,1);
 assert.equal(session.discover('unknown').result,'invalid');
});

test('fishing is the original bite/hook/tension minigame and awards only after landing',async()=>{
 const {session}=await setup();
 assert.equal(session.castFish('bass',1000,1000).result,'cast');
 assert.equal(session.reelFish(.5,1800).result,'early');
 assert.equal(session.snapshot().save.inventory.fish,0);
 assert.equal(session.reelFish(.5,2100).result,'hooked');
 for(let i=1;i<=3;i++){
  const now=2100+i*310,aim=session.snapshot(now).fishing.cue.target;
  assert.equal(session.reelFish(aim,now).result,i===3?'landed':'good-reel');
 }
 assert.equal(session.snapshot().save.inventory.fish,1);
 assert.equal(session.reelFish(.5,4000).result,'no-round');
 assert.equal(session.snapshot().save.inventory.fish,1);
});

test('farming, watering and six kitchen recipes reuse the original rules and pantry',async()=>{
 const {session}=await setup();
 session.discover('farm');
 const plot=session.farm(0,1000);assert.equal(plot.result,'planted');
 assert.equal(session.farm(0,1001).result,'growing');
 assert.equal(session.waterFarm(2000).result,'watered');
 assert.equal(session.farm(0,3500).result,'growing');
 assert.equal(session.farm(0,3501).result,'harvested');
 assert.equal(session.snapshot().save.inventory.corn,1);
 assert.equal(session.cook('cornSkillet').result,'ingredients');
 assert.equal(Object.keys(session.recipes()).length,6);
 session.farm(0,5000);session.farm(0,13000);
 assert.equal(session.cook('cornSkillet').result,'cooked');
 assert.equal(session.snapshot().save.inventory.corn,0);
 assert.equal(session.snapshot().save.inventory.meals,1);
});

test('hunting uses original moving animal target and never double-grants virtual game',async()=>{
 const {session}=await setup();
 assert.equal(session.trackAnimal('turkey',1000).result,'tracking');
 const target=session.snapshot(2000).hunting.target;
 assert.equal(session.shootAnimal(target,2000).result,'hit');
 assert.equal(session.snapshot().save.inventory.game,1);
 assert.equal(session.shootAnimal(target,2100).result,'no-round');
 assert.equal(session.snapshot().save.inventory.game,1);
 assert.equal(session.trackAnimal('unknown',2200).result,'invalid');
});

test('wildlife shares the deterministic original 3-species movement and site actions are proximity gated',async()=>{
 const {session}=await setup();
 assert.deepEqual(session.wildlife(4200,{x:0,z:49}),session.wildlife(4200,{x:0,z:49}));
 assert.equal(Object.keys(session.wildlife(4200,{x:0,z:49})).length,3);
 assert.equal(session.canUse('fish',{x:0,z:49}),false);
 assert.equal(session.canUse('fish',{x:-38,z:49}),true);
 assert.equal(session.canUse('cook',{x:0,z:-50}),true);
 assert.equal(session.canUse('hunt',{x:0,z:49}),false);
});

test('unavailable, denied or invalid browser storage never blocks Babylon gameplay',async()=>{
 const storage={getItem(){throw Error('SecurityError');},setItem(){throw Error('QuotaExceeded');}};
 const {session}=await setup(storage);
 assert.equal(session.discover('grove').result,'completed');
 assert.equal(session.snapshot().save.coins,160);
 assert.equal(session.trackAnimal('deer',1000).result,'tracking');
});

test('Babylon entrypoint and GUI mount the shared activities alongside the actual playable hero',()=>{
 const root=path.join(__dirname,'..');
 const entry=fs.readFileSync(path.join(root,'babylon-preview/main.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'babylon-preview.html'),'utf8');
 assert.match(entry,/installSharedActivities/);
 assert.match(html,/id="fishing-cast"/);
 assert.match(html,/id="fishing-reel"/);
 assert.match(html,/id="farm-plot"/);
 assert.match(html,/id="cook-recipe"/);
 assert.match(html,/id="hunting-track"/);
 assert.match(html,/id="hunting-shoot"/);
});
