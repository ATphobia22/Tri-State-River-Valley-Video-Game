const {test}=require('node:test');const assert=require('node:assert/strict');
const Foot=require('../src/foot-plant.js');
test('stance anchors preserve world coordinates through ordinary avatar movement',()=>{
 const p=Foot.create(),root={x:0,y:0,z:0};
 let a=p.step({side:'left',root,heading:0,localX:-1.35,localZ:.45,phase:Math.PI,moving:true,groundAt:(x,z)=>z*.1});
 assert.equal(a.planted,true);root.z+=.8;
 let b=p.step({side:'left',root,heading:0,localX:-1.35,localZ:.45,phase:Math.PI*1.3,moving:true,groundAt:(x,z)=>z*.1});
 assert.deepEqual(b.anchor,a.anchor);assert.ok(b.localZ<a.localZ);assert.ok(Number.isFinite(b.pitch));
 assert.ok(Math.abs(b.groundOffset-(a.anchor.z*.1-root.y))<1e-8);
});
test('swing clears ground and releases world anchor',()=>{
 const p=Foot.create(),root={x:0,y:0,z:0};
 p.step({side:'right',root,phase:Math.PI,moving:true});
 assert.ok(p.snapshot().right.planted);
 const swing=p.step({side:'right',root,phase:0,moving:true});
 assert.ok(swing.lift>.5);assert.equal(swing.anchor,null);
 assert.equal(p.snapshot().right.releases,1);
 const idle=p.step({side:'right',root,moving:false});assert.equal(idle.lift,0);
});
test('terrain pitch is bounded, invalid heights are finite and reset clears contact',()=>{
 const p=Foot.create();const root={x:0,y:1,z:0};
 let r=p.step({side:'left',root,phase:Math.PI,moving:true,groundAt:(x,z)=>z*10});
 assert.ok(r.pitch>=-.28&&r.pitch<=.28);assert.ok(Number.isFinite(r.groundOffset));
 root.x=500;r=p.step({side:'left',root,phase:Math.PI,moving:true,groundAt:()=>NaN});
 assert.equal(r.groundOffset,0);assert.ok(r.planted);
 p.reset();assert.equal(p.snapshot().left.planted,false);
});
test('input guards reject unknown foot and invalid root',()=>{
 const p=Foot.create();assert.throws(()=>p.step({side:'unknown',root:{x:0,y:0,z:0}}),TypeError);
 assert.throws(()=>p.step({side:'left',root:{x:0,y:NaN,z:0}}),TypeError);
 assert.throws(()=>Foot.create({reach:0}),RangeError);
});