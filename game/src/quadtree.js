/* River Valley adaptive terrain: deterministic screen-error quadtree with crack-conforming edges.
 * Inspired by general CDLOD/quantized-mesh literature. No third-party code copied.
 * Game-local meters only; no claim of geodetic survey alignment. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyTerrain=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const key=(d,x,z)=>`${d}:${x}:${z}`;
const WIDTH=16;
function interpolate(a,b,c,d,u,v){return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);}
function rawTileError(height,t){
 const {x0,z0,width}=t,h00=height(x0,z0),h10=height(x0+width,z0),h01=height(x0,z0+width),h11=height(x0+width,z0+width);
 let error=0;
 for(let y=0;y<=4;y++)for(let x=0;x<=4;x++){
   const u=x/4,v=y/4;error=Math.max(error,Math.abs(height(x0+u*width,z0+v*width)-interpolate(h00,h10,h01,h11,u,v)));
 }
 return error;
}
function selectTiles({height,limit,cameraX=0,cameraZ=0,cameraAltitude=100,viewportHeight=720,fovDegrees=60,pixelError=18,maxDepth=5,minDepth=2,maxTiles=220,roughnessFloor=.01}){
 if(!(limit>0&&maxDepth>=minDepth&&maxDepth<12))throw new Error('Invalid terrain selection parameters');
 // Refine required coverage breadth-first, then spend remaining splits on
 // the largest projected error. Each split costs exactly three leaf slots.
 const focal=viewportHeight/(2*Math.tan(fovDegrees*Math.PI/360));
 function evaluate(t){
  const cx=clamp(cameraX,t.x0,t.x0+t.width),cz=clamp(cameraZ,t.z0,t.z0+t.width);
  const distance=Math.max(20,Math.hypot(cameraX-cx,cameraZ-cz,cameraAltitude));
  const geometricError=Math.max(rawTileError(height,t),t.width*roughnessFloor);
  return {...t,geometricError,screenError:geometricError*focal/distance};
 }
 const root=evaluate({depth:0,ix:0,iz:0,x0:-limit,z0:-limit,width:limit*2});
 const leaves=new Map([[key(0,0,0),root]]),candidates=[];
 function enqueue(t){if(t.depth<maxDepth&&(t.depth<minDepth||t.screenError>pixelError))candidates.push(t);}
 function priority(a,b){
  const requiredA=a.depth<minDepth,requiredB=b.depth<minDepth;
  if(requiredA!==requiredB)return requiredA?-1:1;
  if(requiredA&&a.depth!==b.depth)return a.depth-b.depth;
  return b.screenError-a.screenError||a.depth-b.depth||a.iz-b.iz||a.ix-b.ix;
 }
 enqueue(root);
 while(candidates.length&&leaves.size+3<=maxTiles){
  candidates.sort(priority);
  const t=candidates.shift(),w=t.width/2,d=t.depth+1;
  leaves.delete(key(t.depth,t.ix,t.iz));
  for(let j=0;j<2;j++)for(let i=0;i<2;i++){
   const child=evaluate({depth:d,ix:t.ix*2+i,iz:t.iz*2+j,x0:t.x0+i*w,z0:t.z0+j*w,width:w});
   leaves.set(key(d,child.ix,child.iz),child);enqueue(child);
  }
 }
 return [...leaves.values()];
}
function tileAt(tiles,x,z){
 for(let d=tiles.maxDepth;d>=0;d--){let n=2**d;let ix=clamp(Math.floor((x+tiles.limit)/(tiles.limit*2)*n),0,n-1),iz=clamp(Math.floor((z+tiles.limit)/(tiles.limit*2)*n),0,n-1);let t=tiles.byKey.get(key(d,ix,iz));if(t)return t;}
 return null;
}
function makeTileIndex(list,limit){return {maxDepth:list.reduce((a,t)=>Math.max(a,t.depth),0),limit,byKey:new Map(list.map(t=>[key(t.depth,t.ix,t.iz),t]))};}
function edgeNeighbor(tile,index,side){const step=tile.width,epsilon=1e-6;
 const x=side==='left'?tile.x0-epsilon:side==='right'?tile.x0+step+epsilon:tile.x0+step/2;
 const z=side==='top'?tile.z0-epsilon:side==='bottom'?tile.z0+step+epsilon:tile.z0+step/2;
 if(x< -index.limit||x>index.limit||z< -index.limit||z>index.limit)return null;
 return tileAt(index,x,z);
}
function sampleUnadjustedEdge(height,t,side,coord,segments=WIDTH){
 const step=t.width/segments;
 let pos,point;
 if(side==='left'||side==='right'){pos=(coord-t.z0)/step;point=i=>height(side==='left'?t.x0:t.x0+t.width,t.z0+i*step);}
 else{pos=(coord-t.x0)/step;point=i=>height(t.x0+i*step,side==='top'?t.z0:t.z0+t.width);}
 pos=clamp(pos,0,segments);let i=Math.min(segments-1,Math.floor(pos)),u=pos-i;
 return point(i)*(1-u)+point(i+1)*u;
}
function tileSamples(height,t,index,segments=WIDTH){
 const data=new Float32Array((segments+1)**2),neighbors={};
 for(const side of ['top','bottom','left','right'])neighbors[side]=edgeNeighbor(t,index,side);
 for(let j=0;j<=segments;j++)for(let i=0;i<=segments;i++){
  let x=t.x0+t.width*i/segments,z=t.z0+t.width*j/segments,y=height(x,z);
  // On a finer tile, use the neighboring coarse tile's edge interpolation at its own grid resolution.
  // The same-depth edge remains precisely identical from shared raw height samples.
  if(j===0&&neighbors.top&&neighbors.top.depth<t.depth)y=sampleUnadjustedEdge(height,neighbors.top,'bottom',x,segments);
  if(j===segments&&neighbors.bottom&&neighbors.bottom.depth<t.depth)y=sampleUnadjustedEdge(height,neighbors.bottom,'top',x,segments);
  if(i===0&&neighbors.left&&neighbors.left.depth<t.depth)y=sampleUnadjustedEdge(height,neighbors.left,'right',z,segments);
  if(i===segments&&neighbors.right&&neighbors.right.depth<t.depth)y=sampleUnadjustedEdge(height,neighbors.right,'left',z,segments);
  data[j*(segments+1)+i]=y;
 }
 return data;
}
function sampleTile(t,x,z,segments=WIDTH){
 if(!t.samples)throw new Error('Tile heights not initialized');
 let u=clamp((x-t.x0)/t.width*segments,0,segments),v=clamp((z-t.z0)/t.width*segments,0,segments);
 let ix=Math.min(segments-1,Math.floor(u)),iz=Math.min(segments-1,Math.floor(v)),fx=u-ix,fz=v-iz;
 const idx=(j,i)=>t.samples[j*(segments+1)+i];
 return interpolate(idx(iz,ix),idx(iz,ix+1),idx(iz+1,ix),idx(iz+1,ix+1),fx,fz);
}
function terrainHeight(index,x,z,source){const t=tileAt(index,x,z);return t?.samples?sampleTile(t,x,z):source(x,z);}
return {WIDTH,key,interpolate,rawTileError,selectTiles,tileAt,makeTileIndex,edgeNeighbor,sampleUnadjustedEdge,tileSamples,sampleTile,terrainHeight};
});
