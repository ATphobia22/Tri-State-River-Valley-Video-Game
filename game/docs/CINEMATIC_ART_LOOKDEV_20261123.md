# Photorealistic cinematic game-art pass — November 23, 2026

**Product:** Tri-State-River-Valley-Video-Game, not the Tri-State Systems Manager engineering digital twin.

## Goal and truth boundaries

Target a visually plausible, cinematic **fictionalized** Ohio–Wabash valley inspired by Mount Vernon, Posey County, Indiana. The game does **not** need survey-grade architectural duplication. Real government footprints and DEM references can inform broad placement; walls, window details, skyline dressing, characters and lighting are art-directable. Keep location identifiers, protected real-world evidence and gameplay approximations clearly separate. Do not assert that a scenic image depicts an exact physical geography, or place the Ohio–Wabash confluence at downtown Mount Vernon.

The supplied generated video 'gemini_generated_video_2AEFA4F1(3).mp4' is 10 seconds of cinematic hunting, fishing, campfire cooking, gardening and a group-at-sunset presentation. The supplied 'TriState_FullSong_Looped_SMALL.mp4' is 225.6 seconds, a looping music/game-art montage; both are aesthetic references and not 3D capture datasets. The supplied stills include Blender-blockout maps, hero turnarounds, stylized scenic UI shots and a riverfront photo. Treat the montage references as **targets**, not as evidence of assets deployed in the game.

A public video, '[Mount Vernon Indiana Walking Tour, Historic Town on the Ohio River Scenic Byway](https://www.youtube.com/watch?v=1bnyRGxen8U)' by Old Folks Adventures (published 2026-03-14), supplies independent **scene-description cues**, not reusable copyrighted pixels or exact dimensions. Its auto-generated captions were inspected, but individual names/historical claims are not independently verified. Useful cues: riverfront amphitheater and summer activities, Ohio River barges, Main Street upper-floor opera-house windows, storefront rehabilitation, the courthouse square and planted beds, soldiers' memorial, ironfront/Italianate/Revival façades, painted historic signs, War Memorial Coliseum, post office, Fourth Street scenic byway and river-port history. Distinguish historical commemoration from speculative fantasy; do not invent plaques or inaccurate text for a real memorial.

## Production changes implemented in this branch

| Asset or engine | What now runs | Limits |
| --- | --- | --- |
| 'src/cinematic-lighting.js' | Color-managed daylight, golden and blue hour, storm, night, atmospheric fog, graded exposure, sun direction and desktop opt-in shadow configuration | Physically **inspired** artistic model, not spectral sky atmosphere or ray-traced GI |
| 'src/atmosphere.js' | Shared sun direction/sky palette with renderer and ACES-tonemapped output | Procedural sky geometry and stylized cloud puffs remain visibly simplified |
| 'src/visual-polish.js' | Dynamic PBR roughness for rainy roads, roofs and window glass | Generated repeating 256-px patterns are not scanned photo textures or displacement |
| 'src/cinematic-dressing.js' | Nine benches, nine warm streetlamps and twelve planters in the courthouse and riverfront vicinity | Art placement follows local game positions, **not** surveyed street-furniture data |
| 'src/game.js' | Applies a coherent 3D lighting look; casts bounded dynamic desktop shadows from characters and scene GLBs; keeps height-linked terrain receiving shadows | Shadow cost depends on GPU; cinematic desktop quality only; phones/lite mode skip dynamic shadowmaps |
| Cinematic Director | 'Play 3D cinematic tour' now triggers the existing actual 3D fly-through | Local procedural game, not captured video or the separate 2D storyscape |

Existing river shader already implements Fresnel-like reflected color and animated small-wave normals. It is not planar screen-space reflection or fluid simulation. Existing 3D rooftops, city blocks and most foliage are still low to medium detail and will remain the biggest visual fidelity bottleneck until approved high-resolution meshes, UV/PBR surfaces, vegetation atlas LODs and close-up character renders are produced.

## Art direction from the supplied video and screenshots

