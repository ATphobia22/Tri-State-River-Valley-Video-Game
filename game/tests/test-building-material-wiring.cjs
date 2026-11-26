const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const game=fs.readFileSync(path.join(base,'src/game.js'),'utf8');
test('hosted entrypoint loads building material contract before main game script',()=>{
 const material=html.indexOf('src="src/building-material-contract.js"');
 const gameScript=html.indexOf('src="src/game.js"');
 assert.ok(material>=0&&gameScript>material);
});
test('instanced building material obtains PBR factors from shared contract',()=>{
 assert.match(game,/ValleyBuildingMaterials/);
 assert.match(game,/BUILDING_MATERIALS\.threeMaterial\(G,'concrete'\)/);
});
test('existing H3 building spatial index remains connected',()=>{
 assert.match(game,/GEOREF\.createH3Index\(\)/);
 assert.match(game,/geographicIndex\.upsert\(\{id:'building:'/);
});
