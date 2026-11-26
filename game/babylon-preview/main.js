import {
 Engine, Scene, ArcRotateCamera, Vector3, Color3, Color4, HemisphericLight,
 DirectionalLight, MeshBuilder, PBRMaterial, ShadowGenerator
} from '@babylonjs/core';
import {resolve} from './quality.mjs';
import {installPlayable} from './playable.mjs';
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
const ground=MeshBuilder.CreateGround('illustrative-ground',{width:120,height:120,subdivisions:4},scene);
const soil=new PBRMaterial('soil',scene);soil.albedoColor=new Color3(.32,.43,.29);soil.roughness=.95;ground.material=soil;ground.receiveShadows=true;
for(let i=0;i<24;i++){
 const x=(i%6-2.5)*15,z=(Math.floor(i/6)-1.5)*18;
 const block=MeshBuilder.CreateBox('illustrative-block-'+i,{width:8,height:6+(i%4)*2,depth:9},scene);
 block.position.set(x,(6+(i%4)*2)/2,z);
 const mat=new PBRMaterial('building-mat-'+i,scene);
 mat.albedoColor=Color3.FromHexString(['#bfa98f','#b9ac9a','#987f69','#bba68e'][i%4]);
 mat.metallic=0;mat.roughness=.82;block.material=mat;
 shadows.addShadowCaster(block);
}
function applyQuality(name){
 const p=resolve(name);
 engine.setHardwareScalingLevel(p.hardwareScaling);
 if(shadows.getShadowMap()?.getSize().width!==p.shadowMap){
  shadows.dispose();
  shadows=new ShadowGenerator(p.shadowMap,sun);
  shadows.usePercentageCloserFiltering=true;
  for(const mesh of scene.meshes) if(mesh.name.startsWith('illustrative-block-')) shadows.addShadowCaster(mesh);
 }
 status.textContent='Babylon.js WebGL'+engine.webGLVersion+' · '+p.name+
  ' · illustrative demo only · registered tiles: 0';
 return p;
}
quality.addEventListener('change',()=>applyQuality(quality.value));
applyQuality(quality.value);
const qa={frames:0,meshCount:scene.meshes.length,activeMeshes:0};
const adventure=installPlayable({scene,engine,camera,qa});
qa.meshCount=scene.meshes.length;
window.__RIVER_BABYLON_QA__=qa;
engine.runRenderLoop(()=>{
 scene.render();
 qa.frames++;
 qa.activeMeshes=scene.getActiveMeshes().length;
});
window.addEventListener('resize',()=>engine.resize());
window.addEventListener('pagehide',()=>{engine.stopRenderLoop();scene.dispose();engine.dispose();},{once:true});
