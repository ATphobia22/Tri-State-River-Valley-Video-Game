/* Deterministic offline parcel-based town growth. GAME SIMULATION, not legal zoning.
 * Distances use scene-local approximate metres. No network, real property values,
 * utility guarantees, floodplain clearance or legal land-use determinations.
 */
'use strict';
const ZONES=Object.freeze(['R1','R2','R3','C','I','AG','NONE']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,otherwise=0)=>typeof n==='number'&&Number.isFinite(n)?n:otherwise;
const capacity=(p)=>p.built&&!p.abandoned?({R1:1,R2:2,R3:3}[p.zone]||0)*p.building_level:0;
function requireZone(zone){if(!ZONES.includes(zone))throw new RangeError('Unsupported game zone: '+String(zone));}
function isVerified(value){return value===true||value==='CONNECTED'||value==='VERIFIED'||value==='YES';}
function hazardous(p){return ['SFHA','FLOODWAY','HIGH','AE','A','VE'].includes(p.flood_status);}
function isEligible(p,{scenarioMode=false}={}){
 if(!p.road_access_estimate||p.zone==='NONE'||p.built)return false;
 if(hazardous(p)&&p.levee_protection!=='VERIFIED')return false;
 if(!hazardous(p)&&p.flood_status!=='CLEAR_VERIFIED'&&!scenarioMode)return false;
 const needed=p.zone==='AG'?[]:(p.zone==='R1'?['water','power']:['water','power','sewer']);
 return needed.every(key=>isVerified(p.utilities?.[key])||(scenarioMode&&p.utilities?.[key]==='UNKNOWN'));
}
function makeFieldSampler({industry=[],schools=[],clinics=[],police=[],fire=[],jobs=[],farms=[],parks=[],highways=[]}={}){
 const cache=new Map();
 const point=(p)=>[finite(p.x),finite(p.z),clamp(finite(p.strength,1),0,5)];
 const dist=(p,x,z)=>Math.hypot(p[0]-x,p[1]-z);
 const near=(sources,x,z,radius,value)=>{
  let best=0;for(const s of sources){const p=point(s),d=dist(p,x,z);best=Math.max(best,value*p[2]*clamp(1-d/radius,0,1));}return best;
 };
 function sample(x,z){
  const cx=Math.floor(finite(x)/50),cz=Math.floor(finite(z)/50),key=cx+':'+cz;
  if(cache.has(key))return cache.get(key);
  const px=(cx+.5)*50,pz=(cz+.5)*50;
  const pollution=[...industry,...highways,...farms.filter(f=>f.polluting===true)].reduce((sum,s)=>{
   const [sx,sz,strength]=point(s),d=Math.hypot(sx-px,sz-pz);
   return sum+45*strength*(d<=300?1:d>=1000?0:(1000-d)/700);
  },0);
  const service=near(schools,px,pz,1600,6)+near(clinics,px,pz,2000,5)+near(police,px,pz,1800,4)+near(fire,px,pz,1500,6);
  const employment=near(jobs,px,pz,2000,7)+near(industry,px,pz,1900,5)+near(farms,px,pz,2300,4);
  const amenities=near(parks,px,pz,1200,9)+near(schools,px,pz,1350,3);
  const val=Object.freeze({pollution:Number(pollution.toFixed(3)),services:Number(service.toFixed(3)),
    jobs:Number(employment.toFixed(3)),amenities:Number(amenities.toFixed(3))});
  cache.set(key,val);return val;
 }
 sample.stats=()=>({cells:cache.size,cellSizeMetres:50});
 return sample;
}
function desire(p,field,scenarioMode=false){
 const [x,z]=p.center_local_m||[0,0],e=field(x,z);
 let score=55+(p.road_access_estimate?8:-25)+e.services+e.jobs*.65+e.amenities-e.pollution;
 if(hazardous(p))score-=45;
 if(p.flood_status!=='CLEAR_VERIFIED'&&!hazardous(p)&&!scenarioMode)score-=6;
 if(!scenarioMode&&p.zone!=='AG'){
  for(const key of ['water','power'])if(!isVerified(p.utilities?.[key]))score-=5;
  if(['R2','R3','C','I'].includes(p.zone)&&!isVerified(p.utilities?.sewer))score-=5;
 }
 if(p.zone==='R1'&&e.pollution>10)score-=8;
 return Math.round(clamp(score,0,100));
}
function create({features,scenarioMode=false,environment={}}={}){
 if(!Array.isArray(features)||!features.length)throw new Error('Nonempty real or fixture parcel features required');
 const source=new Map(),state=new Map();
 const clone=p=>({...p,utilities:{...p.utilities},center_local_m:[...p.center_local_m]});
 for(const feature of features){
  const props=feature.properties||{},id=String(props.parcel_id||feature.id||'');
  if(!id||id==='__proto__'||source.has(id))throw Error('Duplicate or invalid parcel id');
  requireZone(props.zone);
  const p={id,zone:props.zone,zone_age:Math.max(0,Math.floor(finite(props.zone_age))),
   built:props.built===true,building_level:clamp(Math.floor(finite(props.building_level)),0,5),
   households:Math.max(0,Math.floor(finite(props.households))),desirability:clamp(finite(props.desirability,50),0,100),
   abandoned:props.abandoned===true,road_access_estimate:props.road_access_estimate===true,
   flood_status:props.flood_status||'UNKNOWN',levee_protection:props.levee_protection||'NOT_VERIFIED',
   utilities:{...props.utilities},center_local_m:Array.isArray(props.center_local_m)?props.center_local_m.map(x=>finite(x)).slice(0,2):[0,0],
   area_m2:Math.max(0,finite(props.area_m2)),highWeeks:0,lowWeeks:0};
  if(!p.built){p.building_level=0;p.households=0;}
  source.set(id,clone(p));state.set(id,p);
 }
 let weekNow=0;
 let useScenario=scenarioMode===true;
 const fields=makeFieldSampler(environment);
 const getInternal=id=>{const p=state.get(String(id));if(!p)throw Error('Unknown parcel '+String(id));return p;};
 function get(id){return clone(getInternal(id));}
 function paint(id,zone){
  requireZone(zone);const p=getInternal(id);
  p.zone=zone;p.zone_age=0;p.highWeeks=0;p.lowWeeks=0;
  if(p.built)p.households=Math.min(p.households,capacity(p));
  return get(id);
 }
 function bulldoze(id){
  const p=getInternal(id);p.built=false;p.abandoned=false;p.building_level=0;p.households=0;
  p.highWeeks=0;p.lowWeeks=0;return get(id);
 }
 function calcDemand(demand,zone){
  if(['R1','R2','R3'].includes(zone))return finite(demand.residential);
  if(zone==='C')return finite(demand.commercial);
  if(zone==='I')return finite(demand.industrial);
  if(zone==='AG')return finite(demand.agricultural);
  return 0;
 }
 function archetype(p){return p.zone==='AG'?'existing-farm-proxy':p.zone==='C'?'existing-downtown-proxy':
  p.zone==='I'?'existing-industrial-proxy':p.zone==='R3'?'existing-multifamily-proxy':'existing-residential-proxy';}
 function tick({week=weekNow+1,demand={},scoreOverride}={}){
  const next=Math.floor(finite(week));if(next<=weekNow)return [];
  if(next>weekNow+1)throw Error('Advance game week sequentially; cannot skip simulation without replay');
  weekNow=next;const events=[];
  for(const p of state.values()){
   p.zone_age++;
   p.desirability=typeof scoreOverride==='function'?
    Math.round(clamp(finite(scoreOverride(get(p.id)),p.desirability),0,100)):desire(p,fields,useScenario);
   if(!p.built)continue;
   const serviceOk=(p.zone==='NONE'||isEligible({...p,built:false},{scenarioMode:useScenario}));
   if(p.desirability<30){p.lowWeeks++;p.highWeeks=0;}
   else if(p.desirability>70&&serviceOk&&!p.abandoned){p.highWeeks++;p.lowWeeks=0;}
   else{p.highWeeks=0;p.lowWeeks=0;}
   if(!p.abandoned&&(p.lowWeeks>=5||calcDemand(demand,p.zone)<-75&&p.desirability<35)){
    p.abandoned=true;p.households=0;events.push({type:'abandon',parcelId:p.id,week:weekNow});continue;
   }
   if(!p.abandoned&&p.highWeeks>=10&&p.building_level<5){
    p.building_level++;p.highWeeks=0;p.households=Math.min(capacity(p),p.households+1);
    events.push({type:'level',parcelId:p.id,level:p.building_level,week:weekNow});
   }
  }
  // One allocation opportunity per four weeks. It is not per-render-frame RNG.
  if(weekNow%4===0){
   const candidates=[...state.values()].filter(p=>p.zone_age>=1&&isEligible(p,{scenarioMode:useScenario})&&
     p.desirability>=60&&calcDemand(demand,p.zone)>0).sort((a,b)=>b.desirability-a.desirability||a.id.localeCompare(b.id,'en',{numeric:true}));
   const selected=candidates[0];
   if(selected){
    selected.built=true;selected.building_level=1;selected.abandoned=false;
    selected.households=Math.min(3,capacity(selected));
    events.push({type:'growth',parcelId:selected.id,zone:selected.zone,
     archetype:archetype(selected),newHouseholds:selected.households,week:weekNow});
   }
  }
  return events;
 }
 function snapshot(){
  const values=[...state.values()];
  return Object.freeze({week:weekNow,total:values.length,built:values.filter(p=>p.built).length,
    abandoned:values.filter(p=>p.abandoned).length,
    households:values.reduce((n,p)=>n+p.households,0),scenarioMode:useScenario,
    cacheCells:fields.stats().cells});
 }
 const SAVE_FIELDS=['zone','built','building_level','abandoned'];
 function exportDiffs(){
  const parcels=Object.create(null);
  for(const [id,p] of state){const original=source.get(id);
   if(SAVE_FIELDS.some(key=>p[key]!==original[key])){
    parcels[id]={zone:p.zone,built:p.built,building_level:p.building_level,abandoned:p.abandoned};
   }
  }
  return {schemaVersion:1,week:weekNow,parcels};
 }
 function importDiffs(data){
  if(!data||data.schemaVersion!==1||!data.parcels||typeof data.parcels!=='object')throw Error('Invalid game zoning save');
  for(const [id,record] of Object.entries(data.parcels)){
   if(!state.has(id)||!record||typeof record!=='object')continue;
   if(!ZONES.includes(record.zone)||typeof record.built!=='boolean'||typeof record.abandoned!=='boolean'||
    !Number.isInteger(record.building_level)||record.building_level<0||record.building_level>5)continue;
   const p=state.get(id);
   p.zone=record.zone;p.built=record.built;p.building_level=p.built?Math.max(1,record.building_level):0;
   p.abandoned=p.built&&record.abandoned;p.households=p.abandoned?0:Math.min(p.households,capacity(p));
   p.highWeeks=0;p.lowWeeks=0;
  }
  weekNow=Math.max(0,Math.min(1_000_000,Math.floor(finite(data.week))));
 }
 function setScenarioMode(enabled){useScenario=enabled===true;return useScenario;}
 return Object.freeze({get,paint,bulldoze,tick,snapshot,exportDiffs,importDiffs,setScenarioMode,
  list:()=>[...state.values()].map(p=>clone(p)),fieldStats:()=>fields.stats()});
}
module.exports=Object.freeze({ZONES,isEligible,makeFieldSampler,desire,create});
