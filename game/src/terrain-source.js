/* Offline geospatial elevation admission. Invalid or absent source data never replace gameplay terrain.
   USGS 3DEP mosaic is a bare-earth reference, not an independently surveyed local control model. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyTerrainSource=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const FALLBACK_LABEL='Illustrative game elevations (unverified datum)';
const METADATA_URL='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer';
function validSource(candidate){
 if(!candidate||candidate.schemaVersion!==1||!candidate.grid||!candidate.metadata)return false;
 const m=candidate.metadata,g=candidate.grid;
 if(m.sourceId!=='USGS_3DEP'||m.sourceUrl!==METADATA_URL||m.verticalDatumVerified!==false)return false;
 const {cols,rows,lonMin,lonMax,latMin,latMax,minFt,stepFt,b64}=g;
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<64||rows<64||cols>1024||rows>1024)return false;
 if(![lonMin,lonMax,latMin,latMax,minFt,stepFt].every(Number.isFinite))return false;
 // Admission limited to Mount Vernon local stage. A shifted or other-town DEM
 // must not become a plausible-looking false overlay.
 if(lonMin < -88 || lonMax > -87.7 || latMin < 37.8 || latMax > 38.1 || lonMax-lonMin<.02 || latMax-latMin<.02)return false;
 if(minFt < -500 || minFt > 8000 || stepFt <=0 || stepFt >= 1)return false;
 if(typeof b64!=='string'||b64.length>2_000_000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64))return false;
 const expected=Math.ceil(cols*rows*2/3)*4;
 if(b64.length!==expected)return false;
 if(typeof atob==='function'){try{if(atob(b64).length!==cols*rows*2)return false;}catch(_){return false;}}
 return true;
}
function chooseGrid(candidate,fallback){
 if(validSource(candidate))return Object.freeze({grid:candidate.grid,kind:'usgs-3dep',
   label:'USGS 3DEP bare-earth elevation • approximate local game registration',
   metadata:candidate.metadata});
 return Object.freeze({grid:fallback,kind:'illustrative',label:FALLBACK_LABEL,metadata:null});
}
return Object.freeze({chooseGrid,validSource,FALLBACK_LABEL});
});