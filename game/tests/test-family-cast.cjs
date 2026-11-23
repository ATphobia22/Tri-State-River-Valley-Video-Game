'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const cast=require('../src/family-cast.js');
const root=path.resolve(__dirname,'..');
test('all eight individually numbered Point Township figures are present exactly once',()=>{
 const entries=cast.ENTRIES,figures=entries.filter(x=>x.kind==='figure');
 assert.equal(entries.length,10);assert.equal(figures.length,8);
 assert.deepEqual(figures.map(x=>x.number).sort(),['01','02','03','04','05','06','07','08']);
 assert.equal(new Set(entries.map(x=>x.id)).size,10);
 assert.equal(new Set(entries.map(x=>x.spriteIndex)).size,10);
 assert.deepEqual(entries.map(x=>x.spriteIndex).sort((a,b)=>a-b),[0,1,2,3,4,5,6,7,8,9]);
 assert.equal(cast.byId('pete-yeida').spriteIndex,7);
 assert.equal(cast.byId('richard-stratton').spriteIndex,0);
 for(const entry of entries){assert.equal(entry.assetStatus,'PHOTO_REFERENCE_ONLY');assert.equal(entry.playable,false);assert.equal(entry.source,'user-2026-11-22');}
});
test('both special sets stay separate; Yeida memorial wording is preserved',()=>{
 assert.equal(cast.byId('tucker-family-set').kind,'group');
 const memorial=cast.byId('yeida-family-set');assert.equal(memorial.kind,'memorial');assert.match(memorial.style,/Tony/);assert.match(memorial.style,/Jerry/);
 assert.equal(cast.byId('unknown-person'),null);
});
test('local reference upload rejects remote links and unsafe file types or sizes',()=>{
 assert.equal(cast.validatePhoto({type:'image/jpeg',size:170000}).bytes,170000);
 assert.throws(()=>cast.validatePhoto({type:'text/html',size:2500}),/JPG|PNG|WebP/);
 assert.throws(()=>cast.validatePhoto({type:'image/jpeg',size:cast.MAX_PHOTO+1}),/3 MB/);
 assert.throws(()=>cast.validatePhoto(null),/local/);
});
test('website and service worker integrate the offline Family + Friends reference gallery',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const id of ['familyCastOpen','familyCastPanel','familyCastClose','familyCastGrid','familyCastStatus'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.ok(html.indexOf('src/family-cast.js')<html.indexOf('src/game.js'));
 assert.match(worker,/\.\/src\/family-cast\.js/);
});

test('all ten original user-supplied references are displayed from an embedded offline JPEG sprite',()=>{
 const source=fs.readFileSync(path.join(root,'src/family-cast.js'),'utf8');
 const match=source.match(/const DEFAULT_SPRITE='data:image\/jpeg;base64,([^']+)'/);
 assert.ok(match,'Photo reference sprite is missing from offline runtime');
 const jpeg=Buffer.from(match[1],'base64');
 assert.ok(jpeg.length>10000&&jpeg.length<45000);
 assert.equal(jpeg[0],0xff);assert.equal(jpeg[1],0xd8);
 assert.equal(jpeg[jpeg.length-2],0xff);assert.equal(jpeg[jpeg.length-1],0xd9);
 assert.ok(!source.includes('https://'),'Gallery must not fetch remote source photos');
});
