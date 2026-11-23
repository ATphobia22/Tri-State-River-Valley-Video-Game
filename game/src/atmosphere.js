/* River Valley original procedural scene effects: gradient atmosphere, drifting clouds,
   riverside pollen and local low-poly wildflowers. Offline, deterministic, no textures/requests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyAtmosphere=api;})(typeof globalThis==='object'?globalThis:this,function(){'use strict';
function create(THREE,scene,terrainHeight,limit,seed=74378){
 let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false, fog:false, uniforms:{
  uHorizon:{value:new THREE.Color('#eebd93')},uZenith:{value:new THREE.Color('#3e6e8f')},
  uSunDir:{value:new THREE.Vector3(1,.35,.12)},uSunColor:{value:new THREE.Color('#ffe7b4')},uNight:{value:0}},
 vertexShader:`varying vec3 vSky;void main(){vSky=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`varying vec3 vSky;uniform vec3 uHorizon,uZenith,uSunDir,uSunColor;uniform float uNight;
  void main(){vec3 d=normalize(vSky);float k=smoothstep(-.18,.9,d.y);vec3 base=mix(uHorizon,uZenith,k);
   float sun=pow(max(dot(d,normalize(uSunDir)),0.),1900.);
   base+=uSunColor*sun*.78;
   float star=step(.9985,fract(sin(dot(floor(d*1200.),vec3(13.133,78.233,37.719)))*43758.5453))*smoothstep(.35,.8,d.y)*uNight;
   base+=vec3(star*.48);gl_FragColor=vec4(base,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>}`});
 const sky=new THREE.Mesh(new THREE.SphereGeometry(6000,32,20),skyMat);sky.frustumCulled=false;sky.renderOrder=-999;scene.add(sky);
 const flowerPositions=[];
 for(let k=0;k<1800;k++){
  const x=(random()*2-1)*limit,z=(random()*2-1)*limit;
  if(z>1150||(Math.abs(x)<580&&z>-300&&z<770)||random()<.16)continue;
  flowerPositions.push({x,z,y:terrainHeight(x,z),r:.5+random()*.8,kind:Math.floor(random()*5)});
 }
 const stem=new THREE.InstancedMesh(new THREE.CylinderGeometry(.14,.19,2.6,4),new THREE.MeshLambertMaterial({color:0x477c44}),flowerPositions.length);
 const head=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.75,0),new THREE.MeshLambertMaterial({color:0xffffff,flatShading:true}),flowerPositions.length);
 const p=new THREE.Object3D(),color=new THREE.Color();const palette=[0xffdb8c,0xe8abcc,0xb8c0ff,0xf0f1d5,0xf6b9a1];
 flowerPositions.forEach((f,i)=>{p.position.set(f.x,f.y+1.5,f.z);p.scale.setScalar(f.r);p.updateMatrix();stem.setMatrixAt(i,p.matrix);
 p.position.y=f.y+3*f.r;p.updateMatrix();head.setMatrixAt(i,p.matrix);head.setColorAt(i,color.setHex(palette[f.kind]));});
 stem.instanceMatrix.needsUpdate=head.instanceMatrix.needsUpdate=true;head.instanceColor.needsUpdate=true;
 stem.frustumCulled=head.frustumCulled=false;scene.add(stem,head);
 const cloudMaterial=new THREE.MeshLambertMaterial({color:0xf2f0e2,transparent:true,opacity:.54,depthWrite:false});const clouds=[];
 for(let i=0;i<17;i++){
  const cloud=new THREE.Group(),n=3+Math.floor(random()*3),size=38+random()*68;
  for(let j=0;j<n;j++){
   const puff=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),cloudMaterial);
   puff.position.set(j*size*.47,Math.sin(j*1.8)*5,random()*size*.1);puff.scale.set(size*.42,size*.14,size*.27);cloud.add(puff);
  }
  cloud.userData={x:(random()*2-1)*limit,z:(random()*2-1)*limit,altitude:310+random()*185,drift:3+random()*5};
  scene.add(cloud);clouds.push(cloud);
 }
 const riverGlints=[];
 for(let i=0;i<420;i++){
  const x=(random()*2-1)*limit,z=1280+140*Math.sin(x/550)+65*Math.cos(x/175)+random()*700;
  if(z>limit)continue;riverGlints.push(x,.85,z);
 }
 const glintGeo=new THREE.BufferGeometry();glintGeo.setAttribute('position',new THREE.Float32BufferAttribute(riverGlints,3));
 const glints=new THREE.Points(glintGeo,new THREE.PointsMaterial({color:0xf9e0b1,size:2.5,transparent:true,opacity:.54,depthWrite:false}));scene.add(glints);
 function update(camera,time,weather,season,stamp,film){
  sky.position.copy(camera.position);
  const day=Math.max(0,Math.sin((time-6)*Math.PI/12)),night=(film?.look==='golden'&&time>=17.5&&time<19.2)?0:1-Math.min(1,day*2.4);
  skyMat.uniforms.uNight.value=night;
  // One shared art-directed sun/sky palette, not mismatched background and water lighting.
  skyMat.uniforms.uHorizon.value.set(film?.horizon||(weather==='rain'?'#677d91':day<.25?'#a77272':'#e8b892'));
  skyMat.uniforms.uZenith.value.set(film?.zenith||(day<.25?'#101d39':weather==='rain'?'#445867':'#4a82a1'));
  if(film?.sunDirection){
   const d=film.sunDirection;
   skyMat.uniforms.uSunDir.value.set(d.x,d.y,d.z);
   skyMat.uniforms.uSunColor.value.set(film.sun);
  }else{
   skyMat.uniforms.uSunDir.value.set(Math.cos((time-6)*Math.PI/12),Math.sin((time-6)*Math.PI/12),-.16).normalize();
  }
  clouds.forEach((c,i)=>{const x=c.userData.x+((stamp*.001*c.userData.drift)%(limit*2));c.position.set((((x+limit)%(limit*2)+limit*2)%(limit*2))-limit,c.userData.altitude,c.userData.z);});
  cloudMaterial.opacity=weather==='rain'?.78:weather==='mist'?.75:.47;
  glints.material.opacity=weather==='rain'?.18:day*.55;
  glints.rotation.y=.002*Math.sin(stamp*.00025);
  head.material.color.set(season==='winter'?'#d1dadb':'#ffffff');
 }
 return {sky,stem,flowers:head,clouds,glints,update,counts:{flowerCount:flowerPositions.length,cloudCount:clouds.length,riverGlints:riverGlints.length/3}};
}
return {create};
});
