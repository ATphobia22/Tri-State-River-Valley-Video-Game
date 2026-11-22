# River Explorer v1.11.0 — Character Mesh and Material Rebuild

## Reference, target, and limitation

This update is grounded in the **three creator-supplied River Explorer concept, refinement and animation reference sheets**. They depict a character with closely fitted glasses, a skull-pattern fabric gaiter, smaller natural brown eyes, short curly hair, an athletic dark shirt, exposed skin at the arms, fingerless gloves, a curved olive/tan backpack, dark cargo trousers and weathered hiking boots. They also specify front/side/back silhouettes, activity grips and planted walk/run/landing poses.

The live-game evidence captured for v1.10.2 was independently inspected. It established that the 27-joint binary was indeed being rendered, but its cartoon eye spheres, large round locks, block-like backpack and boots, flat materials, harsh studio lights and too-distant mobile camera were poor matches for the art. This is a **new original procedural sculpt and material pass**, not an image-to-3D scan, commercial mocap import, or a photoreal production sculpt of the illustrations.

## Delivered geometry and material upgrades

- **Model and proportions:** retessellated 24-segment organic lofts, six-section rounded boot toes and separate tapered soles instead of rectangular foot boxes; rounded backpack with a fitted shoulder-to-waist profile, shaped secondary pocket and strap lines. Maintains prior broad proportions, skinned short sleeves, cargo/leg hierarchy, and every 27 original bone IDs.
- **Face, glasses, hair:** replaced large white high-contrast eyeballs with warm skin-tone eyelids and small dark irises. The lenses now have actual 12×8 curved PBR-transparent geometry instead of single-plane cuboids. Hair uses dozens of finer irregular curls rather than oversized round beads; eyebrow shafts are narrower. The skull gaiter print is smaller, muted, curved with fabric, and lit by the scene rather than always unlit white.
- **Textures:** eight original 128×128 sRGB PNG microtextures (shirt, cargo, pocket, skin, gaiter, backpack, straps, boots) are embedded inside the GLB using standard PNG/glTF 2.0 image bufferViews. They use no network references and multiply the original material baseColorFactor/roughness/metalness values. The playable Three.js runtime continues to generate matching local micro-weave and very small procedural bump maps for skin, canvas, nylon and leather. No external assets or new runtime dependencies were installed.
- **Animation:** preserve all 13 original authored clips, ten finger joints, state mixer crossfades, action-specific wrists/grips and terrain-aware foot locking; add a regression covering rapid walk/sprint/fishing/drive/landing transitions and rotation sanity.
- **Presentation:** improve neutral studio key/fill/rim lighting, enlarge the model in phone-sized framing, add front/three-quarter/profile/back turnaround selectors and a Hide/Show Tools button to inspect River without menu obstruction.

The runtime still renders **original procedural skinned character art**, with more convincing shapes and textiles, not a photographic match to the concept art. Genuine photogrammetric/cinematic-quality likeness would require a manually sculpted face/clothing mesh with retopology, baked normal maps, hand-painted/photogrammetric PBR atlas, art-direction approval and potentially a separate LOD set.

## Reproducibility and hard validation

```bash
python3 game/tools/build_rigged_hero.py
npm --prefix game test
npm --prefix game run build
python3 game/tests/browser_hero_smoke.py
python3 game/tests/offline_pwa_smoke.py --site-dir game --entry game.html
```

The existing deterministic Python generator and build/pretest hooks must create and synchronize all three source-of-truth assets on every release:

- `game/assets/models/river_explorer_rigged.glb` — updated original self-contained glTF 2.0 binary including original embedded PNGs
- `game/assets/models/river_explorer_manifest.json` — SHA-256, dimensions, triangles, joint/clip counts and embeddedTextureImages receipt
- `game/data/hero-model.js` — exact same GLB bytes base64-embedded in the offline game

`test-character-fidelity.cjs` checks actual indexed geometry, head/eyewear/boots/backpack detail, GLB 27 bones and 13 clips, binary receipt, embedded PNG bufferView signatures and source-available material shaders. `test-character-transitions.cjs` verifies quick action changes do not cause nonfinite skeleton transforms or lost grip/foot state.

`browser_hero_smoke.py` captures **four turnaround views**, source-face close-ups, finger props, boots, minimized touch-friendly controls and standard gameplay on desktop and phone-sized Chromium WebGL. Captures are evidence of rendered geometry in the tested browser only. CI does not measure a physical iPhone's thermal limits or certify visual similarity to the artist's sheet.

**Release gate:** only merge the passing PR exact head, then verify main CI, regenerated GLB+checksum sync, GitHub Pages deployment and the live v1.11.0 version. An optional original creator visual review can further improve the art; do not state this is a 1:1 recreation or that hardware FPS improved without measurements.
