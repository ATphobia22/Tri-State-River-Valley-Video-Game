/* Original offline terrain-contact solver for River Explorer.
 * Per-foot world-space stance anchor with finite limb reach, swing clearance,
 * slope-following ankle pitch, explicit reset for teleports/vehicle transitions.
 * This is a kinematic assist; no rigid-body or surveyed-terrain claim.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyFootPlant=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const sides=['left','right'];
function create({reach=3.5,ankleSample=.7}={}){
 if(!Number.isFinite(reach)||reach<1||reach>6)throw new RangeError('Foot contact reach must be 1–6 game units');
 const feet={left:{anchor:null,planted:false,plants:0,releases:0},right:{anchor:null,planted:false,plants:0,releases:0}};
 function reset(){for(const side of sides){feet[side].anchor=null;feet[side].planted=false;}}
 function step({side,phase=0,root,heading=0,localX=0,localZ=0,moving=false,groundAt=null}={}){
  if(!sides.includes(side))throw new TypeError('Invalid foot side');
  if(!root||![root.x,root.y,root.z].every(Number.isFinite))throw new TypeError('Invalid root position');
  const f=feet[side],yaw=Number.isFinite(heading)?heading:0,c=Math.cos(yaw),s=Math.sin(yaw);
  const world=(x,z)=>({x:root.x+c*x+s*z,z:root.z-s*x+c*z});
  const sample=(x,z)=>{const v=typeof groundAt==='function'?groundAt(x,z):root.y;return Number.isFinite(v)?v:root.y;};
  const p=world(localX,localZ);
  // The gait swings when cos(phase)>0, latches its world point on touchdown,
  // and does not chase the avatar until toe-off or limb reach is exhausted.
  const stance=!!moving && Number.isFinite(phase) && Math.cos(phase)<=0;
  if(!stance){if(f.planted)f.releases++;f.planted=false;f.anchor=null;}
  else {
   if(f.anchor&&Math.hypot(f.anchor.x-root.x,f.anchor.z-root.z)>reach){f.releases++;f.anchor=null;f.planted=false;}
   if(!f.anchor){f.anchor={x:p.x,z:p.z};f.plants++;}
   f.planted=true;
  }
  const active=f.planted?f.anchor:p;
  let xLocal=c*(active.x-root.x)-s*(active.z-root.z);
  let zLocal=s*(active.x-root.x)+c*(active.z-root.z);
  // Never request IK outside the knee's reachable sagittal workspace.
  xLocal=clamp(xLocal,-reach,reach);zLocal=clamp(zLocal,-reach,reach);
  const y=sample(active.x,active.z);
  const front=sample(active.x+s*ankleSample,active.z+c*ankleSample);
  const back=sample(active.x-s*ankleSample,active.z-c*ankleSample);
  const pitch=clamp(Math.atan2(back-front,2*ankleSample),-.28,.28);
  const lift=moving&&!stance?Math.max(0,Math.cos(phase))*.60:0;
  return {localX:xLocal,localZ:zLocal,groundOffset:clamp(y-root.y,-1.1,1.1),
   pitch,lift,planted:f.planted,anchor:f.anchor?{...f.anchor}:null};
 }
 return {step,reset,snapshot:()=>Object.fromEntries(sides.map(side=>[side,{planted:feet[side].planted,plants:feet[side].plants,releases:feet[side].releases,anchor:feet[side].anchor?{...feet[side].anchor}:null}]))};
}
return Object.freeze({create});
});