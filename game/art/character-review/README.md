# River and Scout character review

[Watch the graded walk](cast-graded.mp4) or inspect [a Blender frame](pose.png). These are candidate assets for art and device review.

| Asset | Geometry | Rig | Actions |
|---|---:|---:|---|
| River | 18,728 triangles | 27 joints | 13 named game actions |
| Scout | 6,272 triangles | 16 joints | Idle, Walk, Run |

River uses the more detailed uploaded auto-skin cage as its starting point. The tiny v2 boxes supplied too little surface detail. The build bevels the cage, unwraps it, bakes source color and builds rounded finger, boot, glasses and gaiter components. Connected rigid garments and props have component-specific assignments. Game actions come from the repository's playable River and are sampled onto the target bones in Blender. The shared body surface has a baked color atlas and tiled normal and packed roughness/metallic maps. The added components use material factors. Scout has new lofted geometry, a segmented neck and head, four weighted leg chains, a tail, UVs and embedded surface maps.

From this directory, with Blender 4.3 and Natron 2.5 on PATH:

```sh
mkdir -p review/graded
blender -b --python-exit-code 1 -P tools/build_cast.py -- review
blender -b --python-exit-code 1 -P tools/build_river.py -- sources/river_explorer_autoskin27.glb ../../assets/models/river_explorer_rigged.glb review
blender -b --python-exit-code 1 -P tools/verify_cast.py -- review
RIVER_CAST_OUTPUT="$PWD/review" NatronRenderer -t "$PWD/tools/composite_cast.py" </dev/null
NatronRenderer --opengl disabled -w Write1 1-24 "$PWD/review/cast-review.ntp"
ffmpeg -framerate 24 -i review/graded/cast-%04d.png -vf 'crop=480:360:0:ih-360' -pix_fmt yuv420p review/cast-graded.mp4
```

The deformation report samples 17 times per exported action. Edge ratios measure stretch within triangles. A separated rigid sleeve can preserve edge lengths perfectly. The metric therefore needs a silhouette and contact review. River's hands, garment transitions, likeness, foot contact and grip placement still need work. Scout's isolated walk does not test terrain contact or following behavior in gameplay. Both candidates need a physical iPhone run in the game with traceable asset hashes before replacing defaults.
