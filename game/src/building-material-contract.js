/* Procedural building-material defaults, not surveys or photogrammetry.
 * glTF 2.0 metallic-roughness factors are linear, normalized inputs.
 * MeshStandardMaterial uses the same scalar roughness/metalness model.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyBuildingMaterials=api;})(typeof globalThis==='object'?globalThis:this,function(){'use strict';
const CATALOG=Object.freeze({
 brick:Object.freeze({baseColorFactor:Object.freeze([.55,.24,.17,1]),metallicFactor:0,roughnessFactor:.9}),
 limestone:Object.freeze({baseColorFactor:Object.freeze([.75,.72,.61,1]),metallicFactor:0,roughnessFactor:.88}),
 concrete:Object.freeze({baseColorFactor:Object.freeze([.51,.53,.52,1]),metallicFactor:0,roughnessFactor:.92}),
 wood:Object.freeze({baseColorFactor:Object.freeze([.45,.28,.16,1]),metallicFactor:0,roughnessFactor:.86}),
 glass:Object.freeze({baseColorFactor:Object.freeze([.65,.78,.83,1]),metallicFactor:0,roughnessFactor:.14}),
 asphalt:Object.freeze({baseColorFactor:Object.freeze([.14,.15,.16,1]),metallicFactor:0,roughnessFactor:.94}),
 metal:Object.freeze({baseColorFactor:Object.freeze([.54,.57,.60,1]),metallicFactor:1,roughnessFactor:.36})
});
function buildingMaterial(name){
 const key=String(name||'').toLowerCase(),preset=Object.prototype.hasOwnProperty.call(CATALOG,key)&&CATALOG[key];
 if(!preset)throw new RangeError('Unknown procedural building material: '+name);
 return Object.freeze({name:key,baseColorFactor:preset.baseColorFactor,metallicFactor:preset.metallicFactor,roughnessFactor:preset.roughnessFactor,provenance:'procedural'});
}
function threeMaterial(THREE,name){
 if(!THREE||typeof THREE.MeshStandardMaterial!=='function')throw new TypeError('THREE.MeshStandardMaterial required');
 const m=buildingMaterial(name),c=m.baseColorFactor;
 const out=new THREE.MeshStandardMaterial({color:new THREE.Color(c[0],c[1],c[2]),roughness:m.roughnessFactor,metalness:m.metallicFactor,transparent:c[3]<1,opacity:c[3]});
 out.userData={...(out.userData||{}),surfaceKind:m.name,materialProvenance:m.provenance};
 return out;
}
return Object.freeze({buildingMaterial,threeMaterial,CATALOG});
});
