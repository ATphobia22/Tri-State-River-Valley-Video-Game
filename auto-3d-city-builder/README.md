# Auto-3D City Builder — Mount Vernon / Tri-State Systems Manager

Production template for semantic + photoreal 3D/4D digital twins.

**Target:** Mount Vernon, Indiana (Posey County) + Ohio–Wabash River Valley  
**CRS:** EPSG:26916 (UTM 16N NAD83) · **Vertical:** NAVD88 + GEOID18  
**Mode:** **Online-first** streaming · offline diorama backup

---

## Quick start

```bash
bash pipeline/run_production_build.sh
python3 pipeline/build_feature_textures_and_instances.py

# Optional Cesium ion
export CESIUM_ION_TOKEN=your_token
bash pipeline/cesium_ion_upload.sh
```

**tileset:** `2.4.0-gpu-instancing-ion` · EXT_mesh_gpu_instancing · structural metadata · feature textures

See full README in package; local artifacts/auto-3d-city-builder is source of truth for GLBs.

## Validated local preview intake

The supplied mount-vernon-tiles-2.4.0.zip is a local-frame preview, not verified geographic placement. Its SHA-256 is 92de48ca303b458e4bf01744fce12aa78c62ee76e6c1fc3c3be785c450f43234. Intake found 127 files, 123 GLBs (81 required JSON padding correction), and 122 referenced tile payloads. Binary chunks are unchanged. The root has no authoritative geographic transform. The FZK house is illustrative, not an authenticated local building.

From the repository root, using Python 3:

```sh
python -m unittest discover -s game/tests -p test_tile_intake.py
python game/tools/tile_intake.py /path/to/mount-vernon-tiles-2.4.0.zip /path/to/new-preview
```

The output includes the repaired preview files, catalog.json and catalog.sqlite3 (assets, features, metadata). It is deliberately not automatically published to Pages or loaded by the game. Preserve source archives. Validate full schemas, transforms, geometric containment and renderer behavior before activating this layer. EPSG:26916 in metadata is a declared target CRS, not evidence of georeferencing.

The live game already includes H3, persistent cell summaries and deadline-aware terrain preparation. KTX2 character conversion has passed CI, but runtime transcoding is not enabled. PMTiles requires an actual region-specific archive with verified range hosting and data provenance. Native WebGPU, WGSL rendering and temporal reconstruction remain experimental integration targets.
