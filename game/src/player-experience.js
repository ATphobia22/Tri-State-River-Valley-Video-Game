/* Offline-only player experience preferences and standard gamepad input.
 * No external requests, device identifiers, analytics or game-engine dependencies.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyPlayerExperience=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const STORAGE_KEY='river-valley-player-experience-v1';
const DEFAULTS=Object.freeze({
 largeText:false,highContrast:false,reducedMotion:false,compactHud:false,
 leftHandedTouch:false,showHints:true,gamepadEnabled:true
});
const CLASSES=Object.freeze({
 largeText:'ux-large-text',highContrast:'ux-high-contrast',reducedMotion:'ux-reduced-motion',
 compactHud:'ux-compact-hud',leftHandedTouch:'ux-left-handed',showHints:'ux-show-hints'
});
function normalize(input){
 const output={};
 for(const [key,fallback] of Object.entries(DEFAULTS))
  output[key]=input&&typeof input[key]==='boolean'?input[key]:fallback;
 return output;
}
function load(storage){
 try{return normalize(JSON.parse(storage?.getItem(STORAGE_KEY)||'null'));}
 catch(_){return normalize(null);}
}
function store(storage,prefs){
 try{storage?.setItem(STORAGE_KEY,JSON.stringify(normalize(prefs)));return true;}
 catch(_){return false;}
}
function apply(document,prefs){
 const body=document?.body;
 if(!body?.classList)return;
 for(const [key,className] of Object.entries(CLASSES))
  body.classList.toggle(className,key==='showHints'?Boolean(prefs[key]):Boolean(prefs[key]));
}
function createPreferences({storage,document}={}){
 let value=load(storage);
 function sync(){
  apply(document,value);
  for(const el of document?.querySelectorAll?.('[data-player-pref]')||[]){
   const key=el.getAttribute('data-player-pref');
   if(Object.prototype.hasOwnProperty.call(value,key)&&el.type==='checkbox')el.checked=value[key];
  }
  const feedback=document?.getElementById?.('playerPrefStatus');
  if(feedback)feedback.textContent='Player display and control preferences stay on this device.';
 }
 function set(key,enabled){
  if(!Object.prototype.hasOwnProperty.call(DEFAULTS,key))throw new RangeError('Unknown player preference');
  value={...value,[key]:Boolean(enabled)};
  store(storage,value);
  sync();
  return value[key];
 }
 function bind(){
  sync();
  for(const el of document?.querySelectorAll?.('[data-player-pref]')||[]){
   if(el.type!=='checkbox')continue;
   const key=el.getAttribute('data-player-pref');
   if(!Object.prototype.hasOwnProperty.call(DEFAULTS,key))continue;
   el.addEventListener('change',()=>set(key,el.checked));
  }
 }
 return Object.freeze({get:key=>value[key],snapshot:()=>({...value}),set,bind});
}
function axis(value,deadzone=.18){
 if(!Number.isFinite(value))return 0;
 const n=Math.max(-1,Math.min(1,value));
 if(Math.abs(n)<=deadzone)return 0;
 return Math.sign(n)*(Math.abs(n)-deadzone)/(1-deadzone);
}
function sampleGamepad(getGamepads,enabled=true){
 const none={connected:false,x:0,z:0,lookX:0,lookY:0,aimLeft:false,aimRight:false,sprint:false,jump:false,interact:false,map:false,pause:false,back:false};
 if(!enabled||typeof getGamepads!=='function')return none;
 let pads;
 try{pads=getGamepads();}catch(_){return none;}
 const pad=Array.from(pads||[]).find(p=>p&&p.connected&&p.mapping==='standard');
 if(!pad)return none; // Do not guess proprietary/nonstandard face-button mappings.
 const pressed=i=>Boolean(pad.buttons?.[i]?.pressed);
 let x=axis(pad.axes?.[0]),z=axis(pad.axes?.[1]);
 if(pressed(14))x=-1;else if(pressed(15))x=1;
 if(pressed(12))z=-1;else if(pressed(13))z=1;
 return {connected:true,x,z,lookX:axis(pad.axes?.[2]),lookY:axis(pad.axes?.[3]),
  aimLeft:pressed(4),aimRight:pressed(5),sprint:pressed(7)||pressed(6),jump:pressed(0),
  interact:pressed(2),map:pressed(3),pause:pressed(9),back:pressed(1)};
}
return Object.freeze({STORAGE_KEY,DEFAULTS,normalize,load,store,apply,createPreferences,axis,sampleGamepad});
});
