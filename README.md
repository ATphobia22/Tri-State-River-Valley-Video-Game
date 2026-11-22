# Tri-State River Valley Video Game

**River Valley Family Adventure v1.7** — offline-first 3D family exploration game inspired by Mount Vernon, Indiana and the Ohio–Wabash River Valley.

- [Game source and setup](game/README.md)
- [Playable static game](game/index.html)
- [Single-file offline game](game/River_Valley_Family_Adventure_OFFLINE.html)
- [Live website](https://river-valley-family-adventure-3e955781.base44.app/game.html)
- [Validation details](game/docs/OPEN_WORLD_V1_7_RELEASE.md)

The previous digital-twin code is archived in legacy/engineering-source-before-game-import.zip; it is not part of the active game runtime. This game is separate from Tri-State Systems Manager.

Build and test: cd game; python -m pip install -r requirements.txt; npm test; npm run build.

GitHub Pages can serve the root index.html as a launcher if enabled. The offline HTML runs in a browser and is not a native Windows/iPhone executable.

### Georeferenced Mount Vernon reference (v1.8)

Actual 2023 downtown orthophotography, Indiana GIO road centerlines, building outlines, original unmodified GeoJSON, SHA-256 receipts, registered preview map, and game-packed layers: see [game georeferencing documentation](game/docs/MOUNT_VERNON_GEOREFERENCE_V1_8.md), [captured imagery/vector reference](game/reference/mount-vernon/), and [digital reference overlay](game/reference/mount-vernon/digitized-overview.png). Horizontal reference only: source game terrain elevations, building roofs, river levels, and landmark locations are not survey-verified.

## Mount Vernon GIS art reference (v1.8)

The game now includes a separate, offline Indiana GIO aerial reference with 709 official road centerlines and 4,819 LiDAR-derived building polygons. The downtown imagery identifies as 2023, and the terrain elevations, artistic roof heights and game-stop locations are NOT surveyed. See game/docs/MOUNT_VERNON_GEOREFERENCE_V1_8.md and game/reference/mount-vernon/registration.json. This does not change the Tri-State Systems Manager repository.
