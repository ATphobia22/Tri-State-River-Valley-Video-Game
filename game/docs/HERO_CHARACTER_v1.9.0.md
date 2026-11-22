# River Valley Family Adventure — Hero and Animation Release v1.9.0

## Identity and art direction

River the Explorer is a fictional family-friendly protagonist. The user supplied reference images of an action-figure design and separately generated an illustrated character turnaround and animation-pose sheet. The sheets established the recognizable look: short curled dark hair, glasses, a black neck gaiter with a pale skull motif, a gold chain, black shirt, gloves, cargo pants, boots and a practical outdoor backpack. The actual game model is **new, code-authored geometry** and is deliberately less detailed than the illustration.

The references are design guides; they are not an imported animated model or motion-capture data. No third-party rig, online GLB dependency, face-scan or external image texture is needed for this release.

## Implemented game character

The new module src/hero-character.js exports a stable character profile, a pure animation pose sampler, and a create(THREE) scene-graph constructor. The hero has:
- 21 instanced stylized hair curls, separate head and gaiter geometry, glasses and bridge;
- a black technical shirt, cargo pockets, belt, separate gloves/hands and boot laces;
- an actual curved gold-colored chain with PBR material;
- an original adventure backpack with straps, flap and clasp;
- articulated shoulders, elbows, hips, knees, torso, head and backpack.

A driver-sized instance of the same character sits in the vehicle cabin. Vehicle windows were changed to translucent materials to make this driver more visible to the following camera.

## Animation state coverage

| State | Visible animation |
| --- | --- |
| idle | breathing, slight head turn, backpack sway |
| walk | opposing arm and leg motion, knees and foot rhythm |
| run / sprint | stronger gait, arm pumping and torso lean |
| jump / land | two cosmetic key poses activated by J; not yet a physics jump |
| interact | bending and reaching |
| farm | crouching to plant or collect crops |
| fish | holding an animated fishing rod and reel |
| hunt | non-graphic wildlife tracking, binoculars and stable arm aim |
| cook | crouched cooking, spoon and arm motion |
| drive | seated posture and hands forward near the wheel |

All poses use damped interpolation to limit snapping. They use current in-game activity and movement state rather than replacing gameplay with a separate panel. The same local save-state and coin/inventory systems remain in place. The player re-enters walking mode when starting an outdoor activity from a vehicle.

## Testing

- Test-driven-development: red test for a missing hero module was followed by the working constructor and animations.
- Node tests check design features, deterministic walk cycles, pose coverage, correct activity props, game wiring and independence of driver/walker instances.
- A full build and JavaScript/Python suite validates existing gameplay, geometry, offline packaging and GitHub Pages.
- The repo's headless dependency audit requires the hero module to be cached and bundled locally.

## Scope and future quality gates

This is a **procedural, articulated Three.js character**, not a cinematic scanned mesh, skinned humanoid glTF, mocap actor, or native Unreal/Unity skeletal animation. No exact facial identity or physical simulation is claimed.

Future production:
1. Build/export a skinned, animation-clip GLB with a humanoid skeleton and normal-map atlases.
2. Add blend-tree movement and foot placement on uneven terrain.
3. Rework fishing line hand constraints, cooking/tool interactions, and driving steering wheel rotation.
4. Add customizable outfits and facial expression variants.
5. Capture verified mobile Safari and Windows GPU gameplay and inspect material/pose readability in the real game.
