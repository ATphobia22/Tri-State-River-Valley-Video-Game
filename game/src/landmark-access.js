/* Preserve saved game progress when the updated courthouse replaces the old downtown proxy.
   Source: Indiana GIO 2020 object 741267; approximate horizontal registration only. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyLandmarkAccess=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
function valid(a){
 const c=a?.gamePosition,d=a?.dimensionsMeters,r=a?.rotationRadians;
 return !!c&&!!d&&[c.x,c.z,d.width,d.depth,r].every(Number.isFinite)&&
   d.width>5&&d.width<120&&d.depth>5&&d.depth<140&&Math.abs(r)<=Math.PI*2;
}
function insideCourthouse(point,anchor,padding=2.0){
 if(!valid(anchor)||![point?.x,point?.z,padding].every(Number.isFinite))return false;
 const dx=point.x-anchor.gamePosition.x,dz=point.z-anchor.gamePosition.z;
 const c=Math.cos(anchor.rotationRadians),s=Math.sin(anchor.rotationRadians);
 const localX=c*dx-s*dz,localZ=s*dx+c*dz;
 return Math.abs(localX)<=anchor.dimensionsMeters.width/2+padding &&
        Math.abs(localZ)<=anchor.dimensionsMeters.depth/2+padding;
}
function safeCourthouseApproach(anchor){
 if(!valid(anchor))return null;
 const {x,z}=anchor.gamePosition;
 // A public-square gameplay viewpoint outside the whole building, not a surveyed entrance.
 const reach=Math.max(anchor.dimensionsMeters.width,anchor.dimensionsMeters.depth)/2+30;
 return {x:Math.round((x-reach)*100)/100,z:Math.round(z*100)/100};
}
function safeResume(point,anchor){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return point;
 return insideCourthouse(point,anchor)?safeCourthouseApproach(anchor):point;
}
return {valid,insideCourthouse,safeCourthouseApproach,safeResume};
});
