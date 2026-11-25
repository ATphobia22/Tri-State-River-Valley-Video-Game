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
