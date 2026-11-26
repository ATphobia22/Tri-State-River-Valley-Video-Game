'use strict';
// Registration is a review gate, NOT a transform derivation.
// Control point counts and RMSE values must be independently evidenced by an authoritative manifest.
function admit(manifest){
 const m=manifest&&typeof manifest==='object'?manifest:{};
 const hex=typeof m.sha256==='string'&&/^[a-f0-9]{64}$/i.test(m.sha256);
 const valid=m.status==='verified'&&m.approved===true&&m.epsg===4978&&hex&&
  Number.isInteger(m.controlPoints)&&m.controlPoints>=3&&
  Number.isFinite(m.horizontalRMSE)&&m.horizontalRMSE>=0&&
  Number.isFinite(m.verticalRMSE)&&m.verticalRMSE>=0;
 return {admitted:valid,reason:valid?'registration-metadata-present':'unregistered-or-incomplete',manifest:m};
}
module.exports={admit};
