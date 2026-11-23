# Posey County courthouse, downtown roofs and character fidelity — 2026-11-23

## Source-backed courthouse geometry

The game's source snapshot of the Indiana GIO Building Footprints 2016–2020 FeatureServer identifies 2020 LiDAR footprint objectid 741267 at the Mount Vernon courthouse. Its WGS84 exterior polygon determines approximate 21.7 × 31.6 metre dimensions, centre, and horizontal rotation, cross-checked in the Node release tests against the committed buildings.geojson. These are horizontal geometry inputs, not surveyed site control points.

The original 6.8 KB procedural courthouse GLB remains available as a fallback. The preferred PLAYABLE model is now a source-anchored Three.js mesh with project-original procedural brick and slate PBR microtextures, a raised foundation, three stories of windows, projecting gables, decorative cornices, a recessed portico, and an octagonal cupola. Architectural details are based on documentary photographs and NPS descriptions, not measured as-built dimensions. The new mesh shares the existing USGS 3DEP terrain sampler for ground placement and retains its source-footprint collision volume. Architectural windows and ornament use instancing for mobile draw-call control.

Official and documentary references:

- Indiana GIO footprints: https://gisdata.in.gov/server/rest/services/Hosted/Building_Footprints/FeatureServer/0
- NPS Courthouse Square National Register: https://npgallery.nps.gov/AssetDetail/NRIS/88003042
- NPS Courthouse nomination: https://npgallery.nps.gov/GetAsset/e475a9fc-c6f0-444d-aa30-058c33dcb035
- Posey County comprehensive plan: https://www.poseycountyin.gov/wp-content/uploads/2024/06/Posey-County-Comprehensive-Plan_FINAL-interactiveLOWres.pdf

## Roofs and elevations: constrained fidelity

New code in game/src/roof-fidelity.js constructs small-building illustrative gabled roofs in the actual polygon orientation. Larger city footprints use an illustrative parapet instead of invented axis-aligned gables. Distant roof LOD no longer displays a generic pyramid. The heights are *still* the game's historical artificial per-ID height estimates; **none** are validated rooftop elevations, and bare-earth 3DEP DEM alone cannot supply roof heights or building LOD2 ridges. The roof form classification is artistic, not a remotely measured or government-supplied classification. Do not use generated roof heights for surveying, flood analysis, or regulatory work.

## Inspected user-supplied character GLBs

Immutable SHA-256 evidence and candidate profiles are recorded in game/reference/character-intake/source-candidate-audit-2026-11-23.json. River v2 and master rigged v2 are byte-identical 17-joint, single Idle_Breathing clip candidates with UVs, no embedded texture images. The 27-joint autoskin prototype has 13 named clips and real skin weights but lacks UV0 and PBR textures. Its Drive, Jump and Farm clips contain no measured changing joint poses across their keyframes. The older turnaround GLB and the separate Scout GLB are not skinned character assets. None are promoted to the runtime.

game/tools/stage_character_candidate.py accepts an actual GLB file, performs the existing structural rig contract plus UV/PBR/clip/complexity checks, preserves SHA-256 and can copy only eligible source bytes into a separate staging directory. It never overwrites the working hero. Example commands:

    python game/tools/stage_character_candidate.py path/to/character.glb --audit-only
    python game/tools/stage_character_candidate.py path/to/character.glb --staging-dir game/staging/character-candidates

The game's existing 27-joint / 13-action textured hero remains the current production baseline. Future promotion requires reconstructing the high-poly and retargeted source master, complete animation deformation tests, reviewed UV/albedo/normal/roughness maps, actual headed browser and physical iPhone tests.

## Release gates

1. Confirm that the complete 2025 leaf-on aerial and new landmark code are actually present in the standalone HTML. The build now refuses malformed script tags that silently drop the 2025 image.
2. Run all node, Python and physical-scene browser tests. Assert the loaded courthouse comes from objectID 741267 and shows an explicit unmeasured-height warning.
3. Pass 24-condition software-rendering matrix, offline replay and independent post-merge GitHub Pages deployment on the exact commit.

Status: reconstructed game geometry and source candidate audit; NOT a 1:1 photogrammetric replica, not surveyed LOD2, and no external character replacement has been promoted.
