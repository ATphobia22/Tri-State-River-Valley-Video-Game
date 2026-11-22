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
  scene.background=new THREE.Color(0x10282c);
  const camera=new THREE.PerspectiveCamera(37,1,.1,150);
  const hemisphere=new THREE.HemisphereLight(0xc8e4e8,0x48483e,1.65);
  scene.add(hemisphere);
  const key=new THREE.DirectionalLight(0xffd6a6,3.3);
  key.position.set(-16,28,-17);scene.add(key);
  const fill=new THREE.DirectionalLight(0xa4cfeb,2);
  fill.position.set(13,16,-10);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffba73,2.1);
  rim.position.set(2,17,19);scene.add(rim);
  const hero=Hero.create(THREE);
  hero.root.position.set(0,.7,0);
  scene.add(hero.root);
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
  let width=900,height=650,lastState='idle',focus='full';
  function resize(w,h){
   width=Math.max(240,Math.floor(Number.isFinite(w)?w:900));
   height=Math.max(280,Math.floor(Number.isFinite(h)?h:650));
   const phone=width<781;
   camera.aspect=width/height;
   camera.fov=phone?42:37;
   // An independently framed art inspection of the CURRENT skinned GLB.
   // Full-body camera keeps space for the pose panel; close views make
   // 27-joint hand grips and boots auditable in headed browser captures.
   if(focus==='right-hand'){
    camera.position.set(10.8,13.4,phone?-12:-14);
    camera.lookAt(phone?8.3:9.6,11.8,-.4);
   }else if(focus==='boots'){
    camera.position.set(phone?2.6:3.5,phone?3.6:4.0,phone?-15:-13);
    camera.lookAt(0,1.1,-.6);
   }else{
    camera.position.set(phone?2:2.5,phone?12.8:12.5,phone?-51:-34);
    camera.lookAt(phone?-1.8:-2.2,phone?3.7:8,0);
   }
   camera.updateProjectionMatrix();
  }
  function setFocus(next){
   if(!['full','right-hand','boots'].includes(next))throw new RangeError('Invalid character inspection focus');
   focus=next;resize(width,height);
  }
  function update({state='idle',stamp=0,dt=.016}={}){
   if(!Hero.STATES.includes(state))state='idle';
   lastState=state;
   const result=hero.update({state,stamp,dt});
   ring.rotation.z=Math.sin(stamp/2900)*.035;
   rim.intensity=2.1+Math.sin(stamp/1600)*.17;
   return result;
  }
  function render(renderer){
   if(!renderer||typeof renderer.render!=='function')throw new TypeError('Expected WebGL renderer');
   renderer.render(scene,camera);
  }
  function dispose(){
   hero.dispose();
   for(const object of stageAssets){
    if(object.geometry)object.geometry.dispose();
    if(object.material)object.material.dispose();
    if(object.parent)object.parent.remove(object);
   }
   if(hero.root.parent)hero.root.parent.remove(hero.root);
  }
  resize(width,height);
  return Object.freeze({scene,camera,hero,resize,setFocus,update,render,dispose,get state(){return lastState;},get focus(){return focus;}});
 }
 return Object.freeze({create});
});
