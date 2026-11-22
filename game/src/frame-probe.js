/* Frame timing recorder for physical-device QA, no analytics/network/upload.
 * Collect bounded rolling samples, export JSON on explicit user action. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyFrameProbe=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const percent=(sorted,p)=>sorted.length?sorted[Math.max(0,Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1))]:null;
function create({capacity=3600}={}){
 if(!Number.isInteger(capacity)||capacity<30||capacity>36000)throw RangeError('Invalid frame sample capacity');
 const frames=[];let startedAt=null,lastStamp=null;
 function observe(ms,{stamp=0,drawCalls=0,triangles=0}={}){
  if(!Number.isFinite(ms)||ms<1||ms>250||!Number.isFinite(stamp))return;
  if(lastStamp!==null&&(stamp<=lastStamp||stamp-lastStamp>3000)){lastStamp=stamp;return;}
  lastStamp=stamp;if(startedAt===null)startedAt=stamp;
  if(frames.length>=capacity)frames.shift();
  frames.push({ms:Number(ms.toFixed(3)),drawCalls:Math.max(0,Math.floor(drawCalls)||0),triangles:Math.max(0,Math.floor(triangles)||0)});
 }
 function summary(){
  if(!frames.length)return {samples:0,medianFPS:null,p95FrameMs:null,p99FrameMs:null,worstFrameMs:null,meanFPS:null,drawCallsMax:0,trianglesMax:0};
  const sorted=frames.map(s=>s.ms).sort((a,b)=>a-b),avg=frames.reduce((a,b)=>a+b.ms,0)/frames.length;
  return {samples:frames.length,medianFPS:Number((1000/percent(sorted,.5)).toFixed(2)),meanFPS:Number((1000/avg).toFixed(2)),
   p95FrameMs:percent(sorted,.95),p99FrameMs:percent(sorted,.99),worstFrameMs:sorted[sorted.length-1],
   drawCallsMax:Math.max(...frames.map(x=>x.drawCalls)),trianglesMax:Math.max(...frames.map(x=>x.triangles))};
 }
 function report({renderer=null,viewport=null,mode=null,quality=null,userAgent=null}={}){
  return {schema:'river-valley-device-benchmark/v1',capturedAt:new Date().toISOString(),
   userAgent:typeof userAgent==='string'?userAgent:null,renderer:renderer||'unknown',viewport:viewport||null,
   mode:mode||null,quality:quality||null,summary:summary(),units:{frame:'ms',triangle:'triangles',draw:'calls'},
   caveat:'Actual frame samples only; browser and OS may throttle. No inferred GPU memory or physical hardware certification.'};
 }
 function reset(){frames.length=0;startedAt=null;lastStamp=null;}
 return {observe,summary,report,reset};
}
return Object.freeze({create});
});