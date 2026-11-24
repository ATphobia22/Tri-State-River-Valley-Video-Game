/*
 * River Explorer — rebuilt cinematic procedural hero.
 * Photogrammetry-informed palette (COLMAP / OpenMVS / Splatfacto reference workflow).
 * PBR materials, articulated fingers for hand-IK, activity props.
 * Prefer embedded skinned GLB when present; procedural path is the always-on fallback.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValleyHero=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';

 const PROFILE=Object.freeze({
  id:'river-explorer',
  displayName:'River — Explorer',
  version:'2.1-detail',
  features:Object.freeze([
   'curly-hair','glasses','skull-gaiter','black-shirt','gold-chain',
   'cargo-pants','adventure-boots','backpack','fingerless-gloves','articulated-fingers','collar','watch','radio-pouch','boot-tread','ears','shirt-seams','pack-stitches'
  ]),
  palette:Object.freeze({
   fabric:0x1e2226,boots:0x161b1e,skin:0xc08a62,hair:0x2c1f18,
   trim:0x8a8168,gold:0xe0b04e,glasses:0x12171b,pack:0x4a4538,
   cargo:0x3a3834,pants:0x2c2e31,lens:0x3a5560
  }),
  photogrammetry:Object.freeze({
   pipeline:['colmap-sparse','openmvs-dense','splatfacto-optional','pbr-bake'],
   jointBudget:27,
   preferredAsset:'river_explorer_rigged.glb',
   note:'Procedural mesh is game-authored art informed by reference silhouette, not a photo scan mesh.'
  })
 });

 const STATES=Object.freeze([
  'idle','walk','run','sprint','jump','land','interact','fish','hunt','cook','farm','drive'
 ]);
 const FINGERS=Object.freeze(['Thumb','Index','Middle','Ring','Pinky']);
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number.isFinite(v)?v:min));

 function samplePose(state,time,phase=0){
  if(!STATES.includes(state))state='idle';
  const t=Number.isFinite(time)?time:0;
  const step=state==='walk'?1.5:state==='run'?2.1:state==='sprint'?2.7:0;
  const amp=state==='walk'?.32:state==='run'?.63:state==='sprint'?.87:0;
  const wave=Math.sin(t*2*Math.PI*step+phase),opposite=-wave;
  const p={
   state,torso:0,head:0,headTurn:0,
   leftArm:0,rightArm:0,leftLeg:0,rightLeg:0,
   leftElbow:-.13,rightElbow:-.13,leftKnee:0,rightKnee:0,
   pack:0,bodyY:0,armSpread:.08,grip:0.11
  };
  if(amp){
   p.leftLeg=amp*wave;p.rightLeg=amp*opposite;
   p.leftArm=-amp*.82*wave;p.rightArm=amp*.82*wave;
   p.leftElbow=-.23-(state==='sprint'?.62:state==='run'?.35:.12);
   p.rightElbow=p.leftElbow;
   p.leftKnee=Math.max(0,-wave)*amp*.6;p.rightKnee=Math.max(0,wave)*amp*.6;
   p.torso=state==='sprint'?.21:state==='run'?.12:.035;
   p.bodyY=Math.abs(wave)*(state==='sprint'?.18:.11);
   p.pack=-wave*amp*.065;
  }else if(state==='idle'){
   p.torso=Math.sin(t*1.4)*.017;p.headTurn=Math.sin(t*.45)*.09;
   p.bodyY=Math.sin(t*1.5)*.045;p.pack=Math.sin(t*1.25)*.01;
   p.leftArm=Math.sin(t*1.1)*.04;p.rightArm=Math.sin(t*1.1+.7)*.04;
  }else if(state==='jump'){
   p.torso=.13;p.leftArm=-.9;p.rightArm=-.9;p.leftLeg=-.55;p.rightLeg=-.55;
   p.leftKnee=.7;p.rightKnee=.7;p.bodyY=1.1;p.leftElbow=-.4;p.rightElbow=-.4;
  }else if(state==='land'){
   p.torso=.18;p.leftLeg=.35;p.rightLeg=.35;p.leftKnee=.55;p.rightKnee=.55;p.bodyY=-.12;
  }else if(state==='interact'){
   p.rightArm=-1.05;p.rightElbow=-.75;p.head=.08;p.grip=0.4;
  }else if(state==='fish'){
   p.rightArm=-.55;p.leftArm=-.35;p.rightElbow=-1.05;p.leftElbow=-.7;
   p.torso=.08;p.head=-.05;p.grip=0.68;
  }else if(state==='hunt'){
   p.rightArm=-.95;p.leftArm=-.85;p.rightElbow=-.55;p.leftElbow=-.5;
   p.head=-.12;p.torso=.1;p.grip=0.58;
  }else if(state==='cook'){
   p.rightArm=-.7;p.rightElbow=-.9;p.leftArm=-.25;p.head=.1;p.grip=0.55;
  }else if(state==='farm'){
   p.rightArm=-.8;p.rightElbow=-.6;p.leftArm=-.4;p.torso=.12;p.grip=0.44;
  }else if(state==='drive'){
   p.leftArm=-.75;p.rightArm=-.75;p.leftElbow=-.85;p.rightElbow=-.85;
   p.leftLeg=.55;p.rightLeg=.55;p.leftKnee=.9;p.rightKnee=.9;p.torso=.05;p.grip=0.48;
  }
  return p;
 }

 function pbr(THREE,hex,opts={}){
  const {
   roughness=.85,metalness=0,clearcoat=0,clearcoatRoughness=.4,
   envMapIntensity=1,transparent=false,opacity=1,emissive=0x000000,emissiveIntensity=0
  }=opts;
  const m=new THREE.MeshStandardMaterial({
   color:hex,roughness,metalness,transparent,opacity,emissive,emissiveIntensity
  });
  if('clearcoat' in m){m.clearcoat=clearcoat;m.clearcoatRoughness=clearcoatRoughness;}
  if('envMapIntensity' in m)m.envMapIntensity=envMapIntensity;
  return m;
 }

 function create(THREE,{seated=false,lod='LOD0'}={}){
  if(!THREE||typeof THREE.Group!=='function')throw new TypeError('THREE scene-graph implementation required');
  const rig=typeof globalThis!=='undefined'?globalThis.ValleyRiggedHero:null;
  if(rig&&globalThis.ValleyRiggedHeroData){
   try{
    const model=rig.create(THREE,{seated,samplePose,lod});
    if(typeof globalThis!=='undefined')globalThis.ValleyHeroRigFailure=null;
    return model;
   }catch(error){
    if(typeof globalThis!=='undefined')globalThis.ValleyHeroRigFailure=String(error.message);
    if(typeof console!=='undefined')console.error('River Explorer rigged GLB failed; procedural fallback is active:',error);
   }
  }

  const hi=lod!=='LOD2';
  const segs=hi?12:8;
  const sphereSegs=hi?[14,12]:[10,8];

  const rootGroup=new THREE.Group();
  rootGroup.name='River Explorer';
  rootGroup.userData.asset='procedural-cinematic-v2.1';
  rootGroup.userData.fallback=true;
  rootGroup.userData.heroId=PROFILE.id;
  rootGroup.userData.heroVersion=PROFILE.version;
  rootGroup.userData.photogrammetry=PROFILE.photogrammetry;
  rootGroup.userData.microDetails=true;

  const joints={};
  function group(parent,name,x=0,y=0,z=0){
   const g=new THREE.Group();g.name='Hero/'+name;g.position.set(x,y,z);parent.add(g);return g;
  }
  const cloth=pbr(THREE,PROFILE.palette.fabric,{roughness:.9,metalness:.02,envMapIntensity:1.05});
  const pants=pbr(THREE,PROFILE.palette.pants,{roughness:.92});
  const cargo=pbr(THREE,PROFILE.palette.cargo,{roughness:.88});
  const skin=pbr(THREE,PROFILE.palette.skin,{roughness:.55,clearcoat:.18,clearcoatRoughness:.55,envMapIntensity:1.1});
  const hair=pbr(THREE,PROFILE.palette.hair,{roughness:.78,metalness:.02});
  const boot=pbr(THREE,PROFILE.palette.boots,{roughness:.72,metalness:.08});
  const trim=pbr(THREE,PROFILE.palette.trim,{roughness:.7,metalness:.15});
  const gold=pbr(THREE,PROFILE.palette.gold,{roughness:.28,metalness:.85,envMapIntensity:1.35,clearcoat:.35,clearcoatRoughness:.25});
  const glass=pbr(THREE,PROFILE.palette.lens,{roughness:.12,metalness:.25,transparent:true,opacity:.18,envMapIntensity:1.4});
  const dark=pbr(THREE,0x121416,{roughness:.9});
  const white=pbr(THREE,0xe4e2d8,{roughness:.82});
  const pack=pbr(THREE,PROFILE.palette.pack,{roughness:.93});
  const stitch=pbr(THREE,0x2a2e32,{roughness:.95});
  const rubber=pbr(THREE,0x0e1012,{roughness:.96});
  const accent=pbr(THREE,0x5c6b52,{roughness:.8,metalness:.05});
  const shared=[cloth,pants,cargo,skin,hair,boot,trim,gold,glass,dark,white,pack,stitch,rubber,accent];
  const geometry=[];

  function mesh(parent,geo,material,name,position,feature){
   const m=new THREE.Mesh(geo,material);m.name='Hero/'+name;
   if(position)m.position.set(...position);
   if(feature)m.userData.heroFeature=feature;
   m.castShadow=true;m.receiveShadow=true;parent.add(m);geometry.push(geo);return m;
  }
  function box(parent,size,material,name,position,feature){
   return mesh(parent,new THREE.BoxGeometry(...size),material,name,position,feature);
  }
  function sphere(parent,r,material,name,position,feature){
   return mesh(parent,new THREE.SphereGeometry(r,sphereSegs[0],sphereSegs[1]),material,name,position,feature);
  }
  function cylinder(parent,r1,r2,h,material,name,position,feature){
   return mesh(parent,new THREE.CylinderGeometry(r1,r2,h,segs),material,name,position,feature);
  }

  joints.torso=group(rootGroup,'torso',0,7.5,0);
  sphere(joints.torso,1,cloth,'technical-shirt',[0,2.6,0],'black-shirt').scale.set(2.9,3.35,1.62);
  box(joints.torso,[5.6,.46,2.9],dark,'belt',[0,-.34,0]);
  box(joints.torso,[1.15,.48,.72],trim,'belt-buckle',[0,-.36,-1.5]);
  for(const side of [-1,1]){
   box(joints.torso,[.95,2.05,.9],cargo,'utility-pocket',[side*2.5,.35,.55]);
   box(joints.torso,[.72,2.75,.38],trim,'backpack-strap',[side*2.05,2.9,-1.42]);
   sphere(joints.torso,.58,cloth,'shoulder',[side*2.75,4.5,0]);
   box(joints.torso,[.12,3.2,.08],stitch,'shirt-seam',[side*1.55,2.4,-1.55],'shirt-seams');
   box(joints.torso,[.85,.22,.55],trim,'epaulette',[side*2.55,4.85,-.15]);
  }
  box(joints.torso,[3.4,.35,1.9],cloth,'collar',[0,4.85,-.15],'collar');
  box(joints.torso,[3.55,.12,2.05],stitch,'collar-edge',[0,5.05,-.1],'collar');
  box(joints.torso,[.18,3.4,.12],dark,'center-zip',[0,2.5,-1.58]);
  for(let i=0;i<5;i++)box(joints.torso,[.28,.12,.14],gold,'zip-pull',[0,1.2+i*.55,-1.62]);
  box(joints.torso,[1.15,1.35,.7],cargo,'radio-pouch',[-2.9,-.15,.9],'radio-pouch');
  box(joints.torso,[.35,.35,.2],dark,'radio-antenna',[-2.9,.55,.95]);
  for(const bx of [-2.2,-1.1,0,1.1,2.2])box(joints.torso,[.22,.55,.35],dark,'belt-loop',[bx,.05,-1.45]);

  joints.pack=group(joints.torso,'pack',0,2.7,0);
  box(joints.pack,[4.5,5.5,2.55],pack,'adventure-backpack',[0,0,2.75],'backpack');
  box(joints.pack,[3.2,2.1,.58],cargo,'backpack-front-pocket',[0,-1,4.25]);
  box(joints.pack,[4.15,.52,3.05],trim,'backpack-roll-top',[0,2.35,2.8]);
  box(joints.pack,[.78,.48,.42],gold,'pack-buckle',[0,-.24,4.4]);
  for(const side of [-1,1]){
   box(joints.pack,[.08,4.8,.08],stitch,'pack-stitch',[side*2.15,0,2.9],'pack-stitches');
   box(joints.pack,[1.1,2.4,1.1],cargo,'bottle-pocket',[side*2.7,-.6,2.4]);
  }
  box(joints.pack,[1.6,.35,2.2],trim,'pack-compression-strap',[0,1.2,3.9]);
  sphere(joints.pack,.22,accent,'hydration-valve',[1.6,2.8,1.2]);

  if(THREE.CatmullRomCurve3&&THREE.TubeGeometry){
   const pts=[
    new THREE.Vector3(-1.6,3.8,-1.2),new THREE.Vector3(-.9,2.9,-1.55),
    new THREE.Vector3(0,2.55,-1.7),new THREE.Vector3(.9,2.9,-1.55),new THREE.Vector3(1.6,3.8,-1.2)
   ];
   const curve=new THREE.CatmullRomCurve3(pts);
   mesh(joints.torso,new THREE.TubeGeometry(curve,hi?24:16,.1,6,false),gold,'gold-necklace',null,'chain');
  }

  joints.head=group(joints.torso,'head',0,5.85,0);
  sphere(joints.head,1.88,skin,'head-form',[0,0,0]);
  cylinder(joints.head,1.68,1.5,2.15,dark,'skull-neck-gaiter',[0,-.86,-.24],'gaiter');
  box(joints.head,[2.8,1.55,.2],dark,'face-gaiter-front',[0,-.78,-1.68]);
  sphere(joints.head,.28,white,'skull-nose',[0,-.42,-1.82]);
  for(let i=0;i<6;i++)box(joints.head,[.3,.5,.11],white,'gaiter-tooth',[(i-2.5)*.38,-1.14,-1.8]);
  for(let r=0;r<3;r++)for(let c=0;c<4;c++)
   box(joints.head,[.35,.28,.06],stitch,'gaiter-print',[(c-1.5)*.55,-.55-r*.35,-1.72]);
  for(const sign of [-1,1]){
   const ear=sphere(joints.head,.42,skin,'ear',[sign*1.85,.05,-.15],'ears');
   ear.scale.set(.45,1.05,.7);
  }

  for(const sign of [-1,1]){
   sphere(joints.head,.42,white,'eye',[sign*.76,.44,-1.62]);
   sphere(joints.head,.2,hair,'iris',[sign*.76,.44,-1.8]);
   sphere(joints.head,.08,dark,'pupil',[sign*.76,.44,-1.92]);
   box(joints.head,[1.4,.11,.15],dark,'eyeglass-frame',[sign*.8,.42+0.4,-1.9],'glasses');
   box(joints.head,[1.4,.11,.15],dark,'eyeglass-frame-b',[sign*.8,.42-0.4,-1.9],'glasses');
   box(joints.head,[.11,.78,.15],dark,'eyeglass-rim',[sign*.8+.64,.42,-1.9]);
   box(joints.head,[.11,.78,.15],dark,'eyeglass-rim-b',[sign*.8-.64,.42,-1.9]);
   box(joints.head,[.98,.18,.18],hair,'brow',[sign*.77,.94,-1.52]).rotation.z=sign*.12;
   box(joints.head,[1.1,.64,.15],glass,'eyeglass-lens',[sign*.8,.42,-1.86]);
   box(joints.head,[.4,.17,1.08],dark,'eyeglass-arm',[sign*1.65,.45,-1.24]);
  }
  box(joints.head,[.4,.17,.22],dark,'eyeglass-bridge',[0,.45,-1.86]);

  const curlGeo=new THREE.IcosahedronGeometry(.5,hi?1:0);geometry.push(curlGeo);
  sphere(joints.head,1.8,hair,'cropped-fade',[0,.7,.14]).scale.set(1,.68,1);
  const curls=new THREE.InstancedMesh(curlGeo,hair,hi?42:28);
  const dummy=new THREE.Object3D();
  let count=0;
  const rows=hi?6:5,cols=hi?7:6;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   if(count>=curls.count)break;
   const x=(col-(cols-1)/2)*.52+Math.sin(row*2+col)*.1;
   const y=1.55+Math.cos(col*.7+row)*.22+Math.sin(row*Math.PI/4)*.32;
   const z=-1.2+row*.55;
   dummy.position.set(x,y,z);
   dummy.scale.setScalar(.7+.26*((col+row)%3)/2);
   dummy.updateMatrix();curls.setMatrixAt(count++,dummy.matrix);
  }
  curls.count=count;
  curls.instanceMatrix.needsUpdate=true;curls.name='Hero/curly-hair';
  curls.userData.heroFeature='hair';joints.head.add(curls);

  for(const side of [-1,1]){
   const key=side<0?'left':'right';
   const Side=side<0?'Left':'Right';
   const arm=group(joints.torso,key+'Arm',side*3.05,4.4,0);
   joints[key+'Arm']=arm;joints[Side+'Arm']=arm;
   cylinder(arm,.8,.68,2.6,cloth,key+'UpperArm',[0,-1.38,0]);
   const elbow=group(arm,key+'Elbow',0,-2.7,0);joints[key+'Elbow']=elbow;joints[Side+'ForeArm']=elbow;
   cylinder(elbow,.68,.6,2.05,skin,key+'Forearm',[0,-1.08,0]);
   const hand=group(elbow,key+'Hand',0,-2.2,0);
   joints[key+'Hand']=hand;joints[Side+'Hand']=hand;
   box(hand,[1.3,.88,1.15],dark,key+'Glove',[0,0,0],'gloves');
   for(let k=0;k<4;k++)box(hand,[.22,.18,.2],rubber,key+'Knuckle',[(k-1.5)*.28,.35,-.45]);
   if(side<0){
    cylinder(elbow,.72,.72,.28,dark,key+'WatchBand',[0,-1.85,0],'watch');
    box(elbow,[.85,.15,.85],trim,key+'WatchFace',[0,-1.85,-.55],'watch');
    box(elbow,[.55,.08,.08],gold,key+'WatchHand',[0,-1.85,-.95],'watch');
   }
   FINGERS.forEach((f,i)=>{
    const fx=(i-2)*.22;
    const finger=group(hand,Side+f,fx,-.42,-.15);
    joints[Side+f]=finger;
    box(finger,[.2,.55,.22],skin,key+f+'Seg',[0,-.28,0]);
   });
  }

  for(const side of [-1,1]){
   const key=side<0?'left':'right';
   const leg=group(rootGroup,key+'Leg',side*1.38,6.65,0);joints[key+'Leg']=leg;
   cylinder(leg,1.32,1.04,3.5,pants,key+'Thigh',[0,-1.85,0]);
   box(leg,[1.55,1.9,.52],cargo,key+'CargoPocket',[side*.4,-2.1,.98]);
   const knee=group(leg,key+'Knee',0,-3.72,0);joints[key+'Knee']=knee;
   cylinder(knee,1.02,.84,2.75,pants,key+'Shin',[0,-1.4,0]);
   box(knee,[2.15,1.55,2.55],boot,key+'AdventureBoot',[0,-3.15,-.42],'boots');
   box(knee,[2.25,.44,3.05],rubber,key+'BootSole',[0,-3.85,-.2],'boot-tread');
   for(let tix=0;tix<3;tix++)for(const tz of [-.9,0,.9])
    box(knee,[.55,.18,.55],dark,key+'Tread',[(tix-1)*.65,-4.05,tz-.2],'boot-tread');
   for(let j=0;j<4;j++)box(knee,[.55,.12,.17],trim,key+'BootLace',[0,-2.95+j*.28,-1.76]);
   cylinder(knee,1.05,1.15,.55,cargo,key+'AnkleGaiter',[0,-2.35,0]);
   box(knee,[1.6,.9,.35],trim,key+'KneePad',[0,-.15,.85]);
  }

  const props={};
  props.rod=group(joints.rightElbow,'fishing-rod',0,-2.5,-.32);
  const rod=cylinder(props.rod,.1,.19,8.2,trim,'rod-shaft',[0,-.1,-4.1]);
  rod.rotation.x=Math.PI/2;
  sphere(props.rod,.56,gold,'rod-reel',[0,0,-1.42]);
  props.binoculars=group(joints.rightElbow,'tracking-binoculars',0,-2.35,-1.05);
  for(const side of [-1,1])cylinder(props.binoculars,.58,.58,1.6,dark,'binoculars',[side*.54,0,-.72]);
  props.spoon=group(joints.rightElbow,'cooking-spoon',0,-2.65,-.32);
  const handle=cylinder(props.spoon,.12,.12,3.8,trim,'spoon-handle',[0,-.2,-2.05]);
  handle.rotation.x=Math.PI/2;
  sphere(props.spoon,.44,trim,'spoon-head',[0,-.2,-3.8]);
  props.rod.visible=false;props.binoculars.visible=false;props.spoon.visible=false;

  let currentState='idle';let lastPose=samplePose('idle',0);
  const targets={
   torso:[joints.torso,'x'],head:[joints.head,'x'],headTurn:[joints.head,'y'],
   leftArm:[joints.leftArm,'x'],rightArm:[joints.rightArm,'x'],
   leftLeg:[joints.leftLeg,'x'],rightLeg:[joints.rightLeg,'x'],
   leftElbow:[joints.leftElbow,'x'],rightElbow:[joints.rightElbow,'x'],
   leftKnee:[joints.leftKnee,'x'],rightKnee:[joints.rightKnee,'x'],pack:[joints.pack,'x']
  };

  function applyFingerGrip(grip){
   const g=clamp(grip,0,1);
   for(const side of ['Left','Right']){
    FINGERS.forEach((f,i)=>{
     const joint=joints[side+f];
     if(!joint)return;
     const amount=g*(i===0?0.55:i===1?0.8:1)*1.05;
     joint.rotation.x+=(amount-joint.rotation.x)*0.35;
    });
   }
  }

  function update({state='idle',stamp=0,dt=.016}={}){
   const pose=samplePose(state,stamp/1000);
   const gain=1-Math.exp(-clamp(dt,0,.15)*10);
   for(const [key,[joint,axis]] of Object.entries(targets)){
    const target=pose[key]??0;
    joint.rotation[axis]+=(target-joint.rotation[axis])*gain;
   }
   joints.torso.position.y=7.5+pose.bodyY;
   props.rod.visible=pose.state==='fish';
   props.binoculars.visible=pose.state==='hunt';
   props.spoon.visible=pose.state==='cook';
   applyFingerGrip(pose.grip||0.11);
   if(typeof globalThis!=='undefined'&&globalThis.ValleyHandIkValidation&&(pose.state==='fish'||pose.state==='hunt'||pose.state==='drive')){
    const rots={};
    for(const side of ['Left','Right']){
     rots[side+'Hand']=joints[side+'Hand']?.rotation.x||0;
     FINGERS.forEach(f=>{rots[side+f]=joints[side+f]?.rotation.x||0;});
    }
    globalThis.ValleyHandIkValidation.validateGrip(pose.state,rots);
   }
   currentState=pose.state;lastPose=pose;
   return {state:currentState,pose:samplePose(currentState,stamp/1000)};
  }

  if(seated)update({state:'drive',stamp:100,dt:.16});

  function dispose(){
   rootGroup.traverse(object=>{
    if(object.isMesh&&object.geometry&&!geometry.includes(object.geometry))object.geometry.dispose();
   });
   geometry.forEach(g=>g.dispose());
   shared.forEach(m=>m.dispose());
  }

  return {
   root:rootGroup,joints,props,update,dispose,
   get state(){return currentState},
   get pose(){return lastPose},
   features:PROFILE.features,
   skinned:false,
   profile:PROFILE,
   version:PROFILE.version
  };
 }

 return Object.freeze({PROFILE,STATES,FINGERS,samplePose,create,pbr});
});
