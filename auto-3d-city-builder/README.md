# Auto-3D City Builder — Mount Vernon / River Valley

Production scaffolding for CityGML → 3DCityDB → 3D Tiles → Three/Cesium/Unreal, plus game-facing open world, mini-games, WebMCP tools, and WebM cutscene export.

## Layout

| Path | Role |
|------|------|
| `docker/` | 3DCityDB v5 compose (SRID 26916) |
| `pipeline/` | CityGML import, LOD2 tiles builder, FZK smoke |
| `data/` | Footprints GeoJSON, FZK Haus CityGML, river XYZ |
| `tiles/` | 3D Tiles tileset JSON (GLBs in full zip) |
| `viewer/` | `open_world.html`, WebMCP, USGS river HUD, hero P0 |
| `minigames/` | hunt / fish / farm / artifact / historic |
| `cutscenes/` | FFmpeg libvpx WebM export script |
| `docs/` | ASCE/MUDDI/LOD2/IFC/HY-World/WebMCP notes |
| `unreal/` | World Partition notes + GeoJSON spawner |
| `schemas/city_manifest.json` | TSM CRS / evidence skeleton |

## Quick start

```bash
# optional DB
cd docker && docker compose up -d

# regenerate LOD2 content tiles from footprints
python3 pipeline/build_lod2_tiles.py

# open world (tiles-first)
# serve viewer/ over HTTP and open open_world.html
```

## Full download package

The complete tree including 120 LOD2 GLB content tiles is packaged as:

**`Auto-3D-City-Builder-Mount-Vernon.zip`** (project artifacts / release asset)

Source scaffolding on `main` lives under `auto-3d-city-builder/` (text + data samples + tileset JSON). Run `python3 pipeline/build_lod2_tiles.py` to regenerate GLBs from footprints.

## Policy

Never replace surveyed CityGML / footprints / gage data with generative fill. Neighborhood height averaging is allowed when ≥3 neighbors exist.
