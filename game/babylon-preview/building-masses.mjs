import {localMeters,validPoint} from './geo-scene.mjs';
// Artistic massing only: convex, hole-free source footprints, estimated heights.
export function buildingMasses(collection,origin,{radius=500,limit=300}={}){
 const result=[];
 for(const feature of collection?.features||[]){
  const g=feature?.geometry;
  const polygons=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
  for(const polygon of polygons){
   if(result.length>=limit)return result;
   const ring=polygon?.[0];
   if(polygon.length!==1||!Array.isArray(ring)||ring.length<4||ring.length>65||!ring.every(validPoint))continue;
   const pts=ring.map(p=>localMeters(p,origin));
   if(Math.hypot(pts[0][0]-pts.at(-1)[0],pts[0][1]-pts.at(-1)[1])>.01)continue;
   pts.pop();
   if(pts.some(p=>Math.hypot(...p)>radius))continue;
   let sign=0,area=0,valid=true;
   for(let i=0;i<pts.length;i++){
    const a=pts[i],b=pts[(i+1)%pts.length],c=pts[(i+2)%pts.length];
    const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
    if(Math.hypot(b[0]-a[0],b[1]-a[1])<.01){valid=false;break;}
    if(Math.abs(cross)>1e-5){if(sign&&Math.sign(cross)!==sign){valid=false;break;}sign=Math.sign(cross);}
    area+=a[0]*b[1]-b[0]*a[1];
   }
   if(!valid||!sign||Math.abs(area)<8)continue;
   if(area<0)pts.reverse();
   const height=Math.min(12,Math.max(3.5,Math.sqrt(Math.abs(area)/2)*.28));
   const positions=[],indices=[];
   for(let i=0;i<pts.length;i++){
    const [x,z]=pts[i],[u,v]=pts[(i+1)%pts.length],n=positions.length/3;
    positions.push(x,0,z,u,0,v,u,height,v,x,height,z);
    indices.push(n,n+1,n+2,n,n+2,n+3);
   }
   const roof=positions.length/3;
   for(const [x,z] of pts)positions.push(x,height,z);
   for(let i=1;i<pts.length-1;i++)indices.push(roof,roof+i+1,roof+i);
   result.push({positions,indices,height,provenance:'artistic-estimated-height'});
  }
 }
 return result;
}
