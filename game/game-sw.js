/* 2025 IGIO / historic courthouse landmark release (2026-11-23): byte change triggers re-install and refresh of locally cached game HTML.\n * River Valley family game: relative-scope offline cache for the hosted PWA.
   Works at origin root and project subpaths (e.g. /RepoName/game/). */
const CACHE='rva-game-1.13.0';
const ROOT=new URL('./',self.location.href);
const SHELL=new URL('game.html',ROOT).pathname;
const ALIAS=new URL('game',ROOT).pathname;
const MANIFEST=new URL('game.webmanifest',ROOT).pathname;
const GAME_PATHS=new Set([SHELL,ALIAS]);
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(CACHE),response=await fetch(SHELL,{cache:'reload'});
 if(!response.ok)throw Error('Game HTML unavailable: '+response.status);
 await Promise.all([c.put(SHELL,response.clone()),c.put(ALIAS,response.clone())]);
 try{const m=await fetch(MANIFEST,{cache:'reload'});if(m.ok)await c.put(MANIFEST,m);}catch(_){/* offline already */}
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('rva-game-')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==ROOT.origin||!(GAME_PATHS.has(url.pathname)||url.pathname===MANIFEST))return;
 e.respondWith((async()=>{
  const c=await caches.open(CACHE),cached=await c.match(GAME_PATHS.has(url.pathname)?SHELL:req);
  if(cached)return cached;
  try{const response=await fetch(req);if(response.ok)await c.put(GAME_PATHS.has(url.pathname)?SHELL:req,response.clone());return response;}
  catch(_){return new Response('<h1>Game not cached</h1><p>Open the game while connected once, then try offline again.</p>',{status:503,headers:{'Content-Type':'text/html'}});}
 })());
});
