# Issue #6 roadmap progress — 2026-11-23

Roadmap: verified open-world graphics, character contact, physics, atmosphere and offline maps.

## Implemented and on main

| Area | Status | Evidence |
|------|--------|----------|
| Skinned hero GLB / UV fabric / glasses | Done | PR history + `rigged-hero.js`, hero LODs |
| CI WebGL desktop/mobile | Done | `game-ci.yml`, browser smokes |
| Foot-plant / sole locking | Present | `src/foot-plant.js` wired into hero |
| Motion controller / collision | Present | `motion-controller.js`, `world-collision.js` |
| Render workers (buildings + foliage) | Deployed | `render-workers.js` inlined in offline/hosted builds |
| Biome / foliage streaming | Deployed | `biome-streamer.js` + online-enhanced radii |
| Streaming governor | Deployed | `streaming-policy.js` with online-enhanced tile budgets |
| Cinematic director / lighting | Present | `director.js`, `cinematic-lighting.js`, cinema HUD |
| Creatures / Scout 3D | Present | `creatures.js`, Scout GLB |
| Photogrammetry toolchain | Applied on main | COLMAP + Nerfstudio Splatfacto presets + PRODUCTION_READY |
| Offline HTML / no service worker | Policy | `service_worker_disabled_smoke.py` |

## Online streaming (this update)

- **Offline-first remains default** for core play and saves.
- When `navigator.onLine` is true, streaming policy raises terrain tile ceiling (~1.35×) and look-ahead (~1.25×).
- Biome streamer uses larger load/unload radii and tree capacity online for denser cinematic foliage.
- No remote asset dependency is required; online mode only increases local streaming density.

## Still open (issue #6)

- Full Rapier vs three-mesh-bvh bake-off with project-owned meshes
- Optional offline PMTiles + MapLibre reference map pack
- Expanded finger/tool IK clips and seated steering validation suite
- Independent real-device GPU evidence refresh after each major visual train

## Quality gates (unchanged)

Repository-owned assets only; failed steps stay failed; merge only after CI green.
