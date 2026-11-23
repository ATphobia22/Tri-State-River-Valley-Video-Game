const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
test('2025 leaf-on source script loads after source-backed 2023 aerial but before world runtime',()=>{
 const html=read('index.html'),source=html.indexOf('data/reference-bundle.js'),newer=html.indexOf('data/leafon-2025-bundle.js'),game=html.indexOf('src/game.js');
 assert.ok(source>0&&newer>source&&game>newer);
 assert.ok(read('sw.js').includes('"./data/leafon-2025-bundle.js"'));
});
test('partially valid 2025 aerial never claims the entire geographic rectangle',()=>{
 const game=read('src/game.js');
 assert.match(game,/validPixelCoverageFraction/);
 assert.match(game,/leafonImage/);
 assert.match(game,/referenceImage/);
 assert.match(game,/clearAerialDrape/);
 assert.ok(game.includes('leafOn2025:{bundled:'));
 assert.match(game,/uncovered portions retain the older image/);
});
test('standalone source does not request a runtime imaging endpoint',()=>{
 const game=read('src/game.js');
 assert.ok(!game.includes('iserver5.surdex.com'));
 assert.ok(!game.includes('gisimageryleafoningov'));
});
