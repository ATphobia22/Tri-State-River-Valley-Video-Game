/* Small authored-style 3D vignettes for county-region exploration in the
 * EXISTING local stage. They are explicitly interpretive, NOT actual site meshes.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyCountyScenes=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
function create(T,scene,ground,atlas){
 if(!T?.Group||!atlas?.STAGES)throw Error('Three.js and county region guide required');
 const root=new T.Group();root.name='Posey County / interpretive regional destinations';scene.add(root);
 const material={
  brick:new T.MeshStandardMaterial({color:0x9e6955,roughness:.91}),
  timber:new T.MeshStandardMaterial({color:0x80634d,roughness:.9}),
  cream:new T.MeshStandardMaterial({color:0xd2c4a7,roughness:.82}),
  stone:new T.MeshStandardMaterial({color:0x97938b,roughness:.98}),
  slate:new T.MeshStandardMaterial({color:0x5e6668,roughness:.93}),
  grass:new T.MeshStandardMaterial({color:0x667c4c,roughness:.99}),
  metal:new T.MeshStandardMaterial({color:0x6b7876,roughness:.65,metalness:.27}),
  gold:new T.MeshBasicMaterial({color:0xffd480}),
  glass:new T.MeshStandardMaterial({color:0x607c84,roughness:.28,metalness:.18})
 };
 const groups={},colliders=[],objects=[];
 function item(g,geom,mat,x,y,z){const m=new T.Mesh(geom,mat);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;g.add(m);objects.push(m);return m;}
 const box=(g,mat,x,y,z,w,h,d)=>item(g,new T.BoxGeometry(w,h,d),mat,x,y,z);
 const roof=(g,mat,x,y,z,w,h,d)=>{const m=item(g,new T.ConeGeometry(1,1,4),mat,x,y,z);m.rotation.y=Math.PI/4;m.scale.set(w,h,d);return m;};
 const post=(g,mat,x,y,z,r=1,h=12)=>item(g,new T.CylinderGeometry(r,r,h,7),mat,x,y,z);
 const tree=(g,x,z,scale=1)=>{post(g,material.timber,x,5*scale,z,.8*scale,10*scale);
  const m=item(g,new T.ConeGeometry(5*scale,14*scale,7),material.grass,x,17*scale,z);return m;};
 const building=(g,mat,x,z,w,d,h)=>{box(g,mat,x,h/2,z,w,h,d);roof(g,material.slate,x,h+3,z,w*.64,8,d*.64);
  box(g,material.glass,x,7,z+d/2+.15,5,5,.3);
  colliders.push({x:g.position.x+x,z:g.position.z+z,dx:w,dz:d,h:h+7,
   points:[[x-w/2+g.position.x,z-d/2+g.position.z],[x+w/2+g.position.x,z-d/2+g.position.z],
   [x+w/2+g.position.x,z+d/2+g.position.z],[x-w/2+g.position.x,z+d/2+g.position.z]]});};
 for(const [id,s] of Object.entries(atlas.STAGES)){
  if(id==='mount-vernon')continue;
  const group=new T.Group();group.name=s.title+' / artistic interpretation';group.position.set(s.x,ground(s.x,s.z),s.z);
  root.add(group);groups[id]=group;
  // Welcome ring and self-contained beacon identify this as a destination.
  post(group,material.gold,0,8,0,1.4,16);
  item(group,new T.TorusGeometry(7,.6,7,28),material.gold,0,17,0).rotation.x=Math.PI/2;
  if(id==='new-harmony'){
   building(group,material.cream,-28,-34,19,25,15);building(group,material.brick,35,-24,22,21,18);
   box(group,material.stone,0,.5,34,18,1,38);
   item(group,new T.TorusGeometry(14,1,8,28),material.stone,-30,9,30).rotation.x=Math.PI/2;
   for(let k=0;k<6;k++){const th=k*Math.PI/3;tree(group,52+Math.cos(th)*21,25+Math.sin(th)*21,.8);}
  }else if(id==='griffin'){
   for(let k=0;k<14;k++){const a=k*2.399,r=17+Math.sqrt(k+1)*11;tree(group,Math.cos(a)*r,Math.sin(a)*r,.7+(k%3)*.17);}
   box(group,material.timber,0,17,-44,20,2,16);
   for(const x of [-8,8])for(const z of [-50,-38])post(group,material.timber,x,8,z,.8,16);
   roof(group,material.slate,0,23,-44,14,6,11);
   box(group,material.stone,0,.4,34,22,.8,9);
  }else if(id==='poseyville'){
   building(group,material.brick,-36,-32,36,26,18);
   for(const x of [8,34]){post(group,material.metal,x,14,-43,7,27);
    item(group,new T.ConeGeometry(7,7,10),material.slate,x,31,-43);}
   for(let k=0;k<7;k++)box(group,material.timber,-55+k*16,3,42,10,6,11);
   box(group,material.stone,0,1,10,88,1,13);
  }else if(id==='cynthiana'){
   building(group,material.cream,-40,-31,24,22,17);
   for(let k=0;k<8;k++){tree(group,-70+k*18,52,1.1);box(group,material.grass,-70+k*18,.5,-65,9,1,18);}
   for(let k=0;k<6;k++){const th=k*Math.PI/3;post(group,material.stone,26+14*Math.cos(th),7,17+14*Math.sin(th),1,14);}
   roof(group,material.slate,26,18,17,20,8,20);
  }
 }
 return {root,groups,colliders,counts:{regionVignettes:Object.keys(groups).length,meshes:objects.length,colliders:colliders.length},
  dispose(){scene.remove(root);root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});Object.values(material).forEach(m=>m.dispose());}};
}
return Object.freeze({create});
});