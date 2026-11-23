/* Posey County Courthouse: source-anchored architectural game mesh.
 * Horizontal footprint: Indiana GIO LiDAR-derived 2016-2020 buildings, ID 741267.
 * Architecture: photographed/NPS-documented Italianate brick, white window surrounds,
 * projecting gabled pavilions, recessed entrance, balcony, and distinctive cupola.
 * Heights, roof pitch and ornament dimensions are artistic reconstructions, NOT LiDAR.
 * No remote resources, external texture licenses, or runtime network.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyCourthouseFidelity=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const EXTERIOR=Object.freeze([
 [-87.894649476,37.93173573100014],
 [-87.89475664499999,37.93200702800012],
 [-87.89499248199998,37.93194858400009],
 [-87.89488531199999,37.931677287000085],
 [-87.894649476,37.93173573100014]
]);
const SOURCE=Object.freeze({url:'https://gisdata.in.gov/server/rest/services/Hosted/Building_Footprints/FeatureServer/0',objectId:741267,collectionYear:'2020',status:'HORIZONTAL_FOOTPRINT_ONLY'});
function horizontalMeters(a,b,lat){
 const k=6378137*Math.PI/180;
 return [(b[0]-a[0])*k*Math.cos(lat*Math.PI/180),-(b[1]-a[1])*k];
}
function anchor(geo){
 if(!geo?.lonLatToWorld)throw Error('Game geographic reference required for landmark');
 const center=[0,0];for(const p of EXTERIOR.slice(0,4)){center[0]+=p[0]/4;center[1]+=p[1]/4;}
 const [x,z]=geo.lonLatToWorld(...center);
 const w=horizontalMeters(EXTERIOR[2],EXTERIOR[1],center[1]);
 const d=horizontalMeters(EXTERIOR[0],EXTERIOR[1],center[1]);
 const width=Math.hypot(...w),depth=Math.hypot(...d);
 if(!Number.isFinite(x)||!Number.isFinite(z)||width<18||width>26||depth<27||depth>36)throw Error('Courthouse horizontal control inconsistent with IGIO footprint');
 return {x,z,center,exterior:EXTERIOR.map(p=>[...p]),sourceObjectId:SOURCE.objectId,sourceUrl:SOURCE.url,
  collectionYear:SOURCE.collectionYear,width,depth,rotationY:Math.atan2(-w[1],w[0]),
  roofElevationStatus:'NOT_SURVEYED',horizontalStatus:'SOURCE_FOOTPRINT_APPROX_GAME_TRANSFORM'};
}
function isSourceBuilding(f,a){
 if(!f||!a)return false;
 return Math.hypot(f.x-a.x,f.z-a.z)<7&&f.dx>=21&&f.dx<40&&f.dz>=28&&f.dz<46;
}
function create(G,geo,terrainHeight){
 if(!G?.InstancedMesh||typeof terrainHeight!=='function')throw Error('Three.js and shared terrain sampler required');
 const a=anchor(geo),w=a.width,d=a.depth,group=new G.Group();
 const materials={
  brick:new G.MeshStandardMaterial({color:0x934e38,roughness:.94,metalness:0}),
  limestone:new G.MeshStandardMaterial({color:0xd5c7ac,roughness:.91,metalness:0}),
  slate:new G.MeshStandardMaterial({color:0x45515b,roughness:.88,metalness:.03,side:G.DoubleSide}),
  glass:new G.MeshStandardMaterial({color:0x597887,roughness:.25,metalness:.12}),
  white:new G.MeshStandardMaterial({color:0xe4decf,roughness:.76,metalness:0}),
  bronze:new G.MeshStandardMaterial({color:0x997c40,roughness:.48,metalness:.64}),
  dark:new G.MeshStandardMaterial({color:0x252b2e,roughness:.86,metalness:.05})
 };
 const batches={};for(const key of Object.keys(materials))batches[key]=[];
 function box(type,x,y,z,sx,sy,sz){batches[type].push({x,y,z,sx,sy,sz});}
 function cylinder(type,r0,r1,h,x,y,z,sides=12){
  const mesh=new G.Mesh(new G.CylinderGeometry(r0,r1,h,sides),materials[type]);
  mesh.position.set(x,y,z);mesh.userData.kind=type;group.add(mesh);
 }
 function face(type,coordinates){
  const geometry=new G.BufferGeometry(),n=[];
  for(let i=0;i<coordinates.length;i+=9)n.push(...coordinates.slice(i,i+9));
  geometry.setAttribute('position',new G.Float32BufferAttribute(n,3));geometry.computeVertexNormals();
  const mesh=new G.Mesh(geometry,materials[type]);mesh.userData.kind=type;group.add(mesh);
 }
 // Raised stone base, three-story masonry body, pavilion bays.
 box('limestone',0,.66,0,w+.9,1.32,d+.9);
 box('brick',0,7.55,0,w-1.5,13.8,d-1.5);
 for(const x of [-w*.32,w*.32])box('brick',x,7.6,-d*.47,w*.28,13.9,2.1);
 // Explicit story belts and elaborate projecting cornice.
 for(const y of [1.5,6.35,11.0,15.4]){
  box('limestone',0,y,0,w+.75,.24,d+.75);
  box('white',0,y+.21,0,w+.28,.13,d+.28);
 }
 box('white',0,15.8,0,w+1.3,.43,d+1.3);
 for(const x of [-w*.46,w*.46])for(const z of [-d*.42,d*.42]){
  box('white',x,16.12,z,.65,.8,.82);
 }
 // Windows are authored in repeatable instanced batches instead of hundreds of drawcalls.
 for(const floor of [0,1,2]){
  const y=3.6+floor*4.55;
  for(const side of [-1,1]){
   for(const x of [-w*.36,-w*.18,0,w*.18,w*.36]){
    const z=side*(d*.5-.48);
    box('white',x,y,z,1.75,3.4,.28);
    box('glass',x,y,z+side*.19,1.30,2.93,.14);
    box('limestone',x,y+1.83,z+side*.05,2.2,.20,.45);
    box('white',x,y-1.72,z+side*.05,2.05,.18,.45);
   }
   for(const z of [-d*.32,-d*.14,d*.14,d*.32]){
    const x=side*(w*.5-.42);
    box('white',x,y,z,.26,3.35,1.75);
    box('glass',x+side*.2,y,z,.14,2.87,1.28);
    box('limestone',x+side*.06,y+1.82,z,.48,.20,2.0);
    box('white',x+side*.06,y-1.7,z,.48,.16,1.9);
   }
  }
 }
 // Recessed main entrance and balustraded west-side portico; unmeasured facade design.
 const front=-d*.5-1.7;
 box('dark',0,3.14,front+1.5,3.2,4.25,.24);
 box('limestone',0,5.5,front,10.1,.55,5.6);
 for(const x of [-4.2,-1.4,1.4,4.2]){
  box('white',x,3.3,front,0.48,4.4,.5);
  box('limestone',x,5.50,front,.85,.3,.8);
 }
 box('limestone',0,6.0,front,10.8,.42,5.2);
 for(let x=-4.6;x<=4.61;x+=1.2)box('white',x,6.55,front,.22,.82,.26);
 box('white',0,7.06,front,10.65,.20,.38);
 // Slate roof: four low-pitch hipped planes, not a claimed surveyed LOD2 ridge.
 const x0=-w*.52,x1=w*.52,z0=-d*.52,z1=d*.52,eave=16.22,ridge=19.25;
 face('slate',[
  x0,eave,z0,x1,eave,z0,x0+3,ridge,0,
  x1,eave,z0,x1-3,ridge,0,x0+3,ridge,0,
  x0,eave,z1,x0+3,ridge,0,x1,eave,z1,
  x1,eave,z1,x0+3,ridge,0,x1-3,ridge,0,
  x0,eave,z0,x0+3,ridge,0,x0,eave,z1,
  x0,eave,z1,x0+3,ridge,0,x0,eave,z0,
  x1,eave,z0,x1,eave,z1,x1-3,ridge,0,
  x1,eave,z1,x1-3,ridge,0,x1,eave,z0
 ]);
 // Projecting pediments: their pitch, molding and gable openings are art-direction estimates.
 for(const x of [-w*.32,w*.32]){
  const half=w*.16,z=-d*.51;
  face('brick',[x-half,15.85,z,x+half,15.85,z,x,19.35,z]);
  box('white',x,15.9,z-.10,half*2,.31,.65);
  box('white',x,17.7,z-.14,.62,2.8,.6);
  box('glass',x,17.75,z-.48,.42,.48,.16);
 }
 // White octagonal belvedere with gold/brass dome: visually documented, no measured dimensions.
 cylinder('limestone',5.2,5.2,1.2,0,19.8,0,12);
 cylinder('white',4.1,4.3,6.2,0,23.3,0,8);
 for(let k=0;k<8;k++){const t=k*Math.PI/4;
  cylinder('limestone',.20,.20,4.7,Math.sin(t)*3.76,23.5,Math.cos(t)*3.76,8);
 }
 cylinder('white',4.5,4.2,1.0,0,26.9,0,12);
 const dome=new G.Mesh(new G.ConeGeometry(4.0,5.1,12,2),materials.bronze);
 dome.position.set(0,30.05,0);dome.userData.kind='cupola-dome';group.add(dome);
 cylinder('bronze',.14,.14,4.5,0,34.4,0,8);
 cylinder('bronze',.44,.44,.45,0,36.6,0,8);
 // Combined geometry stays cheap on mobile: one instanced draw per material.
 const identity=new G.Object3D();
 for(const [kind,arr] of Object.entries(batches)){
  if(!arr.length)continue;
  const geometry=new G.BoxGeometry(1,1,1),mesh=new G.InstancedMesh(geometry,materials[kind],arr.length);
  for(let i=0;i<arr.length;i++){
   const p=arr[i];identity.position.set(p.x,p.y,p.z);identity.scale.set(p.sx,p.sy,p.sz);
   identity.updateMatrix();mesh.setMatrixAt(i,identity.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.userData.kind=kind;group.add(mesh);
 }
 const corners=[
  [-w/2,-d/2],[-w/2,d/2],[w/2,-d/2],[w/2,d/2],[0,0]
 ];
 const c=Math.cos(a.rotationY),s=Math.sin(a.rotationY);
 const ground=corners.map(([localX,localZ])=>terrainHeight(a.x+localX*c+localZ*s,a.z-localX*s+localZ*c));
 if(ground.some(h=>!Number.isFinite(h)))throw Error('Courthouse terrain lacks a valid ground sample');
 const baseline=Math.min(...ground);
 group.position.set(a.x,baseline-.25,a.z);
 group.rotation.y=a.rotationY;
 group.userData={
  model:'courthouse-architectural-reconstruction',sourceObjectId:a.sourceObjectId,
  horizontalSource:a.sourceUrl,collectionYear:a.collectionYear,
  footprintWidthMeters:a.width,footprintDepthMeters:a.depth,
  groundSource:'SAME_VISIBLE_RUNTIME_TERRAIN_SAMPLER',
  heightStatus:'DESIGN_ESTIMATE_NOT_LIDAR',
  footprintStatus:'SOURCE_HORIZONTAL_2020_BOUNDING_SILHOUETTE',
  architecturalSource:'NPS National Register / independently documented photographs',
  notes:'Roof pitch, cupola height and facade depth not surveyed'
 };
 return group;
}
return {SOURCE,anchor,isSourceBuilding,create};
});