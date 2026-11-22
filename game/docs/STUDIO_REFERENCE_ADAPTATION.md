# Studio architecture guides → family game implementation

The private game-architecture materials supplied by the project owner were **read as references only**. This public document does not redistribute any private source material, diagrams, contractual figures, security topology, or original full-text architecture plans.

## Implementation boundary

This is an offline-capable, static Three.js browser game. It does **not** run Unreal Engine 5 World Partition, FastGeo, Lumen, Nanite, OpenUSD, Hydra, render farms, motion-capture services, server infrastructure, or the tactical twin's engineering solver.

| Internal reference | Concept used in this game | Current implementation | Evidence |
| --- | --- | --- | --- |
| *AAA Game Development Master Architecture v2.0* — cinematic camera, lighting, streaming, population and quality gates | Keep gameplay, cameras, rendering and environmental assets distinct, and gate asset dependencies | `src/game.js`, `src/director.js`, `src/atmosphere.js`, `src/open-world.js`, `tools/audit_runtime_graph.py` | Node, Python and browser smoke tests |
| *UE5 AAA Open-World Streaming Pipeline Reference* — HLOD, cell sizing, streaming budgets | Adapt the high-level principle of bounded visible terrain complexity, screen-error refinement and movement-aware look-ahead | `src/quadtree.js`, `src/streaming-policy.js` | Deterministic LOD seam tests and policy hysteresis tests |
| *Portable AAA Engine Scaling & Optimization Analysis* — efficient packaging and streaming | Produce a self-contained downloadable game and HTTPS PWA with a fully enumerated offline dependency graph | `build_offline.py`, `sw.js`, `tools/audit_runtime_graph.py`, Pages artifact builder | Runtime dependency audit and service-worker smoke test |
| *AAA Studio Game Project Supertree Explorer* — directory and path validation | Keep clear `src/`, `data/`, `assets/`, `tests/` and `tools/` boundaries and validate paths, cache contents and binary models | `tools/audit_runtime_graph.py` | Fails on missing, remote, duplicate, or uncached scripts |
| *AAA Tri-River Valley Tactical Twin Engine* — scene and material prototype | Reuse visual design ideas (fog, color, lighting, terrain-anchored mesh) only, not flood/well/cadastral simulation | `src/atmosphere.js`, `src/game.js`, `src/geometry.js` | Three.js WebGL and 2D fallback |
| Other unidentified reference attachment | No integration until the referenced file can be located and inspected | None | Unverified |

## Runtime streaming budget

`ValleyStreamingPolicy.createGovernor` samples requestAnimationFrame wall-clock intervals and adjusts the maximum terrain-quadtree tile count only when **auto** detail is selected. It uses slow-frame and fast-frame hysteresis plus seconds-long cooldowns. Hidden/background tab gaps and invalid timing are ignored.

The camera's quadtree focus is moved **slightly** forward while the player is moving, with bounded speed-based look-ahead. It does **not** move source GIS geometry or alter save coordinates. Active roads and building bases continue using the same terrain sampler after a LOD rebuild.

**Important:** requestAnimationFrame intervals are not measured GPU times. The policy does not automatically stream disk chunks, compress GLBs or implement Unreal's asynchronous actor loading. It merely moderates a synchronous browser terrain re-tessellation that already existed.

## Render and gameplay gates

- The terrain quadtree selection and sampled road/building surfaces remain coincident across changes to the tile limit.
- Auto quality reduces the number of visible tiles only under sustained slow frames; manual terrain quality remains user-authoritative.
- Gameplay inventory, farm, cooking and hunting events must be unaffected by visual quality changes.
- The offline asset graph must contain every referenced game JavaScript module and each of the five original GLB models must have a valid glTF2 header.
- The game must launch without login or engineering API. Fallback 2D gameplay remains when WebGL is unsupported.
- Pages must deliver the compiled `game.html` as the root `index.html` and install relative to the project's subpath.
- Measured performance and real-device offline operation require independent QA.

## Future artistic improvements (not implemented here)

Chunk-scoped building/vegetation instancing, deeper mesh and texture LOD chains, shot-by-shot material grading, build-time model simplification and independent GPU benchmarks will require separate tests and licensed assets. Preserve user-controlled creative freedom: survey-level geographic accuracy is optional for this fictional game.
