'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Probe=require('../src/frame-probe.js'),Model=require('../src/model-loader.js');
const root=path.resolve(__dirname,'..'),get=p=>fs.readFileSync(path.join(root,p),'utf8');
test('the shipped GLB generator removes zero-area triangles, preserving skin and animation',()=>{
 const raw=fs.readFileSync(path.join(root,'assets/models/river_explorer_rigged.glb'));
 const manifest=JSON.parse(get('assets/models/river_explorer_manifest.json'));
 const parsed=Model.parseGLB(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 assert.equal(manifest.boneCount,27);
 assert.equal(parsed.json.skins[0].joints.length,27);
 assert.equal(parsed.json.animations.length,13);
 assert.ok(manifest.degenerateTrianglesRemoved>0,'generator must prune collapsed sphere poles');
 let triangles=0;
 for(const prim of parsed.json.meshes[0].primitives){
  const p=Model.dataAccessor(parsed,prim.attributes.POSITION),ix=Model.dataAccessor(parsed,prim.indices);
  const f=p.values,ids=ix.values;
  for(let i=0;i<ids.length;i+=3){
   const a=ids[i]*3,b=ids[i+1]*3,c=ids[i+2]*3;
   const ux=f[b]-f[a],uy=f[b+1]-f[a+1],uz=f[b+2]-f[a+2];
   const vx=f[c]-f[a],vy=f[c+1]-f[a+1],vz=f[c+2]-f[a+2];
   const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
   assert.ok(cx*cx+cy*cy+cz*cz>1e-20,'degenerate triangle in GLB primitive');
   triangles++;
  }
 }
 assert.equal(triangles,manifest.triangleCount);
});
test('mobile frame diagnostics preserve v1 schema and capture bounded scene cohorts',()=>{
 const p=Probe.create({capacity:30,eventCapacity:8});
 for(let i=0;i<45;i++)p.observe(i%9===0?42:16,{stamp:1000+i*17,x:-1200+i,z:460,
   scene:i%2?'farmland':'downtown',mode:i<20?'walk':'drive',quality:'full',
   terrainTiles:123,terrainQueued:5,drawCalls:400+i,triangles:180000});
 p.mark('terrain-lod-commit',{stamp:1760,x:10,z:20,ms:14,tiles:120});
 const r=p.report({renderer:'WebGL'});
 assert.equal(r.schema,'river-valley-device-benchmark/v1');
 assert.equal(r.summary.samples,30);
 assert.ok(r.diagnostics.scenes.some(s=>s.scene==='farmland'&&s.mode==='drive'));
 assert.ok(r.diagnostics.slowFrameCount>0);
 assert.ok(r.diagnostics.slowFrames.every(x=>Number.isFinite(x.x)&&x.terrainTiles===123));
 assert.equal(r.diagnostics.events[0].event,'terrain-lod-commit');
 assert.equal(r.diagnostics.events[0].durationMs,14);
 assert.ok(r.diagnostics.scenes.reduce((n,s)=>n+s.samples,0)===30);
 p.reset();assert.equal(p.report().diagnostics.events.length,0);
});
test('render optimization batches all near windows and all quadtree skirts',()=>{
 const game=get('src/game.js'),source=get('tools/build_rigged_hero.py');
 assert.match(game,/const winPositions=\[\],winIndices=\[\]/);
 assert.match(game,/winGeo\.setIndex\(winIndices\)/);
 assert.doesNotMatch(game,/new G\.PlaneGeometry\(Math\.min\(5,len/);
 assert.match(game,/River\/batched-terrain-seam-skirts/);
 assert.match(game,/tile\.samples=QT\.tileSamples\(sourceHeight,tile,index\)/);
 assert.doesNotMatch(game,/for\(const leaf of leaves\)leaf\.samples=/);
 assert.match(game,/preserveDrawingBuffer:false/);
 assert.match(source,/skipped_degenerate_triangles/);
});
