# Nerfstudio configuration and COLMAP SQLite database audit

**River Valley video-game research worker.** November 23, 2026. This document describes real upstream formats and code delivered in the repository, not the result of a new courthouse GPU reconstruction.

## 1. COLMAP SQLite: data model and audit

COLMAP stores feature extraction and matching in `database.db`, typically with these tables (newer versions have additional rigs/frames):

| Table | Meaning | Validation in `colmap_database_audit.py` |
| --- | --- | --- |
| `rigs` | multi-sensor groups | count if present (optional for older COLMAP) |
| `frames` | frames/exposures of rigs | count if present |
| `cameras` | intrinsics shared by images | positive camera ID, image dimensions, finite float64 params blob |
| `images` | image ID, relative filename, camera relation | positive nonzero IDs, known camera, path stays relative |
| `keypoints` | per-image 2D feature location/geometry | `rows×cols×4` bytes (float32); 2/4/6 columns |
| `descriptors` | per-image feature descriptors | `rows×cols` bytes. `cols` is **bytes per descriptor**, e.g. SIFT 128 bytes, float32 ALIKED 512 bytes |
| `matches` | raw feature correspondence candidates | `rows×2×4` bytes (uint32) |
| `two_view_geometries` | geometrically checked image correspondences | `rows×2×4` bytes (uint32), configuration, optional F/E/H matrices |

Every `image_id` and `camera_id` must be positive. The row-major image pair ID is encoded from the **sorted** image IDs as `pair_id = 2_147_483_647 * smaller_id + larger_id`. This preserves sparse unordered image IDs; do **not** assume IDs are contiguous. The matrix blobs F, E and H are float64 3×3 row-major values.

**Important distinction:** `matches` alone is not the geometry used to reconstruct cameras. COLMAP maps using verified relationships in `two_view_geometries`. A strong verified pair graph is a useful pre-mapping diagnostic, but it is **not** a claim that the mapper has registered all those images. Registered camera poses live in the reconstructed sparse model (`cameras.txt`, `images.txt`, `points3D.txt` or corresponding binary files), and must pass the existing separate registration/error gate.

The auditor reads the real file through SQLite `mode=ro` plus `query_only`, checks references, blob lengths, match-pair indices and graph connectivity with bounded work, and reports coverage against the submitted image count. It will **not** manufacture camera poses, alter the database, import raw matches as verified, or approve a game asset.

### Commands

```bash
# Can inspect a previously generated real COLMAP database without COLMAP installed.
python game/tools/colmap_database_audit.py \
  --database workspaces/courthouse-game-turntable/database.db \
  --expected-images 32 --min-verified-inliers 15 \
  --output workspaces/courthouse-game-turntable/colmap-db-audit.json

# The existing worker also exposes the same audit.
python game/tools/reconstruction_engine.py db-audit \
  --database workspaces/courthouse-game-turntable/database.db \
  --expected-images 32
```

The reported historical result for the 32 **rendered game-model** images was eight registered cameras. A database diagnostic may explain image matching and connectivity, but it cannot convert this into 32 registered cameras or a physical courthouse reconstruction. The separate 9/10 benchmark with 0.42px error remains a different dataset and must not be combined.

### When the database looks healthy but SfM still registers few cameras

Check image overlap, baseline and camera-angle diversity, exposure/blur, repeated brick/window textures, scene masks, camera calibration groups, large reflective surfaces, large homogeneous regions, and whether there is enough parallax. A turntable of a synthetic game mesh can have repeated views or a poorly textured/background-dominated object. This is an **investigation checklist**, not an assertion about the unrecovered files.

## 2. Nerfstudio configuration options

The upstream training grammar is `ns-train METHOD [method options] [dataparser] [dataparser options]`. The current official configurations are typed dataclasses exposed through Tyro CLI. For options inspect `ns-train --help`, `ns-train nerfacto --help` and `ns-train splatfacto nerfstudio-data --help` **on the installation actually used**.

The implemented generator is `game/tools/nerfstudio_profiles.py`.

| Profile | Method | Iterations | Approximate VRAM | Purpose |
| --- | --- | ---: | ---: | --- |
| `nerfacto-preview` | `nerfacto` | 2,500 | GPU dependent | camera-and-appearance prototype |
| `splatfacto-balanced` | `splatfacto` | 15,000 | ~6 GB | balanced rasterizable Gaussian scene |
| `splatfacto-cinematic` | `splatfacto-big` | 30,000 | ~12 GB | high-detail **review**, not a shipping guarantee |

**Config knobs implemented:** `--max-num-iterations`, local TensorBoard logging (`--vis tensorboard`; no public viewer), local `--output-dir` and `--experiment-name`, and `nerfstudio-data --eval-mode fraction --train-split-fraction 0.9` (10% held out for evaluation). The generator also allows interval or filename splits explicitly. A filename split requires curated train/eval file names. `--eval-mode all` is deliberately excluded because it would not provide independent held-out evaluation.

