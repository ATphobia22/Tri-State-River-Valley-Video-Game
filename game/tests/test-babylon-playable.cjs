const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const load=import(pathToFileURL(path.resolve(__dirname,'../babylon-preview/gameplay.mjs')));
test('movement is normalized bounded and collision-safe',async()=>{
 const {createAdventure,BUILDINGS}=await load;const g=createAdventure();
 assert.deepEqual(g.snapshot().position,{x:0,z:49});
 g.move(1,1,1);const p=g.snapshot().position;
 assert.ok(Math.abs(Math.hypot(p.x,p.z-49)-9)<1e-6);
 g.move(0,-1,5);const q=g.snapshot().position;
 for(const b of BUILDINGS)assert.ok(!(Math.abs(q.x-b.x)<6.5&&Math.abs(q.z-b.z)<7));
 g.move(10000,0,1000,true);assert.ok(g.snapshot().position.x<=57);
});
test('landmark discovery requires player proximity and persists once',async()=>{
 const {createAdventure,STOPS}=await load;const saved=new Map();
 const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
 const g=createAdventure({storage});assert.equal(g.discover('grove').ok,false);
 const pier=STOPS.find(x=>x.id==='pier');assert.equal(g.setPosition(pier.x,pier.z),true);
 assert.equal(g.discover('pier').ok,true);assert.equal(g.discover('pier').ok,false);
 assert.deepEqual(createAdventure({storage}).snapshot().discovered,['pier']);
});
test('malformed save and blocked storage degrade safely',async()=>{
 const {createAdventure}=await load;
 const storage={getItem:()=>'{bad',setItem:()=>{throw Error('blocked');}};
 const g=createAdventure({storage});
 assert.equal(g.setTime(NaN),false);assert.equal(g.setTime(21),true);
 assert.equal(g.snapshot().hour,21);assert.deepEqual(g.snapshot().discovered,[]);
});
test('main Babylon entrypoint wires real game loop and controls',()=>{
 const fs=require('node:fs');const root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'babylon-preview.html'),'utf8');
 const main=fs.readFileSync(path.join(root,'babylon-preview/main.js'),'utf8');
 assert.match(html,/id="adventure-status"/);assert.match(html,/data-move="forward"/);
 const playable=fs.readFileSync(path.join(root,'babylon-preview/playable.mjs'),'utf8');
 assert.match(main,/installPlayable/);assert.match(playable,/qa\.playable/);
});