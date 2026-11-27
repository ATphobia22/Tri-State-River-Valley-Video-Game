const test=require('node:test');const assert=require('node:assert/strict');
const path=require('node:path');const {pathToFileURL}=require('node:url');const fs=require('node:fs');
const source=path.resolve(__dirname,'../babylon-preview/local-media.mjs');
const modulePromise=import(pathToFileURL(source).href);
const file=(name,type,size)=>({name,type,size});
test('local soundtrack imports user-owned MP3 with bounded bytes and no remote links',async()=>{
 const {validateLocalMediaFile}=await modulePromise;
 assert.deepEqual(validateLocalMediaFile(file('HomeSweetHome.mp3','audio/mpeg',5107780),'audio'),{kind:'audio',name:'HomeSweetHome.mp3',bytes:5107780});
 assert.equal(validateLocalMediaFile(file('test.wav','audio/wav',44100),'audio').kind,'audio');
 assert.throws(()=>validateLocalMediaFile(file('bad.exe','audio/mpeg',5107780),'audio'),/format/i);
 assert.throws(()=>validateLocalMediaFile(file('bad.mp3','text/html',5107780),'audio'),/format/i);
 assert.throws(()=>validateLocalMediaFile(file('large.mp3','audio/mpeg',99_000_000),'audio'),/size/i);
});
test('local 10-second MP4 introduction validates and rejects external source descriptors',async()=>{
 const {validateLocalMediaFile}=await modulePromise;
 assert.equal(validateLocalMediaFile(file('River_Valley_Intro_Home_Sweet_Home.mp4','video/mp4',6349869),'video').kind,'video');
 assert.throws(()=>validateLocalMediaFile({name:'https://evil.test/x.mp4',type:'video/mp4',size:12345},'video'),/name/i);
 assert.throws(()=>validateLocalMediaFile(file('intro.webm','video/webm',12000),'video'),/format/i);
 assert.throws(()=>validateLocalMediaFile(file('intro.mp4','video/mp4',0),'video'),/size/i);
});
test('Babylon HTML exposes local audio and video controls with no upload endpoint',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../babylon-preview.html'),'utf8');
 const source=fs.readFileSync(path.resolve(__dirname,'../babylon-preview/local-media.mjs'),'utf8');
 const main=fs.readFileSync(path.resolve(__dirname,'../babylon-preview/main.js'),'utf8');
 for(const id of ['soundtrack-input','soundtrack-player','soundtrack-play','soundtrack-stop','soundtrack-tracks','intro-input','intro-player','intro-play','intro-skip','intro-overlay'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(main,/installLocalMedia/);
 assert.match(source,/createObjectURL/);
 assert.doesNotMatch(source,/fetch\(/);
});
