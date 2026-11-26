/* Optional local-only NPC inference. No model is loaded during game boot.
 * A user request starts one isolated worker; termination releases its reservation.
 * Application accounting is a conservative planning estimate, not driver VRAM.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyLocalAI=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const MODEL=Object.freeze({id:'onnx-community/SmolLM2-135M-Instruct-ONNX',revision:'b8a5c0f183b78c55955a5364f610c36668b5e681',dtype:'q4',weightBytes:180581125,reserveBytes:512*1024*1024});
 const bounded=(value,max)=>typeof value==='string'?value.replace(/[\x00-\x08\x0b-\x1f]/g,'').trim().slice(0,max):'';
 function fallback(context){return 'The local guide is unavailable. '+(bounded(context,700)||'Explore the marked landmarks and activities on your map.');}
 function create({budget,modelBytes=MODEL.reserveBytes,getGraphicsBytes,workerFactory,onChange=()=>{},timeoutMs=240000,setTimer=setTimeout,clearTimer=clearTimeout}){
  if(!budget||typeof getGraphicsBytes!=='function'||typeof workerFactory!=='function'||!Number.isSafeInteger(modelBytes)||modelBytes<=0)throw new TypeError('Invalid local AI controller');
  let active=null,sequence=0,state={phase:'idle',text:'',device:null};
  const snapshot=()=>({...state});
  function publish(phase,text,device){state={phase,text,device};onChange(snapshot());}
  function finish(job,phase,text){
   if(active!==job)return;
   active=null;
   if(job.timer!==undefined)clearTimer(job.timer);
   // Terminate the isolated runtime before removing its application reservation.
   if(job.worker){job.worker.onmessage=null;job.worker.onerror=null;job.worker.onmessageerror=null;job.worker.terminate();}
   budget.release(job.id);
   publish(phase,text,job.device);
  }
  function start({question,context='',device='wasm'}={}){
   question=bounded(question,256);context=bounded(context,700);
   if(active||!question||!['webgpu','wasm'].includes(device))return false;
   const id='npc-guide:'+ ++sequence;
   try{
    budget.setGraphicsBytes(Math.ceil(getGraphicsBytes()));
    if(!budget.reserve(id,modelBytes)){publish('blocked','Insufficient estimated application memory headroom. '+fallback(context),device);return false;}
   }catch(_){publish('blocked','Graphics allocation estimate unavailable. '+fallback(context),device);return false;}
   const job={id,device,context,worker:null,timer:undefined};active=job;
   try{
    job.worker=workerFactory();
    job.worker.onmessage=({data})=>{
     if(active!==job)return;
     if(data?.kind==='status'&&['loading','generating'].includes(data.phase))publish(data.phase,data.phase==='loading'?'Loading optional local model…':'Generating locally…',device);
     else if(data?.kind==='result'){const answer=bounded(data.text,600);finish(job,answer?'ready':'fallback',answer||fallback(context));}
     else if(data?.kind==='error')finish(job,'fallback',fallback(context));
    };
    job.worker.onerror=e=>{e?.preventDefault?.();finish(job,'fallback',fallback(context));};
    job.worker.onmessageerror=()=>finish(job,'fallback',fallback(context));
    job.timer=setTimer(()=>finish(job,'fallback',fallback(context)),timeoutMs);
    publish('loading','Loading optional local model…',device);
    job.worker.postMessage({question,context,device});
    return true;
   }catch(_){finish(job,'fallback',fallback(context));return false;}
  }
  function cancel(){if(!active)return false;finish(active,'cancelled','Local inference cancelled.');return true;}
  return Object.freeze({start,cancel,snapshot});
 }
 // This body runs only in a separately created module Worker, after explicit opt-in.
 // The pinned distribution and ONNX model are downloaded on demand. No remote
 // inference endpoint is used. The worker cannot modify authoritative game state.
 function inferenceWorker(){
  let busy=false;
  self.onmessage=async({data})=>{
   if(busy)return;busy=true;
   try{
    const {question,context,device}=data;
    if(typeof question!=='string'||question.length>256||typeof context!=='string'||context.length>700||!['webgpu','wasm'].includes(device))throw Error('invalid request');
    self.postMessage({kind:'status',phase:'loading'});
    const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
    env.allowLocalModels=false;
    env.useBrowserCache=true;
    if(env.backends?.onnx?.wasm){
     env.backends.onnx.wasm.numThreads=1;
     env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/';
    }
    const generate=await pipeline('text-generation','onnx-community/SmolLM2-135M-Instruct-ONNX',{revision:'b8a5c0f183b78c55955a5364f610c36668b5e681',dtype:'q4',device});
    self.postMessage({kind:'status',phase:'generating'});
    const messages=[{role:'system',content:'You are a brief, family-friendly fictional River Valley game guide. Use only supplied game facts; if uncertain say so. Never claim real-world directions or change game state. Facts: '+context},{role:'user',content:question}];
    const result=await generate(messages,{max_new_tokens:48,do_sample:false,return_full_text:false});
    let value=result?.[0]?.generated_text;
    if(Array.isArray(value))value=[...value].reverse().find(v=>v.role==='assistant')?.content;
    if(typeof value!=='string'||!value.trim())throw Error('empty model response');
    self.postMessage({kind:'result',text:value.slice(0,600)});
    await generate.dispose?.();
   }catch(_){self.postMessage({kind:'error'});}
  };
 }
 function createBrowserWorker(){
  const url=URL.createObjectURL(new Blob(['('+inferenceWorker.toString()+')()'],{type:'text/javascript'}));
  try{return new Worker(url,{type:'module',name:'River Valley optional NPC inference'});}finally{URL.revokeObjectURL(url);}
 }
 return Object.freeze({MODEL,create,createBrowserWorker});
});