- **Courthouse opening:** low 35–55 mm equivalent camera, sunset from the side, warm masonry, shadowed portico, foreground courthouse garden and damp pavement, with realistic near/far separation. First verify the landmark model's relative proportions before tuning details.
- **Main Street walk:** street-level view with brick and limestone materials, aged joints, upper-floor windows, ornamental railings, benches, carefully placed planters and distinct storefront silhouettes. Only fictionalized signs absent verified permission.
- **Riverfront arrival:** Ohio River sunset, layered near-to-far haze, anchored promenade and amphitheater cues, quiet moving riverboat/barges, varying water roughness, horizon glints and trees framing the camera.
- **Farm harvest:** sun through deciduous foliage, natural variation and denser grasses, subtle glints and soil microtexture; avoid uniformly mirrored trees.
- **Woods/creek:** layered forest silhouettes, sun shafts approximated by fog and directional highlights, plants and wet rocks, reflections matched to sky color.
- **Campfire night:** cold blue ambient, warm amber local light, orange emissive coals, animated smoke, physically plausible high-roughness wood and clothing.
- **Character close-up:** actual textured UV/PBR skin, cloth, eyewear, hair and backpack silhouettes with stable rig deformation; concept sheets and untinted procedural GLBs cannot be represented as photo-real characters.

## Render optimization tiers and release acceptance

1. **Phone/low:** one-pass WebGL2, efficient instancing, FPS governor, no shadowmap, no separate raymarch/planar-reflection passes. Require mobile Safari screenshot and 3D memory/FPS proof.
2. **Desktop balanced:** color-managed ACES, accurate material parameter ranges, sky gradient and light direction, optimized river Fresnel, moderately dense terrain/foliage; keep shadowmap disabled by default.
3. **Cinematic desktop:** opt-in 1024px directional shadowmap near player; two warm lamps at most, PBR rain response and all original prop instances. Require measurable frame-time/VRAM budgets and a switch back to balanced.
4. **Offline downloadable:** bundle all original modules with the Python build, no CDN/network fetch, no service worker registration, no external runtime textures.
5. **Review gates:** Node tests, game build, Python Pages packaging, desktop/headless browser smoke, iPhone Safari and source/live Pages deployment verification. A successful test is not by itself proof of photorealism or mobile performance.

### Research behind these choices

- Three.js official [color management](https://threejs.org/manual/pages/color-management.html), [post-processing](https://threejs.org/manual/pages/post-processing.html) and [water](https://threejs.org/docs/pages/Water.html) explain tone mapping, reflection tradeoffs and optional multistage passes.
- [Disney physically based shading](https://www.disneyanimation.com/publications/physically-based-shading-at-disney/) and [Unreal Engine physically based materials](https://dev.epicgames.com/documentation/unreal-engine/physically-based-materials-in-unreal-engine?lang=en-US) support reflectance-coherent material look development.
- [Unity HDRP atmosphere](https://github.com/Unity-Technologies/Graphics/blob/master/Packages/com.unity.render-pipelines.high-definition/Documentation~/Atmospheric-Scattering.md) is a reference for art-directable height-dependent fog; the actual game stays Three.js, not a substituted Unity runtime.
- [Physically-Based Sky Modeling for Image Based Lighting](https://www.alphaxiv.org/abs/2512.15632), [Relightable 3D Gaussians for Outdoor Scenes](https://www.alphaxiv.org/abs/2603.02801), and [Real-time Neural Six-way Lightmaps](https://www.alphaxiv.org/abs/2604.03748) are research leads. They have **not** been implemented as production GPU algorithms in this branch.
- [OpenMVS GLB conversion](https://github.com/cdcseacave/openMVS/blob/develop/docs/wiki/Interface.md) supports approved photogrammetry output where photo sets are adequate. The COLMAP/OpenMVS/NeRF worker remains a review-only reconstruction path.

**Outstanding bottleneck:** this pass meaningfully improves art direction and the running 3D scene, but does not turn low-poly geometry or image-generated concept art into photorealistic characters and landmarks. That requires independently producing and verifying high-detail meshes, PBR maps, lighting capture and benchmark screenshots on target hardware.
