/**
 * Offline model-prep workers for River Valley.
 * Packs instanced foliage matrices, procedural LOD descriptors, and facade
 * seed batches off the main thread. Falls back to inline if Workers unavailable.
 * No network, no shared ArrayBuffer transfer of live Three.js objects.
 */
(function (root) {
  'use strict';

  function packFoliageMatrices(items, groundY) {
    const count = items.length;
    const matrices = new Float32Array(count * 16);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const it = items[i];
      const x = +it.x || 0;
      const z = +it.z || 0;
      const y = typeof groundY === 'function' ? groundY(x, z) : (+it.y || 0);
      const s = +it.size || 1;
      const a = +it.angle || 0;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const o = i * 16;
      matrices[o] = c * s;
      matrices[o + 1] = 0;
      matrices[o + 2] = -sn * s;
      matrices[o + 3] = 0;
      matrices[o + 4] = 0;
      matrices[o + 5] = s;
      matrices[o + 6] = 0;
      matrices[o + 7] = 0;
      matrices[o + 8] = sn * s;
      matrices[o + 9] = 0;
      matrices[o + 10] = c * s;
      matrices[o + 11] = 0;
      matrices[o + 12] = x;
      matrices[o + 13] = y - 0.1;
      matrices[o + 14] = z;
      matrices[o + 15] = 1;
      const r = ((it.color >>> 16) & 255) / 255;
      const g = ((it.color >>> 8) & 255) / 255;
      const b = (it.color & 255) / 255;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    return { matrices, colors, count };
  }

  function buildFacadeBatch(buildings, seedBase) {
    const out = new Array(buildings.length);
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const x = +b.x || 0;
      const z = +b.z || 0;
      const h = (Math.imul((x + 113) | 0, 73513) ^ Math.imul((z + 499) | 0, 39823) ^ Math.imul((seedBase + i) | 0, 101)) >>> 0;
      const downtown = Math.hypot(x - 92, z - 465) < 670;
      const family = downtown
        ? h % 7 === 0
          ? 'limestone'
          : 'brick'
        : h % 23 === 0
          ? 'metal'
          : h % 19 === 0
            ? 'batten'
            : h % 6 === 0
              ? 'brick'
              : h % 8 === 0
                ? 'limestone'
                : 'clapboard';
      out[i] = {
        i: b.i != null ? b.i : i,
        family,
        seed: h & 0xffff,
        roofSeed: (h >>> 8) & 0xffff,
        hue: ((h % 17) - 8) | 0,
      };
    }
    return { facades: out };
  }

  function buildSimpleLodDescriptors(sourceTris, budgets) {
    const tiers = [];
    const caps = budgets || [1, 0.45, 0.18];
    for (let t = 0; t < caps.length; t++) {
      const keep = Math.max(12, Math.floor(sourceTris * caps[t]));
      tiers.push({
        level: t,
        targetTriangles: keep,
        screenRatio: t === 0 ? 1 : t === 1 ? 0.35 : 0.12,
        label: t === 0 ? 'hero' : t === 1 ? 'mid' : 'far',
      });
    }
    return { tiers, sourceTris: sourceTris | 0 };
  }

  function channel(name, factory) {
    let worker = null;
    let url = null;
    let busy = false;
    let latest = null;
    let active = null;
    let sync = null;
    let completed = 0;

    function release() {
      if (worker) worker.terminate();
      worker = null;
      if (url) URL.revokeObjectURL(url);
      url = null;
    }

    function fallback() {
      release();
      sync = factory;
      const request = latest || active;
      latest = active = null;
      busy = false;
      if (request) deliver(sync(request), request);
    }

    function deliver(result, request) {
      completed++;
      if (request && typeof request.onResult === 'function') request.onResult(result, request);
    }

    function submit(request) {
      if (sync) return deliver(sync(request), request);
      if (busy) {
        latest = request;
        return;
      }
      busy = true;
      active = request;
      try {
        const payload = Object.assign({}, request);
        delete payload.onResult;
        worker.postMessage({ request: payload });
      } catch (_) {
        fallback();
      }
    }

    try {
      const code =
        'const pack=' +
        packFoliageMatrices.toString() +
        ';' +
        'const facade=' +
        buildFacadeBatch.toString() +
        ';' +
        'const lod=' +
        buildSimpleLodDescriptors.toString() +
        ';' +
        'onmessage=({data})=>{' +
        'const r=data.request||{};' +
        'let out;' +
        'if(r.kind==="foliage")out=pack(r.items||[],null);' +
        'else if(r.kind==="facade")out=facade(r.buildings||[],r.seedBase|0);' +
        'else if(r.kind==="lod")out=lod(r.sourceTris|0,r.budgets);' +
        'else out={error:"unknown kind"};' +
        'const transfer=[];' +
        'if(out.matrices)transfer.push(out.matrices.buffer);' +
        'if(out.colors)transfer.push(out.colors.buffer);' +
        'postMessage(out,transfer);' +
        '};';
      url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      worker = new Worker(url, { name: name || 'ValleyModelPrep' });
      worker.onmessage = ({ data }) => {
        const request = active;
        busy = false;
        active = null;
        if (latest) {
          const next = latest;
          latest = null;
          submit(next);
        } else deliver(data, request);
      };
      worker.onerror = (e) => {
        e.preventDefault();
        fallback();
      };
      worker.onmessageerror = fallback;
    } catch (_) {
      fallback();
    }

    return {
      submit,
      snapshot: () => ({ mode: sync ? 'inline' : 'worker', completed, name: name || 'model-prep' }),
      terminate: release,
    };
  }

  const api = {
    packFoliageMatrices,
    buildFacadeBatch,
    buildSimpleLodDescriptors,
    channel,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValleyModelPrep = api;
})(typeof globalThis === 'object' ? globalThis : this);
