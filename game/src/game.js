/* River Valley Family Adventure: self-contained local-only browser game.
   No network endpoints, no trackers, no external audio, and no repository integration. */
(function(){
'use strict';
const WORLD=window.ValleyOpenWorld, COUNTY=window.ValleyCountyAtlas, COUNTY_DATA=window.ValleyPoseyCounty, COUNTY_SCENES=window.ValleyCountyScenes, COMPANION=window.ValleyCompanion, C=window.ValleyCore, DATA=window.VALLEY_DATA, GEOREF=window.ValleyGeoReference, REF=window.ValleyReference, GEO=window.ValleyGeometry, VFX=window.ValleyVisuals, QT=window.ValleyTerrain, MODEL=window.ValleyModelLoader, ATM=window.ValleyAtmosphere, DIR=window.ValleyDirector, STORY=window.ValleyStoryscape;
const $=id=>document.getElementById(id);
const canvas=$('world'),atlas=$('atlas'),mapCanvas=$('minimap');
const ctx=atlas.getContext('2d',{alpha:false}); // separate 2D surface; WebGL uses its own canvas
const mapCtx=mapCanvas.getContext('2d');
const nameKey=i=>'river-family-adventure-v1-slot-'+i;
let slot=0,save=C.freshSave('Family Explorer'),started=false,touring=false,tourAt=0,tourTimer=0,tourFrom=null,toastTimer=0;
let player={x:-30,z:503},near=null,selected='riverfront',view='auto',renderer=null,scene=null,camera=null,avatar=null,car=null,dog=null,beaconGroup=null,terrainMesh=null,treeMeshes=[],sunLight=null,ambient=null,waterMesh=null,house=null;
let activity=null,huntRound=null,fishRound=null,activityInterval=null;
let worldGame=null,worldActive=null,worldHuntRound=null,worldFishRound=null,worldAim=.5,worldStatus="",lastWorldHUD=0,playerHeading=0;
let countyVignettes=null,countySelected='mount-vernon',dogParts=null,scout=COMPANION?.create();
let backdropOpen=false,backdropLocation='riverfront',backdropLast=0;
let shotPlaying=false,shotStart=0,shotIndex=0;
const SHOTS=Object.freeze([{scene:'riverfront',look:'natural',title:'01 · Ohio River · Arrival'},{scene:'farm',look:'golden',title:'02 · Valley Farm · Golden Fields'},{scene:'woods',look:'lantern',title:'03 · Oak Grove · Firefly Night'},{scene:'riverfront',look:'storm',title:'04 · Ohio River · Summer Storm'},{scene:'riverfront',look:'blue',title:'05 · Riverfront · Blue Hour'}]);
const SHOT_DURATION=4200;
let director3D=null,directorLastFX=0,perfFrames=0,perfSince=0,perfFPS=0,cinemaPrefs={look:"natural",quality:"balanced",strength:.72,grain:false,showStats:false};
let atmosphere=null,cinematicDressing=null,gameModels=[],terrainMeshes=[],terrainIndex=null,terrainAt={x:Infinity,z:Infinity,dist:Infinity,viewHeight:0},terrainStats={tiles:0,triangles:0,levels:{}},roadMesh=null,buildingMesh=null,buildingItems=[],detailBuildings=new Map(),detailGroup=null,detailLast={x:Infinity,z:Infinity},lastLODLabel='';
let roofInstances=null,tourCurve=null,courthouseFootprintIndex=-1;
let activeTerrainSegments=16,terrainDetail='auto',visualEffects='full';
let time=15.5,weather='clear',season='summer',keys=new Set(),pointerDown=false,pointerX=0,pointerY=0,cameraYaw=.2,cameraDist=74,mapZoom=1;
const TERRAIN_CHOICE=window.ValleyTerrainSource?.chooseGrid(window.ValleySourceTerrain,DATA.grid)||{grid:DATA.grid,kind:'illustrative',label:'Illustrative game elevations'};
let demArray,grid=TERRAIN_CHOICE.grid,staticMap=null,needsMap=true,lastUI=0,lastFrame=0,lastPersist=0;
const LEAFON=window.ValleyLeafOn2025?.schemaVersion===1&&window.ValleyLeafOn2025?.metadata?.year===2025&&
  window.ValleyLeafOn2025?.metadata?.publisher?.includes('Indiana Geographic Information Office')&&
  window.ValleyLeafOn2025?.metadata?.license==='CC0'&&
  window.ValleyLeafOn2025?.metadata?.validPixelCoverageFraction>=.20&&
  Array.isArray(window.ValleyLeafOn2025?.bboxWGS84)?window.ValleyLeafOn2025:null;
let referenceEnabled=Boolean(REF?.imageDataUrl&&GEOREF),referenceImage=null,referenceDrape=null,leafonImage=null,leafonDrape=null;
const activeRoads=REF&&Array.isArray(REF.roadsPacked)&&REF.roadsPacked.length>400?REF.roadsPacked:DATA.roads;
const activeBuildings=REF&&Array.isArray(REF.buildingsPacked)&&REF.buildingsPacked.length>1000?REF.buildingsPacked:DATA.buildings;
const STREAM=window.ValleyStreamingPolicy;
const terrainGeometryBudgetBytes=(innerWidth<781?8:16)*1024*1024;
const MOTION=window.ValleyMotion;
if(!MOTION?.create)throw new Error('Offline motion controller must load before runtime');
const motion=MOTION.create({worldLimit:C.LIMIT});
const COLLISION=window.ValleyCollision,AUDIO=window.ValleySoundscape,PROBE=window.ValleyFrameProbe,PAINT=window.ValleyWorldPaint,VEHICLE=window.ValleyVehicleSuspension;
if(!COLLISION?.create||!AUDIO?.create||!PROBE?.create)throw new Error('Offline collision, audio and benchmark scripts required');
if(!VEHICLE?.create)throw new Error('Offline vehicle suspension required');
const soundscape=AUDIO.create(),frameProbe=PROBE.create(),suspension=VEHICLE.create();
let vehicleState=suspension.snapshot();
let lastGpuTune=0,activePixelRatio=0,probeScene='downtown',lastProbeSceneAt=0,cameraGoal=null,roadRefreshQueued=false,detailFastLast=false;
let collisionWorld=COLLISION.create(),lastFootstepAt=0,lastCollision=null,terrainDecor=null;
let motionState=motion.snapshot(),heroHeightOffset=0,groundShadow=null;
const streamingGovernor=STREAM?STREAM.createGovernor({maxTiles:innerWidth<781?110:200,minTiles:innerWidth<781?60:85,targetFPS:30}):null;
let currentTravelSpeed=0;
const G=window.THREE;
const POLISH=window.ValleyVisualPolish,BIOME=window.ValleyBiomeStreamer,LODPLAN=window.ValleyLODTransition,GRAPHICS=window.ValleyGraphicsQuality,ASSET_CODEC=window.ValleyCompressedAssets;
const RIVER_WATER=window.ValleyRiverWater,ROOFS=window.ValleyBuildingRoofs,LANDMARKS=window.ValleyLandmarkAnchors;
const CINEMATIC=window.ValleyCinematicLighting,DRESS=window.ValleyCinematicSetDressing,SKILLS=window.ValleyGameplaySkills,CREATURES=window.ValleyCreatures;
const ACCESS=window.ValleyLandmarkAccess;
const CUSTOM_HERO=window.ValleyCustomHero,CAST_WARDROBE=window.ValleyCastWardrobe;
const UX=window.ValleyPlayerExperience;
let playerPreferences=null,paused=false,pauseReturnFocus=null,accumulatedPauseMs=0,pauseBeganAt=0;
let gamepadInput={connected:false,x:0,z:0,lookX:0,lookY:0,aimLeft:false,aimRight:false,sprint:false,jump:false,interact:false,map:false,pause:false,back:false};
const HERO=window.ValleyHero;let heroController=null,driverController=null,heroOneShot=null,heroOneShotUntil=0,heroState='idle';const STAGE=window.ValleyHeroStage;let heroPreviewStage=null;let heroInspection=false,heroPreviewPose='idle',previousHeroCamera=null;
let facadePalette=null,grassLayer=null,groundPlacementDirty=false,lastVegetationTime=0,terrainTransition=null,retiringTerrain=null;

const rand=(function(){let v=78932;return function(){v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;}})();
const LIMIT=C.LIMIT, TWO=LIMIT*2;
function decodeDem(){
 const raw=atob(grid.b64), buf=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)buf[i]=raw.charCodeAt(i);
 const dv=new DataView(buf.buffer);demArray=new Uint16Array(buf.length/2);
 for(let i=0;i<demArray.length;i++)demArray[i]=dv.getUint16(i*2,true);
}
decodeDem();
function heightFt(x,z){
 // Preserve the source prototype's documented local registration; unverified survey datum.
 const lon=-87.8950+x*0.00001137489;
 const lat=37.9325-(z-430)*0.000009009399;
 const u=(lon-grid.lonMin)/(grid.lonMax-grid.lonMin);
 const v=(grid.latMax-lat)/(grid.latMax-grid.latMin);
 return C.sampleGrid(grid,demArray,u,v);
}
function sourceHeight(x,z){return C.clamp((heightFt(x,z)-342.5)*.3048,-4,70);}
// Exact barycentric sample of the currently visible PlaneGeometry triangle; no separate road/building height frame.
function height(x,z){return terrainIndex?QT.terrainHeight(terrainIndex,x,z,sourceHeight):sourceHeight(x,z);}

function themeHeight(h){
 const high=C.clamp((h-2)/48,0,1);
 const pal={
  spring:[[91,142,94],[122,154,103]],summer:[[102,143,92],[142,159,106]],
  autumn:[[150,143,84],[154,112,83]],winter:[[157,175,174],[213,221,220]]
 }[season];
 const lo=pal[0],hi=pal[1],f=high;
 return [Math.round(lo[0]+(hi[0]-lo[0])*f),Math.round(lo[1]+(hi[1]-lo[1])*f),Math.round(lo[2]+(hi[2]-lo[2])*f)];
}
function worldToMap(x,z,w,h){return [(x+LIMIT)/TWO*w,(z+LIMIT)/TWO*h];}
function makeStaticMap(){
 const c=document.createElement('canvas');c.width=900;c.height=900;
 const ct=c.getContext('2d');let tile=5;
 for(let py=0;py<900;py+=tile){for(let px=0;px<900;px+=tile){
  const x=px/900*TWO-LIMIT,z=py/900*TWO-LIMIT,v=height(x,z);
  let a=themeHeight(v);ct.fillStyle=`rgb(${a[0]},${a[1]},${a[2]})`;ct.fillRect(px,py,tile+1,tile+1);
 }}
 // Exact rect placement uses the ACTUAL ArcGIS returned geographic extent, not its requested bbox.
 if(referenceEnabled&&referenceImage&&GEOREF&&REF&&Array.isArray(REF.bboxWGS84)){
  const r=GEOREF.worldRect(REF.bboxWGS84);
  const x=(r.x0+LIMIT)/TWO*900,z=(r.z0+LIMIT)/TWO*900,w=r.width/TWO*900,h=r.height/TWO*900;
  ct.drawImage(referenceImage,x,z,w,h);
 }
 if(referenceEnabled&&leafonImage&&LEAFON&&GEOREF){
  const r=GEOREF.worldRect(LEAFON.bboxWGS84);
  ct.drawImage(leafonImage,(r.x0+LIMIT)/TWO*900,(r.z0+LIMIT)/TWO*900,r.width/TWO*900,r.height/TWO*900);
 }
 // Designed water corridor, intentionally illustrative rather than a factual river polygon.
 ct.fillStyle='#397889';ct.beginPath();ct.moveTo(0,900);
 for(let x=0;x<=900;x+=12){let wx=x/900*TWO-LIMIT;let zz=1200+125*Math.sin(wx/550)+65*Math.cos(wx/175);ct.lineTo(x,(zz+LIMIT)/TWO*900);}
 ct.lineTo(900,900);ct.closePath();if(!(referenceEnabled&&referenceImage))ct.fill();
 ct.lineJoin='round';ct.lineCap='round';
 activeRoads.forEach(road=>{if(!Array.isArray(road[1]))return;
  const pts=road[1],r=road[0];ct.strokeStyle=r>=6?'#b4a884':'#383f3a';ct.lineWidth=r>=6?1.1:1.7;ct.beginPath();
  for(let k=0;k<pts.length-1;k+=2){const p=worldToMap(pts[k]*.25,pts[k+1]*.25,900,900);if(k===0)ct.moveTo(...p);else ct.lineTo(...p);}ct.stroke();
 });
 ct.fillStyle='#e4dbbb';activeBuildings.forEach((b,i)=>{if(i%2===1)return;const p=worldToMap((b[0]+35)*.25,(b[1]+35)*.25,900,900);ct.fillRect(p[0],p[1],1.5,1.5);});
 // Not survey-verified: these are intended game-level region labels.
 ct.fillStyle='#f6ffea';ct.font='bold 17px system-ui';ct.shadowColor='#244539';ct.shadowBlur=8;
 ct.fillText('MOUNT VERNON',378,445);ct.font='italic 19px Georgia';ct.fillText(referenceEnabled&&referenceImage?'IGIO aerial reference • horizontal only':'Ohio River • stylized',235,785);ct.shadowBlur=0;
 return c;
}
function mapDraw(targetCtx,width,height,focus){
 if(!staticMap||needsMap){staticMap=makeStaticMap();needsMap=false;}
 targetCtx.save();targetCtx.clearRect(0,0,width,height);
 if(focus){
  const f=worldToMap(player.x,player.z,900,900),base=Math.max(width,height)/900*mapZoom*.99;
  targetCtx.translate(width/2,height/2);targetCtx.scale(base,base);targetCtx.translate(-f[0],-f[1]);
  targetCtx.drawImage(staticMap,0,0);
  if(save.homestead){const hp=worldToMap(-740,-210,900,900);targetCtx.fillStyle='#fff9e0';targetCtx.font=`${Math.max(10,25/base)}px system-ui`;targetCtx.fillText('🏠',hp[0],hp[1]);}
  for(const st of C.STOPS){const p=worldToMap(st.x,st.z,900,900);targetCtx.lineWidth=4/base;targetCtx.strokeStyle='#183a33';targetCtx.fillStyle=save.completed.includes(st.id)?'#b1f3c6':'#ffd57e';targetCtx.beginPath();targetCtx.arc(...p,11/base,0,Math.PI*2);targetCtx.fill();targetCtx.stroke();}
  targetCtx.fillStyle='#f9fff7';targetCtx.strokeStyle='#1a4540';targetCtx.lineWidth=6/base;targetCtx.beginPath();targetCtx.arc(...f,9/base,0,Math.PI*2);targetCtx.fill();targetCtx.stroke();
 } else {
  targetCtx.drawImage(staticMap,0,0,width,height);
  if(save.homestead){const hp=worldToMap(-740,-210,width,height);targetCtx.font="18px system-ui";targetCtx.fillText("🏠",hp[0],hp[1]);}
  for(const st of C.STOPS){const p=worldToMap(st.x,st.z,width,height);targetCtx.fillStyle=save.completed.includes(st.id)?'#83f3b7':'#f9d274';targetCtx.strokeStyle='#183c36';targetCtx.lineWidth=3;targetCtx.beginPath();targetCtx.arc(...p,5,0,Math.PI*2);targetCtx.fill();targetCtx.stroke();}
  const p=worldToMap(player.x,player.z,width,height);targetCtx.fillStyle='#fcffff';targetCtx.strokeStyle='#0c4340';targetCtx.lineWidth=3;targetCtx.beginPath();targetCtx.arc(...p,6,0,Math.PI*2);targetCtx.fill();targetCtx.stroke();
 }
 targetCtx.restore();
}
function tryRenderer(){
 if(!G||!G.WebGLRenderer)return false;
 try{
  const canvas3d=canvas;renderer=new G.WebGLRenderer({canvas:canvas3d,antialias:true,powerPreference:'default',preserveDrawingBuffer:false});
  activePixelRatio=Math.min(window.devicePixelRatio||1,1.25);renderer.setPixelRatio(activePixelRatio);
  renderer.setSize(window.innerWidth,window.innerHeight,false);
  renderer.outputColorSpace=G.SRGBColorSpace;
  renderer.toneMapping=G.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  scene=new G.Scene();scene.background=new G.Color('#a8bec2');scene.fog=new G.FogExp2('#bdd0ca',0.00019);
  camera=new G.PerspectiveCamera(60,Math.max(1,innerWidth)/Math.max(1,innerHeight),.2,10500);cameraGoal=new G.Vector3();
  ambient=new G.HemisphereLight(0xd5e6ff,0x404e36,2.3);scene.add(ambient);
  sunLight=new G.DirectionalLight(0xffe1a8,2.3);sunLight.position.set(100,220,-180);scene.add(sunLight);scene.add(sunLight.target);
  if(renderer.shadowMap)renderer.shadowMap.type=G.PCFSoftShadowMap;
  facadePalette=POLISH?POLISH.make(G):null;buildTerrain();buildRiver();buildRoads();buildBuildings();buildTrees();if(PAINT)terrainDecor=PAINT.scatter(G,scene,height,{mobile:innerWidth<781,limit:LIMIT});buildBeacons();buildPlayer();buildHouse();buildOriginalModels();
  if(DRESS)cinematicDressing=DRESS.create(G,scene,height,{mobile:innerWidth<781});
  if(COUNTY_SCENES&&COUNTY){countyVignettes=COUNTY_SCENES.create(G,scene,height,COUNTY);
    collisionWorld=COLLISION.create([...buildingItems,...countyVignettes.colliders],{radius:1.7,stepHeight:2.8});}
  if(WORLD)worldGame=WORLD.sceneWorld(G,scene,height,{enhancedCreatures:!!CREATURES&&innerWidth>=781&&visualEffects!=='lite'});if(ATM)atmosphere=ATM.create(G,scene,height,LIMIT);if(DIR)director3D=DIR.makeWorldFX(G,scene,height,LIMIT);
  return true;
 }catch(err){console.warn('WebGL unavailable; 2D atlas gameplay remains active.',err.message); if(renderer){try{renderer.dispose();}catch(_){}}renderer=null;scene=null;return false;}
}
// Active leaf tiles are selected by local screen-space height error, not one global mesh resolution.
// Neighboring tile edges use their coarse neighbor's samples for exact junction alignment.
function buildTerrain(){
 if(!LODPLAN)throw new Error('Staged terrain transition module is missing');
 terrainTransition=LODPLAN.create({makeMesh:tileColorMesh,commit:commitTerrainLOD,
   dispose:disposeTerrainMeshes,batchSize:12});
 // Initial terrain must be complete before roads/building bases sample the surface.
 applyTerrainLOD(true,true);
}
function disposeTerrainMeshes(meshes){
 // Tiles of one LOD generation share shader/material; dispose it once.
 const materials=new Set();
 for(const m of meshes){
  if(m.parent)m.parent.remove(m);
  m.traverse(obj=>{if(obj.isMesh){obj.geometry.dispose();
   for(const mat of Array.isArray(obj.material)?obj.material:[obj.material])if(mat)materials.add(mat);
  }});
 }
 for(const material of materials)material.dispose();
}
function commitTerrainLOD(job){
 const committedAt=performance.now();
 // A single seam mesh replaces one skirt draw call per LOD leaf. Tile vertices
 // remain unchanged; coarse/fine borders still use the exact edge samples.
 const seams=[],total=job.meshes.reduce((n,m)=>n+(m.userData.seamPositions?.length||0),0);
 if(total){
   const combined=new Float32Array(total);let offset=0;
   for(const mesh of job.meshes){const positions=mesh.userData.seamPositions||[];
     combined.set(positions,offset);offset+=positions.length;delete mesh.userData.seamPositions;}
   const geom=new G.BufferGeometry();geom.setAttribute('position',new G.Float32BufferAttribute(combined,3));
   geom.computeVertexNormals();
   const seam=new G.Mesh(geom,new G.MeshLambertMaterial({color:0x4d694e,side:G.DoubleSide}));
   seam.name='River/batched-terrain-seam-skirts';seam.frustumCulled=false;
   job.meshes.push(seam);
 }
 const old=terrainMeshes;
 for(const m of job.meshes){m.traverse(obj=>{if(obj.isMesh)obj.receiveShadow=true;});scene.add(m);}
 terrainMeshes=job.meshes;terrainMesh=job.meshes[0];terrainIndex=job.index;
 groundPlacementDirty=!!buildingMesh||!!foliageJobs; // Re-anchor against the newly committed visible surface.
 if(retiringTerrain){disposeTerrainMeshes(retiringTerrain.meshes);retiringTerrain=null;}
 if(old.length){
  // Keep the old complete surface briefly, never an incomplete tile set.
  // Transparent old tiles fade out over the new, without writing depth.
  for(const m of old){
   m.renderOrder=2;
   m.traverse(obj=>{if(obj.isMesh){obj.material.transparent=true;obj.material.depthWrite=false;
     obj.material.opacity=.68;obj.material.needsUpdate=true;}});
  }
  retiringTerrain={meshes:old,started:performance.now(),duration:260};
 }
 terrainStats={tiles:job.leaves.length,triangles:job.leaves.length*QT.WIDTH*QT.WIDTH*2,levels:{}};
 for(const tile of job.leaves)terrainStats.levels[tile.depth]=(terrainStats.levels[tile.depth]||0)+1;
 activeTerrainSegments=QT.WIDTH;
 // Do not regenerate road ribbons, buildings and texture drapes in the
 // same frame that commits the terrain while driving. Existing geometry
 // remains visible and is reconciled when vehicle movement settles.
 roadRefreshQueued=!!roadMesh;
 if(!started){roadRefreshQueued=false;}
 if(referenceEnabled&&!started)updateReferenceDrape();
 const labels=Object.entries(terrainStats.levels).map(([l,n])=>`L${l}:${n}`).join(' · ');
 const label=`Quadtree SSE ${terrainDetail.toUpperCase()} · ${job.leaves.length} tiles · ${labels}`;
 if($('lodLabel'))$('lodLabel').textContent=label;lastLODLabel=label;
 frameProbe.mark('terrain-lod-commit',{stamp:performance.now(),x:player.x,z:player.z,
  ms:performance.now()-committedAt,tiles:terrainStats.tiles,detailBuildings:detailBuildings.size});
}
function fadeRetiringTerrain(stamp){
 if(!retiringTerrain)return;
 const t=Math.min(1,Math.max(0,(stamp-retiringTerrain.started)/retiringTerrain.duration));
 for(const m of retiringTerrain.meshes){
  m.traverse(obj=>{if(obj.isMesh)obj.material.opacity=Math.max(0,.68*(1-t));});
 }
 if(t>=1){disposeTerrainMeshes(retiringTerrain.meshes);retiringTerrain=null;}
}
// Fixed per-session geometry ceiling: reserve space for active, pending and retiring terrain.
function terrainBudget(){
 const userCap=visualEffects==='lite'?110:200;
 const frameCap=terrainDetail==='auto'&&streamingGovernor?streamingGovernor.tileBudget():userCap;
 return STREAM?.terrainBudget?STREAM.terrainBudget({userCap,frameCap,maxBytes:terrainGeometryBudgetBytes,segments:QT.WIDTH}):Math.min(userCap,frameCap);
}
function terrainMemoryEstimate(){
 const perTile=STREAM?.terrainTileBytes?.(QT.WIDTH)||0;
 const retiring=retiringTerrain?.meshes?.filter(m=>m.userData.lod!==undefined).length||0;
 const pending=terrainTransition?.status().built||0;
 return {estimatedGeometryBytes:(terrainStats.tiles+retiring+pending)*perTile,budgetBytes:terrainGeometryBudgetBytes,tileCap:terrainBudget()};
}
function desiredPixelError(){return ({auto:8,high:3.5,medium:14,low:28})[terrainDetail]||8;}
function tileColorMesh(tile,index){
 // Expensive elevation sampling now happens inside the bounded LOD pump.
 if(!tile.samples)tile.samples=QT.tileSamples(sourceHeight,tile,index);
 const n=QT.WIDTH,ge=new G.PlaneGeometry(tile.width,tile.width,n,n);
 ge.rotateX(-Math.PI/2);ge.translate(tile.x0+tile.width/2,0,tile.z0+tile.width/2);
 const pos=ge.attributes.position,colors=[],tileUVs=[],rgb=new G.Color();
 for(let i=0;i<pos.count;i++){
  const y=tile.samples[i];pos.setY(i,y);
  const c=themeHeight(y);rgb.setRGB(c[0]/255,c[1]/255,c[2]/255,G.SRGBColorSpace);
  tileUVs.push(pos.getX(i)*.06,pos.getZ(i)*.06);
  const grain=(Math.sin(pos.getX(i)*.028)*Math.cos(pos.getZ(i)*.013)+1)*.022;
  colors.push(Math.min(1,rgb.r+grain),Math.min(1,rgb.g+grain),Math.min(1,rgb.b+grain));
 }
 ge.setAttribute('color',new G.Float32BufferAttribute(colors,3));ge.setAttribute('uv',new G.Float32BufferAttribute(tileUVs,2));ge.computeVertexNormals();
 const terrainMaterial=index.terrainMaterial||(index.terrainMaterial=new G.MeshLambertMaterial({
   vertexColors:true,map:facadePalette?.terrainMap||null,side:G.DoubleSide}));
 const mesh=new G.Mesh(ge,terrainMaterial);
 mesh.userData.lod=tile.depth;mesh.frustumCulled=true;
 const skirts=[];
 function addEdge(side){
   const neighbour=QT.edgeNeighbor(tile,index,side);
   if(neighbour&&neighbour.depth===tile.depth)return;
   for(let k=0;k<n;k++){
     let a,b;
     if(side==='top'){a=[k,0];b=[k+1,0];}
     if(side==='bottom'){a=[k,n];b=[k+1,n];}
     if(side==='left'){a=[0,k];b=[0,k+1];}
     if(side==='right'){a=[n,k];b=[n,k+1];}
     let x0=tile.x0+a[0]*tile.width/n,z0=tile.z0+a[1]*tile.width/n,
         x1=tile.x0+b[0]*tile.width/n,z1=tile.z0+b[1]*tile.width/n;
     let y0=tile.samples[a[1]*(n+1)+a[0]],y1=tile.samples[b[1]*(n+1)+b[0]];
     const depth=Math.min(8,Math.max(2,tile.geometricError*1.5));
     skirts.push(x0,y0,z0,x0,y0-depth,z0,x1,y1,z1, x1,y1,z1,x0,y0-depth,z0,x1,y1-depth,z1);
   }
 }
 ['top','bottom','left','right'].forEach(addEdge);
 if(skirts.length)mesh.userData.seamPositions=skirts;
 return mesh;
}
function applyTerrainLOD(force=false,immediate=false){
 if(!scene||!QT||!terrainTransition)return;
 if(!force&&Math.hypot(player.x-terrainAt.x,player.z-terrainAt.z)<100
   &&Math.abs(cameraDist-terrainAt.dist)<45&&Math.abs(innerHeight-terrainAt.viewHeight)<90)return;
 terrainAt={x:player.x,z:player.z,dist:cameraDist,viewHeight:innerHeight};
 const ahead=STREAM?STREAM.lookAheadDistance(currentTravelSpeed)*.3:0;
 const focusX=player.x-Math.sin(playerHeading)*ahead,focusZ=player.z-Math.cos(playerHeading)*ahead;
 const leaves=QT.selectTiles({height:sourceHeight,limit:LIMIT,cameraX:focusX,cameraZ:focusZ,
  cameraAltitude:Math.max(52,cameraDist*.65),viewportHeight:Math.max(innerHeight,350),
  pixelError:desiredPixelError(),maxDepth:6,minDepth:2,maxTiles:terrainBudget(),roughnessFloor:.015});
 const next=QT.makeTileIndex(leaves,LIMIT);
 const signature=season+'|'+leaves.map(t=>t.depth+':'+Math.round(t.x0)+':'+Math.round(t.z0)).join('|');
 // The active LOD remains live while the next full set is tessellated in batches.
 const scheduled=terrainTransition.schedule({signature,leaves,index:next},immediate);
 if(scheduled&&started)frameProbe.mark('terrain-lod-request',{stamp:performance.now(),x:player.x,z:player.z,tiles:leaves.length});
}
function makeAerialDrape(im,bounds,offset,opacity,renderOrder){
 const r=GEOREF.worldRect(bounds),x0=Math.max(-LIMIT,r.x0),x1=Math.min(LIMIT,r.x1),
  z0=Math.max(-LIMIT,r.z0),z1=Math.min(LIMIT,r.z1);
 if(x1<=x0||z1<=z0)return null;
 const geometry=new G.PlaneGeometry(x1-x0,z1-z0,64,64);
 geometry.rotateX(-Math.PI/2);geometry.translate((x0+x1)/2,0,(z0+z1)/2);
 const position=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),z=position.getZ(i),[px,py]=GEOREF.worldToPixel(x,z,bounds,1,1);
  position.setY(i,height(x,z)+offset);uv.setXY(i,Math.max(0,Math.min(1,px)),1-Math.max(0,Math.min(1,py)));
 }
 position.needsUpdate=true;uv.needsUpdate=true;
 const texture=new G.Texture(im);texture.needsUpdate=true;texture.colorSpace=G.SRGBColorSpace;
 const mat=new G.MeshBasicMaterial({map:texture,transparent:true,opacity,depthWrite:false,
  polygonOffset:true,polygonOffsetFactor:-2,side:G.DoubleSide});
 const mesh=new G.Mesh(geometry,mat);mesh.frustumCulled=false;mesh.renderOrder=renderOrder;scene.add(mesh);
 return mesh;
}
function clearAerialDrape(mesh){
 if(!mesh)return;
 if(mesh.parent)mesh.parent.remove(mesh);
 mesh.geometry.dispose();mesh.material.map?.dispose?.();mesh.material.dispose();
}
function updateReferenceDrape(){
 if(!scene||!G||!GEOREF)return;
 clearAerialDrape(referenceDrape);clearAerialDrape(leafonDrape);
 referenceDrape=null;leafonDrape=null;
 if(!referenceEnabled)return;
 if(referenceImage&&REF?.bboxWGS84)referenceDrape=makeAerialDrape(referenceImage,REF.bboxWGS84,.26,.78,2);
 // Transparent 2025 source pixels replace ONLY the source-covered part of the older 2023 base.
 // The southern river/Kentucky margin is not falsely labeled 2025 imagery.
 if(leafonImage&&LEAFON)leafonDrape=makeAerialDrape(leafonImage,LEAFON.bboxWGS84,.38,1.0,3);
}
function setupReferenceImage(){
 const status=$('referenceStatus');
 const toggle=$('referenceOverlay');if(toggle)toggle.checked=referenceEnabled;
 if(!REF||!REF.imageDataUrl||!GEOREF){if(status)status.textContent='Official map reference not bundled; illustration and original map remain playable.';return;}
 const img=new Image();img.onload=()=>{referenceImage=img;needsMap=true;if(referenceEnabled)updateReferenceDrape();};
 img.onerror=()=>{if(status)status.textContent='Overhead reference image could not be decoded; game remains playable.';};
 img.src=REF.imageDataUrl;
 if(status){const year=REF.metadata&&REF.metadata.downtownTileYear||'unverified';status.textContent='IGIO overhead: '+year+' downtown · '+REF.metadata.roads+' streets · '+REF.metadata.buildings+' footprints · '+TERRAIN_CHOICE.label+' · roof heights illustrative.';}
 if(LEAFON&&LEAFON.imageDataUrl){
  const im=new Image();
  im.onload=()=>{
   leafonImage=im;needsMap=true;if(referenceEnabled)updateReferenceDrape();
   if(status)status.textContent='2025 IGIO leaf-on ('+Math.round(LEAFON.metadata.validPixelCoverageFraction*100)+'% map pixels) over 2023 imagery; uncovered portions retain the older image · '+TERRAIN_CHOICE.label+' · roof heights illustrative.';
  };
  im.onerror=()=>{console.warn('2025 leaf-on image failed to decode; original IGIO aerial retained.');};
  im.src=LEAFON.imageDataUrl;
 }
}
function buildRiver(){
 const shape=[];const n=100;
 for(let i=0;i<=n;i++){
  const x=-LIMIT+i/n*TWO,z=1200+125*Math.sin(x/550)+65*Math.cos(x/175);
  shape.push(x,.3,z);
 }
 const pos=[];const inds=[];
 for(let i=0;i<=n;i++){
  const x=shape[i*3],z=shape[i*3+2];pos.push(x,.55,z,x,.55,LIMIT+110);
  if(i<n){const k=i*2;inds.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 const geo=new G.BufferGeometry();geo.setAttribute('position',new G.Float32BufferAttribute(pos,3));geo.setIndex(inds);geo.computeVertexNormals();
 waterMesh=RIVER_WATER?RIVER_WATER.create(G,geo,{quality:visualEffects}).mesh:new G.Mesh(geo,new G.MeshPhongMaterial({color:0x468ea1,transparent:true,opacity:.87,shininess:75,side:G.DoubleSide}));scene.add(waterMesh);
}
function buildRoads(){
 // Sample both *edges* of each ribbon on the SAME displayed terrain triangles.
 // Short subdivisions prevent long straight road segments from cutting through hills.
 const meshData=GEO.drapedRoadVertices(activeRoads,height,LIMIT,12);
 const geo=new G.BufferGeometry();geo.setAttribute('position',new G.Float32BufferAttribute(meshData.vertices,3));
 const roadUVs=[];for(let i=0;i<meshData.vertices.length;i+=3)roadUVs.push(meshData.vertices[i]*.07,meshData.vertices[i+2]*.07);
 geo.setAttribute('uv',new G.Float32BufferAttribute(roadUVs,2));geo.computeVertexNormals();
 roadMesh=new G.Mesh(geo,facadePalette?.road?facadePalette.road.clone():new G.MeshLambertMaterial({color:0x42474a,polygonOffset:true,polygonOffsetFactor:-2,side:G.DoubleSide}));
 roadMesh.frustumCulled=false;scene.add(roadMesh);
 console.info('River Valley road mesh sections',meshData.sections,'terrain LOD',activeTerrainSegments);
}
function detailedBuilding(rec){
 const pts=rec.points.filter((_,i)=>i%Math.max(1,Math.ceil(rec.points.length/96))===0);
 if(pts.length<3)return null;
 const g=new G.Group(),wall=[],wallUV=[],terrainY=pts.map(([x,z])=>height(x,z));
 const mats=facadePalette?facadePalette.pick(rec):null;
 const roofY=Math.max(...terrainY)+rec.h;
 for(let i=0;i<pts.length;i++){
   const j=(i+1)%pts.length,[x,z]=pts[i],[nx,nz]=pts[j],h0=terrainY[i]-.25,h1=terrainY[j]-.25;
   if(Math.hypot(nx-x,nz-z)<.1)continue;
   wall.push(x,h0,z,nx,h1,nz,x,roofY,z, x,roofY,z,nx,h1,nz,nx,roofY,nz);
   const tilesAcross=Math.max(.2,Math.hypot(nx-x,nz-z)/7),tilesUp=Math.max(.2,(roofY-Math.min(h0,h1))/4);
   wallUV.push(0,0,tilesAcross,0,0,tilesUp, 0,tilesUp,tilesAcross,0,tilesAcross,tilesUp);
 }
 const wg=new G.BufferGeometry();wg.setAttribute('position',new G.Float32BufferAttribute(wall,3));
 wg.setAttribute('uv',new G.Float32BufferAttribute(wallUV,2));wg.computeVertexNormals();
 const wm=new G.Mesh(wg,mats?mats.wall:new G.MeshLambertMaterial({color:0xbda68c,side:G.DoubleSide}));g.add(wm);
 try{
   const roofMat=mats?mats.roof:new G.MeshLambertMaterial({color:0x676f6b,side:G.DoubleSide});
   const rise=Math.max(1.4,Math.min(6.5,Math.min(rec.dx,rec.dz)*.18));
   const planned=ROOFS?.quadRoofVertices(pts,roofY,rise);
   if(planned){
     const roofGeo=new G.BufferGeometry();
     roofGeo.setAttribute('position',new G.Float32BufferAttribute(planned.vertices,3));
     roofGeo.computeVertexNormals();
     g.add(new G.Mesh(roofGeo,roofMat));
     g.userData.roofHeightStatus=planned.status;
   }else{
     const sh=new G.Shape();pts.forEach(([x,z],i)=>{if(!i)sh.moveTo(x,z);else sh.lineTo(x,z);});sh.closePath();
     const roofGeo=new G.ShapeGeometry(sh);roofGeo.rotateX(Math.PI/2);
     const roof=new G.Mesh(roofGeo,roofMat);roof.position.y=roofY;g.add(roof);
     g.userData.roofHeightStatus='ARTISTIC_FLAT_FALLBACK_NO_ROOF_DSM';
   }
   // Near-camera windows follow each source footprint segment rather than world axes.
   const winMat=mats?mats.glass:new G.MeshBasicMaterial({color:0x234d5d,side:G.DoubleSide});
   // One GPU draw per building's windows; preserve placement and material.
   const winPositions=[],winIndices=[];
   for(let k=0;k<Math.min(pts.length,6);k++){
     const [x0,z0]=pts[k],[x1,z1]=pts[(k+1)%pts.length],dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz);
     if(len<13||roofY-Math.max(...terrainY)<8)continue;
     const theta=-Math.atan2(dz,dx),nx=Math.sin(theta),nz=Math.cos(theta);
     for(let j=1;j<=Math.min(3,Math.floor(len/15));j++){
       const t=j/(Math.min(3,Math.floor(len/15))+1),x=x0+dx*t+nx*.42,y=roofY-6,z=z0+dz*t+nz*.42;
       const w=Math.min(5,len*.12)/2,h=2,ux=Math.cos(theta)*w,uz=-Math.sin(theta)*w;
       const base=winPositions.length/3;
       winPositions.push(x-ux,y-h,z-uz,x+ux,y-h,z+uz,x-ux,y+h,z-uz,x+ux,y+h,z+uz);
       winIndices.push(base,base+1,base+2,base+2,base+1,base+3);
     }
   }
   if(winIndices.length){
     const winGeo=new G.BufferGeometry();
     winGeo.setAttribute('position',new G.Float32BufferAttribute(winPositions,3));
     winGeo.setIndex(winIndices);winGeo.computeVertexNormals();
     g.add(new G.Mesh(winGeo,winMat));
   }
 }catch(_){/* Invalid derived footprint: display walls and keep running. */}
 g.userData.index=rec.i;g.userData.facade=mats?.family||'classic';return g;
}
let buildingJobs, foliageJobs, foliageStats, buildingStrategy;
const renderWorkers=window.ValleyRenderWorkers;
function buildBuildings(){
 buildingItems=[];
 activeBuildings.forEach((b,i)=>{const footprint=GEO.buildingFootprint(b,LIMIT);if(footprint)buildingItems.push({...footprint,i});});
 buildingMesh=new G.InstancedMesh(new G.BoxGeometry(1,1,1),new G.MeshStandardMaterial({color:0xffffff,roughness:.89,metalness:0}),buildingItems.length);
 const col=new G.Color(),colors=[0xdac5a5,0xb7afa2,0xb67861,0xbdb9ad,0x969f9a,0xd7b08a];
 buildingItems.forEach((b,i)=>buildingMesh.setColorAt(i,col.setHex(colors[b.i%colors.length])));
 // Packed footprint geometry lacks object IDs; match by the authoritative
 // computed centroid with a tight radius. Do not suppress other buildings.
 const target=LANDMARKS?.courthouse?.gamePosition;
 courthouseFootprintIndex=target?buildingItems.reduce((best,b,i)=>{
  const distance=Math.hypot(b.x-target.x,b.z-target.z);
  return distance<best.distance?{i,distance}:best;
 },{i:-1,distance:7}).i:-1;
 buildingMesh.instanceColor.needsUpdate=true;buildingMesh.frustumCulled=false;scene.add(buildingMesh);
 roofInstances=new G.InstancedMesh(ROOFS.makeUnitGable(G),new G.MeshStandardMaterial({color:0x665b53,roughness:.92,side:G.DoubleSide}),buildingItems.length);
 roofInstances.frustumCulled=false;scene.add(roofInstances);
 collisionWorld=COLLISION.create(buildingItems,{radius:1.7,stepHeight:2.8});
 const points=Float64Array.from(buildingItems.flatMap(b=>[b.x,b.z]));
 buildingJobs=renderWorkers.channel("Building LOD",renderWorkers.buildingPlanner,points,applyBuildingLOD);
 detailGroup=new G.Group();scene.add(detailGroup);updateBuildingLOD(true);
}
function updateBuildingLOD(force=false){
 if(!buildingMesh)return;
 const fastDriving=save.mode==='drive'&&currentTravelSpeed>42;
 if(!force&&fastDriving===detailFastLast&&Math.hypot(player.x-detailLast.x,player.z-detailLast.z)<(fastDriving?180:42))return;
 detailFastLast=fastDriving;detailLast={...player};
 // In high-speed drive mode show the instanced skyline and avoid uploading
 // dozens of new textured wall/roof buffers in the driving frame.
 const detailCap=fastDriving?0:save.mode==='drive'?(innerWidth<920?24:38):(innerWidth<920?38:64);
 buildingJobs.submit({x:player.x,z:player.z,radius:save.mode==='drive'?270:330,cap:detailCap,exclude:courthouseFootprintIndex});
}
function applyBuildingLOD({near,visible,strategy}){
 buildingStrategy=strategy;
 const want=new Set(near.map(x=>x.i));
 for(const [i,g] of detailBuildings){if(!want.has(i)){
   detailGroup.remove(g);g.traverse(obj=>{if(obj.isMesh)obj.geometry.dispose();});detailBuildings.delete(i);
 }}
 const dummy=new G.Object3D();
 buildingItems.forEach((b,i)=>{

   if(want.has(i)||!visible[i]||i===courthouseFootprintIndex){dummy.position.set(0,-999,0);dummy.scale.set(.001,.001,.001);}
   else{ // Mid-distance box LOD; ground contact sinks slightly into slope, never floats above sampled corners.
     const ground=Math.min(height(b.x-b.dx*.5,b.z-b.dz*.5),height(b.x+b.dx*.5,b.z-b.dz*.5),height(b.x-b.dx*.5,b.z+b.dz*.5),height(b.x+b.dx*.5,b.z+b.dz*.5));
     dummy.position.set(b.x,ground+b.h*.5-.35,b.z);dummy.scale.set(b.dx,b.h,b.dz);
   }
   dummy.updateMatrix();buildingMesh.setMatrixAt(i,dummy.matrix);
   if(roofInstances){if(want.has(i)||!visible[i]||i===courthouseFootprintIndex){dummy.position.set(0,-999,0);dummy.scale.set(.001,.001,.001);}
    else{const base=Math.min(height(b.x-b.dx*.5,b.z-b.dz*.5),height(b.x+b.dx*.5,b.z+b.dz*.5),height(b.x-b.dx*.5,b.z+b.dz*.5),height(b.x+b.dx*.5,b.z-b.dz*.5));
     const rise=Math.max(1.5,Math.min(6,Math.min(b.dx,b.dz)*.16));
     dummy.position.set(b.x,base+b.h-.35,b.z);
     if(b.dx>b.dz){dummy.rotation.y=Math.PI/2;dummy.scale.set(b.dz,rise,b.dx);}
     else{dummy.rotation.y=0;dummy.scale.set(b.dx,rise,b.dz);}
    }
    dummy.updateMatrix();roofInstances.setMatrixAt(i,dummy.matrix);dummy.rotation.y=0;}
 });buildingMesh.instanceMatrix.needsUpdate=true;if(roofInstances)roofInstances.instanceMatrix.needsUpdate=true;
 for(const {i} of near){if(!detailBuildings.has(i)){
   const detailed=detailedBuilding(buildingItems[i]);if(detailed){detailBuildings.set(i,detailed);detailGroup.add(detailed);}
 }}
}
function buildTrees(){
 if(!BIOME)return;
 const capacity=innerWidth<781?470:980;
 const config={limit:LIMIT,stops:C.STOPS,cellSize:240,loadRadius:innerWidth<781?700:900,
   unloadRadius:innerWidth<781?900:1110,maxTrees:capacity,seed:47620};
 foliageJobs=renderWorkers.channel("Foliage streaming",renderWorkers.foliagePlanner,config,applyVegetation,BIOME.biomeFactory);
 const barkMat=new G.MeshStandardMaterial({color:0x6c5542,roughness:1});
 const crownMat=new G.MeshLambertMaterial({color:0xffffff,side:G.DoubleSide});
 const trunk=new G.InstancedMesh(new G.CylinderGeometry(.5,.95,6,5),barkMat,capacity);
 const crowns=[
  new G.InstancedMesh(new G.IcosahedronGeometry(4.1,1),crownMat,capacity),
  new G.InstancedMesh(new G.SphereGeometry(4.3,7,6),crownMat,capacity),
  new G.InstancedMesh(new G.ConeGeometry(4.3,11,7),crownMat,capacity)
 ];
 treeMeshes=[trunk,...crowns];
 for(const m of treeMeshes){m.count=0;m.frustumCulled=true;scene.add(m);}
 if(GRAPHICS?.create)grassLayer=GRAPHICS.create(G,scene,height,{limit:LIMIT,stops:C.STOPS,inRiver:BIOME.inRiver,mobile:innerWidth<781});
 // Populate the player's immediate cells before the first frame.
 refreshVegetation(true);
}
function refreshVegetation(force=false,stamp=0){
 if(!foliageJobs||!treeMeshes.length)return;
 if(grassLayer)grassLayer.update(player.x,player.z,{quality:visualEffects,season,force});
 foliageJobs.submit({x:player.x,z:player.z,heading:playerHeading,speed:currentTravelSpeed,maxNewCells:foliageStats?4:74,force});
}
function applyVegetation(result,request){
 foliageStats=result.stats;
 if(!request.force&&!result.changed)return;
 const [trunk,...crowns]=treeMeshes;
 const dummy=new G.Object3D(),palette=BIOME.seasonPalette[season]||BIOME.seasonPalette.summer;
 const counts=[0,0,0],color=new G.Color(),trees=result.trees.slice(0,GRAPHICS?GRAPHICS.budget(visualEffects,innerWidth<781).trees:visualEffects==='lite'?(innerWidth<781?220:340):result.trees.length);
 for(let i=0;i<trees.length;i++){
  const t=trees[i],base=height(t.x,t.z),scale=t.size/10;
  dummy.position.set(t.x,base+3*scale,t.z);dummy.scale.set(scale,scale,scale);
  dummy.rotation.y=0;dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);
  const k=t.kind,c=crowns[k],ix=counts[k]++;
  dummy.position.set(t.x,base+(k===1?9:10)*scale,t.z);
  dummy.scale.set(scale*(k===1?1.15:1),scale*(k===1?1.23:1),scale);
  dummy.rotation.y=(t.x+t.z)%2;dummy.updateMatrix();c.setMatrixAt(ix,dummy.matrix);
  color.setHex(palette[(k+i)%palette.length]);c.setColorAt(ix,color);
 }
 trunk.count=trees.length;trunk.instanceMatrix.needsUpdate=true;
 for(let k=0;k<crowns.length;k++){
  const c=crowns[k];c.count=counts[k];c.instanceMatrix.needsUpdate=true;
  if(c.instanceColor)c.instanceColor.needsUpdate=true;
 }
 for(const m of treeMeshes){if(m.count&&m.computeBoundingSphere)m.computeBoundingSphere();}
}
function buildBeacons(){
 beaconGroup=new G.Group();scene.add(beaconGroup);
 for(let i=0;i<C.STOPS.length;i++){
  const s=C.STOPS[i],group=new G.Group();group.userData.id=s.id;group.position.set(s.x,height(s.x,s.z)+10,s.z);
  const c=i===0?0xffd778:0x9bf2d1;
  const ring=new G.Mesh(new G.TorusGeometry(8,1.3,6,30),new G.MeshBasicMaterial({color:c}));ring.rotation.x=Math.PI/2;group.add(ring);
  const crystal=new G.Mesh(new G.OctahedronGeometry(6,0),new G.MeshLambertMaterial({color:c,emissive:c,emissiveIntensity:.32}));crystal.position.y=9;group.add(crystal);
  const glow=new G.Mesh(new G.CylinderGeometry(2.5,4,19,10,1,true),new G.MeshBasicMaterial({color:c,transparent:true,opacity:.12,depthWrite:false,side:G.DoubleSide}));glow.position.y=-2;group.add(glow);
  beaconGroup.add(group);
 }
}

