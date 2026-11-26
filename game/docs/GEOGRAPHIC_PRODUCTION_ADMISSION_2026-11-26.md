# Geographic asset admission — WGS84 ECEF / CityGML / 3DCityDB v5 / KTX2

Status: **evidence screening only; not a geographic certification or publishing authority.**

## Current evidence boundary

`game/reference/mount-vernon/registration.json` describes the existing gameplay
horizontal transform as *approximate*. It explicitly records
`verticalDatumVerified: false` and `allStopCoordinatesSurveyVerified: false`.
`control-points.geojson` identifies nearest-road positions, **not independent
survey control points**. The existing local 3D Tiles preview has no independently
verified Earth frame; repairing bounding volumes does not change its location.
Do not attach an invented ECEF transform or publish it as measured geometry.

The uploaded FZK-Haus minimal sample is **CityGML 2.0**, not proof of CityGML
3.0 or successful 3DCityDB v5 ingestion. Any version conversion, source
authority and database import must have independent receipts.

## Numeric registration contract

`game/tools/local_earth_registration.py` calculates WGS84 geodetic
longitude/latitude/**ellipsoidal** height (EPSG:4979) to ECEF metres
(EPSG:4978), then constructs a 16-number **column-major** tile root matrix:

- local tile X: east
- local tile Y: north
- local tile Z: up

These are **3D Tiles** local coordinates. glTF models use Y-up; the renderer's
glTF-to-tile-axis conversion is a distinct operation and must be verified
against actual mesh handedness. In particular, an existing source labelled
X-east, Y-up, Z-north must not be reflected or silently declared right-handed.

The registration tool accepts a verified WGS84 ellipsoidal origin as an
input but does **not** infer it. An orthometric height (for example NAVD88)
is **not** the same as an ellipsoidal height: provide grid-based
geoid/epoch transformation evidence and survey checkpoints before use.
Do not substitute the game's illustrative terrain height.

Reference: OGC 3D Tiles 1.1, https://docs.ogc.org/cs/22-025r4/22-025r4.html

## Admission preflight

```sh
python game/tools/geographic_release_gate.py candidate.json --root /path/to/immutable/staging --output admission-report.json
python -m unittest discover -s game/tests -p test_local_earth_registration.py -v
python -m unittest discover -s game/tests -p test_geographic_release_gate.py -v
```

A release candidate must supply a `river-valley-geographic-release/v1`
manifest, whose evidence names, SHA-256 digests, sizes, roles and locally
readable receipts are checked. Required content roles: `3d-tiles-glb`,
`3d-tiles-tileset`, `pmtiles`, `ktx2`. Checks cover known format headers
and basic 3D Tiles manifest structure; retain independent **complete**
Khronos glTF, KTX2 and OGC 3D Tiles validation results. GLB header checks
are not mesh/topology/rig validation; PMTiles header checks alone do not
prove tile coverage, complete directories or valid feature coordinates.

Required evidence categories: immutable source provenance and license,
independent surveyed horizontal control, independently verified vertical
transformation, CityGML 3.0 and **actual** 3DCityDB v5 semantic geometry
import/selection, 3D Tiles and glTF validation, range-streamed PMTiles
spatial coverage, KTX2 validated encoding and browser/renderer tests.
Reference: https://docs.3dcitydb.org/latest/3dcitydb/

The evidence receipt schema `river-valley-authority-evidence/v1` requires
`status: VERIFIED`, `issuer`, `evidenceKind` and `sourceReference`.
**Self-declared receipts and SHA-256 are not independent verification.**
The preflight can only return `EVIDENCE_SCREEN_PASSED_MANUAL_APPROVAL_REQUIRED`
or `BLOCKED`. Its `publishable` property deliberately remains **false**
until an independently authorized publication process verifies signed
approval and all original evidence.

## Material and model production

Existing building PBR factors (`src/building-material-contract.js`) and
local procedural facade textures are artistic defaults. Existing
`tools/build_ktx2_pilot.py` explicitly has `runtime_integration: false`;
the new preflight does not turn PNGs into production KTX2. Require pinned
encoder, `ktx validate --gltf-basisu`, and a renderer that uses
`KHR_texture_basisu` with appropriate role-dependent color space.
Reference: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_texture_basisu/README.md

Likewise, `tools/build_rigged_hero.py` and `tools/posey_courthouse_mesh.py`
provide testable project-original geometry, but are not evidence of
production-grade replacement of all characters and source-confirmed
buildings. Keep regional asset staging, H3 cell residency and spatial
streaming separate from actual survey-coordinate truth.

## Deployment rule

The two workflows `game-ci.yml` and `deploy-pages.yml` execute the
registration and preflight regressions. The preflight **must not** upload
local previews. New geographic production archives require immutable
source evidence, review of 3DCityDB v5 import and CityGML semantics,
full tile/texture/rig tests and signed authorization through a separate
publisher. Government source datasets and the TSM repository remain
unchanged.
