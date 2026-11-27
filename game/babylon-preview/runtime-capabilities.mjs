/**
 * Capability policy only. It never starts threads or assumes WebGPU/SIMD support.
 * Threads require COOP/COEP cross-origin isolation, shared memory and Workers.
 */
export function detectBrowserCapabilities({
 webgl2=false, webAssembly=false, worker=false, sharedArrayBuffer=false,
 crossOriginIsolated=false, hardwareConcurrency=1
}={}) {
 const cores=Number.isSafeInteger(hardwareConcurrency)?Math.max(1,Math.min(32,hardwareConcurrency)):1;
 return Object.freeze({
  webgl2:webgl2===true,
  wasm:webAssembly===true,
  worker:worker===true,
  crossOriginIsolated:crossOriginIsolated===true,
  threadsEligible:webAssembly===true&&worker===true&&sharedArrayBuffer===true&&crossOriginIsolated===true&&cores>1,
  cores,
  simd:'not-tested',
  webgpu:'not-tested'
 });
}
export function chooseComputeProfile(capabilities,{allowThreadedWasm=false,maxWorkers=4}={}) {
 if(!capabilities || !Number.isSafeInteger(maxWorkers) || maxWorkers<1 || maxWorkers>8)
  throw Error('invalid compute profile limits');
 if(!capabilities.wasm)return Object.freeze({backend:'javascript',workers:0,threaded:false});
 if(!capabilities.worker)return Object.freeze({backend:'wasm-main-thread',workers:0,threaded:false});
 if(allowThreadedWasm===true && capabilities.threadsEligible===true)
  return Object.freeze({backend:'wasm-worker-threads',workers:Math.min(maxWorkers,Math.max(1,capabilities.cores-1)),threaded:true});
 return Object.freeze({backend:'wasm-worker-single',workers:1,threaded:false});
}
