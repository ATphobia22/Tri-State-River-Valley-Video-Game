# River Valley — Cinematic VFX Supervisor Blueprint v1.5

**Scope:** a separate, family-friendly fictional Mount Vernon / Ohio–Wabash River Valley browser game. **Not** the Tri-State Systems Manager, a surveyed GIS product, navigation data, or an authorized reproduction of actual architecture.

## 1. Visual direction and shot bible

| Shot | Location | Lighting | Atmospheric layers | Foreground motivation | Performance adaptation |
| --- | --- | --- | --- | --- | --- |
| RIVER-01 | Ohio Riverfront | 18:24 golden sun | horizon glow, boat/water highlights, distant haze | pier, boat, riverside lamps | static original gradient sky and 2D particles in fallback |
| VALLEY-02 | Valley Farm | 14:30 soft summer daylight | warm haze, airborne motes, vegetation | barn, grain silo, crop rows | decimate particles first, not gameplay geometry |
| GROVE-03 | Oak Grove Woods | 22:00 amber/firefly blue-black | small luminous motes, shadow silhouettes | deer and woodland edges | points budget 16/55/110 by VFX quality |
| STORM-04 | Riverfront | 16:24 clouded sky | stylized rain, lowered saturation, dense horizon fog | city silhouettes and rippling river | avoid raymarching on battery devices |

All four keyframes are produced directly by `src/storyscape.js` and are embedded in the browser package. `docs/VFX_LOOKDEV_STORYBOARD.png` is the acceptance reference. The 24.6-second release preview starts with recorded 2D hunting/fishing/cooking gameplay, then displays these generated virtual backgrounds. Neither the preview nor the storyboard is presented as a captured hardware 3D frame.

## 2. Scene construction and technical ownership

```text
source data (local fictionalized terrain/roads/buildings)
    |
    +-- src/quadtree.js ------> adaptive terrain mesh & seam skirts
    +-- src/geometry.js -----> roads, aligned building bases
    +-- data/models.js ------> five original embedded GLB landmarks
    +-- src/atmosphere.js ---> 3D gradient sky/clouds, flowers, glints
    +-- src/director.js -----> VFX lighting looks, 2D/weather particle compositor
    |                           and optional 3D fireflies/reed instances
    +-- src/storyscape.js ---> independent illustrated virtual backdrop scenes
    +-- src/game.js ---------> input, state, gameplay, UI, camera and VFX parameters
    |
    +-- web canvas / mobile touch / local save / self-contained offline HTML
```

There is **no gameplay backend and no remote rendering API**. Base44 only hosts the static website and game HTML; inventory and saves stay in browser storage. No login, live telemetry upload or geospatial API is needed at runtime.

### One frame of rendering
1. Input handling updates gameplay and camera state.
2. The same `height(x,z)` path supplies the selected terrain, draped roads, structures, foliage, and player altitude.
3. WebGL scene is updated when present; 2D atlas remains available otherwise.
4. The VFX director samples the current weather, time, season and quality profile, and draws transparent film overlays at a capped cadence.
5. The 2D storyscape is drawn only when the studio panel is open, so it does not consume rendering time during normal exploration.
6. The Director reports measured browser animation cadence and WebGL `renderer.info.render` draw calls/triangle counts, but **these metrics are not GPU timings**.

## 3. Technical VFX budgets and effects

| Profile | 2D effects/frame | Pixel ratio ceiling | Overlay FPS cap | Purpose |
| --- | ---: | ---: | ---: | --- |
| Battery Saver | 16 | 1.0 | 22 | low-end/mobile |
| Balanced | 55 | 1.25 | 30 | default |
| Showcase | 110 | 1.5 | 45 | desktop/fast devices |

- Three.js atmosphere: programmable gradient sky, day/night star noise, 17 drifting cloud groups, flowers, animated river highlights.
- Added: one 180-particle 3D firefly/pollen pool and 500 riverside instanced reeds; object matrices and buffers are bounded.
- 2D effects: radial sun haze, drifting dust/fireflies, rain streaks, low fog bands, optional sparse film grain, screenshot-safe graphic grade.
- Virtual backgrounds: original Canvas shapes and animation for riverfront / farm / woods. Their looks are independent of Three.js support.
- Optional WebGL renderer remains behind a detected context; no unvalidated volumetric clouds, temporal anti-aliasing, or expensive full-screen bloom added.
- Accessibility: effects pane can be closed on small viewports; reduced-motion media query decreases atmospheric overlay visibility. Dynamic effects and grain are optional; scene descriptions are visible in plain text.

## 4. Production pipeline and acceptance criteria

**Art approval:** scene silhouette → palette → foreground/background depth → atmosphere → animated motion → device-performance acceptance → gameplay integration.

**Checked in this release:** pure-core gameplay and VFX settings unit tests, smoke of every cinematic look and backdrop via desktop/mobile Chromium, simulated-3D scene construction, object counts, build correctness, original GLB hashes, local-cache simulation, and served HTTPS page reachability after deployment.

**Not independently verified:** physically accurate survey alignment or vertical datum, device-native WebGL rendering, iOS Safari airplane-mode operation, 60-FPS render-budget guarantee, real GPU frame statistics, real hardware iPhone screenshot save, fully native Unity/Windows game output.

## 5. Useful open references and license rules

All code in `src/director.js` and `src/storyscape.js` is original implementation. **No third-party model has been imported.** References only:

- https://threejs.org/docs/pages/InstancedMesh.html — instancing and dirty matrix/color buffer handling.
- https://threejs.org/examples/ — current fog/sky/shadow/particle techniques.
- https://github.com/pratik-gis/terrain3d-viewer — geographic terrain LOD and projected error.
- https://github.com/tschie/terrain-cdlod — terrain quadtree concepts.
- https://github.com/whidrubeld/three-map-terrain — terrain/road/building composition.
- https://github.com/TMHSDigital/GH-Arcade — standalone browser minigame structuring.
- https://github.com/petroulacl/fps-buildings-env-kit — candidate CC0 environment library; no assets admitted to this release.
- https://threejsresources.com/guides/sky-and-clouds — inexpensive sky, fog and cloud techniques.
- S. Singh and S. Kumar (2025), arXiv:2502.08107, *Machine Learning-Driven Volumetric Cloud Rendering*. The method is Unreal-oriented and reported average 35ms/frame; not adopted for this WebGL game.
- R. Olajos et al. (2026), *Environmental Volumetric Neural Shading of Clouds for Real-Time Rendering*. Requires asset training and GPU evaluation; research only.

For any future third-party 3D/PBR/HDRI pack, record the exact file hash, direct URL, upstream license, author, download date, poly count, textures, and test results. `CC0` from a catalog is a research lead, not independent verification of a specific downloaded file.

## 6. Next native-engine gates

- An actual Unity Editor project requires the appropriate Unity LTS installation, scene/prefab import, materials, shaders, terrain scaling checks and native build targets. `unity-starter/` is **not** a complete or compiled Unity game.
- Once GPU access is available, capture a fixed-camera color/depth/object-ID baseline for terrain seams, shoreline reeds, 3D model placements and aerial masks. Compare this candidate to the previous build, including GPU timings and overdraw budgets.
- Validate Windows and iOS offline installs on physical devices with network disabled; do not infer success from JavaScript tests alone.
