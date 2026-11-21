/* Embedded glTF 2.0 GLB decoder for this game's original model pack.
   Offline and dependency-free apart from the bundled Three.js global. Rejects unsupported mesh features. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyModelLoader=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
function parseGLB(raw){
 const dv=new DataView(raw),total=dv.getUint32(8,true);
 if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2||total!==raw.byteLength)throw Error('Invalid or unsupported GLB');
 let off=12,json=null,bin=null;
 while(off+8<=total){const size=dv.getUint32(off,true),type=dv.getUint32(off+4,true);off+=8;
  if(off+size>total)throw Error('Truncated GLB');
  if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(raw,off,size)));
  if(type===0x004e4942)bin={offset:off,size};off+=size;
 }
 if(!json||!bin||!Array.isArray(json.meshes)||!Array.isArray(json.bufferViews)||!Array.isArray(json.accessors))throw Error('Incomplete GLB');
 return {json,bin,raw};
}
function dataAccessor(p,i){
 const a=p.json.accessors[i],v=p.json.bufferViews[a.bufferView];
 if(!a||!v||a.sparse||v.buffer!==0)throw Error('Unsupported glTF accessor');
 const channels=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4})[a.type],bits=({5120:1,5121:1,5122:2,5123:2,5125:4,5126:4})[a.componentType];
 if(!channels||!bits)throw Error('Unsupported glTF component type');
 const count=a.count,step=v.byteStride||channels*bits,start=p.bin.offset+(v.byteOffset||0)+(a.byteOffset||0),end=p.bin.offset+(v.byteOffset||0)+v.byteLength,dv=new DataView(p.raw);
 if(start+Math.max(0,count-1)*step+channels*bits>end||end>p.raw.byteLength)throw Error('GLB accessor out of range');
 const list=new Array(count*channels);
 const get=(o)=>({5120:()=>dv.getInt8(o),5121:()=>dv.getUint8(o),5122:()=>dv.getInt16(o,true),5123:()=>dv.getUint16(o,true),5125:()=>dv.getUint32(o,true),5126:()=>dv.getFloat32(o,true)})[a.componentType]();
 for(let j=0;j<count;j++)for(let c=0;c<channels;c++)list[j*channels+c]=get(start+j*step+c*bits);
 return {values:list,channels,componentType:a.componentType,count};
}
function decodeBase64(b64){const raw=atob(b64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes.buffer;}
function makeModel(three,b64){const file=parseGLB(decodeBase64(b64)),doc=file.json,meshes=doc.meshes.map(mesh=>{
  const group=new three.Group();
  for(const prim of mesh.primitives){if((prim.mode??4)!==4||!Number.isInteger(prim.attributes.POSITION))throw Error('Unsupported mesh primitive');
    const pos=dataAccessor(file,prim.attributes.POSITION),g=new three.BufferGeometry();
    if(pos.channels!==3)throw Error('Expected VEC3 position');
    g.setAttribute('position',new three.Float32BufferAttribute(pos.values,3));
    if(Number.isInteger(prim.attributes.NORMAL)){const norm=dataAccessor(file,prim.attributes.NORMAL);g.setAttribute('normal',new three.Float32BufferAttribute(norm.values,3));}
    if(Number.isInteger(prim.indices))g.setIndex(dataAccessor(file,prim.indices).values);
    if(!g.getAttribute('normal'))g.computeVertexNormals();
    const mat=(doc.materials||[])[prim.material??0]||{},factor=mat.pbrMetallicRoughness?.baseColorFactor||[.7,.72,.67,1];
    const material=new three.MeshStandardMaterial({color:new three.Color().setRGB(factor[0],factor[1],factor[2],three.LinearSRGBColorSpace),roughness:mat.pbrMetallicRoughness?.roughnessFactor??.9,metalness:mat.pbrMetallicRoughness?.metallicFactor??0,side:mat.doubleSided?three.DoubleSide:three.FrontSide});
    group.add(new three.Mesh(g,material));
  }
  return group;
 });
 function fromNode(i){const n=doc.nodes[i];if(!n)throw Error('Unknown glTF scene node');const g=new three.Group();g.name=n.name||'model-node';
  if(n.mesh!==undefined)g.add(meshes[n.mesh].clone());
  if(n.translation)g.position.fromArray(n.translation);
  if(n.scale)g.scale.fromArray(n.scale);
  if(n.rotation)g.quaternion.fromArray(n.rotation);
  if(n.matrix){g.matrix.fromArray(n.matrix);g.matrix.decompose(g.position,g.quaternion,g.scale);}
  for(const child of n.children||[])g.add(fromNode(child));return g;
 }
 const scene=new three.Group(),start=(doc.scenes?.[doc.scene??0]?.nodes)||[];for(const i of start)scene.add(fromNode(i));return scene;
}
return {parseGLB,dataAccessor,decodeBase64,makeModel};
});
