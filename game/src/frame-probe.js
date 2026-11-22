/* Bounded, local-only device frame evidence. v1 JSON fields remain backwards compatible.
 * Scene/mode/quality cohorts and event markers help distinguish animation hitches
 * from terrain swaps, building detail, and browser scheduling without claiming GPU timings.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyFrameProbe=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const percent=(sorted,p)=>sorted.length?sorted[Math.max(0,Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1))]:null;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const safeText=(x,max=36)=>typeof x==='string'?x.replace(/[^a-z0-9 -]/gi,'').slice(0,max):null;
function create({capacity=3600,eventCapacity=96}={}){
 if(!Number.isInteger(capacity)||capacity<30||capacity>36000)throw RangeError('Invalid frame sample capacity');
 if(!Number.isInteger(eventCapacity)||eventCapacity<8||eventCapacity>500)throw RangeError('Invalid event capacity');
 const frames=[],events=[];let startedAt=null,lastStamp=null;
 function observe(ms,{stamp=0,drawCalls=0,triangles=0,x=null,z=null,scene=null,mode=null,quality=null,terrainTiles=null,terrainQueued=null}={}){
  if(!finite(ms)||ms<1||ms>250||!finite(stamp))return;
  if(lastStamp!==null&&(stamp<=lastStamp||stamp-lastStamp>3000)){lastStamp=stamp;return;}
  lastStamp=stamp;if(startedAt===null)startedAt=stamp;
  if(frames.length>=capacity)frames.shift();
  frames.push({ms:Number(ms.toFixed(3)),stamp:Number(stamp.toFixed(1)),drawCalls:Math.max(0,Math.floor(drawCalls)||0),
   triangles:Math.max(0,Math.floor(triangles)||0),x:finite(x)?Number(x.toFixed(1)):null,z:finite(z)?Number(z.toFixed(1)):null,
   scene:safeText(scene),mode:safeText(mode),quality:safeText(quality),terrainTiles:finite(terrainTiles)?Math.max(0,Math.floor(terrainTiles)):null,
   terrainQueued:finite(terrainQueued)?Math.max(0,Math.floor(terrainQueued)):null});
 }
 function compute(arr){
  if(!arr.length)return {samples:0,medianFPS:null,p95FrameMs:null,p99FrameMs:null,worstFrameMs:null,meanFPS:null,drawCallsMax:0,trianglesMax:0};
  const sorted=arr.map(s=>s.ms).sort((a,b)=>a-b),avg=arr.reduce((a,b)=>a+b.ms,0)/arr.length;
  return {samples:arr.length,medianFPS:Number((1000/percent(sorted,.5)).toFixed(2)),meanFPS:Number((1000/avg).toFixed(2)),
   p95FrameMs:percent(sorted,.95),p99FrameMs:percent(sorted,.99),worstFrameMs:sorted[sorted.length-1],
   drawCallsMax:Math.max(...arr.map(x=>x.drawCalls)),trianglesMax:Math.max(...arr.map(x=>x.triangles))};
 }
 function summary(){return compute(frames)}
 function mark(type,{stamp=0,x=null,z=null,ms=null,tiles=null,detailBuildings=null}={}){
  const name=safeText(type,50);if(!name)return;
  if(events.length>=eventCapacity)events.shift();
  events.push({event:name,stamp:finite(stamp)?Number(stamp.toFixed(1)):null,
   x:finite(x)?Number(x.toFixed(1)):null,z:finite(z)?Number(z.toFixed(1)):null,
   durationMs:finite(ms)?Number(ms.toFixed(2)):null,tiles:finite(tiles)?Math.floor(tiles):null,
   detailBuildings:finite(detailBuildings)?Math.floor(detailBuildings):null});
 }
 function cohorts(){
  const grouped=new Map();
  for(const f of frames){const key=[f.scene||'unclassified',f.mode||'unknown',f.quality||'unknown'].join('|');
   if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(f);
  }
  return [...grouped].map(([name,group])=>{const [scene,mode,quality]=name.split('|');
   return {scene,mode,quality,...compute(group)};}).sort((a,b)=>b.samples-a.samples);
 }
 function report({renderer=null,viewport=null,mode=null,quality=null,userAgent=null}={}){
  const worstFrames=frames.filter(f=>f.ms>=33).sort((a,b)=>b.ms-a.ms).slice(0,24);
  return {schema:'river-valley-device-benchmark/v1',capturedAt:new Date().toISOString(),
   userAgent:typeof userAgent==='string'?userAgent:null,renderer:renderer||'unknown',viewport:viewport||null,
   mode:mode||null,quality:quality||null,summary:summary(),
   diagnostics:{scenes:cohorts(),slowFrameThresholdMs:33,slowFrameCount:frames.filter(f=>f.ms>=33).length,
    slowFrames:worstFrames,events:events.slice(),startStamp:startedAt,finalStamp:lastStamp},
   units:{frame:'ms',triangle:'triangles',draw:'calls'},
   caveat:'Measured browser frame intervals and render counts, not GPU timers. Event correlations are observational. Mobile browser and OS may throttle. No inferred GPU memory or hardware certification.'};
 }
 function reset(){frames.length=0;events.length=0;startedAt=null;lastStamp=null;}
 return {observe,mark,summary,cohorts,report,reset};
}
return Object.freeze({create});
});
