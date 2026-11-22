# River Valley — A Family Adventure

**A free, offline-first, family-friendly 3D exploration game** set in a stylized Ohio–Wabash River Valley inspired by Mount Vernon and Posey County, Indiana. Explore on foot or by car, fish, track wildlife, grow crops, cook by the campfire, discover regional destinations, and adventure with Scout the dog. Game progress lives in **three local browser save slots**; no sign-in or gameplay server is required.

**Current playable release: v1.11.0** · Three.js / WebGL · Browser and downloadable offline HTML · Windows and iPhone browser controls

[**Play on GitHub Pages**](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/) · [Direct game page](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/game.html) · [Download single-file offline game](game/River_Valley_Family_Adventure_OFFLINE.html) · [Game technical guide](game/README.md)

> **Project boundary:** This is the **standalone video game**, not Tri-State Systems Manager's scientific, municipal, or flood-engineering digital twin. The terrain and additional town scenes are artistic game environments, not certified spatial or hydraulic models.

## What you can play

- **Explore:** Navigate the Mount Vernon-area 3D scene, follow six discovery stops, drive, take photographs, build a family cottage, and change weather, season and time of day. A 2D illustrated gameplay fallback is provided when WebGL is unavailable.
- **Posey County Atlas:** Open an offline map with the official Indiana GIO county outline and U.S. Census reference points for **Mount Vernon, New Harmony, Griffin, Poseyville and Cynthiana**. Visit four original heritage, woodland, farm-market and grove destination scenes; newly discovered regions are recorded in local saves.
- **Scout the dog:** Scout follows over terrain, sits, comes when called, fetches, wags his tail, earns cooldown-limited bonding rewards, and provides directional wildlife-tracking hints.
- **Activities:** Fish at an animated riverbank, track deer/turkey/rabbit in non-graphic hunting challenges, plant/water/harvest nine corn plots, and prepare **six recipes** using collected ingredients. The farm includes a barn, silo, crop rows, pump and scarecrow.
- **Character and world:** River Explorer uses a **27-joint original skinned glTF model** with 13 authored animation clips, finger-level grips, foot-contact correction and a Character Studio. Scene detail includes local procedural roof/facade/terrain materials, riverside reeds, stones, flowers and cinematic lighting.
- **Gameplay feel and diagnostics:** Smooth camera-relative movement, grounded jump, polygon-footprint collision, terrain-aware follow camera, and four-point visual vehicle suspension. In Settings, **Export iPhone FPS** creates a local frame-time report for testing an actual device.

### Controls

| Action | Keyboard / mouse | Touch / interface |
| --- | --- | --- |
| Move / camera | **WASD** or arrow keys; drag to orbit; mouse wheel to zoom | Movement pad and touch camera |
| Sprint / jump | **Shift** / **J** | Sprint control / **JUMP** |
| Interact | **E** or **Space** | **ACTION** |
| Hunt / fish / farm / cook | **H / F / G / K** | Corresponding activity buttons |
| Posey County Atlas / Scout | **N / B** | **Posey County / Scout** |
| Local map / cinematic director | **M / C** | Map / Cinematic controls |
| Character Studio / photo | **V / P** | Settings → Inspect Explorer / Photo |
| Close a panel | **Esc** | Close button |
| Walk / drive / save | Mode and save controls | Walk / Drive / Save |

## Play offline

**Windows / desktop:** Open the downloadable [`River_Valley_Family_Adventure_OFFLINE.html`](game/River_Valley_Family_Adventure_OFFLINE.html) in a supported browser such as Chrome or Edge. It is a self-contained browser game, **not** a native Windows executable.

**iPhone / iPad:** Open the [HTTPS game](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/) in Safari while online, load it successfully once, then use Safari's Share → **Add to Home Screen** if you want an app-like shortcut. The versioned service worker caches the playable HTML for later offline use where supported; browser storage and private browsing policies can affect offline availability and saves. It is **not** a native iOS IPA.

**Local progress:** Choose one of three save slots and use **Save** or **Resume**. Clearing the browser's site storage may remove local saves. Saves are not synchronized across devices.

**Automated offline proof:** In Chromium CI, the hosted game and the Pages-root build are loaded online, the network is disabled, and the game reloads with previously saved New Harmony exploration and Scout bonding intact. Physical-device iOS airplane-mode testing is a separate validation requirement.

## Geographic truth versus game art

The county navigator embeds the **official Posey County boundary (FIPS 18129, EPSG:4326)** and Census town reference centers. The original county polygon had **1,933 vertices**, simplified to **584** for display. The surrounding detailed 3D runtime remains a local Mount Vernon-area stage. The four additional towns are **interpretive regional 3D destinations within that stage**, *not* continuously streamed, survey-accurate countywide terrain, roads or buildings.

The optional Mount Vernon visual-reference snapshot contains **709 Indiana GIO road features**, **4,819 building footprints** and a central downtown aerial tile identified as **2023**. Elevation, building heights, stopping locations and regional vignettes are art-directed and not approved for navigation, property decisions, flood studies or engineering use.

[Posey County source and accuracy notes](game/docs/POSEY_COUNTY_EXPANSION_v1.10.md) · [Mount Vernon reference provenance](game/docs/MOUNT_VERNON_GEOREFERENCE_V1_8.md)

## Build, test and deploy

Requirements: **Node.js 22+** and **Python 3.12+** (CI versions). Install game Python dependencies first:

