const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..');
function read(name){return fs.readFileSync(path.join(root,name),'utf8')}
test('reference overlay is keyboard-accessible in settings',()=>{const html=read('index.html');assert.match(html,/id="referenceOverlay" type="checkbox"/);assert.match(html,/<label for="referenceOverlay">/)});
test('both road mesh and building meshes use official geometry when bundled',()=>{const game=read('src/game.js');assert.match(game,/drapedRoadVertices\(activeRoads,height/);assert.match(game,/activeBuildings\.forEach\(\(b,i\)=>/);assert.match(game,/Array\.isArray\(REF\.buildingsPacked\)/)});
test('overhead material is sampled from game terrain, not placed at fixed elevation',()=>{const game=read('src/game.js');assert.match(game,/position\.setY\(i,height\(x,z\)\+\.26\)/);assert.match(game,/GEOREF\.worldToPixel/);assert.match(game,/GEOREF\.worldRect\(REF\.bboxWGS84\)/)});
test('offline builder inlines the reference bundle as script',()=>{const html=read('index.html');assert.match(html,/data\/reference-bundle\.js/);assert.match(html,/src\/reference-map\.js/);});
test('real-source overhead defaults on when a verified image bundle is present, remains switchable',()=>{
 const game=read('src/game.js');
 assert.match(game,/referenceEnabled=!!\(REF&&REF\.imageDataUrl\)/);
 assert.match(game,/\$\('referenceOverlay'\)\.checked=referenceEnabled/);
});
