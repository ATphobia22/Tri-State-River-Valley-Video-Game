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

## Point Township Family + Friends characters

Eight source-labeled figures (01 Pete Yeida, 02 Larry Goldman, 03 Richard Stratton, 04 Marcus Stevens, 05 Roy Tenney, 06 Bill Tucker, 07 Wally Wallace, 08 Allen Tucker) plus two **gallery-only** family collector sets are represented by user-supplied visual reference photos. The Yeida Family image includes commemorative "In memory of Tony" and "In memory of Jerry" text; no role or personal history is inferred beyond the packaging.

The game bundles a compact 17.7 KB JPEG sprite of all ten supplied photo references inside \`src/family-cast.js\`, so the **Family + Friends** gallery works in the standalone HTML without third-party image hosting. Imported higher-resolution photos are optional and stored only in the device's IndexedDB. No portraits are automatically uploaded.

Individual figures can select **stylized wardrobe prototypes** built on the original 27-joint, 13-clip playable rig. These change garments, colors, simple cap/beanie shapes, facial-hair geometry and procedurally generated fabric surfaces for driving/exploration and the studio. These are *not* scans of the real individuals, Blender-ready detailed remeshes, or claimed faithful visual likenesses; head geometry and other proportions are still shared. Neither family collector set is made into a playable character. The uploaded source photo JPEGs contain no rigging information.

Automated Node tests validate roster labels, unique photo sprite positions, offline JPEG bundling, reversible prototype attachment to a bone, and invalid photo rejection. Headed desktop and mobile-viewport Chromium must independently prove eight selectable options, actual skinned gameplay avatar changes, 27 bones, and restoration to River Explorer. Real-device iPhone visual comparison remains outstanding.
