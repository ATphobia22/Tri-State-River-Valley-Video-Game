const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const {pathToFileURL}=require('node:url');
const load=import(pathToFileURL(path.resolve(__dirname,'../babylon-preview/hero-contract.mjs')).href);
const manifest={name:'RiverExplorer',bytes:20,sha256:'6'.repeat(64),boneCount:27,clips:['Idle','Walk','Run','Sprint','FishingCast','Cook','Track','Drive','Interact','Jump','Land','Farm','Wave']};
test('validated movement action selects named clips and rejects invalid input',async()=>{
 const {chooseHeroAction}=await load;
 assert.equal(chooseHeroAction(0,0.016,false),'Idle');
 assert.equal(chooseHeroAction(0.15,0.016,false),'Walk');
 assert.equal(chooseHeroAction(0.24,0.016,true),'Sprint');
 assert.equal(chooseHeroAction(Infinity,0.016,true),'Idle');
 assert.equal(chooseHeroAction(1,0,true),'Idle');
});
test('integrity gate validates GLB magic, content bytes, shape, and SHA256',async()=>{
 const {verifyHeroBytes}=await load;
 const data=new Uint8Array(20);const v=new DataView(data.buffer);
 data.set([0x67,0x6c,0x54,0x46]);v.setUint32(4,2,true);v.setUint32(8,data.byteLength,true);
 const hash=Array.from(new Uint8Array(await webcrypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const good={...manifest,sha256:hash};
 assert.deepEqual(await verifyHeroBytes(data,good,webcrypto.subtle),{bytes:data.byteLength,sha256:hash});
 await assert.rejects(verifyHeroBytes(data,manifest,webcrypto.subtle),/sha256/i);
 await assert.rejects(verifyHeroBytes(data,{...good,boneCount:10},webcrypto.subtle),/rig/i);
 await assert.rejects(verifyHeroBytes(data,{...good,clips:['Idle']},webcrypto.subtle),/clips/i);
 const malformed=data.slice();malformed[0]=0;
 await assert.rejects(verifyHeroBytes(malformed,good,webcrypto.subtle),/glb/i);
});
test('actual Babylon preview attempts the project GLB with explicit fallback',()=>{
 const hero=fs.readFileSync(path.resolve(__dirname,'../babylon-preview/verified-hero.mjs'),'utf8');
 const main=fs.readFileSync(path.resolve(__dirname,'../babylon-preview/main.js'),'utf8');
 assert.match(hero,/river_explorer_rigged\.glb\?url/);
 assert.match(hero,/verifyHeroBytes/);
 assert.match(main,/loadVerifiedHero/);
 assert.match(main,/heroState='fallback'/);
});
test('Babylon scene disposal supports boolean and callable signatures',async()=>{
 const {isSceneDisposed}=await load;
 assert.equal(isSceneDisposed({isDisposed:false}),false);
 assert.equal(isSceneDisposed({isDisposed:true}),true);
 assert.equal(isSceneDisposed({isDisposed(){return true;}}),true);
 assert.equal(isSceneDisposed({isDisposed(){return false;}}),false);
});
