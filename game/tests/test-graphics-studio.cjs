const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const B=require('../src/biome-streamer.js'),M=require('../src/visual-polish.js'),L=require('../src/lod-transition.js');
const root=path.resolve(__dirname,'..'),get=p=>fs.readFileSync(path.join(root,p),'utf8');

test('masonry styles follow fictional downtown, with predictable palette selection',()=>{
 assert.equal(M.facadeFamily(92,465,1),'brick');
 assert.equal(M.facadeFamily(92,465,7),'limestone');
 assert.equal(M.facadeFamily(1800,-850,1),'clapboard');
 assert.equal(M.facadeFamily(1800,-850,6),'brick');
 assert.equal(M.facadeFamily(NaN,120,1),'clapboard');
 assert.equal(M.hueVariation(4,7,10),M.hueVariation(4,7,10));
});

test('building materials are local and shared, with normal-compatible UVs',()=>{
 const source=get('src/visual-polish.js'),game=get('src/game.js');
 assert.match(source,/CanvasTexture/);
 assert.match(source,/MeshStandardMaterial/);
 assert.match(source,/LinearMipmapLinearFilter/);
 assert.doesNotMatch(source,/fetch\(|https?:\/\//);
 assert.match(game,/new G.Float32BufferAttribute\(wallUV,2\)/);
 assert.match(game,/facadePalette\.pick\(rec\)/);
 assert.match(game,/obj\.geometry\.dispose\(\);\}\);detailBuildings\.delete/);
});

test('foliage descriptors reproduce identically from seed and cell indices',()=>{
 const opts={cellSize:240,limit:2100,stops:[],seed:47620};
 assert.deepEqual(B.makeCell(-4,-1,opts),B.makeCell(-4,-1,opts));
 assert.notDeepEqual(B.makeCell(-4,-1,opts),B.makeCell(-3,-1,opts));
 const ids=B.makeCell(-4,-1,opts).map(t=>t.id);
 assert.equal(ids.length,new Set(ids).size);
});

test('river water and landmark exclusion apply to the complete generated tree set',()=>{
 const stops=[{x:-740,z:-210}];
 const opts={cellSize:240,limit:2100,stops};
 for(let ix=-9;ix<=9;ix++)for(let iz=-9;iz<=9;iz++)for(const t of B.makeCell(ix,iz,opts)){
  assert.ok(!B.inRiver(t.x,t.z));
  assert.ok(Math.hypot(t.x+740,t.z+210)>=105);
  assert.ok(Math.abs(t.x)<=2100&&Math.abs(t.z)<=2100);
 }
});

test('foliage streamer creates at most two cells each tick and stays within tree capacity',()=>{
 const s=B.create({maxTrees:130,limit:2100,loadRadius:720,unloadRadius:960});
 let prev=0;
 for(let i=0;i<45;i++){
  const r=s.update(i*18,250,{maxNewCells:2,speed:230,heading:.3});
  assert.ok(r.stats.generatedCells-prev<=2);
  assert.ok(r.trees.length<=130);
  prev=r.stats.generatedCells;
 }
 assert.ok(s.snapshot().evictedCells>0);
 assert.ok(s.snapshot().loadedCells>0);
});

test('crossfade terrain planner never shows a partial surface',()=>{
 const stages=[],commits=[],disposals=[];
 const p=L.create({batchSize:2,makeMesh:leaf=>({leaf}),commit:job=>commits.push(job),
  dispose:meshes=>disposals.push(meshes.length)});
 assert.equal(p.schedule({signature:'first',leaves:[1,2,3,4,5],index:{}}),true);
 assert.equal(p.pump().complete,false);assert.equal(p.status().built,2);
 assert.equal(commits.length,0);
 assert.equal(p.pump().complete,false);
 assert.equal(p.pump().complete,true);
 assert.equal(commits.length,1);assert.equal(commits[0].meshes.length,5);
 assert.equal(p.status().queued,0);
});

test('staged LOD work can be superseded without publishing stale terrain',()=>{
 const commits=[],disposed=[];
 const p=L.create({batchSize:1,makeMesh:leaf=>({leaf}),commit:job=>commits.push(job.signature),
  dispose:ms=>disposed.push(ms.length)});
 p.schedule({signature:'old',leaves:[1,2,3],index:{}});
 p.pump();
 p.schedule({signature:'new',leaves:[4,5],index:{}});
 assert.deepEqual(disposed,[1]);
 p.pump();p.pump();
 assert.deepEqual(commits,['new']);
 // Returning to already committed LOD must cancel an abandoned pending job.
 p.schedule({signature:'other',leaves:[8,9],index:{}});
 p.pump();
 assert.equal(p.schedule({signature:'new',leaves:[10],index:{}}),false);
 assert.equal(p.status().pending,false);
});

test('LOD planner can build all initial ground before gameplay sources register',()=>{
 let committed=0;
 const p=L.create({makeMesh:i=>i*3,commit:job=>{committed=job.meshes.length},dispose:()=>{}});
 p.schedule({signature:'boot',leaves:Array.from({length:200},(_,i)=>i),index:{}},true);
 assert.equal(committed,200);assert.equal(p.status().pending,false);
});

test('the intro visibly carries the shipped graphics version',()=>{
 assert.match(get('index.html'),/V1\.13\.0 · Free-camera/);
});

test('user quality modes and offline caches preserve full standalone delivery',()=>{
 const html=get('index.html'),cache=get('sw.js'),game=get('src/game.js');
 const scripts=['src/visual-polish.js','src/render-workers.js','src/biome-streamer.js','src/lod-transition.js','src/streaming-policy.js'];
 scripts.forEach(s=>{
  assert.ok(html.includes('src="'+s+'"'),s);
  assert.ok(cache.includes('"./'+s+'"'),s);
  assert.ok(html.indexOf(s)<html.indexOf('src/game.js'),s);
 });
 assert.match(game,/terrainTransition\.pump\(/);
 assert.match(game,/fadeRetiringTerrain\(stamp\)/);
 assert.match(game,/refreshVegetation\(true\)/);
 assert.match(game,/renderWorkers\.foliagePlanner,config,applyVegetation,BIOME\.biomeFactory/);
 assert.match(game,/applyTerrainLOD\(true,true\)/);
});


test('public game launcher footer identifies the current release',()=>{
 assert.match(get('index.html'),/V1\.13\.0 ·/);
 assert.doesNotMatch(get('index.html'),/V1\.7 ·/);
});
