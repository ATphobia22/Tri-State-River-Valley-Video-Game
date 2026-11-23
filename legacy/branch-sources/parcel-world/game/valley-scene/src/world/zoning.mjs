// Parcel-first deterministic town-game simulation. This is NOT a legal zoning or flood map.
export const ZONES=['NONE','R1','R2','R3','C','I','AG'];
const fields=['zone','zone_age','built','building_level','households','abandoned','bad_ticks','good_ticks'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ringContains(r,x,y){
  let yes=false;for(let i=0,j=r.length-1;i<r.length;j=i++){
    const a=r[i],b=r[j];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;
  }return yes;
}
export function containsLonLat(g,x,y){
  const polys=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
  return polys.some(r=>r.length&&ringContains(r[0],x,y)&&!r.slice(1).some(h=>ringContains(h,x,y)));
}
export function createZoningSimulator(fc,options={}){
  const storage=options.storage??(()=>{try{return localStorage;}catch{return null;}})();
  const key=options.key??'valley-zoning-v1';
  if(fc?.type!=='FeatureCollection'||!Array.isArray(fc.features))throw Error('Invalid parcel GeoJSON');
  const source=String(fc.properties?.snapshot_id||'unversioned'),base=new Map(),state=new Map();
  for(const f of fc.features){
    const id=String(f.id??f.properties?.objectid??'');
    if(!id||base.has(id))throw Error('Missing or duplicate parcel id');
    f.id=id;
    const p=f.properties||{};
    const s={zone:ZONES.includes(p.zone)?p.zone:'NONE',zone_age:0,built:!!p.built,
      building_level:p.built?1:0,households:0,abandoned:false,bad_ticks:0,good_ticks:0,
      road_access:p.road_access===true,floodplain:p.floodplain===true,
      levee_protected:p.levee_protected===true,water_available:p.water_available!==false,
      power_available:p.power_available!==false,sewer_available:p.sewer_available!==false};
    base.set(id,{...s});state.set(id,s);
  }
  try{
    const saved=JSON.parse(storage?.getItem(key)||'null');
    if(saved?.version===1&&saved.source===source&&Array.isArray(saved.changes)){
      for(const [id,diff] of saved.changes){
        const s=state.get(String(id));
        if(!s||!ZONES.includes(diff?.zone))continue;
        for(const k of fields)if(Object.prototype.hasOwnProperty.call(diff,k))s[k]=diff[k];
      }
    }
  }catch{/* Unavailable/invalid saves must not corrupt source data. */}
  let month=0;const cache=new Map();
  function save(){
    const changes=[];
    for(const [id,s] of state)if(fields.some(k=>s[k]!==base.get(id)[k]))
      changes.push([id,Object.fromEntries(fields.map(k=>[k,s[k]]))]);
    try{storage?.setItem(key,JSON.stringify({version:1,source,changes}));}catch{}
    return changes;
  }
  function score(id){
    const f=fc.features.find(f=>f.id===id),s=state.get(id);
    if(!f||!s)return 0;
    const pos=f.properties?.sim_center||[0,0];
    const cell=pos.map(a=>Math.floor(a/50)).join(':');
    if(!cache.has(cell))cache.set(cell,clamp(Math.round(78-Math.hypot(Math.floor(pos[0]/50)*50,Math.floor(pos[1]/50)*50)*.018),0,100));
    return clamp(cache.get(cell)+(s.road_access?8:-30)-(s.floodplain&&!s.levee_protected?40:0)
      +Number(f.properties?.game_services||0)-Number(f.properties?.game_pollution||0),0,100);
  }
  function service(s){return s.road_access&&(!s.floodplain||s.levee_protected)&&s.water_available&&s.power_available&&
    (!['R2','R3','C'].includes(s.zone)||s.sewer_available);}
  function paint(id,zone){
    if(!ZONES.includes(zone))throw Error('Invalid game zone');
    const s=state.get(String(id));if(!s)return false;s.zone=zone;s.zone_age=0;save();return true;
  }
  function bulldoze(id){
    const s=state.get(String(id));if(!s)return false;
    Object.assign(s,{built:false,building_level:0,households:0,abandoned:false,bad_ticks:0,good_ticks:0});
    save();return true;
  }
  function advanceMonth(demand={residential:2,commercial:0,industrial:0}){
    month++;cache.clear();
    for(const [id,s] of state){
      if(s.zone!=='NONE')s.zone_age++;
      if(s.built&&!s.abandoned){
        s.good_ticks=score(id)>70&&service(s)?s.good_ticks+1:0;
        s.bad_ticks=score(id)<30?s.bad_ticks+1:0;
        if(s.bad_ticks>=5){s.abandoned=true;s.households=0;}
        else if(s.good_ticks>=10&&s.building_level<5){s.building_level++;s.good_ticks=0;}
      }
    }
    const grown=[];
    for(const category of ['residential','commercial','industrial']){
      const kind=z=>z.startsWith('R')?'residential':z==='C'?'commercial':z==='I'||z==='AG'?'industrial':null;
      const ids=[...state.keys()].filter(id=>{const s=state.get(id);return !s.built&&s.zone_age>0&&kind(s.zone)===category&&service(s);})
        .sort((a,b)=>score(b)-score(a)||a.localeCompare(b));
      for(const id of ids.slice(0,clamp(Math.floor(Number(demand[category])||0),0,category==='residential'?3:1))){
        const s=state.get(id);Object.assign(s,{built:true,building_level:1,abandoned:false,
          households:s.zone==='R1'?1:s.zone==='R2'?2:s.zone==='R3'?4:0});grown.push(id);
      }
    }
    save();return grown;
  }
  function findLocal(x,z,manifest){
    const lon=manifest.origin[0]+x/manifest.metresPerDegree[0],lat=manifest.origin[1]-z/manifest.metresPerDegree[1];
    return fc.features.find(f=>containsLonLat(f.geometry,lon,lat))||null;
  }
  return {collection:fc,source,state,base,score,paint,bulldoze,advanceMonth,findLocal,save,get month(){return month;}};
}
