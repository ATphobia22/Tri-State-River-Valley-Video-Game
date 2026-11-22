# v1.10.0 — Explore Posey County, New Adventures and Scout

The offline game now includes a **source-backed Posey County atlas** using the official Indiana GIO boundary and five U.S. Census town reference centers. Four distinct, intentionally **illustrative** regional 3D destinations can be visited, with local save tracking. Scout now follows, sits, fetches, earns limited bond rewards and gives non-graphic hunting clues. Gameplay adds three modeled wildlife species, moving hunting targets, touch-friendlier fishing, expanded farms and recipes, painted steel/board siding, asphalt and grass materials, and instanced wildflowers. [Read the exact geographical scope, data provenance and release gates](docs/POSEY_COUNTY_EXPANSION_v1.10.md). The existing detailed 3D runtime is still the local Mount Vernon stage, not all of Posey County at surveyed 1:1 resolution.

# v1.9.7 — Footprint collision and suspension

The playable world now checks the avatar's horizontal capsule disc against concave building polygon footprints, preserves step/grade traversal, and samples four wheels for damped vehicle pitch and roll. See [physics boundaries and iPhone acceptance](docs/PHYSICS_CHARACTER_HARDWARE_v1.9.7.md). It remains a deterministic offline 2.5D collision/visual vehicle system, not a certified full rigid-body engine.

# v1.9.6 — World collision, better character rig, painted roofs, field stones, biome sound and FPS exports

Added hashed building collision and slope checks, 27-joint finger-aware River rig with 13 authored animation clips, local roof shingle materials, two instanced terrain-detail layers, procedurally generated biomes/footsteps, and a user-exportable per-device performance report. All systems reuse the existing offline Three.js game; no third-party assets are silently installed. Physical iPhone validation and precise mesh/vehicle physics are still outstanding. [Full evidence and limitations](docs/WORLD_REFINEMENT_v1.9.6.md).

# v1.9.5 — Natural movement, physical jump and terrain-aware camera

The existing offline 3D game now uses a frame-rate-independent movement controller with acceleration, braking and smooth turns; the J key and mobile JUMP lift River above the terrain; the rig refines cadence and tool grips; a procedural contact shadow anchors the hero and vehicle; and the follow camera gains sampled terrain clearance. No additional renderer, external runtime service, or licensed assets were added. Browser and gameplay tests enforce the behavior. [Design, research and verification notes](docs/GAMEPLAY_FEEL_v1.9.5.md).

# v1.9.4 — Contact-aware boot planting, fabric detail and glasses

River now has a short-duration world-space foot stance latch with slope-sampled ankle pitch, local procedural ripstop/weave materials over new GLB UV0 coordinates, transparent glasses lenses and additional skull gaiter details. Changes are deterministic and offline; the original v1.9.3 skin and fallback remain. Full provenance and acceptance boundaries: [v1.9.4 art pass](docs/HERO_ART_PASS_v1.9.4.md).

# v1.9.3 — Original skinned River Explorer GLB

The game now builds an offline glTF 2.0 River Explorer with **17 deforming joints**, nine named animation clips, metallic/roughness outfit materials, and bone-parented fishing, tracking and cooking gear. The game and Character Studio prefer real Three.js skinned meshes while preserving the previous procedural fallback. Walking and running use a terrain-sampled two-bone knee/ankle solver; no paid rigging or remote downloads are needed. The GLB and base64 offline payload are deterministic build artifacts. See [full rigging documentation](docs/HERO_RIGGED_v1.9.3.md).

# v1.9.2 — Corrected Character Studio and verified WebGL launch

The inspector now renders the same articulated hero inside a separate, well-lit 3D preview scene instead of allowing terrain to cover the camera. Its buttons are parsed before the game script starts; both a source regression and automated desktop/mobile Chromium WebGL tests protect that fix. On phones the preview leaves the hero visible above its compact controls. See docs/HERO_STUDIO_v1.9.2_RELEASE.md.

