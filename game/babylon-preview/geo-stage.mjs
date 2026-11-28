/** Source-derived downtown context scene for the Babylon migration preview.
 * Imagery/planimetry only; no terrain, building heights or roof authority.
 */
import {Mesh,VertexData,StandardMaterial,Texture,Color3,MeshBuilder,Vector3} from '@babylonjs/core';
import aerialUrl from '../reference/mount-vernon/overhead.jpg?url';
import roadsUrl from '../reference/mount-vernon/roads.geojson?url';
import buildingsUrl from '../reference/mount-vernon/buildings.geojson?url';
import registration from '../reference/mount-vernon/registration.json';
import anchors from '../reference/mount-vernon/landmark-anchors-receipt.json';
import {buildingMasses} from './building-masses.mjs';
import {aerialPlane,geographicLines} from './geo-scene.mjs';

export function mountGeographicStage(scene) {
  const origin=anchors.courthouse.centerWGS84;
  const geometry=aerialPlane(registration.bboxReturnedWGS84,origin);
  const ground=new Mesh('IGIO-2023-orthophoto-flat-reference',scene);
  const vertices=new VertexData();
  vertices.positions=geometry.positions;
  vertices.indices=geometry.indices;
  vertices.uvs=geometry.uvs;
  vertices.normals=[0,1,0,0,1,0,0,1,0,0,1,0];
  vertices.applyToMesh(ground);
  const material=new StandardMaterial('IGIO-aerial-2023-CC0',scene);
  material.diffuseTexture=new Texture(aerialUrl,scene);
  material.disableLighting=true;
  material.backFaceCulling=false;
  ground.material=material;
  const meshes=[ground];
  const buildingMaterial=new StandardMaterial('artistic-building-masonry',scene);
  buildingMaterial.diffuseColor=new Color3(.65,.49,.37);
  buildingMaterial.backFaceCulling=false;
  const controller=new AbortController();
  function addLines(name,source,color,y){
    if (!source.length) return;
    const mesh=MeshBuilder.CreateLineSystem(name,{
      lines:source.map(points=>points.map(([x,_,z])=>new Vector3(x,y,z)))
    },scene);
    mesh.color=Color3.FromHexString(color);
    meshes.push(mesh);
  }
  const footprint=anchors.courthouse.sourceFootprintRingWGS84;
  addLines('IGIO-courthouse-footprint-2020',
    geographicLines({features:[{geometry:{type:'LineString',coordinates:footprint}}]},origin,{radiusMeters:500,maxLines:2}),
    '#ffe28b',.5);
  const ready=Promise.all([fetch(roadsUrl,{signal:controller.signal}),fetch(buildingsUrl,{signal:controller.signal})])
    .then(async responses=>{
      if (responses.some(response=>!response.ok)) throw Error('source GeoJSON request failed');
      const [roads,buildings]=await Promise.all(responses.map(response=>response.json()));
      if(controller.signal.aborted)return {state:'cancelled'};
      const roadLines=geographicLines(roads,origin,{radiusMeters:500,maxLines:250,maxVertices:9500});
      const buildingLines=geographicLines(buildings,origin,{radiusMeters:500,maxLines:500,maxVertices:14000});
      addLines('IGIO-road-centerlines-2025',roadLines,'#8ac4e4',.25);
      const masses=buildingMasses(buildings,origin);
      for(const [i,mass] of masses.entries()){
        const mesh=new Mesh('artistic-building-'+i,scene);
        const data=new VertexData();
        data.positions=mass.positions;data.indices=mass.indices;data.normals=[];
        VertexData.ComputeNormals(data.positions,data.indices,data.normals);
        data.applyToMesh(mesh);mesh.material=buildingMaterial;
        mesh.metadata={provenance:mass.provenance};meshes.push(mesh);
      }
      return Object.freeze({state:'source-plotted',roadSegments:roadLines.length,
        buildingOutlines:buildingLines.length,artisticBuildings:masses.length,sourceImageryYear:2023,
        horizontalCRS:'EPSG:4326',verticalDatumVerified:false,registered3DTiles:0});
    });
  return Object.freeze({ready,dispose(){controller.abort();for(const mesh of meshes)mesh.dispose();material.dispose();buildingMaterial.dispose();}});
}
