# River Valley — A Family Adventure

**A free family-friendly 3D exploration game with a downloadable offline edition** set in a stylized Ohio–Wabash River Valley inspired by Mount Vernon and Posey County, Indiana.

**Current playable release: v1.13.0** · Three.js / WebGL

[**Play on GitHub Pages**](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/) · [Game page](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/game.html) · [Offline HTML](game/River_Valley_Family_Adventure_OFFLINE.html)

**Auto-3D City Builder**

- [Hub](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/)
- [Hasting Lane Huntin](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/minigames/mg-hunt/) — Bill Tucker · Big Buck Master
- [Slim Pond Fishin](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/minigames/mg-fish/) — Uncle Pete · Catfish Cartel
- [Cook](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/minigames/mg-cook/) · [Scout](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/minigames/mg-scout/)

Shared progress: `rv-family-progress-v1` (Scout bond widens hunt tag range and fishing hook window).

## Repository status — 2026-11-25

| Check | Status |
| --- | --- |
| Open PRs | **0** |
| Slim Pond Fishin | On `main` |
| Hasting Lane Huntin | Production in package; hub linked |
| Cook / Scout / progress bridge | On `main` |
| Pages + Game CI | Re-triggered |

## WebGL LOD layers (open world)

1. **Semantic LOD2** — CityGML roofs (gable/hip) via `build_lod2_tiles.py`
2. **Runtime THREE.LOD** — distance levels + merge far meshes
3. **SSE / errorTarget** — 3D Tiles when `tileset.json` present
4. **RTC recenter** — EPSG:26916 precision
5. **Quality tiers** — battery / balanced / showcase (pixelRatio + shadows)

## WebMCP

`viewer/webmcp_tools.js`: set-camera-preset, get-river-status, open-minigame, get-family-progress, set-render-quality, photo mode.

**License:** `UNLICENSED`. Public visibility is not a reuse grant.
