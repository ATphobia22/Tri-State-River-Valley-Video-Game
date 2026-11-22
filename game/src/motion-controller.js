/* River Valley original input-to-motion controller.
 * A small offline kinematic model: smooth horizontal acceleration/braking,
 * bounded turn rate, and a ballistic (non-rigid-body) jump on the gameplay rig.
 * Derived from game-feel principles; not vendored physics-engine code.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyMotion=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function create({walkSpeed=19,sprintSpeed=35,driveSpeed=230,worldLimit=2450}={}){
  if(![walkSpeed,sprintSpeed,driveSpeed,worldLimit].every(v=>Number.isFinite(v)&&v>0)||sprintSpeed<walkSpeed||worldLimit<100)
   throw new RangeError('Invalid local game locomotion parameters');
  let vx=0,vz=0,heading=0,air=0,vy=0,jumpHeld=false,landingSeconds=0;
  function reset({facing=heading}={}){
   vx=0;vz=0;air=0;vy=0;jumpHeld=false;landingSeconds=0;
   heading=Number.isFinite(facing)?facing:0;
  }
  function step({dt=.016,position={x:0,z:0},inputX=0,inputZ=0,cameraYaw=0,sprint=false,drive=false,jump=false}={}){
   if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z))
    throw new TypeError('Finite player coordinates required');
   const h=Number.isFinite(dt)?clamp(dt,0,.065):0;
   const x=Number.isFinite(inputX)?clamp(inputX,-1,1):0,z=Number.isFinite(inputZ)?clamp(inputZ,-1,1):0;
   const magnitude=Math.hypot(x,z),hasInput=magnitude>.0001;
   const yaw=Number.isFinite(cameraYaw)?cameraYaw:0;
   const speed=drive?driveSpeed:sprint?sprintSpeed:walkSpeed;
   const targetX=hasInput?(x*Math.cos(yaw)+z*Math.sin(yaw))/magnitude*speed:0;
   const targetZ=hasInput?(z*Math.cos(yaw)-x*Math.sin(yaw))/magnitude*speed:0;
   const response=hasInput?(drive?3.8:10.5):(drive?7.5:13);
   const fade=Math.exp(-response*h),fraction=(1-fade)/response;
   // Analytic first-order velocity integration avoids FPS-dependent acceleration.
   const deltaX=targetX*h+(vx-targetX)*fraction;
   const deltaZ=targetZ*h+(vz-targetZ)*fraction;
   vx=targetX+(vx-targetX)*fade;vz=targetZ+(vz-targetZ)*fade;
   let nextX=clamp(position.x+deltaX,-worldLimit,worldLimit);
   let nextZ=clamp(position.z+deltaZ,-worldLimit,worldLimit);
   if(Math.abs(nextX-(position.x+deltaX))>1e-8)vx=0;
   if(Math.abs(nextZ-(position.z+deltaZ))>1e-8)vz=0;
   const actualSpeed=Math.hypot(vx,vz);
   if(actualSpeed>.6&&h>0){
    const desired=Math.atan2(-vx,-vz);
    const shortest=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
    const maxTurn=(drive?2.2:8)*h;
    heading+=clamp(shortest,-maxTurn,maxTurn);
    heading=Math.atan2(Math.sin(heading),Math.cos(heading));
   }
   let startedJump=false,landed=false;
   const nowJump=!!jump&&!drive;
   if(nowJump&&!jumpHeld&&air<=0&&vy<=0&&h>0){
    vy=24;air=.000001;startedJump=true;landingSeconds=0;
   }
   jumpHeld=!!jump;
   if(drive){air=0;vy=0;landingSeconds=0;}
   else if(air>0||vy>0){
    const nextAir=air+vy*h-.5*65*h*h;
    vy-=65*h;
    if(nextAir<=0){
     air=0;vy=0;landed=true;landingSeconds=.23;
    }else air=nextAir;
   }else landingSeconds=Math.max(0,landingSeconds-h);
   return {x:nextX,z:nextZ,heading,speed:actualSpeed,airborne:air>0,
    heightOffset:air,verticalSpeed:vy,startedJump,landed,landing:landingSeconds>0};
  }
  function snapshot(){return {vx,vz,speed:Math.hypot(vx,vz),heading,heightOffset:air,airborne:air>0,landing:landingSeconds>0};}
  return Object.freeze({step,reset,snapshot});
 }
 // Keep the third-person camera line-of-sight above locally sampled terrain.
 // This is deterministic clearance only, not a collision test against buildings.
 function cameraClearance({playerX,playerZ,lookHeight,cameraX,cameraZ,desiredY,groundAt,margin=3,samples=8,maxLift=90}={}){
  if(![playerX,playerZ,lookHeight,cameraX,cameraZ,desiredY].every(Number.isFinite))
   throw new TypeError('Camera clearance needs finite world coordinates');
  if(typeof groundAt!=='function')return desiredY;
  const count=clamp(Math.floor(Number.isFinite(samples)?samples:8),2,32);
  const clearance=clamp(Number.isFinite(margin)?margin:3,0,15);
  const lift=clamp(Number.isFinite(maxLift)?maxLift:90,0,250);
  let y=desiredY;
  for(let i=1;i<=count;i++){
   const t=i/(count+1),x=playerX+(cameraX-playerX)*t,z=playerZ+(cameraZ-playerZ)*t;
   const h=groundAt(x,z);
   if(!Number.isFinite(h))continue;
   // At fraction t, y(t)=lookHeight+(cameraY-lookHeight)*t.
   y=Math.max(y,lookHeight+(h+clearance-lookHeight)/t);
  }
  return Math.min(desiredY+lift,y);
 }
 // A cheap ground-contact cue, shared by walking/driving, without expensive
 // dynamic shadow-map passes or downloaded textures. Not physically cast light.
 function createContactShadow(THREE){
  if(typeof document==='undefined'||!THREE?.CanvasTexture)return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  const gradient=ctx.createRadialGradient(64,64,6,64,64,64);
  gradient.addColorStop(0,'rgba(0,0,0,.65)');
  gradient.addColorStop(.42,'rgba(0,0,0,.40)');
  gradient.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.52,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(10,7),material);
  mesh.name='River/terrain-contact-soft-shadow';
  mesh.rotation.x=-Math.PI/2;
  mesh.renderOrder=1;
  mesh.userData.dispose=()=>{mesh.geometry.dispose();texture.dispose();material.dispose();};
  return mesh;
 }
 return Object.freeze({create,createContactShadow,cameraClearance});
});