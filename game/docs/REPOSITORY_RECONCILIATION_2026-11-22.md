# Game repository integration audit — 2026-11-22

Repository: [ATphobia22/Tri-State-River-Valley-Video-Game](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game). This inventory reviews the default branch at `2ba6a20bccdc1b379e8157b51471638cf6964405`, before the offline QA hardening proposed in PR #11. Audit scope is **this family/open-world video game**, not the separately maintained Tri-State Systems Manager engineering platform.

## Already incorporated in main

The gameplay PRs below were independently verified **merged** by GitHub's PR records and main was verified building and deploying successfully:
- [#4](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/4) — rigged hero / IK
- [#5](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/5) — fabric materials / foot stance
- [#7](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/7) — motion controller and camera
- [#8](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/8) — gameplay world collision, audio, performance recording
- [#9](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/9) — footprint collision and vehicle contact
- [#10](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/10) — Posey County atlas, Scout, hunting/fishing/farm/cooking and environments

These PRs were **squash-merged**. Their source branches still exist, but that does not mean their changes are missing from main. Blindly merging original source branches could reintroduce earlier game versions or stale generated assets. Do not rewrite or delete them without an explicit archival policy and review. Historical [#1 Evidence Graph](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/1) is also merged; its branch is strictly behind main.

## Unmerged engineering work intentionally held

- [Draft PR #2: PTDT EnKF/Bishop Evidence Graph adapters](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/2): two commits, no recent current-main CI proof, and two Python engineering files (`src/evidence/ptdt_adapters.py`, `tests/test_ptdt_adapters.py`). This is not a game feature. It requires a separate, validated engineering integration decision—preferably in the **Tri-State Systems Manager** repository rather than silently mixing flood/slope evidence with the video game. No merge authorization has been inferred from an unrelated game workflow passing.
- `feature/engineering-digital-twin-foundation`: divergent legacy engineering TypeScript branch, 15 commits ahead and 67 behind at audit time. It contains engineering evidence/ArcGIS files and no current game integration proof. Do not merge into the game without scope and regression review.

These exceptions are **retained** to avoid data loss and accidental product contamination; this audit is not a claim that every branch or PR was merged.

## Release verification / improvements

Main v1.10.0 release had [CI passed](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/actions/runs/45019376659), [offline artifact sync passed](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/actions/runs/45019376559), and [Pages deploy passed](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/actions/runs/45019376507).

[PR #11](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/pull/11) repairs the obsolete PWA offline browser test, reads the installed service-worker cache version, and adds **network-disabled offline save-slot / county-region / Scout replay** to both the game CI and Pages build gates. Its merge and production checks must be verified independently; this audit document does not assert its current status.

GitHub About description is configured, GitHub Pages is live, but the repository About **homepage/website** metadata was observed empty. [Issue #3](https://github.com/ATphobia22/Tri-State-River-Valley-Video-Game/issues/3) tracks the remaining owner-managed metadata correction.

## Boundaries not to overstate

A 2.5D polygon collision model is not a full 3D rigid-body physics engine. County atlas boundaries are source-based, but additional town scenes are interpretive local vignettes, not contiguous survey-grade Posey County elevation/road/building models. Physical iPhone Safari performance and network-disabled Windows browser experience require separate real-device evidence.
