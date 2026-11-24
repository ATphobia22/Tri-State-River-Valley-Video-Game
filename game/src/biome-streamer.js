/* Deterministic, frame-budgeted foliage CELLS for the fictional River Valley.
 * No network, no geodata dependency, no per-frame geometry allocation.
 * The game renders active descriptors with a fixed number of InstancedMesh batches.
 * Online (navigator.onLine) raises load/unload radii and tree capacity for denser cinematic foliage.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValleyBiomeStreamer=api;
})(typeof globalThis==='object'?globalThis:this,function biomeFactory(){
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
  if(z<-420)return 'ridge';
  return Math.abs(((x*0.011)%1+1)%1-0.5)+Math.abs(((z*0.009)%1+1)%1-0.5)<0.34?'oak-grove':'meadow';
 }
 function inRiver(x,z){return z>820&&Math.abs(x)<1180;}
 function makeCell(ix,iz,{cellSize=240,limit=2200,stops=[],seed=47620}={}){
  const rand=()=>{
   const h=hash(ix,iz,seed+(makeCell._n=(makeCell._n|0)+1));
   return (h%10000)/10000;
  };
  makeCell._n=0;
  const type=biome((ix+.5)*cellSize,(iz+.5)*cellSize);
  const density=type==='oak-grove'?18:type==='riverbank'?11:type==='town'?6:12;
  const out=[];
  for(let n=0;n<density;n++){
   const x=(ix+rand())*cellSize,z=(iz+rand())*cellSize;
   if(Math.abs(x)>limit||Math.abs(z)>limit||inRiver(x,z))continue;
   if(type==='town'&&Math.abs(x)<170&&z>-350&&z<840)continue;
   if(stops.some(s=>Math.hypot(x-s.x,z-s.z)<105))continue;
   const shoreline=z>730,kind=shoreline&&rand()<.77?1:rand()<(type==='oak-grove'?.8:.70)?0:2;
   out.push({id:ix+':'+iz+':'+n,x,z,kind,size:7+rand()*8,biome:type});
  }
  return out;
 }
 function create({cellSize=240,loadRadius=(typeof navigator!=='undefined'&&navigator.onLine)?1100:860,unloadRadius=(typeof navigator!=='undefined'&&navigator.onLine)?1400:1060,maxTrees=(typeof navigator!=='undefined'&&navigator.onLine)?1200:800,limit=2200,stops=[],seed=47620}={}){
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
    if(Math.hypot((ix+.5)*cellSize-focusX,(iz+.5)*cellSize-focusZ)>unloadRadius+cellSize){
     cache.delete(id);evicted++;
    }
   }
   const nowSig=sig(),coordsBucket=Math.floor(x/70)+':'+Math.floor(z/70);
   const signature=nowSig+'|'+coordsBucket;
   const trees=[...cache.values()].flat().sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z)||a.id.localeCompare(b.id)).slice(0,maxTrees);
   const changed=signature!==lastSignature;
   lastSignature=signature;lastTrees=trees;lastCount=trees.length;
   return {changed,trees,stats:snapshot()};
  }
  function snapshot(){return {loadedCells:cache.size,generatedCells:generated,evictedCells:evicted,trees:lastCount,capacity:maxTrees,cellSize,loadRadius,online:typeof navigator!=='undefined'&&navigator.onLine===true};}
  return {update,snapshot};
 }
 const seasonPalette=Object.freeze({
  spring:['#3f7a3a','#6a9c4a','#c9d47a'],
  summer:['#2f6b32','#4f8f3d','#a7c26a'],
  autumn:['#8a5a22','#c47a2e','#e0b34a'],
  winter:['#6a7a6a','#9aa89a','#d0d6d0']
 });
 return Object.freeze({biomeFactory,hash,biome,inRiver,makeCell,create,seasonPalette});
});
