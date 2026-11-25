const test=require('node:test');
const assert=require('node:assert/strict');
const QT=require('../src/quadtree.js');
const opts={height:()=>0,limit:1024,cameraX:900,cameraZ:900,cameraAltitude:20,viewportHeight:720,fovDegrees:60,pixelError:1,maxDepth:5,minDepth:2,maxTiles:19,roughnessFloor:.1};
test('tight terrain budget preserves minimum coverage before refining high-error tiles',()=>{
 const tiles=QT.selectTiles(opts);
 assert.equal(tiles.length,19);
 assert.ok(tiles.every(t=>t.depth>=2));
 assert.equal(tiles.reduce((sum,t)=>sum+t.width*t.width,0),2048**2);
});
test('remaining split budget follows the camera rather than traversal order',()=>{
 for(const [x,z] of [[900,900],[-900,900],[900,-900],[-900,-900]]){
  const tiles=QT.selectTiles({...opts,cameraX:x,cameraZ:z});
  const near=QT.tileAt(QT.makeTileIndex(tiles,opts.limit),x,z);
  assert.equal(near.depth,3);
  assert.equal(tiles.filter(t=>t.depth===3).length,4);
 }
});
test('insufficient coverage budget is distributed breadth-first and deterministically',()=>{
 const a=QT.selectTiles({...opts,maxTiles:7});
 assert.equal(a.length,7);
 assert.ok(a.every(t=>t.depth>=1&&t.depth<=2));
 assert.deepEqual(a,QT.selectTiles({...opts,maxTiles:7}));
});
