# Offline character / VFX source intake (2026-11-23)

This is a **game-specific asset-intake review**, not a change to the independent Tri-State Systems Manager engineering digital twin. The newly uploaded sources use several `Tri-State Systems Manager` / `Digital Twin` names but have not been established as authoritative terrain or as a functioning cinematic render pipeline.

## Confirmed user-upload checks

| Source | Inspection result | Game release decision |
| --- | --- | --- |
| `river_explorer_hero_v2.glb` | 17 joints named `Joint_0`…`Joint_16`; one `Idle_Breathing` animation; 168 unique position vertices; 7 repeated geometry primitives; no images or textures | **Reject as replacement for 27-joint, 13-action player hero** |
| `river_valley_characters_master_rigged_v2.glb` | Binary-identical to hero v2; does **not** contain other characters | Do not describe as a multi-character master |
| `scout_companion_dog_v2.glb` | 9 joints; one `Idle_Breathing` clip; 72 unique position vertices; three repeated geometry primitives; no texture images | Reference/test asset, not a locomotion-complete canine |
| All three v2 GLBs | Binary chunk type `BIA\\0` rather than required `BIN\\0` | Run `tools/repair_known_bia_glb.py` into a **new path**, then validate. Format repair does not invent animations or polygons |
| `blender_3d_digital_twin_scene.py` | Script makes a flat plane and four hard-coded placeholder buildings; does not read a DEM or georeferenced vector | Not a real Mount Vernon terrain render and not a game cutscene asset |
| `blender_natron_bridge_pipeline.py` | Creates a status manifest but invokes neither Blender nor Natron; uses `/workspace/scratch` path | `READY_FOR_EXECUTION` is not evidence of rendering |
| `natron_master_vfx_compositor.nt` and `natron_aces_color_pipeline.py` | Describe desired OCIO/EXR/SDR/HDR nodes; no actual render, output pixels or Natron plugin-load proof | Mark **PROPOSED_NOT_RENDER_VERIFIED**, not production-ready |

## Usage and required acceptance

The primary game remains a Three.js/WebGL downloadable offline HTML. Natron is **offline video/film post-production tooling**, not a renderer embedded in the browser, and should not be packaged into the iPhone PWA. A successful Blender/Natron render would be exported separately as a short encoded video and imported into the existing **local intro media** picker. Keep audio rights and user opt-in distinct; the user's own music must not be silently published into an open repository.

1. Validate **actual** input mesh data and rig. Run `python3 game/tools/audit_uploaded_character_glb.py path/to/asset.glb --require-gameplay` before attempting a player swap. The game contract has 27 semantic joints and 13 named action clips; model compatibility does not guarantee smooth deforming or adequate visual resemblance.
2. For this single observed chunk-header defect only, run `python3 game/tools/repair_known_bia_glb.py source.glb fixed.glb`; never modify original files. Run Khronos glTF-Validator on the repaired export independently before 3D import.
3. For a cinematic, provide a **real** .blend scene and geospatial/geometric inputs where applicable. Verify available Blender version, NatronRenderer version and plugins, OCIO configuration, asset paths, camera, lighting, frame range and complete EXR frame files.
4. Ensure Blender scene-linear EXR is correctly interpreted by Natron's matching OCIO configuration. Do not label a generic floating-point EXR as a mastered HDR10 video; finishing requires an actual supported transfer encoding, colorspace, container/codec and mastering inspection.
5. Verify successful offline MP4/HEVC/H.264 browser playback on iPhone and desktop, synced sound, a Skip action and normal game launch. Preserve original playable character until custom rig passes walk/run/jump/driving/fishing/hunting and mobile performance screenshots.
6. Obtain rights and approvals before distributing family-person reference imagery or soundtrack through public GitHub Pages; the cast JSON is metadata-only and does not publish the original images.

## Research references

- [Khronos glTF 2.0 skin and animation specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)
- [Official glTF-Validator](https://github.com/KhronosGroup/glTF-Validator)
- [Natron background/command-line rendering documentation](https://natron.readthedocs.io/en/rb-2.6/devel/commandline.html)
- [Blender OpenColorIO documentation](https://docs.blender.org/manual/en/latest/render/color_management/opencolorio.html)
- [Make-It-Animatable paper](https://arxiv.org/abs/2411.18197) — research option for future rig/weight generation, not a process executed here

### Independent verification still needed

No official Khronos full validation, Blender job, Natron graph execution, true PBR rebuild, 8 family-character skeletal mesh exports, or real iPhone visual parity has been completed by these changes. A green CI gate proves its stated tests only.
