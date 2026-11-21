const {test}=require('node:test');const assert=require('node:assert/strict');
const {surfaceHeight,clipSegment,drapedRoadVertices,buildingFootprint}=require('../src/geometry');
const L=100,samples=32;
const terrain=(x,z)=>5+0.01*x*x+0.03*z+.0002*x*z;
const step=L*2/samples;
const mesh=(x,z)=>surfaceHeight(terrain,x,z,L,samples);
test('surface is identical to each original vertex',()=>{
 for(let i=0;i<=samples;i+=2)for(let j=0;j<=samples;j+=2){const x=-L+i*step,z=-L+j*step;assert.ok(Math.abs(mesh(x,z)-terrain(x,z))<1e-9,`failed ${i},${j}`);}
});
test('interior terrain heights exactly match PlaneGeometry triangles',()=>{
 const x=-L+step*.35,z=-L+step*.27;
 const a=terrain(-L,-L),b=terrain(-L+step,-L),c=terrain(-L,-L+step);
 assert.ok(Math.abs(mesh(x,z)-(a+.35*(b-a)+.27*(c-a)))<1e-9);
 const x2=-L+step*.85,z2=-L+step*.68,d=terrain(-L+step,-L+step);
 assert.ok(Math.abs(mesh(x2,z2)-(d+.15*(c-d)+.32*(b-d)))<1e-9);
});
test('world clipping retains original shared endpoints at boundary',()=>{
 assert.deepEqual(clipSegment(-200,5,200,5,L),[-100,5,100,5]);
 assert.equal(clipSegment(-200,200,-180,175,L),null);
});
test('draped road edge vertices match visible rendered terrain with 18cm clearance',()=>{
 const roads=[[2,[-600,0,600,0]],[1,[0,-600,0,600]],[7,[-400,-400,400,400]]];
 const built=drapedRoadVertices(roads,mesh,L,6);
 assert.ok(built.sections>80);
 for(let i=0;i<built.vertices.length;i+=3){const [x,y,z]=built.vertices.slice(i,i+3);assert.ok(Math.abs(y-mesh(x,z)-.18)<1e-8);}
});
test('building ring and roads share the same local x-z packing',()=>{
 const b=[-400,300,400,2,1,[0,0,40,0,40,40,0,40,0,0]];
 const f=buildingFootprint(b,L);
 assert.deepEqual([f.x,f.z,f.dx,f.dz],[ -95,80,10,10 ].map((n,i)=> i<2 ? n : n));
});
