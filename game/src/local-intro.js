/* River Valley user-owned intro video. Local MP4 only, no remote URLs.
 * Browser storage is opt-in when selecting a video; user can clear it at will.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyLocalIntro=api;})(typeof globalThis==='object'?globalThis:this,function(root){
'use strict';
const DB_NAME='river-valley-user-intro-v1',STORE='media',KEY='intro-mp4',MAX_BYTES=60_000_000;
function validateClip(file){
 const name=String(file?.name||'');
 if(!/\.mp4$/i.test(name)||(!['video/mp4',''].includes(String(file?.type||''))))throw Error('Choose a local MP4 intro video');
 if(!Number.isSafeInteger(file?.size)||file.size<1024||file.size>MAX_BYTES)throw Error('Intro MP4 must be within the 60 MB limit');
 return Object.freeze({name,bytes:file.size,format:'video/mp4'});
}
function openDB(){
 return new Promise((resolve,reject)=>{
  if(!root.indexedDB)return reject(Error('IndexedDB unavailable'));
  const request=root.indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
  request.onerror=()=>reject(request.error||Error('Media store unavailable'));
  request.onsuccess=()=>resolve(request.result);
 });
}
async function store(blob){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put(blob,KEY);
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||Error('Media save failed'));
 });}finally{db.close();}
}
async function retrieve(){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).get(KEY);
  request.onsuccess=()=>resolve(request.result||null);
  request.onerror=()=>reject(request.error||Error('Media read failed'));
 });}finally{db.close();}
}
async function clear(){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).delete(KEY);
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||Error('Media clear failed'));
 });}finally{db.close();}
}
function install(){
 if(!root.document)return null;
 const doc=root.document,input=doc.getElementById('localIntroFile'),status=doc.getElementById('localIntroStatus'),
 video=doc.getElementById('localIntroVideo'),play=doc.getElementById('playBtn'),skip=doc.getElementById('skipIntro'),
 clearBtn=doc.getElementById('clearLocalIntro');
 if(!input||!status||!video||!play||!skip||!clearBtn)return null;
 let clipURL=null,bypass=false,finish=null;
 const message=v=>{status.textContent=v;};
 const setClip=blob=>{
  if(clipURL)URL.revokeObjectURL(clipURL);
  clipURL=blob?URL.createObjectURL(blob):null;
  message(blob?'Your Home Sweet Home intro is saved locally for offline playback.':'No local intro selected; the game starts normally.');
 };
 function stop(){
  video.pause();video.hidden=true;video.removeAttribute('src');video.load();
  if(finish){const callback=finish;finish=null;callback();}
 }
 skip.addEventListener('click',stop);
 video.addEventListener('ended',stop);
 video.addEventListener('error',()=>{message('Intro playback failed; game remains playable.');stop();});
 play.addEventListener('click',e=>{
  if(bypass){bypass=false;return;}
  if(!clipURL)return;
  e.stopImmediatePropagation();e.preventDefault();
  video.src=clipURL;video.hidden=false;video.currentTime=0;
  finish=()=>{bypass=true;play.click();};
  // play() is called synchronously from the real user tap to preserve iOS audio permission.
  const result=video.play();
  if(result&&typeof result.catch==='function')result.catch(()=>{message('Video could not play on this browser; starting game.');stop();});
 },true);
 input.addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
   const result=validateClip(file);setClip(file);
   try{await store(file);message('Intro saved offline: '+result.name+' ('+Math.round(result.bytes/1e6)+' MB)');}
   catch(_){message('Intro ready this session; Safari storage unavailable.');}
  }catch(err){message('Intro rejected: '+String(err.message));}
 });
 clearBtn.addEventListener('click',async()=>{
  if(finish){finish=null;video.pause();video.hidden=true;}
  setClip(null);input.value='';
  try{await clear();}catch(_){}
 });
 retrieve().then(blob=>{if(blob&&blob.size<=MAX_BYTES)setClip(blob);}).catch(()=>{});
 return Object.freeze({get active(){return !!clipURL;},stop});
}
return Object.freeze({DB_NAME,STORE,KEY,MAX_BYTES,validateClip,install});
});