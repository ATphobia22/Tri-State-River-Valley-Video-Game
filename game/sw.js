/* Offline-first cache for the repository's multi-file game under any base path. */
const CACHE='river-valley-family-1.13.5';
const ASSETS=["./","./index.html","./manifest.webmanifest","./assets/icon192.png","./assets/icon512.png","./vendor/three.js","./vendor/gltf-loader.js","./vendor/openlocationcode.js","./data/valley-data.js","./data/usgs-3dep-terrain.js","./src/terrain-source.js","./src/core.js","./src/geometry.js","./src/quadtree.js","./src/visuals.js","./data/models.js","./src/model-loader.js","./src/custom-hero.js","./src/local-intro.js","./src/family-cast.js","./src/cast-wardrobe.js","./src/atmosphere.js","./src/director.js","./src/storyscape.js","./src/open-world.js","./src/companion.js","./src/reference-map.js","./data/reference-bundle.js","./data/leafon-2025-bundle.js","./data/posey-county-boundary.js","./data/landmark-anchors.js","./src/building-roofs.js","./src/landmark-access.js","./src/county-atlas.js","./src/county-scenes.js","./src/visual-polish.js","./src/river-water.js","./src/cinematic-lighting.js","./src/cinematic-dressing.js","./src/render-workers.js","./src/biome-streamer.js","./src/graphics-quality.js","./src/compressed-assets.js","./src/lod-transition.js","./data/hero-model.js","./data/hero-model-lod1.js","./data/hero-model-lod2.js","./src/foot-plant.js","./src/rigged-hero.js","./src/hero-character.js","./src/hero-stage.js","./src/streaming-policy.js","./src/motion-controller.js","./src/world-collision.js","./src/vehicle-suspension.js","./src/soundscape.js","./src/frame-probe.js","./src/world-paint.js","./src/player-experience.js","./src/model-prep-worker.js","./src/activities.js","./src/wildlife.js","./src/game.js"];
/* Legacy source-worker retirement only. ASSETS above is a static dependency inventory.
   This worker intentionally never caches or intercepts network requests. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith('river-valley-family-')||name.startsWith('rva-game-')).map(name=>caches.delete(name)));
  await self.registration.unregister();
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const scope=self.registration.scope;
  await Promise.allSettled(windows.filter(client=>client.url.startsWith(scope)).map(client=>client.navigate(client.url)));
})()));
