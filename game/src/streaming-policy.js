/* Lightweight frame-budget governor + optional online streaming mode.
 * Offline-first remains the default. Online mode raises tile budgets and
 * look-ahead when the browser reports connectivity — without requiring
 * remote asset fetches for core play.
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
    const prep=Number.isFinite(estimatedPrepMs)?clamp(estimatedPrepMs,0,1250):600;
    const near=Number.isFinite(nearDistance)?clamp(nearDistance,0,240):80;
    const onlineBoost=isOnline()?1.25:1;
    return Math.min(320, (near+v*prep/1000)*onlineBoost);
  }

  function createGovernor({maxTiles=200,minTiles=80,targetFPS=30,preferOnline=true}={}){
    if(!(Number.isFinite(maxTiles)&&Number.isFinite(minTiles)&&minTiles>=24&&maxTiles>=minTiles&&maxTiles<=500))
      throw new RangeError('Invalid terrain tile budget limits');
    if(!(Number.isFinite(targetFPS)&&targetFPS>=15&&targetFPS<=120))
      throw new RangeError('Invalid target frame rate');
    const online=preferOnline&&isOnline();
    const effectiveMax=online?Math.min(400,Math.floor(maxTiles*1.35)):Math.floor(maxTiles);
    const effectiveMin=Math.floor(minTiles);
    const targetFrameMs=1000/targetFPS;
    let tiles=effectiveMax,ema=null,slow=0,fast=0,lastChangeAt=-Infinity,lastObservedAt=-Infinity,validFrames=0;
    function observe(frameMs,stampMs){
      const unchanged=()=>({changed:false,budget:tiles,averageFrameMs:ema,online:isOnline()});
      if(!Number.isFinite(frameMs)||frameMs<5||frameMs>125||!Number.isFinite(stampMs)||stampMs<=lastObservedAt)
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
        tiles=Math.min(effectiveMax,tiles+12);lastChangeAt=stampMs;slow=0;fast=0;
        return {changed:true,budget:tiles,averageFrameMs:ema,online:isOnline()};
      }
      return unchanged();
    }
    return Object.freeze({
      observe,
      tileBudget:()=>tiles,
      isOnline,
      snapshot:()=>({
        tileBudget:tiles,
        minTiles:effectiveMin,
        maxTiles:effectiveMax,
        targetFrameMs,
        averageFrameMs:ema,
        validFrames,
        lastChangeAt,
        onlineStreaming:isOnline()&&preferOnline,
        mode:isOnline()&&preferOnline?'online-enhanced':'offline-first'
      })
    });
  }

  return Object.freeze({TARGETS,createGovernor,lookAheadDistance,isOnline});
});
