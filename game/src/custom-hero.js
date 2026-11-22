/* River Valley optional user-owned offline GLB intake. Does not fetch URLs.
 * Only accepts a fully skinned game-compatible glTF 2.0 binary with all clips.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyCustomHero=api;})(typeof globalThis==='object'?globalThis:this,function(root){
'use strict';
const CLIPS=Object.freeze(['Idle','Walk','Run','Sprint','FishingCast','Cook','Track','Drive','Interact','Jump','Land','Farm','Wave']);
const STORAGE_KEY='river-valley-local-custom-hero-v1';
const MAX_BYTES=4_000_000;
function model(){return root.ValleyModelLoader||(typeof module==='object'&&module.exports?require('./model-loader.js'):null);}
function validate(raw){
 const bytes=raw instanceof ArrayBuffer?raw:raw?.buffer?.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<40||bytes.byteLength>MAX_BYTES)throw Error('Invalid GLB file size');
 const loader=model();if(!loader?.parseGLB||!loader?.dataAccessor)throw Error('Local model decoder missing');
 const parsed=loader.parseGLB(bytes),doc=parsed.json;
 if(doc.asset?.version!=='2.0'||(doc.extensionsRequired||[]).length)throw Error('Unsupported GLB extension/version');
 if(doc.buffers?.length!==1||doc.buffers[0].uri||(doc.images||[]).some(i=>!!i.uri))throw Error('Custom GLB must embed all resources');
 if(doc.skins?.length!==1||doc.skins[0].joints?.length!==27)throw Error('Custom River Hero requires 27 weighted joints');
 if(doc.animations?.length!==CLIPS.length||CLIPS.some(n=>!doc.animations.find(a=>a.name===n)))throw Error('Custom River Hero requires all 13 gameplay animation clips');
 const meshNode=doc.nodes?.find(n=>n.skin!==undefined);
 if(!meshNode||!doc.meshes?.[meshNode.mesh]?.primitives?.length)throw Error('Custom GLB has no skinned mesh');
 const names=new Set(doc.skins[0].joints.map(i=>doc.nodes[i]?.name));
 for(const n of ['Hips','Spine','Chest','Neck','Head','LeftHand','RightHand','LeftFoot','RightFoot'])if(!names.has(n))throw Error('Custom rig missing '+n);
 let vertices=0,triangles=0;
 for(const p of doc.meshes[meshNode.mesh].primitives){
  const a=p.attributes||{};
  for(const n of ['POSITION','NORMAL','JOINTS_0','WEIGHTS_0'])if(!Number.isInteger(a[n]))throw Error('Custom GLB missing '+n);
  if(!Number.isInteger(p.indices)||(p.mode??4)!==4)throw Error('Only indexed triangles supported');
  const pos=loader.dataAccessor(parsed,a.POSITION),weight=loader.dataAccessor(parsed,a.WEIGHTS_0),skin=loader.dataAccessor(parsed,a.JOINTS_0),norm=loader.dataAccessor(parsed,a.NORMAL);
  if(pos.channels!==3||norm.count!==pos.count||weight.channels!==4||skin.channels!==4||weight.count!==pos.count||skin.count!==pos.count)throw Error('Inconsistent skin attributes');
  if(!Number.isInteger(p.material)||!doc.materials?.[p.material])throw Error('Missing material');
  if(!Number.isInteger(a.TEXCOORD_0)&&!Number.isInteger(a.COLOR_0))throw Error('Custom GLB needs embedded texture UV0 or vertex colors');
  if(Number.isInteger(a.COLOR_0)){const col=loader.dataAccessor(parsed,a.COLOR_0);if(col.count!==pos.count||![3,4].includes(col.channels))throw Error('Invalid vertex COLOR_0');}
  for(let i=0;i<weight.count;i++){
   const v=i*4;let sum=0;
   for(let j=0;j<4;j++){sum+=weight.values[v+j];if(weight.values[v+j]>0&&skin.values[v+j]>=27)throw Error('Skin joint index out of range');}
   if(!Number.isFinite(sum)||Math.abs(1-sum)>.002)throw Error('Vertex weights are not normalized');
  }
  vertices+=pos.count;triangles+=loader.dataAccessor(parsed,p.indices).count/3;
 }
 if(vertices>80_000||triangles>150_000)throw Error('Custom rig exceeds browser geometry budget');
 return Object.freeze({joints:27,clips:13,vertices,triangles:Math.floor(triangles),source:'local-file',bytes:bytes.byteLength});
}
function toBase64(raw){
 const b=raw instanceof Uint8Array?raw:new Uint8Array(raw);
 // 24576 is divisible by 3, so separately encoded chunks can be concatenated.
 const chunks=[];for(let i=0;i<b.length;i+=24576)chunks.push(btoa(String.fromCharCode(...b.subarray(i,i+24576))));
 return chunks.join('');
}
function fromBase64(value){
 if(typeof value!=='string'||value.length>Math.ceil(MAX_BYTES/3)*4+8)throw Error('Cached custom hero exceeds size limit');
 const loader=model();if(!loader?.decodeBase64)throw Error('Offline GLB decoder missing');
 const bytes=loader.decodeBase64(value);validate(bytes);return bytes;
}
return Object.freeze({CLIPS,STORAGE_KEY,MAX_BYTES,validate,toBase64,fromBase64});
});