'use strict';const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');const ROOT=path.resolve(__dirname,'..');
const Intro=require('../src/local-intro.js');
test('offline intro accepts only bounded user-local H.264-compatible MP4 files',()=>{
 assert.equal(Intro.validateClip({name:'River_Valley_Intro_Home_Sweet_Home.mp4',size:25_000_000,type:'video/mp4'}).bytes,25_000_000);
 assert.throws(()=>Intro.validateClip({name:'external.url',size:200,type:'text/plain'}),/MP4/);
 assert.throws(()=>Intro.validateClip({name:'too-large.mp4',size:999_999_999,type:'video/mp4'}),/limit/);
});
test('website loads intro module from local source and includes accessible skip control',()=>{
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
 assert.match(html,/id="localIntroFile"/);assert.match(html,/id="localIntroVideo"/);
 assert.match(html,/id="skipIntro"/);
 assert.ok(html.indexOf('src/local-intro.js')<html.indexOf('src/game.js'));
 assert.match(sw,/\.\/src\/local-intro\.js/);
});
