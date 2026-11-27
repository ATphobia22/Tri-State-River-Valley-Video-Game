/** Native Babylon GLB rig import after SHA256 verification against the committed asset manifest. */
import {SceneLoader,TransformNode} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import heroUrl from '../assets/models/river_explorer_rigged.glb?url';
import manifest from '../assets/models/river_explorer_manifest.json';
import {verifyHeroBytes,REQUIRED_HERO_ACTIONS,isSceneDisposed} from './hero-contract.mjs';

function cleanImport(imported){
 for(const group of imported?.animationGroups||[])group.dispose();
 for(const mesh of imported?.meshes||[])if(!mesh.isDisposed())mesh.dispose(false,true);
 for(const skeleton of imported?.skeletons||[])skeleton.dispose();
}
export async function loadVerifiedHero({scene,qa,signal,fetchImpl=globalThis.fetch}={}){
 if(!scene||!qa||typeof fetchImpl!=='function')throw Error('Babylon scene, QA, and fetch required');
 if(signal?.aborted)throw Error('hero import aborted');
 const response=await fetchImpl(heroUrl,{signal,cache:'no-store'});
 if(!response?.ok)throw Error('hero GLB unavailable: HTTP '+(response?.status??'unknown'));
 const bytes=new Uint8Array(await response.arrayBuffer());
 await verifyHeroBytes(bytes,manifest);
 if(signal?.aborted||isSceneDisposed(scene))throw Error('hero import cancelled');
 const blobUrl=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));
 let imported;
 try{
  imported=await SceneLoader.ImportMeshAsync(null,'',blobUrl,scene,undefined,'.glb');
 }finally{URL.revokeObjectURL(blobUrl);}
 if(signal?.aborted||isSceneDisposed(scene)){cleanImport(imported);throw Error('hero import cancelled');}
 const skeleton=imported.skeletons.find(s=>s.bones.length===manifest.boneCount);
 const clips=new Map(imported.animationGroups.map(group=>[group.name,group]));
 const actualMeshes=imported.meshes.filter(mesh=>typeof mesh.getTotalVertices==='function'&&mesh.getTotalVertices()>0);
 const missing=REQUIRED_HERO_ACTIONS.filter(name=>!clips.has(name));
 const pbrMaterials=new Set(actualMeshes.map(mesh=>mesh.material).filter(mat=>mat?.getClassName?.()==='PBRMaterial'));
 if(!skeleton||missing.length||actualMeshes.length<1||pbrMaterials.size<1){
  cleanImport(imported);
  throw Error('hero GPU rig/PBR/clip contract failed: '+missing.join(','));
 }
 const root=new TransformNode('RiverExplorerWorldRoot',scene);
 for(const mesh of imported.meshes)if(!mesh.parent)mesh.parent=root;
 for(const mesh of actualMeshes)mesh.isPickable=false;
 let active=null,disposed=false;
 function setPose({position,action='Idle',heading=0}={}){
  if(disposed)throw Error('hero is disposed');
  if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z)||!Number.isFinite(heading))
   throw Error('invalid hero pose');
  root.position.set(position.x,0,position.z);
  root.rotation.y=heading;
  const next=clips.has(action)?action:'Idle';
  if(next!==active){
   if(active)clips.get(active)?.stop();
   clips.get(next).start(true);
   active=next;
  }
  qa.heroAnimation=next;
 }
 function dispose(){
  if(disposed)return;
  disposed=true;
  cleanImport(imported);
  root.dispose();
 }
 qa.heroState='rigged';
 qa.heroBoneCount=skeleton.bones.length;
 qa.heroClipCount=clips.size;
 qa.heroPbrMaterials=pbrMaterials.size;
 qa.heroMeshCount=actualMeshes.length;
 return Object.freeze({setPose,dispose,get activeAction(){return active;}});
}
