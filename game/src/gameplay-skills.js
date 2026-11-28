/* In-world wildlife + fishing skills. Original deterministic, no web calls.
 * Coordinates are illustrative game-local meters, not a surveyed ecosystem.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 // Keep browser global available when imported as an ESM side effect by Babylon.
 if(typeof window!=='undefined')root.ValleyGameplaySkills=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const SPECIES=Object.freeze({
  deer:Object.freeze({x:16,z:-5,radius:15,rate:.31,gait:1.6,fleeRadius:40,height:0}),
  turkey:Object.freeze({x:-23,z:10,radius:12,rate:.51,gait:2.1,fleeRadius:29,height:0}),
  rabbit:Object.freeze({x:32,z:-10,radius:8,rate:.82,gait:3.4,fleeRadius:24,height:.6})
 });
 const FISH=new Set(['bluegill','channelCatfish','bass']);
 function sampleWildlife(stamp,player={x:0,z:0},site={x:0,z:0},active=null){
  const tick=Number.isFinite(stamp)?stamp*.001:0;
  const animals={};
  const px=Number.isFinite(player?.x)?player.x:0;
  const pz=Number.isFinite(player?.z)?player.z:0;
  for(const [kind,s] of Object.entries(SPECIES)){
   const phase=kind==='deer'?.7:kind==='turkey'?2.1:3.3;
   const drift=Math.sin(tick*s.rate+phase),walk=Math.cos(tick*s.rate*.63+phase);
   let x=s.x+drift*s.radius,z=s.z+walk*5;
   const selected=active?.kind===kind;
   if(selected&&Number.isFinite(active.target)){
    x=clamp((active.target-.5)*67,-34,34);
    z=-5;
   }else if(!active){
    const dx=site.x+x-px,dz=site.z+z-pz;
    const dist=Math.hypot(dx,dz);
    if(dist<s.fleeRadius){
     const force=(s.fleeRadius-dist)/s.fleeRadius*19;
     const inv=1/Math.max(.001,dist);
     x+=dx*inv*force;z+=dz*inv*force;
    }
   }
   // Ensure scene props never escape the animal-viewing clearing.
   x=clamp(x,-47,47);z=clamp(z,-24,24);
   const heading=Math.atan2(-s.radius*s.rate*Math.cos(tick*s.rate+phase),
                            -2*Math.sin(tick*s.rate*.63+phase));
   const distance=Math.hypot(site.x+x-px,site.z+z-pz);
   const fleeing=!active&&distance<s.fleeRadius*.94;
   const grazing=!fleeing&&!selected&&Math.sin(tick*.37+phase)>.35;
   const moving=selected||fleeing||!grazing;
   const stride=selected?1:fleeing?2.1:grazing?.16:.85;
   const gait=Math.sin(tick*s.gait*5*stride+phase)*(moving?.31*stride:.05);
   animals[kind]=Object.freeze({
    x,z,height:s.height,rotationY:Number.isFinite(heading)?heading:0,
    behavior:fleeing?'flee':selected?'tracked':grazing?'forage':'wander',
    gait,headDip:grazing?.2+.18*Math.sin(tick*.75+phase):fleeing?-.14:0,
    earFlick:Math.sin(tick*3.1+phase)*.13,
    tailSwish:Math.sin(tick*4.6+phase)*.23,
    bob:Math.abs(Math.sin(tick*s.gait*5*stride+phase))*(kind==='rabbit'?.7:stride*.11),
    visible:active?selected:true,
    fleeing
   });
  }
  return Object.freeze(animals);
 }
 function fishCue(round,now){
  if(!round)return Object.freeze({phase:'none',remainingMs:0,target:.5});
  const clock=Number.isFinite(now)?now:0;
  const time=clock-round.biteAt;
  const waiting=round.phase==='waiting';
  const phase=waiting?(time<0?'waiting':time<=1100?'bite':'escaped'):round.phase;
  const target=clamp(.5+.23*Math.sin(time*.0031+(round.kind==='bass'?1.3:round.kind==='bluegill'?.3:2)),.22,.78);
  return Object.freeze({phase,target,remainingMs:phase==='waiting'?Math.max(0,-time):phase==='bite'?Math.max(0,1100-time):0,
                        progress:round.progress||0,tension:round.tension??.42});
 }
 function newFishingRound(biteAt,kind){
  if(!FISH.has(kind)||!Number.isFinite(biteAt)||biteAt<0)throw new RangeError('Invalid catch round');
  return Object.freeze({kind,biteAt,phase:'waiting',progress:0,tension:.38,lastReelAt:-Infinity});
 }
 // One action hooks the bite, then 3 successful bar matches land a fish.
 // No XP, fish, or coins are awarded until the caller receives 'landed'.
 function reel(round,now,aim){
  if(!round||!FISH.has(round.kind)||!Number.isFinite(now)||!Number.isFinite(aim)||aim<0||aim>1)
   return Object.freeze({result:'invalid',round});
  const cue=fishCue(round,now);
  if(round.phase==='waiting'){
   if(cue.phase==='waiting')return Object.freeze({result:'early',round});
   if(cue.phase!=='bite')return Object.freeze({result:'escaped',round:{...round,phase:'escaped'}});
   return Object.freeze({result:'hooked',round:{...round,phase:'fight',lastReelAt:now}});
  }
  if(round.phase!=='fight')return Object.freeze({result:round.phase==='landed'?'landed':'escaped',round});
  if(now-round.lastReelAt<240)return Object.freeze({result:'cooldown',round});
  const within=Math.abs(aim-cue.target)<=.145;
  const tension=clamp(round.tension+(within?-.055:.31),0,1);
  const progress=round.progress+(within?1:0);
  const phase=tension>=.95?'escaped':progress>=3?'landed':'fight';
  const result=phase==='landed'?'landed':phase==='escaped'?'line-broke':within?'good-reel':'slack-or-strain';
  return Object.freeze({result,round:{...round,phase,progress,tension,lastReelAt:now}});
 }
 function farmPlotIndex(value){
  if(Number.isInteger(value)&&value>=0&&value<9)return value;
  return null;
 }
 return Object.freeze({SPECIES,sampleWildlife,fishCue,newFishingRound,reel,farmPlotIndex});
});