function applyFamilyWardrobe(model){
 if(!CAST_WARDROBE?.decorate||!model?.skinned||model.lod==='CUSTOM')return model;
 const id=CAST_WARDROBE.selection();
 if(id)CAST_WARDROBE.decorate(G,model,id);
 return model;
}
function heroLODForQuality(){
 if(visualEffects==='cinematic')return 'LOD0';
 if(visualEffects==='lite')return 'LOD2';
 return innerWidth<781?'LOD1':'LOD0';
}
function showHeroModelStatus(model){
 const box=$('heroRigWarning');if(!box)return;
 box.hidden=!!model?.skinned;
 if(!model?.skinned)box.textContent='Character asset warning: the detailed rig could not load. The simplified compatibility model is showing. '+(window.ValleyHeroRigFailure||'Missing embedded GLB');
}
function updateHeroGeometryQuality(force=false){
 if(!G||!scene||!renderer||!heroController)return;
 const requestedLOD=window.ValleyRiggedHeroOverrideData?'CUSTOM':heroLODForQuality();
 for(const name of ['heroController','driverController']){
  const current=name==='heroController'?heroController:driverController;
  if(!current||(!force&&current.lod===requestedLOD&&(current.castId||null)===(CAST_WARDROBE?.selection?.()||null)))continue;
  let next=null;
  try{
   next=HERO.create(G,{seated:name==='driverController',lod:requestedLOD});applyFamilyWardrobe(next);
   if(!next?.skinned)throw Error(window.ValleyHeroRigFailure||'Skinned model unavailable');
   next.root.position.copy(current.root.position);
   next.root.rotation.copy(current.root.rotation);
   next.root.scale.copy(current.root.scale);
   next.root.visible=current.root.visible;
   next.root.name=current.root.name;
   const parent=current.root.parent||scene;
   parent.add(next.root);parent.remove(current.root);
   if(name==='heroController'){heroController=next;avatar=next.root;showHeroModelStatus(next);}
   else driverController=next;
   current.dispose();
  }catch(error){
   next?.dispose?.();
   console.warn('Character quality transition retained current verified rig:',error);
   showHeroModelStatus(current);
  }
 }
}
function buildPlayer(){
 // The studio reference sheets define the character; geometry and animations are
 // original local procedural meshes, with no external asset fetch or online rig.
 if(!HERO)throw new Error('Hero character module must load before the world');
 heroController=HERO.create(G,{lod:heroLODForQuality()});applyFamilyWardrobe(heroController);showHeroModelStatus(heroController);
 groundShadow=MOTION.createContactShadow(G);if(groundShadow)scene.add(groundShadow);
 avatar=heroController.root;
 avatar.name='Playable River Explorer';
 avatar.traverse(obj=>{if(obj.isMesh)obj.castShadow=true;});
 scene.add(avatar);
 car=new G.Group();
 const paint=new G.MeshStandardMaterial({color:0xa26c4c,roughness:.51,metalness:.16});
 const chassis=new G.Mesh(new G.BoxGeometry(15,4,26),paint);
 chassis.position.y=4;car.add(chassis);
 // Translucent cabin makes the seated explorer visible from third-person cameras.
 const cab=new G.Mesh(new G.BoxGeometry(12,5,13),
  new G.MeshStandardMaterial({color:0x345b68,roughness:.16,metalness:.08,transparent:true,opacity:.43,depthWrite:false}));
 cab.position.set(0,8,-1);car.add(cab);
 const top=new G.Mesh(new G.BoxGeometry(12.8,.55,13.6),
  new G.MeshStandardMaterial({color:0x5d5248,roughness:.74}));
 top.position.set(0,10.6,-1);car.add(top);
 const wheelMat=new G.MeshStandardMaterial({color:0x20272a,roughness:.95});
 const wheels=new G.Mesh(new G.CylinderGeometry(2.4,2.4,2,10),wheelMat);
 for(const side of [-1,1])for(const dz of [-8,8]){
  const w=wheels.clone();w.rotation.z=Math.PI/2;w.position.set(side*7.5,2.2,dz);car.add(w);
 }
 driverController=HERO.create(G,{seated:true,lod:heroLODForQuality()});applyFamilyWardrobe(driverController);
 driverController.root.name='Explorer driving';
 driverController.root.scale.setScalar(.53);
 driverController.root.position.set(-2.45,1.5,-1.0);
 car.add(driverController.root);car.traverse(obj=>{if(obj.isMesh)obj.castShadow=true;});scene.add(car);
 dog=new G.Group();dog.name='Scout / animated faithful companion';
 const fur=new G.MeshStandardMaterial({color:0xb99872,roughness:.98}),dark=new G.MeshStandardMaterial({color:0x554338,roughness:.93}),
  cream=new G.MeshStandardMaterial({color:0xe1c9a5,roughness:.96}),collar=new G.MeshStandardMaterial({color:0x467b80,roughness:.73});
 const dbody=new G.Mesh(new G.BoxGeometry(4.7,3.4,7.2),fur);dbody.position.y=3.5;dog.add(dbody);
 const chest=new G.Mesh(new G.BoxGeometry(3.7,2.3,1.4),cream);chest.position.set(0,3,-3.2);dog.add(chest);
 const head=new G.Group();head.position.set(0,5.1,-4.4);dog.add(head);
 const dhead=new G.Mesh(new G.BoxGeometry(3.1,2.9,3.4),fur);head.add(dhead);
 const muzzle=new G.Mesh(new G.BoxGeometry(2.1,1.25,2.2),cream);muzzle.position.set(0,-.75,-2);head.add(muzzle);
 const nose=new G.Mesh(new G.BoxGeometry(1,.65,.55),dark);nose.position.set(0,-.2,-3.1);head.add(nose);
 const legs=[];
 for(const side of [-1,1])for(const zz of [-2.6,2.5]){
  const pivot=new G.Group();pivot.position.set(side*1.6,2.8,zz);
  const leg=new G.Mesh(new G.BoxGeometry(1.15,2.8,1.35),fur);leg.position.y=-1.35;pivot.add(leg);
  const paw=new G.Mesh(new G.BoxGeometry(1.55,.65,2),cream);paw.position.set(0,-2.6,-.15);pivot.add(paw);dog.add(pivot);legs.push(pivot);
 }
 for(const side of [-1,1]){
  const ear=new G.Mesh(new G.BoxGeometry(.9,2.1,1),dark);ear.position.set(side*1.47,.15,.3);ear.rotation.z=side*.27;head.add(ear);
  const eye=new G.Mesh(new G.SphereGeometry(.25,8,6),dark);eye.position.set(side*.85,.35,-1.68);head.add(eye);
 }
 const tag=new G.Mesh(new G.TorusGeometry(.65,.17,6,12),collar);tag.position.set(0,4.5,-2.75);tag.rotation.x=Math.PI/2;dog.add(tag);
 const tail=new G.Group();tail.position.set(0,4.5,3.5);dog.add(tail);
 const tailMesh=new G.Mesh(new G.ConeGeometry(.75,4,7),fur);tailMesh.position.z=1.8;tailMesh.rotation.x=Math.PI/2;tail.add(tailMesh);
 dogParts={legs,head,tail};scene.add(dog);
 // Art-directed Scout is the local desktop default; user's verified custom GLB
 // still takes precedence and can be restored from existing offline saves.
 if(CREATURES&&innerWidth>=781&&visualEffects!=='lite'){
  try{
   const detailed=CREATURES.create(G,'scout');
   for(const child of dog.children)child.visible=false;
   dog.add(detailed);dog.userData.cinematicScout=detailed;
  }catch(error){console.warn('Retaining legacy Scout model:',error);}
 }
}
let scoutImportGeneration=0;
const SCOUT_GLB_KEY='river-valley-custom-scout-v1';
function validateCustomScoutGLB(raw){
 if(!MODEL?.parseGLB||!MODEL?.dataAccessor)throw Error('Offline GLB decoder is unavailable');
 if(!(raw instanceof ArrayBuffer)||raw.byteLength<80||raw.byteLength>2_000_000)throw Error('Scout GLB must be below 2 MB');
 const parsed=MODEL.parseGLB(raw),doc=parsed.json;
 if(doc.asset?.version!=='2.0'||(doc.extensionsRequired||[]).length)throw Error('Unsupported Scout glTF extension/version');
 if(doc.buffers?.length!==1||doc.buffers[0].uri||(doc.images||[]).some(i=>!!i.uri))throw Error('Scout GLB must be fully embedded');
 if(doc.skins?.length||doc.animations?.length){
  const expected=['Idle','Walk','Run'],skin=doc.skins?.[0];
  if(doc.skins?.length!==1||skin.joints?.length!==16||doc.meshes?.length!==1||
     doc.animations?.length!==expected.length||expected.some(name=>!doc.animations.some(a=>a.name===name)))
   throw Error('Articulated Scout requires the 16-joint idle, walk and run rig');
  let vertices=0,triangles=0;
  for(const primitive of doc.meshes[0].primitives){
   if((primitive.mode??4)!==4||['POSITION','NORMAL','JOINTS_0','WEIGHTS_0','TEXCOORD_0'].some(k=>!Number.isInteger(primitive.attributes[k])))throw Error('Incomplete Scout skin or UVs');
   vertices+=doc.accessors[primitive.attributes.POSITION].count;
   triangles+=doc.accessors[primitive.indices].count/3;
  }
  if(vertices>20000||!Number.isInteger(triangles)||triangles<1)throw Error('Invalid Scout geometry');
  return {vertices,triangles,rigged:true};
 }
 if(doc.meshes?.length!==1||doc.meshes[0].primitives?.length!==1)throw Error('Expected one Scout mesh');
 const attrs=doc.meshes[0].primitives[0].attributes||{};
 if(!Number.isInteger(attrs.POSITION)||!Number.isInteger(attrs.COLOR_0))throw Error('Scout requires POSITION and COLOR_0');
 const p=MODEL.dataAccessor(parsed,attrs.POSITION),col=MODEL.dataAccessor(parsed,attrs.COLOR_0);
 if(p.channels!==3||col.count!==p.count||![3,4].includes(col.channels)||p.count>20_000)throw Error('Invalid Scout vertex count or colors');
 return {vertices:p.count,triangles:MODEL.dataAccessor(parsed,doc.meshes[0].primitives[0].indices).count/3};
}
function clearStaticScout(){
 ++scoutImportGeneration;
 if(!dog)return;
 const custom=dog.userData.customScout;
 if(custom){
  dog.remove(custom);
  disposeScoutVisual(custom);
  dog.userData.customScout=null;
 }
 for(const child of dog.children)child.visible=!dog.userData.cinematicScout||child===dog.userData.cinematicScout;
}
function disposeScoutVisual(visual){
 const resources=new Set();
 const mixer=visual.userData.mixer;
 if(mixer){mixer.stopAllAction();mixer.uncacheRoot(visual);}
 visual.traverse(obj=>{
  if(!obj.isMesh)return;
  resources.add(obj.geometry);
  if(obj.skeleton)resources.add(obj.skeleton);
  for(const mat of [].concat(obj.material||[])){
   resources.add(mat);
   for(const value of Object.values(mat))if(value?.isTexture)resources.add(value);
  }
 });
 for(const resource of resources)resource.dispose?.();
}
async function mountStaticScout(b64){
 if(!dog||!G||!MODEL?.makeModel)throw Error('Scout is not ready in WebGL');
 const generation=++scoutImportGeneration;
 const raw=MODEL.decodeBase64(b64),counts=validateCustomScoutGLB(raw);
 let visual;
 if(counts.rigged){
  const manager=new G.LoadingManager();
  manager.setURLModifier(url=>{
   if(!url.startsWith('blob:'))throw Error('Scout images must be embedded');
   return url;
  });
  const gltf=await new window.RiverGLTFLoader(manager).parseAsync(raw,'');
  visual=gltf.scene;
  const mixer=new G.AnimationMixer(visual);
  visual.userData.mixer=mixer;
  visual.userData.actions=new Map(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
  // The Blender rig faces glTF +Z, while the game companion faces -Z.
  visual.rotation.y=Math.PI;
 }else{
  visual=MODEL.makeModel(G,b64);
  visual.rotation.x=-Math.PI/2;
 }
 if(generation!==scoutImportGeneration){disposeScoutVisual(visual);return null;}
 visual.scale.setScalar(10);
 clearStaticScout();
 for(const child of dog.children)child.visible=false;
 dog.add(visual);dog.userData.customScout=visual;
 return counts;
}
function scoutDescription(info){
 return info.rigged?'16 joints · Idle, Walk, Run':'static vertex-color geometry';
}
async function restoreStaticScout(){
 if(!dog)return;
 try{
  const b64=localStorage.getItem(SCOUT_GLB_KEY);
  if(!b64)return;
  const info=await mountStaticScout(b64);
  if(info)$('customScoutStatus').textContent='Scout restored offline · '+scoutDescription(info);
 }catch(err){$('customScoutStatus').textContent='Saved Scout could not load: '+err.message;}
}
async function importStaticScout(file){
 const status=$('customScoutStatus');
 try{
  if(!file||file.size>2_000_000)throw Error('Scout GLB exceeds 2 MB limit');
  const request=++scoutImportGeneration;
  const raw=await file.arrayBuffer();
  if(request!==scoutImportGeneration)return;
  const b64=CUSTOM_HERO.toBase64(raw),info=await mountStaticScout(b64);
  if(!info)return;
  try{localStorage.setItem(SCOUT_GLB_KEY,b64);}catch(_){}
  status.textContent='Scout imported · '+info.triangles+' triangles · '+scoutDescription(info);
 }catch(err){status.textContent='Scout import failed: '+err.message;}
}
function cueHero(state,durationMs=650){
 heroOneShot=state;heroOneShotUntil=performance.now()+durationMs;
}
function chooseHeroState(stamp){
 const preview=heroInspection?heroPreviewPose:null;if(preview)return preview;
 if(save.mode==='drive')return 'drive';
 if(motionState.airborne)return 'jump';
 if(motionState.landing)return 'land';
 if(heroOneShot&&stamp<heroOneShotUntil){
  if(heroOneShot==='jump')return stamp<heroOneShotUntil-320?'jump':'land';
  return heroOneShot;
 }
 if(worldActive==='fish')return 'fish';
 if(worldActive==='hunt')return 'hunt';
 if(worldActive==='cook')return 'cook';
 if(worldActive==='farm')return 'farm';
 if(activity==='fish')return 'fish';
 if(activity==='hunt')return 'hunt';
 if(activity==='cook')return 'cook';
 if(currentTravelSpeed>=29)return 'sprint';
 if(currentTravelSpeed>=15)return 'run';
 if(currentTravelSpeed>=1.4)return 'walk';
 return 'idle';
}
function buildHouse(){
 house=new G.Group();const px=-740,pz=-210;house.position.set(px,height(px,pz),pz);
 const plank=new G.MeshLambertMaterial({color:0x91613d}),roofMat=new G.MeshLambertMaterial({color:0x604c43});
 const walls=new G.Mesh(new G.BoxGeometry(33,23,28),plank);walls.position.y=12;house.add(walls);
 const roof=new G.Mesh(new G.ConeGeometry(27,16,4),roofMat);roof.position.y=30;roof.rotation.y=Math.PI/4;house.add(roof);
 const door=new G.Mesh(new G.BoxGeometry(8,13,1),new G.MeshLambertMaterial({color:0x493629}));door.position.set(0,6,-14.5);house.add(door);
 const lantern=new G.Mesh(new G.SphereGeometry(2,8,8),new G.MeshBasicMaterial({color:0xffe39d}));lantern.position.set(9,15,-15);house.add(lantern);
 house.visible=false;scene.add(house);
}
// Original self-contained low-poly glTF 2.0 environment assets. No third-party models or online fetch.
function buildOriginalModels(){
 const definitions=[
  ['barn',-1285,-816,null,.9],
  ['courthouse',92,465,null,.8],
  ['fishing_pier',130,1184,.6,1],
  ['riverboat',-1320,1570,.9,1.1],
  ['oak_cottage',-740,-210,null,1]
 ];
 for(const [name,x,z,waterY,scale] of definitions){
  try{
   const b64=window.ValleyModelData?.[name];if(!b64||!MODEL)continue;
   const group=MODEL.makeModel(G,b64);
   let bx=x,bz=z,ground=waterY??height(x,z),modelScale=scale;
   if(name==='courthouse'&&LANDMARKS?.schemaVersion===1&&LANDMARKS?.courthouse?.footprintObjectID===741267){
    const match=LANDMARKS.courthouse,loc=match.gamePosition,dim=match.dimensionsMeters,angle=match.rotationRadians;
    bx=loc.x;bz=loc.z;modelScale=1;group.rotation.y=angle;
    const samples=[];
    for(const ux of [-dim.width/2,dim.width/2])for(const uz of [-dim.depth/2,dim.depth/2]){
      const xx=bx+ux*Math.cos(angle)+uz*Math.sin(angle),zz=bz-ux*Math.sin(angle)+uz*Math.cos(angle);
      samples.push(height(xx,zz));
    }
    ground=Math.min(...samples)-.22;
    group.userData.landmarkProvenance={sourceFeatureID:match.footprintObjectID,
      roofHeightStatus:match.roofHeightStatus,groundRangeMeters:[Math.min(...samples),Math.max(...samples)],
      status:match.status};
   }
   group.position.set(bx,ground,bz);group.scale.setScalar(modelScale);group.userData.model=name;
   group.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;}});
   if(name==='oak_cottage'){if(house){scene.remove(house);house.traverse(obj=>{if(obj.isMesh){obj.geometry.dispose();obj.material.dispose();}});}house=group;group.visible=false;}
   scene.add(group);gameModels.push(group);
  }catch(err){console.warn('Optional 3D model not available:',name,err.message);}
 }
}
function updateVisuals(dt,stamp){
 if(!renderer||view==='2d')return;
 updateHeroRuntimeStatus();
 if(heroInspection&&heroPreviewStage){
  heroPreviewStage.resize(innerWidth,innerHeight);
  heroPreviewStage.update({state:heroPreviewPose,stamp,dt});
  heroState=heroPreviewPose;
  heroPreviewStage.render(renderer);
  return;
 }

 const cinematicFrame=CINEMATIC?CINEMATIC.sample({
  time,weather,look:cinemaPrefs.look,quality:cinemaPrefs.quality,
  effects:visualEffects,mobile:innerWidth<781
 }):null;
 if(cinematicFrame){
  CINEMATIC.apply(G,{scene,renderer,sunLight,ambient,
   playerX:player.x,playerZ:player.z,playerY:height(player.x,player.z),
   preset:cinematicFrame});
 }else{
  // Fallback for independently embedded older/offline distributions.
  const radians=(time-6)/24*Math.PI*2,light=C.clamp(.25+Math.sin(radians)*.8,.06,1.05);
  const mist=weather==='mist';
  scene.background.set(light<.25?'#13273e':(weather==='rain'?'#839d9d':'#9cb8b3'));
  scene.fog.color.set(light<.25?'#3e5360':mist?'#b1c5bd':'#aec8c1');
  scene.fog.density=visualEffects==='lite'?.00004:(mist?.0006:weather==='rain'?.00033:.00018);
  ambient.intensity=.6+1.8*light;sunLight.intensity=.25+2.2*light;
  sunLight.position.set(-200,Math.max(30,380*light),180);
  renderer.toneMappingExposure=.75+light*.62;
 }
 if(grassLayer?.tick)grassLayer.tick(stamp,visualEffects,weather);
 avatar.position.set(player.x,height(player.x,player.z)+heroHeightOffset,player.z);
 vehicleState=suspension.update({x:player.x,z:player.z,yaw:playerHeading,groundAt:height,dt:save.mode==='drive'?dt:0});
 car.position.set(player.x,height(player.x,player.z)+vehicleState.bodyHeight,player.z);
 car.rotation.order='YXZ';car.rotation.x=vehicleState.pitch;car.rotation.z=vehicleState.roll;
 if(groundShadow){groundShadow.position.set(player.x,height(player.x,player.z)+.16,player.z);groundShadow.scale.setScalar(save.mode==='drive'?2.3:1);groundShadow.material.opacity=save.mode==='drive'?.40:Math.max(.22,.52-heroHeightOffset*.065);groundShadow.visible=started&&!heroInspection;}avatar.rotation.y=playerHeading;car.rotation.y=playerHeading;avatar.visible=save.mode==='walk'||heroInspection;car.visible=save.mode==='drive'&&!heroInspection;
 heroState=chooseHeroState(stamp);
 if(heroController)heroController.update({state:heroState,stamp,dt,groundAt:height,heading:playerHeading});
 if(driverController)driverController.update({state:'drive',stamp,dt});
 if(dog&&scout){
   const state=scout.update({dt,player,heading:playerHeading,groundAt:height,stamp,
    enabled:save.pet&&save.mode==='walk',activity:worldActive});
   dog.visible=state.action!=='hidden'&&!heroInspection;
   dog.position.set(state.x,state.y+.08+Math.sin(state.phase*2)*Math.min(.17,state.pace*.006),state.z);
   dog.rotation.y=state.heading;
   const visual=dog.userData.customScout;
   if(visual?.userData.mixer&&dog.visible){
    const anim=visual.userData,clip=state.pace>16?'Run':state.pace>1?'Walk':'Idle';
    if(anim.active!==clip){
     const next=anim.actions.get(clip).reset().play();
     if(anim.active)anim.actions.get(anim.active).crossFadeTo(next,.14,false);
     anim.active=clip;
    }
    anim.mixer.update(dt);
   }
   const enhanced=dog.userData.cinematicScout;
   if(enhanced&&!dog.userData.customScout){
    enhanced.userData.animate?.(dt,{phase:state.phase*2,moving:state.pace>1,action:state.action,lookYaw:0});
    enhanced.userData.setLod?.(visualEffects==='lite'?2:0);
   }
   if(dogParts){dogParts.tail.rotation.y=state.tailWag;
     dogParts.head.rotation.x=state.action==='sit'?.16:Math.sin(stamp*.001)*.055;
     dogParts.legs.forEach((leg,i)=>leg.rotation.x=state.action==='sit'?(i<2?.28:-.48):
       Math.sin(state.phase*2+(i%3)*Math.PI)*Math.min(.55,state.pace*.028));}
   if(state.completedFetch){const earned=COMPANION.rewardBond(save,'fetch',Date.now());save=earned.save;
     if(earned.result==='bonded'){persist();toast('🐕 Scout brought the toy back! Bond +2 · 12 XP.');}}
  }
 if(beaconGroup)beaconGroup.children.forEach((g,i)=>{g.rotation.y+=dt*.5;g.position.y=height(g.position.x,g.position.z)+8+Math.sin(stamp/450+i)*2;g.visible=!save.completed.includes(g.userData.id);});
 if(house)house.visible=save.homestead;
 if(waterMesh){if(RIVER_WATER&&waterMesh.material.uniforms)RIVER_WATER.update(waterMesh.material,stamp,weather,time,visualEffects);else waterMesh.material.opacity=.82+Math.sin(stamp/900)*.045;}
 if(facadePalette?.setWeather)facadePalette.setWeather(weather,roadMesh?.material);
 if(roadMesh?.material){roadMesh.material.color.setHex(weather==='rain'?0x3b464b:0x62686a);
  roadMesh.material.needsUpdate=false;}
 if(worldGame)worldGame.update({stamp,save,activity:worldActive,huntRound:worldHuntRound,fishRound:worldFishRound,aim:worldAim,weather,player,now:Date.now()});
 if(cinematicDressing)cinematicDressing.update(time,weather,cinemaPrefs.quality);
 if(atmosphere)atmosphere.update(camera,time,weather,season,stamp,cinematicFrame);if(director3D)director3D.update(stamp,time,weather,cinemaPrefs.strength,cinemaPrefs.quality);
 applyTerrainLOD();
 if(terrainTransition)terrainTransition.pump(save.mode==='drive'?(visualEffects==='lite'?3:5):(visualEffects==='lite'?6:10));
 fadeRetiringTerrain(stamp);
 if(roadRefreshQueued && (save.mode!=='drive'||currentTravelSpeed<15) && !terrainTransition?.status().pending){
   const refreshAt=performance.now();roadRefreshQueued=false;
   if(roadMesh){scene.remove(roadMesh);roadMesh.geometry.dispose();roadMesh.material.dispose();roadMesh=null;buildRoads();}
   if(referenceEnabled)updateReferenceDrape();
   frameProbe.mark('road-redrape-after-lod',{stamp:performance.now(),x:player.x,z:player.z,ms:performance.now()-refreshAt,tiles:terrainStats.tiles});
 }
 if(groundPlacementDirty&&!terrainTransition?.status().pending&&(save.mode!=='drive'||currentTravelSpeed<15)){
   // Reuse displayed LOD triangle samples after tile commits; do not place props on a stale height field.
   groundPlacementDirty=false;refreshVegetation(true,stamp);updateBuildingLOD(true);
 }
 if(stamp-lastVegetationTime>(save.mode==='drive'?650:250)){refreshVegetation(false,stamp);lastVegetationTime=stamp;}
 updateBuildingLOD();
 const yaw=heroInspection?playerHeading+Math.PI:cameraYaw,dist=heroInspection?30:cameraDist,dx=Math.sin(yaw)*dist,dz=Math.cos(yaw)*dist;
 const tx=player.x+dx,tz=player.z+dz,desiredY=heroInspection?height(player.x,player.z)+12:height(tx,tz)+Math.max(23,cameraDist*.34);
 const ty=heroInspection?desiredY:MOTION.cameraClearance({playerX:player.x,playerZ:player.z,lookHeight:height(player.x,player.z)+6+heroHeightOffset,cameraX:tx,cameraZ:tz,desiredY,groundAt:height,maxLift:75});
 camera.position.lerp(cameraGoal.set(tx,ty,tz),Math.min(1,dt*4.5));
 camera.lookAt(player.x,height(player.x,player.z)+(heroInspection?10.5:6),player.z);
 renderer.render(scene,camera);
}
function update2d(){
 const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2);
 if(atlas.width!==Math.round(w*dpr)||atlas.height!==Math.round(h*dpr)){atlas.width=Math.round(w*dpr);atlas.height=Math.round(h*dpr);atlas.style.width=w+'px';atlas.style.height=h+'px';}
 ctx.setTransform(dpr,0,0,dpr,0,0);mapDraw(ctx,w,h,true);
 const mid={x:w/2,y:h/2};ctx.fillStyle='rgba(5,30,28,.6)';ctx.strokeStyle='#ffe3a0';ctx.lineWidth=3;
 ctx.beginPath();ctx.arc(mid.x,mid.y,13,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='20px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(save.mode==='drive'?'🚗':'🚶',mid.x,mid.y+7);
}
function syncView(){const is2d=view==='2d'||!renderer;atlas.style.display=is2d?'block':'none';canvas.style.display=is2d?'none':'block';}
function resize(){syncView();if(renderer){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/Math.max(1,innerHeight);camera.updateProjectionMatrix();}if(view==='2d'||!renderer)update2d();}
function updateHeroRuntimeStatus(){
 const output=$('heroRuntimeStatus');if(!output)return;
 let label;
 if(!renderer)label='WebGL unavailable or initialization failed — 2D atlas only; this device cannot display the 3D character or skeleton.';
 else if(view==='2d')label='2D atlas active — choose 3D countryside under World view to see the skinned character.';
 else if(!heroController?.skinned)label='3D mode active, but the skinned River rig failed to load; showing compatibility character.';
 else{
  const t=heroController?.embeddedTextures,clips=heroController?.clips?.length||0,bones=Object.keys(heroController?.joints||{}).length;
  const detail=t?(t.loaded+'/'+t.expected+' embedded textures ready'+(t.failed?' · '+t.failed+' failed':'')):'embedded textures not available';
  label='3D River Explorer active · '+bones+' joints · '+clips+' clips · '+detail;
 }
 if(output.textContent!==label)output.textContent=label;
}
function updateHUD(){
 updateHeroRuntimeStatus();
 if(GEOREF && window.OpenLocationCode && save.countyRegion==='mount-vernon'){
  const [lon,lat]=GEOREF.worldToLonLat(player.x,player.z);
  $('locationCode').textContent='Approximate local Mount Vernon game location · '+OpenLocationCode.encode(lat,lon);
 }else if(save.countyRegion!=='mount-vernon'){
  const region=COUNTY_DATA?.places?.find(p=>p.id===save.countyRegion);
  $('locationCode').textContent=(region?.name||'Regional')+' gameplay vignette · NOT georeferenced 3D terrain';
 }
 $('pantrySummary').textContent=`🌽 ${save.inventory.corn} · 🐟 ${save.inventory.fish} · 🦌 ${save.inventory.game} · 🍲 ${save.inventory.meals}`;
 $('level').textContent=save.level;$('coins').textContent=save.coins.toLocaleString();$('stamps').textContent=save.completed.length+'/'+C.STOPS.length;
 $('clock').textContent=C.formatTime(time);$('weatherBadge').textContent=weather==='clear'?'☀️ Clear':weather==='rain'?'🌧️ Rain':'🌫️ Mist';
 $('timeLabel').textContent=C.formatTime(time);
 $('walkBtn').classList.toggle('selected',save.mode==='walk');$('driveBtn').classList.toggle('selected',save.mode==='drive');$('mapBtn').classList.toggle('selected',view==='2d');
 $('weather').value=weather;$('season').value=season;$('time').value=String(Math.round(time*4)/4);
 $('petBtn').textContent=save.pet?'🐕 Scout: ON':'🐕 Scout: OFF';$('soundBtn').textContent=save.muted?'🔇 Muted':'🔊 Sound';
 $('questSummary').textContent=save.completed.length===C.STOPS.length?'🏆 All six memories collected! Explore freely.':`${save.completed.length} of ${C.STOPS.length} stamps in your adventure book`;
 $('missionList').innerHTML=C.STOPS.map(st=>{
  let done=save.completed.includes(st.id),dist=Math.hypot(player.x-st.x,player.z-st.z);
  return `<button data-stop="${st.id}" class="${selected===st.id?'active ':''}${done?'done':''}"><span class="dot">${st.emoji}</span><span><span class="mtitle">${st.title}${done?' ✓':''}</span><span class="msub">${done?'Memory collected':(dist/1000).toFixed(1)+' km away'}</span></span><span class="destination">${done?'✓':'›'}</span></button>`;
 }).join('');
}

