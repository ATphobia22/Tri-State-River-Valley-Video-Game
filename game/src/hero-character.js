/*
 * River Explorer: ORIGINAL local, articulated 3D player character.
 * Modeled after the user-provided hero concept/animation sheets; no external
 * services, textures, rig packages, original photo replication, or CDN assets.
 * Hero faces local -Z; root origin is the ground contact. Units match the world.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValleyHero=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const PROFILE=Object.freeze({
  id:'river-explorer',displayName:'River — Explorer',
  features:Object.freeze(['curly-hair','glasses','skull-gaiter','black-shirt','gold-chain',
    'cargo-pants','adventure-boots','backpack']),
  palette:Object.freeze({fabric:0x24272a,boots:0x1b2124,skin:0xb97e57,hair:0x35251d,
    trim:0x857c61,gold:0xdba54a,glasses:0x171c20,pack:0x544e3d})
 });
 const STATES=Object.freeze(['idle','walk','run','sprint','jump','land','interact','fish','hunt','cook','farm','drive']);
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number.isFinite(v)?v:min));
 function samplePose(state,time,phase=0){
  if(!STATES.includes(state))state='idle';
  const t=Number.isFinite(time)?time:0;
  const step=state==='walk'?1.5:state==='run'?2.1:state==='sprint'?2.7:0;
  const amp=state==='walk'?.32:state==='run'?.63:state==='sprint'?.87:0;
  const wave=Math.sin(t*2*Math.PI*step+phase),opposite=-wave;
  const p={state,torso:0,head:0,headTurn:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0,
    leftElbow:-.13,rightElbow:-.13,leftKnee:0,rightKnee:0,pack:0,bodyY:0,armSpread:.08};
  if(amp){
   p.leftLeg=amp*wave;p.rightLeg=amp*opposite;
   p.leftArm=-amp*.82*wave;p.rightArm=amp*.82*wave;
   p.leftElbow=-.23-(state==='sprint'?.62:state==='run'?.35:.12);
   p.rightElbow=p.leftElbow;
   p.leftKnee=Math.max(0,-wave)*amp*.6;p.rightKnee=Math.max(0,wave)*amp*.6;
   p.torso=state==='sprint'?.21:state==='run'?.12:.035;
   p.bodyY=Math.abs(wave)*(state==='sprint'?.18:.11);
   p.pack=Math.sin(t*step*9)*.036;
  }else if(state==='idle'){
   p.torso=Math.sin(t*1.4)*.017;p.headTurn=Math.sin(t*.45)*.09;
   p.bodyY=Math.sin(t*1.5)*.045;p.pack=Math.sin(t*1.25)*.01;
  }else if(state==='jump'){
   p.torso=.13;p.leftArm=-.9;p.rightArm=-.9;p.leftLeg=.44;p.rightLeg=-.12;
   p.leftKnee=.68;p.rightKnee=.28;p.bodyY=1.25;
  }else if(state==='land'){
   p.torso=.48;p.leftArm=.28;p.rightArm=.25;p.leftLeg=.38;p.rightLeg=.34;
   p.leftKnee=.62;p.rightKnee=.63;p.bodyY=-.18;
  }else if(state==='interact'||state==='farm'){
   p.torso=state==='farm'?.65:.48;
   p.leftArm=.40;p.rightArm=.72;p.leftLeg=.24;p.rightLeg=-.15;
   p.leftKnee=.54;p.rightKnee=.61;p.rightElbow=-.65;
  }else if(state==='fish'){
   p.torso=.05;p.leftArm=1.08+Math.sin(t*2.2)*.04;p.rightArm=1.28+Math.sin(t*3)*.08;
   p.leftElbow=-.76;p.rightElbow=-.56;
   p.head=-.1;p.pack=Math.sin(t*1.4)*.013;
  }else if(state==='hunt'){
   p.torso=.19;p.leftArm=1.16;p.rightArm=1.08;p.leftElbow=-1.12;
   p.rightElbow=-.98;p.leftLeg=.19;p.rightLeg=-.12;p.head=-.12;
  }else if(state==='cook'){
   p.torso=.63;p.leftArm=.76;p.rightArm=.88+Math.sin(t*4.2)*.11;
   p.leftElbow=-.42;p.rightElbow=-.9;p.leftLeg=.52;p.rightLeg=-.29;
   p.leftKnee=.68;p.rightKnee=.71;p.bodyY=-.28;
  }else if(state==='drive'){
   p.torso=.08;p.leftArm=1.08;p.rightArm=1.08;p.leftElbow=-.66;
   p.rightElbow=-.66;p.leftLeg=1.0;p.rightLeg=1.0;
   p.leftKnee=1.08;p.rightKnee=1.08;p.headTurn=Math.sin(t*.32)*.07;
  }
  return p;
 }
 function create(THREE,{seated=false}={}){
  if(!THREE||typeof THREE.Group!=='function')throw new TypeError('THREE scene-graph implementation required');
  const root=new THREE.Group();root.name='River Explorer';
  root.userData.heroId=PROFILE.id;
  const joints={};
  function group(parent,name,x=0,y=0,z=0){
   const g=new THREE.Group();g.name='Hero/'+name;g.position.set(x,y,z);parent.add(g);return g;
  }
  function mat(hex,roughness=.88,metalness=0,more={}){
   return new THREE.MeshStandardMaterial({color:hex,roughness,metalness,...more});
  }
  const cloth=mat(PROFILE.palette.fabric),pants=mat(0x313234),
   cargo=mat(0x3d3b37),skin=mat(PROFILE.palette.skin),hair=mat(PROFILE.palette.hair),
   boot=mat(PROFILE.palette.boots),trim=mat(PROFILE.palette.trim),
   gold=mat(PROFILE.palette.gold,.32,.69),glass=mat(0x344953,.24,.12,{transparent:true,opacity:.83}),
   dark=mat(0x151618),white=mat(0xd9d9d1,.87),pack=mat(PROFILE.palette.pack,.94);
  const shared=[cloth,pants,cargo,skin,hair,boot,trim,gold,glass,dark,white,pack];
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
   return mesh(parent,new THREE.SphereGeometry(r,10,8),material,name,position,feature);
  }
  function cylinder(parent,r1,r2,h,material,name,position,feature){
   return mesh(parent,new THREE.CylinderGeometry(r1,r2,h,8),material,name,position,feature);
  }
  // Body, shirt seams and cargo belt. Animation pivots at the waist.
  joints.torso=group(root,'torso',0,7.5,0);
  box(joints.torso,[5.2,5.5,2.65],cloth,'technical-shirt',[0,2.6,0],'black-shirt');
  box(joints.torso,[5.55,.43,2.84],dark,'belt',[0,-.34,0]);
  box(joints.torso,[1.1,.46,.7],trim,'belt-buckle',[0,-.36,-1.49]);
  for(const side of [-1,1]){
   box(joints.torso,[.9,2,.85],cargo,'utility-pocket',[side*2.45,.35,.55]);
   box(joints.torso,[.7,2.7,.35],trim,'backpack-strap',[side*2.04,2.9,-1.41]);
   sphere(joints.torso,.55,cloth,'shoulder',[side*2.7,4.45,0]);
  }
  joints.pack=group(joints.torso,'pack',0,2.7,0);
  box(joints.pack,[4.4,5.4,2.5],pack,'adventure-backpack',[0,0,2.7],'backpack');
  box(joints.pack,[3.1,2.05,.55],cargo,'backpack-front-pocket',[0,-1,4.2]);
  box(joints.pack,[4.1,.5,3],trim,'backpack-roll-top',[0,2.3,2.75]);
  box(joints.pack,[.75,.45,.4],gold,'pack-buckle',[0,-.24,4.35]);
  // Gold necklace forms a U in front of the shirt. Original procedural geometry.
  const curve=new THREE.CatmullRomCurve3([
   new THREE.Vector3(-1.5,4.18,-1.42),new THREE.Vector3(-1.2,3.36,-1.56),
   new THREE.Vector3(0,2.94,-1.58),new THREE.Vector3(1.2,3.36,-1.56),
   new THREE.Vector3(1.5,4.18,-1.42)]);
  mesh(joints.torso,new THREE.TubeGeometry(curve,18,.095,5,false),gold,'gold-necklace',null,'chain');
  // Head, hair curls, skull gaiter and glasses.
  joints.head=group(joints.torso,'head',0,5.8,0);
  sphere(joints.head,1.84,skin,'head-form',[0,0,0]);
  cylinder(joints.head,1.65,1.47,2.1,dark,'skull-neck-gaiter',[0,-.84,-.23],'gaiter');
  box(joints.head,[2.75,1.52,.19],dark,'face-gaiter-front',[0,-.76,-1.65]);
  // Distinctive skull teeth & nose remain readable when no texture canvas is available.
  sphere(joints.head,.26,white,'skull-nose',[0,-.40,-1.79]);
  for(let i=0;i<6;i++)box(joints.head,[.28,.48,.10],white,'gaiter-tooth',[(i-2.5)*.37,-1.12,-1.77]);
  for(const sign of [-1,1]){
   box(joints.head,[1.34,.82,.16],dark,'eyeglass-frame',[sign*.78,.40,-1.73],'glasses');
   box(joints.head,[1.07,.61,.14],glass,'eyeglass-lens',[sign*.78,.40,-1.84]);
   box(joints.head,[.37,.16,1.05],dark,'eyeglass-arm',[sign*1.62,.43,-1.21]);
  }
  box(joints.head,[.39,.16,.2],dark,'eyeglass-bridge',[0,.43,-1.84]);
  // Instanced curls: one draw batch. The shape belongs to this *original* game model.
  const curlGeo=new THREE.IcosahedronGeometry(.48,1);geometry.push(curlGeo);
  const curls=new THREE.InstancedMesh(curlGeo,hair,21);
  const dummy=new THREE.Object3D();
  let count=0;
  for(let row=0;row<3;row++)for(let col=0;col<7;col++){
   if(count>=21)break;
   const x=(col-3)*.54+Math.sin(row*2+col)*.11;
   const y=1.54+Math.cos(col*.7+row)*.22+row*.10;
   const z=-1.22+row*.71;
   dummy.position.set(x,y,z);
   const sc=.72+.24*((col+row)%3)/2;
   dummy.scale.setScalar(sc);dummy.updateMatrix();curls.setMatrixAt(count++,dummy.matrix);
  }
  curls.instanceMatrix.needsUpdate=true;curls.name='Hero/curly-hair';
  curls.userData.heroFeature='hair';joints.head.add(curls);
  // Articulated arms, fingerless gloves and visible hands.
  for(const side of [-1,1]){
   const key=side<0?'left':'right';
   const arm=group(joints.torso,key+'Arm',side*3.0,4.35,0);
   joints[key+'Arm']=arm;
   cylinder(arm,.77,.66,2.55,cloth,key+'UpperArm',[0,-1.35,0]);
   const elbow=group(arm,key+'Elbow',0,-2.65,0);joints[key+'Elbow']=elbow;
   cylinder(elbow,.66,.59,2.0,skin,key+'Forearm',[0,-1.05,0]);
   box(elbow,[1.27,.86,1.13],dark,key+'Glove',[0,-2.15,0],'gloves');
   box(elbow,[1.09,.45,.96],skin,key+'Fingers',[0,-2.60,-.12]);
  }
  // Two hips with knees, boot shafts, tread and outer cargo-pocket detail.
  for(const side of [-1,1]){
   const key=side<0?'left':'right';
   const leg=group(root,key+'Leg',side*1.35,6.6,0);joints[key+'Leg']=leg;
   cylinder(leg,1.30,1.02,3.45,pants,key+'Thigh',[0,-1.82,0]);
   box(leg,[1.5,1.85,.49],cargo,key+'CargoPocket',[side*.38,-2.07,.95]);
   const knee=group(leg,key+'Knee',0,-3.68,0);joints[key+'Knee']=knee;
   cylinder(knee,1.00,.82,2.7,pants,key+'Shin',[0,-1.38,0]);
   box(knee,[2.1,1.53,2.5],boot,key+'AdventureBoot',[0,-3.12,-.40],'boots');
   box(knee,[2.2,.42,3.0],dark,key+'Sole',[0,-3.97,-.73]);
   for(let j=0;j<3;j++)box(knee,[1.55,.11,.16],trim,key+'BootLace',[0,-2.87+j*.32,-1.74]);
  }
  // Activity-specific equipment can animate with the same hand joints.
  const props={};
  props.rod=group(joints.rightElbow,'fishing-rod',0,-2.45,-.3);
  const rod=cylinder(props.rod,.09,.18,8.0,trim,'rod-shaft',[0,-.1,-4]);
  rod.rotation.x=Math.PI/2;
  sphere(props.rod,.54,gold,'rod-reel',[0,0,-1.4]);
  props.binoculars=group(joints.rightElbow,'tracking-binoculars',0,-2.3,-1.0);
  for(const side of [-1,1])cylinder(props.binoculars,.56,.56,1.55,dark,'binoculars',[side*.52,0,-.7]);
  props.spoon=group(joints.rightElbow,'cooking-spoon',0,-2.6,-.30);
  const handle=cylinder(props.spoon,.11,.11,3.7,trim,'spoon-handle',[0,-.2,-2]);
  handle.rotation.x=Math.PI/2;
  sphere(props.spoon,.42,trim,'spoon-head',[0,-.2,-3.7]);
  props.rod.visible=false;props.binoculars.visible=false;props.spoon.visible=false;
  const current={};let currentState='idle';let lastPose=samplePose('idle',0);
  const targets={torso:[joints.torso,'x'],head:[joints.head,'x'],headTurn:[joints.head,'y'],
    leftArm:[joints.leftArm,'x'],rightArm:[joints.rightArm,'x'],
    leftLeg:[joints.leftLeg,'x'],rightLeg:[joints.rightLeg,'x'],
    leftElbow:[joints.leftElbow,'x'],rightElbow:[joints.rightElbow,'x'],
    leftKnee:[joints.leftKnee,'x'],rightKnee:[joints.rightKnee,'x'],pack:[joints.pack,'x']};
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
   currentState=pose.state;lastPose=pose;
   return {state:currentState,pose:samplePose(currentState,stamp/1000)};
  }
  // Seat composition is pose-driven, rather than a separate generic mannequin.
  if(seated)update({state:'drive',stamp:100,dt:.16});
  function dispose(){
   root.traverse(object=>{if(object.isMesh&&object.geometry&&!geometry.includes(object.geometry))object.geometry.dispose();});
   geometry.forEach(g=>g.dispose());
   shared.forEach(m=>m.dispose());
  }
  return {root,joints,props,update,dispose,get state(){return currentState},
    get pose(){return lastPose},features:PROFILE.features};
 }
 return Object.freeze({PROFILE,STATES,samplePose,create});
});
