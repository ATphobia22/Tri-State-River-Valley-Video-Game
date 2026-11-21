const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{parseGLB,decodeBase64,dataAccessor}=require('../src/model-loader.js');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/models/MANIFEST.json'),'utf8'));
for(const m of manifest.models){test(`${m.name} is valid embedded GLB with materials and triangles`,()=>{
 const raw=fs.readFileSync(path.join(__dirname,'../assets/models',m.name+'.glb'));
 const bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
 const p=parseGLB(bytes);
 assert.equal(p.json.asset.version,'2.0');assert.ok(p.json.meshes.length>1);assert.ok(p.json.materials.length>1);
 for(const mesh of p.json.meshes){for(const prim of mesh.primitives){const pos=dataAccessor(p,prim.attributes.POSITION);const indices=dataAccessor(p,prim.indices);assert.equal(pos.channels,3);assert.ok(pos.count>=3);assert.equal(indices.count%3,0);}}
});}
