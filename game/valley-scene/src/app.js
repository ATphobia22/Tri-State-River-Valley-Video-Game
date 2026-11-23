import * as THREE from 'three';
import {prepareParcels} from './parcel-projection.mjs';
import ZONING from './zoning-sim.cjs';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import decoderJS from 'three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js?text';
import decoderWasm from 'three/examples/jsm/libs/draco/gltf/draco_decoder.wasm';

const $=id=>document.getElementById(id);
const status=$('status');
const embedded=window.ValleySceneFiles;
async function bytes(name){
  if(embedded){
    if(!embedded[name])throw Error('Missing local asset '+name);
    return Uint8Array.from(atob(embedded[name]),c=>c.charCodeAt(0)).buffer;
  }
  const r=await fetch('assets/'+name);
  if(!r.ok)throw Error(name+' returned '+r.status);
  return r.arrayBuffer();
}
const jsonFile=async name=>JSON.parse(new TextDecoder().decode(await bytes(name)));
const decoderURLs={
  'draco_wasm_wrapper.js':URL.createObjectURL(new Blob([decoderJS],{type:'text/javascript'})),
  'draco_decoder.wasm':URL.createObjectURL(new Blob([decoderWasm],{type:'application/wasm'}))
};
const decoder=new DRACOLoader(new THREE.LoadingManager().setURLModifier(url=>decoderURLs[url]||url)).setWorkerLimit(2);
const loader=new GLTFLoader().setDRACOLoader(decoder);
const load=async file=>loader.parseAsync(await bytes(file),'');
const root=new THREE.Group(),scene=new THREE.Scene(),origin=new THREE.Vector3();
const camera=new THREE.PerspectiveCamera(47,1,.12,160000);
let renderer,controls,manifest,ground,terrain,Aerial,parcelMap;
let parcelProjectionMode=null;
let zoneSim=null,zoneData=null,zoneSelected=null,zonePaint=false,zoneSaveKey='';
const zoneLines=new Map(),zoneBaseBuilt=new Set(),zoneGroup=new THREE.Group(),zoneBuildingGroup=new THREE.Group();
const zoneColors={R1:0x8fb8e6,R2:0xb4a0e0,R3:0xd695cf,C:0xf2cb88,I:0xd68e79,AG:0x93c485,NONE:0xc5d1cd};
const zoneMats=Object.fromEntries(Object.entries(zoneColors).map(([k,v])=>[k,new THREE.LineBasicMaterial({color:v,depthTest:false})]));
const zoneHighlight=new THREE.LineBasicMaterial({color:0xffffff,depthTest:false});
let zoneGrowthMesh=null;
let particlesLoaded=0,rebases=0,queued=0,pumping=false,walking=false,yaw=Math.PI;
let lastSelection='cast',lastTime=0,elapsed=0,actorStates=[],frameTimes=[],streamError=null;
const tiles=[],landmarks=[],once=new Set(),pressed=new Set();
const location=new THREE.Vector3(-7,0,22);
const matrixHelper=new THREE.Object3D();
const dir=new THREE.Vector3(),temp=new THREE.Vector3();
const groupNames=new Set();
function height(x,z){
  const u=THREE.MathUtils.clamp((x+2000)/20,0,200),v=THREE.MathUtils.clamp((z+2000)/20,0,200);
  const i=Math.floor(u),j=Math.floor(v),k=Math.min(200,i+1),l=Math.min(200,j+1);
  return ((ground[j*201+i]*(1-u+i)+ground[j*201+k]*(u-i))*(1-v+j)+(ground[l*201+i]*(1-u+i)+ground[l*201+k]*(u-i))*(v-j))*.01;
}
function worldFromGeo(lon,lat){
  return [(lon-manifest.origin[0])*manifest.metresPerDegree[0],(manifest.origin[1]-lat)*manifest.metresPerDegree[1]];
}

