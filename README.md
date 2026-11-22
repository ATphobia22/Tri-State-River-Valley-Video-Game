# Tri-State River Valley Video Game

**River Valley Family Adventure v1.8** is an offline-first, family-friendly, single-player 3D browser game inspired by Mount Vernon, Indiana and the Ohio–Wabash River Valley. This is the dedicated **game repository**, independent of Tri-State Systems Manager.

## Play and download

- **[Play the hosted game](https://river-valley-family-adventure-3e955781.base44.app/game.html)** — no login; saves are kept in each browser/device.
- **[View the actual digitized Mount Vernon aerial reference](https://river-valley-family-adventure-3e955781.base44.app/mount-vernon-georef.png)** — aerial with roads in yellow and footprints in cyan.
- **[Download complete GIS reference archive](https://river-valley-family-adventure-3e955781.base44.app/official-mount-vernon-reference-v1-8.zip)** — original GeoJSON, overhead imagery, alignment/control-point candidates, metadata and SHA-256 receipts.
- **[Download complete v1.8 game project](https://river-valley-family-adventure-3e955781.base44.app/river-valley-v1-8-georeferenced-project.zip)** — playable HTML and editable project.
- [Single-file offline HTML in this repository](game/River_Valley_Family_Adventure_OFFLINE.html) (open with a compatible browser).

## Playable features

Explore a stylized 3D landscape on foot or by vehicle, with a following/orbit camera, cinematic lighting, weather, day/night, five original low-poly GLB landmarks, a family cottage, local save slots and mobile controls. Hunting, river fishing, nine-plot farming and campfire cooking occur at interactive outdoor game sites. A separate illustrated 2D fallback remains available when WebGL cannot initialize. This is *virtual*, non-graphic family gameplay.

## Mount Vernon geographic reference

An independently verified data extract for the documented downtown study area includes **709** current statewide road centerlines, **4,819** LiDAR-derived building footprints and an Indiana Geographic Information Office ImageServer overhead capture (2048 × 1393 pixels). The official service's downtown source-tile identify operation returns **2023** imagery; do not mislabel it 2025. Of the original 4,819 building polygons, **4,412** are within the artistic in-game packing radius. Source features are preserved in the original exported GeoJSON.

- [Digital aerial overlay](game/reference/mount-vernon/digitized-overview.png)
- [Capture provenance / source URLs / bounds](game/reference/mount-vernon/registration.json)
- [Exact road centerlines](game/reference/mount-vernon/roads.geojson) and [building footprints](game/reference/mount-vernon/buildings.geojson)
- [Estimated nearest-road comparison points](game/reference/mount-vernon/control-points.geojson)
- [Georeferencing decisions and datum limitations](game/docs/MOUNT_VERNON_GEOREFERENCE_V1_8.md)
- [Reproducible public-data acquisition script](game/tools/acquire_mount_vernon_reference.py)

**Accuracy statement:** The aerial image, roads and building footprints are government-source *horizontal reference*. Game terrain elevations, roof heights, river levels and activity-site coordinates are still approximate and **not survey-verified**. The nearest-road comparison points are **not** surveyed ground control. Do not use the game for surveying, engineering, real-world navigation or regulatory decisions.

## Build and quality gates

Requires Node 22+, Python 3.12+ and the requirements in the game folder.

```bash
cd game
python -m pip install -r requirements.txt
npm test
python -m unittest discover -s tests -p test_reference_python.py -v
npm run build
```

GitHub Actions validates game-state transitions, terrain LOD, road/building transforms, five embedded GLB models, source GIS counts and hashes, and the generated offline HTML. The earlier engineering-specific code is preserved in [legacy/engineering-source-before-game-import.zip](legacy/engineering-source-before-game-import.zip) but is not part of the active game runtime.

### Release limitations

The browser WebGL scene has been rendered in Chromium with Mesa software OpenGL, and in-world gameplay was exercised. A dedicated graphics card, real iPhone offline installation/airplane-mode behavior and native Windows/iOS executables are not independently certified. The Three.js project is **not** an already-compiled Unreal Engine 5 or Unity title. Architecture documents referenced during implementation are internal guides and are **not redistributed** here.

For the supported offline experience, download the self-contained HTML and open it with a browser on Windows, or load the hosted HTTPS page in Safari and install it after the browser caches it. Browser storage is local and not synchronized across devices.
