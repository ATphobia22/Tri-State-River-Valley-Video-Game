const test=require('node:test');
const assert=require('node:assert/strict');
test('closed convex footprint becomes bounded artistic mesh',async()=>{
 const {buildingMasses}=await import('../babylon-preview/building-masses.mjs');
 const ring=[[0,0],[.0001,0],[.0001,.0001],[0,.0001],[0,0]];
 const feature={geometry:{type:'Polygon',coordinates:[ring]}};
 const collection={features:[feature,feature]};
 const [mass]=buildingMasses(collection,[0,0],{limit:1});
 assert.equal(buildingMasses(collection,[0,0],{limit:1}).length,1);
 assert.equal(mass.positions.length,60);
 assert.equal(mass.indices.length,30);
 assert.ok(mass.indices.every(i=>i>=0&&i<mass.positions.length/3));
 assert.equal(mass.provenance,'artistic-estimated-height');
 assert.equal(buildingMasses(collection,[1,1]).length,0);
 assert.equal(buildingMasses({features:[{geometry:{type:'Polygon',coordinates:[ring,ring]}}]},[0,0]).length,0);
});
