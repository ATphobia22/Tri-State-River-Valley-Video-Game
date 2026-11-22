# River Explorer v1.12.1 — Live rig and embedded texture repair

## Confirmed defect
The source GLB contains one skinned mesh, a 27-joint skeleton, 13 named animation clips, and eight project-original 128×128 PNG texture images in its GLB BIN chunk. The former `src/rigged-hero.js` reconstructed the mesh and bones but ignored `material.pbrMetallicRoughness.baseColorTexture`, always synthesizing separate runtime canvas textures. Existing tests counted SkinnedMesh objects and procedural maps, which did not verify that the baked artwork reached the renderer.

## Corrected runtime behavior
- Read the source texture index, source image and bufferView from the actual GLB; reject external URIs and out-of-range data.
- Decode PNG bytes through a local `Blob` URL, assign the image as the skinned material's sRGB base-color map, and revoke each blob URL when finished. Preserve prior purely local procedural materials as compatibility/error fallbacks.
- Report independent expected, loaded and failed embedded texture counts via `RiverValleyDebug.getState().heroEmbeddedTextures`, with corresponding Character Studio counts. Browser acceptance now requires eight loaded textures and zero failed loads.
- Add the optional **Show live 27-joint skeleton overlay** Character Studio control. It uses `THREE.SkeletonHelper` over the actual animated hierarchy, not a decorative diagram, and remains off in gameplay. The browser test validates the observed helper bone count and saves a visual screenshot.
- Bump the hosted and multi-file offline cache IDs to `1.12.1` so new content cannot silently share the previous cache namespace.

## What this repair does not claim
The source sculpt is still a stylized, original procedural model. These embedded textures are subtle fabric/skin/nylon/leather microdetail, **not a photogrammetric or artist-sculpted photorealistic character**. The repair does not add external game assets, a Unity conversion, more bone joints, or an independently measured iPhone FPS increase.

## Evidence and release gate
`npm --prefix game run build`, `npm --prefix game test`, desktop and phone-sized Chromium WebGL character inspection, the software-rendering matrix and offline save-replay must all succeed before merging. GitHub Pages must deploy independently and the public site must serve `V1.12.1`. Installed PWAs can continue to display an already-open page until it reloads; update check, app restart and online refresh may be necessary.
