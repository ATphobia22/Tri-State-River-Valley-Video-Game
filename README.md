# River Valley — A Family Adventure

[Play the browser game](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/) · [Standalone Babylon WebGL2 preview](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/babylon/babylon-preview.html) · [Detailed game guide](game/README.md) · [Issue #64: renderer migration](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/issues/64)

**River Valley — A Family Adventure** is an online-first, family-friendly 3D browser game inspired by Mount Vernon, Posey County, Indiana, and the Ohio–Wabash River Valley. Explore a stylized landscape with River Explorer and Scout, enjoy non-graphic outdoor activities and local mini-games, and save progress in your browser. A separately built, single-file offline edition is provided.

**Published game version:** `1.13.0` (from `game/package.json`). **Production gameplay:** existing Three.js / WebGL runtime. **Next renderer:** a separately testable Babylon.js 9.37.2 / WebGL2 migration preview. **Important:** the Babylon preview has **not** replaced the full gameplay runtime; do not confuse a passing preview test with production gameplay parity.

> **Geographic accuracy:** This is a game, not a survey-grade or regulatory-grade digital twin. Official-derived references are mixed with illustrative terrain, buildings, river levels, town vignettes, animals and assets. Geographic staging and admission gates do **not** establish true surveyed alignment or authorize publishing candidate data.

## Play

| Experience | Entry point | Notes |
| --- | --- | --- |
| Main browser game | [Play now](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/) | Online-first hosted build; source under `game/` |
| Game page | [game.html](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/game.html) | Same core playable experience |
| Standalone offline build | [Download source-tree HTML](game/River_Valley_Family_Adventure_OFFLINE.html) | Generated with `npm --prefix game run build`; open the local HTML on a supported desktop browser |
| Babylon preview | [WebGL2 preview](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/babylon/babylon-preview.html) | Separate migration target; not feature-parity certified |
| Auto-3D City Builder | [Builder hub](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/) | Spatial/art experimentation, not certified world geometry |

The hosted site intentionally **does not register a service worker**. An old cache-cleanup worker may still exist in the packaged distribution to unregister previous installations; it is not a re-enabled offline PWA. To play without a network connection, use the downloadable offline HTML. Local browser saves are not cloud backups.

## Gameplay

The current Three.js game includes a skinned River Explorer character, walking and driving with terrain-aware camera and collision handling, Scout's companion behavior, town discovery, hunting/tracking, fishing, crop planting and harvesting, cooking, character presentation and a photo mode. Seasonal/weather lighting, source-referenced map overlays, performance settings and local progress are also part of the current implementation. These are **gameplay mechanics**, not surveyed physical simulations.

The Posey County Atlas includes source-tagged county and settlement references and four **illustrative** regional destinations. These are themed scenes inside the existing local stage, not continuous reconstructed New Harmony, Griffin, Poseyville or Cynthiana geometry.

### Mini-games and shared progress

The City Builder hub links the hunting, fishing, cooking and scouting experiences. Shared progression uses the `rv-family-progress-v1` browser-storage key; clearing site data may remove it.

- [Hasting Lane Huntin](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/minigames/mg-hunt/) — hunting mini-game entry linked from the hub; check its published route before relying on it as a standalone build.
- [Slim Pond Fishin](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/minigames/mg-fish/) — fishing.
- [Cook](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/minigames/mg-cook/) and [Scout](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/minigames/mg-scout/) — companion activities.

## Architecture

```text
GitHub Pages (online-first playable Three.js game)
  game/index.html + game/src/ + game/data/
             |
  game/build_common.py
      +-- game/build_hosted.py --> game/game.html
      +-- game/build_offline.py --> standalone offline HTML
             |
  game/tools/build_pages.py --> _site/ (Pages artifact)

Standalone Babylon.js 9.37.2 / WebGL2 preview
  game/babylon-preview/main.js
  game/babylon-preview/playable.mjs
  game/babylon-preview/quality.mjs
  game/babylon-preview/georegistration.cjs
  game/babylon-preview/asset-transport.mjs
  game/babylon-preview/ion-3dtiles-adapter.mjs
             |
  Vite --> game/dist-babylon/ --> _site/babylon/

Geographic candidates (quarantined, not live map truth)
  reference/ + data/control/ + geographic source registry
             |
  origin/datum + source rights + immutable hashes + format checks
             |
  manual independent registration/approval before publication
```

| Area | Key paths | Responsibility |
| --- | --- | --- |
| Gameplay | [`game/src/`](game/src/), [`game/README.md`](game/README.md) | Existing world, character, wildlife, physics approximations, saving and activities |
| Babylon migration | [`game/babylon-preview/`](game/babylon-preview/) | WebGL2 production candidate, cameras, visual quality and isolated preview tests |
| Geographic control | [`game/reference/mount-vernon/`](game/reference/mount-vernon/), [`game/data/control/posey/`](game/data/control/posey/) | Source provenance, registration metadata, explicit admission blocking |
| Processing | [`game/tools/`](game/tools/), [`auto-3d-city-builder/pipeline/`](auto-3d-city-builder/pipeline/) | Terrain, mesh, texture and packaging tools; many are opt-in or candidate-only |
| Tests | [`game/tests/`](game/tests/) | Node/Python contracts, WebGL Chromium checks and Pages QA |
| Deployment | [`.github/workflows/`](.github/workflows/) | CI, candidate gates, branch reconciliation and Pages publishing |

For full gameplay, art, asset and rig details, see the [game architecture and release guide](game/README.md). For the preview's limitations, see [Babylon migration documentation](game/babylon-preview/README.md).

### Geographic evidence boundaries

The game incorporates a source-derived USGS 3DEP 256 × 256 elevation snapshot and Indiana imagery reference, while **the transform to the game stage remains approximate**. The downtown aerial layer described in the repository is from **2023**, not a verified deployment of the 2025 imagery. Ground elevation is not the same as measured roof height, and an orthometric height cannot be passed off as a WGS84 ellipsoidal height.

[Geographic admission contract](game/docs/GEOGRAPHIC_PRODUCTION_ADMISSION_2026-11-26.md) requires source-license provenance, independent horizontal control, vertical-datum evidence, complete 3D Tiles/glTF/PMTiles/KTX2 validation and separate human authorization. The built-in screening result does **not** set `publishable: true`. [USGS terrain admission notes](game/docs/MOUNT_VERNON_3DEP_WORLD_UPGRADE.md) cover limitations of the source DEM. The [City Builder preview intake](auto-3d-city-builder/README.md) likewise labels its unregistered tiles as local previews.

### Planned vs implemented geospatial features

The project researches COLMAP, OpenMVS, Nerfstudio/gsplat, 3DCityDB v5, CityGML/CityJSON, PostGIS, Cesium, PDAL/EPT, H3, PMTiles and 3D Tiles. Some supporting scripts, metadata contracts, tests and candidate loaders exist; **that does not mean** a complete survey-aligned model, fully trained NeRF, CUDA deployment, 3DCityDB production import or public 3D Tiles stream has been verified.

[PR #80](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/80) is the active integration of pinned `3d-tiles-renderer`, `pmtiles` and `h3-js` with an official Babylon candidate adapter. Treat it as **unmerged candidate work until GitHub records a successful merge**. Do not enable real geographic streaming from its metadata gates alone.

The separate [Tri-State Systems Manager](https://github.com/ATphobia22/Tri-State-Systems-Manager) is the engineering-digital-twin product. Its sovereign simulation, 120 Hz multi-physics, Vulkan, regulatory and cryptographic-audit plans are **not** shipped features of this game.

## Requirements and local development

- Node.js **22** recommended for parity with CI; `game/package.json` currently specifies Node `>=20`.
- Python **3.12+** recommended for parity with CI.
- Install dependencies from the committed `game/package-lock.json` when running the Babylon toolchain.
- Chromium/Playwright is required for repeatable browser QA; a software-WebGL CI run is **not** proof of physical iPhone Safari or Windows graphics performance.

From the repository root:

```bash
python -m pip install -r game/requirements.txt
npm --prefix game ci
npm --prefix game run build
npm --prefix game test
python game/tools/build_pages.py --output _site

# Babylon / WebGL2 preview
npm --prefix game run build:babylon-preview

# Source/package gates
python game/tools/audit_runtime_graph.py
python -m unittest discover -s game/tests -p test_pages_build.py -v
python -m unittest discover -s game/tests -p test_geographic_release_gate.py -v

# Optional real-browser tests after Playwright and Chromium installation
python -m pip install "playwright>=1.50,<2"
python -m playwright install chromium
python game/tests/browser_hero_smoke.py
```

The production deployment performs further WebGL/Chromium tests and rejects failed admission, runtime, accessibility, package or QA gates. Use `npm --prefix game test` rather than assuming a root-level `npm test` script exists. Files under `_site/` and `game/dist-babylon/` are build outputs.

## Branches, pull requests and release checks

All changes should go through a small PR against `main`, pass exact-head CI and browser testing, and be merged without forcing stale branches into the release. The existing [verified branch cleanup workflow](.github/workflows/cleanup-merged-game-branches.yml) checks ancestry and merged PR-head evidence and deletes only safe, unprotected refs; divergent branches with unmerged work are retained.

**Reconciliation snapshot (2026-11-27, after PR #79):** 13 safe branch refs deleted with zero GitHub API errors; `main` plus 13 retained non-main refs were visible. This is a dated audit, not a continuously live branch counter. See [cleanup evidence](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/actions/runs/45957883019). [Issue #64](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/issues/64) tracks Babylon migration and geographic streaming. This README should never be treated as proof that an outstanding PR is merged.

The automated pipeline produces build/test evidence and, on `main`, a Pages deployment. Successful CI means the tested scenario passed; it does not itself certify photorealism, map accuracy, iOS device performance or accessibility completeness.

## Roadmap

1. Establish **full Babylon.js gameplay parity**: character, camera, activities, local saves, input, fallback and quality controls before retiring Three.js.
2. Validate geographic streaming with independent surveyed control, vertical datum transformation, 3D Tiles/PMTiles integrity and verified source-license coverage; preserve government source records.
3. Improve lighting, PBR geometry, character rigs, wildlife and environment materials using licensed source assets and reproducible visual QA.
4. Complete full browser/device acceptance: desktop, mobile, Safari/iOS, offline download, accessibility, motion, memory and performance budgets.
5. Continue safe branch reconciliation and protect public Pages from unreviewed candidate assets.

## License and contributions

The project declares **`UNLICENSED`**. A public repository is **not** permission to copy, redistribute or commercially use the original code, music, models, character likenesses or other game assets. Third-party governmental data and open-source dependencies carry their own source-specific terms.

Open focused issues and PRs with clear reproduction steps, source provenance, tests and browser evidence. Do not commit private data, API tokens, unlicensed assets or claimed survey coordinates without independent evidence and approval.
