/* Original offline instanced foliage and graphics budgets for River Valley.
 * No geodetic claim, network access, per-frame allocations or third-party code.
 * v1.13+: optional GPU wind sway on meadow clumps (shader injection, no RT).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValleyGraphicsQuality = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const PRESETS = Object.freeze({
    lite: Object.freeze({ treesMobile: 220, treesDesktop: 340, grassMobile: 0, grassDesktop: 0, radius: 0, spacing: 16, wind: 0 }),
    full: Object.freeze({ treesMobile: 470, treesDesktop: 980, grassMobile: 180, grassDesktop: 320, radius: 135, spacing: 13, wind: 0.55 }),
    cinematic: Object.freeze({ treesMobile: 470, treesDesktop: 980, grassMobile: 300, grassDesktop: 720, radius: 190, spacing: 12, wind: 0.85 })
  });
  function normalize(v) { return Object.prototype.hasOwnProperty.call(PRESETS, v) ? v : 'full'; }
  function budget(v, mobile) {
    const p = PRESETS[normalize(v)]; const m = !!mobile;
    return Object.freeze({ name: normalize(v), trees: m ? p.treesMobile : p.treesDesktop, grass: m ? p.grassMobile : p.grassDesktop, radius: p.radius, spacing: p.spacing, wind: p.wind });
  }
  function hash(x, z, seed) {
    seed = seed == null ? 47620 : seed;
    let h = Math.imul(x | 0, 73856093) ^ Math.imul(z | 0, 19349663) ^ Math.imul(seed | 0, 83492791);
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function grassDescriptors(x, z, { quality = 'full', mobile = false, limit = 2400, stops = [], inRiver = function () { return false; }, seed = 47620 } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || !(limit > 0)) return [];
    const b = budget(quality, mobile); if (!b.grass) return [];
    const out = [], step = b.spacing, cx = Math.floor(x / step), cz = Math.floor(z / step), n = Math.ceil(b.radius / step) + 1;
    for (let iz = cz - n; iz <= cz + n; iz++) for (let ix = cx - n; ix <= cx + n; ix++) {
      const h = hash(ix, iz, seed);
      const px = (ix + (h & 1023) / 1024) * step, pz = (iz + ((h >>> 10) & 1023) / 1024) * step;
      if (Math.hypot(px - x, pz - z) > b.radius || Math.abs(px) > limit || Math.abs(pz) > limit || inRiver(px, pz)) continue;
      if (stops.some(function (s) { return Math.hypot(px - s.x, pz - s.z) < 38; })) continue;
      if ((h >>> 20) % 7 === 0) continue;
      out.push({ x: px, z: pz, size: 0.7 + ((h >>> 4) & 255) / 255 * 1.15, angle: (h & 65535) / 65535 * Math.PI, variant: h % 3, key: ix + ':' + iz });
    }
    out.sort(function (a, b) { return Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z) || a.key.localeCompare(b.key); });
    return out.slice(0, b.grass);
  }
  function makeGrassGeometry(T) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute([-.46,0,0,.46,0,0,-.18,1.6,0,.18,1.6,0,0,0,-.46,0,0,.46,0,1.6,-.18,0,1.6,.18], 3));
    g.setIndex([0,1,2,1,3,2,4,5,6,5,7,6]); g.computeVertexNormals(); return g;
  }
  function attachWindSway(material, strength) {
    if (!material || material.userData.riverWindAttached) return material;
    material.userData.riverWindAttached = true;
    material.userData.uWindTime = { value: 0 };
    material.userData.uWindStrength = { value: strength || 0.55 };
    material.onBeforeCompile = function (shader) {
      shader.uniforms.uWindTime = material.userData.uWindTime;
      shader.uniforms.uWindStrength = material.userData.uWindStrength;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWindTime;\nuniform float uWindStrength;')
        .replace('#include <begin_vertex>', ['#include <begin_vertex>', 'float windH = max(transformed.y, 0.0);', 'float sway = sin(uWindTime * 1.7 + position.x * 0.15 + position.z * 0.11) * uWindStrength * windH * 0.12;', 'transformed.x += sway;', 'transformed.z += cos(uWindTime * 1.3 + position.z * 0.09) * uWindStrength * windH * 0.07;'].join('\n'));
    };
    material.needsUpdate = true; return material;
  }
  function create(T, scene, ground, opts) {
    opts = opts || {};
    const limit = opts.limit != null ? opts.limit : 2400;
    const stops = opts.stops || [];
    const inRiver = opts.inRiver || function () { return false; };
    const mobile = !!opts.mobile;
    if (!T || !scene || typeof ground !== 'function') throw Error('Three.js scene and terrain sampler required');
    const capacity = budget('cinematic', mobile).grass, geom = makeGrassGeometry(T);
    const material = new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide, roughness: 1 });
    attachWindSway(material, budget('full', mobile).wind);
    const mesh = new T.InstancedMesh(geom, material, capacity); mesh.count = 0; mesh.name = 'River/budgeted-instanced-meadow'; scene.add(mesh);
    const dummy = new T.Object3D(), color = new T.Color();
    let state = { x: Infinity, z: Infinity, quality: '', season: '', count: 0 }, rebuilds = 0;
    const palettes = { spring: [0x7fb466, 0x96bd73, 0x6b9b59], summer: [0x64864c, 0x819d58, 0x577c43], autumn: [0xa59355, 0xc0ad68, 0x857745], winter: [0x9cab91, 0xc3bd9d, 0x84948b] };
    function update(x, z, args) {
      args = args || {}; const quality = normalize(args.quality || 'full'); const season = args.season || 'summer'; const force = !!args.force; const timeMs = args.timeMs || 0;
      const cell = budget(quality, mobile).spacing; const wind = budget(quality, mobile).wind;
      if (material.userData.uWindStrength) material.userData.uWindStrength.value = wind;
      if (material.userData.uWindTime) material.userData.uWindTime.value = timeMs * 0.001;
      if (!force && state.quality === quality && state.season === season && Math.hypot(x - state.x, z - state.z) < cell * 2) return state.count;
      const leaves = grassDescriptors(x, z, { quality: quality, mobile: mobile, limit: limit, stops: stops, inRiver: inRiver });
      const palette = palettes[season] || palettes.summer; let count = 0;
      for (let i = 0; i < leaves.length; i++) {
        const v = leaves[i]; const y = ground(v.x, v.z); if (!Number.isFinite(y)) continue;
        dummy.position.set(v.x, y - 0.1, v.z); dummy.rotation.set(0, v.angle, 0); dummy.scale.set(v.size, v.size, v.size);
        dummy.updateMatrix(); mesh.setMatrixAt(count, dummy.matrix); mesh.setColorAt(count, color.setHex(palette[v.variant])); count++;
      }
      mesh.count = count;
      if (count) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); }
      state = { x: x, z: z, quality: quality, season: season, count: count }; rebuilds++; return count;
    }
    function snapshot() { return { instances: state.count, capacity: capacity, quality: state.quality, rebuilds: rebuilds, wind: material.userData.uWindStrength && material.userData.uWindStrength.value || 0 }; }
    function dispose() { scene.remove(mesh); geom.dispose(); material.dispose(); }
    return Object.freeze({ update: update, snapshot: snapshot, dispose: dispose, mesh: mesh, budget: budget, normalize: normalize });
  }
  return Object.freeze({ PRESETS: PRESETS, normalize: normalize, budget: budget, hash: hash, grassDescriptors: grassDescriptors, makeGrassGeometry: makeGrassGeometry, attachWindSway: attachWindSway, create: create });
});
