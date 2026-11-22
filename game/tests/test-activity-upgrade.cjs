const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../src/core.js'),W=require('../src/open-world.js'),P=require('../src/companion.js');
test('wildlife target has bounded predictable drift without mutating a round',()=>{
 const round={baseTarget:.5,target:.5,startedAt:1000,expiresAt:14000,kind:'turkey'};
 assert.equal(W.huntTargetAt(round,1000),.5);
 const moved=W.huntTargetAt(round,2400);
 assert.ok(moved>.35&&moved<.65&&moved!==.5);
 assert.equal(round.target,.5);
 assert.ok(W.huntTargetAt({...round,baseTarget:.98},4000)<=.92);
 assert.equal(W.huntTargetAt({target:.24},3000),.24);
});
test('fishing window is more forgiving on touch but expired fish still escape',()=>{
 const save=C.freshSave('Fishing');
 assert.equal(C.fishReel(save,1000,1900,'bass').result,'caught');
 assert.equal(C.fishReel(save,1000,2101,'bass').result,'late');
});
test('expanded recipes consume only pantry ingredients and record served dish',()=>{
 const save=C.freshSave('Cook');
 assert.equal(Object.keys(C.RECIPES).length,6);
 save.inventory={fish:3,game:2,corn:6,meals:0};
 const a=C.cookRecipe(save,'riverChowder');
 assert.equal(a.result,'cooked');assert.equal(a.save.lastMeal,'riverChowder');
 assert.equal(a.save.inventory.fish,1);assert.equal(a.save.inventory.corn,5);
 const b=C.cookRecipe(a.save,'harvestSoup');
 assert.equal(b.result,'cooked');assert.equal(b.save.inventory.corn,2);
 assert.equal(C.cookRecipe(b.save,'riverChowder').result,'ingredients');
});
test('activity world contains three animal visuals, layered farmland and kitchen props',()=>{
 const source=fs.readFileSync(__dirname+'/../src/open-world.js','utf8');
 for(const feature of ['Animated turkey','Animated rabbit','Jumping fish when the bobber dips','barnRoof','silo','scarecrow','skillet','fishModel.visible'])
  assert.ok(source.includes(feature),feature);
 assert.match(source,/animalModels:3/);
 assert.match(source,/fieldPlots:9/);
});
test('game uses dynamically measured wildlife target and non-static Scout hints',()=>{
 const source=fs.readFileSync(__dirname+'/../src/game.js','utf8');
 assert.match(source,/WORLD.huntTargetAt/);
 assert.match(source,/COMPANION.hint/);
 assert.match(source,/fishRound.biteAt\+1100/);
});
