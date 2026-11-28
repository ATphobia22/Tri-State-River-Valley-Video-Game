import {MeshBuilder,Vector3,Color3,PBRMaterial,PointLight} from '@babylonjs/core';
import {createAdventure,STOPS,getBrowserStorage} from './gameplay.mjs';
import {chooseHeroAction} from './hero-contract.mjs';
/** Illustrative world gameplay; never reports unsurveyed locations as authoritative geography. */
export function installPlayable({scene,engine,camera,qa,onDiscover=null}){
 const game=createAdventure({storage:getBrowserStorage(window)});
 const player=MeshBuilder.CreateCapsule('playable-explorer',{height:3,radius:.8},scene);
 let heroVisual=null,heading=0;
 const outfit=new PBRMaterial('explorer-cloth',scene);outfit.albedoColor=new Color3(.89,.65,.31);outfit.roughness=.92;player.material=outfit;
 const markers=new Map();
 for(const stop of STOPS){
  const marker=MeshBuilder.CreateCylinder('waypoint-'+stop.id,{height:5,diameter:1.7,tessellation:8},scene);
  marker.position.set(stop.x,3,stop.z);
  const mat=new PBRMaterial('waypoint-color-'+stop.id,scene);
  mat.albedoColor=new Color3(.16,.72,.62);mat.emissiveColor=new Color3(.08,.2,.16);mat.roughness=.4;
  marker.material=mat;markers.set(stop.id,marker);
 }
 const lamp=new PointLight('explorer-lamp',new Vector3(0,4,0),scene);
 lamp.diffuse=new Color3(1,.76,.42);lamp.intensity=0;lamp.range=14;
 const stateNode=document.getElementById('adventure-status');
 const keys=new Set();
 const interactButton=document.getElementById('discover-waypoint');
 const cycleButton=document.getElementById('cycle-time');
 function updateHUD(){
  const s=game.snapshot(),stop=game.nearby();
  if(stateNode)stateNode.textContent='Explored '+s.discovered.length+'/'+s.total+' landmarks · '+(s.hour===21?'night':'day')+' · '+
   (stop?'E: Discover '+stop.title:'WASD move · Shift sprint · E discover · T day/night');
  for(const [id,marker] of markers)marker.material.emissiveColor=s.discovered.includes(id)?new Color3(.45,.28,.04):new Color3(.08,.2,.16);
  if(interactButton)interactButton.disabled=!stop||s.discovered.includes(stop.id);
 }
 function interact(){const stop=game.nearby();if(!stop)return;const result=game.discover(stop.id);if(result.ok)onDiscover?.(stop.id);updateHUD();}
 function cycleTime(){game.setTime(game.snapshot().hour===16?21:16);updateHUD();}
 function onKeyDown(event){
  const tag=event.target?.tagName?.toLowerCase();if(tag==='select'||tag==='input')return;
  const key=event.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){
   keys.add(key);if(key.startsWith('arrow'))event.preventDefault();
  }
  if(key==='e'&&!event.repeat)interact();
  if(key==='t'&&!event.repeat)cycleTime();
 }
 const onKeyUp=event=>keys.delete(event.key.toLowerCase());
 const onBlur=()=>keys.clear();
 window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',onBlur);
 const pointerControls=[];
 for(const node of document.querySelectorAll('[data-move]')){
  const name=node.dataset.move;
  const down=event=>{node.setPointerCapture?.(event.pointerId);keys.add(name);event.preventDefault();};
  const up=()=>keys.delete(name);
  node.addEventListener('pointerdown',down);node.addEventListener('pointerup',up);node.addEventListener('pointercancel',up);
  pointerControls.push([node,down,up]);
 }
 interactButton?.addEventListener('click',interact);cycleButton?.addEventListener('click',cycleTime);
 updateHUD();
 let lastHUD=0;
 const observer=scene.onBeforeRenderObservable.add(()=>{
  const dt=Math.min(engine.getDeltaTime()/1000,.05);
  const dx=Number(keys.has('d')||keys.has('arrowright')||keys.has('right'))-
           Number(keys.has('a')||keys.has('arrowleft')||keys.has('left'));
  const dz=Number(keys.has('s')||keys.has('arrowdown')||keys.has('back'))-
           Number(keys.has('w')||keys.has('arrowup')||keys.has('forward'));
  const before=game.snapshot().position;
  const sprint=keys.has('shift')||keys.has('sprint');
  const snapshot=game.move(dx,dz,dt,sprint);
  const traveled=Math.hypot(snapshot.position.x-before.x,snapshot.position.z-before.z);
  if(traveled>0.0001)heading=Math.atan2(snapshot.position.x-before.x,snapshot.position.z-before.z);
  if(heroVisual){
   try{heroVisual.setPose({position:snapshot.position,heading,action:chooseHeroAction(traveled,dt,sprint)});}
   catch(error){
    qa.heroState='fallback';qa.heroError=String(error?.message||error);
    try{heroVisual.dispose();}catch(disposeError){console.error('hero disposal failed',disposeError);}
    heroVisual=null;player.setEnabled(true);
   }
  }
  player.position.set(snapshot.position.x,1.5,snapshot.position.z);
  lamp.position.set(snapshot.position.x,4,snapshot.position.z);
  lamp.intensity=snapshot.hour>=19?1.4:0;
  camera.setTarget(new Vector3(snapshot.position.x,1.5,snapshot.position.z));
  qa.playable=true;qa.playerPosition={...snapshot.position};qa.discoveredCount=snapshot.discovered.length;
  qa.nearby=snapshot.nearby;qa.hour=snapshot.hour;
  if(performance.now()-lastHUD>250){updateHUD();lastHUD=performance.now();}
 });
 function attachHeroVisual(controller){
  if(!controller||typeof controller.setPose!=='function'||typeof controller.dispose!=='function')
   throw Error('a disposable skinned hero controller is required');
  controller.setPose({position:game.snapshot().position,heading,action:'Idle'});
  if(heroVisual)heroVisual.dispose();
  heroVisual=controller;
  player.setEnabled(false);
  return true;
 }
 function stop(){
  if(heroVisual){heroVisual.dispose();heroVisual=null;}
  scene.onBeforeRenderObservable.remove(observer);
  window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('blur',onBlur);
  for(const [node,down,up] of pointerControls){
   node.removeEventListener('pointerdown',down);node.removeEventListener('pointerup',up);node.removeEventListener('pointercancel',up);
  }
  interactButton?.removeEventListener('click',interact);cycleButton?.removeEventListener('click',cycleTime);
 }
 window.addEventListener('pagehide',stop,{once:true});
 return Object.freeze({snapshot:game.snapshot,stop,attachHeroVisual});
}
