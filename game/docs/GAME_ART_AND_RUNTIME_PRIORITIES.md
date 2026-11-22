# River Valley v1.8+ — Game art and runtime decisions

**Decision:** This is a family game, not a geodetic digital twin. Spend time on gameplay responsiveness, readable landmarks, scenic composition, asset consistency, and reasonable mobile performance. The Indiana GIO reference is optional visual guidance, not a release-blocking source-of-truth. A gameplay road may be moved to avoid blocking a trail; cliffs and riverbanks may be sculpted for composition.

## Production stages

1. **Design-blockout:** Keep the navigation and camera comfortable on both desktop and touch. Maintain four in-world activity sites; treat each as a 3D interactive location rather than a separate static menu. Include an explicit visual target for each activity.
2. **Landform editing:** Use deterministic fBm noise over the existing valley surface, sculpt a broad river channel, and use one height sampler for terrain, roads, planting plots and building foundations. Avoid permanent water-plane gaps or floating objects. Prefer designed terrain over uncertain source DEM.
3. **LOD and streaming:** Preserve the current quadtree and its edge-stitch tests. Decide refinement with projected screen error, not an arbitrary GPS distance. Blend at transitions or stitch shared borders; budget active cells and apply hysteresis to reduce flicker.
4. **Built environment:** Create reusable roof/wall/porch and civic landmark modules. Favor InstancedMesh for repeated vegetation and street props; subdivide into nearby chunks to retain useful frustum culling.
5. **Material library:** Original/PBR materials should share calibrated scale. Establish five coherent material families: brick, painted timber, asphalt, soil/grass, and river water. Add normal maps and roughness variation only when profiling supports it.
6. **Character and activity animation:** Improve fishing casting and bobber interpolation, visible crops growing over time, cooking fire, low-poly wildlife motion, and vehicle acceleration feedback. Keep non-graphic wildlife gameplay.
7. **Atmosphere and direction:** Warm-day, blue-hour, rain, mist and night presets should have shared exposure/color discipline. Limit mobile post effects and particle count; static environment reflection/sky gradients are safer defaults.
8. **Packaging and usability:** Render game directly at GitHub Pages root. All runtime code, models, textures and game data must remain available without a CDN, private login, socket or external backend.

## Decision calculations

- Target desktop 60 FPS implies a **16.7 ms** approximate frame budget; 30 FPS mobile implies **33.3 ms**. These are design targets, not measured achievements.
- For a perspective camera with vertical field of view `FOV_y`, viewport height `H` pixels, scene distance `d`, and object-space geometric error `e`, approximate projected error is `e_px ≈ e * H / (2*d*tan(FOV_y/2))`. Use projected error with a hysteresis band to select terrain/mesh LOD; validate observed quality across angles.
- Add player speed to streaming radius design: `load_ahead_distance ≈ movement_speed * expected_load_latency + near_visible_distance`; use measured latency rather than an invented network time.
- Frame budget and draw call budget should be measured on representative hardware after each game build. Avoid a blanket GPU performance claim based solely on software-WebGL test output.

## Evaluated tool references

| Option | Game value | Integration decision |
| --- | --- | --- |
| [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) | Reuse plant, tree and fence geometry in batches | First choice for nearby repeated props; partition instancing by region |
| [aiira-co/three-terrain-lod](https://github.com/aiira-co/three-terrain-lod) | Modern quadtree LOD implementation with material swapping | Reference only; its Three.js peer version may be newer than the vendored engine and it must not replace current LOD without migration tests |
| [zeux/meshoptimizer / gltfpack](https://github.com/zeux/meshoptimizer) | Simplification and mesh/vertex cache optimization for 3D assets | Adopt as a headless *optional build-stage* tool after exact asset inspection, license and before/after renders; MIT per upstream |
| [glTF Transform](https://gltf-transform.dev/) | Inspect/optimize GLB, optimize texture formats | Candidate for build-time GLB normalization after version/license review |
| [Poly Haven](https://polyhaven.com/license) | CC0 environment textures and HDRIs | Safe candidate for art references and texture sources when recorded with attribution/provenance |
| [mymeshy](https://github.com/felippeomgt/mymeshy) | Local-first AI text-to-3D and image-to-3D workbench | Prototype candidate only: outputs need QA, topology checks, UV checks and license receipt |
| [three.js performance notes](https://github.com/WesleySalzer/GameCodex/blob/main/packages/server/docs/threejs-arch/guides/G6_optimization_performance.md) | Practical LOD, batching, culling and texture strategies | Use as a checklist rather than installing unrelated runtime modules |

These are researched references, **not** software packages automatically imported into the build. No generated third-party asset is production-ready until its license, vertex count, triangle budget, material/texture dependencies, pivot/orientation and independent renderer appearance are verified.

## Creative review gates (not civil engineering gates)

- No visible road hovering above ground; no missing terrain seams at LOD boundaries.
- Buildings have grounded foundations, distinct roofs, and coherent wall material scale.
- Each mini game can be reached, started, completed, and saved in real 3D, with a usable 2D fallback.
- Touch controls do not cover essential interaction prompts; every settings panel can close.
- The official imagery overlay is opt-in, clearly a **reference**, not a required dependency or a simulation truth source.
- GitHub Pages and downloadable offline game both open without login and without broken relative resource paths.
- Check scene quality with real browser screenshots at mobile and desktop widths, not only mock DOM tests.

## Notes on advanced graphics research

The alphaXiv results for 'Six Ways to Draw Vangers with WebGPU' (2026) and 'Magpie: Real-Time World Renderer for Interactive Games' (2026) offer research directions. Treat neural rendering and experimental WebGPU renderers as future investigations, **not** as dependencies of an offline WebGL-compatible family game. A stable, tested frame at moderate quality is better than an unverified high-end renderer on most phones.
