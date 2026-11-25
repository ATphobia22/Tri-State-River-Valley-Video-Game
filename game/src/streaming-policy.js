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
  // Estimates, not driver-reported VRAM. Buffer identity represents a GPU
  // allocation (interleaved attributes share their InterleavedBuffer).
  function estimateGpuResources(generations={}, {renderTargets=[]}={}){
    function collect(roots,targets=[]){
      const buffers=new Set(),textures=new Set(),targetSet=new Set(),nodes=new Set();
      let geometryBytes=0,textureBytes=0,renderTargetBytes=0,unknownTextures=0;
      const bytes=v=>Number.isFinite(v)&&v>0?v:0;
      function attribute(a){
        const storage=a?.data||a;
        if(!storage||buffers.has(storage))return;
        buffers.add(storage);geometryBytes+=bytes(storage.array?.byteLength);
      }
      function texture(t){
        if(!t?.isTexture||textures.has(t))return;
        textures.add(t);
        // Default conservative RGBA allocation; known wide component types.
        const bpp=t.type===1015?16:t.type===1016?8:4;
        const images=Array.isArray(t.image)?t.image:[t.image];
        const imageSize=i=>{
          const w=i?.width||i?.videoWidth||i?.naturalWidth,h=i?.height||i?.videoHeight||i?.naturalHeight;
          return bytes(w)*bytes(h)*Math.max(1,bytes(i?.depth))*bpp;
        };
        let size=0;
        if(t.mipmaps?.length){
          for(const mip of t.mipmaps)size+=bytes(mip.data?.byteLength)||imageSize(mip);
        }else{
          for(const i of images){
            let base=imageSize(i);
            if(t.generateMipmaps!==false&&base)base=Math.ceil(base*4/3);
            size+=base;
          }
        }
        if(!size)unknownTextures++;
        textureBytes+=size;
      }
      function material(m){
        if(!m)return;
        for(const value of Object.values(m))if(value?.isTexture)texture(value);
        for(const u of Object.values(m.uniforms||{})){
          if(Array.isArray(u?.value))u.value.forEach(texture);else texture(u?.value);
        }
      }
      function visit(o){
        if(!o||nodes.has(o))return;
        nodes.add(o);
        const g=o.geometry;
        if(g){
          attribute(g.index);
          Object.values(g.attributes||{}).forEach(attribute);
          Object.values(g.morphAttributes||{}).forEach(list=>list.forEach(attribute));
        }
        attribute(o.instanceMatrix);attribute(o.instanceColor);
        texture(o.skeleton?.boneTexture);
        (Array.isArray(o.material)?o.material:[o.material]).forEach(material);
        (o.children||[]).forEach(visit);
      }
      roots.forEach(visit);
      for(const t of targets){
        if(!t||targetSet.has(t))continue;
        targetSet.add(t);
        const colors=t.textures?.length?t.textures:[t.texture];
        colors.forEach(texture);texture(t.depthTexture);
        const pixels=bytes(t.width)*bytes(t.height),samples=bytes(t.samples);
        const colorBpp=colors.reduce((n,c)=>n+(c?.type===1015?16:c?.type===1016?8:4),0);
        if(samples>0)renderTargetBytes+=pixels*samples*(colorBpp+(t.depthBuffer!==false?4:0));
        else if(t.depthBuffer!==false&&!t.depthTexture)renderTargetBytes+=pixels*4;
      }
      return {geometryBytes,textureBytes,renderTargetBytes,unknownTextures,totalBytes:geometryBytes+textureBytes+renderTargetBytes};
    }
    const entries=Object.entries(generations),all=collect(entries.flatMap(([,roots])=>roots),renderTargets);
    return {...all,generations:Object.fromEntries(entries.map(([name,roots])=>[name,collect(roots).totalBytes]))};
  }
  function terrainTileBytes(segments=16){
    if(!Number.isInteger(segments)||segments<1||segments>128)throw new RangeError('invalid terrain segments');
    // position, normal, RGB, UV, index plus worst-case four seam skirts.
    return (segments+1)**2*44+segments**2*6*4+4*segments*6*3*4*2;
  }
  function terrainTileCapacity({budgetBytes,sharedBytes=0,segments=16,maxTiles=200,generations=3}){
    if(!Number.isFinite(budgetBytes)||budgetBytes<=0||!Number.isFinite(sharedBytes)||sharedBytes<0||!Number.isInteger(maxTiles)||maxTiles<1||!Number.isInteger(generations)||generations<1)throw new RangeError('invalid terrain byte budget');
    // One root is mandatory even under pressure; callers can report overage.
    return Math.max(1,Math.min(maxTiles,Math.floor((budgetBytes-sharedBytes)/(generations*terrainTileBytes(segments)))));
  }
  return Object.freeze({TARGETS,createGovernor,lookAheadDistance,isOnline,estimateGpuResources,terrainTileBytes,terrainTileCapacity});
});
