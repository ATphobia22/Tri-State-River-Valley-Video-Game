'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../game-sw.js','utf8');
test('retired hosted worker deletes its caches and unregisters without intercepting requests',async()=>{
 const handlers={},names=new Set(['rva-game-1.13.0','river-valley-family-1.13.4','other-cache']);
 const visits=[];
 let unregistered=0,skipped=0;
 const self={
  location:{origin:'https://game.test',href:'https://game.test/game-sw.js'},
  registration:{scope:'https://game.test/',unregister:async()=>{unregistered++;return true;}},
  clients:{matchAll:async()=>[
   {url:'https://game.test/game.html',navigate:async u=>visits.push(u)},
   {url:'https://other.test/',navigate:async()=>{throw Error('unrelated client');}}
  ]},
  skipWaiting:async()=>{skipped++;},
  addEventListener:(type,callback)=>{handlers[type]=callback}
 };
 const caches={keys:async()=>[...names],delete:async name=>names.delete(name)};
 vm.runInNewContext(source,{self,caches,URL,console});
 assert.ok(handlers.install && handlers.activate);
 assert.equal(handlers.fetch,undefined);
 let pending=[];handlers.install({waitUntil:p=>pending.push(p)});await Promise.all(pending);
 pending=[];handlers.activate({waitUntil:p=>pending.push(p)});await Promise.all(pending);
 assert.equal(skipped,1);
 assert.equal(unregistered,1);
 assert.deepEqual([...names],['other-cache']);
 assert.deepEqual(visits,['https://game.test/game.html']);
});
