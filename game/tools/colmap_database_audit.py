#!/usr/bin/env python3
"""Read-only COLMAP SQLite feature/match diagnostics; NOT a camera-pose extractor.

Supports COLMAP's historical six feature tables and newer optional rigs/frames.
Uses schema introspection and byte-size checks, not hard-coded table creation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import sqlite3
import struct

MAX_IMAGE_ID = 2_147_483_647
REQUIRED = ("cameras", "images", "keypoints", "descriptors",
            "matches", "two_view_geometries")
OPTIONAL = ("rigs", "frames")


def image_ids_to_pair_id(left: int, right: int) -> int:
    if not isinstance(left, int) or not isinstance(right, int) or not (
        0 < left < MAX_IMAGE_ID and 0 < right < MAX_IMAGE_ID
    ) or left == right:
        raise ValueError("COLMAP image pair requires distinct positive 31-bit IDs")
    a, b = sorted((left, right))
    return MAX_IMAGE_ID * a + b


def pair_id_to_image_ids(pair_id: int) -> tuple[int, int]:
    if not isinstance(pair_id, int) or pair_id <= 0:
        raise ValueError("Invalid COLMAP pair_id")
    b = pair_id % MAX_IMAGE_ID
    a = (pair_id - b) // MAX_IMAGE_ID
    if a < 1 or b <= a or b >= MAX_IMAGE_ID or image_ids_to_pair_id(a, b) != pair_id:
        raise ValueError("Invalid COLMAP pair_id encoding")
    return a, b


def _require_columns(conn: sqlite3.Connection, table: str, required: set[str]) -> None:
    columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    missing = required - columns
    if missing:
        raise ValueError(f"COLMAP {table} is missing columns {sorted(missing)}")


def _audit_arrays(conn, table, images, element_size, valid_cols):
    counts = {}
    for image_id, rows, cols, length in conn.execute(
        f"SELECT image_id, rows, cols, length(data) FROM {table}"
    ):
        if image_id not in images:
            raise ValueError(f"{table} contains unknown image_id {image_id}")
        if not isinstance(rows, int) or not isinstance(cols, int) or rows < 0:
            raise ValueError(f"{table} invalid feature dimensions for image {image_id}")
        if cols not in valid_cols and (not callable(valid_cols) or not valid_cols(cols)):
            raise ValueError(f"{table} invalid feature cols for image {image_id}: {cols}")
        if (length or 0) != rows * cols * element_size:
            raise ValueError(f"{table} blob length mismatch for image {image_id}")
        if image_id in counts:
            raise ValueError(f"{table} repeated feature entry for image {image_id}")
        counts[image_id] = rows
    return counts


def _audit_match_table(conn, table, images, max_pairs):
    cursor = conn.execute(
        f"SELECT pair_id, rows, cols, length(data){', config' if table == 'two_view_geometries' else ''} "
        f"FROM {table}"
    )
    pairs, usable, inlier_total = 0, [], 0
    for row in cursor:
        pairs += 1
        if pairs > max_pairs:
            raise ValueError(f"{table} has too many rows for bounded audit")
        pair_id, rows, cols, length = row[:4]
        image_a, image_b = pair_id_to_image_ids(pair_id)
        if image_a not in images or image_b not in images:
            raise ValueError(f"{table} refers to an unknown image")
        if not isinstance(rows, int) or rows < 0 or cols not in (0, 2):
            raise ValueError(f"{table} invalid match dimensions")
        if rows and cols != 2:
            raise ValueError(f"{table} match cols must be 2")
        if (length or 0) != rows * cols * 4:
            raise ValueError(f"{table} blob length mismatch for pair ({image_a}, {image_b})")
        if table == "two_view_geometries":
            configuration = row[4]
            if not isinstance(configuration, int):
                raise ValueError("two_view_geometries invalid configuration")
            if configuration > 0 and rows > 0:
                usable.append((image_a, image_b, rows))
                inlier_total += rows
    return {"pairs": pairs, "usable": usable, "inliers": inlier_total}


def inspect(path, *, expected_images=None, min_verified_inliers=15,
            max_pairs=250_000, hash_limit_bytes=128_000_000):
    path = Path(path)
    if not path.is_file():
        raise FileNotFoundError(f"COLMAP SQLite database not found: {path}")
    if path.is_symlink():
        raise ValueError("COLMAP database symlink is not accepted")
    if not isinstance(min_verified_inliers, int) or min_verified_inliers < 1:
        raise ValueError("min_verified_inliers must be positive")
    if not isinstance(max_pairs, int) or max_pairs < 1:
        raise ValueError("max_pairs must be positive")
    if expected_images is not None and (
        not isinstance(expected_images, int) or expected_images <= 0
    ):
        raise ValueError("expected_images must be positive")
    uri = path.resolve().as_uri() + "?mode=ro"
    conn = sqlite3.connect(uri, uri=True, timeout=10)
    try:
        conn.execute("PRAGMA query_only=ON")
        tables = {name for (name,) in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )}
        missing = set(REQUIRED) - tables
        if missing:
            raise ValueError(f"COLMAP database missing required tables: {sorted(missing)}")
        _require_columns(conn, "cameras", {"camera_id", "width", "height", "params"})
        _require_columns(conn, "images", {"image_id", "camera_id", "name"})
        for table in ("keypoints", "descriptors"):
            _require_columns(conn, table, {"image_id", "rows", "cols", "data"})
        for table in ("matches", "two_view_geometries"):
            _require_columns(conn, table, {"pair_id", "rows", "cols", "data"})
        _require_columns(conn, "two_view_geometries", {"config"})

        cameras = {}
        for camera_id, width, height, params in conn.execute(
            "SELECT camera_id,width,height,params FROM cameras"
        ):
            if camera_id <= 0 or width <= 0 or height <= 0:
                raise ValueError("Invalid COLMAP camera identifier or dimensions")
            if not isinstance(params, bytes) or len(params) < 8 or len(params) % 8:
                raise ValueError("Invalid COLMAP cameras params float64 blob")
            values = struct.unpack("<" + "d" * (len(params)//8), params)
            if not all(math.isfinite(v) for v in values):
                raise ValueError("Nonfinite COLMAP cameras params")
            cameras[camera_id] = (width, height)
        if not cameras:
            raise ValueError("COLMAP database has no cameras")

        images = {}
        for image_id, name, camera_id in conn.execute(
            "SELECT image_id,name,camera_id FROM images"
        ):
            if not isinstance(image_id, int) or not 0 < image_id < MAX_IMAGE_ID:
                raise ValueError("Invalid COLMAP image identifier")
            if camera_id not in cameras:
                raise ValueError(f"COLMAP image {image_id} references unknown camera")
            if not isinstance(name, str) or not name.strip():
                raise ValueError("Empty COLMAP image name")
            norm = name.replace("\\", "/")
            if norm.startswith("/") or ".." in norm.split("/") or ":" in norm.split("/")[0]:
                raise ValueError(f"Invalid COLMAP image relative path: {name}")
            if name in images.values():
                raise ValueError(f"Duplicate COLMAP image name: {name}")
            images[image_id] = name
        if not images:
            raise ValueError("COLMAP database has no image entries")

        keypoints = _audit_arrays(conn, "keypoints", images, 4, (2, 4, 6))
        descriptors = _audit_arrays(
            conn, "descriptors", images, 1, (128, 256, 512, 1024)
        )
        for image_id in set(keypoints) & set(descriptors):
            if keypoints[image_id] != descriptors[image_id]:
                raise ValueError(f"Feature rows mismatch for image {image_id}")
        raw = _audit_match_table(conn, "matches", images, max_pairs)
        verified = _audit_match_table(conn, "two_view_geometries", images, max_pairs)

        parent = {image_id: image_id for image_id in images}
        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x
        def union(a, b):
            pa, pb = find(a), find(b)
            if pa != pb:
                parent[pb] = pa

        enough = [(a, b, n) for a, b, n in verified["usable"]
                  if n >= min_verified_inliers]
        linked = set()
        for a, b, _ in enough:
            union(a, b)
            linked.update((a, b))
        sizes = {}
        for image_id in images:
            root = find(image_id)
            sizes[root] = sizes.get(root, 0) + 1

        report = {
            "status": (
                "MATCH_GRAPH_CONNECTED" if len(images) >= 3 and len(sizes) == 1
                and enough else "MATCH_GRAPH_INSUFFICIENT"
            ),
            "database_mode": "READ_ONLY",
            "database_bytes": path.stat().st_size,
            "database_sha256": None,
            "schema_tables": sorted(tables & set(REQUIRED + OPTIONAL)),
            "cameras": len(cameras),
            "images": len(images),
            "rigs": conn.execute("SELECT count(*) FROM rigs").fetchone()[0]
                    if "rigs" in tables else None,
            "frames": conn.execute("SELECT count(*) FROM frames").fetchone()[0]
                    if "frames" in tables else None,
            "images_with_keypoints": sum(x > 0 for x in keypoints.values()),
            "images_with_descriptors": sum(x > 0 for x in descriptors.values()),
            "raw_pairs": raw["pairs"],
            "geometrically_checked_pairs": verified["pairs"],
            "verified_pairs": len(enough),
            "verified_pair_inliers_total": sum(x[2] for x in enough),
            "largest_verified_component": max(sizes.values(), default=0),
            "isolated_images": len(set(images) - linked),
            "expected_images": expected_images,
            "expected_image_coverage": (
                len(images) / expected_images if expected_images is not None else None
            ),
            "minimum_verified_inliers": min_verified_inliers,
            "camera_poses_recovered_by_db_audit": False,
            "note": "Verified pair graph is diagnostic, not recovered camera poses or physical-geodetic accuracy.",
        }
    finally:
        conn.close()
    if path.stat().st_size <= hash_limit_bytes:
        h = hashlib.sha256()
        with path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024*1024), b""):
                h.update(chunk)
        report["database_sha256"] = h.hexdigest()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True, type=Path)
    parser.add_argument("--expected-images", type=int)
    parser.add_argument("--min-verified-inliers", default=15, type=int)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = inspect(args.database, expected_images=args.expected_images,
                     min_verified_inliers=args.min_verified_inliers)
    encoded = json.dumps(report, indent=2, sort_keys=True)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded + "\n")
    print(encoded)


if __name__ == "__main__":
    main()
