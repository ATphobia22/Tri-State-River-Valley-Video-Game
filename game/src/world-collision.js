/* Deterministic game-coordinate character collision. Approximate capsule in XZ,
 * spatial hash for nearby building AABBs and swept-circle wall sliding.
 * Building footprints are derived art proxies, not survey-level solids. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyCollision=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function create(buildings=[],{cell=64,radius=1.4,stepHeight=2.8,maxSlope=.95}={}){
  if(!Array.isArray(buildings)||![cell,radius,stepHeight,maxSlope].every(Number.isFinite)||cell<8||radius<=0)throw Error('Invalid collision world');
  const cells=new Map(),valid=[];
  for(const b of buildings){
   if(!b||![b.x,b.z,b.dx,b.dz,b.h].every(Number.isFinite)||b.dx<=0||b.dz<=0||b.h<=0)continue;
   const points=Array.isArray(b.points)&&b.points.length>=3&&b.points.every(p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite))?
     b.points.map(p=>[p[0],p[1]]):null;
   const minPX=points?Math.min(...points.map(p=>p[0])):b.x-b.dx/2;
   const maxPX=points?Math.max(...points.map(p=>p[0])):b.x+b.dx/2;
   const minPZ=points?Math.min(...points.map(p=>p[1])):b.z-b.dz/2;
   const maxPZ=points?Math.max(...points.map(p=>p[1])):b.z+b.dz/2;
   const item={x:(minPX+maxPX)/2,z:(minPZ+maxPZ)/2,halfX:(maxPX-minPX)/2,halfZ:(maxPZ-minPZ)/2,height:b.h,points};
   valid.push(item);
   const minX=Math.floor((item.x-item.halfX-radius)/cell),maxX=Math.floor((item.x+item.halfX+radius)/cell);
   const minZ=Math.floor((item.z-item.halfZ-radius)/cell),maxZ=Math.floor((item.z+item.halfZ+radius)/cell);
   for(let ix=minX;ix<=maxX;ix++)for(let iz=minZ;iz<=maxZ;iz++){
    const k=ix+','+iz;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(item);
   }
  }
  const candidate=(x,z)=>cells.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[];
  // Disk against footprint edges, with winding-independent inside test.
  // The disk is the horizontal cross-section of the capsule. Only buildings
  // with actual polygon rings receive exact footprint tests.
  const overlaps=(x,z,b)=>{
   if(Math.abs(x-b.x)>=b.halfX+radius||Math.abs(z-b.z)>=b.halfZ+radius)return false;
   if(!b.points)return true;
   let inside=false,r2=radius*radius;
   for(let i=0,j=b.points.length-1;i<b.points.length;j=i++){
    const [ax,az]=b.points[j],[bx,bz]=b.points[i],dx=bx-ax,dz=bz-az;
    if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
    const len=dx*dx+dz*dz;if(len<=1e-12)continue;
    const t=clamp(((x-ax)*dx+(z-az)*dz)/len,0,1);
    const ex=x-(ax+t*dx),ez=z-(az+t*dz);
    if(ex*ex+ez*ez<r2)return true;
   }
   return inside;
  };
  function blocked(x,z,fromX=x,fromZ=z){
   for(const b of candidate(x,z)){
    if(overlaps(x,z,b)&&!overlaps(fromX,fromZ,b))return true;
   }return false;
  }
  function move(start,end,{groundAt=null,airborne=false,drive=false}={}){
   if(!start||!end||![start.x,start.z,end.x,end.z].every(Number.isFinite))throw Error('Finite world positions required');
   const deltaX=end.x-start.x,deltaZ=end.z-start.z,distance=Math.hypot(deltaX,deltaZ);
   // Limit travel distance per sweep for high-speed driving / lag spikes.
   const steps=Math.max(1,Math.min(180,Math.ceil(distance/Math.max(.75,radius*.7))));
   let x=start.x,z=start.z,wallHits=0,terrainStops=0;
   const height=(a,b)=>{const h=typeof groundAt==='function'?groundAt(a,b):0;return Number.isFinite(h)?h:0;};
   const slopeMax=drive?2.3:maxSlope;
   const tooSteep=(a,b,ox,oz)=>{
    if(airborne)return false;
    const rise=height(a,b)-height(ox,oz),length=Math.hypot(a-ox,b-oz);
    // Stair-step threshold permits small vertical risers independent of
    // horizontal run, while long steep hills remain impassable.
    return rise>stepHeight&&rise/Math.max(length,.001)>slopeMax;
   };
   for(let i=0;i<steps;i++){
    const dx=deltaX/steps,dz=deltaZ/steps,nx=x+dx,nz=z+dz;
    if(!blocked(nx,nz,x,z)&&!tooSteep(nx,nz,x,z)){x=nx;z=nz;continue;}
    const canX=!blocked(nx,z,x,z)&&!tooSteep(nx,z,x,z);
    const canZ=!blocked(x,nz,x,z)&&!tooSteep(x,nz,x,z);
    if(canX){x=nx;wallHits++;}
    else if(canZ){z=nz;wallHits++;}
    else{wallHits++;terrainStops++;}
   }
   return {x,z,blocked:wallHits>0,wallHits,terrainStops,obstacles:valid.length};
  }
  return Object.freeze({move,blocked,snapshot:()=>({obstacles:valid.length,cells:cells.size,radius,stepHeight})});
 }
 return Object.freeze({create});
});