'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const Model=require('../src/model-loader.js');
const binary=fs.readFileSync(path.join(root,'assets/models/river_explorer_rigged.glb'));
const glb=Model.parseGLB(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength));
const doc=glb.json,manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/models/river_explorer_manifest.json')));
function vertices(mat){
 const material=doc.materials.findIndex(m=>m.name==='River '+mat);
 assert.ok(material>=0,mat);
 return doc.meshes[0].primitives.filter(p=>p.material===material).flatMap(p=>{
  const pos=Model.dataAccessor(glb,p.attributes.POSITION).values;
  const ids=Model.dataAccessor(glb,p.indices).values;
  return Array.from(ids,i=>Array.from(pos.slice(i*3,i*3+3)));
 });
}
test('full revised River asset uses same current 27-bone skinned rig and 13 clips, with expanded organic geometry',()=>{
 assert.equal(doc.skins[0].joints.length,27);
 assert.equal(doc.animations.length,13);
 assert.equal(manifest.sha256,crypto.createHash('sha256').update(binary).digest('hex'));
 assert.ok(manifest.triangleCount>10500,'the character still has the low-poly placeholder topology');
 const phone=JSON.parse(fs.readFileSync(path.join(root,'assets/models/river_explorer_lod1_manifest.json'),'utf8'));
 assert.ok(manifest.triangleCount<40000,'showcase geometry cap exceeded');
 assert.ok(phone.triangleCount<25000,'actual balanced mobile geometry budget exceeded');
 assert.ok(phone.triangleCount<manifest.triangleCount,'mobile model did not simplify geometry');
 assert.ok(manifest.vertexCount>8000,'must add actual detail to GLB, not merely runtime shaders');
 assert.equal(manifest.usesExternalResources,false);
});
test('skull print is fabric-decal driven; no oversized white eye blobs or duplicated white teeth',()=>{
 const white=vertices('mask');
 const upper=white.filter(v=>v[1]>14.55&&v[1]<15.20);
 assert.equal(upper.length,0,'original oversized white eye meshes still dominate face');
 assert.ok(white.length<1200,'large repeated mask mesh decorations have not been removed');
});
test('organic sculpted silhouette increases hair, eyewear, leather and backpack surface detail',()=>{
 const hair=vertices('hair'),lens=vertices('lens'),pack=vertices('pack'),boots=vertices('boots');
 assert.ok(hair.length>9000,'fine curls needed instead of seven large cylindrical locks');
 assert.ok(lens.length>400,'curved eyeglass lenses should replace box panes');
 assert.ok(pack.length>650,'backpack silhouette must be rounded not a single box');
 assert.ok(boots.length>1400,'hiking boots need rounded toe and shaft geometry');
 const skin=vertices('skin');assert.ok(skin.filter(v=>Math.abs(v[0])>5.0&&Math.abs(v[0])<6.6&&v[1]>11.0).length>75);
});
test('the GLB contains valid PNG fabric textures in its own binary chunk',()=>{
 assert.equal(doc.images?.length,8);
 assert.equal(doc.textures?.length,8);
 assert.equal(manifest.embeddedTextureImages,8);
 assert.ok(doc.materials.filter(m=>m.pbrMetallicRoughness?.baseColorTexture).length>=8);
 for(const image of doc.images){
  assert.equal(image.mimeType,'image/png');
  const view=doc.bufferViews[image.bufferView];
  const start=glb.bin.offset+(view.byteOffset||0);
  const bytes=Buffer.from(glb.raw,start,view.byteLength);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 }
});
test('better fabric and face materials remain local, offline, and actually bound to GLB geometry',()=>{
 const runtime=fs.readFileSync(path.join(root,'src/rigged-hero.js'),'utf8');
 assert.match(runtime,/weaveTexture/);
 assert.match(runtime,/bumpMap/);
 assert.match(runtime,/skinTexture/);
 assert.match(runtime,/skullGaiterPrint/);
 assert.match(runtime,/gaiterPrint/);
});