For cinematic Splatfacto, the documented flags `--pipeline.model.cull_alpha_thresh=0.005` and `--pipeline.model.continue_cull_post_densification=False` prioritize retaining faint Gaussians and detail at higher cost.

**Camera/scene options to review per dataset:** `orientation_method` (`up`, `pca`, `vertical`, `none`), `center_method` (`poses`, `focus`, `none`), `auto_scale_poses`, `downscale_factor`, camera model/intrinsics, `scene_scale`, training/evaluation split and geometry initialization. The current COLMAP converter preserves the recovered **local world axes**, not a georeferenced EPSG 2966/NAVD88 coordinate system. Do not disable auto orientation/scaling without validating object placement and scene bounds.

### Important new improvement: COLMAP sparse 3D point initialization

The exported Nerfstudio dataset now writes a validated `sparse_points.ply` from actual COLMAP `points3D.txt` if at least three finite, sufficiently low-error XYZ/RGB points remain; `transforms.json` includes `ply_file_path` and the count. For Splatfacto, the command adds `nerfstudio-data --load-3D-points True` **only if** this PLY exists. This can improve Gaussian initialization versus random positions, but the point cloud still has only local reconstruction scale and must not be presented as survey-aligned physical geometry.

### Commands

```bash
python game/tools/reconstruction_engine.py profiles
python game/tools/nerfstudio_profiles.py --list

# Preview the planned GPU job; no native commands execute here.
python game/tools/nerfstudio_profiles.py \
  --profile splatfacto-cinematic \
  --dataset workspaces/courthouse-game-turntable/nerfstudio \
  --output-dir workspaces/courthouse-game-turntable/nerfstudio-output \
  --iterations 30000

# Full worker: only runs if real photo inputs and COLMAP/OpenMVS/Nerfstudio/CUDA exist.
python game/tools/reconstruction_engine.py run \
  --images datasets/courthouse-game-turntable/images \
  --workspace workspaces/courthouse-game-turntable \
  --kind rendered_game_asset --license-id PROJECT_GENERATED \
  --appearance gsplat --appearance-profile splatfacto-cinematic \
  --timeout 14400
```

Nerfstudio Splatfacto uses `gsplat` and CUDA and trains on photographs, not screenshots of one unchanged underlying still. An older CUDA-free host cannot honestly run gsplat; the existing `cpu_volume.py` is an entirely separate experimental numerical fallback.

## 3. What the game can and cannot consume

The **physical mesh** path remains COLMAP camera poses → OpenMVS dense mesh/refine/texture → candidate GLB → reviewer → geometry/texture/LOD/collision checks → explicitly approved game import. A Gaussian splat is a separate scene-appearance representation; a Splatfacto `.ply` is **not** automatically a collision mesh, GLB, or compatible Three.js shader asset. Nerfstudio supports `ns-export gaussian-splat --load-config CONFIG --output-dir PATH` on compatible trained splats; this does not promote it into the playable game.

The agent records input SHA-256, COLMAP database counts/graph, sparse camera quality, Nerfstudio data-frame/point count, per-native-program log files, training command and config receipt. Source class remains explicit: rendered game model, independent benchmark photographs or physical landmark. No automatically synthesized evidence and no auto-promotion of experimental meshes.

## 4. Verification gates and outstanding limitations

- Synthetic SQLite tests prove schema interpretation, invalid binary data, referential integrity and match-graph diagnostics; they do **not** stand in for inspecting the missing real courthouse `database.db`.
- Training configuration tests prove command construction without pretending to execute CUDA.
- The existing native pipeline still needs a real machine with COLMAP, OpenMVS and GPU/Nerfstudio for a complete reconstruction/evaluation run.
- Capture quality remains decisive: 8/32 registered game-asset views remains below the default 75% camera-coverage threshold.
- No new physical courthouse geometry, geodetic alignment, production glTF texture library or photoreal character was generated by the database investigation.

## Official upstream references

- [COLMAP Database Format](https://colmap.github.io/database.html)
- [COLMAP Text and Binary Reconstruction Output](https://colmap.github.io/format.html)
- [COLMAP Command Line](https://colmap.github.io/cli.html)
- [Nerfstudio Customizable Configs](https://docs.nerf.studio/developer_guides/config.html)
- [Nerfstudio Training CLI](https://docs.nerf.studio/reference/cli/ns_train.html)
- [Nerfstudio Dataparser Configuration](https://docs.nerf.studio/_modules/nerfstudio/data/dataparsers/nerfstudio_dataparser.html)
- [Nerfstudio Splatfacto](https://docs.nerf.studio/nerfology/methods/splat)
- [Nerfstudio Evaluation](https://docs.nerf.studio/quickstart/first_nerf.html)
