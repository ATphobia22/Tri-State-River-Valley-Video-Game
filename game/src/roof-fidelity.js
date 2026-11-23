/* Roof meshes driven by actual IGIO building footprint polygon axes.
 * This is a gameplay design classification, never a claimed LiDAR/photogrammetry
 * roof, ridge, pitch, height or approved building record.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyRoofFidelity=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const EPS=1e-7;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const midpoint=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const tri=(a,b,c)=>[...a,...b,...c];
function oriented(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function intersects(a,b,c,d){
 const p=oriented(a,b,c),q=oriented(a,b,d),r=oriented(c,d,a),s=oriented(c,d,b);
 return p*q<-EPS&&r*s<-EPS;
}
function validate(points,y){
 if(!Number.isFinite(y)||y< -10000||y>10000)throw Error('Invalid roof elevation height');
 if(!Array.isArray(points)||points.length<3||points.length>256)throw Error('Invalid building footprint');
 const ring=points.map(p=>[p?.[0],p?.[1]]);
 if(ring.length>3&&distance(ring[0],ring[ring.length-1])<EPS)ring.pop();
 if(ring.length<3||ring.some(p=>p.length!==2||p.some(v=>!Number.isFinite(v))))throw Error('Invalid building footprint coordinates');
 let twiceArea=0;
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length];
  twiceArea+=a[0]*b[1]-b[0]*a[1];
  if(distance(a,b)<EPS)throw Error('Degenerate building footprint edge');
  for(let j=i+2;j<ring.length;j++){
   if(i===0&&j===ring.length-1)continue;
   if(intersects(a,b,ring[j],ring[(j+1)%ring.length]))throw Error('Building footprint self intersection');
  }
 }
 if(Math.abs(twiceArea)<.1)throw Error('Building footprint area is zero');
 return ring;
}
function planRoof(points,roofY,options={}){
 const ring=validate(points,roofY),form=options.form||'parapet',positions=[];
 if(form!=='gable'&&form!=='parapet')throw Error('Unknown illustrative roof form');
 if(form==='gable'&&ring.length===4){
  const p=ring,e0=distance(p[0],p[1]),e1=distance(p[1],p[2]);
  if(Math.min(e0,e1)<3)throw Error('Roof footprint too narrow for non-surveyed gable');
  const rise=Math.max(.25,Math.min(4,Number.isFinite(options.rise)?options.rise:Math.min(e0,e1)*.18));
  const y=roofY+rise;let start,end,sideA,sideB;
  if(e0>=e1){start=midpoint(p[0],p[3]);end=midpoint(p[1],p[2]);sideA=[p[0],p[1]];sideB=[p[3],p[2]];}
  else{start=midpoint(p[0],p[1]);end=midpoint(p[3],p[2]);sideA=[p[1],p[2]];sideB=[p[0],p[3]];}
  const as=[...start,y],ae=[...end,y];
  const a=[sideA[0][0],roofY,sideA[0][1]],b=[sideA[1][0],roofY,sideA[1][1]];
  const c=[sideB[0][0],roofY,sideB[0][1]],d=[sideB[1][0],roofY,sideB[1][1]];
  // Map geographic horizontal (x,z) pairs into Three.js 3D (x,y,z).
  const start3=[start[0],y,start[1]],end3=[end[0],y,end[1]];
  positions.push(...tri(a,b,start3),...tri(b,end3,start3),...tri(c,start3,d),...tri(d,start3,end3));
  return {kind:'ILLUSTRATIVE_GABLE',positions,ridgeY:y,ridgeStart:start,ridgeEnd:end};
 }
 const rise=Math.max(.4,Math.min(1.25,options.parapetHeight??.82));
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length];
  const lowA=[a[0],roofY,a[1]],lowB=[b[0],roofY,b[1]];
  const highA=[a[0],roofY+rise,a[1]],highB=[b[0],roofY+rise,b[1]];
  positions.push(...tri(lowA,lowB,highA),...tri(highA,lowB,highB));
 }
 return {kind:'ILLUSTRATIVE_PARAPET',positions,ridgeY:null,ridgeStart:null,ridgeEnd:null};
}
function suggestedForm(record){
 // Intentional, non-factual art-direction convention: only small simple four-corner
 // buildings receive pitched roofs. Historic commercial blocks remain parapets.
 const points=record?.points||[];
 const shortSide=Math.min(record?.dx||0,record?.dz||0);
 return points.length===4&&shortSide<18&&Math.max(record.dx,record.dz)<33?'gable':'parapet';
}
return {planRoof,suggestedForm,validate};
});