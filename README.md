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
