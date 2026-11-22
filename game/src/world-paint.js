/* Offline terrain art dress-up: deterministic instanced field stones and reeds.
 * Keeps one original Three.js scene; all elements are fictional decoration. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyWorldPaint=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function scatter(THREE,scene,ground,{mobile=false,limit=2450}={}){
  if(!THREE?.InstancedMesh||!scene||typeof ground!=='function')throw Error('Three.js, scene and terrain required');
  const nRock=mobile?165:380,nReed=mobile?230:560;
  let seed=0x734abe12;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const meshes=[];
  const rockGeo=new THREE.DodecahedronGeometry(1,0);
  const rockMat=new THREE.MeshStandardMaterial({color:0x888a7e,roughness:.97,flatShading:true});
  const rock=new THREE.InstancedMesh(rockGeo,rockMat,nRock);
  rock.name='River/instanced-field-stones';rock.frustumCulled=false;
  const reedGeo=new THREE.ConeGeometry(.46,4.2,4,1),reedMat=new THREE.MeshLambertMaterial({color:0x748350,side:THREE.DoubleSide});
  const reeds=new THREE.InstancedMesh(reedGeo,reedMat,nReed);
  reeds.name='River/instanced-riverside-reeds';reeds.frustumCulled=false;
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  for(let i=0;i<nRock;i++){
   const x=(rand()*2-1)*limit*.94,z=(rand()*2-1)*limit*.94;
   const h=ground(x,z),size=.8+rand()*2.1;
   dummy.position.set(x,(Number.isFinite(h)?h:0)+size*.28,z);
   dummy.rotation.set(rand()*.3,rand()*6.28,rand()*.2);
   dummy.scale.set(size*1.2,size*.56,size*.75);dummy.updateMatrix();rock.setMatrixAt(i,dummy.matrix);
   color.setHSL(.12,.045,.35+rand()*.15);rock.setColorAt(i,color);
  }
  for(let i=0;i<nReed;i++){
   const x=(rand()*2-1)*limit*.92,z=980+rand()*570;
   const h=ground(x,z),size=.6+rand()*1.2;
   dummy.position.set(x,(Number.isFinite(h)?h:0)+size*2.1,z);
   dummy.rotation.set(0,rand()*6.28,0);dummy.scale.set(size,size,size);dummy.updateMatrix();reeds.setMatrixAt(i,dummy.matrix);
   color.setHSL(.18+rand()*.03,.26+rand()*.14,.27+rand()*.13);reeds.setColorAt(i,color);
  }
  for(const mesh of [rock,reeds]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;scene.add(mesh);meshes.push(mesh);}
  return {counts:{fieldStones:nRock,reeds:nReed,drawCalls:2},dispose(){for(const mesh of meshes)scene.remove(mesh);rockGeo.dispose();reedGeo.dispose();rockMat.dispose();reedMat.dispose();}};
 }
 return Object.freeze({scatter});
});