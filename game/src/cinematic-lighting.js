/* River Valley cinematic daylight and atmosphere, real WebGL scene parameters.
 * Game art, not a physical lighting simulation. Offline, original and deterministic.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValleyCinematicLighting=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const finite=(v,fallback)=>Number.isFinite(v)?v:fallback;
 const HEX=Object.freeze({
  noon:{sky:'#a9c9d8',horizon:'#f0d6a3',zenith:'#437fab',fog:'#b9c8bd',sun:'#fff0d4',hemi:'#cbe5fb',ground:'#596a47'},
  golden:{sky:'#a6b1b2',horizon:'#ffd3a0',zenith:'#3a648c',fog:'#d3b6a0',sun:'#ffc07b',hemi:'#ffd9b1',ground:'#635644'},
  blue:{sky:'#344e6a',horizon:'#9d8992',zenith:'#16294f',fog:'#667f90',sun:'#b3bfe2',hemi:'#91b1d5',ground:'#333d48'},
  night:{sky:'#17243b',horizon:'#333c55',zenith:'#0c1831',fog:'#3c4d61',sun:'#8fa8d0',hemi:'#7498c2',ground:'#2b3343'},
  storm:{sky:'#556875',horizon:'#aab3a9',zenith:'#34475b',fog:'#71818a',sun:'#c8dae2',hemi:'#9bb8ca',ground:'#4f5350'},
 });
 const color=(hex)=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
 function mix(a,b,t){
  const left=color(a),right=color(b),weight=clamp(t,0,1);
  return '#'+left.map((n,i)=>Math.round(n+(right[i]-n)*weight).toString(16).padStart(2,'0')).join('');
 }
 function blend(left,right,t){
  const output={};
  for(const key of Object.keys(left))output[key]=mix(left[key],right[key],t);
  return output;
 }
 // Smooth, continuous hour curves avoid a lighting snap across cinematic shots.
 function sample({time=15.5,weather='clear',look='natural',quality='balanced',
                  effects='full',mobile=false}={}){
  const hour=((finite(time,15.5)%24)+24)%24;
  const phase=(hour-6)*Math.PI/12;
  const daylight=clamp(Math.sin(phase),0,1);
  const edge=clamp((daylight-.01)/.30,0,1);
  const morning=hour<12;
  const goldenWindow=(hour>=5.5&&hour<=9)||(hour>=16.25&&hour<=19.5);
  const dusk=goldenWindow?1-clamp((daylight-.02)/.63,0,1):0;
  const lateBlue=(hour>=18&&hour<21)||(hour>=4.5&&hour<6.5);
  const blue=lateBlue?clamp((.43-daylight)/.35,0,1):0;
  let palette=blend(HEX.night,HEX.noon,edge);
  palette=blend(palette,HEX.golden,dusk*(look==='golden'?1:.88));
  palette=blend(palette,HEX.blue,blue*(look==='blue'?1:.82));
  if(look==='lantern'||(hour>=21||hour<4.5))palette=blend(palette,HEX.night,.82);
  const storm=weather==='rain'||look==='storm';
  if(storm)palette=blend(palette,HEX.storm,.78);
  const mist=weather==='mist';
  const sunHeight=Math.max(look==='golden'?.095:.025,daylight);
  const sunPower=storm?.44:mist?.75:1;
  const desiredSun=(.16+2.35*Math.pow(sunHeight,.75))*sunPower;
  const isNight=daylight<.03&&!(look==='golden'&&goldenWindow);
  const sunIntensity=isNight?.055:desiredSun;
  const hemiIntensity=(isNight?.38:.68+daylight*.35)*(storm?.9:1);
  const exposure=clamp((isNight?.94:1.03+daylight*.12)*(storm?.93:1),.65,1.3);
  const fogBase=mist?.00053:storm?.00038:isNight?.00026:dusk?.000245:.00017;
  const fogDensity=effects==='lite'?Math.min(fogBase,.00010):fogBase*(quality==='cinematic'?1.13:1);
  // Direction is shared with atmosphere and water: sunrise east, sunset west.
  const x=Math.cos(phase),z=-.16,inv=1/Math.hypot(x,sunHeight,z);
  const allowShadows=quality==='cinematic'&&effects!=='lite'&&!mobile&&!storm;
  return Object.freeze({
   hour,look,weather,daylight,dusk,blue,morning,
   sky:palette.sky,horizon:palette.horizon,zenith:palette.zenith,
   fog:palette.fog,sun:palette.sun,hemi:palette.hemi,ground:palette.ground,
   sunIntensity,hemiIntensity,exposure,fogDensity,allowShadows,
   sunDirection:Object.freeze({x:x*inv,y:sunHeight*inv,z:z*inv})
  });
 }
 function apply(three,{scene,renderer,sunLight,ambient,playerX=0,playerZ=0,
                        playerY=0,preset}={}){
  if(!preset||!scene||!renderer||!sunLight||!ambient)return false;
  scene.background.set(preset.sky);
  if(scene.fog){scene.fog.color.set(preset.fog);scene.fog.density=preset.fogDensity;}
  ambient.color.set(preset.hemi);
  if(ambient.groundColor)ambient.groundColor.set(preset.ground);
  ambient.intensity=preset.hemiIntensity;
  sunLight.color.set(preset.sun);
  sunLight.intensity=preset.sunIntensity;
  const vector=preset.sunDirection;
  sunLight.position.set(playerX+vector.x*540,playerY+vector.y*540,playerZ+vector.z*540);
  if(sunLight.target){
   sunLight.target.position.set(playerX,playerY,playerZ);
   sunLight.target.updateMatrixWorld?.();
  }
  renderer.toneMappingExposure=preset.exposure;
  if(renderer.shadowMap&&sunLight.shadow){
   const shadowAllowed=!!preset.allowShadows;
   if(renderer.shadowMap.enabled!==shadowAllowed){
    renderer.shadowMap.enabled=shadowAllowed;
    renderer.shadowMap.needsUpdate=true;
   }
   sunLight.castShadow=shadowAllowed;
   if(shadowAllowed&&sunLight.shadow.camera){
    sunLight.shadow.camera.left=-100;sunLight.shadow.camera.right=100;
    sunLight.shadow.camera.top=100;sunLight.shadow.camera.bottom=-100;
    sunLight.shadow.camera.near=1;sunLight.shadow.camera.far=900;
    if(sunLight.shadow.mapSize?.set)sunLight.shadow.mapSize.set(1024,1024);
    sunLight.shadow.bias=-.00025;sunLight.shadow.normalBias=.025;
    sunLight.shadow.camera.updateProjectionMatrix?.();
   }
  }
  return true;
 }
 return Object.freeze({HEX,sample,apply,mix,blend});
});
