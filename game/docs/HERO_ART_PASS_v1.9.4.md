# River Explorer v1.9.4 — contact-aware motion and microfabric art pass

## Scope
This release incrementally improves the existing independently authored River Explorer. The supplied two character boards and the new refinement board are **visual direction**, not externally licensed mesh data. The browser game stays offline-first, anonymous, self-contained and separate from the TSM civil-engineering digital twin.

## Implemented
1. **Terrain contact**: src/foot-plant.js provides a per-foot world-space stance anchor, toe-off detection, swing clearance, root-motion-relative contact and finite reach (re-pin rather than hyperextend). It clamps extreme/invalid terrain samples and derives conservative ankle pitch from ground slope. The rigged-hero runtime uses these targets inside its existing two-bone knee/hip solver, resets on non-walking activities and frees contact resources on dispose.
2. **Character materials**: the deterministic headless GLB builder now exports a TEXCOORD_0 accessor for every primitive. src/rigged-hero.js uses it for original locally synthesized 96px woven/ripstop microtextures (shirt, cargo, pockets, gaiter, pack/straps and boots) without HTTP fetches. The native PBR metallic/roughness material parameters remain present.
3. **Face refinement**: the GLB generator adds original skull-nose and cheek mesh details and two transparent PBR glasses lenses bound to the head bone. Glasses geometry remains visible through translucent lens material.
4. **Testing/diagnostics**: Node tests cover stance stability, toe-off, slope/NaN guards, resets and invalid input; GLB tests check UV0 counts, skinned instances, and translucent lenses; headless Chromium desktop/mobile checks require real textured SkinnedMesh rendering and available foot-contact diagnostics.
5. **Release**: regenerate GLB and embedded base64 HTML at build time, bump both caches to 1.9.4, preserve the fallback avatar, source checksums and GitHub Pages pipeline.

## Evidence limits
- A world-space stance latch reduces mechanical sliding over short contacts but does not provide full-body physics, biomechanically accurate motion capture, joint collision, foot-sole volume, or deterministic zero-slip under high avatar speeds.
- Planar repeat UVs make clothing more legible at gameplay distance; a high-fidelity character needs dedicated unwraps, normal maps, directional stitch atlases, separate finger articulation and human art review.
- Automated desktop/mobile viewports under software-WebGL do **not** certify phone hardware GPU performance, device audio, or native iOS Safari.
- No TSM survey terrain, cadastral identifiers, or engineering flood measurements are claimed; the game remains artistic.
- MapLibre, PMTiles, Rapier, three-mesh-bvh, and external avatar packages are *researched candidates*, not imported runtime dependencies.

## Reproducibility and acceptance
Run:
    cd game
    python3 tools/build_rigged_hero.py
    npm test
    npm run build
    python3 tools/audit_runtime_graph.py
Browser QA:
    python3 tests/browser_hero_smoke.py

Required verification before production acceptance:
- All Node tests and offline dependency graph pass
- Generator manifest SHA-256 matches generated binary; every skin mesh has POSITION/NORMAL/JOINTS_0/WEIGHTS_0/TEXCOORD_0 with compatible vertex counts
- The playable browser instantiates a real 17-bone skin, at least six textured meshes and a two-foot solver; no silent fallback
- Mobile and desktop viewport screenshots available as CI artifacts, **not** substituted for independent iPhone Safari tests
- Main CI, release artifact synchronization, Pages deployment each pass on exact merge/release commits

## Research and provenance
- Attached 14-page MapLibre and game-development repository inventory, particularly maplibre-gl-js, opengeos/GeoLibre, maplibre/martin, google/model-viewer and Mesh2Motion/mesh2motion-app
- Khronos official glTF 2.0 specification (TEXCOORD_0 and physically based metallic/roughness)
  https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- MDN WebGL performance practices
  https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- Three.js animation documentation
  https://threejs.org/manual/pages/animation-system.html
- VRM Game Starter (contact-aware IK reference, not copied code)
  https://github.com/norio/vrm-game-starter
- Environment-aware Motion Matching (2025; academic background, no model shipped)
  https://www.alphaxiv.org/abs/2510.22632
- PMTiles/MapLibre integration for a future independent self-hosted game reference map
  https://docs.protomaps.com/pmtiles/maplibre

Open-source projects and academic publications inform design; their names or mention do not grant permission to copy incompatible code or claim their outputs were installed.
