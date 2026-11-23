'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const UX=require('../src/player-experience.js');
test('player preferences use a versioned local-only allowlist and reject bad data',()=>{
 assert.deepEqual(UX.normalize(null),UX.DEFAULTS);
 assert.equal(UX.normalize({largeText:true,gamepadEnabled:'yes',other:true}).largeText,true);
 assert.equal(UX.normalize({gamepadEnabled:'yes'}).gamepadEnabled,true);
 assert.equal(Object.hasOwn(UX.normalize({other:true}),'other'),false);
 const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const prefs=UX.createPreferences({storage});
 prefs.set('leftHandedTouch',true);prefs.set('highContrast',true);
 assert.equal(UX.load(storage).leftHandedTouch,true);
 assert.equal(UX.load(storage).highContrast,true);
 assert.throws(()=>prefs.set('__proto__',true),/Unknown/);
 storage.set(UX.STORAGE_KEY,'{bad');assert.deepEqual(UX.load(storage),UX.DEFAULTS);
 assert.deepEqual(UX.load({getItem(){throw Error('blocked');}}),UX.DEFAULTS);
 assert.equal(UX.store({setItem(){throw Error('quota');}},UX.DEFAULTS),false);
});
test('standard controllers expose normalized analog movement with deadzone and safe buttons',()=>{
 const pad={connected:true,mapping:'standard',axes:[.59,-.65],
  buttons:Array.from({length:18},()=>({pressed:false}))};
 for(const n of [0,2,7,9])pad.buttons[n].pressed=true;
 const s=UX.sampleGamepad(()=>[null,pad]);
 assert.equal(s.connected,true);
 assert.ok(s.x>.4&&s.x<.6);
 assert.ok(s.z<-.5&&s.z>-.7);
 assert.equal(s.jump,true);assert.equal(s.interact,true);
 assert.equal(s.sprint,true);assert.equal(s.pause,true);
 pad.axes[0]=.08;pad.axes[1]=-.03;
 assert.equal(UX.sampleGamepad(()=>[pad]).x,0);
 pad.buttons[14].pressed=true;
 assert.equal(UX.sampleGamepad(()=>[pad]).x,-1);
 assert.equal(UX.axis(Infinity),0);
 assert.equal(UX.axis(-2),-1);
 assert.equal(UX.sampleGamepad(()=>[pad],false).connected,false);
 assert.equal(UX.sampleGamepad(()=>[{...pad,mapping:''}]).connected,false);
 assert.equal(UX.sampleGamepad(()=>{throw Error('permissions');}).connected,false);
});
test('preferences apply body classes but do not modify game save files',()=>{
 const state=new Set(),body={classList:{toggle:(x,on)=>{if(on)state.add(x);else state.delete(x);}}};
 UX.apply({body},{...UX.DEFAULTS,leftHandedTouch:true,highContrast:true,showHints:false});
 assert.equal(state.has('ux-left-handed'),true);
 assert.equal(state.has('ux-high-contrast'),true);
 assert.equal(state.has('ux-show-hints'),false);
});
test('game has local-only review and input hooks, no remote dependency',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const base=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 const game=fs.readFileSync(path.join(base,'src/game.js'),'utf8');
 const sw=fs.readFileSync(path.join(base,'sw.js'),'utf8');
 assert.ok(html.includes('src="src/player-experience.js"'));
 assert.ok(html.includes('id="pauseOverlay"'));
 assert.ok(html.includes('id="pauseToggle"'));
 assert.ok(game.includes('UX.sampleGamepad'));
 assert.ok(game.includes('if(paused){requestAnimationFrame(loop);return;}'));
 assert.ok(sw.includes('./src/player-experience.js'));
 assert.ok(!(/https?:\/\//).test(fs.readFileSync(path.join(base,'src/player-experience.js'),'utf8')));
});
