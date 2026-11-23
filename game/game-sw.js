/* Retired hosted worker: kept at this URL so existing installations update and unregister. */
const CACHE='rva-game-1.13.0'; // Legacy cache identity; never create it again.
const ROOT=new URL('./',self.location.href);
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith('rva-game-')||name.startsWith('river-valley-family-')).map(name=>caches.delete(name)));
  await self.registration.unregister();
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  await Promise.allSettled(windows.filter(client=>client.url.startsWith(ROOT.href)).map(client=>client.navigate(client.url)));
})()));
