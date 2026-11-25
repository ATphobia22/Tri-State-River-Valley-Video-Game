/* Tri-State River Valley Family Adventure -- offline gameplay core.
   Gameplay distances and elevations are illustrative, not survey-grade. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.ValleyCore=api;
})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const LIMIT=2450;
const STOPS=Object.freeze([
 {id:'courthouse',title:'Historic Square',short:'Square',x:16,z:504,emoji:'🏛️',reward:140,task:'Discover the courthouse square and the heart of Mount Vernon.',fact:'Inspired by Mount Vernon’s downtown historic district.'},
 {id:'riverfront',title:'Riverfront Sunset',short:'River',x:130,z:1050,emoji:'🌊',reward:180,task:'Visit the river walk and watch the Ohio River shimmer.',fact:'Inspired by the Mount Vernon Riverfront and Riverbend Park.'},
 {id:'farm',title:'Valley Harvest',short:'Farm',x:-1260,z:-850,emoji:'🌽',reward:210,task:'Help out at the family farm; harvest a basket of corn.',fact:'The surrounding Ohio–Wabash lowlands are known for farm country.'},
 {id:'oak',title:'Oak Grove Picnic',short:'Grove',x:-810,z:-170,emoji:'🌳',reward:160,task:'Find the oak grove and share a picnic.',fact:'A fictional family stop styled after southwestern Indiana woodlands.'},
 {id:'dock',title:'Working River Dock',short:'Dock',x:-1350,z:1050,emoji:'🚢',reward:200,task:'Visit the working river dock for a harbor photo.',fact:'Inspired by Mount Vernon’s Ohio River port heritage.'},
 {id:'trail',title:'Wildflower Trail',short:'Trail',x:1260,z:-900,emoji:'🦋',reward:190,task:'Find the meadow and collect your trail stamp.',fact:'A stylized nature trail inspired by regional wildlife habitat.'}
]);
const VALID_IDS=new Set(STOPS.map(x=>x.id));
const COUNTY_REGION_IDS=Object.freeze(['mount-vernon','new-harmony','griffin','poseyville','cynthiana']);
const VALID_REGIONS=new Set(COUNTY_REGION_IDS);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=(v,fallback=0)=>typeof v==='number'&&Number.isFinite(v)?v:fallback;
function clampPosition(pos,limit=LIMIT){
  const p=pos&&typeof pos==='object'?pos:{};
  return {x:clamp(num(p.x),-limit,limit),z:clamp(num(p.z),-limit,limit)};
}
function safeName(v){
  return String(typeof v==='string'?v:'Family Explorer').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,24)||'Family Explorer';
}
const WEATHER=new Set(['clear','rain','mist']),SEASONS=new Set(['spring','summer','autumn','winter']);
const WORLD_EVENT_LIMIT=128;
const safeDay=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const safeElapsed=v=>Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER?v:0;
function cleanWorldSimulation(raw,weather='clear',season='summer',region='mount-vernon'){
 const base={version:1,day:0,elapsedSeconds:0,weather,season,region,seq:0,events:[]};
 if(!raw||raw.version!==1)return base;
 base.day=safeDay(raw.day);base.elapsedSeconds=safeElapsed(raw.elapsedSeconds);
 if(WEATHER.has(raw.weather))base.weather=raw.weather;
 if(SEASONS.has(raw.season))base.season=raw.season;
 if(VALID_REGIONS.has(raw.region))base.region=raw.region;
 let last=0;
 for(const e of (Array.isArray(raw.events)?raw.events.slice(-WORLD_EVENT_LIMIT):[])){
  if(!e||!Number.isSafeInteger(e.seq)||e.seq<=last||e.type!=='environment'||!WEATHER.has(e.weather)||!SEASONS.has(e.season)||!VALID_REGIONS.has(e.region)||!Number.isFinite(e.at)||e.at<0||e.at>base.elapsedSeconds)continue;
  base.events.push({seq:e.seq,type:'environment',at:e.at,weather:e.weather,season:e.season,region:e.region});last=e.seq;
 }
 base.seq=Math.max(last,safeDay(raw.seq));
 return base;
}
function advanceWorldClock(world,time,dt){
 if(!Number.isFinite(dt)||dt<=0||!Number.isFinite(time)||time<0||time>24)return {world,time};
 const hours=time+dt*.003,days=Math.floor(hours/24);
 if(!Number.isSafeInteger(world.day+days)||!Number.isFinite(world.elapsedSeconds+dt)||world.elapsedSeconds+dt>Number.MAX_SAFE_INTEGER)return {world,time};
 return {world:{...world,day:world.day+days,elapsedSeconds:world.elapsedSeconds+dt},time:hours%24};
}
function recordEnvironment(world,{weather,season,region}){
 if(!WEATHER.has(weather)||!SEASONS.has(season)||!VALID_REGIONS.has(region)||world.seq>=Number.MAX_SAFE_INTEGER)return world;
 if(world.weather===weather&&world.season===season&&world.region===region)return world;
 const seq=world.seq+1,event={seq,type:'environment',at:world.elapsedSeconds,weather,season,region};
 return {...world,weather,season,region,seq,events:[...world.events,event].slice(-WORLD_EVENT_LIMIT)};
}
function freshSave(name){return {
 version:3,name:safeName(name),coins:0,xp:0,level:1,completed:[],inventory:{corn:0,fish:0,game:0,meals:0},
 position:{x:-30,z:503},farmPlots:Array(9).fill(0),homestead:false,mode:'walk',time:15.5,weather:'clear',season:'summer',pet:true,muted:false,scoutBond:0,scoutLastRewardAt:0,countyRegion:'mount-vernon',countyVisited:['mount-vernon'],lastMeal:null,worldSimulation:cleanWorldSimulation(null)
};}
function validateSave(raw){
 let base=freshSave(raw&&raw.name);
 if(!raw||typeof raw!=='object') return base;
 base.inventory=Object.fromEntries(['corn','fish','game','meals'].map(k=>[k,clamp(Math.floor(num(raw.inventory&&raw.inventory[k])),0,9999)]));
 base.coins=clamp(Math.floor(num(raw.coins)),0,1000000);
 base.xp=clamp(Math.floor(num(raw.xp)),0,1000000);
 base.level=1+Math.floor(base.xp/100);
 base.completed=Array.isArray(raw.completed)?[...new Set(raw.completed.filter(v=>typeof v==='string'&&VALID_IDS.has(v)))]:[];
 base.position=clampPosition(raw.position);
 base.farmPlots=Array.isArray(raw.farmPlots)?Array.from({length:9},(_,i)=>clamp(Math.floor(num(raw.farmPlots[i])),0,4102444800000)):Array(9).fill(0);
 base.mode=['walk','drive'].includes(raw.mode)?raw.mode:'walk';
 base.time=clamp(num(raw.time,17.5),0,24);
 base.weather=['clear','rain','mist'].includes(raw.weather)?raw.weather:'clear';
 base.season=['spring','summer','autumn','winter'].includes(raw.season)?raw.season:'summer';
 base.pet=raw.pet!==false;base.muted=raw.muted===true;base.homestead=raw.homestead===true;
 base.scoutBond=clamp(Math.floor(num(raw.scoutBond)),0,100);
 base.scoutLastRewardAt=clamp(Math.floor(num(raw.scoutLastRewardAt)),0,4102444800000);
 base.countyRegion=VALID_REGIONS.has(raw.countyRegion)?raw.countyRegion:'mount-vernon';
 base.countyVisited=Array.isArray(raw.countyVisited)?
  [...new Set(raw.countyVisited.filter(id=>VALID_REGIONS.has(id)))]:['mount-vernon'];
 if(!base.countyVisited.includes('mount-vernon'))base.countyVisited.unshift('mount-vernon');
 base.worldSimulation=cleanWorldSimulation(raw.worldSimulation,base.weather,base.season,base.countyRegion);
 base.lastMeal=Object.prototype.hasOwnProperty.call(RECIPES,raw.lastMeal)?raw.lastMeal:null;
 return base;
}
function gainReward(raw,coins=0,xp=0){
 const s=validateSave(raw);
 s.coins=clamp(s.coins+Math.max(0,Math.floor(num(coins))),0,1000000);
 s.xp=clamp(s.xp+Math.max(0,Math.floor(num(xp))),0,1000000);
 s.level=1+Math.floor(s.xp/100);
 return s;
}
function completeStop(raw,id,coins=0){
 let s=validateSave(raw);
 if(!VALID_IDS.has(id)||s.completed.includes(id)) return s;
 s=gainReward(s,coins,120); s.completed.push(id);
 return s;
}
function buildHomestead(raw){
 const s=validateSave(raw);
 if(s.homestead)return {save:s,result:'existing'};
 if(s.coins<250)return {save:s,result:'needs-coins'};
 s.coins-=250;s.homestead=true;
 return {save:s,result:'built'};
}
function farmAction(raw,index,now){
 let s=validateSave(raw);
 if(!Number.isInteger(index)||index<0||index>=9)return {save:s,result:'invalid'};
 now=Math.max(0,Math.floor(num(now)));
 const ready=s.farmPlots[index];
 if(ready===0){
   if(s.coins<15)return {save:s,result:'needs-coins'};
   s.coins-=15;s.farmPlots[index]=now+8000;
   return {save:s,result:'planted'};
 }
 if(now<ready)return {save:s,result:'growing'};
 s.farmPlots[index]=0;
 s=gainReward(s,45,45);s.inventory.corn=clamp(s.inventory.corn+1,0,9999);
 return {save:s,result:'harvested'};
}
function waterFarm(raw,now){
 const s=validateSave(raw);
 if(s.coins<20)return {save:s,result:'needs-coins'};
 if(!s.farmPlots.some(t=>t>now))return {save:s,result:'none'};
 s.coins-=20;
 s.farmPlots=s.farmPlots.map(t=>t>now?Math.max(now,t-5500):t);
 return {save:s,result:'watered'};
}
// Family-friendly fictional hunting target challenge; no real-world hunting rules implied.
function huntShot(raw,aim,target,now,expiresAt){
 let s=validateSave(raw);
 if(!Number.isFinite(now)||now>expiresAt)return {save:s,result:'expired'};
 if(!Number.isFinite(aim)||!Number.isFinite(target)||aim<0||aim>1||target<0||target>1||Math.abs(aim-target)>.125)return {save:s,result:'missed'};
 s=gainReward(s,35,60);s.inventory.game=clamp(s.inventory.game+1,0,9999);
 return {save:s,result:'hit'};
}
function landFish(raw,kind){
 let s=validateSave(raw);
 if(!['bluegill','channelCatfish','bass'].includes(kind))return {save:s,result:'invalid'};
 s=gainReward(s,30,55);s.inventory.fish=clamp(s.inventory.fish+1,0,9999);
 return {save:s,result:'caught'};
}
function fishReel(raw,biteAt,now,kind){
 let s=validateSave(raw);
 if(!['bluegill','channelCatfish','bass'].includes(kind))return {save:s,result:'invalid'};
 if(!Number.isFinite(now)||!Number.isFinite(biteAt))return {save:s,result:'invalid'};
 if(now<biteAt)return {save:s,result:'early'};
 if(now>biteAt+1100)return {save:s,result:'late'};
 return landFish(s,kind);
}
const RECIPES=Object.freeze({
 fishFry:{title:'Riverside Fish Fry',ingredients:{fish:1,corn:1},coins:75,xp:90},
 campStew:{title:'Campfire Game Stew',ingredients:{game:1,corn:1},coins:85,xp:100},
 cornSkillet:{title:'Country Corn Skillet',ingredients:{corn:2},coins:35,xp:55},
 riverChowder:{title:'Ohio River Chowder',ingredients:{fish:2,corn:1},coins:120,xp:135},
 harvestSoup:{title:'Harvest Garden Soup',ingredients:{corn:3},coins:50,xp:80},
 trailSupper:{title:'Explorer Trail Supper',ingredients:{game:1,fish:1},coins:115,xp:120}
});
function cookRecipe(raw,id){
 let s=validateSave(raw);const recipe=RECIPES[id];
 if(!recipe)return {save:s,result:'invalid'};
 if(Object.entries(recipe.ingredients).some(([k,n])=>s.inventory[k]<n))return {save:s,result:'ingredients'};
 for(const [k,n] of Object.entries(recipe.ingredients))s.inventory[k]-=n;
 s=gainReward(s,recipe.coins,recipe.xp);s.inventory.meals=clamp(s.inventory.meals+1,0,9999);s.lastMeal=id;
 return {save:s,result:'cooked'};
}
function visitCountyRegion(raw,id){
 let s=validateSave(raw);
 if(!VALID_REGIONS.has(id))return {save:s,result:'invalid'};
 const isNew=!s.countyVisited.includes(id);
 s.countyRegion=id;
 if(isNew){s.countyVisited.push(id);s=gainReward(s,35,45);}
 return {save:s,result:isNew?'discovered':'revisited'};
}
function sampleGrid(g,values,u,v){
 if(!g||!values||g.cols<2||g.rows<2||values.length<g.cols*g.rows)return NaN;
 u=clamp(num(u),0,1)*(g.cols-1);v=clamp(num(v),0,1)*(g.rows-1);
 let x=Math.floor(u), y=Math.floor(v),x1=Math.min(x+1,g.cols-1),y1=Math.min(y+1,g.rows-1);
 const h=(xx,yy)=>g.minFt+values[yy*g.cols+xx]*g.stepFt;
 let a=u-x,b=v-y;
 return (h(x,y)*(1-a)+h(x1,y)*a)*(1-b)+(h(x,y1)*(1-a)+h(x1,y1)*a)*b;
}
function formatTime(h){const hh=Math.floor(((h%24)+24)%24), m=Math.floor((h-Math.floor(h))*60);return `${(hh%12)||12}:${String(m).padStart(2,'0')} ${hh>=12?'PM':'AM'}`;}
return {LIMIT,STOPS,COUNTY_REGION_IDS,visitCountyRegion,clamp,clampPosition,safeName,freshSave,validateSave,advanceWorldClock,recordEnvironment,gainReward,completeStop,buildHomestead,farmAction,waterFarm,huntShot,fishReel,landFish,cookRecipe,RECIPES,sampleGrid,formatTime};
});
