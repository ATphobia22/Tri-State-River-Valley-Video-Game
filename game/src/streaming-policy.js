/* Lightweight, engine-independent frame-budget governor for the browser game.
 * Adapted conceptually from the studio UE5 streaming guides, NOT Unreal code.
 * This is NOT GPU profiling, asynchronous file streaming or true UE World Partition.
 * All measurements are rAF wall-clock intervals, excluding hidden/background stalls.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValleyStreamingPolicy=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const TARGETS=Object.freeze({desktop:30,mobile:30});
  // Approximate load-ahead: motion during preparation plus a small visible buffer.
  // In-game units only. Clamped so fast input or invalid readings cannot over-preload.
  function lookAheadDistance(speed,estimatedPrepMs=600,nearDistance=80){
    const v=Number.isFinite(speed)?clamp(speed,0,450):0;
    const prep=Number.isFinite(estimatedPrepMs)?clamp(estimatedPrepMs,0,1250):600;
    const near=Number.isFinite(nearDistance)?clamp(nearDistance,0,240):80;
    return Math.min(240,near+v*prep/1000);
  }
  function createGovernor({maxTiles=200,minTiles=80,targetFPS=30}={}){
    if(!(Number.isFinite(maxTiles)&&Number.isFinite(minTiles)&&minTiles>=24&&maxTiles>=minTiles&&maxTiles<=400))
      throw new RangeError('Invalid terrain tile budget limits');
    if(!(Number.isFinite(targetFPS)&&targetFPS>=15&&targetFPS<=120))
      throw new RangeError('Invalid target frame rate');
    const targetFrameMs=1000/targetFPS;
    let tiles=Math.floor(maxTiles),ema=null,slow=0,fast=0,lastChangeAt=-Infinity,lastObservedAt=-Infinity,validFrames=0;
    function observe(frameMs,stampMs){
      const unchanged=()=>({changed:false,budget:tiles,averageFrameMs:ema});
      // Background tabs, restored devices, first-frame spikes and invalid timings
      // do not count as sustained rendering pressure.
      if(!Number.isFinite(frameMs)||frameMs<5||frameMs>125||!Number.isFinite(stampMs)||stampMs<=lastObservedAt)
        return unchanged();
      lastObservedAt=stampMs;
      ema=ema===null?frameMs:ema*.88+frameMs*.12;
      validFrames++;
      slow=ema>targetFrameMs*1.18?slow+1:0;
      fast=ema<targetFrameMs*.78?fast+1:0;
      // Hysteresis and cooldown avoid changing terrain LOD every frame.
      if(slow>=24&&stampMs-lastChangeAt>=2500&&tiles>minTiles){
        tiles=Math.max(Math.floor(minTiles),tiles-24);lastChangeAt=stampMs;slow=0;fast=0;
        return {changed:true,budget:tiles,averageFrameMs:ema};
      }
      if(fast>=60&&stampMs-lastChangeAt>=3500&&tiles<maxTiles){
        tiles=Math.min(Math.floor(maxTiles),tiles+12);lastChangeAt=stampMs;slow=0;fast=0;
        return {changed:true,budget:tiles,averageFrameMs:ema};
      }
      return unchanged();
    }
    return Object.freeze({
      observe,
      tileBudget:()=>tiles,
      snapshot:()=>({tileBudget:tiles,minTiles:Math.floor(minTiles),maxTiles:Math.floor(maxTiles),
        targetFrameMs,averageFrameMs:ema,validFrames,lastChangeAt})
    });
  }
  return Object.freeze({TARGETS,createGovernor,lookAheadDistance});
});
