# River Valley v1.9.5 — Actual-game locomotion and ground-contact experience

## Scope and evidence separation

This is a **gameplay** release for the standalone River Valley Family Adventure, not a new renderer and not a modification of the TSM civil-engineering digital twin. The landscape is art-directed and the geographic vertical datum remains unverified. The supplied River character sheets and attached 14-page repository list are design references; no outside character, texture, rig, AI output, or proprietary SDK is copied.

## Implemented in the existing Three.js game

1. **Kinematic movement module**: \`src/motion-controller.js\` replaces instantaneous game-step velocities with analytic exponential acceleration/braking. World displacement is integrated in closed form, so constant-input movement matches at 30 and 60 FPS. Camera-relative keyboard/touch direction is preserved; turn rate is capped to prevent 180-degree body snapping. Normalized diagonal movement, country-boundary clamping, and reset on fast travel, mode changes, scenic tour and activity entry are retained. Walking and sprinting are slower than the previous rapid map traverse; use the car and fast travel for distances.
2. **Actual non-rigidbody jump**: J and the newly added mobile JUMP touch button launch the avatar on a bounded ballistic arc. The visual root rises above its terrain contact and returns to the ground, with jump/land animation states and no auto-repeat on a held key. This is not obstacle or rigid-body physics; it does not add collision with stairs, walls or roofs.
3. **Gait and grip refinement**: \`src/rigged-hero.js\` synchronizes three locomotion cadences with the new movement speed bands; leg reach is bounded within an expanded contact envelope; small lateral hip correction follows the foot's stance anchor. Both hands receive smoothed wrist targets during fishing, tracking, cooking, farming, interaction and seated driving. All props remain attached to the original hand bones and the skeleton stays 17-bone skin.
4. **Grounding cue**: one locally generated radial-gradient contact plane follows the avatar or vehicle; its scale changes between walking/driving and its opacity decreases while the hero jumps. It is a deliberately inexpensive approximation, **not** a real light-cast shadow. Dynamic shadow maps remain off by default for phone compatibility.
5. **Better camera**: sampled heightfield clearance raises the existing follow-camera target just enough to clear intervening terrain, capped to prevent extreme pitch; no second 3D viewer is introduced. Buildings are **not** camera colliders in this pass.
6. **Tested interfaces**: source, model and offline cache script order; deterministic motion math at different frame rates; jump edge/landing, bounds, camera clearance; browser WebGL assertions for a real soft contact shadow, motion state and mobile jump control.

## Source-to-implementation selection

| Reference | What was applied | Dependency status |
| --- | --- | --- |
| three-procedural-locomotion (PabloMesquida, MIT) | gait cadence/foot-roll/IK and distance-oriented motion concepts | **Not installed** |
| hh-hang/three-player-controller (MIT) | collision/camera/IK feature checklist; separate physical root from visual rig | **Not installed** |
| m2-md/third-person-camera-rig-threejs | visual comfort/terrain and obstacle clearance design | **Not installed** |
| Mesh2Motion/mesh2motion-app (MIT code; source media has separate licenses) | viable manual future offline retargeting workshop; preserves the project's own GLB | **Not installed** |
| google/model-viewer (Apache-2.0) | future QA and manual review of exported GLBs, not a game render replacement | **Not installed** |
| Tencent-Hunyuan/Hunyuan3D-2 | possible offline experimental source mesh generation; its custom model license requires review | **Not installed** |
| maplibre/maplibre-gl-js, maplibre/martin, PMTiles (PDF pp. 1–6) | possible standalone offline geographic reference *map interface*; existing game renderer kept | **Not installed** |
| Rapier and three-mesh-bvh | possible future capsule/building/vehicle physics collisions after a benchmark | **Not installed** |

Sources:
- https://github.com/PabloMesquida/three-procedural-locomotion
- https://github.com/hh-hang/three-player-controller
- https://github.com/m2-md/third-person-camera-rig-threejs
- https://github.com/Mesh2Motion/mesh2motion-app
- https://github.com/google/model-viewer
- https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/LICENSE
- https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- https://threejs.org/manual/pages/game.html
- https://www.alphaxiv.org/abs/2510.22632

Relevant Drive reference: AAA Studio Game Project Supertree Explorer (Aug 2026), a planning UI/diagram rather than execution evidence. It must not be relied upon as proving passing CI. Its remote Tailwind/Google Fonts assets are **not** introduced into this game.

## Release-gate contract

Run from repo root:
    npm --prefix game test
    npm --prefix game run build
    python game/tools/audit_runtime_graph.py
    python game/tests/browser_hero_smoke.py

Checks that matter:
- Node game tests and headless GIS-reference-integrity tests pass, including generated offline/hosted builds.
- Real Chromium desktop + phone-viewport WebGL pass with the skinned River GLB, local textures, foot-contact telemetry, actual in-world shadow mesh and touch jump.
- CSS/JS remain bundled with no new CDN/runtime fetches; \`game-sw.js\` and \`sw.js\` versioned at 1.9.5.
- Main CI, generated browser sync, and GitHub Pages deployment must **each** succeed on the landed changes.
- Do not claim phone hardware framerate, native iOS Safari, Rigidbody collision, full physics support, verified survey precision, or detailed facial motion from these tests.

Next targeted engineering work after acceptance: physics collision and stair stepping (Rapier or BVH after license/size budget); high-resolution hand rigs with explicit finger bones; an authored locomotion clip set retargeted from clearly licensed files; per-biome Foley; progressive vegetation shadows; repeatable GPU FPS/VRAM baselines on representative desktop and iPhone.
