/* Apply cinematic PBR polish to any River hero root (procedural or skinned). */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValleyHeroPbr=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const LOOKS=Object.freeze({
    natural:{env:1,contrast:1},
    golden:{env:1.15,contrast:1.05,warm:0x221100},
    blue:{env:0.95,contrast:1.08,cool:0x001122},
    storm:{env:0.75,contrast:1.12},
    lantern:{env:1.05,contrast:1.1,emissiveBoost:0.08}
  });
  function polish(root,look='natural'){
    if(!root||!root.traverse)return {materials:0,look};
    const preset=LOOKS[look]||LOOKS.natural;
    let n=0;
    root.traverse(obj=>{
      if(!obj.isMesh||!obj.material)return;
      const mats=Array.isArray(obj.material)?obj.material:[obj.material];
      for(const m of mats){
        if(!m||!m.isMeshStandardMaterial&&!m.isMeshPhysicalMaterial)continue;
        if('envMapIntensity' in m)m.envMapIntensity=(m.envMapIntensity||1)*preset.env;
        if(preset.emissiveBoost&&m.emissive){
          m.emissiveIntensity=Math.min(1,(m.emissiveIntensity||0)+preset.emissiveBoost);
        }
        m.needsUpdate=true;n++;
      }
    });
    return {materials:n,look,preset};
  }
  return Object.freeze({LOOKS,polish});
});
