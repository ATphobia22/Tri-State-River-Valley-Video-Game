const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core.js');
test('legacy saves migrate without losing inventory, position or time',()=>{
 const s=C.validateSave({version:3,name:'Test',coins:42,inventory:{corn:3},position:{x:10,z:20},time:23.99,weather:'rain',season:'winter'});
 assert.equal(s.coins,42);assert.equal(s.inventory.corn,3);assert.equal(s.time,23.99);assert.equal(s.worldSimulation.version,1);assert.equal(s.worldSimulation.day,0);assert.equal(s.worldSimulation.weather,'rain');assert.equal(s.worldSimulation.season,'winter');
});
test('world clock advances deterministically across midnight and persists through gameplay rewards',()=>{
 let s=C.freshSave('Test');s.time=23.999;
 let a=C.advanceWorldClock(s.worldSimulation,s.time,1);
 assert.ok(a.time<.01);assert.equal(a.world.day,1);assert.equal(a.world.elapsedSeconds,1);
 s.time=a.time;s.worldSimulation=a.world;
 const restored=C.validateSave(JSON.parse(JSON.stringify(C.gainReward(s,10,10))));
 assert.equal(restored.worldSimulation.day,1);assert.equal(restored.worldSimulation.elapsedSeconds,1);assert.equal(restored.coins,10);
 assert.deepEqual(C.advanceWorldClock(restored.worldSimulation,restored.time,0),{world:restored.worldSimulation,time:restored.time});
});
test('environment events are versioned, bounded and idempotent',()=>{
 let world=C.freshSave('Test').worldSimulation;
 world=C.recordEnvironment(world,{weather:'rain',season:'winter',region:'mount-vernon'});
 assert.equal(world.events.length,1);assert.equal(world.events[0].seq,1);assert.equal(world.events[0].weather,'rain');
 assert.deepEqual(C.recordEnvironment(world,{weather:'rain',season:'winter',region:'mount-vernon'}),world);
 for(let i=0;i<150;i++)world=C.recordEnvironment(world,{weather:i%2?'rain':'clear',season:'winter',region:'mount-vernon'});
 assert.equal(world.events.length,128);assert.equal(world.events.at(-1).seq,151);
 const s=C.validateSave({...C.freshSave('Test'),weather:world.weather,season:world.season,worldSimulation:world});
 assert.deepEqual(s.worldSimulation,world);
});
test('invalid simulation state is repaired without trusting unbounded event input',()=>{
 const s=C.validateSave({weather:'mist',season:'autumn',worldSimulation:{version:1,day:-1,elapsedSeconds:Infinity,weather:'bad',events:[{seq:1,weather:'bad'}]}});
 assert.equal(s.worldSimulation.day,0);assert.equal(s.worldSimulation.elapsedSeconds,0);assert.equal(s.worldSimulation.weather,'mist');assert.deepEqual(s.worldSimulation.events,[]);
});

test('wildlife activity is reproducible after restoring the simulation clock',()=>{
 const skills=require('../src/gameplay-skills.js');
 let s=C.freshSave('Wildlife');
 let advanced=C.advanceWorldClock(s.worldSimulation,s.time,123);
 s.time=advanced.time;s.worldSimulation=advanced.world;
 const player={x:-1000,z:-1000},site={x:0,z:0};
 const before=skills.sampleWildlife(s.worldSimulation.elapsedSeconds*1000,player,site);
 const restored=C.validateSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(skills.sampleWildlife(restored.worldSimulation.elapsedSeconds*1000,player,site),before);
 const after=C.advanceWorldClock(restored.worldSimulation,restored.time,1);
 assert.notDeepEqual(skills.sampleWildlife(after.world.elapsedSeconds*1000,player,site),before);
 const source=require('node:fs').readFileSync(__dirname+'/../src/game.js','utf8');
 assert.ok(source.includes('worldGame.update({stamp:save.worldSimulation.elapsedSeconds*1000'));
});
