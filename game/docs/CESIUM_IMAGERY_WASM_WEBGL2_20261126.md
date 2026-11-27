# Cesium imagery + WebAssembly guidance for River Valley gameplay

## Production boundaries and decisions

Primary public game renderer: pinned Babylon.js 9.37.2 on WebGL2.
Geographic inspection: CesiumJS ImageryLayer with independently reviewed
WMS, XYZ, single-tile and ion imagery providers. The opt-in Cesium inspector
must not be silently loaded into the Babylon scene. It requires a caller's
already initialized CesiumJS Viewer: import createCesiumImageryController
from game/geospatial/cesium-imagery-controller.mjs and inject
{Cesium, viewer, allowedHosts}. The function returns explicit add,
setAlpha, setBrightness, setVisible, raise, lower, remove and dispose operations.

A source must have stable id, kind, provenanceId, attribution and explicit
licenseReviewed=true. For ion, also pass assetId and ionEnabled=true after
provisioning runtime-scoped credentials outside GitHub. Ion 6204792 is a
candidate 3D Tiles building asset and ion 6155964 is a terrain asset;
neither is an imagery source. The controller intentionally rejects them.
No private ion URL, bearer token or Mapbox secret is written to the repository.
XYZ and WMS remote HTTPS hosts must be allowlisted; relative local imagery
is permitted. URL query credentials and insecure remote HTTP are rejected.

The source library provides imagery DISPLAY context only. It does not
establish georegistration, license for reuse, surveyed terrain alignment,
flood elevation, legal building footprint or production promotion.
Any Google satellite or Bing content from Cesium tutorials requires the
respective provider's terms, permissions and applicable keys. Do not scrape
consumer mapping imagery or save it as reusable game texture.

## Architecture

Authoritative imagery and LiDAR receipts -> local GeoTIFF/COG and geometry ->
separately approved WMS/WMTS/XYZ service and 3D Tiles ->
CesiumJS review mode (independent globe) -> asset registration gate ->
Babylon WebGL2 gameplay textures/geometry only after an explicit conversion,
license approval, horizontal and vertical datum validation, collision tests,
bounding volume checks and visual QA. Cesium ion may optionally mirror
approved public source layers; local open-source tiling remains the primary
offline-safe path. TSM remains a separate repository.

Mapbox geocoding gives only a UI camera context near Mount Vernon,
Indiana 47620 (approximately 37.932132 N, -87.895591 W); it is not survey
control. Use Mapbox map styles/tiles only with appropriate licensed runtime
tokens and attribution. Prefer locally published public Indiana/USGS
orthoimagery as source of production materials after source review.

## Browser performance

Google Earth WebAssembly provides precedent for moving expensive decoding
and geometry processing off the UI thread. Do not change the game's main
renderer to Wasm or WebGPU based on the case study alone. Introduce
bounded geometry/mesh decoders as Workers first; measure frame time,
long tasks, memory and mobile regressions against an unchanged baseline.
The runtime-capabilities module chooses conservative JavaScript, Wasm
main-thread, Wasm single Worker or explicitly permitted threaded Wasm mode.
Only enable SharedArrayBuffer/threads when COOP and COEP isolation, Worker,
Wasm and shared memory are actually supported. Many static hosting paths,
third-party imagery providers and embedded resources will not satisfy
cross-origin isolation; never assume it from a hardware core count.
SIMD and WebGPU remain 'not-tested' until real feature probes are installed.

Budget defaults: imagery layers <=4 (hard maximum 8), local Babylon
quality-specific maxTiles already bounded, hardwareScaling retained,
Wasm workers 1 unless explicitly validated; optional isolated threads
max 4 by default. Use AbortController for all network tile lifecycles,
dispose tiles and textures on camera movement, and never cache ion tokens
or restricted resources in a service worker. Preserve the disabled service
worker and existing storage/gameplay behavior.

## Reference implementations / research

Cesium imagery: https://cesium.com/learn/cesiumjs-learn/cesiumjs-imagery/
Cesium imagery API: https://cesium.com/learn/cesiumjs/ref-doc/ImageryLayer.html
Earth WebAssembly: https://web.dev/case-studies/earth-webassembly
Wasm threading: https://web.dev/articles/webassembly-threads
Chrome Modern Web Guidance 1.0: https://developer.chrome.com/blog/modern-web-guidance-v1
Mapbox cartography: https://docs.mapbox.com/style-spec/

## Verify

cd game
node --test tests/test-cesium-imagery-controller.cjs tests/test-runtime-capabilities.cjs
npm ci
npm run test:babylon-preview
npm run build:babylon-preview
python tests/browser_babylon_webgl2.py

Security tests enforce origin allowlists, token hygiene, license provenance,
source-type distinctions and layer disposal; QA checks thread fallback,
graphics isolation and genuine WebGL2 desktop/mobile rendering.
These contract tests do NOT prove CesiumJS live imagery rendering,
external provider authorization, offline data availability or
scientifically accurate regional elevation. Those are separate admission
and browser integration gates before production promotion.
