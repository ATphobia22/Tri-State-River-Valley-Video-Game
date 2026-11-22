# River Valley v1.13.0 — Character and Intro Asset Integration

## Source fidelity
The user-provided River Explorer, Scout and equipment GLBs contain vertex-color geometry, not authored bones, animation clips, UV atlases or PBR image textures. The master GLB combines these static objects. Their geometry is usable but must not be mislabeled as already rigged or photorealistic.

## Runtime upgrades
- LOD0/LOD1/LOD2 are separately generated 27-joint, 13-clip game characters. Visual quality selects actual mesh complexity; no network services are required.
- Character Studio supports local custom *rigged* GLB selection with strict 27-joint/13-clip verification, COLOR_0 rendering, device-local persistence and a built-in restoration control. Raw unrigged uploaded files must be converted first.
- Scout panel supports source-colored static dog geometry, with the original articulated Scout immediately restorable. The uploaded Scout GLB has no leg rig.
- The opening screen optionally imports a user-owned MP4 intro into local IndexedDB for offline playback. Start plays the video with its own mixed music; Skip returns to gameplay. The user-supplied Home Sweet Home media is **not in GitHub** and must be selected locally. Media remains on device.
- Uploaded equipment props remain a source-only asset until placement and interaction QA.

## Measured input geometry
Source hero: 3,672 vertices / 7,112 triangles; Scout: 484 / 900; equipment: 822 / 1,580. The auto-skin prototype download has 27 generated joints and 13 basic clips, but automatic weights require posed visual QA and cannot substitute for authored Blender skin weights.

## Release gates
Run game build, Node/Python tests, full headed desktop/mobile Chromium, 24-condition SwiftShader matrix, offline replay, Pages build/deployment and independently verify public release marker. Passing software-WebGL CI is not proof of native iPhone FPS or a faithful photorealistic match.
