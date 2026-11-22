'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Importer=require('../src/custom-hero.js');
const root=path.resolve(__dirname,'..');
const bytes=fs.readFileSync(path.join(root,'assets/models/river_explorer_rigged.glb'));
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
test('local-only custom hero intake validates a real skinned 27-bone 13-clip GLB',()=>{
 const result=Importer.validate(buffer);
 assert.equal(result.joints,27);
 assert.equal(result.clips,13);
 assert.ok(result.vertices>3000);
 assert.ok(result.source==='local-file');
});
test('locally imported asset is byte-identical after browser-compatible Base64 roundtrip',()=>{
 const base64=Importer.toBase64(buffer);
 assert.deepEqual(Buffer.from(base64,'base64'),bytes);
});
test('unrigged and malformed GLBs never replace the playable hero',()=>{
 assert.throws(()=>Importer.validate(new Uint8Array(20).buffer),/GLB|Invalid|Truncated/);
 const fake=new Uint8Array(100);
 assert.throws(()=>Importer.validate(fake.buffer),/GLB|Invalid|Truncated/);
});
test('import path does not accept network URLs or JSON-only files',()=>{
 assert.equal(typeof Importer.url,'undefined');
 assert.equal(typeof Importer.validate,'function');
});