function zoneContains(point,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function zoneAt(point){
 for(const [id,p] of zoneLines)if(p.polys.some(poly=>zoneContains(point,poly[0])&&!poly.slice(1).some(r=>zoneContains(point,r))))return id;
 return null;
}
function zonePersist(){try{localStorage.setItem(zoneSaveKey,JSON.stringify(zoneSim.exportDiffs()));}catch(_){}}
function updateGrowthMassing(){
 if(!zoneGrowthMesh)return;
 let n=0;const tone=new THREE.Color();
 for(const f of zoneData.features){
  const p=zoneSim.get(f.id);
  if(!p.built||zoneBaseBuilt.has(f.id))continue;
  const [x,z]=p.center_local_m,b=Math.sqrt(Math.max(50,p.area_m2));
  const y=4+p.building_level*2.5;
  matrixHelper.position.set(x,height(x,z)+y/2,z);matrixHelper.scale.set(Math.min(14,b*.3),y,Math.min(12,b*.25));
  matrixHelper.rotation.set(0,0,0);matrixHelper.updateMatrix();
  zoneGrowthMesh.setMatrixAt(n,matrixHelper.matrix);tone.setHex(p.abandoned?0x665e53:zoneColors[p.zone]);
  zoneGrowthMesh.setColorAt(n,tone);n++;
 }
 zoneGrowthMesh.count=n;zoneGrowthMesh.instanceMatrix.needsUpdate=true;
 if(zoneGrowthMesh.instanceColor)zoneGrowthMesh.instanceColor.needsUpdate=true;
 zoneGrowthMesh.computeBoundingSphere();
}
function zonePaintParcel(id,zone){
 const p=zoneSim.paint(id,zone);zoneSelected=id;zonePersist();zoneRefresh();return p;
}
function zoneRefresh(note=''){
 if(!zoneSim)return;
 for(const [id,p] of zoneLines)p.lines.forEach(line=>line.material=id===zoneSelected?zoneHighlight:zoneMats[zoneSim.get(id).zone]);
 const a=zoneSim.snapshot(),p=zoneSelected?zoneSim.get(zoneSelected):null;
 $('zoneStats').textContent='Week '+a.week+' · '+a.total+' parcels · '+a.built+' built · '+a.households+
  ' game households · '+a.abandoned+' abandoned · '+a.cacheCells+' cached 50m cells'+
  (a.scenarioMode?' · FICTIONAL missing-data assumptions ON':' · Unverified flood/utilities block growth')+(note?' · '+note:'');
 $('zoneSelection').textContent=p?'Parcel '+p.id+' · GAME zone '+p.zone+' · desirability '+p.desirability+
  '/100 · '+(p.road_access_estimate?'road-near estimate':'no road-near estimate')+' · flood '+p.flood_status+
  ' · '+(p.built?'built':'vacant')+' · level '+p.building_level+(p.abandoned?' · abandoned':''):
  'Select a lot by tapping its outline. GAME zones are not legally recorded zoning.';
}
function zoneAdvance(){
 const q=$('zoneDemand').value;
 const d=q==='recession'?{residential:-100,commercial:-60,industrial:-50,agricultural:-40}:
  q==='stagnant'?{residential:0,commercial:0,industrial:0,agricultural:0}:
  {residential:80,commercial:55,industrial:35,agricultural:25};
 const e=zoneSim.tick({demand:d});
 updateGrowthMassing();zonePersist();zoneRefresh(e.length?e.map(x=>x.type+' '+x.parcelId).join(', '):'No parcel change');
 return e;
}
async function setupZoning(){
 const {base,polygons,mode}=await prepareParcels({buffer:await bytes('mount_vernon_zoned.geojson'),origin:manifest.origin,scales:manifest.metresPerDegree});
 parcelProjectionMode=mode;
 if(base.type!=='FeatureCollection'||base.features?.length!==manifest.parcels)throw Error('Invalid parcel layer; zoning disabled');
 zoneData=base;zoneSim=ZONING.create({features:base.features});
 zoneSaveKey='rva-parcel-game-zoning-v1-'+base.properties.parcelGitBlob;
 try{const saved=localStorage.getItem(zoneSaveKey);if(saved)zoneSim.importDiffs(JSON.parse(saved));}catch(e){console.warn('Zoning local save rejected',e);}
 for(const [index,feature] of base.features.entries()){
  const id=String(feature.id),polys=polygons[index],lines=[];
  if(feature.properties.built)zoneBaseBuilt.add(id);
  for(const poly of polys)for(const ring of poly){
   if(ring.length<4)continue;
   const geo=new THREE.BufferGeometry().setFromPoints(ring.map(([x,z])=>new THREE.Vector3(x,height(x,z)+.45,z)));
   const line=new THREE.LineLoop(geo,zoneMats[zoneSim.get(id).zone]);zoneGroup.add(line);lines.push(line);
  }
  zoneLines.set(id,{polys,lines});
 }
 zoneGroup.visible=false;root.add(zoneGroup);
 zoneGrowthMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.84}),base.features.length);
 zoneGrowthMesh.count=0;zoneGrowthMesh.name='game-only new building massing proxies';zoneBuildingGroup.add(zoneGrowthMesh);root.add(zoneBuildingGroup);
 updateGrowthMassing();zoneRefresh();
 $('zones').onclick=()=>{const open=$('zonePanel').hidden;$('zonePanel').hidden=!open;
  $('zones').setAttribute('aria-expanded',String(open));zoneGroup.visible=open;if(open)setView('town');};
 $('zonePaint').onclick=()=>{zonePaint=!zonePaint;$('zonePaint').setAttribute('aria-pressed',String(zonePaint));
  $('zonePaint').textContent=zonePaint?'Paint: on':'Paint: off';if(zonePaint){zoneGroup.visible=true;setView('town');}};
 $('zoneOverlay').onclick=()=>{zoneGroup.visible=!zoneGroup.visible;$('zoneOverlay').setAttribute('aria-pressed',String(zoneGroup.visible));
  $('zoneOverlay').textContent=zoneGroup.visible?'Zone outlines: on':'Zone outlines: off';};
 $('zoneBulldoze').onclick=()=>{if(!zoneSelected){zoneRefresh('Select a parcel first');return;}
  zoneSim.bulldoze(zoneSelected);updateGrowthMassing();zonePersist();zoneRefresh();};
 $('zoneAdvance').onclick=zoneAdvance;
 $('zoneScenario').onchange=e=>{zoneSim.setScenarioMode(e.target.checked);zoneRefresh();};
 const canvas=$('world'),down=[0,0],ray=new THREE.Raycaster(),point=new THREE.Vector2();
 canvas.addEventListener('pointerdown',e=>{down[0]=e.clientX;down[1]=e.clientY;});
 canvas.addEventListener('pointerup',e=>{
  if($('zonePanel').hidden||!zoneGroup.visible||Math.hypot(e.clientX-down[0],e.clientY-down[1])>7)return;
  const rect=canvas.getBoundingClientRect();
  point.set((e.clientX-rect.left)*2/rect.width-1,1-(e.clientY-rect.top)*2/rect.height);
  ray.setFromCamera(point,camera);const hit=ray.intersectObject(terrain,true)[0];
  if(!hit)return;
  const id=zoneAt([hit.point.x+origin.x,hit.point.z+origin.z]);
  if(!id)return;zoneSelected=id;
  if(zonePaint)zonePaintParcel(id,$('zoneType').value);else zoneRefresh();
 });
}