function drawCounty(){
 if(!COUNTY||!COUNTY_DATA)return;
 COUNTY.draw($('countyMapCanvas'),{selected:countySelected,visited:save.countyVisited},COUNTY_DATA);
 $('countyRegionList').innerHTML=COUNTY_DATA.places.map(p=>'<button type="button" data-region="'+p.id+'" class="'+(p.id===countySelected?'selected':'')+'">'+p.name+(save.countyVisited.includes(p.id)?' ✓':'')+'</button>').join('');
 const p=COUNTY_DATA.places.find(p=>p.id===countySelected),dest=COUNTY.stage(countySelected);
 $('countyRegionInfo').textContent=p?(p.name+' · Census town center '+p.lat.toFixed(4)+'°N '+Math.abs(p.lon).toFixed(4)+'°W · '+dest.title+
  ' (illustrative 3D experience, NOT the actual town model).'):'Select a town.';
}
function openCounty(){
 if(!started){toast('Start your adventure before exploring Posey County.');return;}
 closeWorldActivity();closeCinema();$('panel').classList.remove('open');$('scoutPanel').hidden=true;
 countySelected=save.countyRegion;
 $('countyPanel').hidden=false;drawCounty();
}
function closeCounty(){$('countyPanel').hidden=true;}
function travelCounty(){
 if(!COUNTY||!started)return;
 const loc=COUNTY.stage(countySelected);if(!loc)return;
 if(!isWorld3D()){toast('The county destination requires 3D mode. Select 3D, then visit again.');return;}
 const result=C.visitCountyRegion(save,countySelected);
 save=result.save;player.x=loc.x;player.z=loc.z;
 suspension.reset();motion.reset({facing:playerHeading});scout?.reset();motionState=motion.snapshot();heroHeightOffset=0;
 closeCounty();closeWorldActivity();persist();updateHUD();checkNearby();
 if(result.result==='discovered')audioChime();
 toast('🧭 '+loc.title+' · original playable regional vignette. County atlas positioning is geographic; the 3D scene is illustrative.');
}
function renderScout(){
 if(!scout)return;
 const s=scout.snapshot();
 $('scoutStatus').textContent='Scout bond '+save.scoutBond+'/100 · '+(save.pet?s.action:'resting')+
  ' · Reward cooldowns prevent repeated XP farming.';
}
function openScout(){
 if(!started){toast('Start your adventure to meet Scout.');return;}
 closeCounty();$('panel').classList.remove('open');
 $('scoutPanel').hidden=false;renderScout();
}
function scoutCommand(action){
 if(!scout||!started)return;
 if(!save.pet){toast('Enable Scout in adventure settings first.');return;}
 if(action==='pet'){
  const result=COMPANION.rewardBond(save,'pet',Date.now());save=result.save;persist();updateHUD();
  toast(result.result==='bonded'?'💛 Scout loves the attention! Bond +1 · 5 XP.':'🐕 Scout is content. Another treat can wait.');
 }else if(scout.command(action,{player,heading:playerHeading})){
  toast(action==='fetch'?'🦴 Scout runs for the toy!':action==='sit'?'🐕 Scout sits and watches.':'📣 Scout is coming!');
 }
 renderScout();
}
function toast(str){const el=$('toast');el.textContent=str;el.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.style.display='none',3500);}
function audioChime(){if(save.muted)return;try{
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 const ac=new AC();[0,0.11,.22].forEach((t,i)=>{const osc=ac.createOscillator(),gain=ac.createGain();osc.type='sine';osc.frequency.value=[523,659,784][i];gain.gain.setValueAtTime(.0001,ac.currentTime+t);gain.gain.exponentialRampToValueAtTime(.065,ac.currentTime+t+.015);gain.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+t+.28);osc.connect(gain).connect(ac.destination);osc.start(ac.currentTime+t);osc.stop(ac.currentTime+t+.3);});setTimeout(()=>ac.close(),1200);
 }catch(err){console.warn('Audio playback blocked',err.message);}}
