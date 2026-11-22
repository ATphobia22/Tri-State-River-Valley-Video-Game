/* River Explorer v2: locally embedded original glTF skin, PBR materials,
 * articulated hands and terrain-aware two-bone foot IK. No CDN requests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyRiggedHero=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function create(THREE,{seated=false,samplePose}={}){
 if(!THREE?.SkinnedMesh||!THREE?.Bone||!THREE?.Skeleton||typeof samplePose!=='function')throw Error('Skinned Three.js and pose sampler required');
 const global=typeof globalThis!=='undefined'?globalThis:{};
 const base64=global.ValleyRiggedHeroData,source=global.ValleyModelLoader;
 if(typeof base64!=='string'||!source?.parseGLB||!source?.dataAccessor)throw Error('Embedded River GLB not present');
 const parsed=source.parseGLB(source.decodeBase64(base64)),doc=parsed.json;
 if(!doc.skins?.length||doc.skins[0].joints.length<15)throw Error('Expected an actual skinned humanoid GLB');
 const scene=new THREE.Group();scene.name='River Explorer / rigged GLB';scene.userData.heroId='river-explorer';scene.userData.asset='river_explorer_rigged.glb';
 const skin=doc.skins[0],jointNodes=skin.joints;
 const bones=jointNodes.map(i=>{const data=doc.nodes[i],b=new THREE.Bone();b.name=data.name;b.position.fromArray(data.translation||[0,0,0]);return b;});
 const byNode=new Map(jointNodes.map((n,i)=>[n,bones[i]]));
 const joints={};jointNodes.forEach((n,i)=>{joints[doc.nodes[n].name]=bones[i];});
 for(const [node,object] of byNode){const parent=jointNodes.find(n=>doc.nodes[n].children?.includes(node));if(parent!==undefined)byNode.get(parent).add(object);else scene.add(object);}
 scene.updateMatrixWorld(true);
 const skeleton=new THREE.Skeleton(bones);
 const meshNode=doc.nodes.find(n=>n.skin!==undefined);
 if(!meshNode)throw Error('Missing GLB skin node');
 const meshDoc=doc.meshes[meshNode.mesh],meshes=[],materials=[];
 for(const spec of doc.materials||[]){
  const pbr=spec.pbrMetallicRoughness||{},c=pbr.baseColorFactor||[.5,.5,.5,1];
  materials.push(new THREE.MeshStandardMaterial({name:spec.name,color:new THREE.Color().setRGB(c[0],c[1],c[2],THREE.LinearSRGBColorSpace),metalness:pbr.metallicFactor??0,roughness:pbr.roughnessFactor??.9,
   transparent:spec.alphaMode==='BLEND',opacity:c[3],side:spec.doubleSided?THREE.DoubleSide:THREE.FrontSide,depthWrite:spec.alphaMode!=='BLEND'}));
 }
 for(const prim of meshDoc.primitives){
  const pos=source.dataAccessor(parsed,prim.attributes.POSITION),norm=source.dataAccessor(parsed,prim.attributes.NORMAL),skinIDs=source.dataAccessor(parsed,prim.attributes.JOINTS_0),weight=source.dataAccessor(parsed,prim.attributes.WEIGHTS_0),idx=source.dataAccessor(parsed,prim.indices);
  if(pos.channels!==3||norm.channels!==3||skinIDs.channels!==4||weight.channels!==4||skinIDs.count!==pos.count||weight.count!==pos.count)throw Error('Invalid skin accessor');
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos.values,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(norm.values,3));
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIDs.values,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weight.values,4));
  geo.setIndex(idx.values);geo.computeBoundingSphere();
  const mesh=new THREE.SkinnedMesh(geo,materials[prim.material]);mesh.name='River/PBR/'+doc.materials[prim.material].name;
  mesh.bind(skeleton);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;scene.add(mesh);meshes.push(mesh);
 }
 const propMat=materials.find(m=>m.name==='River strap')||new THREE.MeshStandardMaterial({color:0x806344,roughness:.88});
 const metal=materials.find(m=>m.name==='River metal')||new THREE.MeshStandardMaterial({color:0x65706b,metalness:.7});
 const dark=materials.find(m=>m.name==='River gaiter')||propMat;
 const props={};const propsGeo=[];
 function group(name){const g=new THREE.Group();g.name='Hand attachment/'+name;joints.RightHand.add(g);g.position.set(.25,-.1,-.22);g.visible=false;return g;}
 function attach(g,geo,mat,pos,rot){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);if(rot)m.rotation.set(...rot);g.add(m);propsGeo.push(geo);return m;}
 props.rod=group('rod');attach(props.rod,new THREE.CylinderGeometry(.07,.13,7.8,8),propMat,[0,0,-3.85],[Math.PI/2,0,0]);attach(props.rod,new THREE.TorusGeometry(.39,.13,7,18),metal,[0,-.18,-1.28],[Math.PI/2,0,0]);
 props.binoculars=group('binoculars');for(const sign of [-1,1])attach(props.binoculars,new THREE.CylinderGeometry(.41,.41,1.3,12),dark,[sign*.42,-.15,-.58],[Math.PI/2,0,0]);
 props.spoon=group('spoon');attach(props.spoon,new THREE.CylinderGeometry(.085,.09,3.7,7),metal,[0,-.05,-1.55],[Math.PI/2,0,0]);attach(props.spoon,new THREE.SphereGeometry(.32,10,7),metal,[0,-.05,-3.48]);
 let currentState='idle',lastPose=samplePose('idle',0);
 function footIK(side,{t,groundAt,heading,root,dt,moving,amplitude}){
  const left=side==='left',name=left?'Left':'Right',sign=left?-1:1;
  const hip=joints[name+'UpperLeg'],knee=joints[name+'LowerLeg'],foot=joints[name+'Foot'];
  const theta=2*Math.PI*t*(amplitude>.7?2.6:amplitude>.4?2.0:1.5)+(left?0:Math.PI);
  const wave=Math.sin(theta),lift=Math.max(0,Math.cos(theta))*.66;
  const step=amplitude*(amplitude>.7?1.35:1.07),stride=wave*step;
  const localX=sign*1.35,localZ=-stride;
  const yaw=Number.isFinite(heading)?heading:root.rotation.y;
  const worldX=root.position.x+Math.cos(yaw)*localX+Math.sin(yaw)*localZ;
  const worldZ=root.position.z-Math.sin(yaw)*localX+Math.cos(yaw)*localZ;
  const rawGround=typeof groundAt==='function'?groundAt(worldX,worldZ):root.position.y;
  const floor=Number.isFinite(rawGround)?rawGround-root.position.y:0;
  const targetY=clamp(floor,-.85,.85)+.24+(moving?lift:0);
  const dy=6.27-targetY,dz=localZ,upper=3.25,lower=2.74,length=clamp(Math.hypot(dy,dz),.12,upper+lower-.035);
  const reach=Math.acos(clamp((upper*upper+length*length-lower*lower)/(2*upper*length),-1,1));
  const kneeBend=Math.PI-Math.acos(clamp((upper*upper+lower*lower-length*length)/(2*upper*lower),-1,1));
  const hipTilt=Math.atan2(-dz,dy)-reach,gain=1-Math.exp(-Math.min(.1,Math.max(0,dt))*15);
  hip.rotation.x+=(hipTilt-hip.rotation.x)*gain;knee.rotation.x+=(kneeBend-knee.rotation.x)*gain;
  foot.rotation.x+=(-hip.rotation.x-knee.rotation.x-foot.rotation.x)*gain;
 }
 function update({state='idle',stamp=0,dt=.016,groundAt=null,heading=null}={}){
  const t=Number.isFinite(stamp)?stamp/1000:0,pose=samplePose(state,t),gain=1-Math.exp(-clamp(dt,0,.15)*11);
  const moving=['walk','run','sprint'].includes(pose.state),amp=pose.state==='walk'?.36:pose.state==='run'?.66:pose.state==='sprint'?.92:0;
  const targets={
   Spine:[pose.torso*.28,0,0],Chest:[pose.torso*.72,0,0],Neck:[pose.head||0,0,0],Head:[0,0,pose.headTurn||0],
   LeftUpperArm:[pose.leftArm*.6,1.12+(pose.armSpread||.08)+.15*pose.leftArm,0],
   RightUpperArm:[pose.rightArm*.6,-1.12-(pose.armSpread||.08)-.15*pose.rightArm,0],
   LeftForearm:[0,-.15-pose.leftElbow*.55,0],RightForearm:[0,.15+pose.rightElbow*.55,0]
  };
  if(['fish','hunt','cook','drive','interact','farm'].includes(pose.state)){
   targets.RightUpperArm=[pose.rightArm*.40,-.32-(pose.rightArm||0)*.58,0];
   targets.LeftUpperArm=[pose.leftArm*.4,.32+(pose.leftArm||0)*.58,0];
  }
  for(const [key,val] of Object.entries(targets)){
   const b=joints[key];if(!b)continue;
   b.rotation.x+=(val[0]-b.rotation.x)*gain;
   b.rotation.z+=(val[1]-b.rotation.z)*gain;
   b.rotation.y+=(val[2]-b.rotation.y)*gain;
  }
  if(moving||pose.state==='idle')for(const side of ['left','right'])footIK(side,{t,groundAt,heading,root:scene,dt,moving,amplitude:amp});
  else{
   const legAngles=pose.state==='drive'?[1.08,1.08]:[pose.leftLeg||0,pose.rightLeg||0];
   for(const [i,side] of ['Left','Right'].entries()){
    const a=joints[side+'UpperLeg'],b=joints[side+'LowerLeg'],f=joints[side+'Foot'];
    a.rotation.x+=(legAngles[i]-a.rotation.x)*gain;
    b.rotation.x+=((pose.state==='drive'?-1.13:pose[side.toLowerCase()+'Knee']||0)-b.rotation.x)*gain;
    f.rotation.x+=(-a.rotation.x-b.rotation.x-f.rotation.x)*gain;
   }
  }
  joints.Hips.position.y=6.65+clamp(pose.bodyY,-.3,.48);
  for(const [name,prop] of Object.entries(props))prop.visible=(name==='rod'&&pose.state==='fish')||(name==='binoculars'&&pose.state==='hunt')||(name==='spoon'&&pose.state==='cook');
  currentState=pose.state;lastPose=pose;return {state:currentState,pose};
 }
 if(seated)update({state:'drive',stamp:100,dt:.5});
 function dispose(){for(const m of meshes){m.geometry.dispose();m.parent?.remove(m)}for(const g of propsGeo)g.dispose();for(const m of materials)m.dispose();for(const p of Object.values(props))p.parent?.remove(p);scene.clear();}
 return {root:scene,joints,props,meshes,skinned:true,clips:(doc.animations||[]).map(a=>a.name),update,dispose,features:['curly-hair','glasses','skull-gaiter','black-shirt','gold-chain','cargo-pants','adventure-boots','backpack'],get state(){return currentState},get pose(){return lastPose}};
}
return Object.freeze({create});
});