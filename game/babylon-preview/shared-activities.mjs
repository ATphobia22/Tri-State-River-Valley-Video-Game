/**
 * Shared progression for Babylon WebGL2. This module deliberately delegates all
 * rewards, recipes, planting, hunting and fishing rules to the legacy game modules.
 * It does not reinterpret the original save's game-local position as WGS84.
 */
export const ACTIVITY_SITES=Object.freeze({
 fish:Object.freeze({x:-38,z:49,radius:16,title:'River Pier'}),
 hunt:Object.freeze({x:38,z:49,radius:16,title:'Oak Grove Wildlife'}),
 farm:Object.freeze({x:0,z:-50,radius:16,title:'Valley Farm'}),
 cook:Object.freeze({x:0,z:-50,radius:16,title:'Camp Kitchen'})
});
const WAYPOINT_QUESTS=Object.freeze({pier:'riverfront',grove:'oak',farm:'farm'});
const validNumber=value=>typeof value==='number'&&Number.isFinite(value);
const finiteTime=value=>validNumber(value)&&value>=0;
const goodAim=value=>validNumber(value)&&value>=0&&value<=1;
export function canUseActivity(id,position){
 const site=ACTIVITY_SITES[id];
 return !!site&&validNumber(position?.x)&&validNumber(position?.z)&&
  Math.hypot(position.x-site.x,position.z-site.z)<=site.radius;
}
export function createActivitySession({core,skills,world,storage=null,clock=Date.now,slot=0}={}){
 if(!core?.validateSave||!core?.farmAction||!core?.cookRecipe||
    !skills?.newFishingRound||!skills?.reel||!skills?.sampleWildlife||
    !world?.huntTargetAt)throw new TypeError('canonical game rules are required');
 if(!Number.isInteger(slot)||slot<0||slot>2)throw new RangeError('save slot must be 0, 1 or 2');
 const key='river-family-adventure-v1-slot-'+slot;
 let save=core.freshSave('Family Explorer');
 try{
  const text=storage?.getItem(key);
  if(text)save=core.validateSave(JSON.parse(text));
 }catch{/* Private browsing, denied storage or malformed saves: use memory only. */}
 let fishing=null,hunting=null;
 function persist(){
  try{storage?.setItem(key,JSON.stringify(save));return true;}
  catch{return false;}
 }
 function commit(next){
  save=core.validateSave(next);
  persist();
 }
 function discover(waypoint){
  const id=WAYPOINT_QUESTS[waypoint],stop=core.STOPS.find(s=>s.id===id);
  if(!stop)return {result:'invalid'};
  if(save.completed.includes(id))return {result:'already',id};
  const next=core.completeStop(save,id,stop.reward);
  commit(next);return {result:'completed',id,coins:stop.reward};
 }
 function castFish(kind,now=clock(),delayMs=1900){
  if(!['bluegill','channelCatfish','bass'].includes(kind)||!finiteTime(now)||
     !Number.isInteger(delayMs)||delayMs<250||delayMs>10000)return {result:'invalid'};
  if(fishing&&['waiting','fight'].includes(fishing.phase))return {result:'busy'};
  fishing=skills.newFishingRound(now+delayMs,kind);
  return {result:'cast',kind,biteAt:fishing.biteAt};
 }
 function reelFish(aim,now=clock()){
  if(!fishing)return {result:'no-round'};
  if(!goodAim(aim)||!finiteTime(now))return {result:'invalid'};
  const round=fishing;
  const outcome=skills.reel(round,now,aim);
  fishing=outcome.round;
  if(outcome.result==='landed'){
   const won=core.landFish(save,round.kind);
   if(won.result==='caught')commit(won.save);
   fishing=null;
  }else if(['escaped','line-broke'].includes(outcome.result)){
   fishing=null;
  }
  return {result:outcome.result,kind:round.kind};
 }
 function farm(index,now=clock()){
  if(!finiteTime(now))return {result:'invalid'};
  const outcome=core.farmAction(save,index,now);
  if(['planted','harvested'].includes(outcome.result))commit(outcome.save);
  return {result:outcome.result,index};
 }
 function waterFarm(now=clock()){
  if(!finiteTime(now))return {result:'invalid'};
  const outcome=core.waterFarm(save,now);
  if(outcome.result==='watered')commit(outcome.save);
  return {result:outcome.result};
 }
 function cook(id){
  const outcome=core.cookRecipe(save,id);
  if(outcome.result==='cooked')commit(outcome.save);
  return {result:outcome.result,recipe:id};
 }
 function trackAnimal(kind,now=clock()){
  if(!Object.hasOwn(skills.SPECIES,kind)||!finiteTime(now))return {result:'invalid'};
  if(hunting&&now<=hunting.expiresAt)return {result:'busy'};
  const animals=skills.sampleWildlife(now,{x:0,z:0},{x:38,z:49});
  const baseTarget=Math.max(.08,Math.min(.92,.5+(animals[kind]?.x||0)/100));
  hunting={kind,target:baseTarget,baseTarget,startedAt:now,expiresAt:now+8000};
  return {result:'tracking',kind,expiresAt:hunting.expiresAt};
 }
 function shootAnimal(aim,now=clock()){
  if(!hunting)return {result:'no-round'};
  if(!goodAim(aim)||!finiteTime(now))return {result:'invalid'};
  const round=hunting;
  const target=world.huntTargetAt(round,now);
  const outcome=core.huntShot(save,aim,target,now,round.expiresAt);
  hunting=null;
  if(outcome.result==='hit')commit(outcome.save);
  return {result:outcome.result,kind:round.kind,target};
 }
 function snapshot(now=clock()){
  const timestamp=finiteTime(now)?now:0;
  return {
   save:core.validateSave(save),
   fishing:fishing?{...fishing,cue:skills.fishCue(fishing,timestamp)}:null,
   hunting:hunting?{...hunting,target:world.huntTargetAt(hunting,timestamp)}:null
  };
 }
 function wildlife(now=clock(),position={x:0,z:0}){
  return skills.sampleWildlife(now,position,{x:ACTIVITY_SITES.hunt.x,z:ACTIVITY_SITES.hunt.z},hunting);
 }
 return Object.freeze({
  key,discover,castFish,reelFish,farm,waterFarm,cook,trackAnimal,shootAnimal,
  snapshot,wildlife,canUse:canUseActivity,recipes:()=>core.RECIPES,
  species:()=>skills.SPECIES
 });
}
