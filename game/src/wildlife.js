/**
 * Ambient wildlife layer for River Valley — cinematic, offline, deterministic.
 * Deer / turkey / rabbit descriptors for tracking minigames and world dressing.
 * Not ecological survey data. Aligns with Scout companion tracking hints.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValleyWildlife = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  function hash(a, b, seed) {
    seed = seed == null ? 47620 : seed;
    let x = Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(seed | 0, 83492791);
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return (x ^ (x >>> 16)) >>> 0;
  }

  const KINDS = Object.freeze([
    { id: 'deer', emoji: '🦌', biome: 'oak-grove', speed: 18, size: 0.92 },
    { id: 'turkey', emoji: '🦃', biome: 'countryside', speed: 11, size: 0.55 },
    { id: 'rabbit', emoji: '🐇', biome: 'riverbank', speed: 22, size: 0.38 },
  ]);

  function biomeAt(x, z) {
    if (z > 790) return 'riverbank';
    if (Math.hypot(x - 92, z - 465) < 750) return 'town';
    if (Math.hypot(x + 740, z + 210) < 540) return 'oak-grove';
    return 'countryside';
  }

  function spawnAround(playerX, playerZ, { limit = 8, seed = 47620, timeOfDay = 15 } = {}) {
    const out = [];
    const hour = ((Number.isFinite(timeOfDay) ? timeOfDay : 15) % 24 + 24) % 24;
    const crepuscular = hour < 8 || hour > 17 ? 1.35 : 0.75;
    for (let i = 0; i < 24 && out.length < limit; i++) {
      const h = hash(Math.floor(playerX / 40) + i, Math.floor(playerZ / 40) - i, seed);
      const ang = ((h & 1023) / 1024) * Math.PI * 2;
      const dist = 40 + ((h >>> 10) & 255) / 255 * 180;
      const x = playerX + Math.cos(ang) * dist;
      const z = playerZ + Math.sin(ang) * dist;
      if (Math.abs(x) > 2400 || Math.abs(z) > 2400) continue;
      const biome = biomeAt(x, z);
      if (biome === 'town') continue;
      const kind = KINDS[h % KINDS.length];
      if (kind.biome !== biome && (h % 5) !== 0) continue;
      if ((h >>> 20) / 4096 > crepuscular) continue;
      out.push({
        id: kind.id + '-' + (h & 0xffff).toString(16),
        kind: kind.id,
        emoji: kind.emoji,
        x,
        z,
        heading: ang + Math.PI,
        size: kind.size * (0.85 + ((h >>> 4) & 255) / 255 * 0.3),
        alert: ((h >>> 16) & 3) === 0,
        biome,
      });
    }
    return out;
  }

  function nearest(wildlife, x, z) {
    let best = null;
    let bestD = Infinity;
    for (const w of wildlife || []) {
      const d = Math.hypot(w.x - x, w.z - z);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    }
    return best ? { animal: best, distance: bestD } : null;
  }

  function trackingHint(animal, playerX, playerZ, aimYaw) {
    if (!animal) return 'none';
    const dx = animal.x - playerX;
    const dz = animal.z - playerZ;
    const bearing = Math.atan2(-dx, -dz);
    let delta = bearing - (Number.isFinite(aimYaw) ? aimYaw : 0);
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) < 0.12) return 'ahead';
    return delta > 0 ? 'right' : 'left';
  }

  return Object.freeze({
    KINDS,
    biomeAt,
    spawnAround,
    nearest,
    trackingHint,
  });
});
