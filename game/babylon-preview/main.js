import {
 Engine, Scene, ArcRotateCamera, Vector3, Color4, HemisphericLight,
 DirectionalLight, ShadowGenerator
} from '@babylonjs/core';
import {resolve} from './quality.mjs';
import {installPlayable} from './playable.mjs';
import {loadVerifiedHero} from './verified-hero.mjs';
import {installLocalMedia} from './local-media.mjs';
import {createFrameSupervisor} from './frame-supervisor.mjs';
import {mountGeographicStage} from './geo-stage.mjs';
import {detectBrowserCapabilities,chooseComputeProfile} from './runtime-capabilities.mjs';
const canvas=document.getElementById('babylon-world');
const status=document.getElementById('status');
const quality=document.getElementById('quality');
const gl=canvas.getContext('webgl2',{antialias:true,alpha:false});
if(!gl) {
 status.textContent='WebGL2 unavailable — this preview does not silently downgrade to WebGL1.';
 throw new Error('WebGL2 required');
}
const engine=new Engine(canvas,true,{disableWebGL2Support:false,disableWebGL1Support:true,preserveDrawingBuffer:false,stencil:true});
if(engine.webGLVersion!==2)throw new Error('WebGL2 context required');
const scene=new Scene(engine);
scene.clearColor=new Color4(.49,.66,.71,1);
const camera=new ArcRotateCamera('valley-camera',Math.PI/3,1.15,65,new Vector3(0,0,0),scene);
camera.attachControl(canvas,true);
camera.lowerRadiusLimit=12;camera.upperRadiusLimit=140;
new HemisphericLight('ambient',new Vector3(0,1,0),scene).intensity=.75;
const sun=new DirectionalLight('sun',new Vector3(-.5,-1,-.35),scene);
sun.position=new Vector3(50,90,35);sun.intensity=2;
let shadows=new ShadowGenerator(1024,sun);
shadows.usePercentageCloserFiltering=true;
let geographicState='loading';
function applyQuality(name){
 const p=resolve(name);
 engine.setHardwareScalingLevel(p.hardwareScaling);
 if(shadows.getShadowMap()?.getSize().width!==p.shadowMap){
  shadows.dispose();
  shadows=new ShadowGenerator(p.shadowMap,sun);
  shadows.usePercentageCloserFiltering=true;
 }
 status.textContent='Babylon.js WebGL'+engine.webGLVersion+' · '+p.name+
  ' · aerial reference '+geographicState+' · elevations unverified · registered tiles: 0';
 return p;
}
quality.addEventListener('change',()=>applyQuality(quality.value));
applyQuality(quality.value);
const browserCapabilities=detectBrowserCapabilities({
 webgl2:engine.webGLVersion===2,
 webAssembly:typeof WebAssembly!=='undefined',
 worker:typeof Worker!=='undefined',
 sharedArrayBuffer:typeof SharedArrayBuffer!=='undefined',
 crossOriginIsolated:globalThis.crossOriginIsolated===true,
 hardwareConcurrency:navigator.hardwareConcurrency
});
const qa={frames:0,meshCount:scene.meshes.length,activeMeshes:0,renderState:'healthy',renderFaults:0,heroState:'loading',
 browserCapabilities,computePolicy:chooseComputeProfile(browserCapabilities)};
const geography=mountGeographicStage(scene);
void geography.ready.then(info=>{
 geographicState=info.state==='source-plotted'?'source-plotted':'unavailable';
 qa.geography=info;
 qa.meshCount=scene.meshes.length;
 applyQuality(quality.value);
}).catch(error=>{
 geographicState='unavailable';
 qa.geography={state:'unavailable',error:String(error?.message||error)};
 applyQuality(quality.value);
});
const adventure=installPlayable({scene,engine,camera,qa});
const media=installLocalMedia();
const heroAbort=new AbortController();
const heroStatus=document.getElementById('hero-status');
void loadVerifiedHero({scene,qa,signal:heroAbort.signal}).then(controller=>{
 if(heroAbort.signal.aborted){controller.dispose();return;}
 adventure.attachHeroVisual(controller);
 qa.meshCount=scene.meshes.length;
 if(heroStatus)heroStatus.textContent='Verified River Explorer: 27 bones, 13 clips, PBR materials';
}).catch(error=>{
 if(heroAbort.signal.aborted)return;
 qa.heroState='fallback';qa.heroError=String(error?.message||error);
 if(heroStatus)heroStatus.textContent='River Explorer fallback active: '+qa.heroError;
});
qa.meshCount=scene.meshes.length;
window.__RIVER_BABYLON_QA__=qa;
const renderSupervisor=createFrameSupervisor({
 render:()=>scene.render(),
 onFrame:()=>{
  qa.frames++;
  qa.activeMeshes=scene.getActiveMeshes().length;
 },
 onError:({message,failureCount,retryFrames})=>{
  qa.renderState='degraded';
  qa.renderFaults++;
  qa.lastRenderError=message;
  status.textContent='WebGL2 render fault ('+failureCount+') · retry in '+retryFrames+' frames · '+message;
 },
 onRecovered:()=>{
  qa.renderState='healthy';
  qa.lastRenderError=null;
  applyQuality(quality.value);
 }
});
engine.runRenderLoop(()=>renderSupervisor.tick());
window.addEventListener('resize',()=>engine.resize());
window.addEventListener('pagehide',()=>{heroAbort.abort();media?.dispose();geography.dispose();engine.stopRenderLoop();scene.dispose();engine.dispose();},{once:true});
