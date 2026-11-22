# River Valley v1.12.0 — GPU meadow, geographic placement and offline quality tiers

## Integration scope
- Preserve the existing original Three.js renderer, River Explorer skinned 27-joint/13-clip character, Scout, wildlife/fishing/farming/cooking systems, collision and all three local save slots.
- Use `src/graphics-quality.js` to render a capped, deterministic instanced meadow around the player; the module excludes river areas and interactive landmarks, and uses the *visible quadtree terrain height* for all positions.
- Gameplay UI has three persistent quality tiers: Battery Saver (no meadow; reduced trees), Balanced (bounded meadow), and Showcase (denser meadow). On mobile, budgets are lower. **These are geometry budgets, not guaranteed FPS targets.**
- When terrain LOD commits, nearby buildings/foliage are re-anchored using the same visible triangle-height sampler; other terrain layers remain illustrative/not survey-verified.
- Keep the original source-embedded GLB and embedded texture atlas. `src/compressed-assets.js` and `tools/compress_optional_glb.py` provide an **optional, decoder-safe gzip wrapper** for *future side-loaded GLBs*, with strict local-path/raw-fallback validation. The published playable rig remains uncompressed/inlined, and gzip does **not** improve GPU draw calls or FPS.

## Verification and release gates
1. `npm --prefix game run build` must regenerate independent offline and hosted HTML.
2. `npm --prefix game test` exercises graphics tier invariants, world height re-anchoring presence, compression selection and offline cache version.
3. `python -m unittest discover -s game/tests -p test_optional_glb_compression.py -v` checks GLB header, required extension rejection, rig and animation structure, and deterministic gzip round trip.
4. Main browser CI must pass desktop and mobile-sized Chromium WebGL character tests, performance matrix capture, and offline save restoration.
5. GitHub Pages build must pass all acceptance gates and deploy the actual root `index.html`; independently check public release marker and service worker.

## Boundaries
The game is independent of Tri-State Systems Manager. The supplied GIS world-preview file is synthetic demonstration geometry and is not automatically promoted to authoritative Posey County terrain. The current changes improve alignment against **existing game-height samples**; they do not establish NAVD88 survey accuracy. External Unity/Unreal art labs are optional, not part of the GitHub Pages WebGL runtime. Actual iPhone FPS and battery impact require measurement on physical hardware.

## Research references
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)
- [Three.js update bounds guidance](https://threejs.org/manual/pages/how-to-update-things.html)
- [glTF Transform CLI](https://gltf-transform.dev/cli)
- [glTF meshopt compression notes](https://gltf-transform.dev/modules/extensions/classes/EXTMeshoptCompression)
