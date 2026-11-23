**Verified branch reconciliation**: [28 historical branches examined by file-tree SHA and merge-policy decisions](docs/BRANCH_RECONCILIATION_20261123.md). Optional source-rig staging uses `python tools/stage_character_candidate.py /path/to/candidate.glb` and cannot replace the live playable avatar.

**Blender rig-to-offline PBR pipeline**: [baking, strict GLB validation, direct binary decoding and bone-mounted props](docs/BLENDER_OFFLINE_PBR_RIG_PIPELINE_20261123.md). Actual v2 Blender source meshes and deformed clip-frame tests are still required; the live 27-joint rig is deliberately preserved.

# River Valley — Game Architecture and Release Guide

[**Courthouse mesh and character source gate**](docs/POSEY_COURTHOUSE_AND_CHARACTER_SOURCE_GATE_20261123.md) · [**2025 Posey aerial source audit**](docs/MOUNT_VERNON_2025_LEAFON.md) · [**Play the game**](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/) · [Repository overview](../README.md) · [Offline HTML download](River_Valley_Family_Adventure_OFFLINE.html) · [**Mount Vernon map links**](docs/MOUNT_VERNON_47620_MAP_LINKS.md) · [GitHub Actions](../.github/workflows/game-ci.yml)

**Version 1.13.0** · Online website plus standalone offline download · Original Three.js/WebGL world · Three local save slots · No account or server required.

This `game/` directory contains the **playable family adventure**. It is separate from the Tri-State Systems Manager digital twin. The official geographical references are used to orient the fictional game; game terrain, fictional towns, models, river effects and heights are not survey or regulatory products.

## Current playable systems

| System | Implemented behavior |
| --- | --- |
| Family + Friends | Ten photo-reference collectibles, eight reversible animated wardrobe prototypes with clothing/hat/facial-hair variations; two group sets reference-only, including memorial inscription |
| River Explorer | Skinned 27-joint GLB with ten individually articulated fingers, 13 original animation clips, foot-contact corrections, tool grips, cinematic Character Studio and photo capture |
| Walking and driving | Camera-relative movement, acceleration, jump, collision against extruded building-footprint polygons, terrain-aware follow camera and visually damped four-point vehicle suspension |
| Posey County Atlas | Indiana GIO county outline (FIPS 18129) and Census centers for five towns; selection and local save progression; four **illustrative**, playable regional 3D destinations |
| Scout | Animated terrain-following dog with follow, sit, come, fetch, bonding and directional tracking hints |
| Hunting | Three fictional animal models (deer, turkey and rabbit), bounded moving target and non-graphic tracking interactions |
| Fishing | Riverbank setting, bobber/fish animation, reel timing and inventory rewards |
| Farming | Nine persistent corn plots, planting, watering and harvesting; barn, grain silo, pump, scarecrow and crop-growth visuals |
| Cooking | Campfire kitchen, inventory-consuming ingredients and six recipes with progression rewards |
| World visuals | Season/weather/daylight, terrain LOD, 709-road/4,819-footprint optional Mount Vernon visual reference, locally generated brick/clapboard/stone/steel/board-batten/roof textures, instanced reeds/rocks/flowers and quality-tiered instanced meadow |
| Sound and performance | Offline synthesized footsteps/biome cues, user-gesture audio activation, bounded FPS telemetry and JSON export; resolution adaptation on slow WebGL frames |
| Offline and accessibility | Downloadable single-file offline HTML, no website service worker, gamepad/touch/keyboard-style interfaces where implemented, 2D illustrated fallback, local saves |

**Geographic limit:** The county boundary and settlement points are sourced reference geography, **not** evidence of continuous countywide 3D terrain. New Harmony, Griffin, Poseyville and Cynthiana are thematic *vignettes inside the existing Mount Vernon-area local stage*, not site-accurate town reconstructions. [Data provenance and scope](docs/POSEY_COUNTY_EXPANSION_v1.10.md).

**Source-backed terrain update:** The Mount Vernon world includes an offline USGS 3DEP 256 × 256 DEM snapshot and SHA-256 provenance receipt. If the dataset fails admission, the older illustrative DEM remains available. Indiana GIO aerial imagery (2023 at downtown) is shown by default; 2025 imagery and surveyed landmark meshes are not installed. See [elevation acquisition and accuracy limitations](docs/MOUNT_VERNON_3DEP_WORLD_UPGRADE.md).

## Key directories and responsibilities

