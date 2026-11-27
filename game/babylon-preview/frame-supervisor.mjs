/** Keep Babylon's requestAnimationFrame callback alive after synchronous render faults.
 * Retries are bounded by frame cooldown; no asset admission or geographic claims.
 */
export function createFrameSupervisor({
 render,onFrame=()=>{},onError=()=>{},onRecovered=()=>{},maxBackoffFrames=120
}={}){
 if(typeof render!=='function')throw new TypeError('render callback required');
 for(const [name,callback] of Object.entries({onFrame,onError,onRecovered})){
  if(typeof callback!=='function')throw new TypeError(name+' callback required');
 }
 if(!Number.isSafeInteger(maxBackoffFrames)||maxBackoffFrames<1||maxBackoffFrames>600)
  throw new RangeError('invalid backoff frame budget');
 let tickNumber=0,failureCount=0,nextAttempt=1,lastError=null;
 function state(){
  return Object.freeze({failureCount,retryFrames:Math.max(0,nextAttempt-tickNumber),lastError});
 }
 return Object.freeze({
  tick(){
   tickNumber++;
   if(tickNumber<nextAttempt)return false;
   try{
    render();
    onFrame();
    const recovered=failureCount>0;
    failureCount=0;lastError=null;
    nextAttempt=tickNumber+1;
    if(recovered)onRecovered();
    return true;
   }catch(error){
    failureCount++;
    lastError=error instanceof Error?error.message:String(error);
    const backoff=Math.min(maxBackoffFrames,2**Math.min(20,failureCount-1));
    nextAttempt=tickNumber+backoff;
    try{onError(Object.freeze({message:lastError,failureCount,retryFrames:backoff}));}
    catch(reportingError){globalThis.console?.error?.('render failure reporter failed',reportingError);}
    return false;
   }
  },
  get state(){return state();}
 });
}
