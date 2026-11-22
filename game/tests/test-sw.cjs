const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../game-sw.js','utf8');
test('service worker caches both host URL variants and replays game offline',async()=>{
 let handlers={},offline=false;
 const stores=new Map(),create=()=>({
  async put(key,response){this.store.set(String(key),response.clone())},
  async match(key){return this.store.get(String(key))?.clone()},
  store:new Map()
 });
 const caches={async open(key){if(!stores.has(key))stores.set(key,create());return stores.get(key)},async keys(){return [...stores.keys()]},async delete(k){return stores.delete(k)}};
 const fetch=async(url)=>{if(offline)throw Error('offline');if(String(url).endsWith('webmanifest'))return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});return new Response('<html>Game</html>',{status:200,headers:{'Content-Type':'text/html'}})};
 const self={location:{origin:'https://game.test',href:'https://game.test/game-sw.js'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener(type,cb){handlers[type]=cb}};
 vm.runInNewContext(source,{self,caches,fetch,URL,Response,console});
 let work=[];handlers.install({waitUntil(p){work.push(p)}});await Promise.all(work);
 assert.ok(await (await caches.open('rva-game-1.9.1')).match('/game.html'));
 assert.ok(await (await caches.open('rva-game-1.9.1')).match('/game'));
 work=[];handlers.activate({waitUntil(p){work.push(p)}});await Promise.all(work);
 offline=true;let result;
 handlers.fetch({request:{url:'https://game.test/game',method:'GET'},respondWith(p){result=p}});
 const replay=await result;assert.equal(await replay.text(),'<html>Game</html>');
});
