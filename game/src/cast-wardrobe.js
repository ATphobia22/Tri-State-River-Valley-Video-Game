/* Original low-poly wardrobe interpretations of user-supplied collector figures.
 * These are not face scans or faithful 3D reproductions of real people.
 * All share the existing 27-bone rig, original animation and offline renderer.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyCastWardrobe=api;})(typeof globalThis==='object'?globalThis:this,function(root){
'use strict';
const STYLE=Object.freeze({
 'pete-yeida':{hat:'beanie',hatColor:0xbc642d,shirt:0x627f8e,pants:0x44596c,beard:null,glasses:true,pattern:'work'},
 'larry-goldman':{hat:'cap',hatColor:0x6b634b,shirt:0x596152,pants:0x46596b,beard:0x3f3530,glasses:true,pattern:'bark'},
 'richard-stratton':{hat:'beanie',hatColor:0xb56c29,shirt:0x797872,pants:0x46617a,beard:0xa9a8a2,glasses:false,pattern:'plaid'},
 'marcus-stevens':{hat:'beanie',hatColor:0xc96a27,shirt:0x4c613b,pants:0x526340,beard:0x292522,glasses:true,pattern:'camo'},
 'roy-tenney':{hat:'beanie',hatColor:0x9f2e29,shirt:0x66675e,pants:0x45596e,beard:0x42332c,glasses:false,pattern:'bark'},
 'bill-tucker':{hat:'cap',hatColor:0x999781,shirt:0x4e5b4b,pants:0x3e5772,beard:null,glasses:false,pattern:'bark'},
 'wally-wallace':{hat:'cap',hatColor:0x727d61,shirt:0x616951,pants:0x59614b,beard:0xbfc0b6,glasses:true,pattern:'camo'},
 'allen-tucker':{hat:'cap',hatColor:0x677553,shirt:0x526643,pants:0x465a71,beard:null,glasses:false,pattern:'camo'}
});
const KEY='river-valley-figure-prototype-v1';
function selection(){try{const id=root.localStorage?.getItem(KEY);return STYLE[id]?id:null;}catch(_){return null;}}
function saveSelection(id){
 if(id!==null&&!STYLE[id])throw Error('Unknown playable prototype');
 try{if(id)root.localStorage?.setItem(KEY,id);else root.localStorage?.removeItem(KEY);}catch(_){}
 return id;
}
function makePattern(THREE,style,seed){
 if(typeof root.document==='undefined'||typeof THREE.CanvasTexture!=='function')return null;
 const canvas=root.document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 const background='#'+style.toString(16).padStart(6,'0');ctx.fillStyle=background;ctx.fillRect(0,0,128,128);
 let value=seed;const rand=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
 if(style===0)return null;
 if(seed%3===0){
  // Soft woven plaid for the overshirt, not a copied photograph.
  for(let i=0;i<128;i+=22){ctx.fillStyle='rgba(228,224,211,.12)';ctx.fillRect(i,0,4,128);ctx.fillRect(0,i,128,4);ctx.fillStyle='rgba(16,21,19,.25)';ctx.fillRect(i+9,0,4,128);ctx.fillRect(0,i+9,128,4);}
 }else{
  // Original deterministic fabric flecks, never a photographic camouflage pattern.
  for(let i=0;i<65;i++){const x=rand()*128,y=rand()*128,w=6+rand()*23,h=3+rand()*13;ctx.fillStyle=i%3===0?'rgba(27,36,28,.26)':i%3===1?'rgba(186,177,139,.16)':'rgba(72,61,47,.26)';ctx.beginPath();ctx.ellipse(x,y,w,h,rand()*3.14,0,6.283);ctx.fill();}
 }
 const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;map.needsUpdate=true;return map;
}
function decorate(THREE,hero,id){
 const style=STYLE[id];if(!style||!hero?.skinned||!hero.joints?.Head)return null;
 const rootBone=hero.joints.Head,accessories=new THREE.Group();
 accessories.name='Family + Friends stylized wardrobe: '+id;rootBone.add(accessories);
 const material=new THREE.MeshStandardMaterial({color:style.hatColor,roughness:.9});
 const brimMaterial=new THREE.MeshStandardMaterial({color:style.hatColor,roughness:.95});
 const beardMaterial=style.beard===null?null:new THREE.MeshStandardMaterial({color:style.beard,roughness:.94});
 const geometry=[],materials=[material,brimMaterial,...(beardMaterial?[beardMaterial]:[])],originalMaps=[],textureOverrides=[];
 function add(geo,mat,x,y,z,sx=1,sy=1,sz=1){
  const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
  mesh.castShadow=true;mesh.receiveShadow=true;accessories.add(mesh);geometry.push(geo);return mesh;
 }
 if(style.hat==='beanie'){
  add(new THREE.SphereGeometry(1.39,14,10,0,6.283,0,1.9),material,0,1.64,0,1,.62,.95);
  add(new THREE.CylinderGeometry(1.36,1.35,.33,18),brimMaterial,0,1.36,0,1,.97,.96);
 }else{
  add(new THREE.SphereGeometry(1.42,16,9,0,6.283,0,1.8),material,0,1.59,0,1,.46,.98);
  add(new THREE.SphereGeometry(1,12,8),brimMaterial,0,1.42,-1.13,1.12,.11,.66);
 }
 if(beardMaterial){
  add(new THREE.SphereGeometry(1.06,12,9),beardMaterial,0,-.22,-1.10,1,.57,.40);
  add(new THREE.SphereGeometry(.91,10,8),beardMaterial,0,-.51,-1.10,1,.43,.32);
  if(style.beard!==0x3f3530)add(new THREE.SphereGeometry(.88,10,8),beardMaterial,0,-.77,-1.02,.95,.43,.31);
 }
 // Outfit colors and gentle textile grain are applied only to the existing
 // fully skinned shirt and trousers, not as detached static body meshes.
 const oldDispose=hero.dispose;
 const fabrics=hero.meshes||[];
 for(const mesh of fabrics){
  const mat=mesh.material,name=(mat?.name||'').toLowerCase();
  if(!mat)continue;
  const isShirt=/shirt/.test(name),isPants=/cargo/.test(name);
  if(isShirt||isPants){
   const previous=mat.map,previousColor=mat.color.clone(),wasVertex=mat.vertexColors;
   const color=isShirt?style.shirt:style.pants;
   const map=makePattern(THREE,color,(isShirt?3:4)+(id.length%9));
   if(map){
    originalMaps.push(previous);textureOverrides.push(map);
    mat.map=map;mat.color.setHex(0xffffff);
   }else mat.color.setHex(color);
   mat.needsUpdate=true;
  }
  // Hats replace the base avatar's curly-hair mass; eyeglasses are optional.
  if(/hair/.test(name))mesh.visible=false;
  if(!style.glasses&&(/glasses|lens/.test(name)))mesh.visible=false;
  if(beardMaterial&&/mask/.test(name))mesh.visible=false;
 }
 const oldRootDispose=hero.dispose;
 let disposed=false;
 hero.dispose=function(){
  if(disposed)return;disposed=true;
  accessories.parent?.remove(accessories);
  for(const geo of geometry)geo.dispose();
  for(const mat of materials)mat.dispose();
  for(const map of originalMaps)map?.dispose?.();
  oldRootDispose();
 };
 hero.castId=id;
 hero.castPrototype=true;
 return Object.freeze({id,accessories,isPrototype:true});
}
return Object.freeze({STYLE,KEY,selection,saveSelection,decorate});
});