```bash
git clone https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game.git
cd Tri-State-River-Valley-Video-Game
python -m pip install -r game/requirements.txt
npm --prefix game run build
npm --prefix game test
python game/tools/audit_runtime_graph.py
python -m unittest discover -s game/tests -p test_reference_python.py -v
python -m unittest discover -s game/tests -p test_runtime_graph.py -v
python -m unittest discover -s game/tests -p test_pages_build.py -v
python game/tools/build_pages.py --output _site
```

For full browser acceptance, additionally install **Playwright Chromium** and run:

```bash
python -m pip install "playwright>=1.50,<2"
python -m playwright install chromium
python game/tests/browser_hero_smoke.py
python game/tests/offline_pwa_smoke.py --site-dir game --entry game.html
python game/tests/offline_pwa_smoke.py --site-dir _site --entry index.html
```

The build produces **`game/River_Valley_Family_Adventure_OFFLINE.html`**, **`game/game.html`** and an optional deployable **`_site/`** with scoped service worker and local PWA icons. These commands do not require a remote gameplay server. GitHub Actions builds and validates the release before deployment.

| Continuous verification | Workflow |
| --- | --- |
| Node, source provenance, runtime graph, desktop/mobile viewport WebGL and offline replay | [Game CI](.github/workflows/game-ci.yml) |
| Generated offline/hosted release synchronization | [Release sync](.github/workflows/commit-browser-build.yml) |
| Pages packaging, Chromium, network-disabled replay and deployment | [GitHub Pages](.github/workflows/deploy-pages.yml) |

The v1.10.0 gameplay release and the later **offline-replay gate hardening (PR #11)** were independently verified on `main` with successful CI, asset synchronization and Pages deployment on **November 22, 2026**. The local-browser test proves the tested Chromium build, **not** real iPhone or Windows hardware performance.

## Project layout

| Location | Responsibility |
| --- | --- |
| [`game/src/`](game/src/) | Gameplay runtime, motion/collision, Scout, audio, county atlas and 3D scene |
| [`game/data/`](game/data/) | Bundled map references and original game data |
| [`game/assets/models/`](game/assets/models/) | Original GLB meshes, River Explorer rig and manifests |
| [`game/reference/mount-vernon/`](game/reference/mount-vernon/) | GIS-inspired art-reference snapshot and checksums |
| [`game/tests/`](game/tests/) | Game logic, geometry, offline build and browser acceptance tests |
| [`game/tools/`](game/tools/) | Deterministic asset construction, packaging and audits |
| [`game/docs/`](game/docs/) | Release notes, source provenance, graphics research and verification |

## River Explorer playable model rebuild — v1.11.0

The **existing 27-joint, 13-clip skinned GLB** is re-sculpted with organic round-toe boots, an oval shaped gear pack, curved translucent glasses, smaller more natural eyes, finer short curls, subtler printed gaiter and eight original PNG microtextures **embedded directly in the GLB**. Game materials also use local skin/cloth/nylon/leather bump detail. Character Studio provides front, three-quarter, side and rear views, improved neutral lighting, larger mobile framing and hideable controls. This is a substantial stylized 3D rebuild, **not** yet a photoreal recreation of the concept illustrations. [Mesh, texture, rig and visual QA evidence](game/docs/RIVER_MODEL_REBUILD_v1.11.0.md).

## River Explorer reference art pass — v1.10.2

The original **27-joint River Explorer** was refined using three supplied concept sheets. His short sleeves now expose skinned forearms, the skull gaiter print and translucent eyewear are finer, fingerless gloves have individual covered bases and exposed tips, and cargo/boot/pack straps have more readable finishing details. His idle arms rest closer to the body. Character Studio now supports a **Gaiter and glasses close-up** alongside hand grips and boots. All improvements use the original GLB generator and PBR material palette—**not** the old 17-bone upload. [Reference-based implementation and acceptance limits](game/docs/RIVER_ART_REFINEMENT_v1.10.2.md).

## Mobile rendering and performance upgrade — v1.10.1

The existing skinned 27-joint River Explorer now excludes generated zero-area triangles, with deterministic GLB/embedded-data/hash regeneration. Windows are batched per detailed building, and quadtree seam skirts are batched across the active terrain surface. Driving mode uses bounded high-detail building and terrain-tessellation budgets. The exportable frame report now includes event timestamps, positional scene labels, draw calls, P95/P99 cohorts, and slow-frame records. A scripted 24-condition desktop/mobile-friendly software-WebGL matrix is available; it is **not** a substitute for physical iPhone FPS testing. [Implementation, measured baseline and instructions](game/docs/MOBILE_PERFORMANCE_AND_RIG_v1.10.1.md).

## Known limitations and next work

- **World coverage:** County navigation is source-based, but there is **no continuous full-county 3D environment** or countywide elevation/building/road asset streaming.
- **Physics:** Polygon-aware 2.5D collision and four-wheel kinematic suspension are **not** full triangle-mesh/rigid-body vehicle simulation.
- **Characters and sound:** Procedural animation and synthesized ambient audio are shipped; independently licensed recorded performance/audio libraries have not been admitted.
- **Hardware:** Actual iPhone Safari FPS/thermal evidence, real Windows offline-launch acceptance and hardware GPU profiling remain pending. The in-game **Export iPhone FPS** option supports gathering these measurements.

For engineering details, visit the [game guide](game/README.md), [November 22 repository reconciliation audit](game/docs/REPOSITORY_RECONCILIATION_2026-11-22.md) and [open gameplay roadmap](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/issues/6). Unmerged legacy **PTDT EnKF/Bishop Evidence Graph** draft work in [PR #2](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/2) is intentionally separate from the playable game.

**License notice:** The game package currently identifies its project license as `UNLICENSED`. Public visibility is not permission to reuse its code or original assets. Third-party reference tools are not automatically installed or license-admitted.
