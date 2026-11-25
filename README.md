# River Valley — A Family Adventure

**A free family-friendly 3D exploration game with a downloadable offline edition** set in a stylized Ohio–Wabash River Valley inspired by Mount Vernon and Posey County, Indiana. Explore on foot or by car, fish, track wildlife, grow crops, cook by the campfire, discover regional destinations, and adventure with Scout the dog. Game progress lives in **three local browser save slots**; no sign-in or gameplay server is required.

**Current playable release: v1.13.0** · Three.js / WebGL · Browser and downloadable offline HTML · Windows and iPhone browser controls

[**Play on GitHub Pages**](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/) · [Direct game page](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/game.html) · [Download single-file offline game](game/River_Valley_Family_Adventure_OFFLINE.html) · [Game technical guide](game/README.md)

[Explore Mount Vernon and Posey County with River, Bill and Scout](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/valley-scene/) · [Download the regional scene](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/valley-scene/valley-offline.html) · [Source and render evidence](game/valley-scene/)

**Auto-3D City Builder (Mount Vernon open world / LOD2 / mini-games):** [Hub](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/) · [Open world](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/viewer/open_world.html) · [LOD2 / WebGL notes](auto-3d-city-builder/docs/WEBGL_LOD2_AND_THREE_GEOMETRY.md) · source folder [`auto-3d-city-builder/`](auto-3d-city-builder/)

> **Project boundary:** This is the **standalone video game**, not Tri-State Systems Manager's scientific, municipal, or flood-engineering digital twin. The terrain and additional town scenes are artistic game environments, not certified spatial or hydraulic models. The Auto-3D City Builder folder is game-facing open-world scaffolding (tiles, mini-games, WebMCP); it does not claim surveyed engineering accuracy.

## Repository status — 2026-11-25

**Default branch:** `main` @ latest · **Open pull requests: 0**

| Check | Status |
| --- | --- |
| Open PRs | **None** — PR #46 closed as superseded |
| River Valley Game CI | Success on `main` |
| Deploy GitHub Pages | Re-triggered after Auto-3D City Builder commits |
| Applied photogrammetry | Wired on `main` |
| Auto-3D City Builder | Hub + LOD2 WebGL helpers + docs on `main`; full package includes local zip with GLBs |
| Hero | v2.1-detail micro-geometry on `main` |

## What you can play

- **Explore:** Navigate the Mount Vernon-area 3D scene, follow six discovery stops, drive, take photographs, build a family cottage, and change weather, season and time of day. A 2D illustrated gameplay fallback is provided when WebGL is unavailable.
- **Posey County Atlas:** Offline map with official Indiana GIO county outline and Census points for Mount Vernon, New Harmony, Griffin, Poseyville and Cynthiana.
- **Scout the dog:** Follow, sit, come, fetch, bonding rewards, wildlife-tracking hints.
- **Activities:** Fish, track wildlife (non-graphic), farm, cook six recipes.
- **Character and world:** 27-joint River Explorer, PBR materials, Battery / Balanced / Showcase tiers.

### Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move / camera | WASD / arrows; drag; wheel | Pad + touch camera |
| Sprint / jump | Shift / J | Sprint / JUMP |
| Interact | E or Space | ACTION |
| Hunt / fish / farm / cook | H / F / G / K | Activity buttons |
| Close panel | Esc | Close |

## Build, test and deploy

Requirements: **Node.js 22+** and **Python 3.12+**. See [game guide](game/README.md) for full commands. GitHub Actions: Game CI, release sync, Pages deploy, reconstruction adapters.

## Auto-3D City Builder (LOD2 / Pages)

WebGL LOD2 optimization uses semantic CityGML LOD2 (walls + roof shape) plus runtime Three.js LOD (`THREE.LOD`, mergeGeometries, pixel-ratio clamp, RTC recenter for EPSG:26916). See [WEBGL_LOD2_AND_THREE_GEOMETRY.md](auto-3d-city-builder/docs/WEBGL_LOD2_AND_THREE_GEOMETRY.md) and `viewer/lod2_geometry.js`.

Shared mini-game progress: `localStorage` key `rv-family-progress-v1`.

## Known limitations

- No continuous full-county 3D stream.
- Hardware FPS on physical iPhone/Windows still human-device.
- LOD2 GLB content tiles: regenerate with `python3 auto-3d-city-builder/pipeline/build_lod2_tiles.py` or use the full local zip package.

**License notice:** Project license is currently `UNLICENSED`. Public visibility is not permission to reuse code or original assets.