# v1.9.1 Character Studio

Open Options -> Inspect the Explorer in 3D mode. Choose idle, walk/run/sprint, jump/land, picking up, farming, fishing, wildlife tracking, cooking or driving. Take a character photo and close to resume the same game camera. No gameplay data or save slots are changed. See docs/HERO_STUDIO_v1.9.1.md.

# River Valley v1.9.0 — original articulated hero

The player now has a detailed procedural character built from the supplied hero reference sheets, with curls, glasses, skull gaiter, gold chain, black outdoor outfit, cargo pants, boots and backpack. The previous cylinder/hat avatar is replaced by pose-driven scene-graph geometry; a seated copy rides in the vehicle. Animations include walking, sprinting, cosmetic jump, fishing, wildlife tracking, farming and campfire cooking.

See docs/HERO_CHARACTER_v1.9.0.md for implementation, art provenance, limitations and test evidence. This is the separate family game, not the engineering digital twin.

# River Valley Family Adventure — v1.9.0 hero and animations

The original browser game now has an articulated playable hero matching the supplied animation reference: curls, glasses, skull-pattern gaiter, gold-colored chain, backpack, black outdoor outfit, cargo pants and hiking boots. Distinct procedural poses animate idle, walk/run/sprint, jump/land, interact/farm, fishing, non-graphic wildlife tracking, campfire cooking and driving. The character and vehicle driver are entirely local Three.js meshes. The art-sheet pictures are references, not a pre-rigged character model. See game/docs/HERO_CHARACTER_v1.9.0.md.

# River Valley Family Adventure v1.8.2 — handcrafted River Valley graphics

The separate family game now includes **original local procedural PBR masonry**, styled brick/clapboard/limestone near-player building walls and darkened glass; **cell-streamed, seasonal InstancedMesh foliage** in town, oak-grove, countryside, and Ohio River bank zones; and **frame-budgeted quadtree terrain transitions** that keep the entire previous terrain visible until the next terrain is ready, then fade it out.

The **Performance** visual effects mode now limits active tree instances. These are fictional art-directed districts and procedural props; the game's source GPS/datum limitations remain unchanged. No textures, images, or map requests are downloaded while playing.

See [v1.8.2 graphics release notes](docs/GRAPHICS_RELEASE_v1.8.2.md) and [studio architecture reference adaptation](docs/STUDIO_REFERENCE_ADAPTATION.md).

# River Valley Family Adventure v1.8.1 — performance-guided studio integration

This browser-game revision uses the supplied private AAA studio documents as **technical guides**, without importing proprietary source files or Unreal Engine services. It introduces a test-driven terrain frame-budget governor with safe cooldowns, driving look-ahead, and a headless game-asset dependency gate. See [Studio reference adaptation](docs/STUDIO_REFERENCE_ADAPTATION.md).

**Creative priority:** an attractive, responsive fictional Ohio–Wabash River Valley game. Geographic data is optional reference material; geographic survey verification is not a release prerequisite.

# River Valley Family Adventure — game source and creative pipeline

**Priority:** a visually appealing, responsive, playable family adventure. Road placement, river shape, terrain, and architectural details are **art-directed**, not constrained by real-world survey verification. The government overhead data is a useful optional guide, not a prerequisite for release.

**GitHub Pages game:** https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/ (requires first-time repository Pages activation: Settings → Pages → Source: GitHub Actions). See the [deployment builder](tools/build_pages.py), [tests](tests/test_pages_build.py), [visual priorities](docs/GAME_ART_AND_RUNTIME_PRIORITIES.md), and [repository README](../README.md).

**Offline download:** `River_Valley_Family_Adventure_OFFLINE.html`. The generated GitHub Pages site serves the fully bundled game as both `index.html` and `game.html`; its PWA icons and caching are relative to any site subpath. There is no backend or login.

## Original v1.8 reference-layer release notes

