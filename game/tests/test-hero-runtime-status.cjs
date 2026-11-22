const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('game must distinguish unsupported WebGL, deliberate 2D atlas and failed playable rig in visible settings',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const game=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
 assert.match(html,/id="heroRuntimeStatus"/,'user must see current character rendering diagnosis');
 assert.match(game,/function updateHeroRuntimeStatus\(/,'show authored status, not just debug globals');
 assert.match(game,/WebGL (?:unavailable|initialization failed)/,'WebGL failure should be identified');
 assert.match(game,/2D atlas active/,'manual atlas mode should be identified');
 assert.match(game,/rig failed to load/,'silent procedural hero fallback should be identified');
 assert.match(game,/heroController\?\.embeddedTextures/,'show texture readiness of active rig');
 assert.match(game,/updateHeroRuntimeStatus\(\)/,'sync diagnosis when mode changes');
});
