# Babylon.js WebGL2 migration (Issue #64)
This is an **isolated first migration slice**, not the production game entrypoint.
The existing Three.js game remains on `game/index.html`; no old gameplay or source data was deleted.

To run this preview after dependency installation:
```sh
cd game
npm ci
npm run build:babylon-preview
npx vite --host 127.0.0.1
```
Open `/babylon-preview.html` on the local Vite origin. The dependency versions are pinned in package.json and package-lock.json; CI runs npm ci and real Chromium WebGL2 verification.

This entrypoint requires WebGL2 and does not silently downgrade. The initial scene is **illustrative**:
no Posey County tiles, terrain, parcels, survey data, or registered CityGML features are loaded.
Geographic preview tiles remain blocked until independently verified control points, complete CRS/datum transformation,
asset hash validation and bounding-volume containment checks are available. `georegistration.cjs`
is a preliminary metadata gate only; it does not perform alignment or prove accuracy.

To incorporate into the production game next: integrate the validated Vite build to the existing
offline packager, add browser screenshots, use real 3D Tile glTF/HLOD loader, PMTiles range adapter,
and migrate gameplay state/camera/physics. Do not merge or replace the existing production runtime
until current-head tests and visual equivalence checks pass.
