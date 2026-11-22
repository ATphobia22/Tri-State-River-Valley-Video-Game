/* Original offline instanced foliage and graphics budgets for River Valley.
 * No geodetic claim, network access, per-frame allocations or third-party code.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyGraphicsQuality=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const PRESETS=Object.freeze({
 lite:Object.freeze({treesMobile:220,treesDesktop:340,grassMobile:0,grassDesktop:0,radius:0,spacing:16}),
 full:Object.freeze({treesMobile:470,treesDesktop:980,grassMobile:180,grassDesktop:320,radius:135,spacing:13}),
 cinematic:Object.freeze({treesMobile:470,treesDesktop:980,grassMobile:300,grassDesktop:720,radius:190,spacing:12})
});
function normalize(v){return Object.prototype.hasOwnProperty.call(PRESETS,v)?v:'full';}
function budget(v,mobile){const p=PRESETS[normalize(v)],m=!!mobile;return Object.freeze({name:normalize(v),trees:m?p.treesMobile:p.treesDesktop,grass:m?p.grassMobile:p.grassDesktop,radius:p.radius,spacing:p.spacing});}
function hash(x,z,seed=47620){let h=Math.imul(x|0,73856093)^Math.imul(z|0,19349663)^Math.imul(seed|0,83492791);h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);return (h^(h>>>16))>>>0;}
function grassDescriptors(x,z,{quality='full',mobile=false,limit=2400,stops=[],inRiver=()=>false,seed=47620}={}){
 if(!Number.isFinite(x)||!Number.isFinite(z)||!(limit>0))return [];
 const b=budget(quality,mobile);if(!b.grass)return [];
 const out=[],step=b.spacing,cx=Math.floor(x/step),cz=Math.floor(z/step),n=Math.ceil(b.radius/step)+1;
 for(let iz=cz-n;iz<=cz+n;iz++)for(let ix=cx-n;ix<=cx+n;ix++){
  const h=hash(ix,iz,seed),px=(ix+((h&1023)/1024))*step,pz=(iz+(((h>>>10)&1023)/1024))*step;
  if(Math.hypot(px-x,pz-z)>b.radius||Math.abs(px)>limit||Math.abs(pz)>limit||inRiver(px,pz))continue;
  if(stops.some(s=>Math.hypot(px-s.x,pz-s.z)<38))continue;
  if((h>>>20)%7===0)continue;
  out.push({x:px,z:pz,size:.7+((h>>>4)&255)/255*1.15,angle:(h&65535)/65535*Math.PI,variant:h%3,key:ix+':'+iz});
 }
 // Nearest first: avoids low-priority far clumps filling the quality budget.
 out.sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z)||a.key.localeCompare(b.key));
 return out.slice(0,b.grass);
}
function makeGrassGeometry(T){
 // Two crossed tapered leaf quads, four triangles per clump.
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute([
  -.46,0,0, .46,0,0, -.18,1.6,0, .18,1.6,0,
  0,0,-.46, 0,0,.46, 0,1.6,-.18, 0,1.6,.18
 ],3));
 g.setIndex([0,1,2,1,3,2,4,5,6,5,7,6]);g.computeVertexNormals();return g;
}
function create(T,scene,ground,{limit=2400,stops=[],inRiver=()=>false,mobile=false}={}){
 if(!T||!scene||typeof ground!=='function')throw Error('Three.js scene and terrain sampler required');
 const capacity=budget('cinematic',mobile).grass,geom=makeGrassGeometry(T);
 const material=new T.MeshLambertMaterial({color:0xffffff,side:T.DoubleSide,roughness:1});
 const mesh=new T.InstancedMesh(geom,material,capacity);mesh.count=0;mesh.name='River/budgeted-instanced-meadow';scene.add(mesh);
 const dummy=new T.Object3D(),color=new T.Color();
 let state={x:Infinity,z:Infinity,quality:'',season:'',count:0},rebuilds=0;
 const palettes={spring:[0x7fb466,0x96bd73,0x6b9b59],summer:[0x64864c,0x819d58,0x577c43],autumn:[0xa59355,0xc0ad68,0x857745],winter:[0x9cab91,0xc3bd9d,0x84948b]};
 function update(x,z,{quality='full',season='summer',force=false}={}){
  quality=normalize(quality);const cell=budget(quality,mobile).spacing;
  if(!force&&state.quality===quality&&state.season===season&&Math.hypot(x-state.x,z-state.z)<cell*2)return state.count;
  const leaves=grassDescriptors(x,z,{quality,mobile,limit,stops,inRiver}),palette=palettes[season]||palettes.summer;
  let count=0;
  for(const v of leaves){
   const y=ground(v.x,v.z);if(!Number.isFinite(y))continue;
   dummy.position.set(v.x,y-.1,v.z);dummy.rotation.set(0,v.angle,0);dummy.scale.set(v.size,v.size,v.size);
   dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);mesh.setColorAt(count,color.setHex(palette[v.variant]));count++;
  }
  mesh.count=count;if(count){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
  state={x,z,quality,season,count};rebuilds++;return count;
 }
 function snapshot(){return {instances:state.count,capacity,quality:state.quality,rebuilds};}
 function dispose(){scene.remove(mesh);geom.dispose();material.dispose();}
 return Object.freeze({mesh,update,snapshot,dispose});
}
return Object.freeze({PRESETS,normalize,budget,hash,grassDescriptors,makeGrassGeometry,create});
});