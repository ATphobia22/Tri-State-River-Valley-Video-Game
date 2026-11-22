'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Model=require('../src/model-loader.js'),Rigged=require('../src/rigged-hero.js');
const file=fs.readFileSync(path.resolve(__dirname,'../assets/models/river_explorer_rigged.glb'));
const parsed=Model.parseGLB(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
test('all eight GLB-embedded texture images are extracted from the source binary without external URLs',()=>{
 const doc=parsed.json;assert.equal(doc.images.length,8);
 assert.equal(typeof Rigged.extractEmbeddedImage,'function','rigged runtime must decode source GLB image payloads');
 const used=new Set();
 for(const material of doc.materials){
  const id=material.pbrMetallicRoughness?.baseColorTexture?.index;
  if(id===undefined)continue;
  used.add(id);const im=Rigged.extractEmbeddedImage(parsed,id);
  assert.equal(im.mimeType,'image/png');
  assert.ok(im.bytes.length>100);
  assert.deepEqual([...im.bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(im.source,'GLB_BIN');
 }
 assert.equal(used.size,8);
});
test('rejects invalid embedded image indices instead of silently loading a remote texture',()=>{
 assert.throws(()=>Rigged.extractEmbeddedImage(parsed,999),/texture|index|image/i);
});
