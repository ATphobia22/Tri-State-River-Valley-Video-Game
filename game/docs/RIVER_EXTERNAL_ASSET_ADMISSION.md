# River surface-master admission gate

The public game currently ships an independently generated, deterministic `river_explorer_rigged.glb`, synchronized to `game/data/hero-model.js` and the offline and hosted bundles. The in-game manifest specifies a 27-joint skinned rig, 13 named gameplay actions, and a 17,730-triangle runtime mesh. **Do not replace those files directly with an unrelated GLB.** The normal build regenerates the canonical hero asset, so a loose binary replacement is not persistent.

## Inspect a candidate without modifying the release

```bash
python3 game/tools/audit_river_candidate.py /path/to/river_candidate.glb \
  --baseline-manifest game/assets/models/river_explorer_manifest.json \
  --max-triangles 25000 --strict
```

The command prints a JSON receipt containing SHA-256, triangle/vertex/bone/animation/image counts, and blockers. It never copies, transforms, deploys, or writes the candidate. Omit `--max-triangles` for **studio-only** high-resolution inspection; that does not make the high-resolution mesh runtime-ready.

The separately described **69,120-triangle, 13-bone, six-clip** River cannot simply replace the current **27-joint, 13-clip** gameplay asset without retargeting, action coverage, and lower-detail mobile runtime geometry. Keep the detailed Blender mesh as an editable candidate, then produce a separate compatible runtime LOD/rig or explicitly update all affected animation consumers. Preserve the source art and hashes; do not invent missing source files.

## Promotion checklist

1. Acquire the actual candidate GLB and editable Blender master. Record SHA-256 and asset rights. Inspect its UVs, normals, skins, texture maps, and action tracks.
2. Retarget the rig or update controller mappings for idle, locomotion, jumping, terrain foot locks, hand grips, fishing, driving, and other game actions. Cover mismatches with regression tests.
3. Derive the lower-detail runtime mesh and perform actual Blender and browser import. Review four-angle poses and close-ups, not just GLB JSON.
4. Update the deterministic source generator, not only the built GLB. Regenerate the GLB, manifest, base64 offline model, offline HTML, hosted HTML, and PWA cache in one reproducible build. Run game unit tests, offline replay tests, and rendered browser checks.
5. Merge only a passing PR, verify workflow results on the actual main commit, inspect the deployed Pages character, and separately evaluate physical-phone performance.

This tool provides **static validation only**. It is not proof of Blender reimport, visual likeness, GPU rendering, animation retargeting, or public deployment.
