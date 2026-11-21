const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const W=require('../src/open-world.js');
test('each in-world site approaches from camera-facing side, not behind player',()=>{
 for(const id of Object.keys(W.SITES)){
  for(const yaw of [-1.2,0,0.6,2.5]){
   const spawn=W.approachSite(id,yaw,34),site=W.SITES[id];
   assert.ok(Number.isFinite(spawn.x)&&Number.isFinite(spawn.z));
   assert.ok(Math.abs(Math.hypot(spawn.x-site.x,spawn.z-site.z)-34)<1e-5);
   const toward=-(site.x-spawn.x)*Math.sin(yaw)-(site.z-spawn.z)*Math.cos(yaw);
   assert.ok(toward>33.9,`site ${id} is in front of player toward view at yaw ${yaw}`);
  }
 }
});
test('runtime uses view-relative spawn and short activity follow camera',()=>{
 const source=fs.readFileSync(__dirname+'/../src/game.js','utf8');
 assert.match(source,/WORLD\.approachSite\(id,cameraYaw/);
 assert.match(source,/cameraDist=Math\.min\(cameraDist,43\)/);
});
