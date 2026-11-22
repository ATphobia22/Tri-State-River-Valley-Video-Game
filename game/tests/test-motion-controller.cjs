const {test}=require('node:test'),assert=require('node:assert/strict');
const Motion=require('../src/motion-controller.js');
function simulate(step){const m=Motion.create(),position={x:0,z:0};let result;for(let i=0;i<Math.round(1/step);i++){result=m.step({position,dt:step,inputZ:-1});position.x=result.x;position.z=result.z;}return result;}
test('analytic acceleration produces comparable distance at 30 and 60 fps',()=>{
 const a=simulate(1/30),b=simulate(1/60);
 assert.ok(Math.abs(a.z-b.z)<1e-8,String(a.z)+' vs '+String(b.z));
 assert.ok(a.speed>18&&a.speed<20);
 assert.ok(a.z<0);
});
test('turning follows the camera and avoids an instantaneous 180 degree snap',()=>{
 const m=Motion.create();
 let p={x:0,z:0},r=m.step({position:p,inputZ:-1,dt:.016});
 assert.ok(r.z<0);
 p={x:r.x,z:r.z};
 r=m.step({position:p,inputZ:1,dt:.016});
 assert.ok(Math.abs(r.heading)<1.0);
 for(let i=0;i<80;i++){r=m.step({position:{x:r.x,z:r.z},inputZ:1,dt:.016});}
 assert.ok(r.z>0,'avatar can reverse and move');
});
test('momentum decays after releasing controls and resets for fast travel',()=>{
 const m=Motion.create();let r={x:0,z:0};
 for(let i=0;i<12;i++)r=m.step({position:r,inputZ:-1,dt:.016});
 const old=m.snapshot().speed;
 r=m.step({position:r,dt:.016});
 assert.ok(m.snapshot().speed<old&&m.snapshot().speed>0);
 m.reset({facing:.6});
 assert.equal(m.snapshot().speed,0);assert.equal(m.snapshot().heading,.6);
});
test('a jump really lifts the avatar, lands and does not retrigger while key held',()=>{
 const m=Motion.create();let p={x:0,z:0},r;let tookOff=0,landed=0,top=0;
 for(let i=0;i<110;i++){
  r=m.step({position:p,dt:1/60,jump:true});
  p={x:r.x,z:r.z};if(r.startedJump)tookOff++;if(r.landed)landed++;
  top=Math.max(top,r.heightOffset);
 }
 assert.equal(tookOff,1);assert.equal(landed,1);assert.ok(top>3);
 assert.equal(r.heightOffset,0);
 m.step({position:p,dt:.016,jump:false});
 r=m.step({position:p,dt:.016,jump:true});
 assert.equal(r.startedJump,true);
});
test('drive stays ground-bound; clamp and bad frame times never corrupt state',()=>{
 const m=Motion.create({worldLimit:200});let p={x:199.9,z:0},r;
 for(let i=0;i<50;i++){r=m.step({position:p,dt:.016,inputX:1,drive:true,jump:true});p={x:r.x,z:r.z};}
 assert.equal(r.x,200);assert.equal(r.heightOffset,0);
 r=m.step({position:p,dt:Infinity,inputX:1});
 assert.ok(Number.isFinite(r.x)&&Number.isFinite(r.speed));
 assert.throws(()=>m.step({position:{x:NaN,z:0}}),TypeError);
 assert.throws(()=>Motion.create({walkSpeed:-10}),RangeError);
});
test('follow camera clearance raises its target above an intervening ridge',()=>{
 const high=Motion.cameraClearance({playerX:0,playerZ:0,lookHeight:6,cameraX:0,cameraZ:100,
 desiredY:35,groundAt:(x,z)=>z>40&&z<60?40:0});
 assert.ok(high>35&&high<=125,'ridge raises camera but remains clamped');
 const flat=Motion.cameraClearance({playerX:0,playerZ:0,lookHeight:6,cameraX:0,cameraZ:100,
 desiredY:35,groundAt:()=>0});
 assert.equal(flat,35);
 assert.throws(()=>Motion.cameraClearance({playerX:NaN,playerZ:0,lookHeight:6,cameraX:0,cameraZ:0,desiredY:10}),TypeError);
});
test('new gameplay rig and all offline bundles explicitly load before entry point',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),game=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
 assert.ok(html.indexOf('src/motion-controller.js')>=0);
 assert.ok(html.indexOf('src/motion-controller.js')<html.indexOf('src/game.js'));
 assert.match(sw,/\.\/src\/motion-controller\.js/);
 assert.match(game,/ValleyMotion/);
 assert.match(game,/heroHeightOffset:/);
 assert.match(game,/motionState:/);
 assert.match(game,/MOTION\.cameraClearance/);
});