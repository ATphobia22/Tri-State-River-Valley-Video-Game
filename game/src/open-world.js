/* River Valley / in-world gameplay layer, original procedural geometry. Local and offline.
 * The geometry shares the terrain sample function supplied by the main render engine.
 * All hunting/fishing progression is handled by the existing unit-tested ValleyCore.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyOpenWorld=api;})(typeof globalThis==='object'?globalThis:this,function(root){'use strict';
const SKILLS=root.ValleyGameplaySkills||(typeof require==='function'?require('./gameplay-skills.js'):null);
const CREATURES=root.ValleyCreatures||(typeof require==='function'?require('./creatures.js'):null);
const SITES=Object.freeze({
 hunt:{x:1260,z:-900,title:'Wildflower Wildlife Trail',label:'🦌 Woodland Hunt',kind:'trail'},
 fish:{x:130,z:1150,title:'Ohio River Fishing Pier',label:'🎣 River Fishing',kind:'river'},
 farm:{x:-1260,z:-850,title:'Valley Family Farm',label:'🌽 Crop Field',kind:'field'},
 cook:{x:-740,z:-210,title:'Oak Grove Camp Kitchen',label:'🍳 Country Kitchen',kind:'kitchen'}
});
function huntTargetAt(round,now){
 if(!round||!Number.isFinite(round.target))return .5;
 if(!Number.isFinite(round.baseTarget)||!Number.isFinite(round.startedAt)||!Number.isFinite(now))return round.target;
 const seconds=Math.max(0,Math.min(12,(now-round.startedAt)/1000));
 const x=round.baseTarget+Math.sin(seconds*1.35)*.075;
 return Math.max(.08,Math.min(.92,x));
}
function closestSite(p,radius=130){let match=null,d=Infinity;for(const [id,s] of Object.entries(SITES)){const ds=Math.hypot(p.x-s.x,p.z-s.z);if(ds<radius&&ds<d){d=ds;match=id;}}return match;}
function approachSite(id,yaw=0,distance=34){const site=SITES[id];if(!site)return null;const a=Number.isFinite(yaw)?yaw:0,d=Number.isFinite(distance)?Math.max(0,Math.min(distance,100)):34;return {x:site.x+Math.sin(a)*d,z:site.z+Math.cos(a)*d};}
function farmPick(save,now){const a=save.farmPlots||[],ready=a.findIndex(t=>t>0&&t<=now);if(ready>=0)return {index:ready,action:'harvest'};const empty=a.findIndex(t=>t===0);if(empty>=0)return {index:empty,action:'plant'};return {index:0,action:'growing'};}
function alignStaticSite(group,site,ground,excluded=new Set()){
 // One-time offset from actual local terrain, preserving native site and child axes.
 // Never modify the animation-driven wildlife, crops or river bobber.
 const baseline=ground(site.x,site.z);
 if(!Number.isFinite(baseline))throw new RangeError('Site terrain source unavailable');
 let aligned=0,skipped=0;
 for(const child of group.children){
  if(excluded.has(child)){skipped++;continue;}
  const xx=child.position?.x,zz=child.position?.z;
  if(!Number.isFinite(xx)||!Number.isFinite(zz)){skipped++;continue;}
  const elevation=ground(site.x+xx,site.z+zz);
  const delta=elevation-baseline;
  if(!Number.isFinite(delta)||Math.abs(delta)>40){skipped++;continue;}
  child.position.y+=delta;
  aligned++;
 }
 return Object.freeze({aligned,skipped,siteX:site.x,siteZ:site.z,source:'GAME_LOCAL_TERRAIN_NOT_SURVEYED'});
}
function sceneWorld(T,scene,ground,options={}){
 const root=new T.Group();root.name='River Valley in-world activities';scene.add(root);
 const texture=(base,kind)=>{
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  ctx.fillStyle=base;ctx.fillRect(0,0,128,128);
  let seed=kind==='soil'?91744:38614;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<520;i++){
   const x=rand()*128,y=rand()*128,r=.5+rand()*2;
   ctx.fillStyle=kind==='soil'?'rgba(31,20,12,.23)':'rgba(253,237,200,.1)';
   ctx.fillRect(x,y,r,r);
  }
  if(kind==='timber')for(let y=0;y<128;y+=8){ctx.fillStyle='rgba(42,27,15,.13)';ctx.fillRect(0,y,128,1);}
  const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;
  map.colorSpace=T.SRGBColorSpace;map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;return map;
 };
 const mats={wood:new T.MeshStandardMaterial({color:0x8b5936,roughness:.94,map:texture('#c8a37a','timber')}),woodLight:new T.MeshLambertMaterial({color:0xb18b5f}),iron:new T.MeshLambertMaterial({color:0x374d52}),clay:new T.MeshLambertMaterial({color:0xa56648}),soil:new T.MeshStandardMaterial({color:0x594932,roughness:.98,map:texture('#cab391','soil')}),leaf:new T.MeshLambertMaterial({color:0x538440}),corn:new T.MeshLambertMaterial({color:0xf4cb4b}),water:new T.MeshPhongMaterial({color:0x5bb4c3,shininess:72,transparent:true,opacity:.94}),glow:new T.MeshBasicMaterial({color:0xffc767}),smoke:new T.MeshLambertMaterial({color:0xd2d1c4,transparent:true,opacity:.25,depthWrite:false}),animal:new T.MeshStandardMaterial({color:0x93623d,roughness:.96,metalness:0}),cream:new T.MeshStandardMaterial({color:0xc9a276,roughness:.98,metalness:0}),hoof:new T.MeshStandardMaterial({color:0x302a25,roughness:.88}),eye:new T.MeshStandardMaterial({color:0x1a1712,roughness:.21,metalness:.02}),feathers:new T.MeshStandardMaterial({color:0x70452c,roughness:.91}),roof:new T.MeshLambertMaterial({color:0x655344}),barn:new T.MeshStandardMaterial({color:0x9c5040,roughness:.87}),tin:new T.MeshStandardMaterial({color:0x677c7e,roughness:.46,metalness:.25})};
 const make=(geo,mat,parent,pos,rotation)=>{let m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);if(rotation)m.rotation.set(...rotation);parent.add(m);return m;};
 const cube=(parent,mat,x,y,z,w,h,d)=>make(new T.BoxGeometry(w,h,d),mat,parent,[x,y,z]);
 const cyl=(parent,mat,x,y,z,r1,r2,h,n=10)=>make(new T.CylinderGeometry(r1,r2,h,n),mat,parent,[x,y,z]);
 const ball=(parent,mat,x,y,z,r)=>make(new T.SphereGeometry(r,10,8),mat,parent,[x,y,z]);
 const groups={};
 for(const [id,s] of Object.entries(SITES)){const g=new T.Group();g.name=s.title;g.position.set(s.x,ground(s.x,s.z),s.z);g.userData.activitySite=id;root.add(g);groups[id]=g;}
 // Wildlife clearing. Animal is a real articulated 3D model, not a UI icon.
 const hunt=groups.hunt;
 const track=cube(hunt,mats.soil,0,-.35,-5,95,.65,22);
 for(let i=-1;i<=1;i+=2){for(let n=0;n<6;n++){const z=-52+n*19;const post=cyl(hunt,mats.woodLight,i*55,4,z,1.5,1.6,8,6);cube(hunt,mats.woodLight,i*55,6,z+8,1,1.5,19);}}
 const deer=new T.Group();deer.name='Animated low-poly deer';hunt.add(deer);
 // Rounded anatomical silhouettes replace block-shaped deer, with animated limbs and expressive head.
 const deerTorso=ball(deer,mats.animal,0,7,0,1);deerTorso.scale.set(3.65,2.65,7.1);
 const deerChest=ball(deer,mats.cream,0,5.2,-4.7,1);deerChest.scale.set(2.4,1.1,2.8);
 const deerNeck=cyl(deer,mats.animal,0,10.1,-5.3,1.4,2.2,6,11);deerNeck.rotation.x=-.21;
 const deerHead=new T.Group();deerHead.position.set(0,13,-7);deer.add(deerHead);
 const deerSkull=ball(deerHead,mats.animal,0,0,0,2.7);
 const muzzle=ball(deerHead,mats.cream,0,-.75,-2.65,1.55);
 muzzle.scale.set(.95,.7,1.5);
 ball(deerHead,mats.hoof,0,-.8,-4.28,.64);
 for(const side of [-1,1]){
  const ear=ball(deerHead,mats.cream,side*2.7,1.55,.25,1);ear.scale.set(1.65,.47,.8);ear.rotation.z=side*.4;
  ball(deerHead,mats.eye,side*2.38,.15,-1.25,.37);
  const antler=cyl(deerHead,mats.wood,side*1.38,4.75,.15,.24,.54,6.6,7);antler.rotation.z=side*.24;
  for(let n=0;n<3;n++){const tine=cyl(deerHead,mats.wood,side*(1.7+n*.22),3.1+n*1.7,-.9,.11,.22,2.3,6);tine.rotation.x=-.8;tine.rotation.z=side*.25;}
 }
 let legIndex=0;
 for(const side of [-1,1])for(const z of [-4.1,4.1]){
  const leg=cyl(deer,mats.animal,side*2.25,2.2,z,.51,.79,4.8,8);
  leg.userData.legIndex=legIndex++;
  const hoof=cube(leg,mats.hoof,0,-2.1,-.4,1.25,.72,1.75);
  hoof.rotation.x=.08;
 }
 const deerTail=ball(deer,mats.cream,0,7.8,7.3,1.15);deerTail.scale.set(.83,.65,1.5);
 const turkey=new T.Group();turkey.name='Animated turkey';hunt.add(turkey);
 const turkeyBody=ball(turkey,mats.feathers,0,4,0,1);turkeyBody.scale.set(3.8,3,4.7);
 const turkeyHead=new T.Group();turkeyHead.position.set(0,6,-2.5);turkey.add(turkeyHead);
 const neck=ball(turkeyHead,mats.cream,0,0,0,1.7);
 const beak=make(new T.ConeGeometry(.8,2.3,7),mats.corn,turkeyHead,[0,-.05,-1.8],[Math.PI/2,0,0]);
 for(const side of [-1,1])ball(turkeyHead,mats.eye,side*1.28,.38,-.85,.25);
 for(let n=0;n<7;n++){const t=(n-3)*.32;const feather=make(new T.ConeGeometry(1.1,7,5),mats.animal,turkey,[Math.sin(t)*5,5.8,3.8],[Math.PI/2,0,-t]);}
 for(const sx of [-1,1])cyl(turkey,mats.wood,sx*1.6,1,-.3,.22,.25,2.2,5);
 const rabbit=new T.Group();rabbit.name='Animated rabbit';hunt.add(rabbit);
 const rabbitTorso=ball(rabbit,mats.animal,0,2.3,0,1);rabbitTorso.scale.set(2.65,1.6,3.75);
 const rabbitHead=new T.Group();rabbitHead.position.set(0,3,-3.1);rabbit.add(rabbitHead);
 ball(rabbitHead,mats.animal,0,0,0,1.8);
 for(const sx of [-1,1]){
  const ear=make(new T.ConeGeometry(.69,4.4,8),mats.cream,rabbitHead,[sx*.85,2.7,-.35]);ear.rotation.z=sx*.14;
  ball(rabbitHead,mats.eye,sx*1.25,.25,-1.06,.26);
  const hind=ball(rabbit,mats.cream,sx*1.8,.95,2,1.45);hind.scale.set(1,.55,1.35);
 }
 ball(rabbitHead,mats.cream,0,-.55,-1.52,.62);
 ball(rabbit,mats.cream,0,2,3.8,.89);
 const wildlife={deer,turkey,rabbit};
 // Keep legacy interactive groups as the terrain/physics anchors, but show the
 // upgraded detailed models on desktop. Only one visual per species is visible.
 const creatureVisuals={};
 if(CREATURES&&options.enhancedCreatures){
  for(const [kind,holder] of Object.entries(wildlife)){
   try{
    const model=CREATURES.create(T,kind);
    for(const child of holder.children)child.visible=false;
    holder.add(model);creatureVisuals[kind]=model;
   }catch(error){console.warn('Could not use enhanced creature:',kind,error);}
  }
 }
 // Reuse the same meshes and animation tracks at all frame rates.
 for(const animal of Object.values(wildlife))
  animal.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;}});
 const animalHeads={deer:deerHead,turkey:turkeyHead,rabbit:rabbitHead};
 const animalTails={deer:deerTail};
 const aimRing=new T.Group();hunt.add(aimRing);make(new T.TorusGeometry(5,.7,6,20),mats.glow,aimRing,[0,10,-3]);cyl(aimRing,mats.glow,0,6,-3,.5,.5,5);
 // River fishing. A real pier and moving bobber in world space.
 const fish=groups.fish;for(const side of [-1,1])for(let z=-20;z<=52;z+=18)cyl(fish,mats.wood,side*14,-5,z,2,2,16,8);
 const deck=cube(fish,mats.woodLight,0,2,13,33,2,100);for(let z=-30;z<57;z+=8)cube(fish,mats.wood,0,3.2,z,31,.3,.5);
 const rod=cyl(fish,mats.iron,-10,10,-20,.45,.8,23,7);rod.rotation.z=.35;
 const line=new T.Group();fish.add(line);
 const fishingLineGeometry=new T.BufferGeometry().setFromPoints([
  new T.Vector3(-2,21,-20),new T.Vector3(15,-3,40)
 ]);
 const fishingLineMaterial=new T.LineBasicMaterial({color:0xc7d9d1,transparent:true,opacity:.75});
 const fishingLine=new T.Line(fishingLineGeometry,fishingLineMaterial);fish.add(fishingLine);
 const float=ball(line,new T.MeshStandardMaterial({color:0xffb54a,roughness:.28,metalness:0}),0,0,0,1.75);cyl(line,mats.water,0,-1.1,0,.7,.7,1.4);
 const ripple=make(new T.TorusGeometry(4,.2,4,24),mats.water,line,[0,-.2,0],[Math.PI/2,0,0]);
 const fishModel=new T.Group();fishModel.name='Jumping fish when the bobber dips';line.add(fishModel);
 const fishBody=make(new T.SphereGeometry(2.1,12,8),mats.iron,fishModel,[0,0,0]);fishBody.scale.set(1.3,.6,.5);
 const fishTail=make(new T.ConeGeometry(1.6,3.2,6),mats.water,fishModel,[-3,0,0]);fishTail.rotation.z=Math.PI/2;
 for(const z of [-1,1])cyl(fish,mats.woodLight,30,1,z*23,2,2,9,8);
 for(let k=0;k<8;k++){const z=-32+k*12;cyl(fish,mats.leaf,-34,3,z,.7,.8,6,5);}
 // Nine persistent three-dimensional corn plots. Visible stages come from save slots.
 const field=groups.farm;const patches=[],crops=[];
 for(let i=0;i<9;i++){
  const x=(i%3-1)*20,z=(Math.floor(i/3)-1)*20;
  const plot=new T.Group();plot.position.set(x,ground(SITES.farm.x+x,SITES.farm.z+z)-ground(SITES.farm.x,SITES.farm.z),z);field.add(plot);patches.push(plot);
  cube(plot,mats.soil,0,.25,0,16,.65,16);
  for(const off of [-4,0,4]){const stem=cyl(plot,mats.leaf,off,4,0,.35,.4,8,5);const cob=cyl(plot,mats.corn,off,6.5,.4,.9,.65,3,6);const leaves=make(new T.ConeGeometry(2.2,9,4),mats.leaf,plot,[off,5,0]);}
  const crop=new T.Group(); // Keep soil while toggling the crop visible/height.
  while(plot.children.length>1)crop.add(plot.children[1]);plot.add(crop);crops.push(crop);
 }
 for(let i=0;i<7;i++){const x=-75+i*25;cyl(field,mats.wood,x,5,-72,1.5,1.5,10,6);cube(field,mats.woodLight,x,7,-72,26,1.1,1.5);}
 const hay=cyl(field,mats.corn,73,6,55,7,7,12,10);hay.rotation.z=Math.PI/2;
 // Layered barn, grain tower, walking rows, pump, scarecrow and raised beds
 // replace the featureless farm lot without altering saved nine-plot economy.
 cube(field,mats.barn,88,11,-43,42,22,36);
 const barnRoof=make(new T.ConeGeometry(28,12,4),mats.roof,field,[88,27,-43]);barnRoof.rotation.y=Math.PI/4;
 cube(field,mats.wood,88,7,-24,12,14,1);
 for(let k=0;k<5;k++)cube(field,mats.woodLight,88,1,-8+k*8,16,.5,1.2);
 const silo=cyl(field,mats.tin,139,18,-50,9,9,36,13);make(new T.ConeGeometry(9,8,13),mats.roof,field,[139,40,-50]);
 for(let i=0;i<6;i++)cube(field,mats.soil,-83+i*29,.05,100,18,.4,55);
 const pump=cyl(field,mats.tin,-95,5,-12,2,2,9,10);cyl(field,mats.tin,-95,11,-12,5,4,3,9);
 const scarecrow=new T.Group();field.add(scarecrow);scarecrow.position.set(35,0,85);
 cyl(scarecrow,mats.wood,0,7,0,.6,.6,14);
 cube(scarecrow,mats.woodLight,0,11,0,13,1.4,1.4);
 ball(scarecrow,mats.corn,0,15,0,2.5);
 make(new T.ConeGeometry(4,3,9),mats.roof,scarecrow,[0,18,0]);
 // Campfire kitchen with animated flame and smoke. Meals affect the shared local pantry.
 const kitchen=groups.cook;const tables=cube(kitchen,mats.woodLight,-18,4,-15,22,4,15);for(const x of [-27,-9])for(const z of [-20,-10])cube(kitchen,mats.wood,x,1,z,2,7,2);
 for(let i=0;i<11;i++){const t=i/11*Math.PI*2;cube(kitchen,mats.iron,Math.sin(t)*8,1,Math.cos(t)*8,5,3,4);}
 const flames=new T.Group();kitchen.add(flames);
 for(let i=0;i<4;i++)make(new T.ConeGeometry(2+i*.5,8+i*2,5),i%2?mats.corn:mats.glow,flames,[(i-1.5)*2.2,5,0]);
 cyl(kitchen,mats.iron,0,8,0,7,6,5,12);cyl(kitchen,mats.wood,0,11,0,7.5,7.5,1,12);
 const smoke=[];for(let i=0;i<8;i++)smoke.push(ball(kitchen,mats.smoke,0,15+i*5,0,2+i*.52));
 // Cutting board, cast iron skillet, serving bowl, food and shelter details.
 const board=cube(kitchen,mats.woodLight,-20,7.1,-15,11,.4,7);
 const skillet=cyl(kitchen,mats.iron,-4,12,0,4.7,4.7,.8,15);
 cyl(kitchen,mats.iron,3.8,12,0,.55,.6,9,7).rotation.z=Math.PI/2;
 const food=new T.Group();kitchen.add(food);
 for(let k=0;k<6;k++)ball(food,k%2?mats.corn:mats.leaf,-4+Math.sin(k*2.7)*2.7,13.1,Math.cos(k*2.7)*2.7,.9);
 cube(kitchen,mats.woodLight,-29,4.3,23,20,1,10);
 for(const x of [-38,-20])cyl(kitchen,mats.wood,x,1,23,1,1,6,7);
 const campLight=new T.PointLight(0xffb066,.64,160,2);campLight.position.set(0,16,0);kitchen.add(campLight);
 const terrainAlignment={
  hunt:alignStaticSite(groups.hunt,SITES.hunt,ground,new Set([deer,turkey,rabbit,aimRing])),
  farm:alignStaticSite(groups.farm,SITES.farm,ground,new Set(patches)),
  cook:alignStaticSite(groups.cook,SITES.cook,ground,new Set(smoke))
 };
 const world={root,groups,deer,wildlife,creatureVisuals,fishModel,aimRing,float,line,ripple,patches,crops,flames,smoke,food,campLight,counts:{activitySites:4,animalModels:3,fieldPlots:9,animatedSmokePuffs:8,barnModels:1,grainSilos:1,terrainAlignment},
  update({stamp=0,save,activity,huntRound,fishRound,aim=.5,weather='clear',player=null,now=Date.now()}){
   const tick=stamp*.001;
   // Local animation is deterministic and tied to game clock, not browser FPS.
   const moving=SKILLS?.sampleWildlife(stamp,player||{x:-10000,z:-10000},SITES.hunt,huntRound);
   for(const [kind,animal] of Object.entries(wildlife)){
    const state=moving?.[kind];if(!state)continue;
    animal.visible=state.visible;
    animal.position.set(state.x,ground(SITES.hunt.x+state.x,SITES.hunt.z+state.z)-ground(SITES.hunt.x,SITES.hunt.z)+state.height+state.bob,state.z);
    animal.rotation.y=state.rotationY;
    animal.userData.state=state.behavior;
    const detailed=creatureVisuals[kind];
    if(detailed?.userData?.animate)detailed.userData.animate(1/60,{
     phase:stamp*.005+(kind==='rabbit'?2:kind==='turkey'?1:0),
     moving:state.behavior!=='forage',action:state.behavior,headDip:state.headDip
    });
    const head=animalHeads[kind];
    if(head){head.rotation.x=state.headDip;head.rotation.z=state.earFlick*.28;}
   }
   deer.children.forEach(c=>{if(c.userData.legIndex!==undefined)c.rotation.x=(moving?.deer?.gait||0)*(c.userData.legIndex%2?1:-1);});
   deerTail.rotation.y=moving?.deer?.tailSwish||0;
   turkey.rotation.z=(moving?.turkey?.gait||0)*.12;
   rabbit.rotation.z=(moving?.rabbit?.gait||0)*.10;
   const ringX=(aim-.5)*67;
   aimRing.position.set(ringX,ground(SITES.hunt.x+ringX,SITES.hunt.z-5)-ground(SITES.hunt.x,SITES.hunt.z),-5);
   aimRing.visible=activity==='hunt'&&!!huntRound;
   line.position.set(15,-3,40);line.visible=activity==='fish';
   const fishPhase=fishRound&&SKILLS?.fishCue(fishRound,now).phase;
   const biting=fishPhase==='bite',struggling=fishPhase==='fight';
   float.position.y=Math.sin(tick*5)*.45-(biting?2.5:0)-(struggling?Math.sin(tick*7)*.85:0);
   fishModel.visible=!!(biting||struggling);
   fishModel.position.set(0,(biting?2.5:0)+Math.abs(Math.sin(tick*7))*(struggling?2.4:1.3),0);
   fishTail.rotation.y=Math.sin(tick*13)*.45;
   float.material.color.setHex(biting?0xff5c43:0xf4cb4b);
   ripple.scale.setScalar(biting?1.6:1+.15*Math.sin(tick*4));
   for(let i=0;i<9;i++){const t=save.farmPlots[i],growing=t>now,ready=t>0&&!growing;
    const c=crops[i];c.visible=t>0;c.scale.y=ready?1:growing?Math.max(.18,1-Math.min(8000,t-now)/9700):.001;
   }
   flames.scale.y=1+Math.sin(tick*10)*.13;
   smoke.forEach((m,i)=>{m.position.y=16+((i*5+tick*5)%43);m.position.x=Math.sin(tick+i*2)*2.7;m.position.z=Math.cos(tick*.65+i)*2;m.scale.setScalar(.65+.36*(i/8));});
   campLight.intensity=weather==='rain'?.3:.65+Math.sin(tick*11)*.1;
   food.visible=save.inventory.meals>0||activity==='cook';food.rotation.y=tick*.12;
  },
  dispose(){scene.remove(root);for(const model of Object.values(creatureVisuals))CREATURES?.dispose(model);root.traverse(obj=>{if(obj.isMesh){obj.geometry.dispose();/* shared materials disposed below */}});fishingLineGeometry.dispose();fishingLineMaterial.dispose();float.material.dispose();Object.values(mats).forEach(m=>{m.map?.dispose();m.dispose();});}
 };
 return world;
}
return {SITES,closestSite,approachSite,farmPick,huntTargetAt,alignStaticSite,sceneWorld};
});
