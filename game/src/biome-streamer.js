// Deterministic, budgeted oak / field / reed cell streamer for offline and online-enhanced play.
// Online (navigator.onLine) raises load radius and tree capacity for denser cinematic foliage.
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function inRiver(x, z) {
    return z > 760 && Math.abs(x) < 900;
  }
  function makeCell(ix, iz, { cellSize, limit, stops, seed }) {
    const rand = mulberry32((seed ^ (ix * 73856093) ^ (iz * 19349663)) >>> 0);
    const out = [];
    const type = rand() < 0.55 ? 'oak-grove' : rand() < 0.75 ? 'field' : 'town';
    const count = type === 'oak-grove' ? 14 + (rand() * 10 | 0) : type === 'field' ? 8 + (rand() * 6 | 0) : 5 + (rand() * 4 | 0);
    const id = ix + ':' + iz;
    for (let n = 0; n < count; n++) {
      const x = (ix + rand()) * cellSize;
      const z = (iz + rand()) * cellSize;
      if (Math.abs(x) > limit || Math.abs(z) > limit || inRiver(x, z)) continue;
      if (type === 'town' && Math.abs(x) < 170 && z > -350 && z < 840) continue;
      if (stops.some(s => Math.hypot(x - s.x, z - s.z) < 105)) continue;
      const shoreline = z > 730, kind = shoreline && rand() < .77 ? 1 : rand() < (type === 'oak-grove' ? .8 : .70) ? 0 : 2;
      out.push({ id: id + ':' + n, x, z, kind, size: 7 + rand() * 8, biome: type });
    }
    return out;
  }
  function create({ cellSize = 240, loadRadius = (typeof navigator !== 'undefined' && navigator.onLine) ? 1100 : 860, unloadRadius = (typeof navigator !== 'undefined' && navigator.onLine) ? 1400 : 1060, maxTrees = (typeof navigator !== 'undefined' && navigator.onLine) ? 1200 : 800, limit = 2200, stops = [], seed = 47620 } = {}) {
    if (!(Number.isFinite(cellSize) && cellSize >= 100 && cellSize <= 700)) throw new RangeError('invalid cellSize');
    if (!(loadRadius >= cellSize && unloadRadius >= loadRadius && unloadRadius <= 2500)) throw new RangeError('invalid radii');
    if (!(Number.isInteger(maxTrees) && maxTrees >= 16 && maxTrees <= 5000)) throw new RangeError('invalid tree capacity');
    const cache = new Map(), radiusCells = Math.ceil(loadRadius / cellSize) + 1;
    let lastCount = 0, generated = 0, evicted = 0, lastSignature = '', lastTrees = [];
    const sig = () => [...cache.keys()].sort().join('|');
    function update(x, z, { heading = 0, speed = 0, maxNewCells = 3 } = {}) {
      if (!Number.isFinite(x) || !Number.isFinite(z)) return { changed: false, trees: lastTrees, stats: snapshot() };
      const ahead = clamp(speed, 0, 230) * .35;
      const focusX = clamp(x - Math.sin(heading) * ahead, -limit, limit);
      const focusZ = clamp(z - Math.cos(heading) * ahead, -limit, limit);
      const cx = Math.floor(focusX / cellSize), cz = Math.floor(focusZ / cellSize);
      const candidates = [];
      for (let dz = -radiusCells; dz <= radiusCells; dz++) for (let dx = -radiusCells; dx <= radiusCells; dx++) {
        const ix = cx + dx, iz = cz + dz, mx = (ix + .5) * cellSize, mz = (iz + .5) * cellSize;
        const dist = Math.hypot(mx - focusX, mz - focusZ);
        if (dist <= loadRadius + cellSize * .7) candidates.push({ ix, iz, id: ix + ':' + iz, dist });
      }
      candidates.sort((a, b) => a.dist - b.dist || a.id.localeCompare(b.id));
      let created = 0;
      for (const candidate of candidates) {
        if (created >= clamp(Math.floor(maxNewCells), 0, 120)) break;
        if (cache.has(candidate.id)) continue;
        cache.set(candidate.id, makeCell(candidate.ix, candidate.iz, { cellSize, limit, stops, seed })); created++; generated++;
      }
      for (const id of cache.keys()) {
        const [ix, iz] = id.split(':').map(Number);
        if (Math.hypot((ix + .5) * cellSize - focusX, (iz + .5) * cellSize - focusZ) > unloadRadius + cellSize) {
          cache.delete(id); evicted++;
        }
      }
      const nowSig = sig(), coordsBucket = Math.floor(x / 70) + ':' + Math.floor(z / 70);
      const signature = nowSig + '|' + coordsBucket;
      const trees = [...cache.values()].flat().sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z) || a.id.localeCompare(b.id)).slice(0, maxTrees);
      const changed = signature !== lastSignature;
      lastSignature = signature; lastTrees = trees; lastCount = trees.length;
      return { changed, trees, stats: snapshot() };
    }
    function snapshot() { return { loadedCells: cache.size, generatedCells: generated, evictedCells: evicted, trees: lastCount, capacity: maxTrees, cellSize, loadRadius, online: typeof navigator !== 'undefined' && navigator.onLine === true }; }
    return { update, snapshot };
  }
  function biomeFactory() { return { create }; }
  const api = { create, biomeFactory };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValleyBiomeStreamer = api;
})(typeof globalThis === 'object' ? globalThis : this);