function persist(){save.position={x:player.x,z:player.z};save.time=time;save.weather=weather;save.season=season;try{localStorage.setItem(nameKey(slot),JSON.stringify(save));return true;}catch(_){return false;}}
function readSlot(idx){try{const t=localStorage.getItem(nameKey(idx));return t?C.validateSave(JSON.parse(t)):null;}catch(_){return null;}}
function applyState(s){save=C.validateSave(s);countySelected=save.countyRegion;scout?.reset();player=ACCESS?.safeResume({...save.position},LANDMARKS?.courthouse)||{...save.position};save.position={...player};suspension.reset();motion.reset({facing:playerHeading});motionState=motion.snapshot();heroHeightOffset=0;time=save.time;weather=save.weather;season=save.season;document.body.classList.toggle('rainy',weather==='rain');document.body.classList.toggle('misty',weather==='mist');$('playerName').value=save.name;needsMap=true;updateHUD();}
function setPaused(next){
 if(!started)return false;
 const target=Boolean(next);
 if(target===paused)return paused;
 paused=target;
 const overlay=$('pauseOverlay');
 overlay.hidden=!paused;
 $('pauseToggle').setAttribute('aria-expanded',String(paused));
 document.body.classList.toggle('ux-game-paused',paused);
 keys.clear();motion.reset({facing:playerHeading});motionState=motion.snapshot();
 heroHeightOffset=0;currentTravelSpeed=0;
 if(paused){
  pauseBeganAt=performance.now();pauseReturnFocus=document.activeElement;
  $('panel').classList.remove('open');$('pauseResume').focus({preventScroll:true});
 }else{
  accumulatedPauseMs+=Math.max(0,performance.now()-pauseBeganAt);pauseBeganAt=0;
  const el=pauseReturnFocus&&pauseReturnFocus.isConnected?pauseReturnFocus:canvas;
  el?.focus?.({preventScroll:true});pauseReturnFocus=null;
 }
 return paused;
}
function pollGamepad(){
 if(!UX)return;
 const prior=gamepadInput;
 gamepadInput=UX.sampleGamepad(()=>navigator.getGamepads?.(),playerPreferences?.get('gamepadEnabled')!==false);
 const status=$('gamepadStatus');
 if(status){
  const value=gamepadInput.connected?'Standard gamepad detected · Start pause, B resume.':'No standard gamepad detected. Keyboard and touch remain available.';
  if(status.textContent!==value)status.textContent=value;
 }
 const rising=key=>gamepadInput[key]&&!prior[key];
 if(!started)return;
 if(rising('pause')){setPaused(!paused);return;}
 if(paused){if(rising('back'))setPaused(false);return;}
 if(heroInspection||activity)return;
 if(rising('interact')&&!worldPrimaryAction())interact();
 if(rising('jump')&&worldActive)worldPrimaryAction();
 if(rising('map')&&!backdropOpen)toggleMap();
}
function play(resume){paused=false;accumulatedPauseMs=0;pauseBeganAt=0;
 $('pauseOverlay').hidden=true;$('pauseToggle').setAttribute('aria-expanded','false');
 document.body.classList.remove('ux-game-paused');
 soundscape.unlock();frameProbe.reset();lastGpuTune=0;soundscape.setMuted(save.muted);slot=Number($('startSlot').value)||0;$('slot').value=String(slot);const loaded=resume?readSlot(slot):null;
 applyState(loaded||C.freshSave($('playerName').value));soundscape.setMuted(save.muted);started=true;$('start').classList.add('hidden');
 if(!renderer){view='2d';$('quality').value='2d';toast('2D Atlas adventure loaded. 3D requires WebGL support.');}
 else{view='3d';$('quality').value='3d';}
 persist();updateHUD();
}
function interact(){if(!started)return;
 if(touring){stopTour();toast('Scenic tour stopped.');return;}
 if(!near){const localSite=isWorld3D()&&WORLD?WORLD.closestSite(player,130):null;if(localSite){openWorldActivity(localSite);return;}toast('Move closer to a glowing landmark or a world activity site.');return;}
 const st=near;if(save.completed.includes(st.id)){if(st.id==='farm'){if(isWorld3D())openWorldActivity('farm');else openFarm();return;}
 if(st.id==='oak'){const a=C.buildHomestead(save);save=a.save;if(a.result==='built'){audioChime();toast('🏠 Your Oak Grove family cottage is built! −250 coins');persist();updateHUD();}else if(a.result==='needs-coins'){toast('🏠 Earn 250 coins from discoveries or harvesting to build your cottage.');}else{player.x=-740;player.z=-210;toast('🏠 Welcome home to your Oak Grove cottage.');}return;}
 toast(`You already visited ${st.title}.`);return;}
 save=C.completeStop(save,st.id,st.reward);selected=st.id;audioChime();toast(`${st.emoji} ${st.title} discovered! +${st.reward} coins • +120 XP`);persist();updateHUD();
 if(save.completed.length===C.STOPS.length){toast('🏆 Congratulations! You completed the River Valley Adventure Book!');}
}
function locateNearest(){let best=null,bd=Infinity;for(const s of C.STOPS){let d=Math.hypot(s.x-player.x,s.z-player.z);if(d<bd){bd=d;best=s;}}return bd<110?best:null;}
function checkNearby(){near=locateNearest();const pane=$('context');if(!started||!near||touring||activity){pane.style.display='none';return;}
 pane.style.display='block';$('nearName').textContent=near.emoji+' '+near.title;$('nearDetail').textContent=near.fact;
 $('interactBtn').textContent=save.completed.includes(near.id)?(near.id==='farm'?'🌱 Tend the family farm':near.id==='oak'?(save.homestead?'🏠 Visit your cottage':'🏠 Build your cottage (250 🪙)'):'✓ Memory in your book'):'Collect this memory ✨';}
