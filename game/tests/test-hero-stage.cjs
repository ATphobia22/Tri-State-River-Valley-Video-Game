const {test}=require('node:test'),assert=require('node:assert/strict');
const THREE=require('../vendor/three.js');
const Hero=require('../src/hero-character.js');
const Stage=require('../src/hero-stage.js');
const fs=require('node:fs');
test('dedicated hero stage is isolated from gameplay terrain and owns its camera',()=>{
 const stage=Stage.create(THREE,Hero);
 assert.ok(stage.scene.isScene);
 assert.ok(stage.camera.isPerspectiveCamera);
 assert.ok(stage.hero.root.isGroup);
 assert.equal(stage.hero.root.parent,stage.scene);
 assert.ok(stage.camera.position.z< -20);
 assert.ok(stage.scene.background.isColor);
 assert.ok(stage.scene.children.some(x=>x.isLight));
 stage.dispose();
});
test('hero preview can select fish, cook, hunt and moving poses without world camera',()=>{
 const stage=Stage.create(THREE,Hero);
 for(const pose of ['idle','fish','cook','hunt','drive','sprint']){
  const result=stage.update({state:pose,stamp:1000,dt:.065});
  assert.equal(result.state,pose);
  assert.equal(stage.hero.state,pose);
 }
 stage.dispose();
});
test('preview resizes to landscape and phone portrait aspect ratios safely',()=>{
 const stage=Stage.create(THREE,Hero);
 stage.resize(900,650);
 assert.ok(Math.abs(stage.camera.aspect-900/650)<.0001);
 stage.resize(375,812);
 assert.ok(Math.abs(stage.camera.aspect-375/812)<.0001);
 assert.ok(stage.camera.position.z< -20);
 stage.dispose();
});
test('render invokes passed WebGL renderer on stage, never gameplay scene',()=>{
 const stage=Stage.create(THREE,Hero);
 const calls=[];
 stage.render({render:(scene,camera)=>calls.push({scene,camera})});
 assert.equal(calls.length,1);
 assert.equal(calls[0].scene,stage.scene);
 assert.equal(calls[0].camera,stage.camera);
 stage.dispose();
});
test('game wires stage renderer to inspector and caches its offline module',()=>{
 const root=__dirname+'/../';
 const h=fs.readFileSync(root+'index.html','utf8');
 const game=fs.readFileSync(root+'src/game.js','utf8');
 const sw=fs.readFileSync(root+'sw.js','utf8');
 assert.ok(h.includes('src/hero-stage.js'));
 assert.ok(h.indexOf('src/hero-stage.js')<h.indexOf('src/game.js'));
 assert.ok(sw.includes('./src/hero-stage.js'));
 assert.match(game,/heroPreviewStage=STAGE\.create\(G,HERO\)/);
 assert.match(game,/heroPreviewStage\.render\(renderer\)/);
});

test('current GLB inspection camera frames hand and boots without moving the gameplay camera',()=>{
 const stage=Stage.create(THREE,Hero);
 assert.equal(stage.focus,'full');
 const fullZ=stage.camera.position.z;
 stage.setFocus('right-hand');assert.equal(stage.focus,'right-hand');
 assert.ok(stage.camera.position.z>fullZ,'hand focus should zoom inward');
 stage.resize(375,812);assert.ok(stage.camera.position.z>fullZ);
 stage.setFocus('boots');assert.equal(stage.focus,'boots');
 assert.ok(stage.camera.position.y<8,'boot focus should look near ground');
 assert.throws(()=>stage.setFocus('invalid'),RangeError);
 stage.setFocus('full');assert.equal(stage.focus,'full');
 assert.ok(stage.camera.position.z< -20);
 stage.dispose();
});
test('Hero Studio photo path draws hero stage directly before reading an unpreserved WebGL buffer',()=>{
 const s=fs.readFileSync(__dirname+'/../src/game.js','utf8');
 const fragment=s.slice(s.indexOf('function screenshot(){'),s.indexOf('function startTour(){'));
 assert.match(fragment,/if\(heroInspection&&heroPreviewStage\)heroPreviewStage\.render\(renderer\)/);
 assert.match(fragment,/toDataURL\('image\/png'\)/);
 assert.match(s,/preserveDrawingBuffer:false/);
});
