/* Post-create micro-detail kit for River Explorer procedural roots.
 * Adds collar, radio pouch, watch, tread, etc. if not already present.
 * Safe no-op on skinned GLB meshes (detects userData.asset).
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValleyHeroMicroDetails=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  function enhance(THREE, hero){
    if(!THREE||!hero||!hero.root||!hero.joints)return {ok:false,reason:'invalid-hero'};
    if(hero.skinned||(hero.root.userData&&hero.root.userData.asset&&String(hero.root.userData.asset).indexOf('procedural')<0))
      return {ok:false,reason:'skinned-or-custom'};
    if(hero.root.userData&&hero.root.userData.microDetails===true)
      return {ok:true,reason:'already'};
    const torso=hero.joints.torso;
    if(!torso)return {ok:false,reason:'no-torso'};
    const mat=new THREE.MeshStandardMaterial({color:0x2a2e32,roughness:.95});
    const gold=new THREE.MeshStandardMaterial({color:0xe0b04e,roughness:.3,metalness:.8});
    const cargo=new THREE.MeshStandardMaterial({color:0x3a3834,roughness:.88});
    const added=[];
    function box(parent,size,material,name,pos){
      const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
      m.name='Hero/'+name;m.position.set(...pos);m.castShadow=true;parent.add(m);added.push(m);return m;
    }
    if(!torso.getObjectByName('Hero/radio-pouch')){
      box(torso,[1.15,1.35,.7],cargo,'radio-pouch',[-2.9,-.15,.9]).userData.heroFeature='radio-pouch';
      box(torso,[.35,.35,.2],mat,'radio-antenna',[-2.9,.55,.95]);
    }
    if(!torso.getObjectByName('Hero/collar')){
      box(torso,[3.4,.35,1.9],new THREE.MeshStandardMaterial({color:0x1e2226,roughness:.9}),'collar',[0,4.85,-.15]).userData.heroFeature='collar';
    }
    const leftElbow=hero.joints.leftElbow;
    if(leftElbow&&!leftElbow.getObjectByName('Hero/leftWatchBand')){
      const band=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.28,10),mat);
      band.name='Hero/leftWatchBand';band.position.set(0,-1.85,0);band.userData.heroFeature='watch';
      leftElbow.add(band);added.push(band);
      box(leftElbow,[.85,.15,.85],gold,'leftWatchFace',[0,-1.85,-.55]).userData.heroFeature='watch';
    }
    hero.root.userData.microDetails=true;
    hero.root.userData.heroVersion=hero.root.userData.heroVersion||'2.1-detail';
    return {ok:true,added:added.length};
  }
  return Object.freeze({enhance});
});
