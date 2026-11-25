# River Valley — A Family Adventure

**A free family-friendly 3D exploration game with a downloadable offline edition** set in a stylized Ohio–Wabash River Valley inspired by Mount Vernon and Posey County, Indiana. Explore on foot or by car, fish, track wildlife, grow crops, cook by the campfire, discover regional destinations, and adventure with Scout the dog. Game progress lives in **three local browser save slots**; no sign-in or gameplay server is required.

**Current playable release: v1.13.0** · Three.js / WebGL · Browser and downloadable offline HTML · Windows and iPhone browser controls

[**Play on GitHub Pages**](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/) · [Direct game page](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/game.html) · [Download single-file offline game](game/River_Valley_Family_Adventure_OFFLINE.html) · [Game technical guide](game/README.md)

[Explore Mount Vernon and Posey County with River, Bill and Scout](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/valley-scene/) · [Download the regional scene](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/valley-scene/valley-offline.html)

**Auto-3D City Builder:** [Hub](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/) · [Open world](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/viewer/open_world.html) · [Hasting Lane Huntin](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/minigames/mg-hunt/) · [Cook](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/minigames/mg-cook/) · [Scout](https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/auto-3d-city-builder/minigames/mg-scout/) · source [`auto-3d-city-builder/`](auto-3d-city-builder/)

> **Project boundary:** Standalone video game — not a certified TSM engineering twin. Auto-3D City Builder is game-facing open-world scaffolding.

## Repository status — 2026-11-25 (evening)

**Default branch:** `main` · **Open pull requests: 0**

| Check | Status |
| --- | --- |
| Open PRs | **None** |
| Game CI | Re-triggered on `main` |
| Deploy GitHub Pages | Re-triggered on `main` |
| Auto-3D hub + progress bridge | On `main` |
| mg-cook / mg-scout | On `main` |
| Hasting Lane Huntin (Bill Tucker · Big Buck Master) | Production module in package; Pages path wired from hub |
| Shared save | `rv-family-progress-v1` |

## Auto-3D mini-games

| Game | Mentor / notes |
| --- | --- |
| **Hasting Lane Huntin** | Bill Tucker — Big Buck Master; wind, stealth, deer AI |
| Fish / Farm / Cook / Scout / Artifacts | Family progress inventory + Scout bond |

Shared progress key: `rv-family-progress-v1`.

## Controls (main game)

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move / camera | WASD; drag; wheel | Pad + camera |
| Hunt / fish / farm / cook | H / F / G / K | Activity buttons |
| Close | Esc | Close |

## Build

Node 22+ · Python 3.12+ · see [game/README.md](game/README.md).

**License:** currently `UNLICENSED`. Public visibility is not a reuse grant.
