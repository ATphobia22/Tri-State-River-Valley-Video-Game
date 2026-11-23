# RIVER_LOD0_RIGGED Intake Playbook
**Issue:** #22  
**Date:** 2026-11-23  
**Rule:** Never treat a screenshot or video as mesh source. Never auto-promote.

## Current production contract (do not break)
- 27 joints, 13 named animation clips
- Self-contained GLB (no external buffers or image URIs)
- UV0 present, embedded PBR textures preferred
- Runtime loader + hand/tool attachment points assume game-native bone layout
- Canonical file today: procedural / game-built `river_explorer_rigged.glb` (do not overwrite until full QA passes)

## Required source artifacts (user must supply)
1. Artist source: `RIVER_LOD0_RIGGED.fbx` **or** `.blend` (preferred) with armature, weights, UVs, materials.
2. Optional: exported reference GLB from Blender (glTF 2.0, embedded).
3. SHA-256 of the exact source file and a short rights note (who authored, license to use in this private/public game).

Screenshot and 10 s video are **visual targets only**. They cannot be converted into a valid skinned mesh.

## Intake sequence (run in order)

```bash
# 1. Place candidate under a non-production path
mkdir -p game/art/candidates
# copy RIVER_LOD0_RIGGED.glb (or export one) → game/art/candidates/

# 2. Structural audit (must pass before any loader change)
python game/tools/audit_river_candidate.py \
  game/art/candidates/RIVER_LOD0_RIGGED.glb \
  --baseline game/assets/models/river_explorer_manifest.json \
  --max-triangles 45000

# 3. Production gate (joint count, clips, UV, textures)
python game/tools/intake_character_candidate.py \
  game/art/candidates/RIVER_LOD0_RIGGED.glb \
  --baseline game/assets/models/river_explorer_manifest.json \
  --out game/art/candidates/intake-receipt.json

# Expect status STRUCTURAL_PASS_REQUIRES_VISUAL_AND_DEFORM_QA
# or REJECT with explicit blockers. Automatic promotion is always false.
```

## Acceptance checklist before replacing the live hero
- [ ] `audit_river_candidate.py` and `intake_character_candidate.py` both pass (or documented exceptions only).
- [ ] Skeleton mapping table written: source bone → 27 game joints (or explicit retarget adapter).
- [ ] All 13 clips retargeted or re-authored; root motion constrained.
- [ ] Hands: left/right grip, fishing rod, steering, gardening, cooking IK targets tested.
- [ ] Feet: plant locks, slope pitch, no hyperextension, teleport/vehicle reset works.
- [ ] Visual QA: front / ¾ / side / back / glasses+gaiter close-up on desktop + phone-sized Chromium match Blender target proportions and materials.
- [ ] Offline package rebuild + checksum update + CI green.
- [ ] Physical iPhone Safari + Windows Chrome frame report captured.

## Runtime adaptation options
1. **Preferred:** Normalize the source in Blender to the existing 27-joint / 13-clip contract, then drop-in replace after QA.
2. **Alternative:** Add a thin skeleton-mapping layer in `rigged-hero.js` / `model-loader.js` that remaps joints and clips at load time. Keep the procedural hero as fallback until mapping is proven.

## Explicit non-goals
- Reconstructing geometry from the provided screenshot.
- Claiming the current synthetic GLB *is* the Blender master.
- Auto-overwrite of production assets from any script.

When the real source file is available, drop it in `game/art/candidates/` and re-run the two Python gates above. Then open a PR that contains only the new GLB + mapping table + QA evidence.
