const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const modulePromise=import(pathToFileURL(path.resolve(__dirname,'../babylon-preview/geo-scene.mjs')).href);
const courthouse=[-87.8948209787,37.9318421575];
test('courthouse is local origin and WGS84 axes are metre-scale',async()=>{
 const {localMeters}=await modulePromise;
 assert.equal(Math.hypot(...localMeters(courthouse,courthouse)),0);
 const [east]=localMeters([courthouse[0]+.001,courthouse[1]],courthouse);
 const [,north]=localMeters([courthouse[0],courthouse[1]+.001],courthouse);
 assert.ok(east>87&&east<89);
 assert.ok(north< -110&&north> -112);
});
test('north-up image extent maps to correct geographic quadrants',async()=>{
 const {aerialPlane}=await modulePromise;
 const p=aerialPlane([-87.928,37.909,-87.853,37.96],courthouse);
 assert.equal(p.positions.length,12);
 assert.ok(p.positions[0]<0&&p.positions[2]<0);
 assert.ok(p.positions[3]>0&&p.positions[5]<0);
 assert.ok(p.positions[6]>0&&p.positions[8]>0);
 assert.ok(p.positions[9]<0&&p.positions[11]>0);
 assert.equal(p.elevationStatus,'UNVERIFIED_FLAT_REFERENCE_ONLY');
});
test('real road and building lines are bounded without fabricating geometry',async()=>{
 const {geographicLines}=await modulePromise;
 const collection={features:[
  {geometry:{type:'LineString',coordinates:[[...courthouse],[courthouse[0]+.0001,courthouse[1]]]}},
  {geometry:{type:'Polygon',coordinates:[[[...courthouse],[courthouse[0]+.0001,courthouse[1]],[courthouse[0],courthouse[1]+.0001],[...courthouse]]]}},
  {geometry:{type:'Polygon',coordinates:[[[...courthouse],[courthouse[0]+.0001,courthouse[1]]],[[...courthouse],[courthouse[0]+.0002,courthouse[1]]]]}},
  {geometry:{type:'LineString',coordinates:[[NaN,0],[0,0]]}}
 ]};
 const lines=geographicLines(collection,courthouse,{radiusMeters:100,maxLines:20,maxVertices:100});
 assert.equal(lines.length,2);
 assert.equal(lines[0].length,2);
 assert.equal(lines[1].length,4);
 assert.deepEqual(geographicLines(collection,courthouse,{radiusMeters:100,maxLines:1}),[lines[0]]);
});
test('invalid extents and uncontrolled geographic budgets are rejected',async()=>{
 const {aerialPlane,geographicLines}=await modulePromise;
 assert.throws(()=>aerialPlane([-87,38,-88,37],courthouse),/bounds/);
 assert.throws(()=>geographicLines({},courthouse,{maxVertices:50001}),/budget/);
});
test('Babylon stage imports recorded source image, roads and buildings; not random boxes',()=>{
 const fs=require('node:fs');
 const stage=fs.readFileSync(path.resolve(__dirname,'../babylon-preview/geo-stage.mjs'),'utf8');
 const main=fs.readFileSync(path.resolve(__dirname,'../babylon-preview/main.js'),'utf8');
 assert.match(stage,/overhead\.jpg\?url/);
 assert.match(stage,/roads\.geojson\?url/);
 assert.match(stage,/buildings\.geojson\?url/);
 assert.match(main,/mountGeographicStage/);
 assert.doesNotMatch(main,/illustrative-block-/);
});
