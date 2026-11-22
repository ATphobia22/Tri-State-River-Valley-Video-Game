# River Explorer v1.9.3 — original rigged GLB release

## Character identity and source
The two River character sheets supplied by the project owner are art direction, not meshes or motion capture. The original self-contained generator creates geometry from mathematical lofts, tapered limbs, custom tubes, spheres and boxes. The visual identity includes dark technical clothing, cargo pants, backpack/straps, tan leather details, curly dark hair, glasses, skull gaiter, dark gloves and hiking boots, plus a metallic gold chain. The result is stylized and is not a photogrammetric reproduction of either image.

## Delivered source and pipeline
- tools/build_rigged_hero.py: standard-library-only, headless deterministic GLB builder
- assets/models/river_explorer_rigged.glb: generated glTF 2.0 binary
- assets/models/river_explorer_manifest.json: generated SHA-256 and counts
- data/hero-model.js: generated embedded base64 GLB; no fetch or remote import at runtime
- src/rigged-hero.js: independent minimal skinned loader using the game's local glTF parser and bundled Three.js
- src/hero-character.js: the original procedural fallback, preserving controls, save slots, and 2D mode
- src/hero-stage.js: isolated Character Studio uses the same ValleyHero.create() entry point.

Run from game/:

    python3 tools/build_rigged_hero.py
    npm test
    npm run build

npm test regenerates the asset using pretest, and the offline builder regenerates it before inlining the game's scripts. A production workflow synchronizes the verified binary and embedded JS to the main branch after merge.

## Model specification
- glTF 2.0, right-handed, Y-up, forward -Z. Unit system follows the existing browser game: approximately 16.7 character-world units tall.
- 17 named humanoid joints; one glTF skin with explicit 4x4 inverse bind matrices.
- Deformation-capable mesh primitives using JOINTS_0 (uint16) and normalized WEIGHTS_0 (float32), including continuous torso, knee and elbow transitions.
- Original metallic/roughness materials for technical shirt, cargo, backpack and straps, face covering, boots, skin, metal buckles, gold chain, hair, and glasses. No copyrighted or external textures.
- Nine glTF clips: Idle, Walk, Run, Sprint, FishingCast, Cook, Track, Drive, Interact. Runtime controls the same twelve original game states including jump/land/farm via deterministic procedural pose blending.

## Runtime
The player, the seated driver and Character Studio share one GLB decode path but create independent skeleton instances. Each renderer group holds a real THREE.SkinnedMesh bound to its scene's bone hierarchy. Runtime pose transitions remain damped; the right-hand bone owns rod, binocular and spoon mounts. Action equipment only appears in the corresponding activity.

Ground alignment uses the actual in-game terrain sampler, the character's world position and heading, and a clamped two-bone hip/knee solve with an ankle counter-rotation. It is approximate ground contact, not a guaranteed non-sliding foot lock, full-body IK or physically simulated locomotion. The solver uses shallow terrain offsets and a conservative step clearance. It does not treat the game's illustrative elevation as an engineering survey.

## Verification boundaries
Tests validate GLB binary headers, material primitives, skin weights, bone/clip inventory, runtime SkinnedMesh creation, tool mounts, sampler integration and offline precache. Headless desktop/mobile software-WebGL smoke tests explicitly require heroSkinned=true, and preserve screenshots. These are automated checks, not a claim of artistic parity with the concept art, hardware GPU performance, or iPhone Safari certification.

Release failure must not be concealed by the procedural fallback: browser smoke fails if a skin cannot instantiate. The procedural fallback remains available to actual players as an accessibility/reliability path. For human look development, inspect silhouette, elbow/knee deformation, gaiter motif, facial expression limits, grass/slope foot contact, prop orientations and driving seat clearance.
