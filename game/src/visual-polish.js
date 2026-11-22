/* River Valley's original, offline procedural PBR façade library.
 * All brick, stone, clapboard and roof patterns are generated locally:
 * no downloaded photography, proprietary textures or remote assets.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValleyVisualPolish=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function facadeFamily(x,z,i){
  if(!Number.isFinite(x)||!Number.isFinite(z))return 'clapboard';
  // Fictionalized downtown style zone, not a geographic classification.
  const downtown=Math.hypot(x-92,z-465)<670;
  return downtown?(i%7===0?'limestone':'brick'):(i%6===0?'brick':i%8===0?'limestone':'clapboard');
 }
 function hueVariation(a,b,seed){
  const v=(Math.imul((a+113)|0,73513)^Math.imul((b+499)|0,39823)^Math.imul(seed|0,101))>>>0;
  return (v%17)-8;
 }
 function createTexture(THREE,type,base,seed=0){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
  if(type==='brick'){
   ctx.fillStyle='#d7b9a3';ctx.fillRect(0,0,256,256);
   const rows=16,h=16,w=64;
   for(let r=0;r<rows;r++){
    const off=(r%2)*32;
    for(let col=-1;col<6;col++){
     const n=hueVariation(col,r,seed),c=131+n*2;
     ctx.fillStyle='rgb('+Math.max(75,c+18)+','+Math.max(50,c-24)+','+Math.max(43,c-40)+')';
     ctx.fillRect(col*w+off+2,r*h+2,w-4,h-4);
     ctx.fillStyle='rgba(250,211,157,.09)';ctx.fillRect(col*w+off+4,r*h+3,w-8,2);
     ctx.fillStyle='rgba(28,25,21,.16)';ctx.fillRect(col*w+off+4,r*h+h-4,w-8,2);
    }
   }
  }else if(type==='clapboard'){
   ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
   for(let row=0;row<18;row++){
    const y=row*15,variation=hueVariation(0,row,seed);
    ctx.fillStyle='rgba(16,29,23,.20)';ctx.fillRect(0,y,256,2);
    ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(0,y+2,256,2);
    ctx.fillStyle='rgba(65,72,60,'+(Math.abs(variation)*.011)+')';ctx.fillRect(0,y+6,256,4);
   }
  }else if(type==='limestone'){
   ctx.fillStyle='#b5aaa0';ctx.fillRect(0,0,256,256);
   for(let row=0;row<8;row++){
    for(let col=-1;col<6;col++){
     const off=(row%2)*32,n=hueVariation(col,row,seed);
     ctx.fillStyle='rgb('+(183+n)+','+(178+n)+','+(161+n)+')';
     ctx.fillRect(col*64+off+2,row*32+2,60,28);
     ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(col*64+off+4,row*32+4,55,3);
    }
   }
  }
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=2;
  tex.generateMipmaps=true;tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.needsUpdate=true;
  return tex;
 }
 function make(THREE){
  const recipes=[
   ['brick','#b75f48',1],['brick','#bf7355',2],['limestone','#b7ada0',3],
   ['clapboard','#c9c7b9',4],['clapboard','#9aaea1',5],['brick','#945144',6]
  ];
  const walls=recipes.map(([type,color,seed])=>{
   const texture=createTexture(THREE,type,color,seed);
   return new THREE.MeshStandardMaterial({color:0xffffff,map:texture,roughness:.88,metalness:0,
     side:THREE.DoubleSide});
  });
  const roofs=[0x645c58,0x7b5040,0x66706b].map(color=>
   new THREE.MeshStandardMaterial({color,roughness:.92,metalness:0,side:THREE.DoubleSide}));
  const glass=new THREE.MeshStandardMaterial({color:0x426679,roughness:.19,metalness:.17,
   emissive:0x0a1821,emissiveIntensity:.12,side:THREE.DoubleSide});
  const trim=new THREE.MeshStandardMaterial({color:0xd9c7a8,roughness:.79,side:THREE.DoubleSide});
  function pick(rec){
   const family=facadeFamily(rec.x,rec.z,rec.i);
   const wall=family==='brick'?walls[rec.i%2===0?0:1]:
     family==='limestone'?walls[2]:walls[3+rec.i%2];
   return {family,wall,roof:roofs[rec.i%roofs.length],glass,trim};
  }
  function dispose(){
   [...walls,...roofs,glass,trim].forEach(m=>{if(m.map)m.map.dispose();m.dispose();});
  }
  return Object.freeze({pick,dispose,wallCount:walls.length,roofCount:roofs.length});
 }
 return Object.freeze({facadeFamily,hueVariation,make});
});
