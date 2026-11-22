/*
 * Offline River Explorer preview scene. Its own camera and lights prevent
 * terrain, road/building meshes or third-person follow-camera clipping from
 * obscuring the protagonist in the Character Studio.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValleyHeroStage=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function create(THREE,Hero){
  if(!THREE||!Hero||typeof Hero.create!=='function')throw new TypeError('Three.js and ValleyHero required');
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x182c2d);
  const camera=new THREE.PerspectiveCamera(37,1,.1,150);
  const hemisphere=new THREE.HemisphereLight(0xc5d8dc,0x4d4e45,1.12);
  scene.add(hemisphere);
  const key=new THREE.DirectionalLight(0xffd9b8,2.10);
  key.position.set(-16,28,-17);scene.add(key);
  const fill=new THREE.DirectionalLight(0xbad5e4,1.05);
  fill.position.set(13,16,-10);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffc692,1.20);
  rim.position.set(2,17,19);scene.add(rim);
  const hero=Hero.create(THREE);
  hero.root.position.set(0,.7,0);
  scene.add(hero.root);
  // Optional inspector for the REAL skinned bone hierarchy, never a fake painted rig.
  const skeletonHelper=hero.skinned&&THREE.SkeletonHelper?new THREE.SkeletonHelper(hero.root):null;
  if(skeletonHelper){
   skeletonHelper.name='River Explorer / live 27-bone overlay';
   skeletonHelper.visible=false;skeletonHelper.renderOrder=10;skeletonHelper.frustumCulled=false;
   skeletonHelper.material.depthTest=false;skeletonHelper.material.transparent=true;
   skeletonHelper.material.opacity=.90;scene.add(skeletonHelper);
  }
  // Independent art-directed display stand, never world terrain.
  const stageAssets=[];
  function add(mesh){scene.add(mesh);stageAssets.push(mesh);return mesh;}
  const baseMat=new THREE.MeshStandardMaterial({color:0x294b48,metalness:.28,roughness:.7});
  const base=add(new THREE.Mesh(new THREE.CylinderGeometry(16,17,1.2,32),baseMat));
  base.position.y=-.9;
  const trimMat=new THREE.MeshStandardMaterial({color:0xbc9159,metalness:.58,roughness:.42});
  const ring=add(new THREE.Mesh(new THREE.TorusGeometry(15.3,.25,7,56),trimMat));
  ring.rotation.x=-Math.PI/2;ring.position.y=-.24;
  const stripeMat=new THREE.MeshBasicMaterial({color:0x436560,transparent:true,opacity:.16});
  const backdrop=add(new THREE.Mesh(new THREE.PlaneGeometry(400,400),stripeMat));
  backdrop.position.set(0,30,55);
  const halo=add(new THREE.Mesh(new THREE.TorusGeometry(11,.18,6,60),
    new THREE.MeshBasicMaterial({color:0x8ebec0,transparent:true,opacity:.35})));
  halo.position.set(0,9,5);
  let width=900,height=650,lastState='idle',focus='full',viewAngle='front';
  function resize(w,h){
   width=Math.max(240,Math.floor(Number.isFinite(w)?w:900));
   height=Math.max(280,Math.floor(Number.isFinite(h)?h:650));
   const phone=width<781;
   camera.aspect=width/height;
   camera.fov=phone?42:37;
   // An independently framed art inspection of the CURRENT skinned GLB.
   // Full-body camera keeps space for the pose panel; close views make
   // 27-joint hand grips and boots auditable in headed browser captures.
   if(focus==='face'){
    camera.position.set(phone?1.2:1.55,phone?15.25:15.1,phone?-12:-9);
    camera.lookAt(0,14.60,-.25);
   }else if(focus==='right-hand'){
    camera.position.set(10.8,13.4,phone?-12:-14);
    camera.lookAt(phone?8.3:9.6,11.8,-.4);
   }else if(focus==='boots'){
    camera.position.set(phone?2.6:3.5,phone?3.6:4.0,phone?-15:-13);
    camera.lookAt(0,1.1,-.6);
   }else{
    camera.position.set(phone?2.3:2.7,phone?12.1:12.1,phone?-38:-29);
    camera.lookAt(phone?-1.0:-1.2,phone?7.8:8.1,0);
   }
   camera.updateProjectionMatrix();
  }
  function setSkeletonVisible(next){
   if(!skeletonHelper)return false;
   skeletonHelper.visible=!!next;
   return skeletonHelper.visible;
  }
  function setFocus(next){
   if(!['full','face','right-hand','boots'].includes(next))throw new RangeError('Invalid character inspection focus');
   focus=next;resize(width,height);
  }
  function setAngle(next){
   const angles={front:0,'three-quarter':-Math.PI/4,side:-Math.PI/2,back:Math.PI};
   if(!Object.prototype.hasOwnProperty.call(angles,next))throw new RangeError('Invalid model turnaround angle');
   viewAngle=next;
   hero.root.rotation.y=angles[next];
  }
  function update({state='idle',stamp=0,dt=.016}={}){
   if(!Hero.STATES.includes(state))state='idle';
   lastState=state;
   const result=hero.update({state,stamp,dt});
   ring.rotation.z=Math.sin(stamp/2900)*.035;
   rim.intensity=1.20+Math.sin(stamp/1600)*.10;
   return result;
  }
  function render(renderer){
   if(!renderer||typeof renderer.render!=='function')throw new TypeError('Expected WebGL renderer');
   renderer.render(scene,camera);
  }
  function dispose(){
   if(skeletonHelper){scene.remove(skeletonHelper);skeletonHelper.geometry.dispose();skeletonHelper.material.dispose();}
   hero.dispose();
   for(const object of stageAssets){
    if(object.geometry)object.geometry.dispose();
    if(object.material)object.material.dispose();
    if(object.parent)object.parent.remove(object);
   }
   if(hero.root.parent)hero.root.parent.remove(hero.root);
  }
  resize(width,height);
  return Object.freeze({scene,camera,hero,resize,setFocus,setAngle,setSkeletonVisible,update,render,dispose,get skeletonVisible(){return !!skeletonHelper?.visible;},get skeletonBoneCount(){return hero.skinned?Object.keys(hero.joints).length:0;},get state(){return lastState;},get focus(){return focus;},get angle(){return viewAngle;}});
 }
 return Object.freeze({create});
});
