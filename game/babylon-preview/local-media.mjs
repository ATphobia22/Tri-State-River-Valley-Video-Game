/** Session-local user media player: never uploads, caches, or embeds private tracks. */
const AUDIO_EXT=/\.(mp3|m4a|ogg|wav)$/i;
const AUDIO_TYPES=new Set(['','audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/ogg','audio/wav','audio/x-wav']);
const VIDEO_TYPES=new Set(['','video/mp4']);
export const MAX_TRACKS=30;
export function validateLocalMediaFile(file,kind){
 if(kind!=='audio'&&kind!=='video')throw Error('Invalid media kind');
 const name=String(file?.name||'');
 if(!name||name.length>160||/[\/\\\x00-\x1f]/.test(name)||name.includes('..'))throw Error('Invalid local media name');
 const size=file?.size;
 const limit=kind==='audio'?30_000_000:60_000_000;
 if(!Number.isSafeInteger(size)||size<1024||size>limit)throw Error('Invalid media size');
 const type=String(file?.type||'').toLowerCase();
 if(kind==='audio'?(!AUDIO_EXT.test(name)||!AUDIO_TYPES.has(type)) :(!/\.mp4$/i.test(name)||!VIDEO_TYPES.has(type)))
  throw Error('Unsupported local media format');
 return Object.freeze({kind,name,bytes:size});
}
export function installLocalMedia({doc=globalThis.document,host=globalThis}={}){
 if(!doc)return null;
 const element=id=>{const result=doc.getElementById(id);if(!result)throw Error('Missing media UI: '+id);return result;};
 const input=element('soundtrack-input'),tracks=element('soundtrack-tracks'),audio=element('soundtrack-player');
 const play=element('soundtrack-play'),stop=element('soundtrack-stop'),soundStatus=element('soundtrack-status');
 const introInput=element('intro-input'),video=element('intro-player'),introPlay=element('intro-play');
 const introSkip=element('intro-skip'),overlay=element('intro-overlay'),introStatus=element('intro-status');
 const listeners=[];
 const listen=(node,event,fn)=>{node.addEventListener(event,fn);listeners.push([node,event,fn]);};
 let playlist=[],introUrl=null,disposed=false;
 const setStatus=(node,message)=>{node.textContent=message;};
 function resetSoundtrack(){
  audio.pause();audio.removeAttribute('src');audio.load();
  for(const row of playlist)host.URL.revokeObjectURL(row.url);
  playlist=[];tracks.replaceChildren();tracks.disabled=true;play.disabled=true;stop.disabled=true;
 }
 function loadTracks(fileList){
  if(disposed)throw Error('media player disposed');
  const files=Array.from(fileList||[]);
  if(files.length>MAX_TRACKS)throw Error('Track count exceeds '+MAX_TRACKS);
  const staged=[];
  try{
   for(const file of files){
    const info=validateLocalMediaFile(file,'audio');
    staged.push({...info,url:host.URL.createObjectURL(file)});
   }
  }catch(error){for(const row of staged)host.URL.revokeObjectURL(row.url);throw error;}
  resetSoundtrack();playlist=staged;
  for(let i=0;i<playlist.length;i++){
   const option=doc.createElement('option');option.value=String(i);option.textContent=playlist[i].name;tracks.appendChild(option);
  }
  tracks.disabled=playlist.length===0;play.disabled=playlist.length===0;stop.disabled=playlist.length===0;
  if(playlist.length){audio.src=playlist[0].url;audio.load();}
  setStatus(soundStatus,playlist.length+' local track(s) ready; tap Play to hear them. Nothing was uploaded.');
  return playlist.length;
 }
 function selectedTrack(){
  const index=Number(tracks.value);
  if(!Number.isSafeInteger(index)||index<0||index>=playlist.length)throw Error('Invalid track selection');
  return playlist[index];
 }
 function setSelected(){
  audio.pause();
  const row=selectedTrack();audio.src=row.url;audio.load();
  setStatus(soundStatus,'Selected '+row.name+' — tap Play.');
 }
 function start(){
  const row=selectedTrack();
  if(audio.src!==row.url){audio.src=row.url;audio.load();}
  const maybe=audio.play();
  if(maybe?.catch)void maybe.catch(error=>setStatus(soundStatus,'Playback blocked: '+String(error.message||error)));
 }
 function halt(){audio.pause();setStatus(soundStatus,'Soundtrack paused.');}
 function setIntro(file){
  if(disposed)throw Error('media player disposed');
  const info=validateLocalMediaFile(file,'video');
  const next=host.URL.createObjectURL(file);
  video.pause();video.removeAttribute('src');video.load();
  if(introUrl)host.URL.revokeObjectURL(introUrl);
  introUrl=next;video.src=introUrl;video.load();introPlay.disabled=false;
  setStatus(introStatus,info.name+' ready — tap Play Intro. Nothing was uploaded.');
 }
 function closeIntro(){video.pause();overlay.hidden=true;video.currentTime=0;}
 function startIntro(){
  if(!introUrl)return;
  audio.pause();overlay.hidden=false;video.currentTime=0;
  const maybe=video.play();
  if(maybe?.catch)void maybe.catch(error=>setStatus(introStatus,'Intro playback blocked: '+String(error.message||error)));
 }
 listen(input,'change',()=>{try{loadTracks(input.files);}catch(error){setStatus(soundStatus,'Soundtrack rejected: '+String(error.message||error));}});
 listen(tracks,'change',()=>{try{setSelected();}catch(error){setStatus(soundStatus,String(error.message||error));}});
 listen(play,'click',()=>{try{start();}catch(error){setStatus(soundStatus,String(error.message||error));}});
 listen(stop,'click',halt);
 listen(audio,'ended',()=>{
  const next=Number(tracks.value)+1;
  if(next>=playlist.length){setStatus(soundStatus,'Playlist finished.');return;}
  tracks.value=String(next);setSelected();start();
 });
 listen(introInput,'change',()=>{
  try{if(introInput.files?.[0])setIntro(introInput.files[0]);}
  catch(error){setStatus(introStatus,'Intro rejected: '+String(error.message||error));}
 });
 listen(introPlay,'click',startIntro);
 listen(introSkip,'click',closeIntro);
 listen(video,'ended',closeIntro);
 play.disabled=true;stop.disabled=true;tracks.disabled=true;introPlay.disabled=true;overlay.hidden=true;
 function dispose(){
  if(disposed)return;disposed=true;
  for(const [node,event,fn] of listeners)node.removeEventListener(event,fn);
  closeIntro();resetSoundtrack();video.removeAttribute('src');video.load();
  if(introUrl)host.URL.revokeObjectURL(introUrl);introUrl=null;
 }
 return Object.freeze({dispose,loadTracks,setIntro,get playlistLength(){return playlist.length;}});
}
