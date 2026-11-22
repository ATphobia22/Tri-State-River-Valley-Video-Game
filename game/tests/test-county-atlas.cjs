const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const countyText=fs.readFileSync(__dirname+'/../data/posey-county-boundary.js','utf8');
globalThis.window=globalThis;
require('../data/posey-county-boundary.js');
const County=require('../src/county-atlas.js'),C=require('../src/core.js');
const data=globalThis.ValleyPoseyCounty;
test('official boundary is Posey County 18129, WGS84, with verified five town centers',()=>{
 assert.equal(data.fips,'18129');assert.equal(data.crs,'EPSG:4326');
 assert.equal(data.places.length,5);
 assert.ok(data.fullBoundaryVertices>=1900&&data.boundary.length>=150);
 for(const place of data.places)assert.ok(County.inside(place.lon,place.lat,data.boundary),place.name);
 assert.equal(County.inside(-85,42,data.boundary),false);
});
test('map projection maintains bounded points and town selection across aspect ratios',()=>{
 for(const [width,height] of [[380,380],[1000,480]]){
  const places=data.places.map(p=>({...p,px:County.project(p.lon,p.lat,{width,height},data).x,
   py:County.project(p.lon,p.lat,{width,height},data).y}));
  assert.ok(places.every(p=>p.px>=0&&p.px<=width&&p.py>=0&&p.py<=height));
  const nh=places.find(x=>x.id==='new-harmony');
  const pick=County.pickTown(nh.px,nh.py,{width,height},data);
  assert.equal(pick.id,'new-harmony');
 }
});
test('county region vignette locations remain within existing local terrain and clearly labeled',()=>{
 for(const p of data.places){
  const stage=County.stage(p.id);
  assert.ok(Math.abs(stage.x)<C.LIMIT&&Math.abs(stage.z)<C.LIMIT);
  assert.equal(stage.geographicAccuracy,'illustrative');
 }
});
test('region visit rewards once without modifying six existing Mount Vernon mission stamps',()=>{
 const start=C.freshSave('Family');
 const first=C.visitCountyRegion(start,'griffin');
 assert.equal(first.result,'discovered');assert.ok(first.save.countyVisited.includes('griffin'));
 const again=C.visitCountyRegion(first.save,'griffin');
 assert.equal(again.result,'revisited');assert.equal(again.save.coins,first.save.coins);
 assert.deepEqual(again.save.completed,[]);
 assert.equal(C.visitCountyRegion(first.save,'unknown').result,'invalid');
});
test('county atlas is offline and loaded before runtime with explicit visual geography caveat',()=>{
 const html=fs.readFileSync(__dirname+'/../index.html','utf8'),
 sw=fs.readFileSync(__dirname+'/../sw.js','utf8'),game=fs.readFileSync(__dirname+'/../src/game.js','utf8');
 for(const script of ['data/posey-county-boundary.js','src/county-atlas.js']){
  assert.ok(html.includes(script));assert.ok(sw.includes('./'+script));
  assert.ok(html.indexOf(script)<html.indexOf('src/game.js'));
 }
 assert.ok(html.includes('id="countyMapCanvas"'));
 assert.match(game,/CountyAtlas/);
 assert.match(html,/illustrative/);
});
