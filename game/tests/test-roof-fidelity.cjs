const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/roof-fidelity.js');
test('angled cadastral footprints produce roof vertices in the actual footprint frame',()=>{
 const points=[[0,0],[18,6],[13,21],[-5,15]];
 const y=12, roof=R.planRoof(points,y,{form:'gable',rise:3});
 assert.equal(roof.kind,'ILLUSTRATIVE_GABLE');
 assert.ok(roof.positions.length>=36);
 assert.equal(roof.ridgeY,15);
 const flat=new Set(roof.positions.filter((n,i)=>i%3===1));
 assert.ok(flat.has(y)&&flat.has(15));
 for(let i=0;i<roof.positions.length;i+=3)assert.ok(Number.isFinite(roof.positions[i]));
 // Ridge location must be inside the footprint bounds, no world-axis aligned AABB roof trick.
 const coords=roof.positions.filter((n,i)=>i%3!==1);assert.ok(coords.length>0);
 assert.ok(roof.ridgeStart.every(Number.isFinite)&&roof.ridgeEnd.every(Number.isFinite));
 assert.ok(Math.abs(roof.ridgeEnd[0]-roof.ridgeStart[0])>5);
 assert.ok(Math.abs(roof.ridgeEnd[1]-roof.ridgeStart[1])>1);
});
test('historic storefronts default to no invented ridge and yield watertight parapet bands',()=>{
 const p=[[0,0],[21,0],[21,31],[0,31]];
 const out=R.planRoof(p,16,{form:'parapet'});
 assert.equal(out.kind,'ILLUSTRATIVE_PARAPET');
 assert.equal(out.ridgeY,null);
 assert.equal(out.positions.length,4*6*3);
 for(let i=1;i<out.positions.length;i+=3)assert.ok(out.positions[i]>=16&&out.positions[i]<=17.25);
});
test('reject missing, self-crossing or nonfinite roof footprints',()=>{
 for(const bad of [[],[[0,0],[1,1],[2,2]],[[0,0],[1,1],[0,1],[1,0]],[[0,0],[Infinity,1],[1,1]]]){
  assert.throws(()=>R.planRoof(bad,10,{form:'gable'}),/footprint|area|intersection/i);
 }
 assert.throws(()=>R.planRoof([[0,0],[10,0],[10,10],[0,10]],Infinity),/height/i);
});
