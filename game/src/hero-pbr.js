/* Cinematic PBR polish for River hero roots (procedural or skinned). */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValleyHeroPbr=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const LOOKS=Object.freeze({
    natural:{env:1,sat:1,dim:1},
    golden:{env:1.18,sat:1.08,warmBoost:0.06},
    blue:{env:0.92,sat:0.95,coolBoost:0.05},
    storm:{env:0.72,sat:0.85,dim:0.9},
    lantern:{env:1.08,sat:1.05,emissiveBoost:0.1}
  });

  function polish(rootMesh,look='natural'){
    if(!rootMesh||!rootMesh.traverse)return {materials:0,look};
    const preset=LOOKS[look]||LOOKS.natural;
    let n=0;
    rootMesh.traverse(obj=>{
      if(!obj.isMesh||!obj.material)return;
      const mats=Array.isArray(obj.material)?obj.material:[obj.material];
      const feat=(obj.userData&&obj.userData.heroFeature)||'';
      for(const m of mats){
        if(!m||!(m.isMeshStandardMaterial||m.isMeshPhysicalMaterial))continue;
        if('envMapIntensity' in m)
          m.envMapIntensity=(m.envMapIntensity||1)*(preset.env||1);
        if(preset.dim!=null&&preset.dim!==1&&m.color)
          m.color.multiplyScalar(preset.dim);
        if(preset.emissiveBoost&&m.emissive){
          m.emissiveIntensity=Math.min(1.2,(m.emissiveIntensity||0)+preset.emissiveBoost);
        }
        if(feat==='chain'||feat==='watch'){if('metalness' in m)m.metalness=Math.max(m.metalness||0,.75);}
        if(feat==='glasses'&&'roughness' in m)m.roughness=Math.min(m.roughness||1,.2);
        if(feat==='boot-tread'&&'roughness' in m)m.roughness=Math.max(m.roughness||0,.94);
        m.needsUpdate=true;n++;
      }
    });
    return {materials:n,look,preset};
  }

  function detailReport(rootMesh){
    const features={};
    if(!rootMesh||!rootMesh.traverse)return features;
    rootMesh.traverse(obj=>{
      const f=obj.userData&&obj.userData.heroFeature;
      if(f)features[f]=(features[f]||0)+1;
    });
    return features;
  }

  return Object.freeze({LOOKS,polish,detailReport});
});
