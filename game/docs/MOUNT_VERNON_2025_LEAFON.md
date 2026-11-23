# Mount Vernon 2025 IGIO leaf-on aerial overlay

## Source and lineage

The IGIO announced its **2025 enhanced NAIP six-inch (15 cm), four-band leaf-on orthoimagery** on September 28, 2026. Posey County is among the released counties; licensing is CC0/public domain. The acquisition is performed **at build time**, using a vetted image service explicitly contained in the IGIO-linked ArcGIS webmap's `2025 Leaf-on - 6-inch` group. The game has no runtime network or API dependency.

- State announcement: https://secure.in.gov/gis/geoinsights/posts/indiana-leafoff-and-leaf-on-imagery-updates
- State cloud catalog: https://registry.opendata.aws/in-imageryleafon/
- IGIO source data S3 discovery: `s3://gisimageryleafoningov/imageryoptimized/2025/SPW/06in/` (original COGs, separately available; this build uses a viewer image export, not a direct COG mosaic).
- IGIO-linked webmap: https://www.arcgis.com/apps/mapviewer/index.html?webmap=91469d388ae34f2bacab2cb6897252fb
- Selected source strip: `https://iserver5.surdex.com/arcgis/rest/services/Indiana/P3500372s1/ImageServer`, selected only after verifying it appears in the official 2025 group and its EPSG:2966 geographic extent overlaps the Mount Vernon game area.

## Actual source transformation

The import script `game/tools/acquire_2025_leafon.py` reads the official webmap, verifies the source group and vendor image-service paths, checks source CRS and transformed WGS84 extents, then requests a transparent natural-color aerial. The returned raster extent is reprojected by a documented WGS84-to-pixel affine mapping; the output is packaged as a 2048×1393 RGBA PNG with source image SHA-256, acquisition timestamp, and pixel coverage percentage. This is **downsampled art-runtime imagery**; its displayed pixel resolution is not the original six-inch data.

The current verified imported image source has 98.5361% opaque-pixel coverage over the existing 2023 aerial reference rectangle. The other 1.4639% is transparent and retains the original older visual; it must not be labeled as a 2025 observation. This is image-alpha coverage, not certified geographic accuracy.

The game draws the 2023 Indiana GIO aerial first and overlays valid 2025 pixels second. The same layered approach applies to the terrain-draped Three.js world and the 2D map. Users can disable map imagery. The source-backed USGS 3DEP grid remains a separate height source with its own datum limitation.

## Audit files

- `game/reference/mount-vernon/leafon-2025-receipt.json`: exact source services, timestamp, returned WGS84 extent, source and overlay SHA-256, coverage and rejected inputs
- `game/reference/mount-vernon/leafon-2025-overlay.png`: generated RGBA reference preview
- `game/data/leafon-2025-bundle.js`: embedded content for **offline** gameplay
- `game/tools/discover_2025_leafon.py`: reproducible read-only archive / map URL inventory
- `game/tests/test_leafon_acquire_python.py` and `game/tests/test-leafon-overlay.cjs`: source admission, pixel coverage and offline integration tests
- `.github/workflows/posey-leafon-acquire.yml`: explicit source download, tests, packaging and feature-branch commit gate

## Truth boundaries

2025 source orthoimagery improves land-cover appearance and image-registration references, not mesh geometry or regulatory status. It does **not** provide full native six-inch rendered texture coverage, textured LOD2 buildings, roof ridge elevations, photogrammetry, parcel boundaries, current river stage, or animated native character skeletons. The downtown 3D landmark geometry, building heights, character screenshots, and gameplay water remain stylistic until independently reconstructed and validated. New Harmony and other county destinations are interpretive vignettes, not continuous source-derived terrain.

To update, run the named imagery acquisition workflow on the feature branch, inspect the receipt and full game test result, then separately validate Chromium WebGL, offline replay, GitHub Pages and a physical iPhone before describing the revised live release as verified.