# River Valley Family Adventure — graphics release v1.8.2

## Artistic scope

This is the **standalone family game**, not Tri-State Systems Manager, an engineering digital twin, or regulatory flood mapping.

The art direction draws on southwestern Indiana's Ohio River architecture: red-brick commercial blocks, pale painted siding, muted limestone, blue-green window glass, willows near the riverbank, and broadleaf trees in groves. Materials and tree positions are original and fictional. Reference photographs and private studio documents are not redistributed in the public game.

## Implemented systems

- `src/visual-polish.js`: six locally generated, repeating 256×256 brick, limestone, and clapboard materials; shared physically based wall/roof/glass materials. The near-camera building wall mesh creates UVs on footprint segments. Material allocation is once at WebGL startup, with shared materials retained when high-detail buildings leave view.
- `src/biome-streamer.js`: deterministic seeded vegetation cells. Near-player town, groves, countryside and riverbank use seasonal palettes and bounded nearby geometry descriptors. A fixed four-batch `InstancedMesh` renderer consumes the cell descriptors. Cell creation is bounded per update and distant cells are evicted with an outer-radius hysteresis band. This replaces the original static, permanent 1,150-tree forest. It is a **local descriptor stream**, not remote mesh downloads.
- `src/lod-transition.js`: prepares quadtree tiles in multiple animation frames (12 at regular quality, 8 in Performance mode). It retains the complete previous terrain until the next surface is ready, swaps the complete prepared set, and fades the old surface over approximately 260 ms. Roads and building bases are refreshed against the new active index. Cancelled staging work disposes its unused geometry.

## Quality budgets

| System | Implemented budget or rule |
| --- | --- |
| Façade maps | Original 256×256 CanvasTextures with repeating UV, mipmap minification, shared PBR |
| Vegetation | Maximum 980 active trees on desktop / 470 on mobile; 240-unit local cell index |
| Performance effect mode | Draw cap of 340 desktop / 220 mobile trees |
| Foliage draw batches | 1 trunk and 3 crown species InstancedMesh batches |
| LOD build budget | 12 generated tiles per animation frame (8 in Performance mode) |
| Terrain swap | Single complete surface commit, 260 ms outgoing fade, cancel stale staging |
| Gameplay state | Missions, save slots, homestead, fishing and farming unchanged |
| Data confidence | Fictional placements; no new regulatory, survey or cadastral claims |

The current browser frame pacing heuristic is **not GPU profiling**; none of these caps are guarantees for any specific hardware. The PWA and single-file downloadable game remain offline and have no online texture dependencies.

## Source guidance and independent validation

The user's Drive *AAA video Game* source groups rendering, world/biomes/streaming and materials/assets into separate systems. This release follows that module boundary, without importing an external engine. Their *Cinematic Masterpiece* document discusses lighting and physically based shading; we retain the existing in-game cinematic director. Mapbox's place search confirms the town context for Mount Vernon, Posey County, Indiana; that result supplies no building geometry and no token is embedded. Three.js documentation describes the required `instanceMatrix.needsUpdate`, instance-color refresh, bounding spheres and `MeshStandardMaterial`.

Verification:
- `npm test`: gameplay, geospatial-reference, source, cache, geometry, PBR selection, seeded vegetation and staged-LOD regression tests.
- `python tools/audit_runtime_graph.py`: all scripts included in offline precache and the original five GLB headers validated.
- `npm run build`: rebuild downloadable single HTML and hosted PWA.
- Python reference/Pages tests and browser acceptance are independent gates; do not claim real-device verification from CPU tests.

## Follow-on polish

Recheck facade textures, vegetation placement, transition fade and FPS on mobile Safari and discrete-GPU desktop in the live GitHub Pages build. Adjust scene exposure and species silhouette proportions with screenshots, not by claiming geographic fidelity.
