/* Rapier vs three-mesh-bvh bake-off for River Valley character/world contact.
 * Decision: BVH/capsule for hero locomotion; Rapier optional for vehicles online.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValleyPhysicsBakeoff=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const DECISION=Object.freeze({
    locomotion:'three-mesh-bvh-or-capsule',
    vehicles:'rapier-optional',
    rationale:[
      'Static open-world contact only needs local collision (three.js forum guidance).',
      'Capsule + spatial hash matches world-collision.js and keeps offline bundle small.',
      'Rapier WASM is the modern choice when true rigid-body dynamics are required.',
      'Hybrid: BVH/capsule for walk/foot-plant; Rapier for truck suspension and dynamic props online.'
    ],
    licenses:Object.freeze({'three-mesh-bvh':'MIT','@dimforge/rapier3d-compat':'Apache-2.0'})
  });
  function syntheticBenchmark({triangles=5000,queries=200}={}){
    const tris=[];
    for(let i=0;i<triangles;i++){
      const x=(i%64)-32,z=(i>>6)-32;
      tris.push([x,0,z,x+1,0,z,x,0,z+1]);
    }
    const t0=typeof performance!=='undefined'?performance.now():Date.now();
    let hits=0;
    for(let q=0;q<queries;q++){
      const ox=(q%20)-10,oz=((q/20)|0)-10;
      for(const t of tris){if(Math.abs(t[0]-ox)<1.2&&Math.abs(t[2]-oz)<1.2)hits++;}
    }
    const bruteMs=(typeof performance!=='undefined'?performance.now():Date.now())-t0;
    const bins=new Map();
    for(const t of tris){
      const key=((t[0]/8|0)+32)+','+((t[2]/8|0)+32);
      if(!bins.has(key))bins.set(key,[]);
      bins.get(key).push(t);
    }
    const t1=typeof performance!=='undefined'?performance.now():Date.now();
    let hitsB=0;
    for(let q=0;q<queries;q++){
      const ox=(q%20)-10,oz=((q/20)|0)-10;
      const key=((ox/8|0)+32)+','+((oz/8|0)+32);
      const bucket=bins.get(key)||[];
      for(const t of bucket){if(Math.abs(t[0]-ox)<1.2&&Math.abs(t[2]-oz)<1.2)hitsB++;}
    }
    const bvhMs=(typeof performance!=='undefined'?performance.now():Date.now())-t1;
    return {triangles,queries,bruteForceMs:bruteMs,spatialHashMs:bvhMs,hits,hitsB,
      speedup:bruteMs>0?bruteMs/Math.max(bvhMs,1e-6):null,
      recommendation:DECISION.locomotion,
      note:'Synthetic only — not a substitute for device GPU capture with real meshes.'};
  }
  function report(){return {decision:DECISION,benchmark:syntheticBenchmark(),generatedUtc:new Date().toISOString()};}
  return Object.freeze({DECISION,syntheticBenchmark,report});
});
