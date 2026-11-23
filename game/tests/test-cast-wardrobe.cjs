'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Three=require('../vendor/three.js'),Wardrobe=require('../src/cast-wardrobe.js');
const Cast=require('../src/family-cast.js');
test('eight individual wardrobe prototypes match eight numbered figures; family sets are excluded',()=>{
 assert.equal(Object.keys(Wardrobe.STYLE).length,8);
 for(const e of Cast.ENTRIES.filter(x=>x.kind==='figure'))assert.ok(Wardrobe.STYLE[e.id],e.id);
 assert.equal(Wardrobe.STYLE['yeida-family-set'],undefined);
 assert.equal(Wardrobe.STYLE['tucker-family-set'],undefined);
 assert.throws(()=>Wardrobe.saveSelection('yeida-family-set'),/Unknown/);
});
test('stylized wardrobe attaches to animated Head joint, never replaces rig or animation clips',()=>{
 const root=new Three.Group(),head=new Three.Bone();head.name='Head';root.add(head);
 const m1=new Three.MeshStandardMaterial({name:'River shirt',color:0xffffff}),m2=new Three.MeshStandardMaterial({name:'River cargo',color:0xffffff});
 const meshes=[new Three.Mesh(new Three.BoxGeometry(1,1,1),m1),new Three.Mesh(new Three.BoxGeometry(1,1,1),m2)];
 let disposed=0;const rig={root,skinned:true,joints:{Head:head},meshes,clips:Array.from({length:13}),dispose(){disposed++;}};
 const applied=Wardrobe.decorate(Three,rig,'pete-yeida');
 assert.equal(applied.id,'pete-yeida');assert.equal(rig.castId,'pete-yeida');assert.equal(head.children.length,1);
 assert.ok(head.children[0].children.length>0);
 assert.equal(rig.clips.length,13);
 rig.dispose();assert.equal(disposed,1);assert.equal(head.children.length,0);
 for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}
});
test('unsupported figure or unrigged mesh is not converted into a fake playable person',()=>{
 assert.equal(Wardrobe.decorate(Three,{skinned:false},'pete-yeida'),null);
 assert.equal(Wardrobe.decorate(Three,{skinned:true,joints:{Head:new Three.Bone()}},'yeida-family-set'),null);
});
