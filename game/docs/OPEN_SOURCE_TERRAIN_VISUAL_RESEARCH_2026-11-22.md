# River Valley — screened open-source terrain and visual-engineering references
**Review date:** 2026-11-22 | **Target:** existing standalone Three.js offline game, not the separate civil-engineering TSM digital twin.

The supplied list is a **reference inventory**, not an installation manifest or license grant. Project snapshots were checked through GitHub metadata and documentation on 2026-11-22. Do not import repo code, texture assets, shaders, maps or game content without auditing the **exact revision**, all third-party subasset licenses and outbound data licensing. Repository licenses can differ from data licenses.

## Applicable techniques actually applied to the game

| Reference | Technique studied | Disposition |
| --- | --- | --- |
| [Three.js Optimize Lots of Objects](https://threejs.org/manual/pages/optimize-lots-of-objects.html) | Reduce per-mesh driver submissions; merge static geometry | **Implemented:** indexed windows share one building-wide window mesh |
| [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) | Repeated units in one draw with per-instance transforms / colors | **Existing and retained:** distant building boxes, roofs, three foliage crown shapes, rocks, reeds and flowers |
| [ZyFou/ProceduralTerrains](https://github.com/ZyFou/ProceduralTerrains), MIT | Staged chunk building, LOD budgets, adaptive quality, shader performance diagnostics | **Applied principles:** bounded per-frame tile sampling, driving-biased build budget, traceable LOD events and 24-scenario captures; no dependency installed |
| [Zylann/godot_heightmap_plugin](https://github.com/Zylann/godot_heightmap_plugin) | Queued chunk updates and MultiMesh grass; inspect source license beyond GitHub's NOASSERTION | **Applied principles:** deferred road redraping at safe travel speed, material reuse across terrain tiles and instanced foliage |
| [IceCreamYou/THREE.Terrain](https://github.com/IceCreamYou/THREE.Terrain), MIT | Seeded terrain generation and instanced scattering | **Existing game techniques reinforced:** deterministic instanced riverbank vegetation and original terrain generator |
| [mapbox/martini](https://github.com/mapbox/martini), ISC | RTIN terrain error-adaptive triangulation | **Research only:** offline adaptive meshing candidate. No on-the-fly RTIN mesh import until seam topology/height provenance/LOD switching tests pass |
| [alexanderperrin/threejs-ballooning](https://github.com/alexanderperrin/threejs-ballooning), MIT | Mesh merging, procedural terrain and shadows | **Conceptual reference only:** keep shadow/overdraw evidence separate from draw call counts |

**Design choice:** Retain one native Three.js/WebGL renderer, one source-grounded procedural height function, a seam-preserving quadtree and deterministic game original GLB. Do **not** swap renderers, import a cloud tile server, or make a geospatially surveyed accuracy claim.

## Other screened projects — use as references, not new dependencies

| Repository | Relevant idea | Adoption or boundary |
| --- | --- | --- |
| [mohsenph69/Godot-MTerrain-plugin](https://github.com/mohsenph69/Godot-MTerrain-plugin) (MIT) | Open-world chunk/LOD management | Godot plugin, so conceptual only |
| [Jaysmito101/TerraForge3D](https://github.com/Jaysmito101/TerraForge3D) (MIT) | Offline procedural terrain authoring | Potential future art export, not a browser runtime |
| [w3reality/three-geo](https://github.com/w3reality/three-geo) (MIT) | Geographic terrain coordinates | Optional offline reference artwork, not needed for current fictional elevations |
| [openglobus/openglobus](https://github.com/openglobus/openglobus) (Apache-2.0) | Globe/terrain streaming | Separate engine, do not duplicate game renderer |
| [pelicanmapping/osgearth](https://github.com/pelicanmapping/osgearth) (MIT) | Native geospatial LOD | Native engine reference only; separate desktop app would be a different product |
| [NASAWorldWind/WebWorldWind](https://github.com/NASAWorldWind/WebWorldWind) | Globe mapping | Do not change the existing scene to geospatial tile browsing |
| [NASAWorldWind/WorldWindJava](https://github.com/NASAWorldWind/WorldWindJava) | Native globe rendering | Different engine/language; reference only |
| [vvoovv/blosm](https://github.com/vvoovv/blosm) | Blender OSM building conversion | OSM import could help authorized artwork with attribution/data obligations. **Do not copy proprietary Google 3D city models** into the game |
| [ANYbotics/elevation_mapping](https://github.com/ANYbotics/elevation_mapping) (archived, BSD-3-Clause) | Sensor height-uncertainty map | Conceptual safety/grade reference; not a source of Posey terrain |
| [naturerobots/mesh_navigation](https://github.com/naturerobots/mesh_navigation) (BSD-3-Clause) | Surface navigation under uneven terrain | Reference for future slope and foot-contact improvements |
| [Belluxx/Aleph](https://github.com/Belluxx/Aleph) (MIT) | Satellite/terrain/building retrieval tools | Data licensing and verified provenance mandatory; no generated claims of 1:1 street accuracy |
| [heremaps/tin-terrain](https://github.com/heremaps/tin-terrain) (archived, MIT) | Precompute tiled TINs from heightmaps | Archived; offline preprocess reference, not a shipped runtime |
| [fede-vaccaro/TerrainEngine-OpenGL](https://github.com/fede-vaccaro/TerrainEngine-OpenGL) (MIT) | GPU-oriented terrain draw paths | C++ desktop pipeline, only render concepts portable |
| [dimartarmizi/web-flight-simulator](https://github.com/dimartarmizi/web-flight-simulator) (GitHub license NOASSERTION) | Fast camera motion over terrain | Visual and pacing reference only, do not copy code unlicensed |
| [noniv/snowflow_demo](https://github.com/noniv/snowflow_demo) (MIT) | Real-time GPU snow | WebGPU/Babylon WGSL path differs from WebGL; research only |
| [weigert/SimpleHydrology](https://github.com/weigert/SimpleHydrology) (no SPDX license reported) | Terrain erosion, rivers, lakes | Fictional artistic terrain reference, not verified flood hydraulics |
| [xandergos/terrain-diffusion](https://github.com/xandergos/terrain-diffusion) (MIT code) | Learned terrain generation | No model weights or remote inference installed; unsuitable for reproducible observed terrain |
| [stuntrally/stuntrally](https://github.com/stuntrally/stuntrally) (GPL-3.0, points to stuntrally3) | Vehicle handling, camera and track editor | Do not vendor GPL code into this closed-source project; vehicle dynamics reference only |
| [AnkleBreaker-Studio/unity-mcp-server](https://github.com/AnkleBreaker-Studio/unity-mcp-server) (NOASSERTION) | Unity automation | Inapplicable to a shipped Three.js runtime |

The supplied list also contains voxel, marching-squares, Unreal Engine, Godot-only, editor-only and robot-locomotion projects. These may inform future art production, but embedding them in the browser would add new engines, increase downloads, introduce licensing/supply-chain concerns and **not directly repair current frame pacing**.

## Design gates for future adoption

1. Reproduce the exact same camera location, seeded terrain, mode and quality preset before/after any tool change.
2. Keep original 27-joint skinned River GLB and binary SHA-256 manifest generated from the same source revision.
3. Require visual seam/riverbank/foot-contact screenshots and tests; never optimize by removing useful terrain or buildings silently.
4. Use browser frame-time histograms, draw counts, triangle counts and terrain events, then independent iPhone Safari measurements.
5. License-review every copied code path and art asset; avoid map/city data of uncertain provenance. Retain offline anonymous gameplay without a CDN or API key.

**Not implemented:** RTIN mesh replacement, learned diffusion terrain, GPU snow, imported Google city photogrammetry, another game's assets, Unity/Godot/Unreal integration or a globe renderer. These remain research leads, not verified game improvements.
