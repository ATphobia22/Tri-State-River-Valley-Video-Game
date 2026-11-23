---
name: river-render-workers
description: Extend and verify browser-side scene preparation in the River Valley game. Use for Three.js building visibility, foliage streaming, regional parcel projection, or regressions in hosted and single-file worker execution.
---

Identify the entry point before changing a visual feature. The family game builds from game/index.html. The regional scene bundles game/valley-scene/src/app.js separately.

Use game/src/render-workers.js for recurring CPU jobs. Send immutable configuration once, keep a single pending camera update, and apply only the latest result. Keep scene mutations and WebGL resources on the rendering thread. Match tie order, visibility cutoffs, and the courthouse exclusion when changing nearest-building selection. Benchmark equivalent strategies with the same input.

Use game/valley-scene/src/parcel-projection.mjs for one-shot projection. Preserve each polygon, interior ring, coordinate order, and parcel identifier for hit testing. Bundle worker source inside the downloadable HTML. Exercise the inline path with the Worker constructor disabled.

Run npm --prefix game run build, npm --prefix game test, and npm --prefix game/valley-scene run build after installing their dependencies. Use game/tests/browser_render_workers.py to check both release formats and game/valley-scene/tools/browser_scene.py for parcel interactions. Record worker mode, completed jobs, browser and renderer before attributing a visual or frame-time change to workers.
