# River Valley v1.9.2 — Verified Character Studio

The previous Character Studio startup crash and terrain-occluded camera have been fixed. River now appears on a dedicated lit stage with 12 in-game poses, a portrait-aware UI, photo capture and return to normal gameplay. A full headless Chromium WebGL smoke test covers desktop and mobile; its screenshots are preserved as CI artifacts. See [the v1.9.2 release notes](game/docs/HERO_STUDIO_v1.9.2_RELEASE.md).

# River Valley v1.9.1 — Character Studio

The game now includes an in-world Character Studio under Options -> Inspect the Explorer. It moves the camera close to the hero, provides 12 animated pose previews, enables character photos and restores the previous camera on exit. It does not modify local saves. See game/docs/HERO_STUDIO_v1.9.1.md.

# River Valley — A Family Adventure

**An offline-first, family-friendly 3D open-world game** inspired by the Ohio–Wabash River Valley near Mount Vernon, Indiana. Walk and drive through a stylized river town, fish, enjoy non-graphic wildlife challenges, farm, cook, explore, take photos and build a family cottage. Progress stays in three local browser save slots.

This repository is **only the video game**, not the Tri-State Systems Manager or a civil-engineering simulator.

## Play

**GitHub Pages (canonical game site):** https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/

**Direct gameplay page:** https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/game.html

**Downloadable single-file offline game:** [River_Valley_Family_Adventure_OFFLINE.html](game/River_Valley_Family_Adventure_OFFLINE.html).

**Alternative hosted copy:** https://river-valley-family-adventure-3e955781.base44.app/game (may behave differently across browsers).

### If the GitHub Pages link is 404

The actual game deploy workflow is [`Deploy River Valley Family Adventure to GitHub Pages`](.github/workflows/deploy-pages.yml). For **first-time activation**, the repository owner must open **Settings → Pages → Build and deployment → Source → GitHub Actions**. After saving, open **Actions → Deploy River Valley Family Adventure to GitHub Pages → Run workflow**. The workflow already contains the build, 54 JavaScript tests, two Pages packaging tests, offline validation and deployment. GitHub Actions cannot always activate Pages on an unconfigured repository using its built-in token; the activation setting requires owner access. The Pages URL must return the actual rendered game before it can be called live.

After loading the website online once, its service worker caches the HTML for use offline on browsers that support installation. The separate download is a self-contained HTML file intended for local browser play. Neither is a native iOS IPA or Windows executable.

## Gameplay and controls

- Walk with **WASD** or the touch movement pad; drag to orbit the third-person camera; use the mouse wheel to zoom.
- **H / F / G / K**: travel to woodland hunting, riverside fishing, the nine-plot farm and the campfire kitchen. These activities have their own in-world 3D objects, prompts and state.
- **E** interacts; **M** opens the map; **C** opens the cinematic director; **Esc** closes or leaves an interaction.
- Explore six family-friendly discovery areas, enjoy Scout the dog, use driving mode, customize weather/seasons/daylight, unlock the cottage and save progression locally.
- WebGL graphics are optional; when unavailable, a separate illustrated canvas fallback keeps core activities accessible.

## v1.8.2 graphics release: original procedural materials, foliage and seamless terrain

The hosted, offline-capable family adventure now provides original PBR brick/siding/limestone materials, nearby seasonal vegetation cells with GPU instancing, and complete staged terrain LOD swaps with a short fade. All resources remain local in the compiled playable HTML; the real Mount Vernon aerial/streets are a toggleable **reference only**, not a geospatial engineering claim.

[Read graphics implementation and tests](game/docs/GRAPHICS_RELEASE_v1.8.2.md).

## v1.8.1 studio-reference improvements

Adaptive terrain complexity now responds to sustained browser frame-time pressure while preserving manual quality settings; its quadtree camera target preloads a small distance ahead when driving. The new [Studio Architecture Adaptation](game/docs/STUDIO_REFERENCE_ADAPTATION.md) maps private guide concepts to actual game modules without publishing private source material. A headless [runtime dependency audit](game/tools/audit_runtime_graph.py) now checks every required JavaScript module against the offline cache and checks original GLB binary headers. The current game runs in the browser; it does not pretend to use UE5 World Partition or its server components.

## Art direction and world-building policy

**Game feel and visual quality take precedence over survey accuracy.** Official Indiana aerial imagery, street centerlines and building footprints are optional artist references for plausible town layout. Road width, topography, building heights, activity placement, vegetation, rivers and scenic details may be simplified or exaggerated for better exploration, visibility and frame rate. No verified datum or engineering-grade terrain is required to ship this **fictional game**.

Current reference snapshot: 709 Indiana GIO road features, 4,819 building footprints and a downtown source tile identified as 2023. These are supplied as optional visual references, not an assertion that the playable world matches the city 1:1. [Reference documentation](game/docs/MOUNT_VERNON_GEOREFERENCE_V1_8.md) · [overhead preview](game/reference/mount-vernon/digitized-overview.png).

The engine uses Three.js with adaptive quadtree terrain, terrain-draped roads and building polygons, original low-poly GLB landmarks, local offline models, gradient/sky shaders, light and weather effects, and no gameplay server. See [visual roadmap and asset decisions](game/docs/GAME_ART_AND_RUNTIME_PRIORITIES.md) (when present).

## Rebuild and deploy

Requirements: Node 22+ and Python 3.12+.

```bash
cd game
python -m pip install -r requirements.txt
npm test
python -m unittest discover -s tests -p test_reference_python.py -v
npm run build
python -m unittest discover -s tests -p test_pages_build.py -v
python tools/build_pages.py --output ../_site
```

The GitHub Actions Pages artifact serves the **playable generated `game.html` as `index.html`** at the site root (not a meta-refresh launcher), plus the locally scoped PWA manifest/icons, service worker, an offline download and the optional map reference.

[Game-specific source and architecture](game/README.md) · [Game CI](.github/workflows/game-ci.yml) · [Pages deployment workflow](.github/workflows/deploy-pages.yml).

## Repository description (About field)

> Offline-first 3D family adventure in a stylized Ohio–Wabash River Valley: explore, drive, fish, hunt, farm, cook, and save your journey.

The About field itself is GitHub repository metadata, separate from this README. If it has not been changed in **About → Edit**, that metadata change still needs an account-authorized GitHub settings action.

## Verification boundaries

CI proves deterministic game rules, basic ****** geometry, compiled offline bundles and deploy packaging; it does not prove a given phone's WebGL performance, installation behavior or an accurate reconstruction of real buildings. No copyrighted third-party game models should be added without a verified compatible license. The earlier engineering source archive is retained under `legacy/` but is not active game code.
