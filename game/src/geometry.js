/* Shared deterministic geometry math: visual-only local-game coordinates, NOT a verified geodetic CRS. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyGeometry=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function surfaceHeight(rawHeight,x,z,limit,segments){
   const scale=segments/(2*limit),cx=Math.min(segments,Math.max(0,(x+limit)*scale)),cz=Math.min(segments,Math.max(0,(z+limit)*scale));
   const ix=Math.min(segments-1,Math.floor(cx)), iz=Math.min(segments-1,Math.floor(cz)),fx=cx-ix,fz=cz-iz;
   const step=2*limit/segments,x0=-limit+ix*step,z0=-limit+iz*step;
   const a=rawHeight(x0,z0),b=rawHeight(x0+step,z0),c=rawHeight(x0,z0+step),d=rawHeight(x0+step,z0+step);
   // Three.js PlaneGeometry triangles are (TL, BL, TR), (BL, BR, TR).
   return fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz);
 }
 function clipSegment(x0,z0,x1,z1,limit){
   const dx=x1-x0,dz=z1-z0;let u0=0,u1=1;
   const p=[-dx,dx,-dz,dz],q=[x0+limit,limit-x0,z0+limit,limit-z0];
   for(let i=0;i<4;i++){
     if(p[i]===0){if(q[i]<0)return null;continue;}
     const r=q[i]/p[i];if(p[i]<0)u0=Math.max(u0,r);else u1=Math.min(u1,r);
     if(u0>u1)return null;
   }
   return [x0+u0*dx,z0+u0*dz,x0+u1*dx,z0+u1*dz];
 }
 function drapedRoadVertices(roads,height,limit,maxStep=12){
   const vertices=[];let sections=0;
   for(const road of roads){const pts=road[1];if(!Array.isArray(pts)||pts.length<4)continue;
     const width=road[0]<3?5:road[0]<7?4:2.5;
     for(let k=2;k<pts.length-1;k+=2){
       const clipped=clipSegment(pts[k-2]*.25,pts[k-1]*.25,pts[k]*.25,pts[k+1]*.25,limit);
       if(!clipped)continue;
       const [x0,z0,x1,z1]=clipped,dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz);if(len<.2)continue;
       const steps=Math.min(500,Math.ceil(len/maxStep)),ox=-dz/len*width,oz=dx/len*width;
       for(let j=0;j<steps;j++){
         const a=j/steps,b=(j+1)/steps,xa=x0+dx*a,za=z0+dz*a,xb=x0+dx*b,zb=z0+dz*b;
         const A=[xa-ox,height(xa-ox,za-oz)+.18,za-oz],B=[xa+ox,height(xa+ox,za+oz)+.18,za+oz];
         const D=[xb-ox,height(xb-ox,zb-oz)+.18,zb-oz],E=[xb+ox,height(xb+ox,zb+oz)+.18,zb+oz];
         vertices.push(...A,...B,...D,...D,...B,...E);sections++;
       }
     }
   }
   return {vertices,sections};
 }
 function buildingFootprint(b,limit){
   const ring=b[5];if(!Array.isArray(ring)||ring.length<6)return null;
   const pts=[];let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
   for(let k=0;k<ring.length-1;k+=2){const x=(b[0]+ring[k])*.25,z=(b[1]+ring[k+1])*.25;
     if(!Number.isFinite(x)||!Number.isFinite(z))continue;
     pts.push([x,z]);minX=Math.min(x,minX);maxX=Math.max(x,maxX);minZ=Math.min(z,minZ);maxZ=Math.max(z,maxZ);
   }
   const cx=(minX+maxX)*.5,cz=(minZ+maxZ)*.5;
   if(!pts.length||Math.abs(cx)>limit||Math.abs(cz)>limit)return null;
   return {x:cx,z:cz,points:pts,dx:Math.max(3,Math.min(80,maxX-minX)),dz:Math.max(3,Math.min(100,maxZ-minZ)),h:Math.max(3,Math.min(38,b[2]/100))};
 }
 return {surfaceHeight,clipSegment,drapedRoadVertices,buildingFootprint};
});
