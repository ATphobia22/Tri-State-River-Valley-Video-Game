# Courthouse photogrammetry pipeline — November 23, 2026

**Status: implemented adapters; native reconstruction and real-world source admission remain unverified.**

## Engines wired into the game development toolchain

COLMAP is invoked for CPU SIFT extraction, matching, incremental camera recovery, sparse quality reports, camera undistortion and model conversion. OpenMVS is invoked through InterfaceCOLMAP, DensifyPointCloud, ReconstructMesh, RefineMesh, TextureMesh and TransformScene to produce a textured GLB candidate. Nerfstudio and gsplat are optional CUDA paths: ns-train nerfacto and ns-train splatfacto respectively. A separate PyTorch CPU radiance-volume trainer lives at game/tools/cpu_volume.py and runs on pre-calibrated photographs.

The Python orchestration runs headlessly, records source-image SHA-256 receipts, captures per-stage logs, refuses existing nonempty output workspaces, and rejects poor COLMAP registrations before expensive dense work. The GLB stays a **review candidate**, never an automatic replacement for the production game model.

## Recovery boundaries

- The previous independent 10-image benchmark reported 9 registered cameras and a mean 0.42-pixel reprojection residual. These camera/file outputs are not currently present in this repository, so this is a prior reported outcome, not a new verification.
- The 32 rendered **game-model** turntable frames yielded only 8 registered cameras, or 25% coverage. That **fails** the worker's default 75% registration gate. These views do not reconstruct the real Posey County Courthouse.
- A prior Work run reported a textured OpenMVS/Blender GLB. Its bytes, original image set, license and calibration receipts are not currently available for independent audit.
- No complete, rights-cleared, overlapping all-around photo set of the actual courthouse was verified. No LiDAR-derived roof model or certified vertical datum is established.
- Sparse reprojection RMSE alone does not prove geographic accuracy, scale or roof correctness.

The game source of truth remains game/build_models.py, using artistic geometry plus an independently sourced Indiana GIO footprint objectid 741267. Do not label artistic heights or turntable appearance as physical measurements.

## Required software

Provision locally (not committed): COLMAP, OpenMVS with TransformScene, Python 3.12+, numpy, Pillow; optionally trusted CPU PyTorch. Nerfstudio splatfacto/gsplat is CUDA-oriented and does not run in this host's CPU-only test environment. Run 'python game/tools/reconstruction_engine.py doctor' to see which binaries are actually installed.

Install light adapter dependencies: 'python -m pip install -r game/tools/requirements-reconstruction.txt'.

## Source layout

Keep licensed images outside the public repository, for example:

    datasets/courthouse-game-turntable/images/view_000.png
    datasets/courthouse-game-turntable/images/view_001.png
    datasets/courthouse-game-turntable/provenance.json

The worker hashes only submitted local files; it performs no hidden web image acquisition and cannot infer photograph ownership.

## Commands

Inspect dependencies:

    python game/tools/reconstruction_engine.py doctor

Plan without executing native programs:

    python game/tools/reconstruction_engine.py plan --images datasets/courthouse-game-turntable/images --workspace workspaces/courthouse-game-turntable --kind rendered_game_asset --license-id PROJECT_GENERATED --appearance cpu

Execute only on a workstation with COLMAP and OpenMVS installed:

    python game/tools/reconstruction_engine.py run --images datasets/courthouse-game-turntable/images --workspace workspaces/courthouse-game-turntable --kind rendered_game_asset --license-id PROJECT_GENERATED --appearance cpu --min-registration 0.75 --max-reprojection 2.0

Other explicit source kinds are benchmark_photographs and physical_landmark. For CUDA appearance, use --appearance nerfacto or --appearance gsplat. The latter dispatches to Nerfstudio Splatfacto, backed by gsplat. No GPU-training claim is made unless the native command actually completes.

Train the standalone CPU radiance field when calibrated Nerfstudio transforms.json and photos exist:

    python game/tools/cpu_volume.py --dataset workspaces/courthouse-game-turntable/nerfstudio --output workspaces/courthouse-game-turntable/cpu_radiance.npz --steps 80 --rays 64 --samples 24

Synthetic algorithm-only CPU smoke (not courthouse reconstruction):

    python game/tools/cpu_volume.py --self-test --output /tmp/river-neural-synthetic --steps 20

The numerical CPU checkpoint is an experimental appearance field, **not** a collision mesh or game-ready GLB. It is not the Nerfstudio or gsplat engine.

Inspect a supplied GLB without importing it into the game:

    python game/tools/reconstruction_engine.py inspect-glb /path/to/candidate.glb

Open the opt-in GitHub Pages 'courthouse-review.html' viewer to review a locally selected GLB. It never uploads files or changes production models. Its Three.js loader is local; service workers remain disabled.

## Admission gate before game promotion

Verify input photograph source and rights, camera/pose coverage, measured control/scale, GLB structure, embedded textures, normals and coordinate axes. Register to the official Indiana GIO footprint (objectid 741267) and separately validate terrain/roof heights, unit scale, topographic datum and collision LOD. Require human visual review and WebGL/hardware smoke results. Only then may build_models.py be deliberately changed to incorporate an approved model. Rebuild all generated HTML outputs and validate the live Pages deployment independently.

Government orthophotography is useful for ground/roof appearance but does not supply hidden facade observations. Repeated map screenshots are not independent photographic viewpoints.

## References

- Indiana Current Imagery ImageServer (2022–2025; CC0): https://di-ingov.img.arcgis.com/arcgis/rest/services/DynamicWebMercator/Indiana_Current_Imagery/ImageServer
- Indiana Elevation Open Data: https://registry.opendata.aws/in-elevation/
- COLMAP CLI: https://colmap.github.io/cli.html
- OpenMVS Usage: https://github.com/cdcseacave/openMVS/wiki/Usage
- Nerfstudio camera conventions: https://docs.nerf.studio/quickstart/data_conventions.html
- Nerfstudio Splatfacto/gsplat: https://docs.nerf.studio/nerfology/methods/splat.html

Run tests with 'python -m unittest discover -s game/tests -p test_reconstruction_engine.py -v'. CI validates the adapters and Pages review-page packing but cannot perform full native photogrammetry without real binaries, photo inputs and sufficient compute.
