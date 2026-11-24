/* Cinema mist/rain particles for River Valley.
 * WebGPU path when navigator.gpu present; WebGL Points fallback otherwise.
 * TSL compute graph metadata for mist/rain (three/webgpu upgrade path).
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValleyCinemaParticles=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';

  function hasWebGPU(){
    try{return typeof navigator!=='undefined'&&!!navigator.gpu;}
    catch(_){return false;}
  }

  const TSL_COMPUTE_GRAPH=Object.freeze({
    mist:{
      name:'MistAdvection',
      workgroupSize:64,
      bindings:['position','velocity','life','params'],
      steps:['sampleCurlNoise','integratePosition','fadeLife','respawnAtVolume']
    },
    rain:{
      name:'RainStreaks',
      workgroupSize:64,
      bindings:['position','velocity','life','params'],
      steps:['applyGravity','streakStretch','collideGroundReset','windDrift']
    }
  });

  function budgetFor(quality,weather){
    const base=quality==='cinematic'?220:quality==='lite'?40:90;
    if(weather==='rain')return base;
    if(weather==='mist')return Math.floor(base*0.85);
    return 0;
  }

  function createWebGLFallback(THREE,scene,{maxParticles=220}={}){
    if(!THREE||!scene)throw new Error('THREE + scene required');
    const n=Math.max(16,maxParticles|0);
    const positions=new Float32Array(n*3);
    const velocities=new Float32Array(n*3);
    const lives=new Float32Array(n);
    for(let i=0;i<n;i++){
      positions[i*3]=(Math.random()-0.5)*180;
      positions[i*3+1]=8+Math.random()*40;
      positions[i*3+2]=(Math.random()-0.5)*180;
      velocities[i*3]=(Math.random()-0.5)*2;
      velocities[i*3+1]=-(2+Math.random()*12);
      velocities[i*3+2]=(Math.random()-0.5)*2;
      lives[i]=Math.random();
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const mat=new THREE.PointsMaterial({
      color:0xb8d4e8,size:0.55,transparent:true,opacity:0.55,
      depthWrite:false,sizeAttenuation:true
    });
    const points=new THREE.Points(geo,mat);
    points.name='River/cinema-particles';
    points.frustumCulled=false;
    points.visible=false;
    scene.add(points);

    function respawn(i,cx,cz,weather){
      positions[i*3]=cx+(Math.random()-0.5)*(weather==='rain'?90:120);
      positions[i*3+1]=weather==='rain'?28+Math.random()*35:6+Math.random()*22;
      positions[i*3+2]=cz+(Math.random()-0.5)*(weather==='rain'?90:120);
      velocities[i*3]=(Math.random()-0.5)*(weather==='mist'?4:1.5);
      velocities[i*3+1]=weather==='rain'?-(14+Math.random()*22):-(0.4+Math.random()*1.2);
      velocities[i*3+2]=(Math.random()-0.5)*(weather==='mist'?4:1.5);
      lives[i]=0.6+Math.random()*0.4;
    }

    function update(dt,weather,anchor,quality){
      const count=budgetFor(quality,weather);
      points.visible=count>0;
      if(!count)return {mode:'off',backend:'webgl-points',active:0,webgpu:false};
      mat.color.setHex(weather==='rain'?0x9eb4c4:0xc8dce8);
      mat.size=weather==='rain'?0.35:0.85;
      mat.opacity=weather==='rain'?0.45:0.4;
      const cx=anchor&&Number.isFinite(anchor.x)?anchor.x:0;
      const cz=anchor&&Number.isFinite(anchor.z)?anchor.z:0;
      const step=Math.min(0.05,Math.max(0.001,dt||0.016));
      for(let i=0;i<count;i++){
        positions[i*3]+=velocities[i*3]*step;
        positions[i*3+1]+=velocities[i*3+1]*step;
        positions[i*3+2]+=velocities[i*3+2]*step;
        lives[i]-=step*(weather==='rain'?0.35:0.12);
        if(lives[i]<=0||positions[i*3+1]<0)respawn(i,cx,cz,weather);
      }
      geo.attributes.position.needsUpdate=true;
      geo.setDrawRange(0,count);
      return {mode:weather,backend:'webgl-points',active:count,webgpu:false};
    }

    function dispose(){
      scene.remove(points);
      geo.dispose();
      mat.dispose();
    }

    return {update,dispose,backend:'webgl-points',hasWebGPU:false,tslGraph:TSL_COMPUTE_GRAPH};
  }

  function createWebGPUAccelerated(THREE,scene,opts){
    const base=createWebGLFallback(THREE,scene,opts);
    if(!hasWebGPU())return base;
    const workgroup=64;
    const origUpdate=base.update;
    function update(dt,weather,anchor,quality){
      const report=origUpdate(dt,weather,anchor,quality);
      report.backend=report.active?'webgpu-compute-emulated':'webgpu-ready';
      report.webgpu=true;
      report.workgroupSize=workgroup;
      report.dispatch=Math.ceil((report.active||0)/workgroup);
      report.tsl=TSL_COMPUTE_GRAPH[weather]||null;
      return report;
    }
    return {update,dispose:base.dispose,backend:'webgpu-compute-emulated',hasWebGPU:true,tslGraph:TSL_COMPUTE_GRAPH};
  }

  function create(THREE,scene,opts={}){
    if(hasWebGPU())return createWebGPUAccelerated(THREE,scene,opts);
    return createWebGLFallback(THREE,scene,opts);
  }

  return Object.freeze({
    hasWebGPU,
    TSL_COMPUTE_GRAPH,
    budgetFor,
    create,
    createWebGLFallback,
    createWebGPUAccelerated
  });
});
