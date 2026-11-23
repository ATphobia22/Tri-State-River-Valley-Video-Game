# River Valley Game — branch and PR reconciliation, 2026-11-23

**Reconciliation baseline:** `main` at `25d7f7dfa131817697a144103d9ee68371b5a2bf`. Evidence: GitHub branch listing, REST compare/main...branch metadata, and a **Git blob-SHA file-tree comparison of every one of the 28 existing non-main branches** against this baseline. These comparisons are point-in-time; regenerate if heads move.

**Policy:** No blind branch bulk merge, no stale-copy replacement, no silent deletion. A file path existing on `main` does **not** prove its historical code was semantically integrated. GitHub's ahead/behind commit count after a squash merge also does not determine if functionality is missing. A branch with no ahead commits may still contain old files that were deliberately removed from `main`. Favor runtime behavior and independently passing tests over commit ancestry alone.

## Already merged from this work

| PR | Exact tested head | Main merge commit | Acceptance |
|---|---|---|---|
| [#28 — courthouse/roofs/source/rig admission](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/28) | `c3ed40eaa2e65fa63c20149efd4ea1d6b0239086` | `505bd34e3effd6967c559f850e7053355f6b311c` | [Green browser/game CI](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/actions/runs/45120491757), and green post-merge build/deploy on `505bd34` |
| [#30 — GLB/PBR + Blender bake authoring](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/30) | `da06466503b06885515f2edfe910fbf348cb9472` | `25d7f7dfa131817697a144103d9ee68371b5a2bf` | [Green PR CI](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/actions/runs/45123867684); merged. Post-merge checks were still running when this inventory began. |

## Exact source-tree classification

### A. Branches with no commits ahead of main (4)

- `feat/mount-vernon-3dep-open-world-20261123`
- `feat/v1-12-character-world-reconciliation`
- `feature/authoritative-evidence-graph`
- `fix/hero-embedded-texture-rig-proof-20261122`

These have **0 ahead commits**. The old engineering evidence graph is not in the current game root tree, so being a main ancestor does **not** mean its deleted or relocated code is active. Do not restore cross-project files through a blanket merge.

### B. Source work already squash-merged (2)

- `feat/mount-vernon-landmark-meshes-and-character-gate-20261123` → PR #28
- `feat/offline-gltf-pbr-blender-rig-20261123` → PR #30

Both feature branches have **0 file paths missing from current main**. The differences observed in exported game HTML, workflow and build source are attributable to independent subsequent commits and regenerated outputs; their squashed releases were validated before merge. They remain as Git refs because squash merge does not fast-forward the original branch.

### C. Historical gameplay branches with no missing file paths, but older content (18)

- `feat/posey-county-adventure-20261122`
- `feat/posey-leafon-2025-orthophoto`
- `feat/river-candidate-glb-audit-20261122`
- `feat/river-collision-suspension-20261122`
- `feat/river-explorer-lod-cinematic-assets-20261122`
- `feat/river-fidelity-remodel-20261122`
- `feat/river-foot-contact-materials-20261122`
- `feat/river-movement-contact-20261122`
- `feat/river-ref-sheet-art-pass-20261122`
- `feat/river-rigged-glb-ik-2026-11-22`
- `feat/river-water-cinema-20261122`
- `feat/river-world-physics-audio-20261122`
- `feat/unreal-art-lab-20261122`
- `feat/v1-12-world-visual-performance`
- `feat/v2-character-asset-validation-and-vfx-intake`
- `fix/hero-runtime-visibility-diagnostics-20261122`
- `fix/offline-game-pwa-release-gate-20261122`
- `perf/mobile-frame-pacing-hero-mesh-20261122`

All recorded file paths in these branch heads exist on `main` as of the baseline, but hashes of older copies differ. Current code already has terrain, road/county assets, river-water, audio, collision, offline packaging, character-rig, graphics, and performance modules. **Not an independent proof that every historic behavior was copied verbatim.** Their branches require any *specific* missing feature to be identified via regression tests, then forward-ported against current main—not merged wholesale. Reverting newer assets, model manifests, package builders, and service-worker versions would be unsafe.

### D. Competing feature branches with genuinely new paths (2)

| Branch / PR | What is unique | Decision |
|---|---|---|
| `art/v2-character-deformation-review` / [PR #25](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/25) | 14 absent paths: opt-in review GLBs for River and Scout, video, Blender pose/deformation reports, review scripts, and a second GLTFLoader bundle | **Preserve for independent art review.** Do not bulk merge changes to the live hero: introduces a competing loader, has separate binary sources, and lacks independent physical iPhone verification. Rebase/retest the opt-in review in isolation, verify original source rig, texture atlas, animation, deformation, artifact SHA-256 and on-device frame times. |
| `feat/courthouse-gis-mesh-rig-validation-20261123` / previously PR #29 | 8 absent paths: alternate runtime courthouse/roof-fidelity renderers, stage script, audit and tests | **Do not bulk merge.** Its previous CI had failed headed WebGL; the courthouse/roof features overlap green PR #28. A safer non-runtime staging utility is forward-ported in this reconciliation, reusing the current `intake_character_candidate.py` gate with immutable receipts and no production promotion. |

### E. Engineering code from a separate product scope (2)

- `feat/ptdt-enkf-bishop-binding` / [draft PR #2](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/2)
- `feature/engineering-digital-twin-foundation`

The former's complete branch snapshot references `src/evidence/evidence_graph.py` and other engineering APIs not present on current game main. The latter contains ~14 missing source/architecture files for engineering-digital-twin services/UI. They belong to the **independent Tri-State Systems Manager engineering platform review**, not an unreviewed reintegration into the offline video game. Keep isolated until migrated against that platform's current contracts, tests, provenance and regulatory boundaries. A PR whose root dependencies are absent must not be marked green just because the web game builds.

## Safe extracted work and next technical gates

- `game/tools/stage_character_candidate.py`: quarantines structurally valid, SHA-256-checked GLBs in `game/staging/character-candidates/`; rejects binary mismatches, missing source rig contract, malformed or incompatible assets, and outputs pointed at the canonical runtime asset/data folders. Not a rig auto-retargeter.
- `game/tests/test_character_staging_python.py`: tests eligibility, byte identity, no-overwrite, nonproduction flags and rejection of an unrigged courthouse model.
- **Remaining:** PR #25 independent review runtime and physical-device evidence; genuine high-resolution editable Blender source and correct 27-bone/13-clip deformation tests; measured roof/DSM geometry and facade reference QA; no direct branch deletions or retroactive closing of historical PRs were performed by this audit.
- Do not claim the website has deployed this staging change until its **new PR, exact-head CI, squash merge, post-merge build and GitHub Pages deploy** have each independently passed.
