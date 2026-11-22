/* Offline-first cache for the repository's multi-file game under any base path. */
const CACHE='river-valley-family-1.9.5';
const ASSETS=["./","./index.html","./manifest.webmanifest","./assets/icon192.png","./assets/icon512.png","./vendor/three.js","./vendor/openlocationcode.js","./data/valley-data.js","./src/core.js","./src/geometry.js","./src/quadtree.js","./src/visuals.js","./data/models.js","./src/model-loader.js","./src/atmosphere.js","./src/director.js","./src/storyscape.js","./src/open-world.js","./src/reference-map.js","./data/reference-bundle.js","./src/visual-polish.js","./src/biome-streamer.js","./src/lod-transition.js","./data/hero-model.js","./src/foot-plant.js","./src/rigged-hero.js","./src/hero-character.js","./src/hero-stage.js","./src/streaming-policy.js","./src/motion-controller.js","./src/game.js"];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(ASSETS);
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const old=await caches.keys();
 await Promise.all(old.filter(k=>k.startsWith('river-valley-family-')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cached=await caches.match(request);if(cached)return cached;
  try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;}
  catch(_){return request.mode==='navigate' ? (await caches.match(new URL('./index.html',self.registration.scope).href))||Response.error() : Response.error();}
 })());
});
