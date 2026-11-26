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
 let active=null,pending=null,generation=0;
 async function unload(){
  generation++;
  const loading=pending;pending=null;
  if(loading){loading.controller.abort();loading.cleanup();}
  const old=active;active=null;
  if(old){old.controller.abort();old.cleanup();await old.resource.dispose();}
 }
 async function load(candidate,{registration,signal}={}){
  const item=validateCandidate(candidate);
  if(signal?.aborted)throw Error('aborted');
  if(!registration?.admitted)throw Error('registration gate required');
  const id=++generation;
  const previousPending=pending;pending=null;
  if(previousPending){previousPending.controller.abort();previousPending.cleanup();}
  const previousActive=active;active=null;
  if(previousActive){
   previousActive.controller.abort();previousActive.cleanup();
   await previousActive.resource.dispose();
  }
  if(id!==generation||signal?.aborted)throw Error('aborted or superseded');
  const controller=new AbortController();
  const cancel=()=>{
   controller.abort();
   if(active?.id===id){
    void unload().catch(error=>globalThis.console?.error?.('tile disposal failed',error));
   }
  };
  signal?.addEventListener('abort',cancel,{once:true});
  const session={id,controller,cleanup:()=>signal?.removeEventListener('abort',cancel)};
  pending=session;
  try{
   const resource=await loader(item,{signal:controller.signal,maxTiles});
   if(!resource||typeof resource.dispose!=='function')throw Error('disposable loader resource required');
   if(controller.signal.aborted||id!==generation){
    await resource.dispose();
    throw Error('aborted or superseded');
   }
   active={...session,resource};
   if(pending===session)pending=null;
   return {assetId:item.assetId,maxTiles,productionEligible:false};
  }catch(error){
   if(pending===session)pending=null;
   session.cleanup();
   throw error;
  }
 }
 return Object.freeze({load,unload,get isLoaded(){return Boolean(active);}});
}
