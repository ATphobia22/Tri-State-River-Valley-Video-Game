const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const loaded=import(pathToFileURL(path.resolve(__dirname,'../babylon-preview/runtime-capabilities.mjs')).href);
test('GitHub Pages without isolation never advertises threaded Wasm',async()=>{
 const {detectBrowserCapabilities,chooseComputeProfile}=await loaded;
 const caps=detectBrowserCapabilities({webgl2:true,webAssembly:true,worker:true,sharedArrayBuffer:true,crossOriginIsolated:false,hardwareConcurrency:16});
 assert.equal(caps.threadsEligible,false);
 assert.equal(caps.simd,'not-tested');
 assert.deepEqual(chooseComputeProfile(caps,{allowThreadedWasm:true}),{backend:'wasm-worker-single',workers:1,threaded:false});
});
test('isolated browsers get capped worker budgets and safe fallbacks',async()=>{
 const {detectBrowserCapabilities,chooseComputeProfile}=await loaded;
 const isolated=detectBrowserCapabilities({webAssembly:true,worker:true,sharedArrayBuffer:true,crossOriginIsolated:true,hardwareConcurrency:16});
 assert.deepEqual(chooseComputeProfile(isolated,{allowThreadedWasm:true,maxWorkers:3}),{backend:'wasm-worker-threads',workers:3,threaded:true});
 assert.deepEqual(chooseComputeProfile(detectBrowserCapabilities()),{backend:'javascript',workers:0,threaded:false});
 assert.deepEqual(chooseComputeProfile(detectBrowserCapabilities({webAssembly:true})),{backend:'wasm-main-thread',workers:0,threaded:false});
 assert.throws(()=>chooseComputeProfile(isolated,{maxWorkers:999}),/limits/);
});