| Source | Purpose |
| --- | --- |
| [`src/core.js`](src/core.js) | Validate local saves, recipes, inventory, discovery, farming and rewards |
| [`src/game.js`](src/game.js) | Main Three.js/Canvas runtime, camera, UI and system integration |
| [`src/graphics-quality.js`](src/graphics-quality.js) | GPU-instanced local meadow and deterministic quality-tier budgets |
| [`src/compressed-assets.js`](src/compressed-assets.js) / [`tools/compress_optional_glb.py`](tools/compress_optional_glb.py) | Optional lossless local GLB transport and raw-format fallback; existing character remains embedded |
| [`src/open-world.js`](src/open-world.js) | Fishing, hunting, farming and campfire in-world scenes |
| [`src/companion.js`](src/companion.js) | Scout's locomotion, commands, tracking hints and bonding |
| [`src/county-atlas.js`](src/county-atlas.js) | Offline county outline projection and interactive town map |
| [`src/county-scenes.js`](src/county-scenes.js) | Four original regional game-scene vignettes |
| [`data/posey-county-boundary.js`](data/posey-county-boundary.js) | Source-tagged, simplified Indiana GIO boundary and Census town points |
| [`src/motion-controller.js`](src/motion-controller.js) | Frame-rate-independent movement and jumping |
| [`src/world-collision.js`](src/world-collision.js) | Broadphase and horizontal capsule-disc/footprint collision |
| [`src/vehicle-suspension.js`](src/vehicle-suspension.js) | Four-wheel terrain sampling and visual spring/pitch/roll |
| [`src/rigged-hero.js`](src/rigged-hero.js) and [`src/foot-plant.js`](src/foot-plant.js) | GLB animation mixing, skeletal grip adjustment and stance planting |
| [`tools/build_rigged_hero.py`](tools/build_rigged_hero.py) | Generate the original skinned River Explorer GLB and manifest |
| [`src/visual-polish.js`](src/visual-polish.js) / [`src/world-paint.js`](src/world-paint.js) | Procedural PBR materials and instanced terrain details |
| [`src/soundscape.js`](src/soundscape.js) / [`src/frame-probe.js`](src/frame-probe.js) | Synthesized audio and device-side frame-time recording |
| [`reference/mount-vernon/`](reference/mount-vernon/) | Official-origin reference inputs, registration and checksums |
| [`tests/`](tests/) | Node tests; Python source/packaging tests; Chromium WebGL and service-worker-disabled browser tests |
| [`unreal-starter/`](unreal-starter/README.md) | Optional Unreal Engine 5.8 Blueprint-only River asset art lab; editor inventory check only, not the playable game |

The **engine runs locally**. External open-source projects documented in research notes are design references unless a dependency or asset has been explicitly reviewed, admitted and shipped. Do not imply that a third-party physics engine, motion-capture set or recording library has been installed merely because it appears in a research guide.

## Run, test, and build

Use **Node 22+**, **Python 3.12+** and the Python dependencies in `requirements.txt`. From the repository root:

```bash
python -m pip install -r game/requirements.txt
npm --prefix game run build
npm --prefix game test
python game/tools/audit_runtime_graph.py
python -m unittest discover -s game/tests -p test_reference_python.py -v
python -m unittest discover -s game/tests -p test_runtime_graph.py -v
python -m unittest discover -s game/tests -p test_pages_build.py -v
python game/tools/build_pages.py --output _site
```

`npm test` invokes the original-rig GLB generator before running the `test-*.cjs` Node tests. Building creates both the standalone `River_Valley_Family_Adventure_OFFLINE.html` and hosted `game.html`. The Pages builder produces a working `_site/index.html` plus local manifest/icons, an inactive legacy-worker cleanup file, and `offline.html`. Website gameplay requires a network connection; only the standalone HTML is intentionally offline. All gameplay scripts and original GLBs are bundled without remote gameplay requests.

### Real browser and disabled-worker gates

The continuous integration workflows also test **actual software-WebGL Chromium** at desktop and phone-sized viewports. After installing Playwright Chromium, reproduce them from repository root:

```bash
python -m pip install "playwright>=1.50,<2"
python -m playwright install chromium
python game/tests/browser_hero_smoke.py
python game/tests/service_worker_disabled_smoke.py --site-dir game --entry game.html
python game/tests/service_worker_disabled_smoke.py --site-dir _site --entry index.html
```

The hosted-game smoke test verifies that no service worker is registered, no legacy game cache remains, and New Harmony exploration and Scout bonding survive a **normal online reload**. This is required in both [Game CI](../.github/workflows/game-ci.yml) and the [Pages build](../.github/workflows/deploy-pages.yml). For offline play, download the self-contained HTML game; hosted offline replay from PR #11 has been retired.

**Verified November 22, 2026, on game commit `b92ce3b72dbb8607cad460290a61e79031d7ccde`:** [main CI passed](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/actions/runs/45028870961), [asset synchronization passed](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/actions/runs/45028870921), and [Pages deployment passed](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/actions/runs/45028870922). Subsequent documentation commits must be verified separately.

