/* Online-first frame-budget governor; offline is the backup path.
 * When online: cinematic tile density (Slow Roads–style seamless streaming).
 * When offline: reduced budgets so the single-file offline HTML still runs.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValleyStreamingPolicy=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const TARGETS=Object.freeze({desktop:30,mobile:30});
  function isOnline(){
    try{return typeof navigator!=='undefined'&&navigator.onLine===true;}
    catch(_){return false;}
  }
  function lookAheadDistance(speed,estimatedPrepMs=600,nearDistance=80){
    const v=Number.isFinite(speed)?clamp(speed,0,450):0;
    const prep=Number.isFinite(estimatedPrepMs)?clamp(estimatedPrepMs,0,1400):600;
    const near=Number.isFinite(nearDistance)?clamp(nearDistance,0,280):80;
    const boost=isOnline()?1.55:1;
    return Math.min(420,(near+v*prep/1000)*boost);
  }
  function createGovernor({maxTiles=200,minTiles=80,targetFPS=30,preferOnline=true}={}){
    if(!(Number.isFinite(maxTiles)&&Number.isFinite(minTiles)&&minTiles>=24&&maxTiles>=minTiles&&maxTiles<=500))
      throw new RangeError('Invalid terrain tile budget limits');
    if(!(Number.isFinite(targetFPS)&&targetFPS>=15&&targetFPS<=120))
      throw new RangeError('Invalid target frame rate');
    const limit=()=>preferOnline&&isOnline()?Math.max(Math.floor(minTiles),Math.min(480,Math.floor(maxTiles*1.6))):Math.floor(maxTiles);
    let effectiveMax=limit();
    const effectiveMin=Math.floor(minTiles);
    const targetFrameMs=1000/targetFPS;
    let tiles=effectiveMax,ema=null,slow=0,fast=0,lastChangeAt=-Infinity,lastObservedAt=-Infinity,validFrames=0;
    function observe(frameMs,stampMs){
      const previous=tiles;
      effectiveMax=limit();
      tiles=Math.min(tiles,effectiveMax);
      const unchanged=()=>({changed:tiles!==previous,budget:tiles,averageFrameMs:ema,online:isOnline()});
      if((typeof document!=='undefined'&&document.hidden)||!Number.isFinite(frameMs)||frameMs<5||frameMs>=1000||!Number.isFinite(stampMs)||stampMs<=lastObservedAt)
        return unchanged();
      lastObservedAt=stampMs;
      ema=ema===null?frameMs:ema*.88+frameMs*.12;
      validFrames++;
      slow=ema>targetFrameMs*1.18?slow+1:0;
      fast=ema<targetFrameMs*.78?fast+1:0;
      if(slow>=24&&stampMs-lastChangeAt>=2500&&tiles>effectiveMin){
        tiles=Math.max(effectiveMin,tiles-24);lastChangeAt=stampMs;slow=0;fast=0;
        return {changed:true,budget:tiles,averageFrameMs:ema,online:isOnline()};
      }
      if(fast>=60&&stampMs-lastChangeAt>=3500&&tiles<effectiveMax){
        tiles=Math.min(effectiveMax,tiles+16);lastChangeAt=stampMs;slow=0;fast=0;
        return {changed:true,budget:tiles,averageFrameMs:ema,online:isOnline()};
      }
      return unchanged();
    }
    return Object.freeze({
      observe,tileBudget:()=>tiles,isOnline,
      snapshot:()=>({
        tileBudget:tiles,minTiles:effectiveMin,maxTiles:effectiveMax,targetFrameMs,
        averageFrameMs:ema,validFrames,lastChangeAt,
        onlineStreaming:isOnline()&&preferOnline,
        mode:isOnline()&&preferOnline?'online-first':'offline-backup'
      })
    });
  }
  return Object.freeze({TARGETS,createGovernor,lookAheadDistance,isOnline});
});
