/* River Valley geographic reference adapter. WGS84 horizontal positions only.
   Existing terrain elevations/roof heights have NOT been vertically surveyed. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyGeoReference=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const REG=Object.freeze({crs:'EPSG:4326',gameUnits:'approximate metres',longitudeAtZero:-87.895,latitudeAtZ430:37.9325,zAtLatitudeAnchor:430,longitudePerGameX:0.00001137489,latitudePerGameZ:-0.000009009399});
const BBOX=Object.freeze([-87.928,37.909,-87.853,37.96]);
function worldToLonLat(x,z){return [REG.longitudeAtZero+x*REG.longitudePerGameX,REG.latitudeAtZ430+(z-REG.zAtLatitudeAnchor)*REG.latitudePerGameZ];}
function lonLatToWorld(lon,lat){return [(lon-REG.longitudeAtZero)/REG.longitudePerGameX,REG.zAtLatitudeAnchor+(lat-REG.latitudeAtZ430)/REG.latitudePerGameZ];}
function within(lon,lat,bbox=BBOX){return Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=bbox[0]&&lon<=bbox[2]&&lat>=bbox[1]&&lat<=bbox[3];}
function worldRect(bbox=BBOX){if(!Array.isArray(bbox)||bbox.length!==4||!(bbox[2]>bbox[0]&&bbox[3]>bbox[1]))throw Error('Invalid WGS84 bounding box');const [x0,zTop]=lonLatToWorld(bbox[0],bbox[3]),[x1,zBottom]=lonLatToWorld(bbox[2],bbox[1]);return {x0,x1,z0:zTop,z1:zBottom,width:x1-x0,height:zBottom-zTop};}
function worldToPixel(x,z,bbox=BBOX,width=2048,height=1792){const [lon,lat]=worldToLonLat(x,z);return [(lon-bbox[0])/(bbox[2]-bbox[0])*width,(bbox[3]-lat)/(bbox[3]-bbox[1])*height];}
function pixelToWorld(px,py,bbox=BBOX,width=2048,height=1792){return lonLatToWorld(bbox[0]+px/width*(bbox[2]-bbox[0]),bbox[3]-py/height*(bbox[3]-bbox[1]));}
function haversineMeters(a,b){const rad=Math.PI/180,R=6371008.8,dlat=(b[1]-a[1])*rad,dlon=(b[0]-a[0])*rad,lat1=a[1]*rad,lat2=b[1]*rad;const v=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(v)));}
function wgs84LongitudeLatitudeValid(pt){return Array.isArray(pt)&&pt.length>=2&&Number.isFinite(pt[0])&&Number.isFinite(pt[1])&&pt[0]>=-180&&pt[0]<=180&&pt[1]>=-90&&pt[1]<=90;}
function referenceRoadsToGame(features,limit=2450){const roads=[];for(const f of features||[]){const g=f.geometry;if(!g||!['LineString','MultiLineString'].includes(g.type))continue;const lines=g.type==='LineString'?[g.coordinates]:g.coordinates;for(const line of lines){let chunk=[];for(const pt of line){if(!wgs84LongitudeLatitudeValid(pt))continue;const [x,z]=lonLatToWorld(pt[0],pt[1]);if(Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=limit*1.25&&Math.abs(z)<=limit*1.25)chunk.push([x,z]);else{if(chunk.length>=2)roads.push(chunk);chunk=[];}}if(chunk.length>=2)roads.push(chunk);}}return roads;}
return {REG,BBOX,within,worldToLonLat,lonLatToWorld,worldRect,worldToPixel,pixelToWorld,haversineMeters,wgs84LongitudeLatitudeValid,referenceRoadsToGame};
});
