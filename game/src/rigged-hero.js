/* River Explorer v2: locally embedded original glTF skin, PBR materials,
 * articulated hands and terrain-aware two-bone foot IK. No CDN requests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyRiggedHero=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// The micro-weave is synthesized once per material with no external images,
// preserving the fully standalone HTML / PWA distribution.
function weaveTexture(THREE,name){
 if(typeof document==='undefined'||!/\b(shirt|cargo|pocket|pack|strap|boots|gaiter)\b/.test(name))return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 ctx.fillStyle='#f1f0ec';ctx.fillRect(0,0,96,96);
 const heavy=/cargo|pack|pocket|strap|boots/.test(name);
 for(let y=0;y<96;y+=3){
  for(let x=0;x<96;x+=3){
   const n=(Math.imul(x+29,374761393)^Math.imul(y+17,668265263)^(heavy?7817:31337))>>>0;
   ctx.fillStyle=(n&1)?'rgba(21,25,27,.062)':'rgba(255,255,255,.058)';
   ctx.fillRect(x+(y%2),y,heavy?2:1,1);
  }
 }
 // Readable reinforcements, not photo textures: subtle crossing ripstop yarns.
 ctx.strokeStyle=heavy?'rgba(36,34,28,.15)':'rgba(32,36,38,.065)';
 ctx.lineWidth=1;
 const pitch=heavy?24:16;
 for(let i=0;i<=96;i+=pitch){
  ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,96);ctx.moveTo(0,i);ctx.lineTo(96,i);ctx.stroke();
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.anisotropy=2;texture.needsUpdate=true;
 return texture;
}
function create(THREE,{seated=false,samplePose}={}){
 if(!THREE?.SkinnedMesh||!THREE?.Bone||!THREE?.Skeleton||typeof samplePose!=='function')throw Error('Skinned Three.js and pose sampler required');
 const global=typeof globalThis!=='undefined'?globalThis:{};
 const base64=global.ValleyRiggedHeroData,source=global.ValleyModelLoader;
 if(typeof base64!=='string'||!source?.parseGLB||!source?.dataAccessor)throw Error('Embedded River GLB not present');
 const parsed=source.parseGLB(source.decodeBase64(base64)),doc=parsed.json;
 if(!doc.skins?.length||doc.skins[0].joints.length<15)throw Error('Expected an actual skinned humanoid GLB');
 const scene=new THREE.Group();scene.name='River Explorer / rigged GLB';scene.userData.heroId='river-explorer';scene.userData.asset='river_explorer_rigged.glb';
 const plantLibrary=global.ValleyFootPlant||(typeof module==='object'&&module.exports?require('./foot-plant.js'):null);
 if(!plantLibrary?.create)throw Error('Offline foot-contact solver must load before rigged hero');
 const footContacts=plantLibrary.create({reach:5.5});
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
  const map=weaveTexture(THREE,spec.name);
  materials.push(new THREE.MeshStandardMaterial({name:spec.name,color:new THREE.Color().setRGB(c[0],c[1],c[2],THREE.LinearSRGBColorSpace),metalness:pbr.metallicFactor??0,roughness:pbr.roughnessFactor??.9,map,
   transparent:spec.alphaMode==='BLEND',opacity:c[3],side:spec.doubleSided?THREE.DoubleSide:THREE.FrontSide,depthWrite:spec.alphaMode!=='BLEND'}));
 }
 for(const prim of meshDoc.primitives){
  const pos=source.dataAccessor(parsed,prim.attributes.POSITION),norm=source.dataAccessor(parsed,prim.attributes.NORMAL),skinIDs=source.dataAccessor(parsed,prim.attributes.JOINTS_0),weight=source.dataAccessor(parsed,prim.attributes.WEIGHTS_0),idx=source.dataAccessor(parsed,prim.indices);
  if(pos.channels!==3||norm.channels!==3||skinIDs.channels!==4||weight.channels!==4||skinIDs.count!==pos.count||weight.count!==pos.count)throw Error('Invalid skin accessor');
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos.values,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(norm.values,3));
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIDs.values,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weight.values,4));
  if(Number.isInteger(prim.attributes.TEXCOORD_0)){
   const uv=source.dataAccessor(parsed,prim.attributes.TEXCOORD_0);
   if(uv.channels!==2||uv.count!==pos.count)throw Error('Invalid cloth UV0 accessor');
   geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv.values,2));
  }
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
  const theta=2*Math.PI*t*(amplitude>.7?3.4:amplitude>.4?2.6:2.0)+(left?0:Math.PI);
  const wave=Math.sin(theta);
  const step=amplitude*(amplitude>.7?1.35:1.07);
  const yaw=Number.isFinite(heading)?heading:root.rotation.y;
  const contact=footContacts.step({side,phase:theta,root:root.position,heading:yaw,
   localX:sign*1.35,localZ:-wave*step,moving,groundAt});
  const targetY=clamp(contact.groundOffset,-.85,.85)+.24+contact.lift;
  const dy=6.27-targetY,dz=contact.localZ,upper=3.25,lower=2.74,length=clamp(Math.hypot(dy,dz),.12,upper+lower-.035);
  const reach=Math.acos(clamp((upper*upper+length*length-lower*lower)/(2*upper*length),-1,1));
  const kneeBend=Math.PI-Math.acos(clamp((upper*upper+lower*lower-length*length)/(2*upper*lower),-1,1));
  const hipTilt=Math.atan2(-dz,dy)-reach,gain=1-Math.exp(-Math.min(.1,Math.max(0,dt))*15);
  hip.rotation.x+=(hipTilt-hip.rotation.x)*gain;
  const hipYaw=clamp((contact.localX-sign*1.35)*.13,-.32,.32);
  hip.rotation.y+=(hipYaw-hip.rotation.y)*gain;knee.rotation.x+=(kneeBend-knee.rotation.x)*gain;
  foot.rotation.x+=(-hip.rotation.x-knee.rotation.x+contact.pitch-foot.rotation.x)*gain;
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
  // Wrist alignment lets the existing hand-attached gear follow palms rather
  // than float independently through fishing, cooking and seated interactions.
  const grips={
   fish:{left:[-.26,-.12,.10],right:[-.52,.02,-.13]},
   hunt:{left:[-.32,.15,.06],right:[-.34,-.08,-.04]},
   cook:{left:[-.25,.06,.03],right:[-.68,0,-.08]},
   drive:{left:[-.36,.13,.10],right:[-.36,-.13,-.10]},
   interact:{left:[-.20,.02,0],right:[-.28,-.02,0]},
   farm:{left:[-.34,.02,0],right:[-.42,-.02,0]}
  };
  const palms=grips[pose.state]||{left:[0,0,0],right:[0,0,0]};
  targets.LeftHand=palms.left;targets.RightHand=palms.right;
  // Ten authored skinned fingers curl around grips while other hands stay relaxed.
  const gripAmount={fish:.68,hunt:.58,cook:.55,drive:.48,interact:.4,farm:.44}[pose.state]??.11;
  for(const side of ['Left','Right']){
   for(const [index,digit] of ['Thumb','Index','Middle','Ring','Pinky'].entries()){
    const finger=joints[side+digit];if(!finger)continue;
    const amount=gripAmount*(index===0?.65:index===1?.85:1);
    finger.rotation.x+=((side==='Left'?-1:1)*amount-finger.rotation.x)*gain;
   }
  }
  for(const [key,val] of Object.entries(targets)){
   const b=joints[key];if(!b)continue;
   b.rotation.x+=(val[0]-b.rotation.x)*gain;
   b.rotation.z+=(val[1]-b.rotation.z)*gain;
   b.rotation.y+=(val[2]-b.rotation.y)*gain;
  }
  if(moving||pose.state==='idle')for(const side of ['left','right'])footIK(side,{t,groundAt,heading,root:scene,dt,moving,amplitude:amp});
  else{
   footContacts.reset();
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
 function dispose(){footContacts.reset();for(const m of meshes){m.geometry.dispose();m.parent?.remove(m)}for(const g of propsGeo)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}for(const p of Object.values(props))p.parent?.remove(p);scene.clear();}
 return {root:scene,joints,props,meshes,skinned:true,get footContacts(){return footContacts.snapshot()},clips:(doc.animations||[]).map(a=>a.name),update,dispose,features:['curly-hair','glasses','skull-gaiter','black-shirt','gold-chain','cargo-pants','adventure-boots','backpack'],get state(){return currentState},get pose(){return lastPose}};
}
return Object.freeze({create});
});