/* Offline procedural river-valley field recording substitute: sound synthesis only.
 * Unlocks AudioContext in a user gesture; one context, no downloaded sound samples. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleySoundscape=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function biomeAt(x,z,{weather='clear'}={}){
  if(weather==='rain')return 'rain';
  if(z>950)return 'shore';
  if(Math.hypot(x-1260,z+900)<650)return 'woods';
  if(x< -520&&z<0)return 'farm';
  return 'trail';
 }
 function footstepRecipe(biome){
  const recipes={shore:{low:165,high:420,noise:.65},woods:{low:110,high:320,noise:.85},farm:{low:90,high:230,noise:.9},trail:{low:135,high:390,noise:.65},rain:{low:160,high:530,noise:.73}};
  return recipes[biome]||recipes.trail;
 }
 function create({AudioContextClass=null}={}){
  const contextType=AudioContextClass||(typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext));
  let context=null,master=null,muted=false,steps=0,lastStep=-Infinity,lastAmbient=-Infinity;
  function unlock(){
   if(!contextType)return false;
   try{
    if(!context){context=new contextType();master=context.createGain();master.gain.value=.14;master.connect(context.destination);}
    if(context.state==='suspended'||context.state==='interrupted')context.resume().catch(()=>{});
    return true;
   }catch(_){return false;}
  }
  function tone(freq,duration,volume,type='sine'){
   if(!context||context.state!=='running'||muted)return false;
   const t=context.currentTime,osc=context.createOscillator(),gain=context.createGain();
   osc.type=type;osc.frequency.setValueAtTime(freq,t);
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),t+.008);
   gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
   osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+duration+.015);
   return true;
  }
  function footstep({x=0,z=0,weather='clear',speed=0,stamp=0}={}){
   if(!Number.isFinite(stamp)||stamp-lastStep<Math.max(200,540-5*Math.min(45,Math.max(0,speed))))return null;
   const biome=biomeAt(x,z,{weather}),recipe=footstepRecipe(biome);
   lastStep=stamp;
   // A quiet, two-part tap: low contact + dry upper-frequency detail.
   const played=tone(recipe.low,.105,.085,'triangle');
   tone(recipe.high,.038,.025,'square');if(played)steps++;
   return {biome,played};
  }
  function ambient({x=0,z=0,weather='clear',stamp=0}={}){
   if(!Number.isFinite(stamp)||stamp-lastAmbient<4300)return null;
   lastAmbient=stamp;
   const biome=biomeAt(x,z,{weather});
   const freq={shore:310,woods:790,farm:540,trail:610,rain:190}[biome];
   tone(freq,.45,.012,biome==='rain'?'triangle':'sine');
   return biome;
  }
  function setMuted(value){muted=!!value;if(master)master.gain.value=muted?0:.14;}
  function snapshot(){return {supported:!!contextType,unlocked:!!context,state:context?.state||'uninitialized',muted,steps,biomes:['shore','woods','farm','trail','rain']};}
  function close(){if(context){context.close().catch(()=>{});context=null;master=null;}}
  return Object.freeze({unlock,footstep,ambient,setMuted,snapshot,close});
 }
 return Object.freeze({create,biomeAt,footstepRecipe});
});