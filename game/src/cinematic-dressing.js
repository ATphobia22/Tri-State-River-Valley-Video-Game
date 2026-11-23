/* Mount Vernon-inspired cinematic set dressing. Authored game art.
 * Based on thematic observations from riverfront/Main Street walking-tour coverage;
 * no copied frames, inferred survey dimensions, mapped properties or proprietary assets.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValleyCinematicSetDressing=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const BENCHES=Object.freeze([
  [74,1064,0],[109,1060,0],[154,1060,0],[194,1058,0],[231,1048,0],
  [-37,530,1.57],[-26,469,1.57],[52,465,1.57],[63,526,1.57]
 ]);
 const LAMPS=Object.freeze([
  [55,1076],[97,1076],[138,1076],[178,1076],[218,1076],
  [-46,550],[-40,459],[49,454],[70,550]
 ]);
 const PLANTERS=Object.freeze([
  [-31,539],[-17,539],[42,535],[57,533],[-40,488],[-38,501],
  [55,480],[58,500],[72,1042],[112,1041],[149,1040],[187,1038]
 ]);
 function create(THREE,scene,ground,{mobile=false}={}){
  if(!THREE?.InstancedMesh||!scene||typeof ground!=='function')
   throw new Error('Three.js, scene and sampled terrain are required');
  const meshes=[],lights=[];
  const stone=new THREE.MeshStandardMaterial({color:0x8b8277,roughness:.91,metalness:0});
  const wood=new THREE.MeshStandardMaterial({color:0x775441,roughness:.77,metalness:0});
  const iron=new THREE.MeshStandardMaterial({color:0x343b3d,roughness:.43,metalness:.68});
  const leaves=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,metalness:0});
  const lantern=new THREE.MeshStandardMaterial({color:0xffe0a3,roughness:.24,
    emissive:0xffc36e,emissiveIntensity:.12,metalness:.03});
  const boxGeo=new THREE.BoxGeometry(1,1,1);
  const postGeo=new THREE.CylinderGeometry(.16,.24,7.1,8);
  const lanternGeo=new THREE.SphereGeometry(.72,10,8);
  const potGeo=new THREE.CylinderGeometry(1.2,1.05,1.5,8);
  const flowerGeo=new THREE.IcosahedronGeometry(1.5,1);
  const temp=new THREE.Object3D(),color=new THREE.Color();
  function make(name,geo,material,n,descriptors){
   const instanced=new THREE.InstancedMesh(geo,material,n);
   instanced.name=name;
   for(const [i,{x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1,tint}] of descriptors.entries()){
    temp.position.set(x,y,z);
    temp.rotation.set(rx,ry,rz);
    temp.scale.set(sx,sy,sz);
    temp.updateMatrix();
    instanced.setMatrixAt(i,temp.matrix);
    if(tint)instanced.setColorAt(i,color.setHex(tint));
   }
   instanced.instanceMatrix.needsUpdate=true;
   if(instanced.instanceColor)instanced.instanceColor.needsUpdate=true;
   instanced.castShadow=false;instanced.receiveShadow=true;
   instanced.computeBoundingSphere?.();
   scene.add(instanced);meshes.push(instanced);
   return instanced;
  }
  const seats=[],backs=[],supports=[];
  for(const [x,z,rotation] of BENCHES){
   const y=ground(x,z),dir=Math.cos(rotation),side=Math.sin(rotation);
   if(!Number.isFinite(y))continue;
   seats.push({x,y:y+1.55,z,ry:rotation,sx:4.8,sy:.22,sz:1.2});
   backs.push({x:x-side*.45,y:y+2.23,z:z+dir*.45,ry:rotation,sx:4.8,sy:1.15,sz:.19});
   for(const d of [-1.75,1.75]){
    supports.push({x:x+d*dir,y:y+.82,z:z-d*side,ry:rotation,sx:.2,sy:1.45,sz:1.13});
   }
  }
  make('Cinematic/riverfront-and-square-benches',boxGeo,wood,seats.length,seats);
  make('Cinematic/benches-backs',boxGeo,wood,backs.length,backs);
  make('Cinematic/benches-iron-legs',boxGeo,iron,supports.length,supports);
  const poleRows=[],caps=[];
  for(const [x,z] of LAMPS){
   const y=ground(x,z);
   if(!Number.isFinite(y))continue;
   poleRows.push({x,y:y+3.55,z});
   caps.push({x,y:y+7.4,z});
  }
  make('Cinematic/historic-streetlamps',postGeo,iron,poleRows.length,poleRows);
  make('Cinematic/streetlamp-warm-glass',lanternGeo,lantern,caps.length,caps);
  const pots=[],flowers=[];
  for(let i=0;i<PLANTERS.length;i++){
   const [x,z]=PLANTERS[i],y=ground(x,z);
   if(!Number.isFinite(y))continue;
   pots.push({x,y:y+.78,z});
   flowers.push({x,y:y+2.25,z,sx:1.05+(i%3)*.12,
     sy:.68+(i%2)*.09,sz:1.07,
     tint:[0x567b4b,0x6f8b52,0x8b8d5d,0x697b49][i%4]});
  }
  make('Cinematic/stone-planting-tubs',potGeo,stone,pots.length,pots);
  make('Cinematic/garden-planting-forms',flowerGeo,leaves,flowers.length,flowers);
  // Two local lamps maximum. Additional emissive bulbs use no light sources.
  if(!mobile&&THREE.PointLight){
   for(const i of [1,6]){
    if(!caps[i])continue;
    const lamp=new THREE.PointLight(0xffc27d,0,45,1.9);
    lamp.position.set(caps[i].x,caps[i].y,caps[i].z);
    lamp.castShadow=false;
    scene.add(lamp);lights.push(lamp);
   }
  }
  const result={
   name:'Mount Vernon artistic street dressing',
   classification:'GAME_ART_NOT_SURVEYED',
   benches:seats.length,lamps:caps.length,planters:pots.length,
   drawCalls:meshes.length,localPointLights:lights.length
  };
  function update(time,weather,quality='balanced'){
   const night=time>=19.3||time<6,storm=weather==='rain';
   lantern.emissiveIntensity=night?1.85:storm?.75:.12;
   for(const light of lights)light.intensity=quality==='cinematic'&&night?9:0;
  }
  function dispose(){
   for(const mesh of meshes)scene.remove(mesh);
   for(const light of lights)scene.remove(light);
   for(const item of [boxGeo,postGeo,lanternGeo,potGeo,flowerGeo,
                      stone,wood,iron,leaves,lantern])item.dispose();
  }
  return Object.freeze({meshes,result,update,dispose});
 }
 return Object.freeze({BENCHES,LAMPS,PLANTERS,create});
});
