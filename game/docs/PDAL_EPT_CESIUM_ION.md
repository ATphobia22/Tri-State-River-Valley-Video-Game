# River Valley: PDAL EPT, Cesium ion and Auto-3D

This is candidate-stage integration, not a production geographic deployment.
The Babylon.js WebGL2 preview stays separate from the existing game until
headed Chromium evidence, gameplay parity, source and survey gates pass.
Tri-State Systems Manager remains a separate repository and authority registry.

## System architecture and data model

USGS EPT bounded source -> PDAL class-2 DEM, DSM, class-6 building LAZ ->
SHA-256 source receipt -> Auto-3D footprint reconstruction -> reviewed
CityGML/CityJSON -> locally served 3D Tiles -> independently verified
geographic registration -> Babylon-compatible tile renderer. Cesium ion is
an optional asset discovery and cloud tiling mirror, never an offline requirement.

The candidate inventory is game/data/geographic/source-registry.json.
Metadata fields include source URL, source CRS, output CRS, bounds in source
CRS, source metadata SHA-256, generated digest, acquisition time, datum
verification and production approval. No missing evidence is silently invented.
Class-6 points alone do not reconstruct complete buildings.

## PDAL acquisition (explicit opt-in)

From repository root, without network access (dry run):

    python3 game/tools/build_pdal_ept_pipelines.py dem artifacts/mv-dem.tif
    python3 game/tools/build_pdal_ept_pipelines.py dsm artifacts/mv-dsm.tif
    python3 game/tools/build_pdal_ept_pipelines.py buildings artifacts/mv-class6.laz

Use --execute ONLY after checking license and geographic window. The tool
verifies an explicitly declared source EPSG:3857 and Classification dimensions
in live EPT metadata before launching PDAL. If actual EPT CRS differs, execution
is blocked; no unchecked projection is applied. Outputs use EPSG:26916.
Vertical datum and surveyed registration remain unverified until independent
ground-control and geoid evidence exists.

## Cesium ion credential boundary

Set CESIUM_ION_TOKEN in a local environment or CI secret, never in source.
Use a read-only scoped token:

    python3 game/tools/verify_ion_assets.py --asset-id 6204792
    python3 game/tools/verify_ion_assets.py --asset-id 6155964

Metadata-only discovery checks expected asset types and COMPLETE state, and
redacts signed endpoint URLs. Do not delete unresolved ion asset IDs
6204790, 6155963, 6155967 automatically. No upload, asset deletion, public
token insertion or production admission is performed.

The JS createTileController interface requires a separately implemented
Babylon-compatible loader returning a disposable resource. It is intentionally
not mounted in main.js without verified registration and a tested real renderer.
The existing same-origin asset transport enforces byte budgets and SHA-256.
Do not paste CesiumJS fromIonAssetId calls into Babylon.js directly.

## Tests, delivery and monitoring

Run:
    cd game
    python3 -m unittest discover -s tests -p 'test_pdal_ept_pipelines.py'
    python3 -m unittest discover -s tests -p 'test_verify_ion_assets.py'
    node --test tests/test-ion-3dtiles-adapter.cjs
    npm ci
    npm run test:babylon-preview
    npm run build:babylon-preview

On CI run the dedicated geographic candidate contract workflow. Browser
deployment remains gated by independent geographic approval and a real
Chromium WebGL2 scene with collision, asset streaming, parity and FPS checks.
Monitor source SHA-256 change, EPT metadata CRS/schema drift, failed PDAL
jobs, ion status and authenticated endpoint errors, terrain seams, renderer
network bytes, frame pacing, queue depths and memory. Keep tokens out of logs.

## Future work and unresolved release gates

Survey control points; verify the EPT CRS and vertical datum; fetch and
verify real source data; join authoritative footprints; integrate CityGML
3.0 / 3DCityDB v5 and a maintained Babylon 3D Tiles renderer; test actual
ion endpoints, in-game tiling, collision, geographic seams and offline parity;
deploy only after source, security, QA and independent registration approval.
