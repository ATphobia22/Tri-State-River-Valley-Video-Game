const {test}=require('node:test'),assert=require('node:assert/strict');
const Collision=require('../src/world-collision.js');
const Vehicle=require('../src/vehicle-suspension.js');
test('rotated triangular footprint uses polygon capsule, not its broad bounding rectangle',()=>{
 const obstacle={x:0,z:0,dx:20,dz:20,h:12,points:[[0,0],[20,0],[0,20]]};
 const world=Collision.create([obstacle],{radius:1,cell:32});
 const emptyCorner=world.move({x:17,z:17},{x:15,z:15});
 assert.ok(emptyCorner.x<16&&emptyCorner.z<16,'triangle AABB empty corner must remain passable');
 const solid=world.move({x:-4,z:4},{x:7,z:4});
 assert.equal(solid.blocked,true);
 assert.ok(solid.x< -0.5,'outside-to-inside edge crossing must be blocked');
});
test('nonconvex building winding invariant, narrow wall collision and legacy inside escape',()=>{
 const poly=[[0,0],[16,0],[16,5],[5,5],[5,16],[0,16]];
 const a=Collision.create([{x:0,z:0,dx:16,dz:16,h:8,points:poly}],{radius:1});
 const b=Collision.create([{x:0,z:0,dx:16,dz:16,h:8,points:[...poly].reverse()}],{radius:1});
 const start={x:14,z:13},end={x:13,z:12};
 assert.equal(a.move(start,end).blocked,false);
 assert.equal(b.move(start,end).blocked,false);
 assert.equal(a.move({x:-4,z:3},{x:12,z:3}).blocked,true);
 const escape=a.move({x:3,z:3},{x:-7,z:3});
 assert.ok(escape.x<0,'spawned within shape must be allowed to exit');
});
test('small stairs are traversable, tall risers rejected and snap-to-ground is monotonic',()=>{
 const world=Collision.create([],{radius:1,stepHeight:1.2,maxSlope:.9});
 const stair=(x)=>Math.max(0,Math.floor(Math.max(0,x)/2))*.7;
 const up=world.move({x:0,z:0},{x:9,z:0},{groundAt:stair});
 assert.ok(up.x>8.8,'sub-step riser should climb');
 const high=world.move({x:0,z:0},{x:9,z:0},{groundAt:x=>x>3?8:0});
 assert.ok(high.x<4,'over-height step should block');
 const down=world.move({x:9,z:0},{x:0,z:0},{groundAt:stair});
 assert.ok(down.x<.1);
});
test('vehicle suspension samples four independent contact points and leans with ground',()=>{
 const rig=Vehicle.create({spring:26,damping:10});
 const flat=(x,z)=>0;
 let state=rig.update({x:0,z:0,yaw:0,groundAt:flat,dt:1/60});
 assert.ok(Number.isFinite(state.bodyHeight));
 for(let i=0;i<100;i++)state=rig.update({x:0,z:0,yaw:0,groundAt:(x,z)=>x*.1,dt:1/60});
 assert.ok(Math.abs(state.roll)>.01,'lateral terrain difference generates lean');
 assert.ok(state.wheels.length===4&&state.wheels.every(w=>Number.isFinite(w.contact)));
 const before=state.bodyHeight;
 rig.reset();
 state=rig.update({x:0,z:0,yaw:0,groundAt:()=>12,dt:1/60});
 assert.ok(Number.isFinite(state.bodyHeight)&&state.bodyHeight>=0);
 assert.ok(Math.abs(state.bodyHeight-before)<30,'suspension must remain bounded');
});
test('suspension resists long timesteps, invalid terrain and has stable settling',()=>{
 const rig=Vehicle.create();
 let s;
 for(let i=0;i<180;i++)s=rig.update({x:0,z:0,yaw:0,groundAt:()=>4,dt:1/60});
 const settled=s.bodyHeight;
 s=rig.update({x:0,z:0,yaw:0,groundAt:()=>NaN,dt:20});
 assert.ok(Number.isFinite(s.bodyHeight)&&Number.isFinite(s.pitch)&&Number.isFinite(s.roll));
 assert.ok(Math.abs(s.bodyHeight-settled)<20);
});
test('offline boot and diagnostics contain vehicle contact mechanics',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const game=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
 assert.ok(html.indexOf('src/vehicle-suspension.js')>=0&&html.indexOf('src/vehicle-suspension.js')<html.indexOf('src/game.js'));
 assert.match(sw,/\.\/src\/vehicle-suspension\.js/);
 assert.match(game,/suspension\.update/);
 assert.match(game,/vehicleSuspension:/);
});