const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core.js');
const H=require('../vendor/h3-js.umd.js');
const a=H.latLngToCell(37.9325,-87.895,9),b=H.latLngToCell(37.94,-87.89,9);
function enter(w,cell,weather='clear'){return C.recordEnvironment(w,{weather,season:'summer',region:'mount-vernon',cell});}
test('cell state survives journal compaction, leaving and revisiting',()=>{
 let w=C.freshSave('Cells').worldSimulation;
 w=enter(w,a,'rain');w=C.advanceWorldClock(w,12,4).world;
 w=enter(w,b);for(let i=0;i<140;i++)w=enter(w,b,i%2?'rain':'mist');
 assert.equal(w.events.length,128);assert.equal(C.worldCell(w,a).weather,'rain');assert.equal(C.worldCell(w,a).visits,1);
 w=C.advanceWorldClock(w,12,8).world;w=enter(w,a,'mist');
 const v=C.worldCell(w,a);assert.equal(v.visits,2);assert.equal(v.firstAt,0);assert.equal(v.lastAt,12);
 assert.equal(v.weather,'mist');assert.equal(v.changes,2);
 const restored=C.validateSave({...C.freshSave('Cells'),worldSimulation:w}).worldSimulation;
 assert.deepEqual(restored,w);v.weather='clear';assert.equal(C.worldCell(restored,a).weather,'mist');
});
test('legacy journal reconstructs cell summaries without double counting on reload',()=>{
 let w=C.freshSave('Cells').worldSimulation;w=enter(w,a);w=enter(w,b);w=enter(w,a,'rain');
 const legacy={...w};delete legacy.cells;
 const first=C.validateSave({...C.freshSave('Cells'),worldSimulation:legacy}).worldSimulation;
 assert.equal(C.worldCell(first,a).visits,2);assert.equal(C.worldCell(first,b).visits,1);
 assert.deepEqual(C.validateSave({...C.freshSave('Cells'),worldSimulation:first}).worldSimulation,first);
});
test('non-georeferenced regions do not create fictitious cells',()=>{
 let w=C.freshSave('Cells').worldSimulation;w=enter(w,a);
 w=C.recordEnvironment(w,{weather:'rain',season:'summer',region:'new-harmony',cell:null});
 assert.equal(w.cells.length,1);assert.equal(C.worldCell(w,a).weather,'clear');assert.equal(C.worldCell(w,null),null);
});
