# COLMAP Database Schema (Applied Toolchain)

COLMAP stores SfM state in SQLite (`database.db`). The applied River Valley reconstruction worker uses this schema via the official COLMAP CLI.

## Core tables

| Table | Role |
|-------|------|
| cameras | Intrinsics |
| images | Image rows and prior poses |
| keypoints / descriptors | SIFT features |
| matches / two_view_geometries | Pairwise geometry |

## Pipeline

1. feature_extractor
2. exhaustive_matcher
3. mapper → sparse model
4. Quality gate → Nerfstudio transforms.json (load_3D_points for Splatfacto)
