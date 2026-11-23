import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHeightAt} from '../src/world/terrain.mjs';
import {resolveCircleBoxes} from '../src/world/collisions.mjs';
import {containsLonLat,createZoningSimulator} from '../src/world/zoning.mjs';
test('terrain height interpolation and edge clamping',()=>{
  const h=createHeightAt(Int16Array.from([0,100,200,300]),{size:2,min:0,step:10});
  assert.equal(h(0,0),0);assert.equal(h(10,10),3);assert.equal(h(5,5),1.5);assert.equal(h(-99,99),2);
});
test('player circle resolves rotated and straight building corners',()=>{
  for(const yaw of [0,Math.PI/4,Math.PI/2]){
    const b={x:0,z:0,halfX:3,halfZ:2,yaw};
    const p=resolveCircleBoxes(0,0,.4,[b]),c=Math.cos(yaw),s=Math.sin(yaw);
    const x=c*p.x-s*p.z,z=s*p.x+c*p.z;
    assert.ok(Math.hypot(Math.max(Math.abs(x)-3,0),Math.max(Math.abs(z)-2,0))>=.399999);
  }
});
test('multipolygon picking excludes interior holes',()=>{
  const outer=[[0,0],[4,0],[4,4],[0,4],[0,0]],hole=[[1,1],[3,1],[3,3],[1,3],[1,1]];
  assert.equal(containsLonLat({type:'Polygon',coordinates:[outer]},2,2),true);
  assert.equal(containsLonLat({type:'Polygon',coordinates:[outer,hole]},2,2),false);
  assert.equal(containsLonLat({type:'MultiPolygon',coordinates:[[outer],[[[9,9],[10,9],[10,10],[9,10],[9,9]]]]},9.5,9.5),true);
});
test('2025 GIO snapshot has 210 unique parcels without invented legal zoning',()=>{
  const fc=JSON.parse(readFileSync(new URL('../assets/mount_vernon_zoned.geojson',import.meta.url)));
  assert.equal(fc.features.length,210);assert.equal(new Set(fc.features.map(f=>f.id)).size,210);
  assert.ok(fc.features.every(f=>f.properties.legal_zoning_verified===false));
  assert.ok(fc.features.every(f=>f.properties.flood_status==='UNKNOWN'));
});
test('monthly simulation obeys road and flood constraints and saves diff, never source',()=>{
  const rect=x=>[[[x,0],[x+1,0],[x+1,1],[x,1],[x,0]]];
  const fc={type:'FeatureCollection',properties:{snapshot_id:'test'},features:['a','b','c'].map((id,i)=>({
    type:'Feature',id,geometry:{type:'Polygon',coordinates:rect(i*2)},
    properties:{road_access:i!==1,floodplain:i===2,sim_center:[i*80,0]}}))};
  let saved='';const storage={getItem:()=>saved,setItem:(_,v)=>saved=v};
  const sim=createZoningSimulator(fc,{storage});
  for(const id of ['a','b','c'])sim.paint(id,'R1');
  assert.deepEqual(sim.advanceMonth({residential:3}),['a']);
  assert.equal(createZoningSimulator(fc,{storage}).state.get('a').built,true);
  sim.bulldoze('a');assert.equal(sim.state.get('a').zone,'R1');
  assert.equal(fc.features[0].properties.zone,undefined);
});
