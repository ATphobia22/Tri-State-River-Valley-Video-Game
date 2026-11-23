/* Offline-first cache for the repository's multi-file game under any base path. */
const CACHE='river-valley-family-1.13.4';
const ASSETS=["./","./index.html","./manifest.webmanifest","./assets/icon192.png","./assets/icon512.png","./vendor/three.js","./vendor/gltf-loader.js","./vendor/openlocationcode.js","./data/valley-data.js","./data/usgs-3dep-terrain.js","./src/terrain-source.js","./src/core.js","./src/geometry.js","./src/quadtree.js","./src/visuals.js","./data/models.js","./src/model-loader.js","./src/custom-hero.js","./src/local-intro.js","./src/family-cast.js","./src/cast-wardrobe.js","./src/atmosphere.js","./src/director.js","./src/storyscape.js","./src/open-world.js","./src/companion.js","./src/reference-map.js","./data/reference-bundle.js","./data/leafon-2025-bundle.js","./data/posey-county-boundary.js","./data/landmark-anchors.js","./src/building-roofs.js","./src/landmark-access.js","./src/county-atlas.js","./src/county-scenes.js","./src/visual-polish.js","./src/river-water.js","./src/biome-streamer.js","./src/graphics-quality.js","./src/compressed-assets.js","./src/lod-transition.js","./data/hero-model.js","./data/hero-model-lod1.js","./data/hero-model-lod2.js","./src/foot-plant.js","./src/rigged-hero.js","./src/hero-character.js","./src/hero-stage.js","./src/streaming-policy.js","./src/motion-controller.js","./src/world-collision.js","./src/vehicle-suspension.js","./src/soundscape.js","./src/frame-probe.js","./src/world-paint.js","./src/player-experience.js","./src/game.js"];
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
