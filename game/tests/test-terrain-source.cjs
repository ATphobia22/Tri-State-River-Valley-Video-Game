'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Source = require('../src/terrain-source.js');
function fixture({cols=64,rows=64,value=210,stepFt=.03280839895}={}){
 const samples=Buffer.alloc(cols*rows*2);
 for(let i=0;i<cols*rows;i++)samples.writeUInt16LE(value+(i%cols),i*2);
 return {schemaVersion:1,grid:{cols,rows,lonMin:-87.923,lonMax:-87.867,latMin:37.914,latMax:37.959,
  minFt:350,stepFt,b64:samples.toString('base64')},
  metadata:{sourceId:'USGS_3DEP',sourceUrl:'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer',
    verticalDatumVerified:false}};
}
const fallback={cols:200,rows:200,minFt:340,stepFt:.01,b64:'illustrative'};
test('accepts an internally consistent offline USGS DEM grid',()=>{
 const result=Source.chooseGrid(fixture(),fallback);
 assert.equal(result.kind,'usgs-3dep');
 assert.equal(result.grid.cols,64);
 assert.equal(result.metadata.verticalDatumVerified,false);
 assert.ok(result.label.includes('3DEP'));
});
test('rejects truncated base64 rather than sampling a partial terrain',()=>{
 const incoming=fixture();incoming.grid.b64=incoming.grid.b64.slice(0,-4);
 assert.equal(Source.chooseGrid(incoming,fallback).kind,'illustrative');
});
test('rejects false spatial registration and invalid datum metadata',()=>{
 const incoming=fixture();incoming.grid.lonMin=-85;
 assert.equal(Source.chooseGrid(incoming,fallback).kind,'illustrative');
 const withoutProvenance=fixture();withoutProvenance.metadata.sourceId='unknown';
 assert.equal(Source.chooseGrid(withoutProvenance,fallback).kind,'illustrative');
});
test('rejects source with unbounded encoded size and nonfinite scale',()=>{
 const incoming=fixture();incoming.grid.stepFt=Infinity;
 assert.equal(Source.chooseGrid(incoming,fallback).grid,fallback);
 const another=fixture();another.grid.b64='A'.repeat(2_000_004);
 assert.equal(Source.chooseGrid(another,fallback).kind,'illustrative');
});
test('fallback is unchanged when source data is absent',()=>{
 const selected=Source.chooseGrid(null,fallback);
 assert.equal(selected.kind,'illustrative');
 assert.strictEqual(selected.grid,fallback);
});