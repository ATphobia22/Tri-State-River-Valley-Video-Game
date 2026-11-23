/* Source-aligned footprint roof *topology*, artistic roof heights until roof-return lidar is admitted.
   Offline, dependency-free except bundled Three.js for the unit-instanced mesh. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyBuildingRoofs=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
function quadRoofVertices(points,eave,raise){
 if(!Array.isArray(points)||points.length!==4||![eave,raise].every(Number.isFinite)||raise<=0||raise>10)return null;
 const p=points.map(v=>Array.isArray(v)&&v.length>=2&&v.every(Number.isFinite)?v:null);
 if(p.some(v=>!v))return null;
 const len=i=>Math.hypot(p[(i+1)%4][0]-p[i][0],p[(i+1)%4][1]-p[i][1]);
 const ls=[0,1,2,3].map(len);
 if(Math.min(...ls)<3||Math.max(ls[0]/ls[2],ls[2]/ls[0],ls[1]/ls[3],ls[3]/ls[1])>1.4)return null;
 const d0=[p[1][0]-p[0][0],p[1][1]-p[0][1]],d1=[p[2][0]-p[1][0],p[2][1]-p[1][1]];
 if(Math.abs((d0[0]*d1[0]+d0[1]*d1[1])/(ls[0]*ls[1]))>.35)return null;
 const avg=(a,b)=>[(p[a][0]+p[b][0])/2,(p[a][1]+p[b][1])/2];
 let front,back,left0,left1,right0,right1;
 if(ls[0]+ls[2]>=ls[1]+ls[3]){
  front=avg(0,3);back=avg(1,2);left0=p[0];left1=p[1];right0=p[3];right1=p[2];
 }else{
  front=avg(0,1);back=avg(3,2);left0=p[0];left1=p[3];right0=p[1];right1=p[2];
 }
 const f=[],v=(x,y)=>[x[0],y,x[1]],face=(a,b,c)=>f.push(...a,...b,...c);
 const a=v(left0,eave),b=v(left1,eave),c=v(right0,eave),d=v(right1,eave),r0=v(front,eave+raise),r1=v(back,eave+raise);
 face(a,b,r1);face(a,r1,r0);face(c,r0,r1);face(c,r1,d);
 face(a,r0,c);face(b,d,r1);
 return {vertices:f,status:'ARTISTIC_NO_ROOF_DSM',rise:raise};
}
function makeUnitGable(three){
 const f=[],face=(a,b,c)=>f.push(...a,...b,...c);
 const a=[-.5,0,-.5],b=[-.5,0,.5],c=[.5,0,-.5],d=[.5,0,.5],r0=[0,1,-.5],r1=[0,1,.5];
 face(a,b,r1);face(a,r1,r0);face(c,r0,r1);face(c,r1,d);
 face(a,r0,c);face(b,d,r1);
 const geo=new three.BufferGeometry();
 geo.setAttribute('position',new three.Float32BufferAttribute(f,3));
 geo.computeVertexNormals();
 return geo;
}
return {quadRoofVertices,makeUnitGable,roofHeightStatus:'ARTISTIC_NO_ROOF_DSM'};
});
