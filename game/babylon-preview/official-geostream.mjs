/** Candidate-only geographic streaming primitives.
 * The current preview deliberately does not import or mount real-world tiles.
 * None of these client checks substitutes for independent survey authorization.
 */
import { PMTiles } from 'pmtiles';
import { latLngToCell } from 'h3-js';
import { createAssetTransport } from './asset-transport.mjs';

const SHA=/^[0-9a-f]{64}$/i;
function sameOriginUrl(value,origin){
 if(typeof origin!=='string'||typeof value!=='string')throw Error('origin and URL required');
 const base=new URL(origin),url=new URL(value,base.href.endsWith('/')?base.href:base.href+'/');
 if(url.origin!==base.origin||url.username||url.password||url.hash||url.search)throw Error('same-origin unhashed URL required');
 return url.href;
}
/** Protomaps Source interface backed by verified, version-bound HTTP 206 responses. */
export function createPmtilesRangeSource(url,{origin=globalThis.location?.origin,transport=createAssetTransport({origin})}={}){
 const key=sameOriginUrl(url,origin);
 if(typeof transport?.readRange!=='function')throw Error('bounded range transport required');
 let headerPromise=null;
 async function session(signal){
  if(!headerPromise){
   headerPromise=transport.readRange(key,0,127,{signal,requireVersion:true}).then(result=>{
    const bytes=result.bytes;
    if(!(bytes instanceof Uint8Array)||bytes.length!==127||
       String.fromCharCode(...bytes.subarray(0,7))!=='PMTiles'||bytes[7]!==3)throw Error('PMTiles v3 header required');
    if(!Number.isSafeInteger(result.totalBytes)||result.totalBytes<127||typeof result.etag!=='string'||
       !/^"[^"\r\n]*"$/.test(result.etag))throw Error('strong immutable archive identity required');
    return {etag:result.etag,totalBytes:result.totalBytes};
   });
  }
  return headerPromise;
 }
 return Object.freeze({
  getKey:()=>key,
  async getBytes(offset,length,signal,etag){
   if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(length)||length<1)
    throw Error('invalid PMTiles range');
   const version=await session(signal);
   if(etag!==undefined&&etag!==version.etag)throw Error('archive version changed');
   if(offset>=version.totalBytes)throw Error('range exceeds archive');
   const available=Math.min(length,version.totalBytes-offset);
   const result=await transport.readRange(key,offset,available,{
    signal,requireVersion:true,etag:version.etag,totalBytes:version.totalBytes
   });
   if(result.etag!==version.etag||result.totalBytes!==version.totalBytes)throw Error('archive version changed');
   if(!(result.bytes instanceof Uint8Array)||result.bytes.length!==available)throw Error('incomplete range');
   const buffer=result.bytes.slice().buffer;
   return {data:buffer,etag:version.etag};
  }
 });
}
/** Real Protomaps directory and tile decoding; no demo geography is selected. */
export function createPmtilesReader(url,options={}){
 const source=createPmtilesRangeSource(url,options);
 return Object.freeze({source,reader:new PMTiles(source)});
}
export function h3Cell(lat,lon,resolution=9){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||
    !Number.isInteger(resolution)||resolution<0||resolution>15)throw Error('invalid H3 coordinate');
 return latLngToCell(lat,lon,resolution);
}
function assertReview(registration){
 if(!registration||registration.surveyApproved!==true||!SHA.test(registration.assetSha256||'')||
    registration.coordinateSystem!=='EPSG:4978'||registration.verticalDatum!=='NAVD88'||
    !Number.isSafeInteger(registration.controlPoints)||registration.controlPoints<3||
    registration.boundsValidated!==true||typeof registration.humanApprovalId!=='string'||
    registration.humanApprovalId.length<3)throw Error('independent geographic registration review required');
}
/** NASA AMMOS Babylon renderer with camera-driven scene-frame HLOD traversal.
 * Only invoke after authoritative evidence is validated outside the browser.
 */
export function mountOfficialTiles({
 scene,url,origin=globalThis.location?.origin,registration,
 maxTiles=70,TilesRendererClass,CacheClass
}={}){
 assertReview(registration);
 if(scene?.useRightHandedSystem!==true)throw Error('NASA Babylon renderer requires right-handed scene');
 if(!scene.onBeforeRenderObservable?.add||!scene.onBeforeRenderObservable?.remove)throw Error('Babylon scene lifecycle required');
 if(!Number.isSafeInteger(maxTiles)||maxTiles<1||maxTiles>250)throw Error('invalid HLOD tile budget');
 const tileset=sameOriginUrl(url,origin);
 if(typeof TilesRendererClass!=='function')throw Error('official Babylon tile renderer class required');
 const renderer=new TilesRendererClass(tileset,scene);
 if(!renderer||typeof renderer.update!=='function'||typeof renderer.dispose!=='function')
  throw Error('official tile renderer lifecycle required');
 // The upstream default cache is shared; isolate admission-controlled datasets.
 const cache=typeof CacheClass==='function'?new CacheClass():renderer.lruCache;
 if(!cache)throw Error('official tile renderer cache required');
 cache.maxSize=maxTiles;
 cache.minSize=maxTiles;
 renderer.lruCache=cache;
 const observer=scene.onBeforeRenderObservable.add(()=>renderer.update());
 let released=false;
 return Object.freeze({
  renderer,
  dispose(){
   if(released)return;
   released=true;
   scene.onBeforeRenderObservable.remove(observer);
   renderer.dispose();
  }
 });
}

/** Lazily load the genuine upstream browser renderer; Node tests inject a fake renderer
 * without evaluating Babylon's browser-oriented extensionless module imports.
 */
export async function mountOfficialTilesWithUpstream(options={}){
 const [{TilesRenderer},{LRUCache}]=await Promise.all([
  import('3d-tiles-renderer/babylonjs'),import('3d-tiles-renderer/core')
 ]);
 return mountOfficialTiles({...options,TilesRendererClass:TilesRenderer,CacheClass:LRUCache});
}
