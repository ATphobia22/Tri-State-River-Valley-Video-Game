# River Valley Family Adventure v1.7 — Open-world build and validation

**Scope:** this is a standalone family game housed in `ATphobia22/Tri-State-River-Valley-Video-Game` at the user's explicit request. It is not Tri-State Systems Manager, engineering data infrastructure, or a regulated simulation.

## Implemented

- Single offline HTML and a static hosted game with an installable PWA cache.
- Quadtree terrain and shared ground sampling for roads, building placement, animal/field and player positions; original five GLB landmark models.
- Real 3D environment using packaged Three.js and a camera-relative walk/drive controller.
- Four game-world activity locations: wildlife clearing (animated deer + aim ring); fishing pier (bobber and bite timing); crop plots (9 persistent farm beds); campfire kitchen (ingredient-based cooking).
- Activities reuse the same `src/core.js` inventory, coins, XP, and recipe rules. In 3D mode, they do not open the legacy modal minigame UI; 2D fallback retains accessible panels.
- 2D scenic studio, five curated lighting looks, postcard and shot-board capture, rain/mist/time/season controls, local game saves (3 slots).

## Test evidence — November 21, 2026

- `node --test tests/test-*.cjs`: **41 tests passed** including PWA relative paths, gameplay, LOD, geometry and asset validation (re-run after changes).
- `xvfb-run -a python tests/inworld_real_webgl_e2e.py`: **13 checks passed** with no page errors. Chromium rendered with Mesa software OpenGL, not a simulated Three.js renderer. The checks cover scene initialization, all four sites, harvesting, hunting, catching, cooking, driving and save rehydration with test localStorage.
- Screenshot `docs/v17-inworld-browser-verified.png` is a real Chromium software-OpenGL frame. No claim is made about a dedicated consumer GPU.
- Hosted `game-sw.js` now uses a relative base path so deployments under a repository subdirectory can cache the correct HTML and manifest.

## Known limitations / open release gates

- Terrain and building geo inputs are partly synthetic/derived and the vertical datum is unverified; not a surveyed Mount Vernon replica.
- No physical collision/navmesh validation, high-resolution textures, realistic animal IK, or accurate river physics.
- Mesa software GL is slow and does not establish consumer GPU frame-rate or visual quality.
- This test harness blocks HTTP(S) navigation, so save-reload is exercised with a localStorage test shim; real HTTPS and offline installation require independent browser/device QA.
- No native Windows EXE or iPhone IPA, no full Unity project build, no verified iPhone airplane-mode test.
- Repo GitHub Pages must be enabled by the repository owner if desired; Base44 hosting is separate.

## Runtime instructions

- From the repository, open `game/index.html` through a static server or the generated one-file `game/River_Valley_Family_Adventure_OFFLINE.html` in Chrome/Edge. Launch from GitHub Pages when enabled for PWA install on iPhone.
- Start Exploring → Hunt / Fish / Farm / Cook buttons quick-travel to physical locations. E acts, WASD moves, mouse drag orbits, Shift sprints, M map, Esc close, and Drive changes movement speed.
- In Windows, `Open_River_Valley_Windows.cmd` opens the game using the local machine's default browser; it is not a native Windows game.