function teleport(id){const s=C.STOPS.find(s=>s.id===id);if(!s)return;save.countyRegion='mount-vernon';scout?.reset();suspension.reset();motion.reset({facing:playerHeading});motionState=motion.snapshot();heroHeightOffset=0;player={x:s.x+60,z:s.z+44};toast(`📍 Fast traveled near ${s.title}`);persist();checkNearby();}
function selectStop(id,fast=false){selected=id;const s=C.STOPS.find(s=>s.id===id);if(!s)return;
 if(fast)teleport(id);else toast(`${s.emoji} ${s.task} — Tap the stop again to fast travel.`);
 updateHUD();}
function setMode(mode){save.mode=mode;scout?.reset();suspension.reset();motion.reset({facing:playerHeading});motionState=motion.snapshot();heroHeightOffset=0;updateHUD();persist();toast(mode==='drive'?'🚗 Family road trip mode':'🚶 Exploring on foot');}
function toggleMap(){if(worldActive)closeWorldActivity();view=view==='2d'&&renderer?'3d':'2d';$('quality').value=view;resize();updateHUD();toast(view==='2d'?'🗺 Illustrated map view':'🌄 3D countryside view');}
function setWeather(w){weather=w;save.weather=w;document.body.classList.toggle('rainy',w==='rain');document.body.classList.toggle('misty',w==='mist');persist();updateHUD();}
function setSeason(s){season=s;save.season=s;needsMap=true;persist();updateHUD();for(const mesh of terrainMeshes){const po=mesh.geometry.attributes.position,color=mesh.geometry.attributes.color,tmp=new G.Color();for(let i=0;i<po.count;i++){let rgb=themeHeight(po.getY(i));tmp.setRGB(rgb[0]/255,rgb[1]/255,rgb[2]/255,G.SRGBColorSpace);color.setXYZ(i,tmp.r,tmp.g,tmp.b);}color.needsUpdate=true;}
 if(terrainTransition&&terrainTransition.status().pending)terrainTransition.cancel();
 applyTerrainLOD(true);
 refreshVegetation(true);
}
// Live-world activities: gameplay, 3D props and persistence share existing ValleyCore rules.
// The accessible illustrated fallback keeps its original minigame panels.
function isWorld3D(){return !!(worldGame&&renderer&&view==='3d');}
function closeWorldActivity(){worldActive=null;worldHuntRound=null;worldFishRound=null;$('worldActivityHud').hidden=true;}
function openWorldActivity(id){
 if(!started){toast('Start your adventure first.');return;}
 if(!isWorld3D()){openActivity(id==='farm'?'cook':id);if(id==='farm'){closeActivity();openFarm();}return;}
 if(!WORLD.SITES[id])return;
 closeActivity();$('farmPanel').classList.remove('open');$('panel').classList.remove('open');closeCinema();
 if(save.mode==='drive'){save.mode='walk';updateHUD();}
 const loc=WORLD.SITES[id];save.countyRegion='mount-vernon';worldActive=id;worldHuntRound=null;worldFishRound=null;worldAim=.5;worldStatus='';
 const approach=WORLD.approachSite(id,cameraYaw,34);motion.reset({facing:cameraYaw});heroHeightOffset=0;motionState=motion.snapshot();player.x=approach.x;player.z=approach.z;playerHeading=cameraYaw;cameraDist=Math.min(cameraDist,43);
 $('worldAim').value='50';$('worldActivityHud').hidden=false;
 showWorldActivity();persist();toast(`🌍 ${loc.title}: play right inside the 3D world.`);
}
function worldAction(action){
 if(!worldActive||!isWorld3D())return;
 if(action==='cast'||action==='reel')cueHero('fish',action==='cast'?1000:640);
 if(action==='track'||action==='shoot')cueHero('hunt',700);
 if(action==='plot'||action.startsWith('plot-')||action==='water')cueHero('farm',950);
 if(action==='cook'||C.RECIPES[action])cueHero('cook',1400);
 const now=Date.now();let r;
 if(worldActive==='hunt'){
  if(action==='track'){const list=['deer','turkey','rabbit'];const baseTarget=.18+rand()*.64;worldHuntRound={target:baseTarget,baseTarget,startedAt:now,kind:list[Math.floor(rand()*list.length)],expiresAt:now+12000};worldStatus='Track the moving wildlife target. Slide the gold marker to align, then take your shot.';}
  if(action==='shoot'&&worldHuntRound){worldHuntRound.target=WORLD.huntTargetAt(worldHuntRound,now);r=C.huntShot(save,worldAim,worldHuntRound.target,now,worldHuntRound.expiresAt);save=r.save;worldStatus=r.result==='hit'?'🎯 Wildlife challenge complete! +1 virtual game · 35 coins · 60 XP.':r.result==='missed'?'Clean miss. Try tracking again.':'The wildlife moved on. Track again.';worldHuntRound=null;if(r.result==='hit')audioChime();}
 }else if(worldActive==='fish'){
  if(action==='cast'){
   const kinds=['bluegill','channelCatfish','bass'];
   worldFishRound=SKILLS.newFishingRound(now+1550+Math.floor(rand()*2400),kinds[Math.floor(rand()*3)]);
   worldStatus='Line in the water. Wait for the bobber to dip, then hook and manage the line.';
  }
  if(action==='reel'&&worldFishRound){
   const species=worldFishRound.kind;
   const attempt=SKILLS.reel(worldFishRound,now,worldAim);
   worldFishRound=attempt.round;
   if(attempt.result==='landed'){
    r=C.landFish(save,species);save=r.save;
    worldStatus=`🐟 Landed ${species}! +1 fish · 30 coins · 55 XP.`;
    worldFishRound=null;audioChime();
   }else if(attempt.result==='hooked')worldStatus='Fish hooked! Keep the slider near the moving tension target and reel three good times.';
   else if(attempt.result==='good-reel')worldStatus=`Good reel! ${worldFishRound.progress}/3 · keep the line steady.`;
   else if(attempt.result==='slack-or-strain')worldStatus='Uneven tension. Follow the changing target and try again.';
   else if(attempt.result==='early')worldStatus='Not biting yet. Watch the bobber before hooking.';
   else if(attempt.result==='cooldown')worldStatus='Let the reel settle briefly.';
   else if(['escaped','line-broke'].includes(attempt.result)){worldFishRound=null;worldStatus='The fish got away. Cast again.';}
  }
 }else if(worldActive==='farm'){
  if(action==='water')r=C.waterFarm(save,now);
  if(action==='plot'||action.startsWith('plot-')){
   const chosen=action.startsWith('plot-')?SKILLS.farmPlotIndex(Number(action.slice(5))):null;
   const plot=chosen===null?WORLD.farmPick(save,now).index:chosen;
   r=C.farmAction(save,plot,now);
  }
  if(r){save=r.save;worldStatus=({'planted':'🌱 Seeds planted in the visible field.','harvested':'🌽 Harvested corn! +45 coins · 45 XP.','watered':'💧 Growing crops watered.','growing':'The crops are still growing.','needs-coins':'You need more coins. Collect a discovery stamp first.','none':'Plant some corn before watering.'})[r.result]||r.result;if(r.result==='harvested')audioChime();}
 }else if(worldActive==='cook'){
  if(C.RECIPES[action]){r=C.cookRecipe(save,action);save=r.save;worldStatus=r.result==='cooked'?`🍲 ${C.RECIPES[action].title} is ready! Added to your saved pantry.`:'You need more ingredients. Fish and farm in the world first.';if(r.result==='cooked')audioChime();}
 }
 showWorldActivity();updateHUD();persist();
}
function adjustWorldAim(delta){
 if(!worldActive||!Number.isFinite(delta))return;
 worldAim=C.clamp(worldAim+delta,0,1);
 $('worldAim').value=String(Math.round(worldAim*100));
}
function worldPrimaryAction(){if(!worldActive)return false;
 if(worldActive==='hunt')worldAction(worldHuntRound?'shoot':'track');
 if(worldActive==='fish')worldAction(worldFishRound?'reel':'cast');
 if(worldActive==='farm')worldAction('plot');
 if(worldActive==='cook'){const recipe=Object.keys(C.RECIPES).find(id=>Object.entries(C.RECIPES[id].ingredients).every(([k,n])=>save.inventory[k]>=n));worldAction(recipe||'fishFry');}
 return true;
}
function showWorldActivity(){
 const id=worldActive;if(!id)return;const place=WORLD.SITES[id];$('worldActivityTitle').textContent=place.label+' · '+place.title;
 const pantry=`Pantry: 🌽 ${save.inventory.corn} · 🐟 ${save.inventory.fish} · 🦌 ${save.inventory.game} · 🍲 ${save.inventory.meals}`;
 let text='',actions=[],aim=(id==='hunt'&&!!worldHuntRound)||(id==='fish'&&worldFishRound?.phase==='fight');
 if(id==='hunt'){text='Track deer, turkey, or rabbit models moving through the clearing. Align the 3D gold targeting ring with the animal; no gore.';actions=worldHuntRound?[['shoot','🎯 Take shot']]:[['track','🔭 Track wildlife']];}
 if(id==='fish'){
  text='Fish from the real-time 3D pier. Hook when the bobber dips, then align line tension with the moving target and complete three controlled reels.';
  actions=worldFishRound?[['reel',worldFishRound.phase==='fight'?'🧵 Reel at the target':'🎣 Hook on the bite']]:[['cast','🎣 Cast line']];
 }
 if(id==='farm'){
  const pick=WORLD.farmPick(save,Date.now());
  text='Select any of the nine terrain-aligned 3D plots. Plant, water and harvest individually; crop stages persist locally.';
  actions=[['plot',pick.action==='harvest'?'🌽 Harvest ready crop':pick.action==='plant'?'🌱 Plant next plot (15 coins)':'🌿 Check crops'],['water','💧 Water (20 coins)']];
 }
 if(id==='cook'){text='Cook beside the animated campfire in your world. Gather fish and corn first; meals are saved.';actions=Object.entries(C.RECIPES).map(([id,r])=>[id,r.title+' · '+r.coins+' coins',!Object.entries(r.ingredients).every(([k,n])=>save.inventory[k]>=n)]);}
 $('worldActivityText').textContent=text+' Controls: E/Space or gamepad X/A to act; Q/R, gamepad LB/RB or touch slider to aim. Farm: number keys 1–9 select plots.';$('worldAimLabel').hidden=!aim;
 $('worldAimTitle').textContent=id==='fish'?'Line tension — match the moving target':'Track wildlife — align the marker';
 const plots=id==='farm'?'<div class="worldFarmGrid" role="group" aria-label="Select any field">'+save.farmPlots.map((t,i)=>
  `<button class="farmPlotButton" data-worldaction="plot-${i}" aria-label="Field ${i+1}">${t===0?'🌱':t>Date.now()?'🌿':'🌽'} Plot ${i+1}</button>`).join('')+'</div>':'';
 $('worldActionButtons').innerHTML=actions.map(([action,label,disabled],i)=>`<button ${disabled?'disabled':''} class="${i===0?'primaryAction':''}" data-worldaction="${action}">${label}</button>`).join('')+plots;
 $('worldActivityMeter').textContent=worldStatus?worldStatus+' · '+pantry:pantry;
}
function updateWorldHUD(){if(!worldActive)return;const now=Date.now();const label=$('worldActivityMeter');
 if(worldHuntRound){worldHuntRound.target=WORLD.huntTargetAt(worldHuntRound,now);
  const left=Math.max(0,(worldHuntRound.expiresAt-now)/1000);
  const hint=save.pet?COMPANION.hint(worldAim,worldHuntRound.target):null;
  label.textContent=`Wildlife tracking · ${left.toFixed(1)}s left · Aim ${(worldAim*100).toFixed(0)}% · ${hint==='close'?'🐕 Scout: near the trail':hint==='left'?'🐕 Scout: look left':hint==='right'?'🐕 Scout: look right':'Track by eye'}`;
 if(left===0){worldHuntRound=null;worldStatus='Time elapsed. The animal moved away.';showWorldActivity();}}
 else if(worldFishRound){
  const cue=SKILLS.fishCue(worldFishRound,now);
  if(cue.phase==='fight'){
   label.textContent=`🎣 Reel ${cue.progress}/3 · Aim ${Math.round(worldAim*100)}% · tension target ${Math.round(cue.target*100)}% · strain ${Math.round(cue.tension*100)}%`;
   $('worldAimLabel').hidden=false;
  }else label.textContent=cue.phase==='waiting'?'🌊 Watch the 3D bobber…':now<=worldFishRound.biteAt+1100?'⚡ BITE! HOOK NOW!':'💨 Fish gone. Reel to reset, or cast again.';
 }
}
function renderFarm(){
 const now=Date.now();$('farmGrid').innerHTML=save.farmPlots.map((t,i)=>{
  const ready=t>0&&t<=now, growing=t>now;
  return `<button data-plot="${i}" title="Field ${i+1}">${ready?'🌽':growing?'🌱':'🟫'}<small>${ready?'Harvest +45':growing?Math.ceil((t-now)/1000)+'s until ready':'Plant −15 🪙'}</small></button>`;
 }).join('');
}
function openFarm(){$('farmPanel').classList.add('open');renderFarm();toast('🌽 Welcome to the Valley Farm.');}
function activityStatus(message){const el=$('activityStatus');if(el)el.textContent=message;}
function closeActivity(){activity=null;huntRound=null;fishRound=null;$('activityPanel').classList.remove('open');if(activityInterval){clearInterval(activityInterval);activityInterval=null;}}
function renderActivity(){
 if(!activity)return;
 const d=$('activityContent');
 const heading={hunt:'🦌 Woodland Hunt',fish:'🎣 River Fishing',cook:'🍳 Campfire Kitchen'};
 $('activityTitle').textContent=heading[activity];
 const pantry=`<div class="activityPantry">Pantry: 🌽 ${save.inventory.corn} corn · 🐟 ${save.inventory.fish} fish · 🦌 ${save.inventory.game} game · 🍲 ${save.inventory.meals} meals</div>`;
 if(activity==='hunt'){
  const active=huntRound&&Date.now()<huntRound.expiresAt;
  d.innerHTML=`<p>Spot a virtual animal on the woodland trail, carefully line up the aim marker and take one shot before the eight-second round ends. Non-graphic family game, not real hunting guidance.</p>
  <canvas class="activityCanvas" id="activityScene" width="960" height="320" aria-label="Animated woodland target challenge"></canvas>
  ${active?`<div class="aimLane"><span class="targetAnimal" style="left:${huntRound.target*100}%">${huntRound.kind}</span></div><label for="aimSlider">Aim along the trail</label><input id="aimSlider" type="range" min="0" max="100" value="50"><p class="roundTimer" id="roundTimer"></p><button class="actionPrimary" id="takeShot">🎯 Take shot</button>`:`<button class="actionPrimary" id="trackAnimal">🔭 Track a virtual animal</button>`}${pantry}`;
  if(active){$('takeShot').onclick=()=>{const a=C.huntShot(save,Number($('aimSlider').value)/100,huntRound.target,Date.now(),huntRound.expiresAt);save=a.save;huntRound=null;audioChime();renderActivity();activityStatus(a.result==='hit'?'🎯 Great shot! +1 game, +35 coins and +60 XP.':a.result==='expired'?'The animal moved away. Track another.':'A clean miss. Try another track.');updateHUD();persist();};}
  else $('trackAnimal').onclick=()=>{const species=['🦌 Deer','🦃 Turkey','🐇 Rabbit'];huntRound={target:.18+rand()*.64,expiresAt:Date.now()+8000,kind:species[Math.floor(rand()*3)]};renderActivity();activityStatus('Find the animal and line up the marker.');};
 }else if(activity==='fish'){
  const active=!!fishRound;
  d.innerHTML=`<p>Cast into an imaginary Ohio River backwater. Wait until the bobber shows a bite, then tap REEL! within about one second. Try bluegill, channel catfish or bass.</p>
  <canvas class="activityCanvas" id="activityScene" width="960" height="320" aria-label="Animated river fishing scene"></canvas><div class="biteMessage" id="biteMessage">${active?'Watch the float...':'A quiet morning on the river.'}</div>
  <button class="actionPrimary" id="${active?'reelBtn':'castBtn'}">${active?'🎣 REEL!':'🎣 Cast your line'}</button>${pantry}`;
  if(active){$('reelBtn').onclick=()=>{const a=C.fishReel(save,fishRound.biteAt,Date.now(),fishRound.kind);const kind=fishRound.kind;save=a.save;fishRound=null;renderActivity();activityStatus(a.result==='caught'?`🐟 Landed a ${kind==='channelCatfish'?'channel catfish':kind}! +1 fish, +30 coins, +55 XP.`:a.result==='early'?'Too early! The bobber was still quiet.':'Too late! The fish swam away.');if(a.result==='caught')audioChime();updateHUD();persist();};}
  else $('castBtn').onclick=()=>{const kinds=['bluegill','channelCatfish','bass'];fishRound={biteAt:Date.now()+1700+Math.floor(rand()*2300),kind:kinds[Math.floor(rand()*3)]};renderActivity();activityStatus('Watch the bobber closely.');};
 }else{
  d.innerHTML=`<p>Turn your own harvested corn and your catches into comfort food. Cooking consumes ingredients and earns coins and experience.</p><canvas class="activityCanvas" id="activityScene" width="960" height="320" aria-label="Animated campfire kitchen scene"></canvas>${Object.entries(C.RECIPES).map(([id,r])=>{
   const ingredients=Object.entries(r.ingredients).map(([k,n])=>`${n} ${k}`).join(' + ');
   const can=Object.entries(r.ingredients).every(([k,n])=>save.inventory[k]>=n);
   return `<button class="recipe" data-recipe="${id}" ${can?'':'disabled'}><b>${r.title}</b><small>${ingredients} → +${r.coins} 🪙 · +${r.xp} XP ${can?'':'· ingredients needed'}</small></button>`;
  }).join('')}${pantry}`;
  d.querySelectorAll('[data-recipe]').forEach(b=>b.addEventListener('click',()=>{const r=C.cookRecipe(save,b.dataset.recipe);save=r.save;renderActivity();activityStatus(r.result==='cooked'?'🍲 Delicious! Your meal is ready and your family earned rewards.':'Gather more ingredients first.');if(r.result==='cooked')audioChime();updateHUD();persist();}));
 }
 if(!$('activityStatus'))d.insertAdjacentHTML('beforeend','<div id="activityStatus" role="status" class="activityStatus"></div>');
}
function openActivity(id){if(!started){toast('Start your adventure first.');return;}$('farmPanel').classList.remove('open');$('panel').classList.remove('open');activity=id;huntRound=null;fishRound=null;$('activityPanel').classList.add('open');renderActivity();
 if(activityInterval)clearInterval(activityInterval);activityInterval=setInterval(()=>{
 if(activity==='hunt'&&huntRound){const secs=Math.max(0,(huntRound.expiresAt-Date.now())/1000);const timer=$('roundTimer');if(timer)timer.textContent=`Time left: ${secs.toFixed(1)} seconds`;if(secs===0){huntRound=null;renderActivity();activityStatus('The animal has moved on. Track again.');}}
 if(activity==='fish'&&fishRound){const t=Date.now(),msg=$('biteMessage');if(msg){msg.textContent=t<fishRound.biteAt?'🌊 Waiting for a bite...':t<=fishRound.biteAt+1100?'⚡ BITE! REEL NOW!':'💨 The fish has gone — try another cast.';msg.classList.toggle('bite',t>=fishRound.biteAt&&t<=fishRound.biteAt+1100);}}
 },85);
}
function openHeroStudio(){
 if(!started){toast('Start your adventure to view River.');return;}
 if(!renderer||view==='2d'){toast('Character Studio requires 3D WebGL. Use the illustrated view on this device.');return;}
 if(heroInspection)return;
 if(!STAGE)throw new Error('Character Studio preview module is missing');
 if(!heroPreviewStage){heroPreviewStage=STAGE.create(G,HERO);applyFamilyWardrobe(heroPreviewStage.hero);}
 if(worldActive)closeWorldActivity();
 if(touring)stopTour();
 if(activity)closeActivity();
 closeCinema();$('panel').classList.remove('open');
 previousHeroCamera={distance:cameraDist,yaw:cameraYaw};
 heroInspection=true;heroPreviewPose='idle';$('heroAngle').value='front';heroPreviewStage?.setAngle('front');heroPreviewStage?.setSkeletonVisible(false);$('heroShowSkeleton').checked=false;$('heroStudio').classList.remove('is-minimized');
 $('heroStudioToggle').textContent='Hide tools';$('heroStudioToggle').setAttribute('aria-expanded','true');
 cameraDist=30;cameraYaw=playerHeading+Math.PI;
 $('heroPose').value='idle';
 $('heroStudio').hidden=false;
 document.body.classList.add('hero-inspection');
 toast('👤 Explorer Studio: preview poses and take a photo.');
}
function closeHeroStudio(){
 if(!heroInspection)return;
 heroInspection=false;
 $('heroStudio').hidden=true;
 document.body.classList.remove('hero-inspection');
 if(previousHeroCamera){
  cameraDist=previousHeroCamera.distance;
  cameraYaw=previousHeroCamera.yaw;
  previousHeroCamera=null;
 }
}
function screenshot(){if(!started)return;
 try{if(renderer&&view==='3d'){if(heroInspection&&heroPreviewStage)heroPreviewStage.render(renderer);else renderer.render(scene,camera);}else update2d();const a=document.createElement('a');a.download=`River-Valley-Family-${Date.now()}.png`;a.href=(view==='2d'||!renderer?atlas:canvas).toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();toast('📷 Photo saved to your device (if supported by your browser).');}
 catch(err){toast('Photo unavailable in this browser. Try your device screenshot controls.');}
}
function startTour(){if(!started)return;if(touring){stopTour();return;}closeWorldActivity();motion.reset({facing:playerHeading});motionState=motion.snapshot();heroHeightOffset=0;touring=true;tourAt=0;tourTimer=0;tourFrom={...player};
 if(G&&G.CatmullRomCurve3){const points=[new G.Vector3(player.x,0,player.z),...C.STOPS.map(st=>new G.Vector3(st.x,0,st.z))];tourCurve=new G.CatmullRomCurve3(points,false,'centripetal',.25);}else tourCurve=null;
 $('tourBtn').classList.add('selected');toast('🎬 Smooth scenic fly-through started. Tap Tour to stop.');}
