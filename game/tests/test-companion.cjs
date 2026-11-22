const {test}=require('node:test'),assert=require('node:assert/strict');
const Core=require('../src/core.js'),Pal=require('../src/companion.js');
test('Scout follows with bounded gait, stays near and adjusts to ground',()=>{
 const p=Pal.create(),player={x:100,z:20};
 let state;
 for(let i=0;i<300;i++)state=p.update({dt:1/60,player,heading:.2,groundAt:(x,z)=>x*.02,stamp:i*17,enabled:true});
 assert.ok(Math.hypot(state.x-player.x,state.z-player.z)<20,'Scout stays near owner');
 assert.ok(Number.isFinite(state.y)&&Number.isFinite(state.heading));
 assert.ok(state.tailWag>=-.8&&state.tailWag<=.8);
});
test('Scout obeys sit, come, and fetch, and stops fetching when disabled',()=>{
 const pal=Pal.create();const player={x:0,z:0};
 pal.command('sit',{player,heading:0});
 let s=pal.update({dt:.016,player,stamp:100,enabled:true});
 assert.equal(s.action,'sit');
 pal.command('fetch',{player,heading:0});
 for(let i=0;i<650;i++)s=pal.update({dt:1/60,player,stamp:200+i*16,enabled:true});
 assert.ok(['follow','return','fetch'].includes(s.action));
 pal.command('come',{player,heading:0});
 assert.equal(pal.snapshot().action,'follow');
 s=pal.update({dt:.016,player,enabled:false});
 assert.equal(s.action,'hidden');
});
test('Scout bonds are capped, cooldowns cannot be bypassed through replay saves',()=>{
 let s=Core.freshSave('Scout Friend');
 let first=Pal.rewardBond(s,'pet',10000);
 assert.equal(first.result,'bonded');assert.equal(first.save.scoutBond,1);
 let again=Pal.rewardBond(first.save,'pet',10001);
 assert.equal(again.result,'cooldown');assert.equal(again.save.scoutBond,1);
 let fetched=Pal.rewardBond(first.save,'fetch',50000);
 assert.equal(fetched.result,'bonded');assert.equal(fetched.save.scoutBond,3);
 let old=Core.validateSave({...fetched.save,scoutBond:9999,scoutLastRewardAt:-5});
 assert.equal(old.scoutBond,100);assert.equal(old.scoutLastRewardAt,0);
});
test('Scout provides directional animal tracking hints with no instant success',()=>{
 assert.equal(Pal.hint(.20,.48),'right');
 assert.equal(Pal.hint(.72,.48),'left');
 assert.equal(Pal.hint(.50,.48),'close');
});
