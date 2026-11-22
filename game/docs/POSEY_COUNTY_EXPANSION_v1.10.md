# River Valley v1.10.0 — Posey County Atlas, Scout and richer world activities

## Release objectives
- Keep the game's original anonymous, no-service, offline Three.js runtime, local saves, and established Mount Vernon scene.
- Expand geographic *navigation* to the real boundary of Posey County, Indiana (FIPS **18129**) without fabricating countywide 3D terrain/road/building coverage.
- Improve the playable activity loops and local artistic environment while maintaining deterministic, tested game rules.
- Add a real companion controller rather than attaching a stationary dog to the avatar.

## Verified geographical input and scope
- **Posey County boundary** is from Indiana Geographic Information Office's official `County_Boundaries_of_Indiana_Current` FeatureServer layer 0, queried by `fips='18129'` and `outSR=4326` on 2026-11-22.
- Source returned **one polygon** with **1,933 vertices**, simplified to **584** for game navigation (roughly 10 m display tolerance); stored in `game/data/posey-county-boundary.js` with source URL, source feature properties, WGS84 bbox and vertex counts. This simplified visual polygon must not be used for a legal/cadastral determination.
- **Census TIGER** (Indiana incorporated places, ACS25, January 1, 2025) provides reference points for Mount Vernon, New Harmony, Griffin, Poseyville, and Cynthiana.
- County outline bounding box: WGS84 west **−88.0972020**, south **37.7716793**, east **−87.6881739**, north **38.2303417**.
- The county map is real reference geography, but **four new 3D destinations are original *interpretive vignettes placed in the current local stage***. They are not replicas of the towns' actual road grids, terrain, surveyed building heights or driving distances. The 4.9 km Mount Vernon local scene is still the actual detailed runtime coverage; **continuous countywide 3D geospatial tiles have NOT been delivered**.
- `src/county-atlas.js` provides a physically proportioned, color-coded 2D county navigator with marker selection; keyboard-accessible town buttons and visit/revisit rewards are saved locally. `src/county-scenes.js` adds original low-poly heritage garden, woodland platform, grain market and grove, with structural collision proxies.
- Region visits no longer misuse Mount Vernon's local georeferencing as though it described other county towns.

## Playable world changes
- **Scout:** `src/companion.js` is a terrain-following finite-speed command controller. Animated legs, nose, muzzle, ears and wagging tail provide visible follow, sit, come and fetch. Reward-limited pet/fetch bonding persists in existing saves, with cooldown to prevent repeat XP farming. When hunting, Scout offers a directional *tracking hint*, not guaranteed success.
- **Hunting:** three procedural animal models (deer, turkey, rabbit) instead of a deer placeholder for all species. Target uses time-based bounded movement; aiming is still a non-graphic, fictional family game.
- **Fishing:** visibly animated low-poly fish and bobber response, enhanced river pier and cattails; reaction time widened from 700 to **1,100 ms**, with tests.
- **Farming:** an expanded nine-plot scene with growth transitions, barn, grain silo, plowed row details, pump and scarecrow. Corn is still the only harvest inventory resource: decorative items are not falsely counted as additional crops.
- **Cooking:** more camp gear and visible ingredients, plus three saved-pantry recipes (Ohio River Chowder, Harvest Garden Soup, Explorer Trail Supper), totaling six, with ingredients consumed atomically and the last meal persisted.

## Visual finishing
- Two new original façade families (board-and-batten, corrugated metal), asphalt aggregate and world-aligned grass detail.
- Rain makes the roadway more reflective/darker in the game scene. These are procedural textures created locally, not screenshots or proprietary material libraries.
- More varied wildflowers are rendered with a *single* additional InstancedMesh draw call, with lower mobile capacity.

## Testing / nonclaims
Run from `game/`:
```
npm test
npm run build
python3 tests/browser_hero_smoke.py
```
The asset graph, generated standalone HTML, PWA service worker, geometry tests, activity progression, saved slots, sprite/photo UI and real Chromium software-WebGL desktop/mobile viewports must all pass *before* merge.

**This is not** all of Posey County rendered at 1:1 resolution. Requirements still needed for continuous countywide navigation and accurate appearance include source-licensed full-county LiDAR/DEM, official roads, 3D building-footprint height inventory, county boundary tile clipping, asset memory budgets, accurate WGS84-to-local georeferencing, and photo/terrain reference controls. County official sources:
- Indiana GIO boundary FeatureServer: https://gisdata.in.gov/server/rest/services/Hosted/County_Boundaries_of_Indiana_Current/FeatureServer/0
- IGIO 2025 Data Harvest release: https://www.in.gov/gis/geoinsights/posts/data-releases-data-harvest-2025-and-imagery/
- IGIO statewide source datasets: https://www.in.gov/gis/geoinsights/posts/data-harvest/
- US Census 2025 TIGER Indiana incorporated places: https://tigerweb.geo.census.gov/tigerwebmain/Files/acs26/tigerweb_acs26_incplace_2025_acs25_in.html
- Indiana Spatial Data Portal: https://gis.iu.edu/s/isdp/page/home

Creative outputs are game art only and cannot be mistaken for regulatory floodplain data, legal property boundaries, or site-specific hydraulic models.