function install(gltf,name,x=0,y=0,z=0){
  const model=gltf.scene;model.name=name;model.position.set(x,y,z);root.add(model);groupNames.add(name);
  model.traverse(o=>{if(o.isMesh)o.receiveShadow=true;});return model;
}
function dispose(obj){
  const resources=new Set();
  obj.traverse(o=>{if(o.isMesh){resources.add(o.geometry);for(const m of [].concat(o.material)){resources.add(m);for(const val of Object.values(m))if(val?.isTexture)resources.add(val);}}});
  resources.forEach(r=>r.dispose());obj.removeFromParent();
}
function setView(id){
  const places={
    cast:[location.x,location.z,1.06,3.2,1.30,4.4],
    town:[22,23,5,260,235,305],water:[5,490,1,100,88,125],
    lake:[...worldFromGeo(-87.952243,37.820983),0,2600,3000,4000],
    confluence:[...worldFromGeo(-88.025,37.805),0,4700,4700,4800],
    county:[...worldFromGeo(-87.872,38.013),0,0,57000,18500]
  };
  const [x,z,dy,dx,cy,cz]=places[id];const y=Math.abs(x)<2000&&Math.abs(z)<2000?height(x,z):0;
  controls.target.set(x-origin.x,y+dy,z-origin.z);
  camera.position.copy(controls.target).add(new THREE.Vector3(dx,cy,cz));
  // Discard outstanding orbit damping when teleporting to another bookmark.
  controls.enableDamping=false;controls.update();controls.enableDamping=true;
  lastSelection=id;$('place').value=id;frameTimes=[];lastTime=0;
}
function rebase(){
  if(Math.max(Math.abs(controls.target.x),Math.abs(controls.target.z))<512)return;
  const dx=Math.round(controls.target.x/256)*256,dz=Math.round(controls.target.z/256)*256;
  origin.x+=dx;origin.z+=dz;camera.position.x-=dx;camera.position.z-=dz;
  controls.target.x-=dx;controls.target.z-=dz;root.position.set(-origin.x,0,-origin.z);rebases++;
}
function setupTiles(){
  const geo=new THREE.BoxGeometry(1,1,1);
  const mat=new THREE.MeshStandardMaterial({color:0xad9983,roughness:.96});
  for(const spec of manifest.tiles){
    const proxies=new THREE.InstancedMesh(geo,mat,spec.proxies.length);
    spec.proxies.forEach(([x,b,z,w,h,d,r],i)=>{
      matrixHelper.position.set(x,b+h/2,z);matrixHelper.rotation.set(0,r,0);matrixHelper.scale.set(w,h,d);
      matrixHelper.updateMatrix();proxies.setMatrixAt(i,matrixHelper.matrix);
    });
    proxies.computeBoundingSphere();proxies.position.set(spec.center[0],0,spec.center[1]);root.add(proxies);
    tiles.push({spec,proxies,detail:null,wanted:false,pending:false,distance:Infinity,failed:false});
  }
}
async function pumpTiles(){
  if(pumping)return;pumping=true;
  try{
    while(queued<3){
      const t=tiles.filter(t=>t.wanted&&!t.detail&&!t.pending&&!t.failed).sort((a,b)=>a.distance-b.distance)[0];
      if(!t)break;
      t.pending=true;queued++;
      load(t.spec.file).then(g=>{
        if(!t.wanted){dispose(g.scene);return;}
        t.detail=install(g,t.spec.file,t.spec.center[0],0,t.spec.center[1]);
        t.detail.traverse(o=>{if(o.isMesh){o.material.side=THREE.DoubleSide;o.material.metalness=0;o.material.roughness=.91;o.castShadow=true;}});
        t.proxies.visible=false;
      }).catch(e=>{t.failed=true;streamError=e.message;}).finally(()=>{queued--;t.pending=false;pumpTiles();});
    }
  }finally{pumping=false;}
}
function stream(){
  const x=camera.position.x+origin.x,z=camera.position.z+origin.z;
  for(const t of tiles){
    t.distance=Math.hypot(x-t.spec.center[0],camera.position.y,z-t.spec.center[1]);
    t.wanted=t.distance<(t.detail||t.pending?1400:1120);
    if(t.detail&&!t.wanted){dispose(t.detail);t.detail=null;groupNames.delete(t.spec.file);}
    t.proxies.visible=!t.detail&&t.distance<7500;
  }
  pumpTiles();
}
const waterMaterial=new THREE.MeshStandardMaterial({color:0x50797a,roughness:.38,metalness:.22,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});
waterMaterial.onBeforeCompile=shader=>{
  shader.uniforms.riverTime={value:0};waterMaterial.userData.shader=shader;
  shader.vertexShader='varying vec2 vFlow;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvFlow=position.xz;');
  shader.fragmentShader='uniform float riverTime;varying vec2 vFlow;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nvec2 wave=vec2(sin(vFlow.x*.16+vFlow.y*.08+riverTime),cos(vFlow.y*.13-riverTime*.67));normal=normalize(normal+(viewMatrix*vec4(wave.x*.07,0.,wave.y*.06,0.)).xyz);');
};
async function actor(file,x,z,scale,rotation){
  const g=await load(file+'.glb');const model=install(g,file,x,height(x,z),z);model.scale.setScalar(scale);model.rotation.y=rotation;
  const mixer=new THREE.AnimationMixer(model);
  const actions=new Map(g.animations.map(c=>[c.name,mixer.clipAction(c)]));
  if(!actions.has('Idle')||!actions.has('Walk'))throw Error(file+' lacks game clips');
  actions.get('Idle').play();model.traverse(o=>{if(o.isSkinnedMesh){o.frustumCulled=false;o.castShadow=true;}});
  actorStates.push({file,model,mixer,actions,current:'Idle',dx:x-location.x,dz:z-location.z,rotation});
}
function move(dt){
  const forward=Number(pressed.has('ArrowUp')||walking)-Number(pressed.has('ArrowDown'));
  yaw+=dt*(Number(pressed.has('ArrowLeft'))-Number(pressed.has('ArrowRight')))*1.7;
  const moving=lastSelection==='cast'&&!!forward;
  if(moving){
    dir.set(Math.sin(yaw),0,Math.cos(yaw)).multiplyScalar(1.48*dt*forward);
    temp.copy(location);location.add(dir);location.clamp(new THREE.Vector3(-1600,0,-1600),new THREE.Vector3(1600,0,1600));
    dir.copy(location).sub(temp);controls.target.add(dir);camera.position.add(dir);
  }
  for(const a of actorStates){
    const clip=moving?'Walk':'Idle';
    if(a.current!==clip){a.actions.get(a.current).fadeOut(.17);a.actions.get(clip).reset().fadeIn(.17).play();a.current=clip;}
    const x=location.x+a.dx,z=location.z+a.dz;
    a.model.position.set(x,height(x,z),z);a.model.rotation.y=a.rotation+yaw-Math.PI;
    a.mixer.update(dt);

  }
}
function diagnostics(){
  return {view:lastSelection,rebases,origin:[origin.x,origin.z],landmarks:landmarks.map(l=>l.name),
    actors:actorStates.map(a=>({name:a.file,clip:a.current,bones:a.model.getObjectByProperty('isSkinnedMesh',true)?.skeleton.bones.length})),
    drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
    fineTiles:tiles.filter(t=>t.detail).length,proxyInstances:tiles.reduce((s,t)=>s+(t.proxies.visible?t.proxies.count:0),0),
    streamError,parcelProjectionMode,parcelCount:manifest.parcels,zoning:zoneSim?.snapshot()||null,selectedParcel:zoneSelected,frames:frameTimes.length};
}
function tick(now){
  const delta=lastTime?(now-lastTime)/1000:0;lastTime=now;
  if(delta>0&&document.visibilityState==='visible'){frameTimes.push(delta*1000);if(frameTimes.length>6000)frameTimes.shift();}
  const dt=Math.min(delta,.08);elapsed+=dt;move(dt);controls.update();rebase();stream();
  if(waterMaterial.userData.shader)waterMaterial.userData.shader.uniforms.riverTime.value=elapsed;
  renderer.shadowMap.enabled=camera.position.distanceTo(controls.target)<600;
  sun.position.copy(controls.target).add(new THREE.Vector3(-65,105,48));sun.target.position.copy(controls.target);
  renderer.render(scene,camera);
  if(Math.floor(now/500)!==particlesLoaded){
    particlesLoaded=Math.floor(now/500);const d=diagnostics();
    status.textContent=streamError?'Tile unavailable · '+streamError:({'cast':'Courthouse Square · Mount Vernon','town':'Downtown · Mount Vernon','water':'Ohio riverfront','lake':'Hovey Lake','confluence':'Ohio–Wabash confluence','county':'Posey County · Indiana'})[lastSelection];
    $('measure').textContent=d.drawCalls+' draw calls · '+d.fineTiles+' detailed town tiles · '+d.rebases+' origin shifts';
  }
  requestAnimationFrame(tick);
}
const sun=new THREE.DirectionalLight(0xffe0ae,2.35);
async function start(){
  renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance',logarithmicDepthBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;scene.background=new THREE.Color(0xb9cbcf);
  scene.fog=new THREE.FogExp2(0xb9cbcf,.0000035);scene.add(root,sun,sun.target,new THREE.HemisphereLight(0xfff4dd,0x718076,1.75));
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:260});sun.shadow.normalBias=.035;
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=1.6;controls.maxDistance=90000;
  function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  resize();addEventListener('resize',resize);
  [manifest,ground]=await Promise.all([jsonFile('scene.json'),bytes('ground.bin').then(b=>new Int16Array(b))]);
  await Promise.all([actor('river',location.x,location.z,.107,0),actor('bill_tucker',location.x+1.35,location.z+.35,.107,0),actor('scout',location.x-1.25,location.z+.25,.85,0)]);
  const [region,low,high,water,court,col]=await Promise.all(['posey_terrain','mount_vernon_lod1','mount_vernon_lod0','rivers','courthouse','coliseum'].map(n=>load(n+'.glb')));
  install(region,'regional terrain');terrain=new THREE.LOD();terrain.addLevel(high.scene,0);terrain.addLevel(low.scene,3300,.1);root.add(terrain);
  const groundMesh=high.scene.getObjectByProperty('isMesh',true);groundMesh.receiveShadow=true;Aerial=groundMesh.material.map;
  const w=install(water,'rivers');w.traverse(o=>{if(o.isMesh)o.material=waterMaterial;});
  if(manifest.routes)install(await load('county_routes.glb'),'State roads');
  for(const [model,name,x,z,rotation] of [[court,'Posey County Courthouse',0,0,manifest.courthouseYaw],[col,'Memorial Coliseum',...manifest.coliseum,0]]){
    const landmark=new THREE.LOD();landmark.name=name;landmark.position.set(x,height(x,z),z);landmark.rotation.y=rotation;
    model.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const bounds=new THREE.Box3().setFromObject(model.scene);const box=new THREE.Mesh(new THREE.BoxGeometry(...bounds.getSize(new THREE.Vector3()).toArray()),new THREE.MeshStandardMaterial({color:0xb7a48f}));
    bounds.getCenter(box.position);landmark.addLevel(model.scene,0);landmark.addLevel(box,950,.1);root.add(landmark);landmarks.push(landmark);
  }
  setupTiles();
  try{await setupZoning();}catch(e){console.warn('Optional zoning unavailable',e);$('zones').disabled=true;$('zones').title='Zoning source unavailable';}
  setView('cast');
  $('place').onchange=e=>setView(e.target.value);
  $('walk').onpointerdown=e=>{if(lastSelection!=='cast')setView('cast');walking=true;e.currentTarget.setPointerCapture(e.pointerId);};
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('walk').addEventListener(ev,()=>walking=false);
  for(const [ev,down] of [['keydown',true],['keyup',false]])addEventListener(ev,e=>{if(e.target.tagName==='SELECT'||!e.key.startsWith('Arrow'))return;e.preventDefault();down?pressed.add(e.key):pressed.delete(e.key);});
  addEventListener('blur',()=>{pressed.clear();walking=false;});
  $('land').onclick=async()=>{
    const button=$('land');button.disabled=true;
    try{
      if(!parcelMap){
        const url=URL.createObjectURL(new Blob([await bytes('downtown-parcels.jpg')],{type:'image/jpeg'}));
        try{parcelMap=await new THREE.TextureLoader().loadAsync(url);}finally{URL.revokeObjectURL(url);}
        parcelMap.colorSpace=THREE.SRGBColorSpace;parcelMap.flipY=Aerial.flipY;
      }
      const enable=button.getAttribute('aria-pressed')!=='true';
      groundMesh.material.map=enable?parcelMap:Aerial;groundMesh.material.needsUpdate=true;button.setAttribute('aria-pressed',String(enable));
      if(enable&&lastSelection!=='town')setView('town');
    }finally{button.disabled=false;}
  };
  $('report').onclick=async()=>{
    const samples=frameTimes.slice().sort((a,b)=>a-b);
    const report={...diagnostics(),atUTC:new Date().toISOString(),userAgent:navigator.userAgent,
      viewport:[innerWidth,innerHeight],samples:samples.length,p95ms:samples[Math.max(0,Math.ceil(.95*samples.length)-1)]??null,assets:await jsonFile('hashes.json')};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');
    a.href=url;a.download='river-valley-scene-performance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  };
  window.ValleyScene={diagnostics,setView,zoning:{
    snapshot:()=>zoneSim?.snapshot()||null,
    get:id=>zoneSim?.get(id)||null,
    paint:(id,zone)=>{if(!zoneSim)throw Error('Zoning unavailable');return zonePaintParcel(id,zone);},
    bulldoze:id=>{if(!zoneSim)throw Error('Zoning unavailable');const p=zoneSim.bulldoze(id);updateGrowthMassing();zonePersist();zoneRefresh();return p;},
    advance:()=>zoneAdvance()
  }};requestAnimationFrame(tick);
}
start().catch(err=>{console.error(err);status.textContent='Scene could not start · '+err.message;});
