# River water cinematic pass — 2026-11-22

## Scope
An original WebGL/Three.js procedural river material is integrated into the
**playable River Valley game** in `src/river-water.js`, not the separate TSM
digital twin or optional Unreal art lab.

The material replaces the fallback flat Phong water with analytical,
fragment-stage multi-frequency wave normals; view-dependent Fresnel blend;
sun specular highlights; a storm blend; and low-frequency quality controls.
It renders without planar reflection RTT or network textures.

| Feature | How it works | Limitation |
| --- | --- | --- |
| Ripples | Three combinations of time-animated sinusoids alter the lighting normal | Not a fluid simulation |
| Reflection-like response | Approximate sky color weighted by view-angle Fresnel | No actual world/object reflection |
| Sun glints | Analytic reflection-vector directional highlights | Stylized rather than physically calibrated |
| Weather | Rain dims and darkens highlights | Does not model wind-driven hydraulic state |
| Performance | `lite` zeroes fine-ripple contribution; same shader path and no extra draw passes | Must still profile physical iOS/Windows hardware |
| Offline | Added source script to `index.html` and `sw.js`; standalone bundle is built from sources | Hosted `game.html` and offline HTML must be regenerated through the normal game build |

## Sources and adaptation policy

Technique references only; shader implementation is authored independently
and does not copy upstream source:
- [Three.js WebGLRenderer and tone mapping](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html)
- [Three.js Water addon](https://threejs.org/docs/pages/Water.html)
- [Three.js color management](https://threejs.org/manual/pages/color-management.html)

Other inspected Unreal technologies—Chaos Niagara, UE cinematic capture,
Control Rig, Nanite, PCG, NNE backends, Composure, MetaSound—cannot be loaded
directly in this JavaScript game. Their reusable **ideas**, not UE plugins,
belong in independently authored game features.

## Release gate

`node --test tests/test-river-water.cjs` plus `npm test`,
`npm run build`, actual hosted and offline browser runs, and screenshots on
desktop and iPhone. Do not equate source commit or passing policy tests with
a successfully deployed release. Water shading is illustrative game art,
not an authoritative river condition.
