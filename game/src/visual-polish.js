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
  return downtown?(i%7===0?'limestone':'brick'):(i%23===0?'metal':i%19===0?'batten':i%6===0?'brick':i%8===0?'limestone':'clapboard');
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
  }else if(type==='roof'){
   ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
   for(let row=0;row<16;row++){
    const y=row*16;
    for(let col=-1;col<10;col++){
     const x=col*32+(row%2)*16,v=hueVariation(col,row,seed);
     ctx.fillStyle='rgba(10,16,18,.17)';ctx.fillRect(x+1,y+1,30,14);
     ctx.fillStyle='rgba(255,246,220,'+(.045+Math.abs(v)*.005)+')';ctx.fillRect(x+3,y+2,26,2);
     ctx.fillStyle='rgba(9,12,14,.11)';ctx.fillRect(x+2,y+14,28,2);
    }
   }
  }else if(type==='batten'){
   ctx.fillStyle='#bfc6b1';ctx.fillRect(0,0,256,256);
   for(let x=0;x<256;x+=34){
    ctx.fillStyle='rgba(34,41,35,.20)';ctx.fillRect(x,0,3,256);
    ctx.fillStyle='rgba(249,247,224,.13)';ctx.fillRect(x+4,0,2,256);
    for(let y=0;y<256;y+=46){ctx.fillStyle='rgba(35,43,37,.10)';ctx.fillRect(x+7,y,25,2);}
   }
  }else if(type==='metal'){
   ctx.fillStyle='#8a9994';ctx.fillRect(0,0,256,256);
   for(let x=0;x<256;x+=12){
    ctx.fillStyle='rgba(245,249,245,.22)';ctx.fillRect(x,0,2,256);
    ctx.fillStyle='rgba(21,38,42,.17)';ctx.fillRect(x+4,0,2,256);
    ctx.fillStyle='rgba(78,91,87,.08)';ctx.fillRect(x+7,0,3,256);
   }
  }else if(type==='road'){
   ctx.fillStyle='#adb5b3';ctx.fillRect(0,0,256,256);
   for(let y=0;y<256;y+=8)for(let x=0;x<256;x+=8){
    const v=Math.abs(hueVariation(x,y,seed))/8;
    ctx.fillStyle='rgba(31,37,42,'+(.04+v*.13)+')';ctx.fillRect(x+(v*4),y,1+v*2,2+v);
   }
   ctx.strokeStyle='rgba(37,43,41,.18)';
   for(let x=20;x<256;x+=76){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+8,58);ctx.lineTo(x-2,122);ctx.stroke();}
  }else if(type==='terrain'){
   ctx.fillStyle='#f1f4e9';ctx.fillRect(0,0,256,256);
   for(let y=0;y<256;y+=9)for(let x=0;x<256;x+=11){
    const v=hueVariation(x,y,seed);
    ctx.strokeStyle=v>0?'rgba(58,105,59,.16)':'rgba(123,111,73,.13)';
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2+v*.08,y-2-v*.17);ctx.stroke();
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
   ['clapboard','#c9c7b9',4],['clapboard','#9aaea1',5],['brick','#945144',6],['batten','#c8d0bd',7],['metal','#96a5a3',8]
  ];
  const walls=recipes.map(([type,color,seed])=>{
   const texture=createTexture(THREE,type,color,seed);
   return new THREE.MeshStandardMaterial({color:0xffffff,map:texture,roughness:.88,metalness:0,
     side:THREE.DoubleSide});
  });
  const roofs=['#615b59','#75544a','#626d69'].map((color,i)=>
   new THREE.MeshStandardMaterial({color:0xffffff,map:createTexture(THREE,'roof',color,i+14),
    roughness:.94,metalness:0,side:THREE.DoubleSide}));
  const road=new THREE.MeshStandardMaterial({color:0x555b5b,map:createTexture(THREE,'road','#a9b4b3',9),side:THREE.DoubleSide,
   roughness:.94,metalness:.02,polygonOffset:true,polygonOffsetFactor:-2});
  const terrainMap=createTexture(THREE,'terrain','#f3f6e9',10);
  const glass=new THREE.MeshStandardMaterial({color:0x426679,roughness:.19,metalness:.17,
   emissive:0x0a1821,emissiveIntensity:.12,side:THREE.DoubleSide});
  const trim=new THREE.MeshStandardMaterial({color:0xd9c7a8,roughness:.79,side:THREE.DoubleSide});
  function pick(rec){
   const family=facadeFamily(rec.x,rec.z,rec.i);
   const wall=family==='brick'?walls[rec.i%2===0?0:1]:
     family==='limestone'?walls[2]:family==='metal'?walls[7]:family==='batten'?walls[6]:walls[3+rec.i%2];
   return {family,wall,roof:roofs[rec.i%roofs.length],glass,trim};
  }
  let previousWeather=null;
  function setWeather(weather,liveRoad=null){
   const key=weather==='rain'?'rain':weather==='mist'?'mist':'clear';
   const changed=key!==previousWeather;
   if(changed){
    previousWeather=key;
    // PBR wetness: road palette and existing geometry material are separate clones.
    const wet=key==='rain',damp=key==='mist';
    road.roughness=wet?.42:damp?.75:.94;
    road.metalness=wet?.06:.02;
    for(const roof of roofs)roof.roughness=wet?.52:damp?.79:.94;
    glass.roughness=wet?.085:.19;
   }
   if(liveRoad&&liveRoad!==road){
    liveRoad.roughness=road.roughness;
    liveRoad.metalness=road.metalness;
   }
   return changed;
  }
  function dispose(){
   [...walls,...roofs,road,glass,trim].forEach(m=>{if(m.map)m.map.dispose();m.dispose();});terrainMap?.dispose();
  }
  return Object.freeze({pick,setWeather,dispose,road,terrainMap,wallCount:walls.length,roofCount:roofs.length});
 }
 return Object.freeze({facadeFamily,hueVariation,make});
});
