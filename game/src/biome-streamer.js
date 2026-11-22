/* Deterministic, frame-budgeted foliage CELLS for the fictional River Valley.
 * No network, no geodata dependency, no per-frame geometry allocation.
 * The game renders active descriptors with a fixed number of InstancedMesh batches.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValleyBiomeStreamer=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function hash(a,b,seed=47620){
  let x=Math.imul(a|0,73856093)^Math.imul(b|0,19349663)^Math.imul(seed|0,83492791);
  x=Math.imul(x^(x>>>16),0x85ebca6b);
  x=Math.imul(x^(x>>>13),0xc2b2ae35);
  return (x^(x>>>16))>>>0;
 }
 function biome(x,z){
  if(z>790)return 'riverbank';
  if(Math.hypot(x-92,z-465)<750)return 'town';
  if(Math.hypot(x+740,z+210)<540)return 'oak-grove';
  return 'countryside';
 }
 function inRiver(x,z){
  const bank=1200+125*Math.sin(x/550)+65*Math.cos(x/175);
  return z>bank-22;
 }
 function makeCell(ix,iz,{cellSize=240,limit=2200,stops=[],seed=47620}={}){
  const cellX=(ix+.5)*cellSize,cellZ=(iz+.5)*cellSize;
  if(Math.abs(cellX)>limit+cellSize||Math.abs(cellZ)>limit+cellSize)return [];
  let state=hash(ix,iz,seed),id=ix+':'+iz;
  const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const type=biome(cellX,cellZ);
  const count=type==='town'?5:type==='oak-grove'?21:type==='riverbank'?13:11;
  const out=[];
  for(let n=0;n<count;n++){
   const x=(ix+rand())*cellSize,z=(iz+rand())*cellSize;
   if(Math.abs(x)>limit||Math.abs(z)>limit||inRiver(x,z))continue;
   if(type==='town'&&Math.abs(x)<170&&z>-350&&z<840)continue;
   if(stops.some(s=>Math.hypot(x-s.x,z-s.z)<105))continue;
   const shoreline=z>730,kind=shoreline&&rand()<.77?1:rand()<(type==='oak-grove'?.8:.70)?0:2;
   out.push({id:id+':'+n,x,z,kind,size:7+rand()*8,biome:type});
  }
  return out;
 }
 function create({cellSize=240,loadRadius=860,unloadRadius=1060,maxTrees=800,limit=2200,stops=[],seed=47620}={}){
  if(!(Number.isFinite(cellSize)&&cellSize>=100&&cellSize<=700))throw new RangeError('invalid cellSize');
  if(!(loadRadius>=cellSize&&unloadRadius>=loadRadius&&unloadRadius<=2500))throw new RangeError('invalid radii');
  if(!(Number.isInteger(maxTrees)&&maxTrees>=16&&maxTrees<=5000))throw new RangeError('invalid tree capacity');
  const cache=new Map(), radiusCells=Math.ceil(loadRadius/cellSize)+1;
  let lastCount=0,generated=0,evicted=0,lastSignature='',lastTrees=[];
  const sig=()=>[...cache.keys()].sort().join('|');
  function update(x,z,{heading=0,speed=0,maxNewCells=3}={}){
   if(!Number.isFinite(x)||!Number.isFinite(z))return {changed:false,trees:lastTrees,stats:snapshot()};
   const ahead=clamp(speed,0,230)*.35;
   const focusX=clamp(x-Math.sin(heading)*ahead,-limit,limit);
   const focusZ=clamp(z-Math.cos(heading)*ahead,-limit,limit);
   const cx=Math.floor(focusX/cellSize),cz=Math.floor(focusZ/cellSize);
   const candidates=[];
   for(let dz=-radiusCells;dz<=radiusCells;dz++)for(let dx=-radiusCells;dx<=radiusCells;dx++){
    const ix=cx+dx,iz=cz+dz,mx=(ix+.5)*cellSize,mz=(iz+.5)*cellSize;
    const dist=Math.hypot(mx-focusX,mz-focusZ);
    if(dist<=loadRadius+cellSize*.7)candidates.push({ix,iz,id:ix+':'+iz,dist});
   }
   candidates.sort((a,b)=>a.dist-b.dist||a.id.localeCompare(b.id));
   let created=0;
   for(const candidate of candidates){
    if(created>=clamp(Math.floor(maxNewCells),0,120))break;
    if(cache.has(candidate.id))continue;
    cache.set(candidate.id,makeCell(candidate.ix,candidate.iz,{cellSize,limit,stops,seed}));created++;generated++;
   }
   for(const id of cache.keys()){
    const [ix,iz]=id.split(':').map(Number);
    // Keep a hysteresis band to avoid cell thrash at a grid boundary.
    if(Math.hypot((ix+.5)*cellSize-focusX,(iz+.5)*cellSize-focusZ)>unloadRadius+cellSize){
     cache.delete(id);evicted++;
    }
   }
   const nowSig=sig(),coordsBucket=Math.floor(x/70)+':'+Math.floor(z/70);
   const signature=nowSig+'|'+coordsBucket;
   if(signature===lastSignature)return {changed:false,trees:lastTrees,stats:snapshot()};
   lastSignature=signature;
   const trees=[...cache.values()].flat().sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z)||a.id.localeCompare(b.id)).slice(0,maxTrees);
   lastTrees=trees;lastCount=trees.length;
   return {changed:true,trees,stats:snapshot()};
  }
  function snapshot(){return {loadedCells:cache.size,generatedCells:generated,evictedCells:evicted,trees:lastCount,capacity:maxTrees,cellSize,loadRadius};}
  return Object.freeze({update,snapshot});
 }
 const seasonPalette=Object.freeze({
  spring:[0x4b7d4b,0x6d995c,0x3f7050],summer:[0x326441,0x54834b,0x31573f],
  autumn:[0xa46b38,0xd39a4b,0x718050],winter:[0x7f9290,0x879b99,0x496b68]
 });
 return Object.freeze({hash,biome,inRiver,makeCell,create,seasonPalette});
});
