# Developer reference and integration register — 2026-11-25

Scope: the 14 user-supplied repositories and Cesium Sandcastle. README inspection, not a complete source audit or a license clearance. Blob IDs below identify the README snapshots inspected; pin a release or commit and verify code, data/model license, dependencies, security and reproducible tests before adoption. Do not add production dependencies simply because a reference is interesting.

| Reference | README blob / source | River Valley application | Disposition |
|---|---|---|---|
| [Cesium Sandcastle](https://sandcastle.cesium.com/) | [Tileset API](https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html), [CZML 3D Tiles](https://sandcastle.cesium.com/?src=CZML+3D+Tiles.html), [feature styling](https://sandcastle.cesium.com/?id=3d-tiles-feature-styling) | SSE, cache bytes, overflow, cancellation, parent coverage, time-varying layers | First priority; reference patterns, do not replace working renderer |
| [H3](https://github.com/ATphobia22/h3) | bf2b3ae407ffa691815c3709d293d0c9433ba7ca | Logical region IDs, spatial joins, climate/quest/wildlife aggregation | Evaluate h3-js in a build-time adapter; not a substitute for render quadtree; handle pentagons and boundary overlaps |
| [CodeGraph](https://github.com/ATphobia22/codegraph) | 73e00aa55475959b28d2d90c6c0997b9489919d3 | Symbol references, impact analysis and safe deletion review | Optional local dev tool, verify dynamic JS/HTML dependencies separately |
| [IndexTTS](https://github.com/index-tts/index-tts) | f3872be31d28987982d9417e241674c6c57ca3b0 | Offline-generated character dialogue, pronunciation and emotional delivery | Optional isolated audio build; check model license, voice permission, compute and output rights; no player voice cloning by default |
| [copyparty](https://github.com/ATphobia22/copyparty) | 48a9a5c0630398e99df792d35870f0d2431c6211 | Resumable upload and download for large source models, imagery and scans | Optional private asset staging, authenticated and read-only publishing |
| [XERJ](https://github.com/xerj-org/xerj) | 3280c74e5c8d8dc1c44bb1233c6843344f4fe232 | Local full-text/hybrid search and developer knowledge index | Evaluate separately; no remote service or player-data ingestion by default |
| [SubQuery](https://github.com/subquery/subql) | f03bc033eb4aa47218031acb6864cf2419875425 | Reference for deterministic event processing and derived query views | Pattern only; no blockchain dependency needed |
| [Sonic](https://github.com/valeriansaliou/sonic) | 50532db64e080117ad39b8536c30263dae97ca59 | Identifier-based text search for places and assets | Reference only for now; README describes major v2 rework |
| [Build Your Own X](https://github.com/ATphobia22/build-your-own-x) | 0a2e252abfc68ee15a15308fd666cdc5d41f4a52 | Learning exercises in rasterization, PBR, physics, voxels, network and storage | Separate developer labs, not production code; review each tutorial license |
| [Paperless-ngx](https://github.com/ATphobia22/paperless-ngx) | f1e5141043dcb5e36b496c7ce71192d9e5e24aea | Searchable source documents, GIS provenance, licenses and field notes | Optional private archive; no public upload of private data |
| [Shadow](https://github.com/GradleUp/shadow) | c501e64dbf6e4ef16be09ab6cb65a63a5323a3d3 | Dependency packaging, isolation, reproducible distribution | Pattern only for browser build; plugin for future JVM tools only |
| [react-vis](https://github.com/uber/react-vis) | 42d03ce09ea092b6740c0db4de2b7a57925129bd | FPS, frame latency, tile memory, loading and eviction charts | Learn chart composition; README has deprecated badge and management note; avoid adding legacy React dependency |
| [RIBs](https://github.com/uber/RIBs) | ea3d7111ca5f92db6bd406dc6ac15cf5752013ef | Isolate gameplay logic, routing, construction and view lifecycles | Pattern only: adapt to existing browser modules, not mobile framework |
| [LlamaIndex](https://github.com/run-llama/llama_index) | 572527a8f5293bcf001366da01e51549280ff2e0 | Source-grounded research retrieval and provenance | Optional private development environment; no runtime model dependency |
| [react-map-gl](https://github.com/visgl/react-map-gl) | 06b1b508be2a1de9c769d2c138b1e8eb7458e922 | MapLibre/Mapbox camera and layer state, feature inspection | Reference; use existing map adapter rather than migrating game to React |

## Architecture and acceptance sequence

1. Source intake: record source URI, license, retrieval date, checksum, CRS, vertical datum, resolution, coverage and whether measured or inferred. Do not assert surveyed fidelity for illustrative geometry.
2. Canonical geography: preserve source IDs, normalize WGS84 and local ENU/projected meters, verify transform round trips, vertical datum and region boundaries. H3 is an optional semantic index; exact joins still require geometry predicates.
3. Construction: test terrain edge continuity, watertight building geometry, invalid rings, roof normals, road draping and seam alignment. Preserve original assets.
4. Streaming: use screen error plus distance, camera prediction, cancellation, bounded concurrency, visible parent coverage, a byte-estimate budget and deterministic eviction. Separate transfer bytes from decoded CPU/GPU bytes; count shared resources once. Retain active terrain until new generation completes. Track pending, active and retiring generations independently.
5. Rendering: profile PBR, shadow cascades, texture mipmaps, reflection and water effects; validate desktop/mobile on real GPUs plus CI software rendering. Use capability-based quality tiers, not a blanket maximum quality default.
6. UX: persist user-controlled resolution, graphics, layers, diagnostics and accessibility; expose effective settings separately from requested settings. Avoid a new framework solely for settings.
7. 4D: stable semantic IDs and versioned event/state records; deterministic simulation clock, weather/season, entity activity. Render tile unload must not erase state. Existing save formats must migrate without loss. No blockchain necessary.
8. Developer workflow: dependency graph plus manual dynamic-reference check before deleting; small tested PRs, repeatable build, asset provenance, screenshot and performance evidence. Keep unique originals and saves. Do not claim a tool installed or a deploy verified without evidence.

## This increment

The existing `game/src/lod-transition.js` is the authoritative staged terrain mesh lifecycle in the playable game. A pending same-signature immediate request previously returned without completing the generation, and an immediate request above 512 meshes stopped after the first bounded pump. The patch completes immediate initialization without redoing prepared meshes while leaving regular frame-budgeted pumping and cancellation behavior intact. Three focused regressions cover the two failures and normal cancellation/atomic commit. This is not yet an external 3D Tiles renderer or a GPU byte cache.

PR #52 SSE prioritization is a separate release gate; do not merge before relevant CI succeeds. No source repository cloned, third-party package installed, model downloaded, external service deployed or license clearance claimed by this register.
