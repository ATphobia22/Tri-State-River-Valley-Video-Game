'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Z=require('../valley-scene/src/zoning-sim.cjs');
const pathTo=path.resolve(__dirname,'../valley-scene/assets/mount_vernon_zoned.geojson');
const source=JSON.parse(fs.readFileSync(pathTo,'utf8'));
function parcel(id,{zone='R1',built=false,road=true,flood='CLEAR_VERIFIED',service=true,center=[0,0],area=1000}={}){
 return {type:'Feature',id,geometry:{type:'Polygon',coordinates:[[[0,0],[0,.001],[.001,.001],[.001,0],[0,0]]]},
 properties:{parcel_id:id,zone,zone_source:'GAME_ONLY',zone_age:0,built,building_level:built?1:0,
 households:0,desirability:50,abandoned:false,road_access_estimate:road,area_m2:area,
 center_local_m:center,flood_status:flood,levee_protection:'NOT_VERIFIED',
 utilities:{water:service?'CONNECTED':'UNKNOWN',power:service?'CONNECTED':'UNKNOWN',sewer:service?'CONNECTED':'UNKNOWN'}}};
}
test('downtown base has exactly 210 unique official-source polygons and no asserted legal zoning',()=>{
 assert.equal(source.features.length,210);
 assert.equal(new Set(source.features.map(f=>f.id)).size,210);
 assert.equal(source.properties.parcelCount,210);
 for(const f of source.features){
  assert.match(f.id,/^\d+$/);
  assert.ok(['R1','R2','R3','C','I','AG','NONE'].includes(f.properties.zone));
  assert.equal(f.properties.zone_source,'INFERRED_GAME_ONLY');
  assert.equal(f.properties.flood_status,'UNKNOWN');
  assert.equal(f.properties.levee_protection,'NOT_VERIFIED');
  assert.ok(f.geometry.coordinates[0].length>=4);
 }
});
test('player paint and bulldozing respect parcel identity, zone age and local diff-only save',()=>{
 const sim=Z.create({features:[parcel('11',{built:true}),parcel('12')]});
 sim.tick({week:1,demand:{residential:0}});
 sim.paint('11','AG');
 assert.equal(sim.get('11').zone,'AG');
 assert.equal(sim.get('11').zone_age,0);
 sim.bulldoze('11');
 assert.equal(sim.get('11').built,false);
 assert.equal(sim.get('11').building_level,0);
 assert.equal(sim.get('11').zone,'AG');
 assert.throws(()=>sim.paint('11','Q99'),/zone/);
 assert.throws(()=>sim.paint('__proto__','R1'),/parcel/);
 const diffs=sim.exportDiffs();
 assert.deepEqual(Object.keys(diffs.parcels['11']).sort(),['abandoned','building_level','built','zone']);
 assert.equal(Object.keys(diffs.parcels).length,1);
 const restored=Z.create({features:[parcel('11',{built:true}),parcel('12')]});
 restored.importDiffs(diffs);
 assert.equal(restored.get('11').zone,'AG');
 assert.equal(restored.get('11').built,false);
});
test('growth needs a road, utility services, safe flood status and positive demand',()=>{
 const cases=[
  parcel('road',{road:false}),parcel('flood',{flood:'SFHA'}),
  parcel('power',{service:false}),parcel('clear',{center:[400,400]})];
 const sim=Z.create({features:cases});
 for(let week=1;week<=4;week++)sim.tick({week,demand:{residential:100}});
 assert.equal(sim.get('road').built,false);
 assert.equal(sim.get('flood').built,false);
 assert.equal(sim.get('power').built,false);
 assert.equal(sim.get('clear').built,true);
 assert.ok(sim.get('clear').households>=1);
});
test('an UNKNOWN flood or utility state never authorizes growth except in explicit fictional scenario',()=>{
 const f=parcel('a',{flood:'UNKNOWN',service:false});
 const real=Z.create({features:[f]});
 for(let week=1;week<=4;week++)real.tick({week,demand:{residential:100}});
 assert.equal(real.get('a').built,false);
 const mock=Z.create({features:[f],scenarioMode:true});
 for(let week=1;week<=4;week++)mock.tick({week,demand:{residential:100}});
 assert.equal(mock.get('a').built,true);
 assert.equal(mock.snapshot().scenarioMode,true);
});
test('low desirability causes deterministic abandonment; high sustained scores level up',()=>{
 const a=Z.create({features:[parcel('a',{built:true})]});
 for(let week=1;week<=5;week++)a.tick({week,demand:{residential:-100},scoreOverride:()=>10});
 assert.equal(a.get('a').abandoned,true);
 assert.equal(a.get('a').households,0);
 const b=Z.create({features:[parcel('b',{built:true})]});
 for(let week=1;week<=10;week++)b.tick({week,demand:{residential:50},scoreOverride:()=>92});
 assert.equal(b.get('b').building_level,2);
});
test('50m field-cell scores are cached and demand cannot create more than 3 households a game month',()=>{
 const f=[...Array(12)].map((_,i)=>parcel(String(i+1),{center:[i*55,0]}));
 const sim=Z.create({features:f});
 const events=[];
 for(let week=1;week<=8;week++)events.push(...sim.tick({week,demand:{residential:100}}));
 assert.ok(events.filter(e=>e.type==='growth').length<=2);
 assert.ok(sim.snapshot().households<=6);
 const sampler=Z.makeFieldSampler({industry:[{x:0,z:0,strength:1}],schools:[{x:200,z:0,strength:1}]});
 const sample1=sampler(10,10),sample2=sampler(10,10);
 assert.equal(sample1,sample2);
 assert.ok(sampler.stats().cells<=1);
 assert.ok(sample1.pollution>0);
});
