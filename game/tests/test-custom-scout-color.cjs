'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Three=require('../vendor/three.js'),Model=require('../src/model-loader.js');
function makeStaticColorGLB(){
 const pos=Buffer.from(new Float32Array([0,0,0,1,0,0,0,1,0]).buffer);
 const normals=Buffer.from(new Float32Array([0,0,1,0,0,1,0,0,1]).buffer);
 const color=Buffer.from([185,120,65,255, 60,40,25,255, 50,75,45,255]);
 const indices=Buffer.from(new Uint16Array([0,1,2]).buffer);
 const data=Buffer.concat([pos,normals,color,indices,Buffer.alloc(2)]);
 const views=[];let off=0;
 for(const b of [pos,normals,color,indices]){views.push({buffer:0,byteOffset:off,byteLength:b.length});off+=b.length;}
 const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],
  meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1,COLOR_0:2},indices:3,material:0}]}],
  materials:[{name:'original colors',pbrMetallicRoughness:{roughnessFactor:.92,metallicFactor:0}}],
  buffers:[{byteLength:data.length}],bufferViews:views,
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},
             {bufferView:1,componentType:5126,count:3,type:'VEC3'},
             {bufferView:2,componentType:5121,count:3,type:'VEC4',normalized:true},
             {bufferView:3,componentType:5123,count:3,type:'SCALAR'}]};
 let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const out=Buffer.alloc(12);out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(12+8+json.length+8+data.length,8);
 const j=Buffer.alloc(8);j.writeUInt32LE(json.length);j.writeUInt32LE(0x4e4f534a,4);
 const b=Buffer.alloc(8);b.writeUInt32LE(data.length);b.writeUInt32LE(0x004e4942,4);
 return Buffer.concat([out,j,json,b,data]);
}
test('user static dog vertex COLOR_0 persists into actual Three.js geometry and material',()=>{
 const data=makeStaticColorGLB(),raw=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
 const scene=Model.makeModel(Three,data.toString('base64'));
 let mesh;scene.traverse(obj=>{if(obj.isMesh)mesh=obj;});
 assert.ok(mesh);
 assert.ok(mesh.material.vertexColors);
 assert.equal(mesh.geometry.getAttribute('color').count,3);
 assert.ok(Math.abs(mesh.geometry.getAttribute('color').getX(0)-185/255)<.001);
 mesh.geometry.dispose();mesh.material.dispose();
});
