# Indiana GIO current orthoimagery: CesiumJS inspector source

The official Indiana Geographic Information Office publishes a state-wide
orthophotography mosaic with 2022–2025 acquisitions (not a promise that
every Posey County pixel comes from 2025), in EPSG:3857, labelled CC0.

Verified service capabilities (read 2026-11-26):
https://di-ingov.img.arcgis.com/arcgis/services/DynamicWebMercator/Indiana_Current_Imagery/ImageServer/WMSServer?service=WMS&request=GetCapabilities

The published WMS layer name is `Indiana_Current_Imagery:None`.
Its colon is part of the standards-compliant WMS layer identifier, not an
injection token. The controller explicitly permits this while rejecting
query-control characters and unapproved host origins.

Usage: after independently initializing a CesiumJS Viewer, import
`attachIndianaOrthoImagery` from
`game/geospatial/indiana-ortho-imagery.mjs` and call with
`{Cesium,viewer}`. It returns `{controller,registered}` for opacity,
brightness, visibility and disposal; `registered.surveyVerified=false`.
No ion token, API key, 3D tileset or browser-wide globals are stored.
Do not mount CesiumJS in the Babylon WebGL2 canvas.

The WMS is CONTEXT-ONLY and opt-in, not a game texture, survey control,
terrain height source or verified building/parcel raster. For gameplay:
capture the service source/coverage/timestamp, confirm CC0 provenance,
check per-tile resolution and temporal coverage, validate horizontal and
vertical alignment against authoritative controls, tile approved local COG
outputs, measure streaming and HTTP behavior, then pass production
asset-admission and browser checks. Never scrape/licence-bypass consumer
Google or Bing satellite imagery.

Tests:
    node --test game/tests/test-cesium-imagery-controller.cjs game/tests/test-indiana-ortho-imagery.cjs
