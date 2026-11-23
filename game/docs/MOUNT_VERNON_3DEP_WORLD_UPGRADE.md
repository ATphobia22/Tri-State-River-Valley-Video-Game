# Mount Vernon open-world terrain reconstruction — source verification

## Implemented

- Existing Indiana GIS aerial imagery is enabled by default in the playable Three.js world. The map remains optional and the user can disable it in Settings. Source downtown tile year is 2023; do not claim the new 2025 imagery is imported.
- A new offline elevation selection module accepts a compact, source-validated USGS 3DEP bare-earth grid when the source acquisition step produces one. It rejects invalid base64 data, out-of-region bounds and unknown provenance, retaining the original game's illustrative heightfield.
- A build-time USGS ImageServer importer requests F32 TIFF elevations on the current 4.9-km Mount Vernon stage, validates TIFF type, WGS84 bounds, sample completeness, physical range and format, and writes source and output SHA-256 receipts with timestamps.
- The 3D terrain, roads, buildings, player movement and camera still share the existing game's one height sampler, so the replacement follows the current quadtree and draping calculations.
- No new runtime network request, API key, login, third-party tile CDN or proprietary basemap redistribution is introduced.

## Running the source admission

Use the repository workflow at .github/workflows/mount-vernon-3dep.yml or, from the repository root:

    python -m pip install -r game/requirements.txt rasterio==1.4.3
    python game/tools/acquire_3dep_terrain.py --out game/data/usgs-3dep-terrain.js --receipt game/reference/mount-vernon/usgs-3dep-receipt.json
    node --test game/tests/test-terrain-source.cjs
    python -m unittest discover -s game/tests -p test_3dep_terrain_python.py -v
    npm --prefix game run build

Only label the 3DEP terrain shipped when the generated JS contains schemaVersion 1 with a USGS source receipt, and when both source import and the exact game's Actions/Pages release pass. The current null placeholder does not constitute a downloaded USGS raster.

## Screenshots and imported character assets

The user-provided image boards show front/side/back T-pose character references: Bill Tucker, Larry Goldman, Richard Stratton, Pete Yeida, Wally Wallace, Marcus Stevens, Roy Tenney and a family group; they also show two 3D downtown Mount Vernon environment targets containing the Posey County Courthouse, city blocks, waterfront and a Coliseum.

Those image boards are art references, not the native Blender/FBX geometry. The existing original offline game already has stylized wardrobe interpretations for most of these figure names. Do not claim these screenshots were reconstructed into production retopologized mesh assets, skinned weights, UV/PBR textures or animations; actual native models and their source rights are needed for a faithful import and independent deformation tests.

## Spatial limitations and requirements

- Local WGS84 raster registration follows the game's existing approximate geographic-to-game affine transform; it is not an independently surveyed 1:1 model.
- USGS 3DEP elevations represent bare earth, and continental U.S. DEM products are usually metres / NAVD88. The exported service mosaic is not independently checked against source-tile vertical metadata or GEOID18. Its datum must remain unverified in the game.
- Ohio River water geometry, water level, major roof heights, symbolic landmarks, historic facades and regional destination vignettes are illustrative, even when the ground relief is source-derived.
- Indiana 2025 Posey leaf-on six-inch CC0 imagery is available, but is not part of this terrain-source script. It must be independently identified, clipped, acquired and validated before replacing the bundled 2023 downtown aerial.
- Source footprints do not encode surveyed roof heights; rooftop and facade reconstruction still needs independent imagery/lidar and visual QA.
- Monitor desktop/mobile WebGL render, road/building alignment, network-disabled replay, physical iPhone frame time and collision/footplant behavior before claiming release accuracy.

Official sources: https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer and https://secure.in.gov/gis/geoinsights/posts/indiana-leafoff-and-leaf-on-imagery-updates

See MOUNT_VERNON_47620_MAP_LINKS.md and MOUNT_VERNON_GEOREFERENCE_V1_8.md for source links and existing imagery/road/footprint provenance.