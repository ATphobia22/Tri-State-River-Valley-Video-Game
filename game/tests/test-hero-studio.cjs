const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('a closable character studio has a real pose select and action controls',()=>{
 const html=read('index.html');
 for(const id of ['heroStudioOpen','heroStudio','heroPose','heroStudioClose','heroPhoto'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const pose of ['idle','walk','run','sprint','jump','land','interact','farm','fish','hunt','cook','drive'])
  assert.match(html,new RegExp('<option value="'+pose+'">'));
 assert.ok(html.includes('hero-inspection'));
});

test('inspector starts a 3D character view without overwriting the game save',()=>{
 const game=read('src/game.js');
 assert.match(game,/function openHeroStudio\(/);
 assert.match(game,/function closeHeroStudio\(/);
 assert.match(game,/function chooseHeroState\(/);
 assert.match(game,/heroInspection\?heroPreviewPose/);
 assert.match(game,/heroState,heroModel/);
 assert.match(game,/heroInspection,heroPreviewPose/);
 assert.match(game,/function screenshot\(/);
});

test('studio returns camera and player control after close',()=>{
 const game=read('src/game.js');
 assert.match(game,/previousHeroCamera/);
 assert.match(game,/cameraDist=previousHeroCamera\.distance/);
 assert.match(game,/cameraYaw=previousHeroCamera\.yaw/);
 assert.match(game,/if\(heroInspection\)\{currentTravelSpeed=0;return;\}/);
 assert.match(game,/heroStudioClose/);
});

test('all Character Studio controls are parsed before the blocking game script',()=>{
 const html=read('index.html');
 const gameScript=html.indexOf('<script src="src/game.js"></script>');
 assert.ok(gameScript>0);
 for(const id of ['heroStudio','heroStudioOpen','heroStudioClose','heroStudioDone','heroPose','heroPhoto']){
  const element=html.indexOf('id="'+id+'"');
  assert.ok(element>=0&&element<gameScript,'Late-loaded control '+id);
 }
});

test('the hero studio has a usable fallback when WebGL is unavailable',()=>{
 const game=read('src/game.js');
 assert.match(game,/if\(!renderer\|\|view==='2d'\)/);
 assert.match(game,/openHeroStudio/);
});
