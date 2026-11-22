/* Optional offline GLB gzip transport, not a Draco/Meshopt decoder.
 * The existing authored River Explorer is always retained as the raw fallback.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyCompressedAssets=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
function localPath(url){
 return typeof url==='string'&&/^(?:\.\/)?[\w.-]+(?:\/[\w.-]+)*\.glb(?:\.gz)?$/.test(url)&&!url.split('/').includes('..');
}
function select(manifest,quality='full',{gzipSupported=typeof DecompressionStream==='function'}={}){
 if(!manifest||!manifest.raw||!localPath(manifest.raw.url)||manifest.raw.encoding!=='raw')throw Error('Valid local raw GLB fallback required');
 const preferred=quality==='lite'?'lite':quality==='cinematic'?'cinematic':'full';
 const candidate=(manifest.variants||{})[preferred];
 if(candidate&&localPath(candidate.url)&&['gzip','raw'].includes(candidate.encoding)&&(candidate.encoding!=='gzip'||gzipSupported))return candidate;
 return manifest.raw;
}
function check(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(b.byteLength<20)throw Error('Truncated GLB');
 const view=new DataView(b.buffer,b.byteOffset,b.byteLength);
 if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==b.byteLength)throw Error('Invalid GLB v2');
 return b;
}
async function inflate(bytes){
 if(typeof DecompressionStream!=='function')throw Error('gzip decoder unavailable; choose raw GLB');
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function loadLocal(manifest,quality='full',{fetcher=fetch,gzipSupported=typeof DecompressionStream==='function'}={}){
 const variant=select(manifest,quality,{gzipSupported}),res=await fetcher(variant.url);
 if(!res.ok)throw Error('Local asset unavailable: '+res.status);
 const bytes=new Uint8Array(await res.arrayBuffer()),decoded=variant.encoding==='gzip'?await inflate(bytes):bytes;
 return {bytes:check(decoded),variant:variant.url,encoding:variant.encoding};
}
return Object.freeze({localPath,select,check,inflate,loadLocal});
});