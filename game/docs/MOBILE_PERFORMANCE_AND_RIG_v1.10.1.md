# River Valley v1.10.1 — Mobile Rendering, River Rig and Frame-Pacing Release

## Baseline: real browser export, not a certified iPhone benchmark

The user supplied \`river-valley-device-performance.json\` recorded **2026-11-22 13:51:31 UTC**, with browser-reported iPhone/Safari user agent, 828×1372 CSS viewport, DPR 2, WebGL, driving mode, full visual quality.

| Metric | Uploaded browser baseline |
| --- | ---: |
| Samples | 3,054 |
| Median FPS | 58.82 |
| Mean FPS | 53.44 |
| P95 frame time | 28 ms |
| P99 frame time | 42 ms |
| Worst frame | 194 ms |
| Maximum draw calls | 677 |
| Maximum triangles | 316,839 |

This is a sampled **one-scene / one-quality / driving** record, not a six-scene hardware certification. The recording lacks a complete per-frame timeline, power state, model identifier, shader compilation trace, GPU timers, and thermal status. Peak draw calls are not an average. Software Chromium/SwiftShader regression results **must not be compared numerically** to these hardware samples.

## Changes made directly to the existing game

1. **Skinned River Explorer (27 bones, 13 clips):** Retain the current *generated* GLB, embedded \`hero-model.js\` and SHA-256 manifest; never replace it with the user's historical 17-bone GLB. The standard-library \`tools/build_rigged_hero.py\` filters zero-area triangles *before* exporting normals/indices, records \`degenerateTrianglesRemoved\`, and preserves per-vertex skin joints, weights and UVs. Asset digest/manifest/embedded script are checked after deterministic regeneration. No downloaded/retargeted animations are claimed.
2. **Building draw submissions:** Near-building windows are written into one indexed buffer and one existing shared glass material **per building**, instead of one Three.js plane mesh per pane. The high-detail near-building count is bounded more strictly during driving. The familiar instanced mid/far building boxes and roof batches remain. Those budgets trade some distant façade detail for smoother travel; they do not remove collision obstacles.
3. **Terrain skirts:** Instead of a \`Mesh\` per quadtree leaf's skirt, all skirts in a committed LOD surface are grouped into **one** batched seam mesh. Neighbor edge samples retain the same cross-LOD interpolation; the old complete surface fades out until the new surface is committed. One such seam mesh replaces potentially scores of draw calls.
4. **Terrain staging:** Sample the heights of each leaf when its batched geometry is built, rather than sampling *every* new tile synchronously on the navigation frame. At driving speed, pump only 3–5 new tiles each frame (6–10 when walking). The first surface still builds before gameplay. This smooths CPU work but does not prove a GPU optimization or guarantee all hitches are gone.
5. **Material pooling and driving-dependent repairs:** All tiles in one LOD generation share one terrain shader/material instance, with deduplicated disposal after the generation fades; all instanced tree crowns share one material. Road ribbons and reference drapes are not synchronously reconstructed in a high-speed driving LOD-commit frame: the existing draped geometry stays visible until speed drops below the safe threshold. Detailed walls/roofs are suppressed during high-speed driving in favor of existing instanced skyline, then rebuilt when slowed. Foliage instance-buffer refresh is throttled from 250 ms to 650 ms while driving; tile/building input positions and collision footprints remain.
6. **Camera / screenshot:** Reuse the camera target Vector3 every frame. Remove \`preserveDrawingBuffer: true\` to avoid retaining the whole WebGL buffer; the existing Photo function explicitly renders to the canvas immediately before \`toDataURL()\`. Its correctness remains a browser acceptance requirement.
7. **Measurable telemetry:** Keep the existing \`river-valley-device-benchmark/v1\` JSON fields and append *optional* \`diagnostics\`: timestamped slow-frame samples (>=33 ms), game location, named scene, quality and mode, terrain tile/queue count, percentile cohorts and terrain request/commit event markers with CPU-duration estimates. Those are CPU/browser correlations and not proof of the source of a stall.

## Character inspection and transition proof

The **current 27-bone GLB** now has an authored nonzero *Idle* breathing track, so an AnimationMixer can crossfade to idle after fishing, cooking, running and driving instead of retaining a previous active clip. The Character Studio has a **Right-hand finger grip** view and a **Boots and foot contact** view. The regular browser visual QA records right-hand pose screenshots during fishing/cooking/tracking and boot screenshots during sprinting at desktop and phone viewport sizes. These are actual locally embedded GLB screenshots, not depictions of the historic uploaded 17-joint archive.

`tests/test-rig-transition.cjs` checks that **all 10 finger joints actually have skinned vertices**, verifies finite poses through rapid state changes/direction reversals, and checks stationary stance anchors do not slide during one continuous planted phase. The studio boot close-up tests appearance; the world-coordinate foot-lock test checks kinematic continuity; neither proves physically constrained full-body motion capture.

The model generator runs in both **prebuild** and pretest so `river_explorer_rigged.glb`, `river_explorer_manifest.json`, and `hero-model.js` are produced before HTML packaging, not after.

### First passing controlled headless regression

PR head `1ef4cd810fc72419dd7585af2238bd12a1aaa111`, CI run [45032673758](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/actions/runs/45032673758), completed with **all steps passing** and 24 condition captures on Chromium SwiftShader, each with 18 measured frames. Observed maximum **458 draw calls** among those software-rendered samples; downtown Full walking peaked at 334, farmland Full walking 226, woods Full walking 306, and riverbank Full walking 321. These values are **not directly comparable** to the separate physical iPhone peak of 677 and do not establish real hardware improvement. Further code changes after that head require their own independent CI verification.

## Reproducible conditions

\`tests/browser_perf_matrix.py\` runs **24** automated conditions without changing the engine:

- Scenes: downtown/courthouse, farmland/farm, woods/oak grove, riverbank/riverfront
- Quality presets: Full (\`visualEffects=full\`, \`terrainDetail=high\`), Balanced (\`full\`/\`medium\`), Performance (\`lite\`/\`low\`)
- Modes: walking and driving, holding forward input, same viewport and deterministic start point

To reproduce on a development machine with Playwright Chromium (software GPU unless configured otherwise):

\`\`\`bash
python -m pip install -r game/requirements.txt
python -m pip install "playwright>=1.50,<2"
python -m playwright install chromium
npm --prefix game run build
python game/tests/browser_perf_matrix.py --frames 90 --output /tmp/river-valley-performance-matrix.json
\`\`\`

*Do not interpret those Chromium FPS values as iPhone performance.* The CI smoke run, if enabled, may use a smaller number of frames; it tests the harness and load counts, not statistically sufficient FPS stability.

For real iPhone Safari comparison, record a new benchmark for each scene/profile/mode with **the same device, viewport, DPR, weather, date-period/power condition, and 60+ seconds of movement**. Export the updated \`Export iPhone FPS\` report from game Settings after each condition. For every condition, compare **P95 and P99 frame time**, peak draw calls, load/LOD markers, and screenshot integrity. If FPS or shaders behave differently between runs, retain all unmodified reports.

## Open-source references actually used

- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) — repeated mesh batching and instance colors.
- [Three.js Optimize Lots of Objects](https://threejs.org/manual/pages/optimize-lots-of-objects.html) — merge geometry and reduce scene graph cost.
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer) — \`renderer.info\`, \`compileAsync\`, and render target buffer behavior; no renderer replacement.
- [glTF-Transform](https://github.com/donmccurdy/glTF-Transform) — mesh topology/prune/weld research reference; **not** installed as an extra game runtime dependency. The existing standard-library rig builder performs the bounded fix instead.
- [Environment-aware Motion Matching, arXiv:2510.22632](https://www.alphaxiv.org/abs/2510.22632) — research reminder to keep avatar motion, collision, foot placement and gait transitions coherent, not a shipped motion-matching implementation.

No new commercial/licensed assets, remote telemetry endpoints, SaaS accounts, game renderer, or production physics engine were added.

Additional screened projects: [terrain and visual project research inventory](OPEN_SOURCE_TERRAIN_VISUAL_RESEARCH_2026-11-22.md).

## Verification and release boundaries

Before calling v1.10.1 released, require successful \`npm --prefix game run build\`, all Node tests (including the exact GLB triangle-area test), official asset provenance checks, actual Chromium headless browser acceptance, offline network-disabled replay, and successful post-merge **main** CI, generated-asset synchronization and GitHub Pages deploy. Verify that \`main\` carries the *new* rig binary and receipt, not merely a generator change.

**Explicitly unresolved:** Actual before/after FPS on physical iPhone hardware, true GPU timer measurements, visual inspection of every grip/foot phase at gameplay speed and physically exact vehicle dynamics. Static and software-WebGL tests cannot establish these.
