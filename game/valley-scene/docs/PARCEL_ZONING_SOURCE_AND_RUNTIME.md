# Mount Vernon parcel-based game zoning — SOURCE STATUS AND BUILD GUIDE

**Status (2026-11-23):** PR #35 introduces a 210-parcel downtown gameplay snapshot, **not municipal zoning**. Per-parcel GIS geometry comes from Indiana GIO's 2025 parcel boundaries. All R1/R2/R3/C/I/AG/NONE values are **fictional game classifications** generated from geometry and distance heuristics, and must never be represented as an Area Plan Commission designation.

## Verified and missing source layers

| Layer | Source / scope | Role | Current evidence state |
|---|---|---|---|
| Parcel polygons | Indiana GIO 2025 FeatureServer/0, 210 downtown polygons | Atomic zone geometry and local save keys | Sourced; precise property/legal boundaries not independently surveyed |
| Buildings | Indiana GIO Building Footprints FeatureServer/0, 133 scoped features | Snap existing structures to parcel; 106 lots matched | Sourced; no observed building use or household counts |
| Road centerlines | Indiana GIO reference snapshot, 709 line features | Approximate 16m parcel access proximity | Sourced, legal ingress **not** established |
| Terrain | USGS 3DEP admitted downtown game terrain | Cosmetic ground alignment | Game scale only; datum not survey verified |
| Water | Census TIGER 2025 rivers/water | Scenic flood context | Not a regulatory floodplain boundary |
| Aerial | Indiana GIO imagery | Geovisual texture | Not an authoritative height or land-use source |
| FEMA NFHL flood hazard | Effective regulatory polygons | Flood-safety gate | **NOT JOINED**: all parcels marked UNKNOWN |
| Levees | FEMA/USACE authoritative status/coverage | Possible protected scenario boundary | **NOT VERIFIED**: no parcel marked protected |
| Utilities, schools, emergency services | Locally verified utilities/facilities | Growth gates/desirability | **NOT JOINED** |
| Municipal legal zoning/UDO | Official map and adopted ordinances held by Posey Area Plan Commission | Separate legal reference, never game defaults | **NOT JOINED** |

Official sources: [GIO statewide parcels 2025](https://gisdata.in.gov/server/rest/services/Hosted/Parcel_Boundaries_of_Indiana_2025/FeatureServer/0), [Posey Area Plan Commission](https://www.poseycountyin.gov/county-offices/area-plan-commission/), [FEMA NFHL](https://www.fema.gov/flood-maps/national-flood-hazard-layer), [USACE levee glossary](https://levees.sec.usace.army.mil/accreditationStatusGlossary.html).

Do not infer legal zoning from the game RCI labels; local Unified Development Ordinance updates and official boundary records need independent review. A levee does **not** guarantee flood-free land.

## Deterministic offline pipeline

1. Acquire authenticated/public official source snapshots and retain metadata and SHA256.
2. Clean polygons, project locally in metres, validate IDs and rings, inspect duplicates and geometry validity.
3. Run the parcel-building footprint centroid join and road-proximity estimate.
4. Assign *game-only* default zone suggestions, mark unknown flood and utilities rather than making up clearance.
5. Emit `assets/mount_vernon_zoned.geojson`; the browser uses that exact GeoJSON, no square-grid lot geometry.
6. Run weekly RCI simulation with 50m **field cache only**, not a zoning grid. Player-painted lots and building diff state remain device-local.
7. Use existing tile/proxy building geometry for **instanced massing placeholders**; use actual reviewed GLB archetype assets only after a library with fit checks and permissions exists.

Rebuild from source files without internet:

```bash
python game/valley-scene/tools/rebuild_zoning.py --output /tmp/mount_vernon_zoned.geojson
python -m unittest discover -s game/tests -p test_zoning_rebuild_python.py -v
npm --prefix game/valley-scene ci
npm --prefix game/valley-scene run build
```

The acquisition route `game/valley-scene/tools/acquire_geography.py <source-directory>` fetches the GIO parcels using the **lowercase `objectid` field**, server count checks, complete pagination and source hash receipt. The geometry builder still needs source-data validation and graphics rebaking whenever source data are revised.

**Growth guard:** no automatic parcel construction with UNKNOWN flood/utility status unless the player *explicitly* enables **Scenario assumptions**. This remains game-only, does not override mapped high-risk zones or establish any permit eligibility. The 50m cache exists solely for spatial scoring, not square zoning. No web fetch, no server, and no private property records are used by the browser simulator.

**Release still required:** full Node + Python source QA, desktop/mobile Chromium offline regional scene and 24-condition matrix, separate physical iPhone performance, actual foot/character silhouette tests and graphics approval. Scientific and legal determinations belong in TSM, not the entertainment game.
