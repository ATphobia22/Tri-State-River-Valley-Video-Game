/* Offline independent wheel-height suspension for River Valley scenery.
 * A kinematic four-contact spring/damper and chassis attitude model.
 * NOT rigid-body dynamics, tire slip, impulse collision or real car simulation.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyVehicleSuspension=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function create({track=15,wheelBase=16,spring=26,damping=10,maxTravel=3,maxTilt=.28}={}){
 if(![track,wheelBase,spring,damping,maxTravel,maxTilt].every(Number.isFinite)||track<=0||wheelBase<=0||spring<=0||damping<=0||maxTravel<=0)throw RangeError('Invalid suspension settings');
 let height=0,v=0,pitch=0,roll=0;
 function reset(){height=0;v=0;pitch=0;roll=0;}
 const offsets=[[-track/2,-wheelBase/2],[track/2,-wheelBase/2],[-track/2,wheelBase/2],[track/2,wheelBase/2]];
 function update({x=0,z=0,yaw=0,groundAt=null,dt=.016}={}){
  if(![x,z,yaw].every(Number.isFinite))throw TypeError('Invalid vehicle position');
  const cosine=Math.cos(yaw),sine=Math.sin(yaw);
  const ground=(px,pz)=>{let h=typeof groundAt==='function'?groundAt(px,pz):0;return Number.isFinite(h)?h:0;};
  const center=ground(x,z);
  const wheels=offsets.map(([lx,lz])=>{
   const wx=x+lx*cosine+lz*sine,wz=z-lx*sine+lz*cosine;
   const contact=ground(wx,wz);
   return {x:wx,z:wz,localX:lx,localZ:lz,contact};
  });
  const mean=(wheels.reduce((sum,w)=>sum+w.contact,0)/4);
  // Front wheels are indices 0 and 1 (negative local Z).
  const front=(wheels[0].contact+wheels[1].contact)/2;
  const rear=(wheels[2].contact+wheels[3].contact)/2;
  const left=(wheels[0].contact+wheels[2].contact)/2;
  const right=(wheels[1].contact+wheels[3].contact)/2;
  const wantHeight=clamp(mean-center,-maxTravel,maxTravel);
  const wantPitch=clamp(Math.atan2(rear-front,wheelBase),-maxTilt,maxTilt);
  const wantRoll=clamp(Math.atan2(left-right,track),-maxTilt,maxTilt);
  const duration=clamp(Number.isFinite(dt)?dt:0,0,.08);
  // Semi-implicit bounded spring with 1/120 s integration steps.
  const n=Math.max(1,Math.ceil(duration/(1/120))),h=duration/n;
  for(let i=0;i<n;i++){
   const a=spring*(wantHeight-height)-damping*v;
   v=clamp(v+a*h,-24,24);
   height=clamp(height+v*h,-maxTravel,maxTravel);
  }
  const smoothing=1-Math.exp(-clamp(duration,0,.08)*8);
  pitch+=(wantPitch-pitch)*smoothing;
  roll+=(wantRoll-roll)*smoothing;
  return {bodyHeight:height,pitch,roll,wheels: wheels.map(w=>({...w,
   compression:clamp(mean-w.contact,-maxTravel,maxTravel)})),groundHeight:center};
 }
 return Object.freeze({update,reset,snapshot:()=>({bodyHeight:height,pitch,roll,wheelCount:4})});
}
return Object.freeze({create});
});