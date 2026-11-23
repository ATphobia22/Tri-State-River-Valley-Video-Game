# Blender → River Explorer → offline WebGL / PBR source contract

**Scope:** tools and runtime support for a future *genuine* Blender character source. This does **not** assert that uploaded screenshots, static turnarounds, 17-joint candidate meshes or a missing `.blend` source have been reconstructed. The production 27-joint/13-clip procedural rig stays intact until a real asset passes structural, animation, deformation and device gates.

## Why the example ES-module GLTFLoader is not used here

The game ships one single HTML with bundled Three.js r160 UMD and all GLBs as `window.ValleyRiggedHeroData` Base64. Its existing `src/model-loader.js` directly parses the decoded GLB's ArrayBuffer (GLTFLoader.parse-style binary ingestion) without URL/fetch/CDN or a second version of Three.js. The decoder now processes Base64 in **32 KiB chunks**, so the browser avoids allocating one enormous `atob` intermediate binary string, while preserving identical bytes and deterministic model hashes. This is an allocation improvement, not an independently measured iPhone memory reduction.

The skinned runtime now understands native **glTF 2.0 PBR textures**: base color in sRGB, tangent normal maps in linear data space, metallic/roughness in linear G/B, and AO in linear R. A single ORM texture is shared across the `roughnessMap`, `metalnessMap` and `aoMap` slots; `uv2` is mapped to UV0 for AO when the texture explicitly references `TEXCOORD_0`. GLB embedded texture images are decoded from BIN bufferViews (not fetched); `Texture.flipY=false` prevents glTF UV inversion. A candidate referencing a different UV channel must be reauthored rather than silently mapped to the wrong pixels. Embedded image load failures are counted, and the affected PBR channels are not falsely shown as loaded.

## Blender CLI, requires an actual editable skinned .blend file

```bash
blender --background /absolute/path/RiverExplorerMaster.blend \
  --python game/tools/blender_bake_hero.py -- \
  --out /absolute/path/out/river_explorer_candidate.glb \
  --size 1024 --samples 32
```

The script fails rather than fabricating: missing armature/27 named bones, missing 13 action names, absent UV0, transforms not applied, missing shader nodes, unsupported metallic nodes, missing glTF texture output, missing clip exports or external linked PNGs. It bakes diffuse COLOR-only albedo, tangent normals, ambient occlusion and roughness. The glTF packing is **R=AO, G=roughness, B=metallic**; metallic is a constant factor per baked mesh because Cycles has no direct metallic bake pass. Procedural metallic or multiple metallic factors on one submesh require a manually authored metallic atlas before running this tool. Each skinned mesh needs preauthored non-overlapping UVs; automatic atlas packing, retopology, bone retargeting and deform tests are **not** implemented by this script.

The script checks glTF after export, writes a `*.bake-receipt.json` with both the source Blender SHA-256 and candidate GLB SHA-256, and **does not overwrite** `assets/models/river_explorer_rigged.glb` or promote a candidate to the live game.

Then run:

```bash
python game/tools/intake_character_candidate.py /absolute/path/out/river_explorer_candidate.glb
npm --prefix game run build
python game/tools/audit_runtime_graph.py
python -m unittest discover -s game/tests -p test_blender_bake_contract.py -v
node --test game/tests/test-offline-rig-pbr.cjs
```

The game has a strictly local, size-limited custom-hero import path; a compatible GLB still must pass browser tests before becoming a release artifact. `npm run build` **regenerates the canonical gameplay hero**, so replacing that generated binary by hand is not a sustainable source-of-truth modification.

## Bone-mount props and existing foot IK

`ValleyRiggedHero.create(...)` already plays the game's actual 13 GLB action clips, skins geometry on the GPU, and applies deterministic foot-contact correction and procedural wrist grips **after** mixer update. The new `attachPropToBone` API accepts a project-created Three.js Object3D and finite local offsets:

```js
const lantern = new THREE.Group(); // or an actual local mesh
heroController.attachPropToBone('RightHand', lantern, {
  position: [.2, -.1, -.3],
  rotation: [0, 0, 0]
});
```

Attached props inherit the hand-bone transform during walking, casting and driving. The helper rejects unknown bone names and invalid offsets. On hero disposal it detaches external attachments but **does not dispose externally owned prop geometry/materials**. This avoids double free during LOD swaps. This API does not guarantee anatomical grip alignment; that requires rendered contact-frame verification for each tool. Foot planting was already implemented in `src/foot-plant.js`; it has world-space contact anchors, bounded two-bone knee/ankle correction and unstable-height safeguards. The current driver's grip is animation-driven and not a measured steering-wheel-target IK constraint.

## Release gates not claimed

- Real high-resolution photographed sculpt/retopology replacing the original procedural shape: **not done**.
- A master Blender source with validated weights and animation retargets for the uploaded v2 characters: **not present**.
- Live Blender bake/export executed on that source with 13 actions: **not run**.
- Fully modeled physical car steering column and hand-to-wheel target IK: **not yet verified**.
- Physical iPhone Safari GPU memory, thermal and latency measurements: **not verified**.

References: [Khronos glTF 2.0 material specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), [Blender glTF material export](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html), [Three.js GLTFLoader reference](https://threejs.org/docs/pages/GLTFLoader.html).
