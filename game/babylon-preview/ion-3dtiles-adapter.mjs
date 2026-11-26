// Candidate-only Cesium ion bridge. Never use ion metadata as surveyed control.
export const ASSETS=Object.freeze({6204792:'3DTILES',6155964:'TERRAIN'});
export function validateCandidate(manifest){
 if(!manifest||!Object.hasOwn(ASSETS,manifest.assetId))throw Error('asset not in approved inventory');
 if(manifest.type!==ASSETS[manifest.assetId])throw Error('ion type mismatch');
 if(manifest.status!=='ION_COMPLETE_METADATA_ONLY')throw Error('ion metadata not verified');
 if(manifest.productionApproved===true)throw Error('independent geographic release approval required');
 return Object.freeze({assetId:manifest.assetId,type:manifest.type,productionEligible:false});
}
export function createTileController({loader,maxTiles=70}={}){
 if(typeof loader!=='function')throw Error('Babylon-compatible loader required');
 if(!Number.isSafeInteger(maxTiles)||maxTiles<1||maxTiles>250)throw Error('invalid tile budget');
 let active=null;
 async function unload(){if(active){const old=active;active=null;old.controller.abort();await old.resource.dispose();}}
 async function load(candidate,{registration,signal}={}){
  const item=validateCandidate(candidate);
  if(signal?.aborted)throw Error('aborted');
  if(!registration?.admitted)throw Error('registration gate required');
  await unload();
  const controller=new AbortController();
  const cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});
  try{
   const resource=await loader(item,{signal:controller.signal,maxTiles});
   if(controller.signal.aborted){await resource?.dispose?.();throw Error('aborted');}
   if(!resource||typeof resource.dispose!=='function')throw Error('disposable loader resource required');
   active={controller,resource};
   return {assetId:item.assetId,maxTiles,productionEligible:false};
  }finally{signal?.removeEventListener('abort',cancel);}
 }
 return Object.freeze({load,unload,get isLoaded(){return Boolean(active);}});
}