New v1.8 horizontal map reference: after the official IGIO download step, the 3D scene and 2D overview use authoritative overhead imagery, digitized street centerlines, and building footprints via a shared WGS84-to-game registration. The overhead imagery identifies as **2023 in central Mount Vernon**; official 2025 leaf-on imagery is a distinct source and is not assumed to be the default raster. The *roof heights*, game DEM, and stops remain illustrative. See [`docs/MOUNT_VERNON_GEOREFERENCE_V1_8.md`](docs/MOUNT_VERNON_GEOREFERENCE_V1_8.md) and [`reference/mount-vernon/registration.json`](reference/mount-vernon/registration.json) after data acquisition. Settings → official overhead reference toggles the art reference without changing local save data.

## Live official-data build

`python tools/acquire_mount_vernon_reference.py --out reference/mount-vernon` downloads full IGIO road/building GeoJSON, orthophoto and a vector-overlaid `digitized-overview.png`. **No download is assumed complete until the source counts, checksums, returned aerial bounds and game packaging tests pass.** Then run `npm run build && npm test` (and Python tests).

# v1.7 original open-world gameplay notes

**Canonical game repository: [ATphobia22/Tri-State-River-Valley-Video-Game](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game). Independent of TSM and its engineering repositories.**

New in v1.7: terrain-anchored 3D hunting trail with an animated low-poly animal and interactive aim ring; physical riverside fishing pier with moving bobber; nine 3D crop plots driven by persistent growth timers; campfire kitchen with recipes and animated flames; camera-relative walking and vehicle heading; third-person orbit camera; nonmodal in-world activity HUD and quick-travel activity sites (H/F/G/K). The original 2D activities are retained if WebGL is unavailable.

This is a stylized fictional environment based on supplied partial terrain data; do not use the geometry for navigation or surveying. Hunting is fictional, bloodless gameplay, not real hunting advice.

### Play

Open `index.html` in a supported desktop browser or the generated `River_Valley_Family_Adventure_OFFLINE.html`. Online version uses `game.html` and the HTTPS offline cache. Start Exploring, then click Hunt / Fish / Farm / Cook to arrive at each corresponding physical site. While there, press E or use the activity controls. WASD moves relative to the camera, drag to orbit, scroll to zoom, M toggles map, Esc exits. All inventory and farm/cottage progress are held in local browser saves. For mobile use the on-screen direction pad and actions.

### Validation

See docs/OPEN_WORLD_V1_7_RELEASE.md. The browser WebGL hardware/render quality and iOS airplane-mode tests remain independent gates.

# River Valley — A Family Adventure v1.5

A **standalone family-game project** hosted in its dedicated GitHub repository; entirely separate from Tri-State Systems Manager and the engineering GitHub repositories. The GitHub source repository is public; game saves remain private to each browser. A stylized Mount Vernon, Indiana / Ohio–Wabash regional preview, **not a surveyed or historically faithful replica**.

