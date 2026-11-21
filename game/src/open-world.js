/* River Valley / in-world gameplay layer, original procedural geometry. Local and offline.
 * The geometry shares the terrain sample function supplied by the main render engine.
 * All hunting/fishing progression is handled by the existing unit-tested ValleyCore.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyOpenWorld=api;})(typeof globalThis==='object'?globalThis:this,function(){'use strict';
const SITES=Object.freeze({
 hunt:{x:1260,z:-900,title:'Wildflower Wildlife Trail',label:'🦌 Woodland Hunt',kind:'trail'},
 fish:{x:130,z:1150,title:'Ohio River Fishing Pier',label:'🎣 River Fishing',kind:'river'},
 farm:{x:-1260,z:-850,title:'Valley Family Farm',label:'🌽 Crop Field',kind:'field'},
 cook:{x:-740,z:-210,title:'Oak Grove Camp Kitchen',label:'🍳 Country Kitchen',kind:'kitchen'}
});
function closestSite(p,radius=130){let match=null,d=Infinity;for(const [id,s] of Object.entries(SITES)){const ds=Math.hypot(p.x-s.x,p.z-s.z);if(ds<radius&&ds<d){d=ds;match=id;}}return match;}
function farmPick(save,now){const a=save.farmPlots||[],ready=a.findIndex(t=>t>0&&t<=now);if(ready>=0)return {index:ready,action:'harvest'};const empty=a.findIndex(t=>t===0);if(empty>=0)return {index:empty,action:'plant'};return {index:0,action:'growing'};}
function sceneWorld(T,scene,ground){
 const root=new T.Group();root.name='River Valley in-world activities';scene.add(root);
 const mats={wood:new T.MeshLambertMaterial({color:0x8b5936}),woodLight:new T.MeshLambertMaterial({color:0xb18b5f}),iron:new T.MeshLambertMaterial({color:0x374d52}),clay:new T.MeshLambertMaterial({color:0xa56648}),soil:new T.MeshLambertMaterial({color:0x594932}),leaf:new T.MeshLambertMaterial({color:0x538440}),corn:new T.MeshLambertMaterial({color:0xf4cb4b}),water:new T.MeshPhongMaterial({color:0x5bb4c3,shininess:72,transparent:true,opacity:.94}),glow:new T.MeshBasicMaterial({color:0xffc767}),smoke:new T.MeshLambertMaterial({color:0xd2d1c4,transparent:true,opacity:.25,depthWrite:false}),animal:new T.MeshLambertMaterial({color:0xa8784b}),cream:new T.MeshLambertMaterial({color:0xebd5ad}),roof:new T.MeshLambertMaterial({color:0x655344})};
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
 cube(deer,mats.animal,0,7,0,7,5,13);cube(deer,mats.cream,0,5,-5.5,4.3,1.4,4);cube(deer,mats.animal,0,10,-6.5,3,7,3);ball(deer,mats.animal,0,13,-7,2.9);
 for(const side of [-1,1]){for(const z of [-4.2,4.2])cube(deer,mats.animal,side*2.2,2,z,1.4,5,1.2);const antler=cyl(deer,mats.wood,side*2,17,-7,.45,.7,6,6);antler.rotation.z=side*.27;}
 const tail=make(new T.ConeGeometry(1.8,4,5),mats.cream,deer,[0,8,7],[Math.PI/2,0,0]);
 const aimRing=new T.Group();hunt.add(aimRing);make(new T.TorusGeometry(5,.7,6,20),mats.glow,aimRing,[0,10,-3]);cyl(aimRing,mats.glow,0,6,-3,.5,.5,5);
 // River fishing. A real pier and moving bobber in world space.
 const fish=groups.fish;for(const side of [-1,1])for(let z=-20;z<=52;z+=18)cyl(fish,mats.wood,side*14,-5,z,2,2,16,8);
 const deck=cube(fish,mats.woodLight,0,2,13,33,2,100);for(let z=-30;z<57;z+=8)cube(fish,mats.wood,0,3.2,z,31,.3,.5);
 const rod=cyl(fish,mats.iron,-10,10,-20,.45,.8,23,7);rod.rotation.z=.35;
 const line=new T.Group();fish.add(line);const float=ball(line,new T.MeshLambertMaterial({color:0xf4cb4b}),0,0,0,1.75);cyl(line,mats.water,0,-1.1,0,.7,.7,1.4);
 const ripple=make(new T.TorusGeometry(4,.2,4,24),mats.water,line,[0,-.2,0],[Math.PI/2,0,0]);
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
 // Campfire kitchen with animated flame and smoke. Meals affect the shared local pantry.
 const kitchen=groups.cook;const tables=cube(kitchen,mats.woodLight,-18,4,-15,22,4,15);for(const x of [-27,-9])for(const z of [-20,-10])cube(kitchen,mats.wood,x,1,z,2,7,2);
 for(let i=0;i<11;i++){const t=i/11*Math.PI*2;cube(kitchen,mats.iron,Math.sin(t)*8,1,Math.cos(t)*8,5,3,4);}
 const flames=new T.Group();kitchen.add(flames);
 for(let i=0;i<4;i++)make(new T.ConeGeometry(2+i*.5,8+i*2,5),i%2?mats.corn:mats.glow,flames,[(i-1.5)*2.2,5,0]);
 cyl(kitchen,mats.iron,0,8,0,7,6,5,12);cyl(kitchen,mats.wood,0,11,0,7.5,7.5,1,12);
 const smoke=[];for(let i=0;i<8;i++)smoke.push(ball(kitchen,mats.smoke,0,15+i*5,0,2+i*.52));
 const campLight=new T.PointLight(0xffb066,.64,160,2);campLight.position.set(0,16,0);kitchen.add(campLight);
 const world={root,groups,deer,aimRing,float,line,ripple,patches,crops,flames,smoke,campLight,counts:{activitySites:4,animalModels:1,fieldPlots:9,animatedSmokePuffs:8},
  update({stamp=0,save,activity,huntRound,fishRound,aim=.5,weather='clear'}){
   const tick=stamp*.001;
   // Local animation is deterministic and tied to game clock, not browser FPS.
   deer.position.set(huntRound?(huntRound.target-.5)*67:Math.sin(tick*.48)*31,ground(SITES.hunt.x+(huntRound?(huntRound.target-.5)*67:Math.sin(tick*.48)*31),SITES.hunt.z-5)-ground(SITES.hunt.x,SITES.hunt.z),-5);
   deer.rotation.y=Math.sin(tick*.9)*.13;
   deer.children.forEach((c,i)=>{if(i>=3&&i<=6)c.rotation.x=Math.sin(tick*3+i*1.5)*.13;});
   aimRing.position.set((aim-.5)*67,0,-5);aimRing.visible=activity==='hunt'&&!!huntRound;
   line.position.set(15,-3,40);line.visible=activity==='fish';
   const biting=fishRound&&Date.now()>=fishRound.biteAt&&Date.now()<=fishRound.biteAt+700;
   float.position.y=Math.sin(tick*5)*.45-(biting?2.5:0);
   float.material.color.setHex(biting?0xff5c43:0xf4cb4b);
   ripple.scale.setScalar(biting?1.6:1+.15*Math.sin(tick*4));
   for(let i=0;i<9;i++){const t=save.farmPlots[i],growing=t>Date.now(),ready=t>0&&!growing;
    const c=crops[i];c.visible=t>0;c.scale.y=ready?1:growing?.28:.001;
   }
   flames.scale.y=1+Math.sin(tick*10)*.13;
   smoke.forEach((m,i)=>{m.position.y=16+((i*5+tick*5)%43);m.position.x=Math.sin(tick+i*2)*2.7;m.position.z=Math.cos(tick*.65+i)*2;m.scale.setScalar(.65+.36*(i/8));});
   campLight.intensity=weather==='rain'?.3:.65+Math.sin(tick*11)*.1;
  },
  dispose(){scene.remove(root);root.traverse(obj=>{if(obj.isMesh){obj.geometry.dispose();/* shared materials disposed below */}});Object.values(mats).forEach(m=>m.dispose());}
 };
 return world;
}
return {SITES,closestSite,farmPick,sceneWorld};
});
