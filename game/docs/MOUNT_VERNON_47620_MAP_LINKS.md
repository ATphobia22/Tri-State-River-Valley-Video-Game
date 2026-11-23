# Mount Vernon, Indiana 47620 — map links and game asset-source registry

**Reviewed:** 2026-11-22 · **Location:** Mount Vernon, Posey County, Indiana, USA, on the Ohio River · **Purpose:** sources and reference maps for the independent **Tri-State River Valley Video Game**, not Tri-State Systems Manager.

This is a **link directory and source-admission guide**. Links are not claims that data have been downloaded, licensed for redistribution, validated at feature level, or imported into the game. The currently shipped 3D game terrain and roof elevations remain **illustrative**, even where horizontal road/building overlays were derived from Indiana GIS. This list does not authorize scraping commercial maps or bulk map-tile caching.

## 1. Everyday street and satellite maps — visual reference only

| Source | Mount Vernon / map link | Game-use boundary |
| --- | --- | --- |
| Google Maps | [Search Mount Vernon, IN 47620](https://www.google.com/maps/search/?api=1&query=Mount+Vernon%2C+IN+47620) | Visual comparison; **do not** copy/download commercial tiles, Street View, imagery, buildings or 3D scenes into the game without applicable rights |
| Bing Maps | [Search Mount Vernon, IN 47620](https://www.bing.com/maps?q=Mount%20Vernon%2C%20IN%2047620) | Visual comparison only; inspect Microsoft map/content terms before reuse |
| Apple Maps | [Search Mount Vernon, IN 47620](https://maps.apple.com/?q=Mount%20Vernon%2C%20IN%2047620) | Visual comparison only; do not package Apple basemap data |
| MapQuest | [Search Mount Vernon, IN 47620](https://www.mapquest.com/search/results?query=Mount%20Vernon%2C%20IN%2047620) | Visual comparison only; verify provider terms |
| OpenStreetMap | [Open Mount Vernon map (approximate center)](https://www.openstreetmap.org/#map=13/37.9325/-87.8950) | OSM **data** may be reusable under ODbL with attribution and applicable share-alike obligations; OSM's public tile servers are not a bulk-download/game-asset service. See [OSM copyright](https://www.openstreetmap.org/copyright) |

## 2. NASA and USGS satellite, topo, terrain and historical data

| Source | Link | Game-use opportunity |
| --- | --- | --- |
| NASA Worldview | https://worldview.earthdata.nasa.gov/ | Satellite and historical-date visual context; products may be too coarse for town-scale textures |
| NASA Earthdata GIS | https://gis.earthdata.nasa.gov/portal/home/ | Discover NASA GIS-ready datasets and map layers; check each product's metadata |
| NASA Earthdata Search | https://search.earthdata.nasa.gov/search | Search downloadable NASA Earth observation products, with product-specific terms |
| USGS EarthExplorer | https://earthexplorer.usgs.gov/ | Find aerial, Landsat and historical imagery; filter geographically for Posey County |
| USGS National Map Viewer | https://apps.nationalmap.gov/viewer/ | Elevation, hydrology, transport and boundaries; verify dataset resolution/vintage |
| USGS National Map Downloader | https://apps.nationalmap.gov/downloader/ | Download selected USGS products with source metadata |
| USGS 3DEP LidarExplorer | https://apps.nationalmap.gov/lidar-explorer/ | Candidate lidar and DEM source for **future** verified terrain reconstruction |
| USGS topoView | https://ngmdb.usgs.gov/topoview/ | Search Mount Vernon (Posey County) to view/download historical and current topo quadrangles |
| USGS topoBuilder | https://topobuilder.nationalmap.gov/ | Generate custom topo maps from available National Map layers |
| USGS Geographic Names Information System | https://www.usgs.gov/tools/geographic-names-information-system-gnis | Confirm place names / identifiers; disambiguate this city from other places named Mount Vernon |
| USGS Mount Vernon IN–KY 2013 US Topo PDF | https://prd-tnm.s3.amazonaws.com/StagedProducts/Maps/USTopo/PDF/IN/IN_Mount_Vernon_20130426_TM_geo.pdf | Dated official topographic visual reference, **not** a heightfield or current 3D mesh |

**Note:** Historic USGS maps may have different vertical references (for example NGVD29 on older quadrangles). Never treat printed contours or an artistic elevation grid as a ready-to-use NAVD88 terrain DEM without explicit transformation and validation.

## 3. Indiana and Posey County GIS — preferred game geometry/imagery candidates

| Source | Link | Priority / caveat |
| --- | --- | --- |
| IndianaMap | https://www.indianamap.org/ | **High:** statewide GIS discovery for imagery, elevation, transport and land cover |
| Indiana GIS Portal | https://gisdata.in.gov/portal/home/ | **High:** source metadata and layer discovery |
| Posey County official GIS map | https://poseyin.wthgis.com/ | **High:** property/assessment orientation; official Posey County Auditor's Office links to this map; portal visuals are **not** automatically redistributable |
| Posey County Auditor source page | https://www.poseycountyin.gov/county-offices/auditors-office/ | Official county provenance for GIS map link |
| Indiana GIO aerial/imagery download hub | https://imagery.gio.in.gov/ | **High:** browse licensed imagery/metadata rather than scraping map viewers |
| Indiana 2025 statewide leaf-on imagery announcement | https://secure.in.gov/gis/geoinsights/posts/indiana-leafoff-and-leaf-on-imagery-updates | **High:** as of 2026-09-28, Posey among released counties; 6-inch, four-band, COG/MrSID/ECW and county mosaics; article states **CC0 / public domain**. Select actual Posey tiles and independently check the asset's license/provenance before packaging |
| Indiana current imagery portal item | https://gisdata.in.gov/portal/home/item.html?id=61d4dc991c154af49ad7c1d675182a4f | Existing statewide imagery reference; not necessarily the new 2025 Posey product |
| Indiana Current Imagery ImageServer | https://di-ingov.img.arcgis.com/arcgis/rest/services/DynamicWebMercator/Indiana_Current_Imagery/ImageServer | Already used by game's existing Mount Vernon horizontal reference pipeline; downtown snapshot identified as **2023**, not proof that new 2025 imagery is installed |
| Indiana GIO road centerlines, current | https://gisdata.in.gov/server/rest/services/Hosted/Road_Centerlines_of_Indiana_Current/FeatureServer/0 | Official feature geometry for road alignment; clip spatially, record source version and license |
| Indiana GIO building footprints | https://gisdata.in.gov/server/rest/services/Hosted/Building_Footprints/FeatureServer/0 | 2D building outlines; **do not** infer surveyed roof/ground heights from these polygons |
| Indiana GIO parcel boundaries, current | https://gisdata.in.gov/server/rest/services/Hosted/Parcel_Boundaries_of_Indiana_Current/FeatureServer | Context for parcel shapes only; cadastral/assessment records must not be mistaken for a boundary survey |
| Indiana GIO address points, current | https://gisdata.in.gov/server/rest/services/Hosted/Address_Points_of_Indiana_Current/FeatureServer | Location context; review privacy, terms and use requirements before any public gameplay exposure |
| Indiana GIO 2025 Data Harvest overview | https://www.in.gov/gis/geoinsights/posts/data-harvest | Release context, metadata and documented state services |
| Indiana raster data access guide | https://secure.in.gov/gis/geoinsights/posts/how-to-access-indianas-imagery-and-elevation-raster-datasets | Guide for proper download/services rather than unauthorized basemap extraction |

## 4. Historical and third-party reference maps

| Source | Link | Reuse policy |
| --- | --- | --- |
| Library of Congress, Mount Vernon Sanborn fire insurance map | https://www.loc.gov/item/sanborn02432_003/ | Research historic city blocks and building context; check **item-specific** rights/advisory before using image files |
| Library of Congress, Mount Vernon Sanborn map scans | https://www.loc.gov/resource/g4094mm.g4094mm_g024321887/ | Historic street/block reference; verify map date and reuse rights |
| YellowMaps Mount Vernon topo quadrangle | https://www.yellowmaps.com/usgs/quad/37087h8.htm | Historic topo presentation; commercial website reproduction is **reference only** pending rights review |
| Pastmaps Mount Vernon 2010 US Topo listing | https://pastmaps.com/map/mount-vernon-posey-county-in-us-topo-2010 | 2010 edition reference listing; retrieve official USGS equivalent via topoView rather than copying a commercial rendering |
| City-Data Mount Vernon geographic / map page | https://www.city-data.com/city/Mount-Vernon-Indiana.html | General location, topo/satellite map reference; no republication rights implied |
| TopoZone Mount Vernon, Posey County | https://www.topozone.com/indiana/posey-in/city/mount-vernon-18/ | Independent topo viewer; reference only |
| US Census 2024 Mount Vernon city boundary map | https://www2.census.gov/geo/pvs/bas/bas24maps/st18_in/incplace/p1851732_mount_vernon/BAS24P11800051732.pdf | Municipal extent reference, not a street-level model |
| ZIPDataMaps 47620 map | https://www.zipdatamaps.com/47620 | ZIP/postal geography reference; postal bounds are not identical to city boundaries |

Third-party storefront images (including Alamy and commercial topo posters) were intentionally **not admitted as downloadable art assets**. A map image existing on the web does not prove redistribution rights. A dated commercial scan may be replaced with an official USGS topoView download, where available.

## 5. Recommended asset-to-game workflow

1. **AOI and provenance:** use Mount Vernon, **Posey County, IN 47620**, not a similarly named Mount Vernon in another Indiana county or in Virginia. Start with the *existing* local game registration and its documented bounding box in `game/src/reference-map.js`. Preserve original spatial units, CRS, timestamp, license/rights, HTTPS source URLs and SHA-256 of source bytes.
2. **Imagery:** inspect the GIO **2025 Posey 6-inch CC0** mosaic/tile collection and compare its extent and georeferencing against the existing **2023** snapshot. Do not silently relabel older images. Use orthophotography for terrain **color**, not elevation.
3. **Terrain:** source USGS 3DEP DEM/lidar covering Mount Vernon, validate CRS, horizontal resolution, vertical datum, units, voids and tile seams, then transform to local game coordinates with documented quality gates. The existing 200×200 illustrative game elevation must not be passed off as 3DEP.
4. **Roads, outlines and buildings:** query official Indiana feature services with spatial filtering and pagination, deduplicate IDs, validate feature count/geometry and source dates. 2D footprints do not supply surveyed roof heights. Run roads/footprints against the same terrain sampler after transformation.
5. **History and lookdev:** use historic Sanborn/USGS maps and commercial street-map sites as art-direction references only, except where separately verified use rights exist. Do not copy Google/Bing/Apple/MapQuest tiles or photogrammetric 3D.
6. **QA and licensing:** require license/admission record, source checksums, independent horizontal control, gameplay navigation/physics/regression tests, mobile performance evidence and release screenshots **before** claiming a real-world 1:1 reconstruction.

### What has and has not changed

- **This registry:** links, intended uses, original-source preference and rights guards.
- **Already existing in repo:** Indiana GIO-based aerial/road/building *horizontal* visual reference and source metadata, Posey County atlas, local browser cache/offline release.
- **Not performed by merely adding this document:** downloading/importing 2025 imagery, replacing DEM, stitching a new map, rebuilding town meshes, certifying elevations, shipping new runtime/GLB changes, or proving a new Pages deployment.

See [existing source-registration methodology](MOUNT_VERNON_GEOREFERENCE_V1_8.md) and [game technical guide](../README.md).
