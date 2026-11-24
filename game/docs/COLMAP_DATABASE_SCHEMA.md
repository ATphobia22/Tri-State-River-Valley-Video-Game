# COLMAP Database Schema (Applied Toolchain)

COLMAP stores SfM state in a SQLite database (`database.db`). The applied River Valley reconstruction worker creates and uses this schema via the official COLMAP CLI.

## Core tables

| Table | Role |
|-------|------|
| `cameras` | Intrinsics: camera_id, model (SIMPLE_RADIAL / PINHOLE / …), width, height, params BLOB, prior_focal_length |
| `images` | Image rows: image_id, name, camera_id, prior_qw/qx/qy/qz, prior_tx/ty/tz |
| `keypoints` | Per-image feature locations (BLOB of float pairs) |
| `descriptors` | SIFT descriptor vectors per keypoint |
| `matches` | Pairwise feature matches (pair_id, data BLOB) |
| `two_view_geometries` | Essential/fundamental geometry for image pairs |

## Applied pipeline stages

1. **feature_extractor** — writes `cameras`, `images`, `keypoints`, `descriptors`
2. **exhaustive_matcher** — writes `matches`, `two_view_geometries`
3. **mapper** — reads the database + images, writes sparse model under `sparse/`

## Quality gate (post-mapper)

After `model_converter` to text, `sparse_quality()` requires ≥ 3 registered images, registration_fraction ≥ min_registration (default 0.75), mean sparse reprojection ≤ max_reprojection_px (default 2.0).

## Nerfstudio hand-off

Undistorted COLMAP poses are converted to Nerfstudio OpenGL C2W `transforms.json`, with optional SfM points for Splatfacto Gaussian initialization (`load_3D_points=True`).
