const {test}=require('node:test'),assert=require('node:assert/strict');
const Collision=require('../src/world-collision.js'),Sound=require('../src/soundscape.js'),Probe=require('../src/frame-probe.js');
test('collision world rejects entry, permits leaving inside old saves and slides along a wall',()=>{
 const world=Collision.create([{x:20,z:0,dx:10,dz:24,h:12}],{radius:2});
 const hit=world.move({x:0,z:0},{x:35,z:0});
 assert.equal(hit.blocked,true);assert.ok(hit.x<15);
 const slide=world.move({x:0,z:-15},{x:30,z:-2});
 assert.ok(slide.blocked);assert.ok(slide.z< -11,'does not enter a wall while moving diagonally');
 const escape=world.move({x:20,z:0},{x:0,z:0});
 assert.ok(escape.x<20,'legacy save inside mesh can escape');
 assert.equal(world.snapshot().obstacles,1);
});
test('terrain step and grade cap prevent abrupt ascents, downhill passes',()=>{
 const world=Collision.create([], {stepHeight:2.8,maxSlope:.95});
 const ground=(x,z)=>x>2?20:0;
 const blocked=world.move({x:0,z:0},{x:6,z:0},{groundAt:ground});
 assert.ok(blocked.x<=2.8);
 const descent=world.move({x:6,z:0},{x:0,z:0},{groundAt:ground});
 assert.ok(descent.x<6);
 const leap=world.move({x:0,z:0},{x:6,z:0},{groundAt:ground,airborne:true});
 assert.ok(leap.x>5);
});
test('invalid geometry is ignored, invalid motion throws',()=>{
 const world=Collision.create([{x:NaN,z:0,dx:4,dz:4,h:5}]);
 assert.equal(world.snapshot().obstacles,0);
 assert.throws(()=>world.move({x:0,z:0},{x:Infinity,z:0}));
});
test('soundscape biome and material cues are deterministic and don't require audio hardware',()=>{
 assert.equal(Sound.biomeAt(0,1400),'shore');
 assert.equal(Sound.biomeAt(1200,-800),'woods');
 assert.equal(Sound.biomeAt(-1400,-800),'farm');
 assert.equal(Sound.biomeAt(0,0,{weather:'rain'}),'rain');
 const audio=Sound.create({AudioContextClass:null});
 assert.equal(audio.snapshot().steps,0);audio.setMuted(true);
 assert.equal(audio.footstep({x:0,z:1400,stamp:1000}).biome,'shore');
 assert.equal(audio.footstep({x:0,z:1400,stamp:1100}),null);
 assert.ok(Sound.footstepRecipe('farm').noise>.7);
});
test('frame probe computes p95, p99, FPS and cap without inventing GPU data',()=>{
 const p=Probe.create({capacity:30});
 for(let i=0;i<50;i++)p.observe(10+i/5,{stamp:1000+i*17,drawCalls:i,triangles:100*i});
 const s=p.summary();assert.equal(s.samples,30);
 assert.ok(s.p95FrameMs>=s.p99FrameMs-2);assert.ok(s.meanFPS>0);
 assert.equal(s.drawCallsMax,49);
 const report=p.report({renderer:'WebGL',viewport:{width:390,height:844,dpr:3},userAgent:'iPhone Safari test'});
 assert.equal(report.schema,'river-valley-device-benchmark/v1');
 assert.equal(report.viewport.dpr,3);assert.ok(report.caveat.includes('No inferred GPU memory'));
 p.reset();assert.equal(p.summary().samples,0);
});
test('boot, pre-cache and UI include gameplay improvements before entry script',()=>{
 const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const game=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
 for(const name of ['world-collision','soundscape','frame-probe','world-paint']){
  assert.ok(sw.includes('src/'+name+'.js'),name);
  assert.ok(html.indexOf('src/'+name+'.js')<html.indexOf('src/game.js'),name);
 }
 assert.match(html,/id="exportPerf"/);
 assert.match(game,/collisionWorld\.move/);assert.match(game,/frameProbe\.report/);
 assert.match(game,/soundscape\.footstep/);assert.match(game,/PAINT\.scatter/);
});