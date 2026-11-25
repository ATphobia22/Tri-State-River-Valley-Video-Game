# WebGL LOD2 optimization & Three.js geometry tools

## What LOD2 means here

In **CityGML**, LOD2 is the building shell: footprint extruded to eaves plus a **roof shape** (gable, hip, flat). No interiors. Correct fidelity for town-scale open world on GitHub Pages.

In **WebGL / Three.js**, LOD also means **Level of Detail**: swap or drop geometry by distance for frame budget (especially mobile Safari).

This project uses both:

1. **Semantic LOD2** — gable/hip meshes from `roof_type` (`pipeline/build_lod2_tiles.py` → GLB tiles).
2. **Runtime LOD** — `THREE.LOD`, merged far meshes, pixel-ratio clamp, optional 3D Tiles `errorTarget`.

## WebGL constraints on Pages

| Issue | Mitigation |
|-------|------------|
| Float32 precision at UTM (EPSG:26916) | **RTC recenter** — subtract tile sphere center |
| Fill-rate / heat on iPhone | `setPixelRatio(Math.min(devicePixelRatio, 2))`, adaptive budget |
| Draw-call count | Merge static LOD2 shells; InstancedMesh for props |
| Module CDN | `importmap` → three@0.170.0 across mini-games |

## Three.js geometry toolkit

| Tool | Role |
|------|------|
| `BufferGeometry` + `BufferAttribute` | Typed-array walls/roofs |
| `BoxGeometry` / primitives | Hero, props, diorama |
| `BufferGeometryUtils.mergeGeometries` | Far-field building batch |
| `THREE.LOD` | Near / mid / culled levels |
| `InstancedMesh` | Trees, posts |
| `MeshStandardMaterial` | PBR palette per LOD band |
| `OrbitControls` | Touch + mouse |
| `TilesRenderer` | Production tileset + SSE |

Module: `viewer/lod2_geometry.js`.

## Pipeline

```
footprints.geojson → build_lod2_tiles.py → tileset + GLB
open_world.html → diorama fallback OR tiles
lod2_geometry.js → runtime LOD + WebGL caps
```

Never replace surveyed footprints or gage data with generative geometry.
