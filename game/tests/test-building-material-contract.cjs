const test=require('node:test');
const assert=require('node:assert/strict');
const {buildingMaterial}=require('../src/building-material-contract.js');
test('brick is dielectric with bounded roughness',()=>{const m=buildingMaterial('brick');assert.equal(m.metallicFactor,0);assert.ok(m.roughnessFactor>=0.5&&m.roughnessFactor<=1);assert.equal(m.provenance,'procedural');});
test('unknown material is rejected rather than inferred as surveyed',()=>assert.throws(()=>buildingMaterial('unknown'),RangeError));
test('all material factors are normalized',()=>{for(const name of ['brick','limestone','concrete','wood','glass','asphalt','metal']){const m=buildingMaterial(name);assert.equal(m.baseColorFactor.length,4);assert.ok([...m.baseColorFactor,m.metallicFactor,m.roughnessFactor].every(x=>Number.isFinite(x)&&x>=0&&x<=1));}});
test('material results cannot mutate the catalog',()=>{const m=buildingMaterial('brick');try{m.baseColorFactor[0]=0;}catch{}assert.notEqual(buildingMaterial('brick').baseColorFactor[0],0);});
