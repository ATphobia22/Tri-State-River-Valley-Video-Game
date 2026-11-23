# Mount Vernon courthouse, downtown roofs, and character production fidelity

## Verified repository implementation

This is a **real-source-informed game-art reconstruction**, not a certified 1:1 survey / photogrammetry model.

**Courthouse:** the previous five-mesh 6,828-byte procedural landmark has been rebuilt by `game/tools/posey_courthouse_mesh.py` into a 142,196-byte mesh file with six material groups. It has a two-gable Italianate facade treatment, 64 decorative arched windows, four cornice elevations, front portico, clock faces and octagonal cupola. The decorative building heights, roof curvature, and sculptural details are original modeled approximations informed by publicly visible landmark photographs and NPS record, not measurements in the historical paperwork. `game/build_models.py` is the production **source of truth** and must be run on asset edits; hand-replacing an emitted GLB will not persist.

**Horizontal placement:** the actual 2020 Indiana GIO LiDAR-derived footprint, `objectid=741267`, was recovered from the checked-in `reference/mount-vernon/buildings.geojson`. Its four-corner ring yields a footprint of about **21.7019m × 31.5843m** oriented at **0.3025179rad**. The game anchor is `x=15.7383,z=503.0174`, based on the existing approximate WGS84-to-game affine transform. Provenance (including the SHA-256 of the source GIS file and exact ring) is stored in `reference/mount-vernon/landmark-anchors-receipt.json`; `data/landmark-anchors.js` embeds the same data for offline use. This is horizontally source-linked, but **not a survey control point or verified orientation of the physical doors**.

**Elevation:** ground corners are sampled from the same visible source-derived USGS 3DEP game terrain as roads and other buildings. Heights of the courthouse eaves, architectural roof, cupola, and every other building are **artistic** because the checked-in Indiana GIO footprint does not encode measured roof elevations. 3DEP bare-earth elevations cannot provide top-of-roof data. No NAVD88 absolute building-FFE determination, LiDAR point-classified roof geometry, ridge heights, or true LOD2 building inventory has been admitted. These facts are enforced in tests.

**Downtown:** the original polygon footprints are preserved; mid-range cone roofs have been replaced by low-cost gabled-instancing geometry, and near-field orthogonal rectangular footprints use triangulated planar gables. Complex/invalid polygons retain safe flat roof caps instead of forcing gables that don't fit. All roof rises remain unmeasured art; no source-derived roof class is silently invented. Building facade and decorative details also remain creative, while building layouts are tied to the actual footprints.

**Playable start:** the game no longer begins with the hero intersecting the courthouse's newly corrected footprint. The default public-square spawn is west of the landmark, and old local saves that would place the hero inside its area are migrated to a safe point without losing progress. `game/src/landmark-access.js` is tested separately from rendering.

## Sources and versioned evidence

- Indiana GIO Building Footprints: https://gisdata.in.gov/server/rest/services/Hosted/Building_Footprints/FeatureServer/0
- NPS National Register Posey County Courthouse: https://npgallery.nps.gov/AssetDetail/NRIS/88003042
- Existing game elevation evidence: `reference/mount-vernon/usgs-3dep-receipt.json`
- Existing 2025 ortho imagery evidence: `reference/mount-vernon/leafon-2025-receipt.json`

## Actual character assets audited

`game/reference/character-candidates-20261123.json` records **SHA-256, byte length, skeleton/joint counts, animation lists and texture availability** of the user's original GLBs in their ChatGPT files. None of those user GLBs has been silently swapped into the playable game. Two files called `river_explorer_hero_v2.glb` and `river_valley_characters_master_rigged_v2.glb` are byte-identical **17-joint, one-idle-clip** prototypes with UVs but no embedded PBR images, not compatible with the 27-joint/13-action contract. The `river_explorer_autoskin27.glb` from the uploaded source ZIP contains 27 named joints and 13 clips but only heuristic skin weights, no UVs and no embedded image textures. The existing project-original River gameplay avatar remains the 27-bone/13-clip textured GLB.

For each proposed replacement, run `python game/tools/intake_character_candidate.py /path/to/candidate.glb`. This performs structural checks and **never copies, deploys, or automatically promotes the source**. Even a structural pass requires frame-by-frame deformation, retargeting, UV/PBR, edge pose screenshots, and actual phone/device performance evidence. In particular, the photographic-looking Blender turnaround sheets uploaded in chat are **images**; they do not contain source meshes, weights or Blender scene data.

## Remaining independent production gates

1. Acquire true classified building/roof LiDAR and establish coordinate systems, horizontal registration, units, and vertical datum before replacing artistic roof rises with measurements. Reject impossible roof-ground differences, inconsistent ridge values or voids.
2. Review the rebuilt courthouse against orthographic publicly licensed reference photos. Validate width/depth and entrance orientation; mark architectural details as artistic until independently measured.
3. Review downtown 3D roofs against a source DSM/roof-return point cloud. Migrate from art gables to actual roof forms when available.
4. Source the editable high-resolution Blender geometry and actual character rigs, retarget the complete action library, generate UV/PBR maps and compare posed silhouettes with screenshots.
5. Verify hosted/offline assets using Chromium WebGL, regression and 24-condition performance matrix. Verify GitHub Pages deployment on the merged exact commit. Physical iPhone Safari behavior remains an independent gate.

**Human-readable scope:** verified geometry sources and rendered game art are deliberately separated. Geometry being rendered in 3D does not make it a surveyed digital twin.
