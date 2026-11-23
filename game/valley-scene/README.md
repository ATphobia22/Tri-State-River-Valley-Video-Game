# Mount Vernon and Posey County

An optional regional scene for the family game. Walk near Courthouse Square with River, Bill Tucker and Scout, switch to the riverfront or county view, or inspect 210 downtown parcel boundaries. The county atlas in the hosted game links here. The single-file scene includes Three.js, the Draco decoder and every tile for offline use.

## Geometry and geographic registration

The local origin is the registered courthouse footprint centroid. Distances are local metres, with east on X and south on Z. The local tangent-plane approximation is intended for gameplay. The renderer shifts its origin in 256 m increments. Downtown detail streams in 700 m blocks with instanced footprint proxies. Both landmark models and the downtown terrain have distance-based LODs.

Elevation comes from the project’s admitted USGS 3DEP downtown grid and a coarser regional 3DEP export. Downtown imagery combines the registered GIO aerial and its partial 2025 overlay. Regional imagery comes from USGS Imagery Only. Indiana GIO roads and building plans, 2025 Indiana parcel outlines, and Census TIGER/Line 2025 surface water and regional roads supply the vector geometry. The Coliseum footprint assignment is provisional. Building heights, facade details and animated water levels are artistic. Screenshot references guide appearance. The project does not use imagery screenshots as elevation measurements.

## Characters and evidence

River has a reconstructed garment cage, modeled glasses, hair, gaiter, backpack, hands and footwear, a UV-mapped turnaround atlas, normal and packed material maps, and 13 retargeted clips. Bill uses newly modeled cap and face details, his game wardrobe, and the same anatomical rig. His likeness is provisional. Scout has 16 joints and three clips. Blender measured deformed vertices at 17 times per clip after decoding all three shipped Draco GLBs. See [measurements](evidence/deformation.json) and the [72-frame River and Scout studio walk rendered in Blender and graded in Natron](evidence/cast-graded.mp4).

## Parcel zoning (gameplay, not legal zoning)

The Zoning toolbar uses 210 Indiana GIO 2025 parcel polygons with immutable source object IDs. R1/R2/R3/C/I/AG are fictional game classifications, **not** official municipal zoning. Built status comes from nearby GIS building footprint proxies; road access is a geometric estimate. Utility availability and flood safety are **not verified**. All demand and desirability parameters are fictional tuning values.

Painting, monthly growth and bulldozing mutate only parcel save diffs. They do not edit underlying geospatial files or the original mapped town buildings. Generated buildings use parcel geometry; the Courthouse and Coliseum remain separate hero GLBs. The WebGL renderer and pinned local Three.js package are bundled for the single-file offline HTML. Do not substitute network-dependent CDN imports.

When refreshing the geographic snapshot, acquire official GIO object IDs and regenerate the zoning GeoJSON alongside terrain and buildings. Keep provenance and snapshots distinct from planning authority zoning.

## Build and verify

Run the following in this directory. The Pages builder packages the same scene.

```sh
npm ci
npm run build
python tools/package_scene.py /tmp/valley
python -m http.server --directory /tmp/valley
```

Open the local server for streaming or open the generated valley-offline.html directly. The Chromium test exercises walking, tile changes, rebasing, parcel visibility and device-report export in both modes. Set CHROMIUM_PATH to use a locally installed Chromium executable.

```sh
python tools/browser_scene.py
mkdir -p /tmp/valley-poses
node tools/decode_for_blender.mjs /tmp/valley-poses
blender -b --python-exit-code 1 -P authoring/verify_cast.py -- --measure-only /tmp/valley-poses
```

To rebuild geographical assets, run tools/acquire_geography.py with a download directory and pass that directory to tools/build_geography.py. Use NumPy, rasterio, trimesh, pyshp, Pillow, Shapely and mapbox-earcut. Then run tools/build_coliseum.py, copy the game’s courthouse GLB into assets and run node tools/compress.mjs assets. Public services may return newer imagery. The input hashes in evidence identify the regional raster and Census downloads used here.

For editable character masters, pass authoring/river-turnaround-color.png, authoring/river_explorer_hero_v2.glb, authoring/river_explorer_autoskin27.glb and an existing output directory after Blender’s -- separator to authoring/build_river.py. Set VALLEY_CHARACTER=bill_tucker for Bill. Run authoring/build_scout.py with the output directory for Scout.

On a physical iPhone, select a view, orbit and walk, then use **Scene & sources → Export device report**. The report identifies the scene bundle and assets by SHA-256, and records frame-time samples and viewport. Measure each view separately. Physical-device performance is pending.