### Offline play notes

- **On Windows:** Open the self-contained HTML game file in a supported desktop browser. This is not a native `.exe` installer.
- **On iPhone:** Load the HTTPS game in Safari while online, and optionally add a shortcut to the Home Screen. The hosted website does not support offline replay without a service worker; saved progress may persist locally according to browser settings. This is not a native IPA.
- **Saves:** Progress stays in local browser storage, with no cloud sync. Clearing that storage may erase saves.
- **Device FPS:** Settings → **Export iPhone FPS** saves a JSON report of real in-browser frame timings. Phone-sized Chromium software WebGL is **not** a physical iPhone benchmark.

## Release history and supporting evidence

| Release | Changes | Implementation record |
| --- | --- | --- |
| **v1.11.0** | Rebuilt sculpted mesh, curved eyewear, new hair/boots/backpack geometry, eight embedded original microtextures, neutral studio lighting and four-view inspection | [River model rebuild](docs/RIVER_MODEL_REBUILD_v1.11.0.md) |
| **v1.10.2** | Short-sleeve/exposed-forearm skinning, refined gaiter and eyewear, fingerless grips, equipment and boot details; face-focused Character Studio QA | [Reference art pass](docs/RIVER_ART_REFINEMENT_v1.10.2.md) |
| **v1.10.1** | Pooled terrain/foliage materials; batched windows and seam skirts; deferred driving road redrape; generated 27-joint mesh cleanup and real idle crossfades; hand/boot inspection; per-scene diagnostics | [Mobile performance/rig evidence](docs/MOBILE_PERFORMANCE_AND_RIG_v1.10.1.md) |
| **v1.10.0** | Posey County Atlas, four regional vignettes, Scout behavior, hunting/fishing/cooking/farming upgrades and painted terrain | [County expansion](docs/POSEY_COUNTY_EXPANSION_v1.10.md) |
| **v1.9.7** | Polygon-aware footprint collision and visual wheel suspension | [Physics/character evidence](docs/PHYSICS_CHARACTER_HARDWARE_v1.9.7.md) |
| **v1.9.6** | 27-joint hands, 13 animation clips, procedural environment, biome audio and FPS export | [World refinement](docs/WORLD_REFINEMENT_v1.9.6.md) |
| **v1.9.5** | Smoothed movement, jump, grips, terrain-aware camera | [Gameplay feel](docs/GAMEPLAY_FEEL_v1.9.5.md) |
| **v1.9.4** | Foot planting and character materials | [Hero art pass](docs/HERO_ART_PASS_v1.9.4.md) |
| **v1.9.3** | Original GLB skin/rig and authored clip groundwork | [Rigged hero](docs/HERO_RIGGED_v1.9.3.md) |
| **v1.9.1–v1.9.2** | Interactive Character Studio and verified 3D preview | [Studio recovery](docs/HERO_STUDIO_v1.9.2_RELEASE.md) |
| **v1.8–v1.8.2** | Mount Vernon visual reference, materials and terrain optimization | [Graphics](docs/GRAPHICS_RELEASE_v1.8.2.md) / [Map provenance](docs/MOUNT_VERNON_GEOREFERENCE_V1_8.md) |
| **v1.7 and earlier** | Original in-world activity sites and offline browser foundation | [Open-world release](docs/OPEN_WORLD_V1_7_RELEASE.md) |

[Repository branch and PR reconciliation](docs/REPOSITORY_RECONCILIATION_2026-11-22.md) records the historical squash-merged branches. The unfinished draft [PR #2](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/2) is **PTDT engineering evidence work** and is deliberately not treated as a gameplay dependency.

## Quality boundaries / remaining work

**Do not claim** the following as shipped or certified: continuous 1:1 surveyed Posey County, authoritative road/roof/elevation meshes, full dynamic rigid-body physics, licensed recorded motion/audio packs, physical iPhone/Windows hardware acceptance or regulatory-grade spatial fidelity. Full county data acquisition, licensing, scene streaming, GPU measurements and device validation remain production tasks. [Current roadmap](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/issues/6).

The project `package.json` currently declares `UNLICENSED`. A public repository is not by itself an open-source license for its original code, imagery or models.

### Open-source terrain research (references, not installed dependencies)

The terrain/LOD/render techniques applied to the current Three.js runtime were screened against [the cited source-project inventory](docs/OPEN_SOURCE_TERRAIN_VISUAL_RESEARCH_2026-11-22.md). No alternative Godot/Unity/Unreal/Cesium engine or externally licensed terrain/character content was added to the browser game.
