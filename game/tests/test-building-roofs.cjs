const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),ROOT=path.join(__dirname,'..');
const Roof=require('../src/building-roofs.js'),THREE=require('../vendor/three.js');
test('rotated four-corner GIS polygon receives terrain-height-aligned two-slope mesh',()=>{
 const a=[[0,0],[10,3],[8,21],[-2,18]],roof=Roof.quadRoofVertices(a,12,3);
 assert.equal(roof.status,'ARTISTIC_NO_ROOF_DSM');
 assert.ok(roof.vertices.length>=36);
 for(let i=0;i<roof.vertices.length;i+=3){assert.ok(Number.isFinite(roof.vertices[i]));assert.ok([12,15].includes(roof.vertices[i+1]));}
 assert.ok(roof.vertices.some((v,i)=>i%3===1&&v===15));
});
test('degenerate footprint gets no invented roof topology',()=>{
 assert.equal(Roof.quadRoofVertices([[0,0],[1,1],[2,2],[3,3]],12,3),null);
});
test('mid distance mesh is gabled, not a cone-shaped roof proxy',()=>{
 const geo=Roof.makeUnitGable(THREE),pos=geo.getAttribute('position');
 assert.ok(pos.count>=18);assert.ok(pos.array.some((n,i)=>i%3===1&&n===1));
 const game=fs.readFileSync(path.join(ROOT,'src/game.js'),'utf8');
 assert.match(game,/ROOFS\.makeUnitGable\(G\)/);
 assert.match(game,/ROOFS\.quadRoofVertices/);
 assert.doesNotMatch(game,/new G\.ConeGeometry\(\.74,1,4\)/);
});
