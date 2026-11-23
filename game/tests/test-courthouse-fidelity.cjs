const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const THREE=require('../vendor/three.js'),GEO=require('../src/reference-map.js');
const COURT=require('../src/courthouse-fidelity.js');
const original=JSON.parse(fs.readFileSync(path.join(__dirname,'../reference/mount-vernon/buildings.geojson'),'utf8'));
const source=original.features.find(f=>f.properties.objectid===741267);
test('courthouse geolocation is traceable to actual 2020 state lidar footprint, not gameplay stop',()=>{
 const anchor=COURT.anchor(GEO);
 assert.equal(anchor.sourceObjectId,741267);
 assert.equal(anchor.collectionYear,'2020');
 assert.deepEqual(anchor.exterior,source.geometry.coordinates[0]);
 assert.ok(anchor.width>20&&anchor.width<23,'footprint width in metres');
 assert.ok(anchor.depth>30&&anchor.depth<34,'footprint length in metres');
 assert.ok(Math.hypot(anchor.x-16,anchor.z-504)<5,'landmark centroid near courthouse stop');
 assert.ok(anchor.rotationY>.1&&anchor.rotationY<.6,'footprint has verified orientation');
 assert.equal(anchor.roofElevationStatus,'NOT_SURVEYED');
});
test('courthouse is a detailed low-draw architectural mesh grounded to shared DEM, not generic GLB',()=>{
 const anchor=COURT.anchor(GEO);
 const base=(x,z)=>5+.005*x+.008*z;
 const mesh=COURT.create(THREE,GEO,base);
 assert.ok(mesh.isGroup);
 assert.equal(mesh.userData.model,'courthouse-architectural-reconstruction');
 assert.equal(mesh.userData.sourceObjectId,741267);
 assert.equal(mesh.userData.heightStatus,'DESIGN_ESTIMATE_NOT_LIDAR');
 assert.ok(mesh.position.y>=0&&mesh.position.y<20);
 assert.equal(mesh.rotation.y,anchor.rotationY);
 assert.equal(mesh.userData.horizontalSource,'https://gisdata.in.gov/server/rest/services/Hosted/Building_Footprints/FeatureServer/0');
 const gameSource=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');
 assert.ok(gameSource.includes('COURTHOUSE.create(G,GEOREF,height)'));
 assert.ok(gameSource.includes('COURTHOUSE.isSourceBuilding(footprint,courtAnchor)'));

 let drawCalls=0,triangles=0;
 mesh.traverse(obj=>{if(obj.isMesh){
   drawCalls++;
   if(obj.isInstancedMesh)triangles+=(obj.geometry.index?.count||obj.geometry.attributes.position.count)/3*obj.count;
   else triangles+=(obj.geometry.index?.count||obj.geometry.attributes.position.count)/3;
 }});
 assert.ok(triangles>900,'real window, roof, cornice and cupola geometry');
 assert.ok(drawCalls<22,'phone friendly batches');
 const textured=[];mesh.traverse(o=>{if(o.isMesh&&o.material?.map?.isDataTexture)textured.push(o);});
 assert.ok(textured.length>=2,'courthouse brick and roof must use local original procedural PBR texture maps');

});
test('source landmark footprint is excluded from city generic geometry but remains collidable',()=>{
 const anchor=COURT.anchor(GEO);
 assert.ok(COURT.isSourceBuilding({x:anchor.x+.8,z:anchor.z-1,dx:30,dz:37},anchor));
 assert.equal(COURT.isSourceBuilding({x:anchor.x+70,z:anchor.z,dx:30,dz:37},anchor),false);
 assert.equal(COURT.isSourceBuilding({x:anchor.x+1,z:anchor.z,dx:5,dz:6},anchor),false);
});
