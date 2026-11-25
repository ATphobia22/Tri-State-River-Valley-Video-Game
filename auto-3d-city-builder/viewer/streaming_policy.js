/**
 * Online-first streaming policy for River Valley open world.
 * Mode: online-first / offline-backup
 */
(function (global) {
  'use strict';
  const POLICY = {
    mode: 'online-first',
    online: { near: 1400, mid: 1800, far: 1600 },
    offline: { near: 720, mid: 900, far: 640 },
    errorTarget: { battery: 16, balanced: 8, showcase: 4 },
    maxBytes: { battery: 48 * 1024 * 1024, balanced: 96 * 1024 * 1024, showcase: 192 * 1024 * 1024 },
    maxTiles: { battery: 80, balanced: 160, showcase: 280 },
    tilesetCandidates: [
      '../tiles/mount-vernon/tileset.json',
      './tiles/mount-vernon/tileset.json',
      '/auto-3d-city-builder/tiles/mount-vernon/tileset.json',
    ],
  };
  function isOnline() { return typeof navigator === 'undefined' ? true : navigator.onLine !== false; }
  async function probeTileset(url, timeoutMs) {
    timeoutMs = timeoutMs || 2500;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: 'GET', signal: ctrl.signal, cache: 'default' });
      clearTimeout(t);
      if (!res.ok) return null;
      const json = await res.json();
      if (!json || !json.root) return null;
      return { url, tileset: json };
    } catch (_) { clearTimeout(t); return null; }
  }
  async function resolveContentSource(opts) {
    opts = opts || {};
    const online = isOnline();
    if (!online && POLICY.mode === 'online-first') {
      for (const u of POLICY.tilesetCandidates) {
        const hit = await probeTileset(u, 1200);
        if (hit) return { source: 'tiles', url: hit.url, online: false, reason: 'local-tiles-cache' };
      }
      return { source: 'diorama', online: false, reason: 'offline-no-tiles' };
    }
    for (const u of POLICY.tilesetCandidates) {
      const hit = await probeTileset(u, opts.timeoutMs || 2500);
      if (hit) return { source: 'tiles', url: hit.url, online: online, reason: 'tileset-ok' };
    }
    return { source: 'diorama', online: online, reason: 'tileset-missing' };
  }
  function tierParams(tier) {
    tier = tier || 'balanced';
    return {
      errorTarget: POLICY.errorTarget[tier] || POLICY.errorTarget.balanced,
      maxBytesSize: POLICY.maxBytes[tier] || POLICY.maxBytes.balanced,
      maxSize: POLICY.maxTiles[tier] || POLICY.maxTiles.balanced,
      radii: isOnline() ? POLICY.online : POLICY.offline,
    };
  }
  global.RVStreamingPolicy = { POLICY, isOnline, probeTileset, resolveContentSource, tierParams };
})(typeof window !== 'undefined' ? window : globalThis);
