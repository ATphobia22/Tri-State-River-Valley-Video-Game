/** Fictional game-art admission. Scientific registration is not required. */
const VALID_KINDS=new Set(['mesh','texture','terrain','building','character','wildlife','environment','tileset']);
const VALID_LICENSES=new Set(['CC0-1.0','CC-BY-4.0','CC-BY-SA-4.0','MIT','Apache-2.0','BSD-3-Clause','OFL-1.1','original','licensed-proprietary']);
function isObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)}
export function assessGameArt(asset){
 const reasons=[];
 if(!isObject(asset))return Object.freeze({admitted:false,reasons:['invalid-asset']});
 if(typeof asset.id!=='string'||!/^[a-z0-9][a-z0-9._-]{0,95}$/.test(asset.id))reasons.push('invalid-id');
 if(!VALID_KINDS.has(asset.kind))reasons.push('unsupported-kind');
 if(!VALID_LICENSES.has(asset.license))reasons.push('unapproved-license');
 if(typeof asset.source!=='string'||!asset.source.trim())reasons.push('missing-source');
 if(asset.license==='licensed-proprietary'&&asset.distributionAuthorized!==true)reasons.push('distribution-not-authorized');
 if(asset.license==='CC-BY-SA-4.0'&&asset.shareAlikeCompliant!==true)reasons.push('share-alike-not-confirmed');
 if(['CC-BY-4.0','CC-BY-SA-4.0'].includes(asset.license)&&
    (typeof asset.attribution!=='string'||!asset.attribution.trim()))reasons.push('missing-attribution');
 if(asset.technicallyUsable!==true)reasons.push('not-technically-usable');
 if(asset.integrityVerified!==true)reasons.push('integrity-not-verified');
 if(!isObject(asset.geometry)&&!isObject(asset.media))reasons.push('missing-art-payload');
 if(asset.geometry){
   const {vertices,triangles}=asset.geometry;
   if(!Number.isSafeInteger(vertices)||vertices<1||!Number.isSafeInteger(triangles)||triangles<1)
      reasons.push('invalid-mesh-budgets');
 }
 if(asset.media){
   const {width,height}=asset.media;
   if(!Number.isSafeInteger(width)||width<1||!Number.isSafeInteger(height)||height<1)
      reasons.push('invalid-media-dimensions');
 }
 const admitted=reasons.length===0;
 return Object.freeze({admitted,reasons:Object.freeze(reasons),
   classification:'fictional-game-art',surveyAuthority:false,
   requiresSurveyControl:false,geodeticRegistrationRequired:false});
}
