'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const tool = path.resolve(__dirname, '../tools/audit_river_candidate.py');
function fixture({bones=1, animations=['Idle'], indices=3, externalImage=false, invalidView=false}={}) {
  const doc = {
    asset:{version:'2.0'}, buffers:[{byteLength:48}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:12}],
    accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:3},
      {bufferView:1,componentType:5125,type:'SCALAR',count:indices}],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
    skins:[{joints:Array.from({length:bones},(_,i)=>i)}],
    animations:animations.map(name=>({name})), images:externalImage?[{uri:'https://example.com/texture.png'}]:[],nodes:[]
  };
  if(invalidView) doc.bufferViews[0].byteLength=1000;
  const json = Buffer.from(JSON.stringify(doc));
  const jsonPad = Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
  const bin = Buffer.alloc(48);
  const header=Buffer.alloc(12);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+jsonPad.length+8+bin.length,8);
  const jc=Buffer.alloc(8);jc.writeUInt32LE(jsonPad.length,0);jc.write('JSON',4);
  const bc=Buffer.alloc(8);bc.writeUInt32LE(bin.length,0);bc.write('BIN\0',4);
  return Buffer.concat([header,jc,jsonPad,bc,bin]);
}
function audit(file, args=[]) {
  const run=spawnSync('python3',[tool,file,...args,'--strict'],{encoding:'utf8'});
  if(run.error) throw run.error;
  return {status:run.status, report:JSON.parse(run.stdout), stderr:run.stderr};
}
function tempFiles(cb){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'river-gate-'));try{return cb(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('a compatible self-contained animated River candidate passes structural audit',()=>tempFiles(dir=>{
  const glb=path.join(dir,'ok.glb'),manifest=path.join(dir,'current.json');
  fs.writeFileSync(glb,fixture());fs.writeFileSync(manifest,JSON.stringify({boneCount:1,clips:['Idle']}));
  const r=audit(glb,['--baseline-manifest',manifest,'--max-triangles','2']);
  assert.equal(r.status,0,r.stderr);assert.equal(r.report.validGlb,true);
  assert.equal(r.report.triangleCount,1);assert.equal(r.report.boneCount,1);
  assert.deepEqual(r.report.blockers,[]);assert.equal(r.report.usesExternalResources,false);
}));
test('reject invalid GLB header without promoting input',()=>tempFiles(dir=>{
  const glb=path.join(dir,'bad.glb');fs.writeFileSync(glb,Buffer.alloc(32));
  const r=audit(glb);assert.equal(r.status,2);assert.equal(r.report.validGlb,false);
  assert.match(r.report.blockers[0],/Invalid GLB/);
}));
test('reject changed rig, lost gameplay clips and excessive runtime triangles',()=>tempFiles(dir=>{
  const glb=path.join(dir,'wrong.glb'),manifest=path.join(dir,'current.json');
  fs.writeFileSync(glb,fixture({bones:13,animations:['Idle','Walk']}));
  fs.writeFileSync(manifest,JSON.stringify({boneCount:27,clips:['Idle','Walk','FishingCast','Drive']}));
  const r=audit(glb,['--baseline-manifest',manifest,'--max-triangles','0']);
  assert.equal(r.status,2);assert.ok(r.report.blockers.some(x=>x.includes('Rig mismatch')));
  assert.ok(r.report.blockers.some(x=>x.includes('Missing controller clips')));
  assert.ok(r.report.blockers.some(x=>x.includes('triangle budget')));
}));
test('reject remote image references, preserving full offline self-containment',()=>tempFiles(dir=>{
  const glb=path.join(dir,'remote.glb');fs.writeFileSync(glb,fixture({externalImage:true}));
  const r=audit(glb);assert.equal(r.status,2);assert.equal(r.report.usesExternalResources,true);
  assert.ok(r.report.blockers.some(x=>x.includes('Image URIs')));
}));
test('reject an embedded buffer view outside the binary chunk',()=>tempFiles(dir=>{
  const glb=path.join(dir,'overflow.glb');fs.writeFileSync(glb,fixture({invalidView:true}));
  const r=audit(glb);assert.equal(r.status,2);
  assert.ok(r.report.blockers.some(x=>x.includes('bufferView 0')));
}));