function stopTour(){touring=false;motion.reset({facing:playerHeading});motionState=motion.snapshot();heroHeightOffset=0;$('tourBtn').classList.remove('selected');}
function stepTour(dt){if(!touring)return;
 if(tourCurve){tourTimer+=dt;const t=C.clamp(tourTimer/34,0,1),p=tourCurve.getPoint(t),tangent=tourCurve.getTangent(t);
  player.x=p.x;player.z=p.z;cameraYaw=Math.atan2(-tangent.x,-tangent.z);cameraDist=105;
  if(t>=1){stopTour();toast('🎬 Scenic tour completed.');}
  return;
 }
 let dst=C.STOPS[tourAt%C.STOPS.length];tourTimer+=dt;let t=C.clamp(tourTimer/4,0,1),s=t*t*(3-2*t);
 player.x=tourFrom.x+(dst.x-tourFrom.x)*s;player.z=tourFrom.z+(dst.z-tourFrom.z)*s;cameraYaw+=dt*.06;
 if(t>=1){tourAt++;tourTimer=0;tourFrom={...player};if(tourAt>=C.STOPS.length){stopTour();toast('🎬 Scenic tour completed.');}}
}
function update(dt,stamp){
 if(!started||paused)return;
 if(heroInspection||activity){motion.reset({facing:playerHeading});motionState=motion.snapshot();heroHeightOffset=0;currentTravelSpeed=0;return;}
 currentTravelSpeed=0;
 if(touring){motion.reset({facing:playerHeading});motionState=motion.snapshot();heroHeightOffset=0;stepTour(dt);}else{
  // Standard gamepad right stick is camera look; shoulder buttons control
  // the shared targeting/tension slider during real 3D activities.
  if(gamepadInput.connected){
   cameraYaw-=gamepadInput.lookX*dt*2.1;
   if(!worldActive)cameraDist=C.clamp(cameraDist+gamepadInput.lookY*dt*50,42,310);
   if(worldActive&&gamepadInput.aimLeft!==gamepadInput.aimRight)
    adjustWorldAim((gamepadInput.aimRight?1:-1)*dt*.63);
  }
  let x=0,z=0;
  if(keys.has('w')||keys.has('arrowup')||keys.has('up'))z-=1;
  if(keys.has('s')||keys.has('arrowdown')||keys.has('down'))z+=1;
  if(keys.has('a')||keys.has('arrowleft')||keys.has('left'))x-=1;
  if(keys.has('d')||keys.has('arrowright')||keys.has('right'))x+=1;
  // Preserve keyboard priority while held; standard gamepad axes remain analog.
  if(x===0&&z===0&&gamepadInput.connected){x=gamepadInput.x;z=gamepadInput.z;}
  motionState=motion.step({dt,position:player,inputX:x,inputZ:z,cameraYaw,sprint:keys.has('shift')||gamepadInput.sprint,drive:save.mode==='drive',jump:(keys.has('j')||gamepadInput.jump)&&save.mode==='walk'&&!worldActive});
  const resolved=collisionWorld.move(player,{x:motionState.x,z:motionState.z},{groundAt:height,airborne:motionState.airborne,drive:save.mode==='drive'});
  lastCollision=resolved;
  player.x=resolved.x;player.z=resolved.z;playerHeading=motionState.heading;
  if(resolved.blocked)motion.reset({facing:playerHeading});
  currentTravelSpeed=resolved.blocked?0:motionState.speed;heroHeightOffset=motionState.heightOffset;
  if(save.mode==='walk'&&currentTravelSpeed>3&&!motionState.airborne&&stamp-lastFootstepAt>270){
   const step=soundscape.footstep({x:player.x,z:player.z,weather,speed:currentTravelSpeed,stamp});
   if(step)lastFootstepAt=stamp;
  }
  if(stamp%10000<100)soundscape.ambient({x:player.x,z:player.z,weather,stamp});
 }
 time=(time+dt*.003)%24;
 if(stamp-lastUI>280){checkNearby();updateWorldHUD();updateHUD();mapDraw(mapCtx,mapCanvas.width,mapCanvas.height,false);if($('farmPanel').classList.contains('open'))renderFarm();lastUI=stamp;}
 if(stamp-lastPersist>12000){persist();lastPersist=stamp;}
}
function loadCinemaPrefs(){try{cinemaPrefs=DIR.cleanSettings(JSON.parse(localStorage.getItem('river-valley-vfx-director')||'{}'));}catch(_){cinemaPrefs=DIR.cleanSettings({});} syncCinemaControls();}
function saveCinemaPrefs(){try{localStorage.setItem('river-valley-vfx-director',JSON.stringify(cinemaPrefs));}catch(_){} }
function syncCinemaControls(){if(!DIR)return;cinemaPrefs=DIR.cleanSettings(cinemaPrefs);$('cineLook').value=cinemaPrefs.look;$('cineQuality').value=cinemaPrefs.quality;$('cineStrength').value=Math.round(cinemaPrefs.strength*100);$('cineStrengthLabel').textContent=Math.round(cinemaPrefs.strength*100)+'%';$('cineGrain').checked=cinemaPrefs.grain;$('cineStats').checked=cinemaPrefs.showStats;const grade=DIR.pickLook(cinemaPrefs.look).grade;document.body.style.setProperty('--cine-grade',grade);document.body.classList.toggle('cine-grade',grade!=='none');$('perfHUD').classList.toggle('visible',cinemaPrefs.showStats);}
function chooseCinemaLook(id){if(!DIR)return;cinemaPrefs.look=id;const shot=DIR.pickLook(id);time=shot.time;$('time').value=String(time);$('timeLabel').textContent=C.formatTime(time);setWeather(shot.weather);syncCinemaControls();saveCinemaPrefs();persist();toast('🎥 '+shot.title+' shot ready.');}
function openCinema(){closeActivity();$('panel').classList.remove('open');$('cinemaPanel').classList.add('open');}
function closeCinema(){$('cinemaPanel').classList.remove('open');}
function applyShot(index){
 shotIndex=((index%SHOTS.length)+SHOTS.length)%SHOTS.length;
 const shot=SHOTS[shotIndex];backdropLocation=shot.scene;$('stageScene').value=shot.scene;
 chooseCinemaLook(shot.look);$('stageShotLabel').textContent=shot.title;
 $('stageShotCount').textContent=(shotIndex+1)+' / '+SHOTS.length;backdropLast=0;
}
function startStopShotTour(){
 shotPlaying=!shotPlaying;
 $('stageTour').textContent=shotPlaying?'⏸ Pause tour':'▶ Play scenic tour';
 if(shotPlaying){applyShot(shotIndex);shotStart=performance.now();}
}
function exportShotBoard(){
 if(!STORY)return;
 try{
  const board=document.createElement('canvas');board.width=1280;board.height=2250;
  const ctx=board.getContext('2d');if(!ctx)return;
  ctx.fillStyle='#071d25';ctx.fillRect(0,0,board.width,board.height);
  ctx.fillStyle='#f1d49e';ctx.font='bold 37px Georgia';ctx.fillText('RIVER VALLEY · DIRECTOR SHOT BOARD',40,56);
  const frame=document.createElement('canvas');
  SHOTS.forEach((shot,i)=>{
   STORY.render(frame,shot.scene,shot.look,0,'balanced');
   const x=i%2*626+22,y=Math.floor(i/2)*695+90;
   ctx.drawImage(frame,x,y,606,342);
   ctx.fillStyle='#f7e6bd';ctx.font='bold 19px system-ui';ctx.fillText(shot.title,x+8,y+373);
   ctx.fillStyle='#93b8b0';ctx.font='14px system-ui';ctx.fillText('Scenic 2D concept · '+shot.look,x+8,y+396);
  });
  ctx.fillStyle='#b4c4bf';ctx.font='15px system-ui';ctx.fillText('Original procedural look development · not hardware-rendered 3D',28,2220);
  const link=document.createElement('a');link.download='River_Valley_Director_Shot_Board.png';link.href=board.toDataURL('image/png');document.body.appendChild(link);link.click();link.remove();toast('🎬 Your five-shot board has been exported.');
 }catch(_){toast('Storyboard export was blocked in this browser.');}
}
function openBackdrop(){if(!STORY)return;backdropOpen=true;shotPlaying=false;shotIndex=0;closeCinema();$('stagePanel').classList.add('open');$('stageTour').textContent='▶ Play scenic tour';applyShot(0);backdropLast=0;}
function closeBackdrop(){backdropOpen=false;shotPlaying=false;$('stagePanel').classList.remove('open');}
function captureBackdrop(){if(!STORY||!backdropOpen)return;try{const a=document.createElement('a');a.download='river-valley-'+backdropLocation+'-'+cinemaPrefs.look+'.png';a.href=$('stageCanvas').toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();toast('📷 Your original cinematic postcard is ready.');}catch(_){toast('The browser blocked image downloads. Try desktop Chrome/Edge.');}}
function updateCinema(stamp){if(!DIR)return;const budget=DIR.pickQuality(cinemaPrefs.quality),dt=1000/budget.maxFPS;if(stamp-directorLastFX>=dt){DIR.draw2D($('cinemaFX'),cinemaPrefs,stamp,{weather,time,season,width:innerWidth,height:innerHeight});directorLastFX=stamp;}perfFrames++;if(!perfSince)perfSince=stamp;if(stamp-perfSince>850){perfFPS=Math.round(perfFrames*1000/Math.max(1,stamp-perfSince));perfSince=stamp;perfFrames=0;if(cinemaPrefs.showStats){const r=renderer?.info?.render||{};$('perfHUD').textContent='FPS '+perfFPS+' · '+(renderer&&view==='3d'?'3D':'2D')+'\nDraw calls '+(r.calls||0)+' · Tris '+(r.triangles||0)+'\nTerrain '+terrainStats.tiles+' tiles · Effects '+budget.particles+'\nTerrain buffers ≤ '+(terrainMemoryEstimate().estimatedGeometryBytes/1048576).toFixed(1)+' / '+(terrainGeometryBudgetBytes/1048576)+' MiB';}}}
function renderMinigameScene(stamp){
 if(!activity||!VFX)return;
 const aim=$('aimSlider')?Number($('aimSlider').value)/100:.5;
 VFX.render($('activityScene'),activity,stamp,{aim,target:huntRound?.target,kind:huntRound?.kind,biting:!!(fishRound&&Date.now()>=fishRound.biteAt&&Date.now()<=fishRound.biteAt+1100)});
}
function loop(wallStamp){
 const stamp=wallStamp-accumulatedPauseMs;
 const rawFrameMs=lastFrame?wallStamp-lastFrame:16;
 const dt=Math.min(.065,Math.max(.001,(wallStamp-lastFrame)/1000||.016));lastFrame=wallStamp;
 pollGamepad();
 if(paused){requestAnimationFrame(loop);return;}
 if(started){update(dt,stamp);if(renderer&&view==='3d')updateVisuals(dt,stamp);else update2d();}
 else if(renderer&&view!=='2d'){updateVisuals(dt,stamp);}
 if(started&&view==='3d'){
  if(stamp-lastProbeSceneAt>=650){
   lastProbeSceneAt=stamp;
   if(save.countyRegion!=='mount-vernon')probeScene=save.countyRegion;
   else{
    const nearest=C.STOPS.reduce((best,p)=>Math.hypot(p.x-player.x,p.z-player.z)<best.dist?
     {id:p.id,dist:Math.hypot(p.x-player.x,p.z-player.z)}:best,{id:'courthouse',dist:Infinity});
    probeScene=nearest.id==='farm'?'farmland':nearest.id==='riverfront'||nearest.id==='dock'?'riverbank':
     nearest.id==='oak'||nearest.id==='trail'?'woods':'downtown';
   }
  }
  frameProbe.observe(rawFrameMs,{stamp:wallStamp,drawCalls:renderer?.info?.render?.calls||0,
   triangles:renderer?.info?.render?.triangles||0,x:player.x,z:player.z,scene:probeScene,mode:save.mode,
   quality:visualEffects,terrainTiles:terrainStats.tiles,terrainQueued:terrainTransition?.status().queued||0});
  if(renderer&&stamp-lastGpuTune>4000&&frameProbe.summary().samples>90){
   const perf=frameProbe.summary(),target=perf.meanFPS<24?Math.min(1,devicePixelRatio||1):perf.meanFPS>38?Math.min(1.25,devicePixelRatio||1):activePixelRatio;
   if(Math.abs(target-activePixelRatio)>.05){activePixelRatio=target;renderer.setPixelRatio(activePixelRatio);renderer.setSize(innerWidth,innerHeight,false);}
   lastGpuTune=stamp;
  }
 }
 if(renderer&&view==='3d'&&terrainDetail==='auto'&&streamingGovernor){const budget=streamingGovernor.observe(rawFrameMs,stamp);if(budget.changed)applyTerrainLOD(true);}
 renderMinigameScene(stamp);updateCinema(stamp);if(backdropOpen&&STORY&&stamp-backdropLast>66){if(shotPlaying&&stamp-shotStart>=SHOT_DURATION){applyShot(shotIndex+1);shotStart=stamp;}STORY.render($('stageCanvas'),backdropLocation,cinemaPrefs.look,stamp,cinemaPrefs.quality);backdropLast=stamp;}requestAnimationFrame(loop);
}
function refreshImportedHeroStudio(){
 if(heroPreviewStage){heroPreviewStage.dispose();heroPreviewStage=null;}
 if(heroInspection&&renderer&&STAGE){
  heroPreviewStage=STAGE.create(G,HERO);applyFamilyWardrobe(heroPreviewStage.hero);
  heroPreviewStage.setSkeletonVisible($('heroShowSkeleton').checked);
 }
}
function restoreLocalCustomHero(){
 if(!CUSTOM_HERO)return;
 try{
  const raw=localStorage.getItem(CUSTOM_HERO.STORAGE_KEY);
  if(!raw)return;
  const file=CUSTOM_HERO.fromBase64(raw);
  window.ValleyRiggedHeroOverrideData=raw;
  $('customHeroStatus').textContent='Saved local River Explorer restored ('+Math.round(file.byteLength/1024)+' KiB).';
 }catch(err){
  window.ValleyRiggedHeroOverrideData=null;
  $('customHeroStatus').textContent='Saved custom GLB could not load: '+String(err.message)+'. Built-in character retained.';
 }
}
async function importRiggedHero(file){
 if(!file||!CUSTOM_HERO)return;
 const status=$('customHeroStatus');
 status.textContent='Validating local 3D asset and its 27-joint rig…';
 try{
  if(file.size>CUSTOM_HERO.MAX_BYTES)throw Error('File exceeds 4 MB offline import limit');
  const raw=await file.arrayBuffer();
  const report=CUSTOM_HERO.validate(raw);
  const encoded=CUSTOM_HERO.toBase64(raw);
  const previous=window.ValleyRiggedHeroOverrideData;
  window.ValleyRiggedHeroOverrideData=encoded;
  try{
   updateHeroGeometryQuality();
   if(renderer&&heroController?.lod!=='CUSTOM')throw Error('Game rejected custom rig; original retained');
   refreshImportedHeroStudio();
  }catch(error){
   window.ValleyRiggedHeroOverrideData=previous;
   updateHeroGeometryQuality();
   throw error;
  }
  let persistent=false;
  try{localStorage.setItem(CUSTOM_HERO.STORAGE_KEY,encoded);persistent=true;}catch(_){}
  status.textContent='Custom playable GLB active · '+report.joints+' bones · '+report.clips+' clips · '+report.triangles.toLocaleString()+' triangles'+(persistent?' · saved on this device':' · session only; offline storage unavailable');
  toast('Custom rigged Explorer activated for this device.');
 }catch(err){
  status.textContent='Custom character not applied: '+String(err.message)+'. For unrigged files, use the auto-rig conversion package first.';
  console.warn('Custom GLB rejected without replacing verified hero:',err);
 }
}
function bindUI(){
 $('pauseToggle').addEventListener('click',()=>setPaused(!paused));
 $('pauseResume').addEventListener('click',()=>setPaused(false));
 $('pauseSave').addEventListener('click',()=>{if(started){persist();toast('Progress saved on this device.');}});
 $('customHeroFile').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)void importRiggedHero(file);});
 $('customScoutFile').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)void importStaticScout(file);});
 $('clearCustomScout').addEventListener('click',()=>{clearStaticScout();try{localStorage.removeItem(SCOUT_GLB_KEY);}catch(_){}$('customScoutFile').value='';$('customScoutStatus').textContent='Animated built-in Scout restored.';});
 $('clearCustomHero').addEventListener('click',()=>{
  window.ValleyRiggedHeroOverrideData=null;
  try{localStorage.removeItem(CUSTOM_HERO.STORAGE_KEY);}catch(_){}
  updateHeroGeometryQuality();refreshImportedHeroStudio();
  $('customHeroFile').value='';
  $('customHeroStatus').textContent='Built-in original rig restored. Use the file picker to test another rigged GLB.';
 });
 $('heroShowSkeleton').addEventListener('change',e=>heroPreviewStage?.setSkeletonVisible(e.target.checked));
 $('heroStudioOpen').addEventListener('click',openHeroStudio);$('heroStudioToggle').addEventListener('click',()=>{
  const panel=$('heroStudio'),collapsed=panel.classList.toggle('is-minimized'),toggle=$('heroStudioToggle');
  toggle.textContent=collapsed?'Show tools':'Hide tools';
  toggle.setAttribute('aria-expanded',String(!collapsed));
  toggle.setAttribute('aria-label',collapsed?'Show character studio tools':'Hide character studio tools');
 });$('heroStudioClose').addEventListener('click',closeHeroStudio);$('heroStudioDone').addEventListener('click',closeHeroStudio);$('heroPhoto').addEventListener('click',screenshot);$('heroPose').addEventListener('change',e=>{if(HERO.STATES.includes(e.target.value))heroPreviewPose=e.target.value;});$('heroFocus').addEventListener('change',e=>heroPreviewStage?.setFocus(e.target.value));$('heroAngle').addEventListener('change',e=>heroPreviewStage?.setAngle(e.target.value));
 $('playBtn').addEventListener('click',()=>play(false));$('resumeBtn').addEventListener('click',()=>play(true));
 $('walkBtn').addEventListener('click',()=>setMode('walk'));$('driveBtn').addEventListener('click',()=>setMode('drive'));
 $('countyBtn').addEventListener('click',openCounty);$('countyClose').addEventListener('click',closeCounty);
 $('countyDismiss').addEventListener('click',closeCounty);$('countyVisit').addEventListener('click',travelCounty);
 $('countyRegionList').addEventListener('click',e=>{const button=e.target.closest('[data-region]');if(!button)return;countySelected=button.dataset.region;drawCounty();});
 $('countyMapCanvas').addEventListener('pointerup',e=>{
  const rect=e.currentTarget.getBoundingClientRect(),canvas=e.currentTarget;
  const p=COUNTY?.pickTown((e.clientX-rect.left)*canvas.width/rect.width,(e.clientY-rect.top)*canvas.height/rect.height,
    {width:canvas.width,height:canvas.height},COUNTY_DATA);
  if(p){countySelected=p.id;drawCounty();}
 });
 $('scoutBtn').addEventListener('click',openScout);$('scoutClose').addEventListener('click',()=>$('scoutPanel').hidden=true);
 $('scoutPanel').addEventListener('click',e=>{const b=e.target.closest('[data-scout]');if(b)scoutCommand(b.dataset.scout);});
 $('mapBtn').addEventListener('click',toggleMap);$('tourBtn').addEventListener('click',startTour);$('photoBtn').addEventListener('click',screenshot);
 $('huntBtn').addEventListener('click',()=>openWorldActivity('hunt'));$('fishBtn').addEventListener('click',()=>openWorldActivity('fish'));$('farmWorldBtn').addEventListener('click',()=>openWorldActivity('farm'));$('cookBtn').addEventListener('click',()=>openWorldActivity('cook'));$('closeActivity').addEventListener('click',closeActivity);$('worldClose').addEventListener('click',closeWorldActivity);$('worldActionButtons').addEventListener('click',e=>{const b=e.target.closest('[data-worldaction]');if(b)worldAction(b.dataset.worldaction);});$('worldAim').addEventListener('input',e=>{worldAim=Number(e.target.value)/100;});
 $('settingsBtn').addEventListener('click',()=>{closeCinema();$('panel').classList.toggle('open');});
 $('closePanel').addEventListener('click',()=>$('panel').classList.remove('open'));
 $('openCinema').addEventListener('click',openCinema);$('closeCinema').addEventListener('click',closeCinema);$('openStage').addEventListener('click',openBackdrop);$('closeStage').addEventListener('click',closeBackdrop);$('stageScene').addEventListener('change',e=>{shotPlaying=false;$('stageTour').textContent='▶ Play scenic tour';backdropLocation=e.target.value;$('stageShotLabel').textContent='Custom · '+STORY.SCENES[backdropLocation];$('stageShotCount').textContent='Custom';backdropLast=0;});$('stageCapture').addEventListener('click',captureBackdrop);$('stageNext').addEventListener('click',()=>{shotPlaying=false;$('stageTour').textContent='▶ Play scenic tour';applyShot(shotIndex+1);});$('stagePrev').addEventListener('click',()=>{shotPlaying=false;$('stageTour').textContent='▶ Play scenic tour';applyShot(shotIndex-1);});$('stageTour').addEventListener('click',startStopShotTour);$('stageBoard').addEventListener('click',exportShotBoard);
 $('cineLook').addEventListener('change',e=>chooseCinemaLook(e.target.value));
 $('cineGolden').addEventListener('click',()=>chooseCinemaLook('golden'));$('cineNight').addEventListener('click',()=>chooseCinemaLook('lantern'));$('cineReset').addEventListener('click',()=>chooseCinemaLook('natural'));$('cineFly').addEventListener('click',()=>{if(!started||view!=='3d'||!renderer){toast('Start the adventure in 3D view first.');return;}closeCinema();if(!touring)startTour();});
 $('cineQuality').addEventListener('change',e=>{cinemaPrefs.quality=e.target.value;syncCinemaControls();saveCinemaPrefs();toast('Graphics effect budget: '+cinemaPrefs.quality);});
 $('cineStrength').addEventListener('input',e=>{cinemaPrefs.strength=Number(e.target.value)/100;syncCinemaControls();saveCinemaPrefs();});
 for(const [id,key] of [['cineGrain','grain'],['cineStats','showStats']])$(id).addEventListener('change',e=>{cinemaPrefs[key]=e.target.checked;syncCinemaControls();saveCinemaPrefs();});
 $('weather').addEventListener('change',e=>setWeather(e.target.value));$('season').addEventListener('change',e=>setSeason(e.target.value));
 $('time').addEventListener('input',e=>{time=Number(e.target.value);save.time=time;$('timeLabel').textContent=C.formatTime(time);});$('time').addEventListener('change',()=>persist());
 $('referenceOverlay').addEventListener('change',e=>{referenceEnabled=!!e.target.checked;needsMap=true;updateReferenceDrape();toast(referenceEnabled?(referenceImage?'🛰️ Geographic overhead reference enabled. Not a surveyed terrain.':'🛰️ Reference image is not loaded yet.'):'🌾 Stylized landscape restored.');});
 $('terrainDetail').addEventListener('change',e=>{terrainDetail=e.target.value;applyTerrainLOD(true);});
 $('visualEffects').addEventListener('change',e=>{
  visualEffects=GRAPHICS?GRAPHICS.normalize(e.target.value):e.target.value;
  try{localStorage.setItem('river-valley-graphics-quality-v1',visualEffects);}catch(_){}
  updateHeroGeometryQuality();applyTerrainLOD(true);refreshVegetation(true);
  if($('graphicsQualityStatus'))$('graphicsQualityStatus').textContent='Instanced meadow '+(grassLayer?.snapshot().instances||0)+' clumps · original character retained';
  toast(visualEffects==='lite'?'⚡ Performance graphics selected.':visualEffects==='cinematic'?'✨ Showcase foliage selected.':'🌿 Balanced graphics selected.');
 });
 $('quality').addEventListener('change',e=>{if(worldActive)closeWorldActivity();view=e.target.value;if(view==='3d'&&!renderer){view='2d';e.target.value='2d';toast('3D is not available without WebGL.');}resize();updateHeroRuntimeStatus();});
 $('slot').addEventListener('change',e=>{slot=Number(e.target.value);$('startSlot').value=String(slot);toast(`Selected family save ${slot+1}. Use Continue to load it.`);});
 $('startSlot').addEventListener('change',e=>{slot=Number(e.target.value);$('slot').value=String(slot);const had=readSlot(slot);$('resumeBtn').disabled=!had;$('resumeBtn').title=had?'Resume this slot':'No saved adventure in this slot yet';});
 $('petBtn').addEventListener('click',()=>{save.pet=!save.pet;updateHUD();persist();});$('soundBtn').addEventListener('click',()=>{save.muted=!save.muted; if(!save.muted)soundscape.unlock();soundscape.setMuted(save.muted);updateHUD();persist();});
 $('exportPerf').addEventListener('click',()=>{
  const report=frameProbe.report({renderer:renderer?'WebGL':'Canvas2D',viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1},
   mode:save.mode,quality:visualEffects,userAgent:navigator.userAgent});
  if(window.ValleyCharacterReview){
   const review=window.ValleyCharacterReview;
   report.characterReview={build:review.build,riverAtExport:window.ValleyRiggedHeroOverrideData===review.river&&heroController?.skinned?review.riverHash:null,
    scoutAtExport:dog?.userData.customScout?.userData.reviewHash||null,scoutVisible:!!dog?.visible};
  }
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='river-valley-device-performance.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
  toast('📊 Local FPS report exported. Share it to compare your iPhone hardware.');
 });
 $('installOfflineBtn').addEventListener('click',()=>{
   if(location.protocol==='file:'){
     toast('This downloaded HTML runs offline on supported desktop browsers. Saves remain local to this browser.');
     return;
   }
   const sourceGame=location.pathname.includes('/game/');
   const target=sourceGame?'./River_Valley_Family_Adventure_OFFLINE.html':'./offline.html';
   const link=document.createElement('a');
   link.href=new URL(target,location.href).href;
   link.download='River_Valley_Family_Adventure_OFFLINE.html';
   document.body.appendChild(link);
   link.click();
   link.remove();
   toast('Standalone offline HTML download started. Website play requires an internet connection.');
 });
 $('saveBtn').addEventListener('click',()=>toast(persist()?'💾 Adventure saved on this device.':'Local storage is blocked in this browser.'));
 $('newBtn').addEventListener('click',()=>{if(!confirm('Start a new adventure in this save slot? Your existing progress in this slot will be replaced.'))return;applyState(C.freshSave(save.name));persist();toast('🌿 New family adventure started.');});
 $('returnBtn').addEventListener('click',()=>{closeWorldActivity();closeActivity();persist();stopTour();started=false;$('start').classList.remove('hidden');$('panel').classList.remove('open');});
 $('interactBtn').addEventListener('click',interact);$('touchInteract').addEventListener('pointerdown',e=>{e.preventDefault();if(!worldPrimaryAction())interact();});
 $('farmGrid').addEventListener('click',e=>{const b=e.target.closest('button[data-plot]');if(!b)return;const action=C.farmAction(save,Number(b.dataset.plot),Date.now());save=action.save;const result=action.result;
 $('farmNotice').textContent=({'planted':'🌱 Planted! Come back when your corn is ripe.','growing':'🌿 Growing strong. Give it a moment.','harvested':'🌽 Harvest complete! +45 coins • +45 XP','needs-coins':'Collect a discovery stamp to earn seed money.','invalid':'That field is unavailable.'})[result]||result;
 if(result==='harvested')audioChime();renderFarm();updateHUD();persist();});
 $('waterFarm').addEventListener('click',()=>{const a=C.waterFarm(save,Date.now());save=a.save;$('farmNotice').textContent=a.result==='watered'?'💧 The growing crops will be ready sooner.':a.result==='needs-coins'?'Not enough coins to water.':'Plant some seeds first.';renderFarm();updateHUD();persist();});
 const closeFarm=()=>$('farmPanel').classList.remove('open');$('closeFarm').addEventListener('click',closeFarm);$('farmDone').addEventListener('click',closeFarm);
 $('toggleMissions').addEventListener('click',()=>{const hidden=$('missionList').hidden; $('missionList').hidden=!hidden;$('questSummary').hidden=!hidden;$('toggleMissions').textContent=hidden?'−':'+';});
 $('missionList').addEventListener('click',e=>{const b=e.target.closest('button[data-stop]');if(!b)return;const id=b.dataset.stop,fast=selected===id;selectStop(id,fast);});
 mapCanvas.addEventListener('click',e=>{const rect=mapCanvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*TWO-LIMIT,z=(e.clientY-rect.top)/rect.height*TWO-LIMIT;const dst=C.STOPS.find(s=>Math.hypot(s.x-x,s.z-z)<180);if(dst)selectStop(dst.id,true);});
 document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(paused){
   if(k==='escape'){setPaused(false);return;}
   if(k==='tab'){
    const targets=[...$('pauseOverlay').querySelectorAll('button:not([disabled]),input:not([disabled])')];
    if(targets.length){
     const first=targets[0],last=targets[targets.length-1];
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
   }
   return; // Keyboard controls cannot reach gameplay through a modal.
  }
  if(e.target.matches('input,select,textarea'))return;
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);
  // One gameplay action per real keypress; held keys still drive continuous movement.
  if(e.repeat&&(k==='e'||k===' '))return;
  if(!started)return;
  if(k==='v'){heroInspection?closeHeroStudio():openHeroStudio();return;}
  if(heroInspection){if(k==='escape')closeHeroStudio();return;}
  if(k==='e'||k===' '){if(!activity&&!worldPrimaryAction())interact();}
   if(worldActive&&(k==='q'||k==='r'))adjustWorldAim(k==='q'?-.055:.055);
   if(worldActive==='farm'&&/^[1-9]$/.test(k))worldAction('plot-'+(Number(k)-1));
  // J / mobile JUMP is sampled in the kinematic step and never auto-repeats.
 if(k==='b')openScout();if(k==='n')openCounty();if(k==='h')openWorldActivity('hunt');if(k==='f')openWorldActivity('fish');if(k==='g')openWorldActivity('farm');if(k==='k')openWorldActivity('cook');if(k==='m'&&!activity&&!backdropOpen)toggleMap();if(k==='p')screenshot();if(k==='c'&&!activity){$('cinemaPanel').classList.contains('open')?closeCinema():openCinema();}if(k==='escape'){if(!$('countyPanel').hidden){closeCounty();return;}if(!$('scoutPanel').hidden){$('scoutPanel').hidden=true;return;}if(worldActive)closeWorldActivity();else if(backdropOpen)closeBackdrop();else if(activity)closeActivity();else if($('cinemaPanel').classList.contains('open'))closeCinema();else if($('panel').classList.contains('open'))$('panel').classList.remove('open');else setPaused(true);}
 });document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();motion.reset({facing:playerHeading});motionState=motion.snapshot();heroHeightOffset=0;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused)setPaused(true);});
 canvas.addEventListener('pointerdown',e=>{pointerDown=true;pointerX=e.clientX;pointerY=e.clientY;});
 window.addEventListener('pointerup',()=>pointerDown=false);
 canvas.addEventListener('pointermove',e=>{if(!pointerDown||!renderer||view==='2d')return;cameraYaw+=(e.clientX-pointerX)*.005;cameraDist=C.clamp(cameraDist+(e.clientY-pointerY)*.2,42,310);pointerX=e.clientX;pointerY=e.clientY;});
 for(const surface of [canvas,atlas])surface.addEventListener('wheel',e=>{e.preventDefault();if(renderer&&view==='3d')cameraDist=C.clamp(cameraDist+e.deltaY*.2,42,310);else mapZoom=C.clamp(mapZoom-e.deltaY*.002,.45,5);},{passive:false});
 let pinch=0;atlas.addEventListener('touchstart',e=>{if(e.touches.length===2)pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
 atlas.addEventListener('touchmove',e=>{if(e.touches.length===2){e.preventDefault();const distance=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinch>0)mapZoom=C.clamp(mapZoom*distance/pinch,.45,5);pinch=distance;}},{passive:false});
 atlas.addEventListener('touchend',()=>{pinch=0;});
 for(const b of document.querySelectorAll('#touchControls [data-key]')){
  function set(on){const k=b.dataset.key;if(on)keys.add(k);else keys.delete(k);b.classList.toggle('pressed',on);}
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);set(true);});
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,()=>set(false));
 }

 window.addEventListener('resize',resize);
}
function init(){
 bindUI();
 if(UX){
  let localStore=null;try{localStore=localStorage;}catch(_){}
  playerPreferences=UX.createPreferences({storage:localStore,document});
  playerPreferences.bind();
 }
 loadCinemaPrefs();setupReferenceImage();
 const review=window.ValleyCharacterReview;
 if(review)window.ValleyRiggedHeroOverrideData=review.river;
 else restoreLocalCustomHero();
 try{if(GRAPHICS)visualEffects=GRAPHICS.normalize(localStorage.getItem('river-valley-graphics-quality-v1')||visualEffects);}catch(_){}
 $('visualEffects').value=visualEffects;
 if(innerWidth<781){$('missionList').hidden=true;$('questSummary').hidden=true;$('toggleMissions').textContent='+';}slot=Number($('slot').value)||0;
 const had=readSlot(slot);$('resumeBtn').disabled=!had;$('resumeBtn').title=had?'Resume your saved adventure':'No saved adventure yet';
 if('ontouchstart'in window||navigator.maxTouchPoints>0)$('touchControls').style.display='flex';
 if(!tryRenderer()){view='2d';$('quality').value='2d';}else {
  view='3d';
  if(review)mountStaticScout(review.scout).then(info=>{
   if(info){dog.userData.customScout.userData.reviewHash=review.scoutHash;
    $('customScoutStatus').textContent='Scout review · '+scoutDescription(info);}
  }).catch(err=>{$('customScoutStatus').textContent='Scout review failed: '+err.message;});
  else restoreStaticScout();
 }
 resize();updateHUD();mapDraw(mapCtx,mapCanvas.width,mapCanvas.height,false);
 requestAnimationFrame(loop);
 window.RiverValleyDebug={getState:()=>({paused,gamepadConnected:!!gamepadInput.connected,playerExperience:playerPreferences?.snapshot()||null,scoutRigAction:dog?.userData.customScout?.userData.active||null,scoutRigReady:!!dog?.userData.customScout?.userData.mixer,worldActivity:worldActive,worldSites:worldGame?.counts?.activitySites||0,world3D:!!worldGame,worldHunt:!!worldHuntRound,worldFish:!!worldFishRound,worldAim,worldHuntTarget:worldHuntRound?.target??null,worldFishBiteAt:worldFishRound?.biteAt??null,worldFishPhase:worldFishRound?.phase??null,worldFishTarget:worldFishRound?SKILLS.fishCue(worldFishRound,Date.now()).target:null,worldFishProgress:worldFishRound?.progress??null,playerHeading,terrainLOD:activeTerrainSegments,terrainSetting:terrainDetail,terrainTiles:terrainStats.tiles,terrainMemory:terrainMemoryEstimate(),heroPreviewReady:!!heroPreviewStage,heroInspection,heroPreviewPose,heroPreviewFocus:heroPreviewStage?.focus||null,heroPreviewAngle:heroPreviewStage?.angle||null,heroState,heroModel:!!heroController,heroProfile:HERO?.PROFILE?.id||null,heroSkinned:!!heroController?.skinned,heroLOD:heroController?.lod||'FALLBACK',heroCustomGLB:heroController?.lod==='CUSTOM',castPrototypeId:heroController?.castId||null,castPrototypeSelected:CAST_WARDROBE?.selection?.()||null,heroAssetFallback:!!heroController?.root?.userData?.fallback,heroRigLoadError:window.ValleyHeroRigFailure||null,scout:scout?.snapshot()||null,scoutCustomMesh:!!dog?.userData?.customScout,scoutBond:save.scoutBond,countyRegion:save.countyRegion,countyVisited:[...save.countyVisited],countyBoundaryVertices:COUNTY_DATA?.boundary?.length||0,countyVignettes:countyVignettes?.counts||null,collision:collisionWorld.snapshot(),vehicleSuspension:suspension.snapshot(),worldPaint:terrainDecor?.counts||null,lastCollision,audio:soundscape.snapshot(),performance:frameProbe.summary(),performanceScenes:frameProbe.cohorts(),terrainTransition:terrainTransition?.status()||null,roadRefreshQueued,pixelRatio:activePixelRatio,heroHeightOffset,groundShadowReady:!!groundShadow,motionState:motion.snapshot(),heroTexturedMeshes:heroController?.meshes?.filter(m=>!!m.material?.map).length||0,heroEmbeddedTextures:heroController?.embeddedTextures||null,heroStudioEmbeddedTextures:heroPreviewStage?.hero?.embeddedTextures||null,heroRigOverlay:heroPreviewStage?.skeletonVisible||false,heroStudioSkeletonBones:heroPreviewStage?.skeletonBoneCount||0,heroActiveClip:heroController?.activeClip||null,heroGaiterPrintReady:!!heroController?.gaiterDecalReady,heroFootContacts:heroController?.footContacts||null,heroBoneCount:heroController?.skinned?Object.keys(heroController.joints).length:0,heroClipCount:heroController?.clips?.length||0,heroParts:heroController?Object.keys(heroController.joints).length:0,terrainTransition:terrainTransition?.status()||null,vegetation:foliageStats||null,renderWorkers:{buildings:buildingJobs?.snapshot(),foliage:foliageJobs?.snapshot(),buildingStrategy},meadow:grassLayer?.snapshot()||null,graphicsQuality:visualEffects,optionalGzipSupport:!!(ASSET_CODEC&&typeof DecompressionStream==='function'),facadeMaterials:facadePalette?.wallCount||0,streaming:streamingGovernor?.snapshot()||null,terrainTriangles:terrainStats.triangles,terrainLevels:terrainStats.levels,modelCount:gameModels.length,atmosphere:atmosphere?.counts||null,director3D:director3D?.counts||null,cinema:{...cinemaPrefs},fps:perfFPS,backdropOpen,backdropLocation,shotPlaying,shotIndex,shotCount:SHOTS.length,roadSections:roadMesh?roadMesh.geometry.attributes.position.count/6:0,buildingDetailCount:detailBuildings.size,sourceHeightDatum:'UNVERIFIED',georeference:{enabled:referenceEnabled,ready:!!referenceImage,roadParts:activeRoads.length,buildings:activeBuildings.length,courthouseAnchor:LANDMARKS?.courthouse?.gamePosition||null,courthouseFootprintIndex,courthouseRoofStatus:LANDMARKS?.courthouse?.roofHeightStatus||'UNVERIFIED',imageryYear:leafonImage&&LEAFON?'2025-partial / 2023-fallback':REF?.metadata?.downtownTileYear||null,leafOn2025:{bundled:!!LEAFON,ready:!!leafonImage,draped:!!leafonDrape,coverage:LEAFON?.metadata?.validPixelCoverageFraction||0,sourceSHA256:LEAFON?.metadata?.overlaySHA256||null}},started,mode:save.mode,stamps:save.completed.length,coins:save.coins,homestead:save.homestead,inventory:{...save.inventory},activity,x:player.x,z:player.z,renderMode:renderer&&view==='3d'?'webgl':'2d'}),resetPerformance:()=>frameProbe.reset(),capturePerformance:()=>frameProbe.report({renderer:'WebGL',viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1},mode:save.mode,quality:visualEffects,userAgent:navigator.userAgent}),teleport,complete:interact,openActivity,chooseCinemaLook,openCinema,openBackdrop,forceLOD:(lod)=>{terrainDetail=lod;$('terrainDetail').value=lod;applyTerrainLOD(true,true);},sampleAligned:(x,z)=>height(x,z),openWorldActivity,worldAction,closeWorldActivity};
}
window.ValleyCastBridge=Object.freeze({applySelection:()=>{
 updateHeroGeometryQuality(true);
 if(heroPreviewStage)refreshImportedHeroStudio();
}});
init();
})();