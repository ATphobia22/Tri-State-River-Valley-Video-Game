# Streaming World performance engineering — 2026-11-25

## Decisions and evidence
- Production remains WebGL. PR #57's real H3 and simulation-clock integration and PR #59's bounded per-cell summaries and measured terrain staging are the baseline. Cell summaries are observations, not an unbounded event store or geographic tile loader.
- Prefer deadline-based cooperative work in the existing animation loop for mesh construction. Meshes are indivisible and atomic terrain swaps can exceed the slice: measure both. Use feature-detected scheduler.postTask/yield for non-render tasks, not a mandatory dependency. Native workers remain preferable for decoding and long CPU tasks. See https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API and https://cesium.com/learn/ion-sdk/ref-doc/RequestScheduler.html .
- Future request queue: prioritize missing visible parent coverage, then SSE-ranked visible children, then predicted neighbors. Bound per-origin concurrency, request bytes, decode queue and uploads independently. Abort obsolete requests; still dispose late results. Avoid retry storms with bounded backoff. Retain parent coverage until children are ready.
- PMTiles is a range-addressable map archive, not a 3D Tiles mesh container. Verify actual HTTP 206, Content-Range, archive version and CORS on the serving host before selecting it. See https://docs.protomaps.com/pmtiles/cloud-storage and https://cesium.com/learn/cesium-native/ref-doc/selection-algorithm-details.html .
- WebGPU experimental harness must validate feature parity, adapter/device loss and optional timestamp-query; use existing WebGL fallback. Do not equate API exposure with GPU execution.

## KTX2 conversion pilot
The live facade and terrain palette generates 256px canvas textures. These are not static source PNGs. Character GLBs already contain project-original embedded RGB8 PNGs at 256/128/64 pixels. Convert those first as a controlled pilot, then export the existing procedural palette deterministically for terrain and buildings; do not replace imagery or character assets with newly invented textures. Review forest alpha/normal textures separately.

`python game/tools/build_ktx2_pilot.py game/assets/models/river_explorer_rigged.glb game/assets/models/river_explorer_lod1.glb game/assets/models/river_explorer_lod2.glb --output /tmp/river-ktx2`

CI installs Khronos KTX Software 4.4.2 from the official release with pinned SHA-256, encodes 24 textures, validates each with the KHR_texture_basisu profile, checks unchanged original models, and publishes source/encoded hashes and byte totals as a review artifact. The encoder recipe explicitly separates sRGB color from linear data, generates mip levels and uses ETC1S for color, UASTC for linear/normal inputs. The pilot currently handles only embedded RGB/RGBA8 PNGs. It intentionally rejects conflicting roles instead of changing material semantics. It does not repackage GLBs or integrate a transcoder into the runtime. See https://github.khronos.org/KTX-Software/ktxtools/ktx_create.html and https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md .

A smaller KTX2 file is not guaranteed versus an already compressed procedural PNG. Measure both transfer size and GPU-transcoded block memory, including mips, and compare material appearance before replacing a live texture. No savings claim until actual measurements. Native GLB skinning and all existing source assets remain intact.

## Acceptance gates for next release
1. Verify PR #59 production deploy; close obsolete PR #52 only after comparing forward-port evidence; PR #54 may contain unique code and needs separate diff review.
2. KTX conversion artifact, exact source hashes and validated images; add a compatible transcoder to an isolated review harness, compare visual output/actual allocation format and fallback, then opt-in runtime integration.
3. External streaming: reference-coordinate and source-license verification, real range hosting, bounded request/decode/upload queues, parent continuity, and geographic replay.
4. Persistent cell record schema for actual authoritative entities; never persist GPU handles or transient request state; keep simulation deterministic and bounded. Current summaries are not a complete cell world database.
5. AI PR #58 remains draft until live model inference, worker recovery and hardware checks; reconcile with current main before any merge. Do not infer physical GPU performance from SwiftShader.
