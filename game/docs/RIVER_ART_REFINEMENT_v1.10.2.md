# River Explorer v1.10.2 — Character refinement from three user-provided art sheets

## Design reference and fidelity standard

Reference set, supplied by the project creator on 2026-11-22:

1. **River — Character Refinement Sheet:** front, three-quarter, side and back turnaround; fitted skull-pattern neck gaiter; clear rectangular glasses; layered fabric and straps; distinct fishing/steering/interacting hands; planted boots and walk/run/landing poses.
2. **River — Main Character Concept Sheet:** textured short curls, athletic black short-sleeved top, exposed forearms with fingerless gloves, charcoal cargo trousers, tan nylon backpack, gold chain, black leather boots, clipped utility hardware and restrained original colors.
3. **River — Animation Development Sheet:** relaxed idle, walk, jog, sprint, jump and absorbent land, pickup, fishing cast, tracking, cooking and seated steering poses. Silhouette and prop contacts matter more than imitation of the concept illustration's photoreal render style.

The reference sheets are **concept guidance**. They were not treated as raw PBR diffuse/normal maps, imported as a character image plane, or copied into the public repository. This pass improves the original geometry while retaining its game-scale, stylized appearance.

## Implemented in the existing 27-joint River GLB generator

- **Clothing silhouette:** each upper arm is now constructed in adjacent short-sleeve, exposed skin and dark synthetic-glove ring sections. All three retain the prior blended skinning and original skeleton. The shader/material primitive count remains 15.
- **Gaiter/skull print:** narrowed curved tooth row, short cheek and nasal details, no oversized square white billboard teeth. Still original mesh geometry—no unlicensed image textures.
- **Eyewear:** increased lens translucency so pupils/eyebrows can read through the glasses. Slightly tightened PBR roughness and retained fitted frames and side arms.
- **Equipment:** added subtle stitched shoulder/side seams, small backpack and webbing hardware, knee/cargo reinforcement, crossed boot laces and visible tread accents.
- **Hands:** individual fingerless black glove bases transition to tan exposed fingertip meshes bound to each of the same ten finger joints. Fishing, cooking, tracking, driving and general interactions retain existing dynamically posed grips.
- **Idle silhouette:** upper arms settle closer to the torso at rest, replacing an overly wide A-pose while preserving authored actions.
- **Art inspection:** Character Studio gains a close-up **Gaiter and glasses** focus, with desktop and phone-viewport evidence captures. Existing close-up grips and boot/foot contact captures remain.

## Reproducibility and verification

`npm --prefix game run build` runs the original `game/tools/build_rigged_hero.py` first and produces `game/assets/models/river_explorer_rigged.glb`, the SHA-256 manifest and `game/data/hero-model.js` simultaneously. The generated release sync commits all three files back to `main` only after validating Node tests, the source graph and Pages packaging. The GLB remains self-contained and contains **27 bones and 13 named original clips**.

`game/tests/test-art-reference-rig.cjs` checks the current embedded binary SHA, material inventory, actual exposed skinned forearm vertices, gloves, translucency and natural resting pose. `game/tests/browser_hero_smoke.py` captures face/mask/glasses alongside the existing fishing/cooking/tracking grips and boots, on desktop and phone-sized Chromium WebGL.

The new details are **stylized real-time geometry**, not a photoreal recreation, facial motion capture, bone-by-bone corrective morph system, full original image-based PBR texture package or independent physical iPhone certification. Character pose/foot-contact testing is deterministic and headless, while artist approval remains a separate visual acceptance decision.

### Required release gates

1. Exact-head PR CI green after binary regeneration.
2. Squash merge of passing commit only.
3. Post-merge main CI, full offline build, automatic generated GLB/manifest/embedded script checksum synchronization.
4. GitHub Pages success and independent live v1.10.2 version confirmation.
5. An actual Safari-on-iPhone repeat benchmark before claiming hardware FPS improvement.

This art pass is independent of survey accuracy or municipal flood-engineering datasets.
