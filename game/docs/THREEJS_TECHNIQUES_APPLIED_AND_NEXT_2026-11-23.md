# Three.js Techniques — Already Applied & High-Value Next Steps
**Target:** Tri-State-River-Valley-Video-Game (offline single-file + hosted)  
**Date:** 2026-11-23

## Already present and production-quality
| Technique | Location / evidence |
|-----------|---------------------|
| Custom GLSL water (Fresnel, procedural normals, sun glint, storm mix, quality tiers) | `game/src/river-water.js` |
| GPU-instanced meadow / foliage density tiers | graphics-quality + render workers |
| Quadtree terrain + seam skirts | `quadtree.js`, mobile batching notes |
| Kinematic motion with analytic velocity integration | `motion-controller.js` |
| Per-foot plant / swing / slope pitch IK assist | `foot-plant.js` |
| Soft contact shadow (CanvasTexture, no shadow map cost) | `motion-controller.js` createContactShadow |
| Building + foliage workers (strategy selection) | `render-workers.js` |
| Self-contained GLB, no external URIs | audit tools + offline packager |
| Battery / Balanced / Showcase quality budgets | `graphics-quality.js` |
| Frame probe + exportable iPhone FPS report | `frame-probe.js` |

These already follow modern Three.js offline practices: no heavy reflection probes, no external texture CDNs, explicit quality switches, and deterministic kinematics instead of full rigid-body cost on low-end mobile.

## Highest-value next applications (still offline-safe)

### 1. Fixed-timestep simulation (Priority 1)
- File added: `game/src/fixed-timestep.js` (this package).
- Wrap `ValleyMotion.step` and foot-plant updates inside `tick(realDt, stepFn)`.
- Benefits: identical gait / jump arcs across 30–120 Hz devices; prevents “spiral of death” after tab backgrounding.
- Integration point: main loop in `game.js` / `open-world.js`. Keep render interpolation optional via returned `alpha`.

### 2. Camera obstruction (cheap)
- Current `cameraClearance` already samples terrain under the camera ray.
- Next: 3–5 short raycasts (or height samples) against a coarse building AABB set already available from the building worker. Lift or pull camera if the sample height exceeds the look-at height + margin. Keep it kinematic; do not introduce full BVH until three-mesh-bvh license + perf are verified under the project’s offline budget.

### 3. Water budget upgrades (still no render targets)
- Current shader is already excellent for the constraint set.
- Optional: add a second low-frequency wave set driven by wind direction uniform; keep total ALU under the existing `uDetail` switch so “lite” remains cheap.
- Avoid `WebGLRenderTarget` reflections for the family game; they break the single-file offline story and cost VRAM on iPhone.

### 4. Instanced props / LODs
- Pattern already used for meadow clumps.
- Extend the same `InstancedMesh` path to town props and distant building impostors once the county streaming policy (`streaming-policy.js`) decides a cell is active. Keep one material per prop family.

### 5. Skeleton / animation hygiene when #22 lands
- Prefer `SkeletonUtils.clone` + explicit clip renaming over mutating the shared GLTF cache.
- Keep the current 27-joint contract or introduce a pure mapping table; never silently change bone names that the grip and foot-plant code rely on.

## Explicitly deferred (license / evidence / cost)
- three-mesh-bvh or Rapier until project-owned collision meshes + license review + mobile FPS evidence exist (issue #6 Priority 1).
- Full PBR environment maps or HDR reflections (offline size + mobile thermal).
- Service-worker caching of the game HTML (intentionally retired; offline = downloadable single HTML).

## Recommended order of work
1. Land fixed-timestep wrapper + regression screenshots of jump/gait (no art change).
2. Camera obstruction height samples against building AABBs.
3. Complete #22 intake only after real Blender source arrives (playbook already written).
4. Then revisit instanced prop LODs and wind-driven canopy if frame budget remains.
