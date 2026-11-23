const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/landmark-access.js');
const anchor={gamePosition:{x:15.7383,z:503.0174},dimensionsMeters:{width:21.7019,depth:31.5843},rotationRadians:.3025179};
test('fresh family game does not put the hero inside the courthouse',()=>{
 const point=A.safeCourthouseApproach(anchor);
 assert.ok(A.insideCourthouse({x:15.7383,z:503.0174},anchor));
 assert.equal(A.insideCourthouse(point,anchor),false);
 assert.ok(Math.hypot(point.x-anchor.gamePosition.x,point.z-anchor.gamePosition.z)<65);
});
test('old saved positions inside the new courthouse are moved outside, other saves unchanged',()=>{
 const old={x:16,z:504},unchanged={x:105,z:650};
 const p=A.safeResume(old,anchor);
 assert.equal(A.insideCourthouse(p,anchor),false);
 assert.deepEqual(A.safeResume(unchanged,anchor),unchanged);
 assert.deepEqual(A.safeResume(old,null),old);
});
test('rotated 2020 footprint and malicious dimensions do not cause invalid movement',()=>{
 assert.equal(A.insideCourthouse({x:14,z:505},anchor),true);
 assert.equal(A.insideCourthouse({x:-35,z:503},anchor),false);
 const wrong={...anchor,dimensionsMeters:{width:-1000000,depth:1}};
 assert.deepEqual(A.safeResume({x:16,z:504},wrong),{x:16,z:504});
});
