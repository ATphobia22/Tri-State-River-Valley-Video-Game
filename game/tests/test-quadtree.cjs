const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../src/quadtree');
const lim=1400,source=(x,z)=>9*Math.sin(x/133)+4*Math.cos(z/229)+3*Math.sin((x+z)/66);
const options={height:source,limit:lim,cameraX:120,cameraZ:350,cameraAltitude:95,viewportHeight:900,pixelError:6,maxDepth:6,minDepth:2,maxTiles:200};
const tiles=T.selectTiles(options),idx=T.makeTileIndex(tiles,lim);
for(const tile of tiles)tile.samples=T.tileSamples(source,tile,idx);
test('adaptive quadtree partitions every ground point exactly once',()=>{
 for(let i=0;i<400;i++){const x=-lim+Math.random()*lim*2,z=-lim+Math.random()*lim*2;const found=tiles.filter(t=>x>=t.x0&&x<t.x0+t.width&&z>=t.z0&&z<t.z0+t.width);assert.equal(found.length,1);assert.equal(T.tileAt(idx,x,z),found[0]);}
});
test('bounded draw budget and mixed LOD levels',()=>{assert.ok(tiles.length>16);assert.ok(tiles.length<=200);assert.ok(new Set(tiles.map(t=>t.depth)).size>=3);});
test('terrain sample matches its tile surface triangle',()=>{for(let i=0;i<60;i++){const x=-lim+Math.random()*lim*2,z=-lim+Math.random()*lim*2;const tile=T.tileAt(idx,x,z);assert.ok(Number.isFinite(T.terrainHeight(idx,x,z,source)));assert.ok(Math.abs(T.terrainHeight(idx,x,z,source)-T.sampleTile(tile,x,z))<1e-8);}});
test('edge vertices conform to neighboring patch at LOD transition',()=>{
 let count=0;for(const tile of tiles)for(const side of ['top','bottom','left','right']){
  const n=T.edgeNeighbor(tile,idx,side);if(!n||n.depth>=tile.depth)continue;
  const eps=1e-4;
  for(let j=1;j<16;j++){
   const t=j/16,x=(side==='left'?tile.x0:side==='right'?tile.x0+tile.width:tile.x0+t*tile.width),z=(side==='top'?tile.z0:side==='bottom'?tile.z0+tile.width:tile.z0+t*tile.width);
   const a=T.sampleTile(tile,x,z),b=T.sampleTile(n,x,z);
   assert.ok(Math.abs(a-b)<1e-3,`edge gap ${side} ${tile.depth}/${n.depth}: ${a-b}`);count++;
  }
 }
 assert.ok(count>30,`covered transitions ${count}`);
});
test('source terrain point registration is finite at world edges',()=>{for(const [x,z] of [[lim,lim],[-lim,-lim],[-lim,lim],[lim,-lim],[0,0]])assert.ok(Number.isFinite(T.terrainHeight(idx,x,z,source)));});
test('roads and building corners sample the SAME active terrain tiles',()=>{
 const {drapedRoadVertices,buildingFootprint}=require('../src/geometry');
 const roadVertices=drapedRoadVertices([[1,[-3000,1800,3000,1800]]],(x,z)=>T.terrainHeight(idx,x,z,source),lim,12);
 assert.ok(roadVertices.sections>20);
 for(let i=0;i<roadVertices.vertices.length;i+=3){const v=roadVertices.vertices;assert.ok(Math.abs(v[i+1]-T.terrainHeight(idx,v[i],v[i+2],source)-.18)<1e-6);}
 const rec=buildingFootprint([200,100,1300,1,1,[0,0,120,0,120,120,0,120,0,0]],lim);
 assert.ok(rec);
 for(const [x,z] of rec.points)assert.ok(Number.isFinite(T.terrainHeight(idx,x,z,source)));
});
test('terrain detail modes change spatial tile selection counts',()=>{
 const low=T.selectTiles({...options,pixelError:28}),high=T.selectTiles({...options,pixelError:3.5});
 assert.ok(low.length<high.length);assert.ok(high.length<=options.maxTiles);
});