## Play
- **Online (GitHub Pages):** https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/ once Pages is enabled (previous Base44 mirror: https://river-valley-family-adventure-3e955781.base44.app/game)
- **Windows offline:** double-click `Open_River_Valley_Windows.cmd` after extracting this ZIP, or open `River_Valley_Family_Adventure_OFFLINE.html` in Chrome or Edge.
- **iPhone:** use the HTTPS game page in Safari, confirm offline game cached, then Share > Add to Home Screen. Direct iOS Files Quick Look is not a game browser.

## Gameplay
- Walking, driving, photography, guided scenic tour, six discovery stops, and a home building reward.
- Nine-plot farm with sowing, watering and harvesting; hunt virtual wildlife, fish and cook three recipes.
- Local-only inventory, XP, coins, saves, three family slots, pet dog, weather, seasons, daylight, graphics settings, and touch/keyboard controls.
- Full browser 3D (where GPU/WebGL is available) and separately validated 2D illustrated fallback.
- Adaptive screen-space quadtree terrain with terrain-edge-conforming boundaries; roads, buildings and props sample the active terrain surface.
- Five **original embedded GLB models**, shader sky with day/night stars, clouds, pollen/wildflowers and river glints.

## Source and architecture
- `src/core.js`: pure, testable game-state transitions and save validation.
- `src/geometry.js` / `src/quadtree.js`: road draping, geometry sampling and LOD tile selection / stitching.
- `src/model-loader.js` + `data/models.js`: offline glTF 2.0 decoder and embedded original models.
- `src/atmosphere.js` / `src/visuals.js`: procedural 3D environment and 2D minigame scenes.
- `src/game.js`: UI and runtime wiring.
- `data/valley-data.js`: packaged prototype geography. No network requests are required for gameplay.
- `build_models.py`, `build_offline.py`, `build_hosted.py`: repeatable headless packaging.
- `game.html`, `game-sw.js`, `game.webmanifest`: HTTPS-hosted installable offline app assets.
- `unity-starter/`: early data-import starter **not** a compiled Unity project.
- `assets/models`: standalone glTF 2.0 asset files, SHA-256 manifest.
- `tests`: Node game/terrain/GLB/offline-worker tests plus Playwright UI, gameplay and scene-graph tests.

**Architecture:** the entire game state is authoritative inside the browser. There is deliberately **no cloud gameplay backend**, logins, socket server or cross-device save synchronization. Hosting simply serves a static page. The service worker caches the offline page. Saves are in device-local browser storage.

## Rebuild and test
```
node --test tests/test-core.cjs tests/test-geometry.cjs tests/test-quadtree.cjs tests/test-models.cjs tests/test-sw.cjs
python build_offline.py
python build_hosted.py
python tests/mock3d_smoke.py
python tests/ui_v12_smoke.py
python tests/activities_smoke.py
```
See `docs/GRAPHICS_ENGINE_V1_4.md` and `docs/OFFLINE_INSTALL_AND_QA.md` for what is and is not verified.

## Important limits
- Chromium with Mesa software OpenGL rendered the 3D game; automated in-world interactions were verified. Dedicated hardware GPU performance and device-dependent rendering remain unverified.
- Headless Chromium blocks direct local file:// and localhost navigation here; actual iOS PWA airplane-mode and Windows file launch remain **unverified on real devices**.
- No native Windows executable, iOS IPA, full Unity game or geodetically authoritative Mount Vernon replica.
- 200x200 original DEM includes infill and unverified datum, and building / road geography is derived. The LOD and world registration are game-level, not formal survey geometry.

## v1.5 cinematic and interactive look-development upgrade

Cinematic Director is available through **Options → Open Cinematic Director**, or `C` on keyboard. It offers five lighting presets, device-budgeted effects, film grain and live FPS/draw-call stats. Use **Open scenic backdrop studio** to view three original animated virtual scene paintings and save a postcard to PNG. These scenes work on the 2D fallback and require no internet, models or WebGL. Additional 3D firefly motes and riverside reeds are integrated into the optional WebGL scene.

`docs/VFX_SUPERVISOR_BLUEPRINT.md` describes the shot bible, effect budgets and verification boundaries; `docs/VFX_LOOKDEV_STORYBOARD.png` contains four original concept-frame exports. `docs/River_Valley_v1_5_Gameplay_and_Cinematic_Looks.mp4` combines earlier real captured 2D minigame footage with four original procedural backdrop frames; it is not GPU-native cinematic footage.


## Version 1.6 · Directed cinematic shot sequence

The Scenic Backdrop Studio now includes five scripted camera-look cards, previous/next controls, a continuously looping guided 21-second look-development tour, pause/resume, individual scene postcard capture, and a contact-sheet PNG export. All scenes are original procedural 2D illustrations, not WebGL renders or geographic photorealistic reconstructions. Open **Options → Cinematic Director → Open scenic backdrop studio**.
