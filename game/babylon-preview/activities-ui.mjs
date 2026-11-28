/** Babylon WebGL2 presentation over the game's canonical, unit-tested rules. */
import '../src/core.js';
import '../src/gameplay-skills.js';
import '../src/open-world.js';
import {MeshBuilder,PBRMaterial,Color3,TransformNode} from '@babylonjs/core';
import {ACTIVITY_SITES,createActivitySession} from './shared-activities.mjs';
import {getBrowserStorage} from './gameplay.mjs';

const PALETTE=Object.freeze({
 fish:'#478d9e',hunt:'#9a784c',farm:'#8b9e50',cook:'#b87b55'
});
export function installSharedActivities({scene,adventure,qa}){
 const core=globalThis.ValleyCore,skills=globalThis.ValleyGameplaySkills,world=globalThis.ValleyOpenWorld;
 const session=createActivitySession({core,skills,world,storage:getBrowserStorage(window)});
 const find=id=>document.getElementById(id);
 const nodes=[],materials=[],listeners=[],fauna=new Map(),plots=[];
 function material(name,hex){
  const mat=new PBRMaterial(name,scene);
  mat.albedoColor=Color3.FromHexString(hex);mat.metallic=0;mat.roughness=.9;
  materials.push(mat);return mat;
 }
 function tracked(node){nodes.push(node);return node;}
 // These markers/animal silhouettes are game art, not surveyed structures or licensed 3D rigs.
 for(const [id,site] of Object.entries(ACTIVITY_SITES)){
  const ring=tracked(MeshBuilder.CreateTorus('activity-station-'+id,{diameter:5,thickness:.18,tessellation:20},scene));
  ring.position.set(site.x,.16,site.z);
  ring.material=material('station-'+id,PALETTE[id]);
  const mast=tracked(MeshBuilder.CreateCylinder('activity-beacon-'+id,{height:2,diameter:.25,tessellation:10},scene));
  mast.position.set(site.x,1,site.z);mast.material=ring.material;
 }
 const earth=material('farm-soil','#5b4330'),crop=material('harvest-corn','#8bb651');
 for(let i=0;i<9;i++){
  const x=ACTIVITY_SITES.farm.x+(i%3-1)*2.2,z=ACTIVITY_SITES.farm.z+(Math.floor(i/3)-1)*2.2;
  const soil=tracked(MeshBuilder.CreateBox('farm-plot-earth-'+i,{width:1.6,height:.16,depth:1.6},scene));
  soil.position.set(x,.09,z);soil.material=earth;
  const stem=tracked(MeshBuilder.CreateCylinder('farm-plot-crop-'+i,{height:1,diameterTop:.08,diameterBottom:.27,tessellation:6},scene));
  stem.position.set(x,.65,z);stem.material=crop;plots.push(stem);
 }
 const animalColors={deer:'#99744f',turkey:'#77634b',rabbit:'#a49d8d'};
 for(const [kind,scale] of Object.entries({deer:1.25,turkey:.85,rabbit:.65})){
  const root=tracked(new TransformNode('game-wildlife-'+kind,scene));
  const coat=material('wildlife-coat-'+kind,animalColors[kind]);
  const body=MeshBuilder.CreateCapsule('wildlife-body-'+kind,{height:1.4*scale,radius:.39*scale,tessellation:10},scene);
  body.parent=root;body.position.y=1.04*scale;body.rotation.z=Math.PI/2;body.material=coat;
  const head=MeshBuilder.CreateSphere('wildlife-head-'+kind,{diameter:.66*scale,segments:10},scene);
  head.parent=root;head.position.set(.65*scale,1.22*scale,0);head.material=coat;
  for(let leg=0;leg<4;leg++){
   const limb=MeshBuilder.CreateCylinder('wildlife-leg-'+kind+'-'+leg,{height:.75*scale,diameter:.13*scale,tessellation:6},scene);
   limb.parent=root;
   limb.position.set((leg<2?-.43:.43)*scale,.5*scale,(leg%2?-.22:.22)*scale);
   limb.material=coat;
  }
  if(kind==='rabbit'){
   for(const side of [-1,1]){
    const ear=MeshBuilder.CreateCylinder('rabbit-ear-'+side,{height:.6*scale,diameter:.13*scale,tessellation:6},scene);
    ear.parent=root;ear.position.set(.7*scale,1.72*scale,.17*scale*side);ear.material=coat;
   }
  }
  fauna.set(kind,root);
 }
 const bobber=tracked(MeshBuilder.CreateSphere('fishing-bobber',{diameter:.35,segments:10},scene));
 bobber.position.set(ACTIVITY_SITES.fish.x,.5,ACTIVITY_SITES.fish.z+4);
 bobber.material=material('fishing-bobber-red','#d65a48');
 const recipes=find('cook-recipe');
 for(const [id,recipe] of Object.entries(session.recipes())){
  const option=document.createElement('option');option.value=id;option.textContent=recipe.title;recipes?.append(option);
 }
 const updateOutcome=result=>{const output=find('activity-result');if(output)output.textContent=result;};
 function onClick(id,site,handler){
  const node=find(id);if(!node)throw new Error('missing Babylon activity control: '+id);
  const listener=()=>{
   if(!session.canUse(site,adventure.snapshot().position)){
    updateOutcome('Walk to the '+ACTIVITY_SITES[site].title+' marker first.');
    return;
   }
   try{const outcome=handler();updateOutcome(id+': '+outcome.result);}
   catch(error){updateOutcome('Activity unavailable: '+String(error?.message||error));}
   updateUI();
  };
  node.addEventListener('click',listener);
  listeners.push([node,listener]);
 }
 onClick('fishing-cast','fish',()=>session.castFish(find('fish-kind').value));
 onClick('fishing-reel','fish',()=>session.reelFish(Number(find('activity-aim').value)/100));
 onClick('hunting-track','hunt',()=>session.trackAnimal(find('hunt-kind').value));
 onClick('hunting-shoot','hunt',()=>session.shootAnimal(Number(find('activity-aim').value)/100));
 onClick('farm-action','farm',()=>session.farm(Number(find('farm-plot').value)));
 onClick('farm-water','farm',()=>session.waterFarm());
 onClick('cook-action','cook',()=>session.cook(find('cook-recipe').value));
 const controls={fish:['fishing-cast','fishing-reel'],hunt:['hunting-track','hunting-shoot'],
  farm:['farm-action','farm-water'],cook:['cook-action']};
 function updateUI(){
  const pos=adventure.snapshot().position,now=Date.now(),s=session.snapshot(now);
  const inventory=s.save.inventory;
  const economy=find('game-economy');
  if(economy)economy.textContent='Coins '+s.save.coins+' · XP '+s.save.xp+' · Level '+s.save.level+
   ' · Fish '+inventory.fish+' · Corn '+inventory.corn+' · Game '+inventory.game+
   ' · Meals '+inventory.meals+' · Quests '+s.save.completed.length+'/'+core.STOPS.length;
  for(const [id,buttons] of Object.entries(controls))
   for(const button of buttons){const node=find(button);if(node)node.disabled=!session.canUse(id,pos);}
  const cue=find('activity-cue');
  if(cue)cue.textContent=s.fishing
   ?'Fishing '+s.fishing.cue.phase+' · target '+Math.round(s.fishing.cue.target*100)+'% · progress '+s.fishing.progress+'/3'
   :s.hunting
    ?'Tracking '+s.hunting.kind+' · aim '+Math.round(s.hunting.target*100)+'% · '+Math.max(0,Math.ceil((s.hunting.expiresAt-now)/1000))+' seconds'
    :'Use the aim slider for the original bite/reel and moving wildlife challenges.';
  qa.activities={rules:'canonical-ValleyCore',wildlifeSpecies:3,recipes:Object.keys(session.recipes()).length,
   quests:s.save.completed.length,inventory:{...inventory},saveSlot:0};
  for(let i=0;i<plots.length;i++){
   const due=s.save.farmPlots[i],age=due?Math.max(.1,Math.min(1,1-(due-now)/8000)):0;
   plots[i].setEnabled(!!due);
   plots[i].scaling.y=Math.max(.12,age);
  }
 }
 function onDiscover(waypoint){
  const result=session.discover(waypoint);
  if(result.result==='completed')updateOutcome('Quest completed: '+result.id+' · '+result.coins+' coins.');
  updateUI();return result;
 }
 let lastUpdate=0;
 const observer=scene.onBeforeRenderObservable.add(()=>{
  const now=performance.now();
  if(now-lastUpdate<175)return;
  lastUpdate=now;
  const position=adventure.snapshot().position,animals=session.wildlife(Date.now(),position);
  for(const [kind,node] of fauna){
   const state=animals[kind];if(!state)continue;
   node.setEnabled(state.visible);
   node.position.set(ACTIVITY_SITES.hunt.x+state.x,.28+state.bob,ACTIVITY_SITES.hunt.z+state.z);
   node.rotation.y=state.rotationY;
  }
  bobber.position.y=.45+Math.sin(now*.004)*.13;
  updateUI();
 });
 updateUI();
 return Object.freeze({
  onDiscover,session,
  dispose(){
   scene.onBeforeRenderObservable.remove(observer);
   for(const [node,listener] of listeners)node.removeEventListener('click',listener);
   for(const node of nodes)node.dispose();
   for(const mat of materials)mat.dispose();
  }
 });
}
