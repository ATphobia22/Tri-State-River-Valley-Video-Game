const test = require('node:test');
const assert = require('node:assert/strict');
const {buildingPlanner, foliagePlanner, channel} = require('../src/render-workers.js');
const biome = require('../src/biome-streamer.js');

test('adaptive building searches preserve ties, cutoff, cap and courthouse exclusion', () => {
  const plan = buildingPlanner([1,0,-1,0,2,0,0,10,1900,0,1901,0]);
  const q = {x:0,z:0,radius:10,cap:2,exclude:0};
  for (const strategy of ['sort','bounded']) {
    const result = plan(q);
    assert.equal(result.strategy,strategy);
    assert.deepEqual(result.near.map(p => p.i),[1]);
    assert.deepEqual([...result.visible],[1,1,1,1,1,0]);
  }
  assert.deepEqual(plan({...q,cap:0}).near,[]);
});

test('forced foliage snapshot restores the full batch even at an unchanged position', () => {
  const config = {seed:47620};
  let result;
  const jobs = channel('foliage',foliagePlanner,config,r => {result=r;},biome.biomeFactory);
  const query = {x:0,z:0,maxNewCells:100};
  jobs.submit(query);
  const trees = result.trees;
  assert.ok(trees.length);
  jobs.submit(query);
  assert.deepEqual(result.trees,[]);
  jobs.submit({...query,force:true});
  assert.deepEqual(result.trees,trees);
});

test('real regional parcel snapshot preserves feature and ring topology', async () => {
  const {projectParcels} = await import('../valley-scene/src/parcel-projection.mjs');
  const buffer = require('node:fs').readFileSync(require('node:path').join(__dirname,'../valley-scene/assets/mount_vernon_zoned.geojson'));
  const {base,polygons} = projectParcels({buffer,origin:[-88,38],scales:[100,200]});
  assert.equal(polygons.length,210);
  base.features.forEach(({geometry}, i) => {
    const source = geometry.type==='Polygon' ? [geometry.coordinates] : geometry.coordinates;
    assert.deepEqual(polygons[i],source.map(p=>p.map(r=>r.map(([x,y])=>[(x+88)*100,(38-y)*200]))));
  });
});
