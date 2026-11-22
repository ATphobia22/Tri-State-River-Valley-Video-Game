/* Original deterministic companion behaviour for Scout (offline).
 * A responsive, playable friend rather than a visual mesh glued to the player.
 * Dog welfare and training interactions are fictional family gameplay.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValleyCompanion=api;
})(typeof globalThis==='object'?globalThis:this,function(root){
'use strict';
const C=root.ValleyCore||(typeof require==='function'?require('./core.js'):null);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const finite=(v,def=0)=>Number.isFinite(v)?v:def;
function hint(aim,target){
 if(!Number.isFinite(aim)||!Number.isFinite(target))return 'unknown';
 return target-aim>.07?'right':aim-target>.07?'left':'close';
}
function rewardBond(raw,action,now){
 let save=C.validateSave(raw),t=Math.floor(finite(now,0));
 if(save.pet===false)return {save,result:'disabled'};
 if(!['pet','fetch'].includes(action))return {save,result:'invalid'};
 if(t<=0||t-save.scoutLastRewardAt<20000)return {save,result:'cooldown'};
 const amount=action==='fetch'?2:1;
 save.scoutBond=Math.min(100,save.scoutBond+amount);
 save.scoutLastRewardAt=t;
 save=C.gainReward(save,0,action==='fetch'?12:5);
 return {save,result:'bonded'};
}
function create({walkSpeed=13,runSpeed=23,heelDistance=8}={}){
 let x=null,z=null,y=0,heading=0,action='follow',phase=0,fetchTarget=null,completedFetch=0;
 function reset(){x=null;z=null;y=0;heading=0;action='follow';phase=0;fetchTarget=null;completedFetch=0;}
 function command(kind,{player={x:0,z:0},heading:yaw=0}={}){
  if(!['come','sit','fetch'].includes(kind))return false;
  if(kind==='sit'){action='sit';fetchTarget=null;return true;}
  if(kind==='come'){action='follow';fetchTarget=null;return true;}
  const px=finite(player.x),pz=finite(player.z),h=finite(yaw);
  fetchTarget={x:px-Math.sin(h)*31,z:pz-Math.cos(h)*31};
  action='fetch';return true;
 }
 function update({dt=.016,player={x:0,z:0},heading:yaw=0,groundAt=null,stamp=0,enabled=true,activity=null}={}){
  const px=finite(player.x),pz=finite(player.z),h=finite(yaw),delta=clamp(finite(dt),0,.08);
  if(x===null||z===null){x=px+Math.cos(h)*heelDistance;z=pz-Math.sin(h)*heelDistance;heading=h;}
  if(!enabled)return {x,y,z,heading,action:'hidden',phase,tailWag:0,completedFetch:false};
  if(activity==='fish'&&action==='follow')action='sit';
  else if(activity!=='fish'&&action==='sit'&&fetchTarget===null){/* owner can ask to stay */ }
  let goal;
  if(action==='fetch'&&fetchTarget)goal=fetchTarget;
  else if(action==='return')goal={x:px,z:pz};
  else if(action==='sit')goal={x,z};
  else goal={x:px+Math.cos(h)*heelDistance,z:pz-Math.sin(h)*heelDistance};
  const vx=goal.x-x,vz=goal.z-z,d=Math.hypot(vx,vz);
  const speed=action==='fetch'||action==='return'||d>24?runSpeed:walkSpeed;
  const moved=action!=='sit'&&d>.35?Math.min(d,speed*delta):0;
  if(moved){x+=vx/d*moved;z+=vz/d*moved;const desired=Math.atan2(-vx,-vz);
   const turn=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
   heading+=clamp(turn,-delta*6,delta*6);phase+=moved*.32;}
  if(action==='fetch'&&d<2){action='return';}
  let didFinish=false;
  if(action==='return'&&Math.hypot(px-x,pz-z)<3.2){action='follow';fetchTarget=null;completedFetch++;didFinish=true;}
  const elevation=typeof groundAt==='function'?groundAt(x,z):0;
  y=finite(elevation,0);
  return {x,z,y,heading,action,phase,tailWag:Math.sin(finite(stamp)*.01+phase)*.66,
   completedFetch:didFinish,pace:moved/Math.max(.0001,delta)};
 }
 function snapshot(){return {x,z,heading,action,completedFetch,fetchTarget:fetchTarget?{...fetchTarget}:null};}
 return Object.freeze({update,command,reset,snapshot});
}
return Object.freeze({create,hint,rewardBond});
});