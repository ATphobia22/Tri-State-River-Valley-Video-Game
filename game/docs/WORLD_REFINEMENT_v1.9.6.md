# River Valley v1.9.6 — Environment, collisions, hand animation, sound, and device performance

## Implemented in the existing offline Three.js game
- **World collision:** `src/world-collision.js` builds a spatial hash over derived building AABB footprints, with swept-circle substeps, axis sliding, escape from legacy save positions inside buildings, and basic terrain grade/step rejection. This is a **gameplay proxy**, not a true mesh collider or engineering-grade physical solver. It currently omits moving platforms, vehicle rigid bodies, mesh-accurate roofs, and authored stair geometry.
- **Skinned fingers and animation:** The original GLB generator now produces **27 joints**, including five independently skinned digits on each hand, with action-specific curl. It exports **13 authored glTF animation clips**; `AnimationMixer` crossfades those quaternion tracks under the existing IK and upper-body grip adjustments. No third-party motion data is embedded.
- **Ground art and buildings:** Deterministic procedural shingle roof maps, field stones, and riverside reeds use pooled materials and two instanced meshes rather than hundreds of draw calls. Existing brick, limestone, and clapboard materials remain shared. Geographical distribution is fictional and deliberately *not* claimed to be GIS-derived.
- **Offline soundscape:** A single Web Audio context, unlocked by Play or Sound user action for iOS playback policy; original synthesized surface/biome cues near shore, woods, farm and trail, plus a light ambient accent. Local sound control honors mute. This is **synthetic audio**, not licensed wildlife recordings or an acoustic simulation.
- **iPhone performance recorder:** `src/frame-probe.js` gathers up to 3600 valid in-game frame intervals and render metadata; Export iPhone FPS saves a local JSON report containing mean/median FPS, p95/p99 frame times, draw calls, triangles, viewport and user agent. It does not send telemetry. The 3D renderer automatically reduces its pixel ratio under prolonged poor FPS and recovers after sustained improvement. **No physical iPhone benchmark has been run by the connected tools.**
- **Offline packaging:** Self-contained HTML/PWA, no CDN, no network dependency for graphics, audio or physics. Local stores remain intact.

## Verification
Before merge require exact-head CI: Node regression tests for collision, terrain step, authored GLB bone weights, animation mixer, audio unlock/biome selection, device telemetry and offline asset closure; Python data/provenance and Pages tests; Chromium software-WebGL desktop/phone viewport smoke. After merging, require success on main CI, generated release synchronization and Pages deployment and then independent HTTP/version check.

## Research-to-implementation boundary
The following projects supplied *patterns only*, not copied source or automatically installed dependencies:
- three-mesh-bvh (https://github.com/gkjohnson/three-mesh-bvh): candidate for triangle-accurate collision after size and runtime benchmark.
- Rapier (https://rapier.rs/docs/user_guides/javascript/): candidate for dynamic rigid bodies, vehicle suspension, and stairs.
- three-player-controller (https://github.com/hh-hang/three-player-controller): camera, collisions, foot IK, moving platforms research.
- Mesh2Motion (https://github.com/Mesh2Motion/mesh2motion-app): future artist-approved retargeted clips.
- Hunyuan3D-2 (https://github.com/Tencent-Hunyuan/Hunyuan3D-2): possible authoring experiment only, license/model weight review required.
- model-viewer (https://github.com/google/model-viewer): GLB QA aid only.
- Three.js instancing (https://threejs.org/docs/pages/InstancedMesh.html).
- WebKit autoplay policy (https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/).

## Hardware acceptance is pending
On an actual iPhone, launch the latest deployed game in Safari, tap Start exploring, enable 3D/full effects, traverse downtown, riverbank, farm and trail for 60–120 seconds each and export a performance JSON. Record exact iPhone model, iOS/Safari version, power mode, battery temperature/throttling, scene, draw calls, P95/P99 frame times and visual defects. Desktop/phone-sized Chromium automation **cannot** substitute for actual iOS Safari hardware measurements.

Outstanding work: true capsule/mesh collision and explicit stairs, two-segment metacarpal finger retarget, licensed motion-capture review, high-resolution surface painting, full spatial wildlife audio, and measured mobile GPU/frame pacing acceptance.