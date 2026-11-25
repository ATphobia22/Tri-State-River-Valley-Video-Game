/* Frame-budgeted terrain-LOD staging.
 * Build new leaf meshes in bounded batches, then perform ONE complete swap.
 * Old tiles stay visible until all new tiles are ready; no partial terrain.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValleyLODTransition=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function create({makeMesh,commit,dispose,batchSize=12,now=()=>performance.now()}={}){
  if(typeof makeMesh!=='function'||typeof commit!=='function'||typeof dispose!=='function')throw new TypeError('LOD transition callbacks required');
  if(!Number.isInteger(batchSize)||batchSize<1||batchSize>512)throw new RangeError('invalid mesh batch size');
  let pending=null,activeSignature='',cancelled=0,swapped=0,lastSliceMs=0,budgetYields=0,peakSliceMs=0,lastCommitMs=0;
  function cancel(){
   if(!pending)return false;
   dispose(pending.meshes);pending=null;cancelled++;return true;
  }
  function schedule({signature,leaves,index},immediate=false){
   if(typeof signature!=='string'||!signature||!Array.isArray(leaves)||!leaves.length)throw new TypeError('Invalid LOD job');
   if(signature===activeSignature){cancel();return false;}
   if(pending&&signature===pending.signature){
    if(!immediate)return false;
    while(pending)pump(512);
    return true;
   }
   cancel();
   pending={signature,leaves,index,meshes:[],offset:0};
   if(immediate)while(pending)pump(512);
   return true;
  }
  function pump(limit=batchSize,budgetMs=Infinity){
   if(!pending)return {built:0,complete:false};
   const job=pending,allowed=Number.isFinite(limit)?Math.min(512,Math.max(1,Math.floor(limit))):batchSize;
   const start=now(),deadline=start+(Number.isFinite(budgetMs)?Math.max(0,budgetMs):Infinity);
   let built=0;
   try{
    while(job.offset<job.leaves.length&&built<allowed&&(built===0||now()<deadline)){
     job.meshes.push(makeMesh(job.leaves[job.offset],job.index));job.offset++;built++;
    }
   }catch(error){cancel();throw error;}
   lastSliceMs=Math.max(0,now()-start);peakSliceMs=Math.max(peakSliceMs,lastSliceMs);
   if(job.offset!==job.leaves.length){if(built<allowed&&now()>=deadline)budgetYields++;return {built,complete:false};}
   pending=null;activeSignature=job.signature;swapped++;
   const commitStart=now();commit(job);lastCommitMs=Math.max(0,now()-commitStart);
   return {built,complete:true};
  }
  function status(){return {pending:!!pending,queued:pending?pending.leaves.length-pending.offset:0,built:pending?pending.offset:0,swapped,cancelled,signature:activeSignature,lastSliceMs,peakSliceMs,budgetYields,lastCommitMs};}
  return Object.freeze({cancel,schedule,pump,status,pendingMeshes:()=>pending?pending.meshes.slice():[]});
 }
 return Object.freeze({create});
});
